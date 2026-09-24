// Posters are loaded through /api/img/<service> so API keys and Plex tokens
// stay on the server. Only same-origin relative paths are accepted.

export const IMAGE_SERVICES = ["plex", "sonarr", "radarr", "bookshelf"] as const;
export type ImageService = (typeof IMAGE_SERVICES)[number];

export const imageUrl = (service: ImageService, path: string) =>
  `/api/img/${service}?p=${encodeURIComponent(path)}`;

export function isSafePath(path: string | null): path is string {
  return (
    !!path &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.includes("..") &&
    !/[\r\n]/.test(path) &&
    path.length < 1024
  );
}
