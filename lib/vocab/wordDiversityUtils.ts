/**
 * Word Diversity Utilities for Enhanced Vocabulary Variety
 * Provides advanced mechanisms to ensure maximum word variety and prevent repetition
 */

export interface WordAnalysis {
  word: string;
  firstLetter: string;
  length: number;
  syllableCount: number;
  estimatedOrigin: 'latin' | 'greek' | 'germanic' | 'french' | 'other';
  semanticCategory: string;
}

/**
 * Estimates the etymology/origin of a word based on common patterns
 */
function estimateWordOrigin(word: string): 'latin' | 'greek' | 'germanic' | 'french' | 'other' {
  const lowerWord = word.toLowerCase();
  
  // Greek patterns
  if (lowerWord.includes('phil') || lowerWord.includes('graph') || lowerWord.includes('log') || 
      lowerWord.includes('phon') || lowerWord.includes('psych') || lowerWord.endsWith('ism') ||
      lowerWord.includes('chron') || lowerWord.includes('geo')) {
    return 'greek';
  }
  
  // Latin patterns
  if (lowerWord.endsWith('tion') || lowerWord.endsWith('sion') || lowerWord.endsWith('ous') ||
      lowerWord.endsWith('ive') || lowerWord.endsWith('ence') || lowerWord.endsWith('ance') ||
      lowerWord.includes('spect') || lowerWord.includes('dict') || lowerWord.includes('port')) {
    return 'latin';
  }
  
  // French patterns
  if (lowerWord.endsWith('ment') || lowerWord.endsWith('age') || lowerWord.endsWith('eur') ||
      lowerWord.includes('ch') && lowerWord.length < 8) {
    return 'french';
  }
  
  // Germanic patterns (simpler, often shorter words)
  if (lowerWord.length <= 5 && !lowerWord.includes('qu') && !lowerWord.endsWith('tion')) {
    return 'germanic';
  }
  
  return 'other';
}

/**
 * Estimates syllable count using basic rules
 */
function estimateSyllableCount(word: string): number {
  const vowels = 'aeiouyAEIOUY';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e'
  if (word.toLowerCase().endsWith('e') && count > 1) {
    count--;
  }
  
  return Math.max(1, count);
}

/**
 * Categorizes words into semantic categories for diversity tracking
 */
function categorizeWord(word: string): string {
  const lowerWord = word.toLowerCase();
  
  // Emotional/psychological
  if (/(anxi|emot|feel|mood|spir|soul|heart|mind|psych)/.test(lowerWord)) {
    return 'emotional-psychological';
  }
  
  // Physical/sensory
  if (/(touch|taste|sight|sound|smell|sens|phys|body|skin|eye|ear)/.test(lowerWord)) {
    return 'physical-sensory';
  }
  
  // Intellectual/cognitive
  if (/(think|cogn|intel|reason|logic|analy|study|learn|know|wise|smart)/.test(lowerWord)) {
    return 'intellectual-cognitive';
  }
  
  // Social/interpersonal
  if (/(social|friend|family|group|team|community|relation|interact|commun)/.test(lowerWord)) {
    return 'social-interpersonal';
  }
  
  // Action/movement
  if (/(move|action|act|run|walk|jump|flow|shift|chang|trans|motion)/.test(lowerWord)) {
    return 'action-movement';
  }
  
  // Time/temporal
  if (/(time|temp|chron|moment|period|duration|brief|long|quick|slow|past|future)/.test(lowerWord)) {
    return 'temporal';
  }
  
  // Evaluative/qualitative
  if (/(good|bad|qual|value|worth|excel|super|poor|fine|great|terrible|wonder)/.test(lowerWord)) {
    return 'evaluative-qualitative';
  }
  
  return 'general';
}

/**
 * Analyzes a word to extract diversity characteristics
 */
export function analyzeWord(word: string): WordAnalysis {
  return {
    word: word.toLowerCase(),
    firstLetter: word.charAt(0).toLowerCase(),
    length: word.length,
    syllableCount: estimateSyllableCount(word),
    estimatedOrigin: estimateWordOrigin(word),
    semanticCategory: categorizeWord(word)
  };
}

/**
 * Checks if a new word provides sufficient diversity compared to recent words
 */
