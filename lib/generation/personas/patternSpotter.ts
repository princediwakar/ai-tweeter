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
→ 3 lines with clear structure (Setup | Insight | Implication)
→ Transferable (works beyond the specific company)
→ Screenshot-worthy (clear, not cryptic)

━━━━━━━━━━━━━━━━━━━━━━
ENRICHED ARTICLES (Full Context)
━━━━━━━━━━━━━━━━━━━━━━

${context.rssContext}

━━━━━━━━━━━━━━━━━━━━━━
STEP 1: CHOOSE ARTICLE & INSIGHT TYPE
━━━━━━━━━━━━━━━━━━━━━━

Pick ONE article from above. Read the full text carefully.

What type of insight can you extract?

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
→ Format: "[X] beats [Y]" or "[X] creates [Y]"
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
→ The insight: "X isn't product, it's [purpose] for Y"

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
→ "[X] now, fix [Y] later" or "[X] over [Y]"

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
→ "[X] was really about [Y]" or "[Asset] beats [new build]"

**For Type E - Market Structure:**

Q1: Who controls the critical resource?
→ Platform, data, supply, regulation?

Q2: How does this control create leverage?
→ What can they do that others can't?

Q3: What's the downstream effect?
→ How does this shape market dynamics?

Q4: Who benefits/loses from this structure?
→ Be specific about players

Q5: The power insight?
→ "[X] controls [Y], determines [Z]"

━━━━━━━━━━━━━━━━━━━━━━
STEP 3: MAKE IT TRANSFERABLE
━━━━━━━━━━━━━━━━━━━━━━

Before writing, take your Q5 insight and ask:

**"How does this apply beyond [Company]?"**

Make the principle company-agnostic so readers can apply it elsewhere.

❌ Company-specific: "JioMart bets reliability beats speed"
✅ Transferable: "Slower delivery, lower ops cost, wider reach" (applies to any speed vs efficiency tradeoff)

❌ Company-specific: "PayU sees payments as distribution"
✅ Transferable: "Payments aren't product, they're distribution for higher-margin services" (applies to Stripe, Square, etc.)

━━━━━━━━━━━━━━━━━━━━━━
STEP 4: CRAFT YOUR TWEET (3-LINE FORMAT)
━━━━━━━━━━━━━━━━━━━━━━

Based on your Socratic answers, write ONE tweet in **3-line format with line breaks**.

**THE 3-LINE FORMULA FOR SAVE + ENGAGEMENT:**

Each line has a job. Do it precisely. **Most importantly: they must stack logically.**

━━━━━━━━━━━━━━━━━━━━━━
**THE LOGIC FLOW (How Lines Connect)**
━━━━━━━━━━━━━━━━━━━━━━

Your tweet is ONE ARGUMENT told in 3 beats:

**Line 1** presents contrast/paradox → Reader asks: **"Why?"**
**Line 2** states the principle that explains it → Reader asks: **"So what?"**
**Line 3** shows the consequence/bet/stakes OF that principle → Reader thinks: **"Oh shit"**

**CRITICAL RULES:**

1. **Line 2 must EXPLAIN Line 1's SPECIFIC contrast**
   - If Line 1 shows A chose X while B chose Y...
   - Line 2 must reveal the principle behind THAT SPECIFIC A vs B choice
   - Not allowed: Ignoring the contrast you set up
   - Not allowed: Changing the comparison (L1 compares A vs B, L2 only talks about A)
   - Not allowed: Broadening to category that doesn't include both sides

   Example:
   ❌ L1: "Kuku FM raised $85M. Zepto raised $450M"
       L2: "In content, engagement compounds, delivery churns"
       Problem: L1 compares content vs delivery, L2 only addresses "in content"

   ✅ L1: "Kuku FM raised $85M. Zepto raised $450M"
       L2: "Content compounds engagement, delivery burns capital on speed"
       Fixed: L2 addresses BOTH sides of L1's contrast

2. **Line 3 must EXTEND Line 2 (not restate or contradict it)**
   - If Line 2 says "X beats Y"...
   - Line 3 shows what that means (consequences/bets/what gets determined)
   - Not allowed: Saying same thing with "if" added
   - Not allowed: Introducing new unrelated principle
   - Not allowed: Contradicting what Line 2 established
   - Not allowed: Contradicting what Line 1 established

   Example:
   ❌ L1: "Cubictree automates 90%. Banks average 300 days manually"
       L2: "Process beats headcount"
       L3: "Banks betting automation recover faster"
       Problem: L1 says banks are manual, L3 says banks bet automation

   ✅ L1: "Cubictree automates 90%. Banks average 300 days manually"
       L2: "Process beats headcount"
       L3: "Cubictree bets automation. Banks bet headcount. Delays compound."
       Fixed: L3 respects L1's setup (Cubictree = automation, Banks = manual)

