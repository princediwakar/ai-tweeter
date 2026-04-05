import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { personaService } from '@/lib/personaService';
import { sql } from '@vercel/postgres';
import OpenAI from 'openai';

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('No AI API key configured');
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });
}

interface GeneratedPersona {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  min_length: number;
  max_length: number;
  rss_sources: string[];
  config: Record<string, unknown>;
}

const PERSONA_GENERATION_SYSTEM_PROMPT = `You are an expert social media strategist. Your task is to create a detailed AI persona for content generation based on the user's description.

Based on the user's input, generate a complete persona with:
1. A catchy, memorable name for this persona
2. A detailed description of the persona's writing style and focus
3. Recommended character limits (min/max) - typically 100-280 for Twitter, 600-2500 for LinkedIn
4. Appropriate tone (e.g., professional, witty, analytical, educational, inspirational)
5. Key topics this persona should cover
6. 3-5 relevant RSS feed URLs that would provide good content for this persona

Return your response as a JSON object with this exact structure:
{
  "name": "string",
  "description": "string",
  "tone": "string",
  "topics": ["string"],
  "min_length": number,
  "max_length": number,
  "rss_sources": ["string"]
}

Ensure the RSS sources are real, publicly available RSS feeds relevant to the persona's focus.`;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, connected_account_id, platform: platformFromBody, account_name } = await request.json();

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: 'Please describe what kind of content you want to post (at least 10 characters)' }, { status: 400 });
    }

    if (!connected_account_id) {
      return NextResponse.json({ error: 'Connected account ID is required' }, { status: 400 });
    }

    // Verify the connected account belongs to the user
    const userResult = await sql`SELECT id FROM users WHERE email = ${session.user.email}`;
    const userId = userResult.rows[0]?.id;
    const accountCheck = await sql`
      SELECT id, platform, account_name FROM connected_accounts WHERE id = ${connected_account_id} AND user_id = ${userId}
    `;
    if (accountCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid connected account' }, { status: 403 });
    }

    const platform = platformFromBody || accountCheck.rows[0].platform;
    const isLinkedIn = platform === 'linkedin';
    
    // Adjust character limits based on platform
    const lengthContext = isLinkedIn 
      ? 'LinkedIn (600-3000 characters recommended)'
      : 'Twitter (100-280 characters recommended)';
    
    const accName = account_name || accountCheck.rows[0].account_name;

    const fullPrompt = `${PERSONA_GENERATION_SYSTEM_PROMPT}

User's request: "${prompt}"
Platform: ${lengthContext}

Generate a persona that matches this description.`;

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: PERSONA_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: `Create a persona for account "${accName}" on ${isLinkedIn ? 'LinkedIn' : 'Twitter'}. User wants: "${prompt}". Platform: ${lengthContext}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Failed to generate persona' }, { status: 500 });
    }

    // Parse the JSON response
    let generatedPersona: GeneratedPersona;
    try {
      // Try to extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      generatedPersona = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Validate and sanitize the response
    const personaData = {
      connected_account_id,
      name: generatedPersona.name ? generatedPersona.name.slice(0, 255) : 'Custom Persona',
      description: generatedPersona.description || '',
      tone: generatedPersona.tone ? generatedPersona.tone.slice(0, 50) : 'neutral',
      topics: Array.isArray(generatedPersona.topics) 
        ? generatedPersona.topics.map((t: string) => t.slice(0, 100)).slice(0, 20)
        : [],
      min_length: Math.max(50, Math.min(500, generatedPersona.min_length || (isLinkedIn ? 600 : 100))),
      max_length: Math.max(100, Math.min(3000, generatedPersona.max_length || (isLinkedIn ? 2500 : 280))),
      rss_sources: Array.isArray(generatedPersona.rss_sources) 
        ? generatedPersona.rss_sources.filter((url: string) => url.startsWith('http'))
        : [],
      config: {
        auto_generated: true,
        original_prompt: prompt,
        ...generatedPersona.config
      },
      is_active: true,
      is_default: false,
    };

    // Return generated data without saving - frontend will confirm to save
    return NextResponse.json({ 
      generated: generatedPersona,
      message: 'Persona generated successfully! Review and save.'
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating persona:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate persona' 
    }, { status: 500 });
  }
}