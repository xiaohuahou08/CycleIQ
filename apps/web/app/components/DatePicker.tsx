"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = value ? parseIso(value) : null;
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (selected) setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        className={`inline-flex min-w-[7.5rem] items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition ${
          emphasized || value
            ? "bg-gray-900 text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-50"
        } ${open ? "ring-2 ring-emerald-500/30 ring-offset-1" : ""}`}
      >
        <Calendar
          className={`${iconSm} ${emphasized || value ? "text-emerald-300" : "text-gray-400"}`}
          strokeWidth={iconStroke}
          aria-hidden
        />
        <span className="truncate">{value ? formatDisplay(value) : placeholder}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 w-[17.5rem] rounded-xl border border-slate-200 bg-white p-3 shadow-lg ring-1 ring-slate-900/5"
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
        </div>
      )}
    </div>
  );
}
