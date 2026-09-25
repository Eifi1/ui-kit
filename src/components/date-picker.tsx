import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentType, ReactNode, RefObject } from "react";
import { Calendar, CalendarClock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../lib/cn";
import { dirOf, type Direction } from "../lib/direction";
import { addDaysIso, parseIsoDate } from "../lib/dates";
import {
  DEFAULT_DATE_PICKER_LABELS,
  useKitLabels,
  useKitLocale,
  type DatePickerLabels,
} from "../i18n/kit-labels";
import { splitTriggerAria } from "./trigger-aria";
import type { TriggerAria } from "./trigger-aria";
import { FieldLabel, FIELD_BASE, FIELD_TRIGGER, FIELD_FLOATING_PAD, FIELD_INVALID } from "./ui";
import { MiniCalendar, type MiniCalendarProps } from "./mini-calendar";
import { Popover } from "./popover";
import { Tooltip } from "./tooltip";

/**
 * What both pickers share — and, through `ComponentPropsWithoutRef<"div">`, everything a
 * `<div>` takes, so a `data-tour` anchor, a test id or an `aria-describedby` reaches the
 * field's root element instead of being dropped (audit §api-design).
 *
 * `onChange` is omitted from those attributes: the DOM event of that name carries a
 * `FormEvent`, while both pickers answer with ISO date strings. Each declares its own
 * below.
 */
interface DatePickerBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /** BCP 47 tag for the trigger's date and the calendar. Falls back to
   *  `<UiKitProvider locale>`, then to the runtime's default. */
  locale?: string;
  /** Embedded top-boundary label, matching the native Input/Select fields. */
  label?: ReactNode;
  placeholder?: string;
  /** Inclusive ISO bounds for selectable days. */
  min?: string;
  max?: string;
  /** Show an X to clear the value (emits `""`). */
  clearable?: boolean;
  /** Accessible name of the clear button. Wins over `datePicker.clear` from
   *  `<UiKitProvider labels>`; kept as a prop because it predates the provider. */
  clearLabel?: string;
  disabled?: boolean;
  /** Required and unanswered — {@link FIELD_INVALID}. See {@link Input}'s `invalid`. */
  invalid?: boolean;
  className?: string;
  /** Intl options for the trigger's formatted date (default: locale short date). */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Render the trigger's text for an ISO date yourself; wins over `formatOptions`.
   *  For a host whose date rendering is more than one `Intl` call can say — Keksdose
   *  puts the weekday's name in the UI language beside digits ordered by a separate
   *  format preference, two locales in one string. `locale` still drives the calendar. */
  formatValue?: (iso: string) => string;
  /** Passed through to the {@link MiniCalendar} this opens. Its month arrows are
   *  icon-only, so their `aria-label` is the only name they have — and the package
   *  ships English defaults, which a translating host has to be able to replace.
   *  Usually unnecessary now: the calendar reads `miniCalendar` from the provider. */
  calendarLabels?: MiniCalendarProps["labels"];
}

/** Format an ISO date for the trigger. `lib/dates`' `formatIsoDate` insists on a
 *  locale, and here there may be none — no prop and no provider — which `Intl` reads
 *  as "the runtime's default", as every other kit formatter does. */
function formatDate(iso: string, locale: string | undefined, options?: Intl.DateTimeFormatOptions) {
  return parseIsoDate(iso)?.toLocaleDateString(locale, options) ?? "";
}

/**
 * The field-shaped button that opens the calendar.
 *
 * A component of its own rather than JSX inline in `Popover`'s `trigger` render prop,
 * because handing focus back to it is an effect and a render prop is not somewhere a
 * hook can go.
 */
