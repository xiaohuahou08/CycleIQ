import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { getServerTranslations } from "@/lib/i18n/server";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SUPPORT_EMAIL } from "@/lib/seo/site";
import ContactForm from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("contact");
  return createPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/contact",
  });
}

export default async function ContactPage() {
  const tMarketing = await getServerTranslations("marketing");
  const t = await getServerTranslations("contact");

  return (
    <MarketingShell
      activePage="contact"
      cta={{
        title: tMarketing("contact.cta.title"),
        description: tMarketing("contact.cta.body"),
        buttonLabel: tMarketing("home.ctaSignIn"),
        buttonHref: "/login",
      }}
    >
      <section className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="animate-page-enter mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {t("badge")}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
              {t("title")}
              <span className="text-emerald-600"> {t("titleAccent")}</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600">{t("subtitle")}</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left shadow-sm ring-1 ring-slate-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("emailLabel")}
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-2 block text-sm font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-800"
              >
                {SUPPORT_EMAIL}
              </a>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("responseTime")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left shadow-sm ring-1 ring-slate-900/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("faqHint")}
              </p>
              <Link
                href="/faq"
                className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                {t("faqLink")} →
              </Link>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                <Link href="/about" className="hover:text-slate-700">
                  {t("aboutLink")}
                </Link>
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </MarketingShell>
  );
}
