import Link from "next/link";

function CheckIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
    >
      ✓
    </span>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{description}</div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight text-gray-900">
            CycleIQ
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="font-medium text-gray-700 hover:text-gray-900">
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-3 py-2 font-medium text-white hover:bg-gray-800"
            >
              Get started
            </Link>
          </nav>
        </header>

        <section className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
              <span className="font-medium text-gray-900">Wheel Strategy</span>
              <span className="text-gray-300">•</span>
              <span>Cycle tracking + analytics</span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              See your entire wheel at a glance.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-gray-600">
              CycleIQ reconstructs your options workflow into clear cycles — from cash-secured
              puts to assignment to covered calls — so you can track premium, PnL, and next steps
              without spreadsheets.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800"
              >
                Get started free
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 hover:bg-gray-50"
              >
                See how it works
              </Link>
            </div>

            <ul className="mt-7 space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span>Cycle-centric view of open positions and strategy stage.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span>Premium and outcomes summarized across cycles.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span>Built on Supabase Auth + Postgres with per-user data isolation.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-gray-500">Preview</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  Dashboard snapshot
                </div>
              </div>
              <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                MVP
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Total premium</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">$12,480</div>
                <div className="mt-1 text-xs text-gray-500">All time</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Active positions</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">7</div>
                <div className="mt-1 text-xs text-gray-500">CSP + CC</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Win rate</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">68%</div>
                <div className="mt-1 text-xs text-gray-500">Expired OTM</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Annualized return</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">21.4%</div>
                <div className="mt-1 text-xs text-gray-500">Capital deployed</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-medium text-gray-500">Active cycles</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">AAPL</div>
                  <div className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                    CSP open
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">MSFT</div>
                  <div className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800">
                    Stock held
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">NVDA</div>
                  <div className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
                    CC open
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Why CycleIQ?</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-xs font-medium text-gray-500">The pain</div>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>Broker data scattered across screens</li>
                  <li>Manual tracking in spreadsheets</li>
                  <li>No full-cycle visibility</li>
                  <li>Hard to compute real returns</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-xs font-medium text-gray-500">The solution</div>
                <ul className="mt-3 space-y-2 text-sm text-gray-700">
                  <li>Cycle-centric terminal UI</li>
                  <li>Premium & PnL summary</li>
                  <li>Clear stage status per ticker</li>
                  <li>Workflow-ready next steps</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Key features</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FeatureCard
                title="Cycle tracking"
                description="Track CSP → assignment → CC → exit as one coherent lifecycle."
              />
              <FeatureCard
                title="Smart analytics"
                description="Premium, ROI proxies, win-rate, and capital efficiency at a glance."
              />
              <FeatureCard
                title="Trade workflow"
                description="Plan next actions and keep a clean record of intents and outcomes."
              />
              <FeatureCard
                title="Alerts (future)"
                description="DTE reminders and assignment-risk nudges without noise."
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mt-16 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">How it works</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-xs font-medium text-gray-500">Step 1</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">Add or import trades</div>
              <div className="mt-2 text-sm text-gray-600">Bring in your wheel trades — manual entry first, imports later.</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-xs font-medium text-gray-500">Step 2</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">Reconstruct cycles</div>
              <div className="mt-2 text-sm text-gray-600">CycleIQ groups activity into a clean CSP/CC lifecycle per ticker.</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-xs font-medium text-gray-500">Step 3</div>
              <div className="mt-2 text-sm font-semibold text-gray-900">Track & optimize</div>
              <div className="mt-2 text-sm text-gray-600">See what’s open, what’s next, and where premium is coming from.</div>
            </div>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">For who?</h2>
          <div className="mt-3 text-sm text-gray-600">
            Retail options traders running 5–50 concurrent wheel positions who want a clean, cycle-centric view without spreadsheet chaos.
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
          <div className="mt-3 text-sm text-gray-600">
            MVP launches as free. Paid tiers may come later for advanced analytics and integrations.
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 hover:bg-gray-50"
            >
              Sign in
            </Link>
          </div>
        </section>

        <footer className="mt-16 border-t border-gray-200 py-8 text-sm text-gray-600">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} CycleIQ</div>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="hover:text-gray-900 hover:underline">
                Login
              </Link>
              <Link href="/register" className="hover:text-gray-900 hover:underline">
                Register
              </Link>
              <a
                href="https://github.com/xiaohuahou08/CycleIQ"
                className="hover:text-gray-900 hover:underline"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
