import Link from "next/link";
import { CycleIQMark } from "@/app/components/icons";
import { SITE_NAME } from "@/lib/seo/site";
import { BTN_PRIMARY, marketingNavLinkClass, type MarketingPage } from "./styles";

interface MarketingHeaderProps {
  activePage?: MarketingPage;
}

export default function MarketingHeader({ activePage }: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 justify-self-start text-slate-900"
          aria-label={`${SITE_NAME} home`}
        >
          <CycleIQMark className="h-8 w-8 text-emerald-500" />
          <span className="text-base font-bold tracking-tight">CycleIQ</span>
        </Link>

        <nav className="justify-self-center" aria-label="Primary">
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100/90 p-1">
            <Link href="/" className={marketingNavLinkClass(activePage === "home")}>
              Home
            </Link>
            <Link href="/pricing" className={marketingNavLinkClass(activePage === "pricing")}>
              Pricing
            </Link>
          </div>
        </nav>

        <Link href="/login" className={`${BTN_PRIMARY} justify-self-end`}>
          <span className="hidden sm:inline">Sign in / Register</span>
          <span className="sm:hidden">Sign in</span>
        </Link>
      </div>
    </header>
  );
}
