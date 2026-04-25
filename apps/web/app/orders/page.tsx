import Link from "next/link";

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="mt-3 text-gray-600">Order intents and approvals will surface here when wired to the OMS.</p>
        <Link href="/dashboard" className="mt-6 inline-block font-medium text-gray-900 underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
