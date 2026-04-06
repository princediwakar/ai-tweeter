import { sql } from '@vercel/postgres';
import type { Persona, PersonaConfigDNA } from './types';
export type { Persona, PersonaConfigDNA };

export interface CreatePersonaInput {
  connected_account_id: string;
  name: string;
  description?: string;
  rss_sources?: string[];
  config?: PersonaConfigDNA | Record<string, unknown>;
  min_length?: number;
  max_length?: number;
  tone?: string;
  topics?: string[];
  is_active?: boolean;
  is_default?: boolean;
  key?: string;
}

export interface UpdatePersonaInput extends Partial<CreatePersonaInput> {
  id: string;
}

class PersonaService {
  async getPersonasByAccount(accountId: string): Promise<Persona[]> {
    const result = await sql`
      SELECT * FROM personas
      WHERE connected_account_id = ${accountId}
      ORDER BY created_at DESC
    `;

    return result.rows.map(this.mapRow);
  }

  async getPersona(id: string): Promise<Persona | null> {
    const result = await sql`
      SELECT * FROM personas
      WHERE id = ${id}
    `;

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mergeWithDefaultDna(config: any = {}): PersonaConfigDNA {
    const defaults: PersonaConfigDNA = {
      identity_context: 'You are an AI assistant designed to post engaging content.',
      source_logic: 'Use the provided source material to create insightful posts.',
      voice_dna: 'Clear, concise, and professional.',
      anti_patterns: 'Avoid generic excitement and corporate jargon.',
      structural_archetypes: [
        {
          name: 'General Narrative',
          description: 'A standard post format.',
          example: 'Here is an interesting insight from today: [Summary].'
        }
      ],
      validation_checklist: ['Is it accurate?', 'Is it engaging?'],
      image_probability: 0,
      headlines_to_fetch: 10,
      headlines_in_prompt: 5
    };

    return { ...defaults, ...config };
  }

  async createPersona(input: CreatePersonaInput): Promise<Persona> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const tone = input.tone || null;
    let topics = null;
    if (input.topics?.length) {
      topics = `{${input.topics.join(',')}}`;
    }

    const key = input.key || this.generateKey(input.name);
    const userId = await this.getUserIdFromAccount(input.connected_account_id);

    const result = await sql`
      INSERT INTO personas (
        id, connected_account_id, user_id, key, name, description, rss_sources, config,
        min_length, max_length, tone, topics, is_active, is_default,
        created_at, updated_at
      ) VALUES (
        ${id}, ${input.connected_account_id}, ${userId}, ${key}, ${input.name},
        ${input.description || ''}, ${JSON.stringify(input.rss_sources || [])}::jsonb,
        ${JSON.stringify(this.mergeWithDefaultDna(input.config || {}))}::jsonb,
        ${input.min_length ?? 200}, ${input.max_length ?? 280},
        ${tone}, ${topics},
        ${input.is_active ?? true}, ${input.is_default ?? false},
        ${now}, ${now}
      )
      RETURNING *
    `;

    await sql`
      UPDATE connected_accounts 
      SET personas = personas || jsonb_build_array(${key})
      WHERE id = ${input.connected_account_id}
      AND NOT personas ? ${key}
    `;

    return this.mapRow(result.rows[0]);
  }

  private generateKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  private async getUserIdFromAccount(accountId: string): Promise<string | null> {
    const result = await sql`
      SELECT user_id FROM connected_accounts WHERE id = ${accountId}
    `;
    return result.rows[0]?.user_id || null;
  }

  async updatePersona(input: UpdatePersonaInput): Promise<Persona | null> {
    const updates: string[] = [];
    const values: (string | number | boolean | string[] | null)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.connected_account_id !== undefined) {
      updates.push(`connected_account_id = $${paramIndex++}`);
      values.push(input.connected_account_id);
    }
    if (input.rss_sources !== undefined) {
      updates.push(`rss_sources = $${paramIndex++}`);
      values.push(JSON.stringify(input.rss_sources));
    }
    if (input.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(this.mergeWithDefaultDna(input.config)));
    }
    if (input.min_length !== undefined) {
      updates.push(`min_length = $${paramIndex++}`);
      values.push(input.min_length);
    }
    if (input.max_length !== undefined) {
      updates.push(`max_length = $${paramIndex++}`);
      values.push(input.max_length);
    }
    if (input.tone !== undefined) {
      updates.push(`tone = $${paramIndex++}`);
      values.push(input.tone);
    }
    if (input.topics !== undefined) {
      updates.push(`topics = $${paramIndex++}`);
      values.push(input.topics.length ? `{${input.topics.join(',')}}` : null);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.is_default !== undefined) {
      updates.push(`is_default = $${paramIndex++}`);
      values.push(input.is_default);
    }

    if (updates.length === 0) {
      return this.getPersona(input.id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(input.id);

    const query = `
      UPDATE personas
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql.query(query, values);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async deletePersona(id: string): Promise<void> {
    await sql`DELETE FROM personas WHERE id = ${id}`;
  }

  async getActivePersonasForAccount(accountId: string): Promise<Persona[]> {
    const result = await sql`
      SELECT * FROM personas
      WHERE connected_account_id = ${accountId} AND is_active = true
      ORDER BY created_at DESC
    `;

    return result.rows.map(this.mapRow);
  }

  async getDefaultPersonaForAccount(accountId: string): Promise<Persona | null> {
    const result = await sql`
      SELECT * FROM personas
      WHERE connected_account_id = ${accountId} AND is_default = true
      LIMIT 1
    `;

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async addRssSource(personaId: string, rssUrl: string): Promise<Persona | null> {
    const persona = await this.getPersona(personaId);
    if (!persona) return null;

    const currentSources = persona.rss_sources || [];
    const updatedSources = Array.from(new Set([...currentSources, rssUrl]));

    return this.updatePersona({
      id: personaId,
      rss_sources: updatedSources
    });
  }

  async removeRssSource(personaId: string, rssUrl: string): Promise<Persona | null> {
    const persona = await this.getPersona(personaId);
    if (!persona) return null;

    const currentSources = persona.rss_sources || [];
    const updatedSources = currentSources.filter(url => url !== rssUrl);

    return this.updatePersona({
      id: personaId,
      rss_sources: updatedSources
    });
  }

  private mapRow(row: Record<string, unknown>): Persona {
    let topics: string[] | undefined;
    if (row.topics) {
      if (Array.isArray(row.topics)) {
        topics = row.topics as string[];
      } else if (typeof row.topics === 'string') {
        topics = row.topics.slice(1, -1).split(',').map(t => t.trim().slice(1, -1));
      }
    }

    return {
      id: row.id as string,
      connected_account_id: row.connected_account_id as string,
      name: row.name as string,
      description: row.description as string,
      rss_sources: Array.isArray(row.rss_sources)
        ? row.rss_sources
        : (typeof row.rss_sources === 'string' ? JSON.parse(row.rss_sources) : []),
      config: typeof row.config === 'string'
        ? JSON.parse(row.config)
        : row.config as Record<string, unknown>,
      min_length: row.min_length as number,
      max_length: row.max_length as number,
      tone: row.tone as string | undefined,
      topics,
      is_active: row.is_active as boolean,
      is_default: row.is_default as boolean,
      created_at: (row.created_at as Date).toISOString(),
      updated_at: (row.updated_at as Date).toISOString(),
      key: row.key as string || '',
    };
  }
}

export const personaService = new PersonaService();