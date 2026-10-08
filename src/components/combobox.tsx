import { Fragment, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref, RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, X } from "lucide-react";
import { FIELD_BASE, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useAnchorDir } from "./use-anchor-dir";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import {
  ComboboxFieldLabel,
  DISABLED_ROW_CLASS,
  endHintRowProps,
  isOptionEnabled,
  offersCreate,
  stepEnabled,
  SUGGESTION_LIST_CLASS,
  suggestionRowClass,
  useActiveOptionScroll,
  useComboboxFieldError,
  type ComboClearValue,
  type ComboOption,
} from "./combobox-core";
import { DEFAULT_COMBOBOX_LABELS, useKitLabels } from "../i18n/kit-labels";
import {
  EndHintRow,
  FieldCaption,
  LABEL_IN_ROW,
  LockedReason,
  StaticLabelRow,
  useFieldHint,
  useLockReason,
} from "./field-parts";
import { hasMessage, mergeDescribedBy } from "./choice-parts";
import { useCommitReason } from "./write-lock";

// One look for both combobox flavors below — the suggestion list and its rows
// must stay pixel-identical between the free-text and the id-keyed variant (and
// `Autocomplete`, which shares them from the core).
const LIST_CLASS = SUGGESTION_LIST_CLASS;

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
  id,
  anchorRef,
  panelRef,
  children,
}: {
  /** What the field's `aria-controls` names. */
  id: string;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { rect, top, maxHeight } = useAnchoredPanel(anchorRef, true, { preferredHeight: 256 });
  const dir = useAnchorDir(anchorRef, true);
  if (!rect) return null;
  return createPortal(
    <div
      ref={panelRef}
      // z-50, not the old z-30: the list is a child of <body> now, so it is
      // competing with the app's own overlays rather than with its own siblings.
      className="fixed z-50"
      // Portalled out of the form's `dir`; the field's is put back. The list is
      // exactly the field's width, so `left` places it in either direction.
      dir={dir}
      style={{ top, left: rect.left, width: rect.width }}
    >
      <ul id={id} role="listbox" data-clips="" className={LIST_CLASS} style={{ maxHeight }}>
        {children}
      </ul>
    </div>,
    document.body,
  );
}

const rowClass = suggestionRowClass;

/**
 * The write lock on the two TYPED fields below — {@link Button}'s `disabledReason`
 * path, for an input (keksdose G2).
 *
 * `readOnly` rather than `disabled`, as everywhere the kit locks a field: still focusable,
 * so the reason in the Tooltip reaches a keyboard; refusing keys, so nothing typed can
 * become a value; and FIELD_BASE paints a `[readonly]` field in the settled grey a
 * disabled one wears. No list opens, by focus, click, chevron or arrow — and Enter is
 * swallowed, so a locked field does not submit the form around it either (Select's
 * lock, `LOCKED_SELECT_KEYS`). Every other key is left alone: the arrows and Home/End
 * still move the caret through a long value someone is trying to read.
 */
function lockedKeyDown(e: { key: string; preventDefault: () => void }) {
  if (e.key === "Enter") e.preventDefault();
}

/** {@link InlineEntityCombobox}'s create row over the shared row look: in the brand
 *  colour {@link Combobox}'s own create row wears, with a leading "+" as the panel
 *  pickers' has — an action at the foot of the list, not one more record. */
const CREATE_ROW_CLASS = "flex items-center gap-2 font-medium text-[var(--brand)]";

/**
 * Four of the div's own attributes are omitted because this component already owns
 * the name, with a different meaning: `id` is the INPUT's (a caller labels or
 * automates the field, not the box around it), and `onChange`/`onBlur`/`onSubmit`
 * are the field's — a value, a departure, and "I mean what I typed" — rather than
 * the DOM events of the wrapper. Everything else a wrapper needs reaches the root.
 */
