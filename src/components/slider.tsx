import { forwardRef, useId } from "react";
import type { CSSProperties, ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * A range control on a native `<input type="range">`.
 *
 * Lenkbank wrote the first one (`shared/ui/slider-field.tsx`) and then the case for
 * moving it here (`docs/ui-kit-slider-proposal.md`). This is that proposal's "stage 1"
 * primitive — the track, the thumb, the scale and the accessibility — plus the label
 * line and tick marks its SpeedSlider needed. The four decisions it argues should be
 * made once are made here, and each carries its note below:
 *
 *  1. a logarithmic scale whose far-left stop means exactly zero ({@link SliderProps.zeroStop});
 *  2. `aria-valuetext`, so a log track does not announce its 0–1 position as the value;
 *  3. a 24px pointer target, which needs the track and thumb drawn separately;
 *  4. the number is the truth and the track a view of it: a value outside `min`–`max`
 *     is kept and the thumb pins at the end — nothing here clamps what it was given.
 *
 * Controlled only, like `ToggleGroup` and `NumberInput`: there is no uncontrolled mode
 * to get wrong, and neither app wants one. The package does no number formatting and
 * holds no locale — `formatValue` is how the caller's `Intl` result gets in.
 *
 * Not here, deliberately (the proposal's list): two thumbs, vertical orientation, and
 * a number box. A `NumberInput` goes in the `readout` slot when a typed value is
 * wanted beside the track.
 */

/** On a log scale with {@link SliderProps.zeroStop}, the share of the track that is
 *  the "off" stop. The first position to its right is `min`. */
const ZERO_STOP = 0.02;

/** Position resolution on a log track — 1000 stops, fine enough that a drag reads as
 *  continuous. PageUp/PageDown still cross a tenth of the track at a time. */
const LOG_STEP = 0.001;

/**
 * Where a value sits on a logarithmic track, 0–1.
 *
 * With `zeroStop`, zero and below is 0 and the decades between `min` and `max` are
 * mapped onto the rest; without it, `min` is the far left. A value past either end
 * pins there — that is the DISPLAY clamping, never the value's.
 */
export function toLogPosition(value: number, min: number, max: number, zeroStop = true): number {
  if (value <= 0) return 0;
  const share = Math.log(Math.max(value, min) / min) / Math.log(max / min);
  const clamped = Math.min(1, Math.max(0, share));
  return zeroStop ? ZERO_STOP + (1 - ZERO_STOP) * clamped : clamped;
}

/** The inverse of {@link toLogPosition}: the value at a track position. */
export function fromLogPosition(position: number, min: number, max: number, zeroStop = true): number {
  if (zeroStop) {
    if (position < ZERO_STOP) return 0;
    return min * Math.pow(max / min, (position - ZERO_STOP) / (1 - ZERO_STOP));
  }
  return min * Math.pow(max / min, position);
}

// The input is the pointer target, so its box is `h-6` (24px, WCAG 2.5.8) and the
// track that LOOKS like a track is a 6px strip drawn inside it. Once the box is taller
// than the track its background cannot be the track, and with `appearance-none`
// nothing else draws one — measured in Chromium by Lenkbank, that is a bare thumb
// floating on nothing, in the browser's blue. Hence the vendor pseudo-elements: the
// two engines share no selector for either half, so each half is spelt twice.
//
// The fill up to the thumb: WebKit has no progress pseudo-element, so its track is a
// two-stop gradient that breaks at `--slider-fill` (set inline from the position), and
// the gradient runs the other way in a right-to-left document, where the native range
// runs the other way too. Firefox draws the fill itself with `::-moz-range-progress`,
// which follows the direction on its own.
//
// The thumb's `-mt-[5px]` centres a 16px thumb on a 6px track: WebKit lays the thumb
// out from the track's top edge, Firefox centres it, so only one carries the offset.
//
// The focus ring goes on the THUMB, not the box: the box is the full width of the
// row, and a ring round all of it says "this row is focused" rather than "the handle
// you are about to move is". Offset in the surface colour, because the thumb is
// --brand and a --brand ring touching it would be invisible.
const TRACK = [
  "block h-6 w-full cursor-pointer appearance-none bg-transparent focus:outline-none disabled:cursor-not-allowed",
  // WebKit / Blink
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--brand)_var(--slider-fill),var(--border-strong)_var(--slider-fill))]",
  "rtl:[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_left,var(--brand)_var(--slider-fill),var(--border-strong)_var(--slider-fill))]",
  "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--brand)] [&::-webkit-slider-thumb]:shadow",
  "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-[var(--brand)]",
  "focus-visible:[&::-webkit-slider-thumb]:ring-offset-2 focus-visible:[&::-webkit-slider-thumb]:ring-offset-[var(--bg-surface)]",
  // Firefox
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--border-strong)]",
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[var(--brand)]",
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
  "[&::-moz-range-thumb]:bg-[var(--brand)] [&::-moz-range-thumb]:shadow",
  "focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-[var(--brand)]",
  "focus-visible:[&::-moz-range-thumb]:ring-offset-2 focus-visible:[&::-moz-range-thumb]:ring-offset-[var(--bg-surface)]",
].join(" ");

