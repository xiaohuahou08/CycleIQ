"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type SummaryCard = {
  label: string;
  value: string;
  hint: string;
};

type PositionRow = {
  ticker: string;
  strategy: "CSP" | "CC";
  strike: string;
  expiry: string;
  dte: string;
  premium: string;
  status: "OPEN" | "ROLLING";
};

type CycleStatusRow = {
  ticker: string;
  stage: "Sell Put" | "Holding Shares" | "Sell Call";
};

const summaryCards: SummaryCard[] = [
  { label: "Total Premium Income", value: "$0", hint: "Coming soon" },
  { label: "Annualized Return", value: "—", hint: "Coming soon" },
  { label: "Active Positions", value: "0", hint: "Open CSP/CC" },
  { label: "Win Rate", value: "—", hint: "Expired OTM %" },
];

const samplePositions: PositionRow[] = [
  {
    ticker: "AAPL",
    strategy: "CSP",
    strike: "$170",
    expiry: "2026-05-17",
    dte: "23",
    premium: "$1.25",
    status: "OPEN",
  },
  {
    ticker: "MSFT",
    strategy: "CC",
    strike: "$450",
    expiry: "2026-05-10",
    dte: "16",
    premium: "$2.10",
    status: "ROLLING",
  },
];

const sampleCycles: CycleStatusRow[] = [
  { ticker: "AAPL", stage: "Sell Put" },
  { ticker: "MSFT", stage: "Holding Shares" },
  { ticker: "NVDA", stage: "Sell Call" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        setEmail(user.email ?? "");
      } catch {
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [router]);

  const onLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
        <p className="text-gray-600">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-lg font-semibold text-gray-900">
              CycleIQ
            </Link>
            <nav className="flex flex-wrap gap-3 text-sm font-medium text-gray-700">
              <Link href="/dashboard" className="hover:text-gray-900 hover:underline">
                Dashboard
              </Link>
              <Link href="/cycles" className="hover:text-gray-900 hover:underline">
                Trades
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600">{email ?? "Signed in"}</span>
            <button
              type="button"
              onClick={() => {
                void onLogout();
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-sm text-gray-500">Overview</div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/cycles"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Add Trade
            </Link>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 opacity-60"
            >
              Add Watchlist
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium text-gray-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</div>
              <div className="mt-1 text-xs text-gray-500">{card.hint}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
              <div>
                <div className="text-sm font-semibold text-gray-900">Active positions</div>
                <div className="mt-1 text-xs text-gray-500">Max 5 rows (MVP)</div>
              </div>
              <Link href="/cycles" className="text-sm font-medium text-gray-900 underline">
                View all
              </Link>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left font-medium">Ticker</th>
                    <th className="px-5 py-3 text-left font-medium">Strategy</th>
                    <th className="px-5 py-3 text-left font-medium">Strike</th>
                    <th className="px-5 py-3 text-left font-medium">Expiry</th>
                    <th className="px-5 py-3 text-left font-medium">DTE</th>
                    <th className="px-5 py-3 text-left font-medium">Premium</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {samplePositions.slice(0, 5).map((row) => (
                    <tr key={`${row.ticker}-${row.expiry}-${row.strike}`} className="border-b border-gray-100">
                      <td className="px-5 py-3 font-medium text-gray-900">{row.ticker}</td>
                      <td className="px-5 py-3 text-gray-700">{row.strategy}</td>
                      <td className="px-5 py-3 text-gray-700">{row.strike}</td>
                      <td className="px-5 py-3 text-gray-700">{row.expiry}</td>
                      <td className="px-5 py-3 text-gray-700">{row.dte}</td>
                      <td className="px-5 py-3 text-gray-700">{row.premium}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            row.status === "OPEN"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {samplePositions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-600">
                        No trades yet. Add your first trade to get started.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Wheel cycle status</div>
              <div className="mt-1 text-xs text-gray-500">Current stage per active cycle</div>
              <div className="mt-4 space-y-2">
                {sampleCycles.map((row) => (
                  <div key={row.ticker} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">{row.ticker}</div>
                    <div className="text-xs text-gray-600">{row.stage}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Recent activity</div>
              <div className="mt-1 text-xs text-gray-500">Last 5 events (optional)</div>
              <div className="mt-4 text-sm text-gray-600">No events yet.</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
