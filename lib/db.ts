import { sql } from '@vercel/postgres';
import type { QueryResult, QueryResultRow } from '@vercel/postgres';
import type { Tweet, Persona, PersonaConfigDNA } from './types';
import { GENERATION_CONFIG } from './generation/config';
import type { RecentPattern } from './generation/types';

// In-memory storage for testing when database is not available
const inMemoryTweets: Tweet[] = [];
// Use real database connection
const USE_IN_MEMORY = false; // Use PostgreSQL database

/**
 * Universal SQL wrapper with retry logic for transient database connection errors.
 * Primarily handles 'ENOTFOUND api.c-2...aws.neon.tech' and 'Control plane request failed'.
 */
export async function sqlWithRetry<T extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<QueryResult<T>> {
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      return await (sql as any)(strings, ...values);
    } catch (error: any) {
      retries--;
      const isTransient = 
        error.message?.includes('ENOTFOUND') || 
        error.message?.includes('Control plane') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ECONNRESET');

      if (retries === 0 || !isTransient) {
        console.error('❌ Database query permanently failed:', error);
        throw error;
      }

      console.warn(`⚠️ Transient DB error (${error.message}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Unreachable: SQL query failed without throwing.');
}

/**
 * Parameterized query version of sqlWithRetry
 */
sqlWithRetry.query = async function<T extends QueryResultRow>(
  query: string,
  values?: any[]
): Promise<QueryResult<T>> {
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      return await sql.query<T>(query, values);
    } catch (error: any) {
      retries--;
      const isTransient = 
        error.message?.includes('ENOTFOUND') || 
        error.message?.includes('Control plane') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('ECONNRESET');

      if (retries === 0 || !isTransient) {
        console.error('❌ Database direct query permanently failed:', error);
        throw error;
      }

      console.warn(`⚠️ Transient DB direct query error (${error.message}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Unreachable: SQL direct query failed without throwing.');
};


// Thread interface for threading system
export interface Thread {
  id: string;
  connected_account_id: string;
  title: string;
  persona: string;
  total_tweets: number;
  current_tweet: number;
  parent_tweet_id?: string; // Twitter ID of first tweet in thread
  status: 'generating' | 'ready' | 'posting' | 'completed' | 'failed';
  story_category: string;
  created_at: string;
}



// NOTE: Account management functions have been moved to lib/accountService.ts
// All account operations (get, create, update, delete) should use accountService
// which handles proper AES-256-GCM encryption/decryption

// Tweet management functions
// Updated tweet functions to support account filtering
export async function getAllTweets(limit: number = 100): Promise<Tweet[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM tweets
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      created_at: row.created_at,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
    }));
  } catch (error) {
    console.error('[Neon] Error getting tweets:', error);
    return [];
  }
}

export async function getPersona(key: string): Promise<Persona | null> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM personas
      WHERE key = ${key} AND is_active = true
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    return result.rows[0] as Persona;
  } catch (error) {
    console.error(`[Neon] Error getting persona ${key}:`, error);
    return null;
  }
}

export async function getPersonaById(id: string): Promise<Persona | null> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM personas
      WHERE id = ${id} AND is_active = true
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    return result.rows[0] as Persona;
  } catch (error) {
    console.error(`[Neon] Error getting persona by ID ${id}:`, error);
    return null;
  }
}

