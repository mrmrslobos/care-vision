"use client";

import { CARE_CHECKLIST, CATEGORY_LABELS } from "@/lib/care-checklist";
import type { ChecklistAnswer } from "@/types/care";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function CareChecklist({
  answers,
  onChange,
  suggestedIds = [],
}: {
  answers: ChecklistAnswer[];
  onChange: (answers: ChecklistAnswer[]) => void;
  suggestedIds?: string[];
}) {
  const byCategory = CARE_CHECKLIST.reduce<
    Record<string, typeof CARE_CHECKLIST>
  >((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  function updateItem(itemId: string, patch: Partial<ChecklistAnswer>) {
    onChange(
      answers.map((a) => (a.itemId === itemId ? { ...a, ...patch } : a))
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
          </h3>
          <ul className="space-y-4">
            {items.map((item) => {
              const answer = answers.find((a) => a.itemId === item.id);
              const suggested = suggestedIds.includes(item.id);
              return (
                <li
                  key={item.id}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={item.id}
                      checked={answer?.checked ?? false}
                      onCheckedChange={(checked) =>
                        updateItem(item.id, { checked: checked === true })
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label
                          htmlFor={item.id}
                          className="font-medium leading-snug cursor-pointer"
                        >
                          {item.label}
                        </Label>
                        {suggested && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-teal-50 text-teal-800 border-teal-200"
                          >
                            AI suggested
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      {item.photoHint && (
                        <p className="text-xs text-muted-foreground">
                          Photo tip: {item.photoHint}
                        </p>
                      )}
                    </div>
                  </div>
                  {answer?.checked && (
                    <Textarea
                      placeholder="Optional note for this item…"
                      value={answer.note ?? ""}
                      onChange={(e) =>
                        updateItem(item.id, { note: e.target.value })
                      }
                      className="text-sm min-h-[60px]"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
