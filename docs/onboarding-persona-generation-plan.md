# Onboarding Persona Generation - Production Blueprint

## Overview
Replace topics selection with prompt-to-persona pipeline. User enters free-form goal → AI generates platform-specific personas with RSS auto-mapping.

## Flow
1. Welcome
2. Connect Accounts (Twitter/LinkedIn)
3. **Prompt** - User describes what they want to be known for
4. **Generation** - AI creates personas with loading state
5. **Review** - User edits name/description (max 3 regenerations)
6. Schedule
7. Launch

## UX Guardrails
- **Skip fallback**: If user skips prompt → generate "General Professional" baseline (Twitter: "The Signal", LinkedIn: "The Builder")
- **Regeneration limit**: Max 3 per onboarding session (micro-copy: "Fine-tune in dashboard later")
- **Loading state**: Show "Writing your Tactical Blueprints..." / "Mapping RSS feeds..."

## Data Flow
```
User Prompt → Persona Generation Service
  ├─→ Twitter Branch (hooks, velocity, 140-280 chars)
  │     └─ Name, archetype, RSS auto-mapped
  └─→ LinkedIn Branch (authority, depth, 800-2500 chars)
        └─ Name, archetype, RSS auto-mapped
→ Review → Save with 7-Layer DNA → Link to accounts
```

## Files to Create/Update

### New
- `lib/personaGeneration.ts` - Build prompts, auto-map RSS
- `app/api/onboarding/generate-personas/route.ts` - POST endpoint

### Update
- `components/onboarding/OnboardingWizard.tsx` - Prompt + Review steps
- `app/api/onboarding/complete/route.ts` - Save personas
- `app/personas/page.tsx` - Add "Generate New" CTA for existing users

## RSS Auto-Mapping
- AI extracts keywords from user prompt
- Maps to 3-5 relevant RSS feeds (TechCrunch, VentureBeat, Pitchbook, etc.)
- Appends to persona config automatically

## Platform Differences
| Twitter | LinkedIn |
|---------|----------|
| Hooks & velocity | Authority & depth |
| 140-280 chars | 800-2500 chars |
| Contradiction/Insight archetypes | Case Study/Deep Dive archetypes |
| Short-form content | Long-form thought leadership |