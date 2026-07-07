import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, Space_Grotesk, Geist } from "next/font/google";
import OAuthCodeRelay from "@/app/components/OAuthCodeRelay";
import SkipToMain from "@/app/components/SkipToMain";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { htmlLang } from "@/lib/i18n/locales";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/seo/site";
import "./globals.css";
import { cn } from "@/lib/utils";

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
/** Always emitted for AdSense site verification; ad script loads only when env is set. */
const ADSENSE_PUBLISHER_ID = "ca-pub-8772060670873398";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [...DEFAULT_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: getSiteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "finance",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "google-adsense-account": ADSENSE_PUBLISHER_ID,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromCookies();

  return (
    <html lang={htmlLang(locale)} className={cn("h-full", "antialiased", spaceGrotesk.variable, "font-sans", geist.variable)}>
      <body className={`${geist.className} min-h-full flex flex-col`}>
        <LocaleProvider initialLocale={locale}>
          <SkipToMain />
          {children}
        <Suspense fallback={null}>
          <OAuthCodeRelay />
        </Suspense>
        <SpeedInsights />
        <Analytics />
        {adsenseClient ? (
          <Script
            id="google-adsense"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        ) : null}
        </LocaleProvider>
      </body>
    </html>
  );
}
