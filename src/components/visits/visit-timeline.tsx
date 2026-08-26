"use client";

import { useEffect, useState } from "react";
import { listVisits } from "@/lib/visits-repository";
import { CARE_CHECKLIST } from "@/lib/care-checklist";
import type { CareVisit } from "@/types/care";
import { VisitSummaryCard } from "@/components/visits/visit-summary-card";
import { Card, CardContent } from "@/components/ui/card";

export function VisitTimeline() {
  const [visits, setVisits] = useState<CareVisit[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listVisits().then((v) => {
      setVisits(v);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading visits…
        </CardContent>
      </Card>
    );
  }

  if (visits.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-2">
          <p className="font-medium text-foreground">No visits logged yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            After your first visit, you&apos;ll see a timeline here — photos,
            checklist scores, and notes to compare over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => {
        const checked = visit.checklist.filter((c) => c.checked).length;
        const firstNote = visit.notes[0]?.body;
        return (
          <VisitSummaryCard
            key={visit.id}
            href={`/visits/${visit.id}`}
            visitedAt={visit.visitedAt}
            visitorName={visit.visitorName}
            location={visit.location}
            mood={visit.mood}
            concernLevel={visit.overallConcern}
            checklistChecked={checked}
            checklistTotal={CARE_CHECKLIST.length}
            photoCount={visit.photos.length}
            notePreview={firstNote}
          />
        );
      })}
    </div>
  );
}
