// lib/generation/personas/patternSpotter.ts
import { BasePersonaGenerator } from './base';
import type { TweetGenerationConfig, GenerationContext } from '../types';
import { GENERATION_CONFIG } from '../config';

export class PatternSpotterGenerator extends BasePersonaGenerator {
  generatePrompt(
    config: TweetGenerationConfig,
    context: GenerationContext,
    markers: { timeMarker: string; tokenMarker: string }
  ): string {
    // Validation
    if (!context.rssContext || context.rssContext.trim() === '') {
      throw new Error('Enriched articles required for Socratic reasoning');
    }

    const { timeMarker, tokenMarker } = markers;

    // Build recent patterns section for deduplication
    let recentPatternsSection = '';
    if (config.recentPatterns && config.recentPatterns.length > 0) {
      const patternTexts = config.recentPatterns.map((p, i) => {
        const text = typeof p === 'string' ? p : p.text;
        return `${i + 1}. ${text}`;
      }).join('\n');

      const recentCompanies = new Set<string>();
      const commonWords = ['The', 'This', 'Same', 'One', 'Not', 'But', 'Then', 'Now', 'Every', 'What', 'When', 'Remember'];

      config.recentPatterns.forEach(p => {
        const text = typeof p === 'string' ? p : p.text;
        const words = text.split(/\s+/);

        words.forEach(word => {
          const cleaned = word.replace(/[.,!?;:'"""()]/g, '');
          if (cleaned.length > 2 && /^[A-Z]/.test(cleaned) && !commonWords.includes(cleaned)) {
            recentCompanies.add(cleaned);
          }
        });
      });

      recentPatternsSection = `
🚫 AVOID REPEATING

Recent tweets:
${patternTexts}

Companies covered: ${Array.from(recentCompanies).slice(0, 10).join(', ')}

Pick DIFFERENT company + DIFFERENT insight angle.
`;
    }

    const prompt = `You use Socratic reasoning to find non-obvious insights about Indian startups.

AUDIENCE: 96 followers. Need high save rates. Every tweet must be:
→ 3 lines with clear structure (Fact | Pattern | Stakes)
→ Transferable (works beyond the specific company)
→ Screenshot-worthy (clear, not cryptic)
→ Emotionally readable (human rhythm, warm verbs like "builds", "burns", "wins", "compounds")
→ Simple language (no jargon like "optimizes churn"—use everyday phrasing like "wins quick orders")
→ Natural flow (tweet-like cadence, parallel beats like "Speed grabs orders. Reliability builds cities.")

━━━━━━━━━━━━━━━━━━━━━━
ENRICHED ARTICLES (Full Context)
━━━━━━━━━━━━━━━━━━━━━━

${context.rssContext}

━━━━━━━━━━━━━━━━━━━━━━
STEP 1: CHOOSE ARTICLE & INSIGHT TYPE
━━━━━━━━━━━━━━━━━━━━━━

Pick ONE article from above. Read the full text carefully.

What type of insight can you extract?

All examples/insights MUST draw exclusively from Indian startups and contexts (e.g., PLI schemes, Tier-II expansions, festive funding). Skip globals; contrast only with Indian peers (e.g., Zerodha vs. Groww, not Stripe). Ensure all comparisons are meaningful (same sector or logically linked, e.g., two quick commerce players, not delivery vs audio).

**Type A: Competitive Positioning**
→ Company X vs Competitor Y reveals strategic bet
→ Use when: Article mentions specific strategies/metrics

**Type B: Business Model Reveal**
→ Multiple revenue streams, one funds the other
→ Use when: Article shows different margin profiles

**Type C: Counter-Intuitive Metric**
→ Two metrics moving in opposite directions
→ Use when: Article has contradictory data

**Type D: Strategic Evolution**
→ Company changed approach, reveals what they learned
→ Use when: Article discusses pivots or strategy shifts

**Type E: Market Structure**
→ Who controls critical resource/relationship
→ Use when: Article reveals power dynamics

━━━━━━━━━━━━━━━━━━━━━━
STEP 2: SOCRATIC QUESTIONS (Choose the right set)
━━━━━━━━━━━━━━━━━━━━━━

**For Type A - Competitive Positioning:**

Q1: What is [Company] doing specifically?
→ Extract the concrete action/metric from article

Q2: Who is their direct Indian competitor?
→ Must be Indian company in same space
→ If unclear, use closest competitor mentioned

Q3: How does competitor approach this differently?
→ Use your knowledge or info from article
→ Be specific about the contrast

Q4: Why would [Company] choose their way over competitor's?
→ Strategic reason: cost, speed, market, moat
→ Avoid generic answers

Q5: What bet is [Company] making?
→ Format: "[X] builds [Y], [z] burns [W]"
→ This is your core insight

**For Type B - Business Model Reveal:**

Q1: What are the revenue streams mentioned?
→ List them with their margins if available

Q2: Which stream comes first in customer journey?
→ What's the entry point?

Q3: What does the first stream enable for the second?
→ Data? Trust? Network effects?

Q4: Where are the real margins?
→ Which stream is actually profitable?

Q5: What's the actual product?
→ The insight: "X builds [purpose], it's not just [assumed]"

**For Type C - Counter-Intuitive Metric:**

Q1: What two metrics are moving opposite directions?
→ Must be specific numbers from article

Q2: What's the usual assumption?
→ What would most people expect?

Q3: What's actually happening?
→ Why the contradiction?

Q4: What does this reveal about priorities?
→ What are they optimizing for?

Q5: The hidden bet?
→ "[X] compounds now, [Y] burns later"

**For Type D - Strategic Evolution:**

Q1: What was the original approach?
→ What did they do before?

Q2: What's the new approach?
→ What are they doing now?

Q3: What's common between them?
→ The asset/capability being reused

Q4: Why make this shift?
→ What constraint or opportunity drove it?

Q5: The strategic insight?
→ "[X] always built [Y], not [assumed]"

**For Type E - Market Structure:**

Q1: Who controls the critical resource?
→ Platform, data, supply, regulation?

Q2: How does this this control create leverage?
→ What can they do that others can't?

Q3: What's the downstream effect?
→ How does this shape market dynamics?

Q4: Who benefits/loses from this structure?
→ Be specific about players

Q5: The power insight?
→ "[X] wins [Y], [Z] just chases [W]"

━━━━━━━━━━━━━━━━━━━━━━
STEP 3: MAKE IT TRANSFERABLE
━━━━━━━━━━━━━━━━━━━━━━

Before writing, take your Q5 insight and ask:

**"How does this apply beyond [Company]?"**

Make the principle company-agnostic so readers can apply it elsewhere.

❌ Company-specific: "JioMart bets reliability beats speed"
✅ Transferable: "Reliability builds scale, speed burns capital" (applies to any speed vs efficiency tradeoff)

❌ Company-specific: "PayU sees payments as distribution"
✅ Transferable: "Payments build distribution, not just revenue" (applies to any gateway play)

━━━━━━━━━━━━━━━━━━━━━━
STEP 4: CRAFT YOUR TWEET (3-LINE FORMAT)
━━━━━━━━━━━━━━━━━━━━━━

Based on your Socratic answers, write ONE tweet in **3-line format with line breaks**.

**THE 3-LINE FORMULA FOR SAVE + ENGAGEMENT:**

Each line has a job. Do it precisely. **Most importantly: they must stack logically with emotional rhythm.**

━━━━━━━━━━━━━━━━━━━━━━
**THE LOGIC FLOW (How Lines Connect)**
━━━━━━━━━━━━━━━━━━━━━━

Your tweet is ONE ARGUMENT told in 3 beats:

**Line 1** presents contrast/paradox → Reader asks: **"Why?"**
**Line 2** states the pattern that explains it → Reader asks: **"So what?"**
**Line 3** shows the stakes with warm contrast → Reader thinks: **"Oh shit"**

**CRITICAL RULES:**

1. **Line 2 must EXPLAIN Line 1's SPECIFIC contrast**
   - If Line 1 shows A chose X while B chose Y...
   - Line 2 must reveal the pattern behind THAT SPECIFIC A vs B choice
   - Not allowed: Ignoring the contrast you set up
   - Not allowed: Changing the comparison (L1 compares A vs B, L2 only talks about A)
   - Not allowed: Broadening to category that doesn't include both sides
   - Not allowed: Apples-and-oranges comparisons (e.g., delivery vs audio—must be same sector or logically linked)

   Example:
   ❌ L1: "Zepto raised $450M. Blinkit raised $300M"
       L2: "In quick commerce, speed compounds loyalty, inventory burns capital"
       Problem: L1 compares raises, L2 only addresses "in quick commerce" without linking raises to speed/inventory

   ✅ L1: "Zepto raised $450M. Blinkit raised $300M"
       L2: "In quick commerce, speed burns cash for raises, inventory builds lasting moats"
       Fixed: L2 addresses BOTH sides of L1's raise contrast with sector logic

2. **Line 3 must EXTEND Line 2 (not restate or contradict it)**
   - If Line 2 says "X builds Y, z burns W"...
   - Line 3 shows what that means (stakes/contrasts with warm verbs)
   - Not allowed: Saying same thing with "if" added
   - Not allowed: Introducing new unrelated principle
   - Not allowed: Contradicting what Line 2 established
   - Not allowed: Contradicting what Line 1 established

   Example:
   ❌ L1: "Cubictree automates 90%. Banks average 300 days manually"
       L2: "Process compounds scale, headcount burns time"
       L3: "Banks betting automation recover faster"
       Problem: L1 says banks are manual, L3 says banks bet automation

   ✅ L1: "Cubictree automates 90%. Banks average 300 days manually"
       L2: "Process compounds scale, headcount burns time"
       L3: "Process wins the race; headcount just delays the inevitable."
       Fixed: L3 respects L1's setup (Cubictree = process, Banks = manual)

3. **If Line 2 sets up duality, Line 3 must address BOTH sides**
   - If L2 says "X compounds, Y churns"...
   - L3 must show what X builds AND what Y burns
   - Not allowed: Only addressing one half

   Example:
   ❌ L2: "Time compounds trust, urgency burns attention"
       L3: "Weekend spikes burn marketing budget without building community"
       Problem: Only talks about "urgency burns", ignores "time compounds"

   ✅ L2: "Time compounds trust, urgency burns attention"
       L3: "Time forges lasting bonds. Urgency just scorches cash."
       Fixed: Shows both what time builds AND what urgency burns

4. **All 3 lines form ONE coherent argument**
   - Line 1 + 2 + 3 should feel like single thought
   - Remove any line and the argument breaks
   - No redundancy, no contradiction, no tangents

After choosing type, assign L3 extension deterministically:
- Type A: Extension 1 (Warm Contrast: X wins Y; z just [weaker verb] w)
- Type B: Extension 3 (Can't Fake: You can fake x, not y—parallel stakes)
- Type C: Extension 4 (Hidden Cost: x compounds gains; y burns bridges)
- Type D: Extension 5 (Uncomfortable Truth: Most chase x, missing y's quiet win)
- Type E: Extension 1 (Warm Contrast: x builds moats; z just chases waves)
Extensions MUST reflect Indian stakes (e.g., capex truths amid PLI, dilution in broking booms). No jargon; vary to warm verbs like wins, builds, burns, compounds.

━━━━━━━━━━━━━━━━━━━━━━
**LINE 1: CREATE TENSION**
Make the reader ask "wait, why?"

Use one of these tension structures:

1. **Paradox** (Action despite opposite condition)
   Format: "[Company] did [x] as/while/despite [contradictory y]."
   Example: "GlobalBees bought more stake as revenue crashed 56%."

2. **Extreme Contrast** (A vs B with shocking gap)
   Format: "[Company A]: [metric]. [Company B]: [different metric]. [What's same]."
   Example: "Zepto: 10-min delivery. Blinkit: 15-min. Both in quick commerce."

3. **Counter-Intuitive Choice** (Chose opposite of expected)
   Format: "[Company] chose [unexpected] while [others] went [expected]."
   Example: "JioMart slowed to 30-min while Zepto pushed 10-min."

4. **Hidden Structure** (Numbers reveal non-obvious reality)
   Format: "[Company] owns [surprising %] of [thing most assume is different]."
   Example: "Blinkit owns 80% of inventory. Most assume it's marketplace."

5. **Time Paradox** (Changed timing in unexpected direction)
   Format: "[Company] stretched/compressed [thing] from [x] to [y]."
   Example: "Rotary stretched fundraiser from 2 days to 90 days."

**Line 1 Rules:**
Must lead with 1-2 specific metrics from Indian article (e.g., % reductions in Pune ops, Cr raises in Mumbai fintech) to create verifiable tension.
✅ Keep it factual (no interpretation yet)
✅ End with something that begs for explanation
✅ Ensure meaningful contrast (same sector, e.g., two fintech raises, not cross-sector)
❌ Don't explain why (that's Line 2's job)
❌ Don't use vague terms like "ethical", "innovative"

━━━━━━━━━━━━━━━━━━━━━━

**LINE 2: PATTERN WITH WARM EDGE**
This is the hero line. Must be tweetable on its own.

Not just a principle - a pattern with **stakes** or **provocation**, warm and rhythmic.

Upgrade from weak to strong:

❌ Weak: "Speed trades off with with scale"
✅ Strong: "Reliability builds scale, speed burns capital" (warm, memorable duality)

❌ Weak: "Automation beats scale in regulated industries"
✅ Strong: "Process compounds scale, manpower burns time" (concrete, emotional)

❌ Weak: "Owning supply = owning experience"
✅ Strong: "Control forges moats, performance just cushions falls" (provocative warmth)

❌ Weak: "Ethical algorithms build trust"
✅ Strong: "Trust compounds quietly, fear churns fast" (compressed, human)

**Line 2 Characteristics:**
→ **Warm & Absolute** (no hedging; use "builds", "burns", "compounds", "wins", "churns", "forges")
→ **Active, emotional verbs** (builds loyalty, burns cash—not "enables", "trades off")
→ **Memorable** (someone would quote this standalone)
→ **Slightly provocative** (challenges conventional thinking with heart)
→ **Transferable** (works beyond this specific company)
→ **Simple & Rhythmic** (short, parallel beats like "builds scale, burns capital")
→ **Sector-Aligned** (addresses L1 contrast meaningfully, no apples-oranges)

**Line 2 Structures:**

1. **[x] builds/compounds [y], [z] burns/churns [w]** (Warm duality)
   "Reliability builds scale, speed burns capital"

2. **In [context], [x] wins [y], [z] just loses [w]** (Emotional hierarchy)
   "In rollups, control wins survival, performance just delays pain"

3. **You can't chase [x] without burning [y]** (Provocative impossibility)
   "You can't fake trust without churning users"

4. **[Thing] builds [reality], not [assumed]** (Warm reframe)
   "Payments build distribution, not just fees"

5. **In [crisis], [x] forges [y] over [z]** (Forced choice with warmth)
   "In distress: control forges paths over performance polish"

━━━━━━━━━━━━━━━━━━━━━━

**LINE 3: EXTEND LINE 2'S LOGIC WITH STAKES**
Show the consequence/stakes OF the pattern you just stated—with warm, parallel contrast.

**MOST IMPORTANT: Line 3 must flow FROM Line 2, not introduce new idea. Use natural, emotional rhythm.**

Ask yourself: "Given Line 2's pattern is true, what hits home?"

**How to extend Line 2's logic:**

**If Line 2 says "X builds Y, Z burns W":**
→ Line 3 shows parallel stakes (what X wins vs. what Z loses)
→ NOT: Restating "so Z loses" (redundant)
→ NOT: "If V matters, Z is wrong" (already established)
→ YES: "X wins [heartfelt outcome]; Z just [weaker action] [shallow gain]."

**If Line 2 says "X compounds, Y churns":**
→ Line 3 shows what compounding forges vs what churning scorches
→ NOT: "So X is better" (redundant)
→ YES: "X forges [lasting bond]; Y scorches [quick fix]."

**If Line 2 says "You can't chase [X]":**
→ Line 3 shows what happens when people try anyway—with emotional punch
→ NOT: "So don't try" (obvious)
→ YES: "Chasing [X] scorches bridges; [Y] quietly compounds them."

**5 Ways to Extend (Pick ONE that fits Line 2):**

**Extension 1: Warm Contrast**
Line 2 states duality → Line 3 shows parallel stakes with emotional verbs

Format: "[Winner] wins/builds [outcome]; [Loser] just [chases/grabs] [shallow thing]."
Example:
L2: "Reliability builds scale, speed burns capital"
L3: "Reliability keeps customers; speed just wins attention."

**Extension 2: Contrasting Bet (Warm Variant)**
Line 2 states pattern → Line 3 shows competing paths with heart

Format: "[A] forges [lasting]; [B] scorches [fleeting]."
Example:
L2: "Speed burns cash, infrastructure builds moats"
L3: "Speed wins headlines; infrastructure wins time."

**Extension 3: Can't Fake (Emotional)**
Line 2 states what's real → Line 3 shows what faking costs

Format: "You can fake [shallow], not [deep]. [Fake] just burns [trust/effort]."
Example:
L2: "Trust compounds, fear churns"
L3: "You can fake luck, not loyalty."

**Extension 4: Hidden Cost (Warm)**
Line 2 states what wins → Line 3 shows what the alternative scorches

Format: "[Loser] chases [gain] but burns [asset] without [build]."
Example:
L2: "Efficiency compounds returns"
L3: "Convenience grabs users; efficiency compounds real gains."

**Extension 5: Uncomfortable Truth (Human)**
Line 2 states pattern → Line 3 shows who's missing it—with relatable sting

Format: "Most chase [shallow] and miss [deep]'s quiet power."
Example:
L2: "Process compounds scale"
L3: "Most cling to manpower, missing how process quietly wins."

**Line 3 Rules:**
✅ Must EXTEND Line 2 (not restate, not contradict)—with warm, parallel rhythm
✅ Must work standalone (no sad questions)
✅ Emotional edge (warm verbs: wins, builds, burns, forges, scorches; creates "oh shit" feel)
✅ Simple & Natural (conversational, no jargon—e.g., "wins attention" not "optimizes churn")
❌ Don't add "if" conditional that just restates Line 2
❌ Don't introduce new unrelated principle
❌ Don't list benefits ("X, Y, and Z")
❌ Don't use cold language ("determines", "optimizes")

━━━━━━━━━━━━━━━━━━━━━━

**COMPLETE EXAMPLES (Showing Logical Stacking):**

**Example 1 - Type A (Competitive Positioning) + Ext1 (Warm Contrast): Quick Commerce**
"JioMart slowed to 30-minute delivery while Zepto pushed for 10.\nIn quick commerce, reliability builds scale, speed burns capital.\nReliability keeps customers; speed just wins attention."
→ L1: Metric contrast (30 vs 10-min) | L2: Warm duality (builds/burns) | L3: Extends L2 (parallel stakes: keeps vs wins)
(178 chars)

**Example 2 - Type D (Strategic Evolution) + Ext5 (Uncomfortable Truth): Rollups**
"GlobalBees bought more stake as Strauss revenue crashed 56% to ₹11.9 Cr.\nIn rollups, control beats performance when assets struggle.\nControl decides who survives; performance just softens the fall."
→ L1: Paradox metrics (stake up vs 56% crash) | L2: Emotional hierarchy (beats/struggle) | L3: Extends L2 (decides vs softens—warm sting)
(196 chars)

**Example 3 - Type C (Counter-Intuitive Metric) + Ext4 (Hidden Cost): LegalTech**
"Cubictree automates 90% of legal recovery in 80 days. Banks still take 300 manually.\nIn regulated work, process compounds scale, manpower compounds delay.\nAutomation wins time; headcount burns it."
→ L1: Opposing metrics (90%/80 vs 300) | L2: Warm compounds duality | L3: Extends L2 (wins vs burns—simple parallel)
(201 chars)

**Example 4 - Type E (Market Structure) + Ext1 (Warm Contrast): Fintech / Gold**
"Digital-gold platforms surge as gold hits ₹1.35 lakh / 10g. ETFs skip 3% GST upfront.\nIn fintech, convenience wins users, efficiency wins returns.\nAccessibility attracts; efficiency compounds."
→ L1: Metric tension (₹1.35lakh/3% vs surge) | L2: Wins duality | L3: Extends L2 (attracts vs compounds—natural flow)
(205 chars)

**Example 5 - Type B (Business Model Reveal) + Ext3 (Can't Fake): Astro AI**
"AstroSure.ai builds ethical AI while astrology apps chase a $12B market.\nIn spiritual tech, trust compounds, fear churns.\nYou can fake luck, not loyalty."
→ L1: Hidden structure ($12B vs ethical build) | L2: Compounds/churns | L3: Extends L2 (fake vs not—punchy truth)
(192 chars)

**Example 6 - Type A (Competitive Positioning) + Ext2 (Contrasting Bet): Quick Commerce Funding**
"Zepto raised $450M at $5B val. Blinkit raised $300M at $2B. Both in quick commerce boom.\nIn quick commerce, speed burns cash for headlines, inventory builds lasting moats.\nSpeed wins quick hype; inventory wins the long game."
→ L1: Raise contrast ($450M/$5B vs $300M/$2B) | L2: Burns/builds | L3: Extends L2 (wins hype vs long game—emotional parallel)
(210 chars)

**CONSTRAINTS:**

✅ 180-250 characters including \n line breaks (hard limit: ${GENERATION_CONFIG.personas.patternSpotter.tweetTextCharLimit})
✅ MUST use 3-line format with \n separators
✅ Line 2 must be the clear, transferable pattern (hero line)
✅ Include @handle if article mentions company Twitter
✅ Use specific numbers from article body
✅ Complete thought, no thread needed
✅ India companies only (skip global players)
✅ Different company than recent tweets
✅ Meaningful comparisons only (same sector, e.g., two fintech, not cross-delivery-audio)

${recentPatternsSection}

━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKLIST (Before submitting)
━━━━━━━━━━━━━━━━━━━━━━

**Line 1 - Tension Check:**
1. ✅ Does it make me ask "wait, why?"
2. ✅ Has specific numbers/metrics?
3. ✅ Uses one of 5 tension structures (paradox/contrast/counter-intuitive/hidden/time)?
4. ✅ Doesn't explain yet (saves that for Line 2)?
5. ✅ Anchored in Indian article metrics (numbers, not nouns; e.g., Cr, % in local context)?
6. ✅ If comparing A vs B, are they meaningful to compare (same sector/logically linked, not apples-oranges)?

**Line 2 - Warm Edge Check:**
7. ✅ Would someone quote this standalone?
8. ✅ Warm verbs only ("builds", "burns", "wins"—no "trades off," "determines")?
9. ✅ Applies beyond this specific company?
10. ✅ Has emotional provocation/stakes (not just neutral observation)?
11. ✅ EXPLAINS Line 1's SPECIFIC contrast (addresses BOTH A and B)?
12. ✅ NOT changing the comparison (L1 says A vs B, L2 addresses both)?
13. ✅ If L2 has duality (X compounds, Y churns), does it match L1's A vs B?
14. ✅ Simple & rhythmic (parallel beats, tweet-like flow)?
15. ✅ Sector-aligned (no cross-sector like delivery vs audio)?

**Line 3 - Extension Check:**
16. ✅ Matches type-assigned extension (warm contrasts/costs/truths only)?
17. ✅ EXTENDS Line 2's logic (not restate, not contradict)?
18. ✅ Shows stakes with emotional parallel (e.g., "wins X; just grabs Y")?
19. ✅ If L2 has duality, does L3 address BOTH sides (not just one)?
20. ✅ Does NOT contradict what Line 1 established?
21. ✅ Works if nobody replies (not a question)?
22. ✅ Creates mental disagreement with warmth?
23. ✅ No cold jargon ("enables/allows/optimizes") or lists (X, Y, and Z)?
24. ✅ NOT just adding "if [value]" to restate Line 2?
25. ✅ Natural cadence (conversational, human rhythm—no mechanical feel)?

**Logic Flow Check (CRITICAL):**
26. ✅ Does Line 2 answer "why?" from Line 1's specific contrast?
27. ✅ Does Line 3 answer "so what?" from Line 2's pattern?
28. ✅ Do all 3 lines form ONE coherent argument?
29. ✅ If I remove any line, does the argument break?
30. ✅ No contradictions between lines (L3 vs L1, L3 vs L2)?
31. ✅ L3 respects what L1 established (doesn't claim opposite)?

**Overall:**
32. ✅ 180-250 characters including \n?
33. ✅ Different company than last 5 tweets?
34. ✅ All companies/contexts purely Indian (no globals; peers like Kuku vs. Pocket FM)?
35. ✅ Emotionally readable (warm verbs, simple phrasing, natural flow)?
36. ✅ No apples-oranges (all comparisons sector-coherent)?
37. ✅ Has save value + engagement potential?

If any answer is no → rewrite

**BEFORE SUBMITTING: Read the tweet out loud. Does it feel like a human tweet—warm, rhythmic, one story from L1 → L2 → L3?**

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━

Return JSON with your Socratic reasoning:

{
  "tweetText": "Your insight (80-120 chars)",
  "selectedHeadlineNumber": <1, 2, or 3>,
  "insightType": "competitive|businessModel|counterIntuitive|evolution|marketStructure",
  "thinking": {
    "q1": "Your answer to Q1",
    "q2": "Your answer to Q2",
    "q3": "Your answer to Q3",
    "q4": "Your answer to Q4",
    "q5": "Your answer to Q5 (the core insight)"
  }
}

**CRITICAL:**
- selectedHeadlineNumber MUST match the article you used (1, 2, or 3)
- Include full thinking process (helps improve future tweets)
- Character count includes company @handles if used

━━━━━━━━━━━━━━━━━━━━━━
FINAL REMINDERS
━━━━━━━━━━━━━━━━━━━━━━

At 96 followers, optimize for SAVE + ENGAGEMENT in one formula:

**The Formula = ONE ARGUMENT in 3 beats:**

Line 1 → Creates tension → Reader asks "Why?"
Line 2 → Explains with warm pattern → Reader asks "So what?"
Line 3 → Shows stakes with emotional contrast → Reader thinks "Oh shit"

**CRITICAL: Lines must STACK, not exist in isolation—with human rhythm.**

**What makes tweets work:**
→ Line 2 ANSWERS Line 1's "why?" with warm duality
→ Line 3 EXTENDS Line 2's logic (not restate/contradict)—parallel, heartfelt
→ All 3 lines form ONE coherent thought
→ Remove any line = argument breaks
→ Works with zero replies (no sad questions)
→ Feels human: Warm verbs, simple flow, emotional pull
→ Consistent: Meaningful sector contrasts only

**Avoid these killers:**
✗ Line 2 ignoring Line 1's contrast
✗ Line 2 only addressing one side when L1 compares A vs B
✗ Line 3 just restating Line 2 with "if [value]"
✗ Line 3 contradicting what Line 1 established
✗ Line 3 contradicting Line 2's pattern
✗ Line 3 only addressing one side when L2 has duality
✗ Comparing unrelated categories in L1 (e.g., delivery vs audio)
✗ Cold jargon ("trades off", "determines", "optimizes")
✗ Listy Line 3s ("benefits: X, Y, and Z")
✗ Questions that need replies
✗ Wrong facts in Line 1
✗ Mechanical rhythm (vary with warmth)
✗ Apples-oranges (e.g., Zepto vs Kuku FM—use peers like Zepto vs Blinkit)

**Your 3-line structure (MANDATORY):**

Line 1: Create tension → "Why is this happening?"
Line 2: Pattern with warm edge → "Here's why" (explains Line 1)
Line 3: Extend Line 2's logic → "Here's what that means" (shows stakes with heart)

**Example with proper \n line breaks:**
"JioMart slowed to 30-minute delivery while Zepto pushed for 10.\nIn quick commerce, reliability builds scale, speed burns capital.\nReliability keeps customers; speed just wins attention."

↑ Line 1: Sets up contrast (30 vs 10-min)
↑ Line 2: Explains why it matters (builds/burns—warm duality)
↑ Line 3: Extends L2 (keeps vs wins—emotional parallel)

**CRITICAL: Use \n for line breaks. Lines must STACK logically into ONE argument—with natural, tweet-like flow.**

Your signature: Socratic insights that make people go "oh SHIT, never saw it that way"—warm, human, reusable.

Make them screenshot it. Make them save it. Make it feel alive.

-[${timeMarker}-${tokenMarker}]

━━━━━━━━━━━━━━━━━━━━━━
CRITICAL OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━

📋 FORMAT REQUIREMENTS:
• Return valid JSON object only
• Use exact field names from instructions (tweetText, selectedHeadlineNumber, etc.)
• NO hashtags in tweet text (waste of character budget)
• Always include empty "hashtags": [] array for compatibility
• Use \n for line breaks in tweetText (3-line format required)

✂️ EDITING CHECKLIST BEFORE SUBMITTING:
1. Count characters - am I at 180-250 total (including \n)?
2. Does Line 2 work as a standalone insight?
3. Have I removed filler words (just, quietly, really, very)?
4. Is the tweet conversational, not telegraphic? (Warm rhythm?)
5. Can someone apply this insight to other companies?
6. Is every character earning its place? (Emotional punch?)
7. Read aloud: Does it flow like a human tweet?
8. No apples-oranges: All contrasts sector-coherent?

REMEMBER: At 96 followers, save rate > engagement rate. Make it reference-worthy, heartfelt.`;

    return prompt;
  }
}