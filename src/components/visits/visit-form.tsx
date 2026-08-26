"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultChecklistAnswers,
  CARE_CHECKLIST,
} from "@/lib/care-checklist";
import { createVisitId, saveVisit } from "@/lib/visits-repository";
import type { CareVisit, ConcernLevel, VisitNote } from "@/types/care";
import { CareChecklist } from "@/components/visits/care-checklist";
import { PhotoCapture } from "@/components/visits/photo-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VoiceNoteCapture } from "@/components/visits/voice-note-capture";

function deriveConcern(visit: Pick<CareVisit, "photos" | "mood">): ConcernLevel {
  const photoLevels = visit.photos
    .map((p) => p.analysis?.concernLevel)
    .filter(Boolean) as ConcernLevel[];
  if (photoLevels.includes("urgent") || visit.mood === "concerned") {
    return "urgent";
  }
  if (photoLevels.includes("watch") || visit.mood === "fair") {
    return "watch";
  }
  return "none";
}

export function VisitForm({ existing }: { existing?: CareVisit }) {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState(existing?.visitorName ?? "");
  const [visitedAt, setVisitedAt] = useState(
    existing?.visitedAt
      ? existing.visitedAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [location, setLocation] = useState(existing?.location ?? "");
  const [mood, setMood] = useState<CareVisit["mood"] | "">(
    existing?.mood ?? ""
  );
  const [checklist, setChecklist] = useState(
    existing?.checklist ?? defaultChecklistAnswers()
  );
  const [photos, setPhotos] = useState(existing?.photos ?? []);
  const [noteBody, setNoteBody] = useState("");
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const checkedCount = checklist.filter((c) => c.checked).length;

  const mergedSuggestions = useMemo(() => {
    const fromPhotos = photos.flatMap(
      (p) => p.analysis?.checklistSuggestions ?? []
    );
    return [...new Set([...suggestedIds, ...fromPhotos])];
  }, [photos, suggestedIds]);

  async function handleSave() {
    if (!visitorName.trim()) return;
    setSaving(true);

    const notes: VisitNote[] = existing?.notes ?? [];
    if (noteBody.trim()) {
      notes.unshift({
        id: crypto.randomUUID(),
        body: noteBody.trim(),
        createdAt: new Date().toISOString(),
        source: "text",
      });
    }

    const draft: CareVisit = {
      id: existing?.id ?? createVisitId(),
      visitorName: visitorName.trim(),
      visitedAt: new Date(visitedAt).toISOString(),
      location: location.trim() || undefined,
      mood: mood || undefined,
      checklist,
      photos,
      notes,
      overallConcern: "none",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    draft.overallConcern = deriveConcern(draft);

    await saveVisit(draft);
    router.push(`/visits/${draft.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visit details</CardTitle>
          <CardDescription>
            Who went, when, and how she seemed at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="visitor">Your name</Label>
            <Input
              id="visitor"
              placeholder="e.g. Alex"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visitedAt">Visit date & time</Label>
            <Input
              id="visitedAt"
              type="datetime-local"
              value={visitedAt}
              onChange={(e) => setVisitedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Hospital room 412 / Rehab wing"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>How did she seem?</Label>
            <Select
              value={mood}
              onValueChange={(v) =>
                setMood(v as CareVisit["mood"] | "")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good / engaged</SelectItem>
                <SelectItem value="fair">Fair / tired</SelectItem>
                <SelectItem value="concerned">Concerned — note why below</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="checklist">
        <TabsList className="w-full">
          <TabsTrigger value="checklist" className="flex-1">
            Checklist ({checkedCount}/{CARE_CHECKLIST.length})
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex-1">
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4">
          <CareChecklist
            answers={checklist}
            onChange={setChecklist}
            suggestedIds={mergedSuggestions}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <PhotoCapture
            photos={photos}
            onChange={setPhotos}
            visitDate={visitedAt}
            onSuggestions={(ids) =>
              setSuggestedIds((prev) => [...new Set([...prev, ...ids])])
            }
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <VoiceNoteCapture
            onTranscript={(text) =>
              setNoteBody((prev) => (prev ? `${prev} ${text}` : text))
            }
          />
          <div className="space-y-2">
            <Label htmlFor="note">Visit notes</Label>
            <Textarea
              id="note"
              className="min-h-[160px]"
              placeholder="Speech clarity, appetite, questions for nurses, anything to follow up on…"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
          </div>
          {existing?.notes.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Previous notes</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {existing.notes.map((n) => (
                  <li key={n.id} className="border-l-2 pl-3">
                    {new Date(n.createdAt).toLocaleString()} — {n.body}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sticky bottom-0 bg-background/95 py-3 border-t -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-0 sm:static sm:bg-transparent sm:py-0">
        <Button
          type="button"
          size="lg"
          className="bg-teal-600 hover:bg-teal-700"
          disabled={!visitorName.trim() || saving}
          onClick={handleSave}
        >
          {existing ? "Update visit" : "Save visit"}
        </Button>
      </div>
    </div>
  );
}
