"use client";

import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";

export default function CyclesPage() {
  return (
    <AuthenticatedShell title="Cycles">
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Cycles</h1>
          <p className="mt-3 text-gray-600">
            Wheel cycle tracking will appear here as the product MVP grows.
          </p>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
