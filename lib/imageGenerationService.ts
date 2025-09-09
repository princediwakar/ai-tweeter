import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { v2 as cloudinary } from 'cloudinary';
import { VocabularyCard, ImageConfig } from './types';

// Configure Cloudinary (no changes needed here)
cloudinary.config({
  cloud_name: process.env.GIBBI_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.GIBBI_CLOUDINARY_API_KEY,
  api_secret: process.env.GIBBI_CLOUDINARY_API_SECRET
});

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
 * Upload image buffer to Cloudinary
 */
async function uploadToCloudinary(imageBuffer: Buffer, publicId: string): Promise<string> {
  // Simplified publicId handling, passed from the calling function
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { 
          resource_type: 'image', 
          public_id: publicId, 
          folder: 'gibbi-vocabulary', 
          format: 'jpg', 
          quality: 'auto:good', // Cloudinary's own optimization
          overwrite: true,
        },
        (error, result) => error ? reject(error) : resolve(result)
      ).end(imageBuffer);
    });

    if (result && typeof result === 'object' && 'secure_url' in result) {
      console.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);
      return result.secure_url as string;
    } else {
      throw new Error('Invalid Cloudinary response');
    }
  } catch (error) {
    console.error('❌ Failed to upload image to Cloudinary:', error);
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
      // ✅ OPTIMIZATION: Request a specifically sized image to reduce download time.
      return `${data.urls.raw}&w=${width}&h=${height}&fit=crop&fm=jpg&q=80`;
    }
    return '';

  } catch (error) {
    console.warn('❌ Error fetching Unsplash image:', error);
    return '';
  }
}

/**
 * Wrap text to fit within specified width (no changes needed here)
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
    // This network call is now faster thanks to the optimization in fetchUnsplashImage
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

  // --- 2. Frosted Glass Effect for Readability ---
  // ⚠️ PERFORMANCE WARNING: ctx.filter is the most CPU-intensive part of this script.
  // If performance is still an issue, replace this section with a simple semi-transparent rectangle.
  // Example replacement:
  // ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  // ctx.fillRect(0, height * 0.45, width, height * 0.55);
  ctx.save();
  const plaqueY = height * 0.45;
  const plaqueHeight = height * 0.55;
  ctx.beginPath();
  ctx.rect(0, plaqueY, width, plaqueHeight);
  ctx.clip();
  ctx.filter = 'blur(8px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();

  // --- 3. Dark Overlay on top of the Frosted Glass ---
  const gradient = ctx.createLinearGradient(0, height, 0, plaqueY);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, plaqueY, width, plaqueHeight);
  
  // --- 4. Text Content (no major changes needed here) ---
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
  
  // ... rest of the text drawing logic is fine ...
  // Draw Main Content based on type
  switch (card.type) {
    case 'synonym_list':
      if (card.synonyms && card.synonyms.length > 0) {
        ctx.font = `normal ${config.textStyle.meaningSize + 4}px ${config.textStyle.fontFamily}`;
        ctx.fillStyle = '#FFFFFF'; // Make synonyms bright
        const synonymText = card.synonyms.join('  •  ');
        const synLines = wrapText(ctx, synonymText, contentMaxWidth);
        for (let i = synLines.length - 1; i >= 0; i--) {
          ctx.fillText(synLines[i], width / 2, currentY);
          currentY -= config.textStyle.meaningSize + 15;
        }
      }
      currentY -= 15;
      break;

    default: // Handles 'single_word', 'confused_pair', 'idiom' etc.
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

  // Draw Main Word/Title
  const isLongWord = card.word.length > 15 || card.word.includes(' ');
  const wordSize = isLongWord ? config.textStyle.wordSize * 0.75 : config.textStyle.wordSize;
  ctx.font = `bold ${wordSize}px ${config.textStyle.fontFamily}`;
  ctx.fillStyle = config.textStyle.wordColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;
  ctx.fillText(card.word.toUpperCase(), width / 2, currentY);

  // --- 5. Branding Watermark ---
  ctx.font = `bold 18px ${config.textStyle.fontFamily}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'right';
  ctx.shadowBlur = 0; // Turn off shadow for watermark
  ctx.shadowOffsetY = 0;
  ctx.fillText('Gibbi AI', width - 40, height - 35);
  
  // ✅ OPTIMIZATION: Reduce JPEG quality to decrease buffer size and speed up upload.
  return canvas.toBuffer('image/jpeg', { quality: 0.85 });
}


/**
 * Generate image for persona and upload to Cloudinary
 */
export async function generatePersonaImage(
  vocabularyCard: VocabularyCard | null,
  personaKey: string,
  config?: ImageConfig
): Promise<string | null> {
  if (personaKey !== 'english_vocab_builder') return null;
  if (!vocabularyCard) {
    console.warn("⚠️ Cannot generate image: vocabulary card data is missing.");
    return null;
  }
  try {
    const imageBuffer = await generateVocabularyCardImage(vocabularyCard, config);
    
    // Create a consistent public_id to allow for overwriting if needed
    const publicId = `vocab_${vocabularyCard.word.replace(/[^\w]/g, '_').substring(0, 20)}`;
    
    // This network call will be faster because imageBuffer is smaller
    const cloudinaryUrl = await uploadToCloudinary(imageBuffer, publicId);
    
    return cloudinaryUrl;
  } catch (error) {
    console.error('❌ Failed to generate and upload vocabulary image:', error);
    return null;
  }
}