3. **If Line 2 sets up duality, Line 3 must address BOTH sides**
   - If L2 says "X compounds, Y churns"...
   - L3 must show what X builds AND what Y burns
   - Not allowed: Only addressing one half

   Example:
   ❌ L2: "Time compounds trust, urgency burns attention"
       L3: "Weekend spikes burn marketing budget without building community"
       Problem: Only talks about "urgency burns", ignores "time compounds"

   ✅ L2: "Time compounds trust, urgency burns attention"
       L3: "Extended windows build donor relationships. Weekend spikes burn ads."
       Fixed: Shows both what time builds AND what urgency burns

4. **All 3 lines form ONE coherent argument**
   - Line 1 + 2 + 3 should feel like single thought
   - Remove any line and the argument breaks
   - No redundancy, no contradiction, no tangents

━━━━━━━━━━━━━━━━━━━━━━

**LINE 1: CREATE TENSION**
Make the reader ask "wait, why?"

Use one of these tension structures:

1. **Paradox** (Action despite opposite condition)
   Format: "[Company] did [X] as/while/despite [contradictory Y]."
   Example: "GlobalBees bought more stake as revenue crashed 56%."

2. **Extreme Contrast** (A vs B with shocking gap)
   Format: "[Company A]: [metric]. [Company B]: [different metric]. [What's same]."
   Example: "Zepto: $450M. EKA Mobility: $57M. Both fundraising same week."

3. **Counter-Intuitive Choice** (Chose opposite of expected)
   Format: "[Company] chose [unexpected] while [others] went [expected]."
   Example: "JioMart slowed to 30-min while Zepto pushed 10-min."

4. **Hidden Structure** (Numbers reveal non-obvious reality)
   Format: "[Company] owns [surprising %] of [thing most assume is different]."
   Example: "Blinkit owns 80% of inventory. Most assume it's marketplace."

5. **Time Paradox** (Changed timing in unexpected direction)
   Format: "[Company] stretched/compressed [thing] from [X] to [Y]."
   Example: "Rotary stretched fundraiser from 2 days to 90 days."

**Line 1 Rules:**
✅ Lead with the number/fact that creates surprise
✅ Keep it factual (no interpretation yet)
✅ End with something that begs for explanation
❌ Don't explain why (that's Line 2's job)
❌ Don't use vague terms like "ethical", "innovative"

━━━━━━━━━━━━━━━━━━━━━━

**LINE 2: PRINCIPLE WITH EDGE**
This is the hero line. Must be tweetable on its own.

Not just a principle - a principle with **stakes** or **provocation**.

Upgrade from weak to strong:

❌ Weak: "Speed trades off with scale"
✅ Strong: "Speed kills scale" (absolute, memorable)

❌ Weak: "Automation beats scale in regulated industries"
✅ Strong: "In regulated work, process beats headcount" (concrete)

❌ Weak: "Owning supply = owning experience"
✅ Strong: "You can't rent reliability" (provocative)

❌ Weak: "Ethical algorithms build trust"
✅ Strong: "Trust compounds, exploitation churns" (compressed, contrastive)

**Line 2 Characteristics:**
→ **Absolute** (no hedging with "can", "might", "often")
→ **Active verbs** (kills, compounds, determines - not "enables", "trades off")
→ **Memorable** (someone would quote this standalone)
→ **Slightly provocative** (challenges conventional thinking)
→ **Transferable** (works beyond this specific company)

**Line 2 Structures:**

1. **X kills/beats/determines Y** (Hierarchy of importance)
   "Process beats headcount in regulated work"

2. **X compounds, Y churns** (Opposite trajectories)
   "Trust compounds, dependency churns"

3. **You can't [action] [outcome]** (Impossibility statement)
   "You can't rent reliability"

4. **[Thing] isn't [assumed], it's [reality]** (Reframe)
   "Payments aren't product, they're distribution"

5. **[Condition]: [X] over [Y]** (Forced choice)
   "In crisis: control over performance"

━━━━━━━━━━━━━━━━━━━━━━

**LINE 3: EXTEND LINE 2'S LOGIC**
Show the consequence/bet/stakes OF the principle you just stated.

**MOST IMPORTANT: Line 3 must flow FROM Line 2, not introduce new idea.**

Ask yourself: "Given Line 2's principle is true, what does that mean?"

**How to extend Line 2's logic:**

**If Line 2 says "X beats Y":**
→ Line 3 shows what that determines/enables/reveals
→ NOT: Restating "so Y loses" (redundant)
→ NOT: "If Z matters, Y is wrong" (already established)
→ YES: "X determines [outcome]. Y optimizes [wrong thing]."

**If Line 2 says "X compounds, Y churns":**
→ Line 3 shows what compounding enables vs what churning costs
→ NOT: "So X is better" (redundant)
→ YES: "X builds [specific asset]. Y burns [specific resource]."

