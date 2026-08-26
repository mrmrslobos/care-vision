# Care Visit Log — extended product plan

This document mirrors `/docs/plan` in the app with more implementation detail for future phases.

## Vision

Give families a calm, structured way to document stroke-recovery visits so care quality is visible over time — and conversations with nurses, social workers, and facility managers start from facts, not fog.

## Users

- Primary: family member who visits regularly
- Secondary: other relatives who rotate visits
- Future: read-only access for patient advocate or clinician (with consent)

## Success metrics

- Visits logged per week
- Checklist completion rate
- Photos with AI review vs manual-only
- Exported summaries used in care meetings (qualitative)
- Reduction in “I forgot to mention…” moments (qualitative)

## Stroke-specific checklist rationale

Items map to common post-stroke risks and advocacy themes:

| Theme | Why it matters |
|-------|----------------|
| Call button / alerts | Hemiparesis, aphasia — harder to summon help |
| Fall hazards | Balance and gait changes |
| Hydration / meals | Swallow precautions, appetite changes |
| Meds organization | New polypharmacy after stroke |
| Skin | Immobility → pressure injury risk |
| Mobility aids | Walker/wheelchair fit and placement |
| Therapy homework | Continuity between PT/OT and daily care |
| Engagement / staff | Cognitive changes; family as extra eyes |

Customize `src/lib/care-checklist.ts` with her care plan.

## AI design

### Input

- One photo per analysis request (batch later)
- Optional caption and visit date
- System prompt: environment + care logistics, not diagnosis

### Output schema

```ts
{
  summary: string;
  concernLevel: "none" | "watch" | "urgent";
  observations: string[];
  checklistSuggestions: string[]; // checklist item ids
  aiPowered: boolean;
  analyzedAt: string;
}
```

### `urgent` vs `watch`

- **urgent:** visible hazard, obvious neglect signals, immediate safety issue — still prompts human action, not auto-escalation
- **watch:** something to verify with staff or on next visit
- **none:** no practical flags from the image

### Provider options

- Current: Google Gemini vision (`gemini-3.6-flash`) via REST
- Future: Vercel AI SDK + AI Gateway for key management and model fallback

## Architecture (target)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js UI │────▶│ API routes   │────▶│ Gemini      │
│  (mobile)   │     │ analyze-photo│     │ AI Gateway  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
 localStorage          Supabase (phase 2)
 (phase 1)            Postgres + Storage
```

## Phase 2 implementation notes

### Database (Supabase)

- `patients` — display name, facility, baseline notes
- `visits` — patient_id, visited_at, visitor_id, mood, overall_concern
- `checklist_answers` — visit_id, item_id, checked, note
- `photos` — visit_id, storage_path, caption, analysis_json
- `notes` — visit_id, body, created_at

### Auth

- Magic link or passkey for family members
- Row-level security: only members of `patient_family` see data

### Photos

- Upload to Supabase Storage (private bucket)
- Thumbnails for timeline
- Never store full PHI in AI prompts without review

## Phase 3 features

- **Visit comparison:** diff checklist between two dates
- **Export:** PDF with photos (thumbnails), checklist, AI summaries, notes
- **Alerts:** optional email when `urgent` flagged (family opt-in)
- **Voice:** Web Speech API or Whisper for hands-free notes in the car after leaving

## Legal / compliance awareness

Not a medical device in MVP form. If expanding to clinicians or billing:

- Review HIPAA if US healthcare context and identifiable data in cloud
- Terms of use and disclaimer on every analyze action
- Data retention and deletion flows

## Customization for your mother-in-law

Add to a future `patient profile`:

- Swallow diet level (e.g. nectar-thick liquids)
- Known aphasia / communication tips
- Baseline mobility (walker vs wheelchair)
- Facility contact and room number
- Medication times to verify visually

## Open questions for you

1. Hospital vs rehab vs home — primary setting?
2. Who else should see the log (spouse, siblings)?
3. Photos OK per facility policy?
4. Any items her neurologist or PT want tracked weekly?

Answering these shapes Phase 2 priorities.
