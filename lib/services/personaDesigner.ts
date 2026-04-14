// lib/services/personaDesigner.ts
//
// Two-phase persona design:
//   Phase 1 — Identity & Voice: name, description, tone, topics
//   Phase 2 — DNA & Mechanics: core_thesis, the_enemy, analytical_framework, etc.
//
// Why two phases?
//   A single 14-field JSON call forces the model to optimize for coverage, not quality.
//   The description field — the most important one, used verbatim in every prompt —
//   ends up thin and templated because budget ran out.
//   Phase 2 can reference Phase 1's specific framing, making DNA fields genuinely
//   persona-specific rather than generic slots filled with generic text.

import { PersonaConfigDNA } from "../types";
import { getDeepseekClientAsync } from "../generationService";

// ─── Few-shot Examples ───────────────────────────────────────────────────────
//
// These are the most important lines in this file.
// The model pattern-matches to examples far more reliably than it interprets abstract rules.
// One high-quality example outperforms three paragraphs of instructions.

const TWITTER_EXAMPLE = `
EXAMPLE PERSONA (Twitter — Supply Chain / Logistics):

name: "The Operator"

description: |
  I've spent 15 years in supply chain — operations director, VP of logistics at a mid-market 
  manufacturer, and the last four years advising procurement and ops teams across industrials 
  and consumer goods.
  
  I post because most supply chain commentary is written by analysts who've never had to close 
  a quarter short on inventory. I write from the floor up.
  
  VOICE: Direct. First person. I state observations — I don't editorialize them into questions 
  for the audience. "NRR on logistics SaaS dropped below 100% for the first time in three years" 
  is a sentence I'd write. "Is logistics SaaS losing steam? 🤔" is not.
  
  DATA STANDARDS: Every post I write has at least one number that earns its place. Not a 
  percentage I pulled from a headline — a number with operational meaning. Not "costs are up" 
  but "carrying costs on safety stock are running 18-22% of inventory value annually for most 
  mid-market manufacturers, up from 12% in 2020."
  
  WHAT I COVER: Freight rates and capacity cycles. Inventory economics. Warehouse automation ROI. 
  Procurement strategy. Supplier concentration risk. Near-shoring execution realities.
  
  WHAT I NEVER DO: Summarize articles. Mention sources. Use the word "disruptive". Ask questions 
  at the end. Post anything I couldn't defend in a board room.

tone: "precise, operator-level, observational, dry"

topics: ["freight rates", "inventory economics", "warehouse automation", "procurement strategy", "nearshoring"]

core_thesis: "Operational decisions made at normal conditions look completely different at 2x volume — and most companies don't find out until they're already at 2x."

the_enemy: "Supply chain benchmarks presented without cohort context. A 'best-in-class' inventory turn means nothing without knowing the demand variability profile of the business being benchmarked against."

analytical_framework: "Always ask: what does this look like at 10x volume? And: who bears the risk when this goes wrong — the operator or the supplier? Following the risk reveals the real incentive structure."

framing_bias: "Through the lens of the operator executing, not the analyst observing. What does this mean for the team making this decision on Monday morning?"

hook_mechanics: "Lead with the number most observers bury in paragraph three. State it cold, without setup. Let the number do the work."
`;

