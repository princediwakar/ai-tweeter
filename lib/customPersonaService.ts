import { sql } from '@vercel/postgres';

export interface CustomPersona {
  id: string;
  connected_account_id: string;
  name: string;
  description: string;
  persona_config: Record<string, unknown>;
  base_persona: string | null;
  min_length: number;
  max_length: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaInput {
  connected_account_id: string;
  name: string;
  description?: string;
  persona_config?: Record<string, unknown>;
  base_persona?: string;
  min_length?: number;
  max_length?: number;
  is_active?: boolean;
}

export interface UpdatePersonaInput extends Partial<CreatePersonaInput> {
  id: string;
}

class CustomPersonaService {
  async getPersonasByAccount(accountId: string): Promise<CustomPersona[]> {
    const result = await sql`
      SELECT * FROM custom_personas
      WHERE connected_account_id = ${accountId}
      ORDER BY created_at DESC
    `;

    return result.rows.map(this.mapRow);
  }

  async getPersona(id: string): Promise<CustomPersona | null> {
    const result = await sql`
      SELECT * FROM custom_personas
      WHERE id = ${id}
    `;

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async createPersona(input: CreatePersonaInput): Promise<CustomPersona> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await sql`
      INSERT INTO custom_personas (
        id, connected_account_id, name, description, persona_config, 
        base_persona, min_length, max_length, is_active,
        created_at, updated_at
      ) VALUES (
        ${id}, ${input.connected_account_id}, ${input.name}, 
        ${input.description || ''}, ${JSON.stringify(input.persona_config || {})},
        ${input.base_persona || null}, 
        ${input.min_length ?? 100}, ${input.max_length ?? 280},
        ${input.is_active ?? true},
        ${now}, ${now}
      )
      RETURNING *
    `;

    return this.mapRow(result.rows[0]);
  }

  async updatePersona(input: UpdatePersonaInput): Promise<CustomPersona | null> {
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.persona_config !== undefined) {
      updates.push(`persona_config = $${paramIndex++}`);
      values.push(JSON.stringify(input.persona_config));
    }
    if (input.base_persona !== undefined) {
      updates.push(`base_persona = $${paramIndex++}`);
      values.push(input.base_persona);
    }
    if (input.min_length !== undefined) {
      updates.push(`min_length = $${paramIndex++}`);
      values.push(input.min_length);
    }
    if (input.max_length !== undefined) {
      updates.push(`max_length = $${paramIndex++}`);
      values.push(input.max_length);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }

    if (updates.length === 0) {
      return this.getPersona(input.id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(input.id);

    const query = `
      UPDATE custom_personas
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql.query(query, values);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async deletePersona(id: string): Promise<void> {
    await sql`DELETE FROM custom_personas WHERE id = ${id}`;
  }

  async getActivePersonasForAccount(accountId: string): Promise<CustomPersona[]> {
    const result = await sql`
      SELECT * FROM custom_personas
      WHERE connected_account_id = ${accountId} AND is_active = true
      ORDER BY created_at DESC
    `;

    return result.rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): CustomPersona {
    return {
      id: row.id as string,
      connected_account_id: row.connected_account_id as string,
      name: row.name as string,
      description: row.description as string,
      persona_config: typeof row.persona_config === 'string' 
        ? JSON.parse(row.persona_config) 
        : row.persona_config as Record<string, unknown>,
      base_persona: row.base_persona as string | null,
      min_length: row.min_length as number,
      max_length: row.max_length as number,
      is_active: row.is_active as boolean,
      created_at: (row.created_at as Date).toISOString(),
      updated_at: (row.updated_at as Date).toISOString(),
    };
  }
}

export const customPersonaService = new CustomPersonaService();