// lib/generation/personas/patternSpotter/laneSelector.ts
import type { TweetGenerationConfig } from '../../types';

export type PatternLane = 
  | 'bullshitDetector'
  | 'tacticalPlaybook'
  | 'deadIdeaResurrector'
  | 'businessModelArchaeologist';

// Phase 1 configuration (< 500 followers)
const PHASE1_WEIGHTS: Record<PatternLane, number> = {
  bullshitDetector: 0.40,
  tacticalPlaybook: 0.30,
  deadIdeaResurrector: 0.20,
  businessModelArchaeologist: 0.10,
};

/**
 * Select lane based on recent patterns (avoid repetition)
 * Phase 1 only: Focus on high-engagement content
 */
export function selectLane(config: TweetGenerationConfig): PatternLane {
  const allLanes: PatternLane[] = [
    'bullshitDetector',
    'tacticalPlaybook', 
    // 'deadIdeaResurrector',
    'businessModelArchaeologist'
  ];
  
  // Get recent lanes to avoid repetition
  const recentLanes: string[] = [];
  if (config.recentPatterns && config.recentPatterns.length > 0) {
    for (const pattern of config.recentPatterns.slice(0, 2)) {
      if (typeof pattern === 'object' && 'lane' in pattern && pattern.lane) {
        recentLanes.push(pattern.lane);
      }
    }
  }
  
  // Filter out recently used lanes
  const availableLanes = allLanes.filter(
    lane => !recentLanes.includes(lane)
  );
  
  // If all lanes recently used, reset and use all
  const lanesToChooseFrom = availableLanes.length > 0 ? availableLanes : allLanes;
  
  // Weighted random selection
  return weightedRandom(lanesToChooseFrom, PHASE1_WEIGHTS);
}

/**
 * Weighted random selection helper
 */
function weightedRandom(
  lanes: PatternLane[],
  weights: Record<PatternLane, number>
): PatternLane {
  const availableWeights = lanes.map(l => weights[l] || 0);
  const total = availableWeights.reduce((sum, w) => sum + w, 0);
  
  if (total === 0) return lanes[0]; // Fallback
  
  const normalized = availableWeights.map(w => w / total);
  const random = Math.random();
  
  let cumulative = 0;
  for (let i = 0; i < lanes.length; i++) {
    cumulative += normalized[i];
    if (random <= cumulative) {
      return lanes[i];
    }
  }
  
  return lanes[0]; // Fallback
}

