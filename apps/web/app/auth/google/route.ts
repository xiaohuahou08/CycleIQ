import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";
import { oauthCallbackUrlForOrigin, resolveRequestOrigin } from "@/lib/auth-origin";
import { AUTH_NEXT_COOKIE } from "@/lib/auth-oauth-next";
import {
  createSupabaseOAuthRouteClient,
  supabaseProjectRef,
} from "@/lib/supabase/server";

/**
 * Start Google OAuth on the server so PKCE cookies are set on the response
 * and redirectTo uses the request host (Vercel preview vs production vs local).
 */
export async function GET(request: NextRequest) {
  const origin = resolveRequestOrigin(request);
  const redirectTo = oauthCallbackUrlForOrigin(origin);
  const { searchParams } = request.nextUrl;
  const next = safeInternalRedirectPath(searchParams.get("next"));

  if (searchParams.get("debug") === "1") {
    return NextResponse.json({
      origin,
      redirectTo,
      supabaseProject: supabaseProjectRef(),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
      nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      hint:
        "Add redirectTo (and https://YOUR-PREVIEW/**) to Redirect URLs on THIS supabaseProject.",
    });
  }

  const { supabase, pendingCookies } = createSupabaseOAuthRouteClient(request);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  if (next) {
    response.cookies.set(AUTH_NEXT_COOKIE, next, {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
    });
  }
  return response;
}
