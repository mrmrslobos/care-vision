"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import type { VisitPhoto } from "@/types/care";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ConcernBadge } from "@/components/visits/visit-summary-card";
import { compressImageFile } from "@/lib/compress-image";

export function PhotoCapture({
  photos,
  onChange,
  visitDate,
  onSuggestions,
}: {
  photos: VisitPhoto[];
  onChange: (photos: VisitPhoto[]) => void;
  visitDate: string;
  onSuggestions?: (ids: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);

    const newPhotos: VisitPhoto[] = [];

    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await compressImageFile(file);
      newPhotos.push({
        id: crypto.randomUUID(),
        dataUrl,
        capturedAt: new Date().toISOString(),
      });
    }

    onChange([...photos, ...newPhotos]);
  }

  async function analyzePhoto(photo: VisitPhoto) {
    setAnalyzingId(photo.id);
    setError(null);
    try {
      const res = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photo.dataUrl,
          context: {
            visitDate,
            userCaption: photo.caption,
          },
        }),
      });

      const raw = await res.text();
      let data: { analysis?: VisitPhoto["analysis"]; error?: string };
      try {
        data = JSON.parse(raw) as { analysis?: VisitPhoto["analysis"]; error?: string };
      } catch {
        throw new Error(
          raw.slice(0, 120) || "Server returned an invalid response"
        );
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }
      const updated = photos.map((p) =>
        p.id === photo.id ? { ...p, analysis: data.analysis } : p
      );
      onChange(updated);
      if (data.analysis?.checklistSuggestions?.length && onSuggestions) {
        onSuggestions(data.analysis.checklistSuggestions);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze photo");
    } finally {
      setAnalyzingId(null);
    }
  }

  function removePhoto(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }

  function updateCaption(id: string, caption: string) {
    onChange(
      photos.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Add photos
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          On mobile, use the camera. Avoid faces or identifying labels when
          possible.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {photos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Photos help you remember the room, meals, meds setup, and mobility
            aids — and AI can suggest checklist items to review.
          </CardContent>
        </Card>
      )}

      <ul className="space-y-4">
        {photos.map((photo) => (
          <li key={photo.id} className="rounded-lg border overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt={photo.caption || "Visit photo"}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => removePhoto(photo.id)}
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`caption-${photo.id}`}>Caption</Label>
                <Input
                  id={`caption-${photo.id}`}
                  placeholder="e.g. Nightstand and call button"
                  value={photo.caption ?? ""}
                  onChange={(e) => updateCaption(photo.id, e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={analyzingId === photo.id}
                onClick={() => analyzePhoto(photo)}
              >
                {analyzingId === photo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {photo.analysis?.aiPowered ? "Re-analyze" : "Analyze with AI"}
              </Button>
              {photo.analysis && (
                <div className="rounded-md bg-muted/60 p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">AI summary</span>
                    <ConcernBadge level={photo.analysis.concernLevel} />
                    {!photo.analysis.aiPowered && (
                      <span className="text-xs text-muted-foreground">
                        (offline mode)
                      </span>
                    )}
                  </div>
                  <p>{photo.analysis.summary}</p>
                  {photo.analysis.observations.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {photo.analysis.observations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
