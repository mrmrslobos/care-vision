"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { getVisit } from "@/lib/visits-repository";
import { CARE_CHECKLIST } from "@/lib/care-checklist";
import type { CareVisit } from "@/types/care";
import {
  ConcernBadge,
} from "@/components/visits/visit-summary-card";
import { VisitForm } from "@/components/visits/visit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VisitDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [visit, setVisit] = useState<CareVisit | null>(null);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getVisit(id).then((v) => {
      setVisit(v ?? null);
      setReady(true);
    });
  }, [id]);

  if (!ready) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader />
        <main className="p-6 text-muted-foreground">Loading…</main>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 text-center space-y-4">
          <p>Visit not found on this device.</p>
          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Back home
          </Link>
        </main>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="min-h-full flex flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Edit visit</h1>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
          <VisitForm existing={visit} />
        </main>
      </div>
    );
  }

  const checked = visit.checklist.filter((c) => c.checked);
  const date = new Date(visit.visitedAt);

  return (
    <div className="min-h-full flex flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h1>
            <p className="text-muted-foreground">
              {visit.visitorName}
              {visit.location ? ` · ${visit.location}` : ""}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <ConcernBadge level={visit.overallConcern} />
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Checklist — {checked.length}/{CARE_CHECKLIST.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checked.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items checked.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {checked.map((answer) => {
                  const item = CARE_CHECKLIST.find(
                    (i) => i.id === answer.itemId
                  );
                  return (
                    <li key={answer.itemId}>
                      <span className="font-medium">{item?.label}</span>
                      {answer.note && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {answer.note}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {visit.photos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {visit.photos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption || "Visit photo"}
                    className="rounded-md border aspect-[4/3] object-cover w-full"
                  />
                  {photo.caption && (
                    <p className="text-sm font-medium">{photo.caption}</p>
                  )}
                  {photo.analysis && (
                    <p className="text-sm text-muted-foreground">
                      {photo.analysis.summary}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {visit.notes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {visit.notes.map((note) => (
                <div key={note.id} className="border-l-2 pl-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <p>{note.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Link
          href="/"
          className="inline-flex h-8 w-full sm:w-auto items-center justify-center rounded-lg px-2.5 text-sm font-medium hover:bg-muted"
        >
          ← All visits
        </Link>
      </main>
    </div>
  );
}
