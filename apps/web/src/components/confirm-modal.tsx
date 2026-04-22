"use client";

import { useEffect } from "react";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
  confirmVariant?: "primary" | "danger" | "neutral";
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  error,
  onConfirm,
  onClose,
  children,
  confirmVariant = "primary",
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "bg-[color:var(--negative)] text-white border-transparent hover:opacity-90"
      : confirmVariant === "neutral"
      ? "bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] border-border"
      : "bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] border-border";

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        disabled={busy}
      />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-[var(--radius)] border border-border bg-[color:var(--panel)] shadow-lg">
          <div className="p-4 border-b border-border">
            <div className="text-sm font-medium">{title}</div>
            {description ? (
              <div className="mt-1 text-xs text-[color:var(--muted)]">
                {description}
              </div>
            ) : null}
          </div>
          <div className="p-4 space-y-3">
            {children}
            {error ? (
              <div className="text-xs text-[color:var(--negative)]">{error}</div>
            ) : null}
          </div>
          <div className="p-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-border bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm disabled:opacity-60"
              onClick={onClose}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded-lg border text-sm disabled:opacity-60 ${confirmClass}`}
              onClick={onConfirm}
              disabled={busy || !onConfirm}
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

