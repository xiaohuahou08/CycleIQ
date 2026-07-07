"use client";

import PageHeader from "@/app/components/PageHeader";
import { CARD_BASE } from "@/app/components/ui/styles";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/locale-context";

export default function ReportsPage() {
  const { t } = useTranslations("reports");

  return (
    <main className="animate-page-enter flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="w-full space-y-6">
        <PageHeader title={t("title")} description={t("description")} />
        <Card className={`${CARD_BASE} rounded-2xl py-0`}>
          <CardContent className="p-8">
            <CardDescription className="text-sm text-slate-500">
              {t("placeholder")}
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
