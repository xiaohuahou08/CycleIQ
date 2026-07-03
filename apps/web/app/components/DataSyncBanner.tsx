"use client";

import { RefreshCw } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { useSlowLoadingMessage } from "@/lib/hooks/useSlowLoadingMessage";

interface DataSyncBannerProps {
  active: boolean;
  className?: string;
  compact?: boolean;
}

export default function DataSyncBanner({
  active,
  className = "",
  compact = false,
}: DataSyncBannerProps) {
  const message = useSlowLoadingMessage(active);

  if (!active) return null;

  if (compact) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`animate-fade-in inline-flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-800 ${className}`}
      >
        <RefreshCw
          className={`${iconSm} shrink-0 text-emerald-600 motion-safe:animate-spin`}
          strokeWidth={iconStroke}
          aria-hidden
        />
        <span className="font-medium">{message}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-fade-in flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-3 shadow-sm ring-1 ring-emerald-100/60 ${className}`}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100/80">
        <RefreshCw
          className={`${iconSm} text-emerald-600 motion-safe:animate-spin`}
          strokeWidth={iconStroke}
          aria-hidden
        />
        <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-400/20" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-emerald-900">{message}</p>
        <p className="mt-0.5 text-xs text-emerald-700/75">
          Fetching the latest from your database
        </p>
      </div>
      <span className="ml-auto hidden items-center gap-1 sm:flex" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500/70 motion-safe:animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
