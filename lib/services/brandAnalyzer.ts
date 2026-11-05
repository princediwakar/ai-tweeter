import { getDeepseekClientAsync } from '../generationService';

export interface AnalyzedBrand {
  name: string;
  archetype: string;
  description: string;
  tone_of_voice: string[];
  target_audience: string[];
  primary_stakeholder_persona: string;
  ecosystem_dynamics: string;
  operating_geography: string;
  core_values: string[];
  never_say: string[];
  never_topics: string[];
  pillars: {
    name: string;
    description: string;
    proportion: number;
    keywords: string[];
  }[];
  sample_posts: string[];
}

export async function analyzeBrandFromContent(url: string, content: string): Promise<AnalyzedBrand> {
  const prompt = `
You are an elite brand strategist and social media ghostwriter for top-tier founders and practitioners.
I am providing you with content scraped from a user's landing page or website (${url}).

Content to analyze:
"""
${content}
"""

Analyze this business deeply: What problem do they actually solve? Who is their user? What are the unglamorous realities, frictions, and counter-intuitive truths of their industry?

Extract and infer the following:
1. "name": The apparent name of the author or product.
2. "archetype": A 2-4 word phrase describing their professional identity (e.g. "Clinical Intelligence Specialist", "Workflow Systems Builder", "Practitioner & Founder").
3. "description": A concise 1-2 sentence summary of what they build or do.
4. "primary_stakeholder_persona": A vivid 1-2 sentence description of who they build for and the daily operational reality of that person.
5. "ecosystem_dynamics": The systemic friction points in their market (e.g. "High volume, paper-based chaos, razor-thin margins, reliance on fragmented messaging apps").
6. "operating_geography": The primary geographic region inferred (e.g. "India", "Global", "US"). Default to "Global" if unknown.
7. "target_audience": Array of 2-3 audience groups.
8. "tone_of_voice": Array of 3-4 style descriptors. MUST emphasize authentic practitioner authority, crispness, and subtle dry wit (e.g. "Direct and unpolished", "Subtle dry wit", "Grounded practitioner perspective", "Zero corporate speak").
9. "core_values": Array of 2-3 core beliefs.
10. "never_say": Array of 4-6 corporate buzzwords and AI clichés to BAN completely (e.g. "In today's fast-paced world", "game changer", "synergy", "disrupt", "leverage", "unpopular opinion", "optimize", "sprint backlog").
11. "never_topics": Array of 2 topics to avoid (e.g. "politics", "religion").
12. "pillars": Propose 3 high-signal, balanced content pillars:
    - Pillar 1 (Field Observations & Ground Truth): Candid snapshots of actual workflows, physical desk clutter, and workarounds people use in the trenches.
    - Pillar 2 (Technology Reality Check & Admin Fatigue): Relatable critiques of clunky software, EHR overload, bloated confirmation screens, and why software fails clinicians/practitioners in fast environments.
    - Pillar 3 (Workflow Mechanics & Friction): Granular breakdowns of time wasted, click counts, administrative overhead, and why simple alternatives win.
    Each pillar has: name, description, proportion (number summing to 100), keywords (array of 3-4 strings).
13. "sample_posts": Generate 3 sample social posts providing a natural, balanced mix:
    - Post 1 (Field Observation): A photographic snapshot of a real ground-truth scene. Show, don't lecture.
    - Post 2 (The Technology Reality Check): A sharp, resonant take on why tech fails when it adds clicks instead of respecting frontline time.
    - Post 3 (Workflow Mechanics): A sharp, specific breakdown of time, clicks, or friction.

CRITICAL ANTI-AI-SLOP RULES (STRICTLY ENFORCED):
1. ZERO SITCOM / COMEDY SKITS:
   - NO theatrical narrative setups ("Picture this:", "It was 9:04 PM...", "Here is what happened:").
   - NO scripted dialogue, caricatures, or exaggerated monologues.
   - NO cheesy forced punchlines, theatrical metaphors, or stand-up comedy scripts.
2. ZERO GURU PREACHINESS / BROETRY:
   - NO formulaic contrarian lecturing ("Nobody does X because of Y", "It's not about A. It's about B.", "The honest truth is...").
   - NO pseudo-profound LinkedIn poetry (never break single sentences onto separate lines with fake epiphanies).
   - NO lecturing or talking down to practitioners with sweeping absolutes.
3. SOUND LIKE A REAL HUMAN:
   - Write like a real person typing a quick thought from their phone or laptop.
   - Ultra-short and punchy: 1 to 3 sentences maximum.
   - Grounded in tangible specifics: actual objects on a desk, real minutes, specific clicks, honest observations.
4. ZERO SPRINT RETROSPECTIVES / BACKLOG QUESTIONS:
   - NEVER ask the audience what feature, model, or engineering trade-off to prioritize ("which should we optimize first: X or Y?"). You are not hosting a sprint retrospective.

Return the result as a valid JSON object matching this structure EXACTLY. No markdown formatting, just raw JSON.
`;

  try {
    const client = await getDeepseekClientAsync();
    const response = await client.chat.completions.create({
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: 'You are an AI brand strategist who abhors AI clichés and writes exclusively like a sharp, authentic human practitioner. You output only raw, valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText);

    const toStringArray = (val: any, fallbackKey?: string): string[] => {
      if (!val) return [];
      if (!Array.isArray(val)) return [typeof val === 'string' ? val : JSON.stringify(val)];
      return val.map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return (fallbackKey && item[fallbackKey]) || item.content || item.text || item.post || item.tone || item.audience || item.name || item.value || JSON.stringify(item);
        }
        return String(item || '');
      }).filter(Boolean);
    };

    return {
      name: typeof parsed.name === 'string' ? parsed.name : 'My Brand',
      archetype: typeof parsed.archetype === 'string' ? parsed.archetype : 'Founder & Practitioner',
      description: typeof parsed.description === 'string' ? parsed.description : '',
      primary_stakeholder_persona: typeof parsed.primary_stakeholder_persona === 'string' ? parsed.primary_stakeholder_persona : '',
      ecosystem_dynamics: typeof parsed.ecosystem_dynamics === 'string' ? parsed.ecosystem_dynamics : '',
      operating_geography: typeof parsed.operating_geography === 'string' ? parsed.operating_geography : '',
      tone_of_voice: toStringArray(parsed.tone_of_voice, 'tone'),
      target_audience: toStringArray(parsed.target_audience, 'audience'),
      core_values: toStringArray(parsed.core_values, 'value'),
      never_say: toStringArray(parsed.never_say),
      never_topics: toStringArray(parsed.never_topics),
      pillars: Array.isArray(parsed.pillars) ? parsed.pillars.map((p: any) => ({
        name: typeof p.name === 'string' ? p.name : 'Core Pillar',
        description: typeof p.description === 'string' ? p.description : '',
        proportion: typeof p.proportion === 'number' ? p.proportion : 33,
        keywords: Array.isArray(p.keywords) ? p.keywords.map(String) : [],
      })) : [],
      sample_posts: toStringArray(parsed.sample_posts, 'content'),
    };
  } catch (error) {
    console.error('Error analyzing brand:', error);
    throw new Error('Failed to analyze brand content');
  }
}

