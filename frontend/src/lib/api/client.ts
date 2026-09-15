import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { endpoints } from "./endpoints";
import { ApiError, ErrorCode } from "./errors";

// The single axios instance (project/Rules.md). Same-origin via the /api rewrite, so the
// browser attaches the httpOnly auth cookies itself; nothing here ever sees a token.

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; fields?: Record<string, string> } };

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const SESSION_MARKER_COOKIE = "gf_session";

/** Non-secret marker set by the API alongside the auth cookies. Tells us a refresh is worth trying. */
export function hasSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_MARKER_COOKIE}=`));
}

export const client = axios.create({
  baseURL: "",
  timeout: 15_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function normalize(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<Envelope<unknown>>;
    if (axErr.code === "ECONNABORTED" || axErr.code === "ETIMEDOUT") {
      return new ApiError({ code: ErrorCode.TIMEOUT, status: 0, message: "Request timed out" });
    }
    if (!axErr.response) {
      return new ApiError({ code: ErrorCode.NETWORK, status: 0, message: "Network error" });
    }
    const body = axErr.response.data;
    const retryAfter = Number(axErr.response.headers["retry-after"]);
    if (body && typeof body === "object" && "ok" in body && body.ok === false) {
      return new ApiError({
        code: body.error.code as ErrorCode,
        status: axErr.response.status,
        message: body.error.message,
        fields: body.error.fields,
        retryAfterSec: Number.isFinite(retryAfter) ? retryAfter : null,
      });
    }
    return new ApiError({ code: ErrorCode.UNKNOWN, status: axErr.response.status, message: "Unexpected response" });
  }
  return new ApiError({ code: ErrorCode.UNKNOWN, status: 0, message: err instanceof Error ? err.message : "Unknown error" });
}

// --- Silent refresh -------------------------------------------------------------------
// One refresh at a time per tab (the promise) and per browser (the Web Lock), so several
// expired requests, even across tabs, produce a single rotation instead of a stampede.

let inflight: Promise<void> | null = null;

async function refreshOnce(): Promise<void> {
  const run = () =>
    axios.post(endpoints.auth.refresh, undefined, { withCredentials: true, timeout: 15_000 }).then(
      () => undefined,
      (err: unknown) => {
        // Another tab won the race and already holds the new cookies: that is a success for us.
        if (normalize(err).code === ErrorCode.REFRESH_RACE) return;
        throw err;
      },
    );

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return navigator.locks.request("gf-auth-refresh", run);
  }
  return run();
}

function refresh(): Promise<void> {
  inflight ??= refreshOnce().finally(() => {
    inflight = null;
  });
  return inflight;
}

client.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    const apiErr = normalize(error);
    const config = axios.isAxiosError(error) ? (error.config as RetriableConfig | undefined) : undefined;

    const isAuthMiss = apiErr.code === ErrorCode.ACCESS_TOKEN_EXPIRED || apiErr.code === ErrorCode.UNAUTHENTICATED;
    const canRetry = config && !config._retried && config.url !== endpoints.auth.refresh && hasSessionMarker();

    if (isAuthMiss && canRetry) {
      config._retried = true;
      try {
        await refresh();
      } catch (refreshErr) {
        throw normalize(refreshErr);
      }
      return client(config);
    }
    throw apiErr;
  },
);

/** Unwraps the success envelope so services return plain data. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await client.request<Envelope<T>>(config);
  const body = res.data;
  if (body.ok) return body.data;
  // A 2xx with ok:false should never happen; treat it as the error it describes.
  throw new ApiError({ code: body.error.code as ErrorCode, status: res.status, message: body.error.message, fields: body.error.fields });
}
