import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import { v2 as cloudinary } from 'cloudinary';
import { VocabularyCard, ImageConfig } from './types';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.GIBBI_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.GIBBI_CLOUDINARY_API_KEY,
  api_secret: process.env.GIBBI_CLOUDINARY_API_SECRET
});

// **FIX:** The ImageConfig interface has been removed from here and moved to types.ts

export const TWITTER_IMAGE_CONFIG: ImageConfig = {
  enabled: true,
  unsplashQuery: 'minimal',
  dimensions: {
    width: 1200,
    height: 675, // Twitter's recommended 16:9 aspect ratio
  },
  textStyle: {
    wordSize: 84,
    meaningSize: 32,
    exampleSize: 24,
    wordColor: '#1e40af', // Deep blue for main word
    meaningColor: '#374151', // Dark gray for meaning
    exampleColor: '#6b7280', // Medium gray for example
    fontFamily: 'Arial, sans-serif',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backgroundOpacity: 0.95,
  },
};

/**
 * Upload image buffer to Cloudinary
 */
async function uploadToCloudinary(imageBuffer: Buffer, publicId?: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const dateFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const finalPublicId = publicId || `gibbi-vocabulary/${dateFolder}/vocab_${timestamp}`;
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: finalPublicId,
          folder: 'gibbi-vocabulary',
          format: 'jpg',
          quality: 'auto:good',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
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
 * Fetch a background image from Unsplash
 */
async function fetchUnsplashImage(query: string, width: number, height: number): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) {
    console.warn('UNSPLASH_ACCESS_KEY not provided, using gradient background');
    return '';
  }

  try {
    const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&w=${width}&h=${height}`;
    console.log(`🖼️ Fetching Unsplash image: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`❌ Unsplash API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.warn(`❌ Unsplash error details: ${errorText}`);
      return '';
    }

    const data = await response.json();
    const imageUrl = data.urls?.custom || data.urls?.regular || data.urls?.full;
    
    if (!imageUrl) {
      console.warn('❌ No image URL found in Unsplash response');
      return '';
    }
    
    console.log(`✅ Unsplash image fetched: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.warn('❌ Error fetching Unsplash image:', error);
    return '';
  }
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
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
 * Generate a beautiful, eye-catching vocabulary card image
 */
export async function generateVocabularyCardImage(
  card: VocabularyCard,
  config: ImageConfig = TWITTER_IMAGE_CONFIG
): Promise<Buffer> {
  const { width, height } = config.dimensions;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  let backgroundImage = null;
  if (config.unsplashQuery) {
    const imageUrl = await fetchUnsplashImage(config.unsplashQuery, width, height);
    if (imageUrl) {
      try {
        backgroundImage = await loadImage(imageUrl);
      } catch (error) {
        console.warn('Failed to load background image:', error);
      }
    }
  }

  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, width, height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  const cardPadding = 80;
  const cardX = cardPadding;
  const cardY = cardPadding;
  const cardWidth = width - (cardPadding * 2);
  const cardHeight = height - (cardPadding * 2);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(cardX + 8, cardY + 8, cardWidth, cardHeight);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  
  const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
  borderGradient.addColorStop(0, '#3b82f6');
  borderGradient.addColorStop(1, '#8b5cf6');
  ctx.strokeStyle = borderGradient;
  ctx.lineWidth = 4;
  ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

  ctx.fillStyle = '#e0e7ff';
  ctx.fillRect(cardX, cardY, cardWidth, 12);
  ctx.fillRect(cardX, cardY + cardHeight - 12, cardWidth, 12);

  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#3b82f6';
  ctx.textAlign = 'center';
  ctx.fillText('📚', cardX + 60, cardY + 60);

  let currentY = cardY + 100;
  const contentCenterX = width / 2;

  ctx.font = `bold ${config.textStyle.wordSize}px Arial, sans-serif`;
  ctx.fillStyle = config.textStyle.wordColor;
  ctx.textAlign = 'center';
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillText(card.word.toUpperCase(), contentCenterX, currentY);
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  currentY += config.textStyle.wordSize + 40;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(contentCenterX - 100, currentY - 20);
  ctx.lineTo(contentCenterX + 100, currentY - 20);
  ctx.stroke();

  if (card.partOfSpeech) {
    ctx.font = `italic bold ${config.textStyle.exampleSize}px Arial, sans-serif`;
    ctx.fillStyle = '#6366f1';
    ctx.textAlign = 'center';
    ctx.fillText(`(${card.partOfSpeech})`, contentCenterX, currentY);
    currentY += config.textStyle.exampleSize + 30;
  }

  ctx.font = `${config.textStyle.meaningSize}px Arial, sans-serif`;
  ctx.fillStyle = config.textStyle.meaningColor;
  ctx.textAlign = 'center';
  
  const meaningLines = wrapText(ctx, card.meaning, cardWidth - 160);
  meaningLines.forEach((line, index) => {
    ctx.fillText(line, contentCenterX, currentY + (index * (config.textStyle.meaningSize + 8)));
  });
  currentY += (meaningLines.length * (config.textStyle.meaningSize + 8)) + 40;

  if (card.example && card.example.length > 3) {
    const exampleBoxY = currentY - 15;
    const exampleBoxHeight = 80;
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(cardX + 40, exampleBoxY, cardWidth - 80, exampleBoxHeight);
    
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX + 40, exampleBoxY, cardWidth - 80, exampleBoxHeight);
    
    ctx.font = `italic ${config.textStyle.exampleSize}px Arial, sans-serif`;
    ctx.fillStyle = '#0369a1';
    ctx.textAlign = 'center';
    
    const exampleText = card.example.length > 80 ? card.example.substring(0, 77) + '...' : card.example;
    const exampleLines = wrapText(ctx, `"${exampleText}"`, cardWidth - 120);
    exampleLines.forEach((line, index) => {
      ctx.fillText(line, contentCenterX, currentY + 15 + (index * (config.textStyle.exampleSize + 6)));
    });
    currentY += exampleBoxHeight + 30;
  }

  if (card.synonyms && card.synonyms.length > 0) {
    ctx.font = `${config.textStyle.exampleSize - 2}px Arial, sans-serif`;
    ctx.fillStyle = '#8b5cf6';
    ctx.textAlign = 'center';
    
    const synonymsText = `Similar: ${card.synonyms.slice(0, 3).join(' • ')}`;
    ctx.fillText(synonymsText, contentCenterX, currentY);
  }

  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.textAlign = 'right';
  ctx.fillText('Gibbi AI', cardX + cardWidth - 20, cardY + cardHeight - 20);

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

/**
 * Generate image for persona and upload to Cloudinary
 */
export async function generatePersonaImage(
  vocabularyCard: VocabularyCard | null,
  personaKey: string,
  config?: ImageConfig
): Promise<string | null> {
  if (personaKey !== 'english_vocab_builder') {
    return null;
  }

  if (!vocabularyCard) {
    console.warn("⚠️ Cannot generate image: vocabulary card data is missing.");
    return null;
  }

  try {
    const imageBuffer = await generateVocabularyCardImage(vocabularyCard, config);
    
    const cloudinaryUrl = await uploadToCloudinary(imageBuffer, `vocab_${vocabularyCard.word.replace(/\s+/g, '_')}_${Date.now()}`);
    return cloudinaryUrl;
  } catch (error) {
    console.error('❌ Failed to generate and upload vocabulary image:', error);
    return null;
  }
}