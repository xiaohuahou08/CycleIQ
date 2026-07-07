"use client";

import { useMemo } from "react";
import { CycleIQMark } from "@/app/components/icons";
import { useTranslations } from "@/lib/i18n/locale-context";
import { useSlowLoadingMessage } from "@/lib/hooks/useSlowLoadingMessage";

interface AppLoadingScreenProps {
  /** Override default phased status messages. */
  phases?: readonly { afterMs: number; message: string }[];
}

export default function AppLoadingScreen({ phases }: AppLoadingScreenProps) {
  const { t } = useTranslations("common");
  const defaultPhases = useMemo(
    () => [
      { afterMs: 0, message: t("loadingPhases.app.p0") },
      { afterMs: 3000, message: t("loadingPhases.app.p3000") },
      { afterMs: 8000, message: t("loadingPhases.app.p8000") },
    ],
    [t]
  );
  const message = useSlowLoadingMessage(true, phases ?? defaultPhases);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 app-page-bg px-4">
      <div className="relative flex h-20 w-20 items-center justify-center" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
        <CycleIQMark className="relative h-11 w-11 text-emerald-500" />
      </div>
      <div className="animate-fade-in max-w-xs text-center">
        <p role="status" aria-live="polite" className="text-sm font-medium text-slate-700">
          {message}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("sync.subtitle")}</p>
      </div>
    </main>
  );
}
