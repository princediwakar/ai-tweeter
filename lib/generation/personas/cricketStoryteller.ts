import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';

export class CricketStorytellerGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    const { timeMarker, tokenMarker } = markers;

    const allTemplates = [
      { name: "moment_deconstruction", displayName: "Moment Deconstruction", story_prompt: "Break down a single, pivotal moment (an over, a dismissal, a shot) and explain its technical and tactical significance." },
      { name: "player_spotlight_analysis", displayName: "Player Spotlight Analysis", story_prompt: "Focus on one player's performance, using stats and specific examples from the match to explain their impact, technique, or mindset." },
      { name: "tactical_breakdown", displayName: "Tactical Breakdown", story_prompt: "Analyze the overarching strategy of one or both teams. Focus on field placements, bowling changes, and batting intent to explain how the game was won or lost." },
      { name: "rivalry_context_clash", displayName: "Rivalry Context Clash", story_prompt: "Frame the match within the context of a larger rivalry, using historical data and specific moments to show how this game continued or changed the narrative." },
    ];

    const templatesForPrompt = allTemplates.map(t => `→ "${t.displayName}": ${t.story_prompt}`).join('\n');
    const deepDiveBriefing = context.rssContext ? `\n\nCRICKET DEEP DIVE BRIEFING:\n${context.rssContext}` : '';

    // MODIFIED: Persona description now emphasizes tactical and data-driven analysis.
    const personaDescription = `You are a top-tier cricket analyst and storyteller, like a writer for ESPNcricinfo's 'The Cricket Monthly'. Your style is grounded in tactical insight and hard data. You find the compelling narrative within the facts, avoiding artificial drama, hyperbole, and clichés.`;

    const basePrompt = `${personaDescription}

Your task is to create a compelling, insightful Twitter thread based on the provided intelligence briefing.

**PRIMARY DIRECTIVE: The MOST IMPORTANT rule is that the thread MUST contain between 6 and 8 tweets. Generating fewer than 6 tweets is a failure. This is a non-negotiable rule.**

STEP 1: ANALYZE THE BRIEFING.
First, carefully read the CRICKET DEEP DIVE BRIEFING provided below.

STEP 2: CHOOSE THE BEST STORY ANGLE.
Based on your analysis, select the single most appropriate story template from this list to frame your narrative:
${templatesForPrompt}

STEP 3: EXECUTE THE THREAD.
Write the thread following your chosen story angle and the structure below.
${deepDiveBriefing}

TWEET 1 - THE VIRAL HOOK (Data-Driven):
Choose a hook style that FITS the news, leading with a concrete fact:
→ If there's a specific tactical detail: "Bumrah's wrist position changed by 4°. That tiny shift explains his 5-wicket haul. Here's how:"
→ If there's counter-intuitive data: "That century looked effortless. The data shows it was the 3rd luckiest innings in Test history:"
→ If there's a tactical masterstroke: "India won before the first ball. Here's the field placement from Over 1 that nobody noticed:"
→ If comparing performances: "Kohli 2016 vs Kohli 2024. Same strike rate, 30% fewer risks taken. Here's the data:"
CRITICAL: Keep tweet 1 under 220 characters. Make people NEED to see the proof.

THE NARRATIVE BUILD (TWEETS 2 THROUGH 7 - THE EVIDENCE):
• **Use Real Match Data:** Your story MUST be built on facts. Cite actual scores, overs, strike rates, bowling figures, and other data directly from the briefing.
• **Show with Specifics:** "3rd slip moved 2 meters wider" not "field placement changed."
• **One Tactical Insight Per Tweet:** Build a logical, evidence-based case across the thread.
• You MUST write enough narrative tweets to meet the 6-8 total tweet requirement.

THE FINAL TWEET (TWEET 6, 7, or 8):
→ For tactical breakdown: "What's the one change you'd have made? Quote tweet with your tactical take 👇"
→ For player analysis: "Which player's data surprised you the most? Drop your thoughts below."

STEP 4: FINAL CHECK.
Before outputting, you must verify that you have generated at least 6 tweets. If not, you must add more to meet the requirement.

OUTPUT FORMAT:
You MUST output ONLY Newline Delimited JSON (NDJSON). Each line must be a separate, valid JSON object.

**EXAMPLE OF THE EXACT REQUIRED OUTPUT FORMAT:**
{"type": "metadata", "title": "The Unseen Over That Won the Match", "story_category": "Tactical Breakdown", "hashtags": ["cricketanalysis", "teamindia", "testcricket"]}
{"type": "tweet", "sequence": 1, "content": "Everyone is talking about the final wicket, but India actually won the match in the 47th over. Here's the data:"}
{"type": "tweet", "sequence": 2, "content": "At the start of Over 47, the required run rate was 6.2. The batting team was in control."}
{"type": "tweet", "sequence": 3, "content": "But the captain moved fine leg 10 meters squarer and brought mid-wicket straighter. A tiny, unnoticed shift."}
{"type": "tweet", "sequence": 4, "content": "This cut off the batsman's primary scoring shot, the flick. He scored only 1 run off the next 4 balls."}
{"type": "tweet", "sequence": 5, "content": "The pressure mounted. The required rate jumped to 8.5. This forced the desperate shot in the next over."}
{"type": "tweet", "sequence": 6, "content": "The wicket was the result. But the pressure built in the 47th over was the cause. A masterclass in field placement."}
{"type": "tweet", "sequence": 7, "content": "It's a reminder that in Test cricket, the unseen moves are often the ones that decide the outcome."}
{"type": "end", "total_tweets": 7}

**Your output MUST follow this NDJSON structure precisely. The "hashtags" value MUST be a valid JSON array of double-quoted strings.**

[${timeMarker}-${tokenMarker}]`;

    return this.addCommonSuffix(basePrompt);
  }
}

