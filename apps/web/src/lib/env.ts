import { z } from "zod";

function emptyToUndefined(v: unknown) {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  NEXT_PUBLIC_APP_ENV: z.string().default("local"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional()
  ),
  APP_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  ENABLE_DEV_ROUTES: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  DEMO_SEED: z.preprocess(emptyToUndefined, z.string().optional()),
});

export const envPublic = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? "local",
});

export const envServer = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  APP_BASE_URL: process.env.APP_BASE_URL,
  ENABLE_DEV_ROUTES: process.env.ENABLE_DEV_ROUTES,
  DEMO_SEED: process.env.DEMO_SEED,
});

