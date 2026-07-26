import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/app/components/marketing/MarketingShell";
import { MARKETING_PAGE_PAD } from "@/app/components/marketing/styles";
import LearnFigure from "@/app/learn/components/LearnFigure";
import { getAllSlugs, getPostBySlug } from "@/lib/learn/posts";
import { getLocaleFromCookies, getServerTranslations } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/locales";
import { createPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { getSiteUrl } from "@/lib/seo/site";

function formatPublishDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocaleFromCookies();
  const post = getPostBySlug(slug, locale);
  if (!post) {
    return createPageMetadata({
      title: "Not found",
      path: `/learn/${slug}`,
    });
  }
  return createPageMetadata({
    title: post.title,
    description: post.description,
    path: `/learn/${slug}`,
  });
}

export default async function LearnPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getServerTranslations("marketing");
  const locale = await getLocaleFromCookies();
  const post = getPostBySlug(slug, locale);
  if (!post) notFound();

  const dateLocale = intlLocale(locale);
  const siteUrl = getSiteUrl();
  const publishedLabel = t("learn.published", {
    date: formatPublishDate(post.date, dateLocale),
  });

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: `${siteUrl}/learn/${post.slug}`,
    author: {
      "@type": "Organization",
      name: "CycleIQ",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "CycleIQ",
      url: siteUrl,
    },
  };

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
      <JsonLd data={blogJsonLd} />
      <article className="border-b border-slate-200/80 bg-white">
        <div className={MARKETING_PAGE_PAD}>
          <div className="animate-page-enter mx-auto max-w-2xl">
            <Link
              href="/learn"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              ← {t("learn.backToList")}
            </Link>
            <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">
              {publishedLabel}
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">{post.description}</p>

            <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
              {post.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
                  <div className="mt-3 space-y-3">
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.heading}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                  {section.figure ? (
                    <LearnFigure
                      kind={section.figure}
                      locale={locale}
                      caption={section.figureCaption}
                    />
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}
