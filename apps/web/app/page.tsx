import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">CycleIQ</h1>
        <p className="mt-3 text-gray-600">
          Track your wheel strategy lifecycle with a focused, data-driven workflow.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-800"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-800 hover:bg-gray-100"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
