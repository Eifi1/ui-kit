import { Fragment, useId, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { FieldLabel, FIELD_BASE, FIELD_FLOATING_PAD, FIELD_INVALID, PHONE_QUERY } from "./ui";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useMediaQuery } from "../hooks/use-media-query";
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import type { ComboOption } from "./combobox-core";

// One look for both combobox flavors below — the suggestion list and its rows
// must stay pixel-identical between the free-text and the id-keyed variant.
const LIST_CLASS =
  "max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900";

/**
 * "This focus came from a mouse button that is not the left one" — for the two
 * fields below, which open their list ON FOCUS.
 *
 * Keksdose live #309 rework: *"When clicking the mouse back button now while hovering
 * one of the selects it opens the select as long as I am holding the button down and
 * closes select after releasing."* A mouse's BACK button focuses whatever it is
 * pressed over, exactly as the left one does — the browser only reserves the
 * NAVIGATION for itself — so a field that opens on focus opened a list for a gesture
 * that means "go back", and the release then navigated out from under it. Measured on
 * his own budget: `mousePressed button=back` over the transfer form's account field
 * left `aria-expanded=true`, and the release took the whole add card with it.
 *
 * The press is recorded and read by the focus that the SAME press causes: focus is
 * mousedown's default action, dispatched inside the same task, so the flag is always
 * read before the `setTimeout` below can drop it. And it is always dropped — a press
 * that focuses nothing (the pointer was over a disabled field, the button was
 * released elsewhere) must not leave a latch that swallows the next Tab.
 *
 * Only the OPEN is suppressed, never the navigation: Back still goes back, which is
 * the whole of what the button was pressed for.
 */
function usePrimaryPressOnly() {
  const auxPress = useRef(false);
  return {
    onMouseDown: (e: { button: number }) => {
      if (e.button === 0) return;
      auxPress.current = true;
      setTimeout(() => {
        auxPress.current = false;
      }, 0);
    },
    /** True while handling the focus a non-primary press just caused. */
    fromAuxButton: () => auxPress.current,
  };
}

/**
 * The desktop suggestion list, PORTALLED and anchored to the field.
 *
 * It used to be an `absolute` `<ul>` inside the field's own wrapper, and that is
 * Keksdose live #295: *"Category select inside the list is not readable. Some sort
 * of z indexes issue?"*. It was not z-index — a stacking context can be out-ranked,
 * but `overflow` cannot be argued with. The receipt's line table sits in a card
 * carrying `overflow-clip`, so a list opened from the last visible row was cut off
 * at the card's edge: measured at 256px tall with 150px of it painted.
 *
 * Every other panel in this package already learned this — `DropdownPanel`'s
 * `anchorRef` form, the calculator popover, the tooltip — so this reuses the same
 * hook rather than inventing a second placement. What that buys beyond the clip:
 * the list flips above the field when there is no room below, and it caps its own
 * height against the VISIBLE viewport, which on a phone means the on-screen
 * keyboard (see {@link useAnchoredPanel}).
 *
 * `panelRef` is not optional plumbing. Portalled, the list is no longer a
 * descendant of the wrapper, so {@link useDropdown}'s outside-click test answers
 * "outside" for a click on the list itself — the first option a user picked would
 * close the dropdown having picked nothing.
 */
