import Link from "next/link";
import { CycleIQMark } from "@/app/components/icons";
import { SITE_NAME } from "@/lib/seo/site";
import { BTN_PRIMARY, type MarketingPage } from "./styles";

interface MarketingHeaderProps {
  activePage?: MarketingPage;
}

export default function MarketingHeader({ activePage }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-slate-900" aria-label={`${SITE_NAME} home`}>
          <CycleIQMark className="h-8 w-8 text-emerald-500" />
          <span className="text-base font-bold tracking-tight">CycleIQ</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm" aria-label="Primary">
          {activePage !== "home" && (
            <Link
              href="/"
              className="font-medium text-slate-700 transition hover:text-slate-900"
            >
              Home
            </Link>
          )}
          <Link
            href="/pricing"
            className={`font-medium transition ${
              activePage === "pricing"
                ? "text-slate-900"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Pricing
          </Link>
          <Link href="/login" className={BTN_PRIMARY}>
            Sign in / Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
