"use client";

import { RefreshCw } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";

interface RefreshButtonProps {
  loading: boolean;
  onClick: () => void;
  className?: string;
}

export default function RefreshButton({ loading, onClick, className = "" }: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-80 ${className}`}
    >
      <RefreshCw
        className={`${iconSm} ${loading ? "text-emerald-600 motion-safe:animate-spin" : "text-slate-500"}`}
        strokeWidth={iconStroke}
        aria-hidden
      />
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  );
}
