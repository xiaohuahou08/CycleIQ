"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Loader2, Search, Sparkles } from "lucide-react";
import PageHeader from "@/app/components/PageHeader";
import { useToast } from "@/app/components/Toast";
import { BTN_ACCENT, CARD_BASE, PILL_ACTIVE, PILL_IDLE } from "@/app/components/ui/styles";
import { useProtectedAuth } from "@/app/(protected)/auth-context";
import {
  DEFAULT_SCREENER_CONFIG,
  getScreenerConfig,
  updateScreenerConfig,
  type ScreenerConfigApi,
} from "@/lib/api/preferences";
import { runScreenScan, type ScreenCandidate, type ScreenScanResult } from "@/lib/api/screen";
import { useTranslations } from "@/lib/i18n/locale-context";
import ScreenerConfigPanel from "./ScreenerConfigPanel";

type ModeTab = "put" | "call";

function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function money(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(digits)}`;
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function rejectEntries(summary: Record<string, number> | undefined): Array<[string, number]> {
  if (!summary) return [];
  return Object.entries(summary)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}

function CandidateTable({
  rows,
  mode,
  empty,
  scanning,
  rejects,
}: {
  rows: ScreenCandidate[];
  mode: ModeTab;
  empty: string;
  scanning: boolean;
  rejects: Record<string, number> | undefined;
}) {
  const { t } = useTranslations("screen");
  const reasons = rejectEntries(rejects);

  if (scanning) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden />
        <p className="text-sm font-medium text-slate-700">{t("scanning")}</p>
        <p className="max-w-sm text-center text-xs text-slate-500">{t("scanningHint")}</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Search className="h-5 w-5" aria-hidden />
        </span>
        <p className="max-w-md text-sm text-slate-600">{empty}</p>
        {reasons.length ? (
          <ul className="mt-1 max-w-md space-y-1 text-left text-xs text-slate-500">
            {reasons.slice(0, 6).map(([rule, count]) => (
              <li key={rule} className="flex justify-between gap-6">
                <span>{t(`reject.${rule}`)}</span>
                <span className="tabular-nums text-slate-400">{count}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[11px] uppercase tracking-wide text-slate-500 backdrop-blur">
          <tr>
            <th className="px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.symbol")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.strike")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.expiry")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.dte")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.netPremium")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.periodReturn")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.annualized")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.spread")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.ivRv")}</th>
            <th className="px-3 py-2.5 font-semibold">
              {mode === "put" ? t("cols.discount") : t("cols.strikeAbove")}
            </th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.oi")}</th>
            <th className="px-3 py-2.5 font-semibold">{t("cols.capacity")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.contract_id}
              className={`border-b border-slate-100 transition-colors hover:bg-emerald-50/40 ${
                idx === 0 ? "bg-emerald-50/30" : "bg-white"
              }`}
            >
              <td className="px-3 py-2.5 tabular-nums text-slate-400">{row.rank ?? "—"}</td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-xs font-semibold tracking-wide text-white">
                  {row.symbol}
                </span>
              </td>
              <td className="px-3 py-2.5 tabular-nums text-slate-800">{money(row.strike, 2)}</td>
              <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-slate-700">{row.expiry}</td>
              <td className="px-3 py-2.5 tabular-nums text-slate-700">{row.dte}</td>
              <td className="px-3 py-2.5 tabular-nums font-semibold text-emerald-700">
                {money(row.net_premium_per_share)}
              </td>
              <td className="px-3 py-2.5 tabular-nums font-medium text-slate-900">
                {pct(row.period_net_return, 2)}
              </td>
              <td className="px-3 py-2.5 tabular-nums text-slate-700">
                {pct(row.annualized_net_return, 1)}
              </td>
              <td className="px-3 py-2.5 tabular-nums text-slate-600">{pct(row.spread_ratio, 1)}</td>
              <td className="px-3 py-2.5 tabular-nums text-slate-700">
                {row.iv_rv_ratio != null ? row.iv_rv_ratio.toFixed(2) : "—"}
              </td>
              <td className="px-3 py-2.5 tabular-nums text-slate-700">
                {mode === "put"
                  ? pct(row.net_assignment_discount_pct, 1)
                  : money((row.strike ?? 0) - (row.spot ?? 0), 2)}
              </td>
              <td className="px-3 py-2.5 tabular-nums text-slate-600">{row.open_interest ?? "—"}</td>
              <td className="px-3 py-2.5 tabular-nums text-slate-600">
                {row.max_new_contracts ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScreenPage() {
  const { token, isAuthLoading } = useProtectedAuth();
  const { t } = useTranslations("screen");
  const { showToast } = useToast();
  const [config, setConfig] = useState<ScreenerConfigApi>(DEFAULT_SCREENER_CONFIG);
  const [mode, setMode] = useState<ModeTab>("put");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ScreenScanResult | null>(null);

  const loadConfig = useCallback(async () => {
    if (!token) {
      setLoadingConfig(false);
      return;
    }
    setLoadingConfig(true);
    try {
      const cfg = await getScreenerConfig(token);
      setConfig(cfg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("errors.loadConfig"), "error");
    } finally {
      setLoadingConfig(false);
    }
  }, [token, showToast, t]);

  useEffect(() => {
    if (isAuthLoading) return;
    void loadConfig();
  }, [isAuthLoading, loadConfig]);

  const rows = useMemo(() => {
    if (!result) return [];
    return mode === "put" ? result.puts : result.calls;
  }, [result, mode]);

  const topRow = rows[0];

  const saveConfig = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const saved = await updateScreenerConfig(token, config);
      setConfig(saved);
      showToast(t("toast.saved"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("errors.saveConfig"), "error");
    } finally {
      setSaving(false);
    }
  };

  const scan = async () => {
    if (!token) return;
    setScanning(true);
    try {
      const saved = await updateScreenerConfig(token, config);
      setConfig(saved);
      const data = await runScreenScan(token, { config: saved, modes: ["put", "call"] });
      setResult(data);
      showToast(t("toast.scanned"), "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("errors.scan"), "error");
    } finally {
      setScanning(false);
    }
  };

  if (isAuthLoading) return null;

  return (
    <main className="animate-page-enter flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <button
              type="button"
              onClick={() => void scan()}
              disabled={scanning || loadingConfig || !token}
              className={`${BTN_ACCENT} gap-2`}
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {scanning ? t("scanning") : t("scan")}
            </button>
          }
        />

        <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50/80 px-3.5 py-3 text-sm text-sky-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
          <p className="leading-relaxed">{t("advisory")}</p>
        </div>

        {result ? (
          <div className="grid grid-cols-3 gap-3">
            <StatChip label={t("stats.puts")} value={String(result.puts.length)} />
            <StatChip label={t("stats.calls")} value={String(result.calls.length)} />
            <StatChip label={t("stats.holdings")} value={String(result.holdings.length)} />
          </div>
        ) : null}

        <ScreenerConfigPanel
          config={config}
          onChange={setConfig}
          onSave={() => void saveConfig()}
          saving={saving}
          loading={loadingConfig}
        />

        <div className={`${CARD_BASE} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-4 py-3.5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("put")}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  mode === "put" ? PILL_ACTIVE : PILL_IDLE
                }`}
              >
                {t("tabs.put")}
                {result ? (
                  <span className="ml-1.5 tabular-nums opacity-80">({result.puts.length})</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setMode("call")}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  mode === "call" ? PILL_ACTIVE : PILL_IDLE
                }`}
              >
                {t("tabs.call")}
                {result ? (
                  <span className="ml-1.5 tabular-nums opacity-80">({result.calls.length})</span>
                ) : null}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {result?.scanned_at ? (
                <span className="text-xs text-slate-500">
                  {t("scannedAt", { time: new Date(result.scanned_at).toLocaleString() })}
                </span>
              ) : (
                <span className="text-xs text-slate-400">{t("notScannedYet")}</span>
              )}
            </div>
          </div>

          {topRow && !scanning ? (
            <div className="border-b border-emerald-100 bg-emerald-50/50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/80">
                {t("topPick")}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-slate-900">
                  {topRow.symbol} · {money(topRow.strike)} · {topRow.expiry}
                </span>
                <span className="tabular-nums text-emerald-700">
                  {t("cols.netPremium")}: {money(topRow.net_premium_per_share)}
                </span>
                <span className="tabular-nums text-slate-700">
                  {t("cols.periodReturn")}: {pct(topRow.period_net_return, 2)}
                </span>
                <span className="tabular-nums text-slate-600">
                  {t("cols.annualized")}: {pct(topRow.annualized_net_return, 1)}
                </span>
              </div>
            </div>
          ) : null}

          {mode === "call" && result && result.holdings.length === 0 && !scanning ? (
            <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
              {t("noHoldings")}
            </div>
          ) : null}

          <CandidateTable
            rows={rows}
            mode={mode}
            empty={result ? t("emptyAfterScan") : t("empty")}
            scanning={scanning}
            rejects={result?.rejected_summary?.[mode]}
          />
        </div>
      </div>
    </main>
  );
}
