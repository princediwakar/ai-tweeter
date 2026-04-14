# Plan: Embolden Article Skip Mechanism

## Overview
Add explicit skip criteria to the prompt that the LLM uses to select articles, filtering out low-quality or inappropriate content before generation.

## Location
`lib/generationProcessing.ts` lines 112-135

## Current State
The existing prompt has basic skip logic:
- "The Colleague Test" - skip if you wouldn't forward to a smart colleague
- "Never share personal journey" as a rule

## Proposed Changes

### 1. Explicit Skip Criteria Section
Add a clear SKIP CRITERIA section with specific rules:

```
SKIP CRITERIA - Reject if ANY of these:
- Too short: Content < 500 characters (not enough substance)
- Personal project: Author is writing about their own product/service/launch
- Generic advice: "most people", "the real truth", "focus on", "you should"
- Announcement: "Introducing", "launching", "announcing", "new product"
- Self-promotion: "I built", "we launched", "check out my"
- Listicle: "X ways to", "X tips for", "X things you need"
- No original insight: Content is just a summary or rehash of known info
```

### 2. Content Length Enforcement
Include word/character count in article metadata so the LLM can assess depth.

### 3. Author Detection Signal
Look for author metadata or detect first-person pronouns in content that indicate personal projects.

## Implementation Steps

1. Add `content.length` to article metadata in `ContentPipeline.ts`
2. Update `formatForPrompt()` to include content length info
3. Add SKIP CRITERIA section to prompt in `generationProcessing.ts`

## Files to Modify
- `lib/contentSource/ContentPipeline.ts` - Add content length to formatted output
- `lib/generationProcessing.ts` - Add skip criteria to prompt