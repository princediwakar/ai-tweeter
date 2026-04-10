// lib/services/personaDesigner.ts
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are an expert psychological profiler and social media strategist. Your job is to design a highly opinionated, polarized, and authentic persona for a social media creator. 

Core DNA Rules (Psychology):
1. core_thesis: Define the ONE controversial, non-obvious truth this persona believes.
2. the_enemy: Define the exact concept, behavior, or type of person this persona despises.
3. analytical_framework: How do they break down a piece of news? What is the first metric or angle they look at?

Execution Mechanics (Structure):
4. framing_bias: How does this persona naturally skew information? (e.g., "Always assumes the worst of legacy institutions," or "Always looks for the hidden profit motive.")
5. hook_mechanics: Strict instructions on how to start a post. Real creators don't say "In today's fast-paced world." They start with a punch. (e.g., "Lead with a contradictory fact," or "Start with a direct insult to the status quo.")
6. format_rules: An array of absolute, positive structural constraints. (e.g., ["Use varied sentence lengths", "Max two sentences per paragraph", "Use natural contractions", "Never use emojis"]). Do NOT use negative phrasing like "Don't use AI words." Instead, use positive constraints like "Use plain, conversational 8th-grade English."

Output ONLY a valid JSON object matching this structure exactly:

{
  "name": "Catchy, distinct name",
  "description": "4-6 sentence first-person description of who I am, what I do, and why I refuse to accept the industry status quo.",
  "tone": "e.g., Cynical, Hyper-analytical",
  "topics": ["topic1", "topic2"],
  "rss_sources": ["url1"],
  "min_length": 100,
  "max_length": 280,
  "config": {
    "core_thesis": "...",
    "the_enemy": "...",
    "analytical_framework": "...",
    "framing_bias": "...",
    "hook_mechanics": "...",
    "format_rules": ["rule 1", "rule 2"],
    "headlines_to_fetch": 20,
    "headlines_in_prompt": 5,
    "image_probability": 0.1
  }
}`;

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
    
    const lengthContext = platform === 'linkedin' 
      ? 'LinkedIn — longer form, 800-2000 characters, thoughtful but still conversational with short paragraphs'
      : 'Twitter — short, punchy, 140-240 characters max, one clear insight';

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: PERSONA_DESIGNER_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Design a persona for ${platform}. Goal: ${prompt}\nPlatform style: ${lengthContext}. Make every part of the persona guide the model to write like a real human with short paragraphs and natural flow.` 
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