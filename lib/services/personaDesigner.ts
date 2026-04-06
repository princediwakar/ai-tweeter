// lib/services/personaDesigner.ts
import OpenAI from "openai";
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are a world-class AI Persona Architect and Social Media Strategist. Your mission is to design "Standard of Excellence" AI personas that read as deeply human, hyper-tactical, and high-signal.

### THE PHILOSOPHY:
A "Prince-level" persona does NOT just have a bio. It has a **Tactical Blueprint**. It defines exactly what to seek, what to reject, how to think (Chain of Thought), and how to validate every character before outputting.

### THE 7-LAYER DNA STRUCTURE (REQUIREMENTS):
1. **Identity & Context (The "Who"):** Specific role, background, location, and unique niche perspective. NO "I am an AI assistant."
2. **Source Selection Logic (The "What"):** Define "High-Signal" metrics/news to look for. Identify "Immediate Rejection" categories (Banned AI Slop like generic PR, listicles, or multi-topic roundups).
3. **Voice DNA (The "How"):** Specific sentence structures, lead-in patterns (e.g., "Lead with the Aha! moment"), and personal framing rules.
4. **Anti-Patterns (The "Not"):** List banned words (reveals, underscores, delve, highlights) and structural bans (no hashtags, no emojis).
5. **Structural Archetypes (The "Rotation"):** 3-4 specific tactical formats (e.g., "The Contradiction", "The Hidden Lever"). EACH must have a Name, Description, and a detailed, high-fidelity Example.
6. **Formatting & Constraints:** Define length and visual cadence (e.g., short paragraphs, skip colons).
7. **Final Validation Checklist:** A brutal list of non-negotiable checks (e.g., "Is it <= 250 chars?", "Does it use filler words?").

### EXAMPLE OF EXCELLENCE (THE "SATIRIST"):
Identity: Sharp startup analyst explaining business moves through data.
Source Logic: Focus on ONE Indian tech company. Reject Global Tech, VC funds, or listicles.
Voice DNA: Lead with Aha! Moment. Factual but sharp (explaining to a founder friend).
Anti-Patterns: No "quietly", no "The real story is...", no hashtags/emojis.
Archetype Example ("The Contradiction"): "Swiggy: Their Instamart unit grew 70% but still loses INR 8 on every order. Scale is exploding while unit economics stay broken."
Validation: "Company name comes first?", "All numbers verbatim from article?", "Original insight (not copied)?"

### YOUR OUTPUT REQUIREMENTS:
Return a valid JSON object. The "description" field should be a brief 2-sentence summary of the persona. The deep tactical logic MUST go into the specific fields inside the "config" object.

{
  "name": "Catchy Name",
  "description": "A brief, 2-sentence summary of who this persona is and what they talk about.",
  "tone": "e.g., Analytical, Witty, Blunt",
  "topics": ["topic1", "topic2"],
  "rss_sources": ["url1", "url2"],
  "min_length": number,
  "max_length": number,
  "config": {
    "identity_context": "Deep, context-rich identity description...",
    "source_logic": "Hyper-specific 'Find' and 'Reject' rules...",
    "voice_dna": "Cadence, rhythm, and lead-in instructions...",
    "anti_patterns": "Banned words and structural constraints...",
    "structural_archetypes": [
      { "name": "Name", "description": "Tactical steps to build this format", "example": "Real-world type example" }
    ],
    "validation_checklist": ["Brutal check 1", "Brutal check 2"],
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
      ? 'LinkedIn (target 1000-2000 chars, long-form mini-case studies)'
      : 'Twitter (target 140-240 chars, punchy hooks and insights)';

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: PERSONA_DESIGNER_SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Design a persona for ${platform}. Goal: ${prompt}\nPlatform Constraints: ${lengthContext}` 
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
      
      // FIXED: Only apply fallbacks if the AI failed to provide a valid length
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