import type { ReactNode } from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "../lib/cn";
import { formatIsoDate } from "../lib/dates";
import { FieldLabel, FIELD_TRIGGER, FIELD_FLOATING_PAD } from "./ui";
import { MiniCalendar } from "./mini-calendar";
import { Popover } from "./popover";

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
            className={cn(
              FIELD_TRIGGER,
              "pr-9",
              label !== undefined && FIELD_FLOATING_PAD,
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className={cn("truncate", !hasValue && "text-slate-400 dark:text-slate-500")}>
              {triggerText || " "}
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

export interface DatePickerProps extends DatePickerBaseProps {
  /** ISO "YYYY-MM-DD", or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
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
  ...rest
}: DatePickerProps) {
  return (
    <DateField
      {...rest}
      hasValue={Boolean(value)}
      triggerText={value ? formatIsoDate(value, locale, formatOptions) : (placeholder ?? "")}
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
          onSelect={(iso) => {
            onChange(iso);
            close();
          }}
        />
      )}
    </DateField>
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
  separator = " – ",
  presets,
  ...rest
}: DateRangePickerProps) {
  const a = formatIsoDate(from, locale, formatOptions);
  const b = formatIsoDate(to, locale, formatOptions);
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
