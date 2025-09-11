/**
 * Thread Template System for Indian Business Storytelling
 * 10 comprehensive templates with emotional depth and strategic insights
 */

export interface ThreadTemplate {
  name: string;
  displayName: string;
  story_prompt: string;
  description: string;
}

// 1. Founder Struggle Template
export const FOUNDER_STRUGGLE_TEMPLATE: ThreadTemplate = {
  name: 'founder_struggle',
  displayName: 'Founder Struggle Journey',
  story_prompt: "Tell the story of an Indian founder who overcame significant personal adversity to build a successful company. Focus on their lowest moments, self-doubt, difficult decisions, and how they persevered. Include emotional depth and the human side of entrepreneurship - family pressure, financial struggles, moments of wanting to give up. End with a universal lesson about resilience.",
  description: 'Personal journey of founders overcoming adversity and self-doubt'
};

// 2. Business Decision Template
export const BUSINESS_DECISION_TEMPLATE: ThreadTemplate = {
  name: 'business_decision',
  displayName: 'Strategic Business Decision',
  story_prompt: "Share a story about a critical business decision made by an Indian business leader that had major long-term consequences. Focus on the context and pressure they were under, the difficult trade-offs they had to consider, why the decision was controversial or risky, and what the ultimate outcome was. Show the human side of strategic decision-making.",
  description: 'Critical business decisions with long-term consequences'
};

// 3. Family Business Dynamics Template
export const FAMILY_BUSINESS_TEMPLATE: ThreadTemplate = {
  name: 'family_business_dynamics',
  displayName: 'Family Business Dynamics',
  story_prompt: "Tell a story about complex family dynamics within an Indian business empire. Focus on generational conflicts, different visions between family members, succession challenges, or family feuds that impacted the business. Include the emotional cost of family conflicts in business, how personal relationships affect business decisions, and what lessons can be learned about managing family businesses.",
  description: 'Complex dynamics within family business empires'
};

// 4. Cross-Era Parallel Template
export const CROSS_ERA_PARALLEL_TEMPLATE: ThreadTemplate = {
  name: 'cross_era_parallel',
  displayName: 'Cross-Era Business Patterns',
  story_prompt: "Draw a fascinating parallel between a historical Indian business strategy or decision and a modern business phenomenon. Show how the same underlying principles or patterns repeat across decades. Connect a business strategy from the 1970s-90s with today's startups or business environment. Make it insightful and show timeless business wisdom.",
  description: 'Drawing parallels between historical and modern business strategies'
};

// 5. Failure Recovery Template
export const FAILURE_RECOVERY_TEMPLATE: ThreadTemplate = {
  name: 'failure_recovery',
  displayName: 'Failure to Recovery Journey',
  story_prompt: "Tell a story of an Indian business that went from great heights to spectacular failure, and potentially recovered (or is trying to). Focus on what led to the peak success, what caused the downfall, the human impact, and lessons about business resilience. Include the emotional journey and what can be learned from both the failure and recovery attempts.",
  description: 'Stories of spectacular failure and potential recovery'
};

// 6. Market Disruption Template
export const MARKET_DISRUPTION_TEMPLATE: ThreadTemplate = {
  name: 'market_disruption',
  displayName: 'Market Disruption Story',
  story_prompt: "Share a story about how an Indian company completely disrupted an entire industry. Focus on what the market looked like before disruption, how the disruptor entered with a different approach, the resistance they faced from incumbents, their breakthrough moment, and the industry transformation that followed. Make it dramatic and show the human audacity behind the disruption.",
  description: 'How companies disrupted entire industries'
};

// 7. Crisis Leadership Template
export const CRISIS_LEADERSHIP_TEMPLATE: ThreadTemplate = {
  name: 'crisis_leadership',
  displayName: 'Crisis Leadership Story',
  story_prompt: "Tell a story about exceptional leadership during a major crisis (economic recession, pandemic, natural disaster, industry crisis, etc.). Focus on how an Indian business leader made difficult decisions under pressure, managed competing stakeholder interests, took personal risks for the greater good, and what the outcome was. Highlight the human side of leadership in crisis.",
  description: 'Leadership during unprecedented crises'
};

// 8. Innovation Breakthrough Template
export const INNOVATION_BREAKTHROUGH_TEMPLATE: ThreadTemplate = {
  name: 'innovation_breakthrough',
  displayName: 'Innovation Breakthrough',
  story_prompt: "Share a story about a moment of innovation or breakthrough that changed an Indian business or industry. Focus on the original problem or frustration, the 'aha moment' or breakthrough insight, how it was implemented despite challenges, and the massive impact it had. Make it feel serendipitous but show the persistence behind the innovation.",
  description: 'Moments of innovation that changed everything'
};

