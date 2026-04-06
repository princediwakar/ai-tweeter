import { NextResponse } from 'next/server';
import { getAllTweets, saveTweet, deleteTweet } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { postTweet } from '@/lib/twitter';
import { postToLinkedIn, refreshAccessToken, LinkedInCredentials } from '@/lib/linkedin';
import { sql } from '@vercel/postgres';

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
      const platform = body.platform || 'twitter';
      
      try {
        // Get account credentials for posting
        const accountId = tweet.connected_account_id || tweet.account_id;
        if (!accountId) {
          return NextResponse.json({ error: 'No account linked to this tweet' }, { status: 400 });
        }
        let account = await connectedAccountsService.getById(accountId);
        if (!account) {
          return NextResponse.json({ error: 'Account not found for this tweet' }, { status: 404 });
        }

        if (platform === 'linkedin') {
          // Handle LinkedIn posting
          // Check if the specific account has LinkedIn, or find any account with LinkedIn connected
          let linkedInAccount = account;
          
          if (!account?.linkedin_enabled || !account?.linkedin_access_token) {
            // Try to find any account with LinkedIn connected for this user
            const userId = account.user_id;
            if (userId) {
              const userAccounts = await connectedAccountsService.getByUserId(userId);
              linkedInAccount = userAccounts.find(a => a.linkedin_enabled && a.linkedin_access_token);
            }
          }

          if (!linkedInAccount || !linkedInAccount.linkedin_enabled || !linkedInAccount.linkedin_access_token) {
            return NextResponse.json({ error: 'LinkedIn not connected for this account. Please connect LinkedIn in Settings.' }, { status: 400 });
          }

          // Use the found LinkedIn account
          account = linkedInAccount;
          console.log('Using LinkedIn account:', { accountId: account.id, userId: account.user_id });

          // Refresh token if needed
          if (account.linkedin_refresh_token && account.linkedin_token_expires_at) {
            const expiresAt = new Date(account.linkedin_token_expires_at);
            const shouldRefresh = Date.now() > expiresAt.getTime() - 60000; // Refresh 1 min before expiry
            if (shouldRefresh) {
              try {
                const { accessToken, refreshToken, expiresAt: newExpiresAt } = await refreshAccessToken(account.linkedin_refresh_token);
                await connectedAccountsService.update(accountId, {
                  linkedin_access_token: accessToken,
                  linkedin_refresh_token: refreshToken,
                  linkedin_token_expires_at: newExpiresAt.toISOString(),
                });
                account.linkedin_access_token = accessToken;
                account.linkedin_refresh_token = refreshToken;
                account.linkedin_token_expires_at = newExpiresAt.toISOString();
              } catch (refreshError) {
                console.error('Failed to refresh LinkedIn token:', refreshError);
              }
            }
          }

          const linkedinCreds: LinkedInCredentials = {
            accessToken: account.linkedin_access_token,
            refreshToken: account.linkedin_refresh_token,
            expiresAt: account.linkedin_token_expires_at ? new Date(account.linkedin_token_expires_at) : undefined,
            userId: account.linkedin_user_id,
            orgId: account.linkedin_org_id,
          };

          // Strip @ mentions for LinkedIn
          let content = tweet.content.replace(/@/g, '');
          if (tweet.hashtags && tweet.hashtags.length > 0) {
            const formattedTags = tweet.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            content = `${content}\n\n${formattedTags}`;
          }

          const result = await postToLinkedIn(content, linkedinCreds, tweet.image_url || undefined);
          
          // Update tweet status and store LinkedIn ID
          tweet.status = 'posted';
          tweet.posted_at = new Date().toISOString();
          await sql`UPDATE tweets SET linkedin_id = ${result.id}, posted_at = ${tweet.posted_at}, status = 'posted' WHERE id = ${tweet.id}`;
          await saveTweet(tweet);
          
          return NextResponse.json({ 
            ...tweet, 
            platform: 'linkedin',
            linkedinUrl: `https://www.linkedin.com/feed/update/${result.id}`
          });
        } else {
          // Handle Twitter posting (existing code)
          const credentials = {
            apiKey: account.twitter_api_key || '',
            apiSecret: account.twitter_api_secret || '',
            accessToken: account.twitter_access_token || '',
            accessSecret: account.twitter_access_token_secret || ''
          };

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