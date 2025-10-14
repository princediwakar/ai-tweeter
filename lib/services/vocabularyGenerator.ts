// lib/services/vocabularyGenerator.ts

import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';

import { VocabularyCard, ImageConfig } from '../types';
import { fetchUnsplashImage } from '../utils/unsplashUtils';
import { getSafeFont, wordWrap, fitTextOnCanvas } from '../utils/canvasUtils';
import { TWITTER_IMAGE_CONFIG } from './imageGenerationService';

/**
 * Generate a beautiful, aesthetic vocabulary image with a content-aware layout.
 */
export async function generateVocabularyCardImage(
  // The input 'card' might be a string, so we adjust the type to reflect that possibility.
  card: VocabularyCard | string,
  config: ImageConfig = TWITTER_IMAGE_CONFIG
): Promise<Buffer> {
  let parsedCard: VocabularyCard;

  // --- START: Added Robust Parsing ---
  // Handle cases where the input is a JSON string instead of a pre-parsed object.
  if (typeof card === 'string') {
    try {
      parsedCard = JSON.parse(card);
    } catch (error) {
      console.error('Failed to parse VocabularyCard from JSON string:', card, error);
      throw new Error('Invalid input: Could not parse vocabulary card data.');
    }
  } else {
    parsedCard = card;
  }
  // --- END: Added Robust Parsing ---


  // --- Validation (now using parsedCard) ---
  if (!parsedCard || !parsedCard.word) {
    console.error('Error: Invalid VocabularyCard object. Missing "word" property.', parsedCard);
    throw new Error('Invalid VocabularyCard object: The "word" property is required.');
  }

  const { width, height } = config.dimensions;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // Validate and get safe font family
  const safeFont = getSafeFont(config.textStyle.fontFamily);

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
  // NOTE: All instances of 'card' are replaced with 'parsedCard' below this line.
  ctx.textAlign = 'left';
  const leftMargin = width * 0.1;
  const rightMargin = width * 0.1;
  const contentMaxWidth = width - leftMargin - rightMargin;

  let currentY = height * 0.35;

  // Draw Main Word First
  const titleMaxWidth = width * 0.9;

  ctx.font = fitTextOnCanvas(
    ctx,
    parsedCard.word.toUpperCase(),
    safeFont,
    titleMaxWidth,
    config.textStyle.wordSize
  );

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText(parsedCard.word.toUpperCase(), leftMargin, currentY);
  ctx.fillStyle = config.textStyle.wordColor;
  ctx.fillText(parsedCard.word.toUpperCase(), leftMargin, currentY);

  const wordFontSize = parseInt(ctx.font.match(/(\d+)px/)?.[1] || '60');
  currentY += wordFontSize * 0.5;

  // Draw Part of Speech
  if (parsedCard.type === 'single_word' && parsedCard.partOfSpeech) {
    ctx.font = `italic bold ${config.textStyle.exampleSize}px ${safeFont}`;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeText(`(${parsedCard.partOfSpeech})`, leftMargin, currentY);
    ctx.fillStyle = config.textStyle.meaningColor;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(`(${parsedCard.partOfSpeech})`, leftMargin, currentY);
    currentY += config.textStyle.exampleSize + 30;
  }

  // Draw Main Content
  const meaning = parsedCard.meaning || '';
  switch (parsedCard.type) {
    case 'synonym_list':
      if (parsedCard.synonyms && parsedCard.synonyms.length > 0) {
        ctx.font = `normal ${config.textStyle.meaningSize + 4}px ${safeFont}`;
        const synonymText = parsedCard.synonyms.join(' • ');
        const synLines = wordWrap(ctx, synonymText, contentMaxWidth);
        for (const line of synLines) {
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
      const meaningLines = meaning.split('\n').flatMap(line => wordWrap(ctx, line, contentMaxWidth));
      for (const line of meaningLines) {
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
  if (parsedCard.example) {
    ctx.font = `italic ${config.textStyle.exampleSize + 2}px ${safeFont}`;
    const exLines = wordWrap(ctx, `"${parsedCard.example}"`, contentMaxWidth);
    for (const line of exLines) {
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