import type { CareVisit, ConcernLevel } from "@/types/care";
import { CARE_CHECKLIST } from "@/lib/care-checklist";

export interface TrendSummary {
  visitCount: number;
  avgChecklistPct: number;
  concernCounts: Record<ConcernLevel, number>;
  visitsByWeek: Array<{ label: string; count: number }>;
  checklistByVisit: Array<{ label: string; pct: number }>;
}

export function buildTrendSummary(visits: CareVisit[]): TrendSummary {
  const concernCounts: Record<ConcernLevel, number> = {
    none: 0,
    watch: 0,
    urgent: 0,
  };

  const weekMap = new Map<string, number>();
  const checklistByVisit: TrendSummary["checklistByVisit"] = [];

  visits.forEach((v) => {
    concernCounts[v.overallConcern]++;
    const d = new Date(v.visitedAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);

    const checked = v.checklist.filter((c) => c.checked).length;
    const pct = Math.round((checked / CARE_CHECKLIST.length) * 100);
    checklistByVisit.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      pct,
    });
  });

  const visitsByWeek = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, count]) => ({
      label: new Date(label).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count,
    }));

  const avgChecklistPct =
    visits.length === 0
      ? 0
      : Math.round(
          checklistByVisit.reduce((s, x) => s + x.pct, 0) / visits.length
        );

  return {
    visitCount: visits.length,
    avgChecklistPct,
    concernCounts,
    visitsByWeek,
    checklistByVisit: checklistByVisit.slice(-12),
  };
}
