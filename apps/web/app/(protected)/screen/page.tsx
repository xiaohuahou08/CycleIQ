"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import PageHeader from "@/app/components/PageHeader";
import { useToast } from "@/app/components/Toast";
import {
  BTN_ACCENT,
  CARD_BASE,
  PILL_ACTIVE,
  PILL_IDLE,
} from "@/app/components/ui/styles";
import { Button } from "@/components/ui/button";
import { useProtectedAuth } from "@/app/(protected)/auth-context";
import {
  DEFAULT_SCREENER_CONFIG,
  getScreenerConfig,
  updateScreenerConfig,
  type ScreenerConfigApi,
} from "@/lib/api/preferences";
import { runScreenScan, type ScreenCandidate, type ScreenScanResult } from "@/lib/api/screen";
import { useTranslations } from "@/lib/i18n/locale-context";

type ModeTab = "put" | "call";

function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function money(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toFixed(digits)}`;
}

function parseNumberInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function ConfigNumberField({
  label,
  hint,
  value,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  step?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {hint ? <span className="text-[11px] leading-snug text-slate-500">{hint}</span> : null}
      <input
        type="number"
        step={step ?? "any"}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const n = parseNumberInput(e.target.value);
          if (n != null) onChange(n);
        }}
        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
      />
    </label>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function CandidateTable({
  rows,
  mode,
  empty,
  scanning,
}: {
  rows: ScreenCandidate[];
  mode: ModeTab;
  empty: string;
  scanning: boolean;
}) {
  const { t } = useTranslations("screen");

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
  const [configOpen, setConfigOpen] = useState(false);
  const [tickerInput, setTickerInput] = useState("");
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

  const addTicker = () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) return;
    if (config.watchlist.includes(ticker)) {
      setTickerInput("");
      return;
    }
    if (config.watchlist.length >= 30) {
      showToast(t("errors.watchlistMax"), "error");
      return;
    }
    setConfig((c) => ({ ...c, watchlist: [...c.watchlist, ticker] }));
    setTickerInput("");
  };

  const removeTicker = (ticker: string) => {
    setConfig((c) => ({ ...c, watchlist: c.watchlist.filter((x) => x !== ticker) }));
  };

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

  const patch = <K extends keyof ScreenerConfigApi>(key: K, value: ScreenerConfigApi[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip label={t("stats.puts")} value={String(result.puts.length)} />
            <StatChip label={t("stats.calls")} value={String(result.calls.length)} />
            <StatChip label={t("stats.holdings")} value={String(result.holdings.length)} />
            <StatChip
              label={t("stats.watchlist")}
              value={String(result.config_used.watchlist.length)}
            />
          </div>
        ) : null}

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

          <div className="border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              onClick={() => setConfigOpen((o) => !o)}
              aria-expanded={configOpen}
            >
              <span>{t("config.title")}</span>
              {configOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
            {configOpen ? (
              <div className="mt-4 space-y-5">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{t("config.watchlist")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t("config.watchlistHint")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {config.watchlist.map((ticker) => (
                      <span
                        key={ticker}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      >
                        {ticker}
                        <button
                          type="button"
                          aria-label={`Remove ${ticker}`}
                          onClick={() => removeTicker(ticker)}
                          className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {config.watchlist.length === 0 ? (
                      <span className="text-xs text-slate-400">{t("config.emptyWatchlist")}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      value={tickerInput}
                      onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTicker();
                        }
                      }}
                      placeholder={t("config.tickerPlaceholder")}
                      className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addTicker}>
                      <Plus className="mr-1 h-4 w-4" />
                      {t("config.addTicker")}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ConfigNumberField
                    label={t("config.minDte")}
                    value={config.min_dte}
                    step="1"
                    onChange={(n) => patch("min_dte", Math.round(n))}
                  />
                  <ConfigNumberField
                    label={t("config.maxDte")}
                    value={config.max_dte}
                    step="1"
                    onChange={(n) => patch("max_dte", Math.round(n))}
                  />
                  <ConfigNumberField
                    label={t("config.minNetPremium")}
                    hint={t("config.minNetPremiumHint")}
                    value={config.min_net_premium_usd}
                    step="0.05"
                    onChange={(n) => patch("min_net_premium_usd", n)}
                  />
                  <ConfigNumberField
                    label={t("config.minAnnualized")}
                    hint={t("config.ratioHint")}
                    value={config.min_annualized_return}
                    step="0.01"
                    onChange={(n) => patch("min_annualized_return", n)}
                  />
                  <ConfigNumberField
                    label={t("config.minIvRv")}
                    value={config.min_iv_rv_ratio}
                    step="0.05"
                    onChange={(n) => patch("min_iv_rv_ratio", n)}
                  />
                  <ConfigNumberField
                    label={t("config.minIvMinusRv")}
                    value={config.min_iv_minus_rv}
                    step="0.01"
                    onChange={(n) => patch("min_iv_minus_rv", n)}
                  />
                  <ConfigNumberField
                    label={t("config.maxSpread")}
                    value={config.max_spread_ratio}
                    step="0.05"
                    onChange={(n) => patch("max_spread_ratio", n)}
                  />
                  <ConfigNumberField
                    label={t("config.putRecall")}
                    value={config.put_recall_below_pct}
                    step="0.05"
                    onChange={(n) => patch("put_recall_below_pct", n)}
                  />
                  <ConfigNumberField
                    label={t("config.callRecall")}
                    value={config.call_recall_above_pct}
                    step="0.05"
                    onChange={(n) => patch("call_recall_above_pct", n)}
                  />
                  <ConfigNumberField
                    label={t("config.callCostFloor")}
                    value={config.call_cost_floor_mult}
                    step="0.01"
                    onChange={(n) => patch("call_cost_floor_mult", n)}
                  />
                  <ConfigNumberField
                    label={t("config.earningsWindow")}
                    value={config.earnings_hard_window_days}
                    step="1"
                    onChange={(n) => patch("earnings_hard_window_days", Math.round(n))}
                  />
                  <ConfigNumberField
                    label={t("config.proximityBand")}
                    value={config.return_proximity_band}
                    step="0.001"
                    onChange={(n) => patch("return_proximity_band", n)}
                  />
                  <ConfigNumberField
                    label={t("config.feePerContract")}
                    hint={t("config.feeHint")}
                    value={config.fee_per_contract_usd ?? 0.65}
                    step="0.05"
                    onChange={(n) => patch("fee_per_contract_usd", n)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void saveConfig()}
                    disabled={saving}
                  >
                    {saving ? t("saving") : t("saveConfig")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

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
          />
        </div>
      </div>
    </main>
  );
}
