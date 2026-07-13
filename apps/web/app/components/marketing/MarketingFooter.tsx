"use client";

import Link from "next/link";
import { CycleIQMark } from "@/app/components/icons";
import { useTranslations } from "@/lib/i18n/locale-context";
import { SUPPORT_EMAIL } from "@/lib/seo/site";

export default function MarketingFooter() {
  const { t } = useTranslations("nav");

  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-2.5">
            <CycleIQMark className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-white">CycleIQ</p>
              <p className="text-xs text-slate-500">{t("tagline")}</p>
            </div>
          </div>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400"
            aria-label="Site"
          >
            <Link href="/about" className="transition hover:text-slate-200">
              {t("about")}
            </Link>
            <Link href="/faq" className="transition hover:text-slate-200">
              {t("faq")}
            </Link>
            <Link href="/pricing" className="transition hover:text-slate-200">
              {t("pricing")}
            </Link>
            <Link href="/contact" className="transition hover:text-slate-200">
              {t("contact")}
            </Link>
          </nav>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500"
            aria-label="Legal"
          >
            <Link href="/privacy" className="transition hover:text-slate-300">
              {t("privacy")}
            </Link>
            <span className="text-slate-700" aria-hidden>
              ·
            </span>
            <Link href="/terms" className="transition hover:text-slate-300">
              {t("terms")}
            </Link>
            <span className="text-slate-700" aria-hidden>
              ·
            </span>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="transition hover:text-slate-300"
            >
              {SUPPORT_EMAIL}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
