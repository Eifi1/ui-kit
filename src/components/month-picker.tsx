import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode, RefObject } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { dirOf, horizontalStep, type Direction } from "../lib/direction";
import { monthKey, pad } from "../lib/dates";
import { FieldLabel, FIELD_FLOATING_PAD, FIELD_INVALID, FIELD_TRIGGER } from "./ui";
import { Popover } from "./popover";
import { splitTriggerAria } from "./trigger-aria";
import type { TriggerAria } from "./trigger-aria";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";

/**
 * Every string the month picker can speak. The month and year names are NOT here —
 * they come from `Intl` in the `locale` prop, so they are already in the user's
 * language. What is left is the two icon-only year arrows, whose `aria-label` is the
 * only name they have, the panel's name, and a month cell's name.
 */
export interface MonthPickerLabels {
  previousYear: string;
  nextYear: string;
  /** The popover's accessible name (`role="dialog"`). */
  panel: string;
  /**
   * Accessible name of one month cell, given that month and its year formatted in
   * `locale` ("August 2026"). The cell's visible text is the short month alone, and
   * "Aug" read out on its own does not say which year the grid is on.
   */
  month: (monthYear: string) => string;
}

/** The English starting point every override is merged onto. Exported (unlike the
 *  calendar's) because it is asked for by name: a host building its own translation
 *  table can spread it rather than re-typing four keys to change one. */
export const DEFAULT_MONTH_PICKER_LABELS: MonthPickerLabels = {
  previousYear: "Previous year",
  nextYear: "Next year",
  panel: "Choose a month",
  month: (monthYear) => monthYear,
};

/** Merge caller overrides onto the English defaults. */
function useMonthPickerLabels(partial?: Partial<MonthPickerLabels>): MonthPickerLabels {
  // Prop > <UiKitProvider> > English, like every labelled component in the kit.
  return useKitLabels("monthPicker", DEFAULT_MONTH_PICKER_LABELS, partial);
}

/**
 * `onChange` is omitted from the `<div>` attributes: the DOM event of that name carries
 * a `FormEvent`, and this one answers with a month key. Everything else reaches the
 * field's root, so a test id or a `data-tour` anchor can find it.
 */
export interface MonthPickerProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /**
   * The selected month as a `"YYYY-MM"` key, or `""` for none.
   *
   * A string rather than `{ year, month }` or a `Date`, for the reason every date in
   * this kit is one: it is what `monthKey()` in `lib/dates` produces, it sorts
   * chronologically so the bounds are plain `<` / `>`, and it crosses a URL or an API
   * without a serialiser. A `{ year, month }` caller converts with
   * `` `${year}-${pad(month)}` `` (month 1–12) and back with `key.split("-").map(Number)`.
   */
  value: string;
  /** Called with the picked month as `"YYYY-MM"`. */
  onChange: (month: string) => void;
  /** Drives the month and year names (`Intl.DateTimeFormat`). Defaults to the
   *  `<UiKitProvider>` locale, then the runtime's. */
  locale?: string;
  /**
   * Inclusive bounds, as `"YYYY-MM"`. A full ISO date (`"YYYY-MM-DD"`) is accepted and
   * read as its month, so a host holding "the first day we have data for" can pass it
   * straight in. Months outside are shown but refuse selection; a year arrow is
   * disabled once the whole year beyond it is out of bounds.
   */
  min?: string;
  max?: string;
  /** Embedded top-boundary label, matching the other field-shaped controls. */
  label?: ReactNode;
  /** Trigger text when `value` is `""`. */
  placeholder?: string;
  disabled?: boolean;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** Intl options for the trigger's text (default: long month + numeric year). */
  formatOptions?: Intl.DateTimeFormatOptions;
  /**
   * The month to ring as "now", as `"YYYY-MM"`. Defaults to the local calendar's
   * current month; pass one to pin it (a test, a host with its own notion of today).
   */
  currentMonth?: string;
  /** User-facing strings; see {@link MonthPickerLabels}. */
  labels?: Partial<MonthPickerLabels>;
  /** Extra classes for the field's root. */
  className?: string;
  /** Extra classes for the trigger button — e.g. a compact `h-9 w-auto` trigger
   *  sitting between two icon buttons in a toolbar. */
  triggerClassName?: string;
}

// ── Month keys ────────────────────────────────────────────────────────────

interface YearMonth {
  year: number;
  /** 1–12, as in the key. */
  month: number;
}

const KEY = /^(\d{4})-(\d{2})/;

