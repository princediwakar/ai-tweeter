// lib/services/imageGenerationService.ts

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
  unsplashQuery: 'white background',
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
  cardData: CardData | string | null, // Accept string as well
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

    // --- START: Added Parsing Logic ---
    let parsedCardData: CardData | null = null;
    if (typeof cardData === 'string') {
      try {
        parsedCardData = JSON.parse(cardData);
      } catch (e) {
        console.error('❌ Failed to parse cardData JSON string in generatePersonaImage:', cardData, e);
        return null; // Exit if JSON is invalid
      }
    } else {
      parsedCardData = cardData;
    }

    if (!parsedCardData) {
      console.warn("⚠️ Cannot generate image: card data is null or invalid.");
      return null;
    }
    // --- END: Added Parsing Logic ---

    let imageBuffer: Buffer;
    let publicId: string;

    // Use 'parsedCardData' from here on
    if (personaKey === 'english_vocab_builder') {
      // The type guard 'satirist_insight' is for TypeScript, ensuring 'word' exists.
      if (parsedCardData.type === 'satirist_insight' || !parsedCardData.word) {
        console.warn("⚠️ Cannot generate image: vocabulary card data is missing or invalid.");
        return null;
      }
      imageBuffer = await generateVocabularyCardImage(parsedCardData, config);
      // This line is now safe because parsedCardData is a guaranteed object with a 'word' property
      publicId = `vocab_${parsedCardData.word.replace(/[^\w]/g, '_').substring(0, 20)}`;
    } else if (personaKey === 'satirist') {
      if (parsedCardData.type !== 'satirist_insight') {
        console.warn("⚠️ Cannot generate satirist image: imageContent is missing from card data.");
        return null;
      }
      const imageContent = parsedCardData.imageContent;
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