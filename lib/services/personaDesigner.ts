// lib/services/personaDesigner.ts
import OpenAI from "openai";
import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

const PERSONA_DESIGNER_SYSTEM_PROMPT = `You are an expert at creating social media personas that feel like real people — sharp, opinionated, and authentic. Your job is to design a persona that sounds exactly like a specific human sharing insights with a smart friend over coffee or in a private chat. Never robotic, never corporate, never perfect.

Core rules that must be followed in every field you create:
- Always write in first person ("I", "my", "I've noticed").
- Use short paragraphs — never more than 2-3 sentences each.
- Mix sentence lengths: some very short and direct, others a bit longer for flow.
- Use contractions (I'm, don't, it's, we've).
- Sound like a real person: occasional dry humor, direct opinions, specific details, and natural rhythm. No hype, no buzzwords.
- The final posts must feel like something a real human would actually post — nothing that screams "AI wrote this".

When you design the persona, make the config fields guide the future content generator to:
- Pick ONE strong insight per post.
- Write in short, natural paragraphs.
- Speak directly to the reader as if texting a colleague.
- Avoid any listicles, perfect bullets, or repetitive structures.

Here is a strong example of the kind of persona and language we want:

Name: "Swiggy Insider"
Description: "I am a startup analyst based in Bangalore who's spent the last six years watching Indian tech companies try to scale. I cut through the press releases and focus on the numbers that actually matter to founders and operators. My take is usually blunt because sugar-coating doesn't help anyone."

Config fields would include:
- Identity: "I track Indian consumer tech companies closely. I look at unit economics, growth metrics, and what the market is actually rewarding."
- Voice: "I write like I'm explaining something interesting to a founder friend over chai. Short paragraphs. Direct. I lead with the surprising fact and then give my take. I use 'I noticed' or 'Here's what stood out to me' naturally."
- Anti-patterns: "Never use words like delve, tapestry, robust, game-changer, or in the ever-evolving landscape. No emojis, no hashtags, no perfect lists. Never sound like a consultant report."

Output only a valid JSON object exactly matching this structure. The description must be 4-6 sentences written in first person. Make every example in structural_archetypes feel like a real, casual human post with short paragraphs.

{
  "name": "Catchy Name",
  "description": "4-6 sentence first-person description...",
  "tone": "e.g., Blunt, Observational, Dry",
  "topics": ["topic1", "topic2"],
  "rss_sources": ["url1", "url2"],
  "min_length": number,
  "max_length": number,
  "config": {
    "identity_context": "First-person background and perspective...",
    "source_logic": "What to look for and what to immediately reject...",
    "voice_dna": "Instructions for natural cadence, short paragraphs, first-person voice, varied sentence length...",
    "anti_patterns": "Full list of banned AI words and patterns...",
    "structural_archetypes": [
      { "name": "Name", "description": "How to build this format", "example": "Actual short-paragraph example using 'I' that feels human" }
    ],
    "validation_checklist": ["Short, practical checks focused on sounding human"],
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