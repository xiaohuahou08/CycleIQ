import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { getServerTranslations } from "@/lib/i18n/server";
import { createPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("marketing");
  return createPageMetadata({
    title: t("about.metaTitle"),
    description: t("about.metaDescription"),
    path: "/about",
  });
}

export default async function AboutPage() {
  const t = await getServerTranslations("marketing");

  const pillars = [
    {
      title: t("about.pillars.p1.title"),
      body: t("about.pillars.p1.body"),
    },
    {
      title: t("about.pillars.p2.title"),
      body: t("about.pillars.p2.body"),
    },
    {
      title: t("about.pillars.p3.title"),
      body: t("about.pillars.p3.body"),
    },
  ] as const;

  return (
    <MarketingShell
      activePage="about"
      cta={{
        title: t("about.cta.title"),
        description: t("about.cta.body"),
        buttonLabel: t("home.ctaSignIn"),
        buttonHref: "/login",
      }}
    >
      <section className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="animate-page-enter mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {t("about.badge")}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
              {t("about.title")}
              <span className="text-emerald-600"> {t("about.titleAccent")}</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600">{t("about.subtitle")}</p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-8 text-sm leading-relaxed text-slate-600">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("about.mission.title")}</h2>
              <p className="mt-3">{t("about.mission.p1")}</p>
              <p className="mt-3">{t("about.mission.p2")}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("about.what.title")}</h2>
              <p className="mt-3">{t("about.what.p1")}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5">
                <li>{t("about.what.i1")}</li>
                <li>{t("about.what.i2")}</li>
                <li>{t("about.what.i3")}</li>
                <li>{t("about.what.i4")}</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("about.not.title")}</h2>
              <p className="mt-3">{t("about.not.p1")}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5">
                <li>{t("about.not.i1")}</li>
                <li>{t("about.not.i2")}</li>
                <li>{t("about.not.i3")}</li>
              </ul>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm ring-1 ring-slate-900/5"
              >
                <h3 className="text-sm font-semibold text-slate-900">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.body}</p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <h2 className="text-lg font-semibold text-slate-900">{t("about.support.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{t("about.support.p1")}</p>
            <p className="mt-4 text-sm text-slate-600">
              <Link href="/faq" className="font-medium text-emerald-700 hover:text-emerald-800">
                {t("about.support.faqLink")}
              </Link>
              {" · "}
              <Link href="/contact" className="font-medium text-emerald-700 hover:text-emerald-800">
                {t("about.support.contactLink")}
              </Link>
            </p>
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-slate-500">
            {t("about.disclaimer")}
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
