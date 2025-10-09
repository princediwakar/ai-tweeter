// lib/twitter.ts
// Simple Twitter API implementation using fetch and OAuth 1.0a
import crypto from 'crypto';
export interface TweetV2 {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}


// --- NEW: OAuth 2.0 (App-Only) Bearer Token Logic ---

// Cache for the bearer token to avoid requesting it every time
let appBearerTokenCache: string | null = null;

async function getAppBearerToken(credentials: { apiKey: string, apiSecret: string }): Promise<string> {
  if (appBearerTokenCache) {
    return appBearerTokenCache;
  }

  const endpoint = 'https://api.twitter.com/oauth2/token';
  
  // Create Basic Auth header required for this specific request
  const key = encodeURIComponent(credentials.apiKey);
  const secret = encodeURIComponent(credentials.apiSecret);
  const authString = Buffer.from(`${key}:${secret}`).toString('base64');
  const authHeader = `Basic ${authString}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get App-Only Bearer Token:', errorText);
      throw new Error(`Twitter auth failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.token_type !== 'bearer') {
      throw new Error('Twitter did not return a bearer token.');
    }

    appBearerTokenCache = result.access_token;
    console.log('[Twitter Auth] Successfully obtained App-Only Bearer Token.');
    return appBearerTokenCache!;
  } catch (error) {
    console.error('Error in getAppBearerToken:', error);
    throw error;
  }
}

// --- MODIFIED: Scouting functions now use OAuth 2.0 ---

/**
 * Fetches recent tweet counts for a query. (Uses OAuth 2.0)
 */
export async function getRecentTweetCounts(query: string, startTime: string, credentials: TwitterCredentials): Promise<{ total_tweet_count: number }> {
  const endpoint = 'https://api.twitter.com/2/tweets/counts/recent';
  const queryParams = { query, start_time: startTime };
  const url = `${endpoint}?${new URLSearchParams(queryParams).toString()}`;

  try {
    const bearerToken = await getAppBearerToken(credentials);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
      },
    });

    if (!response.ok) {
      // Handle rate limiting specially
      if (response.status === 429) {
        const resetTime = response.headers.get('x-rate-limit-reset');
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
        const waitMinutes = resetDate ? Math.ceil((resetDate.getTime() - Date.now()) / 60000) : 'unknown';

        console.warn(`⏰ [Twitter API] Rate limit hit on tweet counts. Resets in ~${waitMinutes} minutes.`);
        throw new Error(`RATE_LIMIT:${waitMinutes}`);
      }

      const errorText = await response.text();
      console.error('Error fetching tweet counts:', JSON.parse(errorText));
      throw new Error(`Twitter API error on counts: ${response.statusText}`);
    }
    const result = await response.json();
    return result.meta;
  } catch (error) {
    console.error('Failed to get recent tweet counts:', error);
    throw error;
  }
}

/**
 * Searches for recent tweets. (Uses OAuth 2.0)
 */
