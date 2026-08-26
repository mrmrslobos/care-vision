import type { AnalyzePhotoRequest, PhotoAnalysis, ConcernLevel } from "@/types/care";

const STROKE_CARE_PROMPT = `You are assisting a family member documenting care visits for a loved one recovering from a stroke.
You are NOT a doctor. Do not diagnose. Flag practical care-environment concerns only.
Focus on: cleanliness, fall hazards, hydration/food visible, medication organization, skin redness (if shown),
mobility equipment placement, call-button reach, and general signs of neglect or good care.
Be concise, compassionate, and actionable. If uncertain, say so and suggest what to ask staff.

Respond ONLY with JSON matching the required schema. No markdown fences or extra commentary.`;

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

const ANALYSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    concernLevel: {
      type: "STRING",
      enum: ["none", "watch", "urgent"],
    },
    observations: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    checklistSuggestions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["summary", "concernLevel", "observations", "checklistSuggestions"],
};

type GeminiGenerateResult = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
  error?: { message?: string };
};

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

/** Collect model output text, skipping internal thinking parts. */
function extractModelText(result: GeminiGenerateResult): string {
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const answerParts = parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text!.trim());

  if (answerParts.length > 0) {
    return answerParts.join("\n").trim();
  }

  // Fallback: last non-empty text part (some SDK versions omit `thought`)
  const fallback = parts
    .map((p) => p.text?.trim())
    .filter(Boolean)
    .pop();
  return fallback ?? "";
}

function parseAnalysisJson(raw: string): Partial<PhotoAnalysis> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Gemini returned an empty response");
  }

  // Direct JSON
  try {
    return JSON.parse(trimmed) as Partial<PhotoAnalysis>;
  } catch {
    // Markdown code fence
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim()) as Partial<PhotoAnalysis>;
    }

    // First JSON object in the string
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as Partial<PhotoAnalysis>;
    }

    throw new Error(
      `Gemini returned non-JSON text: ${trimmed.slice(0, 120)}…`
    );
  }
}

function mapParsedAnalysis(parsed: Partial<PhotoAnalysis>): PhotoAnalysis {
  return {
    summary: parsed.summary ?? "Analysis complete.",
    concernLevel: normalizeConcernLevel(parsed.concernLevel),
    observations: Array.isArray(parsed.observations)
      ? parsed.observations.map(String)
      : [],
    checklistSuggestions: Array.isArray(parsed.checklistSuggestions)
      ? parsed.checklistSuggestions.map(String)
      : [],
    aiPowered: true,
    analyzedAt: new Date().toISOString(),
  };
}

async function callGemini(
  url: string,
  body: Record<string, unknown>
): Promise<Response> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) return response;

  const detail = await response.text();
  const generationConfig = body.generationConfig as
    | { thinkingConfig?: { thinkingBudget?: number } }
    | undefined;

  // Retry without thinking budget if the model rejects that field
  if (
    generationConfig?.thinkingConfig &&
    /thinking/i.test(detail)
  ) {
    const retryBody = {
      ...body,
      generationConfig: {
        ...generationConfig,
        thinkingConfig: undefined,
      },
    };
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(retryBody),
    });
  }

  return new Response(detail, {
    status: response.status,
    statusText: response.statusText,
  });
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

Checklist item ids you may suggest: room-clean, call-button, fall-hazards, hydration, meals, meds-visible, skin-check, mobility-aids, hygiene, engagement, therapy-notes, staff-responsive`;

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
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
      maxOutputTokens: 1024,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await callGemini(url, body);
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Gemini analysis failed: ${response.status} ${responseText.slice(0, 300)}`);
  }

  let result: GeminiGenerateResult;
  try {
    result = JSON.parse(responseText) as GeminiGenerateResult;
  } catch {
    throw new Error("Gemini returned an invalid API response");
  }

  if (result.error?.message) {
    throw new Error(`Gemini error: ${result.error.message}`);
  }

  const content = extractModelText(result);
  const parsed = parseAnalysisJson(content);
  return mapParsedAnalysis(parsed);
}
