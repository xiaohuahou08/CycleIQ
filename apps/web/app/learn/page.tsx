import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import { LearnThumbnail } from "@/app/learn/components/LearnFigure";
import { getAllPosts } from "@/lib/learn/posts";
import { getLocaleFromCookies, getServerTranslations } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locales";
import { createPageMetadata } from "@/lib/seo/metadata";

function formatPublishDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslations("marketing");
  return createPageMetadata({
    title: t("learn.metaTitle"),
    description: t("learn.metaDescription"),
    path: "/learn",
  });
}

export default async function LearnPage() {
  const t = await getServerTranslations("marketing");
  const locale = await getLocaleFromCookies();
  const posts = getAllPosts(locale);
  const dateLocale = intlLocale(locale);

  return (
    <MarketingShell
      activePage="learn"
      cta={{
        title: t("learn.cta.title"),
        description: t("learn.cta.body"),
        buttonLabel: t("home.ctaSignIn"),
        buttonHref: "/login",
      }}
    >
      <section className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="animate-page-enter mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {t("learn.badge")}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[2.75rem] sm:leading-[1.1]">
              {t("learn.title")}
              <span className="text-emerald-600"> {t("learn.titleAccent")}</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-600">{t("learn.subtitle")}</p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            {posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center">
                <p className="text-base font-semibold text-slate-900">{t("learn.empty.title")}</p>
                <p className="mt-2 text-sm text-slate-600">{t("learn.empty.body")}</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/learn/${post.slug}`}
                      className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:gap-5"
                    >
                      {post.thumbnail ? (
                        <div className="hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 sm:block">
                          <LearnThumbnail kind={post.thumbnail} />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          {t("learn.published", {
                            date: formatPublishDate(post.date, dateLocale),
                          })}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-900">{post.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {post.description}
                        </p>
                        <span className="mt-3 inline-flex text-sm font-medium text-emerald-700">
                          {t("learn.readMore")} →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
