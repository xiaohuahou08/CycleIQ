import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isProtectedRoute, resolveAuthRedirect } from "@/lib/auth-redirect.mjs";

export async function middleware(req: NextRequest) {
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authNext = req.nextUrl.searchParams.get("next");
  const redirectPath = resolveAuthRedirect(req.nextUrl.pathname, Boolean(session), authNext);
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
    "/dashboard/:path*",
    "/trades/:path*",
    "/cycles/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/orders/:path*",
    "/login",
    "/register",
  ],
};
