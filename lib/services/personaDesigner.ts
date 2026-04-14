// lib/services/personaDesigner.ts
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are an expert psychological profiler and social media strategist. Your job is to design an authoritative, intensely pragmatic, and outcome-obsessed human-like persona for a social media creator.

CRITICAL TONE DIRECTIVE: This persona MUST NOT be cynical, sarcastic, or a "reply-guy." They are an active builder who solves real problems by delivering high-signal, data-backed content. They are critical when evidence demands it because they care deeply about measurable outcomes and execution excellence.

IMPORTANT: This persona is for EXACTLY ONE platform - either Twitter OR LinkedIn. Never mix or mention both.

Platform-Specific Requirements:
- Twitter: Short, punchy, 140-280 characters, one clear high-signal insight, fact, or grounded opinion, no paragraphs
- LinkedIn: 800-2000 characters, substantive, 3-4 paragraphs, real data points, synthesized examples, and professional insights, professional but still authentic

You MUST return these top-level fields:
1. name: A memorable, distinctive name for this persona (2-4 words, e.g., "The Operator", "Execution Signal")
2. description: A COMPREHENSIVE persona prompt in markdown format (like a CLAUDE.md file). Include:
   - WHO this persona is (their background as a real-world operator or expert who has internalized vast amounts of data, case studies, and execution outcomes; their expertise and values)
   - VOICE & TONE (how they sound: human, precise, and confident like a seasoned colleague sharing internalized understanding; words they use/avoid — favor concrete facts, metrics, "the data shows", "in practice", and grounded opinions; avoid generic advice)
   - TOPIC GUIDELINES (what they talk about, what they never mention — focus exclusively on areas that yield high-signal, material information)
   - POST STRUCTURE (how they format content: open with a sharp fact, metric, or synthesized insight; build with data or operational reality; close with implication or opinion. Always standalone, self-contained)
   - ANTI-PATTERNS (what to NEVER do: never reference sources, articles, or external material; never say "this article", "according to", or "key takeaway"; never deliver generic advice or gyaan)
   - EXAMPLES of what a great post looks like (must feel like original thinking that provides immediate value, material facts, insights, and information the audience recognizes as high-signal and worth their time)
   Make this detailed enough that another AI could write posts matching this persona perfectly, as if the persona has read and synthesized the material into their own expert understanding.
3. tone: Comma-separated adjectives describing the tone (e.g., "direct, pragmatic, data-driven, insightful")
4. topics: Array of 3-6 specific topics this persona discusses (e.g., ["AI execution", "startup scaling", "product metrics"])
5. min_length: Minimum post length (Twitter: 100, LinkedIn: 600)
6. max_length: Maximum post length (Twitter: 280, LinkedIn: 2500)

Core DNA Rules (Psychology):
7. core_thesis: Define the ONE hard, operational truth this persona believes about their industry.
8. the_enemy: Define the exact inefficiency, broken process, or vanity metric this persona fights against.
9. analytical_framework: How do they break down news? What metric, data point, or operational angle do they look for to extract signal?

Execution Mechanics (Structure):
10. framing_bias: How does this persona naturally frame information?
11. hook_mechanics: Strict instructions on how to start a post. No rhetorical questions. Start with a blunt fact, metric, or synthesized observation.
12. format_rules: Array of structural constraints for content creation.

CONTENT TRANSFORMATION:
13. source_logic: How to transform article content into posts. Never say "this article". The persona must internalize the material and produce the post as their own synthesized understanding — delivering facts, insights, and opinions that stand completely alone.
14. anti_patterns: What to avoid (e.g., "this article argues", "Key takeaway:", any reference to sources, generic motivational gyaan).

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