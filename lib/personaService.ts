// lib/personaService.ts
// Persona management — create, read, update, delete.
// Key design decisions:
//   1. Defaults are structural placeholders, not platitudes — misconfigured personas fail loudly.
//   2. mergeWithDefaultDna does a value-aware merge — empty strings / empty arrays don't overwrite quality defaults.
//   3. mapRow is strict and typed — no silent coercions.

import { sql } from "@vercel/postgres";
import type { Persona, PersonaConfigDNA } from "./types";
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
  platform?: "twitter" | "linkedin";
}

export interface UpdatePersonaInput extends Partial<CreatePersonaInput> {
  id: string;
}

// ─── Default DNA ──────────────────────────────────────────────────────────────
//
// Philosophy: These defaults must not silently produce generic content.
// Every field that requires persona-specific thinking is marked CONFIGURE.
// If a persona ships with these defaults, its output will obviously read as unfinished —
// which is the desired failure mode (visible, not invisible).
//
// Fields that are structural (format_rules, image_probability) have quality defaults
// that hold up even without customization.

const buildDefaultDna = (platform: "twitter" | "linkedin" = "twitter"): PersonaConfigDNA => ({
  // ── Core Belief ──
  // CONFIGURE: Replace with a specific, non-obvious belief this persona holds about their industry.
  // Bad: "Data is important." Good: "CAC recovery curves matter more than conversion rates for
  // subscription businesses — and almost nobody tracks them right."
  core_thesis:
    "[CONFIGURE] The single most non-obvious operational belief this persona holds about their industry. Specific. Falsifiable. Not a platitude.",

  // ── The Enemy ──
  // CONFIGURE: Replace with the specific pattern this persona finds intellectually dishonest.
  // Bad: "Generic advice." Good: "Benchmarks presented without cohort context — they let teams
  // feel good about mediocre numbers."
  the_enemy:
    "[CONFIGURE] The specific type of commentary, metric, or conventional wisdom in this space that obscures more than it reveals.",

  // ── Analytical Framework ──
  // CONFIGURE: Replace with the specific lens this persona applies to data.
  // Bad: "Look for patterns." Good: "Always ask: what's the unit economics at 10x scale?
  // Most operational decisions look different once you apply that lens."
  analytical_framework:
    "[CONFIGURE] The specific analytical move this persona makes that others don't. What question do they always ask that others skip?",

  // ── Framing Bias ──
  // CONFIGURE: How does this persona naturally frame an observation?
  // Example: "Through the lens of what this means for the operator on the ground, not the analyst
  // writing about it."
  framing_bias:
    "[CONFIGURE] How this persona naturally frames insights — through what lens, toward what audience.",

  // ── Hook Mechanics ──
  // CONFIGURE: What makes this persona's opening lines distinctive?
  // Example: "Opens with the number most people bury in paragraph three."
  hook_mechanics:
    platform === "twitter"
      ? "Start with the most specific, non-obvious fact. Never start with 'I'. Never start with a question. Lead with the observation."
      : "Open with a single sentence that names something specific. No setup, no 'In today's world'. Earn the scroll in sentence one.",

  // ── Voice DNA ──
  // CONFIGURE: What makes this persona's voice recognizable in 10 words?
  voice_dna:
    platform === "twitter"
      ? "Precise, confident, first-person. Varied sentence rhythm. Never promotional. No hedging — state it or don't."
      : "Substantive, operator-level, first-person. Short paragraphs. Data integrated into narrative, not listed. Professional but never corporate.",

  // ── Structural Archetypes ──
  // These are high-quality defaults. Override with persona-specific archetypes if the persona
  // has distinctive formats their audience expects.
  structural_archetypes:
    platform === "twitter"
      ? [
          {
            name: "The Contrast",
            description:
              "Lead with a specific number or fact. Contrast it with expectation or history. Deliver the implication.",
            example: "Q3 SaaS net revenue retention averaged 108% — down from 118% in 2022. That gap is where most boards are going to spend 2025.",
          },
          {
            name: "The Mechanism",
            description:
              "Observable outcome. Non-obvious cause. Operational implication.",
            example: "Enterprise sales cycles stretched to 9 months on average last quarter. It's not budget — it's the addition of a security review layer that didn't exist 18 months ago.",
          },
          {
            name: "The Quiet Drop",
            description:
              "State the thing directly. One supporting fact. One implication. No fanfare.",
            example: "Warehouse automation ROI payback is averaging 14 months now, down from 22 in 2021. The math changed. Most procurement teams haven't updated their models.",
          },
        ]
      : [
          {
            name: "The Buried Number",
            description:
              "Hook → specific fact → operational meaning → contrast → one-sentence synthesis. Short paragraphs throughout.",
            example:
              "Something shifted in enterprise software buying last year.\n\nAverage deal cycles stretched to 9.2 months — up from 6.4 in 2022. That's not a rounding error.\n\nThe cause isn't budget. It's a new security review layer that most vendors didn't anticipate and still haven't built process around.\n\nThe teams I see moving fastest have a dedicated security pre-qualification step before the demo. It sounds obvious. Almost nobody does it.\n\nOne process change. 30-40% reduction in late-stage stall rate.",
          },
          {
            name: "The Pattern Across Time",
            description:
              "What's happening now → what was happening 18 months ago → what changed → the implication → the position.",
            example:
              "Logistics margins are compressing again.\n\n18 months ago, spot rates were 40% above contract. Carriers were printing money.\n\nNow contract rates are 12% below 2022 peaks and spot has followed.\n\nWhat changed: the capacity that flooded in during 2021-22 hasn't rationalized. It's sitting there, suppressing rates.\n\nThe operators who hedged with longer-term contracts at peak are now underwater. The ones who stayed flexible are buying capacity at a steep discount.\n\nFlexibility cost them margin in 2022. It's paying back in 2024.",
          },
        ],

  // ── Validation Checklist ──
  // Falsifiable checks — not "does this sound good" questions.
  validation_checklist:
    platform === "twitter"
      ? [
          "Sentence 1 contains a number, a named company, or a concrete outcome",
          "There is a contrast or change present — something vs. something else",
          "The post delivers full value with zero additional context",
          "The first word is not 'I'",
          "No questions, no hashtags, no emojis",
          "Under 280 characters",
          "Removing the last sentence makes it stronger — if so, remove it",
          "A senior operator would learn something or see their space differently",
        ]
      : [
          "Opening sentence names something specific — not a vague framing",
          "At least one paragraph contains a number, named company, or concrete operational detail",
          "There is a contrast or non-obvious inference — not obvious from sentence one",
          "Every paragraph is 1–3 sentences maximum",
          "Blank line between every paragraph",
          "No sentences begin with 'I think', 'I believe', or 'It seems'",
          "Post ends with a synthesis — not a question, not a CTA",
          "No corporate phrases: 'excited to share', 'in today's world', 'game-changing'",
          "A busy professional reading this feels they received high-signal material",
        ],

  // ── Anti-patterns ──
  // Platform defaults — extend with persona-specific patterns.
  anti_patterns:
    platform === "twitter"
      ? "Summarizer voice. Source attribution. Questions at the end. Emojis. Hashtags. Starting with 'I'. Hedging language ('it seems', 'it appears', 'I think'). Vague observations without supporting specifics."
      : "Corporate language. 'Excited to share.' 'In today's fast-paced world.' Source attribution. 'According to a recent study.' Bullet lists when prose would serve better. Ending with 'What do you think?' or any CTA. Em-dashes in every sentence.",

  // ── Source Logic ──
  // This is intentionally blank — the PromptEngine injects the full Source Intelligence Protocol.
  // Override here only if the persona has unusual source evaluation rules.
  source_logic: "",

  // ── Format Rules ──
  format_rules:
    platform === "twitter"
      ? [
          "First person, present tense.",
          "Numbers are naked: 37%, not thirty-seven percent.",
          "Contractions where they feel natural.",
          "No em-dashes mid-sentence.",
          "Vary sentence length deliberately.",
        ]
      : [
          "First person, present tense.",
          "Blank line between every paragraph — mandatory.",
          "Numbers integrated into narrative sentences, not bulleted.",
          "Contractions where natural.",
          "No em-dashes in every sentence — use them sparingly.",
          "Short paragraphs: 1–3 sentences each.",
        ],

  // ── Tuning ──
  image_probability: 0,
  headlines_to_fetch: 12,
  headlines_in_prompt: 6,

  // ── Identity Context ──
  // CONFIGURE: A crisp description of who this persona is as an operator.
  // This goes at the top of every prompt and sets the voice frame for everything that follows.
  identity_context:
    "[CONFIGURE] A concise description of who this persona is — their background, what they've operated, what gives their observations credibility. 2–3 sentences. First person.",
});

