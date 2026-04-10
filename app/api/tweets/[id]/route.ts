// app/api/tweets/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAllTweets, saveTweet, deleteTweet } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { postTweet, buildTwitterCredentialsFromAccount } from '@/lib/twitter';
import { postToLinkedIn, LinkedInCredentials } from '@/lib/linkedin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tweets = await getAllTweets();
    const tweet = tweets.find(t => t.id === id);

    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    return NextResponse.json(tweet);
  } catch (error) {
    console.error('Error fetching tweet:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;
    const tweets = await getAllTweets();
    const tweet = tweets.find(t => t.id === id);

    if (!tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    if (action === 'post') {
      try {
        const accountId = tweet.connected_account_id;
        if (!accountId) {
          return NextResponse.json({ error: 'No account linked to this tweet' }, { status: 400 });
        }
        
        const account = await connectedAccountsService.getById(accountId);
        if (!account) {
          return NextResponse.json({ error: 'Account not found for this tweet' }, { status: 404 });
        }

        const platform = account.platform;
        
        if (platform === 'linkedin') {
          if (!account.access_token) {
            return NextResponse.json({ error: 'LinkedIn access token not found. Please reconnect LinkedIn in Settings.' }, { status: 400 });
          }
          
          const linkedinCreds: LinkedInCredentials = {
            accessToken: account.access_token,
            refreshToken: account.refresh_token || undefined,
            expiresAt: account.token_expires_at ? new Date(account.token_expires_at) : undefined,
            userId: account.linkedin_user_id || undefined,
            orgId: account.linkedin_org_id || undefined,
          };

          let content = tweet.content.replace(/@/g, '');
          if (tweet.hashtags && tweet.hashtags.length > 0) {
            const formattedTags = tweet.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            content = `${content}\n\n${formattedTags}`;
          }

          const result = await postToLinkedIn(content, linkedinCreds, tweet.image_url || undefined);
          
          tweet.status = 'posted';
          tweet.posted_at = new Date().toISOString();
          tweet.linkedin_id = result.id;
          await saveTweet(tweet);
          
          return NextResponse.json({ 
            ...tweet, 
            platform: 'linkedin',
            linkedinUrl: `https://www.linkedin.com/feed/update/${result.id}`
          });
        } else {
          if (!account.access_token) {
            return NextResponse.json({ error: 'Twitter access token not found. Please reconnect Twitter in Settings.' }, { status: 400 });
          }

          // FIX: Map database 'null' values to TypeScript 'undefined' 
          // and use the CORRECT database column for the Twitter access secret.
          const credentials = buildTwitterCredentialsFromAccount({
            ...account,
            twitter_api_key: account.twitter_api_key ?? undefined,
            twitter_api_secret: account.twitter_api_secret ?? undefined,
            access_token: account.twitter_access_token ?? account.access_token ?? undefined,
            access_secret: account.twitter_access_token_secret ?? undefined, // <--- FIXED: Properly mapped from DB
          } as any);

          const result = await postTweet(tweet.content, credentials);
          tweet.status = 'posted';
          tweet.posted_at = new Date().toISOString();
          tweet.twitter_id = result.data.id;
          await saveTweet(tweet);
          
          return NextResponse.json({ 
            ...tweet, 
            twitterUrl: `https://x.com/user/status/${result.data.id}`
          });
        }
      } catch (error) {
        tweet.status = 'failed';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        tweet.error_message = errorMessage;
        await saveTweet(tweet);
        
        return NextResponse.json({ 
          error: 'Failed to post tweet',
          details: errorMessage,
          tweet: tweet
        }, { status: 400 });
      }
    }

    if (action === 'update') {
      Object.assign(tweet, data);
      await saveTweet(tweet);
      return NextResponse.json(tweet);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in tweet API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[DELETE] Attempting to delete tweet with ID: ${id}`);
    
    // First check if the tweet exists
    const tweets = await getAllTweets();
    const tweetExists = tweets.find(t => t.id === id);
    
    if (!tweetExists) {
      console.log(`[DELETE] Tweet with ID ${id} not found`);
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }
    
    console.log(`[DELETE] Tweet found, proceeding with deletion...`);
    await deleteTweet(id);
    console.log(`[DELETE] Tweet ${id} deleted successfully`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tweet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Detailed error:', { error: errorMessage, stack: error instanceof Error ? error.stack : 'No stack trace' });
    
    return NextResponse.json({ 
      error: 'Failed to delete tweet',
      details: errorMessage 
    }, { status: 500 });
  }
}