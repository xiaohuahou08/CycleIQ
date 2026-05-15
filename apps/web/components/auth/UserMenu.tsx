"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onLogout = async () => {
    setOpen(false);
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initial = email?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm shadow-sm hover:bg-gray-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-800">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-left text-gray-700 sm:inline">
          {email ?? "Account"}
        </span>
        <span className="text-gray-400" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-gray-400" role="presentation">
            Signed in as
            <div className="truncate text-sm text-gray-800">{email ?? "—"}</div>
          </div>
          <div className="my-1 border-t border-gray-100" />
          <span
            className="block cursor-not-allowed px-3 py-2 text-sm text-gray-400"
            role="menuitem"
          >
            Profile <span className="text-xs">(soon)</span>
          </span>
          <Link
            href="/settings"
            role="menuitem"
            className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
            onClick={() => {
              void onLogout();
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
