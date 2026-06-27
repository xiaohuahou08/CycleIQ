/**
 * Base URL for Flask API calls from the browser.
 *
 * - Local: `NEXT_PUBLIC_API_URL=http://localhost:5000`
 * - Vercel (preview/production): `NEXT_PUBLIC_API_PROXY=1` + server `API_BACKEND_URL`
 *   → browser calls same-origin `/api/*`, Next rewrites to Render (no CORS).
 */
export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_PROXY === "1") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

export function apiUrl(path: string): string {
  if (process.env.NEXT_PUBLIC_API_PROXY === "1") {
    return path;
  }
  const base = getApiBase();
  if (!base) {
    throw new Error(
      "Set NEXT_PUBLIC_API_URL (local) or NEXT_PUBLIC_API_PROXY=1 with API_BACKEND_URL (Vercel).",
    );
  }
  return `${base}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), init);
  } catch (err) {
    if (err instanceof TypeError) {
      const target = process.env.NEXT_PUBLIC_API_PROXY === "1" ? "same-origin /api proxy" : getApiBase();
      throw new Error(
        `Cannot reach API (${target}). On Vercel Preview set NEXT_PUBLIC_API_PROXY=1 and API_BACKEND_URL. Ensure Render is deployed from dev and awake.`,
      );
    }
    throw err;
  }
}
