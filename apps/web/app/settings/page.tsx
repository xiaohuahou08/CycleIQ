"use client";

import { AuthenticatedShell } from "@/components/auth/AuthenticatedShell";

export default function SettingsPage() {
  return (
    <AuthenticatedShell title="Settings">
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-3 text-gray-600">Account and application preferences will live here.</p>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
