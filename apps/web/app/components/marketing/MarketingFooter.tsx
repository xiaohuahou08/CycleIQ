import Link from "next/link";
import { CycleIQMark } from "@/app/components/icons";

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <CycleIQMark className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-white">CycleIQ</p>
              <p className="text-xs text-slate-500">Wheel strategy tracking for retail traders</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-xs" aria-label="Footer">
            <Link href="/" className="text-slate-400 transition hover:text-slate-200">
              Home
            </Link>
            <Link href="/pricing" className="text-slate-400 transition hover:text-slate-200">
              Pricing
            </Link>
            <Link href="/login" className="text-slate-400 transition hover:text-slate-200">
              Sign in
            </Link>
          </nav>
        </div>
        <p className="mt-6 border-t border-slate-800 pt-6 text-xs text-slate-600">
          © {new Date().getFullYear()} CycleIQ · MIT License
        </p>
      </div>
    </footer>
  );
}
