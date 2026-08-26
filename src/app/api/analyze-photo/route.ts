import { NextResponse } from "next/server";
import { analyzeVisitPhoto } from "@/lib/ai/analyze-photo";
import type { AnalyzePhotoRequest } from "@/types/care";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzePhotoRequest;

    if (!body.imageBase64?.trim()) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeVisitPhoto(body);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
