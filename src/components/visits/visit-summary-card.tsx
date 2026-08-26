import type { ConcernLevel } from "@/types/care";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const concernStyles: Record<
  ConcernLevel,
  { label: string; className: string }
> = {
  none: {
    label: "No flags",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  watch: {
    label: "Watch",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  urgent: {
    label: "Discuss soon",
    className: "bg-rose-100 text-rose-900 border-rose-200",
  },
};

export function ConcernBadge({
  level,
  className,
}: {
  level: ConcernLevel;
  className?: string;
}) {
  const style = concernStyles[level];
  return (
    <Badge
      variant="outline"
      className={cn("border", style.className, className)}
    >
      {style.label}
    </Badge>
  );
}

export function VisitSummaryCard({
  visitedAt,
  visitorName,
  location,
  mood,
  concernLevel,
  checklistChecked,
  checklistTotal,
  photoCount,
  notePreview,
  href,
}: {
  visitedAt: string;
  visitorName: string;
  location?: string;
  mood?: "good" | "fair" | "concerned";
  concernLevel: ConcernLevel;
  checklistChecked: number;
  checklistTotal: number;
  photoCount: number;
  notePreview?: string;
  href: string;
}) {
  const date = new Date(visitedAt);
  const moodLabel =
    mood === "good"
      ? "Seemed well"
      : mood === "fair"
        ? "Fair / tired"
        : mood === "concerned"
          ? "Concerned"
          : null;

  return (
    <a href={href} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold">
              {date.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              <span className="text-muted-foreground font-normal">
                {" "}
                · {visitorName}
              </span>
            </CardTitle>
            <ConcernBadge level={concernLevel} />
          </div>
          {location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Checklist {checklistChecked}/{checklistTotal} · {photoCount} photo
            {photoCount === 1 ? "" : "s"}
            {moodLabel ? ` · ${moodLabel}` : ""}
          </p>
          {notePreview && (
            <p className="text-foreground/80 line-clamp-2">{notePreview}</p>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