function DateFieldTrigger({
  open,
  toggle,
  triggerRef,
  triggerText,
  hasValue,
  labelledBy,
  valueId,
  padded,
  disabled,
  invalid,
  panelId,
  aria,
}: {
  /** The caller's naming/description attributes, routed here from the field. */
  aria: TriggerAria;
  open: boolean;
  toggle: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** The panel's id — `role="combobox"` requires `aria-controls`. */
  panelId: string;
  triggerText: string;
  hasValue: boolean;
  /** ids of the hidden label twin + the value span, in the order they are spoken. */
  labelledBy?: string;
  valueId: string;
  padded: boolean;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const wasOpen = useRef(false);
  useEffect(() => {
    const justClosed = wasOpen.current && !open;
    wasOpen.current = open;
    if (!justClosed) return;
    // Only when the panel still HAD focus. The day the user was standing on has just
    // been unmounted with the panel, which drops focus to <body> and leaves a
    // keyboard user back at the top of the document with no idea where they were.
    // But an outside click closes this panel too, and that click has already given
    // focus to whatever it landed on — dragging it back here would be worse than the
    // bug, so a focus that is somewhere real is left alone.
    const active = document.activeElement;
    if (!active || active === document.body) triggerRef.current?.focus();
    // Here rather than through `useFocusTrap`'s `restoreFocus`, and not only because
    // `Popover` runs no trap to carry it: that option restores to whatever held focus
    // when the panel opened, and on Safari — and on Firefox on macOS — clicking a
    // button does not focus it, so "whatever held focus" is the page. The requirement
    // is this trigger, every time, however the panel was opened.
  }, [open, triggerRef]);

  return (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={toggle}
      // The name has to carry the VALUE. A bare `aria-label={label}` — which is what
      // this was — replaces the button's text outright, so the one field in the form
      // whose entire job is to show a date announced "Due date" and stopped there,
      // and a screen-reader user could not read back what they had picked without
      // opening the calendar and hunting for the selected day.
      //
      // Two ids rather than one composed string (`common.fieldValue`): "label: value"
      // is a sentence, and a name reference is spoken as the two texts in order with
      // no punctuation to translate at all. The hidden twin of the FieldLabel lives
      // in DateField, next to the label it copies.
      id={aria.id}
      aria-labelledby={aria["aria-label"] && !aria["aria-labelledby"] ? undefined : labelledBy}
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
      // `role="combobox"` on a button that opens a calendar is the APG date-picker
      // shape, and it is what makes the next two lines legal: `button` supports
      // neither `aria-expanded` nor `aria-invalid`, so the previous markup set an
      // invalid state that announced nothing (ESLint's `role-supports-aria-props`).
      //
      // `aria-haspopup="dialog"` is now honest — it was not when this comment first
      // said so. `Popover` gained a real `role="dialog"` in the same wave, so the
      // trigger's promise and the panel's role finally agree.
      role="combobox"
      aria-haspopup="dialog"
      aria-controls={panelId}
      aria-expanded={open}
      aria-invalid={invalid || aria["aria-invalid"] === true || aria["aria-invalid"] === "true" || undefined}
      className={cn(
        FIELD_TRIGGER,
        "pe-9",
        padded && FIELD_FLOATING_PAD,
        disabled && "cursor-not-allowed opacity-50",
        invalid && FIELD_INVALID,
      )}
    >
      <span id={valueId} className={cn("truncate", !hasValue && "text-[var(--text-placeholder)]")}>
        {/* `|| " "` (a NON-BREAKING space) — triggerText is "" when there is no value and no
            placeholder was passed. An empty span has no line box, so the
            trigger collapses to its padding and sits shorter than every
            other field beside it.

            It has to be a NON-BREAKING space. This read `|| " "` first, and
            that fix did nothing at all: an ordinary space is collapsible
            white space, and white space at the start and end of a line is
            removed — so the span rendered with height 0 and the trigger
            stayed 22px against the 42px of the fields either side of it
            (Keksdose live #294, measured in the browser: `span.textContent`
            WAS `" "` and `getBoundingClientRect().height` was 0). U+00A0 is
            not collapsible, so it holds the line. */}
        {triggerText || " "}
      </span>
    </button>
  );
}

/** A field-styled trigger that opens a portalled MiniCalendar. Shared by the
 *  single- and range-date pickers below. */
function DateField({
  triggerText,
  hasValue,
  label,
  disabled,
  clearable,
  clearLabel,
  panelLabel,
  className,
  width,
  onClear,
  invalid,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  triggerText: string;
  hasValue: boolean;
  label?: ReactNode;
  disabled?: boolean;
  clearable?: boolean;
  /** Already resolved by the picker (prop > provider > English). */
  clearLabel: string;
  /** The popover panel's accessible name, resolved likewise. */
  panelLabel: string;
  invalid?: boolean;
  className?: string;
  /** Popover panel width; omit for the default (a bare calendar). */
  width?: number;
  onClear: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const showClear = Boolean(clearable && hasValue && !disabled);
  const [aria, wrapperRest] = splitTriggerAria(rest);
  // The panel is portalled to <body> and leaves the subtree whose `dir` it inherited,
  // so a calendar in an RTL form opened LTR — the grid's columns, its arrow keys and
  // its chevrons all the wrong way round. Read at the moment of opening (the only way
  // the popover opens is through `toggle`) and put back on the panel.
  const rootRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<Direction>("ltr");
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const panelId = `${id}-panel`;
  // Only a STRING label can be reused as a name; a ReactNode may be a whole row with
  // its own interactive "?" hint in it, and naming a button with that reads the hint
  // out as part of the field's name.
  const named = typeof label === "string";
  return (
    // The caller's attributes land here, on the field's own box — the trigger inside is
    // named by `aria-labelledby` and must keep the id pair it is given.
    <div {...wrapperRest} ref={rootRef} className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      {/* The visible FieldLabel is a plain span, not a `<label htmlFor>`, so it names
          nothing on its own — this hidden twin is what the trigger is named by.
          `aria-hidden` because a name reference reads a hidden element deliberately
          (accname §4.3.1), and without it the label would be announced twice: once as
          loose text before the button, once inside the button's own name.
          `sr-only-fixed` rather than `sr-only` — see the note on the class in
          tokens.css. */}
      {named && (
        <span id={labelId} aria-hidden className="sr-only-fixed">
          {label}
        </span>
      )}
      <Popover
        width={width}
        panelId={panelId}
        // Named for what it is. Unnamed, it fell back to `popover.panel`, and a date
        // field announced its calendar as "Popover" — in English, in every language.
        labels={{ panel: panelLabel }}
        dir={dir}
        trigger={({ open, toggle, ref }) => (
          <DateFieldTrigger
            open={open}
            toggle={() => {
              setDir(dirOf(rootRef.current));
              toggle();
            }}
            triggerRef={ref}
            triggerText={triggerText}
            hasValue={hasValue}
            // ALWAYS a name reference, never `undefined`. A `<button>` takes its
            // accessible name from its contents, so an unlabelled trigger used to
            // announce its own date text for free. `role="combobox"` does not —
            // content is excluded from name computation for that role — so leaving
            // this undefined made an unlabelled date field announce nothing at all.
            // Named: "label, value". Unnamed: the value alone, which is what the
            // button was saying before.
            //
            // A caller's own reference comes first. And when the caller gives the field
            // an `id` (so an external `<label htmlFor>` can point at it), the trigger
            // lists ITSELF first: a self-reference in `aria-labelledby` is resolved
            // from the element's native label (accname 2B → 2D), so "Due date" from
            // that <label> is spoken before the value, instead of being overridden.
            labelledBy={[
              aria["aria-labelledby"],
              named ? labelId : !aria["aria-labelledby"] && aria.id ? aria.id : undefined,
              valueId,
            ]
              .filter(Boolean)
              .join(" ")}
            aria={aria}
            panelId={panelId}
            valueId={valueId}
            padded={label !== undefined}
            disabled={disabled}
            invalid={invalid}
          />
        )}
      >
        {(close) => children(close)}
      </Popover>
      {showClear ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={onClear}
          className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-placeholder)] hover:text-[var(--text-secondary)]"
        >
          <X className="size-4" />
        </button>
      ) : (
        <Calendar
          aria-hidden
          className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-placeholder)]"
        />
      )}
    </div>
  );
}

