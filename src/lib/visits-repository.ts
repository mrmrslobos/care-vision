import type {
  CareCircle,
  CareVisit,
  CircleMember,
  ChecklistAnswer,
  PhotoAnalysis,
  VisitReminder,
} from "@/types/care";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  listVisits as listLocalVisits,
  getVisit as getLocalVisit,
  saveVisit as saveLocalVisit,
  createVisitId,
} from "@/lib/storage";

const ACTIVE_CIRCLE_KEY = "care-visit-log:active-circle";

type DbVisit = {
  id: string;
  circle_id: string;
  visitor_user_id: string | null;
  visitor_name: string;
  visited_at: string;
  location: string | null;
  mood: CareVisit["mood"] | null;
  checklist: ChecklistAnswer[];
  overall_concern: CareVisit["overallConcern"];
  created_at: string;
  updated_at: string;
  visit_photos?: Array<{
    id: string;
    data_url: string | null;
    caption: string | null;
    captured_at: string;
    analysis: PhotoAnalysis | null;
  }>;
  visit_notes?: Array<{
    id: string;
    body: string;
    source: "text" | "voice";
    audio_path: string | null;
    created_at: string;
  }>;
};

function mapDbVisit(row: DbVisit): CareVisit {
  return {
    id: row.id,
    visitedAt: row.visited_at,
    visitorName: row.visitor_name,
    location: row.location ?? undefined,
    mood: row.mood ?? undefined,
    checklist: row.checklist ?? [],
    overallConcern: row.overall_concern,
    photos:
      row.visit_photos?.map((p) => ({
        id: p.id,
        dataUrl: p.data_url ?? "",
        caption: p.caption ?? undefined,
        capturedAt: p.captured_at,
        analysis: p.analysis ?? undefined,
      })) ?? [],
    notes:
      row.visit_notes?.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.created_at,
        source: n.source,
        audioPath: n.audio_path ?? undefined,
      })) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getActiveCircleId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CIRCLE_KEY);
}

export function setActiveCircleId(circleId: string): void {
  localStorage.setItem(ACTIVE_CIRCLE_KEY, circleId);
}

export async function getSessionUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function listVisits(): Promise<CareVisit[]> {
  const supabase = createClient();
  const circleId = getActiveCircleId();
  const user = await getSessionUser();

  if (supabase && user && circleId) {
    const { data, error } = await supabase
      .from("care_visits")
      .select(
        `*, visit_photos(id, data_url, caption, captured_at, analysis), visit_notes(id, body, source, audio_path, created_at)`
      )
      .eq("circle_id", circleId)
      .order("visited_at", { ascending: false });

    if (!error && data) {
      return data.map((row) => mapDbVisit(row as DbVisit));
    }
  }

  return listLocalVisits();
}

export async function getVisit(id: string): Promise<CareVisit | undefined> {
  const supabase = createClient();
  const circleId = getActiveCircleId();
  const user = await getSessionUser();

  if (supabase && user && circleId) {
    const { data, error } = await supabase
      .from("care_visits")
      .select(
        `*, visit_photos(id, data_url, caption, captured_at, analysis), visit_notes(id, body, source, audio_path, created_at)`
      )
      .eq("id", id)
      .eq("circle_id", circleId)
      .single();

    if (!error && data) {
      return mapDbVisit(data as DbVisit);
    }
  }

  return getLocalVisit(id);
}

export async function saveVisit(visit: CareVisit): Promise<CareVisit> {
  const supabase = createClient();
  const circleId = getActiveCircleId();
  const user = await getSessionUser();

  if (supabase && user && circleId) {
    const visitId = visit.id || createVisitId();
    const now = new Date().toISOString();

    const { error: visitError } = await supabase.from("care_visits").upsert({
      id: visitId,
      circle_id: circleId,
      visitor_user_id: user.id,
      visitor_name: visit.visitorName,
      visited_at: visit.visitedAt,
      location: visit.location ?? null,
      mood: visit.mood ?? null,
      checklist: visit.checklist,
      overall_concern: visit.overallConcern,
      updated_at: now,
      created_at: visit.createdAt ?? now,
    });

    if (visitError) throw visitError;

    await supabase.from("visit_photos").delete().eq("visit_id", visitId);
    if (visit.photos.length > 0) {
      const { error: photoError } = await supabase.from("visit_photos").insert(
        visit.photos.map((p) => ({
          id: p.id,
          visit_id: visitId,
          data_url: p.dataUrl,
          caption: p.caption ?? null,
          captured_at: p.capturedAt,
          analysis: p.analysis ?? null,
        }))
      );
      if (photoError) throw photoError;
    }

    await supabase.from("visit_notes").delete().eq("visit_id", visitId);
    if (visit.notes.length > 0) {
      const { error: noteError } = await supabase.from("visit_notes").insert(
        visit.notes.map((n) => ({
          id: n.id,
          visit_id: visitId,
          body: n.body,
          source: n.source ?? "text",
          audio_path: n.audioPath ?? null,
          created_at: n.createdAt,
        }))
      );
      if (noteError) throw noteError;
    }

    const saved = await getVisit(visitId);
    if (saved) return saved;
  }

  return saveLocalVisit(visit);
}

