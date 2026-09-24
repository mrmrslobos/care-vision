import "server-only";
import { config } from "../config";
import { fetchJson, settle } from "../http";
import type { ImmichData } from "../types";

export async function getImmich(): Promise<ImmichData> {
  const { url, apiKey } = config.immich;
  const opts = { headers: { "x-api-key": apiKey ?? "" }, label: "Immich" };

  type Stats = {
    photos?: number;
    videos?: number;
    usage?: number;
    usageByUser?: { userName?: string; photos?: number; videos?: number; usage?: number }[];
  };
  const [stats, storage, version] = await Promise.all([
    fetchJson<Stats>(`${url}/api/server/statistics`, opts),
    settle(fetchJson<{ diskSizeRaw?: number; diskUseRaw?: number }>(`${url}/api/server/storage`, opts)),
    settle(fetchJson<{ major: number; minor: number; patch: number }>(`${url}/api/server/version`, opts)),
  ]);

  return {
    version: version ? `v${version.major}.${version.minor}.${version.patch}` : null,
    photos: stats.photos ?? 0,
    videos: stats.videos ?? 0,
    usageBytes: stats.usage ?? 0,
    disk:
      storage?.diskSizeRaw && storage.diskUseRaw !== undefined
        ? { total: storage.diskSizeRaw, used: storage.diskUseRaw }
        : null,
    users: (stats.usageByUser ?? [])
      .map((u) => ({
        name: u.userName ?? "User",
        photos: u.photos ?? 0,
        videos: u.videos ?? 0,
        usageBytes: u.usage ?? 0,
      }))
      .sort((a, b) => b.usageBytes - a.usageBytes),
  };
}
