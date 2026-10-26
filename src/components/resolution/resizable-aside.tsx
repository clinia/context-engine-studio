"use client";

import { useTranslations } from "next-intl";
import * as React from "react";

/** `md:w-120`, the width the resolution panels open at. */
const DEFAULT_WIDTH = 480;
const MIN_WIDTH = 320;
/** Share of the container the aside may take, so the list beside it stays usable. */
const MAX_SHARE = 0.75;
const KEY_STEP = 32;
const WIDTH_STORAGE_ITEM = "resolution.asideWidth";

function readStoredWidth(): number | null {
  try {
    const value = Number(window.localStorage.getItem(WIDTH_STORAGE_ITEM));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storeWidth(width: number): void {
  try {
    window.localStorage.setItem(WIDTH_STORAGE_ITEM, String(Math.round(width)));
  } catch {
    // Unavailable storage only costs the width on reload.
  }
}

/**
 * The detail panel on the right of a resolution lane, resizable from its left edge.
 *
 * - From `md` up: drag or arrow keys resize, double-click resets, and the width is kept
 *   in this browser and shared by both lanes.
 * - Below `md`: covers the lane at full width, with no handle.
 */
export function ResizableAside({ children }: { children: React.ReactNode }) {
  const t = useTranslations("resolution");
  const ref = React.useRef<HTMLElement>(null);
  const [width, setWidth] = React.useState(DEFAULT_WIDTH);
  const widthRef = React.useRef(width);

  React.useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const clamp = React.useCallback((value: number) => {
    const container = ref.current?.parentElement?.clientWidth ?? Number.POSITIVE_INFINITY;
    return Math.round(Math.max(MIN_WIDTH, Math.min(value, container * MAX_SHARE)));
  }, []);

  React.useEffect(() => {
    const stored = readStoredWidth();
    if (stored) setWidth(clamp(stored));
  }, [clamp]);

  const commit = (value: number) => {
    const next = clamp(value);
    setWidth(next);
    storeWidth(next);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = widthRef.current;
    handle.setPointerCapture(event.pointerId);

    const onMove = (move: PointerEvent) => setWidth(clamp(startWidth + startX - move.clientX));
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      storeWidth(widthRef.current);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") commit(width + KEY_STEP);
    else if (event.key === "ArrowRight") commit(width - KEY_STEP);
    else return;
    event.preventDefault();
  };

  return (
    <aside
      ref={ref}
      style={{ "--aside-width": `${width}px` } as React.CSSProperties}
      className="absolute inset-y-0 right-0 z-20 w-full border-l border-border bg-background md:relative md:z-auto md:w-(--aside-width) md:shrink-0"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("resizePanel")}
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onDoubleClick={() => commit(DEFAULT_WIDTH)}
        className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors hover:after:bg-primary focus-visible:after:bg-primary md:block"
      />
      {children}
    </aside>
  );
}
