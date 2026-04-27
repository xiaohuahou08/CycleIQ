"use client";

import { useEffect } from "react";
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
}

export default function AddTradeModal({
  open,
  onClose,
  onSave,
}: AddTradeModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormValues>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      option_type: "PUT",
      contracts: 1,
      expiry: defaultExpiry(),
      trade_date: today(),
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset({
        option_type: "PUT",
        contracts: 1,
        expiry: defaultExpiry(),
        trade_date: today(),
        ticker: "",
        strike: undefined,
        premium: undefined,
        delta: undefined,
        notes: "",
      });
    }
  }, [open, reset]);

  const onSubmit = async (values: TradeFormValues) => {
    const input: CreateTradeInput = {
      ticker: values.ticker.toUpperCase().trim(),
      option_type: values.option_type,
      strike: values.strike,
      expiry: values.expiry,
      trade_date: values.trade_date,
      premium: values.premium,
      contracts: values.contracts,
      status: "OPEN",
      delta: values.delta === "" ? undefined : (values.delta as number | undefined),
      notes: values.notes || undefined,
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="add-trade-title" className="text-base font-semibold text-gray-900">
            Add Trade
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

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-h-[70vh] overflow-y-auto px-6 py-5"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Ticker */}
            <div>
              <label
                htmlFor="ticker"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Ticker <span className="text-red-500">*</span>
              </label>
              <input
                id="ticker"
                type="text"
                placeholder="e.g. AAPL"
                {...register("ticker")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase text-gray-900 placeholder:normal-case focus:border-gray-700 focus:outline-none"
              />
              {errors.ticker && (
                <p className="mt-1 text-xs text-red-600">{errors.ticker.message}</p>
              )}
            </div>

            {/* Option Type */}
            <div>
              <label
                htmlFor="option_type"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Option Type <span className="text-red-500">*</span>
              </label>
              <select
                id="option_type"
                {...register("option_type")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
              >
                <option value="PUT">PUT (CSP)</option>
                <option value="CALL">CALL (CC)</option>
              </select>
            </div>

            {/* Strike */}
            <div>
              <label
                htmlFor="strike"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Strike <span className="text-red-500">*</span>
              </label>
              <input
                id="strike"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 350.00"
                {...register("strike")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
              />
              {errors.strike && (
                <p className="mt-1 text-xs text-red-600">{errors.strike.message}</p>
              )}
            </div>

            {/* Premium */}
            <div>
              <label
                htmlFor="premium"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Premium (per share) <span className="text-red-500">*</span>
              </label>
              <input
                id="premium"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 2.11"
                {...register("premium")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
              />
              {errors.premium && (
                <p className="mt-1 text-xs text-red-600">{errors.premium.message}</p>
              )}
            </div>

            {/* Expiry */}
            <div>
              <label
                htmlFor="expiry"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Expiry Date <span className="text-red-500">*</span>
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

            {/* Trade Date */}
            <div>
              <label
                htmlFor="trade_date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Trade Date <span className="text-red-500">*</span>
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

            {/* Contracts */}
            <div>
              <label
                htmlFor="contracts"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Contracts <span className="text-red-500">*</span>
              </label>
              <input
                id="contracts"
                type="number"
                step="1"
                min="1"
                {...register("contracts")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
              />
              {errors.contracts && (
                <p className="mt-1 text-xs text-red-600">{errors.contracts.message}</p>
              )}
            </div>

            {/* Delta */}
            <div>
              <label
                htmlFor="delta"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Delta
              </label>
              <input
                id="delta"
                type="number"
                step="0.01"
                placeholder="e.g. -0.25"
                {...register("delta")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
              />
              {errors.delta && (
                <p className="mt-1 text-xs text-red-600">
                  {(errors.delta as { message?: string }).message}
                </p>
              )}
            </div>
          </div>

          {/* Notes (full width) */}
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
              placeholder="Optional notes (max 500 chars)"
              {...register("notes")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
            />
            {errors.notes && (
              <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer actions */}
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
              {isSubmitting ? "Saving…" : "Save Trade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
