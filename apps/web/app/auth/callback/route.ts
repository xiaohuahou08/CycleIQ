import { NextResponse } from "next/server";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";
import { AUTH_NEXT_COOKIE, readAuthNextFromCookieHeader } from "@/lib/auth-oauth-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieHeader = request.headers.get("cookie");
  const nextFromCookie = readAuthNextFromCookieHeader(cookieHeader);
  const next =
    safeInternalRedirectPath(searchParams.get("next")) ??
    safeInternalRedirectPath(nextFromCookie) ??
    "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.delete(AUTH_NEXT_COOKIE);
      return response;
    }
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "oauth");
  const response = NextResponse.redirect(login);
  response.cookies.delete(AUTH_NEXT_COOKIE);
  return response;
}
