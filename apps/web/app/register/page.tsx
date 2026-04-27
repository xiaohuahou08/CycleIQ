import { Suspense } from "react";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
          <p className="text-gray-600">Loading…</p>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
