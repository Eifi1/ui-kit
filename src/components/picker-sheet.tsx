import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { cn } from "../lib/cn";
import { DropdownSearchHeader } from "./dropdown";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { useVisualViewport } from "../hooks/use-anchored-panel";

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
  closeLabel = "Close",
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** The field's own label — a sheet that fills the screen has to say what it is
   *  asking for, which the anchored panel got for free by sitting under it. */
  title?: ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  closeLabel?: string;
  children: ReactNode;
}) {
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
  // The sheet focuses its OWN search box when it opens (Keksdose live #212: *"make
  // the text input filter active on select click"*).
  //
  // The callers tried: `Combobox`'s field does `setOpen(true); sheetInputRef.current
  // ?.focus()` in one `onFocus`, so the focus call runs while the sheet is still
  // unmounted and the ref is null — and the chevron's `onMouseDown` preventDefaults
  // to keep focus on the field, so opening that way never even attempted it. Neither
  // is fixable from outside: only the sheet knows when its input exists.
  //
  // A fallback ref means a caller that does not need the handle still gets the
  // focus, rather than the behaviour depending on whether a prop was passed.
  const ownRef = useRef<HTMLInputElement | null>(null);
  const searchRef = inputRef ?? ownRef;
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open, searchRef]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
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
      style={vv ? { top: vv.top, height: vv.height, bottom: "auto" } : undefined}
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </span>
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
  "flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left text-base",
  "text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800",
);
