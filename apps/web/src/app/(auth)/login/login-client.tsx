"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setStatus(null);
    if (!supabase) {
      setStatus("Supabase is not configured. Set env vars in .env.local.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const next = searchParams.get("next") || "/dashboard";
      window.location.assign(next);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp() {
    setStatus(null);
    if (!supabase) {
      setStatus("Supabase is not configured. Set env vars in .env.local.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      const confirmed = Boolean(data.user?.email_confirmed_at);
      setStatus(
        confirmed
          ? "Account created. You can sign in now."
          : "Account created. Check your email to confirm, then sign in."
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[var(--radius)] border border-border bg-[color:var(--panel)]">
        <div className="p-5 border-b border-border">
          <div className="text-sm text-[color:var(--muted)]">Auth</div>
          <h1 className="text-lg font-semibold">Login</h1>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <div className="text-xs text-[color:var(--muted)]">Email</div>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <div className="text-xs text-[color:var(--muted)]">Password</div>
            <input
              className="mt-1 h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] px-3 text-sm outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            className="h-10 w-full rounded-lg border border-border bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-sm disabled:opacity-60"
            onClick={() => void onLogin()}
            disabled={busy}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            className="h-10 w-full rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
            onClick={() => void onSignUp()}
            disabled={busy}
          >
            {busy ? "Working…" : "Create account"}
          </button>

          {status ? (
            <div className="text-xs text-[color:var(--muted)]">{status}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

