# Care Visit Log

A private family app to document visits to a loved one recovering from a stroke — with a practical care checklist, photo capture, notes, and optional AI photo review.

**This is not medical advice.** It helps you remember and advocate; always follow her clinicians and care facility policies.

## Repositories

| Host | Location |
|------|----------|
| **GitHub** | https://github.com/mrmrslobos/care-vision |
| **Cursor Origin** | https://cursor.com/codebase/open-itservices/care-vision |

Code is developed in Cursor Origin; push to GitHub when you want it on `mrmrslobos/care-vision`.

### Push to GitHub (WSL)

If you cloned from Origin and added GitHub as a second remote:

```bash
git remote add github https://github.com/mrmrslobos/care-vision.git   # skip if already added
git push -u github main
```

If GitHub rejects the push because the empty repo has an initial commit, use:

```bash
git push -u github main --force
```

(Only use `--force` on a new empty repo you just created.)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:43125](http://localhost:43125).

### Optional: enable AI photo analysis

Copy `env.example` to `.env.local` and add your **Gemini API key** ([Google AI Studio](https://aistudio.google.com/apikey)). Without it, the app runs in offline preview mode and you can still use the full checklist and notes.

```bash
cp env.example .env.local
```

## What’s in this base

| Area | Location |
|------|----------|
| Types | `src/types/care.ts` |
| Stroke-aware checklist | `src/lib/care-checklist.ts` |
| Local storage (MVP) | `src/lib/storage.ts` |
| AI analysis | `src/lib/ai/analyze-photo.ts` + `src/app/api/analyze-photo/route.ts` |
| Visit UI | `src/components/visits/*` |
| Product plan | `/docs/plan` in the app, details in `docs/PLAN.md` |

## Typical visit workflow

1. **Log visit** — name, time, location, how she seemed.
2. **Checklist** — safety, hydration, meds, mobility, skin, engagement.
3. **Photos** — room, tray, equipment; tap **Analyze with AI** for suggestions.
4. **Notes** — speech, appetite, questions for staff.
5. **Timeline** — compare visits before the next care meeting.

## Roadmap (summary)

1. **Now:** Local-only MVP, mobile camera, AI optional.
2. **Next:** Family accounts, cloud sync, encrypted photos.
3. **Then:** PDF export, trends, voice notes.

Full plan: [docs/PLAN.md](./docs/PLAN.md) or `/docs/plan` in the running app.

## Data & privacy

- Visits are stored in **your browser’s localStorage** on this MVP — not synced across devices yet.
- Avoid photographing faces, name badges, or full medication labels when possible.
- Get consent per facility rules before taking photos.

## Family sync (Phase 2)

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (or Vercel).
2. Open **Family** → sign in with magic link.
3. **Create** a care circle or **join** with an invite code.
4. Everyone in the circle sees the same visit timeline.

Without Supabase, visits stay on this device (localStorage).

## Insights, PDF & reminders (Phases 3–4)

- **Insights** — checklist trends, visit frequency, concern counts.
- **Download PDF** — conference summary for nurses / care managers.
- **Voice notes** — dictate in the Notes tab after a visit (Chrome).
- **Reminders** — schedule visit reminders with browser notifications (when signed in).

## Deploy on Vercel

1. Push this repo to GitHub (`mrmrslobos/care-vision`).
2. In [Vercel](https://vercel.com/new), **Import** the GitHub repository.
3. Framework is auto-detected as **Next.js** — no extra build settings needed.
4. Add **Environment Variables** (Production + Preview):

   | Name | Value |
   |------|--------|
   | `GEMINI_API_KEY` | Your key from [Google AI Studio](https://aistudio.google.com/apikey) |
   | `GEMINI_MODEL` | Optional — defaults to `gemini-2.0-flash` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |

5. Deploy. The API route `/api/analyze-photo` runs as a Vercel Function.

Photos are compressed client-side before upload to stay within serverless body limits.

## Scripts

- `npm run dev` — development server (port 43125)
- `npm run build` — production build
- `npm run start` — run production server
