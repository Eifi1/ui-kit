import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ComponentPropsWithoutRef,
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "../lib/cn";
import { CLIPS_ATTRIBUTE } from "../lib/clipping";
import { DropdownSearchHeader } from "./dropdown";
import { PickerSheet, SHEET_ROW_CLASS } from "./picker-sheet";
import { usePhoneLayout, useRemPx } from "../hooks/use-breakpoint";
import { FLOATING_LABEL_STATIC } from "./field-parts";
import { Spinner } from "./spinner";
import { useAnchorDir } from "./use-anchor-dir";
import { type AnchorRect } from "../hooks/use-anchored-rect";
import { anchoredInline, useAnchoredPanel, viewportSize, type AnchoredPanel } from "../hooks/use-anchored-panel";
import { pressInside, takeEscape, useDismissLayer, useOutsideClick } from "../hooks/use-dismiss";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { isImeEnter } from "../lib/ime";
import { matchesSearch, sameName, searchWords } from "../lib/text-match";
import { DEFAULT_COMBOBOX_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { hasContent } from "../lib/presence";

/**
 * What an entity picker hands `onChange` when it is cleared — `clearValue` on
 * {@link EntityCombobox} and {@link InlineEntityCombobox}. `null` by default.
 *
 * A closed set rather than any value, on purpose: every member is something no
 * option can be (an option's value is a `string | number`, and `""` is never a real
 * id), so the picker can also READ it back — a field whose `value` is the clear
 * value shows as empty, with no clear button, exactly as `null` does. An arbitrary
 * sentinel could collide with an id and would make that read ambiguous.
 *
 * No `undefined`: a prop set to `undefined` is a prop not passed, so it would read as
 * the default and emit `null` — the one outcome the caller had asked not to get.
 */
export type ComboClearValue = null | "";

export interface ComboOption<V extends string | number> {
  value: V;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  /**
   * Section this option belongs to. Where a consumer renders it as a heading with the
   * members indented beneath — {@link InlineEntityCombobox} does — this is a genuine
   * grouping, not decoration: the name appears once per section rather than trailing
   * every row in small grey type, which is barely legible on a phone (feedback #136).
   * The heading stays at the top of the list while its rows scroll beneath it.
   *
   * NOT searched (0.40, kk run 79): a group is where a row is filed, not what it is
   * called — with first-letter groups ("A", "B", … "#"), typing "a" matched every row
   * filed under A. Searching a category's name means putting it in `sublabel`.
   */
  group?: string;
  /**
   * Shown but not takeable: rendered dimmed with `aria-disabled`, passed over by the
   * arrow keys, and a click or Enter on it does nothing. For a row whose existence is
   * the information — a write-locked result, an account that is closed — where
   * leaving it out would read as "there is no such thing". Say WHY in `sublabel`: a
   * hover tooltip is the one explanation a phone cannot show.
   *
   * Honoured by {@link Autocomplete}, {@link InlineEntityCombobox} and the panel
   * pickers ({@link EntityCombobox}, {@link MultiEntityCombobox}); on those an already
   * chosen disabled option stays chosen — the row only refuses to be toggled.
   */
  disabled?: boolean;
}

/** A row the user may take — present and not {@link ComboOption.disabled}. */
export const isOptionEnabled = (o: { disabled?: boolean } | undefined): boolean => o !== undefined && !o.disabled;

/**
 * The next takeable row from `from`, stepping `dir` — what the arrow keys use so a
 * disabled row is passed over, as the APG allows. Stays on `from` at the end of the
 * list (the family's arrows clamp rather than wrap) and answers `-1` when `from` is
 * not a row and there is nothing to step to.
 */
export function stepEnabled(rows: readonly { disabled?: boolean }[], from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < rows.length; i += dir) {
    if (!rows[i].disabled) return i;
  }
  return from >= 0 && from < rows.length ? from : -1;
}

/** `i` when that row is takeable, else the nearest takeable one after it, else
 *  before it, else `-1`. For a highlight that starts on a fixed index (the panel
 *  pickers open on row 0) and must never rest on a disabled row. */
export function settleEnabled(rows: readonly { disabled?: boolean }[], i: number): number {
  if (i < 0 || i >= rows.length) return -1;
  if (!rows[i].disabled) return i;
  const after = stepEnabled(rows, i, 1);
  if (after !== i) return after;
  const before = stepEnabled(rows, i, -1);
  return before !== i ? before : -1;
}

/** Classes a disabled row adds over its normal ones — dimmed, no hover, the
 *  kit's soft-disabled look (`DangerConfirm`, `SignaturePad`). */
export const DISABLED_ROW_CLASS = "cursor-not-allowed opacity-50 hover:bg-transparent";

/**
 * Whether an entity picker offers its create row — one rule for
 * {@link EntityCombobox}, {@link MultiEntityCombobox} and {@link InlineEntityCombobox}.
 *
 * With a query: while the trimmed query names no option exactly — an exact hit is a
 * record the list is already showing, and a second way to "make" it would mint a
 * duplicate. "Exactly" as the list matches, folded by `locale` ({@link sameName}): with
 * plain `toLowerCase`, "cafe" listed Café and offered "Create “cafe”" beside it (refactor
 * audit 2026-10-30, DUP-5). With NO query: only when the caller named the row for that
 * case (`createEmptyLabel`) — a row reading `Create “”` says nothing, and the kit cannot
 * know the noun ("Create cash account") that would make it say something (keksdose G9).
 *
 * `names` is what the query is compared against: the loaded rows for a panel picker
 * (its async list is all it knows), every option for the inline one. `locale`: the
 * provider's, which the list's match folds by; left out, the runtime's.
 */
