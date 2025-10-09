import { sql } from '@vercel/postgres';
import type { Account, Tweet } from './types';

// In-memory storage for testing when database is not available
const inMemoryAccounts: Account[] = [];
const inMemoryTweets: Tweet[] = [];
// Use real database connection
const USE_IN_MEMORY = false; // Use PostgreSQL database


// Thread interface for threading system
export interface Thread {
  id: string;
  account_id: string;
  title: string;
  persona: string;
  story_template: string;
  total_tweets: number;
  current_tweet: number;
  parent_tweet_id?: string; // Twitter ID of first tweet in thread
  status: 'ready' | 'posting' | 'completed' | 'failed';
  next_post_time?: string;
  engagement_score: number;
  story_category: string;
  created_at: string;
}

// Updated Tweet interface with account_id and threading support

// Encryption utilities for Twitter credentials
// Encryption key for future use - currently using unencrypted storage
// const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production';

function decrypt(encryptedText: string): string {
  try {
    // Remove prefix and decode
    const encoded = encryptedText.substring(4);
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    // Fallback: return original text
    return encryptedText;
  }
}

// Helper function to get decrypted credentials from account
export function getAccountCredentials(account: Account) {
  return {
    apiKey: decrypt(account.twitter_api_key_encrypted),
    apiSecret: decrypt(account.twitter_api_secret_encrypted),
    accessToken: decrypt(account.twitter_access_token_encrypted),
    accessSecret: decrypt(account.twitter_access_token_secret_encrypted),
  };
}



// Account management functions
export async function getAllAccounts(): Promise<Account[]> {
  if (USE_IN_MEMORY) {
    console.log('[Memory] Getting all accounts, count:', inMemoryAccounts.length);
    return [...inMemoryAccounts];
  }

  try {
    const result = await sql`
      SELECT * FROM accounts
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      twitter_handle: row.twitter_handle,
      twitter_api_key_encrypted: row.twitter_api_key_encrypted,
      twitter_api_secret_encrypted: row.twitter_api_secret_encrypted,
      twitter_access_token_encrypted: row.twitter_access_token_encrypted,
      twitter_access_token_secret_encrypted: row.twitter_access_token_secret_encrypted,
      cloudinary_cloud_name_encrypted: row.cloudinary_cloud_name_encrypted,
      cloudinary_api_key_encrypted: row.cloudinary_api_key_encrypted,
      cloudinary_api_secret_encrypted: row.cloudinary_api_secret_encrypted,
      personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
      branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
        theme: 'educational',
        audience: 'general',
        tone: 'professional'
      }),
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));
  } catch (error) {
    console.error('[Neon] Error getting accounts:', error);
    return [];
  }
}

export async function getAccount(id: string): Promise<Account | null> {
  if (USE_IN_MEMORY) {
    const account = inMemoryAccounts.find(acc => acc.id === id);
    return account || null;
  }

  try {
    const result = await sql`
      SELECT * FROM accounts
      WHERE id = ${id}
    `;
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      twitter_handle: row.twitter_handle,
      twitter_api_key_encrypted: row.twitter_api_key_encrypted,
      twitter_api_secret_encrypted: row.twitter_api_secret_encrypted,
      twitter_access_token_encrypted: row.twitter_access_token_encrypted,
      twitter_access_token_secret_encrypted: row.twitter_access_token_secret_encrypted,
      cloudinary_cloud_name_encrypted: row.cloudinary_cloud_name_encrypted,
      cloudinary_api_key_encrypted: row.cloudinary_api_key_encrypted,
      cloudinary_api_secret_encrypted: row.cloudinary_api_secret_encrypted,
      personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
      branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
        theme: 'educational',
        audience: 'general',
        tone: 'professional'
      }),
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  } catch (error) {
    console.error('[Neon] Error getting account:', error);
    return null;
  }
}

export async function getAccountByTwitterHandle(twitterHandle: string): Promise<Account | null> {
  // Normalize handle - try both with and without @ prefix
  const withPrefix = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`;
  const withoutPrefix = twitterHandle.replace('@', '');
  
  if (USE_IN_MEMORY) {
    let account = inMemoryAccounts.find(acc => acc.twitter_handle === withPrefix);
    if (!account) {
      account = inMemoryAccounts.find(acc => acc.twitter_handle === withoutPrefix);
    }
    return account || null;
  }

  try {
    // Try with @ prefix first (most common storage format)
    let result = await sql`
      SELECT * FROM accounts
      WHERE twitter_handle = ${withPrefix}
    `;
    
    // If not found, try without @ prefix
    if (result.rows.length === 0) {
      result = await sql`
        SELECT * FROM accounts
        WHERE twitter_handle = ${withoutPrefix}
      `;
    }
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      twitter_handle: row.twitter_handle,
      twitter_api_key_encrypted: row.twitter_api_key_encrypted,
      twitter_api_secret_encrypted: row.twitter_api_secret_encrypted,
      twitter_access_token_encrypted: row.twitter_access_token_encrypted,
      twitter_access_token_secret_encrypted: row.twitter_access_token_secret_encrypted,
      cloudinary_cloud_name_encrypted: row.cloudinary_cloud_name_encrypted,
      cloudinary_api_key_encrypted: row.cloudinary_api_key_encrypted,
      cloudinary_api_secret_encrypted: row.cloudinary_api_secret_encrypted,
      personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
      branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
        theme: 'educational',
        audience: 'general',
        tone: 'professional'
      }),
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  } catch (error) {
    console.error('[Neon] Error getting account by twitter handle:', error);
    return null;
  }
}

