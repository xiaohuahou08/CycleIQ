"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Info, Plus, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { CARD_BASE } from "@/app/components/ui/styles";
import { Button } from "@/components/ui/button";
import { DEFAULT_SCREENER_CONFIG, type ScreenerConfigApi } from "@/lib/api/preferences";
import { useTranslations } from "@/lib/i18n/locale-context";

const TOOLTIP_MAX_W = 300;
const TOOLTIP_GAP = 8;
const VIEWPORT_PAD = 12;

function ParamTip({ tip, ariaLabel }: { tip: string; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: TOOLTIP_MAX_W });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const btn = btnRef.current;
    const tipEl = tipRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const tipW = Math.min(TOOLTIP_MAX_W, window.innerWidth - VIEWPORT_PAD * 2);
    const tipH = tipEl?.offsetHeight ?? 96;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - tipW - VIEWPORT_PAD));
    const spaceBelow = window.innerHeight - rect.bottom - TOOLTIP_GAP - VIEWPORT_PAD;
    const spaceAbove = rect.top - TOOLTIP_GAP - VIEWPORT_PAD;
    let top =
      spaceBelow >= tipH || spaceBelow >= spaceAbove
        ? rect.bottom + TOOLTIP_GAP
        : rect.top - TOOLTIP_GAP - tipH;
    top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - tipH - VIEWPORT_PAD));
    setCoords({ top, left, width: tipW });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(updatePosition);
    const onReflow = () => updatePosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePosition, tip]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        aria-label={ariaLabel}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={iconStroke} aria-hidden />
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
            className="z-[9999] rounded-xl border border-slate-700/80 bg-slate-900 px-3.5 py-2.5 text-[12px] leading-relaxed text-slate-100 shadow-xl"
            onMouseEnter={show}
            onMouseLeave={hide}
          >
            {tip}
          </div>,
          document.body
        )}
    </>
  );
}

