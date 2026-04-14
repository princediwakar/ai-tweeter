// lib/blogSourceService.ts
// CRUD operations and matching for curated blog sources

import { sqlWithRetry } from './db';

export interface BlogSource {
  id: string;
  name: string;
  url: string;
  feed_url: string;
  category: string;
  topics: string[];
  source_type: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateBlogSourceInput {
  name: string;
  url: string;
  feed_url: string;
  category: string;
  topics?: string[];
  source_type?: string;
}

export interface FindSourcesParams {
  category?: string;
  topics?: string[];
  limit?: number;
}

function rowToBlogSource(row: any): BlogSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    feed_url: row.feed_url,
    category: row.category,
    topics: Array.isArray(row.topics) ? row.topics : [],
    source_type: row.source_type || 'general',
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export async function listBlogSources(params?: {
  category?: string;
  limit?: number;
}): Promise<BlogSource[]> {
  try {
    let query = 'SELECT * FROM blog_sources WHERE is_active = true';
    const values: any[] = [];

    if (params?.category) {
      query += ` AND category = $${values.length + 1}`;
      values.push(params.category);
    }

    query += ' ORDER BY name ASC';

    if (params?.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(params.limit);
    }

    const result = await sqlWithRetry.query(query, values);
    return result.rows.map(rowToBlogSource);
  } catch (error) {
    console.error('[BlogSource] Error listing sources:', error);
    return [];
  }
}

export async function findSourcesByCategory(
  category: string,
  limit = 10
): Promise<BlogSource[]> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM blog_sources
      WHERE category = ${category} AND is_active = true
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    return result.rows.map(rowToBlogSource);
  } catch (error) {
    console.error('[BlogSource] Error finding by category:', error);
    return [];
  }
}

// FIX 1: Cast the JS array to ::text[] so Postgres resolves the && operator correctly.
// FIX 2: Removed the bogus `category = ANY(topics)` clause — category is a scalar column,
//        not a member of the topics tag set. Topic matching is purely on the topics[] column.
export async function findSourcesByTopics(
  topics: string[],
  limit = 10
): Promise<BlogSource[]> {
  if (!topics || topics.length === 0) return [];

  try {
    const result = await sqlWithRetry.query(
      `SELECT * FROM blog_sources
       WHERE is_active = true
         AND topics && $1::text[]
       ORDER BY name ASC
       LIMIT $2`,
      [topics, limit]
    );
    return result.rows.map(rowToBlogSource);
  } catch (error) {
    console.error('[BlogSource] Error finding by topics:', error);
    return [];
  }
}

// Combines topic-match with an optional category filter.
// Topics take priority; category narrows the result set further when provided.
export async function findSources(params: FindSourcesParams): Promise<BlogSource[]> {
  const { category, topics, limit = 10 } = params;

  if (topics && topics.length > 0) {
    if (category) {
      // Both filters: topic overlap AND category match
      try {
        const result = await sqlWithRetry.query(
          `SELECT * FROM blog_sources
           WHERE is_active = true
             AND topics && $1::text[]
             AND category = $2
           ORDER BY name ASC
           LIMIT $3`,
          [topics, category, limit]
        );
        return result.rows.map(rowToBlogSource);
      } catch (error) {
        console.error('[BlogSource] Error finding by topics+category:', error);
        return [];
      }
    }
    return findSourcesByTopics(topics, limit);
  }

  return listBlogSources({ category, limit });
}

export async function findSourcesBySourceType(
  sourceType: string,
  limit = 10
): Promise<BlogSource[]> {
  if (!sourceType) return [];

  try {
    const result = await sqlWithRetry`
      SELECT * FROM blog_sources
      WHERE source_type = ${sourceType} AND is_active = true
      ORDER BY name ASC
      LIMIT ${limit}
    `;
    return result.rows.map(rowToBlogSource);
  } catch (error) {
    console.error('[BlogSource] Error finding by source_type:', error);
    return [];
  }
}

