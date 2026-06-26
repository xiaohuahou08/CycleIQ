import type { Metadata } from "next";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, SITE_NAME, getSiteUrl } from "./site";

export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

export function createPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getSiteUrl()}${normalizedPath === "/" ? "" : normalizedPath}`;
  const fullTitle = `${title} · ${SITE_NAME}`;

  return {
    title,
    description,
    keywords: [...DEFAULT_KEYWORDS],
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

export function createPrivatePageMetadata(title: string): Metadata {
  return {
    title,
    robots: NOINDEX_ROBOTS,
  };
}

export function createAuthPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: "/login" | "/register";
}): Metadata {
  return {
    ...createPageMetadata({ title, description, path }),
    robots: NOINDEX_ROBOTS,
  };
}