// ─── Service Class ────────────────────────────────────────────────────────────

class PersonaService {
  // ── Read ──

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
      SELECT * FROM personas WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
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

  // ── Create ──

  async createPersona(input: CreatePersonaInput): Promise<Persona> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const platform = input.platform ?? "twitter";

    const tone = input.tone ?? null;
    const topics = input.topics?.length ? `{${input.topics.join(",")}}` : null;
    const userId = await this.getUserIdFromAccount(input.connected_account_id);

    const baseKey = input.key || this.generateKey(input.name);
    let key = await this.ensureUniqueKey(baseKey);

    for (let attempt = 0; attempt < 5; attempt++) {
      const mergedConfig = this.mergeWithDefaultDna(input.config ?? {}, platform);

      const result = await sql`
        INSERT INTO personas (
          id, connected_account_id, user_id, key, name, description,
          rss_sources, config, min_length, max_length, tone, topics,
          is_active, is_default, created_at, updated_at
        ) VALUES (
          ${id},
          ${input.connected_account_id},
          ${userId},
          ${key},
          ${input.name},
          ${input.description ?? ""},
          ${JSON.stringify(input.rss_sources ?? [])}::jsonb,
          ${JSON.stringify(mergedConfig)}::jsonb,
          ${input.min_length ?? (platform === "linkedin" ? 600 : 140)},
          ${input.max_length ?? (platform === "linkedin" ? 2200 : 280)},
          ${tone},
          ${topics},
          ${input.is_active ?? true},
          ${input.is_default ?? false},
          ${now},
          ${now}
        )
        ON CONFLICT (connected_account_id, key) WHERE (key IS NOT NULL) DO NOTHING
        RETURNING *
      `;

      if (result.rows.length > 0) {
        return this.mapRow(result.rows[0]);
      }

      key = await this.ensureUniqueKey(`${baseKey}-${Date.now()}`);
    }

