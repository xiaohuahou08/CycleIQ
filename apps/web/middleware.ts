import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/auth-helpers-nextjs";
import { isProtectedRoute, resolveAuthRedirect } from "@/lib/auth-redirect.mjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute(req.nextUrl.pathname)) {
      const login = new URL("/login", req.url);
      login.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(login);
    }

    return res;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
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
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/cycles/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/orders/:path*",
    "/login",
    "/register",
  ],
};
