"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";

const POPOVER_W = 280;
const POPOVER_GAP = 6;
const VIEWPORT_PAD = 12;

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = parseIso(iso);
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DatePickerProps {
  value?: string;
  onChange: (iso: string | undefined) => void;
  placeholder?: string;
  /** Highlight trigger when parent filter mode is active */
  emphasized?: boolean;
  "aria-label"?: string;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  emphasized = false,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseIso(value) : null;
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverW = Math.min(POPOVER_W, window.innerWidth - VIEWPORT_PAD * 2);
    const popoverH = popover?.offsetHeight ?? 320;

    let left = rect.left;
    if (left + popoverW > window.innerWidth - VIEWPORT_PAD) {
      left = window.innerWidth - VIEWPORT_PAD - popoverW;
    }
    left = Math.max(VIEWPORT_PAD, left);

    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP - VIEWPORT_PAD;
    const spaceAbove = rect.top - POPOVER_GAP - VIEWPORT_PAD;
    let top =
      spaceBelow >= popoverH || spaceBelow >= spaceAbove
        ? rect.bottom + POPOVER_GAP
        : rect.top - POPOVER_GAP - popoverH;

    top = Math.max(VIEWPORT_PAD, Math.min(top, window.innerHeight - popoverH - VIEWPORT_PAD));
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(updatePosition);
    const onReflow = () => updatePosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePosition, viewMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(viewMonth);

  const cells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const items: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startPad; i++) {
      items.push({ date: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      items.push({ date: new Date(y, m, d), key: `d-${d}` });
    }
    return items;
  }, [viewMonth]);

  const todayIso = toIso(new Date());

  const pick = (d: Date) => {
    onChange(toIso(d));
    setOpen(false);
  };

  const popover =
    open &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={popoverRef}
        className="fixed z-[200] rounded-xl border border-slate-200 bg-white p-3 shadow-lg ring-1 ring-slate-900/5"
        style={{ top: coords.top, left: coords.left, width: POPOVER_W }}
        role="dialog"
        aria-label="Choose date"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-[13px] font-semibold text-slate-900">{monthLabel}</span>
          <button
            type="button"
            onClick={() =>
              setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map(({ date, key }) => {
            if (!date) {
              return <div key={key} className="h-8" />;
            }
            const iso = toIso(date);
            const isSelected = value === iso;
            const isToday = iso === todayIso;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pick(date)}
                className={`h-8 rounded-lg text-[12px] font-medium transition ${
                  isSelected
                    ? "bg-gray-900 text-white shadow-sm"
                    : isToday
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                      : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => pick(new Date())}
            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Today
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next && selected) {
              setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
            }
            return next;
          });
        }}
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        className={`inline-flex min-w-[7.5rem] items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition ${
          emphasized || value
            ? "bg-gray-900 text-white shadow-sm"
            : "text-slate-800 hover:bg-slate-100"
        } ${open ? "ring-2 ring-emerald-500/30 ring-offset-1" : ""}`}
      >
        <Calendar
          className={`${iconSm} ${emphasized || value ? "text-emerald-300" : "text-slate-500"}`}
          strokeWidth={iconStroke}
          aria-hidden
        />
        <span className="truncate">{value ? formatDisplay(value) : placeholder}</span>
      </button>
      {popover}
    </div>
  );
}
