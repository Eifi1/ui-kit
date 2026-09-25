import { useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode, RefObject } from "react";
import { cn } from "../lib/cn";
import { DropdownSearchHeader } from "./dropdown";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useVisualViewport } from "../hooks/use-anchored-panel";
import { DEFAULT_PICKER_SHEET_LABELS, useKitLabels } from "../i18n/kit-labels";

/**
 * Two of the div's own attributes are omitted because this component already owns
 * the name: `title` here is the sheet's HEADING (and a ReactNode), not the browser's
 * tooltip string, and `onClose` is "the sheet was dismissed", not the DOM's
 * `<dialog>` close event. Everything else a caller can pass reaches the sheet.
 */
export interface PickerSheetProps
  extends Omit<ComponentPropsWithoutRef<"div">, "title" | "onClose"> {
  open: boolean;
  onClose: () => void;
  /** The field's own label — a sheet that fills the screen has to say what it is
   *  asking for, which the anchored panel got for free by sitting under it. */
  title?: ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Default: `pickerSheet.close` from the {@link UiKitProvider}, else "Close". */
  closeLabel?: string;
  children: ReactNode;
}

/**
 * The PHONE presentation of a picker: a full-screen dialog with a search box at
 * the top and the list filling everything below it (Keksdose live #200).
 *
 * *"Paid as full screen dialog with input. Similar to the account select that
 * already appears as full screen."* The account field is a native `<select>`, and
 * a phone browser renders that as a full-screen list — so the app's own pickers,
 * which are anchored dropdown panels, were the odd ones out: a 320px-tall panel
 * squeezed between the field and the keyboard, showing three or four rows of a
 * list that might have two hundred entries.
 *
 * What this fixes beyond size: the panel had to be *placed* (above/below, tracking
 * the visual viewport as the keyboard opened — see `useAnchoredPanel`), and every
 * one of those decisions is a chance to be wrong on a screen this small. A sheet
 * has no placement. It also gives the search input somewhere unambiguous to live,
 * which is the other half of the request: *"add filler possibility to the account
 * select or even better right to the hoc the account select is derived from"* —
 * so this lives in the shared picker, not in one form's copy of it.
 *
 * Rows are `min-h-11` (44px): the touch target the rest of the app uses. The list
 * scrolls, the header does not, and the body behind it is scroll-locked so a drag
 * that overshoots the list does not move the page underneath.
 */