export async function getMyCircles(): Promise<
  Array<CareCircle & { role: CircleMember["role"] }>
> {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("circle_members")
    .select("role, care_circles(id, name, patient_label, invite_code, created_by, created_at)")
    .eq("user_id", user.id);

  if (error || !data) return [];

  return data.map((row) => {
    const raw = row.care_circles as unknown;
    const circle = (Array.isArray(raw) ? raw[0] : raw) as {
      id: string;
      name: string;
      patient_label: string;
      invite_code: string;
      created_by: string;
      created_at: string;
    };
    return {
      id: circle.id,
      name: circle.name,
      patientLabel: circle.patient_label,
      inviteCode: circle.invite_code,
      createdBy: circle.created_by,
      createdAt: circle.created_at,
      role: row.role as CircleMember["role"],
    };
  });
}

export async function createCircle(
  name: string,
  patientLabel: string,
  displayName: string
): Promise<CareCircle | null> {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!supabase || !user) return null;

  const { data: circle, error } = await supabase
    .from("care_circles")
    .insert({
      name,
      patient_label: patientLabel,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !circle) return null;

  await supabase.from("circle_members").insert({
    circle_id: circle.id,
    user_id: user.id,
    role: "owner",
    display_name: displayName,
  });

  setActiveCircleId(circle.id);

  return {
    id: circle.id,
    name: circle.name,
    patientLabel: circle.patient_label,
    inviteCode: circle.invite_code,
    createdBy: circle.created_by,
    createdAt: circle.created_at,
  };
}

export async function joinCircle(
  inviteCode: string,
  displayName: string
): Promise<CareCircle | null> {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!supabase || !user) return null;

  const { data: circle, error } = await supabase
    .from("care_circles")
    .select()
    .eq("invite_code", inviteCode.trim().toLowerCase())
    .single();

  if (error || !circle) return null;

  await supabase.from("circle_members").upsert({
    circle_id: circle.id,
    user_id: user.id,
    role: "member",
    display_name: displayName,
  });

  setActiveCircleId(circle.id);

  return {
    id: circle.id,
    name: circle.name,
    patientLabel: circle.patient_label,
    inviteCode: circle.invite_code,
    createdBy: circle.created_by,
    createdAt: circle.created_at,
  };
}

export async function listReminders(): Promise<VisitReminder[]> {
  const supabase = createClient();
  const user = await getSessionUser();
  const circleId = getActiveCircleId();
  if (!supabase || !user || !circleId) return [];

  const { data, error } = await supabase
    .from("visit_reminders")
    .select("*")
    .eq("circle_id", circleId)
    .eq("user_id", user.id)
    .order("remind_at", { ascending: true });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    circleId: r.circle_id,
    userId: r.user_id,
    title: r.title,
    remindAt: r.remind_at,
    enabled: r.enabled,
    createdAt: r.created_at,
  }));
}

export async function saveReminder(
  reminder: Omit<VisitReminder, "id" | "createdAt"> & { id?: string }
): Promise<VisitReminder | null> {
  const supabase = createClient();
  const user = await getSessionUser();
  if (!supabase || !user) return null;

  const payload = {
    id: reminder.id ?? crypto.randomUUID(),
    circle_id: reminder.circleId,
    user_id: user.id,
    title: reminder.title,
    remind_at: reminder.remindAt,
    enabled: reminder.enabled,
  };

  const { data, error } = await supabase
    .from("visit_reminders")
    .upsert(payload)
    .select()
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    circleId: data.circle_id,
    userId: data.user_id,
    title: data.title,
    remindAt: data.remind_at,
    enabled: data.enabled,
    createdAt: data.created_at,
  };
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase.from("visit_reminders").delete().eq("id", id);
}

export { createVisitId } from "@/lib/storage";

export function isCloudSyncAvailable(): boolean {
  return isSupabaseConfigured();
}