export function offersCreate(
  onCreate: unknown,
  query: string,
  names: readonly string[],
  createEmptyLabel: string | undefined,
  locale?: string,
): boolean {
  if (!onCreate) return false;
  if (!query) return Boolean(createEmptyLabel);
  return !names.some((n) => sameName(n, query, locale));
}

/**
 * {@link EndHintRow}'s `hint` and `className` for a combobox-family field, keeping the
 * 0.22 rule (keksdose): a field that was passed `hint` at all — even `undefined` — keeps
 * ONE box, so a hint coming and going never rebuilds the control under the cursor.
 *
 * A text hint is a caption after the control and never moved it; the case this covers
 * is the "?" (a {@link FieldHint}) on a field with no label line, which sits at the end
 * edge in a row of its own. Without this the row existed only while the "?" did, and
 * the control was re-parented — remounted, focus and caret lost — each time it came or
 * went. With `hint` passed the row stays, its end slot empty and its gap closed, so
 * nothing on screen moves either.
 */
export function endHintRowProps(
  hintPassed: boolean,
  hasLabel: boolean,
  labelHint: ReactNode | undefined,
): { hint: ReactNode | undefined; className?: string } {
  if (hasLabel) return { hint: undefined };
  if (labelHint !== undefined) return { hint: labelHint };
  return hintPassed ? { hint: null, className: "gap-0" } : { hint: undefined };
}

/**
 * The family's floating label, as a real `<label for>` (lenkbank): the input is then
 * named the way {@link Input}'s is, so `getByLabelText` and any helper that walks
 * `<label htmlFor>` finds it. Same placement and type as {@link FieldLabel}, which
 * stays a `<span>` for the TRIGGER pickers — a `<button>` is labelable, but those
 * compose their own "label: value" name. `pointer-events-none` (from the class)
 * keeps a press on it landing on the field under it, as before.
 */
