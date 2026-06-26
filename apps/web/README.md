# CycleIQ Web (Next.js)

Active frontend for [CycleIQ](../../README.md) — a wheel strategy tracker for cash-secured puts and covered calls.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Supabase Auth** (cookie-based sessions via `@supabase/ssr`)
- **Lucide** icons + shared `CycleIQMark` branding

## Getting started

```bash
cd apps/web
npm install
cp .env.example .env.local   # if present; set Supabase + API URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

```env
NEXT_PUBLIC_API_URL=https://your-flask-host.example.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Marketing landing page |
| `/login`, `/register` | Public | Supabase authentication |
| `/dashboard` | Protected | KPI cards, charts, active positions |
| `/trades` | Protected | Trade log with filters, roll/assign/expire actions |
| `/cycles` | Protected | Wheel timeline view + CC cost basis |
| `/settings` | Protected | Account, trading defaults (localStorage) |
| `/reports` | Protected | Placeholder (not in main nav) |

Protected routes use `apps/web/app/(protected)/layout.tsx` with a shared sidebar.

## Key directories

```
apps/web/
├── app/
│   ├── (protected)/     # Dashboard, trades, cycles, settings
│   ├── components/      # AuthShell, Sidebar, DatePicker, icons
│   ├── login/ register/
│   └── page.tsx         # Landing page
├── lib/
│   ├── api/trades.ts    # Backend API client
│   └── supabase/        # Browser + server Supabase helpers
└── middleware.ts        # Auth gate for protected routes
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

## Deploy

Production builds target Vercel. The Flask API runs separately (see root `README.md`). Set `NEXT_PUBLIC_*` env vars in Vercel project settings.
