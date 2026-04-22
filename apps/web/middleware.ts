import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isAuthExemptApi(pathname: string) {
  return (
    pathname === "/api/demo/state" ||
    pathname === "/api/dev/seed" ||
    pathname === "/api/dev/reset"
  );
}

function isProtectedPath(pathname: string) {
  return (
    (pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/dev/") &&
      !isAuthExemptApi(pathname)) ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/cycles" ||
    pathname.startsWith("/cycles/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();
  const isApi = pathname.startsWith("/api/");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, treat as unauthenticated.
  if (!url || !key) {
    if (isApi) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // Supabase SSR client reads/writes auth cookies. We need to pass cookie handlers.
  const response = NextResponse.next();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    if (isApi) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/cycles/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};

