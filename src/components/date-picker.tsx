import type { ComponentType, ReactNode } from "react";
import { Calendar, CalendarClock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../lib/cn";
import { addDaysIso, formatIsoDate } from "../lib/dates";
import { FieldLabel, FIELD_BASE, FIELD_TRIGGER, FIELD_FLOATING_PAD } from "./ui";
import { MiniCalendar, type MiniCalendarProps } from "./mini-calendar";
import { Popover } from "./popover";
import { Tooltip } from "./tooltip";

interface DatePickerBaseProps {
  locale: string;
  /** Embedded top-boundary label, matching the native Input/Select fields. */
  label?: ReactNode;
  placeholder?: string;
  /** Inclusive ISO bounds for selectable days. */
  min?: string;
  max?: string;
  /** Show an X to clear the value (emits `""`). */
  clearable?: boolean;
  clearLabel?: string;
  disabled?: boolean;
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
   *  ships English defaults, which a translating host has to be able to replace. */
  calendarLabels?: MiniCalendarProps["labels"];
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
  className,
  width,
  onClear,
  children,
}: {
  triggerText: string;
  hasValue: boolean;
  label?: ReactNode;
  disabled?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  className?: string;
  /** Popover panel width; omit for the default (a bare calendar). */
  width?: number;
  onClear: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const showClear = Boolean(clearable && hasValue && !disabled);
  return (
    <div className={cn("relative", className)}>
      {label !== undefined && <FieldLabel>{label}</FieldLabel>}
      <Popover
        width={width}
        trigger={({ toggle, ref }) => (
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={toggle}
            // The visual FieldLabel is a plain span (not a <label htmlFor>), so give
            // the trigger an accessible name from a string label — a11y + testable.
            aria-label={typeof label === "string" ? label : undefined}
            className={cn(
              FIELD_TRIGGER,
              "pr-9",
              label !== undefined && FIELD_FLOATING_PAD,
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className={cn("truncate", !hasValue && "text-slate-400 dark:text-slate-500")}>
              {/* `|| " "` — triggerText is "" when there is no value and no
                  placeholder was passed. An empty span has no line box, so the
                  trigger collapsed to its padding and sat shorter than every
                  other field beside it. A space keeps the line height. */}
              {triggerText || " "}
            </span>
          </button>
        )}
      >
        {(close) => children(close)}
      </Popover>
      {showClear ? (
        <button
          type="button"
          aria-label={clearLabel ?? "Clear"}
          onClick={onClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <X className="size-4" />
        </button>
      ) : (
        <Calendar
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
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
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  disabled: boolean;
  onClick: () => void;
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
          "flex w-10 shrink-0 items-center justify-center px-0 text-slate-500 dark:text-slate-400",
          "hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900",
        )}
      >
        <Icon className="size-4" />
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
  /** Accessible names for the step buttons. Required with `step` — this package
   *  ships no strings of its own, so every label is passed in by the consumer. */
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
  /** Accessible name for the today button. Required with `today`. */
  todayLabel?: string;
}

/** Single-date picker: a field showing the formatted date, opening a calendar. */
export function DatePicker({
  value,
  onChange,
  locale,
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
  ...rest
}: DatePickerProps) {
  const render = formatValue ?? ((iso: string) => formatIsoDate(iso, locale, formatOptions));
  const field = (
    <DateField
      {...rest}
      className={step ? "min-w-0 flex-1" : className}
      hasValue={Boolean(value)}
      triggerText={value ? render(value) : (placeholder ?? "")}
      onClear={() => onChange("")}
    >
      {(close) => (
        <MiniCalendar
          mode="single"
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
  if (!step && !today) return field;

  // An empty field has nothing to step from, so both buttons are dead until a date
  // is picked. Bounds are compared as strings: "YYYY-MM-DD" sorts chronologically.
  const target = (days: number) => (value ? addDaysIso(value, days) : "");
  const outOfBounds = (iso: string) => Boolean((min && iso < min) || (max && iso > max));
  const blocked = (days: number) => {
    const next = target(days);
    if (!next || rest.disabled) return true;
    return outOfBounds(next);
  };
  return (
    // items-stretch, not items-center: the buttons match the field's height, which
    // varies with whether it carries a floating label.
    <div className={cn("flex items-stretch gap-1", className)}>
      {step && (
        <StepButton
          icon={ChevronLeft}
          label={stepLabels?.prev ?? "Previous day"}
          disabled={blocked(-1)}
          onClick={() => onChange(target(-1))}
        />
      )}
      {field}
      {step && (
        <StepButton
          icon={ChevronRight}
          label={stepLabels?.next ?? "Next day"}
          disabled={blocked(1)}
          onClick={() => onChange(target(1))}
        />
      )}
      {today && (
        <StepButton
          icon={CalendarClock}
          label={todayLabel ?? "Today"}
          disabled={Boolean(rest.disabled) || value === today || outOfBounds(today)}
          onClick={() => onChange(today)}
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
  locale,
  placeholder,
  min,
  max,
  formatOptions,
  formatValue,
  separator = " – ",
  presets,
  calendarLabels,
  ...rest
}: DateRangePickerProps) {
  const render = formatValue ?? ((iso: string) => formatIsoDate(iso, locale, formatOptions));
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
      // Widen so the preset column sits beside the calendar (default otherwise).
      width={hasPresets ? 424 : undefined}
      hasValue={Boolean(from || to)}
      triggerText={triggerText}
      onClear={() => onChange("", "")}
    >
      {(close) =>
        hasPresets ? (
          <div className="flex gap-3">
            <div className="flex w-32 shrink-0 flex-col gap-0.5 border-r border-slate-100 pr-2 dark:border-slate-800">
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
                      "rounded px-2 py-1 text-left text-xs",
                      selected
                        ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {calendar(close)}
          </div>
        ) : (
          calendar(close)
        )
      }
    </DateField>
  );
}
