//imageGenerationService.ts

import { createCanvas, loadImage, CanvasRenderingContext2D, registerFont } from 'canvas';
import path from 'path';

import { v2 as cloudinary } from 'cloudinary';

import { VocabularyCard, ImageConfig, AccountWithCredentials } from './types';

import { accountService } from './accountService';



// Note: Cloudinary will be configured dynamically per account using decrypted credentials from AccountService

// Register Poppins fonts
const fontsPath = path.join(process.cwd(), 'public', 'fonts');
registerFont(path.join(fontsPath, 'Poppins-Regular.ttf'), { family: 'Poppins', weight: 'normal' });
registerFont(path.join(fontsPath, 'Poppins-Bold.ttf'), { family: 'Poppins', weight: 'bold' });



/**

* Configure Cloudinary using account's decrypted credentials

*/

function configureCloudinary(account: AccountWithCredentials): boolean {

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

// lib/imageGenerationService.ts

async function fetchUnsplashImage(query: string, width: number, height: number): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn('UNSPLASH_ACCESS_KEY not provided, using gradient background');
    return '';
  }
  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&color=white&per_page=1`;
    const controller = new AbortController();

    // --- FIX: INCREASE TIMEOUT FROM 10000ms to 25000ms ---
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds

    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`❌ Unsplash API error: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    if (data.urls?.raw) {
      const optimizedUrl = `${data.urls.raw}&w=${width}&h=${height}&fit=crop&fm=jpg&q=80&sat=-20&bright=10`;
      console.log('✅ Successfully fetched Unsplash background image');
      return optimizedUrl;
    }

    console.warn('⚠️ Unsplash response missing image URLs');
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
* Validates that a font is properly loaded by testing text measurement
*/
function validateFont(ctx: CanvasRenderingContext2D, fontFamily: string): boolean {
  try {
    ctx.font = `20px ${fontFamily}`;
    const testWidth = ctx.measureText('Test').width;
    // If font is not loaded, Canvas might return 0 or very small width
    return testWidth > 10;
  } catch (error) {
    console.warn(`Font validation failed for ${fontFamily}:`, error);
    return false;
  }
}

/**
* Get a safe font family with fallback validation
*/
function getSafeFont(ctx: CanvasRenderingContext2D, preferredFont: string): string {
  const fontOptions = [
    preferredFont,
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'sans-serif'
  ];

  for (const font of fontOptions) {
    if (validateFont(ctx, font)) {
      console.log(`✅ Using font: ${font}`);
      return font;
    }
  }

  console.warn('⚠️ All font validation failed, using system default');
  return 'sans-serif';
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

  // Validate and get safe font family
  const safeFont = getSafeFont(ctx, config.textStyle.fontFamily);



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

    fallback.addColorStop(0, '#F8F9FA'); fallback.addColorStop(1, '#E9ECEF');

    ctx.fillStyle = fallback;
    ctx.fillRect(0, 0, width, height);
    console.log('🎨 Using light fallback background gradient');

  }



  // --- 2. Clean layout for white backgrounds (plaque removed) ---


  // --- 3. Text Content ---
  ctx.textAlign = 'left';
  const leftMargin = width * 0.1; // 10% margin from left
  const rightMargin = width * 0.1; // 10% margin from right
  const contentMaxWidth = width - leftMargin - rightMargin; // Text width between margins

  let currentY = height * 0.35; // Start at 15% from top

  // Draw Main Word First
  const titleMaxWidth = width * 0.9; // Use 90% of canvas width for the title

  ctx.font = fitTextOnCanvas(
    ctx,
    card.word.toUpperCase(),
    safeFont,
    titleMaxWidth,
    config.textStyle.wordSize // Start with the ideal max size
  );

  // Add text outline for better visibility on any background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText(card.word.toUpperCase(), leftMargin, currentY);

  ctx.fillStyle = config.textStyle.wordColor;
  ctx.fillText(card.word.toUpperCase(), leftMargin, currentY);

  // Get the actual font size used for spacing
  const wordFontSize = parseInt(ctx.font.match(/(\d+)px/)?.[1] || '60');
  currentY += wordFontSize * 0.5; // Reduce spacing between word and part of speech

  // Draw Part of Speech
  if (card.type === 'single_word' && card.partOfSpeech) {
    ctx.font = `italic bold ${config.textStyle.exampleSize}px ${safeFont}`;

    // Add subtle outline for part of speech
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText(`(${card.partOfSpeech})`, leftMargin, currentY);

    ctx.fillStyle = config.textStyle.meaningColor;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(`(${card.partOfSpeech})`, leftMargin, currentY);
    currentY += config.textStyle.exampleSize + 30; // Increase spacing before definition
  }

  // Draw Main Content
  switch (card.type) {
    case 'synonym_list':
      if (card.synonyms && card.synonyms.length > 0) {
        ctx.font = `normal ${config.textStyle.meaningSize + 4}px ${safeFont}`;

        const synonymText = card.synonyms.join(' • ');
        const synLines = wrapText(ctx, synonymText, contentMaxWidth);
        for (const line of synLines) {
          // Add outline for synonyms
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.strokeText(line, leftMargin, currentY);

          ctx.fillStyle = config.textStyle.meaningColor;
          ctx.fillText(line, leftMargin, currentY);
          currentY += config.textStyle.meaningSize + 15;
        }
      }
      currentY += 15;
      break;

    default:
      ctx.font = `normal ${config.textStyle.meaningSize}px ${safeFont}`;

      const meaningLines = card.meaning.split('\n').flatMap(line => wrapText(ctx, line, contentMaxWidth));
      for (const line of meaningLines) {
        // Add outline for meaning text
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeText(line, leftMargin, currentY);

        ctx.fillStyle = config.textStyle.meaningColor;
        ctx.fillText(line, leftMargin, currentY);
        currentY += config.textStyle.meaningSize + 10;
      }
      currentY += 15;
      break;
  }

  // Draw Example
  if (card.example) {
    ctx.font = `italic ${config.textStyle.exampleSize + 2}px ${safeFont}`;

    const exLines = wrapText(ctx, `"${card.example}"`, contentMaxWidth);
    for (const line of exLines) {
      // Add outline for example text
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeText(line, leftMargin, currentY);

      ctx.fillStyle = config.textStyle.exampleColor;
      ctx.fillText(line, leftMargin, currentY);
      currentY += config.textStyle.exampleSize + 10;
    }
  }



  // --- 4. Branding Watermark ---

  ctx.font = `bold 18px ${safeFont}`;

  ctx.fillStyle = 'rgba(72, 72, 72, 0.7)';

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