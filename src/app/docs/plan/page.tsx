import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";

export default function PlanPage() {
  return (
    <div className="min-h-full flex flex-col">
      <AppHeader />
      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 prose prose-neutral dark:prose-invert prose-headings:font-semibold">
        <p className="text-sm text-muted-foreground not-prose">
          <Link href="/">← Home</Link>
        </p>
        <h1>Care Visit Log — Product plan</h1>
        <p>
          A family advocacy tool for documenting visits to a loved one
          recovering from a stroke. The goal is a consistent, shareable record:
          what you observed, what you photographed, and what to ask the care
          team — without replacing clinicians.
        </p>

        <h2>Problem</h2>
        <p>
          After a stroke, care happens across shifts, facilities, and family
          members. Details get lost. Photos stay on one phone. Concerns feel
          vague when you talk to nurses. This app makes each visit legible and
          comparable over time.
        </p>

        <h2>Core user journey</h2>
        <ol>
          <li>Arrive for a visit (hospital, rehab, or home).</li>
          <li>Walk the stroke-aware checklist while you observe.</li>
          <li>Photograph room, meals, meds setup, mobility aids — with consent.</li>
          <li>Run AI photo review for practical flags (hazards, hydration, organization).</li>
          <li>Add free-text notes (speech, appetite, staff responsiveness).</li>
          <li>Save → timeline shows concern level and checklist completion.</li>
          <li>Before the next visit or care meeting, review trends and export a summary.</li>
        </ol>

        <h2>What AI should do (and not do)</h2>
        <ul>
          <li>
            <strong>Do:</strong> describe the care environment, suggest checklist
            items, note visible hazards, summarize patterns across visits.
          </li>
          <li>
            <strong>Do not:</strong> diagnose stroke progression, interpret lab
            values, or replace nursing assessments.
          </li>
        </ul>

        <h2>Phased roadmap</h2>
        <h3>Phase 1 — MVP (this repo base)</h3>
        <ul>
          <li>Visit log with checklist, photos, notes</li>
          <li>Local browser storage (private to device)</li>
          <li>Optional Gemini vision analysis</li>
          <li>Mobile-friendly capture</li>
        </ul>

        <h3>Phase 2 — Family sharing</h3>
        <ul>
          <li>Auth (magic link) for spouse, siblings, adult children</li>
          <li>Cloud DB (Supabase) + encrypted photo storage</li>
          <li>Per-patient profile (care plan, allergies, baseline speech/mobility)</li>
        </ul>

        <h3>Phase 3 — Advocacy tools</h3>
        <ul>
          <li>PDF export for care conferences</li>
          <li>Trend charts: checklist completion, concern flags, visit frequency</li>
          <li>Compare AI summaries week-over-week</li>
          <li>Question bank generated from gaps in the checklist</li>
        </ul>

        <h3>Phase 4 — Integrations (optional)</h3>
        <ul>
          <li>Calendar reminders for visits</li>
          <li>Read-only portal links for trusted clinicians (with explicit consent)</li>
          <li>Voice notes transcribed to visit notes</li>
        </ul>

        <h2>Data model</h2>
        <p>See <code>src/types/care.ts</code>: Patient (future), CareVisit, VisitPhoto, PhotoAnalysis, ChecklistAnswer, VisitNote.</p>

        <h2>Privacy & ethics</h2>
        <ul>
          <li>Minimize PHI in photos (avoid name badges, full MAR labels).</li>
          <li>Consent from patient or facility policies before photographing.</li>
          <li>Clear disclaimer: family tool, not medical advice.</li>
          <li>Easy delete for a visit or all data.</li>
        </ul>

        <h2>Tech stack</h2>
        <ul>
          <li>Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui</li>
          <li>API route → Google Gemini vision</li>
          <li>Phase 2: Supabase Postgres + Storage</li>
        </ul>
      </article>
    </div>
  );
}
