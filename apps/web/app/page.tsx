import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart2,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { CycleIQMark, iconMd, iconSm, iconStroke } from "@/app/components/icons";
import MarketingFooter from "@/app/components/marketing/MarketingFooter";
import MarketingHeader from "@/app/components/marketing/MarketingHeader";
import { BTN_PRIMARY, BTN_SECONDARY, MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { JsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/metadata";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: SITE_TAGLINE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="card-hover-lift rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100/80">
        <Icon className={`${iconMd} text-emerald-600`} strokeWidth={iconStroke} aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="card-hover-lift rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {step}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
          <Icon className={`${iconSm} text-slate-700`} strokeWidth={iconStroke} aria-hidden />
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

const KPI_PREVIEW = [
  { label: "Realized P&L", value: "$4,280", sub: "Options + call-away stock", accent: "bg-emerald-400" },
  { label: "Total Premium", value: "$12,480", sub: "Gross, all legs", accent: "bg-emerald-400" },
  { label: "Win Rate", value: "68%", sub: "Terminal outcomes", accent: "bg-blue-400" },
  { label: "Active Trades", value: "7", sub: "Open legs", accent: "bg-violet-400" },
] as const;

const siteUrl = getSiteUrl();

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Basic plan — free with 20 trades per month",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/icon`,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50/40">
      <JsonLd data={HOME_JSON_LD} />
      <MarketingHeader activePage="home" />

      <main id="main-content">
        <section className="border-b border-slate-200/80 bg-white">
          <div className={`${MARKETING_PAGE_PAD} lg:py-20`}>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-page-enter">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={iconStroke} aria-hidden />
                Wheel strategy tracker
              </div>

              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
                Your full options wheel,
                <span className="text-emerald-600"> one clear view.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                CycleIQ connects cash-secured puts, assignments, and covered calls into wheel
                cycles — so you can track premium, realized P&amp;L, cost basis, and open
                positions without spreadsheets or broker tab-hopping.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className={BTN_PRIMARY}>
                  Sign in / Register
                </Link>
                <Link href="#how-it-works" className={BTN_SECONDARY}>
                  How it works
                </Link>
              </div>

              <ul className="mt-8 space-y-3">
                {[
                  "Manual trade log — no broker API required",
                  "Wheel cycles with roll chains and per-leg net P&L",
                  "Dashboard KPIs aligned to how you actually run the wheel",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      strokeWidth={iconStroke}
                      aria-hidden
                    />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dashboard preview */}
            <div className="animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5" style={{ animationDelay: "120ms" }}>
              <div className="flex h-11 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4">
                <CycleIQMark className="h-6 w-6 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">Dashboard</span>
              </div>

              <div className="bg-slate-50/80 p-5">
                <div className="grid grid-cols-2 gap-3">
                  {KPI_PREVIEW.map((kpi) => (
                    <div
                      key={kpi.label}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className={`h-1 ${kpi.accent}`} />
                      <div className="p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                          {kpi.label}
                        </p>
                        <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">
                          {kpi.value}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{kpi.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Active positions</span>
                    <span className="text-[11px] font-medium text-emerald-700">Trades →</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { ticker: "AAPL", label: "CSP open", badge: "bg-amber-50 text-amber-800 ring-amber-100" },
                      { ticker: "MSFT", label: "Stock held", badge: "bg-purple-50 text-purple-800 ring-purple-100" },
                      { ticker: "NVDA", label: "CC open", badge: "bg-blue-50 text-blue-800 ring-blue-100" },
                    ].map((row) => (
                      <div key={row.ticker} className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-900">{row.ticker}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${row.badge}`}
                        >
                          {row.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">How it works</h2>
            <p className="mt-3 text-base text-slate-600">
              Log trades manually. CycleIQ links legs into cycles and keeps analytics in sync.
            </p>
          </div>
          <div className="animate-stagger-fade-up grid grid-cols-1 gap-5 md:grid-cols-3">
            <StepCard
              step={1}
              icon={ClipboardList}
              title="Log your trades"
              description="Enter CSPs and CCs with strike, expiry, premium, contracts, and fees. Set trading defaults for faster entry."
            />
            <StepCard
              step={2}
              icon={RefreshCw}
              title="Cycles link up"
              description="Trades auto-attach to wheel cycles. Rolls stay on the same chain; assignments and call-aways update cycle state."
            />
            <StepCard
              step={3}
              icon={LayoutDashboard}
              title="Review and act"
              description="Use the dashboard for P&L and capital, the trade log to expire or roll, and Cycles for wheel visuals and CC cost basis."
            />
          </div>
        </div>
      </section>

      {/* Problem / solution */}
      <section className="border-b border-slate-200/80 bg-slate-50/60">
        <div className={MARKETING_PAGE_PAD}>
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Built for the wheel — not generic options
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                The problem
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {[
                  "Brokers list legs separately — hard to see the full CSP → CC story",
                  "Spreadsheets break when you roll, get assigned, or run multiple wheels",
                  "Realized P&L and cost basis get messy across rolls and call-aways",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                With CycleIQ
              </p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {[
                  "One cycle per wheel with CSP, assignment, CC legs and roll history",
                  "Realized P&L includes option cashflow and stock gain on call-away",
                  "CC cost basis tracked per open wheel — aligned with dashboard logic",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      strokeWidth={iconStroke}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">What you get</h2>
            <p className="mt-3 text-base text-slate-600">
              Everything in the app today — no vaporware feature list.
            </p>
          </div>
          <div className="animate-stagger-fade-up grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FeatureCard
              icon={RefreshCw}
              title="Wheel & cycle view"
              description="Visual fan diagram per wheel, completed vs active states, and net P&L between legs including roll buybacks."
            />
            <FeatureCard
              icon={BarChart2}
              title="Dashboard analytics"
              description="Capital invested, realized P&L, win rate, open premium yield, and daily/weekly/monthly premium charts."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Trade workflow"
              description="Filter by CSP/CC and status, expire, roll, assign, or buy to close — with live quotes on open legs."
            />
            <FeatureCard
              icon={LayoutDashboard}
              title="CC cost basis"
              description="Per-wheel initial vs current stock cost after realized CC premium — only for open assigned positions."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900">
        <div className={`${MARKETING_PAGE_PAD} py-12 text-center sm:py-14`}>
          <CycleIQMark className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Start tracking your wheel today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Free to use. No broker connection. Log your first CSP in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Sign in / Register
            </Link>
          </div>
        </div>
      </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