// 9. Cultural Adaptation Template
export const CULTURAL_ADAPTATION_TEMPLATE: ThreadTemplate = {
  name: 'cultural_adaptation',
  displayName: 'Cultural Adaptation Success',
  story_prompt: "Tell a story about how a global company succeeded in India by adapting to local culture, or how an Indian company succeeded globally by understanding cultural nuances. Focus on the initial cultural challenges or failures, the key insights about local preferences, the adaptation strategy, and the successful results. Show why cultural intelligence matters in business.",
  description: 'How companies succeeded through cultural adaptation'
};

// 10. Succession Story Template
export const SUCCESSION_STORY_TEMPLATE: ThreadTemplate = {
  name: 'succession_story',
  displayName: 'Business Succession Story',
  story_prompt: "Share a complex business succession story from Indian business families or companies. Focus on the founder's legacy, the succession challenges, competing visions between generations or potential successors, the transition strategy chosen, what worked and what didn't, and lessons about preserving business culture and values across generations.",
  description: 'Complex succession stories in Indian business families'
};

// Cricket Story Templates - Human stories through cricket lens

// 1. Iconic Innings Psychology Template
export const ICONIC_INNINGS_TEMPLATE: ThreadTemplate = {
  name: 'iconic_moment_character_reveal',
  displayName: 'Iconic Moment Character Reveal',
  story_prompt: "Tell the story of an iconic cricket innings or moment that revealed a player's true character. Focus on the context and pressure they were under, what was at stake personally and for the team, the psychological challenges they faced, how they handled the moment, and what it revealed about their personality. Connect it to universal themes about handling pressure and character.",
  description: 'Cricket moments that revealed true character under pressure'
};

// 2. Pressure Psychology Template
export const PRESSURE_PSYCHOLOGY_TEMPLATE: ThreadTemplate = {
  name: 'pressure_psychology_breakdown',
  displayName: 'Pressure Psychology Story',
  story_prompt: "Share a story about how a cricketer handled (or didn't handle) extreme pressure in a critical situation. Focus on the mental game, what was going through their mind, how pressure manifested physically and mentally, their coping mechanisms, and what we can learn about human psychology under pressure. Make it relatable to anyone facing high-stakes situations.",
  description: 'Psychology of handling pressure in high-stakes cricket moments'
};

// 3. Comeback Story Template
export const CRICKET_COMEBACK_TEMPLATE: ThreadTemplate = {
  name: 'controversy_comeback_arc',
  displayName: 'Cricket Comeback Journey',
  story_prompt: "Tell the story of a cricketer's comeback from adversity - injury, poor form, controversy, or personal struggles. Focus on their lowest point, the doubts they faced, the work they put in behind the scenes, the mental battles, and their eventual return. Show the human resilience and what it teaches us about overcoming setbacks in life.",
  description: 'Personal battles and comeback stories in cricket'
};

// 4. Larger than Life Personality Template
export const CRICKET_PERSONALITY_TEMPLATE: ThreadTemplate = {
  name: 'larger_than_life_personality',
  displayName: 'Cricket Personality Story',
  story_prompt: "Share a story about a larger-than-life cricket personality who transcended the sport (like Shane Warne, Virat Kohli, MS Dhoni). Focus on their unique character traits, how their personality affected their cricket and life, memorable moments that showed their character, controversies or entertainment value, and their cultural impact beyond cricket.",
  description: 'Colorful personalities who brought drama and entertainment to cricket'
};

// 5. Rivalry Psychology Template
export const CRICKET_RIVALRY_TEMPLATE: ThreadTemplate = {
  name: 'rivalry_human_dynamics',
  displayName: 'Cricket Rivalry Dynamics',
  story_prompt: "Tell the story of a famous cricket rivalry that went beyond the game. Focus on the personal dynamics between the players, what fueled the rivalry, memorable confrontations, how it affected their performance, the respect beneath the competition, and what it teaches us about competition, motivation, and human relationships.",
  description: 'Cricket rivalries and the psychology behind competitive relationships'
};

// 6. Career Crossroads Template
export const CRICKET_CROSSROADS_TEMPLATE: ThreadTemplate = {
  name: 'career_crossroads_character',
  displayName: 'Cricket Career Crossroads',
  story_prompt: "Share a story about a career-defining moment or decision in cricket. Focus on the crossroads the player faced, the tough choice they had to make, what was at stake, how they made the decision, and what the long-term consequences were. Connect it to life lessons about making difficult choices and following convictions.",
  description: 'Career-defining moments and difficult decisions in cricket'
};

