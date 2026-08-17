"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { iconSm, iconStroke } from "@/app/components/icons";

type Transform = { scale: number; tx: number; ty: number };

type PanZoomStageProps = {
  /** Intrinsic width of the content in px. */
  width: number;
  /** Intrinsic height of the content in px. */
  height: number;
  className?: string;
  minScale?: number;
  maxScale?: number;
  /**
   * Floor for the initial / reset fit. Lets a large diagram open at a
   * readable size (pan to see the rest) while wheel-zoom can still go
   * down to minScale to show everything.
   */
  fitMinScale?: number;
  labels?: { zoomIn: string; zoomOut: string; reset: string };
  children: ReactNode;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Wraps arbitrary sized content in a fixed viewport that can be panned by
 * dragging and zoomed with the mouse wheel (zoom is anchored at the cursor).
 */
export default function PanZoomStage({
  width,
  height,
  className,
  minScale = 0.25,
  maxScale = 5,
  fitMinScale,
  labels,
  children,
}: PanZoomStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ px: number; py: number; tx: number; ty: number } | null>(null);

  const fitToViewport = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    if (vw === 0 || vh === 0) return;
    const natural = Math.min(vw / width, vh / height);
    const scale = clamp(Math.max(natural, fitMinScale ?? 0), minScale, maxScale);
    setT({
      scale,
      tx: (vw - width * scale) / 2,
      ty: (vh - height * scale) / 2,
    });
  }, [width, height, minScale, maxScale, fitMinScale]);

  // Fit on mount and whenever the content size changes (e.g. switching wheels).
  useLayoutEffect(() => {
    fitToViewport();
  }, [fitToViewport]);

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      setT((prev) => {
        const next = clamp(prev.scale * factor, minScale, maxScale);
        const k = next / prev.scale;
        return {
          scale: next,
          tx: px - (px - prev.tx) * k,
          ty: py - (py - prev.ty) * k,
        };
      });
    },
    [minScale, maxScale]
  );

  // Native non-passive wheel listener so we can preventDefault page scroll.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only start panning on primary button / touch / pen.
    if (e.button !== 0) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      tx: t.tx,
      ty: t.ty,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setT((prev) => ({ ...prev, tx: start.tx + (px - start.px), ty: start.ty + (py - start.py) }));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const zoomButton = (factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2);
  };

  const btnCls =
    "flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900";

  return (
    <div
      ref={viewportRef}
      className={`relative w-full overflow-hidden ${className ?? ""}`}
      style={{
        height: Math.max(460, Math.min(height, 760)),
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          transformOrigin: "0 0",
          transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`,
        }}
      >
        {children}
      </div>

      <div
        className="absolute right-3 top-3 z-10 flex flex-col gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button type="button" className={btnCls} onClick={() => zoomButton(1.2)} title={labels?.zoomIn} aria-label={labels?.zoomIn}>
          <Plus className={iconSm} strokeWidth={iconStroke} aria-hidden />
        </button>
        <button type="button" className={btnCls} onClick={() => zoomButton(1 / 1.2)} title={labels?.zoomOut} aria-label={labels?.zoomOut}>
          <Minus className={iconSm} strokeWidth={iconStroke} aria-hidden />
        </button>
        <button type="button" className={btnCls} onClick={fitToViewport} title={labels?.reset} aria-label={labels?.reset}>
          <Maximize2 className={iconSm} strokeWidth={iconStroke} aria-hidden />
        </button>
      </div>
    </div>
  );
}
