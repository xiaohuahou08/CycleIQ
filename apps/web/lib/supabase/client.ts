import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseClient(rememberMe?: boolean) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return document.cookie.split(";").map((c) => {
          const [name, ...rest] = c.trim().split("=");
          return { name, value: rest.join("=") };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const parts = [`${name}=${value}`];
          // "Remember me" off -> session cookie (no max-age, expires on close).
          if (rememberMe !== false && options?.maxAge != null) {
            parts.push(`max-age=${options.maxAge}`);
          }
          parts.push(`path=${options?.path ?? "/"}`);
          if (options?.domain) parts.push(`domain=${options.domain}`);
          if (options?.sameSite) parts.push(`samesite=${options.sameSite}`);
          // Secure must follow the cookie's own `secure` option (https), not the
          // presence of a domain — the previous check left cookies non-secure.
          if (options?.secure) parts.push("secure");
          document.cookie = parts.join("; ");
        });
      },
    },
  });
}
