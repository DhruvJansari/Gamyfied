import { NextResponse, type NextRequest } from "next/server";

// Route gating on cookie *presence* only. Validation is the API's job: a stale marker just
// means the page renders and the first request comes back 401, which the client handles.

const SESSION_MARKER_COOKIE = "gf_session";

const AUTH_PAGES = ["/sign-in", "/sign-up", "/verify"];
const PROTECTED_PREFIXES = ["/onboarding", "/workspace", "/settings"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const isSignedIn = request.cookies.has(SESSION_MARKER_COOKIE);

  if (isSignedIn && AUTH_PAGES.some((p) => pathname === p)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isSignedIn && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sign-in", "/sign-up", "/verify", "/onboarding/:path*", "/workspace/:path*", "/settings/:path*"],
};
