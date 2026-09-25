import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";

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
  /**
   * Which edge of the trigger the panel lines up with. `start`/`end` follow the
   * reading direction (`end` is the right edge in LTR, the left in RTL); `left`/`right`
   * are physical and kept for existing callers. Default `end` — the same right-aligned
   * panel as before in LTR, mirrored in RTL.
   */
  align?: "start" | "end" | "left" | "right";
  panelClassName?: string;
  /** Extra classes for the WRAPPER (the panel has {@link panelClassName}). */
  className?: string;
  /**
   * @deprecated Use the DOM spelling `aria-label`, which names the `role="menu"` panel. Kept working because keksdose, kastlan and lenkbank all pass
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

const ALIGN_CLASS = { start: "start-0", end: "end-0", left: "left-0", right: "right-0" } as const;

/** Explicit menu-item roles a caller may already have written. */
const ITEM_ROLES = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';
/** What the panel promotes to `menuitem` when the caller wrote plain controls. */
const PLAIN_ITEMS = "button:not([role]),a[href]:not([role])";
/** The trigger: the first focusable in the wrapper that is not inside the panel. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Give the caller's markup menu semantics.
 *
 * `children` is arbitrary — every caller in the kit renders a `<ul>` of `<li>`s holding
 * `<button>`s and router `<Link>`s — so the panel was a `role="menu"` whose children
 * were a list, list items and plain buttons: no `menuitem` anywhere, which is a menu
 * with nothing in it as far as a screen reader is concerned. Rather than make every
 * caller rewrite its rows, the panel upgrades them after render: controls become
 * `menuitem`s out of the Tab order (the arrow keys move between them), and the list
 * markup in between becomes `role="none"` so the menu owns its items directly. An
 * element that already carries a role is the caller's decision and is left alone.
 */
function applyMenuSemantics(menu: HTMLElement): HTMLElement[] {
  for (const el of menu.querySelectorAll<HTMLElement>(PLAIN_ITEMS)) el.setAttribute("role", "menuitem");
  const items = Array.from(menu.querySelectorAll<HTMLElement>(ITEM_ROLES));
  for (const item of items) {
    item.setAttribute("tabindex", "-1");
    for (let el = item.parentElement; el && el !== menu; el = el.parentElement) {
      if (!el.hasAttribute("role")) el.setAttribute("role", "none");
    }
  }
  for (const el of menu.querySelectorAll<HTMLElement>("ul:not([role]),ol:not([role]),li:not([role])")) {
    el.setAttribute("role", "none");
  }
  return items.filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true");
}

// Only one hover menu may show its panel at a time across the app — opening
// one closes whichever was open, so adjacent top-bar menus can't overlap
// (feedback #251). Module-level is fine: there is one cursor per document.
let activeClose: (() => void) | null = null;

export function HoverMenu({
  trigger,
  children,
  align = "end",
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

  const menuRef = useRef<HTMLDivElement>(null);
  /** Set by a keyboard press on the trigger, so the open that follows moves focus into
   *  the menu. A hover or a mouse click opens it without taking focus off the page. */
  const focusOnOpenRef = useRef<"first" | "last" | null>(null);

  const triggerEl = () =>
    Array.from(wrapperRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).find(
      (el) => !menuRef.current?.contains(el),
    ) ?? null;
  const items = () => (menuRef.current ? applyMenuSemantics(menuRef.current) : []);

  // Escape closes, from anywhere — it did nothing at all before. Focus goes back to the
  // trigger only when it was inside the menu: a panel opened by hover while the user is
  // typing elsewhere must not yank the caret over here on the way out.
  useEscapeKey(() => {
    const hadFocus = wrapperRef.current?.contains(document.activeElement) ?? false;
    close();
    if (hadFocus) triggerEl()?.focus();
  }, open);

  // Upgrade the markup every render while open (the caller's rows can change), then
  // honour a pending keyboard open.
  useLayoutEffect(() => {
    if (!open) return;
    const list = items();
    const want = focusOnOpenRef.current;
    focusOnOpenRef.current = null;
    if (want) (want === "last" ? list[list.length - 1] : list[0])?.focus();
  });

  // Trigger state for assistive technology, on whatever element the caller rendered.
  // Only where the caller has not said something of its own.
  useLayoutEffect(() => {
    const el = triggerEl();
    if (!el) return;
    if (!el.hasAttribute("aria-haspopup")) el.setAttribute("aria-haspopup", "menu");
    if (el.getAttribute("aria-haspopup") === "menu") el.setAttribute("aria-expanded", String(open));
  });

  /** ↑/↓ roving focus with wrap, Home/End, Tab leaves (and closes); on the trigger,
   *  Enter/Space/↓ open onto the first item and ↑ onto the last. */
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const inMenu = menuRef.current?.contains(target) ?? false;
    if (!inMenu) {
      if (target !== triggerEl()) return;
      if (e.key === "Enter" || e.key === " ") {
        // The trigger's own click handler does the toggling; this only records that
        // the press came from a keyboard.
        if (!open) focusOnOpenRef.current = "first";
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const edge = e.key === "ArrowDown" ? "first" : "last";
        if (open) {
          const list = items();
          (edge === "last" ? list[list.length - 1] : list[0])?.focus();
        } else {
          focusOnOpenRef.current = edge;
          openedByHoverRef.current = false;
          setPhase("open");
        }
      }
      return;
    }
    if (e.key === "Tab") {
      close();
      return;
    }
    const list = items();
    if (list.length === 0) return;
    const at = list.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (e.key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % list.length;
    else if (e.key === "ArrowUp") next = at < 0 ? list.length - 1 : (at - 1 + list.length) % list.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    if (next === null) return;
    e.preventDefault();
    list[next].focus();
  };

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
      onKeyDown={(e) => {
        rest.onKeyDown?.(e);
        onKeyDown(e);
      }}
    >
      {trigger({ open, toggle })}
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "absolute top-full z-40 pt-2",
            ALIGN_CLASS[align],
          )}
          style={shiftX ? { transform: `translateX(${shiftX}px)` } : undefined}
        >
          <div
            ref={menuRef}
            role="menu"
            // On the element with the role. It used to sit on the role-less wrapper,
            // where no screen reader reads a name. The DOM spelling wins;
            // {@link HoverMenuProps.ariaLabel} is the deprecated alias three apps still
            // pass, so it stays as the fallback rather than as the answer.
            aria-label={ariaLabelAttr ?? ariaLabel}
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
