import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";
import { resolveRequestOrigin } from "@/lib/auth-origin";
import { AUTH_NEXT_COOKIE, readAuthNextFromCookieHeader } from "@/lib/auth-oauth-next";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = resolveRequestOrigin(request);
  const code = searchParams.get("code");
  const cookieHeader = request.headers.get("cookie");
  const nextFromCookie = readAuthNextFromCookieHeader(cookieHeader);
  const next =
    safeInternalRedirectPath(searchParams.get("next")) ??
    safeInternalRedirectPath(nextFromCookie) ??
    "/dashboard";

  if (code) {
    const success = NextResponse.redirect(`${origin}${next}`);
    const supabase = createSupabaseRouteHandlerClient(request, success);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      success.cookies.delete(AUTH_NEXT_COOKIE);
      return success;
    }
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "oauth");
  const response = NextResponse.redirect(login);
  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
