"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locales";
import { useLocale, useTranslations } from "@/lib/i18n/locale-context";

interface LanguageSwitcherProps {
  className?: string;
  /** Sidebar collapsed mode — darker, stacked layout */
  compact?: boolean;
}

export default function LanguageSwitcher({
  className = "",
  compact = false,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const { t } = useTranslations("common");

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    router.refresh();
  };

  const btn = (target: Locale, label: string) => (
    <button
      key={target}
      type="button"
      onClick={() => switchTo(target)}
      aria-pressed={locale === target}
      className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
        locale === target
          ? "bg-emerald-600 text-white shadow-sm"
          : compact
            ? "text-slate-400 hover:bg-slate-800 hover:text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={`${
        compact
          ? "inline-flex flex-col gap-0.5 rounded-lg border border-slate-700 bg-slate-900/60 p-0.5"
          : "inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5"
      } ${className}`}
    >
      {btn("en", t("language.en"))}
      {btn("zh", t("language.zh"))}
    </div>
  );
}
