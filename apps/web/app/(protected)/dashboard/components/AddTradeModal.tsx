"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateTradeInput, Trade } from "@/lib/api/trades";
import {
  capitalBudgetError,
  capitalUtilizationPct,
  computeTotalCapitalInvested,
  cspNotional,
} from "@/lib/trades/cspCapital";
import {
  ModalActionButtons,
  OptionalFieldsCard,
  OptionalFieldsToggle,
  TradeModalShell,
} from "../../components/TradeModalShared";
import { commissionFeeTotal, useTradeDefaults } from "@/lib/hooks/useTradeDefaults";

const tradeSchema = z.object({
  ticker: z
    .string()
    .min(1, "Ticker is required")
    .max(10, "Ticker is too long"),
  option_type: z.enum(["PUT", "CALL"]),
  strike: z.coerce
    .number({ invalid_type_error: "Strike is required" })
    .positive("Must be positive"),
  expiry: z.string().min(1, "Expiry date is required"),
  trade_date: z.string().min(1, "Trade date is required"),
  premium: z.coerce
    .number({ invalid_type_error: "Premium is required" })
    .positive("Must be positive"),
  contracts: z.coerce
    .number({ invalid_type_error: "Contracts is required" })
    .int("Must be a whole number")
    .min(1, "Minimum 1 contract"),
  notes: z.string().max(500, "Max 500 characters").optional(),
});

type TradeFormValues = z.infer<typeof tradeSchema>;

const LOGO_URL_BUILDERS = [
  (ticker: string) =>
    `https://cdn.brandfetch.io/ticker/${encodeURIComponent(
      ticker
    )}?theme=light&c=1idEaEn5uowTmWO3jvO`,
  (ticker: string) => `https://financialmodelingprep.com/image-stock/${ticker}.png`,
  (ticker: string) => `https://eodhd.com/img/logos/US/${ticker}.png`,
];

