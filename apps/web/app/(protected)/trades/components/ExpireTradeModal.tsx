"use client";

import { useEffect, useMemo, useState } from "react";
import type { Trade } from "@/lib/api/trades";
import { useTranslations } from "@/lib/i18n/locale-context";
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
  const { t } = useTranslations("trades");
  const { t: tCommon } = useTranslations("common");
  const [actionDate, setActionDate] = useState(todayIso());
  const [showOptionalFields, setShowOptionalFields] = useState(true);
  const [fees, setFees] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActionDate(todayIso());
    setShowOptionalFields(true);
    setFees("");
    setNotes("");
  }, [open, trade?.id]);

  const strategyLabel = useMemo(() => {
    if (!trade) return "";
    return trade.option_type === "PUT"
      ? tCommon("strategy.cspFull")
      : tCommon("strategy.ccFull");
  }, [trade, tCommon]);

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
      title={t("expire.title")}
      onClose={onClose}
      labelledById="expire-trade-title"
    >
      <p className="px-6 pt-4 text-sm text-slate-500">{t("expire.intro")}</p>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("assign.position")}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-semibold text-slate-900">{trade.ticker}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {strategyLabel}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tCommon("columns.strike")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  ${trade.strike.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("form.contracts")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{trade.contracts}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t("assign.shares")}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{shares}</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="expire_action_date"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {t("assign.actionDate")}
            </label>
            <input
              id="expire_action_date"
              type="date"
              value={actionDate}
              onChange={(e) => setActionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-700 focus:outline-none"
            />
          </div>

          <div className="mt-4">
            <OptionalFieldsToggle
              open={showOptionalFields}
              onToggle={() => setShowOptionalFields((v) => !v)}
              showLabel={t("optional.show")}
              hideLabel={t("optional.hide")}
            />
          </div>

          {showOptionalFields && (
            <div className="mt-4">
              <OptionalFieldsCard>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-800">
                  {t("optional.title")}
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="expire_fees" className="text-sm font-medium text-slate-700">
                      {t("roll.fees")}
                    </label>
                    <span className="text-sm text-slate-500">{tCommon("actions.optional")}</span>
                  </div>
                  <input
                    id="expire_fees"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="$ 0.00"
                    className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="expire_notes" className="text-sm font-medium text-slate-700">
                      {t("optional.notes")}
                    </label>
                    <span className="text-sm text-slate-500">{tCommon("actions.optional")}</span>
                  </div>
                  <textarea
                    id="expire_notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("assign.notesPlaceholder")}
                    className="mt-2 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </OptionalFieldsCard>
            </div>
          )}

          <ModalActionButtons
            onCancel={onClose}
            onSubmit={handleSubmit}
            submitLabel={t("expire.submit")}
            cancelLabel={tCommon("actions.cancel")}
            isSubmitting={isSubmitting}
          />
        </div>
    </TradeModalShell>
  );
}