function parseNumberInput(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function ratioToPct(ratio: number): number {
  return Number((ratio * 100).toFixed(4));
}

function ConfigNumberField({
  label,
  tip,
  unit,
  value,
  step,
  min,
  max,
  asPercent,
  onChange,
}: {
  label: string;
  tip: string;
  unit: string;
  value: number;
  step?: string;
  min?: number;
  max?: number;
  asPercent?: boolean;
  onChange: (n: number) => void;
}) {
  const { t } = useTranslations("screen");
  const display = asPercent ? ratioToPct(value) : value;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-0.5 text-[12px] font-medium text-slate-700">
        {label}
        <ParamTip tip={tip} ariaLabel={t("config.tipAria", { label })} />
      </span>
      <span className="relative">
        <input
          type="number"
          step={step ?? "any"}
          min={min}
          max={max}
          value={Number.isFinite(display) ? display : ""}
          onChange={(e) => {
            const n = parseNumberInput(e.target.value);
            if (n == null) return;
            onChange(asPercent ? n / 100 : n);
          }}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-12 text-sm tabular-nums text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-slate-400">
          {unit}
        </span>
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function ScreenerConfigPanel({
  config,
  onChange,
  onSave,
  saving,
  loading,
  onWatchlistMax,
}: {
  config: ScreenerConfigApi;
  onChange: (next: ScreenerConfigApi) => void;
  onSave: () => void;
  saving: boolean;
  loading: boolean;
  onWatchlistMax?: () => void;
}) {
  const { t } = useTranslations("screen");
  const [open, setOpen] = useState(true);
  const [tickerInput, setTickerInput] = useState("");

  const patch = <K extends keyof ScreenerConfigApi>(key: K, value: ScreenerConfigApi[K]) => {
    onChange({ ...config, [key]: value });
  };

  const addTicker = () => {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) return;
    if (config.watchlist.includes(ticker)) {
      setTickerInput("");
      return;
    }
    if (config.watchlist.length >= 30) {
      onWatchlistMax?.();
      return;
    }
    onChange({ ...config, watchlist: [...config.watchlist, ticker] });
    setTickerInput("");
  };

  const removeTicker = (ticker: string) => {
    onChange({ ...config, watchlist: config.watchlist.filter((x) => x !== ticker) });
  };

  const resetDefaults = () => {
    onChange({ ...DEFAULT_SCREENER_CONFIG });
  };

  const summary = t("config.summary", {
    min: config.min_dte,
    max: config.max_dte,
    premium: config.min_net_premium_usd.toFixed(2),
    ann: ratioToPct(config.min_annualized_return),
    tickers: config.watchlist.length,
  });

  return (
    <div className={`${CARD_BASE} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 via-white to-white px-4 py-3.5">
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2 rounded-lg text-left"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <SlidersHorizontal className={iconSm} strokeWidth={iconStroke} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">{t("config.title")}</span>
            <span className="block truncate text-xs text-slate-500">{summary}</span>
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className="space-y-4 px-4 py-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-0.5 text-sm font-semibold text-slate-900">
                  {t("config.watchlist")}
                  <ParamTip tip={t("config.tips.watchlist")} ariaLabel={t("config.tipAria", { label: t("config.watchlist") })} />
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{t("config.watchlistHint")}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                {config.watchlist.length}/30
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.watchlist.map((ticker) => (
                <span
                  key={ticker}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-slate-700"
                >
                  {ticker}
                  <button
                    type="button"
                    aria-label={t("config.removeTicker", { ticker })}
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
                className="h-9 w-40 rounded-lg border border-slate-200 px-3 text-sm tracking-wide focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTicker}>
                <Plus className="mr-1 h-4 w-4" />
                {t("config.addTicker")}
              </Button>
            </div>
          </section>

          <Section title={t("config.groups.expiry")}>
            <ConfigNumberField
              label={t("config.minDte")}
              tip={t("config.tips.minDte")}
              unit={t("config.units.days")}
              value={config.min_dte}
              step="1"
              min={1}
              max={365}
              onChange={(n) => patch("min_dte", Math.round(n))}
            />
            <ConfigNumberField
              label={t("config.maxDte")}
              tip={t("config.tips.maxDte")}
              unit={t("config.units.days")}
              value={config.max_dte}
              step="1"
              min={1}
              max={365}
              onChange={(n) => patch("max_dte", Math.round(n))}
            />
          </Section>

          <Section title={t("config.groups.premium")}>
            <ConfigNumberField
              label={t("config.minNetPremium")}
              tip={t("config.tips.minNetPremium")}
              unit={t("config.units.usdShare")}
              value={config.min_net_premium_usd}
              step="0.05"
              min={0}
              onChange={(n) => patch("min_net_premium_usd", n)}
            />
            <ConfigNumberField
              label={t("config.minAnnualized")}
              tip={t("config.tips.minAnnualized")}
              unit={t("config.units.percent")}
              value={config.min_annualized_return}
              step="1"
              min={0}
              asPercent
              onChange={(n) => patch("min_annualized_return", n)}
            />
            <ConfigNumberField
              label={t("config.feePerContract")}
              tip={t("config.tips.feePerContract")}
              unit={t("config.units.usdContract")}
              value={config.fee_per_contract_usd ?? 0.65}
              step="0.05"
              min={0}
              onChange={(n) => patch("fee_per_contract_usd", n)}
            />
          </Section>

          <Section title={t("config.groups.liquidity")}>
            <ConfigNumberField
              label={t("config.maxSpread")}
              tip={t("config.tips.maxSpread")}
              unit={t("config.units.percent")}
              value={config.max_spread_ratio}
              step="1"
              min={0}
              asPercent
              onChange={(n) => patch("max_spread_ratio", n)}
            />
          </Section>

          <Section title={t("config.groups.vol")}>
            <ConfigNumberField
              label={t("config.minIvRv")}
              tip={t("config.tips.minIvRv")}
              unit={t("config.units.ratio")}
              value={config.min_iv_rv_ratio}
              step="0.05"
              min={0}
              onChange={(n) => patch("min_iv_rv_ratio", n)}
            />
            <ConfigNumberField
              label={t("config.minIvMinusRv")}
              tip={t("config.tips.minIvMinusRv")}
              unit={t("config.units.volPts")}
              value={config.min_iv_minus_rv}
              step="1"
              min={-100}
              asPercent
              onChange={(n) => patch("min_iv_minus_rv", n)}
            />
          </Section>

          <Section title={t("config.groups.strike")}>
            <ConfigNumberField
              label={t("config.putRecall")}
              tip={t("config.tips.putRecall")}
              unit={t("config.units.percent")}
              value={config.put_recall_below_pct}
              step="1"
              min={1}
              max={100}
              asPercent
              onChange={(n) => patch("put_recall_below_pct", n)}
            />
            <ConfigNumberField
              label={t("config.callRecall")}
              tip={t("config.tips.callRecall")}
              unit={t("config.units.percent")}
              value={config.call_recall_above_pct}
              step="1"
              min={1}
              max={100}
              asPercent
              onChange={(n) => patch("call_recall_above_pct", n)}
            />
            <ConfigNumberField
              label={t("config.callCostFloor")}
              tip={t("config.tips.callCostFloor")}
              unit={t("config.units.multiple")}
              value={config.call_cost_floor_mult}
              step="0.01"
              min={1}
              max={2}
              onChange={(n) => patch("call_cost_floor_mult", n)}
            />
          </Section>

          <Section title={t("config.groups.ranking")}>
            <ConfigNumberField
              label={t("config.earningsWindow")}
              tip={t("config.tips.earningsWindow")}
              unit={t("config.units.days")}
              value={config.earnings_hard_window_days}
              step="1"
              min={0}
              max={30}
              onChange={(n) => patch("earnings_hard_window_days", Math.round(n))}
            />
            <ConfigNumberField
              label={t("config.proximityBand")}
              tip={t("config.tips.proximityBand")}
              unit={t("config.units.percent")}
              value={config.return_proximity_band}
              step="0.1"
              min={0}
              asPercent
              onChange={(n) => patch("return_proximity_band", n)}
            />
          </Section>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetDefaults}
              disabled={loading}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              {t("config.reset")}
            </Button>
            <Button type="button" variant="outline" onClick={onSave} disabled={saving || loading}>
              {saving ? t("saving") : t("saveConfig")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