export async function saveAccount(account: Omit<Account, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  if (USE_IN_MEMORY) {
    const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newAccount: Account = {
      ...account,
      id: accountId,
      created_at: new Date(),
      updated_at: new Date()
    };
    inMemoryAccounts.push(newAccount);
    console.log(`[Memory] Saved account ${accountId} - ${account.name}`);
    return accountId;
  }

  try {
    const result = await sql`
      INSERT INTO accounts (
        name, twitter_handle, twitter_api_key_encrypted, twitter_api_secret_encrypted,
        twitter_access_token_encrypted, twitter_access_token_secret_encrypted, 
        cloudinary_cloud_name_encrypted, cloudinary_api_key_encrypted, cloudinary_api_secret_encrypted,
        personas, branding, status
      ) VALUES (
        ${account.name},
        ${account.twitter_handle},
        ${account.twitter_api_key_encrypted},
        ${account.twitter_api_secret_encrypted},
        ${account.twitter_access_token_encrypted},
        ${account.twitter_access_token_secret_encrypted},
        ${account.cloudinary_cloud_name_encrypted || null},
        ${account.cloudinary_api_key_encrypted || null},
        ${account.cloudinary_api_secret_encrypted || null},
        ${JSON.stringify(account.personas)},
        ${JSON.stringify(account.branding)},
        ${account.status}
      )
      RETURNING id
    `;
    
    const accountId = result.rows[0].id;
    console.log(`[Neon] Saved account ${accountId}`);
    return accountId;
  } catch (error) {
    console.error('[Neon] Error saving account:', error);
    throw error;
  }
}

