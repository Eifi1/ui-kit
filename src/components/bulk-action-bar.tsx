import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { useKitLabels } from "../i18n/kit-labels";
import { useAnnounce } from "../hooks/use-announce";
import { OVERLAY_EXIT_MS, prefersReducedMotion } from "../hooks/use-close-transition";
import { Button, IconButton } from "./ui";

export interface BulkActionBarLabels {
  /** The count, shown in the bar, spoken by its live region and used as the toolbar's
   *  name: "3 selected". */
  selected: (count: number) => string;
  /** The clear/cancel action's name — the X of the floating bar, the text button of the
   *  others. */
  clear: string;
  /** Spoken when the selection empties and the bar goes. */
  cleared: string;
}

export const DEFAULT_BULK_ACTION_BAR_LABELS: BulkActionBarLabels = {
  selected: (count) => `${count} selected`,
  clear: "Clear selection",
  cleared: "Selection cleared",
};

/**
 * `floating` — the phone's: fixed above `AppShell`'s bottom nav (`--app-nav-h`) and the
 * home indicator, inset from both sides, a rounded card with a shadow. `sticky` — the
 * desktop's: pinned to the top of its scroll container, over the rows it acts on.
 * `inline` — in the flow, where the caller places it.
 */
export type BulkActionBarVariant = "floating" | "sticky" | "inline";

export interface BulkActionBarProps extends Omit<ComponentPropsWithoutRef<"div">, "role" | "children"> {
  /** How many items are selected. The bar shows only while this is above zero. */
  count: number;
  /** Clear the selection / leave selection mode. */
  onClear: () => void;
  /** The actions: buttons (`IconButton size="lg"` on a phone, `Button` from md up),
   *  in the caller's order. They are the toolbar's arrow-key stops, after the clear. */
  children?: ReactNode;
  /** Default `floating`. See {@link BulkActionBarVariant}. */
  variant?: BulkActionBarVariant;
  /** Default: `bulkActionBar` from the {@link UiKitProvider}, else English. */
  labels?: Partial<BulkActionBarLabels>;
}

/** Where the floating bar sits: clear of the phone nav and of the home indicator,
 *  whichever reaches higher — `FloatingPanel`'s rule, plus the bar's own 0.5rem gap. */
const FLOATING_STYLE: CSSProperties = {
  bottom: "calc(max(var(--app-nav-h, 0px), env(safe-area-inset-bottom, 0px)) + 0.5rem)",
  // Both insets on both sides: a logical side has no one physical inset to name, and
  // the bar is symmetric, so RTL needs nothing more.
  insetInline: "max(0.5rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))",
};

/** What the arrow keys walk: the toolbar's enabled controls. Matched by element, not by
 *  `tabindex`, because the roving below sets every one but the current to `-1` — a
 *  custom control joins with `data-toolbar-item`. */
const ITEMS =
  "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[data-toolbar-item]";

/** Keys a text field needs for itself — the toolbar must not take its caret away. */
function ownsArrows(el: Element): boolean {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !["button", "checkbox", "radio", "submit", "reset"].includes(el.type);
  return (el as HTMLElement).isContentEditable;
}

/**
 * The bar that appears while rows are selected: the count, a way out, and what can be
 * done to all of them at once.
 *
 * keksdose had written it three times — the transactions phone bar
 * (mobile-bulk-bar.tsx), the invoice lines' phone and desktop bars
 * (invoice-lines-bulk-bar.tsx) and the payees selection bar — and the copies had
 * drifted where it matters: two parked themselves with a guessed `bottom-16` that the
 * third had already found leaves a 24px gap (live #314: the nav is content-sized and
 * `AppShell` publishes its height as `--app-nav-h`), none of them announced the count,
 * and all three were `role="toolbar"` without the arrow keys that role promises.
 *
 * ## Keep it mounted
 *
 * Render it unconditionally and let `count` decide. At zero it renders only its live
 * region — which must already be in the DOM for the first "3 selected" to be heard —
 * and when the count drops to zero it plays its exit before it goes, which a
 * `{count > 0 && <Bar/>}` gate would cut off.
 *
 * ## The toolbar
 *
 * One Tab stop: ←/→ (mirrored in RTL), Home and End move between the controls, and Tab
 * leaves — the WAI-ARIA toolbar pattern, since that is what `role="toolbar"` tells a
 * screen reader to expect. The stop remembers the control last used. Arrow keys inside
 * a text field stay the field's.
 *
 * It is NOT a dialog: no focus trap, no scroll lock — the list behind stays live,
 * because tapping more rows is how a selection grows.
 */
