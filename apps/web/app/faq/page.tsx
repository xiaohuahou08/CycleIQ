import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import MarketingFaq from "@/app/components/marketing/MarketingFaq";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { getServerTranslations } from "@/lib/i18n/server";
import { createPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { getSiteUrl, SUPPORT_EMAIL } from "@/lib/seo/site";

const FAQ_KEYS = [
  "what",
  "broker",
  "advice",
  "wheel",
  "pricing",
  "data",
  "cancel",
  "support",
  "privacy",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("marketing");
  return createPageMetadata({
    title: t("faq.metaTitle"),
    description: t("faq.metaDescription"),
    path: "/faq",
  });
}

function withEmail(text: string): string {
  return text.replaceAll("{{email}}", SUPPORT_EMAIL);
}

export default async function FaqPage() {
  const t = await getServerTranslations("marketing");
  const tNav = await getServerTranslations("nav");
  const siteUrl = getSiteUrl();

  const items = FAQ_KEYS.map((key) => {
    const question = t(`faq.items.${key}.q`);
    const rawAnswer = withEmail(t(`faq.items.${key}.a`));

    if (key === "privacy") {
      return {
        question,
        answer: (
          <>
            {rawAnswer}{" "}
            <Link href="/privacy" className="font-medium text-emerald-700 hover:text-emerald-800">
              {tNav("privacy")}
            </Link>
            {" · "}
            <Link href="/terms" className="font-medium text-emerald-700 hover:text-emerald-800">
              {tNav("terms")}
            </Link>
          </>
        ),
      };
    }

    if (key === "data") {
      return {
        question,
        answer: (
          <>
            {rawAnswer}{" "}
            <Link href="/privacy" className="font-medium text-emerald-700 hover:text-emerald-800">
              {tNav("privacy")}
            </Link>
          </>
        ),
      };
    }

    return { question, answer: rawAnswer };
  });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`faq.items.${key}.q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: withEmail(t(`faq.items.${key}.a`)),
      },
    })),
    url: `${siteUrl}/faq`,
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <MarketingShell
        activePage="faq"
        cta={{
          title: t("faq.cta.title"),
          description: t("faq.cta.body"),
          buttonLabel: t("home.ctaSignIn"),
          buttonHref: "/login",
        }}
      >
        <section className="border-b border-slate-200/80 bg-white">
          <div className={MARKETING_PAGE_PAD}>
            <div className="animate-page-enter mx-auto max-w-2xl text-center">
              <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {t("faq.badge")}
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
                {t("faq.title")}
                <span className="text-emerald-600"> {t("faq.titleAccent")}</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-slate-600">{t("faq.subtitle")}</p>
            </div>

            <div className="mt-12">
              <MarketingFaq title={t("faq.listTitle")} items={items} />
            </div>

            <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-600">
              <p>{t("faq.stillNeedHelp")}</p>
              <p className="mt-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-800"
                >
                  {SUPPORT_EMAIL}
                </a>
                {" · "}
                <Link href="/contact" className="font-medium text-emerald-700 hover:text-emerald-800">
                  {t("faq.contactLink")}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </MarketingShell>
    </>
  );
}
