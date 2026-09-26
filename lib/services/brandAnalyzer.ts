import { getDeepseekClientAsync } from '../generationService';

export interface AnalyzedBrand {
  name: string;
  archetype: string;
  description: string;
  tone_of_voice: string[];
  target_audience: string[];
  core_values: string[];
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
You are an expert social media ghostwriter for founders, engineers, and creators. I am providing you with textual content scraped from a user's website, blog, or landing page (${url}).
Your job is to analyze this content to understand what they do, who their audience is, and how they write, so we can draft engaging social media posts for them.

Content to analyze:
"""
${content}
"""

Based on this content, extract and infer the following:
1. "name": The apparent name of the author or product.
2. "archetype": A 2-4 word phrase describing their professional focus (e.g., "B2B SaaS Founder", "Healthtech Pioneer", "Growth Specialist"). They must be positioned as a leader/commentator in their broader industry.
3. "description": A 1-2 sentence summary of what they do and write about. CRITICAL: This must position them as someone who shares insights about their ENTIRE industry ecosystem (e.g. for healthtech: patients, doctors, policy; for edtech: students, psychology, future of work), NOT just someone who talks about their specific software.
4. "tone_of_voice": An array of 3-4 strings describing how they write (e.g., "Direct and concise", "Technical and practical", "Bold and opinionated").
5. "target_audience": An array of 2-3 strings describing who they are writing for (e.g., "Early-stage founders", "Healthcare professionals", "Software engineers").
6. "core_values": An array of 2-3 strings describing their core beliefs or principles (e.g., "Speed of execution", "Patient-first care").
7. "pillars": Propose 3 core topics they should post about on social media to build trust and audience. 
    IMPORTANT: The pillars MUST cover the broader industry ecosystem, not just the software/product itself. For example, an edtech founder should talk about student psychology and the future of education; a healthtech founder about patients, doctors, and industry news. They need a strong persona engaging the audience broadly, like Zomato/Swiggy do.
    Each pillar should have:
    - name: (string) short title
    - description: (string) what kind of posts go here
    - proportion: (number) percentage allocation (the 3 pillars must sum to 100)
    - keywords: (array of strings) 3-4 topics associated with it
8. "sample_posts": Generate 3 high-quality sample posts based on these broad ecosystem pillars. CRITICAL: The posts MUST be extremely high quality, actionable, and sound like an experienced practitioner sharing real learnings. ZERO marketing fluff, zero emojis unless it perfectly matches their brand, ZERO hashtags, and DO NOT use words like "Unlock", "Supercharge", "Elevate". The posts must be written in the first person and sound like a smart human, not an AI.

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
      tone_of_voice: toStringArray(parsed.tone_of_voice, 'tone'),
      target_audience: toStringArray(parsed.target_audience, 'audience'),
      core_values: toStringArray(parsed.core_values, 'value'),
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
