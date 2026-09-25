import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { cn } from "../lib/cn";
import { useAnchorDir } from "./use-anchor-dir";

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
 *
 * ## One outside-click rule for the whole package
 *
 * This hand-rolled a second document listener, on `mousedown`, months after
 * {@link useOutsideClick} — the hook the entity pickers dismiss through — was moved to
 * `pointerdown` for a reason that applies here word for word: on a touch platform
 * `mousedown` is SYNTHESISED, the browser emits it for most taps but is not obliged
 * to, and MultiSelect, CurrencySelect, GroupedPicker, AmountInput's currency picker
 * and both comboboxes all dismiss through this. Two copies of one rule is one copy
 * too many; this now delegates, so the package has a single answer to "what is an
 * outside press".
 *
 * `panelIsSheet` is what that delegation needs. A {@link PickerSheet} is modal and
 * fills the screen, so it has no outside — and being portalled to `<body>`, it is
 * inside neither `wrapperRef` nor `panelRef`, so a listener left running would read
 * every tap in it as a press outside and close it at finger-down. The sheet's own
 * `onMouseDown` stopPropagation guard used to hide that from this hook; it cannot
 * stop a `pointerdown`. It defaults to `!backCloses` because the two ask the same
 * question — "is this caller's panel a sheet?" — and the one caller that answers yes
 * already says so; they are separate props so a future caller can answer them apart.
 *
 * ## Escape, and where focus lands after it
 *
 * This hook had no Escape at all (the audit's §a11y): Back closed these lists, an
 * outside press closed them, and the one key every other dismissible surface in the
 * package answers to did nothing — so a keyboard user who opened a list had no way
 * out of it that did not also choose something. {@link useEscapeKey} is the listener
 * `Modal`, `Popover` and `useComboboxCore` already dismiss through, so the package
 * keeps one answer to "what does Escape do" rather than growing a fifth.
 *
 * Escape RESTORES FOCUS; an outside press does not. A press has already put focus
 * where the user pointed, and dragging it back from there would be the bug. Attach
 * `triggerRef` to the control that opens the panel and the keyboard paths — Escape,
 * Tab, a commit — hand focus back to it; leave it unattached and they simply close,
 * which is what the callers written before this get.
 */
export function useDropdown<T extends HTMLElement = HTMLDivElement>({
  backCloses = true,
  panelIsSheet = !backCloses,
}: { backCloses?: boolean; panelIsSheet?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<T>(null);
  // The control that opens the panel — see the note above on why only the keyboard
  // paths read it, and why attaching it is the caller's choice.
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The panel, once it is PORTALLED (see {@link DropdownPanel}'s `anchorRef`): it is
  // then a child of <body> rather than of the wrapper, so "did the click land inside
  // the wrapper" answers no for every click on the list itself and the first option a
  // user picked closed the dropdown without picking anything.
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  // Closing unmounts whatever held focus — the search box, the row the keyboard was
  // on — and the browser then drops focus on <body>: the caret vanishes and the next
  // Tab restarts at the top of the document. Whoever closed the list with a key gets
  // it handed back to the trigger they opened it from.
  const closeToTrigger = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useOutsideClick([wrapperRef, panelRef], close, open && !panelIsSheet);
  useEscapeKey(closeToTrigger, open);
  // Same close path Escape and an outside click take, so a list dismissed by Back
  // cannot end up in a different state from one dismissed any other way.
  useOverlayHistory(open && backCloses, close);
  return { open, setOpen, wrapperRef, panelRef, triggerRef, closeToTrigger };
}

/**
 * {@link useDropdown} plus a search box: clears the query and focuses the search
 * input each time the panel opens, so typing filters immediately.
 */
export function useDropdownSearch<T extends HTMLElement = HTMLDivElement>() {
  const { open, setOpen, wrapperRef, panelRef, triggerRef, closeToTrigger } =
    useDropdown<T>();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the query on open
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  return {
    open,
    setOpen,
    wrapperRef,
    panelRef,
    triggerRef,
    closeToTrigger,
    query,
    setQuery,
    inputRef,
  };
}

/** `onKeyDown` is the INPUT's, not the wrapper's — the list's keyboard is handled
 *  where the focus is (see the note above), so the div's own handler signature is
 *  omitted in favour of it. */
export interface DropdownSearchHeaderProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onKeyDown"> {
  query: string;
  onQueryChange: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  /** The `<ul role="listbox">` this box filters. */
  listboxId?: string;
  /** The id of the option the arrow keys are currently on, if any. */
  activeId?: string;
  /** Arrow/Home/End/Enter/Tab — the list's keyboard, handled where the focus is. */
  onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
}

/** The search row (magnifier + text input) shared by the searchable dropdowns.
 *
 *  The input had `outline-none` and nothing in its place (the audit's §a11y, the same
 *  finding as the numpad's keys). That mattered more here than the bare class suggests:
 *  {@link useDropdownSearch} focuses this box the moment a panel opens, so the caret is
 *  the ONLY evidence of where the next keystroke goes — and a caret in an empty field
 *  showing a placeholder is a single blinking pixel column. The ring is what says "this
 *  list is being typed into"; it appears whenever the field holds focus, which for a
 *  text input is exactly when it is true.
 *
 *  ## Why this box is a plain textbox and the TRIGGER is the combobox
 *
 *  The panels this header sits in are opened by a field-shaped trigger, and that
 *  trigger is what carries `role="combobox"` (see {@link MultiSelect},
 *  {@link EntityCombobox}). Two comboboxes for one list would be one too many — a
 *  reader tabbing back to the field would meet a second one describing the same
 *  choice. So this stays a textbox, which ARIA lets own `aria-activedescendant` and
 *  `aria-controls` exactly as a combobox does: focus is HERE while the list is up, so
 *  this is what has to say which option the arrow keys are on.
 *
 *  Pass `listboxId` and the wiring appears; omit it and the box is what it always
 *  was, for the callers that have no listbox to point at. */
export function DropdownSearchHeader({
  query,
  onQueryChange,
  inputRef,
  placeholder,
  listboxId,
  activeId,
  onKeyDown,
  "aria-label": ariaLabel,
  className,
  ...rest
}: DropdownSearchHeaderProps) {
  return (
    // `rest` dresses the header row; the NAME goes on the box below it. A search
    // input whose only name is its placeholder has none the moment a character is
    // typed into it — the placeholder disappears — which is why this is worth a prop
    // at all rather than something a caller could add from outside.
    <div
      {...rest}
      className={cn(
        "flex items-center gap-2 border-b border-[var(--border)] px-2 py-1.5",
        className,
      )}
    >
      <Search className="size-4 text-[var(--text-placeholder)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-autocomplete={listboxId ? "list" : undefined}
        className="w-full rounded-sm bg-transparent text-sm outline-none placeholder:text-[var(--text-placeholder)] text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
    </div>
  );
}

export interface DropdownPanelProps extends ComponentPropsWithoutRef<"div"> {
  header?: ReactNode;
  empty?: boolean;
  /** Attributes for the `<ul>` itself — how a caller whose children are options
   *  gives the list its `role="listbox"`, its id and `aria-multiselectable`. The
   *  panel owns the scrolling and the padding, so `className` here is merged rather
   *  than replaced. */
  listProps?: ComponentPropsWithoutRef<"ul">;
  /** The trigger to hang off. Given, the panel portals and goes `fixed`. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** {@link useDropdown}'s `panelRef`, so an outside-click sees this as inside. */
  panelRef?: RefObject<HTMLDivElement | null>;
  /** Panel width in px, for the anchored form (the CSS `w-*` cannot be measured). */
  width?: number;
  /** Which of the panel's edges lines up with the trigger's, room permitting.
   *  `start`/`end` follow the trigger's reading direction — `end` is the right edge
   *  in a left-to-right form and the left one in a right-to-left form — and are what
   *  the kit's own pickers pass; `left`/`right` stay physical. Default `end`, which
   *  is the old `right` in a left-to-right page. */
  align?: "left" | "right" | "start" | "end";
  children: ReactNode;
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
 * `end-0 top-full`). That is fine in a page that does not scroll around it, and
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
  listProps,
  anchorRef,
  panelRef,
  width = 256,
  align = "end",
  children,
  style,
  ...rest
}: DropdownPanelProps) {
  const anchored = useAnchoredPanel(anchorRef ?? EMPTY_REF, Boolean(anchorRef));
  const dir = useAnchorDir(anchorRef ?? EMPTY_REF, Boolean(anchorRef));
  const body = (
    <>
      {header}
      {/* The anchored form caps its own height against the VISIBLE viewport and lets
          this list have the rest; the absolute form keeps the fixed `max-h-64` it has
          always had, applied by the wrapper below. */}
      <ul {...listProps} className={cn("overflow-y-auto py-1", listProps?.className)}>
        {children}
        {/* `presentation`, so that a caller who made this list a `listbox` does not
            end up with one child that is not an option. The em dash still reads — it
            is the row's semantics that are dropped, not its text. */}
        {empty && (
          <li role="presentation" className="px-3 py-2 text-sm text-[var(--text-muted)]">
            —
          </li>
        )}
      </ul>
    </>
  );

  if (!anchorRef) {
    return (
      <div
        {...rest}
        style={style}
        ref={panelRef}
        className={cn(
          "absolute z-30 mt-1 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg",
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
  // The portal leaves the subtree the trigger's `dir` came from, so it is read off
  // the trigger — for the alignment here, and for the panel's own `dir` below,
  // without which a right-to-left form got a left-to-right list.
  const physical =
    align === "start" ? (dir === "rtl" ? "right" : "left") : align === "end" ? (dir === "rtl" ? "left" : "right") : align;
  const wanted = physical === "right" ? rect.right - width : rect.left;
  const left = Math.min(Math.max(8, wanted), window.innerWidth - width - 8);
  return createPortal(
    <div
      {...rest}
      ref={panelRef}
      dir={dir}
      // The caller's `style` is kept underneath, but the placement is measured rather
      // than chosen (dev#548: an `overflow` ancestor clipped a third of this panel
      // away), so those five values are the panel's own.
      style={{ ...style, position: "fixed", top: anchored.top, left, width, maxHeight: anchored.maxHeight }}
      className={cn(
        "z-50 flex flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg",
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
