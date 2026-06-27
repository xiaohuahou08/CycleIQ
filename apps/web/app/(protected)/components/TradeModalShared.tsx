"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TradeModalShellProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Shown inside a blue circle to the left of the title (e.g. lifecycle icon). */
  headerIcon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  draggable?: boolean;
  labelledById?: string;
}

export function TradeModalShell({
  open,
  title,
  subtitle,
  headerIcon,
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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setModalOffset({ x: 0, y: 0 });
        } else {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton
        className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg"
      >
        <div style={draggable ? { transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` } : undefined}>
        <DialogHeader
          className={`border-b border-slate-200 px-6 py-4 text-left ${
            draggable ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          onMouseDown={onDragStart}
        >
          <div className="flex min-w-0 items-start gap-3 pr-8">
            {headerIcon ? (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white [&_svg]:h-5 [&_svg]:w-5"
                aria-hidden
              >
                {headerIcon}
              </div>
            ) : null}
            <div className="min-w-0">
              <DialogTitle id={labelledById} className="text-base font-semibold text-slate-900">
                {title}
              </DialogTitle>
              {subtitle ? (
                <DialogDescription className="mt-1 text-sm text-slate-500">
                  {subtitle}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        {children}
        </div>
      </DialogContent>
    </Dialog>
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
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
    >
      {open ? (
        <>
          <ChevronUp className={iconSm} strokeWidth={iconStroke} aria-hidden />
          Hide Optional Fields
        </>
      ) : (
        <>
          <ChevronDown className={iconSm} strokeWidth={iconStroke} aria-hidden />
          Show Optional Fields
        </>
      )}
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
  submitTone = "dark",
  submitDisabled = false,
}: {
  onCancel: () => void;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting: boolean;
  onSubmit?: () => void;
  submitTone?: "dark" | "blue";
  submitDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        onClick={onSubmit}
        disabled={isSubmitting || submitDisabled}
        className={
          submitTone === "blue"
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : undefined
        }
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  );
}
