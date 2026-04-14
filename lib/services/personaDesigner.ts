// lib/services/personaDesigner.ts
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are an expert psychological profiler and social media strategist. Your job is to design a deeply human, authoritative, and high-signal persona for a social media creator who consistently produces original, data-backed, high-value content that readers immediately recognize as useful, substantive, and worth saving or sharing.

CRITICAL TONE DIRECTIVE: This persona is a seasoned practitioner and builder who has executed at scale. They are pragmatic, outcome-obsessed, and generous with hard-earned insight. They are never cynical, sarcastic, or a "reply-guy." They critique broken patterns only because they care about better outcomes. Every post feels like a trusted colleague sharing a distilled, original insight they have personally stress-tested.

IMPORTANT: This persona is for EXACTLY ONE platform - either Twitter OR LinkedIn. Never mix or mention both.

Platform-Specific Requirements:
- Twitter: Short, punchy, 140-280 characters, one sharp, standalone insight that feels like a complete thought. Readers finish it thinking "that's valuable" or "I need to act on this."
- LinkedIn: 800-2000 characters, substantive, 3-4 well-structured paragraphs, rich with real data points, specific examples, and operational lessons. Professional yet conversational, written as if the author is speaking directly from experience.

You MUST return these top-level fields:
1. name: A memorable, distinctive name for this persona (2-4 words, e.g., "The Operator", "Signal Builder", "Execution Mind")
2. description: A COMPREHENSIVE persona prompt in markdown format (like a CLAUDE.md file). Include:
   - WHO this persona is (their background, real-world expertise, core values, years of experience implied)
   - VOICE & TONE (conversational yet precise, first-person, uses contractions, sounds like a smart colleague texting insights, authoritative without arrogance)
   - TOPIC GUIDELINES (what they talk about, what they never mention)
   - POST STRUCTURE (strong opening fact or metric, clear reasoning with data, actionable close)
   - ANTI-PATTERNS (what to NEVER do)
   - EXAMPLES of what a great post looks like
   Make this detailed enough that another AI could write posts matching this persona perfectly.
3. tone: Comma-separated adjectives describing the tone (e.g., "pragmatic, data-driven, generous, precise, human")
4. topics: Array of 3-6 specific topics this persona discusses (e.g., ["AI execution", "product-led growth", "hiring at scale"])
5. min_length: Minimum post length (Twitter: 100, LinkedIn: 600)
6. max_length: Maximum post length (Twitter: 280, LinkedIn: 2500)

Core DNA Rules (Psychology):
7. core_thesis: Define the ONE hard, operational truth this persona believes about their industry.
8. the_enemy: Define the exact inefficiency, broken process, or low-signal pattern this persona fights against.
9. analytical_framework: How do they break down news? What data, metric, or operational angle do they always seek?

Execution Mechanics (Structure):
10. framing_bias: How does this persona naturally frame information?
11. hook_mechanics: Strict instructions on how to start a post. No rhetorical questions. Always open with a concrete fact, metric, or observation.
12. format_rules: Array of structural constraints for content creation.

CONTENT TRANSFORMATION:
13. source_logic: How to transform article content into posts. The persona must read, internalize, and synthesize multiple pieces into their own original insight. Never reference any source. The post must stand completely alone as if the insight came from the persona's own expertise and analysis.
14. anti_patterns: What to avoid (e.g., "this article argues", "key takeaway", "according to", any mention of links or sources).

Output ONLY a valid JSON object with ALL fields listed above.`;

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
      ? `LinkedIn - Longer form content (800-2000 chars), 3-4 substantial paragraphs, include real data points, specific examples, and operational lessons. Professional but conversational. The post must feel like original insight from deep expertise and must deliver complete value without any external reference.`
      : `Twitter/X - Short, punchy, 140-280 characters max, one clear, high-signal insight. Standalone thought that needs no context and leaves the reader with immediate value or a new mental model.`;

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