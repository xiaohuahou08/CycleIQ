import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";
import { oauthCallbackUrlForOrigin, resolveRequestOrigin } from "@/lib/auth-origin";
import { AUTH_NEXT_COOKIE } from "@/lib/auth-oauth-next";
import {
  getSupabaseProjectUrl,
  supabaseUrlHadPathSuffix,
} from "@/lib/supabase/env";
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
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
    return NextResponse.json({
      origin,
      redirectTo,
      supabaseProject: supabaseProjectRef(),
      supabaseUrl: getSupabaseProjectUrl() ?? null,
      supabaseUrlMisconfigured: supabaseUrlHadPathSuffix(rawSupabaseUrl ?? undefined),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
      nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      hint: supabaseUrlHadPathSuffix(rawSupabaseUrl ?? undefined)
        ? "NEXT_PUBLIC_SUPABASE_URL must be https://<project>.supabase.co only — remove /auth/v1/callback from Vercel env."
        : "Add redirectTo (and https://YOUR-PREVIEW/**) to Redirect URLs on THIS supabaseProject.",
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

  if (data.url.includes("/auth/v1/callback/auth/v1/")) {
    return NextResponse.redirect(new URL("/login?error=supabase_url", origin));
  }

  const response = NextResponse.redirect(data.url);
  const secure = origin.startsWith("https://");
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, { ...options, secure: secure || options.secure });
  });
  if (next) {
    response.cookies.set(AUTH_NEXT_COOKIE, next, {
      path: "/",
      maxAge: 600,
      sameSite: "lax",
      secure,
    });
  }
  return response;
}
