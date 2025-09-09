import { createCanvas, loadImage } from 'canvas';

export interface VocabularyCard {
  word: string;
  meaning: string;
  example?: string;
  pronunciation?: string;
  partOfSpeech?: string;
  synonyms?: string[];
}

export interface ImageConfig {
  enabled: boolean;
  unsplashQuery?: string;
  dimensions: {
    width: number;
    height: number;
  };
  textStyle: {
    wordSize: number;
    meaningSize: number;
    exampleSize: number;
    wordColor: string;
    meaningColor: string;
    exampleColor: string;
    fontFamily: string;
    backgroundColor: string;
    backgroundOpacity: number;
  };
}

export const TWITTER_IMAGE_CONFIG: ImageConfig = {
  enabled: true,
  unsplashQuery: 'minimal',
  dimensions: {
    width: 1200,
    height: 675, // Twitter's recommended 16:9 aspect ratio
  },
  textStyle: {
    wordSize: 72,
    meaningSize: 36,
    exampleSize: 28,
    wordColor: '#1a202c',
    meaningColor: '#2d3748',
    exampleColor: '#4a5568',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backgroundOpacity: 0.85,
  },
};

/**
 * Fetch a background image from Unsplash
 */
async function fetchUnsplashImage(query: string, width: number, height: number): Promise<string> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) {
    // Fallback to a solid color background
    console.warn('UNSPLASH_ACCESS_KEY not provided, using solid background');
    return '';
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&w=${width}&h=${height}`,
      {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch from Unsplash, using solid background');
      return '';
    }

    const data = await response.json();
    return data.urls.custom || data.urls.regular;
  } catch (error) {
    console.warn('Error fetching Unsplash image:', error);
    return '';
  }
}

/**
 * Wrap text to fit within specified width
 */
function wrapText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any, // Use any to avoid Canvas type conflicts
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

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
 * Generate a vocabulary card image
 */
export async function generateVocabularyCardImage(
  card: VocabularyCard,
  config: ImageConfig = TWITTER_IMAGE_CONFIG
): Promise<Buffer> {
  const { width, height } = config.dimensions;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fetch and load background image
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

  // Draw background
  if (backgroundImage) {
    // Draw the background image, covering the entire canvas
    ctx.drawImage(backgroundImage, 0, 0, width, height);
    
    // Add a semi-transparent overlay to ensure text readability
    ctx.fillStyle = config.textStyle.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Use solid background
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, width, height);
  }

  // Set up text properties
  const padding = 60;
  const contentWidth = width - (padding * 2);

  // Calculate vertical spacing
  let currentY = padding + 80;

  // Draw word (main title)
  ctx.font = `bold ${config.textStyle.wordSize}px ${config.textStyle.fontFamily}`;
  ctx.fillStyle = config.textStyle.wordColor;
  ctx.textAlign = 'center';
  ctx.fillText(card.word.toUpperCase(), width / 2, currentY);
  currentY += config.textStyle.wordSize + 20;

  // Draw part of speech and pronunciation if available
  if (card.partOfSpeech || card.pronunciation) {
    ctx.font = `italic ${config.textStyle.exampleSize}px ${config.textStyle.fontFamily}`;
    ctx.fillStyle = config.textStyle.exampleColor;
    const subInfo = [
      card.partOfSpeech,
      card.pronunciation && `/${card.pronunciation}/`
    ].filter(Boolean).join(' ');
    ctx.fillText(subInfo, width / 2, currentY);
    currentY += config.textStyle.exampleSize + 30;
  }

  // Draw meaning
  ctx.font = `${config.textStyle.meaningSize}px ${config.textStyle.fontFamily}`;
  ctx.fillStyle = config.textStyle.meaningColor;
  ctx.textAlign = 'center';
  
  const meaningLines = wrapText(ctx, card.meaning, contentWidth - 100);
  meaningLines.forEach((line) => {
    ctx.fillText(line, width / 2, currentY);
    currentY += config.textStyle.meaningSize + 10;
  });
  currentY += 20;

  // Draw example if available
  if (card.example) {
    ctx.font = `italic ${config.textStyle.exampleSize}px ${config.textStyle.fontFamily}`;
    ctx.fillStyle = config.textStyle.exampleColor;
    
    const exampleLines = wrapText(ctx, `"${card.example}"`, contentWidth - 80);
    exampleLines.forEach((line) => {
      ctx.fillText(line, width / 2, currentY);
      currentY += config.textStyle.exampleSize + 8;
    });
    currentY += 20;
  }

  // Draw synonyms if available
  if (card.synonyms && card.synonyms.length > 0) {
    ctx.font = `${config.textStyle.exampleSize}px ${config.textStyle.fontFamily}`;
    ctx.fillStyle = config.textStyle.exampleColor;
    const synonymsText = `Synonyms: ${card.synonyms.join(', ')}`;
    const synonymLines = wrapText(ctx, synonymsText, contentWidth - 80);
    synonymLines.forEach((line) => {
      ctx.fillText(line, width / 2, currentY);
      currentY += config.textStyle.exampleSize + 8;
    });
  }

  // Add a subtle border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

/**
 * Extract vocabulary card data from AI-generated content
 */
export function extractVocabularyCard(content: string): VocabularyCard | null {
  // Look for patterns like:
  // Word: "ubiquitous"
  // Meaning: "present everywhere"
  // Example: "Smartphones are ubiquitous..."
  
  const wordMatch = content.match(/(?:Word|📚|💡)[:\s]*["']?([A-Za-z\-]+)["']?/i);
  const meaningMatch = content.match(/(?:means?|meaning|definition)[:\s]*["']?([^"\n.!?]+)["']?/i);
  const exampleMatch = content.match(/(?:example|e\.g\.|for instance)[:\s]*["']?([^"\n]+)["']?/i);
  const synonymsMatch = content.match(/(?:synonyms?)[:\s]*([^#\n]+)/i);

  if (!wordMatch || !meaningMatch) {
    return null;
  }

  const synonyms = synonymsMatch 
    ? synonymsMatch[1].split(/[,;&]/).map(s => s.trim()).filter(s => s.length > 0)
    : undefined;

  return {
    word: wordMatch[1].toLowerCase(),
    meaning: meaningMatch[1].trim(),
    example: exampleMatch ? exampleMatch[1].trim() : undefined,
    synonyms: synonyms && synonyms.length > 0 ? synonyms : undefined,
  };
}

/**
 * Generate image for persona if image generation is enabled
 */
export async function generatePersonaImage(
  content: string,
  personaKey: string,
  config?: ImageConfig
): Promise<Buffer | null> {
  // Only generate images for vocabulary builder persona for now
  if (personaKey !== 'english_vocab_builder') {
    return null;
  }

  const vocabularyCard = extractVocabularyCard(content);
  if (!vocabularyCard) {
    return null;
  }

  return generateVocabularyCardImage(vocabularyCard, config);
}