    throw new Error("Failed to create persona after maximum attempts — key conflict unresolved.");
  }

  // ── Update ──

  async updatePersona(input: UpdatePersonaInput): Promise<Persona | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const addField = (sql: string, val: unknown) => {
      updates.push(`${sql} = $${i++}`);
      values.push(val);
    };

    if (input.name !== undefined)                addField("name", input.name);
    if (input.description !== undefined)          addField("description", input.description);
    if (input.connected_account_id !== undefined) addField("connected_account_id", input.connected_account_id);
    if (input.rss_sources !== undefined)          addField("rss_sources", JSON.stringify(input.rss_sources));
    if (input.min_length !== undefined)           addField("min_length", input.min_length);
    if (input.max_length !== undefined)           addField("max_length", input.max_length);
    if (input.tone !== undefined)                 addField("tone", input.tone);
    if (input.is_active !== undefined)            addField("is_active", input.is_active);
    if (input.is_default !== undefined)           addField("is_default", input.is_default);

    if (input.topics !== undefined) {
      addField("topics", input.topics.length ? `{${input.topics.join(",")}}` : null);
    }

    if (input.config !== undefined) {
      const existing = await this.getPersona(input.id);
      const platform = (existing?.config as any)?.platform ?? input.platform ?? "twitter";
      addField("config", JSON.stringify(this.mergeWithDefaultDna(input.config, platform)));
    }

    if (updates.length === 0) return this.getPersona(input.id);

    addField("updated_at", new Date().toISOString());
    values.push(input.id);

    const query = `UPDATE personas SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`;
    const result = await sql.query(query, values as any[]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  // ── Delete ──

  async deletePersona(id: string): Promise<void> {
    await sql`UPDATE account_schedules SET persona_id = NULL WHERE persona_id = ${id}`;
    await sql`DELETE FROM personas WHERE id = ${id}`;
  }

  // ── RSS Sources ──

  async addRssSource(personaId: string, rssUrl: string): Promise<Persona | null> {
    const persona = await this.getPersona(personaId);
    if (!persona) return null;
    const updated = Array.from(new Set([...(persona.rss_sources ?? []), rssUrl]));
    return this.updatePersona({ id: personaId, rss_sources: updated });
  }

  async removeRssSource(personaId: string, rssUrl: string): Promise<Persona | null> {
    const persona = await this.getPersona(personaId);
    if (!persona) return null;
    const updated = (persona.rss_sources ?? []).filter((u) => u !== rssUrl);
    return this.updatePersona({ id: personaId, rss_sources: updated });
  }

  // ─── DNA Merge ────────────────────────────────────────────────────────────
  //
  // Value-aware merge: a field in `config` only overrides the default if it
  // is a non-empty string, a non-empty array, a non-zero number, or a boolean.
  //
  // This prevents a partially-filled config (empty strings, empty arrays) from
  // silently nuking the high-quality structural defaults above.

  private mergeWithDefaultDna(
    config: Partial<PersonaConfigDNA> | Record<string, unknown> = {},
    platform: "twitter" | "linkedin" = "twitter"
  ): PersonaConfigDNA {
    const defaults = buildDefaultDna(platform);
    const merged: Record<string, unknown> = { ...defaults };

    for (const key of Object.keys(config)) {
      const val = (config as Record<string, unknown>)[key];

      // Reject empty / null / undefined values — keep the default
      if (val === null || val === undefined) continue;
      if (typeof val === "string" && val.trim() === "") continue;
      if (Array.isArray(val) && val.length === 0) continue;

      merged[key] = val;
    }

    return merged as unknown as PersonaConfigDNA;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async ensureUniqueKey(baseKey: string): Promise<string> {
    let candidate = baseKey;
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await sql`SELECT 1 FROM personas WHERE key = ${candidate}`;
      if (exists.rows.length === 0) return candidate;
      const suffix = Math.random().toString(36).substring(2, 7);
      candidate = `${baseKey}-${suffix}`;
    }
    return `${baseKey}-${Date.now()}`;
  }

  private async getUserIdFromAccount(accountId: string): Promise<string | null> {
    const result = await sql`
      SELECT user_id FROM connected_accounts WHERE id = ${accountId}
    `;
    return result.rows[0]?.user_id ?? null;
  }

  private mapRow(row: Record<string, unknown>): Persona {
    let topics: string[] | undefined;

    if (row.topics) {
      if (Array.isArray(row.topics)) {
        topics = row.topics as string[];
      } else if (typeof row.topics === "string") {
        topics = row.topics
          .replace(/^{|}$/g, "")
          .split(",")
          .map((t) => t.trim().replace(/^"|"$/g, ""))
          .filter(Boolean);
      }
    }

    return {
      id: row.id as string,
      connected_account_id: row.connected_account_id as string,
      name: row.name as string,
      description: row.description as string,
      rss_sources: Array.isArray(row.rss_sources)
        ? (row.rss_sources as string[])
        : typeof row.rss_sources === "string"
        ? (JSON.parse(row.rss_sources) as string[])
        : [],
      config:
        typeof row.config === "string"
          ? (JSON.parse(row.config) as Record<string, unknown>)
          : (row.config as Record<string, unknown>),
      min_length: row.min_length as number,
      max_length: row.max_length as number,
      tone: (row.tone as string | undefined) ?? null,
      topics,
      is_active: row.is_active as boolean,
      is_default: row.is_default as boolean,
      created_at: (row.created_at as Date).toISOString(),
      updated_at: (row.updated_at as Date).toISOString(),
      key: (row.key as string) ?? "",
    };
  }
}

export const personaService = new PersonaService();