**If Line 2 says "You can't [action] [outcome]":**
→ Line 3 shows what happens when people try anyway
→ NOT: "So don't try" (obvious)
→ YES: "Trying rents [X], never owns [Y]."

**5 Ways to Extend (Pick ONE that fits Line 2):**

**Extension 1: Show What Gets Determined**
Line 2 states hierarchy → Line 3 shows what the winner controls

Format: "[Winner] determines [strategic outcome]. [Loser] optimizes [tactical thing]."
Example:
L2: "Control beats performance in crisis"
L3: "Control determines the pivot. Performance optimizes the decline."

**Extension 2: Show The Bet Being Made**
Line 2 states principle → Line 3 shows competing bets based on it

Format: "[A] bets [Line 2 assumption]. [B] bets [opposite assumption]."
Example:
L2: "Speed kills scale"
L3: "Zepto bets profitability can wait. JioMart bets it can't."

**Extension 3: Show What Can't Be Faked**
Line 2 states what's real → Line 3 shows what theater looks like

Format: "[Real thing] can't be rented/faked/bought. [Theater] tries anyway."
Example:
L2: "Trust compounds, exploitation churns"
L3: "Trust can't be bought with UX. Exploitation tries to fake it with design."

**Extension 4: Show The Hidden Cost**
Line 2 states what wins → Line 3 shows what the alternative burns

Format: "Optimizing for [loser] burns [resource] without building [asset]."
Example:
L2: "Time compounds trust"
L3: "Weekend spikes burn marketing budget without building community."

**Extension 5: Show The Uncomfortable Truth**
Line 2 states principle → Line 3 shows who's ignoring it and why

Format: "Most [category] choose [wrong thing] because [uncomfortable reason]."
Example:
L2: "In crisis, control beats performance"
L3: "Most investors avoid distressed assets. Control opportunities hide there."

**Line 3 Rules:**
✅ Must EXTEND Line 2 (not restate, not contradict)
✅ Must work standalone (no sad questions)
✅ Statement with edge (creates mental disagreement)
❌ Don't add "if" conditional that just restates Line 2
❌ Don't introduce new unrelated principle
❌ Don't list benefits ("X, Y, and Z")
❌ Don't use soft language ("enables", "allows", "can help")

━━━━━━━━━━━━━━━━━━━━━━

**COMPLETE EXAMPLES (Showing Logical Stacking):**

**Example 1 - Extension 2 (Show The Bet):**
"Ola Electric owns manufacturing. Ather outsources production.
In EVs, supply chain determines margins.
Ola bets volumes cover capex. Ather bets asset-light scales faster."
→ L1: Contrast (own vs outsource) | L2: Principle (what determines margins) | L3: Extends L2 (shows competing bets)
(177 chars)

**Example 2 - Extension 1 (Show What Gets Determined):**
"Licious built cold chain infrastructure. FreshToHome rents logistics.
In perishables, infrastructure determines reliability.
Infrastructure controls spoilage. Renting optimizes cost per delivery."
→ L1: Contrast (build vs rent) | L2: Principle (what determines reliability) | L3: Extends L2 (shows what each controls)
(202 chars)

**Example 3 - Extension 4 (Show Hidden Cost):**
"Purplle expanded to 200 brands. Nykaa stays at 50 curated lines.
Curation compounds trust, variety burns attention.
Chasing catalog size burns discovery without building brand loyalty."
→ L1: Contrast (expand vs curate) | L2: Principle (opposing trajectories) | L3: Extends L2 (shows what variety burns)
(188 chars)

