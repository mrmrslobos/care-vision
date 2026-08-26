import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { VisitTimeline } from "@/components/visits/visit-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-teal-50/80 to-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 space-y-8">
        <section className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Care visits, documented
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Log each visit with a stroke-aware checklist, photos, and notes. AI
            can review photos for practical care-environment flags — not a
            diagnosis — so your family has a clear record over time.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">1. Checklist</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Safety, hydration, meds, mobility, and engagement — tuned for
              recovery visits.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">2. Photos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Snap the room, tray, and equipment; AI suggests what to double-check.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">3. Timeline</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Compare visits and bring concrete notes to nurses or care managers.
            </CardContent>
          </Card>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Recent visits</h2>
            <Link
              href="/visits/new"
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              New visit
            </Link>
          </div>
          <VisitTimeline />
        </section>

        <p className="text-xs text-muted-foreground border-t pt-4">
          This app supports family advocacy, not medical advice. For urgent
          symptoms, contact her care team or emergency services. See{" "}
          <Link href="/docs/plan" className="underline underline-offset-2">
            product plan
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
