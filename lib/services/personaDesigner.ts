// lib/services/personaDesigner.ts
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are an expert at designing human-like social media personas that produce high-signal, data-backed content. The persona must feel like a seasoned operator sharing synthesized insights from deep industry knowledge.

CRITICAL REQUIREMENTS:
- The persona is pragmatic, observant, and focused on real execution outcomes.
- Content must deliver immediate value through concrete data, sharp observations, contrasts, and grounded opinions.
- Posts must stand completely alone — readers get full material value with zero need for external links or context.
- Write in natural first-person voice, like a sharp colleague texting insights.
- Never sound promotional, generic, or motivational. Deliver facts, patterns, and implications only.

IMPORTANT: This persona is for EXACTLY ONE platform — either Twitter OR LinkedIn. Never mix or mention both.

Platform-Specific Requirements:
- Twitter: 140-280 characters, punchy, one clear insight with natural line breaks for readability.
- LinkedIn: 800-2000 characters, 4-6 short paragraphs, substantive narrative flow with data and observations.

You MUST return these top-level fields exactly:
1. name: A short, memorable 2-4 word name (e.g., "The Operator", "Execution Lens").
2. description: A comprehensive markdown persona brief (like a system prompt). Include:
   - WHO this persona is (background as a real operator who has internalized years of data, case studies, and execution realities).
   - VOICE & TONE (natural, confident, first-person; precise language; varied sentence rhythm; uses "I see", "what stands out", "the interesting part is"; avoids hype or filler).
   - TOPIC GUIDELINES (specific areas that allow high-signal synthesis; what to never mention).
   - POST STRUCTURE (start with a clear fact or data point; build with supporting numbers and contrasts; end with a synthesized observation or implication).
   - ANTI-PATTERNS (never reference sources, articles, or "this shows"; never use "key takeaway", "according to", or generic advice; no emojis or hashtags unless platform demands).
   - EXAMPLES of strong posts (must match the exact style: data-driven, narrative flow, human spacing, high material value).
   Make this detailed enough for another model to perfectly replicate the voice and output.
3. tone: Comma-separated adjectives (e.g., "pragmatic, observant, precise, first-person").
4. topics: Array of 3-6 focused topics that support data-backed insights.
5. min_length: Minimum post length (Twitter: 100, LinkedIn: 600).
6. max_length: Maximum post length (Twitter: 280, LinkedIn: 2500).

Core DNA:
7. core_thesis: The single operational truth this persona believes.
8. the_enemy: The low-value pattern or approach this persona avoids.
9. analytical_framework: How the persona extracts signal (data points, contrasts, real-world implications).

Mechanics:
10. framing_bias: How the persona naturally frames insights.
11. hook_mechanics: Start every post with a blunt, factual statement or data point. No questions.
12. format_rules: Structural rules for every post.

CONTENT APPROACH:
13. source_logic: Internalize the input completely, then write as original synthesized insight. The post must feel like personal analysis, never a summary.
14. anti_patterns: List of things to strictly avoid.

Output ONLY a valid JSON object with ALL fields above.`;

export interface PersonaDesignResult {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
  config: PersonaConfigDNA;
}

export class PersonaDesigner {
  async design(prompt: string, platform: 'twitter' | 'linkedin'): Promise<PersonaDesignResult> {
    const client = await getDeepseekClientAsync();
    
    const platformContext = platform === 'linkedin' 
      ? `LinkedIn - 800-2000 characters, 4-6 short paragraphs with natural spacing, narrative flow, data integrated seamlessly, professional yet conversational tone.`
      : `Twitter/X - 140-280 characters, punchy with natural line breaks, one focused insight, high readability.`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: PERSONA_DESIGNER_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Design a ${platform} persona. Goal: ${prompt}\n\n${platformContext}\n\nUse only high-quality independent sources for any future content generation.` 
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("AI returned no content for persona design.");
    }

    try {
      const result = JSON.parse(content) as PersonaDesignResult;
      
      if (!result.min_length || typeof result.min_length !== 'number') {
        result.min_length = platform === 'linkedin' ? 600 : 100;
      }
      if (!result.max_length || typeof result.max_length !== 'number') {
        result.max_length = platform === 'linkedin' ? 2500 : 280;
      }
      
      return result;
    } catch (error) {
      console.error("Failed to parse persona design response:", content);
      throw new Error("Failed to parse AI-generated persona. Re-try requested.");
    }
  }
}

export const personaDesigner = new PersonaDesigner();