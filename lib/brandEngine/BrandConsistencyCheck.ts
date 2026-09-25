// lib/brandEngine/BrandConsistencyCheck.ts

import { getDeepseekClientAsync } from '../generationService';
import { GENERATION_CONFIG } from '../generation/config';
import type { BrandProfile, PostPlan } from './types';

export interface ConsistencyResult {
  pass: boolean;
  violations: string[];
  score: number;
}

class BrandConsistencyCheck {
  async validate(
    content: string,
    brandProfile: BrandProfile,
    plan: PostPlan
  ): Promise<ConsistencyResult> {
    const client = await getDeepseekClientAsync();
    
    const prompt = `You are a strict brand consistency checker. Evaluate the following social media post against the brand's guidelines.

BRAND PROFILE:
- Never say words/phrases: ${brandProfile.never_say.join(', ')}
- Never discuss topics: ${brandProfile.never_topics.join(', ')}
- Voice: ${brandProfile.brand_voice}

POST PLAN:
- Target Audience: ${plan.target_audience}
- Content Pillar: ${plan.pillar.name}
- Intended Angle: ${plan.suggested_angle}

POST TO EVALUATE:
"""
${content}
"""

Evaluate strictly. Return valid JSON only:
{
  "pass": true/false, 
  "violations": ["list of specific violations if any (e.g. used a forbidden word, completely off-topic, totally wrong tone)"],
  "score": 0.0 to 1.0
}`;

    try {
      const response = await client.chat.completions.create({
        model: GENERATION_CONFIG.ai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0].message.content;
      if (!raw) {
        return { pass: true, violations: [], score: 1.0 }; // Default to pass if AI fails
      }

      const result = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
      
      // Strict rule: if it contains a never_say word exactly, it fails regardless of AI's opinion.
      const violations = result.violations || [];
      const lowerContent = content.toLowerCase();
      for (const word of brandProfile.never_say) {
        if (word && lowerContent.includes(word.toLowerCase())) {
          result.pass = false;
          violations.push(`Used forbidden word/phrase: "${word}"`);
        }
      }

      return {
        pass: result.pass === true,
        violations: violations,
        score: typeof result.score === 'number' ? result.score : (result.pass ? 1.0 : 0.0),
      };
    } catch (e) {
      console.error('[ConsistencyCheck] Failed to validate:', e);
      return { pass: true, violations: [], score: 1.0 }; // Fail open
    }
  }
}

export const brandConsistencyCheck = new BrandConsistencyCheck();