export async function getAllPersonasFromDb(): Promise<Persona[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM personas
      WHERE is_active = true
      ORDER BY name ASC
    `;
    return result.rows as Persona[];
  } catch (error) {
    console.error(`[Neon] Error getting all personas:`, error);
    return [];
  }
}

export async function getTweetsByAccount(accountId: string): Promise<Tweet[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM tweets
      WHERE connected_account_id = ${accountId}
      ORDER BY created_at DESC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      created_at: row.created_at,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
    }));
  } catch (error) {
    console.error('[Neon] Error getting tweets by account:', error);
    return [];
  }
}



// --- Helper Functions ---
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main Functions ---

export async function createThread(data: Omit<Thread, 'id' | 'current_tweet' | 'created_at'>): Promise<string> {
  const threadId = crypto.randomUUID();
  
  await sqlWithRetry`
    INSERT INTO threads (
      id, connected_account_id, title, persona, total_tweets,
      current_tweet, parent_tweet_id, status, story_category, created_at
    ) VALUES (
      ${threadId}, ${data.connected_account_id}, ${data.title}, ${data.persona}, ${data.total_tweets},
      0, null, ${data.status}, ${data.story_category}, NOW()
    )
  `;

  console.info(`[Neon] Created thread ${threadId}`, 'db-create-thread');
  return threadId;
}

/**
 * OPTIMIZATION: A wrapper for createThread that implements a retry mechanism
 * to handle transient database errors, like "Control plane request failed".
 */
export async function createThreadWithRetry(
  data: Omit<Thread, 'id' | 'current_tweet' | 'created_at'>,
  retries = 3,
  delay = 1000
): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      return await createThread(data);
    } catch (error) {
      if (i === retries - 1) {
        console.error(`[Neon] Failed to create thread after ${retries} attempts.`, 'db-create-thread-failure', error);
        throw error; // Rethrow the final error
      }
      console.warn(`[Neon] Attempt ${i + 1} to create thread failed. Retrying in ${delay}ms...`, 'db-retry', error);
      await sleep(delay);
    }
  }
  // This line should theoretically be unreachable
  throw new Error('Failed to create thread after all retries.');
}


/**
 * Saves or updates a tweet in the database.
 * Uses ON CONFLICT to perform an "upsert" operation, making it safe to call for both new and existing tweets.
 */
// lib/db.ts (or wherever saveTweet is located)

export async function saveTweet(tweet: Tweet): Promise<void> {
  try {
    await sqlWithRetry`
      INSERT INTO tweets (
        id, connected_account_id, content, hashtags, persona, status, created_at, 
        posted_at, twitter_id, twitter_url, error_message, image_url, 
        thread_id, thread_sequence, parent_twitter_id, content_type, 
        image_status, card_data, source_url
      ) VALUES (
        ${tweet.id},
        ${tweet.connected_account_id},
        ${tweet.content},
        ${JSON.stringify(tweet.hashtags)},
        ${tweet.persona},
        ${tweet.status},
        ${tweet.created_at},
        ${tweet.posted_at || null},
        ${tweet.twitter_id || null},
        ${tweet.twitter_url || null},
        ${tweet.error_message || null},
        ${tweet.image_url || null},
        ${tweet.thread_id || null},
        ${tweet.thread_sequence || null},
        ${tweet.parent_twitter_id || null},
        ${tweet.content_type || 'single_tweet'},
        ${tweet.image_status || 'none'},
        ${tweet.card_data || null}, 
        ${tweet.source_url || null}
      )
      ON CONFLICT (id) 
      DO UPDATE SET
        connected_account_id = EXCLUDED.connected_account_id,
        content = EXCLUDED.content,
        hashtags = EXCLUDED.hashtags,
        persona = EXCLUDED.persona,
        status = EXCLUDED.status,
        posted_at = EXCLUDED.posted_at,
        twitter_id = EXCLUDED.twitter_id,
        twitter_url = EXCLUDED.twitter_url,
        error_message = EXCLUDED.error_message,
        image_url = EXCLUDED.image_url,
        thread_id = EXCLUDED.thread_id,
        thread_sequence = EXCLUDED.thread_sequence,
        parent_twitter_id = EXCLUDED.parent_twitter_id,
        content_type = EXCLUDED.content_type,
        image_status = EXCLUDED.image_status,
        card_data = EXCLUDED.card_data,
        source_url = EXCLUDED.source_url;
    `;
    
  } catch (error) {
    console.error(`[Neon] Error saving tweet ${tweet.id}:`, 'db-save-tweet-error');
    throw error;
  }
}






export async function getReadyTweets(): Promise<Tweet[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM tweets
      WHERE status = 'ready'
      ORDER BY created_at ASC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      created_at: row.created_at,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
    }));
  } catch (error) {
    console.error('[Neon] Error getting ready tweets:', error);
    return [];
  }
}

export async function getReadyTweetsByAccount(accountId: string): Promise<Tweet[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM tweets
      WHERE status = 'ready' AND connected_account_id = ${accountId}
      ORDER BY created_at ASC
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      created_at: row.created_at,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
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
      ? inMemoryTweets.filter(t => t.connected_account_id === params.accountId)
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
      ? await sqlWithRetry`SELECT COUNT(*) as count FROM tweets WHERE connected_account_id = ${params.accountId}`
      : await sqlWithRetry`SELECT COUNT(*) as count FROM tweets`;
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated data with optional account filtering
    const result = params.accountId 
      ? await sqlWithRetry`
          SELECT * FROM tweets
          WHERE connected_account_id = ${params.accountId}
          ORDER BY created_at DESC
          LIMIT ${params.limit} OFFSET ${offset}
        `
      : await sqlWithRetry`
          SELECT * FROM tweets
          ORDER BY created_at DESC
          LIMIT ${params.limit} OFFSET ${offset}
        `;
    
    const tweets: Tweet[] = result.rows.map(row => ({
      id: row.id,
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      postedAt: row.posted_at ? new Date(row.posted_at) : undefined,
      twitterId: row.twitter_id,
      twitterUrl: row.twitter_url,
      errorMessage: row.error_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      // Keep snake_case for backward compatibility
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      created_at: row.created_at,
      // Threading support
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
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
    await sqlWithRetry`DELETE FROM tweets WHERE id = ${id}`;
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







export async function getActiveThreadForPosting(accountId: string): Promise<Thread | null> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM threads
      WHERE connected_account_id = ${accountId}
        AND status = 'posting'
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      connected_account_id: row.connected_account_id,
      title: row.title,
      persona: row.persona,
      total_tweets: row.total_tweets,
      current_tweet: row.current_tweet,
      parent_tweet_id: row.parent_tweet_id,
      status: row.status,
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
      WHERE connected_account_id = ${accountId}
        AND status = 'ready'
      ORDER BY created_at ASC
      LIMIT 5
    `;
    
    return result.rows.map(row => ({
      id: row.id,
      connected_account_id: row.connected_account_id,
      title: row.title,
      persona: row.persona,
      total_tweets: row.total_tweets,
      current_tweet: row.current_tweet,
      parent_tweet_id: row.parent_tweet_id,
      status: row.status,
      story_category: row.story_category,
      created_at: row.created_at
    }));
  } catch (error) {
    console.error('[Neon] Error getting ready threads:', error);
    return [];
  }
}




