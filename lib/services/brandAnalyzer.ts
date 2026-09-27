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
You are an elite brand strategist and ecosystem analyst. I am providing you with textual content scraped from a user's website or product landing page (${url}).

Thinking from first principles, your job is to look past the "marketing features" of the product and deeply understand the human ecosystem it operates within. 

Content to analyze:
"""
${content}
"""

Think deeply about this product: Who is the absolute primary stakeholder? What is their daily life like? What are their true frustrations, hustles, and relationships? (e.g., for Doxxy, it's doctors dealing with chaotic Indian clinics, patient relationships, and front-desk bottlenecks).

Based on this deep empathy, extract and infer the following:
1. "name": The apparent name of the author or product.
2. "archetype": A 2-4 word phrase describing their professional focus (e.g., "Healthtech Pioneer", "B2B SaaS Founder").
3. "description": A 1-2 sentence summary of what they do.
4. "primary_stakeholder_persona": Describe the main human user intimately in 1-2 sentences. Focus on what makes them exhausted, what makes them laugh, and their daily absurdities. (e.g., "The exhausted Indian doctor who just wants to laugh at how ridiculous their job is.")
5. "ecosystem_dynamics": Describe the broader environment in 1-2 sentences. What are the friction points? (e.g., "High patient volume, low margin, reliant on WhatsApp for comms, stressed staff, chaotic waiting rooms.")
6. "operating_geography": The primary geographic region inferred (e.g., "India", "Global", "US"). Default to "Global" if unknown.
7. "target_audience": An array of 2-3 strings describing the audience (e.g., "Indian doctors and clinic owners").
8. "tone_of_voice": An array of strings that MUST dictate pure humor (e.g., "Pure stand-up comedy", "Extremely sarcastic", "Witty", "Absolutely zero serious advice").
9. "core_values": An array of 2-3 core beliefs.
10. "never_say": Array of 3-4 marketing buzzwords or corporate jargon to NEVER use for this audience (e.g., "synergy", "disrupt", "leverage AI", "platform", "solution").
11. "never_topics": Array of 1-2 topics to avoid (e.g., "politics", "religion").
12. "pillars": Propose 3 core content pillars to ENTERTAIN the primary stakeholder through humor. 
    CRITICAL: These MUST be purely comedic, observational humor, and stand-up style venting about the stakeholder's life. 
    (e.g., "Specialty Roasts & Stereotypes", "The Absurd Client/Patient", "Daily Grind Chaos", "Unwritten Office Rules").
    Each pillar should have:
    - name: (string) short title
    - description: (string) what kind of posts go here (e.g., "Observational humor about front desk chaos")
    - proportion: (number) percentage allocation (sum to 100)
    - keywords: (array of strings) 3-4 topics associated with it
13. "sample_posts": Generate 3 high-quality sample posts based on these comedic pillars. ZERO marketing fluff. Written in first person. Must sound like an exhausted practitioner venting and making hilarious observations about their daily life.

Return the result as a valid JSON object matching this structure EXACTLY. No markdown formatting, just raw JSON.
`;

  try {
    const client = await getDeepseekClientAsync();
    const response = await client.chat.completions.create({
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: 'You are an AI brand strategist. You output only raw, valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
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
