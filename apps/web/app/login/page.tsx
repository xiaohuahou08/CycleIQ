import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
          <p className="text-gray-600">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
