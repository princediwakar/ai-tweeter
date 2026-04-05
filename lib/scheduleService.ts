import { sql } from '@vercel/postgres';
import { getUserIdFromRequest } from '@/lib/auth';

export interface Schedule {
  id: string;
  connected_account_id: string;
  name: string;
  timezone: string;
  schedule_config: Record<string, unknown>;
  days_of_week: number[];
  start_time: number;
  end_time: number;
  is_active: boolean;
  persona_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleInput {
  connected_account_id: string;
  name: string;
  timezone?: string;
  schedule_config?: Record<string, unknown>;
  days_of_week?: number[];
  start_time?: number;
  end_time?: number;
  is_active?: boolean;
  persona_id?: string;
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> {
  id: string;
}

class ScheduleService {
  async getSchedulesByAccount(accountId: string): Promise<Schedule[]> {
    const result = await sql`
      SELECT * FROM account_schedules
      WHERE connected_account_id = ${accountId}
      ORDER BY created_at DESC
    `;

    return result.rows.map(this.mapRow);
  }

  async getSchedule(id: string): Promise<Schedule | null> {
    const result = await sql`
      SELECT * FROM account_schedules
      WHERE id = ${id}
    `;

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const daysOfWeek = input.days_of_week || [0,1,2,3,4,5,6];
    const daysString = `{${daysOfWeek.join(',')}}`;

    const result = await sql`
      INSERT INTO account_schedules (
        id, connected_account_id, name, timezone, schedule_config, 
        days_of_week, start_time, end_time, is_active,
        persona_id, created_at, updated_at
      ) VALUES (
        ${id}, ${input.connected_account_id}, ${input.name}, 
        ${input.timezone || 'UTC'}, ${JSON.stringify(input.schedule_config || {})},
        ${daysString}, 
        ${input.start_time ?? 0}, ${input.end_time ?? 1439},
        ${input.is_active ?? true},
        ${input.persona_id || null},
        ${now}, ${now}
      )
      RETURNING *
    `;

    return this.mapRow(result.rows[0]);
  }

  async updateSchedule(input: UpdateScheduleInput): Promise<Schedule | null> {
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(input.timezone);
    }
    if (input.schedule_config !== undefined) {
      updates.push(`schedule_config = $${paramIndex++}`);
      values.push(JSON.stringify(input.schedule_config));
    }
    if (input.days_of_week !== undefined) {
      updates.push(`days_of_week = $${paramIndex++}`);
      values.push(`{${input.days_of_week.join(',')}}`);
    }
    if (input.start_time !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      values.push(input.start_time);
    }
    if (input.end_time !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      values.push(input.end_time);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.persona_id !== undefined) {
      updates.push(`persona_id = $${paramIndex++}`);
      values.push(input.persona_id || null);
    }

    if (updates.length === 0) {
      return this.getSchedule(input.id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(input.id);

    const query = `
      UPDATE account_schedules
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql.query(query, values);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async deleteSchedule(id: string): Promise<void> {
    await sql`DELETE FROM account_schedules WHERE id = ${id}`;
  }

  async getActiveSchedulesForAccount(accountId: string): Promise<Schedule[]> {
    const result = await sql`
      SELECT * FROM account_schedules
      WHERE connected_account_id = ${accountId} AND is_active = true
      ORDER BY created_at DESC
    `;

    return result.rows.map(this.mapRow);
  }

  private mapRow(row: Record<string, unknown>): Schedule {
    return {
      id: row.id as string,
      connected_account_id: row.connected_account_id as string,
      name: row.name as string,
      timezone: row.timezone as string,
      schedule_config: typeof row.schedule_config === 'string' 
        ? JSON.parse(row.schedule_config) 
        : row.schedule_config as Record<string, unknown>,
      days_of_week: row.days_of_week as number[],
      start_time: row.start_time as number,
      end_time: row.end_time as number,
      is_active: row.is_active as boolean,
      persona_id: row.persona_id as string | undefined,
      created_at: (row.created_at as Date).toISOString(),
      updated_at: (row.updated_at as Date).toISOString(),
    };
  }
}

export const scheduleService = new ScheduleService();