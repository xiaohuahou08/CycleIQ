import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

interface TradeModalShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  draggable?: boolean;
  labelledById?: string;
}

export function TradeModalShell({
  open,
  title,
  onClose,
  children,
  draggable = false,
  labelledById = "trade-modal-title",
}: TradeModalShellProps) {
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setModalOffset({ x: 0, y: 0 });
    }
  }, [open]);

  useEffect(() => {
    if (!draggable) return;
    const onMouseMove = (event: MouseEvent) => {
      const dragStart = dragStartRef.current;
      if (!dragStart) return;
      setModalOffset({
        x: dragStart.offsetX + (event.clientX - dragStart.x),
        y: dragStart.offsetY + (event.clientY - dragStart.y),
      });
    };

    const onMouseUp = () => {
      dragStartRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [draggable]);

  const onDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0) return;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: modalOffset.x,
      offsetY: modalOffset.y,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl"
        style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
      >
        <div
          className={`flex items-center justify-between border-b border-gray-200 px-6 py-4 ${
            draggable ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          onMouseDown={onDragStart}
        >
          <h2 id={labelledById} className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function OptionalFieldsToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
    >
      {open ? "▲ Hide Optional Fields" : "▼ Show Optional Fields"}
    </button>
  );
}

export function OptionalFieldsCard({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">{children}</div>;
}

export function ModalActionButtons({
  onCancel,
  submitLabel,
  submittingLabel = "Saving...",
  isSubmitting,
  onSubmit,
}: {
  onCancel: () => void;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting: boolean;
  onSubmit?: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit}
        disabled={isSubmitting}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