// 7. Entertainment and Drama Template
export const CRICKET_DRAMA_TEMPLATE: ThreadTemplate = {
  name: 'entertainment_cricket_drama',
  displayName: 'Cricket Entertainment Drama',
  story_prompt: "Tell a story about cricket's entertainment value and dramatic moments. Focus on the showmanship, unexpected twists, crowd reactions, media drama, or controversial moments that made cricket compelling theater. Show how cricket became entertainment and cultural spectacle beyond just sport.",
  description: 'Cricket as entertainment and cultural drama'
};

// 8. Personal Battle Template
export const CRICKET_PERSONAL_BATTLE_TEMPLATE: ThreadTemplate = {
  name: 'personal_battle_public_stage',
  displayName: 'Personal Battle on Public Stage',
  story_prompt: "Share a story about a cricketer's personal battle played out in the public eye. Focus on their private struggles (form, confidence, personal issues), how the media and public pressure added to their challenges, how they dealt with the scrutiny, and their journey to overcome or manage the situation. Make it about the human cost of public performance.",
  description: 'Private struggles and personal battles in the public cricket arena'
};

// 9. Leadership Clash Template
export const CRICKET_LEADERSHIP_TEMPLATE: ThreadTemplate = {
  name: 'leadership_personality_clash',
  displayName: 'Cricket Leadership Styles',
  story_prompt: "Tell a story about different leadership styles and personalities in cricket. Focus on contrasting captains or leaders, their different approaches, how their personalities shaped team dynamics, conflicts or harmony they created, and what we can learn about leadership styles and managing different personalities.",
  description: 'Different leadership styles and personality clashes in cricket'
};

// 10. Legacy Beyond Cricket Template
export const CRICKET_LEGACY_TEMPLATE: ThreadTemplate = {
  name: 'legacy_beyond_boundaries',
  displayName: 'Legacy Beyond Cricket',
  story_prompt: "Share a story about how a cricketer's impact extended far beyond the cricket field. Focus on their cultural influence, inspiration to others, life lessons they embodied, social impact, or how they changed perceptions. Show how cricket became a vehicle for broader life lessons and cultural impact.",
  description: 'How cricketers impacted culture and society beyond the sport'
};

// Template registry
export const THREAD_TEMPLATES: Record<string, ThreadTemplate> = {
  founder_struggle: FOUNDER_STRUGGLE_TEMPLATE,
  business_decision: BUSINESS_DECISION_TEMPLATE,
  family_business_dynamics: FAMILY_BUSINESS_TEMPLATE,
  cross_era_parallel: CROSS_ERA_PARALLEL_TEMPLATE,
  failure_recovery: FAILURE_RECOVERY_TEMPLATE,
  market_disruption: MARKET_DISRUPTION_TEMPLATE,
  crisis_leadership: CRISIS_LEADERSHIP_TEMPLATE,
  innovation_breakthrough: INNOVATION_BREAKTHROUGH_TEMPLATE,
  cultural_adaptation: CULTURAL_ADAPTATION_TEMPLATE,
  succession_story: SUCCESSION_STORY_TEMPLATE,
  // Cricket templates
  iconic_moment_character_reveal: ICONIC_INNINGS_TEMPLATE,
  pressure_psychology_breakdown: PRESSURE_PSYCHOLOGY_TEMPLATE,
  controversy_comeback_arc: CRICKET_COMEBACK_TEMPLATE,
  larger_than_life_personality: CRICKET_PERSONALITY_TEMPLATE,
  rivalry_human_dynamics: CRICKET_RIVALRY_TEMPLATE,
  career_crossroads_character: CRICKET_CROSSROADS_TEMPLATE,
  entertainment_cricket_drama: CRICKET_DRAMA_TEMPLATE,
  personal_battle_public_stage: CRICKET_PERSONAL_BATTLE_TEMPLATE,
  leadership_personality_clash: CRICKET_LEADERSHIP_TEMPLATE,
  legacy_beyond_boundaries: CRICKET_LEGACY_TEMPLATE
};

// Utility functions
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

// REMOVED: getThreadTemplatesByPersona - redundant with persona.thread_templates
// Use persona.thread_templates array directly instead of this function

// Template structure validation
export function validateThreadStructure(template: ThreadTemplate): boolean {
  return (
    template.story_prompt.length > 0 &&
    template.displayName.length > 0 &&
    template.name.length > 0
  );
}

export default THREAD_TEMPLATES;