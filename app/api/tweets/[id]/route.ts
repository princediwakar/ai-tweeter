// app/api/tweets/[id]/route.ts
import { NextResponse } from 'next/server';
import { getAllPosts, savePost, deletePost } from '@/lib/db';
import { connectedAccountsService } from '@/lib/connectedAccounts';
import { postTweet, buildTwitterCredentialsFromAccount } from '@/lib/twitter';
import { postToLinkedIn, LinkedInCredentials } from '@/lib/linkedin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const posts = await getAllPosts();
    const post = posts.find(t => t.id === id);

    if (!post) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    return NextResponse.json(post);
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
    const posts = await getAllPosts();
    const post = posts.find(t => t.id === id);

    if (!post) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    if (action === 'post') {
      try {
        const accountId = post.connected_account_id;
        if (!accountId) {
          return NextResponse.json({ error: 'No account linked to this tweet' }, { status: 400 });
        }
        
        const account = await connectedAccountsService.getByIdWithCredentials(accountId);
        if (!account) {
          return NextResponse.json({ error: 'Account not found for this tweet' }, { status: 404 });
        }

        const platform = account.platform;
        
        if (platform === 'linkedin') {
          const oauth2Cred = account.credentials.find(c => c.auth_type === 'oauth2' && c.is_active);
          if (!oauth2Cred?.access_token) {
            return NextResponse.json({ error: 'LinkedIn access token not found. Please reconnect LinkedIn in Settings.' }, { status: 400 });
          }
          
          const linkedinCreds: LinkedInCredentials = {
            accessToken: oauth2Cred.access_token,
            refreshToken: oauth2Cred.refresh_token || undefined,
            expiresAt: oauth2Cred.token_expires_at || undefined,
          };

          let content = post.content.replace(/@/g, '');
          if (post.hashtags && post.hashtags.length > 0) {
            const formattedTags = post.hashtags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            content = `${content}\n\n${formattedTags}`;
          }

          const result = await postToLinkedIn(content, linkedinCreds, post.image_url || undefined);
          
          post.status = 'posted';
          post.posted_at = new Date();
          await savePost(post);
          
          return NextResponse.json({ 
            ...post, 
            platform: 'linkedin',
            platform_post_url: `https://www.linkedin.com/feed/update/${result.id}`
          });
        } else {
          // Twitter - get credentials from account_credentials table
          const oauth1Cred = account.credentials.find(c => c.auth_type === 'oauth1' && c.is_active);
          const oauth2Cred = account.credentials.find(c => c.auth_type === 'oauth2' && c.is_active);
          
          const activeCred = oauth1Cred || oauth2Cred;
          if (!activeCred?.access_token) {
            return NextResponse.json({ error: 'Twitter access token not found. Please reconnect Twitter in Settings.' }, { status: 400 });
          }

          const credentials = {
            oauth2AccessToken: activeCred.access_token,
            oauth2RefreshToken: activeCred.refresh_token || undefined,
            oauth2ExpiresAt: activeCred.token_expires_at || undefined,
          };

          const result = await postTweet(post.content, credentials);
          post.status = 'posted';
          post.posted_at = new Date();
          await savePost(post);
          
          return NextResponse.json({ 
            ...post, 
            platform_post_url: `https://x.com/user/status/${result.data.id}`
          });
        }
      } catch (error) {
        post.status = 'failed';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        post.error_message = errorMessage;
        await savePost(post);
        
        return NextResponse.json({ 
          error: 'Failed to post tweet',
          details: errorMessage,
          post: post
        }, { status: 400 });
      }
    }

    if (action === 'update') {
      Object.assign(post, data);
      await savePost(post);
      return NextResponse.json(post);
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
    const posts = await getAllPosts();
    const postExists = posts.find(t => t.id === id);
    
    if (!postExists) {
      console.log(`[DELETE] Tweet with ID ${id} not found`);
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }
    
    console.log(`[DELETE] Tweet found, proceeding with deletion...`);
    await deletePost(id);
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