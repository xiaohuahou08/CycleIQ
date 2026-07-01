import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import MarketingShell, {
  BTN_PRIMARY,
  BTN_SECONDARY,
  MarketingCheckListItem,
} from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import PremiumUpgradeButton from "./PremiumUpgradeButton";
import { createPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME, getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing",
  description:
    "CycleIQ Basic and Premium plans. Basic is free with 20 trades per month. Premium is $1/month with unlimited trade logging.",
  path: "/pricing",
});

const SHARED_FEATURES = [
  "Full wheel cycle tracking (CSP → CC → call-away)",
  "Dashboard KPIs and lifecycle visualization",
  "Trade filters, rolls, assignments, and expirations",
  "Settings sync across devices",
] as const;

const siteUrl = getSiteUrl();

const PRICING_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "CycleIQ Basic",
    description: "Free wheel strategy tracker with 20 new trades per calendar month.",
    brand: { "@type": "Brand", name: SITE_NAME },
    url: `${siteUrl}/pricing`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/login`,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "CycleIQ Premium",
    description: "Unlimited trade logging for active wheel traders.",
    brand: { "@type": "Brand", name: SITE_NAME },
    url: `${siteUrl}/pricing`,
    offers: {
      "@type": "Offer",
      price: "1",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/pricing`,
    },
  },
];

function PlanCard({
  name,
  tagline,
  price,
  priceNote,
  tradeLimit,
  accentClass,
  featured,
  cta,
}: {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  tradeLimit: string;
  accentClass: string;
  featured?: boolean;
  cta: React.ReactNode;
}) {
  return (
    <article
      className={`card-hover-lift relative flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm ring-1 ring-slate-900/5 ${
        featured ? "border-emerald-300 ring-emerald-500/20" : "border-slate-200"
      }`}
    >
      <div className={`h-1 ${accentClass}`} />
      <div className="flex flex-1 flex-col p-8">
        {featured ? (
          <span className="mb-4 inline-flex w-fit rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            Unlimited trades
          </span>
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
            <p className="mt-1 text-sm text-slate-600">{tagline}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums text-slate-900">{price}</p>
            <p className="text-xs text-slate-500">{priceNote}</p>
          </div>
        </div>

        <ul className="mt-8 space-y-3">
          {SHARED_FEATURES.map((feature) => (
            <MarketingCheckListItem key={feature}>{feature}</MarketingCheckListItem>
          ))}
        </ul>

        <div className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-emerald-800">Trade limit:</span> {tradeLimit}
        </div>

        <div className="mt-auto pt-8">{cta}</div>
      </div>
    </article>
  );
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={PRICING_JSON_LD} />
      <MarketingShell
        activePage="pricing"
        cta={{
          title: "Start tracking your wheel today",
          description:
            "Basic is free — log your first CSP in minutes. No broker connection required.",
          buttonLabel: "Sign in / Register",
          buttonHref: "/login",
        }}
      >
        <section className="border-b border-slate-200/80 bg-white">
          <div className={MARKETING_PAGE_PAD}>
            <div className="animate-page-enter mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Simple pricing
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
                Basic or Premium.
                <span className="text-emerald-600"> Your wheel, your pace.</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Start on Basic for free with 20 new trades each calendar month. Move to Premium
                when you need unlimited trade logging for $1 per month.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <PlanCard
                name="Basic"
                tagline="For getting started"
                price="$0"
                priceNote="forever"
                tradeLimit="20 new trades per calendar month (UTC). Editing existing trades does not count."
                accentClass="bg-slate-400"
                cta={
                  <Link href="/login" className={`${BTN_PRIMARY} w-full`}>
                    Get started free
                  </Link>
                }
              />
              <PlanCard
                name="Premium"
                tagline="For active wheel traders"
                price="$1"
                priceNote="per month"
                tradeLimit="Unlimited new trades per month."
                accentClass="bg-emerald-400"
                featured
                cta={
                  <Suspense
                    fallback={
                      <div className={`${BTN_SECONDARY} w-full opacity-60`}>Loading…</div>
                    }
                  >
                    <PremiumUpgradeButton />
                  </Suspense>
                }
              />
            </div>

            <p className="mx-auto mt-6 max-w-lg text-center text-sm text-slate-500">
              Premium is billed monthly via Stripe. Cancel anytime from Settings → Billing.
            </p>
          </div>
        </section>
      </MarketingShell>
    </>
  );
}