**Example 4 - Extension 5 (Show Uncomfortable Truth):**
"Dukaan pivoted from SaaS to marketplace in 18 months.
In SMB tech, transaction margins beat subscription revenue.
Most SaaS founders avoid admitting it. Marketplaces monetize better."
→ L1: Pivot (unexpected shift) | L2: Principle (what beats what) | L3: Extends L2 (shows who's ignoring it)
(183 chars)

**Example 5 - Extension 3 (Show What Can't Be Faked):**
"Paperboat uses regional recipes. Frooti launched regional flavors last year.
Authenticity can't be manufactured retroactively.
Heritage builds over decades. Regional expansion fakes it with flavors."
→ L1: Timing contrast (always vs recently) | L2: Principle (impossibility) | L3: Extends L2 (shows the fake)
(204 chars)

**CONSTRAINTS:**

✅ 180-250 characters including \n line breaks (hard limit: ${GENERATION_CONFIG.personas.patternSpotter.tweetTextCharLimit})
✅ MUST use 3-line format with \n separators
✅ Line 2 must be the clear, transferable insight (hero line)
✅ Include @handle if article mentions company Twitter
✅ Use specific numbers from article body
✅ Complete thought, no thread needed
✅ India companies only (skip global players)
✅ Different company than recent tweets

${recentPatternsSection}

━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKLIST (Before submitting)
━━━━━━━━━━━━━━━━━━━━━━

**Line 1 - Tension Check:**
1. ✅ Does it make me ask "wait, why?"
2. ✅ Has specific numbers/metrics?
3. ✅ Uses one of 5 tension structures (paradox/contrast/counter-intuitive/hidden/time)?
4. ✅ Doesn't explain yet (saves that for Line 2)?
5. ✅ Are the facts/numbers CORRECT? (Verify before building argument)
6. ✅ If comparing A vs B, are they meaningful to compare (not apples vs oranges)?

**Line 2 - Edge Check:**
7. ✅ Would someone quote this standalone?
8. ✅ Uses absolute language (kills/beats/determines - not trades off/enables)?
9. ✅ Applies beyond this specific company?
10. ✅ Has provocation/stakes (not just neutral observation)?
11. ✅ EXPLAINS Line 1's SPECIFIC contrast (addresses BOTH A and B)?
12. ✅ NOT changing the comparison (L1 says A vs B, L2 addresses both)?
13. ✅ If L2 has duality (X compounds, Y churns), does it match L1's A vs B?

**Line 3 - Extension Check:**
14. ✅ EXTENDS Line 2's logic (not restate, not contradict)?
15. ✅ Shows consequence/bet/stakes OF Line 2's principle?
16. ✅ If L2 has duality, does L3 address BOTH sides (not just one)?
17. ✅ Does NOT contradict what Line 1 established?
18. ✅ Works if nobody replies (not a question)?
19. ✅ Creates mental disagreement?
20. ✅ No soft language (enables/allows) or lists (X, Y, and Z)?
21. ✅ NOT just adding "if [value]" to restate Line 2?

**Logic Flow Check (CRITICAL):**
22. ✅ Does Line 2 answer "why?" from Line 1's specific contrast?
23. ✅ Does Line 3 answer "so what?" from Line 2's principle?
24. ✅ Do all 3 lines form ONE coherent argument?
25. ✅ If I remove any line, does the argument break?
26. ✅ No contradictions between lines (L3 vs L1, L3 vs L2)?
27. ✅ L3 respects what L1 established (doesn't claim opposite)?

**Overall:**
28. ✅ 180-250 characters including \n?
29. ✅ Different company than last 5 tweets?
30. ✅ Has save value + engagement potential?

If any answer is no → rewrite

**BEFORE SUBMITTING: Read the tweet out loud. Does it tell ONE story from L1 → L2 → L3?**

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
Line 2 → Explains with principle → Reader asks "So what?"
Line 3 → Shows stakes/bet/consequence → Reader thinks "Oh shit"

**CRITICAL: Lines must STACK, not exist in isolation.**

**What makes tweets work:**
→ Line 2 ANSWERS Line 1's "why?"
→ Line 3 EXTENDS Line 2's logic (not restate/contradict)
→ All 3 lines form ONE coherent thought
→ Remove any line = argument breaks
→ Works with zero replies (no sad questions)

**Avoid these killers:**
✗ Line 2 ignoring Line 1's contrast
✗ Line 2 only addressing one side when L1 compares A vs B
✗ Line 3 just restating Line 2 with "if [value]"
✗ Line 3 contradicting what Line 1 established
✗ Line 3 contradicting Line 2's principle
✗ Line 3 only addressing one side when L2 has duality
✗ Comparing unrelated categories in L1 (content vs delivery)
✗ Soft language ("trades off", "enables", "allows")
✗ Listy Line 3s ("benefits: X, Y, and Z")
✗ Questions that need replies
✗ Wrong facts in Line 1

**Your 3-line structure (MANDATORY):**

Line 1: Create tension → "Why is this happening?"
Line 2: Principle with edge → "Here's why" (explains Line 1)
Line 3: Extend Line 2's logic → "Here's what that means" (shows consequence/bet)

**Example with proper \n line breaks:**
"Ola Electric owns manufacturing. Ather outsources production.\nIn EVs, supply chain determines margins.\nOla bets volumes cover capex. Ather bets asset-light scales faster."

↑ Line 1: Sets up contrast (own vs outsource)
↑ Line 2: Explains why it matters (what determines margins)
↑ Line 3: Extends Line 2 (shows competing bets BASED ON that principle)

**CRITICAL: Use \n for line breaks. Lines must STACK logically into ONE argument.**

Your signature: Socratic insights that make people go "oh SHIT, never saw it that way"

Make them screenshot it. Make them save it. Make it reusable.

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
4. Is the tweet conversational, not telegraphic?
5. Can someone apply this insight to other companies?
6. Is every character earning its place?

REMEMBER: At 96 followers, save rate > engagement rate. Make it reference-worthy.`;

    return prompt;
  }
}