export async function updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  try {
    const updateFields: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (updates.name) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.twitter_handle) {
      updateFields.push(`twitter_handle = $${paramIndex++}`);
      values.push(updates.twitter_handle);
    }
    if (updates.twitter_api_key_encrypted) {
      updateFields.push(`twitter_api_key_encrypted = $${paramIndex++}`);
      values.push(updates.twitter_api_key_encrypted);
    }
    if (updates.twitter_api_secret_encrypted) {
      updateFields.push(`twitter_api_secret_encrypted = $${paramIndex++}`);
      values.push(updates.twitter_api_secret_encrypted);
    }
    if (updates.twitter_access_token_encrypted) {
      updateFields.push(`twitter_access_token_encrypted = $${paramIndex++}`);
      values.push(updates.twitter_access_token_encrypted);
    }
    if (updates.twitter_access_token_secret_encrypted) {
      updateFields.push(`twitter_access_token_secret_encrypted = $${paramIndex++}`);
      values.push(updates.twitter_access_token_secret_encrypted);
    }
    if (updates.cloudinary_cloud_name_encrypted !== undefined) {
      updateFields.push(`cloudinary_cloud_name_encrypted = $${paramIndex++}`);
      values.push(updates.cloudinary_cloud_name_encrypted);
    }
    if (updates.cloudinary_api_key_encrypted !== undefined) {
      updateFields.push(`cloudinary_api_key_encrypted = $${paramIndex++}`);
      values.push(updates.cloudinary_api_key_encrypted);
    }
    if (updates.cloudinary_api_secret_encrypted !== undefined) {
      updateFields.push(`cloudinary_api_secret_encrypted = $${paramIndex++}`);
      values.push(updates.cloudinary_api_secret_encrypted);
    }
    if (updates.personas !== undefined) {
      updateFields.push(`personas = $${paramIndex++}`);
      values.push(JSON.stringify(updates.personas));
    }
    if (updates.branding !== undefined) {
      updateFields.push(`branding = $${paramIndex++}`);
      values.push(JSON.stringify(updates.branding));
    }
    if (updates.status) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updateFields.length === 0) return;

    values.push(id);
    const query = `UPDATE accounts SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
    
    await sql.query(query, values);
    console.log(`[Neon] Updated account ${id}`);
  } catch (error) {
    console.error('[Neon] Error updating account:', error);
    throw error;
  }
}

export async function deleteAccount(id: string): Promise<void> {
  try {
    await sql`DELETE FROM accounts WHERE id = ${id}`;
    console.log(`[Neon] Deleted account ${id}`);
  } catch (error) {
    console.error('[Neon] Error deleting account:', error);
    throw error;
  }
}

export async function getActiveAccounts(): Promise<Account[]> {
  if (USE_IN_MEMORY) {
    return inMemoryAccounts.filter(acc => acc.status === 'active');
  }

  try {
    const result = await sql`
      SELECT * FROM accounts
      WHERE status = 'active'
      ORDER BY created_at ASC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      twitter_handle: row.twitter_handle,
      twitter_api_key_encrypted: row.twitter_api_key_encrypted,
      twitter_api_secret_encrypted: row.twitter_api_secret_encrypted,
      twitter_access_token_encrypted: row.twitter_access_token_encrypted,
      twitter_access_token_secret_encrypted: row.twitter_access_token_secret_encrypted,
      cloudinary_cloud_name_encrypted: row.cloudinary_cloud_name_encrypted,
      cloudinary_api_key_encrypted: row.cloudinary_api_key_encrypted,
      cloudinary_api_secret_encrypted: row.cloudinary_api_secret_encrypted,
      personas: Array.isArray(row.personas) ? row.personas : (row.personas ? JSON.parse(row.personas) : []),
      branding: (typeof row.branding === 'object' && row.branding !== null) ? row.branding : (row.branding ? JSON.parse(row.branding) : {
        theme: 'educational',
        audience: 'general',
        tone: 'professional'
      }),
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));
  } catch (error) {
    console.error('[Neon] Error getting active accounts:', error);
    return [];
  }
}

// Updated tweet functions to support account filtering
export async function getAllTweets(): Promise<Tweet[]> {
  try {
    const result = await sql`
      SELECT * FROM tweets
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      qualityScore: row.quality_score,
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      created_at: row.created_at,
      quality_score: row.quality_score,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    }));
  } catch (error) {
    console.error('[Neon] Error getting tweets:', error);
    return [];
  }
}

export async function getTweetsByAccount(accountId: string): Promise<Tweet[]> {
  try {
    const result = await sql`
      SELECT * FROM tweets
      WHERE account_id = ${accountId}
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      qualityScore: row.quality_score,
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      created_at: row.created_at,
      quality_score: row.quality_score,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    }));
  } catch (error) {
    console.error('[Neon] Error getting tweets by account:', error);
    return [];
  }
}

// Helper function to get property value with fallback for camelCase/snake_case
function getProperty(obj: Record<string, unknown>, snakeCase: string, camelCase: string): string | undefined {
  const value = obj[snakeCase] ?? obj[camelCase];
  return typeof value === 'string' ? value : undefined;
}