function SuggestionList({
  anchorRef,
  panelRef,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { rect, top, maxHeight } = useAnchoredPanel(anchorRef, true, { preferredHeight: 256 });
  if (!rect) return null;
  return createPortal(
    <div
      ref={panelRef}
      // z-50, not the old z-30: the list is a child of <body> now, so it is
      // competing with the app's own overlays rather than with its own siblings.
      className="fixed z-50"
      style={{ top, left: rect.left, width: rect.width }}
    >
      <ul role="listbox" className={LIST_CLASS} style={{ maxHeight }}>
        {children}
      </ul>
    </div>,
    document.body,
  );
}

const rowClass = (isActive: boolean) =>
  cn(
    "block w-full truncate px-3 py-1.5 text-left text-sm text-slate-900 dark:text-slate-100",
    isActive ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800",
  );

/**
 * Free-text combobox that looks like the shared {@link Select} (same FIELD_BASE
 * styling, chevron and static floating label) but lets the user type a value
 * that isn't in the list — e.g. naming a brand-new payee. Picking from the
 * filtered suggestion list fills the value; typing keeps whatever was entered.
 *
 * Use this instead of an `<Input list="…">` + `<datalist>` so the control is
 * visually and behaviourally consistent with the other dropdowns (feedback
 * #230 — the payee field looked/behaved differently from every other select).
 */
export function Combobox({
  value,
  onChange,
  options,
  label,
  id,
  placeholder,
  className,
  groupBy,
  maxSuggestions,
  searchPlaceholder,
  closeLabel,
  createLabel,
  invalid,
  optionAdornment,
  autoFocus,
  onBlur,
  onSubmit,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Suggestion pool (e.g. existing payee names). */
  options: string[];
  label?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Required and unanswered — see {@link Input}'s `invalid`. Set on the `<input>`
   *  itself rather than on the wrapper, which is what let Keksdose's account picker
   *  delete the `[&_input]:…` copy of {@link FIELD_INVALID} it had been carrying
   *  because this component had no `invalid` of its own. */
  invalid?: boolean;
  /** Heading an option belongs under. Supplying it makes this list read exactly
   *  like {@link InlineEntityCombobox}'s — one heading per group with its rows
   *  indented beneath — instead of a flat list (feedback #136 rework: the payee
   *  field sat next to the newly-grouped category field and no longer matched).
   *  Omit for a plain list. */
  groupBy?: (option: string) => string;
  /**
   * Something to show at the far end of an option's row — a badge saying what the
   * option IS, as distinct from what it is called.
   *
   * Keksdose's category-name field is the case: its proposals carry per-locale
   * names, so picking one stores a category that follows the UI language, and
   * picking a look-alike custom name does not. That difference is invisible in the
   * label and decides what the row DOES, so the row has to show it. Returning
   * `null` for an option renders nothing and costs no layout.
   *
   * Not rendered in the create row, which by definition names nothing in the pool.
   */
  optionAdornment?: (option: string) => ReactNode;
  /** Focus on mount, the way `<input autoFocus>` does — and, through `onFocus`, open
   *  the list with it. A click-the-value inline editor needs it: the cell the user
   *  clicked names the field the caret should land in. {@link InlineEntityCombobox}
   *  has had it since live #218. */
  autoFocus?: boolean;
  /** Focus genuinely LEFT the field. Not fired by picking a row — the rows suppress
   *  `mousedown`, so the input never blurs — which is what makes it usable as a
   *  "close the inline editor" signal. */
  onBlur?: () => void;
  /** Enter pressed with no row highlighted, i.e. "I mean what I typed". The list
   *  closes either way; this is for a caller whose Enter also submits a row editor. */
  onSubmit?: () => void;
  "aria-label"?: string;
  /** Rows to offer when the field is empty. 8 on a dropdown, where that is all
   *  that fits; the phone sheet asks for more because it has a screen. */
  maxSuggestions?: number;
  searchPlaceholder?: string;
  closeLabel?: string;
  /**
   * Label for the row that COMMITS a value the list does not contain — e.g.
   * `(v) => \`Add "${v}" as payee\``. Supplying it turns the free text into
   * something you confirm rather than something you leave behind.
   *
   * Keksdose live #212: *"For the payee input have an apply button, when input is
   * placed like 'add xxx as payee' to confirm. Now it can be put in and closed with
   * the right top X, which seems not intuitive."* On the phone sheet the search box
   * IS the value, so typing a brand-new name and dismissing the sheet did commit it —
   * but the only control on offer was the close X, which reads as "discard". A named
   * affordance says what the typing did.
   *
   * Omit and the row is not rendered, which is the right default for a list whose
   * values are all supposed to already exist.
   */
  createLabel?: (value: string) => string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  // `backCloses` is the desktop half of live #309: the phone's list IS a
  // {@link PickerSheet}, which registers its own history entry, so registering a
  // second one here would cost two Back presses to dismiss one sheet.
  const isPhone = useMediaQuery(PHONE_QUERY, false);
  const { open, setOpen, wrapperRef, panelRef } = useDropdown({ backCloses: !isPhone });
  const primaryOnly = usePrimaryPressOnly();
  const [active, setActive] = useState(-1);
  // A phone opens the list as a full-screen sheet with its own input, the way a
  // native <select> does — live #200: "Paid as full screen dialog with input.
  // Similar to the account select that already appears as full screen." The
  // anchored list stays for pointer devices, where it is the better shape.
  const sheetInputRef = useRef<HTMLInputElement | null>(null);
  // The box the portalled list hangs off — the inner wrapper, which hugs the input,
  // not the outer one (a grid item that can be taller than the field).
  const fieldRef = useRef<HTMLDivElement>(null);

  /**
   * Is the text in the field a QUERY, or just what was picked last time?
   *
   * Keksdose dev#549, filed against the category-name field: *"Currently it acts kind
   * of a filter and clicking again does not open anything since the previous text is
   * still there likely filtering all other options out."* A combobox whose filter is
   * its own value can only ever re-offer the answer it already has — after picking
   * "REWE" the list reopens holding one row, the one you are looking at, and changing
   * your mind means clearing the field by hand first.
   *
   * So the text filters only while it is being TYPED; opening the list, by focus or
   * by clicking the field again, puts the whole pool back. {@link InlineEntityCombobox}
   * below has had this since it was written (see its `typedQuery`) and the app's
   * category-name field grew its own copy to get it — this one, the payee field, was
   * the one left with the bug.
   *
   * Not derived from "does the text exactly match an option": a custom value that
   * happens to collide with one would then behave differently from every other, and
   * what is being tracked is what the user just did, which is not a property of the
   * string.
   */
  const [typing, setTyping] = useState(false);

  const query = typing ? value.trim().toLowerCase() : "";
  const matches = useMemo(() => {
    const seen = new Set<string>();
    const uniq = options.filter((o) => o && !seen.has(o) && seen.add(o));
    let ranked: string[];
    const cap = maxSuggestions ?? (isPhone ? 50 : 8);
    if (!query) {
      ranked = uniq.slice(0, cap);
    } else {
      // Prefix matches first, then substring matches — most relevant on top.
      const starts = uniq.filter((o) => o.toLowerCase().startsWith(query));
      const contains = uniq.filter(
        (o) => !o.toLowerCase().startsWith(query) && o.toLowerCase().includes(query),
      );
      ranked = [...starts, ...contains].slice(0, cap);
    }
    if (!groupBy) return ranked;
    // Keep each group contiguous so a heading appears once instead of every time
    // the ranking interleaves two groups — while preserving "best match first":
    // a Map keeps insertion order, so groups come out ordered by their best-ranked
    // member and members keep their rank order inside the group.
    const byGroup = new Map<string, string[]>();
    for (const o of ranked) {
      const key = groupBy(o);
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(o);
    }
    return [...byGroup.values()].flat();
  }, [options, query, groupBy, maxSuggestions, isPhone]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    setActive(-1);
    // What is in the field is now an ANSWER, not a query — so reopening offers the
    // whole pool again rather than a one-row filter of the value just chosen.
    setTyping(false);
  };

  // Offered only when the typed text is genuinely NOT in the pool: an exact
  // (case-insensitive) match is an existing entry the list is already showing, and a
  // second way to pick it would be noise. Compared against `options`, not `matches` —
  // `matches` is capped, so a pool of 300 payees would otherwise offer to "add" one
  // that exists but fell off the end of the list.
  const typed = value.trim();
  const createRow =
    createLabel && typed.length > 0 && !options.some((o) => o.toLowerCase() === typed.toLowerCase())
      ? createLabel(typed)
      : null;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      {/* The chevron centers against this inner wrapper, which hugs the input.
          The outer div can be taller than the input (as a grid item it
          stretches to the row height, e.g. next to the editor's category cell
          with its split button), which used to drag a top-1/2 chevron down to
          the input's bottom edge (feedback #248). */}
      <div ref={fieldRef} className="relative">
        <input
          id={fieldId}
          value={value}
          placeholder={placeholder}
          // The visual label is a floating <span>, not a <label for>, so fall back to
          // it for the accessible name — otherwise the field announces only what is
          // typed in it (dev#477, applied to all three entity fields of a transaction
          // form at once).
          aria-label={ariaLabel ?? label}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          onBlur={onBlur}
          onMouseDown={primaryOnly.onMouseDown}
          onFocus={() => {
            // A back/forward mouse button focuses this field on its way to
            // navigating; it is not a request to open anything (live #309 rework).
            if (primaryOnly.fromAuxButton()) return;
            setOpen(true);
            setTyping(false);
            // The sheet carries its own input, so the field behind it must not also
            // pull up the keyboard and scroll the page under the dialog.
            if (isPhone) sheetInputRef.current?.focus();
          }}
          // A CLICK as well as focus — the other half of dev#549. Picking a suggestion
          // closes the list without moving focus (the rows suppress `mousedown` on
          // purpose, so the input never blurred), which means clicking the field again
          // fires no `focus` event at all and the list stayed shut. "Does not open
          // anything" was literally true.
          onClick={() => {
            setOpen(true);
            setTyping(false);
          }}
          // `inputMode="none"` rather than readOnly: the field must not look
          // uneditable (FIELD_BASE greys a read-only field since dev#468) and must
          // still take focus — it just has no keyboard of its own, the same trick
          // the amount field uses for the numpad.
          inputMode={isPhone ? "none" : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
            setTyping(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && active >= 0 && active < matches.length) {
                e.preventDefault();
                commit(matches[active]);
              } else {
                // No row highlighted: the typed text is the answer. `preventDefault`
                // only when a caller is taking Enter, so a plain form submit is
                // otherwise left alone.
                if (onSubmit) e.preventDefault();
                setOpen(false);
                onSubmit?.();
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          className={cn(FIELD_BASE, label !== undefined && FIELD_FLOATING_PAD, "pr-9", invalid && FIELD_INVALID)}
        />
        <ChevronDown
          aria-hidden
          onMouseDown={(e) => {
            // Toggle on the chevron without stealing focus from the input.
            e.preventDefault();
            setOpen((o) => !o);
          }}
          className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer text-slate-400 dark:text-slate-500"
        />
      </div>
      {isPhone && (
        <PickerSheet
          open={open}
          onClose={() => setOpen(false)}
          title={label}
          // The sheet's input IS the field: this is a free-text control, so what is
          // typed here is the value (a brand-new payee is just a name nothing
          // matches), and the list below narrows as it changes.
          query={value}
          onQueryChange={(v) => {
            onChange(v);
            setTyping(true);
          }}
          searchPlaceholder={searchPlaceholder ?? placeholder}
          inputRef={sheetInputRef}
          closeLabel={closeLabel}
        >
          <ul role="listbox">
            {createRow && (
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => commit(typed)}
                  className={cn(SHEET_ROW_CLASS, "font-medium text-teal-700 dark:text-teal-300")}
                >
                  {createRow}
                </button>
              </li>
            )}
            {matches.map((o) => {
              const group = groupBy?.(o);
              const startsGroup =
                group != null && group !== (matches[matches.indexOf(o) - 1] && groupBy?.(matches[matches.indexOf(o) - 1]));
              return (
                <Fragment key={o}>
                  {startsGroup && (
                    <li
                      role="presentation"
                      className="px-4 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                    >
                      {group}
                    </li>
                  )}
                  <li role="option" aria-selected={o === value}>
                    <button
                      type="button"
                      onClick={() => commit(o)}
                      className={cn(
                        SHEET_ROW_CLASS,
                        optionAdornment && "flex items-center justify-between gap-2",
                      )}
                    >
                      {optionAdornment ? <span className="truncate">{o}</span> : o}
                      {optionAdornment?.(o)}
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </PickerSheet>
      )}
      {!isPhone && open && (matches.length > 0 || createRow) && (
        <SuggestionList anchorRef={fieldRef} panelRef={panelRef}>
          {createRow && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // mousedown, like the rows below: the input's blur would otherwise
                  // close the list before the click landed.
                  e.preventDefault();
                  commit(typed);
                }}
                className={cn(rowClass(false), "font-medium text-teal-700 dark:text-teal-300")}
              >
                {createRow}
              </button>
            </li>
          )}
          {matches.map((o, i) => {
            const group = groupBy?.(o);
            // Heading at each group boundary only — `matches` is group-contiguous,
            // so comparing against the previous row is enough.
            const startsGroup = group != null && group !== (matches[i - 1] && groupBy?.(matches[i - 1]));
            return (
              <Fragment key={o}>
                {startsGroup && (
                  <li
                    role="presentation"
                    className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:pt-1 dark:text-slate-400"
                  >
                    {group}
                  </li>
                )}
                <li role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mousedown (not click) so the blur from the input firing first
                      // doesn't close the list before the selection registers.
                      e.preventDefault();
                      commit(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      rowClass(i === active),
                      group != null && "pl-6",
                      // A row with a badge is a flex row so the label truncates and the
                      // badge keeps its width; without one it stays the plain block the
                      // other lists render, so nothing shifts for callers that pass none.
                      optionAdornment && "flex items-center justify-between gap-2",
                    )}
                  >
                    {optionAdornment ? <span className="truncate">{o}</span> : o}
                    {optionAdornment?.(o)}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </SuggestionList>
      )}
    </div>
  );
}

/**
 * The id-keyed sibling of {@link Combobox}: identical anatomy (a real text input
 * with the shared field styling, chevron and inline as-you-type filtering) but
 * the value is an option id, not free text. Built so an entity picker can sit
 * next to a free-text combobox without any visible difference — a button-trigger
 * panel picker ({@link EntityCombobox}) never matches an input field exactly.
 *
 * Text-vs-value reconciliation: the input's text is transient. Picking a row or
 * typing an exact (unique) label commits that option; emptying the text commits
 * a clear; anything else reverts to the selected option's label on blur/Escape.
 *
 * **On a phone the list opens as a full-screen sheet**, exactly like {@link Combobox}
 * beside it (Keksdose live #200, extended by dev#477 — the account picker moved onto
 * this component and must not lose its sheet). The sheet carries its OWN query state
 * rather than reusing `text`: `text` is what {@link reconcile} judges on blur, so a
 * sheet that emptied it to show the full list would read as "the user cleared the
 * field" the moment it closed.
 */
export function InlineEntityCombobox<V extends string | number>({
  value,
  onChange,
  options,
  label,
  id,
  placeholder,
  className,
  disabled,
  autoFocus,
  searchPlaceholder,
  emptyLabel,
  closeLabel,
  clearable,
  clearLabel,
  invalid,
  "aria-label": ariaLabel,
}: {
  /** Selected option id, or null when nothing is selected. */
  value: V | null;
  /** Required and unanswered — see {@link Combobox}'s `invalid`. */
  invalid?: boolean;
  /** A picked/typed option emits its id; emptying the field emits `null`. */
  onChange: (v: V | null) => void;
  options: ComboOption<V>[];
  label?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Focus on mount, the way `<input autoFocus>` does — and, through `onFocus`
   *  below, open the list with it. A click-the-value editor needs it: the cell
   *  the user clicked names the field the editor should land the caret in, and
   *  without a passthrough this component's fixed prop list puts the `<input>`
   *  out of a caller's reach entirely (Keksdose feedback live #218). */
  autoFocus?: boolean;
  /** Phone sheet only — the anchored list has the field itself to type in. */
  searchPlaceholder?: string;
  /** Phone sheet only: a full screen showing nothing has to say why. The anchored
   *  list simply does not open. */
  emptyLabel?: string;
  closeLabel?: string;
  /** Offer a clear "×" in place of the chevron whenever something is selected.
   *
   *  Emptying the text already clears (see {@link reconcile}), and on a desktop that
   *  is the fast way. It is not a way at all on a PHONE: touching the field opens the
   *  full-screen sheet, which covers the very input the text would have been deleted
   *  from — so a field that had been answered could not be UNanswered by any gesture
   *  the screen offered (Keksdose live #236, filed from a phone). The "×" is the one
   *  affordance both shells share, and it clears without opening anything. */
  clearable?: boolean;
  clearLabel?: string;
  "aria-label"?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const isPhone = useMediaQuery(PHONE_QUERY, false);
  // See the twin above: the phone sheet owns its own Back entry (live #309).
  const { open, setOpen, wrapperRef, panelRef } = useDropdown({ backCloses: !isPhone });
  const primaryOnly = usePrimaryPressOnly();
  const [active, setActive] = useState(-1);
  // null = not editing → the input shows the selected option's label.
  const [text, setText] = useState<string | null>(null);
  const sheetInputRef = useRef<HTMLInputElement | null>(null);
  // The box the portalled list hangs off — see {@link SuggestionList}.
  const fieldRef = useRef<HTMLDivElement>(null);
  // The sheet's search box. Starts empty on every open, so a field that already
  // holds a value still offers the whole list — the shape a native <select> has
  // on a phone, and what the anchored panel gets from `query` below.
  const [sheetQuery, setSheetQuery] = useState("");

  const selected = useMemo(
    () => (value == null ? null : (options.find((o) => o.value === value) ?? null)),
    [options, value],
  );
  const shown = text ?? selected?.label ?? "";
  // Nothing selected has nothing to clear, and the chevron comes back — the field
  // keeps exactly one trailing control, so the "×" never crowds the value it sits on.
  const showClear = Boolean(clearable && value != null && !disabled);

  // Focusing select-alls the current label; filtering only kicks in once the
  // text actually differs from it, so an already-filled field still opens on
  // the FULL list instead of a single-row "filter" of its own value.
  const typedQuery =
    text !== null && text !== (selected?.label ?? "") ? text.trim().toLowerCase() : "";
  const query = isPhone ? sheetQuery.trim().toLowerCase() : typedQuery;
  const matches = useMemo(() => {
    let ranked = options;
    if (query) {
      const hit = (s: string | undefined) => s?.toLowerCase().includes(query) ?? false;
      const starts = options.filter((o) => o.label.toLowerCase().startsWith(query));
      const rest = options.filter(
        (o) =>
          !o.label.toLowerCase().startsWith(query) &&
          (hit(o.label) || hit(o.sublabel) || hit(o.group)),
      );
      ranked = [...starts, ...rest];
    }
    if (!ranked.some((o) => o.group)) return ranked;
    // Keep each group contiguous so the headings below appear once instead of
    // re-appearing every time the ranking interleaves two groups — while preserving
    // "best match first": a Map keeps insertion order, so groups come out ordered by
    // their best-ranked member and members keep their rank order inside the group.
    const blocks = new Map<string, ComboOption<V>[]>();
    for (const o of ranked) {
      const key = o.group ?? "";
      if (!blocks.has(key)) blocks.set(key, []);
      blocks.get(key)!.push(o);
    }
    return [...blocks.values()].flat();
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setActive(-1);
    setSheetQuery("");
  };
  const commit = (o: ComboOption<V>) => {
    if (o.value !== value) onChange(o.value);
    setText(null);
    close();
  };
  /** Turn loose text into a decision: empty clears, an exact label match that names
   *  ONE entity commits, anything else reverts to the selected label.
   *
   *  Unique by VALUE, not by row. An option may deliberately appear twice — Keksdose
   *  repeats recently-used categories in a "Recent" group at the top (live #203) — and
   *  counting rows made every such option uncommittable: two hits, so nothing fired and
   *  the field reverted to whatever was selected before. Typing a category you had just
   *  used, then tabbing away, silently discarded it, and the more categories you used
   *  the more of them stopped working. Two rows naming the same id are not an ambiguity;
   *  two ids sharing a label are. */
  const reconcile = () => {
    if (text !== null) {
      const q = text.trim();
      if (!q) {
        if (value != null) onChange(null);
      } else {
        const hits = options.filter((o) => o.label.toLowerCase() === q.toLowerCase());
        const ids = new Set(hits.map((h) => h.value));
        if (ids.size === 1 && hits[0].value !== value) onChange(hits[0].value);
      }
      setText(null);
    }
    close();
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      {/* Inner wrapper for chevron centering — same reasoning as Combobox above.
          It is also what the portalled list anchors to. */}
      <div ref={fieldRef} className="relative">
        <input
          id={fieldId}
          value={shown}
          placeholder={placeholder}
          // The visual label is a floating <span>, not a <label for>, so without this
          // the field has NO accessible name — it announces its value and nothing
          // else. Just the label, never "label: value" the way a trigger button has
          // to compose it: an input already exposes its value separately.
          aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          autoComplete="off"
          disabled={disabled}
          autoFocus={autoFocus}
          // `inputMode="none"` rather than readOnly, for the same reason Combobox
          // above gives: the sheet carries the keyboard, and a readOnly field would
          // take FIELD_BASE's settled look on a field that is perfectly editable.
          inputMode={isPhone ? "none" : undefined}
          onMouseDown={primaryOnly.onMouseDown}
          onFocus={(e) => {
            // See {@link usePrimaryPressOnly}: a back/forward button lands here on
            // its way to navigating, and neither the list nor the select-all is
            // anything it asked for (live #309 rework).
            if (primaryOnly.fromAuxButton()) return;
            setText(shown);
            e.currentTarget.select();
            setOpen(true);
            // The sheet has its own input; the field behind it must not also pull up
            // the keyboard and scroll the page under the dialog.
            if (isPhone) sheetInputRef.current?.focus();
          }}
          onBlur={() => {
            // On a phone the blur is the SHEET taking focus, not the user leaving the
            // field — reconciling there would close the sheet the instant it opened.
            if (!isPhone) reconcile();
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (open && active >= 0 && active < matches.length) {
                e.preventDefault();
                commit(matches[active]);
              } else {
                reconcile();
              }
            } else if (e.key === "Escape") {
              setText(null);
              close();
            }
          }}
          className={cn(FIELD_BASE, label !== undefined && FIELD_FLOATING_PAD, "pr-9", invalid && FIELD_INVALID)}
        />
        {showClear ? (
          <button
            type="button"
            // Out of the tab order, like the clear on `EntityCombobox`: the keyboard
            // already clears this field by selecting its text and deleting, and a
            // second stop between every picker and the next field is a worse trade
            // than the one gesture it saves.
            tabIndex={-1}
            aria-label={clearLabel ?? "Clear"}
            // preventDefault, exactly as the chevron does: without it the press
            // focuses the input, which on a phone opens the sheet over the field the
            // press was clearing.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setText(null);
              close();
              onChange(null);
            }}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400",
              "hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
            )}
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : (
          <ChevronDown
            aria-hidden
            onMouseDown={(e) => {
              // Toggle on the chevron without stealing focus from the input.
              e.preventDefault();
              setOpen((o) => !o);
            }}
            className={cn(
              "absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500",
              disabled ? "opacity-50" : "cursor-pointer",
            )}
          />
        )}
      </div>
      {isPhone && (
        <PickerSheet
          open={open}
          // Closing without choosing keeps the value: `text` was never emptied, so
          // reconcile has nothing to undo — it just puts the label back.
          onClose={reconcile}
          title={label}
          query={sheetQuery}
          onQueryChange={(v) => {
            setSheetQuery(v);
            setActive(-1);
          }}
          searchPlaceholder={searchPlaceholder ?? placeholder}
          inputRef={sheetInputRef}
          closeLabel={closeLabel}
        >
          <ul role="listbox">
            {matches.map((o, i) => (
              // Keyed by group AND value, like combobox-core.tsx: an option may
              // deliberately appear twice (see `reconcile`), and a bare value key
              // would collide.
              <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
                {o.group && o.group !== matches[i - 1]?.group && (
                  <li
                    role="presentation"
                    className="px-4 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {o.group}
                  </li>
                )}
                <li role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    onClick={() => commit(o)}
                    className={cn(SHEET_ROW_CLASS, o.value === value && "font-medium")}
                  >
                    {o.label}
                  </button>
                </li>
              </Fragment>
            ))}
            {matches.length === 0 && emptyLabel && (
              <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</li>
            )}
          </ul>
        </PickerSheet>
      )}
      {!isPhone && open && matches.length > 0 && (
        <SuggestionList anchorRef={fieldRef} panelRef={panelRef}>
          {matches.map((o, i) => (
            // A group heading is emitted at each group boundary rather than repeating
            // the group on every row (feedback #136). `matches` is group-contiguous,
            // so comparing with the previous row is enough. Fragment key sits here;
            // the heading and the option carry their own list semantics — keyed by
            // group AND value, because an option may deliberately appear twice (see
            // `reconcile`).
            <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
              {o.group && o.group !== matches[i - 1]?.group && (
                <li
                  role="presentation"
                  className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:pt-1 dark:text-slate-400"
                >
                  {o.group}
                </li>
              )}
              <li role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // mousedown (not click) so the input's blur can't close the
                    // list before the selection registers.
                    e.preventDefault();
                    commit(o);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    rowClass(i === active),
                    // Indented under its heading, so the hierarchy is readable at a
                    // glance instead of inferred from grey trailing text.
                    o.group && "pl-6",
                    o.value === value && "font-medium",
                  )}
                >
                  {o.label}
                  {o.sublabel && (
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                      {o.sublabel}
                    </span>
                  )}
                </button>
              </li>
            </Fragment>
          ))}
        </SuggestionList>
      )}
    </div>
  );
}