export function BulkActionBar({
  count,
  onClear,
  children,
  variant = "floating",
  labels: labelsProp,
  className,
  style,
  onKeyDown,
  onFocus,
  ...rest
}: BulkActionBarProps) {
  const labels = useKitLabels("bulkActionBar", DEFAULT_BULK_ACTION_BAR_LABELS, labelsProp);
  const { announce, regionProps } = useAnnounce();
  const barRef = useRef<HTMLDivElement>(null);
  const shown = count > 0;

  // The count the bar last SHOWED, so a bar lowering itself after "clear" still reads
  // "3 selected" on its way out rather than "0 selected". Adjusted during render
  // (`Collapse`'s pattern), as is the exit below.
  const [shownCount, setShownCount] = useState(count);
  const [leaving, setLeaving] = useState(false);
  const [prevCount, setPrevCount] = useState(count);
  if (count !== prevCount) {
    setPrevCount(count);
    if (shown) {
      setShownCount(count);
      setLeaving(false);
    } else {
      setLeaving(prevCount > 0 && !prefersReducedMotion());
    }
  }
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(false), OVERLAY_EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  // Spoken on every CHANGE, not on mount: a bar mounted with rows already selected
  // was not the result of anything the user just did.
  const spoken = useRef(count);
  useEffect(() => {
    if (spoken.current === count) return;
    spoken.current = count;
    announce(count > 0 ? labels.selected(count) : labels.cleared);
  }, [count, labels, announce]);

  // Roving tab stop. The controls are the caller's, so the stop is kept on the DOM
  // rather than through props: after every render the remembered control (or the
  // first) is the one with `tabindex=0`, every other one `-1`.
  const active = useRef<HTMLElement | null>(null);
  // Every render: the caller's controls come and go (a "remove added" that exists
  // only while some are removable), and a stop on a control that left must move on.
  useLayoutEffect(() => {
    rove(barRef.current, active);
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || ownsArrows(e.target as Element)) return;
    const list = itemsOf(barRef.current);
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (at === -1 || list.length === 0) return;
    const step = horizontalStep(e.key, barRef.current);
    let next = -1;
    if (step !== 0) next = (at + step + list.length) % list.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = list.length - 1;
    if (next === -1) return;
    e.preventDefault();
    active.current = list[next];
    rove(barRef.current, active);
    list[next].focus();
  };

  if (!shown && !leaving) {
    return <span {...regionProps} />;
  }

  const floating = variant === "floating";
  const clear = floating ? (
    <IconButton size="lg" onClick={onClear} aria-label={labels.clear}>
      <X />
    </IconButton>
  ) : (
    <Button type="button" variant="secondary" size="sm" onClick={onClear}>
      {labels.clear}
    </Button>
  );

  return (
    <>
      <span {...regionProps} />
      <div
        {...rest}
        ref={barRef}
        role="toolbar"
        aria-label={labels.selected(shownCount)}
        aria-orientation="horizontal"
        data-bulk-action-bar={variant}
        // Leaving: out of the tab order and the accessibility tree at once, while the
        // bar still animates. The selection it acted on is already gone.
        inert={!shown || undefined}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          onFocus?.(e);
          // Clicking a control is using it: the stop follows the pointer too.
          const hit = itemsOf(barRef.current).find((el) => el === e.target);
          if (hit) {
            active.current = hit;
            rove(barRef.current, active);
          }
        }}
        style={floating ? { ...FLOATING_STYLE, ...style } : style}
        className={cn(
          "flex items-center",
          floating
            ? cn(
                "fixed z-30 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 shadow-lg",
                shown ? "animate-sheet" : "animate-sheet-out",
              )
            : cn(
                "gap-2 px-3 py-2",
                variant === "sticky" &&
                  "sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--brand)_8%,var(--bg-surface))] backdrop-blur",
                shown ? "animate-overlay" : "animate-overlay-out",
              ),
          className,
        )}
      >
        {floating && clear}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {labels.selected(shownCount)}
        </span>
        {/* `contents`, so the caller's controls are flex items of the bar itself. */}
        <div className="contents">{children}</div>
        {!floating && clear}
      </div>
    </>
  );
}

function itemsOf(bar: HTMLElement | null): HTMLElement[] {
  return bar ? Array.from(bar.querySelectorAll<HTMLElement>(ITEMS)) : [];
}

/** Put the one Tab stop on the remembered control — or the first, when that one has
 *  gone or was never set — and take it off every other. */
function rove(bar: HTMLElement | null, active: { current: HTMLElement | null }): void {
  const list = itemsOf(bar);
  if (!active.current || !list.includes(active.current)) active.current = list[0] ?? null;
  for (const el of list) el.tabIndex = el === active.current ? 0 : -1;
}