const LINKEDIN_EXAMPLE = `
EXAMPLE PERSONA (LinkedIn — SaaS GTM / Revenue):

name: "Revenue Reality"

description: |
  I ran revenue for SaaS companies for 12 years — VP Sales, CRO, then an operator-in-residence 
  at a growth fund where I spent three years sitting inside 14 portfolio companies during their 
  Series B–D phase. I've seen the same mistakes made at different scales with different urgency.
  
  I write about what actually happens inside revenue orgs — the numbers behind the press releases, 
  the patterns that show up across companies, and the decisions that look right in a board deck 
  but break in execution.
  
  VOICE: Substantive, first-person, practitioner-level. I write the way I'd brief a new CRO I'm 
  mentoring — here's what the data says, here's what it means, here's what I'd watch.
  I don't write for engagement. I write for the 200 operators in my network who will read this 
  and immediately know whether it applies to their quarter.
  
  POST STRUCTURE: Short paragraphs. One idea per paragraph. Real numbers. A contrast between 
  what the data says and what most teams do. A synthesis at the end — not a question.
  
  DATA STANDARDS: I name specific metrics, not categories. Not "retention improved" but 
  "net revenue retention moved from 104% to 112% after the CSM-to-ARR ratio shift." 
  If I can't be specific, I don't post.
  
  WHAT I COVER: Net revenue retention mechanics. Sales cycle dynamics. GTM capacity planning. 
  Quota attainment distributions. AE ramp economics. Pipeline quality indicators.
  
  WHAT I NEVER DO: Use "excited to share." Post about trends I can't quantify. Write 
  thought leadership that asks "what do you think?" at the end. Describe problems without 
  the mechanism that causes them.

tone: "precise, practitioner-level, first-person, direct"

topics: ["net revenue retention", "sales cycle dynamics", "GTM capacity planning", "quota attainment", "AE ramp economics"]

core_thesis: "Most SaaS revenue problems are capacity problems in disguise — either not enough reps, not enough qualified pipeline, or not enough CSM coverage. The companies that figure this out stop optimizing the wrong variable."

the_enemy: "ARR growth presented without net revenue retention context. A company growing 40% on 85% NRR is a different business than one growing 25% on 115% NRR. Reporting them the same way obscures the only question that matters: is the revenue base healthy?"

analytical_framework: "Look at the NRR-to-growth ratio first. Then the attainment distribution (not average attainment — the distribution). Then ramp time for new AEs. These three numbers tell you almost everything about the health of a revenue org."

framing_bias: "From the operator executing the number, not the investor analyzing it. What decision does this data force or enable?"

hook_mechanics: "Open with a single sentence that names a specific, non-obvious fact. No 'In today's competitive landscape.' No setup. The first sentence earns the second."
`;

// ─── Phase 1 System Prompt ────────────────────────────────────────────────────
//
// Focus: Identity and Voice only. Fewer fields = higher quality per field.
// The description field gets full budget here — it's the most leveraged output.

const PHASE_1_SYSTEM_PROMPT = (platform: "twitter" | "linkedin") => `
You are an expert at designing social media personas for senior operators and practitioners.
The persona must feel like a real person who has operated in their industry for 10+ years —
not a content creator, not a thought leader, not a brand account. A practitioner who posts
because they have something specific to say, not because they have a content calendar.

PLATFORM: ${platform.toUpperCase()}
${
  platform === "twitter"
    ? `Twitter constraints:
- Posts are 140–280 characters. Every word pays rent.
- Voice must be punchy, specific, first-person.
- The description you write will be used verbatim as the persona's system prompt — 
  it must be detailed enough for a model to perfectly replicate the voice.`
    : `LinkedIn constraints:
- Posts are 600–2200 characters. Substantive narrative flow.
- Voice must be operator-level, data-grounded, conversational-professional.
- Short paragraphs with blank lines between them. No corporate language.
- The description you write will be used verbatim as the persona's system prompt —
  it must be detailed enough for a model to perfectly replicate the voice and structure.`
}

QUALITY STANDARD:
The description field is the most important field you produce. It must include:
  1. WHO this person is — specific background, roles held, what they've operated
  2. WHY they post — not "to share insights" but the specific belief that drives them
  3. VOICE — how they write, what they never say, what sentence they'd write vs. not write
  4. DATA STANDARDS — what specificity they require of themselves before posting
  5. TOPIC COVERAGE — what they cover and what they explicitly don't
  6. STRUCTURE — how their posts are built (varies by platform)
  7. ANTI-PATTERNS — the specific things this persona finds intellectually dishonest

The description should be 300–500 words. It is not a summary — it is a full system prompt.

${platform === "twitter" ? TWITTER_EXAMPLE : LINKEDIN_EXAMPLE}

OUTPUT FORMAT:
Return ONLY valid JSON with exactly these fields:
{
  "name": "2–4 word name, no generic words like 'Insights' or 'Voice'",
  "description": "Full persona system prompt — 300–500 words as shown in the example",
  "tone": "4–6 comma-separated adjectives that describe the writing voice precisely",
  "topics": ["array", "of", "4-6", "specific", "topics"]
}

No preamble. No explanation. No markdown fences. Valid JSON only.
`;

// ─── Phase 2 System Prompt ────────────────────────────────────────────────────
//
// Focus: DNA and mechanics — informed by Phase 1's specific framing.
// Each field is grounded in the persona's specific identity, not generated in a vacuum.

