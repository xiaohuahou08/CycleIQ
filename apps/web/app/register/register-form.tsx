"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
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
        const target = safeInternalRedirectPath(nextPath) ?? "/dashboard";
        router.push(target);
        router.refresh();
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Register</h1>
        <p className="mt-2 text-sm text-gray-600">
          If your project requires email confirmation, you will receive a link before you can sign in.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-700 focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-700 focus:outline-none"
              required
              minLength={8}
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-700 focus:outline-none"
              required
              minLength={8}
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
            className="font-medium text-gray-900 underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