function TickerLogo({ ticker }: { ticker: string }) {
  const urls = useMemo(
    () => LOGO_URL_BUILDERS.map((build) => build(ticker)),
    [ticker]
  );
  const [urlIndex, setUrlIndex] = useState(0);

  if (!ticker) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-[10px] font-semibold text-gray-500">
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
      alt={`${ticker} logo`}
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
  /** Tickers that have an assigned (stock-held) position — used to warn when opening a CC. */
  assignedTickers?: string[];
  /** Ticker → cycle_id map for ASSIGNED positions — used to auto-link new CC trades. */
  assignedCycleByTicker?: Record<string, string>;
  initialValues?: Partial<CreateTradeInput>;
  title?: string;
  submitLabel?: string;
  /** Used to enforce CSP capital budget before submit. */
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
  title = "Add Trade",
  submitLabel = "Save Trade",
  existingTrades = [],
  editingTradeId,
}: AddTradeModalProps) {
  const { defaults } = useTradeDefaults();
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [commissionFees, setCommissionFees] = useState<string>("");
  const [cspError, setCspError] = useState<string | null>(null);
  const commissionEditedRef = useRef(false);
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
    if (!open || optionTypeValue !== "PUT") {
      setCspError(null);
      return;
    }
    const status = initialValues?.status ?? "OPEN";
    const strike = Number(strikeValue);
    const contracts = Number(contractsValue) || 1;
    if (!expiryValue || !Number.isFinite(strike) || strike <= 0) {
      setCspError(null);
      return;
    }
    setCspError(
      capitalBudgetError(existingTrades, defaults.totalCapitalBudget, {
        optionType: "PUT",
        status,
        strike,
        contracts,
        expiry: expiryValue,
      }, editingTradeId)
    );
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

  // New trades: keep total commission in sync when contracts change (per-contract × contracts).
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
    const budgetErr = capitalBudgetError(existingTrades, defaults.totalCapitalBudget, {
      optionType: values.option_type,
      status,
      strike: values.strike,
      contracts: values.contracts,
      expiry: values.expiry,
    }, editingTradeId);
    if (budgetErr) {
      setCspError(budgetErr);
      return;
    }

    const commissionNumber = commissionFees.trim() ? Number(commissionFees) : undefined;
    const ticker = values.ticker.toUpperCase().trim();
    // For CC trades, explicitly link to the existing assigned wheel cycle if one exists.
    const linkedCycleId =
      values.option_type === "CALL" ? (assignedCycleByTicker[ticker] ?? undefined) : undefined;
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

  return (
    <TradeModalShell open={open} title={title} onClose={onClose} draggable labelledById="add-trade-title">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[70vh] overflow-y-auto px-6 py-5"
        noValidate
      >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="option_type"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Strategy <span className="text-red-500">*</span>
              </label>
              <select
                id="option_type"
                {...register("option_type")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
              >
                <option value="PUT">Cash Secured Put (CSP)</option>
                <option value="CALL">Covered Call (CC)</option>
              </select>
              {optionTypeValue === "CALL" && tickerValue && (
                assignedCycleByTicker[tickerValue] ? (
                  <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                    Will link to the existing wheel cycle for <strong>{tickerValue}</strong> (assigned position found).
                  </p>
                ) : assignedTickers.includes(tickerValue) ? null : (
                  <p className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    No assigned position found for <strong>{tickerValue}</strong>. A covered call requires owning the underlying shares (from a prior CSP assignment).
                  </p>
                )
              )}
              {optionTypeValue === "PUT" && (initialValues?.status ?? "OPEN") === "OPEN" && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-gray-600">
                    Total capital: ${baseCapitalUsed.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    {draftCspNotional > 0 && (
                      <>
                        {" "}
                        + ${draftCspNotional.toLocaleString("en-US", { maximumFractionDigits: 0 })} (this CSP)
                        {" "}
                        = ${(baseCapitalUsed + draftCspNotional).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </>
                    )}
                    {" "}
                    / ${defaults.totalCapitalBudget.toLocaleString("en-US", { maximumFractionDigits: 0 })} budget
                    {(() => {
                      const total =
                        draftCspNotional > 0
                          ? baseCapitalUsed + draftCspNotional
                          : baseCapitalUsed;
                      return ` (${capitalUtilizationPct(total, defaults.totalCapitalBudget).toFixed(0)}%)`;
                    })()}
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
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Ticker <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-gray-700">
                    <TickerLogo key={tickerValue} ticker={tickerValue} />
                    <input
                      id="ticker"
                      type="text"
                      placeholder="e.g. AAPL"
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
                      className="w-full bg-transparent text-sm uppercase text-gray-900 placeholder:normal-case focus:outline-none"
                    />
                  </div>
                  {isTickerFocused && filteredTickerSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <ul className="max-h-52 overflow-y-auto py-1">
                        {filteredTickerSuggestions.map((ticker) => (
                          <li key={ticker}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setValue("ticker", ticker, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                                setIsTickerFocused(false);
                              }}
                            >
                              <TickerLogo key={ticker} ticker={ticker} />
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
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Strike Price <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-gray-700">
                  <span className="text-sm font-medium text-gray-500">$</span>
                  <input
                    id="strike"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 350.00"
                    {...register("strike")}
                    className="w-full bg-transparent text-sm text-gray-900 placeholder:normal-case focus:outline-none"
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
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Premium per Share <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-gray-700">
                  <span className="text-sm font-medium text-gray-500">$</span>
                  <input
                    id="premium"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2.11"
                    {...register("premium")}
                    className="w-full bg-transparent text-sm text-gray-900 placeholder:normal-case focus:outline-none"
                  />
                </div>
                {errors.premium && (
                  <p className="mt-1 text-xs text-red-600">{errors.premium.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Total received: ${totalReceived.toFixed(2)}
                </p>
              </div>

              <div>
                <label
                  htmlFor="contracts"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Contracts <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-gray-700">
                  <span className="text-sm font-medium text-gray-500">#</span>
                  <input
                    id="contracts"
                    type="number"
                    step="1"
                    min="1"
                    {...register("contracts")}
                    className="w-full bg-transparent text-sm text-gray-900 placeholder:normal-case focus:outline-none"
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
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Open Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="trade_date"
                  type="date"
                  {...register("trade_date")}
                  className="date-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {errors.trade_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.trade_date.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="expiry"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="expiry"
                  type="date"
                  {...register("expiry")}
                  className="date-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              />
            </div>

            {showOptionalFields && (
              <OptionalFieldsCard>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-800">
                  Optional Details
                </p>

                <div>
                  <label
                    htmlFor="commissionFees"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Commission Fees (total)
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 focus-within:border-purple-400">
                    <span className="text-sm font-medium text-gray-500">$</span>
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
                          : "e.g. 1.30"
                      }
                      className="w-full bg-transparent text-sm text-gray-900 placeholder:normal-case focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="notes"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    maxLength={500}
                    placeholder="Any notes about this position..."
                    {...register("notes")}
                    className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
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
            submitLabel={submitLabel}
            submittingLabel="Saving…"
            isSubmitting={isSubmitting}
            submitDisabled={Boolean(cspError)}
          />
      </form>
    </TradeModalShell>
  );
}