/** One ‹ / › day-step button, sized to sit flush beside the field. */
function StepButton({
  icon: Icon,
  label,
  disabled,
  onClick,
  mirror,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  disabled: boolean;
  onClick: () => void;
  /** Flip the icon in RTL — for the ‹ › day steps, whose "previous" points to the
   *  reading start. Not for the today icon, which has no direction. */
  mirror?: boolean;
  /** The button's corners in the joined group (see DatePicker). */
  className?: string;
}) {
  return (
    <Tooltip label={label} portal>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          FIELD_BASE,
          // FIELD_BASE is `block w-full` for text inputs; a step button is neither, and
          // px-3 would make it wider than it needs to be. twMerge lets these win.
          "relative flex h-full w-10 shrink-0 items-center justify-center px-0 text-[var(--text-muted)]",
          "hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]",
          // Raised while hovered or focused, so the shared border and the focus ring are
          // drawn on top of the neighbour they overlap by a pixel.
          "hover:z-10 focus-visible:z-10",
          // Dimmed ICON, not a dimmed box: at 40% opacity the whole button — border
          // included — faded out of the group and read as a broken, detached control.
          "disabled:cursor-not-allowed disabled:text-[var(--text-placeholder)] disabled:opacity-60 disabled:hover:bg-[var(--bg-surface)]",
          className,
        )}
      >
        <Icon className={cn("size-4", mirror && "rtl:-scale-x-100")} />
      </button>
    </Tooltip>
  );
}

