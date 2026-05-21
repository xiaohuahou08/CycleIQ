import Link from "next/link";
import {
  BarChart2,
  Bell,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-500">{description}</div>
    </div>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
          {step}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
      </div>
      <div className="mt-4 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-500">{description}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-sm font-bold tracking-tight text-slate-900">
            CycleIQ
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <RefreshCw className="h-3 w-3" />
                Wheel Strategy Tracker
              </div>

              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                See your entire wheel
                <br />
                <span className="text-emerald-600">at a glance.</span>
              </h1>

              <p className="mt-5 text-base leading-relaxed text-slate-500">
                CycleIQ reconstructs your options trades into clear cycles — from cash-secured
                puts through assignment to covered calls — so you can track premium, P&L, and
                next steps without spreadsheets.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  Get started free
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  See how it works
                </Link>
              </div>

              <ul className="mt-8 space-y-3">
                {[
                  "Cycle-centric view of open positions and strategy stage",
                  "Premium, P&L, and annualized ROI calculated automatically",
                  "Roll, assign, and expire trades with a single click",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: dashboard preview */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
              {/* Mock sidebar strip + header */}
              <div className="flex h-10 items-center gap-3 bg-slate-900 px-4">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                </div>
                <span className="text-xs font-medium text-slate-400">CycleIQ — Dashboard</span>
              </div>

              <div className="bg-slate-50 p-5">
                {/* KPI tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-1 bg-emerald-400" />
                    <div className="p-3">
                      <div className="text-[10px] font-medium text-slate-400">Total Premium</div>
                      <div className="mt-1.5 text-xl font-semibold text-slate-900">$12,480</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">All time</div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-1 bg-blue-400" />
                    <div className="p-3">
                      <div className="text-[10px] font-medium text-slate-400">Ann. ROI</div>
                      <div className="mt-1.5 text-xl font-semibold text-slate-900">21.4%</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">Capital deployed</div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-1 bg-blue-400" />
                    <div className="p-3">
                      <div className="text-[10px] font-medium text-slate-400">Win Rate</div>
                      <div className="mt-1.5 text-xl font-semibold text-slate-900">68%</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">Expired OTM</div>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-1 bg-violet-400" />
                    <div className="p-3">
                      <div className="text-[10px] font-medium text-slate-400">Active Trades</div>
                      <div className="mt-1.5 text-xl font-semibold text-slate-900">7</div>
                      <div className="mt-0.5 text-[10px] text-slate-400">OPEN positions</div>
                    </div>
                  </div>
                </div>

                {/* Active cycles list */}
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700">Active Positions</span>
                    <span className="text-[10px] text-emerald-600">View all →</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { ticker: "AAPL", strategy: "CSP", badge: "bg-amber-100 text-amber-800", label: "CSP open" },
                      { ticker: "MSFT", strategy: "CC", badge: "bg-sky-100 text-sky-800", label: "Stock held" },
                      { ticker: "NVDA", strategy: "CC", badge: "bg-emerald-100 text-emerald-800", label: "CC open" },
                    ].map((row) => (
                      <div key={row.ticker} className="flex items-center justify-between text-xs">
                        <div className="font-medium text-slate-800">{row.ticker}</div>
                        <div className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${row.badge}`}>
                          {row.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
            <p className="mt-2 text-sm text-slate-500">
              From your first trade to a full cycle view in three steps.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <StepCard
              step={1}
              icon={ClipboardList}
              title="Log your trades"
              description="Enter wheel trades manually — option type, strike, expiry, premium, and contracts. No broker integration needed."
            />
            <StepCard
              step={2}
              icon={RefreshCw}
              title="Cycles are reconstructed"
              description="CycleIQ groups activity into a clean CSP → Assignment → CC lifecycle per ticker using a state machine."
            />
            <StepCard
              step={3}
              icon={TrendingUp}
              title="Track and optimize"
              description="See open positions, net premium per cycle, annualized returns, and what action is next for each ticker."
            />
          </div>
        </div>
      </section>

      {/* Why CycleIQ */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Why CycleIQ?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                The problem
              </div>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  "Broker data is fragmented across tabs and screens",
                  "No tool tracks the full CSP → CC lifecycle",
                  "Manual spreadsheets break when you roll or get assigned",
                  "Hard to know your real annualized return per cycle",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                The solution
              </div>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  "Cycle-centric view ties all legs of a wheel together",
                  "State machine tracks CSP, assignment, CC, and exit automatically",
                  "Premium, P&L, and ROI recalculated whenever you update a trade",
                  "Roll and assign actions built into the trade workflow",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Key features</h2>
            <p className="mt-2 text-sm text-slate-500">Everything you need to run a disciplined wheel strategy.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FeatureCard
              icon={RefreshCw}
              title="Cycle tracking"
              description="Track CSP → assignment → CC → exit as one coherent lifecycle per ticker. Roll chains are preserved automatically."
            />
            <FeatureCard
              icon={BarChart2}
              title="Smart analytics"
              description="Premium income, annualized ROI, win rate, and capital efficiency — updated live as you log trades."
            />
            <FeatureCard
              icon={ClipboardList}
              title="Trade workflow"
              description="Expire, roll, assign, or close trades directly from the trade log. No double-entry, no drift."
            />
            <FeatureCard
              icon={Bell}
              title="Alerts (coming soon)"
              description="DTE reminders and assignment-risk nudges so you never miss an action on an expiring contract."
            />
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-emerald-600">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-2xl font-semibold text-white">
            Start tracking your wheel today.
          </h2>
          <p className="mt-3 text-sm text-emerald-100">
            Free to use. No broker connection required. Takes 2 minutes to log your first trade.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-white">CycleIQ</div>
              <div className="mt-1 text-xs text-slate-400">
                Wheel strategy tracking for disciplined traders.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
              <Link href="/login" className="hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="hover:text-white transition-colors">
                Register
              </Link>
              <a
                href="https://github.com/xiaohuahou08/CycleIQ"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-800 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} CycleIQ. MIT License.
          </div>
        </div>
      </footer>
    </div>
  );
}
