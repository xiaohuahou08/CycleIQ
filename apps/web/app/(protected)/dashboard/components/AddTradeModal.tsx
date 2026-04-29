"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateTradeInput } from "@/lib/api/trades";

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
  delta: z.coerce.number().optional().or(z.literal("")),
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

  useEffect(() => {
    setUrlIndex(0);
  }, [ticker]);

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

function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 45);
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
  initialValues?: Partial<CreateTradeInput>;
  title?: string;
  submitLabel?: string;
}

export default function AddTradeModal({
  open,
  onClose,
  onSave,
  tickerSuggestions = [],
  initialValues,
  title = "Add Trade",
  submitLabel = "Save Trade",
}: AddTradeModalProps) {
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [commissionFees, setCommissionFees] = useState<string>("");

  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(
    null
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
      expiry: defaultExpiry(),
      trade_date: today(),
    },
  });
  const [isTickerFocused, setIsTickerFocused] = useState(false);

  const tickerValue = (watch("ticker") ?? "").toUpperCase().trim();
  const premiumValue = watch("premium");
  const contractsValue = watch("contracts");
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

  useEffect(() => {
    if (open) {
      setModalOffset({ x: 0, y: 0 });
      setShowOptionalFields(true);
      setCommissionFees("");
      reset({
        option_type: initialValues?.option_type ?? "PUT",
        contracts: initialValues?.contracts ?? 1,
        expiry: initialValues?.expiry ?? defaultExpiry(),
        trade_date: initialValues?.trade_date ?? today(),
        ticker: initialValues?.ticker ?? "",
        strike: initialValues?.strike,
        premium: initialValues?.premium,
        delta: initialValues?.delta,
        notes: initialValues?.notes ?? "",
      });
    }
  }, [open, reset, initialValues]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const dragStart = dragStartRef.current;
      if (!dragStart) return;
      setModalOffset({
        x: dragStart.offsetX + (event.clientX - dragStart.x),
        y: dragStart.offsetY + (event.clientY - dragStart.y),
      });
    };

    const onMouseUp = () => {
      dragStartRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  const onDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: modalOffset.x,
      offsetY: modalOffset.y,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const onSubmit = async (values: TradeFormValues) => {
    const commissionNumber = commissionFees.trim() ? Number(commissionFees) : null;

    let notesToSubmit: string | undefined = values.notes || undefined;
    if (commissionNumber !== null && Number.isFinite(commissionNumber) && commissionNumber > 0) {
      const line = `Commission Fees: $${commissionNumber.toFixed(2)}`;
      notesToSubmit = notesToSubmit ? `${notesToSubmit}\n${line}` : line;
      notesToSubmit = notesToSubmit.slice(0, 500);
    }

    const input: CreateTradeInput = {
      ticker: values.ticker.toUpperCase().trim(),
      option_type: values.option_type,
      strike: values.strike,
      expiry: values.expiry,
      trade_date: values.trade_date,
      premium: values.premium,
      contracts: values.contracts,
      status: initialValues?.status ?? "OPEN",
      delta: values.delta === "" ? undefined : (values.delta as number | undefined),
      notes: notesToSubmit,
    };
    await onSave(input);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-trade-title"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl"
        style={{
          transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)`,
        }}
      >
        <div
          className="flex cursor-grab items-center justify-between border-b border-gray-200 px-6 py-4 active:cursor-grabbing"
          onMouseDown={onDragStart}
        >
          <h2 id="add-trade-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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
                    <TickerLogo ticker={tickerValue} />
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
                              <TickerLogo ticker={ticker} />
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
                />
                {errors.expiry && (
                  <p className="mt-1 text-xs text-red-600">{errors.expiry.message}</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptionalFields((v) => !v)}
                className="w-full rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
              >
                {showOptionalFields ? "▲ Hide Optional Fields" : "▼ Show Optional Fields"}
              </button>
            </div>

            {showOptionalFields && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-800">
                  Optional Details
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="commissionFees"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Commission Fees
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 focus-within:border-purple-400">
                      <span className="text-sm font-medium text-gray-500">$</span>
                      <input
                        id="commissionFees"
                        type="number"
                        step="0.01"
                        min="0"
                        value={commissionFees}
                        onChange={(e) => setCommissionFees(e.target.value)}
                        placeholder="e.g. 0.19"
                        className="w-full bg-transparent text-sm text-gray-900 placeholder:normal-case focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="delta"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Delta on Open
                    </label>
                    <input
                      id="delta"
                      type="number"
                      step="0.01"
                      placeholder="e.g. -0.25"
                      {...register("delta")}
                      className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                    />
                    {errors.delta && (
                      <p className="mt-1 text-xs text-red-600">
                        {(errors.delta as { message?: string }).message}
                      </p>
                    )}
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
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