export interface DatePickerProps extends DatePickerBaseProps {
  /** ISO "YYYY-MM-DD", or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  /**
   * Flank the field with ‹ › buttons that move the value one day. For fields whose
   * typical edit is a day or two — opening a calendar to go "yesterday" is three
   * interactions for what should be one.
   *
   * Off by default: on a filter or a far-away date the buttons are dead weight, and
   * they cost ~5rem of width that a narrow layout may not have.
   */
  step?: boolean;
  /** Accessible names for the step buttons. Optional: they resolve from
   *  `datePicker.previousDay` / `nextDay` in `<UiKitProvider labels>`, then from the
   *  English defaults. This prop wins over both, for the one field that says it
   *  differently. */
  stepLabels?: { prev: string; next: string };
  /**
   * Today's date as ISO "YYYY-MM-DD". Adds a jump-to-today button beside the field,
   * disabled once the value already is that day.
   *
   * Passed in rather than read from a clock here: a component that decides what "today"
   * is cannot be tested at a fixed date, and the consumer already has one definition of
   * it. The button is always RENDERED — going flat instead of disappearing — because a
   * control that comes and goes with the value reflows whatever sits beside it, which
   * is the report this exists to answer.
   */
  today?: string;
  /** Accessible name for the today button; wins over `datePicker.today`. */
  todayLabel?: string;
}

/**
 * The picker's own label props, folded into one `datePicker` override so they sit at
 * the top of the same precedence chain as everything else: prop > provider > English.
 * They predate the provider and stay public API, which is why they are not simply
 * replaced by a `labels` prop.
 */
function useDatePickerLabels(
  clearLabel: string | undefined,
  stepLabels: { prev: string; next: string } | undefined,
  todayLabel: string | undefined,
): DatePickerLabels {
  const prev = stepLabels?.prev;
  const next = stepLabels?.next;
  const fromProps = useMemo(() => {
    const out: Partial<DatePickerLabels> = {};
    if (clearLabel !== undefined) out.clear = clearLabel;
    if (prev !== undefined) out.previousDay = prev;
    if (next !== undefined) out.nextDay = next;
    if (todayLabel !== undefined) out.today = todayLabel;
    return out;
  }, [clearLabel, prev, next, todayLabel]);
  return useKitLabels("datePicker", DEFAULT_DATE_PICKER_LABELS, fromProps);
}

/** Single-date picker: a field showing the formatted date, opening a calendar. */
export function DatePicker({
  value,
  onChange,
  locale: localeProp,
  placeholder,
  min,
  max,
  formatOptions,
  formatValue,
  step,
  stepLabels,
  today,
  todayLabel,
  className,
  calendarLabels,
  label,
  clearable,
  clearLabel,
  disabled,
  invalid,
  ...rest
}: DatePickerProps) {
  const locale = useKitLocale(localeProp);
  const text = useDatePickerLabels(clearLabel, stepLabels, todayLabel);
  const render = formatValue ?? ((iso: string) => formatDate(iso, locale, formatOptions));
  // With a step or a today button beside it the field is no longer the outermost
  // element — the flex row at the bottom is, and a caller's attributes belong on
  // whichever of the two is actually the root. Naming the shared props rather than
  // letting `...rest` carry them is what makes that choice possible.
  const wrapped = Boolean(step || today);
  const [triggerAria, wrapperRest] = splitTriggerAria(rest);
  const field = (
    <DateField
      // With step/today buttons the flex row is the root and takes the caller's props —
      // except the ones that name the field, which still belong on its trigger.
      {...(wrapped ? triggerAria : rest)}
      label={label}
      clearable={clearable}
      clearLabel={text.clear}
      panelLabel={text.panel}
      disabled={disabled}
      invalid={invalid}
      className={step ? "min-w-0 flex-1" : className}
      hasValue={Boolean(value)}
      triggerText={value ? render(value) : (placeholder ?? "")}
      onClear={() => onChange("")}
    >
      {(close) => (
        <MiniCalendar
          mode="single"
          focusOnOpen
          from={value}
          to={value}
          locale={locale}
          min={min}
          max={max}
          labels={calendarLabels}
          onSelect={(iso) => {
            onChange(iso);
            close();
          }}
        />
      )}
    </DateField>
  );
  if (!wrapped) return field;

  // An empty field has nothing to step from, so both buttons are dead until a date
  // is picked. Bounds are compared as strings: "YYYY-MM-DD" sorts chronologically.
  const target = (days: number) => (value ? addDaysIso(value, days) : "");
  const outOfBounds = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const blocked = (days: number) => {
    const next = target(days);
    if (!next || disabled) return true;
    return outOfBounds(next);
  };
  return (
    // ONE joined control, not three boxes in a row: the buttons and the field share
    // their borders (each piece overlaps the previous by a pixel) and only the outer
    // ends are rounded — the button-group shape, so ‹ date › reads as one field with
    // controls rather than a field with loose buttons parked beside it, which is what
    // the `gap-1` version looked like.
    //
    // items-stretch, not items-center: the buttons match the field's height, which
    // varies with whether it carries a floating label. The field's trigger is nested
    // inside DateField, so its inner corners are squared from here.
    <div
      {...wrapperRest}
      className={cn(
        "flex items-stretch [&>*:not(:first-child)]:-ms-px",
        step && "[&_[role=combobox]]:rounded-s-none",
        (step || today) && "[&_[role=combobox]]:rounded-e-none",
        "[&_[role=combobox]:focus-visible]:relative [&_[role=combobox]:focus-visible]:z-10",
        className,
      )}
    >
      {step && (
        <StepButton
          icon={ChevronLeft}
          mirror
          label={text.previousDay}
          disabled={blocked(-1)}
          onClick={() => onChange(target(-1))}
          className="rounded-e-none"
        />
      )}
      {field}
      {step && (
        <StepButton
          icon={ChevronRight}
          mirror
          label={text.nextDay}
          disabled={blocked(1)}
          onClick={() => onChange(target(1))}
          className={cn("rounded-s-none", today && "rounded-e-none")}
        />
      )}
      {today && (
        <StepButton
          icon={CalendarClock}
          label={text.today}
          disabled={Boolean(disabled) || value === today || outOfBounds(today)}
          onClick={() => onChange(today)}
          className="rounded-s-none"
        />
      )}
    </div>
  );
}

