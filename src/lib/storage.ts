import type { CareVisit } from "@/types/care";

const STORAGE_KEY = "care-visit-log:v1";

function readAll(): CareVisit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CareVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(visits: CareVisit[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

export function listVisits(): CareVisit[] {
  return readAll().sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
  );
}

export function getVisit(id: string): CareVisit | undefined {
  return readAll().find((v) => v.id === id);
}

export function saveVisit(visit: CareVisit): CareVisit {
  const visits = readAll();
  const index = visits.findIndex((v) => v.id === visit.id);
  const updated = { ...visit, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    visits[index] = updated;
  } else {
    visits.push(updated);
  }
  writeAll(visits);
  return updated;
}

export function deleteVisit(id: string): void {
  writeAll(readAll().filter((v) => v.id !== id));
}

export function createVisitId(): string {
  return crypto.randomUUID();
}
