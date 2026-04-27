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
          const expires = rememberMe === false
            ? ""
            : options?.maxAge
              ? `; max-age=${options.maxAge}`
              : "";
          const path = options?.path ? `; path=${options.path}` : "; path=/";
          const sameSite = options?.sameSite ? `; samesite=${options.sameSite}` : "";
          const secure = options?.domain ? `; secure` : "";
          const domain = options?.domain ? `; domain=${options.domain}` : "";
          document.cookie = `${name}=${value}${expires}${path}${sameSite}${secure}${domain}`;
        });
      },
    },
  });
}
