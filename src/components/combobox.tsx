import { Fragment, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { ChevronDown } from "lucide-react";
import { FIELD_BASE, FIELD_FLOATING_PAD, FIELD_INVALID } from "./field-base";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";
import { takeEscape, useDismissLayer } from "../hooks/use-dismiss";
import { isImeEnter } from "../lib/ime";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import { ComboboxFieldLabel, endHintRowProps, useActiveOptionScroll } from "./combobox-core";
import { useKitLocale } from "../i18n/kit-labels";
import { rankMatch } from "../lib/text-match";
import {
  EndHintRow,
  FieldCaption,
  LABEL_IN_ROW,
  LockedReason,
  mergeDescribedBy,
  StaticLabelRow,
  useFieldError,
  useFieldHint,
  useLockReason,
  type DisabledReasonDisplay,
} from "./field-parts";
import type { CommitScope } from "./write-lock";
import { lockedKeyDown, rowClass, SuggestionList, usePrimaryPressOnly } from "./combobox-suggestions";
// The id-keyed sibling lives in inline-entity-combobox.tsx (MOD-9), the list both share
// in combobox-suggestions.tsx; its public names are still this module's.
export { InlineEntityCombobox } from "./inline-entity-combobox";
export type { InlineEntityComboboxProps } from "./inline-entity-combobox";

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
  /** The visible label, a `<label for>` above the field: a ReactNode, as on every kit
   *  field (a string until 0.34, refactor audit 2026-10, API-9). Without one, name the
   *  field with `aria-label`. */
  label?: ReactNode;
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
  commit?: CommitScope;
  /** Where the reason shows — {@link Button}'s `disabledReasonDisplay`: a line under the
   *  field at Large and on a touch screen by default, the tooltip otherwise (DUP-3). */
  disabledReasonDisplay?: DisabledReasonDisplay;
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
   * field whose label is drawn by someone else: a bound field's label above it,
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
    disabledReasonDisplay,
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
  const field = useFieldError(error, invalid, hintParts.describedBy, ariaInvalid);
  const generated = useId();
  const fieldId = id ?? generated;
  // Derived from the GENERATED id, never from `id`: a caller's id is theirs to
  // collide with, and `aria-controls` has to resolve.
  const listboxId = `${generated}-listbox`;
  const optionId = (index: number) => `${generated}-option-${index}`;
  // `backCloses` is the desktop half of live #309: the phone's list IS a
  // {@link PickerSheet}, which registers its own history entry, so registering a
  // second one here would cost two Back presses to dismiss one sheet. Its Escape
  // layer is this field's own, below — the list can be open with nothing to show.
  const isPhone = usePhoneLayout();
  const { open, setOpen, wrapperRef, panelRef } = useDropdown({ backCloses: !isPhone, escapeLayer: false });
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

  const query = typing ? value.trim() : "";
  // Folded as every kit list folds (DUP-5): "zurich" finds Zürich, by the locale's case.
  const locale = useKitLocale();
  const matches = useMemo(() => {
    const seen = new Set<string>();
    const uniq = options.filter((o) => o && !seen.has(o) && seen.add(o));
    let ranked: string[];
    const cap = maxSuggestions ?? (isPhone ? 50 : 8);
    if (!query) {
      ranked = uniq.slice(0, cap);
    } else {
      // The whole name, then prefix matches, then substring matches — most relevant on
      // top (`rankMatch`; a stable sort keeps the pool's order within a rank).
      ranked = uniq
        .map((o) => ({ o, rank: rankMatch(o, query, { locale }) }))
        .filter((x) => x.rank >= 0)
        .sort((a, b) => a.rank - b.rank)
        .map((x) => x.o)
        .slice(0, cap);
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
  }, [options, query, groupBy, maxSuggestions, isPhone, locale]);

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
      <LockedReason lock={lock} display={disabledReasonDisplay} className="block">
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

  // The list is a layer on the Escape stack while it SHOWS (Wave 2, DUP-1): an Escape
  // over an empty "open" list is the dialog's, as it always was. On a phone the sheet
  // is the layer.
  const showing = !isPhone && open && !inert && (matches.length > 0 || Boolean(createRow));
  useDismissLayer(showing, () => {
    setOpen(false);
    setActive(-1);
  });

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
                  // The Enter that confirms an IME composition is the IME's: it picks no
                  // row and submits nothing (BUG-9).
                  if (isImeEnter(e)) return;
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
                  // A list that is SHOWING is the top of the Escape stack, and the key
                  // closes it and stops here: a Modal or FullBleedDialog around the field
                  // otherwise closed with it, form and all (round 0.34 BUG-1). With no
                  // list on screen the key goes on to whoever wants it.
                  if (showing && takeEscape(e)) return;
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
                "absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-placeholder",
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
                  className={cn(SHEET_ROW_CLASS, "font-medium text-brand")}
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
                      className="px-4 pb-0.5 pt-3 text-caption font-semibold uppercase tracking-wide text-muted"
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
                      {optionAdornment ? <span className="truncate-until-large">{o}</span> : o}
                      {optionAdornment?.(o)}
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </PickerSheet>
      )}
      {showing && (
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
                className={cn(rowClass(false), "font-medium text-brand")}
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
                    className="px-3 pb-0.5 pt-2 text-caption font-semibold uppercase tracking-wide text-muted first:pt-1"
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
                      // From Large up the label wraps instead (`truncate-until-large`,
                      // text size §10.17, round 0.34 T1), as the badge-less row does.
                      optionAdornment && "flex items-center justify-between gap-2",
                    )}
                  >
                    {optionAdornment ? <span className="truncate-until-large">{o}</span> : o}
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
