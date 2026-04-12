// lib/services/imageGenerationService.ts
/**
 * Persona-Agnostic Image Generation Service
 */

import { v2 as cloudinary } from 'cloudinary';
import { getPersona } from '@/lib/db';

let createCanvas: any;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
} catch (e) {
  console.warn('[ImageGeneration] Canvas not available - using fallback mode');
  createCanvas = () => null;
}
import { platformSettings } from '@/lib/platformSettings';
export interface ImageTemplate {
  name: string;
  description: string;
  canHandle: (cardData: Record<string, unknown>) => boolean;
  generate: (cardData: Record<string, unknown>, config: ImageTemplateConfig) => Promise<Buffer | null>;
}

export interface ImageTemplateConfig {
  width: number;
  height: number;
  background?: string;
  theme?: string;
  [key: string]: unknown;
}

const DEFAULT_CONFIG: ImageTemplateConfig = {
  width: 1200,
  height: 675,
  background: '#ffffff',
  theme: 'light',
};

const templateRegistry = new Map<string, ImageTemplate>();

export function registerImageTemplate(template: ImageTemplate): void {
  templateRegistry.set(template.name, template);
}

export function getAvailableTemplates(): string[] {
  return Array.from(templateRegistry.keys());
}

function resolveTemplate(cardData: Record<string, unknown>, templateName?: string): ImageTemplate | null {
  if (templateName && templateRegistry.has(templateName)) {
    return templateRegistry.get(templateName)!;
  }
  for (const template of templateRegistry.values()) {
    if (template.canHandle(cardData)) {
      return template;
    }
  }
  return templateRegistry.get('default') || null;
}

const defaultTemplate: ImageTemplate = {
  name: 'default',
  description: 'Default template',
  canHandle: () => true,
  generate: async (cardData: Record<string, unknown>, config: ImageTemplateConfig): Promise<Buffer | null> => {
    const canvas = createCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = config.background || '#ffffff';
    ctx.fillRect(0, 0, config.width, config.height);
    const content = JSON.stringify(cardData).substring(0, 200);
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(content, 40, 60);
    return canvas.toBuffer('image/png');
  },
};

registerImageTemplate(defaultTemplate);

export async function generatePersonaImage(
  cardData: Record<string, unknown> | string | null,
  personaKey: string,
  accountId?: string,
  overrides?: Partial<ImageTemplateConfig>
): Promise<string | null> {
  if (!accountId) {
    console.error('[Image Gen] Cannot generate: account ID is required');
    return null;
  }

  try {
    const { connectedAccountsService } = await import('@/lib/connectedAccounts');
    const account = await connectedAccountsService.getById(accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);

    const persona = await getPersona(personaKey);
    if (!persona) {
      console.warn(`[Image Gen] Persona not found: ${personaKey}`);
      return null;
    }

    const pConfig = (persona.config as Record<string, unknown>) || {};
    const imageProbability = Number(pConfig.image_probability) || 0;
    if (imageProbability <= 0) {
      console.log(`[Image Gen] Image generation disabled for: ${personaKey}`);
      return null;
    }

    if (Math.random() > imageProbability) {
      console.log(`[Image Gen] Skipped ${personaKey} (rolled ${Math.random().toFixed(2)} > ${imageProbability})`);
      return null;
    }

    let parsedCardData: Record<string, unknown> = {};
    if (typeof cardData === 'string') {
      try { parsedCardData = JSON.parse(cardData); } 
      catch { return null; }
    } else if (cardData) {
      parsedCardData = cardData;
    } else {
      return null;
    }

    const templateName = String(pConfig.image_template || '');
    const template = resolveTemplate(parsedCardData, templateName || undefined);
    if (!template) {
      console.warn(`[Image Gen] No template found`);
      return null;
    }

    const templateConfig: ImageTemplateConfig = {
      ...DEFAULT_CONFIG,
      ...(pConfig.image_config as Record<string, unknown> || {}),
      ...overrides,
    };

    const imageBuffer = await template.generate(parsedCardData, templateConfig);
    if (!imageBuffer) return null;

    const creds = await platformSettings.getCloudinaryCredentials();
    const cloudName = creds.cloud_name;
    const apiKey = creds.api_key;
    const apiSecret = creds.api_secret;

    if (!cloudName || !apiKey) {
      console.warn('[Image Gen] Cloudinary not configured');
      return null;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Upload directly without using the wrapper
    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `tweet_${Date.now()}`,
          folder: `ai-tweeter/${account.account_username}`,
          format: 'jpg',
          quality: 'auto:good',
          overwrite: true,
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result as { secure_url: string });
          else reject(new Error('Cloudinary upload returned no result'));
        }
      );
      uploadStream.end(imageBuffer);
    });

    return uploadResult.secure_url;
  } catch (error) {
    console.error('[Image Gen] Failed:', error);
    return null;
  }
}


