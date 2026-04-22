# Deployment (Vercel + Supabase)

## Vercel project

Deploy the Next.js app in `apps/web`.

## Environment variables

Set these in Vercel → Project Settings → Environment Variables.

### Required (to enable Supabase)

- `NEXT_PUBLIC_SUPABASE_URL` (public)\n- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public; preferred)\n- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public; legacy fallback)\n- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose)

### Recommended

- `NEXT_PUBLIC_APP_ENV` (`preview` / `prod`)\n- `APP_BASE_URL` (server-only; your site origin)\n- `ENABLE_DEV_ROUTES` (production should be `false`)

## Supabase

Schema source of truth:\n- Migrations in `supabase/migrations/`\n- `supabase/schema.sql` is deprecated (reference only)

## Applying migrations (CLI)

For each environment (preview/prod), link the correct project and push migrations:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

For CI, you typically provide:\n- `SUPABASE_ACCESS_TOKEN`\n- `SUPABASE_PROJECT_REF`\n- Database password/connection (depending on your approach)\n\nThen run `supabase db push` in a protected job.

## Notes

- Any key without `NEXT_PUBLIC_` must be treated as server-only.\n- In production, keep `/api/dev/*` disabled (`ENABLE_DEV_ROUTES=false`).