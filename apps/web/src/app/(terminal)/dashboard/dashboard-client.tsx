"use client";

import { useEffect, useState } from "react";
import { useDataMode } from "@/hooks/use-data-mode";
import { fetchLatestMarketSnapshot } from "@/lib/terminal/supabase-actions";

type MarketPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; title: string; lines: string[] };

export default function DashboardClient() {
  const { mode } = useDataMode();
  const [market, setMarket] = useState<MarketPanelState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setMarket({ status: "loading" });
        if (mode === "memory") {
          const res = await fetch("/api/dev/wheel/market", { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as {
            market: { asOfDate: string; seed: string; underlyings: Record<string, { price: number; iv: number }> } | null;
            asOfDate: string;
            seed: string;
          };
          const m = json.market;
          if (!m) {
            setMarket({
              status: "ready",
              title: "Market (mock)",
              lines: ["No snapshot yet. Create a Wheel cycle to generate one."],
            });
            return;
          }
          const lines = Object.entries(m.underlyings).map(
            ([t, q]) => `${t}: $${q.price.toFixed(2)}  iv=${q.iv}`
          );
          setMarket({
            status: "ready",
            title: `Market (mock) • ${m.asOfDate} • seed=${m.seed}`,
            lines,
          });
          return;
        }

        const snap = await fetchLatestMarketSnapshot();
        if (!snap) {
          setMarket({
            status: "ready",
            title: "Market (mock)",
            lines: ["No snapshot yet. Create a Wheel cycle to generate one."],
          });
          return;
        }
        const underlyings = (snap.underlyings ?? {}) as Record<
          string,
          { price: number; iv: number }
        >;
        const lines = Object.entries(underlyings).map(
          ([t, q]) => `${t}: $${Number(q.price).toFixed(2)}  iv=${q.iv}`
        );
        setMarket({
          status: "ready",
          title: `Market (mock) • ${snap.as_of_date} • seed=${snap.seed}`,
          lines: lines.length ? lines : ["(empty)"],
        });
      } catch (e) {
        if (cancelled) return;
        setMarket({
          status: "error",
          message: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-[color:var(--muted)]">Overview</div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/cycles"
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
          >
            View cycles
          </a>
          <a
            href="/orders"
            className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
          >
            Pending orders
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="Total premium" value="$0" hint="Simulated" />
        <KpiCard label="Realized PnL" value="$0" hint="Simulated" />
        <KpiCard label="Open cycles" value="0" hint="Active" />
        <KpiCard label="Action required" value="0" hint="Approvals / failures" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Panel title="Action required" subtitle="Pending approvals and failures">
          <div className="text-sm text-[color:var(--muted)]">
            No pending actions yet. Seed demo data in Settings to populate the terminal.
          </div>
        </Panel>
        <Panel title="Recent activity" subtitle="Audit/event feed (MVP)">
          <div className="text-sm text-[color:var(--muted)]">No events yet.</div>
        </Panel>
        <Panel title={market.status === "ready" ? market.title : "Market (mock)"} subtitle="Simulated quotes and IV">
          {market.status === "loading" ? (
            <div className="text-sm text-[color:var(--muted)]">Loading…</div>
          ) : market.status === "error" ? (
            <div className="text-sm text-[color:var(--muted)]">Error: {market.message}</div>
          ) : market.status === "ready" ? (
            <div className="text-sm text-[color:var(--muted)] space-y-1">
              {market.lines.map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[color:var(--muted)]">—</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)] p-4">
      <div className="text-xs text-[color:var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[color:var(--muted)]">{hint}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-[color:var(--panel)]">
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[color:var(--muted)]">{subtitle}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