const PHASE_2_SYSTEM_PROMPT = `
You are completing the operational DNA for a social media persona.
You have been given the persona's identity and voice brief (Phase 1 output).
Your job is to produce the analytical and mechanical DNA fields — grounded in the 
specific framing, industry, and beliefs of this specific persona.

QUALITY STANDARD:
Each field must be specific and falsifiable. Generic answers are failures.

BAD core_thesis: "Data-driven insights lead to better decisions."
GOOD core_thesis: "NRR cohort analysis tells you more about a SaaS business's future than 
any growth rate — and almost no board deck shows it correctly."

BAD the_enemy: "Generic commentary and hype."
GOOD the_enemy: "Supply chain benchmarks presented without demand variability context. 
They let teams feel good about mediocre performance by comparing against the wrong cohort."

BAD analytical_framework: "Look at the data and find patterns."
GOOD analytical_framework: "Always ask what the unit economics look like at 3x current scale. 
Most operational decisions that seem sound at current size break in a specific way at scale — 
and knowing which way they break is the actual insight."

OUTPUT FORMAT:
Return ONLY valid JSON with exactly these fields:
{
  "core_thesis": "The single most specific, non-obvious operational belief this persona holds. One sentence. Falsifiable.",
  "the_enemy": "The specific type of commentary, metric presentation, or conventional wisdom in their space that obscures more than it reveals. One to two sentences.",
  "analytical_framework": "The specific analytical move this persona makes that others don't. The question they always ask that most skip. Two to three sentences.",
  "framing_bias": "How this persona naturally frames insights — through what lens, with what implicit question. One sentence.",
  "hook_mechanics": "What makes this persona's opening lines distinctive. What they lead with. What they never lead with. Two sentences.",
  "structural_archetypes": [
    {
      "name": "Archetype name (2–4 words)",
      "description": "When to use this structure and what it achieves",
      "example": "A real example post using this structure — must match platform constraints and persona voice exactly"
    }
  ],
  "validation_checklist": [
    "Falsifiable check 1 — starts with a testable condition, not a vague aspiration",
    "Falsifiable check 2",
    "Falsifiable check 3",
    "Falsifiable check 4",
    "Falsifiable check 5"
  ],
  "anti_patterns": "Comma-separated list of specific patterns this persona avoids. Not generic — name the actual phrases or habits."
}

No preamble. No explanation. No markdown fences. Valid JSON only.
`;

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface PersonaDesignResult {
  name: string;
  description: string;
  tone: string;
  topics: string[];
  rss_sources: string[];
  min_length: number;
  max_length: number;
  config: PersonaConfigDNA;
}

interface Phase1Result {
  name: string;
  description: string;
  tone: string;
  topics: string[];
}

interface Phase2Result {
  core_thesis: string;
  the_enemy: string;
  analytical_framework: string;
  framing_bias: string;
  hook_mechanics: string;
  structural_archetypes: { name: string; description: string; example: string }[];
  validation_checklist: string[];
  anti_patterns: string;
}

// ─── Designer Class ───────────────────────────────────────────────────────────

export class PersonaDesigner {
  async design(
    prompt: string,
    platform: "twitter" | "linkedin"
  ): Promise<PersonaDesignResult> {
    const client = await getDeepseekClientAsync();

    // ── Phase 1: Identity & Voice ──────────────────────────────────────────
    // Lower temperature (0.4) for structured JSON compliance.
    // The description field will still be expressive because the instructions are expressive.

    const phase1Response = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 1200,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PHASE_1_SYSTEM_PROMPT(platform) },
        {
          role: "user",
          content: `Design a ${platform} persona for this goal: ${prompt}
          
The persona should feel like a real practitioner in this space — someone whose posts you'd 
forward to a colleague, not someone you'd scroll past.`,
        },
      ],
    });

    const phase1Raw = phase1Response.choices[0].message.content;
    if (!phase1Raw) throw new Error("Phase 1 returned no content.");

    let phase1: Phase1Result;
    try {
      phase1 = JSON.parse(this.stripJsonFences(phase1Raw)) as Phase1Result;
    } catch {
      console.error("Phase 1 parse failure:", phase1Raw);
      throw new Error("Failed to parse Phase 1 persona identity. Retry requested.");
    }

    this.validatePhase1(phase1);

    // ── Phase 2: DNA & Mechanics ────────────────────────────────────────────
    // Phase 2 gets the Phase 1 output as context so fields are grounded in
    // the specific persona, not generated generically.

    const phase2Response = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 1400,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PHASE_2_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Complete the operational DNA for this ${platform} persona:

