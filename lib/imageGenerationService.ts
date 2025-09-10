import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { v2 as cloudinary } from 'cloudinary';
import { VocabularyCard, ImageConfig, AccountWithCredentials } from './types';
import { accountService } from './accountService';

// Note: Cloudinary will be configured dynamically per account using decrypted credentials from AccountService

/**
 * Configure Cloudinary using account's decrypted credentials
 */
function configureCloudinary(account: AccountWithCredentials): boolean {
  console.log(`🔍 Checking Cloudinary credentials for account: ${account.name}`);
  console.log(`🔍 Cloud name exists: ${!!account.cloudinary_cloud_name_encrypted}`);
  console.log(`🔍 API key exists: ${!!account.cloudinary_api_key_encrypted}`);
  console.log(`🔍 API secret exists: ${!!account.cloudinary_api_secret_encrypted}`);
  
  // The AccountService already provides decrypted credentials
  console.log(`🔍 Decrypted cloud name: ${account.cloudinary_cloud_name ? 'exists' : 'missing'}`);
  console.log(`🔍 Decrypted API key: ${account.cloudinary_api_key ? 'exists' : 'missing'}`);
  console.log(`🔍 Decrypted API secret: ${account.cloudinary_api_secret ? 'exists' : 'missing'}`);
  
  // Check if account has Cloudinary credentials configured
  if (!account.cloudinary_cloud_name || 
      !account.cloudinary_api_key || 
      !account.cloudinary_api_secret) {
    console.error(`❌ Account ${account.name} missing Cloudinary credentials. Please configure Cloudinary credentials for this account.`);
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: account.cloudinary_cloud_name,
      api_key: account.cloudinary_api_key,
      api_secret: account.cloudinary_api_secret
    });
    console.log(`✅ Configured Cloudinary for account: ${account.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to configure Cloudinary for account ${account.name}:`, error);
    return false;
  }
}

export const TWITTER_IMAGE_CONFIG: ImageConfig = {
  enabled: true,
  unsplashQuery: 'minimal',
  dimensions: {
    width: 1200,
    height: 675,
  },
  textStyle: {
    wordSize: 110,
    meaningSize: 36,
    exampleSize: 30,
    wordColor: '#FFFFFF',
    meaningColor: '#E0E0E0',
    exampleColor: '#BDBDBD',
    fontFamily: 'Helvetica Neue, Arial, sans-serif',
    backgroundColor: '', 
    backgroundOpacity: 0,
  },
};

/**
 * Upload image buffer to Cloudinary using account-specific credentials
 */
async function uploadToCloudinary(imageBuffer: Buffer, publicId: string, account: AccountWithCredentials): Promise<string> {
  if (!configureCloudinary(account)) {
    throw new Error(`No Cloudinary configuration available for account: ${account.name}`);
  }

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          resource_type: 'image', 
          public_id: publicId, 
          folder: 'gibbi-vocabulary', 
          format: 'jpg', 
          quality: 'auto:good',
          overwrite: true,
        },
        (error, result) => error ? reject(error) : resolve(result)
      ).end(imageBuffer);
    });

    if (result && typeof result === 'object' && 'secure_url' in result) {
      console.log(`✅ Image uploaded to Cloudinary for ${account.name}: ${result.secure_url}`);
      return result.secure_url as string;
    } else {
      throw new Error('Invalid Cloudinary response');
    }
  } catch (error) {
    console.error(`❌ Failed to upload image to Cloudinary for ${account.name}:`, error);
    throw error;
  }
}

/**
 * Fetch a background image from Unsplash, optimized for size.
 */
async function fetchUnsplashImage(query: string, width: number, height: number): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn('UNSPLASH_ACCESS_KEY not provided, using gradient background');
    return '';
  }
  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`;
    const response = await fetch(url, { headers: { 'Authorization': `Client-ID ${accessKey}` } });
    
    if (!response.ok) {
      console.warn(`❌ Unsplash API error: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    if (data.urls?.raw) {
      return `${data.urls.raw}&w=${width}&h=${height}&fit=crop&fm=jpg&q=80`;
    }
    return '';

  } catch (error) {
    console.warn('❌ Error fetching Unsplash image:', error);
    return '';
  }
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = context.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * ✅ NEW: Dynamically adjusts font size to fit text within a max width.
 * This function starts with an initial font size and shrinks it until the
 * text width is less than the maximum allowed width.
 */
function fitTextOnCanvas(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  fontFamily: string, 
  maxWidth: number, 
  initialSize: number
): string {
  let fontSize = initialSize;
  do {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    // Decrease the font size slightly in each iteration
    fontSize -= 2;
  } while (ctx.measureText(text).width > maxWidth && fontSize > 20); // Stop if text fits or font becomes too small

  return ctx.font; // Return the final, correctly sized font string
}


/**
 * Generate a beautiful, aesthetic vocabulary image with a content-aware layout.
 */
