import { forwardRef } from "react";
import type { ChangeEvent } from "react";
import { Input, type InputProps } from "./ui";
import { cn } from "../lib/cn";

/**
 * A time of day, as a `"HH:mm"` string (`"HH:mm:ss"` once `step` asks for seconds).
 *
 * NATIVE `<input type="time">`, deliberately, rather than a pair of custom spinners.
 * What the browser's control gives for free is the part a hand-rolled one gets wrong:
 * 12- versus 24-hour display follows the user's OWN locale settings (not the page's —
 * which is the right authority for "how do I read a clock"), a phone opens its
 * platform wheel or dial, each segment is a spin button a screen reader already knows,
 * and typing "1430" fills both segments. The price is that the display cannot be
 * forced to 24h from here and the look of the segments is the browser's; neither is a
 * reason for three apps to ship an unaudited widget. So this is {@link Input} with
 * `type="time"` and a string contract, and everything else — the floating label, the
 * `invalid`/`error` wiring, the click-anywhere `showPicker()` (feedback #224) — is
 * Input's own, inherited rather than copied.
 *
 * Two things it adds over `<Input type="time">`:
 *
 *  - **A normalised value.** A time input's value is any valid time string, so a
 *    browser may leave off a zero seconds segment with `step={1}` or report
 *    milliseconds, and a stored value may carry seconds the field does not show.
 *    `onValueChange` always hands back exactly the shape `step` implies, so the value
 *    a form stores compares and sorts as a plain string.
 *  - **Out-of-range painted, not just flagged.** A native time input outside
 *    `min`/`max` matches `:invalid` and nothing styles that selector (see Input's
 *    `invalid`), so an out-of-window time looked fine. Here it wears
 *    {@link FIELD_INVALID} and `aria-invalid`. A reversed window (`min="22:00"
 *    max="06:00"`, a night shift, quiet hours) is read the way the HTML spec reads it:
 *    as wrapping past midnight.
 */
export interface TimeInputProps
  extends Omit<InputProps, "type" | "value" | "defaultValue" | "min" | "max" | "step" | "variant"> {
  /** `"HH:mm"` (or `"HH:mm:ss"` with a sub-minute `step`); `""` is "no time". */
  value: string;
  /** The normalised value on every change the browser reports — which for a time
   *  input is only once every segment holds a digit, or when the field is cleared
   *  (`""`). Plain `onChange` still fires alongside it with the raw event. */
  onValueChange?: (value: string) => void;
  /** Earliest time, `"HH:mm"`. May be later than `max` for a window that wraps
   *  midnight. */
  min?: string;
  /** Latest time, `"HH:mm"`. */
  max?: string;
  /** Granularity in SECONDS, as on the native input: 60 (the default) is minutes,
   *  900 is quarter hours, anything not a whole minute (e.g. 1) shows seconds. */
  step?: number;
}

/** Seconds shown when `step` is not a whole number of minutes — the browser's own rule
 *  for whether the seconds segment appears. */
function withSeconds(step: number | undefined): boolean {
  return step !== undefined && step % 60 !== 0;
}

/** Any `HH:mm[:ss[.sss]]` the browser reports → exactly the shape `step` implies.
 *  Anything else (including `""`) comes back as it went in. */
export function normalizeTime(raw: string, seconds: boolean): string {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw);
  if (!m) return raw;
  return seconds ? `${m[1]}:${m[2]}:${m[3] ?? "00"}` : `${m[1]}:${m[2]}`;
}

/** Whether `value` lies inside `[min, max]`, wrapping midnight when `min > max`.
 *  Zero-padded times compare as strings; both sides are padded to seconds first so
 *  "14:30" and "14:30:00" are the same instant. */
export function isTimeInRange(value: string, min?: string, max?: string): boolean {
  if (value === "") return true;
  const v = normalizeTime(value, true);
  const lo = min ? normalizeTime(min, true) : undefined;
  const hi = max ? normalizeTime(max, true) : undefined;
  if (lo !== undefined && hi !== undefined && lo > hi) return v >= lo || v <= hi;
  return (lo === undefined || v >= lo) && (hi === undefined || v <= hi);
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  { value, onValueChange, onChange, min, max, step, invalid, inputClassName, ...rest },
  ref,
) {
  const seconds = withSeconds(step);
  const outOfRange = !isTimeInRange(value, min, max);
  return (
    <Input
      ref={ref}
      {...rest}
      type="time"
      // Normalised on the way IN as well: a stored "14:30:00" handed to a minutes-only
      // field would otherwise make the browser show a seconds segment nobody asked for.
      value={normalizeTime(value, seconds)}
      min={min}
      max={max}
      step={step}
      invalid={invalid || outOfRange}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        onChange?.(e);
        onValueChange?.(normalizeTime(e.target.value, seconds));
      }}
      // The segments are digits that change under the caret as you spin them;
      // proportional figures make the whole field jitter sideways on every step.
      inputClassName={cn("tabular-nums", inputClassName)}
    />
  );
});
TimeInput.displayName = "TimeInput";