export async function getSourceById(id: string): Promise<BlogSource | null> {
  try {
    const result = await sqlWithRetry`
      SELECT * FROM blog_sources
      WHERE id = ${id}
      LIMIT 1
    `;
    return result.rows.length > 0 ? rowToBlogSource(result.rows[0]) : null;
  } catch (error) {
    console.error('[BlogSource] Error getting by id:', error);
    return null;
  }
}

// FIX 3: Insert source_type and is_active explicitly.
// Previously source_type was omitted — every created source silently got null
// and fell back to the "general" default in rowToBlogSource, making source_type
// filtering useless for programmatically created sources.
export async function createSource(
  input: CreateBlogSourceInput
): Promise<BlogSource | null> {
  try {
    const id = crypto.randomUUID();
    const topics = input.topics ?? [];
    const sourceType = input.source_type ?? 'general';

    await sqlWithRetry.query(
      `INSERT INTO blog_sources (id, name, url, feed_url, category, topics, source_type, is_active)
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7, true)`,
      [id, input.name, input.url, input.feed_url, input.category, topics, sourceType]
    );

    return getSourceById(id);
  } catch (error) {
    console.error('[BlogSource] Error creating source:', error);
    return null;
  }
}

export async function updateSource(
  id: string,
  updates: Partial<CreateBlogSourceInput>
): Promise<BlogSource | null> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let p = 1;

  if (updates.name !== undefined)       { setClauses.push(`name = $${p++}`);        values.push(updates.name); }
  if (updates.url !== undefined)        { setClauses.push(`url = $${p++}`);         values.push(updates.url); }
  if (updates.feed_url !== undefined)   { setClauses.push(`feed_url = $${p++}`);    values.push(updates.feed_url); }
  if (updates.category !== undefined)   { setClauses.push(`category = $${p++}`);    values.push(updates.category); }
  if (updates.source_type !== undefined){ setClauses.push(`source_type = $${p++}`); values.push(updates.source_type); }
  if (updates.topics !== undefined)     { setClauses.push(`topics = $${p++}::text[]`); values.push(updates.topics); }

  if (setClauses.length === 0) return getSourceById(id);

  values.push(id);

  try {
    await sqlWithRetry.query(
      `UPDATE blog_sources SET ${setClauses.join(', ')} WHERE id = $${p}`,
      values
    );
    return getSourceById(id);
  } catch (error) {
    console.error('[BlogSource] Error updating source:', error);
    return null;
  }
}

export async function deleteSource(id: string): Promise<boolean> {
  try {
    await sqlWithRetry`
      UPDATE blog_sources SET is_active = false WHERE id = ${id}
    `;
    return true;
  } catch (error) {
    console.error('[BlogSource] Error deleting source:', error);
    return false;
  }
}

export async function getSourceCount(): Promise<number> {
  try {
    const result = await sqlWithRetry`
      SELECT COUNT(*) as count FROM blog_sources WHERE is_active = true
    `;
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('[BlogSource] Error getting count:', error);
    return 0;
  }
}

export async function getAllCategories(): Promise<string[]> {
  try {
    const result = await sqlWithRetry`
      SELECT DISTINCT category FROM blog_sources WHERE is_active = true ORDER BY category ASC
    `;
    return result.rows.map((row) => row.category);
  } catch (error) {
    console.error('[BlogSource] Error getting categories:', error);
    return [];
  }
}

export async function getCategoriesWithCounts(): Promise<
  { category: string; count: number }[]
> {
  try {
    const result = await sqlWithRetry`
      SELECT category, COUNT(*) as count
      FROM blog_sources
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `;
    return result.rows.map((row) => ({
      category: row.category,
      count: parseInt(row.count, 10),
    }));
  } catch (error) {
    console.error('[BlogSource] Error getting categories with counts:', error);
    return [];
  }
}