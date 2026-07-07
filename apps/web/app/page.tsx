import type { Metadata } from "next";
import HomePageClient from "@/app/HomePageClient";
import { JsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/metadata";
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: SITE_TAGLINE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

const siteUrl = getSiteUrl();

const HOME_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Basic plan — free with 20 trades per month",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/icon`,
  },
];

export default function Home() {
  return (
    <>
      <JsonLd data={HOME_JSON_LD} />
      <HomePageClient />
    </>
  );
}
