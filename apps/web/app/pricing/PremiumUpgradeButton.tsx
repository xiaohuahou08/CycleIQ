"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/app/components/marketing/MarketingShell";
import { createCheckoutSession } from "@/lib/api/billing";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function PremiumUpgradeButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setHasSession(Boolean(data.session));
      } catch {
        if (!cancelled) setHasSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onUpgrade = async () => {
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        router.push("/login?next=/pricing");
        return;
      }
      const { url } = await createCheckoutSession(data.session.access_token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === false) {
    return (
      <Link href="/login?next=/pricing" className={`${BTN_PRIMARY} w-full ${className}`}>
        Sign in to upgrade
      </Link>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onUpgrade}
        disabled={loading || hasSession === null}
        className={`${BTN_SECONDARY} w-full disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? "Redirecting…" : hasSession === null ? "Loading…" : "Upgrade to Premium — $1/mo"}
      </button>
      {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