export function checkWordDiversity(
  newWord: string, 
  recentWords: string[], 
  minDiversityScore: number = 0.7
): { isAcceptable: boolean; diversityScore: number; conflicts: string[] } {
  
  const newAnalysis = analyzeWord(newWord);
  const recentAnalyses = recentWords.map(analyzeWord);
  
  const conflicts: string[] = [];
  let diversityScore = 1.0;
  
  // Check for exact matches
  if (recentWords.some(w => w.toLowerCase() === newWord.toLowerCase())) {
    conflicts.push('exact_duplicate');
    diversityScore -= 1.0;
  }
  
  // Check first letter diversity (recent 5 words should have different first letters)
  const recentFirstLetters = recentAnalyses.slice(0, 5).map(a => a.firstLetter);
  if (recentFirstLetters.includes(newAnalysis.firstLetter)) {
    conflicts.push('first_letter_conflict');
    diversityScore -= 0.3;
  }
  
  // Check semantic category diversity (recent 3 words should be from different categories)
  const recentCategories = recentAnalyses.slice(0, 3).map(a => a.semanticCategory);
  if (recentCategories.includes(newAnalysis.semanticCategory)) {
    conflicts.push('semantic_category_conflict');
    diversityScore -= 0.4;
  }
  
  // Check etymology diversity (alternate origins)
  const recentOrigins = recentAnalyses.slice(0, 4).map(a => a.estimatedOrigin);
  const originFrequency = recentOrigins.filter(o => o === newAnalysis.estimatedOrigin).length;
  if (originFrequency > 1) {
    conflicts.push('etymology_repetition');
    diversityScore -= 0.2;
  }
  
  // Check syllable diversity
  const recentSyllableCounts = recentAnalyses.slice(0, 3).map(a => a.syllableCount);
  if (recentSyllableCounts.includes(newAnalysis.syllableCount)) {
    diversityScore -= 0.1;
  }
  
  // Check length diversity
  const recentLengths = recentAnalyses.slice(0, 3).map(a => a.length);
  if (recentLengths.includes(newAnalysis.length)) {
    diversityScore -= 0.1;
  }
  
  return {
    isAcceptable: diversityScore >= minDiversityScore,
    diversityScore: Math.max(0, diversityScore),
    conflicts
  };
}

/**
 * Generates diversity guidance for the AI based on recent word patterns
 */
export function generateDiversityGuidance(recentWords: string[]): string {
  if (recentWords.length === 0) {
    return 'Choose any appropriate vocabulary word.';
  }
  
  const recentAnalyses = recentWords.slice(0, 10).map(analyzeWord);
  const guidance: string[] = [];
  
  // Analyze first letter patterns
  const recentFirstLetters = recentAnalyses.slice(0, 5).map(a => a.firstLetter);
  const letterFreq = recentFirstLetters.reduce((acc, letter) => {
    acc[letter] = (acc[letter] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const overusedLetters = Object.entries(letterFreq)
    .filter(([, count]) => count > 1)
    .map(([letter]) => letter);
  
  if (overusedLetters.length > 0) {
    guidance.push(`AVOID words starting with: ${overusedLetters.join(', ').toUpperCase()}`);
  }
  
  // Analyze semantic categories
  const recentCategories = recentAnalyses.slice(0, 5).map(a => a.semanticCategory);
  const categoryFreq = recentCategories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const overusedCategories = Object.entries(categoryFreq)
    .filter(([, count]) => count > 1)
    .map(([cat]) => cat.replace(/-/g, ' '));
  
  if (overusedCategories.length > 0) {
    guidance.push(`AVOID semantic categories: ${overusedCategories.join(', ')}`);
  }
  
  // Etymology diversity
  const recentOrigins = recentAnalyses.slice(0, 6).map(a => a.estimatedOrigin);
  const originCounts = recentOrigins.reduce((acc, origin) => {
    acc[origin] = (acc[origin] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const underrepresentedOrigins = ['latin', 'greek', 'germanic', 'french']
    .filter(origin => (originCounts[origin] || 0) === 0);
  
  if (underrepresentedOrigins.length > 0) {
    guidance.push(`PREFER words with ${underrepresentedOrigins.join(' or ')} origins`);
  }
  
  if (guidance.length === 0) {
    return 'Choose a word that maximizes variety from recent selections.';
  }
  
  return guidance.join('. ') + '.';
}

/**
 * Enhanced word exclusion list generator that considers similarity patterns
 */
export function generateEnhancedExclusionGuidance(recentWords: string[]): string {
  if (recentWords.length === 0) return '';
  
  const recentAnalyses = recentWords.map(analyzeWord);
  const exclusions: string[] = [];
  
  // Direct word exclusions
  exclusions.push(`NEVER use these exact words: ${recentWords.join(', ')}`);
  
  // Letter-based exclusions
  const recentFirstLetters = [...new Set(recentAnalyses.slice(0, 8).map(a => a.firstLetter))];
  if (recentFirstLetters.length > 0) {
    exclusions.push(`AVOID words starting with: ${recentFirstLetters.join(', ').toUpperCase()}`);
  }
  
  // Semantic exclusions
  const recentCategories = [...new Set(recentAnalyses.slice(0, 5).map(a => a.semanticCategory))];
  if (recentCategories.length > 0) {
    exclusions.push(`AVOID these semantic domains: ${recentCategories.join(', ')}`);
  }
  
  return exclusions.join('. ') + '.';
}