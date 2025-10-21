// lib/services/patternSpotterGenerator.ts

import { createCanvas, CanvasRenderingContext2D } from 'canvas';

import { getSafeFont, wordWrapWithHighlights } from '../utils/canvasUtils';

/**
 * Renders a single line of text that may contain highlighted words.
 * (Copied from satiristGenerator)
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

    // Use 'bold' for highlighted words, '600' (semi-bold) for regular text
    ctx.font = `${isHighlighted ? 'bold' : '600'} ${fontSize}px ${font}`;
    ctx.fillStyle = isHighlighted ? '#FF4500' : '#001F3F'; // Orange for highlight, dark blue for regular
    ctx.fillText(text, currentX, y);
    currentX += ctx.measureText(text).width;
  }
  return currentX;
}
/**
 * Highlights a broad range of numerical metrics.
 * (Copied from satiristGenerator)
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
    '(\\b\\d[\\d,.]*\\+\\b)',

    // Pattern 5 (REFINED): Standalone numbers followed by a curated list of common metric-related nouns.
    '(\\b\\d[\\d,.]*(?:-\\w+)?\\s+(?:applications|startups|funded|cities|city|year|years|minute|minutes|users|customers|subscribers)\\b)'

  ].join('|'), 'gi'); // 'g' for global search, 'i' for case-insensitive

  return text.replace(metricDetectionRegex, (match) => `【${match.trim()}】`);
}

/**
 * Calculates the total vertical space needed for all text content.
 * This version respects each line from the input as a distinct block,
 * adding padding between them.
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
  let totalHeight = 0;

  for (let i = 0; i < lines.length; i++) {
    const highlightedLine = highlightNumbers(lines[i]);
    const wrappedLines = wordWrapWithHighlights(ctx, highlightedLine, contentMaxWidth, fontSize, safeFont);
    
    totalHeight += wrappedLines.length * lineHeight;

    // Add spacing *after* each original line block, except the last one
    if (i < lines.length - 1) {
      totalHeight += lineHeight / 1.5; // Strategic gap between Hook, Data, Insight
    }
  }

  return totalHeight;
}

/**
 * The main function to generate the image for PatternSpotter.
 * It renders the 4-line structure (Hook, Cause, Effect, Insight) clearly.
 */
export async function generatePatternSpotterImage(
  imageContent: string,
): Promise<Buffer> {
  const width = 1200;
  const height = 675;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  const safeFont = getSafeFont('Poppins');

  // Draw background (Clean, professional white/grey)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(1, '#F4F7F6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw the side accent bar (Strategic Blue)
  ctx.fillStyle = '#004AAD'; // A strong, strategic blue
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
  let fontSize = 42; // Start slightly larger
  let textHeight = 0;
  while (fontSize > 18) {
    textHeight = calculateTotalTextHeight(ctx, lines, contentMaxWidth - 20, safeFont, fontSize); // Added buffer
    if (textHeight <= availableH) break;
    fontSize -= 1;
  }
  const lineHeight = fontSize * 1.4;
  
  // 3. Render the final layout.
  // Calculate the starting Y to vertically center the entire text block.
  let currentY = topMargin + (availableH - textHeight) / 2 + (fontSize * 0.8);

  ctx.textAlign = 'left';

  // Loop through each original line (Hook, Cause, Effect, Insight)
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const highlightedLine = highlightNumbers(originalLine);
    
    // The "Hook" (line 0) and "Insight" (last line) are rendered in 'bold'.
    // The "Data Pair" (middle lines) are rendered in '600' (semi-bold).
    const isHookOrInsight = (i === 0 || i === lines.length - 1);
    const weight = isHookOrInsight ? 'bold' : '600';
    
    // We modify renderMixedLine to respect this base weight
    // For simplicity, we'll just set the font here. renderMixedLine will override
    // for highlighted numbers, which is fine.
    ctx.font = `${weight} ${fontSize}px ${safeFont}`;

    const physicalLines = wordWrapWithHighlights(ctx, highlightedLine, contentMaxWidth - 20, fontSize, safeFont);

    for (const line of physicalLines) {
      const words = line.split(' ');
      
      // We must override renderMixedLine to respect the weight
      // Easiest way: create a custom render function for this generator
      renderPatternSpotterLine(ctx, words, leftMargin, currentY, safeFont, fontSize, weight);
      currentY += lineHeight;
    }

    // Add spacing *after* each block, except the last one
    if (i < lines.length - 1) {
      currentY += lineHeight / 1.5;
    }
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

/**
 * Custom render function for PatternSpotter.
 * Renders a line with a 'base' weight (bold or 600) and an 'accent' weight (bold).
 */
function renderPatternSpotterLine(
  ctx: CanvasRenderingContext2D,
  lineWords: string[],
  x: number,
  y: number,
  font: string,
  fontSize: number,
  baseWeight: 'bold' | '600'
): number {
  let currentX = x;
  for (let i = 0; i < lineWords.length; i++) {
    if (i > 0) {
      ctx.font = `${baseWeight} ${fontSize}px ${font}`;
      currentX += ctx.measureText(' ').width;
    }
    const word = lineWords[i];
    const text = word.replace(/【|】/g, '');
    const isHighlighted = word.startsWith('【') && word.endsWith('】');

    // Highlighted numbers are *always* bold.
    // Regular text uses the baseWeight.
    ctx.font = `${isHighlighted ? 'bold' : baseWeight} ${fontSize}px ${font}`;
    ctx.fillStyle = isHighlighted ? '#FF4500' : '#001F3F'; // Orange for highlight, dark blue for regular
    ctx.fillText(text, currentX, y);
    currentX += ctx.measureText(text).width;
  }
  return currentX;
}