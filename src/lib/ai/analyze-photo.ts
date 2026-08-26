import type { AnalyzePhotoRequest, PhotoAnalysis, ConcernLevel } from "@/types/care";

const STROKE_CARE_PROMPT = `You are assisting a family member documenting care visits for a loved one recovering from a stroke.
You are NOT a doctor. Do not diagnose. Flag practical care-environment concerns only.
Focus on: cleanliness, fall hazards, hydration/food visible, medication organization, skin redness (if shown),
mobility equipment placement, call-button reach, and general signs of neglect or good care.
Be concise, compassionate, and actionable. If uncertain, say so and suggest what to ask staff.`;

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function mockAnalysis(userCaption?: string): PhotoAnalysis {
  const observations = [
    "Photo received — connect a Gemini API key for automated observations.",
    "Manually review the checklist items that match what you photographed.",
  ];
  if (userCaption?.trim()) {
    observations.push(`Your note: ${userCaption.trim()}`);
  }
  return {
    summary:
      "Offline preview mode. Add GEMINI_API_KEY to enable AI photo review, or complete the checklist manually.",
    concernLevel: "none",
    observations,
    checklistSuggestions: ["room-clean", "fall-hazards", "hydration"],
    aiPowered: false,
    analyzedAt: new Date().toISOString(),
  };
}

function parseImageBase64(imageBase64: string): {
  mimeType: string;
  data: string;
} {
  const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (dataUrlMatch) {
    return { mimeType: dataUrlMatch[1], data: dataUrlMatch[2] };
  }
  return { mimeType: "image/jpeg", data: imageBase64 };
}

function normalizeConcernLevel(value: unknown): ConcernLevel {
  if (value === "watch" || value === "urgent" || value === "none") {
    return value;
  }
  return "none";
}

/**
 * Server-side photo analysis. Uses Google Gemini vision when configured; otherwise returns a helpful mock.
 */
export async function analyzeVisitPhoto(
  request: AnalyzePhotoRequest
): Promise<PhotoAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return mockAnalysis(request.context?.userCaption);
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const checklistContext = request.context?.checklistLabels?.join(", ") ?? "";
  const userCaption = request.context?.userCaption ?? "";
  const { mimeType, data } = parseImageBase64(request.imageBase64);

  const userText = `Visit date: ${request.context?.visitDate ?? "today"}
Checklist focus: ${checklistContext || "general care environment"}
Family note: ${userCaption || "none"}

Respond in JSON with keys: summary (string), concernLevel ("none"|"watch"|"urgent"), observations (string[]), checklistSuggestions (string[] of checklist item ids like room-clean, hydration).`;

  const body = {
    systemInstruction: {
      parts: [{ text: STROKE_CARE_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userText },
          {
            inlineData: {
              mimeType,
              data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 600,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini analysis failed: ${response.status} ${detail}`);
  }

  const result = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini returned an empty response");
  }

  const parsed = JSON.parse(content) as Partial<PhotoAnalysis>;
  return {
    summary: parsed.summary ?? "Analysis complete.",
    concernLevel: normalizeConcernLevel(parsed.concernLevel),
    observations: parsed.observations ?? [],
    checklistSuggestions: parsed.checklistSuggestions ?? [],
    aiPowered: true,
    analyzedAt: new Date().toISOString(),
  };
}