export function PickerSheet({
  open,
  onClose,
  title,
  query,
  onQueryChange,
  searchPlaceholder,
  inputRef,
  closeLabel,
  children,
  "aria-label": ariaLabel,
  className,
  style,
  ...rest
}: PickerSheetProps) {
  // Every picker in the kit opens one of these on a phone, and most of them pass
  // their own `closeLabel` through as `undefined` — so this lookup is what makes the
  // one way out of a full-screen sheet speak the app's language without each of
  // them having to (see the prop's note in `EntityCombobox`).
  const labels = useKitLabels("pickerSheet", DEFAULT_PICKER_SHEET_LABELS, { close: closeLabel });
  useBodyScrollLock(open);
  /**
   * Back closes THE SHEET, not the dialog it was opened from (Keksdose live #309:
   * *"Mouse Back does not only close the select but also the whole edit or create
   * dialog which is cumbersome."*).
   *
   * The sheet is a full-screen overlay over whatever opened it, and on a phone that
   * is almost always the row editor — which DOES push a history entry
   * (`data-table.tsx`). So the sheet was invisible to Back: one press popped the
   * editor's entry and took the whole dialog with it, discarding an edit in progress
   * in order to dismiss a list.
   *
   * `useOverlayHistory` was built for exactly this nesting — its stack unwinds
   * last-in-first-out, and the U-12 regression test in its own suite is written
   * around "a Modal and a PickerSheet inside it". The sheet simply never called it.
   *
   * Nothing else has to change: the hook is a no-op while `open` is false, and it
   * pops its own entry when the sheet closes some other way (the X, a row, the
   * backdrop) so history does not accumulate husks.
   */
  useOverlayHistory(open, onClose);
  // The visible region, while the sheet is up — see the `style` below for why a
  // full-screen sheet cannot simply be `inset-0` on a phone (live #328).
  const vv = useVisualViewport(open);
  // A fallback ref so a caller that does not need the handle still gets the opening
  // focus, rather than the behaviour depending on whether a prop was passed. What that
  // focus is FOR is on the trap below.
  const ownRef = useRef<HTMLInputElement | null>(null);
  const searchRef = inputRef ?? ownRef;

  const sheetRef = useRef<HTMLDivElement>(null);
  /**
   * The sheet said `aria-modal="true"` and then left focus on the field behind it, so
   * a screen reader was told to hide the page the user's cursor was still standing in
   * (the audit's *"Only Modal manages focus"*). Through the shared hook rather than
   * the bare `.focus()` that used to live here: the hook re-reads the tabbable list on
   * every Tab, which this panel needs more than most — its list is filtered as you
   * type, so the rows a trap captured at open time are gone by the second keystroke.
   *
   * **`initialFocus` is the search box**, not the container, and this is the one place
   * in the package that overrides `Modal`'s rule. The sheet exists in order to be typed
   * into (live #212: *"make the text input filter active on select click"*), and the
   * callers cannot do it themselves — `Combobox`'s field runs
   * `setOpen(true); sheetInputRef.current?.focus()` in a single `onFocus`, so the focus
   * call happens while this sheet is still unmounted and the ref is null. Only the
   * sheet knows when its own input exists. Popping the keyboard is the POINT here,
   * where in a form dialog it is the cost.
   *
   * **`restoreFocus` is off**, which is the uncomfortable half. Every caller in this
   * kit opens the sheet from the field's own `onFocus` handler, so handing focus back
   * to that field on close re-opens the sheet the user has just dismissed — a row tap
   * would select a value and immediately put the list back over it. The field that
   * opened it is the only thing that knows whether re-focusing it means "open"; a sheet
   * that cannot tell must not guess. The cost is that focus lands on `<body>` after a
   * dismissal, which on the phone this shape is for costs nothing, and on a pointer
   * device is what happened before this change too.
   */
  useFocusTrap(sheetRef, {
    active: open,
    restoreFocus: false,
    initialFocus: () => searchRef.current,
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    // The sheet is almost always the INNERMOST overlay — it opens from a field inside a
    // `Modal` or a `FullBleedDialog`, both of which take Escape on their own panel. A
    // React portal's events still travel up the React tree, so without stopping it here
    // one press would dismiss this list and the dialog underneath with it: Keksdose
    // live #309 (*"Mouse Back does not only close the select but also the whole edit or
    // create dialog which is cumbersome"*), which the Back gesture already learned, on
    // the key a desktop user reaches for instead.
    e.stopPropagation();
    onClose();
  };

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      // Spread FIRST, and every attribute below it deliberately wins: `style`,
      // `onMouseDown` and `onKeyDown` here are not styling choices, they are live
      // #328, dev#477 and live #309 respectively, and a caller who passed one by
      // accident would re-open a bug three apps have already paid for. `style` is
      // MERGED rather than won outright (see below), which is the one case where a
      // caller has something to add.
      {...rest}
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      // Without it the container cannot take focus, and `useFocusTrap` has nothing to
      // fall back to when the list is empty and the search box is the only thing in
      // here — see the hook's "nothing tabbable" branch.
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      // The caller's own name wins over the heading: a sheet titled "Account" in a
      // form with two of them needs to say WHICH, and `title` is what the user reads
      // rather than what a reader announces.
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      // The sheet is PORTALLED to <body>, so it is not inside the field's own
      // wrapper — and `useDropdown` closes on any document mousedown landing
      // outside that wrapper. Tapping a row therefore unmounted the row (open →
      // false) before its CLICK could fire, so the tap selected nothing at all and
      // the sheet just vanished (Keksdose dev#477).
      //
      // It bit whichever sheet commits on `onClick` — the payee field's, since live
      // #200, where it hid behind the free-text value the search box was already
      // setting; and the account field's the moment dev#477 moved it onto the inline
      // picker. `ComboboxPanel`'s rows happen to commit on `onMouseDown`, so they
      // beat the document listener and were never affected — which is luck, not a
      // design, and exactly why the fix belongs to the sheet.
      //
      // Stopping the mousedown here rather than teaching every caller about the
      // portal: the sheet is modal and full-screen, so "a click in here is not an
      // outside click" is a property of the sheet, not of whoever opened it.
      onMouseDown={(e) => e.stopPropagation()}
      // ⚠️ `inset-0` was the whole of Keksdose live #328: *"When the keyboard overlays
      // the entries I cannot scroll past them … to see also the last entries. Happens
      // when browsing the account select."*
      //
      // This sheet FOCUSES ITS OWN SEARCH BOX on open (see above), so the keyboard is
      // up every single time it is used on a phone. On Android that shrinks the visual
      // viewport and leaves the LAYOUT viewport alone — `inset-0` is the layout
      // viewport — so the sheet kept its full height with its bottom third behind the
      // keyboard. The list below is `flex-1 overflow-y-auto`, so it sized itself to
      // that hidden height too: it scrolled to ITS end while the last rows were still
      // under the keys, and no gesture could bring them out. Nothing was clipped and
      // nothing looked broken, which is why it reads as "I cannot scroll past them".
      //
      // `visualViewport` is the API that answers rather than hints (the live #292
      // lesson): it reports the region actually on screen, keyboard and pinch-pan
      // included, and it fires on the keyboard opening and closing. Pinned to that box,
      // the sheet ends where the keys begin and the list's own scroll covers the rest.
      // `useVisualViewport` returns null when there is nothing to correct, and then
      // this is character-for-character the sheet that was here before.
      // A caller's `style` is kept and the correction laid OVER it: the three values
      // below are the whole of live #328, so they are not negotiable, but a z-index
      // or a transition from outside has nothing to do with them. Without a visual
      // viewport to correct for this is character-for-character what the caller passed.
      style={vv ? { ...style, top: vv.top, height: vv.height, bottom: "auto" } : style}
      className={cn("fixed inset-0 z-50 flex flex-col bg-[var(--bg-surface)] outline-none", className)}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <button
          type="button"
          aria-label={labels.close}
          onClick={onClose}
          className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
        >
          <X className="size-5" />
        </button>
      </div>
      <DropdownSearchHeader
        query={query}
        onQueryChange={onQueryChange}
        inputRef={searchRef}
        placeholder={searchPlaceholder}
      />
      {/* min-h-0 so the LIST scrolls rather than the dialog growing past the
          viewport — a flex child defaults to min-height:auto. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>,
    document.body,
  );
}

/** A row inside a {@link PickerSheet} — the phone-sized version of a dropdown row,
 *  so a list is comfortable to hit with a thumb rather than merely legible. */
export const SHEET_ROW_CLASS = cn(
  "flex min-h-11 w-full items-center gap-2 px-4 py-2 text-start text-base",
  "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
);
