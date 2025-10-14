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
  card: VocabularyCard,
  config: ImageConfig = TWITTER_IMAGE_CONFIG
): Promise<Buffer> {
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
        const synLines = wordWrap(ctx, synonymText, contentMaxWidth);
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

      const meaningLines = card.meaning.split('\n').flatMap(line => wordWrap(ctx, line, contentMaxWidth));
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

    const exLines = wordWrap(ctx, `"${card.example}"`, contentMaxWidth);
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