export async function saveTweet(tweet: Omit<Tweet, 'created_at'> & { createdAt?: string }): Promise<void> {
  if (USE_IN_MEMORY) {
    const tweetObj = tweet as Record<string, unknown>;
    const newTweet: Tweet = {
      id: tweet.id,
      account_id: tweet.account_id,
      content: tweet.content,
      hashtags: tweet.hashtags,
      persona: tweet.persona,
      status: tweet.status,
      created_at: tweet.createdAt || getProperty(tweetObj, 'created_at', 'createdAt') || new Date().toISOString(),
      posted_at: getProperty(tweetObj, 'posted_at', 'postedAt'),
      twitter_id: getProperty(tweetObj, 'twitter_id', 'twitterId'),
      twitter_url: getProperty(tweetObj, 'twitter_url', 'twitterUrl'),
      error_message: getProperty(tweetObj, 'error_message', 'errorMessage'),
      image_url: getProperty(tweetObj, 'image_url', 'imageUrl'),
      quality_score: tweetObj.quality_score ? JSON.stringify(tweetObj.quality_score) : (tweetObj.qualityScore ? JSON.stringify(tweetObj.qualityScore) : undefined),
      // Threading support
      content_type: tweet.content_type || 'single_tweet',
      thread_id: tweetObj.thread_id as string | undefined,
      thread_sequence: tweetObj.thread_sequence as number | undefined,
      parent_twitter_id: tweetObj.parent_twitter_id as string | undefined,
      hook_type: tweetObj.hook_type as 'opener' | 'context' | 'crisis' | 'resolution' | 'lesson' | undefined
    };

    // Find existing tweet and update or add new
    const existingIndex = inMemoryTweets.findIndex(t => t.id === tweet.id);
    if (existingIndex >= 0) {
      inMemoryTweets[existingIndex] = newTweet;
      console.log(`[Memory] Updated tweet ${tweet.id}`);
    } else {
      inMemoryTweets.push(newTweet);
      console.log(`[Memory] Saved new tweet ${tweet.id}`);
    }
    return;
  }

  try {
    const tweetObj = tweet as Record<string, unknown>;
    
    console.log(`[Neon] Executing saveTweet SQL query for tweet ${tweet.id}`);
    await sql`
      INSERT INTO tweets (
        id, account_id, content, hashtags, persona, posted_at, 
        twitter_id, twitter_url, error_message, image_url, status, created_at, quality_score,
        thread_id, thread_sequence, parent_twitter_id, content_type, hook_type,
        image_status, card_data
      ) VALUES (
        ${tweet.id},
        ${tweet.account_id},
        ${tweet.content},
        ${JSON.stringify(tweet.hashtags)},
        ${tweet.persona},
        ${getProperty(tweetObj, 'posted_at', 'postedAt')},
        ${getProperty(tweetObj, 'twitter_id', 'twitterId')},
        ${getProperty(tweetObj, 'twitter_url', 'twitterUrl')},
        ${getProperty(tweetObj, 'error_message', 'errorMessage')},
        ${getProperty(tweetObj, 'image_url', 'imageUrl')},
        ${tweet.status},
        ${tweet.createdAt || getProperty(tweetObj, 'created_at', 'createdAt') || new Date().toISOString()},
        ${tweetObj.quality_score ? JSON.stringify(tweetObj.quality_score) : (tweetObj.qualityScore ? JSON.stringify(tweetObj.qualityScore) : null)},
        ${(tweetObj.thread_id as string) || null},
        ${(tweetObj.thread_sequence as number) || null},
        ${(tweetObj.parent_twitter_id as string) || null},
        ${tweet.content_type || 'single_tweet'},
        ${(tweetObj.hook_type as string) || null},
        ${getProperty(tweetObj, 'image_status', 'imageStatus') || 'none'},
        ${getProperty(tweetObj, 'card_data', 'cardData')}
      )
      ON CONFLICT (id) 
      DO UPDATE SET
        account_id = EXCLUDED.account_id,
        content = EXCLUDED.content,
        hashtags = EXCLUDED.hashtags,
        persona = EXCLUDED.persona,
        posted_at = EXCLUDED.posted_at,
        twitter_id = EXCLUDED.twitter_id,
        twitter_url = EXCLUDED.twitter_url,
        error_message = EXCLUDED.error_message,
        status = EXCLUDED.status,
        quality_score = EXCLUDED.quality_score,
        thread_id = EXCLUDED.thread_id,
        thread_sequence = EXCLUDED.thread_sequence,
        parent_twitter_id = EXCLUDED.parent_twitter_id,
        content_type = EXCLUDED.content_type,
        hook_type = EXCLUDED.hook_type,
        image_status = EXCLUDED.image_status,
        card_data = EXCLUDED.card_data
    `;
    
    console.log(`[Neon] Saved tweet ${tweet.id}`);
  } catch (error) {
    console.error('[Neon] Error saving tweet:', error);
    throw error;
  }
}

