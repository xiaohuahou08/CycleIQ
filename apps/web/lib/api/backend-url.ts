/** Backend origin for server-side proxy routes (no trailing slash). */
export function backendOrigin(): string {
  const raw =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.BACKEND_URL ??
    "";
  return raw.replace(/\/$/, "");
}
