// src/services/satiristGenerator.ts

import { createCanvas, CanvasRenderingContext2D } from 'canvas';

import { getSafeFont, wordWrapWithHighlights, measureRenderedLineWidth } from '../utils/canvasUtils';

/**
 * Renders a single line of text that may contain highlighted words.
 * It iterates through words, applying different styles as needed.
 */
export function renderMixedLine(
  ctx: CanvasRenderingContext2D,
  lineWords: string[],
  x: number,
  y: number,
  font: string,
  fontSize: number
): number {
  let currentX = x;
  for (let i = 0; i < lineWords.length; i++) {
    if (i > 0) {
      ctx.font = `600 ${fontSize}px ${font}`;
      currentX += ctx.measureText(' ').width;
    }
    const word = lineWords[i];
    const text = word.replace(/【|】/g, '');
    const isHighlighted = word.startsWith('【') && word.endsWith('】');

    // Use 'bold' for highlighted words, assuming a bold weight is registered for the font.
    ctx.font = `${isHighlighted ? 'bold' : '600'} ${fontSize}px ${font}`;
    ctx.fillStyle = isHighlighted ? '#FF4500' : '#001F3F'; // Orange for highlight, dark blue for regular
    ctx.fillText(text, currentX, y);
    currentX += ctx.measureText(text).width;
  }
  return currentX;
}
/**
 * Highlights a broad range of numerical metrics with high precision and flexibility.
 * This version handles currency symbols ($, ₹, Rs), magnitude suffixes (K, M, B, T, L, Lakh, Cr),
 * percentages (%), plus-sign qualifiers (+), and common standalone number-noun pairs.
 * It is also robust to optional spacing between numbers, symbols, and suffixes.
 */
function highlightNumbers(text: string): string {
  const metricDetectionRegex = new RegExp([
    // Pattern 1: Currency-prefixed numbers. Now handles spaces like "₹ 500 M".
    '(\\b(?:Rs\\.?|\\$|₹)\\s*\\d[\\d,.]*\\s*(?:K|M|B|T|L|Lakh|Cr|crore)?\\+?\\b)',

    // Pattern 2: Numbers with a mandatory magnitude suffix. Now handles spaces like "50 M+".
    '(\\b\\d[\\d,.]+\\s*(?:K|M|B|T|L|Lakh|Cr|crore)\\+?\\b)',

    // Pattern 3: Percentages. Now handles spaces like "70 %".
    '(\\b\\d[\\d,.]*\\s*%\\+?\\b)',

    // Pattern 4: Numbers that are only followed by a plus sign (e.g., "1,500+").
    // Kept strict (no space) as "1500 +" is ambiguous.
    '(\\b\\d[\\d,.]*\\+\\b)',

    // Pattern 5 (REFINED): Standalone numbers followed by a curated list of common metric-related nouns.
    // Removed uncommon/specific words for better general-purpose use. Added plurals.
    '(\\b\\d[\\d,.]*(?:-\\w+)?\\s+(?:applications|startups|funded|cities|city|year|years|minute|minutes|users|customers|subscribers)\\b)'

  ].join('|'), 'gi'); // 'g' for global search, 'i' for case-insensitive

  return text.replace(metricDetectionRegex, (match) => `【${match.trim()}】`);
}
/**
 * Calculates the total vertical space needed for all text content at a given
 * font size. It intelligently groups short sentences and word-wraps long ones.
 * Uses rendered widths for accuracy.
 */
export function calculateTotalTextHeight(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  contentMaxWidth: number,
  safeFont: string,
  fontSize: number
): number {
  if (lines.length === 0) return 0;

  const lineHeight = fontSize * 1.4;

  // Group lines into logical lines
  const logicalLines: string[] = [];
  let lineBuffer = '';

  for (const line of lines) {
    const highlightedLine = highlightNumbers(line);
    const isBullet = highlightedLine.trim().startsWith('→');
    const currentIsBullet = lineBuffer.trim().startsWith('→');

    if (lineBuffer !== '' && (isBullet || currentIsBullet)) {
      logicalLines.push(lineBuffer);
      lineBuffer = highlightedLine;
    } else {
      const testFullText = lineBuffer === '' ? highlightedLine : `${lineBuffer} ${highlightedLine}`;
      const testWords = testFullText.split(' ');
      const testWidth = measureRenderedLineWidth(ctx, testWords, fontSize, safeFont);

      if (testWidth > contentMaxWidth && lineBuffer !== '') {
        logicalLines.push(lineBuffer);
        lineBuffer = highlightedLine;
      } else {
        lineBuffer = testFullText;
      }
    }
  }
  if (lineBuffer !== '') logicalLines.push(lineBuffer);

  // Calculate total height with conditional gaps
  let totalHeight = 0;
  for (let i = 0; i < logicalLines.length; i++) {
    const wrappedLines = wordWrapWithHighlights(ctx, logicalLines[i], contentMaxWidth, fontSize, safeFont);
    totalHeight += wrappedLines.length * lineHeight;

    if (i < logicalLines.length - 1 && !(logicalLines[i].startsWith('→') && logicalLines[i + 1].startsWith('→'))) {
      totalHeight += lineHeight / 2; // Reduced gap for better spacing
    }
  }

  return totalHeight;
}

