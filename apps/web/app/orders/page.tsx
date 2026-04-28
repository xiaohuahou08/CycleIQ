"use client";

import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";

export default function OrdersPage() {
  return (
    <AuthenticatedShell title="Orders">
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-3 text-gray-600">
            Order intents and approvals will surface here when wired to the OMS.
          </p>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
