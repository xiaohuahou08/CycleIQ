"use client";

import { useEffect, useState } from "react";
import { useProtectedAuth } from "../auth-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTradeDefaults } from "@/lib/hooks/useTradeDefaults";

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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
    <div className="flex items-start justify-between gap-8 py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-gray-100">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === "success"
          ? "bg-emerald-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

// ─── Account section ──────────────────────────────────────────────────────────
function AccountSection({ email }: { email: string | null }) {
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setSending(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      showToast("Password reset email sent. Check your inbox.", "success");
    } catch {
      showToast("Failed to send reset email. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <Section
        title="Account"
        description="Your account information and authentication settings."
      >
        <FieldRow label="Email address" hint="Your Supabase Auth email.">
          <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
            {email ?? "—"}
          </span>
        </FieldRow>
        <FieldRow
          label="Password"
          hint="Send a reset link to your email to change your password."
        >
          <button
            type="button"
            onClick={() => void handlePasswordReset()}
            disabled={sending || !email}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send reset email"}
          </button>
        </FieldRow>
      </Section>
    </>
  );
}

// ─── Trading defaults section ─────────────────────────────────────────────────
function TradingDefaultsSection() {
  const { defaults, setDefaults } = useTradeDefaults();
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    setCommissionPerContract(
      defaults.commissionPerContract !== undefined
        ? String(defaults.commissionPerContract)
        : ""
    );
    setDefaultContracts(String(defaults.defaultContracts ?? 1));
    setDefaultDte(String(defaults.defaultDte ?? 45));
  }, [defaults]);

  const handleSave = () => {
    setDefaults({
      commissionPerContract:
        commissionPerContract.trim() !== ""
          ? Number(commissionPerContract)
          : undefined,
      defaultContracts:
        defaultContracts.trim() !== "" ? Number(defaultContracts) : 1,
      defaultDte: defaultDte.trim() !== "" ? Number(defaultDte) : 45,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Section
      title="Trading Defaults"
      description="Pre-fill values when adding new trades. These are saved locally in your browser."
    >
      <FieldRow
        label="Commission per contract"
        hint="Auto-fills total opening commission when adding a trade (per-contract rate × contracts). Leave blank to skip."
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={commissionPerContract}
            onChange={(e) => setCommissionPerContract(e.target.value)}
            placeholder="0.65"
            className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-gray-400">/ contract</span>
        </div>
      </FieldRow>

      <FieldRow
        label="Default contracts"
        hint="Number of contracts pre-filled when opening a new trade."
      >
        <input
          type="number"
          min="1"
          step="1"
          value={defaultContracts}
          onChange={(e) => setDefaultContracts(e.target.value)}
          className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </FieldRow>

      <FieldRow
        label="Default DTE (days to expiry)"
        hint="The expiry date pre-filled when opening a new trade."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="1"
            value={defaultDte}
            onChange={(e) => setDefaultDte(e.target.value)}
            className="w-20 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-xs text-gray-400">days</span>
        </div>
      </FieldRow>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Save defaults
        </button>
        {saved && (
          <span className="text-sm text-emerald-600">Saved locally.</span>
        )}
      </div>
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { email, onLogout } = useProtectedAuth();

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <AccountSection email={email} />
        <TradingDefaultsSection />

        <div className="flex flex-col items-center gap-4 pt-2 pb-4">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700"
          >
            Sign out
          </button>
          <p className="text-xs text-gray-400">CycleIQ · v0.1</p>
        </div>
      </div>
    </main>
  );
}
