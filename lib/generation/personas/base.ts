// lib/generation/personas/base.ts
import type { TweetGenerationConfig, GenerationContext } from '../types';
import type { Account } from '../../types';
import { GENERATION_CONFIG } from '../config';

export interface PersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string;
}

export abstract class BasePersonaGenerator implements PersonaGenerator {
  abstract generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string;

  protected addGibbiCTA(basePrompt: string, account: Account | null): string {
    if (account) {
      const isGibbiAccount = account.twitter_handle.includes('gibbi') || (account.name && account.name.toLowerCase().includes('gibbi'));
      if (isGibbiAccount && Math.random() < GENERATION_CONFIG.personas.englishVocabBuilder.ctaProbability) {
        return basePrompt + `\n\nIMPORTANT: Include a natural Gibbi AI mention like "Practice more English at gibbi.vercel.app" or "Improve your skills at gibbi.vercel.app" - keep it helpful and non-promotional.`;
      }
    }
    return basePrompt;
  }

  protected addCommonSuffix(prompt: string, maxChars: number = 280): string {
    return prompt + `\n\n━━━━━━━━━━━━━━━━━━━━━━
CRITICAL OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

🚨 CHARACTER LIMITS (STRICTLY ENFORCED):
• HARD MAXIMUM: ${maxChars} characters total
• Count every character including spaces and punctuation
• Going over ${maxChars} chars = content gets truncated and ruined

📋 FORMAT REQUIREMENTS:
• Return valid JSON object only
• Use exact field names from instructions (tweetText, selectedHeadlineNumber, etc.)
• NO hashtags in tweet text unless specifically instructed
• Connect clauses directly - minimize unnecessary punctuation

✂️ EDITING CHECKLIST BEFORE SUBMITTING:
1. Count characters - am I at ${maxChars} or under?
2. Can I cut ANY word without losing meaning?
3. Have I removed filler words (just, quietly, really, very)?
4. Is every single character earning its place?`;
  }
}