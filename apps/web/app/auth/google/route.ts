import { NextResponse } from "next/server";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";
import { oauthCallbackUrlForOrigin, resolveRequestOrigin } from "@/lib/auth-origin";
import { AUTH_NEXT_COOKIE } from "@/lib/auth-oauth-next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Start Google OAuth on the server so PKCE cookies are set on the response
 * and redirectTo uses the request host (Vercel preview vs production vs local).
 */
export async function GET(request: Request) {
  const origin = resolveRequestOrigin(request);
  const redirectTo = oauthCallbackUrlForOrigin(origin);
  const { searchParams } = new URL(request.url);
  const next = safeInternalRedirectPath(searchParams.get("next"));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "oauth");
    return NextResponse.redirect(login);
  }

  const response = NextResponse.redirect(data.url);
  if (next) {
    response.cookies.set(AUTH_NEXT_COOKIE, next, {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
    });
  }
  return response;
}