// Interface for the payload to ensure type safety
export interface ThreadUpdatePayload {
  status?: 'generating' | 'ready' | 'completed' | 'failed';
  total_tweets?: number;
  increment_current_tweet?: boolean;
  parent_tweet_id?: string;
}



// Interface for the payload to ensure type safety
export interface ThreadUpdatePayload {
  status?: 'generating' | 'ready' | 'completed' | 'failed';
  total_tweets?: number;
  increment_current_tweet?: boolean;
  parent_tweet_id?: string;
}

/**
 * Updates a thread record with a flexible payload.
 * This is the primary function for all thread updates, handling both generation
 * finalization and post-posting status changes.
 * @param threadId The ID of the thread to update.
 * @param payload An object containing the fields to update.
 */
export async function updateThread(threadId: string, payload: ThreadUpdatePayload): Promise<void> {
  const { status, total_tweets, increment_current_tweet, parent_tweet_id } = payload;
  
  // This will hold the string parts of our SET clause
  const setClauses: string[] = [];
  // This will hold the values for parameterization, starting with threadId for the WHERE clause ($1)
  const values: (string | number)[] = [threadId];

  if (status) {
    setClauses.push(`status = $${values.length + 1}`);
    values.push(status);
  }
  if (total_tweets !== undefined) {
    setClauses.push(`total_tweets = $${values.length + 1}`);
    values.push(total_tweets);
  }
  if (parent_tweet_id) {
    // COALESCE ensures we only set the parent_tweet_id on the first update
    setClauses.push(`parent_tweet_id = COALESCE(parent_tweet_id, $${values.length + 1})`);
    values.push(parent_tweet_id);
  }
  if (increment_current_tweet) {
    // This clause is a direct expression and does not require a value parameter
    setClauses.push(`current_tweet = current_tweet + 1`);
  }

  if (setClauses.length === 0) {
    console.warn(`[Neon] updateThread called for thread ${threadId} with an empty payload.`, 'db-update-warning');
    return; // Nothing to update
  }
  
  try {
    // Construct the query string for use with sql.query, which handles parameterized queries
    const queryString = `
      UPDATE threads
      SET ${setClauses.join(', ')}
      WHERE id = $1
    `;
    
    // Execute the query with its dynamic values
    await sql.query(queryString, values);

    console.info(`[Neon] Updated thread ${threadId} with payload: ${JSON.stringify(payload)}`, 'db-update-success');
  } catch (error) {
    console.error(`[Neon] Error updating thread ${threadId}:`, 'db-update-error');
    throw error;
  }
}

/**
 * A wrapper function that uses the generic updateThread to handle state
 * changes after a tweet from a thread is posted to Twitter.
 * @param threadId The ID of the thread.
 * @param twitterId The Twitter ID of the tweet that was just posted.
 * @param isComplete A boolean indicating if this was the last tweet in the thread.
 */
