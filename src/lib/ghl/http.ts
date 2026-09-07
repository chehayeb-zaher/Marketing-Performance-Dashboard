import "server-only";
import { getGhlEnv } from "./env";

export class GhlApiError extends Error {
  status?: number;
  endpoint: string;

  constructor(message: string, endpoint: string, status?: number) {
    super(message);
    this.name = "GhlApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

export type GhlQueryParams = Record<string, string | number | boolean | undefined | null>;

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Low-level authenticated GET against the GoHighLevel API.
 * Never logs the Authorization header or request/response bodies containing PII.
 * Retries on 429 (rate limit) and transient 5xx errors with exponential backoff,
 * honoring a Retry-After header when the API provides one.
 */
export async function ghlGet<T = unknown>(path: string, params?: GhlQueryParams): Promise<T> {
  const env = getGhlEnv();
  const url = new URL(path, env.GHL_API_BASE_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.GHL_PRIVATE_TOKEN}`,
          Version: env.GHL_API_VERSION,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_BACKOFF_MS * 2 ** attempt);
        continue;
      }
      throw new GhlApiError(
        `Network error while calling the GoHighLevel API. Check connectivity and GHL_API_BASE_URL.`,
        path,
      );
    }

    if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
      if (attempt < MAX_RETRIES) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
        const delay = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : BASE_BACKOFF_MS * 2 ** attempt;
        await sleep(delay);
        continue;
      }
    }

    if (!response.ok) {
      let detail = "";
      try {
        const text = await response.text();
        detail = text.slice(0, 500);
      } catch {
        // ignore body read failures
      }
      const hint =
        response.status === 401 || response.status === 403
          ? " Check GHL_PRIVATE_TOKEN validity and that the required scopes are granted."
          : response.status === 429
            ? " Rate limit exceeded even after retries - reduce concurrency or add caching."
            : "";
      throw new GhlApiError(
        `GoHighLevel API request to ${path} failed with status ${response.status}.${hint}${
          detail ? ` Response: ${detail}` : ""
        }`,
        path,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new GhlApiError(`GoHighLevel API returned a non-JSON response for ${path}.`, path, response.status);
    }
  }

  // Unreachable, but keeps TypeScript happy about the function always returning.
  throw new GhlApiError(`GoHighLevel API request to ${path} exhausted retries.`, path);
}

/** Runs async tasks with a bounded number of concurrent in-flight promises. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => runNext());
  await Promise.all(workers);
  return results;
}
