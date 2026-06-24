import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CycleIQ — Wheel Strategy Tracker",
    template: "%s · CycleIQ",
  },
  description:
    "Track cash-secured puts and covered calls as full wheel cycles. Log trades, visualize CSP → assignment → CC lifecycles, and monitor premium, realized P&L, and cost basis — no spreadsheets.",
  openGraph: {
    title: "CycleIQ — Wheel Strategy Tracker",
    description:
      "Track cash-secured puts and covered calls as full wheel cycles with premium, P&L, and cost basis analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
