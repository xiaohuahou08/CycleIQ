import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isProtectedRoute, oauthCallbackRelayTarget, resolveAuthRedirect } from "@/lib/auth-redirect.mjs";

function oauthErrorRelay(req: NextRequest): NextResponse | null {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === "/auth/callback") return null;
  const oauthError = searchParams.get("error_code") ?? searchParams.get("error");
  if (
    oauthError !== "bad_oauth_callback" &&
    oauthError !== "bad_oauth_state" &&
    searchParams.get("error") !== "invalid_request"
  ) {
    return null;
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("error", "oauth");
  return NextResponse.redirect(login);
}

/** Relay `?code=` from `/` or `/login` to /auth/callback for server PKCE exchange. */
function oauthCodeRelay(req: NextRequest): NextResponse | null {
  const target = oauthCallbackRelayTarget(req.nextUrl.pathname, req.nextUrl.searchParams);
  if (!target) return null;
  return NextResponse.redirect(new URL(target, req.url));
}

export async function middleware(req: NextRequest) {
  const errorRelay = oauthErrorRelay(req);
  if (errorRelay) return errorRelay;

  const codeRelay = oauthCodeRelay(req);
  if (codeRelay) return codeRelay;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute(req.nextUrl.pathname)) {
      const login = new URL("/login", req.url);
      login.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Use getUser() (not getSession()) so the token is validated against the
  // Supabase auth server, rejecting tampered or expired cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authNext = req.nextUrl.searchParams.get("next");
  const redirectPath = resolveAuthRedirect(req.nextUrl.pathname, Boolean(user), authNext);
  if (redirectPath) {
    const redirectUrl = new URL(redirectPath, req.url);
    const redirectRes = NextResponse.redirect(redirectUrl);
    res.cookies.getAll().forEach((c) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      redirectRes.cookies.set(c.name, c.value, c as any);
    });
    return redirectRes;
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/trades/:path*",
    "/cycles/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
