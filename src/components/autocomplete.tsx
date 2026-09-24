import { Fragment, forwardRef, useId, useRef, useState } from "react";
import type {
  ComponentPropsWithoutRef,
  ForwardedRef,
  ReactElement,
  ReactNode,
  RefAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { FieldLabel, FIELD_BASE, FIELD_FLOATING_PAD, FIELD_INVALID, Spinner } from "./ui";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import {
  useActiveOptionScroll,
  useComboboxFieldError,
  useOptionSource,
  type ComboOption,
} from "./combobox-core";
import { DEFAULT_COMBOBOX_LABELS, useKitLabels } from "../i18n/kit-labels";

/**
 * `value`/`onChange` are the TEXT's, and `onSelect` is "a suggestion was taken" —
 * not the DOM's text-selection event — so the input's own spellings of those three
 * are omitted. Everything else reaches the `<input>`, the way it does on {@link Input}.
 */
export interface AutocompleteProps<V extends string | number = string>
  extends Omit<
    ComponentPropsWithoutRef<"input">,
    "value" | "defaultValue" | "onChange" | "onSelect" | "children" | "type"
  > {
  /** What is in the field. Controlled, and never reset by the component: opening,
   *  closing and a failed lookup all leave it exactly as typed. */
  value: string;
  /** Every keystroke — and, with `fillOnSelect`, the label of a taken suggestion. */
  onChange: (text: string) => void;
  /** Suggestions the caller already has (e.g. from its own query hook). Narrowed by
   *  the text unless `filter={false}`. */
  options?: ComboOption<V>[];
  /** Or: fetch them. Debounced (`debounceMs`), race-safe, only at `minChars` and up,
   *  never while the field is idle; a rejection shows `loadErrorLabel` and empties
   *  the list rather than leaving the previous text's rows under it. */
  loadOptions?: (query: string) => Promise<ComboOption<V>[]>;
  /** Narrow `options` by label/sublabel substring. Default `true`. Pass `false` for
   *  a list a server has already searched and ranked — it is shown as given. */
  filter?: boolean;
  /** External loading flag (a caller-side fetch), OR-ed with `loadOptions`'. */
  loading?: boolean;
  /** Below this many characters nothing is offered or fetched. Default 1: an empty
   *  field asks nothing — focusing it is not a search. */
  minChars?: number;
  /** Quiet time before `loadOptions` runs. Default 300 ms — an ordinary typist's
   *  inter-key interval is 150–250 ms, so the pickers' 150 fires on nearly every
   *  letter, which a rate-limited geocoder cannot afford. */
  debounceMs?: number;
  /** A suggestion was taken (click, or Enter on the highlighted row). */
  onSelect?: (option: ComboOption<V>) => void;
  /**
   * Put the taken suggestion's label into the field (`onChange(label)`). Default
   * `true` — the free-text case, where the text IS the value and a suggestion only
   * completes it (an address field). Pass `false` where taking a row is an ACTION
   * and the field is only the search that found it; the text then stays as typed.
   */
  fillOnSelect?: boolean;
  /** A floating label, as on {@link Combobox}. Names the field (`aria-labelledby`)
   *  unless an `aria-label` is given. */
  label?: ReactNode;
  /** Leading decoration inside the field (a pin, a magnifier). Decorative: the
   *  label names the field. */
  icon?: ReactNode;
  /** Required and unanswered — {@link FIELD_INVALID}. */
  invalid?: boolean;
  /** What is wrong with the VALUE, as {@link Input}'s `error`: under the field, on
   *  its `aria-describedby`, implies `invalid`. Not a failed lookup — that is
   *  `loadErrorLabel`, shown in the list. */
  error?: ReactNode;
  /**
   * The caller's own line in the list, replacing the automatic one (loading / failed
   * / no results). For what only the caller knows: "offline", "the address service
   * is switched off", a privacy note, the hint a caller-fetched list needs below its
   * own minimum. While set, the list opens even with no rows. Announced politely.
   */
  status?: ReactNode;
  /** Default: `combobox.noResults` from the {@link UiKitProvider}, else English. */
  emptyLabel?: string;
  /** Default: `combobox.loadError`. */
  loadErrorLabel?: string;
  /** Classes for the `<input>` itself; `className` styles the wrapper. */
  inputClassName?: string;
}

function AutocompleteInner<V extends string | number = string>(
  {
    value,
    onChange,
    options,
    loadOptions,
    filter,
    loading,
    minChars = 1,
    debounceMs = 300,
    onSelect,
    fillOnSelect = true,
    label,
    icon,
    invalid,
    error,
    status,
    emptyLabel,
    loadErrorLabel,
    className,
    inputClassName,
    id,
    disabled,
    onKeyDown,
    onFocus,
    onBlur,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...rest
  }: AutocompleteProps<V>,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  // Off the GENERATED id: a caller's `id` is theirs to collide with.
  const listboxId = `${generated}-listbox`;
  const labelId = `${generated}-label`;
  const optionId = (index: number) => `${generated}-option-${index}`;
  const fieldRef = useRef<HTMLDivElement>(null);
  const labels = useKitLabels("combobox", DEFAULT_COMBOBOX_LABELS, {
    noResults: emptyLabel,
    loadError: loadErrorLabel,
  });
  const field = useComboboxFieldError(error, invalid, ariaDescribedBy);

  /** The user's intent: the field is focused and the list has not been dismissed.
   *  Whether anything SHOWS is decided below, from what there is to show. */
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const live = open && !disabled;
  const { results, busy, failed, tooShort } = useOptionSource<V>({
    options,
    loadOptions,
    loading,
    filter,
    minChars,
    debounceMs,
    query: value,
    active: live,
  });

  const hasStatus = status !== undefined && status !== null && status !== false && status !== "";
  // The visible line under the rows. Nothing below `minChars` unless the caller has
  // something to say — an empty field opening a box that says "type more" is noise.
  const statusLine: ReactNode = hasStatus
    ? status
    : tooShort
      ? null
      : busy && results.length === 0
        ? labels.loading
        : failed
          ? labels.loadError
          : !busy && results.length === 0
            ? labels.noResults
            : null;
  const expanded = live && (results.length > 0 || statusLine !== null);
  const activeId =
    expanded && active >= 0 && active < results.length ? optionId(active) : undefined;
  useActiveOptionScroll(activeId);
  const { rect, top, maxHeight } = useAnchoredPanel(fieldRef, expanded, { preferredHeight: 256 });

  const close = () => {
    setOpen(false);
    setActive(-1);
  };
  const take = (o: ComboOption<V>) => {
    if (fillOnSelect) onChange(o.label);
    onSelect?.(o);
    close();
  };

  const hasLabel = label !== undefined;
  // The caller's name wins; else the floating label, by reference so a non-string
  // label still names the field.
  const labelledBy =
    ariaLabel === undefined ? (ariaLabelledBy ?? (hasLabel ? labelId : undefined)) : undefined;

  return (
    // `relative`: the floating label and the live region's `sr-only` both need a
    // local containing block.
    <div className={cn("relative", className)}>
      {hasLabel && <FieldLabel id={labelId}>{label}</FieldLabel>}
      <div ref={fieldRef} className="relative">
        {icon && (
          <span
            aria-hidden
            className="pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2 text-[var(--text-muted)] [&>svg]:size-4"
          >
            {icon}
          </span>
        )}
        <input
          {...rest}
          ref={ref}
          id={fieldId}
          type="text"
          value={value}
          disabled={disabled}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          // Required by the role, and set while closed too, as on the siblings.
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          aria-invalid={field.isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={field.describedBy}
          autoComplete="off"
          onFocus={(e) => {
            onFocus?.(e);
            // A seeded field (keksdose's `initialQuery`) is looked up as it is
            // focused; an empty one asks nothing, because of `minChars`.
            setOpen(true);
          }}
          onBlur={(e) => {
            onBlur?.(e);
            close();
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            // An Escape that closes the OPEN list is the list's, and is consumed before
            // the caller sees it. A caller whose Escape means "close the panel" (keksdose's
            // address search) otherwise closed the whole panel when the user only meant
            // to dismiss the suggestions — the opposite of what the docs promised.
            if (e.key === "Escape" && expanded) {
              e.preventDefault();
              e.stopPropagation();
              close();
              return;
            }
            onKeyDown?.(e);
            if (e.defaultPrevented) return;
            const last = results.length - 1;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) setOpen(true);
              else setActive((i) => Math.min(i + 1, last));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) setOpen(true);
              // From "nothing highlighted", Up goes to the bottom, as the APG has it.
              else setActive((i) => (i < 0 ? last : Math.max(i - 1, 0)));
            } else if (e.key === "Enter") {
              // No row highlighted: the text is the answer, and a form's own submit
              // is left alone.
              if (expanded && activeId) {
                e.preventDefault();
                take(results[active]);
              }
            } else if (e.key === "Tab") {
              close();
            }
          }}
          className={cn(
            FIELD_BASE,
            hasLabel && FIELD_FLOATING_PAD,
            icon ? "ps-8" : undefined,
            busy && "pe-9",
            field.isInvalid && FIELD_INVALID,
            inputClassName,
          )}
        />
        {busy && live && (
          // Decorative: the live region below already says "Loading…".
          <span className="pointer-events-none absolute end-2.5 top-1/2 flex -translate-y-1/2">
            <Spinner label={null} className="h-4 w-4" />
          </span>
        )}
      </div>
      {field.errorEl}
      {/* The live region, kept mounted so a change IS an announcement: focus stays
          in the field, and without it a reader typed into a geocoder and heard only
          their own letters. The panel's visible line is aria-hidden in favour of
          this, which also carries the row count the eye reads off the list. */}
      <div role="status" aria-live="polite" className="sr-only">
        {!live
          ? null
          : statusLine !== null
            ? statusLine
            : results.length > 0
              ? labels.resultCount(results.length)
              : null}
      </div>
      {expanded &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            // Every press inside the list keeps focus in the field — rows, the status
            // line, the scrollbar — or the input's blur would close the list first.
            role="presentation"
            onMouseDown={(e) => e.preventDefault()}
            className="fixed z-50 flex flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg"
            style={{ top, left: rect.left, width: rect.width, maxHeight }}
          >
            {results.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel}
                aria-labelledby={labelledBy}
                className="min-h-0 flex-1 overflow-y-auto py-1"
              >
                {results.map((o, i) => {
                  const startsGroup = o.group != null && o.group !== results[i - 1]?.group;
                  return (
                    // Keyed by group AND value, as in the core panel: an option may
                    // appear once per group.
                    <Fragment key={`${o.group ?? ""}|${String(o.value)}`}>
                      {startsGroup && (
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
                          role="option"
                          // CHOSEN, never "highlighted" — the family's rule. This
                          // field holds no value, so the only row that can be chosen
                          // is the one whose label the text already is.
                          aria-selected={fillOnSelect && o.label === value}
                          tabIndex={-1}
                          onClick={() => take(o)}
                          onMouseEnter={() => setActive(i)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm",
                            i === active ? "bg-[var(--bg-active)]" : "hover:bg-[var(--bg-hover)]",
                            o.group != null && "ps-6",
                          )}
                        >
                          {o.icon && (
                            <span aria-hidden className="shrink-0 text-[var(--text-muted)]">
                              {o.icon}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[var(--text-primary)]">
                              {o.label}
                            </span>
                            {o.sublabel && (
                              <span className="block truncate text-xs text-[var(--text-placeholder)]">
                                {o.sublabel}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
            )}
            {statusLine !== null && (
              // Visible, not live — the region above speaks for it.
              <div
                aria-hidden
                className={cn(
                  "px-3 py-2 text-sm",
                  failed && !hasStatus ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
                  results.length > 0 && "border-t border-[var(--border)] text-xs",
                )}
              >
                {statusLine}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

const AutocompleteBase = forwardRef(AutocompleteInner);
AutocompleteBase.displayName = "Autocomplete";

/**
 * An inline, async-capable text field with a suggestion list under it — the
 * WAI-ARIA APG "editable combobox with list autocomplete".
 *
 * Two jobs, one control:
 *  - **free text** (kastlan's address field): the text is the value, the list only
 *    offers completions, and taking one fills the field (`fillOnSelect`, default);
 *  - **search-then-act** (keksdose's address search): the text is a query, taking a
 *    row calls `onSelect` and nothing is held (`fillOnSelect={false}`).
 *
 * How it differs from its siblings: {@link Combobox} is free text over a STATIC
 * string pool and opens on focus; {@link EntityCombobox} is a trigger holding an id.
 * This one keeps no value of its own, never resets the text, asks nothing below
 * `minChars`, and reports a failed lookup instead of showing stale rows.
 *
 * Focus never leaves the `<input>`: `aria-activedescendant` names the highlighted
 * row, `aria-controls` the list, and a polite live region says what the list now
 * holds. Keyboard: ↓/↑ move (↓ opens), Enter takes the highlighted row (with none,
 * Enter is left to the form), Escape closes, Tab closes and moves on; Home/End stay
 * with the caret. An Escape that closes an open list is consumed and never reaches the
 * caller; with the list closed it does. For every other key a caller's `onKeyDown`
 * runs first and may `preventDefault()` to
 * keep a key for itself.
 *
 * The list is portalled and anchored under the field on every screen size: the
 * field already carries the keyboard, and `useAnchoredPanel` keeps the list clear
 * of it on a phone. There is no full-screen sheet as {@link Combobox} has.

 * Generic over the option value (`ComboOption<V>`); the ref is the `<input>`'s.
 */
export const Autocomplete = AutocompleteBase as <V extends string | number = string>(
  props: AutocompleteProps<V> & RefAttributes<HTMLInputElement>,
) => ReactElement | null;
