import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
You are an expert brand strategist and ghostwriter. I am providing you with the textual content scraped from a user's website, blog, or landing page (${url}).
Your job is to analyze this content and reverse-engineer their "Brand Identity" so we can build an autonomous social media engine for them.

Content to analyze:
"""
${content.substring(0, 15000)} -- truncated for length
"""

Based on this content, extract and infer the following:
1. "name": The apparent name of the author or product.
2. "archetype": A 3-4 word phrase describing their persona (e.g., "The Pragmatic Builder", "The Solo Hacker", "The AI Educator").
3. "description": A 1-2 sentence summary of what they do and write about.
4. "tone_of_voice": An array of 3-4 strings describing how they sound (e.g., "Direct and punchy", "Academic", "Build-in-public transparency").
5. "target_audience": An array of 2-3 strings describing who they are writing for (e.g., "Early-stage founders", "Senior React Engineers").
6. "core_values": An array of 2-3 strings describing their core thesis or beliefs (e.g., "Execution over strategy", "Open source wins").
7. "pillars": Propose 3 core content pillars they should post about on social media to drive engagement and authority. Each pillar should have:
    - name: (string) short title
    - description: (string) what kind of posts go here
    - proportion: (number) percentage allocation (the 3 pillars must sum to 100)
    - keywords: (array of strings) 3-4 topics associated with it
8. "sample_posts": Generate 3 sample social media posts (e.g., tweets or short LinkedIn posts) that perfectly embody this brand's tone, pillars, and audience. Show exactly what the AI will write for them.

Return the result as a valid JSON object matching this structure EXACTLY. No markdown formatting, just raw JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an AI brand strategist. You output only raw, valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    return JSON.parse(resultText) as AnalyzedBrand;
  } catch (error) {
    console.error('Error analyzing brand:', error);
    throw new Error('Failed to analyze brand content');
  }
}
