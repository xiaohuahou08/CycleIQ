"use client";

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
import AdSlot from "@/app/components/AdSlot";
import { BTN_PRIMARY, BTN_SECONDARY, MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { useTranslations } from "@/lib/i18n/locale-context";

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

const KPI_PREVIEW_VALUES = [
  { value: "$4,280", accent: "bg-emerald-400" },
  { value: "$12,480", accent: "bg-emerald-400" },
  { value: "68%", accent: "bg-blue-400" },
  { value: "7", accent: "bg-violet-400" },
] as const;

const KPI_PREVIEW_KEYS = [
  "realizedPnl",
  "totalPremium",
  "winRate",
  "activeTrades",
] as const;

const PREVIEW_POSITIONS = [
  { ticker: "AAPL", key: "cspOpen", badge: "bg-amber-50 text-amber-800 ring-amber-100" },
  { ticker: "MSFT", key: "stockHeld", badge: "bg-purple-50 text-purple-800 ring-purple-100" },
  { ticker: "NVDA", key: "ccOpen", badge: "bg-blue-50 text-blue-800 ring-blue-100" },
] as const;

export default function HomePageClient() {
  const { t } = useTranslations("marketing");

  const bullets = [t("home.bullet1"), t("home.bullet2"), t("home.bullet3")];
  const problemBullets = [t("home.problem.b1"), t("home.problem.b2"), t("home.problem.b3")];
  const solutionBullets = [t("home.solution.b1"), t("home.solution.b2"), t("home.solution.b3")];

  return (
    <div className="min-h-screen bg-slate-50/40">
      <MarketingHeader activePage="home" />

      <main id="main-content">
        <section className="border-b border-slate-200/80 bg-white">
          <div className={`${MARKETING_PAGE_PAD} lg:py-20`}>
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="animate-page-enter">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={iconStroke} aria-hidden />
                  {t("home.badge")}
                </div>

                <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
                  {t("home.heroTitle")}
                  <span className="text-emerald-600"> {t("home.heroTitleAccent")}</span>
                </h1>

                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
                  {t("home.heroBody")}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/login" className={BTN_PRIMARY}>
                    {t("home.ctaSignIn")}
                  </Link>
                  <Link href="#how-it-works" className={BTN_SECONDARY}>
                    {t("home.ctaHowItWorks")}
                  </Link>
                </div>

                <ul className="mt-8 space-y-3">
                  {bullets.map((text) => (
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

              <div
                className="animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5"
                style={{ animationDelay: "120ms" }}
              >
                <div className="flex h-11 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4">
                  <CycleIQMark className="h-6 w-6 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {t("home.preview.dashboard")}
                  </span>
                </div>

                <div className="bg-slate-50/80 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {KPI_PREVIEW_KEYS.map((key, index) => (
                      <div
                        key={key}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className={`h-1 ${KPI_PREVIEW_VALUES[index].accent}`} />
                        <div className="p-3.5">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                            {t(`home.preview.kpi.${key}`)}
                          </p>
                          <p className="mt-1.5 text-xl font-semibold tabular-nums text-slate-900">
                            {KPI_PREVIEW_VALUES[index].value}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {t(`home.preview.kpi.${key}Sub`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        {t("home.preview.activePositions")}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700">
                        {t("home.preview.tradesLink")}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {PREVIEW_POSITIONS.map((row) => (
                        <div key={row.ticker} className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-900">{row.ticker}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${row.badge}`}
                          >
                            {t(`home.preview.${row.key}`)}
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

        <section id="how-it-works" className="border-b border-slate-200/80 bg-white">
          <div className={MARKETING_PAGE_PAD}>
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {t("home.howItWorks.title")}
              </h2>
              <p className="mt-3 text-base text-slate-600">{t("home.howItWorks.subtitle")}</p>
            </div>
            <div className="animate-stagger-fade-up grid grid-cols-1 gap-5 md:grid-cols-3">
              <StepCard
                step={1}
                icon={ClipboardList}
                title={t("home.howItWorks.step1.title")}
                description={t("home.howItWorks.step1.body")}
              />
              <StepCard
                step={2}
                icon={RefreshCw}
                title={t("home.howItWorks.step2.title")}
                description={t("home.howItWorks.step2.body")}
              />
              <StepCard
                step={3}
                icon={LayoutDashboard}
                title={t("home.howItWorks.step3.title")}
                description={t("home.howItWorks.step3.body")}
              />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200/80 bg-slate-50/60">
          <div className={MARKETING_PAGE_PAD}>
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {t("home.problem.title")}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t("home.problem.label")}
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {problemBullets.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  {t("home.solution.label")}
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {solutionBullets.map((item) => (
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

        <section className="border-b border-slate-200/80 bg-white">
          <div className={MARKETING_PAGE_PAD}>
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                {t("home.features.title")}
              </h2>
              <p className="mt-3 text-base text-slate-600">{t("home.features.subtitle")}</p>
            </div>
            <div className="animate-stagger-fade-up grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FeatureCard
                icon={RefreshCw}
                title={t("home.features.wheel.title")}
                description={t("home.features.wheel.body")}
              />
              <FeatureCard
                icon={BarChart2}
                title={t("home.features.dashboard.title")}
                description={t("home.features.dashboard.body")}
              />
              <FeatureCard
                icon={TrendingUp}
                title={t("home.features.trades.title")}
                description={t("home.features.trades.body")}
              />
              <FeatureCard
                icon={LayoutDashboard}
                title={t("home.features.costBasis.title")}
                description={t("home.features.costBasis.body")}
              />
              {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && process.env.NEXT_PUBLIC_ADSENSE_SLOT ? (
                <div className="sm:col-span-2 flex justify-center">
                  <div className="w-full sm:w-[calc(50%-0.625rem)]">
                    <AdSlot />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="bg-slate-900">
          <div className={`${MARKETING_PAGE_PAD} py-12 text-center sm:py-14`}>
            <CycleIQMark className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              {t("home.cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              {t("home.cta.body")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                {t("home.ctaSignIn")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
