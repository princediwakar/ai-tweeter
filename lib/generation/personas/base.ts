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

  protected addCommonSuffix(prompt: string): string {
    return prompt + `\n\n━━━━━━━━━━━━━━━━━━━━━━
CRITICAL OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

🚨 CHARACTER LIMITS (STRICTLY ENFORCED):
• HARD MAXIMUM: 120 characters total
• IDEAL RANGE: 80-120 characters
• If you're writing 140+ chars, you're FAILING
• Count every character including spaces and punctuation
• Going over 120 chars = tweet gets truncated and ruined

WHY THIS MATTERS:
• Small account (96 followers) = shorter tweets get read completely
• Mobile users = longer tweets get skipped
• Quote tweet space = need room for others to add their take
• Engagement = inversely proportional to length at this stage

📋 FORMAT REQUIREMENTS:
• Return valid JSON object only
• Use exact field names from instructions (tweetText, selectedHeadlineNumber, etc.)
• NO hashtags in tweet text (waste of character budget)
• Always include empty "hashtags": [] array for compatibility
• Connect clauses directly - no em dashes, minimize punctuation

✂️ EDITING CHECKLIST BEFORE SUBMITTING:
1. Count characters - am I at 120 or under?
2. Can I cut ANY word without losing meaning?
3. Have I removed filler words (just, quietly, really, very)?
4. Have I removed advice language (should, can, need to)?
5. Am I stating what I see, not telling readers what to do?
6. Is every single character earning its place?

REMEMBER: At 96 followers, brevity = engagement. Every extra character reduces your chance of being read completely.`;
  }
}