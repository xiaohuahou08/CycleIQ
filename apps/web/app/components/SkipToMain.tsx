"use client";

import { useTranslations } from "@/lib/i18n/locale-context";

export default function SkipToMain() {
  const { t } = useTranslations("common");
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
    >
      {t("a11y.skipToMain")}
    </a>
  );
}
