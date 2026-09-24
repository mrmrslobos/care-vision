import "server-only";

export class UpstreamError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 8000;

export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit & { label?: string } = {},
): Promise<T> {
  const { label = new URL(url).host, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", ...rest.headers },
    });
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause?.code;
    const reason =
      (err as Error).name === "TimeoutError" ? "timed out" : cause ?? (err as Error).message;
    throw new UpstreamError(`${label}: unreachable (${reason})`);
  }
  if (!res.ok) {
    const hint = res.status === 401 || res.status === 403 ? " — check the API key" : "";
    throw new UpstreamError(`${label}: HTTP ${res.status}${hint}`, res.status);
  }
  return (await res.json()) as T;
}

/** Resolves to the value, or null if the promise rejects. */
export const settle = <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
