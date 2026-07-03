import type { ReactNode } from "react";
import { LayoutDashboard, RefreshCw, TrendingUp } from "lucide-react";
import AppLoadingScreen from "@/app/components/AppLoadingScreen";
import { CycleIQMark, iconMd, iconStroke } from "@/app/components/icons";
import { AUTH_LOADING_PHASES } from "@/lib/hooks/useSlowLoadingMessage";

const FEATURES = [
  {
    Icon: TrendingUp,
    title: "Trade journal",
    description: "Log CSPs and covered calls with fees, rolls, and lifecycle actions.",
  },
  {
    Icon: RefreshCw,
    title: "Wheel cycles",
    description: "Follow each ticker from put assignment through CC premium and exit.",
  },
  {
    Icon: LayoutDashboard,
    title: "Portfolio insights",
    description: "Realized P&L, cost basis, and open positions in one dashboard.",
  },
] as const;

export const AUTH_INPUT_CLS =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25";

export const AUTH_LABEL_CLS = "mb-1.5 block text-sm font-medium text-slate-800";

export const AUTH_PRIMARY_BTN_CLS =
  "w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const AUTH_OAUTH_BTN_CLS =
  "flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-slate-900 px-6 py-10 text-white sm:px-10 lg:w-[44%] lg:min-h-screen lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(16,185,129,0.18),transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <CycleIQMark className="h-10 w-10 text-emerald-400" />
          <span className="text-xl font-bold tracking-tight">CycleIQ</span>
        </div>

        <div className="relative mt-10 max-w-md lg:mt-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400/90">
            Wheel strategy tracker
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Run your options wheel with clarity
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Purpose-built for cash-secured puts and covered calls — not a generic spreadsheet.
          </p>

          <ul className="mt-10 hidden space-y-5 lg:block">
            {FEATURES.map(({ Icon, title: featureTitle, description }) => (
              <li key={featureTitle} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className={iconMd} strokeWidth={iconStroke} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{featureTitle}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 hidden text-xs text-slate-500 lg:block">
          © {new Date().getFullYear()} CycleIQ
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-slate-50/80 px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[26rem]">
          <div className="animate-scale-in rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm ring-1 ring-slate-900/5 sm:p-9">
            <header className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
              ) : null}
            </header>
            {children}
          </div>
          {footer ? <div className="mt-5 text-center">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}

export function AuthLoadingShell() {
  return <AppLoadingScreen phases={AUTH_LOADING_PHASES} />;
}