export interface ComboboxProps
  extends Omit<ComponentPropsWithoutRef<"div">, "id" | "onChange" | "onBlur" | "onSubmit"> {
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
  /** What is wrong with the value, as {@link Input}'s `error`: rendered under the
   *  field, on the `<input>`'s `aria-describedby`, and implies `invalid` (lenkbank's
   *  scope fields, which moved here off `<Input list>` + `<datalist>`). */
  error?: ReactNode;
  /**
   * Standing advice for the field — {@link Input}'s `hint`, so the combobox family
   * reads like every other field (keksdose K4: the family had `error` and no `hint`, so
   * the app's pickers carried their captions outside the component, attached to
   * nothing). Plain TEXT is a caption under the field on the input's
   * `aria-describedby`, before any error; a {@link FieldHint} "?" rides the label line,
   * or with no label sits at the field's end edge, outside the box.
   */
  hint?: ReactNode;
  /** As `<input disabled>`: no focus, no list, the field's settled look. The chevron
   *  stops toggling with it — it is a mouse target the input's own `disabled` does
   *  not reach. */
  disabled?: boolean;
  /**
   * Why the value cannot be changed — {@link Button}'s `disabledReason`, for a field
   * that SAVES itself (an inline editor whose blur writes). The input stays focusable
   * and `aria-disabled`, is `readOnly`, opens no list and calls neither `onChange` nor
   * `onSubmit`; the reason is in the kit {@link Tooltip} and on its `aria-describedby`.
   * Wins over `disabled`. The family's lock (keksdose G2) — see {@link InlineEntityCombobox}.
   */
  disabledReason?: ReactNode;
  /** This field COMMITS. Under a locked {@link WriteLockProvider} it is locked the
   *  `disabledReason` way with the lock's reason; inside a form with its own Save, leave
   *  it off and put `commit` on the Save. No provider, or an unlocked one: no effect. */
  commit?: boolean;
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
  /** Rows to offer when the field is empty. 8 on a dropdown, where that is all
   *  that fits; the phone sheet asks for more because it has a screen. */
  maxSuggestions?: number;
  searchPlaceholder?: string;
  closeLabel?: string;
  /**
   * The phone sheet's heading — and, as a string, the dialog's accessible name — for a
   * field whose label is drawn by someone else: a form's `FormLabel` above it,
   * which `RhfTextCombobox` hands over here (0.24). Default: `label`. Without either, the
   * full-screen sheet opened untitled and unnamed, the one screen on a phone that has to
   * say what it is asking for (live #200).
   */
  sheetTitle?: ReactNode;
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
  /**
   * The `<input>` — the control a reader types in and the one focus belongs on — as a
   * React 19 ref prop, the way {@link CountrySelect} takes its trigger's (0.24, kastlan:
   * react-hook-form's focus-on-error calls `focus()` on whatever `field.ref` is handed,
   * and a combobox with no ref inside a hand-wired `RhfField` gave it nothing, so a
   * failed submit could not take the user to it). Not the wrapper: a ref is for focus,
   * measurement and selection, and all three are the input's. `RhfTextCombobox` passes it.
   */
  ref?: Ref<HTMLInputElement>;
}

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
export function Combobox(props: ComboboxProps) {
  const {
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
    sheetTitle,
    createLabel,
    invalid,
    error,
    hint,
    disabled,
    disabledReason,
    commit,
    optionAdornment,
    autoFocus,
    onBlur,
    onSubmit,
    ref,
    "aria-label": ariaLabel,
    // Off `rest` and onto the <input>, which is the combobox a reader meets: `Field`'s
    // render-prop spreads `{ id, aria-describedby, aria-invalid, aria-required }`, and
    // on the wrapper div the hint and required state described nothing.
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    ...rest
  } = props;
  const hintParts = useFieldHint(hint, ariaDescribedBy);
  const field = useComboboxFieldError(
    error,
    invalid || ariaInvalid === true || ariaInvalid === "true",
    hintParts.describedBy,
  );
  const generated = useId();
  const fieldId = id ?? generated;
  // Derived from the GENERATED id, never from `id`: a caller's id is theirs to
  // collide with, and `aria-controls` has to resolve.
  const listboxId = `${generated}-listbox`;
  const optionId = (index: number) => `${generated}-option-${index}`;
  // `backCloses` is the desktop half of live #309: the phone's list IS a
  // {@link PickerSheet}, which registers its own history entry, so registering a
  // second one here would cost two Back presses to dismiss one sheet.
  const isPhone = usePhoneLayout();
  const { open, setOpen, wrapperRef, panelRef } = useDropdown({ backCloses: !isPhone });
  const primaryOnly = usePrimaryPressOnly();
  const [active, setActive] = useState(-1);
  // The lock (see `lockedKeyDown`): a lock arriving while the list is up closes it,
  // adjusted while rendering so no frame offers a row that can no longer be taken.
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked;
  const inert = locked || Boolean(disabled);
  if (locked && open) setOpen(false);
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

  /**
   * Which rows OPEN a group, and with what heading — computed once for both lists.
   *
   * The desktop list had this as `matches[i - 1]`, which is free; the sheet had it as
   * `matches[matches.indexOf(o) - 1]`, which is a scan of the list per row and another
   * per heading test. That is quadratic in the sheet's own cap of 50, on the branch
   * that runs on the slowest hardware we ship to — and it answers the wrong question
   * besides: `indexOf` finds the FIRST row with that string, so a duplicated option
   * would have compared against a neighbour it is not next to. (`matches` de-duplicates
   * today; that is a property of the memo above, not of the row being rendered.)
   */
  const groupHeadings = useMemo(() => {
    if (!groupBy) return null;
    const heads = new Map<number, string>();
    let prev: string | undefined;
    matches.forEach((o, i) => {
      const group = groupBy(o);
      if (group != null && group !== prev) heads.set(i, group);
      prev = group;
    });
    return heads;
  }, [matches, groupBy]);

  const take = (v: string) => {
    if (locked) return;
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
  // What the field claims the keyboard is on. Only on a pointer device: the phone
  // renders its rows in a {@link PickerSheet} whose own search box owns focus, and a
  // field pointing at an id that is not there is worse than one pointing nowhere.
  const activeId = !isPhone && active >= 0 && active < matches.length ? optionId(active) : undefined;
  useActiveOptionScroll(activeId);

  // While locked the field sits in the reason's Tooltip — in a fragment with a hidden
  // copy of the reason, Button's anatomy; `block` so a full-width field stays full width.
  const withLock = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} className="block">
        {box}
      </LockedReason>
    ) : (
      box
    );

  const typed = value.trim();
  const createRow =
    createLabel && typed.length > 0 && !options.some((o) => o.toLowerCase() === typed.toLowerCase())
      ? createLabel(typed)
      : null;

  return (
    // `rest` dresses the outer box — a `data-tour` anchor, a test id. Not the NAME,
    // description, invalid or required state: those belong on the <input> below,
    // which is the combobox a reader meets. Spread FIRST, so the field's ARIA and the
    // handlers carrying live #309 and dev#549 cannot be replaced from outside.
    <div {...rest} ref={wrapperRef} className={cn("relative", className)}>
      {/* A real <label for> since lenkbank's tests met a field `getByLabelText` could
          not find: it used to be a <span>, with the text copied onto `aria-label`. The
          name a reader hears is the same words either way. With a "?" it moves into a
          row after the field, below. */}
      {label !== undefined && hintParts.labelHint === undefined && (
        <ComboboxFieldLabel htmlFor={fieldId} className={inert ? "opacity-50" : undefined}>
          {label}
        </ComboboxFieldLabel>
      )}
      <EndHintRow {...endHintRowProps("hint" in props, label !== undefined, hintParts.labelHint)}>
        {withLock(
          /* The chevron centers against this inner wrapper, which hugs the input.
              The outer div can be taller than the input (as a grid item it
              stretches to the row height, e.g. next to the editor's category cell
              with its split button), which used to drag a top-1/2 chevron down to
              the input's bottom edge (feedback #248).
              Dimmed as a whole when disabled (or locked), the way EntityCombobox dims its
              trigger. FIELD_BASE's grey alone left a disabled picker looking like a
              filled-in one beside the pickers that do dim (the label is not the input's
              `peer`, so it is dimmed by hand above). */
          <div ref={fieldRef} className={cn("relative", inert && "cursor-not-allowed opacity-50")}>
            <input
              ref={ref}
              id={fieldId}
              value={value}
              placeholder={placeholder}
              // The caller's name, over the <label for> above — which is what names the
              // field otherwise (dev#477: a field with neither announces only its text).
              aria-label={ariaLabel}
              role="combobox"
              aria-expanded={open}
              // The list this field is the mouth of. Required by the role, and the half
              // that was missing: the field said it was expanded and never said what it
              // had expanded, so a reader had no way from the box to the options
              // (ESLint's `role-has-required-aria-props`, the audit's §a11y).
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-invalid={field.isInvalid || undefined}
              aria-describedby={mergeDescribedBy(field.describedBy, locked && lock.reasonId)}
              aria-required={ariaRequired}
              autoComplete="off"
              // Locked: focusable, `readOnly`, `aria-disabled` — see `lockedKeyDown`.
              disabled={locked ? undefined : disabled}
              readOnly={locked || undefined}
              aria-disabled={locked || undefined}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- a documented prop the caller opts into (off by default); the field never takes focus on its own.
              autoFocus={autoFocus}
              onBlur={onBlur}
              onMouseDown={primaryOnly.onMouseDown}
              onFocus={() => {
                // A back/forward mouse button focuses this field on its way to
                // navigating; it is not a request to open anything (live #309 rework).
                // A locked field takes focus to say why, and opens nothing.
                if (primaryOnly.fromAuxButton() || locked) return;
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
                if (locked) return;
                setOpen(true);
                setTyping(false);
              }}
              // `inputMode="none"` rather than readOnly: the field must not look
              // uneditable (FIELD_BASE greys a read-only field since dev#468) and must
              // still take focus — it just has no keyboard of its own, the same trick
              // the amount field uses for the numpad.
              inputMode={isPhone ? "none" : undefined}
              onChange={(e) => {
                if (locked) return;
                onChange(e.target.value);
                setOpen(true);
                setActive(-1);
                setTyping(true);
              }}
              onKeyDown={(e) => {
                if (locked) return lockedKeyDown(e);
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
                    take(matches[active]);
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
                } else if (e.key === "Tab") {
                  // Closes, and lets the browser take the Tab: focus is in THIS input,
                  // which is staying, so there is nothing to catch — unlike the pickers
                  // whose focus sits inside a portalled panel.
                  setOpen(false);
                  setActive(-1);
                }
                // Home/End are deliberately absent. The APG gives them to the list only
                // where the combobox is not editable; here the text IS the value, a
                // payee name is long enough to want the caret moved to its start, and
                // the desktop list is capped at 8 rows — so jumping it would be worth
                // almost nothing and would cost the one gesture that field is used with.
              }}
              className={cn(
                FIELD_BASE,
                label !== undefined && FIELD_FLOATING_PAD,
                "pe-9",
                field.isInvalid && FIELD_INVALID,
              )}
            />
            <ChevronDown
              aria-hidden
              onMouseDown={(e) => {
                // Toggle on the chevron without stealing focus from the input.
                e.preventDefault();
                if (!inert) setOpen((o) => !o);
              }}
              className={cn(
                "absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]",
                // The box above does the dimming; dimming here too would halve it again.
                !inert && "cursor-pointer",
              )}
            />
          </div>,
        )}
      </EndHintRow>
      {/* The label and its "?" share the top strip — after the field in the DOM, so the
          "?" follows the control in the tab order, as it does on Input and Select. */}
      {label !== undefined && hintParts.labelHint !== undefined && (
        <StaticLabelRow hint={hintParts.labelHint}>
          <ComboboxFieldLabel htmlFor={fieldId} className={cn(LABEL_IN_ROW, inert && "opacity-50")}>
            {label}
          </ComboboxFieldLabel>
        </StaticLabelRow>
      )}
      <FieldCaption parts={hintParts} />
      {field.errorEl}
      {isPhone && (
        <PickerSheet
          open={open && !inert}
          onClose={() => setOpen(false)}
          title={sheetTitle ?? label}
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
          <ul id={listboxId} role="listbox">
            {createRow && (
              // `role="option"` rides the BUTTON, not the <li> around it: an option
              // may not contain a separately focusable control, and the button is
              // what a pointer presses. Same shape `CommandPalette` has always had.
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => take(typed)}
                  className={cn(SHEET_ROW_CLASS, "font-medium text-[var(--brand)]")}
                >
                  {createRow}
                </button>
              </li>
            )}
            {matches.map((o, i) => {
              const group = groupHeadings?.get(i);
              return (
                <Fragment key={o}>
                  {group !== undefined && (
                    <li
                      role="presentation"
                      className="px-4 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                    >
                      {group}
                    </li>
                  )}
                  <li role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={o === value}
                      onClick={() => take(o)}
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
      {!isPhone && open && !inert && (matches.length > 0 || createRow) && (
        <SuggestionList id={listboxId} anchorRef={fieldRef} panelRef={panelRef}>
          {createRow && (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={false}
                tabIndex={-1}
                onMouseDown={(e) => {
                  // mousedown, like the rows below: the input's blur would otherwise
                  // close the list before the click landed.
                  e.preventDefault();
                  take(typed);
                }}
                className={cn(rowClass(false), "font-medium text-[var(--brand)]")}
              >
                {createRow}
              </button>
            </li>
          )}
          {matches.map((o, i) => {
            // Heading at each group boundary only — `matches` is group-contiguous, so
            // the boundaries are a property of the list rather than of the branch
            // drawing it. See `groupHeadings`.
            const group = groupHeadings?.get(i);
            return (
              <Fragment key={o}>
                {group !== undefined && (
                  <li
                    role="presentation"
                    className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] first:pt-1"
                  >
                    {group}
                  </li>
                )}
                <li role="presentation">
                  <button
                    type="button"
                    id={optionId(i)}
                    role="option"
                    // CHOSEN, not highlighted. The row the arrows are on is named by
                    // the field's `aria-activedescendant`; saying "selected" for it
                    // would tell a reader that the row they are passing over is
                    // already the answer.
                    aria-selected={o === value}
                    // Focus stays in the field — that is what
                    // `aria-activedescendant` is for — so the rows are not tab stops.
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      // mousedown (not click) so the blur from the input firing first
                      // doesn't close the list before the selection registers.
                      e.preventDefault();
                      take(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      rowClass(i === active),
                      group != null && "ps-6",
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

/** `id` is the INPUT's and `onChange` is the field's — see {@link ComboboxProps}
 *  for why the div's spellings of them are omitted. */
export interface InlineEntityComboboxProps<V extends string | number, C extends ComboClearValue = null>
  extends Omit<ComponentPropsWithoutRef<"div">, "id" | "onChange"> {
  /** Selected option id; `null` or `clearValue` when nothing is selected. */
  value: V | C | null;
  /** Required and unanswered — see {@link Combobox}'s `invalid`. */
  invalid?: boolean;
  /** What is wrong with the value — see {@link Combobox}'s `error`. */
  error?: ReactNode;
  /** Standing advice — see {@link Combobox}'s `hint` (keksdose K4). */
  hint?: ReactNode;
  /** A picked/typed option emits its id; emptying the field, or the "×", emits
   *  `clearValue`. */
  onChange: (v: V | C) => void;
  /** What a clear emits — `null` by default, `""` for a schema that wants an empty
   *  string. See {@link EntityCombobox}'s `clearValue`. */
  clearValue?: C;
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
  /** Phone sheet only — the anchored list has the field itself to type in. Falls
   *  back to `placeholder`, then to `combobox.search` from the {@link UiKitProvider}. */
  searchPlaceholder?: string;
  /** Phone sheet only: a full screen showing nothing has to say why. The anchored
   *  list simply does not open. Default: `combobox.noResults` from the provider. */
  emptyLabel?: string;
  closeLabel?: string;
  /** The phone sheet's heading (and, as a string, its accessible name) for a field
   *  whose label is drawn by someone else — a form's `FormLabel`;
   *  `RhfInlineEntityCombobox` hands its label over here (0.24). Default: `label`.
   *  See {@link Combobox}'s `sheetTitle`. */
  sheetTitle?: ReactNode;
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
  /**
   * Why the choice cannot be changed — {@link Button}'s `disabledReason`, for a picker
   * that SAVES on change. keksdose G2: the statement review's account picker IS the
   * write (picking re-runs the duplicate check on the server), and on the read-only demo
   * the app wrapped it in a hand-made Tooltip over a native `disabled` — out of the tab
   * order, so the reason never reached a keyboard.
   *
   * With a reason the input stays focusable and `aria-disabled`, is `readOnly` (the
   * settled grey), opens no list or sheet, offers no clear "×", and no pick, typed
   * label or clear reaches `onChange`; the reason is in the kit {@link Tooltip} and on
   * the input's `aria-describedby`. Wins over `disabled`. Use it CONTROLLED, as the
   * component always is: the shown label is `value`'s.
   */
  disabledReason?: ReactNode;
  /**
   * This picker COMMITS — choosing saves. Under a locked {@link WriteLockProvider} it is
   * locked the `disabledReason` way with the lock's reason (which wins over its own).
   * A picker inside a form with its own Save stays editable under the lock — leave this
   * off there and put `commit` on the Save. No provider, or an unlocked one: no effect.
   */
  commit?: boolean;
  /**
   * A last row that makes a new record from what was typed — keksdose G9, whose "Create
   * cash account" had to become a separate button because this picker had no such row.
   *
   * Shown while the typed query is non-empty and names no option exactly
   * (case-insensitive — an exact hit is a record the list already shows), worded
   * `createLabel(query)`, default `combobox.create`: "Create “{query}”". The arrow keys
   * reach it like an option; Enter or a click calls `onCreate(query)` and closes the
   * list. Making the record, and then passing its id as `value`, is the caller's: the
   * field shows the old selection until it does.
   *
   * The same rule as {@link EntityCombobox}'s `onCreate`, so the family agrees. It is a
   * row of the LIST, not an option: it is never `aria-selected`, never matched by a
   * typed label on blur, and never sorted among the records the way a sentinel option
   * would be (the reason keksdose gave for the separate button).
   */
  onCreate?: (query: string) => void;
  /** The create row's words for a query. Default: `combobox.create` from the
   *  {@link UiKitProvider}, else English `Create “{query}”`. */
  createLabel?: (query: string) => string;
  /**
   * Offer the create row with NOTHING typed too, worded as this — keksdose's "Create cash
   * account", which mints an account under a default name and so needs no query.
   * `onCreate` then receives `""`, and the caller supplies the name. Left out, the row
   * needs a query.
   *
   * One string rather than a switch: a row with no query has nothing to quote, so the
   * kit cannot word it — "Create “”" says nothing — and naming it is what turns it on.
   * With both, one handler serves both rows:
   *
   * ```tsx
   * onCreate={(name) => createCash(name || t("cash_account_default_name"))}
   * createEmptyLabel={t("create_cash_account")}
   * ```
   */
  createEmptyLabel?: string;
  /**
   * The create row WRITES while picking does not — keksdose dev#496: on the read-only
   * demo choosing the cash account is draft state and stays live, minting one is a
   * write. Under a locked {@link WriteLockProvider} the row stays in the list, dimmed and
   * passed over by the arrows, with the lock's reason as its second line (a hover is the
   * one explanation a phone cannot show), and `onCreate` is not called. Not needed with
   * `commit`: a locked field opens no list at all.
   */
  createCommit?: boolean;
  /**
   * The `<input>` — the focusable control, the one a reader types in — as a React 19
   * ref prop (0.24, kastlan). Its account picker is this component inside an
   * `RhfField` render, and react-hook-form's focus-on-error calls `focus()` on whatever
   * `field.ref` is handed: with no ref there was nothing to hand it, so a line-item form
   * whose account was missing failed its submit and left the caret where it was. Pass
   * `field.ref` here, or use `RhfInlineEntityCombobox`, which does. The wrapper is not
   * reachable this way — focus and selection are the input's. See {@link Combobox}'s `ref`.
   */
  ref?: Ref<HTMLInputElement>;
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
export function InlineEntityCombobox<V extends string | number, C extends ComboClearValue = null>(
  props: InlineEntityComboboxProps<V, C>,
) {
  const {
    value: rawValue,
    onChange,
    clearValue = null as C,
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
    sheetTitle,
    clearable,
    clearLabel,
    disabledReason,
    commit,
    onCreate,
    createLabel,
    createEmptyLabel,
    createCommit,
    invalid,
    error,
    hint,
    ref,
    "aria-label": ariaLabel,
    // Off `rest` and onto the <input>, which is the combobox a reader meets: `Field`'s
    // render-prop spreads `{ id, aria-describedby, aria-invalid, aria-required }`, and
    // on the wrapper div the hint and required state described nothing.
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-required": ariaRequired,
    ...rest
  } = props;
  // The clear value reads as "nothing selected", whichever one the caller picked —
  // so from here down `value` is the id or `null`, as it always was.
  const value: V | null = rawValue == null || rawValue === clearValue ? null : (rawValue as V);
  const hintParts = useFieldHint(hint, ariaDescribedBy);
  const field = useComboboxFieldError(
    error,
    invalid || ariaInvalid === true || ariaInvalid === "true",
    hintParts.describedBy,
  );
  const generated = useId();
  const fieldId = id ?? generated;
  // See the twin above on why these hang off the generated id.
  const listboxId = `${generated}-listbox`;
  const optionId = (index: number) => `${generated}-option-${index}`;
  const isPhone = usePhoneLayout();
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
  // Props first, provider second — see `EntityCombobox`. `emptyLabel` used to render
  // nothing when omitted, which left a phone user staring at a blank full-screen
  // sheet; now an omitted one says "No results" in the provider's language.
  const labels = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS, {
    search: searchPlaceholder,
    noResults: emptyLabel,
    clear: clearLabel,
    create: createLabel,
  });
  // The lock (see `lockedKeyDown` above). A lock arriving mid-edit closes the list and
  // drops the loose text, adjusted while rendering: nothing typed before it may be
  // judged by `reconcile` after it.
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked;
  const inert = locked || Boolean(disabled);
  if (locked && (open || text !== null)) {
    setOpen(false);
    setText(null);
  }
  // The create row's own lock (`createCommit`): the list stays live, the row does not.
  const createReason = useCommitReason(createCommit, undefined);
  const createLocked = hasMessage(createReason);

  const selected = useMemo(
    () => (value == null ? null : (options.find((o) => o.value === value) ?? null)),
    [options, value],
  );
  const shown = text ?? selected?.label ?? "";
  // Nothing selected has nothing to clear, and the chevron comes back — the field
  // keeps exactly one trailing control, so the "×" never crowds the value it sits on.
  const showClear = Boolean(clearable && value != null && !inert);

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

  // The create row (`onCreate`), on the query as typed — not lowercased: it becomes a
  // name. Compared against EVERY option, not `matches`: an exact hit anywhere is a
  // record that exists, disabled or not. Restated from `text` rather than derived from
  // `typedQuery`: this value is handed to the caller's `onCreate`, and the React
  // Compiler cannot then keep `matches` memoised on anything it was derived from.
  const createQuery = isPhone
    ? sheetQuery.trim()
    : text !== null && text !== (selected?.label ?? "")
      ? text.trim()
      : "";
  const showCreate = offersCreate(
    onCreate,
    createQuery,
    options.map((o) => o.label),
    createEmptyLabel,
  );
  const createText = createQuery ? labels.create(createQuery) : createEmptyLabel;
  // Every row the keyboard can land on: the options, then the create row — passed over
  // like a disabled option while a write lock holds it.
  const rows: readonly { disabled?: boolean }[] = showCreate
    ? [...matches, { disabled: createLocked }]
    : matches;
  const createIndex = matches.length;

  // Pointer-device only: the phone's rows live in a {@link PickerSheet} whose own
  // search box holds focus, so the field behind it must not claim to be pointing at
  // one of them.
  // A disabled row is never the keyboard's, even if the list changed under it.
  const activeId = !isPhone && isOptionEnabled(rows[active]) ? optionId(active) : undefined;
  useActiveOptionScroll(activeId);

  const close = () => {
    setOpen(false);
    setActive(-1);
    setSheetQuery("");
  };
  const take = (o: ComboOption<V>) => {
    // A `disabled` option is listed, never taken — by any path; nor is anything while
    // the field is locked.
    if (o.disabled || locked) return;
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
  const create = () => {
    if (!onCreate || locked || createLocked) return;
    onCreate(createQuery);
    setText(null);
    close();
  };
  const reconcile = () => {
    // Locked, loose text is dropped rather than judged: nothing reaches `onChange`.
    if (text !== null && !locked) {
      const q = text.trim();
      if (!q) {
        if (value != null) onChange(clearValue);
      } else {
        // A disabled option's label typed out in full is not a way round `disabled`:
        // it is not a hit, so the text reverts like any other non-answer.
        const hits = options.filter(
          (o) => !o.disabled && o.label.toLowerCase() === q.toLowerCase(),
        );
        const ids = new Set(hits.map((h) => h.value));
        if (ids.size === 1 && hits[0].value !== value) onChange(hits[0].value);
      }
    }
    setText(null);
    close();
  };

  // The create row's inside, one for both shells: a "+" (it is an action, not a record),
  // the words, and — while a write lock holds it — the lock's reason as a second line.
  const createRowContent = (
    <>
      <Plus aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{createText}</span>
        {createLocked && (
          <span className="block truncate text-xs font-normal text-[var(--text-placeholder)]">
            {createReason}
          </span>
        )}
      </span>
    </>
  );
  // While locked the field sits in the reason's Tooltip — see Combobox.
  const withLock = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} className="block">
        {box}
      </LockedReason>
    ) : (
      box
    );

  return (
    // `rest` dresses the outer box — a `data-tour` anchor, a test id. Not the NAME,
    // description, invalid or required state: those belong on the <input> below,
    // which is the combobox a reader meets. Spread FIRST, so the field's ARIA and the
    // handlers carrying live #309 and dev#549 cannot be replaced from outside.
    <div {...rest} ref={wrapperRef} className={cn("relative", className)}>
      {/* A real <label for> — see {@link Combobox}; with a "?", in a row after the field. */}
      {label !== undefined && hintParts.labelHint === undefined && (
        <ComboboxFieldLabel htmlFor={fieldId} className={inert ? "opacity-50" : undefined}>
          {label}
        </ComboboxFieldLabel>
      )}
      <EndHintRow {...endHintRowProps("hint" in props, label !== undefined, hintParts.labelHint)}>
        {withLock(
          /* Inner wrapper for chevron centering — same reasoning as Combobox above.
              It is also what the portalled list anchors to.
              Dimmed as a whole when disabled (or locked), the way EntityCombobox dims its
              trigger. FIELD_BASE's grey alone left a disabled picker looking like a
              filled-in one beside the pickers that do dim (the label is not the input's
              `peer`, so it is dimmed by hand above). */
          <div ref={fieldRef} className={cn("relative", inert && "cursor-not-allowed opacity-50")}>
            <input
              ref={ref}
              id={fieldId}
              value={shown}
              placeholder={placeholder}
              // The caller's name, over the <label for> above. Just the label, never
              // "label: value" the way a trigger button has to compose it: an input
              // already exposes its value separately.
              aria-label={ariaLabel}
              role="combobox"
              aria-expanded={open}
              // Required by the role, and the half that was missing: the field said it
              // was expanded and never said what it had expanded (ESLint's
              // `role-has-required-aria-props`, the audit's §a11y).
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-invalid={field.isInvalid || undefined}
              aria-describedby={mergeDescribedBy(field.describedBy, locked && lock.reasonId)}
              aria-required={ariaRequired}
              autoComplete="off"
              // Locked: focusable, `readOnly`, `aria-disabled` — see `lockedKeyDown`.
              disabled={locked ? undefined : disabled}
              readOnly={locked || undefined}
              aria-disabled={locked || undefined}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- a documented prop the caller opts into (off by default); the field never takes focus on its own.
              autoFocus={autoFocus}
              // `inputMode="none"` rather than readOnly, for the same reason Combobox
              // above gives: the sheet carries the keyboard, and a readOnly field would
              // take FIELD_BASE's settled look on a field that is perfectly editable.
              inputMode={isPhone ? "none" : undefined}
              onMouseDown={primaryOnly.onMouseDown}
              onFocus={(e) => {
                // See {@link usePrimaryPressOnly}: a back/forward button lands here on
                // its way to navigating, and neither the list nor the select-all is
                // anything it asked for (live #309 rework). A locked field takes focus to
                // say why, and opens nothing.
                if (primaryOnly.fromAuxButton() || locked) return;
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
                if (locked) return;
                setText(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onKeyDown={(e) => {
                if (locked) return lockedKeyDown(e);
                // Disabled rows are passed over; Up from "nothing highlighted" lands on
                // the first takeable row, as it always landed on row 0. The create row is
                // the last row the arrows reach.
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOpen(true);
                  setActive((i) => stepEnabled(rows, i, 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => (i < 0 ? stepEnabled(rows, -1, 1) : stepEnabled(rows, i, -1)));
                } else if (e.key === "Enter") {
                  if (open && isOptionEnabled(rows[active])) {
                    e.preventDefault();
                    if (active === createIndex && showCreate) create();
                    else take(matches[active]);
                  } else {
                    reconcile();
                  }
                } else if (e.key === "Escape") {
                  setText(null);
                  close();
                } else if (e.key === "Tab") {
                  // Focus is in THIS input and stays there, so the browser's own Tab is
                  // left alone; all that is needed is that the list stop covering what
                  // the user is tabbing to. `reconcile` rather than `close`, because
                  // leaving the field is exactly when loose text has to be judged.
                  reconcile();
                }
                // Home/End stay with the caret — see the note in {@link Combobox}: this
                // field is editable, and its text is what `reconcile` judges.
              }}
              className={cn(
                FIELD_BASE,
                label !== undefined && FIELD_FLOATING_PAD,
                "pe-9",
                field.isInvalid && FIELD_INVALID,
              )}
            />
            {showClear ? (
              <button
                type="button"
                // Out of the tab order, like the clear on `EntityCombobox`: the keyboard
                // already clears this field by selecting its text and deleting, and a
                // second stop between every picker and the next field is a worse trade
                // than the one gesture it saves.
                tabIndex={-1}
                aria-label={labels.clear}
                // preventDefault, exactly as the chevron does: without it the press
                // focuses the input, which on a phone opens the sheet over the field the
                // press was clearing.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setText(null);
                  close();
                  if (!locked) onChange(clearValue);
                }}
                className={cn(
                  "absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-placeholder)]",
                  "hover:text-[var(--text-secondary)]",
                )}
              >
                <X aria-hidden className="size-4" />
              </button>
            ) : (
              <ChevronDown
                aria-hidden
                onMouseDown={(e) => {
                  // Toggle on the chevron without stealing focus from the input — and
                  // not at all on a disabled or locked field, which the input's own
                  // `disabled`/`readOnly` does not stop from here.
                  e.preventDefault();
                  if (!inert) setOpen((o) => !o);
                }}
                className={cn(
                  "absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]",
                  // The box above does the dimming; dimming here too would halve it again.
                  !inert && "cursor-pointer",
                )}
              />
            )}
          </div>,
        )}
      </EndHintRow>
      {label !== undefined && hintParts.labelHint !== undefined && (
        <StaticLabelRow hint={hintParts.labelHint}>
          <ComboboxFieldLabel htmlFor={fieldId} className={cn(LABEL_IN_ROW, inert && "opacity-50")}>
            {label}
          </ComboboxFieldLabel>
        </StaticLabelRow>
      )}
      <FieldCaption parts={hintParts} />
      {field.errorEl}
      {isPhone && (
        <PickerSheet
          open={open && !inert}
          // Closing without choosing keeps the value: `text` was never emptied, so
          // reconcile has nothing to undo — it just puts the label back.
          onClose={reconcile}
          title={sheetTitle ?? label}
          query={sheetQuery}
          onQueryChange={(v) => {
            setSheetQuery(v);
            setActive(-1);
          }}
          searchPlaceholder={searchPlaceholder ?? placeholder ?? labels.search}
          inputRef={sheetInputRef}
          closeLabel={closeLabel}
        >
          <ul id={listboxId} role="listbox">
            {matches.map((o, i) => (
              // Keyed by group AND value, like combobox-core.tsx: an option may
              // deliberately appear twice (see `reconcile`), and a bare value key
              // would collide.
              <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
                {o.group && o.group !== matches[i - 1]?.group && (
                  <li
                    role="presentation"
                    className="px-4 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {o.group}
                  </li>
                )}
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    aria-disabled={o.disabled || undefined}
                    onClick={() => take(o)}
                    className={cn(
                      SHEET_ROW_CLASS,
                      o.value === value && "font-medium",
                      o.disabled && DISABLED_ROW_CLASS,
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              </Fragment>
            ))}
            {showCreate && (
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  // An action, never chosen — see `onCreate`.
                  aria-selected={false}
                  aria-disabled={createLocked || undefined}
                  onClick={create}
                  className={cn(
                    SHEET_ROW_CLASS,
                    CREATE_ROW_CLASS,
                    createLocked && DISABLED_ROW_CLASS,
                  )}
                >
                  {createRowContent}
                </button>
              </li>
            )}
            {/* "Nothing matched" only when there is nothing to do either: with a create
                row the list is not empty, it is offering to fill itself. */}
            {matches.length === 0 && !showCreate && (
              <li className="px-4 py-3 text-sm text-[var(--text-muted)]">{labels.noResults}</li>
            )}
          </ul>
        </PickerSheet>
      )}
      {!isPhone && open && !inert && (matches.length > 0 || showCreate) && (
        <SuggestionList id={listboxId} anchorRef={fieldRef} panelRef={panelRef}>
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
                  className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] first:pt-1"
                >
                  {o.group}
                </li>
              )}
              <li role="presentation">
                <button
                  type="button"
                  id={optionId(i)}
                  // See {@link Combobox}: the role rides the button, `aria-selected`
                  // is the CHOSEN row, and the keyboard's row is the field's
                  // `aria-activedescendant`.
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled || undefined}
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    // mousedown (not click) so the input's blur can't close the
                    // list before the selection registers. Prevented on a disabled
                    // row too, so pressing one leaves the field focused and open.
                    e.preventDefault();
                    take(o);
                  }}
                  onMouseEnter={() => {
                    if (!o.disabled) setActive(i);
                  }}
                  className={cn(
                    rowClass(i === active && !o.disabled),
                    o.disabled && DISABLED_ROW_CLASS,
                    // Indented under its heading, so the hierarchy is readable at a
                    // glance instead of inferred from grey trailing text.
                    o.group && "ps-6",
                    o.value === value && "font-medium",
                  )}
                >
                  {o.label}
                  {o.sublabel && (
                    <span className="ms-2 text-xs text-[var(--text-placeholder)]">
                      {o.sublabel}
                    </span>
                  )}
                </button>
              </li>
            </Fragment>
          ))}
          {showCreate && (
            <li role="presentation">
              <button
                type="button"
                id={optionId(createIndex)}
                role="option"
                // An action, never chosen; whether the keyboard is ON it is the field's
                // `aria-activedescendant`'s to say.
                aria-selected={false}
                aria-disabled={createLocked || undefined}
                tabIndex={-1}
                onMouseDown={(e) => {
                  // mousedown, like the rows above: the input's blur would otherwise
                  // reconcile and close the list before the click landed.
                  e.preventDefault();
                  create();
                }}
                onMouseEnter={() => {
                  if (!createLocked) setActive(createIndex);
                }}
                className={cn(
                  rowClass(active === createIndex && !createLocked),
                  CREATE_ROW_CLASS,
                  createLocked && DISABLED_ROW_CLASS,
                )}
              >
                {createRowContent}
              </button>
            </li>
          )}
        </SuggestionList>
      )}
    </div>
  );
}
