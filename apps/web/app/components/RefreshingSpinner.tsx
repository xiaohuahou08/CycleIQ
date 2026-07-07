"use client";

import { RefreshCw } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { useSlowLoadingMessage } from "@/lib/hooks/useSlowLoadingMessage";

interface RefreshingSpinnerProps {
  active?: boolean;
  className?: string;
}

export default function RefreshingSpinner({
  active = true,
  className = "",
}: RefreshingSpinnerProps) {
  const message = useSlowLoadingMessage(active);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className="relative flex h-10 w-10 items-center justify-center" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <div className="absolute inset-0 motion-safe:animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
        <RefreshCw className={`relative ${iconSm} text-emerald-600`} strokeWidth={iconStroke} />
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );
}
