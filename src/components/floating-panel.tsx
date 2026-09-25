import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, CSSProperties, KeyboardEvent, ReactNode, Ref } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { dirOf, type Direction } from "../lib/direction";
import { useKitLabels } from "../i18n/kit-labels";

export interface FloatingPanelLabels {
  /** Accessible name of the panel header's X. */
  close: string;
}

export const DEFAULT_FLOATING_PANEL_LABELS: FloatingPanelLabels = { close: "Close" };

/** A LOGICAL corner: `bottom-end` is bottom-right in LTR and bottom-left in RTL. */
export type FloatingCorner = "bottom-end" | "bottom-start";

/**
 * How far off the bottom edge anything floating here sits: clear of `AppShell`'s phone
 * nav (`--app-nav-h`, `0px` above `md` where the nav is not rendered) and of the home
 * indicator, whichever reaches higher — the nav does not pad itself for the inset, so
 * with no nav on screen the inset is all there is to clear. `max`, not a sum: where the
 * nav does cover the inset, adding both would float the button a nav-height too high.
 */
const BOTTOM_CLEARANCE = "max(var(--app-nav-h, 0px), env(safe-area-inset-bottom, 0px))";
/** The side gutter, widened for a landscape notch. Both insets, because a logical
 *  side has no one physical inset to name. */
const SIDE_GUTTER = "max(1rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))";

function cornerStyle(corner: FloatingCorner, lift: string): CSSProperties {
  return {
    bottom: `calc(${BOTTOM_CLEARANCE} + ${lift})`,
    // Logical properties, so the corner follows the reading direction with no JS. The
    // portal carries the `dir` across (see `usePortalDir`).
    [corner === "bottom-start" ? "insetInlineStart" : "insetInlineEnd"]: SIDE_GUTTER,
  };
}

/**
 * The reading direction where the component was RENDERED, for its portalled root: a
 * portal to `<body>` leaves the subtree whose `dir` it inherited, and a logical
 * `inset-inline-end` resolves against the portal's own direction. Read off a hidden
 * inline marker in a layout effect, so the first painted frame already has it.
 */
function usePortalDir(): [Ref<HTMLSpanElement>, Direction | undefined] {
  const marker = useRef<HTMLSpanElement>(null);
  const [dir, setDir] = useState<Direction | undefined>(undefined);
  useLayoutEffect(() => {
    setDir(dirOf(marker.current));
  }, []);
  return [marker, dir];
}

export interface FloatingActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** The accessible name — the button shows only its icon. */
  label: string;
  icon: ReactNode;
  /** Default `bottom-end`. */
  corner?: FloatingCorner;
  /**
   * Distance above the nav / home indicator, as a CSS length. Default `1rem`. Raise it
   * to stack above another floating control in the same corner — keksdose's assistant
   * clears the transactions page's own action group this way (`calc(1rem + 4rem)`).
   */
  offset?: string;
  /**
   * Whether the button carries the browser's own tooltip (`title`, the `label` unless a
   * `title` is passed). Default `true`, so an icon-only button keeps a hover hint for a
   * mouse user with no other way to learn what it is. `false` renders no `title` at all:
   * keksdose has ONE tooltip, the kit's `Tooltip` (dev#523), and its source scan fails a
   * native `title=` anywhere — so a flag, not `title=""`, which the scan would still
   * see. An empty `title` renders no attribute either, for the caller who has no scan.
   *
   * Not flipped to off by default: a FAB wrapped in nothing would lose the only hover
   * hint it has, silently, in every app already on it. And the kit cannot wrap itself
   * in its `Tooltip` — the bubble's anchor is a `relative inline-flex` span, and the
   * button is `fixed` and portalled — so the one-tooltip caller wraps it.
   */
  nativeTitle?: boolean;
  /**
   * Make it a toggle. `true`/`false` set `aria-pressed` and swap the solid brand disc for
   * a surface disc — the glyph in brand on the quiet brand fill when on, the secondary
   * text colour when off — the "on" look of `IconButton`'s `pressed` and of a selected
   * Chip. Left out, it is the ordinary action FAB. For keksdose's corner filter toggles
   * (feedback-page's "awaiting only", the /transactions pending and upcoming toggles),
   * which paint `text-[var(--brand)]` on a surface button by hand. Keep `label` the same
   * in both states; `aria-pressed` already says which one it is in.
   */
  pressed?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A round, icon-only button pinned to a corner of the viewport — the trigger of a
 * {@link FloatingPanel}, and usable alone for a page's one primary action.
 *
 * keksdose hand-placed each of its floating controls: the assistant launcher at
 * `fixed bottom-36 right-4 md:bottom-6`, the feedback page's and the transactions
 * page's action groups at `right-4 bottom-20`. Every one of those numbers is a guess
 * at the phone nav's height plus whatever else floats there (Keksdose live #314 found
 * out what such a guess is worth for a footer), `right` rather than `end` puts it over
 * the page's leading edge in RTL, and none allows for the home indicator. Here the
 * base is `--app-nav-h` and the safe-area inset, the corner is logical, and
 * {@link FloatingActionButtonProps.offset} is the one number left to the caller — the
 * height of whatever else it has to clear, not the nav's.
 *
 * Portalled, because `position: fixed` inside any transformed ancestor (an animated
 * page transition) is fixed to that ancestor, not to the screen.
 */