export function ComboboxFieldLabel({
  htmlFor,
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"label"> & { htmlFor: string }) {
  return (
    <label {...rest} htmlFor={htmlFor} className={cn(FLOATING_LABEL_STATIC, "z-10", className)}>
      {children}
    </label>
  );
}

/**
 * Where a combobox's rows come from, and how a query narrows them. Shared by the
 * trigger pickers ({@link useComboboxCore}) and the inline {@link Autocomplete}, so
 * the two cannot drift in what a failed lookup or a too-short query does.
 */
export interface OptionSourceOptions<V extends string | number> {
  /** Already-loaded options (client-side filtered unless `filter` is false), also
   *  used to resolve labels. */
  options?: ComboOption<V>[];
  /** Async option source, debounced and race-safe; stale responses are ignored,
   *  and a rejection is caught and reported as `failed`. */
  loadOptions?: (query: string) => Promise<ComboOption<V>[]>;
  /** External loading flag, OR-ed with the internal async state. */
  loading?: boolean;
  /**
   * Narrow `options` by the query (label/sublabel substring, folded for search: no case,
   * no accents, the locale's case rules — "zurich" finds Zürich, DUP-5). Default `true`.
   *
   * `false` shows `options` exactly as given, in the given order — for a list the
   * caller has already searched and ranked on a server (Keksdose's geocoder), which a
   * second, client-side substring filter could only get wrong: a provider that
   * matches "Bahnhofstr." to "Bahnhofstrasse" is right, and a label filter would
   * throw that row away.
   */
  filter?: boolean;
  /**
   * Below this many (trimmed) characters nothing is offered and `loadOptions` is not
   * called. Default `0` — the pickers list everything on open. Set it for a source
   * that is costly or rate-limited: one letter against a geocoder matches half a
   * continent, and a request per opened panel is a request nobody asked for.
   */
  minChars?: number;
  /** Quiet time after the last keystroke before `loadOptions` runs. Default 150 ms. */
  debounceMs?: number;
}

export interface OptionSource<V extends string | number> {
  results: ComboOption<V>[];
  busy: boolean;
  /** The last lookup for this query REJECTED. The rows are emptied with it: results
   *  from an earlier query under a failed one would read as the answer to it. */
  failed: boolean;
  /** The query is shorter than `minChars`, so nothing was asked. */
  tooShort: boolean;
}

/**
 * The rows half of a combobox: client-side filtering, or a debounced, race-safe
 * `loadOptions` with its loading and failure states.
 *
 * `active` gates the async side — a closed list asks nothing. Loading is DERIVED
 * ("the settled answer is for a different query") rather than flagged on in the
 * effect, so there is no render between a keystroke and the debounce in which an
 * empty list could claim "No results" for a question still being asked.
 */
export function useOptionSource<V extends string | number>({
  options,
  loadOptions,
  loading,
  filter = true,
  minChars = 0,
  debounceMs = 150,
  query,
  active,
}: OptionSourceOptions<V> & { query: string; active: boolean }): OptionSource<V> {
  const isAsync = typeof loadOptions === "function";
  const tooShort = query.trim().length < minChars;
  const [settled, setSettled] = useState<{
    query: string | null;
    results: ComboOption<V>[];
    failed: boolean;
  }>({ query: null, results: [], failed: false });
  const loadRef = useRef(loadOptions);
  useEffect(() => {
    loadRef.current = loadOptions;
  });
  const reqId = useRef(0);

  useEffect(() => {
    // Bumped even when nothing is asked, so a request still in flight from a longer
    // query cannot land after the user has deleted back below `minChars`.
    const id = ++reqId.current;
    if (!active || !isAsync || tooShort) return;
    const t = setTimeout(
      async () => {
        try {
          const r = await loadRef.current!(query);
          if (reqId.current === id) setSettled({ query, results: r, failed: false });
        } catch {
          // The one path the old `try/finally` had no answer for: the list kept the
          // previous query's rows and said nothing (Keksdose proposal §2).
          if (reqId.current === id) setSettled({ query, results: [], failed: true });
        }
      },
      query ? debounceMs : 0,
    );
    return () => clearTimeout(t);
  }, [query, active, isAsync, tooShort, debounceMs]);

  // Folded as every kit list folds (DUP-5, refactor audit 2026-10): plain `toLowerCase`
  // here meant "zurich" found no Zürich in kastlan's eighteen entity pickers, and the
  // Turkish "ı" no "IRMAK".
  const locale = useKitLocale();
  const clientResults = useMemo(() => {
    if (isAsync) return [];
    const src = options ?? [];
    // Every word of the query, in the label or the sublabel (0.51.4): "migros zürich".
    const words = searchWords(query, locale);
    if (!filter || words.length === 0) return src;
    return src.filter((o) => matchesSearch(words, [o.label, o.sublabel], locale));
  }, [isAsync, options, query, filter, locale]);

  const pending = isAsync && active && !tooShort && settled.query !== query;
  const failed = isAsync && !tooShort && settled.failed;
  return {
    results: tooShort ? [] : isAsync ? (failed ? [] : settled.results) : clientResults,
    busy: Boolean(loading) || pending,
    failed: failed && !pending,
    tooShort,
  };
}

export interface ComboboxCoreOptions<V extends string | number> extends OptionSourceOptions<V> {
  /**
   * Back closes the open anchored list, not the page or the dialog behind it — the rule
   * `useDropdown` keeps for its lists (keksdose live #309 rework). Default `false`, as the
   * entity pickers have always been; CurrencySelect, MultiSelect, GroupedPicker and
   * AmountInput's currency chip, which came over from `useDropdown` (DUP-4), pass `true`
   * so they keep it. On a phone the `PickerSheet` registers Back itself.
   */
  backCloses?: boolean;
}

export interface ComboboxCore<V extends string | number> {
  triggerRef: RefObject<HTMLButtonElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  active: number;
  setActive: Dispatch<SetStateAction<number>>;
  results: ComboOption<V>[];
  busy: boolean;
  /** See {@link OptionSource}. */
  failed: boolean;
  tooShort: boolean;
  minChars: number;
  rect: AnchorRect | null;
  /** Where the dropdown goes, clamped to the visible viewport (feedback #135). */
  placement: AnchoredPanel;
  /** Put an option in the label cache, so {@link ComboboxCore.resolve} still knows a
   *  value the caller just chose after the result list has moved on. */
  rememberOption: (o: ComboOption<V>) => void;
  resolve: (v: V) => ComboOption<V> | null;
  /** Close and hand focus back to the trigger — the keyboard paths only. See
   *  {@link useDropdown} for why a pointer dismissal must not do this. */
  closeToTrigger: () => void;
}

/**
 * Shared plumbing for the entity pickers: open/query/active state, portalled
 * anchoring + outside-click/Escape dismissal, focus-on-open, a debounced
 * race-safe async (or client-side) result list, and a label cache so a selected
 * value still renders its label after the async list has moved on. The single-
 * and multi-value comboboxes render their triggers on top of this and share
 * {@link ComboboxPanel} for the dropdown.
 */
export function useComboboxCore<V extends string | number>({
  options,
  minChars = 0,
  backCloses = false,
  ...source
}: ComboboxCoreOptions<V>): ComboboxCore<V> {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const close = () => setOpen(false);
  // Escape unmounts the panel the user is typing in; without this the browser drops
  // focus on <body>, so the caret disappears and the next Tab restarts at the top of
  // the page. A pointer dismissal deliberately does NOT do this — the press has
  // already decided where focus belongs.
  const closeToTrigger = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  // Placement, not just the anchor rect: the panel has to dodge the on-screen
  // keyboard its own search box summons (feedback #135).
  const placement = useAnchoredPanel(triggerRef, open);
  const rect = placement.rect;
  // Outside-click dismissal belongs to the ANCHORED panel, and only to it. On a
  // phone `ComboboxPanel` renders a full-screen `PickerSheet` instead (live #200),
  // portalled to <body> and carrying its own ways out — the close X, Escape, and
  // Back through `useOverlayHistory` — so there is no outside left to press.
  //
  // Leaving the listener on there was not merely redundant, it was the bug:
  // `panelRef` is attached to the desktop panel alone, so with the sheet up every
  // press inside it answered "outside". While `useOutsideClick` listened for
  // `mousedown` the rows survived by accident — they commit on `onMouseDown` too,
  // and won the race — but `pointerdown` PRECEDES `mousedown`, so the sheet closed
  // at finger-down and the commit landed on an unmounted tree: a tapped row kept the
  // old value, and tapping the search box or the X was equally fatal. `PickerSheet`
  // stops `mousedown` for exactly this reason, but that guard was written for
  // `useDropdown`'s listener and never covered this hook.
  const isPhone = usePhoneLayout();
  useOutsideClick([triggerRef, panelRef], close, open && !isPhone);
  // A layer on the Escape stack while the anchored panel is open (Wave 2, DUP-1), so a
  // dialog around the picker closes only after it (BUG-1). `ComboboxPanel` takes the key
  // where focus is. On a phone the `PickerSheet` is the layer, as it is the outside.
  useDismissLayer(open && !isPhone, closeToTrigger);
  // See `backCloses`. The same close path a pointer dismissal takes.
  useOverlayHistory(backCloses && open && !isPhone, close);

  // Reset the query each time the panel opens, and the highlighted row whenever the
  // visible set changes (a new query, or the panel opening or closing). Adjusted while
  // rendering against the previous values rather than in an effect, so the render that
  // opens the panel already searches for "" and highlights the first row.
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevQuery, setPrevQuery] = useState(query);
  if (open !== prevOpen || query !== prevQuery) {
    const opened = open && !prevOpen;
    setPrevOpen(open);
    setPrevQuery(opened ? "" : query);
    if (opened) setQuery("");
    setActive(0);
  }

  // Focus the search box each time the panel opens.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Debounced, race-safe async search (only when loadOptions is provided) or the
  // client-side filter — see {@link useOptionSource}.
  const { results, busy, failed, tooShort } = useOptionSource<V>({
    ...source,
    options,
    minChars,
    query,
    active: open,
  });

  // Accumulate every option we've seen so a selected value can render its label
  // even after the async list has moved on to other query results.
  const cacheRef = useRef(new Map<V, ComboOption<V>>());
  useEffect(() => {
    for (const o of options ?? []) cacheRef.current.set(o.value, o);
    for (const o of results) cacheRef.current.set(o.value, o);
  }, [options, results]);
  const resolve = (v: V): ComboOption<V> | null =>
    options?.find((o) => o.value === v) ?? cacheRef.current.get(v) ?? null;
  const rememberOption = (o: ComboOption<V>) => {
    cacheRef.current.set(o.value, o);
  };

  return {
    triggerRef,
    panelRef,
    inputRef,
    open,
    setOpen,
    query,
    setQuery,
    active,
    setActive,
    results,
    busy,
    failed,
    tooShort,
    minChars,
    rect,
    placement,
    rememberOption,
    resolve,
    closeToTrigger,
  };
}

