import { ApiError, ErrorCode } from "./errors";

// Server-component counterpart of client.ts for public, cookie-less reads (the /u/[handle]
// page). Paths still come from endpoints.ts; only the origin lives here, because on the server
// there is no same-origin rewrite to lean on. Mirrors next.config.ts.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4000";

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

export async function serverRequest<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}${path}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    throw new ApiError({ code: ErrorCode.NETWORK, status: 0, message: err instanceof Error ? err.message : "Network error" });
  }
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (body && body.ok) return body.data;
  if (body && !body.ok) {
    throw new ApiError({ code: body.error.code as ErrorCode, status: res.status, message: body.error.message, fields: body.error.fields });
  }
  throw new ApiError({ code: ErrorCode.UNKNOWN, status: res.status, message: "Unexpected response" });
}
