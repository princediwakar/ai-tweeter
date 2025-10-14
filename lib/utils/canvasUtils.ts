// src/utils/canvasUtils.ts

import { CanvasRenderingContext2D } from 'canvas';

/**
 * Get a safe font family with fallback validation
 */
export function getSafeFont(preferred: string): string {
  // For this environment, we assume 'Poppins' is available.
  // In a real Node-Canvas setup, you would use registerFont.
  return preferred || 'sans-serif';
}

/**
 * Wrap text to fit within specified width (simple version for non-highlighted text)
 * Assumes ctx.font is set appropriately before calling.
 */
export function wordWrap(
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
 * Dynamically adjusts font size to fit text within a max width.
 */
export function fitTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  maxWidth: number,
  initialSize: number
): string {
  let fontSize = initialSize;
  do {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    fontSize -= 2;
  } while (ctx.measureText(text).width > maxWidth && fontSize > 20);

  return ctx.font;
}

/**
 * Measures the rendered width of a line, accounting for highlighted words (bold) and removing brackets.
 */
export function measureRenderedLineWidth(
  ctx: CanvasRenderingContext2D,
  words: string[],
  fontSize: number,
  fontFamily: string
): number {
  let totalWidth = 0;
  for (let i = 0; i < words.length; i++) {
    if (i > 0) {
      ctx.font = `600 ${fontSize}px ${fontFamily}`;
      totalWidth += ctx.measureText(' ').width;
    }

    const word = words[i];
    const text = word.replace(/【|】/g, '');
    const isHighlighted = word.startsWith('【') && word.endsWith('】');

    ctx.font = `${isHighlighted ? 'bold' : '600'} ${fontSize}px ${fontFamily}`;
    totalWidth += ctx.measureText(text).width;
  }
  return totalWidth;
}

/**
 * Wraps text to fit within specified width, accounting for highlighted words (bold font) and removing brackets for rendering.
 * Uses rendered widths for accurate wrapping.
 */
export function wordWrapWithHighlights(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLineWords: string[] = [];

  for (const word of words) {
    const testLineWords = [...currentLineWords, word];
    const testWidth = measureRenderedLineWidth(ctx, testLineWords, fontSize, fontFamily);

    if (testWidth > maxWidth && currentLineWords.length > 0) {
      lines.push(currentLineWords.join(' '));
      currentLineWords = [word];
    } else {
      currentLineWords.push(word);
    }
  }

  if (currentLineWords.length > 0) {
    lines.push(currentLineWords.join(' '));
  }

  return lines;
}