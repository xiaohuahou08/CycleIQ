# Local development

## Prereqs

- Node.js 22+
- Python 3.12+
- (Optional) Supabase CLI (for local Supabase)

## Web app (Next.js)

### 1) Configure env vars

Copy:

```bash
cp apps/web/.env.example apps/web/.env.local
```

For demo mode only, set:

```env
ENABLE_DEV_ROUTES=true
```

### 2) Start dev server

```bash
cd apps/web
npm install
npm run dev -- --port 5173
```

Open `http://localhost:5173`.

### 3) Seed demo data

Go to `Settings` and click **Seed demo**.

## Supabase (keys + placement)

### Local keys (apps/web/.env.local)

- **Public (browser-safe)**\n  - `NEXT_PUBLIC_SUPABASE_URL`\n  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred)\n  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback)\n- **Server-only**\n  - `SUPABASE_SERVICE_ROLE_KEY`\n

### Vercel keys (Preview/Prod)

Set the same variables in Vercel Project Settings → Environment Variables.\nNever expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.\nSee `DEPLOYMENT.md` for the full Vercel checklist.

### Schema

Migrations live in `supabase/migrations/`.\nThe old one-shot file `supabase/schema.sql` is deprecated (reference only).

### Supabase CLI (recommended workflow)

Install and authenticate Supabase CLI, then link your project and apply migrations:

```bash
# from repo root
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

For local Supabase (optional):

```bash
supabase start
supabase db reset
```

## Tests

### Python

```bash
python -m unittest discover -s tests -t . -p "test_*.py"
```

### Web

```bash
cd apps/web
npm run lint
npm run build
```