export interface DateRangePickerPreset {
  label: ReactNode;
  from: string;
  to: string;
}

export interface DateRangePickerProps extends DatePickerBaseProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** Separator between the two formatted dates in the trigger (default " – "). */
  separator?: string;
  /** Optional named ranges rendered as a left column (last month / YTD / …). */
  presets?: DateRangePickerPreset[];
}

/** Two-date range picker: click a start then an end; closes once both are set.
 *  With `presets`, a left column of named ranges is shown beside the calendar. */
export function DateRangePicker({
  from,
  to,
  onChange,
  locale: localeProp,
  placeholder,
  min,
  max,
  formatOptions,
  formatValue,
  separator = " – ",
  presets,
  calendarLabels,
  label,
  clearable,
  clearLabel,
  disabled,
  invalid,
  ...rest
}: DateRangePickerProps) {
  const locale = useKitLocale(localeProp);
  const text = useDatePickerLabels(clearLabel, undefined, undefined);
  const render = formatValue ?? ((iso: string) => formatDate(iso, locale, formatOptions));
  const a = from ? render(from) : "";
  const b = to ? render(to) : "";
  const triggerText = from
    ? to
      ? `${a}${separator}${b}`
      : `${a}${separator}…`
    : (placeholder ?? "");
  const hasPresets = Boolean(presets && presets.length > 0);
  const calendar = (close: () => void) => (
    <MiniCalendar
      focusOnOpen
      from={from}
      to={to}
      locale={locale}
      min={min}
      max={max}
      labels={calendarLabels}
      onSelect={(f, t) => {
        onChange(f, t);
        // Two-click range: only dismiss once both ends are chosen.
        if (f && t) close();
      }}
    />
  );
  return (
    <DateField
      {...rest}
      label={label}
      clearable={clearable}
      clearLabel={text.clear}
      panelLabel={text.rangePanel}
      disabled={disabled}
      invalid={invalid}
      // Widen so the preset column sits beside the calendar (default otherwise).
      width={hasPresets ? 440 : undefined}
      hasValue={Boolean(from || to)}
      triggerText={triggerText}
      onClear={() => onChange("", "")}
    >
      {(close) =>
        hasPresets ? (
          <div className="flex gap-3">
            {/* `border-e`/`pe`, not `-r`: the preset column is on the START side, and the
                rule between it and the calendar has to follow it in a right-to-left UI. */}
            <div className="flex w-32 shrink-0 flex-col gap-0.5 border-e border-[var(--border)] pe-2">
              {presets!.map((p, i) => {
                const selected = p.from === from && p.to === to;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(p.from, p.to);
                      close();
                    }}
                    className={cn(
                      "rounded px-2 py-1.5 text-start text-xs",
                      selected
                        ? "bg-[var(--bg-active)] font-medium text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {/* `flex-1`: the calendar takes the rest of the panel. Content-sized it was
                seven tiny cells beside a wide preset column. */}
            <div className="min-w-0 flex-1">{calendar(close)}</div>
          </div>
        ) : (
          calendar(close)
        )
      }
    </DateField>
  );
}