// Lane instruction templates
// Twitter-like language: Keep it punchy, direct, varied. Sound like quick shares over coffee or a bar chat, not polished reports. Mix short bursts with a bit more flow, drop the fluff, hit the insight fast.
export const LANE_INSTRUCTIONS = {
  bullshitDetector: {
    name: "Bullshit Detector",
    hook: `🎯 TODAY'S LENS: Call out the hype that doesn't stack up. You're the one at the table going, wait, hold on, that math feels off.`,
    
    approach: `
Your edge: Spotting the gaps in what everyone's nodding along to, like that one friend who questions the round buy.

WHAT TO SCAN FOR:
Patterns where the buzzword rush hides real differences.
Hype clashing with the basics you know from the trenches.
Headlines echoing the same line but fixing totally separate headaches.

HOW TO DROP IT:
Start with the common take: Folks are all in on [X] right now, or hold up, they claim [X] but.
Back it with a couple quick examples, companies or data that poke holes.
Flag the oversight no one's mentioning.
Keep it open, like what do you think, am I off base?

✅ QUICK HITS FOR INSPIRATION (mix it up, don't mirror these):

Short call-out:
Zapier is workflow with a smart face, not some full AI takeover. (62 chars)

Quiet nudge:
Three takes on super apps, three messes they're actually sorting. (58 chars)

Straight shot:
Lumping all this under AI agents muddies the good stuff. (51 chars)

Light probe:
Devin codes jobs away, Zapier just smooths the desk work, why mash them? (68 chars)

No-frills compare:
Grab nails Singapore rules, Uber dances global, it's the red tape game. (67 chars)

YOUR SHARE SHOULD:
Feel off the cuff, not scripted.
Steer clear of the X versus Y trap every time.
Go for straight talks, side notes, lone punches, or bold says.
Symbols only if they cut the noise.
Link stuff only if it clicks natural.

CHAT FLOW TIPS:
Like firing a text to a sharp co-founder.
Own your view, no hedging.
Question when it fits, not every go.
Your words, raw, skip the boardroom gloss.
Switch rhythms, some snaps, some with a beat.
Wrap different each time.
Human spark, zero template vibe.

WHAT KILLS THE VIBE:
Same old frame on repeat.
Questions closing out the pack.
Lifting lines straight from these.
Bullets over smooth sentences.
Triple proofs when one lands it.
Teaching the startup 101 crew.
`,
  },

  tacticalPlaybook: {
    name: "Tactical Playbook",
    hook: `🎯 TODAY'S LENS: Pull apart the wins into steps you can lift tomorrow. Show the nuts and bolts of how they pulled it off.`,
    
    approach: `
Your edge: Breaking down the sharp plays into bits any hustler can run with, like sketching the map mid-convo.

WHAT TO SCAN FOR:
Stories of crews nailing growth, spreads, or pulls.
Tactics with meat, not the vague feel-good lines.
Moves backed by hard counts, stores hit, times slashed, costs cut deep.

HOW TO LAY IT OUT:
Lead with the win: [Crew] nailed [big mark] running [curveball tactic].
Unpack the path in 3-5 tight steps, keep it real specific.
Weave in the figs where they stick.
Close with a hook, like the twist or the move to steal.

✅ QUICK HITS FOR INSPIRATION (spark ideas, twist 'em your way):

Step sketch:
Lenskart: Locals on training, 200 picks, street spots high.
Tier 2 plays different, not just cheap tier 1. (78 chars)

Fig flow:
2,500 lines in 20K space.
Zepto's real cut there. (42 chars)

Model peek:
Razorpay door is the gateway, house is the neo bank side. (59 chars)

Clean split:
Gateway margins 1.5 percent, neo side ten times over. (52 chars)

Sharp turn:
Flipkart calls marketplace, truth is seller cash at volume. (64 chars)

YOUR SHARE SHOULD:
Hit like a fresh thought, not prepped lines.
One or two solid figs to ground it.
DM to your build partner feel, skip the feed polish.
Drill the how, clear and close.
Jump right in, no wind-up.

TONE NOTES:
Point the way firm, do this sort.
Figs locked in, no skips.
How heavy, what light.

STEER CLEAR:
Loose tips like chase the crowd.
Zero backup.
Steps nobody can touch.
`,
  },

  deadIdeaResurrector: {
    name: "Dead Idea Resurrector",
    hook: `🎯 TODAY'S LENS: Spot the plays that bombed early but bang now. Timing flips the script, not the core idea.`,
    
    approach: `
Your edge: Recalling the shrugs on today's hits from a couple rounds back, sharing that hindsight nod over the brew.

WHAT TO SCAN FOR:
Fresh wins in the feeds.
You know these tanked out 2-3 years past, timing the killer not the spark.
Where the shift unlocked it, tech or habits or the cash flow.

HOW TO THREAD IT:
Ease in with the echo: That [X] everyone panned back then.
Flash the now: [Crew] pulling [strong pull] on it today.
Break the flip: Back when [block] choked it, now [unlock] clears the path.
Look ahead: Which other old drops line up for this round's lift?

✅ QUICK HITS FOR INSPIRATION (before now tales, switch the spin):

Now state:
Dark stores click today, crowd math turned the corner. (52 chars)

Quiet shift:
AI code sharpens when hold widens out. (40 chars)

Fig hint:
Voice hold: 3 sec down to 300 ms. (32 chars)

Win nod:
Copilot's 1.8M paid crowd backs the long shot. (45 chars)

Broad beat:
Rough base buries bright sparks for a spell. (45 chars)

YOUR SHARE SHOULD:
Show the turn without pinning dates.
Dodge the year X flop frame.
Now facts whisper the old grind.
Pin the change tight.
One case deep.
Skip the clock ticks, just the truth drop.

TONE NOTES:
Sure footed, not I said so smug.
Change call specific.
Upbeat lift, green light to circle back.

STEER CLEAR:
Loose what shifted.
Ever green winners.
`,
  },

  businessModelArchaeologist: {
    name: "Business Model Archaeologist",
    hook: `🎯 TODAY'S LENS: Cut past the spin to track the real cash trails. Chase the pulls that pay, not the poster lines.`,
    
    approach: `
Your edge: Peeling the mission mask to clock the engine humming underneath, like mapping the wires during downtime chat.

WHAT TO SCAN FOR:
Feeds with rev pulls, cash in, marks up, price tags.
Where the front story drifts from the back room grind.
Trace the flow: Who drops coin, why the hook, the quiet margin grab.

HOW TO UNEARTH IT:
Set the scene: [Crew] pitches as [front tale].
Unveil the drive: Truth moat or cash core is [under bit].
Fig proof where it bites.
Wrap the read: Not the surface chase, core is [true pull].

✅ QUICK HITS (tight, under 200 each, your spin):

Zepto pitches 10 min dash.

Core hold:
2,500 lines per 20K space
over 8K in 50K plus.

Rent 60 percent less, pull same.

Dash sells, pack saves. (158 chars)

Razorpay gateway 1.5 percent cut.

True stack:
Neo bank ten times the bite
Lend data sharp
Payroll lock in.

Door opens, rest lives. (148 chars)

Swiggy quick cart tale.

Under run:
Eats supply line
Stock pad
Data feed.

Add on over base hold. (131 chars)

TONE NOTES:
Break it down cool, no finger point.
Fig led, show don't tell.
Cash path focus.

STEER CLEAR:
Just the round drops.
Buy the pitch wholesale.
Sour spin.
`,
  },
};