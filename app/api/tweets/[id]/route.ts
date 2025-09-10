import { NextResponse } from 'next/server';
import { getAllTweets, saveTweet, deleteTweet } from '@/lib/db';
import { accountService } from '@/lib/accountService';
import { postTweet } from '@/lib/twitter';

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
        // Get account credentials for posting
        const account = await accountService.getAccount(tweet.account_id);
        if (!account) {
          return NextResponse.json({ error: 'Account not found for this tweet' }, { status: 404 });
        }

        const credentials = {
          apiKey: account.twitter_api_key,
          apiSecret: account.twitter_api_secret,
          accessToken: account.twitter_access_token,
          accessSecret: account.twitter_access_token_secret
        };

        const result = await postTweet(tweet.content, credentials);
        tweet.status = 'posted';
        tweet.posted_at = new Date().toISOString();
        tweet.twitter_id = result.data.id; // Store the Twitter tweet ID
        await saveTweet(tweet);
        return NextResponse.json({ 
          ...tweet, 
          twitterUrl: `https://x.com/user/status/${result.data.id}`
        });
      } catch (error) {
        tweet.status = 'failed';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        tweet.error_message = errorMessage;
        await saveTweet(tweet);
        
        // Return detailed error for better user experience
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