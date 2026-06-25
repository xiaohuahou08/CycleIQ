import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CycleIQMark, iconStroke } from "@/app/components/icons";
import MarketingFooter from "./MarketingFooter";
import MarketingHeader from "./MarketingHeader";
import { BTN_PRIMARY, BTN_SECONDARY, type MarketingPage } from "./styles";

interface MarketingShellProps {
  activePage?: MarketingPage;
  children: ReactNode;
  cta?: {
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
  };
}

export default function MarketingShell({
  activePage,
  children,
  cta,
}: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-slate-50/40">
      <MarketingHeader activePage={activePage} />
      <main id="main-content">{children}</main>
      {cta ? (
        <section className="bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
            <CycleIQMark className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{cta.title}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              {cta.description}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={cta.buttonHref}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                {cta.buttonLabel}
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      <MarketingFooter />
    </div>
  );
}

export function MarketingCheckListItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-700">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        strokeWidth={iconStroke}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

export { BTN_PRIMARY, BTN_SECONDARY, MarketingHeader, MarketingFooter };
