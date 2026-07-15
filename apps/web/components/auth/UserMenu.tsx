"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import UserAvatar from "@/app/components/UserAvatar";
import { useTranslations } from "@/lib/i18n/locale-context";

export function UserMenu({
  email,
  displayName,
  avatarUrl,
}: {
  email: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const { t } = useTranslations("auth");
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
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          src={avatarUrl}
          displayName={displayName}
          email={email}
          size="sm"
        />
        <span className="hidden max-w-[10rem] truncate text-left text-slate-700 sm:inline">
          {email ?? t("userMenu.account")}
        </span>
        <span className="text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-slate-400" role="presentation">
            {t("userMenu.signedInAs")}
            <div className="truncate text-sm text-slate-800">{email ?? "—"}</div>
          </div>
          <div className="my-1 border-t border-slate-100" />
          <span
            className="block cursor-not-allowed px-3 py-2 text-sm text-slate-400"
            role="menuitem"
          >
            {t("userMenu.profile")}{" "}
            <span className="text-xs">({t("userMenu.profileSoon")})</span>
          </span>
          <Link
            href="/settings"
            role="menuitem"
            className="block px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            {t("userMenu.settings")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => {
              void onLogout();
            }}
          >
            {t("userMenu.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
