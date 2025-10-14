// src/services/imageGenerationService.ts

import { createCanvas, loadImage, CanvasRenderingContext2D, registerFont } from 'canvas';
import path from 'path';

import { ImageConfig, CardData } from '../types';

import { accountService } from '@/lib/accountService';
import { configureCloudinary, uploadToCloudinary } from '../utils/cloudinaryUtils';
import { fetchUnsplashImage } from '../utils/unsplashUtils';
import { getSafeFont, wordWrap, fitTextOnCanvas } from '../utils/canvasUtils';
import { generateVocabularyCardImage } from './vocabularyGenerator';
import { generateSatiristImage, calculateTotalTextHeight, renderMixedLine } from './satiristGenerator';

// Register Poppins fonts
const fontsPath = path.join(process.cwd(), 'public', 'fonts');
registerFont(path.join(fontsPath, 'Poppins-Regular.ttf'), { family: 'Poppins', weight: 'normal' });
registerFont(path.join(fontsPath, 'Poppins-Bold.ttf'), { family: 'Poppins', weight: 'bold' });

export const TWITTER_IMAGE_CONFIG: ImageConfig = {
  enabled: true,
  unsplashQuery: 'minimalist white clean bright light background texture',
  dimensions: {
    width: 1200,
    height: 675,
  },
  textStyle: {
    wordSize: 90,
    meaningSize: 40,
    exampleSize: 30,
    wordColor: '#1A1A1A',
    meaningColor: '#333333',
    exampleColor: '#555555',
    fontFamily: 'Poppins',
    backgroundColor: '',
    backgroundOpacity: 0,
  },
};

// * Generate image for persona and upload to Cloudinary using account-specific credentials
export async function generatePersonaImage(
  cardData: CardData | null,
  personaKey: string,
  accountId?: string,
  config?: ImageConfig
): Promise<string | null> {
  if (!accountId) {
    console.error("⚠️ Cannot generate image: account ID is required for Cloudinary configuration.");
    return null;
  }

  try {
    const account = await accountService.getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    let imageBuffer: Buffer;
    let publicId: string;

    if (personaKey === 'english_vocab_builder') {
      if (!cardData || cardData.type === 'satirist_insight') {
        console.warn("⚠️ Cannot generate image: vocabulary card data is missing.");
        return null;
      }
      imageBuffer = await generateVocabularyCardImage(cardData, config);
      publicId = `vocab_${cardData.word.replace(/[^\w]/g, '_').substring(0, 20)}`;
    } else if (personaKey === 'satirist') {
      if (!cardData || cardData.type !== 'satirist_insight') {
        console.warn("⚠️ Cannot generate satirist image: imageContent is missing from card data.");
        return null;
      }
      const imageContent = cardData.imageContent;
      imageBuffer = await generateSatiristImage(imageContent);
      publicId = `satirist_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    } else {
      return null; // Persona doesn't support images
    }

    const cloudinaryUrl = await uploadToCloudinary(imageBuffer, publicId, account);
    return cloudinaryUrl;

  } catch (error) {
    console.error('❌ Failed to generate and upload image:', error);
    return null;
  }
}

export { createCanvas, loadImage, CanvasRenderingContext2D, configureCloudinary, uploadToCloudinary, fetchUnsplashImage, getSafeFont, wordWrap, fitTextOnCanvas, calculateTotalTextHeight, renderMixedLine };