/** A tick under the track. A bare number is a tick with no words. */
export interface SliderMark {
  value: number;
  /** Shown under the tick — "30 km/h", "measured". Visual only: the value itself is
   *  announced through `aria-valuetext`, so the marks row is hidden from assistive
   *  technology rather than read out as a list of numbers after the slider. */
  label?: ReactNode;
}

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step" | "children"
  > {
  /** The value. On a log scale this is the real value, not the track position. */
  value: number;
  /** The new value — a number, not the DOM event, like `ToggleGroup`. Fired on every
   *  movement; debounce at the call site if each one costs a request. */
  onChange: (value: number) => void;
  /** The track's ends. Not a validity range: a `value` outside it is kept and the
   *  thumb pins at the end (see the module note). On a log scale `min` must be
   *  above zero — zero is what {@link zeroStop} is for. */
  min: number;
  max: number;
  /** Step on a linear scale (the native default is 1). Ignored on a log scale, which
   *  steps by track position — a fixed step is wrong at one end of every decade. */
  step?: number;
  /**
   * How the track maps to the value. `"log"` for quantities that run over decades — a
   * proportional gain of 0.5 and one of 200 are both ordinary, and on a linear track
   * everything under a tenth of the range is the first pixel. Falls back to linear if
   * `min` is not above zero or `max` not above `min`, where a logarithm has no answer.
   */
  scale?: "linear" | "log";
  /**
   * Log scale only: the far-left stop means exactly 0 ("off"), and the first step to
   * its right is `min`. A logarithm cannot hold zero, and zero is often the question —
   * should there be an integral term at all? Default `true`; turn it off for a scale
   * where zero is meaningless (a zoom factor, a playback rate).
   */
  zeroStop?: boolean;
  /**
   * What a screen reader says for the value — "12.5 mm", "Off". Sets
   * `aria-valuetext`. Without it a log track would announce its 0–1 POSITION ("0.63"
   * for a gain of 12.5), so on a log scale the raw value is announced instead; pass
   * this for anything with a unit or a locale.
   */
  formatValue?: (value: number) => string;
  /** The words above the track, as a `<label for>`. Without it, pass `aria-label`. */
  label?: ReactNode;
  /** Something that belongs to the label rather than the value — in practice a
   *  `FieldHint` "?". Rendered beside the label, outside the `<label>` element, so it
   *  never becomes part of the slider's accessible name. */
  hint?: ReactNode;
  /** The value as the reader sees it, at the end of the label line — a formatted
   *  number, or a `NumberInput` for typing one. Rendered as given. */
  readout?: ReactNode;
  /** Ticks under the track, at these values. Marks outside `min`–`max` are dropped. */
  marks?: ReadonlyArray<number | SliderMark>;
  /** Classes for the `<input>`. `className` styles the outer wrapper. */
  inputClassName?: string;
}