function parseMonth(key: string | undefined): YearMonth | null {
  const m = key ? KEY.exec(key) : null;
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year: Number(m[1]), month } : null;
}

function toKey({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

/** Move a month key by whole months, carrying into the year. */
function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** A bound, normalised to its month key — so `"2024-03-15"` compares as `"2024-03"`. */
function boundKey(bound: string | undefined): string | null {
  const ym = parseMonth(bound);
  return ym ? toKey(ym) : null;
}

/** Local-calendar Date for the 1st of a month, for `Intl` to format. */
function firstOf({ year, month }: YearMonth): Date {
  return new Date(year, month - 1, 1);
}

const DEFAULT_TRIGGER_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };
const MONTH_NAME_FORMAT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

// ── Trigger ───────────────────────────────────────────────────────────────

/**
 * The field-shaped button that opens the grid. The same shape as `DatePicker`'s
 * trigger, for the same reasons written down there: `role="combobox"` so it may carry
 * `aria-expanded` / `aria-invalid`, a name made of the label AND the value, and focus
 * handed back here when the panel closes with focus still inside it.
 */
function MonthFieldTrigger({
  open,
  toggle,
  triggerRef,
  triggerText,
  hasValue,
  labelledBy,
  valueId,
  panelId,
  padded,
  disabled,
  invalid,
  className,
  aria,
}: {
  open: boolean;
  toggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  triggerText: string;
  hasValue: boolean;
  labelledBy: string;
  /** The caller's naming attributes — see `trigger-aria.ts`. */
  aria: TriggerAria;
  valueId: string;
  panelId: string;
  padded: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const wasOpen = useRef(false);
  useEffect(() => {
    const justClosed = wasOpen.current && !open;
    wasOpen.current = open;
    if (!justClosed) return;
    // Only when focus went down with the panel. An outside click has already put it
    // somewhere real, and dragging it back here would be worse than leaving it.
    const active = document.activeElement;
    if (!active || active === document.body) triggerRef.current?.focus();
  }, [open, triggerRef]);

  return (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={toggle}
      role="combobox"
      aria-haspopup="dialog"
      aria-controls={panelId}
      aria-expanded={open}
      id={aria.id}
      aria-invalid={invalid || aria["aria-invalid"] === true || aria["aria-invalid"] === "true" || undefined}
      aria-labelledby={aria["aria-label"] && !aria["aria-labelledby"] ? undefined : labelledBy}
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
      className={cn(
        FIELD_TRIGGER,
        "pe-9",
        padded && FIELD_FLOATING_PAD,
        disabled && "cursor-not-allowed opacity-50",
        invalid && FIELD_INVALID,
        className,
      )}
    >
      {/* The U+00A0 fallback keeps the line box when there is no text — see
          DatePicker. The value arrives capitalised (see `upperFirst`); this span does
          NOT use `capitalize`, which upper-cases every WORD — "Choose A Month",
          "Septiembre De 2026". */}
      <span
        id={valueId}
        className={cn("truncate", !hasValue && "text-[var(--text-placeholder)]")}
      >
        {triggerText || " "}
      </span>
    </button>
  );
}

// ── Grid ──────────────────────────────────────────────────────────────────

const COLUMNS = 3;

/**
 * The panel: a year caption between ‹ › arrows, over a 4×3 grid of months.
 *
 * Mounted only while the popover is open, so every opening starts from the current
 * value's year — a value moved from outside (a prev/next-month button beside the
 * field) is where the grid lands, with no effect needed to snap it back.
 *
 * A grid in the APG sense, like `MiniCalendar`: one tab stop (the roving tabindex),
 * the arrows walk the months — left/right by one, up/down by a row of three — and
 * walking off either end of the year MOVES the year rather than stopping. PageUp /
 * PageDown step a whole year. Out-of-bounds months are `aria-disabled`, not
 * `disabled`, so the roving tab stop never falls into a hole.
 */
function MonthGrid({
  value,
  onPick,
  locale,
  minKey,
  maxKey,
  currentKey,
  labels,
}: {
  value: YearMonth | null;
  onPick: (key: string) => void;
  locale: string | undefined;
  minKey: string | null;
  maxKey: string | null;
  currentKey: string;
  labels: MonthPickerLabels;
}) {
  const outOfBounds = (key: string) =>
    Boolean((minKey && key < minKey) || (maxKey && key > maxKey));

  // The month holding the tab order, and with it the year on screen — one piece of
  // state, as in MiniCalendar, so the two cannot disagree. Opens on the value, or on
  // the current month, pulled inside the bounds.
  const [active, setActive] = useState<YearMonth>(() => {
    const start = value ? toKey(value) : currentKey;
    if (minKey && start < minKey) return parseMonth(minKey)!;
    if (maxKey && start > maxKey) return parseMonth(maxKey)!;
    return parseMonth(start)!;
  });
  const year = active.year;

  const gridRef = useRef<HTMLDivElement>(null);
  const captionId = `${useId()}-year`;

  // Short names for the cells, long "Month YYYY" for their accessible names.
  const shortNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
  }, [locale]);
  const longName = useMemo(() => new Intl.DateTimeFormat(locale, MONTH_NAME_FORMAT), [locale]);
  const yearCaption = new Intl.DateTimeFormat(locale, { year: "numeric" }).format(
    firstOf({ year, month: 1 }),
  );

  // A month whose cell must take focus after the next commit. Arrowing across a year
  // boundary re-labels the same twelve buttons, so the one to focus is a DIFFERENT
  // button from the one the key landed on.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-month="${key}"]`)?.focus();
  });

  // Opened because the user asked to pick a month: land them on it. Runs before the
  // popover's focus trap (a child's effect fires first), which then keeps this focus.
  useEffect(() => {
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, []);

  const moveTo = (next: YearMonth, focus: boolean) => {
    if (focus) pendingFocus.current = toKey(next);
    setActive(next);
  };

  const onCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // Left and right are VISUAL directions: in a right-to-left page the grid runs the
    // other way, so "right" is the previous month there. The panel is portalled, but
    // it carries the field's `dir` (see MonthPicker), so the nearest `dir` is right.
    const step = horizontalStep(e.key, e.currentTarget);
    const col = (active.month - 1) % COLUMNS;
    let delta: number;
    switch (step ? "horizontal" : e.key) {
      case "horizontal":
        delta = step;
        break;
      case "ArrowUp":
        delta = -COLUMNS;
        break;
      case "ArrowDown":
        delta = COLUMNS;
        break;
      case "Home":
        delta = -col;
        break;
      case "End":
        delta = COLUMNS - 1 - col;
        break;
      case "PageUp":
        delta = -12;
        break;
      case "PageDown":
        delta = 12;
        break;
      default:
        return;
    }
    // Before any no-op check: these keys also scroll the panel, and a month that
    // cannot move still must not move the page.
    e.preventDefault();
    if (delta !== 0) moveTo(shiftMonth(active, delta), true);
  };

  // An arrow is dead once EVERY month of the year it leads to is out of bounds.
  const prevBlocked = Boolean(minKey && toKey({ year: year - 1, month: 12 }) < minKey);
  const nextBlocked = Boolean(maxKey && toKey({ year: year + 1, month: 1 }) > maxKey);
  const selectedKey = value ? toKey(value) : null;

  const arrow =
    "flex size-7 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          aria-label={labels.previousYear}
          disabled={prevBlocked}
          // Focus stays on the arrow being pressed — only the grid moves.
          onClick={() => moveTo(shiftMonth(active, -12), false)}
          className={arrow}
        >
          {/* Mirrored in RTL, where "previous" points the other way. */}
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
        </button>
        {/* Names the grid, and `aria-live` so stepping a year says which one you are
            on — the user pressing the arrow is not inside the grid to hear it change. */}
        <div
          id={captionId}
          aria-live="polite"
          className="text-sm font-semibold tabular-nums text-[var(--text-primary)]"
        >
          {yearCaption}
        </div>
        <button
          type="button"
          aria-label={labels.nextYear}
          disabled={nextBlocked}
          onClick={() => moveTo(shiftMonth(active, 12), false)}
          className={arrow}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" />
        </button>
      </div>
      <div ref={gridRef} role="grid" aria-labelledby={captionId} className="grid gap-1">
        {Array.from({ length: 12 / COLUMNS }, (_, row) => (
          <div key={row} role="row" className="grid grid-cols-3 gap-1">
            {Array.from({ length: COLUMNS }, (_, c) => {
              const ym = { year, month: row * COLUMNS + c + 1 };
              const key = toKey(ym);
              const disabled = outOfBounds(key);
              const selected = key === selectedKey;
              const current = key === currentKey;
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  data-month={key}
                  tabIndex={ym.month === active.month ? 0 : -1}
                  aria-label={labels.month(longName.format(firstOf(ym)))}
                  aria-selected={selected}
                  aria-disabled={disabled || undefined}
                  aria-current={current ? "date" : undefined}
                  onClick={() => {
                    // The guard `disabled` would have been; see the component note.
                    if (disabled) return;
                    setActive(ym);
                    onPick(key);
                  }}
                  onKeyDown={onCellKeyDown}
                  className={cn(
                    "rounded px-2 py-1.5 text-sm capitalize transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                    // A --brand ring on a --brand fill exists only in the DOM.
                    selected && !disabled
                      ? "focus-visible:ring-[var(--brand-contrast)]"
                      : "focus-visible:ring-[var(--brand)]",
                    disabled
                      ? "cursor-not-allowed text-[var(--text-placeholder)]"
                      : selected
                        ? "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                    current && !selected && !disabled && "ring-1 ring-inset ring-[var(--border-strong)]",
                  )}
                >
                  {shortNames[ym.month - 1]}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────

/**
 * Month picker: a field showing the selected month ("August 2026"), opening a 12-month
 * grid with year arrows. For a value that IS a month — a budget period, a calendar
 * view, a statement — where a day picker would ask for a day nobody means.
 *
 * One component for the two app-local pickers it replaces: keksdose's budget-header
 * popover (grid + year steppers + a floor) and kastlan's calendar header (a month list
 * and a year list in two popovers). The grid does both jobs — the year arrows and
 * PageUp/PageDown cover what the year list did, without a fixed ±5-year window.
 */
/** Upper-case the first letter only, in `locale`. Several locales (fr, es, it, pt, …)
 *  write month names in lower case, which at the start of a field reads as a typo —
 *  but only the FIRST letter is the field's business: "septiembre de 2026" becomes
 *  "Septiembre de 2026", not "Septiembre De 2026". */
function upperFirst(text: string, locale: string | undefined): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

export function MonthPicker({
  value,
  onChange,
  locale: localeProp,
  min,
  max,
  label,
  placeholder,
  disabled,
  invalid,
  formatOptions,
  currentMonth,
  labels: labelsProp,
  className,
  triggerClassName,
  ...rest
}: MonthPickerProps) {
  const labels = useMonthPickerLabels(labelsProp);
  const locale = useKitLocale(localeProp);
  const selected = parseMonth(value);
  const minKey = boundKey(min);
  const maxKey = boundKey(max);
  const currentKey = boundKey(currentMonth) ?? monthKey(new Date());

  const triggerText = selected
    ? upperFirst(
        new Intl.DateTimeFormat(locale, formatOptions ?? DEFAULT_TRIGGER_FORMAT).format(
          firstOf(selected),
        ),
        locale,
      )
    : (placeholder ?? "");

  const id = useId();
  const [aria, wrapperRest] = splitTriggerAria(rest);
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const panelId = `${id}-panel`;
  // Only a STRING label can double as a name; a ReactNode may hold its own controls.
  const named = typeof label === "string";
  // The panel is portalled to <body>, out of the subtree whose `dir` it inherited — an
  // RTL form got an LTR grid. Read when opening (`toggle` is the popover's only way
  // open) and put back on the panel. Also what the arrow keys above read.
  const rootRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<Direction>("ltr");

  return (
    <div {...wrapperRest} ref={rootRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      {/* The hidden twin the trigger is named by — see DateField. `sr-only-fixed`,
          and inside this `relative` root either way. */}
      {named && (
        <span id={labelId} aria-hidden className="sr-only-fixed">
          {label}
        </span>
      )}
      <Popover
        width={256}
        panelId={panelId}
        labels={{ panel: labels.panel }}
        dir={dir}
        trigger={({ open, toggle, ref }) => (
          <MonthFieldTrigger
            open={open}
            toggle={() => {
              setDir(dirOf(rootRef.current));
              toggle();
            }}
            triggerRef={ref}
            triggerText={triggerText}
            hasValue={selected != null}
            // As DatePicker: a caller's reference first; an `id` without a label of our
            // own references the trigger itself, so an external <label htmlFor> names it.
            labelledBy={[
              aria["aria-labelledby"],
              named ? labelId : !aria["aria-labelledby"] && aria.id ? aria.id : undefined,
              valueId,
            ]
              .filter(Boolean)
              .join(" ")}
            aria={aria}
            valueId={valueId}
            panelId={panelId}
            padded={label !== undefined}
            disabled={disabled}
            invalid={invalid}
            className={triggerClassName}
          />
        )}
      >
        {(close) => (
          <MonthGrid
            value={selected}
            locale={locale}
            minKey={minKey}
            maxKey={maxKey}
            currentKey={currentKey}
            labels={labels}
            onPick={(key) => {
              onChange(key);
              close();
            }}
          />
        )}
      </Popover>
      <Calendar
        aria-hidden
        className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]"
      />
    </div>
  );
}
