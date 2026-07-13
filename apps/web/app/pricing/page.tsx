import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import MarketingShell, {
  BTN_PRIMARY,
  BTN_SECONDARY,
  MarketingCheckListItem,
} from "@/app/components/marketing/MarketingShell";
import MarketingFaq from "@/app/components/marketing/MarketingFaq";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import PremiumUpgradeButton from "./PremiumUpgradeButton";
import { createPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { getServerTranslations } from "@/lib/i18n/server";
import { SITE_NAME, getSiteUrl } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("marketing");
  return createPageMetadata({
    title: "Pricing",
    description: t("pricing.metaDescription"),
    path: "/pricing",
  });
}

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
  tradeLimitLabel,
  featuredBadge,
  sharedFeatures,
  accentClass,
  featured,
  cta,
}: {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  tradeLimit: string;
  tradeLimitLabel: string;
  featuredBadge: string;
  sharedFeatures: readonly string[];
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
            {featuredBadge}
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
          {sharedFeatures.map((feature) => (
            <MarketingCheckListItem key={feature}>{feature}</MarketingCheckListItem>
          ))}
        </ul>

        <div className="mt-6 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold text-emerald-800">{tradeLimitLabel}</span> {tradeLimit}
        </div>

        <div className="mt-auto pt-8">{cta}</div>
      </div>
    </article>
  );
}

export default async function PricingPage() {
  const t = await getServerTranslations("marketing");
  const sharedFeatures = [
    t("pricing.shared.f1"),
    t("pricing.shared.f2"),
    t("pricing.shared.f3"),
    t("pricing.shared.f4"),
  ] as const;

  return (
    <>
      <JsonLd data={PRICING_JSON_LD} />
      <MarketingShell
        activePage="pricing"
        cta={{
          title: t("pricing.cta.title"),
          description: t("pricing.cta.body"),
          buttonLabel: t("pricing.cta.button"),
          buttonHref: "/login",
        }}
      >
        <section className="border-b border-slate-200/80 bg-white">
          <div className={MARKETING_PAGE_PAD}>
            <div className="animate-page-enter mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {t("pricing.badge")}
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
                {t("pricing.title")}
                <span className="text-emerald-600"> {t("pricing.titleAccent")}</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              <PlanCard
                name={t("pricing.basic.name")}
                tagline={t("pricing.basic.tagline")}
                price={t("pricing.basic.price")}
                priceNote={t("pricing.basic.priceNote")}
                tradeLimit={t("pricing.basic.tradeLimit")}
                tradeLimitLabel={t("pricing.plan.tradeLimitLabel")}
                featuredBadge={t("pricing.plan.badge")}
                sharedFeatures={sharedFeatures}
                accentClass="bg-slate-400"
                cta={
                  <Link href="/login" className={`${BTN_PRIMARY} w-full`}>
                    {t("pricing.basic.cta")}
                  </Link>
                }
              />
              <PlanCard
                name={t("pricing.premium.name")}
                tagline={t("pricing.premium.tagline")}
                price={t("pricing.premium.price")}
                priceNote={t("pricing.premium.priceNote")}
                tradeLimit={t("pricing.premium.tradeLimit")}
                tradeLimitLabel={t("pricing.plan.tradeLimitLabel")}
                featuredBadge={t("pricing.plan.badge")}
                sharedFeatures={sharedFeatures}
                accentClass="bg-emerald-400"
                featured
                cta={
                  <Suspense
                    fallback={
                      <div className={`${BTN_SECONDARY} w-full opacity-60`}>
                        {t("pricing.upgrade.button")}
                      </div>
                    }
                  >
                    <PremiumUpgradeButton />
                  </Suspense>
                }
              />
            </div>

            <p className="mx-auto mt-6 max-w-lg text-center text-sm text-slate-500">
              {t("pricing.footer")}
            </p>

            <div className="mt-16 border-t border-slate-200 pt-12">
              <MarketingFaq
                title={t("pricing.faq.title")}
                subtitle={t("pricing.faq.subtitle")}
                items={[
                  {
                    question: t("pricing.faq.items.limit.q"),
                    answer: t("pricing.faq.items.limit.a"),
                  },
                  {
                    question: t("pricing.faq.items.payment.q"),
                    answer: t("pricing.faq.items.payment.a"),
                  },
                  {
                    question: t("pricing.faq.items.features.q"),
                    answer: t("pricing.faq.items.features.a"),
                  },
                ]}
              />
            </div>
          </div>
        </section>
      </MarketingShell>
    </>
  );
}