/**
 * A native range input with the kit's track and thumb, an optional label line
 * (`label`, `hint`, `readout`), tick `marks`, and a logarithmic `scale`.
 *
 * Every other prop reaches the `<input>` — `name`, `id`, `aria-*`, `data-*`, `onBlur`,
 * `onPointerUp` for commit-on-release — and `disabled` also fades the label line.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    onChange,
    min,
    max,
    step,
    scale = "linear",
    zeroStop = true,
    formatValue,
    label,
    hint,
    readout,
    marks,
    className,
    inputClassName,
    id,
    disabled,
    style,
    ...rest
  },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const log = scale === "log" && min > 0 && max > min;

  // Everything the native element sees is a POSITION; everything the caller sees is a
  // value. On a linear track the two are the same number.
  const trackMin = log ? 0 : min;
  const trackMax = log ? 1 : max;
  const position = (v: number) => (log ? toLogPosition(v, min, max, zeroStop) : Math.min(max, Math.max(min, v)));
  const current = position(value);
  // 0–1 share of the track, for the fill and the marks. A zero-width range (min ===
  // max) has no share to speak of; call it empty rather than divide by zero.
  const share = (p: number) => (trackMax > trackMin ? (p - trackMin) / (trackMax - trackMin) : 0);
  const outOfRange = value < min || value > max;

  // `aria-valuetext` replaces the announced NUMBER and leaves the announced name
  // alone. The caller's words first (`formatValue`, then a hand-written
  // `aria-valuetext`); failing those, the real value wherever the
  // native one would lie — every log position, and a linear value the thumb is only
  // pinned at. `toPrecision(4)` keeps a log value from being read out to sixteen
  // digits; it is not formatting, and `formatValue` is how to get a locale.
  const valueText = formatValue
    ? formatValue(value)
    : (rest["aria-valuetext"] ??
      (log || outOfRange ? String(Number(value.toPrecision(4))) : undefined));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (!log) return onChange(raw);
    // The gap between the zero stop and `min` has to be crossable by keyboard. An
    // arrow key moves one LOG_STEP, which from zero lands inside the gap — and a gap
    // that rounded to the nearer end would send it straight back to zero, trapping
    // a keyboard user at "off". So inside the gap, moving up from zero means `min`
    // and anything else means zero.
    if (zeroStop && raw > 0 && raw < ZERO_STOP) return onChange(value <= 0 ? min : 0);
    onChange(fromLogPosition(raw, min, max, zeroStop));
  };

  const normalizedMarks = (marks ?? [])
    .map((m) => (typeof m === "number" ? { value: m } : m))
    .filter((m) => m.value >= min && m.value <= max);
  const hasMarkLabels = normalizedMarks.some((m) => m.label !== undefined);

  const hasHeader = label !== undefined || hint !== undefined || readout !== undefined;
  const plainReadout = typeof readout === "string" || typeof readout === "number";

  return (
    <div className={cn("w-full", disabled && "opacity-60", className)}>
      {hasHeader && (
        // `select-none` on the words is not a nicety (Lenkbank feedback #93): a
        // mousedown on text beside a range input starts Chrome's native text drag, the
        // cursor turns to no-drop and the thumb stops following the pointer for the
        // rest of the gesture. The readout is only made unselectable when it is plain
        // text — a NumberInput in that slot has to stay selectable to be editable.
        <div className="flex items-center gap-2">
          {label !== undefined && (
            <label
              htmlFor={inputId}
              className="min-w-0 select-none text-xs font-medium text-[var(--text-secondary)]"
            >
              {label}
            </label>
          )}
          {hint !== undefined && <span className="flex shrink-0 items-center">{hint}</span>}
          {readout !== undefined && (
            <span
              className={cn(
                "ms-auto shrink-0 text-xs tabular-nums text-[var(--text-primary)]",
                plainReadout && "select-none",
              )}
            >
              {readout}
            </span>
          )}
        </div>
      )}
      <input
        ref={ref}
        id={label !== undefined ? inputId : id}
        disabled={disabled}
        {...rest}
        type="range"
        min={trackMin}
        max={trackMax}
        step={log ? LOG_STEP : step}
        value={current}
        aria-valuetext={valueText}
        onChange={handleChange}
        // The fill's break point, merged under the caller's own style.
        style={{ ...style, "--slider-fill": `${share(current) * 100}%` } as CSSProperties}
        className={cn(TRACK, inputClassName)}
      />
      {normalizedMarks.length > 0 && (
        // `mx-2` insets the row by half a thumb on each side, which is exactly the
        // range the thumb's CENTRE travels — so a tick at 0% sits under the thumb at
        // `min`, not under the track's rounded end. Each tick is a zero-width column
        // centred on its point, which centres its label on it in either direction
        // without a `translate` that would need flipping for right-to-left.
        <div
          aria-hidden
          className={cn("relative mx-2 -mt-1.5", hasMarkLabels ? "h-5" : "h-1.5")}
        >
          {normalizedMarks.map((m) => (
            <span
              key={m.value}
              className="absolute top-0 flex w-0 flex-col items-center"
              style={{ insetInlineStart: `${share(position(m.value)) * 100}%` }}
            >
              <span className="h-1.5 w-px shrink-0 bg-[var(--border-strong)]" />
              {m.label !== undefined && (
                <span className="mt-0.5 select-none whitespace-nowrap text-[11px] leading-tight text-[var(--text-muted)]">
                  {m.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
Slider.displayName = "Slider";
