// app/api/tweets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedPosts, savePost, generatePostId, deletePosts } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getAllPersonas } from '@/lib/personas';
import type { Post } from '@/lib/types';
import { generatePost, generateBatchPosts } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { PostGenerationConfig } from '@/lib/types';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const accountId = searchParams.get('connected_account_id') || searchParams.get('account_id');
    
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    const result = await getPaginatedPosts({ 
      page, 
      limit, 
      accountId: accountId || undefined 
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, ...data } = body;

    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

    const accountId = data.connected_account_id || data.account_id;
    if (!accountId) {
      return NextResponse.json({ error: 'connected_account_id is required' }, { status: 400 });
    }

    if (action === 'generate') {
      const allPersonas = await getAllPersonas();
      
      // Support both persona_id (DB UUID) and persona_key (unique key)
      let personaKey = data.persona_key || data.persona;
      
      // If we have a persona ID but no key, look up the key
      if (!personaKey && data.persona_id) {
        const personaById = allPersonas.find(p => p.id === data.persona_id);
        if (personaById) {
          personaKey = personaById.key;
        }
      }
      
      // Fallback to first available persona
      if (!personaKey && allPersonas.length > 0) {
        personaKey = allPersonas[0].key;
      }
      
      if (!personaKey) {
        return NextResponse.json({ error: 'No voices configured. Create a voice first.' }, { status: 400 });
      }
      
      const topic = data.topic || data.customPrompt;
      const persona = allPersonas.find(p => p.key === personaKey);
      const supportsThreads = persona?.config?.supports_threads ?? false;
      
      let shouldGenerateThread = false;
      const account = await connectedAccountsService.getById(accountId);
      
      // FIXED: Use 'as any' to bypass the Date vs String incompatibility 
      // between different ConnectedAccount definitions.
      if (account && supportsThreads) {
        shouldGenerateThread = await canGenerateThreads(account as any);
      }

      if (shouldGenerateThread) {
        const threadResult = await generateThread({
          connected_account_id: accountId,
          persona: personaKey,
        });
        
        if (!threadResult) return NextResponse.json({ error: 'Thread generation failed' }, { status: 500 });

        return NextResponse.json({ 
          thread: threadResult,
          tweets: threadResult.posts,
          meta: { content_type: 'thread', persona: personaKey }
        });
      } else {
        const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];
        const contentType = contentTypes[new Date().getHours() % contentTypes.length];
        
        const config: PostGenerationConfig = {
          connected_account_id: accountId,
          persona: personaKey,
          topic: topic,
          contentType: contentType as any,
          skipRSS: true,
        };

        const generatedPost = await generatePost(config);
        if (!generatedPost) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
        
        const post: Post = {
          id: crypto.randomUUID(),
          connected_account_id: accountId,
          content: generatedPost.content,
          hashtags: generatedPost.hashtags,
          persona: generatedPost.persona,
          status: 'draft',
          created_at: new Date(),
          content_type: 'single_tweet',
          image_url: generatedPost.imageUrl || null,
          image_status: generatedPost.imageStatus || 'none',
          card_data: generatedPost.cardData ? JSON.stringify(generatedPost.cardData) : null,
          source_url: generatedPost.sourceUrl || null,
          // Required properties
          posted_at: null,
          error_message: null,
          schedule_id: null,
          persona_id: null,
          thread_id: null,
          thread_sequence: null,
        };

        await savePost(post);
        return NextResponse.json({ post });
      }
    }

    if (action === 'bulk_generate') {
      const personaKey = data.persona;
      const requestedCount = Math.min(data.count || 5, 10);
      
      const config: PostGenerationConfig = {
        connected_account_id: accountId,
        persona: personaKey,
        topic: data.topic || data.customPrompt,
      };

      const generatedPosts = await generateBatchPosts(requestedCount, config);
      if (generatedPosts.length === 0) return NextResponse.json({ error: 'Bulk generation failed' }, { status: 500 });

      const savedPosts: Post[] = [];
      for (const gen of generatedPosts) {
        const post: Post = {
          id: generatePostId(),
          connected_account_id: accountId,
          content: gen.content,
          hashtags: gen.hashtags,
          persona: gen.persona,
          status: 'draft',
          created_at: new Date(),
          content_type: 'single_tweet',
          image_url: gen.imageUrl || null,
          image_status: gen.imageStatus || 'none',
          card_data: gen.cardData ? JSON.stringify(gen.cardData) : null,
          source_url: null,
          // Required properties
          posted_at: null,
          error_message: null,
          schedule_id: null,
          persona_id: null,
          thread_id: null,
          thread_sequence: null,
        };
        await savePost(post);
        savedPosts.push(post);
      }

      return NextResponse.json({ posts: savedPosts });
    }

    if (action === 'bulk_delete') {
      const { tweetIds } = data;
      if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
        return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
      }
      await deletePosts(tweetIds);
      return NextResponse.json({ success: true, deletedCount: tweetIds.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Tweets API Error:', 'tweets-api', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}