/**
 * The main function to generate the image. It orchestrates the entire process
 * from cleaning text to rendering the final image buffer.
 */
export async function generateSatiristImage(
  imageContent: string,
): Promise<Buffer> {
  const width = 1200;
  const height = 675;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const safeFont = getSafeFont('Poppins');

  // Draw background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#F0F8FF'); // A light, clean blue
  gradient.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw the side accent bar.
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, 20, height);

  const leftMargin = 100;
  const rightMargin = 100;
  const topMargin = 60;
  const bottomMargin = 60;
  const contentMaxWidth = width - leftMargin - rightMargin;
  const availableH = height - topMargin - bottomMargin;

  // 1. Pre-process content: remove hashtags, split into lines.
  const processedContent = imageContent.replace(/#\w+/g, '').trim();
  const lines = processedContent.split('\n').map(s => s.trim()).filter(s => s.length > 0);

  // 2. Dynamically find the largest font size that fits.
  let fontSize = 40; // Reduced starting point to prevent overflow
  let textHeight = 0;
  while (fontSize > 18) {
    textHeight = calculateTotalTextHeight(ctx, lines, contentMaxWidth - 20, safeFont, fontSize); // Added buffer to maxWidth
    if (textHeight <= availableH) break;
    fontSize -= 1;
  }
  const lineHeight = fontSize * 1.4;

  // 3. Group lines into logical lines (same as in calculateTotalTextHeight)
  const logicalLines: string[] = [];
  let lineBuffer = '';

  for (const line of lines) {
    const highlightedLine = highlightNumbers(line);
    const isBullet = highlightedLine.trim().startsWith('→');
    const currentIsBullet = lineBuffer.trim().startsWith('→');

    if (lineBuffer !== '' && (isBullet || currentIsBullet)) {
      logicalLines.push(lineBuffer);
      lineBuffer = highlightedLine;
    } else {
      const testFullText = lineBuffer === '' ? highlightedLine : `${lineBuffer} ${highlightedLine}`;
      const testWords = testFullText.split(' ');
      ctx.font = `600 ${fontSize}px ${safeFont}`;
      const testWidth = measureRenderedLineWidth(ctx, testWords, fontSize, safeFont);

      if (testWidth > contentMaxWidth - 20 && lineBuffer !== '') { // Added buffer
        logicalLines.push(lineBuffer);
        lineBuffer = highlightedLine;
      } else {
        lineBuffer = testFullText;
      }
    }
  }
  if (lineBuffer !== '') logicalLines.push(lineBuffer);

  // 4. Render the final layout.
  // Calculate the starting Y to vertically center the entire text block.
  let currentY = topMargin + (availableH - textHeight) / 2 + (fontSize * 0.8);

  ctx.textAlign = 'left';
  ctx.font = `600 ${fontSize}px ${safeFont}`;
  for (let i = 0; i < logicalLines.length; i++) {
    const logicalLine = logicalLines[i];
    const physicalLines = wordWrapWithHighlights(ctx, logicalLine, contentMaxWidth - 20, fontSize, safeFont); // Added buffer

    for (const line of physicalLines) {
      const words = line.split(' ');
      renderMixedLine(ctx, words, leftMargin, currentY, safeFont, fontSize);
      currentY += lineHeight;
    }

    if (i < logicalLines.length - 1 && !(logicalLines[i].startsWith('→') && logicalLines[i + 1].startsWith('→'))) {
      currentY += lineHeight / 2; // Reduced gap for better spacing
    }
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}