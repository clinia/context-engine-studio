"use client";

import * as React from "react";

import { SidebarProvider, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const WIDTH_COOKIE = "sidebar_width";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
/** Pixels: the default, narrowest and widest expanded widths. */
const WIDTH = { initial: 256, min: 200, max: 480 };
/** Pointer travel before a press on the rail counts as a drag instead of a click. */
const DRAG_THRESHOLD = 4;

function clamp(value: number) {
  return Math.min(WIDTH.max, Math.max(WIDTH.min, Math.round(value)));
}

type Resize = { setWidth: (width: number) => void; setResizing: (resizing: boolean) => void };
const ResizeContext = React.createContext<Resize | null>(null);

/**
 * The sidebar provider, with an expanded width the user sets by dragging the rail.
 * - The width is clamped to 200–480px and kept in the `sidebar_width` cookie.
 * - It's read back after mount, so server and client render the same markup.
 * - The off-canvas sheet on narrow screens keeps its own width.
 */
export function ResizableSidebarProvider({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SidebarProvider>) {
  const [width, setStoredWidth] = React.useState(WIDTH.initial);
  const [resizing, setResizing] = React.useState(false);

  React.useEffect(() => {
    const stored = Number(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${WIDTH_COOKIE}=`))
        ?.split("=")[1],
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cookie is unavailable during the server render
    if (Number.isFinite(stored)) setStoredWidth(clamp(stored));
  }, []);

  const resize = React.useMemo<Resize>(
    () => ({
      setWidth: (value) => {
        const next = clamp(value);
        setStoredWidth(next);
        document.cookie = `${WIDTH_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}`;
      },
      setResizing,
    }),
    [],
  );

  return (
    <ResizeContext.Provider value={resize}>
      <SidebarProvider
        style={{ "--sidebar-width": `${width}px`, ...style } as React.CSSProperties}
        className={cn(
          // The width follows the pointer without easing while dragging.
          resizing &&
            "[&_[data-slot=sidebar-container]]:transition-none [&_[data-slot=sidebar-gap]]:transition-none",
          className,
        )}
        {...props}
      />
    </ResizeContext.Provider>
  );
}

/**
 * The sidebar rail: a click toggles the sidebar, as before, and a drag resizes it.
 * Dragging only works while the sidebar is expanded, and a drag doesn't also toggle.
 */
export function ResizableSidebarRail(props: React.ComponentProps<typeof SidebarRail>) {
  const resize = React.useContext(ResizeContext);
  const { toggleSidebar, state } = useSidebar();
  const dragged = React.useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resize || event.button !== 0 || state !== "expanded") return;
    const startX = event.clientX;
    const side = event.currentTarget.closest("[data-slot=sidebar]")?.getAttribute("data-side");
    let dragging = false;

    const onMove = (e: PointerEvent) => {
      if (!dragging && Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return;
      if (!dragging) {
        dragging = true;
        dragged.current = true;
        resize.setResizing(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }
      resize.setWidth(side === "right" ? window.innerWidth - e.clientX : e.clientX);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (dragging) {
        resize.setResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      // Cleared after the click that follows pointerup, so that click is ignored.
      setTimeout(() => (dragged.current = false), 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <SidebarRail
      {...props}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!dragged.current) toggleSidebar();
      }}
    />
  );
}
