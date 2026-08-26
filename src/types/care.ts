/** Severity for AI-flagged observations — not a medical diagnosis. */
export type ConcernLevel = "none" | "watch" | "urgent";

export type CareCategory =
  | "environment"
  | "hygiene"
  | "nutrition"
  | "mobility"
  | "medication"
  | "skin"
  | "engagement"
  | "safety";

export interface CareChecklistItem {
  id: string;
  category: CareCategory;
  label: string;
  description: string;
  /** Guidance for what to photograph when checking this item. */
  photoHint?: string;
}

export interface ChecklistAnswer {
  itemId: string;
  checked: boolean;
  note?: string;
}

export interface VisitPhoto {
  id: string;
  /** Base64 data URL for local MVP storage; swap for blob URL / object storage later. */
  dataUrl: string;
  caption?: string;
  capturedAt: string;
  analysis?: PhotoAnalysis;
}

export interface PhotoAnalysis {
  summary: string;
  concernLevel: ConcernLevel;
  observations: string[];
  checklistSuggestions: string[];
  /** True when analysis came from the AI provider; false for mock/offline mode. */
  aiPowered: boolean;
  analyzedAt: string;
}

export interface VisitNote {
  id: string;
  body: string;
  createdAt: string;
  source?: "text" | "voice";
  audioPath?: string;
}

export interface CareCircle {
  id: string;
  name: string;
  patientLabel: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

export interface CircleMember {
  id: string;
  circleId: string;
  userId: string;
  role: "owner" | "member";
  displayName: string;
  joinedAt: string;
}

export interface VisitReminder {
  id: string;
  circleId: string;
  userId: string;
  title: string;
  remindAt: string;
  enabled: boolean;
  createdAt: string;
}

export interface CareVisit {
  id: string;
  visitedAt: string;
  visitorName: string;
  location?: string;
  mood?: "good" | "fair" | "concerned";
  checklist: ChecklistAnswer[];
  photos: VisitPhoto[];
  notes: VisitNote[];
  overallConcern: ConcernLevel;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzePhotoRequest {
  imageBase64: string;
  context?: {
    visitDate?: string;
    checklistLabels?: string[];
    userCaption?: string;
  };
}

export interface AnalyzePhotoResponse {
  analysis: PhotoAnalysis;
}