export async function getReadyTweets(): Promise<Tweet[]> {
  try {
    const result = await sql`
      SELECT * FROM tweets
      WHERE status = 'ready'
      ORDER BY created_at ASC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      qualityScore: row.quality_score,
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      created_at: row.created_at,
      quality_score: row.quality_score,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    }));
  } catch (error) {
    console.error('[Neon] Error getting ready tweets:', error);
    return [];
  }
}

export async function getReadyTweetsByAccount(accountId: string): Promise<Tweet[]> {
  try {
    const result = await sql`
      SELECT * FROM tweets
      WHERE status = 'ready' AND account_id = ${accountId}
      ORDER BY created_at ASC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      qualityScore: row.quality_score,
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      created_at: row.created_at,
      quality_score: row.quality_score,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    }));
  } catch (error) {
    console.error('[Neon] Error getting ready tweets by account:', error);
    return [];
  }
}

export async function getPaginatedTweets(params: { page: number; limit: number; accountId?: string }): Promise<{
  data: Tweet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}> {
  if (USE_IN_MEMORY) {
    const filteredTweets = params.accountId 
      ? inMemoryTweets.filter(t => t.account_id === params.accountId)
      : inMemoryTweets;
    
    const total = filteredTweets.length;
    const offset = (params.page - 1) * params.limit;
    const tweets = filteredTweets
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + params.limit);
    
    const totalPages = Math.ceil(total / params.limit);
    
    return {
      data: tweets,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  try {
    const offset = (params.page - 1) * params.limit;
    
    // Get total count with optional account filtering
    const countResult = params.accountId 
      ? await sql`SELECT COUNT(*) as count FROM tweets WHERE account_id = ${params.accountId}`
      : await sql`SELECT COUNT(*) as count FROM tweets`;
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated data with optional account filtering
    const result = params.accountId 
      ? await sql`
          SELECT * FROM tweets
          WHERE account_id = ${params.accountId}
          ORDER BY created_at DESC
          LIMIT ${params.limit} OFFSET ${offset}
        `
      : await sql`
          SELECT * FROM tweets
          ORDER BY created_at DESC
          LIMIT ${params.limit} OFFSET ${offset}
        `;
    
    const tweets: Tweet[] = result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      qualityScore: row.quality_score,
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      created_at: row.created_at,
      quality_score: row.quality_score,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    }));
    
    const totalPages = Math.ceil(total / params.limit);
    
    return {
      data: tweets,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  } catch (error) {
    console.error('[Neon] Error getting paginated tweets:', error);
    return {
      data: [],
      total: 0,
      page: params.page,
      limit: params.limit,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
  }
}

export async function deleteTweet(id: string): Promise<void> {
  try {
    await sql`DELETE FROM tweets WHERE id = ${id}`;
    console.log(`[Neon] Deleted tweet ${id}`);
  } catch (error) {
    console.error('[Neon] Error deleting tweet:', error);
    throw error;
  }
}

export async function deleteTweets(ids: string[]): Promise<void> {
  try {
    if (ids.length === 0) return;
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `DELETE FROM tweets WHERE id IN (${placeholders})`;
    
    await sql.query(query, ids);
    console.log(`[Neon] Deleted ${ids.length} tweets`);
  } catch (error) {
    console.error('[Neon] Error deleting tweets:', error);
    throw error;
  }
}

export function generateTweetId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Thread management functions
export async function createThread(thread: Omit<Thread, 'id' | 'created_at' | 'current_tweet' | 'engagement_score'>): Promise<string> {
  try {
    const threadId = crypto.randomUUID();
    
    await sql`
      INSERT INTO threads (
        id, account_id, title, persona, story_template, total_tweets,
        current_tweet, parent_tweet_id, status, next_post_time,
        engagement_score, story_category, created_at
      ) VALUES (
        ${threadId},
        ${thread.account_id},
        ${thread.title},
        ${thread.persona},
        ${thread.story_template},
        ${thread.total_tweets},
        1,
        ${thread.parent_tweet_id || null},
        ${thread.status},
        ${thread.next_post_time || null},
        0,
        ${thread.story_category},
        ${new Date().toISOString()}
      )
    `;
    
    console.log(`[Neon] Created thread ${threadId}`);
    return threadId;
  } catch (error) {
    console.error('[Neon] Error creating thread:', error);
    throw error;
  }
}

