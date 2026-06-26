"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import AuthShell, {
  AUTH_INPUT_CLS,
  AUTH_LABEL_CLS,
  AUTH_PRIMARY_BTN_CLS,
} from "@/app/components/AuthShell";
import GoogleSignInButton from "@/app/components/GoogleSignInButton";
import { getSupabaseClient } from "@/lib/supabase/client";
import { safeInternalRedirectPath } from "@/lib/auth-redirect.mjs";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const nextPath = searchParams.get("next");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValidEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
      const {
        data: { session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (session) {
        router.refresh();

        const target = safeInternalRedirectPath(nextPath) ?? "/dashboard";

        await new Promise((resolve) => setTimeout(resolve, 100));

        router.push(target);
        return;
      }

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      const login = new URL("/login", window.location.origin);
      login.searchParams.set("registered", "1");
      if (nextPath) login.searchParams.set("next", nextPath);
      router.replace(`${login.pathname}?${login.searchParams.toString()}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unexpected error while registering.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="If your project requires email confirmation, you will receive a link before you can sign in."
      footer={
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 transition hover:decoration-slate-500"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <GoogleSignInButton
          label="Sign up with Google"
          nextPath={nextPath}
          onError={setError}
        />

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-slate-200" />
          </div>
          <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Or with email
          </p>
        </div>

        <div>
          <label htmlFor="email" className={AUTH_LABEL_CLS}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={AUTH_INPUT_CLS}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className={AUTH_LABEL_CLS}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={AUTH_INPUT_CLS}
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className={AUTH_LABEL_CLS}>
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={AUTH_INPUT_CLS}
            required
            minLength={8}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200/80 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <p className="text-xs leading-relaxed text-slate-500">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="font-medium text-slate-700 underline-offset-2 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-slate-700 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <button type="submit" disabled={isSubmitting} className={AUTH_PRIMARY_BTN_CLS}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
