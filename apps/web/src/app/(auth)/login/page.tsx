import { Suspense } from "react";
import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="text-sm text-[color:var(--muted)]">Loading…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