export async function generateVocabularyCardImage(
  card: VocabularyCard,
  config: ImageConfig = TWITTER_IMAGE_CONFIG
): Promise<Buffer> {
  const { width, height } = config.dimensions;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- 1. Background Image ---
  let backgroundImage = null;
  if (config.unsplashQuery) {
    const imageUrl = await fetchUnsplashImage(config.unsplashQuery, width, height);
    if (imageUrl) {
        try { backgroundImage = await loadImage(imageUrl); } catch (e) { console.warn('Failed to load image:', e); }
    }
  }
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, width, height);
  } else {
    const fallback = ctx.createLinearGradient(0, 0, width, height);
    fallback.addColorStop(0, '#6D8299'); fallback.addColorStop(1, '#2E384D');
    ctx.fillStyle = fallback; ctx.fillRect(0, 0, width, height);
  }

  // --- 2. Optimized Overlay ---
  const plaqueY = height * 0.45;
  const plaqueHeight = height * 0.55;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, plaqueY, width, plaqueHeight);
  
  const gradient = ctx.createLinearGradient(0, height, 0, plaqueY);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, plaqueY, width, plaqueHeight);
  
  // --- 3. Text Content ---
  ctx.textAlign = 'center';
  const contentMaxWidth = width * 0.8;
  let currentY = height - 80;

  // Draw Example
  if (card.example) {
    ctx.font = `italic ${config.textStyle.exampleSize + 2}px ${config.textStyle.fontFamily}`;
    ctx.fillStyle = config.textStyle.exampleColor;
    const exLines = wrapText(ctx, `"${card.example}"`, contentMaxWidth);
    for (let i = exLines.length - 1; i >= 0; i--) {
      ctx.fillText(exLines[i], width / 2, currentY);
      currentY -= config.textStyle.exampleSize + 10;
    }
    currentY -= 30;
  }
  
  // Draw Main Content
  switch (card.type) {
    case 'synonym_list':
      if (card.synonyms && card.synonyms.length > 0) {
        ctx.font = `normal ${config.textStyle.meaningSize + 4}px ${config.textStyle.fontFamily}`;
        ctx.fillStyle = '#FFFFFF';
        const synonymText = card.synonyms.join('  •  ');
        const synLines = wrapText(ctx, synonymText, contentMaxWidth);
        for (let i = synLines.length - 1; i >= 0; i--) {
          ctx.fillText(synLines[i], width / 2, currentY);
          currentY -= config.textStyle.meaningSize + 15;
        }
      }
      currentY -= 15;
      break;

    default:
      ctx.font = `normal ${config.textStyle.meaningSize}px ${config.textStyle.fontFamily}`;
      ctx.fillStyle = config.textStyle.meaningColor;
      const meaningLines = card.meaning.split('\n').flatMap(line => wrapText(ctx, line, contentMaxWidth));
      for (let i = meaningLines.length - 1; i >= 0; i--) {
        ctx.fillText(meaningLines[i], width / 2, currentY);
        currentY -= config.textStyle.meaningSize + 10;
      }
      currentY -= 15;
      break;
  }
  
  // Draw Part of Speech
  if (card.type === 'single_word' && card.partOfSpeech) {
    ctx.font = `italic bold ${config.textStyle.exampleSize}px ${config.textStyle.fontFamily}`;
    ctx.fillStyle = config.textStyle.meaningColor;
    ctx.fillText(`(${card.partOfSpeech})`, width / 2, currentY);
    currentY -= config.textStyle.exampleSize + 20;
  }

  // --- ✅ FIX: Replace static font size logic with the new dynamic function ---
  const titleMaxWidth = width * 0.9; // Use 90% of canvas width for the title
  
  ctx.font = fitTextOnCanvas(
    ctx,
    card.word.toUpperCase(),
    config.textStyle.fontFamily,
    titleMaxWidth,
    config.textStyle.wordSize // Start with the ideal max size
  );
  
  ctx.fillStyle = config.textStyle.wordColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  ctx.fillText(card.word.toUpperCase(), width / 2, currentY);

  // --- 4. Branding Watermark ---
  ctx.font = `bold 18px ${config.textStyle.fontFamily}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'right';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText('Gibbi AI', width - 40, height - 35);
  
  return canvas.toBuffer('image/jpeg', { quality: 0.85 });
}


/**
 * Generate image for persona and upload to Cloudinary using account-specific credentials
 */
export async function generatePersonaImage(
  vocabularyCard: VocabularyCard | null,
  personaKey: string,
  accountId?: string,
  config?: ImageConfig
): Promise<string | null> {
  if (personaKey !== 'english_vocab_builder') return null;
  if (!vocabularyCard) {
    console.warn("⚠️ Cannot generate image: vocabulary card data is missing.");
    return null;
  }
  
  if (!accountId) {
    console.error("⚠️ Cannot generate image: account ID is required for Cloudinary configuration.");
    return null;
  }
  
  try {
    const account = await accountService.getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    
    const imageBuffer = await generateVocabularyCardImage(vocabularyCard, config);
    const publicId = `vocab_${vocabularyCard.word.replace(/[^\w]/g, '_').substring(0, 20)}`;
    const cloudinaryUrl = await uploadToCloudinary(imageBuffer, publicId, account);
    return cloudinaryUrl;
  } catch (error) {
    console.error('❌ Failed to generate and upload vocabulary image:', error);
    return null;
  }
}