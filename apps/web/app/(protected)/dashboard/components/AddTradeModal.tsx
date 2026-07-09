"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateTradeInput, Trade } from "@/lib/api/trades";
import {
  capitalUtilizationPct,
  computeTotalCapitalInvested,
  cspNotional,
  effectiveCapitalPool,
} from "@/lib/trades/cspCapital";
import { availableCcSharesForTicker, assignedCycleIdForTicker } from "@/lib/cycles/ccCostBasis";
import { todayIso } from "@/lib/trades/cspCapital";
import {
  ModalActionButtons,
  OptionalFieldsCard,
  OptionalFieldsToggle,
  TradeModalShell,
} from "../../components/TradeModalShared";
import { commissionFeeTotal, useTradeDefaults } from "@/lib/hooks/useTradeDefaults";
import { useLocale, useTranslations } from "@/lib/i18n/locale-context";

type TradeFormValues = {
  ticker: string;
  option_type: "PUT" | "CALL";
  strike: number;
  expiry: string;
  trade_date: string;
  premium: number;
  contracts: number;
  notes?: string;
};

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(
      ticker
    )}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function fmtMoneyCompact(value: number, intlLocale: string): string {
  return value.toLocaleString(intlLocale, { maximumFractionDigits: 0 });
}

function getCapitalBudgetErrorMessage(
  trades: Trade[],
  budget: number,
  leg: {
    optionType: "PUT" | "CALL";
    status: string;
    strike: number;
    contracts: number;
    expiry: string;
  },
  excludeTradeId: string | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
  intlLocale: string
): string | null {
  if (leg.optionType !== "PUT" || leg.status !== "OPEN") return null;
  const today = todayIso();
  if (leg.expiry < today) return null;

  const before = computeTotalCapitalInvested(trades, { excludeTradeId });
  const baseWithoutLeg = computeTotalCapitalInvested(trades, { excludeTradeId });
  const after = baseWithoutLeg + cspNotional(leg.strike, leg.contracts);
  const pool = effectiveCapitalPool(budget, trades);

  if (after <= pool + 1e-6) return null;
  if (after <= before + 1e-6) return null;

  const over = after - pool;
  const pct = capitalUtilizationPct(after, pool);
  return t("capital.overBudget", {
    after: `$${fmtMoneyCompact(after, intlLocale)}`,
    pct: pct.toFixed(0),
    pool: `$${fmtMoneyCompact(pool, intlLocale)}`,
    over: `$${fmtMoneyCompact(over, intlLocale)}`,
  });
}

function getCcPositionErrorMessage(
  trades: Trade[],
  leg: { ticker: string; contracts: number },
  excludeTradeId: string | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string | null {
  const ticker = leg.ticker.toUpperCase().trim();
  if (!ticker) return null;
  const available = availableCcSharesForTicker(trades, ticker, { excludeTradeId });
  const needed = leg.contracts * 100;
  if (available >= needed) return null;
  if (available <= 0) {
    return t("validation.ccNoPosition", { ticker });
  }
  return t("validation.ccInsufficientShares", {
    ticker,
    needed,
    available,
    availableContracts: Math.floor(available / 100),
  });
}

function TickerLogo({
  ticker,
  logoAlt,
}: {
  ticker: string;
  logoAlt: string;
}) {
  const urls = useMemo(
    () => LOGO_URL_BUILDERS.map((build) => build(ticker)),
    [ticker]
  );
  const [urlIndex, setUrlIndex] = useState(0);

  if (!ticker) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-500">
        ?
      </span>
    );
  }

  if (urlIndex >= urls.length) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-semibold text-blue-700">
        {ticker[0]}
      </span>
    );
  }

  return (
    <img
      src={urls[urlIndex]}
      alt={logoAlt}
      className="h-5 w-5 rounded object-cover"
      onError={() => setUrlIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}

function expiryFromDte(dte: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dte);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateTradeInput) => Promise<void>;
  tickerSuggestions?: string[];
  assignedTickers?: string[];
  assignedCycleByTicker?: Record<string, string>;
  initialValues?: Partial<CreateTradeInput>;
  title?: string;
  submitLabel?: string;
  existingTrades?: Trade[];
  editingTradeId?: string;
}