export async function regenerateSampleDrafts(brandProfile: any): Promise<string[]> {
  const prompt = `
You are an elite brand strategist and social media ghostwriter for top-tier founders and practitioners.
Brand Name: ${brandProfile.name || 'Brand'}
Archetype: ${brandProfile.archetype || brandProfile.industry || 'Founder'}
Description: ${brandProfile.description || ''}
Primary Stakeholder: ${brandProfile.primary_stakeholder_persona || ''}
Tone of Voice: ${JSON.stringify(brandProfile.tone_of_voice || [])}
Target Audience: ${JSON.stringify(brandProfile.target_audience || [])}
Content Pillars: ${JSON.stringify(brandProfile.pillars || [])}

Generate 3 sample social posts providing a natural, balanced mix:
- Post 1 (Field Observation): A photographic snapshot of a real ground-truth scene. Show, don't lecture.
- Post 2 (Honest Builder Note): A transparent reflection on building software, unexpected user behavior, or a UX trade-off.
- Post 3 (Workflow Mechanics): A sharp, specific breakdown of time, clicks, or friction.

CRITICAL ANTI-AI-SLOP RULES (STRICTLY ENFORCED):
1. ZERO SITCOM / COMEDY SKITS:
   - NO theatrical narrative setups ("Picture this:", "It was 9:04 PM...", "Here is what happened:").
   - NO scripted dialogue, caricatures, or exaggerated monologues.
   - NO cheesy forced punchlines, theatrical metaphors, or stand-up comedy scripts.
2. ZERO GURU PREACHINESS / BROETRY:
   - NO formulaic contrarian lecturing ("Nobody does X because of Y", "It's not about A. It's about B.", "The honest truth is...").
   - NO pseudo-profound LinkedIn poetry (never break single sentences onto separate lines with fake epiphanies).
   - NO lecturing or talking down to practitioners with sweeping absolutes.
3. SOUND LIKE A REAL HUMAN:
   - Write like a real person typing a quick thought from their phone or laptop.
   - Ultra-short and punchy: 1 to 3 sentences maximum.
   - Grounded in tangible specifics: actual objects on a desk, real minutes, specific clicks, honest observations.

Return as a valid JSON object matching this structure EXACTLY:
{
  "sample_posts": [
    "Post 1 text",
    "Post 2 text",
    "Post 3 text"
  ]
}
`;

  try {
    const client = await getDeepseekClientAsync();
    const response = await client.chat.completions.create({
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: 'You are an AI brand strategist who abhors AI clichés and writes exclusively like a sharp, authentic human practitioner. You output only raw, valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText);
    if (Array.isArray(parsed.sample_posts)) {
      return parsed.sample_posts.map((p: any) => typeof p === 'string' ? p : p?.content || p?.text || JSON.stringify(p)).filter(Boolean);
    }
    return [];
  } catch (error) {
    console.error('Error regenerating sample drafts:', error);
    throw new Error('Failed to regenerate sample drafts');
  }
}
