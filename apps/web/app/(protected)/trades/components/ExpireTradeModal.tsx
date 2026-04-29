"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trade } from "@/lib/api/trades";
import {
  ModalActionButtons,
  OptionalFieldsCard,
  OptionalFieldsToggle,
  TradeModalShell,
} from "../../components/TradeModalShared";

interface ExpireTradeModalProps {
  open: boolean;
  trade: Trade | null;
  onClose: () => void;
  onConfirm: (input: {
    expired_at: string;
    expire_type: "expired_worthless";
    commission_fee?: number;
    notes?: string;
  }) => Promise<void>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpireTradeModal({
  open,
  trade,
  onClose,
  onConfirm,
}: ExpireTradeModalProps) {
  const [actionDate, setActionDate] = useState(todayIso());
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [fees, setFees] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActionDate(todayIso());
    setShowOptionalFields(true);
    setFees("");
    setNotes("");
  }, [open, trade?.id]);

  const strategyLabel = useMemo(() => {
    if (!trade) return "";
    return trade.option_type === "PUT" ? "Cash Secured Put" : "Covered Call";
  }, [trade]);

  if (!open || !trade) return null;

  const shares = trade.contracts * 100;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const feeValue = Number(fees || 0);
      await onConfirm({
        expired_at: actionDate,
        expire_type: "expired_worthless",
        commission_fee: Number.isFinite(feeValue) && feeValue > 0 ? feeValue : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TradeModalShell
      open={open}
      title="Mark as Expired"
      onClose={onClose}
      labelledById="expire-trade-title"
    >
      <p className="px-6 pt-4 text-sm text-gray-500">
        Record that this option expired worthless and premium was kept.
      </p>
      
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Position
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold text-gray-900">{trade.ticker}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {strategyLabel}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Strike
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  ${trade.strike.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Contracts
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{trade.contracts}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Shares
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{shares}</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="expire_action_date"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Action Date
            </label>
            <input
              id="expire_action_date"
              type="date"
              value={actionDate}
              onChange={(e) => setActionDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-700 focus:outline-none"
            />
          </div>

          <div className="mt-4">
            <OptionalFieldsToggle
              open={showOptionalFields}
              onToggle={() => setShowOptionalFields((v) => !v)}
            />
          </div>

          {showOptionalFields && (
            <div className="mt-4">
              <OptionalFieldsCard>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-800">
                  Optional Details
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="expire_fees" className="text-sm font-medium text-gray-700">
                      Fees
                    </label>
                    <span className="text-sm text-gray-500">optional</span>
                  </div>
                  <input
                    id="expire_fees"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="$ 0.00"
                    className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="expire_notes" className="text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <span className="text-sm text-gray-500">optional</span>
                  </div>
                  <textarea
                    id="expire_notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add optional notes about this lifecycle event..."
                    className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </OptionalFieldsCard>
            </div>
          )}

          <ModalActionButtons
            onCancel={onClose}
            onSubmit={handleSubmit}
            submitLabel="Mark Expired"
            isSubmitting={isSubmitting}
          />
        </div>
    </TradeModalShell>
  );
}