export async function searchRecentTweets(query: string, credentials: TwitterCredentials): Promise<{ data: TweetV2[] }> {
    const endpoint = 'https://api.twitter.com/2/tweets/search/recent';
    const queryParams = {
        query,
        'tweet.fields': 'created_at,public_metrics,author_id',
        'max_results': '10',
    };
    const url = `${endpoint}?${new URLSearchParams(queryParams).toString()}`;

    try {
        const bearerToken = await getAppBearerToken(credentials);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${bearerToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error searching tweets:', JSON.parse(errorText));
            throw new Error(`Twitter API error on search: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to search recent tweets:', error);
        throw error;
    }
}





function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  credentials: TwitterCredentials
): string {
  // Create base string
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(credentials.apiSecret)}&${encodeURIComponent(credentials.accessSecret)}`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
    
  return signature;
}

function createOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string> = {},
  credentials: TwitterCredentials
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.apiKey,
    oauth_token: credentials.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
    ...params
  };

  const signature = generateOAuthSignature(method, url, oauthParams, credentials);
  oauthParams.oauth_signature = signature;

  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return authHeader;
}

export async function postReplyTweet(content: string, replyToTweetId: string, credentials: TwitterCredentials, retryCount = 0): Promise<{ data: { id: string; text: string } }> {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

  try {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    const authHeader = createOAuthHeader(method, url, {}, credentials);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: content,
        reply: {
          in_reply_to_tweet_id: replyToTweetId
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        errorObj = { title: 'Unknown error', detail: errorText };
      }

      // Handle specific Twitter API errors
      if (response.status === 403) {
        if (errorText.includes('oauth1 app permissions')) {
          throw new Error(`🚫 PERMISSION ERROR: Your Twitter app needs "Read and Write" permissions. Please:
1. Visit https://developer.x.com/en/portal/dashboard
2. Select your app
3. Navigate to Settings > User authentication settings  
4. Enable "Read and Write" permissions
5. Regenerate your Access Token and Secret
6. Update your .env.local file with the new tokens

Current error: ${errorObj.detail || errorText}`);
        }
        throw new Error(`🚫 FORBIDDEN: ${errorObj.detail || errorText}`);
      }

      if (response.status === 429) {
        throw new Error(`⏰ RATE LIMIT: Too many requests. Please wait before trying again.`);
      }

      if (response.status === 401) {
        throw new Error(`🔐 UNAUTHORIZED: Invalid credentials or expired tokens. Please check your Twitter API keys.`);
      }

      // Retry on server errors (5xx)
      if (response.status >= 500 && retryCount < maxRetries) {
        console.warn(`⚠️ Server error (${response.status}), retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return postReplyTweet(content, replyToTweetId, credentials, retryCount + 1);
      }

      throw new Error(`Twitter API error: ${response.status} ${response.statusText} - ${errorObj.detail || errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Reply tweet posted successfully to X/Twitter!');
    console.log(`📝 Content: ${content}`);
    console.log(`🔗 In reply to: ${replyToTweetId}`);
    console.log(`🆔 Tweet ID: ${result.data.id}`);
    console.log(`📊 Length: ${content.length} characters`);
    console.log(`🔗 URL: https://x.com/user/status/${result.data.id}`);
    
    return {
      data: {
        id: result.data.id,
        text: content
      }
    };
  } catch (error) {
    // Don't retry on client errors (4xx) except specific cases
    if (error instanceof Error && error.message.includes('PERMISSION ERROR')) {
      console.error('❌ Permission Error:', error.message);
      throw error;
    }

    if (retryCount < maxRetries && !(error instanceof Error)) {
      console.warn(`⚠️ Unexpected error, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return postReplyTweet(content, replyToTweetId, credentials, retryCount + 1);
    }

    console.error('❌ Error posting reply tweet:', error);
    throw error;
  }
}

export async function postTweet(content: string, credentials: TwitterCredentials, retryCount = 0): Promise<{ data: { id: string; text: string } }> {
  const maxRetries = 3;
  const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

  try {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    const authHeader = createOAuthHeader(method, url, {}, credentials);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        errorObj = { title: 'Unknown error', detail: errorText };
      }

      // Handle specific Twitter API errors
      if (response.status === 403) {
        if (errorText.includes('oauth1 app permissions')) {
          throw new Error(`🚫 PERMISSION ERROR: Your Twitter app needs "Read and Write" permissions. Please:
1. Visit https://developer.x.com/en/portal/dashboard
2. Select your app
3. Navigate to Settings > User authentication settings  
4. Enable "Read and Write" permissions
5. Regenerate your Access Token and Secret
6. Update your .env.local file with the new tokens

Current error: ${errorObj.detail || errorText}`);
        }
        throw new Error(`🚫 FORBIDDEN: ${errorObj.detail || errorText}`);
      }

      if (response.status === 429) {
        throw new Error(`⏰ RATE LIMIT: Too many requests. Please wait before trying again.`);
      }

      if (response.status === 401) {
        throw new Error(`🔐 UNAUTHORIZED: Invalid credentials or expired tokens. Please check your Twitter API keys.`);
      }

      // Retry on server errors (5xx)
      if (response.status >= 500 && retryCount < maxRetries) {
        console.warn(`⚠️ Server error (${response.status}), retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return postTweet(content, credentials, retryCount + 1);
      }

      throw new Error(`Twitter API error: ${response.status} ${response.statusText} - ${errorObj.detail || errorText}`);
    }

    const result = await response.json();
    
    console.log('✅ Tweet posted successfully to X/Twitter!');
    console.log(`📝 Content: ${content}`);
    console.log(`🆔 Tweet ID: ${result.data.id}`);
    console.log(`📊 Length: ${content.length} characters`);
    console.log(`🔗 URL: https://x.com/user/status/${result.data.id}`);
    
    return {
      data: {
        id: result.data.id,
        text: content
      }
    };
  } catch (error) {
    // Don't retry on client errors (4xx) except specific cases
    if (error instanceof Error && error.message.includes('PERMISSION ERROR')) {
      console.error('❌ Permission Error:', error.message);
      throw error;
    }

    if (retryCount < maxRetries && !(error instanceof Error)) {
      console.warn(`⚠️ Unexpected error, retrying in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return postTweet(content, credentials, retryCount + 1);
    }

    console.error('❌ Error posting tweet:', error);
    throw error;
  }
}

export async function postTweetWithImage(
  content: string, 
  imageBuffer: Buffer, 
  credentials: TwitterCredentials
): Promise<{ data: { id: string; text: string } }> {
  try {
    const { TwitterApi } = await import('twitter-api-v2');
    
    // Create Twitter client
    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });

    // Upload image using v1.1 API
    console.log(`📤 Uploading image (${imageBuffer.length} bytes)`);
    const mediaUpload = await client.v1.uploadMedia(imageBuffer, { 
      mimeType: 'image/jpeg',
      target: 'tweet' 
    });
    
    console.log(`✅ Image uploaded successfully. Media ID: ${mediaUpload}`);

    // Post tweet with image using v2 API
    const tweet = await client.v2.tweet({
      text: content,
      media: { media_ids: [mediaUpload.toString()] }
    });

    console.log('✅ Tweet with image posted successfully to X/Twitter!');
    console.log(`📝 Content: ${content}`);
    console.log(`🆔 Tweet ID: ${tweet.data.id}`);
    console.log(`📊 Length: ${content.length} characters`);
    console.log(`🔗 URL: https://x.com/user/status/${tweet.data.id}`);

    return {
      data: {
        id: tweet.data.id,
        text: content
      }
    };
  } catch (error) {
    console.error('❌ Error posting tweet with image:', error);
    throw error;
  }
}

export async function postToTwitter(content: string, hashtags: string[], credentials: TwitterCredentials): Promise<{ data: { id: string; text: string } }> {
  // Combine content and hashtags if hashtags aren't already in content
  const hasHashtagsInContent = hashtags.some(hashtag => content.includes(hashtag));
  const tweetText = hasHashtagsInContent 
    ? content 
    : `${content}${hashtags.length > 0 ? ' ' + hashtags.map(tag => `#${tag}`).join(' ') : ''}`;

  return postTweet(tweetText, credentials);
}

export async function validateTwitterCredentials(credentials: TwitterCredentials): Promise<{ valid: boolean; userInfo?: { username: string; name: string; id: string } }> {
  try {
    const url = 'https://api.twitter.com/2/users/me';
    const method = 'GET';
    
    const authHeader = createOAuthHeader(method, url, {}, credentials);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Twitter credentials validation failed:', response.status, errorText);
      return { valid: false };
    }

    const result = await response.json();
    
    console.log('✅ Twitter credentials validated');
    console.log(`👤 Connected as: @${result.data.username} (${result.data.name})`);
    console.log(`🆔 User ID: ${result.data.id}`);
    
    return {
      valid: true,
      userInfo: {
        username: result.data.username,
        name: result.data.name,
        id: result.data.id
      }
    };
  } catch (error) {
    console.error('❌ Twitter credentials validation failed:', error);
    return { valid: false };
  }
}