export async function getActiveThreadForPosting(accountId: string): Promise<Thread | null> {
  try {
    const result = await sql`
      SELECT * FROM threads
      WHERE account_id = ${accountId}
        AND status = 'posting'
        AND next_post_time IS NOT NULL
        AND next_post_time <= NOW()
      ORDER BY next_post_time ASC
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      account_id: row.account_id,
      title: row.title,
      persona: row.persona,
      story_template: row.story_template,
      total_tweets: row.total_tweets,
      current_tweet: row.current_tweet,
      parent_tweet_id: row.parent_tweet_id,
      status: row.status,
      next_post_time: row.next_post_time,
      engagement_score: row.engagement_score,
      story_category: row.story_category,
      created_at: row.created_at
    };
  } catch (error) {
    console.error('[Neon] Error getting active thread:', error);
    return null;
  }
}

export async function getReadyThreads(accountId: string): Promise<Thread[]> {
  try {
    const result = await sql`
      SELECT * FROM threads
      WHERE account_id = ${accountId}
        AND status = 'ready'
      ORDER BY created_at ASC
      LIMIT 5
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      title: row.title,
      persona: row.persona,
      story_template: row.story_template,
      total_tweets: row.total_tweets,
      current_tweet: row.current_tweet,
      parent_tweet_id: row.parent_tweet_id,
      status: row.status,
      next_post_time: row.next_post_time,
      engagement_score: row.engagement_score,
      story_category: row.story_category,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('[Neon] Error getting ready threads:', error);
    return [];
  }
}

export async function updateThreadAfterPosting(threadId: string, twitterId: string, isComplete: boolean): Promise<void> {
  try {
    if (isComplete) {
      await sql`
        UPDATE threads 
        SET status = 'completed', next_post_time = NULL
        WHERE id = ${threadId}
      `;
    } else {
      await sql`
        UPDATE threads 
        SET current_tweet = current_tweet + 1,
            next_post_time = NOW() + INTERVAL '5 minutes',
            parent_tweet_id = COALESCE(parent_tweet_id, ${twitterId})
        WHERE id = ${threadId}
      `;
    }
    console.log(`[Neon] Updated thread ${threadId} after posting`);
  } catch (error) {
    console.error('[Neon] Error updating thread after posting:', error);
    throw error;
  }
}

export async function startThreadPosting(threadId: string): Promise<void> {
  try {
    await sql`
      UPDATE threads 
      SET status = 'posting', next_post_time = NOW()
      WHERE id = ${threadId} AND status = 'ready'
    `;
    console.log(`[Neon] Started thread posting for ${threadId}`);
  } catch (error) {
    console.error('[Neon] Error starting thread posting:', error);
    throw error;
  }
}

export async function getThreadTweet(threadId: string, sequence: number): Promise<Tweet | null> {
  try {
    const result = await sql`
      SELECT * FROM tweets
      WHERE thread_id = ${threadId} AND thread_sequence = ${sequence}
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      status: row.status,
      created_at: row.created_at,
      quality_score: row.quality_score,
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    };
  } catch (error) {
    console.error('[Neon] Error getting thread tweet:', error);
    return null;
  }
}

export async function getLastPostedTweetInThread(threadId: string): Promise<Tweet | null> {
  try {
    const result = await sql`
      SELECT * FROM tweets
      WHERE thread_id = ${threadId}
        AND twitter_id IS NOT NULL
        AND status = 'posted'
      ORDER BY thread_sequence DESC
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      status: row.status,
      created_at: row.created_at,
      quality_score: row.quality_score,
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    };
  } catch (error) {
    console.error('[Neon] Error getting last posted tweet in thread:', error);
    return null;
  }
}

// Image queue management functions
export async function getTweetsWithPendingImages(limit: number = 5, accountId?: string): Promise<Tweet[]> {
  if (USE_IN_MEMORY) {
    return inMemoryTweets
      .filter(t => (t.image_status === 'pending' || t.image_status === 'failed') && (!accountId || t.account_id === accountId))
      .slice(0, limit)
      .map(t => ({ ...t }));
  }

  try {
    const result = accountId 
      ? await sql`
          SELECT * FROM tweets
          WHERE (image_status = 'pending' OR image_status = 'failed') AND account_id = ${accountId}
          ORDER BY created_at ASC
          LIMIT ${limit}
        `
      : await sql`
          SELECT * FROM tweets
          WHERE image_status = 'pending' OR image_status = 'failed'
          ORDER BY created_at ASC
          LIMIT ${limit}
        `;
    
    return result.rows.map(row => ({
      id: row.id,
      account_id: row.account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      status: row.status,
      created_at: row.created_at,
      quality_score: row.quality_score,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
      hook_type: row.hook_type
    }));
  } catch (error) {
    console.error('[Neon] Error getting tweets with pending images:', error);
    return [];
  }
}

