import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { cn } from "../lib/cn";

/**
 * Open state + close-on-outside-click for the custom dropdowns (MultiSelect,
 * CurrencySelect, AmountInput's currency picker, Combobox). Attach `wrapperRef`
 * to the relatively-positioned container; the popover lives inside it so a click
 * anywhere else closes it.
 *
 * ## Back closes the list, not the page behind it
 *
 * Keksdose live #309 rework: *"It shall only close it if it is prior open, and not
 * when I am seeing the dialog."* Round one wired {@link PickerSheet} — the shape
 * these lists take on a PHONE — into {@link useOverlayHistory}, and left the pointer
 * shape out. So on a desktop one Back press over an open list still went past it to
 * the dialog underneath: measured on his own budget, the transfer form's account list
 * was showing and Back took the entire add card, amount and all. That is the same
 * loss round one called *"discarding an edit in progress in order to dismiss a
 * list"*, in the other shell.
 *
 * Every dropdown built on this hook is dismissible and is the topmost thing on screen
 * while it is up, so the rule is the hook's rather than each caller's. `backCloses`
 * is for the ONE case where a second entry would be wrong: a caller whose panel is
 * itself a `PickerSheet`, which already registers one — both comboboxes swap shape at
 * {@link PHONE_QUERY}, and two entries would cost two Back presses to close one sheet.
 */
export function useDropdown<T extends HTMLElement = HTMLDivElement>({
  backCloses = true,
}: { backCloses?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<T>(null);
  // The panel, once it is PORTALLED (see {@link DropdownPanel}'s `anchorRef`): it is
  // then a child of <body> rather than of the wrapper, so "did the click land inside
  // the wrapper" answers no for every click on the list itself and the first option a
  // user picked closed the dropdown without picking anything.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside =
        (wrapperRef.current?.contains(target) ?? false) ||
        (panelRef.current?.contains(target) ?? false);
      if (!inside) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  // Same close path Escape and an outside click take, so a list dismissed by Back
  // cannot end up in a different state from one dismissed any other way.
  useOverlayHistory(open && backCloses, useCallback(() => setOpen(false), []));
  return { open, setOpen, wrapperRef, panelRef };
}

/**
 * {@link useDropdown} plus a search box: clears the query and focuses the search
 * input each time the panel opens, so typing filters immediately.
 */
export function useDropdownSearch<T extends HTMLElement = HTMLDivElement>() {
  const { open, setOpen, wrapperRef, panelRef } = useDropdown<T>();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the query on open
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  return { open, setOpen, wrapperRef, panelRef, query, setQuery, inputRef };
}

/** The search row (magnifier + text input) shared by the searchable dropdowns. */
export function DropdownSearchHeader({
  query,
  onQueryChange,
  inputRef,
  placeholder,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-2 py-1.5">
      <Search className="size-4 text-slate-400 dark:text-slate-500" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

/**
 * The floating popover surface for the searchable dropdowns: bordered/shadowed
 * panel, an optional `header` slot (search box, plus any actions), and a
 * scrollable `<ul>` of `children` with an "empty" row when nothing matches.
 *
 * ## Anchored, or merely absolute
 *
 * Without `anchorRef` the panel is `position: absolute` inside whatever relative box
 * the caller put it in, and the caller places it with `className` (`w-64`,
 * `right-0 top-full`). That is fine in a page that does not scroll around it, and
 * wrong the moment an ancestor has `overflow` — the panel is then CLIPPED by that
 * ancestor's box, with no error and no scrollbar, just a list with its side sliced
 * off. Keksdose dev#548 is what that looks like in practice: the app's own content
 * scroller starts 280px from the left, the amount field's currency picker opens
 * right-aligned and 256px wide, and in the transaction row editor its left third —
 * the search box's first letter, and every row's currency symbol — was cut away.
 *
 * With `anchorRef` the panel is PORTALLED to `<body>` and positioned `fixed` against
 * that trigger's rect, so no ancestor can clip it: the same treatment {@link Popover}
 * already gives the calculator, and the same reason. It re-aligns on scroll and
 * resize, flips above the trigger when the room is there instead (a phone keyboard
 * eats the bottom of the screen), and is clamped to the viewport's edges so a trigger
 * near either side cannot push it off-screen.
 *
 * Pass `panelRef` from {@link useDropdown} along with it: once portalled the panel is
 * no longer inside the wrapper, so the outside-click handler has to be told about it
 * or the first click on an option closes the list instead of choosing from it.
 */
export function DropdownPanel({
  header,
  empty,
  className,
  anchorRef,
  panelRef,
  width = 256,
  align = "right",
  children,
}: {
  header?: ReactNode;
  empty?: boolean;
  className?: string;
  /** The trigger to hang off. Given, the panel portals and goes `fixed`. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** {@link useDropdown}'s `panelRef`, so an outside-click sees this as inside. */
  panelRef?: RefObject<HTMLDivElement | null>;
  /** Panel width in px, for the anchored form (the CSS `w-*` cannot be measured). */
  width?: number;
  /** Which of the panel's edges lines up with the trigger's, room permitting. */
  align?: "left" | "right";
  children: ReactNode;
}) {
  const anchored = useAnchoredPanel(anchorRef ?? EMPTY_REF, Boolean(anchorRef));
  const body = (
    <>
      {header}
      {/* The anchored form caps its own height against the VISIBLE viewport and lets
          this list have the rest; the absolute form keeps the fixed `max-h-64` it has
          always had, applied by the wrapper below. */}
      <ul className="overflow-y-auto py-1">
        {children}
        {empty && <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">—</li>}
      </ul>
    </>
  );

  if (!anchorRef) {
    return (
      <div
        ref={panelRef}
        className={cn(
          "absolute z-30 mt-1 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900",
          "[&>ul]:max-h-64",
          className,
        )}
      >
        {body}
      </div>
    );
  }

  const rect = anchored.rect;
  if (!rect) return null;
  // Clamped exactly as `Popover` clamps: the panel may leave the trigger's edge to
  // stay on screen, because a list half off the viewport is the bug this exists for.
  const wanted = align === "right" ? rect.right - width : rect.left;
  const left = Math.min(Math.max(8, wanted), window.innerWidth - width - 8);
  return createPortal(
    <div
      ref={panelRef}
      style={{ position: "fixed", top: anchored.top, left, width, maxHeight: anchored.maxHeight }}
      className={cn(
        "z-50 flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900",
        // The list, not the panel, is what scrolls: the search header has to stay put
        // while the options move under it.
        "[&>ul]:min-h-0 [&>ul]:flex-1",
        className,
      )}
    >
      {body}
    </div>,
    document.body,
  );
}

/** A ref that is always null, for the un-anchored form — hooks may not be conditional. */
const EMPTY_REF: RefObject<HTMLElement | null> = { current: null };
