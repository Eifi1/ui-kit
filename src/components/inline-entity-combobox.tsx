// The id-keyed sibling of Combobox. Moved out of combobox.tsx as it was (MOD-9,
// refactor audit 2026-10); combobox still exports `InlineEntityCombobox` and its props.
import { Fragment, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { FIELD_BASE, FIELD_FLOATING_PAD, FIELD_INVALID } from "./field-base";
import { cn } from "../lib/cn";
import { useDropdown } from "./dropdown";
import { takeEscape, useDismissLayer } from "../hooks/use-dismiss";
import { isImeEnter } from "../lib/ime";
import { isQuietFocus } from "../lib/quiet-focus";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import {
  ComboboxFieldLabel,
  DISABLED_ROW_CLASS,
  endHintRowProps,
  GROUP_HEADING_STICKY,
  isOptionEnabled,
  offersCreate,
  stepEnabled,
  useActiveOptionScroll,
  type ComboClearValue,
  type ComboOption,
} from "./combobox-core";
import { DEFAULT_COMBOBOX_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { matchesSearch, rankMatch, searchWords } from "../lib/text-match";
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
  type FieldHelpProps,
} from "./field-parts";
import { hasContent } from "../lib/presence";
import { useCommitReason, type CommitScope } from "./write-lock";
import { lockedKeyDown, rowClass, SuggestionList, usePrimaryPressOnly } from "./combobox-suggestions";

/** {@link InlineEntityCombobox}'s create row over the shared row look: in the brand
 *  colour {@link Combobox}'s own create row wears, with a leading "+" as the panel
 *  pickers' has — an action at the foot of the list, not one more record. */
const CREATE_ROW_CLASS = "flex items-center gap-2 font-medium text-brand";

/** `id` is the INPUT's and `onChange` is the field's — see {@link ComboboxProps}
 *  for why the div's spellings of them are omitted. */
export interface InlineEntityComboboxProps<V extends string | number, C extends ComboClearValue = null>
  extends Omit<ComponentPropsWithoutRef<"div">, "id" | "onChange">,
    FieldHelpProps {
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
  /** The visible label — see {@link Combobox}'s `label` (a ReactNode since 0.34, API-9). */
  label?: ReactNode;
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
   *  whose label is drawn by someone else — a bound field's label;
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
  commit?: CommitScope;
  /** Where the reason shows — {@link Button}'s `disabledReasonDisplay`: a line under the
   *  field at Large and on a touch screen by default, the tooltip otherwise (DUP-3). */
  disabledReasonDisplay?: DisabledReasonDisplay;
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
  createCommit?: CommitScope;
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
    disabledReasonDisplay,
    commit,
    onCreate,
    createLabel,
    createEmptyLabel,
    createCommit,
    invalid,
    error,
    hint,
    help,
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
  const hintParts = useFieldHint(hint, ariaDescribedBy, { help, name: label ?? ariaLabel });
  const field = useFieldError(error, invalid, hintParts.describedBy, ariaInvalid);
  const generated = useId();
  const fieldId = id ?? generated;
  // See the twin above on why these hang off the generated id.
  const listboxId = `${generated}-listbox`;
  const optionId = (index: number) => `${generated}-option-${index}`;
  const isPhone = usePhoneLayout();
  // See the twin above: the phone sheet owns its own Back entry (live #309), and the
  // Escape layer is this field's own.
  const { open, setOpen, wrapperRef, panelRef } = useDropdown({ backCloses: !isPhone, escapeLayer: false });
  const primaryOnly = usePrimaryPressOnly();
  // The field took the tour's quiet focus (§11.8) and has not opened since.
  const quietRef = useRef(false);
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
  const createLocked = hasContent(createReason);

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
  const typedQuery = text !== null && text !== (selected?.label ?? "") ? text.trim() : "";
  const query = isPhone ? sheetQuery.trim() : typedQuery;
  // Folded as every kit list folds (DUP-5): accents off and the locale's case, so
  // "zurich" finds Zürich and, in Turkish, "ı" finds "IRMAK".
  const locale = useKitLocale();
  const matches = useMemo(() => {
    let ranked = options;
    if (query) {
      // Every word of the query, in the label or the sublabel (0.51.4).
      const words = searchWords(query, locale);
      const hit = (o: ComboOption<V>) => matchesSearch(words, [o.label, o.sublabel], locale);
      // The label's whole name or its start first (`rankMatch` 0 and 1), then a match
      // anywhere in the label or the sublabel. Not the group (0.40, kk run 79): with
      // first-letter groups one typed letter matched its whole group.
      const leads = (o: ComboOption<V>) => {
        const rank = rankMatch(o.label, query, { locale });
        return rank === 0 || rank === 1;
      };
      const starts = options.filter(leads);
      const rest = options.filter((o) => !leads(o) && hit(o));
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
  }, [options, query, locale]);

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
  // See the twin above: a layer while the list SHOWS, and Escape puts the label back.
  const showing = !isPhone && open && !inert && (matches.length > 0 || showCreate);
  useDismissLayer(showing, () => {
    setText(null);
    close();
  });
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
  // Both lines wrap from Large up (text size §10.17, round 0.34 T1): the words hold what
  // the reader typed, which an ellipsis would cut.
  const createRowContent = (
    <>
      <Plus aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate-until-large">{createText}</span>
        {createLocked && (
          <span className="block truncate-until-large text-xs font-normal text-placeholder">
            {createReason}
          </span>
        )}
      </span>
    </>
  );
  // While locked the field sits in the reason's Tooltip — see Combobox.
  const withLock = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} display={disabledReasonDisplay} className="block">
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
                // The tour's focus on arrival (§11.8) opens nothing: the list would cover
                // its card (0.50.1). A click, ArrowDown or typing opens it.
                if (isQuietFocus(e.currentTarget)) {
                  quietRef.current = true;
                  return;
                }
                e.currentTarget.select();
                setOpen(true);
                // The sheet has its own input; the field behind it must not also pull up
                // the keyboard and scroll the page under the dialog.
                if (isPhone) sheetInputRef.current?.focus();
              }}
              // After a quiet focus, the person's click on the already-focused field
              // fires no `focus`: the click is their "open" instead.
              onClick={() => {
                if (!quietRef.current || locked) return;
                quietRef.current = false;
                setOpen(true);
              }}
              onBlur={() => {
                quietRef.current = false;
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
                  // An IME's Enter takes nothing, and judges no loose text (BUG-9).
                  if (isImeEnter(e)) return;
                  if (open && isOptionEnabled(rows[active])) {
                    e.preventDefault();
                    if (active === createIndex && showCreate) create();
                    else take(matches[active]);
                  } else {
                    reconcile();
                  }
                } else if (e.key === "Escape") {
                  // A showing list takes the key and stops it — see the twin in
                  // {@link Combobox} (round 0.34 BUG-1).
                  if (showing && takeEscape(e)) return;
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
                  "absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-placeholder",
                  "hover:text-secondary",
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
                  "absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-placeholder",
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
                    className={cn(
                      GROUP_HEADING_STICKY,
                      "px-4 pb-0.5 pt-3 text-caption font-semibold uppercase tracking-wide text-muted",
                    )}
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
              <li className="px-4 py-3 text-sm text-muted">{labels.noResults}</li>
            )}
          </ul>
        </PickerSheet>
      )}
      {showing && (
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
                  className={cn(
                    GROUP_HEADING_STICKY,
                    "px-3 pb-0.5 pt-2 text-caption font-semibold uppercase tracking-wide text-muted first:pt-1",
                  )}
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
                    <span className="ms-2 text-xs text-placeholder">
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
