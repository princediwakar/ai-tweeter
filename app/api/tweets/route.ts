// app/api/tweets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPaginatedTweets, saveTweet, generateTweetId, deleteTweets } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { getAllPersonas } from '@/lib/personas';
import type { Tweet } from '@/lib/types';
import { generateTweet, generateBatchTweets } from '@/lib/generationService';
import { generateThread, canGenerateThreads } from '@/lib/threadGenerationService';
import { TweetGenerationConfig } from '@/lib/types';
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

    const result = await getPaginatedTweets({ 
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
      const personaKey = data.persona || (allPersonas.length > 0 ? allPersonas[0].key : null);
      
      if (!personaKey) {
        return NextResponse.json({ error: 'No personas configured.' }, { status: 400 });
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
          tweets: threadResult.tweets,
          meta: { content_type: 'thread', persona: personaKey }
        });
      } else {
        const contentTypes = ['explanation', 'concept_clarification', 'memory_aid', 'practical_application', 'common_mistake', 'analogy'];
        const contentType = contentTypes[new Date().getHours() % contentTypes.length];
        
        const config: TweetGenerationConfig = {
          connected_account_id: accountId,
          persona: personaKey,
          topic: topic,
          contentType: contentType as any
        };

        const generatedTweet = await generateTweet(config);
        if (!generatedTweet) return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
        
        const tweet: Tweet = {
          id: crypto.randomUUID(),
          connected_account_id: accountId,
          content: generatedTweet.content,
          hashtags: generatedTweet.hashtags,
          persona: generatedTweet.persona,
          status: 'ready',
          created_at: new Date().toISOString(),
          content_type: 'single_tweet',
          image_url: generatedTweet.imageUrl,
          image_status: generatedTweet.imageStatus || 'none',
          card_data: generatedTweet.cardData ? JSON.stringify(generatedTweet.cardData) : undefined,
        };

        await saveTweet(tweet);
        return NextResponse.json({ tweet });
      }
    }

    if (action === 'bulk_generate') {
      const personaKey = data.persona;
      const requestedCount = Math.min(data.count || 5, 10);
      
      const config: TweetGenerationConfig = {
        connected_account_id: accountId,
        persona: personaKey,
        topic: data.topic || data.customPrompt,
      };

      const generatedTweets = await generateBatchTweets(requestedCount, config);
      if (generatedTweets.length === 0) return NextResponse.json({ error: 'Bulk generation failed' }, { status: 500 });

      const savedTweets: Tweet[] = [];
      for (const gen of generatedTweets) {
        const tweet: Tweet = {
          id: generateTweetId(),
          connected_account_id: accountId,
          content: gen.content,
          hashtags: gen.hashtags,
          persona: gen.persona,
          status: 'ready',
          created_at: new Date().toISOString(),
          content_type: 'single_tweet',
          image_url: gen.imageUrl,
          image_status: gen.imageStatus || 'none',
          card_data: gen.cardData ? JSON.stringify(gen.cardData) : undefined,
        };
        await saveTweet(tweet);
        savedTweets.push(tweet);
      }

      return NextResponse.json({ tweets: savedTweets });
    }

    if (action === 'bulk_delete') {
      const { tweetIds } = data;
      if (!Array.isArray(tweetIds) || tweetIds.length === 0) {
        return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
      }
      await deleteTweets(tweetIds);
      return NextResponse.json({ success: true, deletedCount: tweetIds.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Tweets API Error:', 'tweets-api', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}