// The family's `error` is every field's `useFieldError` (field-parts) since 0.34 — the
// restatement that stood here ignored a form library's `aria-invalid` (DUP-8).

/** The anchored suggestion list's box and rows — one look for {@link Combobox},
 *  {@link InlineEntityCombobox} and {@link Autocomplete}. */
/**
 * A group's heading in a picker list stays at the top of the list while its rows scroll
 * under it (kk run 79 gap 3): with first-letter groups over two hundred payees, the
 * heading is the one thing that says where in the alphabet the thumb is. Opaque — the
 * list's own `bg-surface` — so the rows pass beneath it rather than through it. Shared
 * by every list that heads groups (the panel and the sheet, `Combobox`, `Autocomplete`,
 * `InlineEntityCombobox`).
 */
export const GROUP_HEADING_STICKY = "sticky top-0 z-10 bg-surface";

export const SUGGESTION_LIST_CLASS =
  "max-h-64 overflow-y-auto rounded-md border border-subtle bg-surface py-1 shadow-lg";

// One line at Normal; from Large up a long suggestion wraps and its row grows (text size
// §10.17, round 0.34 T1), like every other option list of the kit.
export const suggestionRowClass = (isActive: boolean) =>
  cn(
    "block w-full truncate-until-large px-3 py-1.5 text-start text-sm text-primary",
    isActive ? "bg-active" : "hover:bg-hover",
  );

/**
 * Keep the option the keyboard is on inside the visible part of the list.
 *
 * `aria-activedescendant` moves a highlight WITHOUT moving focus, which is the whole
 * point of it — and the cost is that the browser scrolls nothing on its own. In a
 * panel capped at a few hundred pixels over an account list two hundred long, Down
 * walked the highlight straight out of the box and the list sat still.
 *
 * Optional-called because jsdom does not implement `scrollIntoView`: three consumers
 * run this component in their own suites, and a picker that throws there is a worse
 * trade than a list that does not scroll in a test.
 */
