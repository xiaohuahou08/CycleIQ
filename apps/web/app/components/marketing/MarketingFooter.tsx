import Link from "next/link";
import { CycleIQMark } from "@/app/components/icons";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-2.5">
            <CycleIQMark className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-white">CycleIQ</p>
              <p className="text-xs text-slate-500">Wheel strategy tracking for retail traders</p>
            </div>
          </div>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500"
            aria-label="Legal"
          >
            <Link href="/privacy" className="transition hover:text-slate-300">
              Privacy Policy
            </Link>
            <span className="text-slate-700" aria-hidden>
              ·
            </span>
            <Link href="/terms" className="transition hover:text-slate-300">
              Terms of Service
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
