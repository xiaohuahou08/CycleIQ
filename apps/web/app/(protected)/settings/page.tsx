"use client";

import { useEffect, useRef, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import {
  createCheckoutSession,
  createPortalSession,
  fetchBillingStatus,
  syncBillingAfterCheckout,
  type BillingStatus,
} from "@/lib/api/billing";
import {
  createCapitalFlow,
  deleteCapitalFlow,
  formatFlowAmount,
  getCapitalFlows,
  updateCapitalFlow,
  type CapitalFlow,
} from "@/lib/api/capitalFlows";
import { resetTradingData } from "@/lib/api/account";
import { useProtectedAuth } from "../auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/auth-url";
import { getUserDisplayName } from "@/lib/auth/user-profile";
import PageHeader from "@/app/components/PageHeader";
import DataSyncBanner from "@/app/components/DataSyncBanner";
import { useToast } from "@/app/components/Toast";
import { CARD_BASE } from "@/app/components/ui/styles";
import { Button } from "@/components/ui/button";
import { useTradeDefaults, TRADE_DEFAULTS_UPDATED_EVENT } from "@/lib/hooks/useTradeDefaults";
import { useLocale, useTranslations } from "@/lib/i18n/locale-context";

// ─── Section shell ────────────────────────────────────────────────────────────
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${CARD_BASE} overflow-hidden rounded-xl py-0`}>
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-slate-100">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Billing section ──────────────────────────────────────────────────────────
function BillingSection() {
  const { token, isAuthLoading } = useProtectedAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const syncedRef = useRef(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t } = useTranslations("settings");
  const { t: tToast } = useTranslations("toast");
  const { t: tCommon } = useTranslations("common");
  const { intlLocale } = useLocale();

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchBillingStatus(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("billing.error.load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth to settle before deciding whether we can load billing.
    if (isAuthLoading) return;
    let active = true;
    void (async () => {
      if (!token) {
        if (active) {
          setError(t("billing.error.signIn"));
          setLoading(false);
        }
        return;
      }
      try {
        const next = await fetchBillingStatus(token);
        if (active) setStatus(next);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t("billing.error.load"));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, isAuthLoading]);

  useEffect(() => {
    if (searchParams.get("billing") !== "success" || !token) return;
    // Guard against React Strict Mode / re-render double-runs.
    if (syncedRef.current) return;
    syncedRef.current = true;
    const sessionId = searchParams.get("session_id");
    void (async () => {
      try {
        setStatus(await syncBillingAfterCheckout(token, sessionId));
        showToast(tToast("billing.premiumActivated"), "success");
      } catch {
        showToast(tToast("billing.syncing"), "warning");
        await load();
      } finally {
        // Strip billing/session_id from the URL so a refresh won't re-sync.
        router.replace("/settings");
      }
    })();
  }, [searchParams, token, router, showToast]);

  const onUpgrade = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("billing.error.checkout"));
      setBusy(false);
    }
  };

  const onManage = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createPortalSession(token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("billing.error.portal"));
      setBusy(false);
    }
  };

  const isPremium = status?.plan === "premium";

  return (
    <Section title={t("billing.title")} description={t("billing.description")}>
        {loading ? (
          <DataSyncBanner active compact />
        ) : (
          <>
            <FieldRow label={t("billing.currentPlan")}>
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800">
                {status?.plan_label ?? t("billing.planBasic")}
                {status?.price_usd != null ? ` · $${status.price_usd}/mo` : ""}
              </span>
            </FieldRow>
            {status?.subscription_status ? (
              <FieldRow label={t("billing.subscription")} hint={t("billing.subscriptionHint")}>
                <span className="text-sm text-slate-700 capitalize">
                  {status.subscription_status.replace(/_/g, " ")}
                  {status.current_period_end
                    ? ` ${t("billing.renews", {
                        date: new Date(status.current_period_end).toLocaleDateString(intlLocale),
                      })}`
                    : ""}
                </span>
              </FieldRow>
            ) : null}
            {status?.trades_limit != null ? (
              <FieldRow
                label={t("billing.tradeUsage")}
                hint={t("billing.tradeUsageHint", {
                  used: status.trades_this_month,
                  limit: status.trades_limit,
                })}
              >
                <span className="text-sm text-slate-700">
                  {t("billing.remaining", { count: status.trades_remaining ?? 0 })}
                </span>
              </FieldRow>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {isPremium && status?.can_manage_billing ? (
                <button
                  type="button"
                  onClick={() => void onManage()}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy ? tCommon("actions.opening") : t("billing.manage")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onUpgrade()}
                  disabled={busy}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? tCommon("actions.redirecting") : t("billing.upgrade")}
                </button>
              )}
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </>
        )}
      </Section>
  );
}

// ─── Account section ──────────────────────────────────────────────────────────
function AccountSection({
  email: emailProp,
  displayName: displayNameProp,
}: {
  email: string | null;
  displayName: string | null;
}) {
  const [email, setEmail] = useState(emailProp);
  const [displayName, setDisplayName] = useState(displayNameProp);
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslations("settings");
  const { t: tToast } = useTranslations("toast");
  const { t: tCommon } = useTranslations("common");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(emailProp);
     
    setDisplayName(displayNameProp);
  }, [emailProp, displayNameProp]);

  useEffect(() => {
    void getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) return;
        setEmail(data.user.email ?? null);
        setDisplayName(getUserDisplayName(data.user));
      });
  }, []);

  const handlePasswordReset = async () => {
    if (!email) return;
    setSending(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Recovery links carry a PKCE `code`; route through /auth/callback so the
        // session is exchanged before landing back on /settings.
        redirectTo: authCallbackUrl("/settings"),
      });
      if (error) throw error;
      showToast(tToast("account.resetSent"), "success");
    } catch {
      showToast(tToast("account.resetFailed"), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Section title={t("account.title")} description={t("account.description")}>
        <FieldRow label={t("account.displayName")} hint={t("account.displayNameHint")}>
          <span className="inline-flex max-w-[14rem] items-center truncate rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            {displayName ?? "—"}
          </span>
        </FieldRow>
        <FieldRow label={t("account.email")} hint={t("account.emailHint")}>
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
            {email ?? "—"}
          </span>
        </FieldRow>
        <FieldRow label={t("account.password")} hint={t("account.passwordHint")}>
          <button
            type="button"
            onClick={() => void handlePasswordReset()}
            disabled={sending || !email}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? t("account.sending") : t("account.sendReset")}
          </button>
        </FieldRow>
      </Section>
  );
}

// ─── Trading defaults section ─────────────────────────────────────────────────
function TradingDefaultsSection({ hasCapitalFlows }: { hasCapitalFlows: boolean }) {
  const { defaults, setDefaults, loading, saving } = useTradeDefaults();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t } = useTranslations("settings");
  const { t: tCommon } = useTranslations("common");

  const [commissionPerContract, setCommissionPerContract] = useState(
    defaults.commissionPerContract !== undefined
      ? String(defaults.commissionPerContract)
      : ""
  );
  const [defaultContracts, setDefaultContracts] = useState(
    String(defaults.defaultContracts ?? 1)
  );
  const [defaultDte, setDefaultDte] = useState(
    String(defaults.defaultDte ?? 45)
  );
  const [totalCapitalBudget, setTotalCapitalBudget] = useState(
    String(defaults.totalCapitalBudget ?? 10000)
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommissionPerContract(
      defaults.commissionPerContract !== undefined
        ? String(defaults.commissionPerContract)
        : ""
    );
     
    setDefaultContracts(String(defaults.defaultContracts ?? 1));
     
    setDefaultDte(String(defaults.defaultDte ?? 45));
     
    setTotalCapitalBudget(String(defaults.totalCapitalBudget ?? 10000));
  }, [defaults]);

  const handleSave = async () => {
    setSaveError(null);
    try {
      await setDefaults({
        commissionPerContract:
          commissionPerContract.trim() !== ""
            ? Number(commissionPerContract)
            : undefined,
        defaultContracts:
          defaultContracts.trim() !== "" ? Number(defaultContracts) : 1,
        defaultDte: defaultDte.trim() !== "" ? Number(defaultDte) : 45,
        totalCapitalBudget:
          totalCapitalBudget.trim() !== "" ? Number(totalCapitalBudget) : 10000,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("defaults.error");
      setSaveError(message);
    }
  };

  return (
    <Section title={t("defaults.title")} description={t("defaults.description")}>
      <FieldRow label={t("defaults.commission")} hint={t("defaults.commissionHint")}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={commissionPerContract}
            onChange={(e) => setCommissionPerContract(e.target.value)}
            placeholder="0.65"
            className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-slate-400">{t("defaults.perContract")}</span>
        </div>
      </FieldRow>

      <FieldRow label={t("defaults.contracts")} hint={t("defaults.contractsHint")}>
        <input
          type="number"
          min="1"
          step="1"
          value={defaultContracts}
          onChange={(e) => setDefaultContracts(e.target.value)}
          className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </FieldRow>

      <FieldRow
        label={t("defaults.budget")}
        hint={
          hasCapitalFlows ? t("defaults.budgetLockedHint") : t("defaults.budgetHint")
        }
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">$</span>
          {hasCapitalFlows ? (
            <span className="inline-flex w-28 items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-800">
              {Number(totalCapitalBudget).toLocaleString()}
            </span>
          ) : (
            <input
              type="number"
              min="1"
              step="100"
              value={totalCapitalBudget}
              onChange={(e) => setTotalCapitalBudget(e.target.value)}
              className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          )}
        </div>
      </FieldRow>

      <FieldRow label={t("defaults.dte")} hint={t("defaults.dteHint")}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={defaultDte}
            onChange={(e) => setDefaultDte(e.target.value)}
            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-slate-400">{t("defaults.days")}</span>
        </div>
      </FieldRow>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || saving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? tCommon("actions.saving") : t("defaults.save")}
        </button>
        {loading ? <DataSyncBanner active compact /> : null}
        {saved && !saveError && (
          <span className="text-sm text-emerald-600">{t("defaults.saved")}</span>
        )}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </Section>
  );
}

function localTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string, intlLocale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Capital management ───────────────────────────────────────────────────────
function CapitalFlowModal({
  type,
  open,
  onClose,
  onSubmit,
  submitting,
  initial,
}: {
  type: "deposit" | "withdrawal";
  open: boolean;
  onClose: () => void;
  onSubmit: (amount: number, eventDate: string) => Promise<void>;
  submitting: boolean;
  initial?: CapitalFlow;
}) {
  const { t } = useTranslations("settings");
  const { t: tCommon } = useTranslations("common");
  const [amount, setAmount] = useState("");
  const [eventDate, setEventDate] = useState(localTodayIsoDate());
  const [error, setError] = useState<string | null>(null);
  const isEdit = initial != null;

  useEffect(() => {
    if (open) {
      if (initial) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAmount(String(Math.abs(initial.amount)));
         
        setEventDate(initial.event_date);
      } else {
         
        setAmount("");
         
        setEventDate(localTodayIsoDate());
      }
       
      setError(null);
    }
  }, [open, type, initial]);

  if (!open) return null;

  const title = isEdit
    ? t("capital.modal.edit")
    : type === "deposit"
      ? t("capital.modal.deposit")
      : t("capital.modal.withdrawal");
  const label =
    type === "deposit" ? t("capital.modal.depositAmount") : t("capital.modal.withdrawalAmount");

  const handleSubmit = async () => {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t("capital.error.amount"));
      return;
    }
    if (!eventDate) {
      setError(t("capital.error.date"));
      return;
    }
    try {
      await onSubmit(parsed, eventDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("capital.error.save"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("capital.modal.body")}</p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">{label}</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-slate-500">$</span>
              <input
                type="number"
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">{tCommon("columns.date")}</label>
            <input
              type="date"
              value={eventDate}
              max={localTodayIsoDate()}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {tCommon("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              type === "deposit"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {submitting ? tCommon("actions.saving") : tCommon("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function CapitalManagementSection({
  onFlowsChange,
}: {
  onFlowsChange: (hasFlows: boolean) => void;
}) {
  const { token } = useProtectedAuth();
  const { defaults, loading: defaultsLoading } = useTradeDefaults();
  const { t } = useTranslations("settings");
  const { t: tCommon } = useTranslations("common");
  const { intlLocale } = useLocale();
  const [flows, setFlows] = useState<CapitalFlow[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<"deposit" | "withdrawal" | null>(null);
  const [editingFlow, setEditingFlow] = useState<CapitalFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshFlows = async () => {
    if (!token) {
      setFlows([]);
      onFlowsChange(false);
      setLoadingFlows(false);
      return;
    }
    setLoadingFlows(true);
    try {
      const data = await getCapitalFlows(token);
      setFlows(data);
      onFlowsChange(data.length > 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("capital.error.load"));
    } finally {
      setLoadingFlows(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFlows();
  }, [token]);

  const handleSubmitFlow = async (amount: number, eventDate: string) => {
    if (!token || (!modal && !editingFlow)) return;
    setSubmitting(true);
    try {
      const flowType = editingFlow?.type ?? modal!;
      if (editingFlow) {
        await updateCapitalFlow(token, editingFlow.id, {
          type: flowType,
          amount,
          event_date: eventDate,
        });
      } else {
        await createCapitalFlow(token, { type: modal!, amount, event_date: eventDate });
      }
      window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
      await refreshFlows();
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (flow: CapitalFlow) => {
    setEditingFlow(flow);
    setModal(flow.type);
  };

  const closeModal = () => {
    setModal(null);
    setEditingFlow(null);
  };

  const handleDelete = async (flow: CapitalFlow) => {
    if (!token) return;
    const typeLabel = flow.type === "deposit" ? t("capital.type.deposit") : t("capital.type.withdrawal");
    if (
      !window.confirm(
        t("capital.confirmDelete", {
          type: typeLabel,
          date: formatDisplayDate(flow.event_date, intlLocale),
        })
      )
    ) {
      return;
    }
    setDeletingId(flow.id);
    try {
      await deleteCapitalFlow(token, flow.id);
      window.dispatchEvent(new Event(TRADE_DEFAULTS_UPDATED_EVENT));
      await refreshFlows();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("capital.error.delete"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <CapitalFlowModal
        type={modal ?? "deposit"}
        open={modal !== null}
        onClose={closeModal}
        onSubmit={handleSubmitFlow}
        submitting={submitting}
        initial={editingFlow ?? undefined}
      />
      <Section title={t("capital.title")} description={t("capital.description")}>
        <FieldRow label={t("capital.currentBudget")} hint={t("capital.currentBudgetHint")}>
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800">
            {defaultsLoading ? "…" : formatFlowAmount(defaults.totalCapitalBudget)}
          </span>
        </FieldRow>

        <div className="flex flex-wrap gap-3 py-3">
          <button
            type="button"
            onClick={() => setModal("deposit")}
            disabled={!token}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownCircle className={iconSm} strokeWidth={iconStroke} aria-hidden />
            {t("capital.deposit")}
          </button>
          <button
            type="button"
            onClick={() => setModal("withdrawal")}
            disabled={!token}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUpCircle className={iconSm} strokeWidth={iconStroke} aria-hidden />
            {t("capital.withdraw")}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">{tCommon("columns.date")}</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">{tCommon("columns.type")}</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">{tCommon("columns.amount")}</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">
                  <span className="sr-only">{tCommon("a11y.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loadingFlows ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6">
                    <div className="flex justify-center">
                      <DataSyncBanner active compact />
                    </div>
                  </td>
                </tr>
              ) : flows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    {t("capital.empty")}
                  </td>
                </tr>
              ) : (
                flows.map((flow) => (
                  <tr key={flow.id}>
                    <td className="px-4 py-2.5 text-slate-900">
                      {formatDisplayDate(flow.event_date, intlLocale)}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-slate-700">
                      {t(`capital.type.${flow.type}`)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-medium ${
                        flow.type === "deposit" ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {flow.type === "deposit" ? "+" : "−"}
                      {formatFlowAmount(flow.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(flow)}
                          className="inline-flex items-center rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={tCommon("a11y.editEntry")}
                        >
                          <Pencil className="h-4 w-4" strokeWidth={iconStroke} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(flow)}
                          disabled={deletingId === flow.id}
                          className="inline-flex items-center rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                          aria-label={tCommon("a11y.deleteEntry")}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={iconStroke} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────
function DangerZoneSection() {
  const router = useRouter();
  const { token } = useProtectedAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t } = useTranslations("settings");
  const { t: tToast } = useTranslations("toast");
  const { t: tCommon } = useTranslations("common");

  const handleReset = async () => {
    if (!token) return;
    setResetting(true);
    setError(null);
    try {
      const result = await resetTradingData(token);
      setConfirmOpen(false);
      showToast(
        tToast("danger.resetSuccess", {
          trades: result.trades_deleted,
          cycles: result.cycles_deleted,
        }),
        "success"
      );
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("danger.error"));
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <Section title={t("danger.title")} description={t("danger.description")}>
        <FieldRow label={t("danger.reset.label")} hint={t("danger.reset.hint")}>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirmOpen(true);
            }}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
          >
            {t("danger.reset.button")}
          </button>
        </FieldRow>
      </Section>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-data-title"
        >
          <div className="animate-scale-in w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="reset-data-title" className="text-base font-semibold text-slate-900">
              {t("danger.confirm.title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("danger.confirm.body")}</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={resetting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {tCommon("actions.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={resetting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {resetting ? tCommon("actions.deleting") : t("danger.confirm.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { email, displayName, onLogout } = useProtectedAuth();
  const [hasCapitalFlows, setHasCapitalFlows] = useState(false);
  const { t: tCommon } = useTranslations("common");

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Suspense fallback={null}>
          <BillingSection />
        </Suspense>
        <AccountSection email={email} displayName={displayName} />
        <TradingDefaultsSection hasCapitalFlows={hasCapitalFlows} />
        <CapitalManagementSection onFlowsChange={setHasCapitalFlows} />
        <DangerZoneSection />

        <div className="flex flex-col items-center gap-4 pt-2 pb-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onLogout()}
            className="px-6"
          >
            {tCommon("actions.signOut")}
          </Button>
          <p className="text-xs text-slate-400">{tCommon("version")}</p>
        </div>
      </div>
    </main>
  );
}
