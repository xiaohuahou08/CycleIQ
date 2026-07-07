"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import MarketingShell from "./MarketingShell";
import { MARKETING_PAGE_PAD } from "./styles";
import { useTranslations } from "@/lib/i18n/locale-context";

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export function LegalDocument({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const { t } = useTranslations("legal");

  return (
    <MarketingShell>
      <div className={`${MARKETING_PAGE_PAD} pb-20`}>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-emerald-700">{t("shell.label")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("shell.lastUpdated", { date: lastUpdated })}
          </p>
          <div className="mt-10">{children}</div>
          <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
            {t("shell.seeAlso")}{" "}
            <Link
              href="/privacy"
              className="font-medium text-slate-700 underline-offset-2 hover:underline"
            >
              {t("shell.privacy")}
            </Link>{" "}
            and{" "}
            <Link
              href="/terms"
              className="font-medium text-slate-700 underline-offset-2 hover:underline"
            >
              {t("shell.terms")}
            </Link>
            .
          </p>
        </div>
      </div>
    </MarketingShell>
  );
}