export default function AddTradeModal({
  open,
  onClose,
  onSave,
  tickerSuggestions = [],
  assignedTickers = [],
  assignedCycleByTicker = {},
  initialValues,
  title,
  submitLabel,
  existingTrades = [],
  editingTradeId,
}: AddTradeModalProps) {
  const { t } = useTranslations("trades");
  const { t: tCommon } = useTranslations("common");
  const { intlLocale } = useLocale();
  const { defaults } = useTradeDefaults();
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [commissionFees, setCommissionFees] = useState<string>("");
  const [cspError, setCspError] = useState<string | null>(null);
  const commissionEditedRef = useRef(false);

  const tradeSchema = useMemo(
    () =>
      z.object({
        ticker: z
          .string()
          .min(1, t("validation.tickerRequired"))
          .max(10, t("validation.tickerTooLong")),
        option_type: z.enum(["PUT", "CALL"]),
        strike: z.coerce
          .number({ invalid_type_error: t("validation.strikeRequired") })
          .positive(t("validation.mustBePositive")),
        expiry: z.string().min(1, t("validation.expiryRequired")),
        trade_date: z.string().min(1, t("validation.tradeDateRequired")),
        premium: z.coerce
          .number({ invalid_type_error: t("validation.premiumRequired") })
          .positive(t("validation.mustBePositive")),
        contracts: z.coerce
          .number({ invalid_type_error: t("validation.contractsRequired") })
          .int(t("validation.wholeNumber"))
          .min(1, t("validation.minContracts")),
        notes: z.string().max(500, t("validation.notesMax")).optional(),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tradeSchema as any),
    defaultValues: {
      option_type: "PUT",
      contracts: 1,
      expiry: expiryFromDte(45),
      trade_date: today(),
    },
  });
  const [isTickerFocused, setIsTickerFocused] = useState(false);

  const resolvedTitle = title ?? t("modal.addTitle");
  const resolvedSubmitLabel = submitLabel ?? t("modal.save");

  const tickerValue = (watch("ticker") ?? "").toUpperCase().trim();
  const optionTypeValue = watch("option_type");
  const premiumValue = watch("premium");
  const contractsValue = watch("contracts");
  const strikeValue = watch("strike");
  const expiryValue = watch("expiry");
  const totalReceived = (() => {
    const p = Number(premiumValue ?? 0);
    const c = Number(contractsValue ?? 0);
    if (!Number.isFinite(p) || !Number.isFinite(c)) return 0;
    return p * c * 100;
  })();

  const filteredTickerSuggestions = useMemo(() => {
    if (!tickerSuggestions.length) return [];
    return tickerSuggestions
      .filter((ticker) => ticker.toUpperCase().includes(tickerValue))
      .slice(0, 8);
  }, [tickerSuggestions, tickerValue]);

  const isEdit = initialValues != null && initialValues.ticker != null && initialValues.ticker !== "";

  const baseCapitalUsed = useMemo(
    () => computeTotalCapitalInvested(existingTrades, { excludeTradeId: editingTradeId }),
    [existingTrades, editingTradeId]
  );

  const draftCspNotional = useMemo(() => {
    if (optionTypeValue !== "PUT") return 0;
    const status = initialValues?.status ?? "OPEN";
    if (status !== "OPEN") return 0;
    const strike = Number(strikeValue);
    const contracts = Number(contractsValue) || 0;
    if (!expiryValue || expiryValue < today()) return 0;
    if (!Number.isFinite(strike) || strike <= 0 || contracts <= 0) return 0;
    return cspNotional(strike, contracts);
  }, [optionTypeValue, initialValues?.status, strikeValue, contractsValue, expiryValue]);

  useEffect(() => {
    if (!open) {
      setCspError(null);
      return;
    }
    const status = initialValues?.status ?? "OPEN";
    if (optionTypeValue === "PUT") {
      const strike = Number(strikeValue);
      const contracts = Number(contractsValue) || 1;
      if (!expiryValue || !Number.isFinite(strike) || strike <= 0) {
        setCspError(null);
        return;
      }
      setCspError(
        getCapitalBudgetErrorMessage(
          existingTrades,
          defaults.totalCapitalBudget,
          {
            optionType: "PUT",
            status,
            strike,
            contracts,
            expiry: expiryValue,
          },
          editingTradeId,
          tCommon,
          intlLocale
        )
      );
      return;
    }
    if (optionTypeValue === "CALL" && status === "OPEN") {
      const contracts = Number(contractsValue) || 1;
      if (!tickerValue) {
        setCspError(null);
        return;
      }
      setCspError(
        getCcPositionErrorMessage(
          existingTrades,
          { ticker: tickerValue, contracts },
          editingTradeId,
          t
        )
      );
      return;
    }
    setCspError(null);
  }, [
    open,
    optionTypeValue,
    existingTrades,
    defaults.totalCapitalBudget,
    editingTradeId,
    initialValues?.status,
    strikeValue,
    contractsValue,
    expiryValue,
    tickerValue,
    t,
    tCommon,
    intlLocale,
  ]);

  useEffect(() => {
    if (!open) return;
    commissionEditedRef.current = false;
    setShowOptionalFields(true);
    const contracts = initialValues?.contracts ?? defaults.defaultContracts ?? 1;
    const defaultCommission =
      initialValues?.commission_fee !== undefined && initialValues?.commission_fee !== null
        ? String(initialValues.commission_fee)
        : (() => {
            const total = commissionFeeTotal(defaults.commissionPerContract, contracts);
            return total !== undefined ? String(total) : "";
          })();
    setCommissionFees(defaultCommission);
    reset({
      option_type: initialValues?.option_type ?? "PUT",
      contracts,
      expiry: initialValues?.expiry ?? expiryFromDte(defaults.defaultDte ?? 45),
      trade_date: initialValues?.trade_date ?? today(),
      ticker: initialValues?.ticker ?? "",
      strike: initialValues?.strike,
      premium: initialValues?.premium,
      notes: initialValues?.notes ?? "",
    });
  }, [open, reset, initialValues, defaults]);

  useEffect(() => {
    if (!open || isEdit || commissionEditedRef.current) return;
    const total = commissionFeeTotal(
      defaults.commissionPerContract,
      Number(contractsValue) || 1
    );
    if (total === undefined) return;
    setCommissionFees(String(total));
  }, [open, isEdit, contractsValue, defaults.commissionPerContract]);

  const onSubmit = async (values: TradeFormValues) => {
    const status = initialValues?.status ?? "OPEN";
    const budgetErr = getCapitalBudgetErrorMessage(
      existingTrades,
      defaults.totalCapitalBudget,
      {
        optionType: values.option_type,
        status,
        strike: values.strike,
        contracts: values.contracts,
        expiry: values.expiry,
      },
      editingTradeId,
      tCommon,
      intlLocale
    );
    if (budgetErr) {
      setCspError(budgetErr);
      return;
    }

    if (values.option_type === "CALL" && status === "OPEN") {
      const ccErr = getCcPositionErrorMessage(
        existingTrades,
        { ticker: values.ticker, contracts: values.contracts },
        editingTradeId,
        t
      );
      if (ccErr) {
        setCspError(ccErr);
        return;
      }
    }

    setCspError(null);
    const commissionNumber = commissionFees.trim() ? Number(commissionFees) : undefined;
    const ticker = values.ticker.toUpperCase().trim();
    const linkedCycleId =
      values.option_type === "CALL"
        ? (assignedCycleByTicker[ticker] ?? assignedCycleIdForTicker(existingTrades, ticker))
        : undefined;
    const input: CreateTradeInput = {
      ticker,
      option_type: values.option_type,
      strike: values.strike,
      expiry: values.expiry,
      trade_date: values.trade_date,
      premium: values.premium,
      commission_fee:
        commissionNumber !== undefined && Number.isFinite(commissionNumber)
          ? commissionNumber
          : undefined,
      contracts: values.contracts,
      status: initialValues?.status ?? "OPEN",
      notes: values.notes?.trim() ?? "",
      ...(linkedCycleId ? { cycle_id: linkedCycleId } : {}),
    };
    await onSave(input);
  };

  if (!open) return null;

  const requiredMark = tCommon("actions.required");

  return (
    <TradeModalShell open={open} title={resolvedTitle} onClose={onClose} draggable labelledById="add-trade-title">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[70vh] overflow-y-auto px-6 py-5"
        noValidate
      >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="option_type"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                {t("form.strategy")} <span className="text-red-500">{requiredMark}</span>
              </label>
              <select
                id="option_type"
                {...register("option_type")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-700 focus:outline-none"
              >
                <option value="PUT">{tCommon("strategy.cspOption")}</option>
                <option value="CALL">{tCommon("strategy.ccOption")}</option>
              </select>
              {optionTypeValue === "CALL" && tickerValue && (
                assignedCycleByTicker[tickerValue] ||
                assignedTickers.includes(tickerValue) ? (
                  <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                    {t("form.ccLinkFound", { ticker: tickerValue })}
                  </p>
                ) : (
                  <p className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    {t("form.ccNoAssignment", { ticker: tickerValue })}
                  </p>
                )
              )}
              {optionTypeValue === "CALL" && !tickerValue && assignedTickers.length > 0 && (
                <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                  {t("form.ccPickAssignedTicker", { tickers: assignedTickers.join(", ") })}
                </p>
              )}
              {optionTypeValue === "CALL" &&
                (initialValues?.status ?? "OPEN") === "OPEN" &&
                cspError && (
                  <p className="mt-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                    {cspError}
                  </p>
                )}
              {optionTypeValue === "PUT" && (initialValues?.status ?? "OPEN") === "OPEN" && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-slate-600">
                    {t("form.capitalSummary", {
                      base: `$${fmtMoneyCompact(baseCapitalUsed, intlLocale)}`,
                      csp:
                        draftCspNotional > 0
                          ? ` + $${fmtMoneyCompact(draftCspNotional, intlLocale)} (this CSP) = $${fmtMoneyCompact(
                              baseCapitalUsed + draftCspNotional,
                              intlLocale
                            )}`
                          : "",
                      total: `$${fmtMoneyCompact(
                        draftCspNotional > 0
                          ? baseCapitalUsed + draftCspNotional
                          : baseCapitalUsed,
                        intlLocale
                      )}`,
                      budget: `$${fmtMoneyCompact(defaults.totalCapitalBudget, intlLocale)}`,
                      pct: String(
                        capitalUtilizationPct(
                          draftCspNotional > 0
                            ? baseCapitalUsed + draftCspNotional
                            : baseCapitalUsed,
                          defaults.totalCapitalBudget
                        ).toFixed(0)
                      ),
                    })}
                  </p>
                  {cspError && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
                      {cspError}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ticker"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("form.ticker")} <span className="text-red-500">{requiredMark}</span>
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-slate-700">
                    <TickerLogo
                      key={tickerValue}
                      ticker={tickerValue}
                      logoAlt={t("form.ticker")}
                    />
                    <input
                      id="ticker"
                      type="text"
                      placeholder={t("form.tickerPlaceholder")}
                      autoComplete="off"
                      {...register("ticker", {
                        onChange: (event) => {
                          const nextValue = String(event.target.value || "").toUpperCase();
                          if (nextValue !== event.target.value) {
                            event.target.value = nextValue;
                          }
                        },
                      })}
                      onFocus={() => setIsTickerFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setIsTickerFocused(false), 120);
                      }}
                      className="w-full bg-transparent text-sm uppercase text-slate-900 placeholder:normal-case focus:outline-none"
                    />
                  </div>
                  {isTickerFocused && filteredTickerSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <ul className="max-h-52 overflow-y-auto py-1">
                        {filteredTickerSuggestions.map((ticker) => (
                          <li key={ticker}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setValue("ticker", ticker, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                setIsTickerFocused(false);
                              }}
                            >
                              <TickerLogo key={ticker} ticker={ticker} logoAlt={ticker} />
                              <span className="font-medium">{ticker}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {errors.ticker && (
                  <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="strike"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("form.strike")} <span className="text-red-500">{requiredMark}</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-slate-700">
                  <span className="text-sm font-medium text-slate-500">$</span>
                  <input
                    id="strike"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("form.strikePlaceholder")}
                    {...register("strike")}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:normal-case focus:outline-none"
                  />
                </div>
                {errors.strike && (
                  <p className="mt-1 text-xs text-red-600">{errors.strike.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="premium"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("form.premium")} <span className="text-red-500">{requiredMark}</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-slate-700">
                  <span className="text-sm font-medium text-slate-500">$</span>
                  <input
                    id="premium"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("form.premiumPlaceholder")}
                    {...register("premium")}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:normal-case focus:outline-none"
                  />
                </div>
                {errors.premium && (
                  <p className="mt-1 text-xs text-red-600">{errors.premium.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {t("form.totalReceived", { amount: `$${totalReceived.toFixed(2)}` })}
                </p>
              </div>

              <div>
                <label
                  htmlFor="contracts"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("form.contracts")} <span className="text-red-500">{requiredMark}</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-slate-700">
                  <span className="text-sm font-medium text-slate-500">#</span>
                  <input
                    id="contracts"
                    type="number"
                    step="1"
                    min="1"
                    {...register("contracts")}
                    className="w-full bg-transparent text-sm text-slate-900 placeholder:normal-case focus:outline-none"
                  />
                </div>
                {errors.contracts && (
                  <p className="mt-1 text-xs text-red-600">{errors.contracts.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="trade_date"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("form.openDate")} <span className="text-red-500">{requiredMark}</span>
                </label>
                <input
                  id="trade_date"
                  type="date"
                  {...register("trade_date")}
                  className="date-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {errors.trade_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.trade_date.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="expiry"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  {t("form.expiration")} <span className="text-red-500">{requiredMark}</span>
                </label>
                <input
                  id="expiry"
                  type="date"
                  {...register("expiry")}
                  className="date-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {errors.expiry && (
                  <p className="mt-1 text-xs text-red-600">{errors.expiry.message}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <OptionalFieldsToggle
                open={showOptionalFields}
                onToggle={() => setShowOptionalFields((v) => !v)}
                showLabel={t("optional.show")}
                hideLabel={t("optional.hide")}
              />
            </div>

            {showOptionalFields && (
              <OptionalFieldsCard>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-800">
                  {t("optional.title")}
                </p>

                <div>
                  <label
                    htmlFor="commissionFees"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    {t("optional.commission")}
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 focus-within:border-purple-400">
                    <span className="text-sm font-medium text-slate-500">$</span>
                    <input
                      id="commissionFees"
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionFees}
                      onChange={(e) => {
                        commissionEditedRef.current = true;
                        setCommissionFees(e.target.value);
                      }}
                      placeholder={
                        defaults.commissionPerContract !== undefined
                          ? `e.g. ${commissionFeeTotal(defaults.commissionPerContract, contractsValue || 1)}`
                          : t("optional.commissionPlaceholder")
                      }
                      className="w-full bg-transparent text-sm text-slate-900 placeholder:normal-case focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="notes"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    {t("optional.notes")}
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    maxLength={500}
                    placeholder={t("optional.notesPlaceholder")}
                    {...register("notes")}
                    className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:outline-none"
                  />
                  {errors.notes && (
                    <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
                  )}
                </div>
              </OptionalFieldsCard>
            )}
          </div>

          <ModalActionButtons
            onCancel={onClose}
            submitLabel={resolvedSubmitLabel}
            submittingLabel={tCommon("actions.saving")}
            cancelLabel={tCommon("actions.cancel")}
            isSubmitting={isSubmitting}
            submitDisabled={Boolean(cspError)}
          />
      </form>
    </TradeModalShell>
  );
}