export async function updateTweetImage(
  tweetId: string, 
  imageUrl?: string, 
  imageStatus?: 'none' | 'pending' | 'processing' | 'completed' | 'failed'
): Promise<void> {
  if (USE_IN_MEMORY) {
    const tweetIndex = inMemoryTweets.findIndex(t => t.id === tweetId);
    if (tweetIndex >= 0) {
      if (imageUrl !== undefined) {
        inMemoryTweets[tweetIndex].image_url = imageUrl;
      }
      if (imageStatus !== undefined) {
        inMemoryTweets[tweetIndex].image_status = imageStatus;
      }
    }
    return;
  }

  try {
    const updates: string[] = [];
    const values: (string | undefined)[] = [];
    
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${updates.length + 2}`);
      values.push(imageUrl);
    }
    
    if (imageStatus !== undefined) {
      updates.push(`image_status = $${updates.length + 2}`);
      values.push(imageStatus);
    }
    
    if (updates.length === 0) return;

    const query = `
      UPDATE tweets 
      SET ${updates.join(', ')}
      WHERE id = $1
    `;
    
    await sql.query(query, [tweetId, ...values]);
    
    console.log(`[Neon] Updated tweet ${tweetId} image: url=${imageUrl || 'unchanged'}, status=${imageStatus || 'unchanged'}`);
  } catch (error) {
    console.error('[Neon] Error updating tweet image:', error);
    throw error;
  }
}



export interface EngagementLog {
  id: string;
  account_id: string;
  target_username: string;
  target_tweet_id: string;
  target_tweet_text?: string;
  reply_tweet_id?: string;
  reply_text?: string;
  discovery_method: string;
  target_tweet_age_minutes?: number;
  target_tweet_likes?: number;
  target_tweet_retweets?: number;
  reply_likes?: number;
  engaged_at: string;
}

/**
 * Logs a new engagement action into the database.
 */
export async function logEngagement(engagement: Omit<EngagementLog, 'id' | 'engaged_at'>): Promise<void> {
  try {
    await sql`
      INSERT INTO engagement_log (
        account_id, target_username, target_tweet_id, target_tweet_text,
        reply_tweet_id, reply_text, discovery_method, target_tweet_age_minutes,
        target_tweet_likes, target_tweet_retweets
      ) VALUES (
        ${engagement.account_id},
        ${engagement.target_username},
        ${engagement.target_tweet_id},
        ${engagement.target_tweet_text},
        ${engagement.reply_tweet_id},
        ${engagement.reply_text},
        ${engagement.discovery_method},
        ${engagement.target_tweet_age_minutes},
        ${engagement.target_tweet_likes},
        ${engagement.target_tweet_retweets}
      )
    `;
    console.log(`[Neon] Logged engagement for account ${engagement.account_id} with tweet ${engagement.target_tweet_id}`);
  } catch (error) {
    console.error('[Neon] Error logging engagement:', error);
    // Do not throw, as logging failure should not break the main flow
  }
}

/**
 * Checks how many times an account has engaged today (in UTC).
 */
export async function getDailyEngagementCount(accountId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*)
      FROM engagement_log
      WHERE account_id = ${accountId}
        AND DATE(engaged_at) = CURRENT_DATE
    `;
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('[Neon] Error getting daily engagement count:', error);
    return 999; // Return a high number to prevent further action on error
  }
}

/**
 * Finds the last time an account engaged with a specific target.
 */
export async function getLastEngagementForTarget(accountId: string, targetUsername: string): Promise<Date | null> {
  try {
    const result = await sql`
      SELECT engaged_at
      FROM engagement_log
      WHERE account_id = ${accountId}
        AND target_username = ${targetUsername}
      ORDER BY engaged_at DESC
      LIMIT 1
    `;
    return result.rows.length > 0 ? new Date(result.rows[0].engaged_at) : null;
  } catch (error) {
    console.error('[Neon] Error getting last engagement for target:', error);
    return new Date(); // Return current time to prevent further action on error
  }
}