export async function updateThreadAfterPosting(threadId: string, twitterId: string, isComplete: boolean): Promise<void> {
  if (isComplete) {
    // If it's the last tweet, mark the thread as 'completed'
    await updateThread(threadId, { status: 'completed' });
  } else {
    // Otherwise, increment the tweet counter and set the parent ID for threading
    await updateThread(threadId, {
      increment_current_tweet: true,
      parent_tweet_id: twitterId,
    });
  }
}






export async function startThreadPosting(threadId: string): Promise<void> {
  try {
    await sql`
      UPDATE threads
      SET status = 'posting'
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
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      status: row.status,
      created_at: row.created_at,
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
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
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      status: row.status,
      created_at: row.created_at,
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
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
      .filter(t => (t.image_status === 'pending' || t.image_status === 'failed') && (!accountId || t.connected_account_id === accountId))
      .slice(0, limit)
      .map(t => ({ ...t }));
  }

  try {
    const result = accountId 
      ? await sql`
          SELECT * FROM tweets
          WHERE (image_status = 'pending' OR image_status = 'failed') AND connected_account_id = ${accountId}
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
      connected_account_id: row.connected_account_id,
      content: row.content,
      hashtags: row.hashtags || [],
      persona: row.persona,
      posted_at: row.posted_at,
      twitter_id: row.twitter_id,
      twitter_url: row.twitter_url,
      error_message: row.error_message,
      status: row.status,
      created_at: row.created_at,
      image_url: row.image_url,
      image_status: row.image_status,
      card_data: row.card_data,
      thread_id: row.thread_id,
      thread_sequence: row.thread_sequence,
      parent_twitter_id: row.parent_twitter_id,
      content_type: row.content_type || 'single_tweet',
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
  connected_account_id: string;
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
  tier: number; 

}

// The rewritten logEngagement service
export async function logEngagement(engagement: Omit<EngagementLog, 'id' | 'engaged_at'>): Promise<void> {
  try {
    await sql`
      INSERT INTO engagement_log (
        connected_account_id, target_username, target_tweet_id, target_tweet_text,
        reply_tweet_id, reply_text, discovery_method, target_tweet_age_minutes,
        target_tweet_likes, target_tweet_retweets, tier
      ) VALUES (
        ${engagement.connected_account_id},
        ${engagement.target_username},
        ${engagement.target_tweet_id},
        ${engagement.target_tweet_text},
        ${engagement.reply_tweet_id},
        ${engagement.reply_text},
        ${engagement.discovery_method},
        ${engagement.target_tweet_age_minutes},
        ${engagement.target_tweet_likes},
        ${engagement.target_tweet_retweets},
        ${engagement.tier} -- Add the tier here
      )
    `;
    console.log(`[Neon] Logged engagement for account ${engagement.connected_account_id} with tweet ${engagement.target_tweet_id} (Tier ${engagement.tier})`);
  } catch (error){
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
      WHERE connected_account_id = ${accountId}
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
      WHERE connected_account_id = ${accountId}
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

/**
 * Checks if a specific tweet has already been engaged with by this account.
 */
export async function hasEngagedWithTweet(accountId: string, tweetId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1
      FROM engagement_log
      WHERE connected_account_id = ${accountId}
        AND target_tweet_id = ${tweetId}
      LIMIT 1
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Neon] Error checking if tweet was already engaged:', error);
    return true; // Return true on error to prevent duplicate engagement attempts
  }
}



export async function getRecentVocabularyWords(accountId: string, days: number = 30): Promise<string[]> {
  try {
    const result = await sqlWithRetry`
      SELECT DISTINCT card_data
      FROM tweets
      WHERE connected_account_id = ${accountId}
        AND persona = 'english_vocab_builder'
        AND card_data IS NOT NULL
        AND created_at > NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const recentWords: string[] = [];
    for (const row of result.rows) {
      if (row.card_data) {
        try {
          const cardData = typeof row.card_data === 'string'
            ? JSON.parse(row.card_data)
            : row.card_data;
          if (cardData?.word) {
            recentWords.push(cardData.word.toLowerCase());
          }
        } catch {
          // Skip malformed card data
        }
      }
    }

    return recentWords;
  } catch (error) {
    console.warn('Failed to fetch recent vocabulary words:', error);
    return [];
  }
}





export async function getRecentSatiristData(
  accountId: string,
  limit: number = 10
): Promise<{ patterns: RecentPattern[]; usedSourceUrls: string[] }> {
  try {
    const result = await sql`
      SELECT content, source_url, created_at
      FROM tweets
      WHERE connected_account_id = ${accountId}
        AND content IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const recentPatterns: RecentPattern[] = [];
    const usedSourceUrls: string[] = [];

    for (const row of result.rows) {
      if (row.content) {
        recentPatterns.push({
          text: row.content,
          timestamp: row.created_at ? new Date(row.created_at).toISOString() : undefined
        });
      }
      
      if (row.source_url && !usedSourceUrls.includes(row.source_url)) {
        usedSourceUrls.push(row.source_url);
      }
    }

    console.log(`[DB] Found ${recentPatterns.length} recent satirist tweets and ${usedSourceUrls.length} used source URLs for account ${accountId}`);
    return { patterns: recentPatterns, usedSourceUrls };
  } catch (error) {
    console.warn('[DB] Failed to fetch recent satirist tweets:', error);
    return { patterns: [], usedSourceUrls: [] };
  }
}





export async function getRecentPatternData(
  accountId: string,
  limit: number = 10
): Promise<{ patterns: RecentPattern[]; usedSourceUrls: string[] }> {
  try {
    // Fetch both the content for thematic deduplication and the source_url for strict avoidance.
    const result = await sql`
      SELECT content, source_url, created_at
      FROM tweets
      WHERE connected_account_id = ${accountId}
        AND content IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const recentPatterns: RecentPattern[] = [];
    const usedSourceUrls: string[] = [];

    for (const row of result.rows) {
      // Build RecentPattern object with text and timestamp
      if (row.content) {
        recentPatterns.push({
          text: row.content,
          timestamp: row.created_at ? new Date(row.created_at).toISOString() : undefined
        });
      }
      
      // The source_url is for the strict blocklist.
      if (row.source_url && !usedSourceUrls.includes(row.source_url)) {
        usedSourceUrls.push(row.source_url);
      }
    }

    console.log(`[DB] Found ${recentPatterns.length} recent patterns and ${usedSourceUrls.length} used source URLs for account ${accountId} to avoid.`);
    return { patterns: recentPatterns, usedSourceUrls };
  } catch (error) {
    console.warn('[DB] Failed to fetch recent pattern tweets:', error);
    // Return empty state to allow generation to proceed without deduplication context.
    return { patterns: [], usedSourceUrls: [] };
  }
}
/**
 * Gets recently used source URLs for business_storyteller persona to avoid repetition.
 * Returns an array of source URLs used in the last N days.
 */
export async function getRecentBusinessStorytellerSources(accountId: string, days: number = 30): Promise<string[]> {
  try {
    // Use a calculated date instead of INTERVAL with interpolation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await sql`
      SELECT DISTINCT source_url
      FROM tweets
      WHERE connected_account_id = ${accountId}
        AND persona IN ('satirist', 'pattern_spotter', 'business_storyteller')
        AND source_url IS NOT NULL
        AND created_at > ${cutoffDate.toISOString()}
      ORDER BY source_url
    `;

    const sources = result.rows
      .map(row => row.source_url)
      .filter((url): url is string => typeof url === 'string');

    console.log(`[Neon] Found ${sources.length} recently used business_storyteller sources for account ${accountId} (last ${days} days)`);
    return sources;
  } catch (error) {
    console.error('[Neon] Error getting recent business_storyteller sources:', error);
    return []; // Return empty array on error to allow generation to proceed
  }
}

/**
 * Gets recently used source URLs for cricket_storyteller persona to avoid repetition.
 * Returns an array of source URLs used in the last N days.
 */
export async function getRecentCricketStorytellerSources(accountId: string, days: number = 30): Promise<string[]> {
  try {
    // Use a calculated date instead of INTERVAL with interpolation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await sql`
      SELECT DISTINCT source_url
      FROM tweets
      WHERE connected_account_id = ${accountId}
        AND persona = 'cricket_storyteller'
        AND source_url IS NOT NULL
        AND created_at > ${cutoffDate.toISOString()}
      ORDER BY source_url
    `;

    const sources = result.rows
      .map(row => row.source_url)
      .filter((url): url is string => typeof url === 'string');

    console.log(`[Neon] Found ${sources.length} recently used cricket_storyteller sources for account ${accountId} (last ${days} days)`);
    return sources;
  } catch (error) {
    console.error('[Neon] Error getting recent cricket_storyteller sources:', error);
    return []; // Return empty array on error to allow generation to proceed
  }
}