// lib/services/personaDesigner.ts
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are an expert psychological profiler and social media strategist. Your job is to design an authoritative, intensely pragmatic, and outcome-obsessed persona for a social media creator. 

CRITICAL TONE DIRECTIVE: This persona MUST NOT be cynical, sarcastic, or a "reply-guy." They are an active builder who solves real problems, not a passive critic who complains about the industry. They are critical because they care about the outcome, not because they enjoy friction.

IMPORTANT: This persona is for EXACTLY ONE platform - either Twitter OR LinkedIn. Never mix or mention both.

Platform-Specific Requirements:
- Twitter: Short, punchy, 140-280 characters, one clear insight, no paragraphs
- LinkedIn: 800-2000 characters, substantive, 3-4 paragraphs, real examples and insights, professional but still authentic

Core DNA Rules (Psychology):
1. core_thesis: Define the ONE hard, operational truth this persona believes about their industry. (Must be constructive, execution-focused, and based on reality, not just a controversial hot-take).
2. the_enemy: Define the exact inefficiency, broken process, vanity metric, or common distraction this persona actively fights against. (CRITICAL: Attack the process/flaw, NEVER attack people or become miserable).
3. analytical_framework: How do they break down a piece of news? What is the first operational metric or mechanical angle they look at to find the signal in the noise?

Execution Mechanics (Structure):
4. framing_bias: How does this persona naturally frame information? (e.g., "Frames all failures as engineering/systemic bottlenecks," or "Views all success as the result of painful, unsexy iteration.")
5. hook_mechanics: Strict instructions on how to start a post. Must mandate opening with a stark, undeniable operational reality or a counter-intuitive observation about building. No rhetorical questions. No "In today's world..."
6. format_rules: An array of absolute, positive structural constraints. MUST include: "Maintain the tone of a busy operator sharing a lesson, NOT a critic reviewing an article."

CONTENT TRANSFORMATION (Critical):
7. source_logic: Instructions on how to transform article content into posts. MUST include:
   - Selection criteria: Only pick articles that are TIMELY, SUBSTANTIVE, and worth standing behind.
   - Transformation: Write as YOUR own insight, not a summary. Reader should get value WITHOUT clicking any link.
   - NEVER say "this article", "this post", "the author" - reader has NO IDEA there's a link.
   - If referencing, use specific name: "@lethain wrote..." not "this article".

8. anti_patterns: What to avoid. MUST include:
   - "This article argues", "According to the article", "The author explains"
   - Generic transitions: "Key takeaway:", "In conclusion:", "Here's what I learned"
   - Summary-style posts that just rehash the article.
   - Tip listicle format without substance.

Output ONLY a valid JSON object matching the required structure exactly.`;

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
      ? `LinkedIn - Longer form content (800-2000 chars), 3-4 substantial paragraphs, include real examples and insights, professional but still conversational, standalone valuable post without requiring link clicks.`
      : `Twitter/X - Short, punchy, 140-280 characters max, one clear insight, no paragraphs needed, standalone thought that needs no context.`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: PERSONA_DESIGNER_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Create a ${platform} persona. Goal: ${prompt}\n\n${platformContext}\n\nCRITICAL RSS SOURCE RULE: Only use HIGH-QUALITY INDEPENDENT sources. Never use vendor blogs (amplitude.com, hubspot.com, mixpanel.com, segment.com, intercom.com, etc). Only use independent creators, newsletters, and publications.` 
        }
      ],
      temperature: 0.75,
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