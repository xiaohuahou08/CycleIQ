"use client";

import Link from "next/link";
import { CycleIQMark } from "@/app/components/icons";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useTranslations } from "@/lib/i18n/locale-context";
import { SITE_NAME } from "@/lib/seo/site";
import { Button } from "@/components/ui/button";
import { marketingNavLinkClass, type MarketingPage } from "./styles";

interface MarketingHeaderProps {
  activePage?: MarketingPage;
}

const NAV_ITEMS: { href: string; page: MarketingPage; key: "home" | "pricing" | "about" | "faq" | "contact" }[] =
  [
    { href: "/", page: "home", key: "home" },
    { href: "/pricing", page: "pricing", key: "pricing" },
    { href: "/about", page: "about", key: "about" },
    { href: "/faq", page: "faq", key: "faq" },
    { href: "/contact", page: "contact", key: "contact" },
  ];

export default function MarketingHeader({ activePage }: MarketingHeaderProps) {
  const { t } = useTranslations("nav");

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-slate-900"
          aria-label={`${SITE_NAME} home`}
        >
          <CycleIQMark className="h-8 w-8 text-emerald-500" />
          <span className="text-base font-bold tracking-tight">CycleIQ</span>
        </Link>

        <nav className="hidden min-w-0 justify-self-center md:block" aria-label="Primary">
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100/90 p-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                className={marketingNavLinkClass(activePage === item.page)}
              >
                {t(item.key)}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 md:hidden" aria-label="Primary">
            <Link href="/about" className={marketingNavLinkClass(activePage === "about")}>
              {t("about")}
            </Link>
            <Link href="/faq" className={marketingNavLinkClass(activePage === "faq")}>
              {t("faq")}
            </Link>
            <Link href="/contact" className={marketingNavLinkClass(activePage === "contact")}>
              {t("contact")}
            </Link>
          </nav>
          <LanguageSwitcher />
          <Button render={<Link href="/login" />} size="lg">
            <span className="hidden sm:inline">{t("signInRegister")}</span>
            <span className="sm:hidden">{t("signIn")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