export function FloatingActionButton({
  label,
  icon,
  corner = "bottom-end",
  offset = "1rem",
  nativeTitle = true,
  pressed,
  className,
  style,
  type = "button",
  title,
  ...rest
}: FloatingActionButtonProps) {
  const [marker, dir] = usePortalDir();
  const toggle = pressed !== undefined;
  // An empty title is "no tooltip", not an attribute with nothing in it.
  const nativeTip = nativeTitle && title !== "" ? (title ?? label) : undefined;
  return (
    <>
      <span ref={marker} hidden />
      {typeof document !== "undefined" &&
        createPortal(
          <button
            {...rest}
            type={type}
            dir={dir}
            aria-label={label}
            aria-pressed={pressed ?? rest["aria-pressed"]}
            title={nativeTip}
            style={{ ...cornerStyle(corner, offset), ...style }}
            className={cn(
              "fixed z-40 inline-flex size-12 items-center justify-center rounded-full",
              "shadow-lg transition-colors",
              !toggle && "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]",
              // A toggle sits on the page's surface — a solid brand disc would read as
              // "on" in both states — and says "on" in the brand family.
              toggle && "border border-[var(--border)]",
              pressed === false &&
                "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
              pressed === true &&
                "border-[var(--brand)] bg-[var(--brand-bg)] text-[var(--brand)] hover:bg-[var(--brand-bg-hover)]",
              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2",
              "[&_svg]:size-6",
              className,
            )}
          >
            {icon}
          </button>,
          document.body,
        )}
    </>
  );
}

export interface FloatingPanelProps {
  /** The panel's heading, and its accessible name. */
  title: ReactNode;
  /** The trigger's accessible name ("Assistant", "Send feedback"). */
  fabLabel: string;
  fabIcon: ReactNode;
  /** Controlled open state. Leave it out to let the panel own it. */
  open?: boolean;
  /** Uncontrolled initial state. Default closed. */
  defaultOpen?: boolean;
  /** Every request to open or close — the FAB, the X, Escape. */
  onOpenChange?: (open: boolean) => void;
  /** Default `bottom-end`. */
  corner?: FloatingCorner;
  /** The FAB's distance above the nav — see {@link FloatingActionButtonProps.offset}.
   *  From `md` up the card sits above the FAB, so it moves with it. */
  offset?: string;
  /** The FAB's native `title` — see {@link FloatingActionButtonProps.nativeTitle}.
   *  `false` for keksdose's assistant launcher, under its one-tooltip rule (dev#523). */
  fabNativeTitle?: boolean;
  /** Default: `floatingPanel.close` from the {@link UiKitProvider}, else "Close". */
  closeLabel?: string;
  /**
   * Where focus goes on open. Default the panel itself, so a phone's keyboard does not
   * rise over the sheet before the user has asked to type; pass the chat field for a
   * panel whose one job is typing.
   */
  initialFocus?: () => HTMLElement | null;
  /** Extra classes for the panel. */
  className?: string;
  /** Extra classes for the scrolling body. */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * A docked, NON-MODAL panel in a corner of the screen, opened by a
 * {@link FloatingActionButton} — keksdose's assistant launcher and its feedback page,
 * which each built one.
 *
 * ## Not a Modal
 *
 * The page stays usable while it is open: that is the point of an assistant beside the
 * data it is asked about. So there is no backdrop, no scroll lock, no `aria-modal` and
 * no focus trap — Tab walks out of the panel into the page and back, and a click on the
 * page does not close it. It is `role="dialog"` without `aria-modal`, which is what
 * ARIA calls a non-modal dialog, named by its heading.
 *
 * What it keeps from a dialog is the focus HANDOFF: opening moves focus into it (a
 * keyboard user who pressed the FAB should not have to hunt for what appeared), and
 * closing gives it back to the FAB — but only when focus was in the panel, so a panel
 * closed from the page (a controlled owner) never pulls focus out of the field the
 * user is typing in. Escape closes it while focus is inside, and only then: on the
 * panel element, not the document, so Escape in the page keeps meaning whatever the
 * page means by it.
 *
 * ## Layout
 *
 * From `md` up, a card above the FAB in its corner. Below `md`, a full-width sheet
 * docked to the bottom, sitting ON the `AppShell` bottom nav (`--app-nav-h`) and
 * clear of the home indicator. Pure CSS — no width is measured in JavaScript.
 *
 * The FAB carries `aria-expanded` and, while the panel exists, `aria-controls`. The
 * panel unmounts when closed; an app that must keep a draft across a close keeps it in
 * its own state, where it also survives a reload.
 */
export function FloatingPanel({
  title,
  fabLabel,
  fabIcon,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  corner = "bottom-end",
  offset = "1rem",
  fabNativeTitle,
  closeLabel,
  initialFocus,
  className,
  bodyClassName,
  children,
}: FloatingPanelProps) {
  const labels = useKitLabels(
    "floatingPanel",
    DEFAULT_FLOATING_PANEL_LABELS,
    closeLabel === undefined ? undefined : { close: closeLabel },
  );
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };

  const uid = useId();
  const panelId = `${uid}-panel`;
  const titleId = `${uid}-title`;
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [marker, dir] = usePortalDir();

  const initialFocusRef = useRef(initialFocus);
  useEffect(() => {
    initialFocusRef.current = initialFocus;
  });

  // Focus follows the open/closed TRANSITION, never the mount: a panel that renders
  // open (`defaultOpen`, a restored route) does not take the page's focus by existing.
  const wasOpen = useRef(open);
  // Whether focus was inside the panel when it last changed — read at close time, when
  // the panel (and whatever had focus in it) is already gone.
  const focusInside = useRef(false);
  useEffect(() => {
    const changed = wasOpen.current !== open;
    wasOpen.current = open;
    if (!changed) return;
    if (open) {
      (initialFocusRef.current?.() ?? panelRef.current)?.focus();
      return;
    }
    const active = document.activeElement;
    const lost = active === null || active === document.body;
    if (focusInside.current || lost) fabRef.current?.focus();
    focusInside.current = false;
  }, [open]);

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    // Stopped here, so an overlay underneath with a document-level Escape listener does
    // not close too — the innermost thing that has focus is the one that closes.
    e.stopPropagation();
    focusInside.current = true;
    setOpen(false);
  };

  return (
    <>
      <span ref={marker} hidden />
      <FloatingActionButton
        ref={fabRef}
        label={fabLabel}
        icon={fabIcon}
        corner={corner}
        offset={offset}
        nativeTitle={fabNativeTitle}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          // A press ON the FAB closing the panel: the FAB keeps focus by being clicked,
          // nothing to hand back.
          focusInside.current = false;
          setOpen(!open);
        }}
      />
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          // A container for Escape bubbling up from anything inside it, as a dialog is.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-labelledby={titleId}
            tabIndex={-1}
            dir={dir}
            data-corner={corner}
            onKeyDown={onPanelKeyDown}
            onFocus={() => {
              focusInside.current = true;
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusInside.current = false;
            }}
            // The phone's sheet sits on the nav; from `md` up the card floats above the
            // FAB (its offset + the 3rem button + a 0.75rem gap).
            style={
              {
                "--fp-bottom": `calc(${BOTTOM_CLEARANCE})`,
                "--fp-bottom-md": `calc(${BOTTOM_CLEARANCE} + ${offset} + 3.75rem)`,
                "--fp-side": SIDE_GUTTER,
              } as CSSProperties
            }
            className={cn(
              "animate-sheet fixed z-40 flex flex-col overflow-hidden outline-none",
              "border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl",
              // Phone: full width, docked, rounded only where it meets the page.
              "inset-x-0 bottom-[var(--fp-bottom)] max-h-[min(85dvh,calc(100dvh_-_var(--fp-bottom)_-_1rem))] rounded-t-xl border-x-0 border-b-0",
              "pb-[env(safe-area-inset-bottom,0px)] md:pb-0",
              // md+: a card in the corner, above the FAB.
              "md:inset-x-auto md:bottom-[var(--fp-bottom-md)] md:w-[24rem] md:max-h-[min(36rem,calc(100dvh_-_var(--fp-bottom-md)_-_1rem))] md:rounded-xl md:border",
              corner === "bottom-start" ? "md:start-[var(--fp-side)]" : "md:end-[var(--fp-side)]",
              className,
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
              <h2 id={titleId} className="min-w-0 truncate text-base font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  focusInside.current = true;
                  setOpen(false);
                }}
                aria-label={labels.close}
                className="-me-1.5 shrink-0 rounded p-1.5 text-[var(--text-muted)] outline-none hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-4", bodyClassName)}>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
