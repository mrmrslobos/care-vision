"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { listVisits } from "@/lib/visits-repository";
import { buildTrendSummary } from "@/lib/trends";
import { downloadCareReportPdf } from "@/lib/export-pdf";
import type { CareVisit } from "@/types/care";
import { useAuth } from "@/components/auth/auth-provider";
import { ReminderManager } from "@/components/visits/reminder-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InsightsPage() {
  const { circles } = useAuth();
  const [visits, setVisits] = useState<CareVisit[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listVisits().then((v) => {
      setVisits(v);
      setReady(true);
    });
  }, []);

  const trends = buildTrendSummary(visits);
  const patientLabel = circles[0]?.patientLabel ?? "Loved one";

  return (
    <div className="min-h-full flex flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Insights & export</h1>
            <p className="text-sm text-muted-foreground">
              Trends for care meetings and a PDF to bring to staff.
            </p>
          </div>
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            disabled={!ready || visits.length === 0}
            onClick={() => downloadCareReportPdf(visits, trends, patientLabel)}
          >
            Download PDF report
          </Button>
        </div>

        {!ready ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : visits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Log a few visits to see trends here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Visits</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {trends.visitCount}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Checklist avg
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {trends.avgChecklistPct}%
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Flags</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>Watch: {trends.concernCounts.watch}</p>
                <p>Discuss soon: {trends.concernCounts.urgent}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {trends.checklistByVisit.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {trends.checklistByVisit.map((row) => (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right">{row.pct}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {trends.visitsByWeek.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visits per week</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end gap-2 h-32">
              {trends.visitsByWeek.map((w) => (
                <div
                  key={w.label}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-teal-600/80 rounded-t min-h-[4px]"
                    style={{
                      height: `${Math.max(8, w.count * 24)}px`,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {w.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <ReminderManager />

        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to timeline
        </Link>
      </main>
    </div>
  );
}
