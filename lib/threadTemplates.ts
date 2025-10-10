// lib/threadTemplates.ts
/**
 * Analytical Thread Template System
 * These templates are designed to work with a structured "Deep Dive Briefing" context.
 * Each template provides a different analytical lens to deconstruct a specific news event.
 */

export interface ThreadTemplate {
  name: string;
  displayName: string;
  story_prompt: string;
  description: string;
}

// ─────────────────────────────────────────────
// Business Analytical Templates
// ─────────────────────────────────────────────

// 1. The 360° Deep Dive
export const DEEP_DIVE_ANALYSIS: ThreadTemplate = {
  name: 'deep_dive_analysis',
  displayName: '360° Deep Dive',
  story_prompt: "Using the 'DEEP DIVE BRIEFING', deconstruct the 'Primary News Item'. Start with the 'What' (the core news). Explain the 'Why' (market forces, company strategy). Conclude with a sharp, confident analysis of the 'So What' (future implications, bold predictions). Use the 'Supporting Intelligence' to connect all the dots.",
  description: 'A comprehensive what-why-so_what analysis of a major business event.'
};

// 2. The Competitor Showdown
export const COMPETITOR_SHOWDOWN: ThreadTemplate = {
  name: 'competitor_showdown',
  displayName: 'Competitor Showdown',
  story_prompt: "Frame the 'Primary News Item' as a strategic move in a larger competitive battle. Use the briefing to identify the key company and its rivals. How does this news shift the balance of power in the market? Analyze their strengths, weaknesses, and predict the next move in this corporate chess match.",
  description: 'Analyzes a news event through the lens of fierce market competition.'
};

// 3. The "Hidden Truth" Reveal
export const HIDDEN_TRUTH_REVEAL: ThreadTemplate = {
  name: 'hidden_truth_reveal',
  displayName: 'The Hidden Truth',
  story_prompt: "Look past the celebratory headline of the 'Primary News Item'. Use the briefing's context to uncover the real, untold story. Is this a defensive move? A sign of underlying weakness? What are the risks and challenges nobody is discussing? Adopt a skeptical, insightful, and confident contrarian tone.",
  description: 'Uncovers the challenging, non-obvious story behind a positive headline.'
};

// 4. The Market Shift Analysis
export const MARKET_SHIFT_ANALYSIS: ThreadTemplate = {
  name: 'market_shift_analysis',
  displayName: 'Market Shift Analysis',
  story_prompt: "Use the 'Primary News Item' as hard evidence of a larger market transformation. Zoom out from the specific company and explain the industry-wide trend it represents (e.g., the rise of FinTech 2.0, consolidation in EdTech). Use the news as the central exhibit in your analysis of where the entire market is headed.",
  description: 'Uses a single news event to explain a broader industry trend.'
};

// 5. The News-Driven Founder Journey
export const NEWS_DRIVEN_FOUNDER_JOURNEY: ThreadTemplate = {
    name: 'news_driven_founder_journey',
    displayName: 'News-Driven Founder Journey',
    story_prompt: "The 'Primary News Item' represents a massive success. Use this event as the climax of the founder's journey. Use the briefing's context to find details of their early struggles, critical pivots, and relentless grit. Juxtapose the glamour of the current news with the hardship of their past to create a powerful narrative about perseverance.",
    description: 'Connects a current success story to the founder’s challenging backstory.'
};


// ─────────────────────────────────────────────
// Cricket Analytical Templates
// ─────────────────────────────────────────────

// 1. The Pivotal Moment Deconstruction
export const MOMENT_DECONSTRUCTION: ThreadTemplate = {
  name: 'moment_deconstruction',
  displayName: 'Pivotal Moment Deconstruction',
  story_prompt: "From the 'CRICKET DEEP DIVE BRIEFING', select the single most pivotal moment (a key wicket, a dropped catch, a strategic over). Dedicate the thread to analyzing how that one moment psychologically and tactically changed the entire match. Go micro to explain the macro result.",
  description: 'A deep dive into one moment that defined the entire match.'
};

// 2. The Player Spotlight Analysis
export const PLAYER_SPOTLIGHT_ANALYSIS: ThreadTemplate = {
  name: 'player_spotlight_analysis',
  displayName: 'Player Spotlight Analysis',
  story_prompt: "Focus on the 'Key Player' identified in the briefing. Frame their performance in this match as a crucial chapter in their personal career arc. Was it a redemption after bad form? A breakthrough performance? A confirmation of greatness? Tell the human story behind their stats.",
  description: 'Analyzes a key performance as part of a player’s larger career story.'
};

// 3. The Tactical Breakdown
export const TACTICAL_BREAKDOWN: ThreadTemplate = {
  name: 'tactical_breakdown',
  displayName: 'The Captain\'s View',
  story_prompt: "Analyze the 'Primary Cricket Event' from a captain's or coach's perspective. Deconstruct the strategic battle between the two teams using the briefing's context. What field placements, bowling changes, and batting orders were genius? What were the blunders? Explain the chess match behind the cricket match.",
  description: 'A strategic and tactical analysis of the game, explaining how it was won and lost.'
};

// 4. The Rivalry Context Clash
export const RIVALRY_CONTEXT_CLASH: ThreadTemplate = {
  name: 'rivalry_context_clash',
  displayName: 'Rivalry Context',
  story_prompt: "Place the 'Primary Cricket Event' within the larger, historical context of the rivalry between the two teams. How does this specific result add a fiery new chapter to their story? Reference past encounters and explain what this match means for their next big showdown. Tell the story of the rivalry itself.",
  description: 'Frames the match as the latest chapter in a historic rivalry.'
};


// ─────────────────────────────────────────────
// Template Registry
// ─────────────────────────────────────────────

export const THREAD_TEMPLATES: Record<string, ThreadTemplate> = {
  // Business Templates
  deep_dive_analysis: DEEP_DIVE_ANALYSIS,
  competitor_showdown: COMPETITOR_SHOWDOWN,
  hidden_truth_reveal: HIDDEN_TRUTH_REVEAL,
  market_shift_analysis: MARKET_SHIFT_ANALYSIS,
  news_driven_founder_journey: NEWS_DRIVEN_FOUNDER_JOURNEY,

  // Cricket Templates
  moment_deconstruction: MOMENT_DECONSTRUCTION,
  player_spotlight_analysis: PLAYER_SPOTLIGHT_ANALYSIS,
  tactical_breakdown: TACTICAL_BREAKDOWN,
  rivalry_context_clash: RIVALRY_CONTEXT_CLASH,
};

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────

export function getThreadTemplate(templateName: string): ThreadTemplate | undefined {
  return THREAD_TEMPLATES[templateName];
}

export function getAllThreadTemplates(): ThreadTemplate[] {
  return Object.values(THREAD_TEMPLATES);
}

export function getRandomThreadTemplate(): ThreadTemplate {
  const templates = getAllThreadTemplates();
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

export function validateThreadStructure(template: ThreadTemplate): boolean {
  return (
    template.story_prompt.length > 0 &&
    template.displayName.length > 0 &&
    template.name.length > 0
  );
}

export default THREAD_TEMPLATES;