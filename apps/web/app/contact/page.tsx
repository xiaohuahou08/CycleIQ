import type { Metadata } from "next";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { getServerTranslations } from "@/lib/i18n/server";
import { createPageMetadata } from "@/lib/seo/metadata";
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

          <ContactForm />
        </div>
      </section>
    </MarketingShell>
  );
}
