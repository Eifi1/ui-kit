import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface HoverMenuProps {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
  ariaLabel?: string;
}

// Hovering waits briefly before opening so sweeping the cursor across a row of
// triggers doesn't flash menus; closing waits so the cursor can travel from
// trigger to panel. Click/keyboard toggling is instant (no "opening" phase).
const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 120;

type Phase = "closed" | "opening" | "open" | "closing";

// Only one hover menu may show its panel at a time across the app — opening
// one closes whichever was open, so adjacent top-bar menus can't overlap
// (feedback #251). Module-level is fine: there is one cursor per document.
let activeClose: (() => void) | null = null;

export function HoverMenu({ trigger, children, align = "right", panelClassName, ariaLabel }: HoverMenuProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const open = phase === "open" || phase === "closing";

  const close = useCallback(() => setPhase("closed"), []);

  const toggle = useCallback(
    () => setPhase((p) => (p === "open" || p === "closing" ? "closed" : "open")),
    [],
  );

  const handleMouseEnter = useCallback(
    () => setPhase((p) => (p === "closing" ? "open" : p === "closed" ? "opening" : p)),
    [],
  );

  const handleMouseLeave = useCallback(
    () => setPhase((p) => (p === "opening" ? "closed" : p === "open" ? "closing" : p)),
    [],
  );

  // Drive the delayed transitions; unmount/phase changes cancel the timer.
  useEffect(() => {
    if (phase === "opening") {
      const id = setTimeout(() => setPhase("open"), OPEN_DELAY_MS);
      return () => clearTimeout(id);
    }
    if (phase === "closing") {
      const id = setTimeout(() => setPhase("closed"), CLOSE_DELAY_MS);
      return () => clearTimeout(id);
    }
  }, [phase]);

  // Claim the "active menu" slot while our panel is visible, closing the
  // previous holder. Cleanup releases the slot only if we still hold it
  // (a successor that displaced us has already overwritten it).
  useEffect(() => {
    if (!open) return;
    if (activeClose !== close) activeClose?.();
    activeClose = close;
    return () => {
      if (activeClose === close) activeClose = null;
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={ariaLabel}
    >
      {trigger({ open, toggle })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-40 pt-2",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div
            role="menu"
            className={cn(
              "min-w-44 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900",
              panelClassName,
            )}
          >
            {children(close)}
          </div>
        </div>
      )}
    </div>
  );
}
