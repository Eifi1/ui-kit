import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useOutsideClick } from "../hooks/use-dismiss";

/**
 * Exported and `<div>`-shaped: the top bar composes several of these side by side, and
 * telling them apart — in a test, in a guided tour, in an accessibility tree — needs an
 * attribute the kit does not know about. A closed prop list dropped every one of them.
 *
 * `children` is omitted from the div attributes because here it is a render prop taking
 * the panel's `close`, not a `ReactNode`.
 */
export interface HoverMenuProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
  /** Extra classes for the WRAPPER (the panel has {@link panelClassName}). */
  className?: string;
  /**
   * @deprecated Use the DOM spelling `aria-label`, which now reaches the wrapper like
   * any other attribute. Kept working because keksdose, kastlan and lenkbank all pass
   * this today and a rename to save one line of resolution is not a patch release; it
   * loses to `aria-label` wherever both are given. Removal is a later minor.
   */
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

export function HoverMenu({
  trigger,
  children,
  align = "right",
  panelClassName,
  className,
  ariaLabel,
  "aria-label": ariaLabelAttr,
  ...rest
}: HoverMenuProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("closed");
  const open = phase === "open" || phase === "closing";

  // Whether the panel is open *because hover opened it*, vs. an explicit
  // click/keyboard toggle. A real mouse click on the trigger is always
  // preceded by a real mouseenter — the cursor has to land on the button
  // before it can be clicked — so once hover has opened the panel, the click
  // that inevitably follows is the same physical gesture, not a request to
  // close what was just opened (feedback #19). Toggling closed on click stays
  // for keyboard/touch activation, which reaches "open" without going through
  // the hover path.
  const openedByHoverRef = useRef(false);

  const close = useCallback(() => {
    openedByHoverRef.current = false;
    setPhase("closed");
  }, []);

  const toggle = useCallback(
    () =>
      setPhase((p) => {
        if (p === "open" || p === "closing") return openedByHoverRef.current ? p : "closed";
        openedByHoverRef.current = false;
        return "open";
      }),
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
      const id = setTimeout(() => {
        openedByHoverRef.current = true;
        setPhase("open");
      }, OPEN_DELAY_MS);
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

  useOutsideClick(wrapperRef, close, open);

  // Keep the panel inside the viewport (feedback #85): a wide panel anchored to a
  // trigger near a screen edge would otherwise spill off it (on mobile the guided-
  // tours menu ran off the left). Once open, measure and translate it horizontally
  // just enough to sit within an 8px margin. Recomputed on each open; `shiftX` is
  // subtracted first so the measurement is against the natural position.
  const panelRef = useRef<HTMLDivElement>(null);
  const [shiftX, setShiftX] = useState(0);
  useLayoutEffect(() => {
    if (!open) {
      setShiftX(0);
      return;
    }
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return; // unmeasured (e.g. jsdom) — leave as-is
    const margin = 8;
    const naturalLeft = rect.left - shiftX;
    const naturalRight = rect.right - shiftX;
    let next = 0;
    if (naturalRight > window.innerWidth - margin) next = window.innerWidth - margin - naturalRight;
    if (naturalLeft + next < margin) next = margin - naturalLeft;
    setShiftX(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only on open/close
  }, [open]);

  return (
    <div
      // `...rest` first: the hover handlers below are the whole component, and a caller
      // passing one of its own must not silently replace them.
      {...rest}
      ref={wrapperRef}
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // The DOM spelling wins; {@link HoverMenuProps.ariaLabel} is the deprecated alias
      // three apps still pass, so it stays as the fallback rather than as the answer.
      aria-label={ariaLabelAttr ?? ariaLabel}
    >
      {trigger({ open, toggle })}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "absolute top-full z-40 pt-2",
            align === "right" ? "right-0" : "left-0",
          )}
          style={shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}
        >
          <div
            role="menu"
            className={cn(
              "min-w-44 max-w-[calc(100vw-1rem)] rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg",
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