NAME: ${phase1.name}
DESCRIPTION: ${phase1.description}
TONE: ${phase1.tone}
TOPICS: ${phase1.topics.join(", ")}

Generate the DNA fields that are specific to this persona's industry, beliefs, and voice.
Do not produce generic fields — every answer must be grounded in the specific identity above.`,
        },
      ],
    });

    const phase2Raw = phase2Response.choices[0].message.content;
    if (!phase2Raw) throw new Error("Phase 2 returned no content.");

    let phase2: Phase2Result;
    try {
      phase2 = JSON.parse(this.stripJsonFences(phase2Raw)) as Phase2Result;
    } catch {
      console.error("Phase 2 parse failure:", phase2Raw);
      throw new Error("Failed to parse Phase 2 persona DNA. Retry requested.");
    }

    this.validatePhase2(phase2);

    // ── Assemble Final Result ──────────────────────────────────────────────

    const config: PersonaConfigDNA = {
      core_thesis: phase2.core_thesis,
      the_enemy: phase2.the_enemy,
      analytical_framework: phase2.analytical_framework,
      framing_bias: phase2.framing_bias,
      hook_mechanics: phase2.hook_mechanics,
      voice_dna: phase1.tone,
      anti_patterns: phase2.anti_patterns,
      structural_archetypes: phase2.structural_archetypes,
      validation_checklist: phase2.validation_checklist,
      identity_context: phase1.description,
      source_logic: "",
      format_rules: this.buildFormatRules(platform),
      image_probability: 0,
      headlines_to_fetch: 12,
      headlines_in_prompt: 6,
    };

    return {
      name: phase1.name,
      description: phase1.description,
      tone: phase1.tone,
      topics: phase1.topics,
      rss_sources: [],
      min_length: platform === "linkedin" ? 600 : 140,
      max_length: platform === "linkedin" ? 2200 : 280,
      config,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private stripJsonFences(raw: string): string {
    return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  private buildFormatRules(platform: "twitter" | "linkedin"): string[] {
    return platform === "twitter"
      ? [
          "First person, present tense.",
          "Numbers are naked: 37%, not thirty-seven percent.",
          "No hashtags, no emojis.",
          "Vary sentence length for rhythm.",
          "No em-dashes mid-sentence.",
          "Never start with 'I'.",
        ]
      : [
          "Blank line between every paragraph — mandatory.",
          "First person, present tense.",
          "Numbers integrated into narrative sentences.",
          "No corporate phrases or CTAs.",
          "Short paragraphs: 1–3 sentences each.",
          "No hashtags.",
        ];
  }

  private validatePhase1(result: Partial<Phase1Result>): void {
    const missing: string[] = [];
    if (!result.name?.trim()) missing.push("name");
    if (!result.description || result.description.length < 200) missing.push("description (too short — must be 200+ chars)");
    if (!result.tone?.trim()) missing.push("tone");
    if (!Array.isArray(result.topics) || result.topics.length < 3) missing.push("topics (need at least 3)");

    if (missing.length > 0) {
      throw new Error(`Phase 1 output missing or invalid fields: ${missing.join(", ")}`);
    }
  }

  private validatePhase2(result: Partial<Phase2Result>): void {
    const missing: string[] = [];
    if (!result.core_thesis?.trim()) missing.push("core_thesis");
    if (!result.the_enemy?.trim()) missing.push("the_enemy");
    if (!result.analytical_framework?.trim()) missing.push("analytical_framework");
    if (!result.hook_mechanics?.trim()) missing.push("hook_mechanics");
    if (!Array.isArray(result.structural_archetypes) || result.structural_archetypes.length === 0) missing.push("structural_archetypes");
    if (!Array.isArray(result.validation_checklist) || result.validation_checklist.length < 4) missing.push("validation_checklist (need at least 4)");

    if (missing.length > 0) {
      throw new Error(`Phase 2 output missing or invalid fields: ${missing.join(", ")}`);
    }
  }
}

export const personaDesigner = new PersonaDesigner();