export function useActiveOptionScroll(activeId: string | undefined): void {
  useEffect(() => {
    if (!activeId) return;
    document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);
}

/** The anchored panel's least width, in rem: 220 px at Normal (§3.2). */
const PANEL_MIN_REM = 13.75;

/** The room the anchored panel keeps from either edge of the glass, in px —
 *  `anchoredInline`'s default. */
const PANEL_EDGE = 8;

/**
 * How wide the anchored panel is. The phone sheet is the screen's width whatever this
 * says.
 */
export interface ComboboxPanelWidth {
  /** The least width, in rem — never under the trigger's own. Default 13.75 (220 px at
   *  Normal, §3.2). */
  minRem?: number;
  /**
   * As wide as the rows make it (`max-content`), between the least width and `maxRem`,
   * instead of exactly the least — measured, so the clamp to the glass still knows it.
   * CurrencySelect's list grows to show the full currency names (feedback #308);
   * MultiSelect's rows to show their hints (keksdose #147). A `w-*` class in the panel's
   * `className` does not apply: the panel is portalled to <body>, where `w-full` would be
   * the screen.
   */
  fit?: boolean;
  /** With `fit`, the most it grows to, in rem. Default: the glass. */
  maxRem?: number;
}

export interface ComboboxPanelProps<V extends string | number> extends ComponentPropsWithoutRef<"div"> {
  core: ComboboxCore<V>;
  /** What the trigger's `aria-controls` names. Owned by the component that renders
   *  the trigger, not by the core: one id has to reach both, and only one of them
   *  can be the origin. */
  listboxId: string;
  /** Default: `combobox.search` from the {@link UiKitProvider}, else English. */
  searchPlaceholder?: string;
  /** Default: `combobox.noResults` from the {@link UiKitProvider}, else English. */
  emptyLabel?: string;
  multi?: boolean;
  isSelected: (v: V) => boolean;
  onChoose: (o: ComboOption<V>) => void;
  showCreate: boolean;
  onCreate: () => void;
  createContent: ReactNode;
  /**
   * The create row is shown but not takeable, and this says why — the lock's reason
   * when the picker's `createCommit` meets a locked {@link WriteLockProvider}. Rendered
   * as the row's second line rather than a tooltip, as {@link ComboOption.disabled}
   * asks of every disabled row: a hover is the one explanation a phone cannot show.
   */
  createDisabledReason?: ReactNode;
  /** What the sheet calls itself on a phone — the field's label. Ignored on
   *  desktop, where the panel sits under the field that already says it. */
  sheetTitle?: ReactNode;
  closeLabel?: string;
  /** Default: `combobox.loadError` from the {@link UiKitProvider}, else English. */
  loadErrorLabel?: string;
  /**
   * What a row shows in place of its label and sublabel — for a row that says more than
   * two strings: CurrencySelect's symbol, code and name side by side. The option's
   * `icon`, the multi checkbox and the check mark stay the panel's. Its text is the
   * option's accessible name, so separate the parts with a space.
   */
  renderOption?: (o: ComboOption<V>) => ReactNode;
  /** Controls between the search box and the list, in the anchored panel and the phone
   *  sheet alike — MultiSelect's "Select all" and "Clear". */
  toolbar?: ReactNode;
  /** See {@link ComboboxPanelWidth}. */
  width?: ComboboxPanelWidth;
  /** Which of the trigger's edges the anchored panel hangs from, by reading direction.
   *  Default `start`; `end` grows the panel toward the start, so a field with content
   *  after it is not pushed past the page (CurrencySelect, feedback #308). */
  align?: "start" | "end";
  /**
   * Lay the rows out in columns, one block per `group`, with the group's name above it —
   * GroupedPicker's panel (feedback #267/#276): a large grouped set reads as a sheet of
   * short lists side by side rather than one long one. Each block is a `role="group"`
   * named by its heading. The arrow keys walk the rows in reading order, down each
   * column. The phone sheet keeps one column with headings.
   */
  columns?: boolean;
}

/**
 * The portalled dropdown (search header + result rows + optional create row)
 * shared by the single- and multi-value comboboxes. Start-aligned to the trigger
 * and sized to its width; `multi` swaps the trailing check for a leading
 * checkbox. `onChoose` decides whether to close (single) or stay open (multi).
 *
 * ## The ARIA, which is `CommandPalette`'s
 *
 * This rendered a `role="listbox"` of `role="option"` rows and stopped there, so a
 * reader was handed a text box and silence: the highlight the arrow keys move lived
 * only in a background colour, and nothing tied the box being typed in to the list
 * being filtered. `CommandPalette` has had the whole model since it was written —
 * `aria-controls` from the field to the list, `aria-activedescendant` naming the row
 * the keyboard is on — and it was the only thing in the package that did.
 *
 * Two distinct states, deliberately not conflated:
 *   - `aria-selected` is CHOSEN. It is the check mark, and in `multi` the checkbox.
 *   - `aria-activedescendant` is where the KEYBOARD is. Announcing that as selected
 *     would tell a reader that the row they are merely passing over is the answer.
 *
 * `role="option"` sits on the `<button>`, not on the `<li>` around it, for the same
 * reason it does in `CommandPalette`: an option may not contain a separately
 * focusable control, and the button is the thing a pointer presses. The rows are
 * `tabIndex={-1}` because focus never leaves the search box — that is what
 * `aria-activedescendant` is FOR.
 */
export function ComboboxPanel<V extends string | number>({
  core,
  listboxId,
  searchPlaceholder,
  emptyLabel,
  multi,
  isSelected,
  onChoose,
  showCreate,
  onCreate,
  createContent,
  createDisabledReason,
  sheetTitle,
  closeLabel,
  loadErrorLabel,
  renderOption,
  toolbar,
  width,
  align = "start",
  columns,
  className,
  style,
  ...rest
}: ComboboxPanelProps<V>) {
  const createLocked = hasContent(createDisabledReason);
  const {
    rect,
    placement,
    panelRef,
    inputRef,
    query,
    setQuery,
    results,
    busy,
    failed,
    tooShort,
    active,
    setActive,
    closeToTrigger,
  } = core;
  // The phone gets a full-screen sheet instead of an anchored panel (live #200).
  // Same core, same results, same handlers — only the container differs, so the
  // two presentations cannot drift in what they offer.
  const isPhone = usePhoneLayout();
  // Every row the keyboard can land on, the create row included — passed over, like a
  // disabled option, while a write lock holds it.
  const rows: readonly { disabled?: boolean }[] = showCreate ? [...results, { disabled: createLocked }] : results;
  const rowCount = rows.length;
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  // The core opens on row 0 and knows nothing of `disabled`; the highlight is settled
  // HERE, derived, so it can never rest on a row that cannot be taken — whatever the
  // async list turned out to hold.
  const current = settleEnabled(rows, active);
  const activeId = current >= 0 ? optionId(current) : undefined;
  useActiveOptionScroll(activeId);
  // The consumers resolve their own props against the provider already; this is
  // for the loading row, which no consumer names, and for a caller that renders the
  // panel directly and leaves the two optional strings out.
  const labels = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS);
  // Portalled to <body>, the panel leaves the subtree its `dir` came from — so the
  // direction is read off the trigger and put back on the panel below.
  const dir = useAnchorDir(core.triggerRef, core.open);
  const remPx = useRemPx();
  // A `fit` panel's measured width — what it takes to keep it on the glass (see
  // `ComboboxPanelWidth.fit`). Observed rather than read once: the rows change under the
  // search, and a filtered list of short names is a narrower panel. `null` where nothing
  // is laid out (jsdom), and the least width is used.
  const fit = width?.fit === true && !isPhone;
  const [fitWidth, setFitWidth] = useState<number | null>(null);
  const placed = core.open && rect !== null;
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!fit || !placed || !el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const measured = el.getBoundingClientRect().width;
      setFitWidth(measured > 0 ? measured : null);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, placed, panelRef]);

  // The WAI-ARIA APG's listbox keyboard, in full: Up/Down step, Home/End jump, Enter
  // commits, Tab leaves, Escape closes. On the panel's search box — in the anchored
  // panel and, through `onSearchKeyDown`, in the phone sheet's header (BUG-5).
  const onKeyDown = (e: ReactKeyboardEvent) => {
    // Escape goes to the top of the kit's Escape stack — this list, which opened over
    // any dialog it sits in — and stops HERE (round 0.34 BUG-1, Wave 2 DUP-1). The
    // panel's events travel up the React tree through that dialog, portal or not, and
    // one press used to close the dialog and throw the form away, list still open.
    if (takeEscape(e)) return;
    // The Enter that confirms an IME composition is the IME's (BUG-9).
    if (isImeEnter(e)) return;
    // Disabled rows are passed over (`stepEnabled`), and each step starts from the
    // SETTLED highlight, not the raw index, so the first Down from a disabled row 0
    // goes to the row after the one already shown as highlighted.
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(stepEnabled(rows, current, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(current < 0 ? -1 : stepEnabled(rows, current, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(stepEnabled(rows, -1, 1));
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(stepEnabled(rows, rowCount, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (current < 0) return;
      if (current < results.length) onChoose(results[current]);
      else if (showCreate && !createLocked) onCreate();
    } else if (e.key === "Tab" && !isPhone) {
      // The panel is PORTALLED to <body>, so the browser's own Tab would move from
      // here to whatever follows the portal — i.e. off the end of the document. The
      // trade is one extra Tab (trigger, then onward) against never stranding focus
      // at the bottom of the page. The phone sheet is a dialog, and its trap keeps Tab.
      e.preventDefault();
      closeToTrigger();
    }
  };

  // What the list holds, said in ONE place that is both on screen and a polite
  // live region. Focus stays in the search box, so the list changing under it was
  // silent — a reader typed and heard nothing back, and a failed lookup was the same
  // silence as a slow one. Outside the listbox, which may own only options.
  //
  // Three different empties, and only one of them is "nothing matched": a lookup
  // that failed must not claim there is nothing to find, and a query under
  // `minChars` was never asked. With rows showing, the count is for the reader only.
  const message: ReactNode =
    busy && results.length === 0 ? (
      // The ellipsis is the picture; the words are for a reader, who otherwise met
      // an empty-looking list with a lone "…" in it — or, in most readers, nothing
      // at all, since punctuation alone is skipped.
      <>
        <span aria-hidden>…</span>
        <span className="sr-only">{labels.loading}</span>
      </>
    ) : busy ? (
      // Loading with the LAST query's rows still up. This was `null`, so a refetch —
      // a new query, or a caller's `loading` while it reloads — looked exactly like a
      // finished list: rows that were about to be replaced, with nothing saying so.
      // A line of its own under the rows, in words, so it reads without the spinner.
      <span className="flex items-center gap-2">
        <Spinner label={null} className="size-3.5 border" />
        {labels.loading}
      </span>
    ) : results.length === 0 && !showCreate ? (
      failed ? (
        (loadErrorLabel ?? labels.loadError)
      ) : tooShort ? (
        labels.minChars(core.minChars)
      ) : (
        (emptyLabel ?? labels.noResults)
      )
    ) : null;
  // `relative` so the sr-only text has a local containing block (see
  // sr-only-containment.test).
  const announcement = (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative",
        message !== null && cn("py-2 text-sm", isPhone ? "px-4" : "px-3"),
        failed ? "text-danger" : "text-muted",
      )}
    >
      {message ?? (results.length > 0 && <span className="sr-only">{labels.resultCount(results.length)}</span>)}
    </div>
  );

  if (!core.open || typeof document === "undefined") return null;

  // One option row — the same in both containers and in both layouts.
  const optionRow = (o: ComboOption<V>, i: number) => {
    const selected = isSelected(o.value);
    return (
      <li role="presentation">
        <button
          type="button"
          id={optionId(i)}
          role="option"
          aria-selected={selected}
          aria-disabled={o.disabled || undefined}
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault();
            if (!o.disabled) onChoose(o);
          }}
          onMouseEnter={() => {
            if (!o.disabled) setActive(i);
          }}
          className={cn(
            isPhone
              ? SHEET_ROW_CLASS
              : columns
                ? // A cell of a column (GroupedPicker): tighter, so four columns fit.
                  "flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-start text-sm"
                : "flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm",
            // The row the arrows are on shows it on a phone too: the sheet takes
            // the keyboard (BUG-5), and a tablet or a desktop at Large has one.
            o.disabled ? DISABLED_ROW_CLASS : i === current ? "bg-active" : !isPhone && "hover:bg-hover",
            // After SHEET_ROW_CLASS, so its hover is the one cancelled.
            o.disabled && isPhone && DISABLED_ROW_CLASS,
          )}
        >
          {multi && (
            <span
              // The checkbox is a PICTURE of `aria-selected` above, so a reader
              // that met both would be told twice.
              aria-hidden
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border",
                selected ? "border-[var(--bg-inverse)] bg-inverse text-inverse" : "border-strong bg-surface",
              )}
            >
              {selected && <Check className="size-3" />}
            </span>
          )}
          {o.icon && <span className="shrink-0">{o.icon}</span>}
          {renderOption ? (
            <span className="flex min-w-0 flex-1 items-center gap-2">{renderOption(o)}</span>
          ) : (
            /* Label and sublabel wrap from Large up (text size §10.17, round 0.34 T1). */
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate-until-large text-primary", columns && selected && "font-medium")}>
                {o.label}
              </span>
              {o.sublabel && <span className="block truncate-until-large text-xs text-placeholder">{o.sublabel}</span>}
            </span>
          )}
          {!multi && selected && <Check className="size-4 shrink-0 text-brand" />}
        </button>
      </li>
    );
  };

  const createRow = showCreate && (
    <li role="presentation">
      <button
        type="button"
        id={optionId(results.length)}
        role="option"
        // Never chosen — it is an action, and it disappears the moment it has
        // been taken. Whether the keyboard is ON it is `aria-activedescendant`'s
        // job to say.
        aria-selected={false}
        aria-disabled={createLocked || undefined}
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!createLocked) onCreate();
        }}
        onMouseEnter={() => {
          if (!createLocked) setActive(results.length);
        }}
        className={cn(
          isPhone ? SHEET_ROW_CLASS : "flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm",
          "text-secondary",
          createLocked ? DISABLED_ROW_CLASS : current === results.length ? "bg-active" : !isPhone && "hover:bg-hover",
          // After SHEET_ROW_CLASS, so its hover is the one cancelled.
          createLocked && isPhone && DISABLED_ROW_CLASS,
        )}
      >
        <Plus className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate-until-large">{createContent}</span>
          {createLocked && (
            <span className="block truncate-until-large text-xs text-placeholder">{createDisabledReason}</span>
          )}
        </span>
      </button>
    </li>
  );

  // In columns, a block per run of one group; `results` keeps its source order, so a
  // run is the rows up to the next change of group.
  const blocks: { group: string; rows: { o: ComboOption<V>; i: number }[] }[] = [];
  if (columns && !isPhone) {
    results.forEach((o, i) => {
      const group = o.group ?? "";
      const last = blocks[blocks.length - 1];
      if (last && last.group === group) last.rows.push({ o, i });
      else blocks.push({ group, rows: [{ o, i }] });
    });
  }

  const list = (
    <ul
      id={listboxId}
      role="listbox"
      aria-multiselectable={multi}
      // The rows are provisional while a lookup is in flight — whether or not the
      // previous query's are still showing.
      aria-busy={busy || undefined}
      // It scrolls, and says so where jsdom can see it (see `CLIPS_ATTRIBUTE`): a
      // Tooltip in a row then portals out in a test exactly as it does in the
      // browser, instead of joining the option's accessible name (keksdose E8).
      {...{ [CLIPS_ATTRIBUTE]: "" }}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        columns && !isPhone ? "columns-2 gap-4 p-3 md:columns-3 xl:columns-4" : "py-1",
        isPhone && "flex-none",
      )}
    >
      {columns && !isPhone
        ? blocks.map((block) => (
            // A column block: its heading is a picture of the group's name, which the
            // `role="group"` carries for a reader — the listbox may own options and
            // groups, and a heading of loose text in it is neither.
            <li key={`${block.group}|${block.rows[0].i}`} role="presentation" className="mb-3 break-inside-avoid">
              {block.group && (
                <div aria-hidden className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {block.group}
                </div>
              )}
              <ul role="group" aria-label={block.group || undefined} className="space-y-0.5">
                {block.rows.map(({ o, i }) => (
                  <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>{optionRow(o, i)}</Fragment>
                ))}
              </ul>
            </li>
          ))
        : results.map((o, i) => {
            // One heading per group rather than a grey suffix on every row (#136), and
            // the thing the native <select>'s <optgroup> used to give the account
            // picker for free (live #200). `results` keeps its source order, so a
            // boundary is simply "different from the row above".
            const startsGroup = o.group != null && o.group !== results[i - 1]?.group;
            return (
              // Keyed by group AND value: an option may deliberately appear twice —
              // Keksdose repeats recently-used categories in a "Recent" group at the
              // top (live #203) — and a bare value key would collide.
              <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
                {startsGroup && (
                  <li
                    role="presentation"
                    className={cn(
                      GROUP_HEADING_STICKY,
                      "font-semibold uppercase tracking-wide text-muted",
                      isPhone ? "px-4 pb-1 pt-3 text-xs" : "px-3 pb-0.5 pt-2 text-caption first:pt-1",
                    )}
                  >
                    {o.group}
                  </li>
                )}
                {optionRow(o, i)}
              </Fragment>
            );
          })}
      {createRow}
    </ul>
  );

  // The search box is NAMED, not only prompted: a placeholder is gone the moment a
  // character is typed, and jsdom's readers and some real ones never took it for a name
  // (BUG-12: GroupedPicker's filter had "no name beyond its placeholder").
  const searchText = searchPlaceholder ?? labels.search;

  if (isPhone) {
    return (
      <PickerSheet
        // First, so the sheet's own props below win: `rest` is typed as div
        // attributes, and the DOM's `title` is a tooltip string where the sheet's is
        // its heading — one name, two meanings, and the sheet's is the one the caller
        // asked for.
        {...rest}
        className={className}
        style={style}
        open
        onClose={() => core.setOpen(false)}
        title={sheetTitle}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={searchText}
        searchLabel={searchText}
        inputRef={inputRef}
        closeLabel={closeLabel}
        // The sheet's search box is in its HEADER, outside the list: the keys go to it
        // there, and it names the list and the active row (BUG-5). A div around the list
        // used to catch them, and never did — focus is in the box, not in the list.
        onSearchKeyDown={onKeyDown}
        listboxId={listboxId}
        activeId={activeId}
        // A multi list stays open as rows are ticked, so the sheet needs a way out
        // that is not the X in its corner: the kit's sticky "Done" (keksdose #412).
        // A single pick closes the sheet itself.
        done={multi}
      >
        {toolbar}
        <div className="relative">
          {list}
          {announcement}
        </div>
      </PickerSheet>
    );
  }

  if (!rect) return null;
  // The panel hangs from the trigger's START edge (or, `align="end"`, its end): its left
  // in a left-to-right form, its right in a right-to-left one, at least 13.75rem wide
  // (220 px at Normal, in rem so its text keeps its room at Large, §3.2; `width.minRem`)
  // and never wider than the glass — and clamped to the glass, which in a left-to-right
  // form it never was (Wave 2, DUP-7). It is placed by the edge it hangs from, so a `fit`
  // panel grows away from the trigger's edge before its width is measured; a box hung by
  // its `right` is measured from inside any scrollbar, as the glass's width is.
  const glass = viewportSize().width - 2 * PANEL_EDGE;
  const least = Math.min(Math.max(rect.width, (width?.minRem ?? PANEL_MIN_REM) * remPx), glass);
  const most = Math.max(least, Math.min(width?.maxRem !== undefined ? width.maxRem * remPx : glass, glass));
  const panelWidth = fit ? Math.min(Math.max(fitWidth ?? least, least), most) : least;
  const at = anchoredInline(rect, panelWidth, { dir, align, edge: PANEL_EDGE });
  const inline = (dir === "rtl") === (align === "start") ? { right: at.right } : { left: at.left };

  return createPortal(
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- never focused
       itself: it catches the listbox keys bubbling from the search <input> inside it,
       which holds focus while the panel is open. */
    <div
      // Spread FIRST: `onKeyDown` below is the listbox keyboard (Up/Down/Home/End/
      // Enter/Tab) and the placement is measured rather than chosen, so neither is a
      // caller's to replace by accident — while a `data-*` anchor or an
      // `aria-describedby` has nothing to collide with.
      {...rest}
      ref={panelRef}
      // A kit layer, for the tour's layer order (0.50, docs/tours-harmonization.md §11.6).
      data-kit-layer=""
      dir={dir}
      onKeyDown={onKeyDown}
      // A press in a panel opened from a row is inside this list for the core's outside
      // press, though portalled elsewhere (dev#623).
      onPointerDownCapture={(e) => {
        rest.onPointerDownCapture?.(e);
        pressInside(panelRef)?.(e);
      }}
      // `placement` keeps the panel inside the region actually on screen: on a phone
      // the search box below pulls up the keyboard, and a panel pinned under a
      // low trigger would otherwise sit entirely behind it (feedback #135). Flipped
      // above, it hangs from its bottom edge, so a list shorter than its cap still meets
      // the trigger (keksdose K1); the edge not in use is cleared, a caller's included.
      style={{
        ...style,
        position: "fixed",
        top: placement.above ? undefined : placement.top,
        bottom: placement.above ? placement.bottom : undefined,
        ...inline,
        // A `fit` panel takes its width from its rows between the two bounds; any other
        // is exactly the least width.
        ...(fit ? { width: "max-content", minWidth: least, maxWidth: most } : { width: panelWidth }),
        maxHeight: placement.maxHeight,
      }}
      className={cn("z-50 flex flex-col rounded-md border border-subtle bg-surface shadow-lg", className)}
    >
      <DropdownSearchHeader
        query={query}
        onQueryChange={setQuery}
        inputRef={inputRef}
        placeholder={searchText}
        aria-label={searchText}
        // Focus is in this box while the list is up, so this is what has to name the
        // list and the row the arrows are on.
        listboxId={listboxId}
        activeId={activeId}
      />
      {toolbar}
      {/* One list, two containers: the desktop panel and the phone sheet render
          the same rows through the same handlers (live #200). */}
      {list}
      {announcement}
    </div>,
    document.body,
  );
}
