import { useEffect, useId, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { NumberInput } from "./number-input";
import { formatResult } from "../lib/calc";
import { useKitLocale } from "../i18n/kit-labels";

type NumberInputProps = ComponentProps<typeof NumberInput>;

export interface NumberFieldProps
  extends Omit<NumberInputProps, "value" | "onChange" | "onCommit" | "suffix" | "invalid"> {
  /** The committed number. `null` is "no value" — shown as an empty field. */
  value: number | null;
  /**
   * The parsed number, on blur or Enter — never per keystroke — and only when it
   * differs from the last one committed. Already rounded to `digits` and clamped
   * into `[min, max]`. `null` only when `nullable` and the field was emptied.
   */
  onCommit: (value: number | null) => void;
  /** Round to this many decimals on commit, and show at most this many (trailing
   *  zeros are trimmed: `digits={2}` shows 12.5, not 12.50). Omit for no rounding. */
  digits?: number;
  /** Clamp the committed number into `[min, max]`. Applied after rounding. */
  min?: number;
  max?: number;
  /** An emptied field commits `null`. Without it an empty field is not an answer
   *  and snaps back to the last value, like any other unparsable text. */
  nullable?: boolean;
  /** The unit — "mm", "%", "km/h". */
  unit?: ReactNode;
  /** Where `unit` goes: `"suffix"` (default) is NumberInput's read-out at the
   *  field's end edge; `"label"` appends it to the label as "Label (unit)", for rows
   *  of narrow fields where a suffix would eat the digits. */
  unitPlacement?: "suffix" | "label";
  /** BCP 47 tag for the decimal mark, else the `<UiKitProvider locale>`, else the
   *  runtime's. */
  locale?: string;
  /** See {@link Input}'s `invalid`. */
  invalid?: boolean;
  /** See {@link Input}'s `error`: shown under the field, attached via
   *  `aria-describedby`, implies `invalid`. */
  error?: ReactNode;
  /** Merged with the error's id. Accepted so a form library's control slot (which
   *  injects `id` / `aria-describedby` / `aria-invalid`) can wrap this directly. */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

/** The locale's decimal mark, as far as this field can type it: "," or ".". A mark
 *  outside those two (Arabic's "٫") is not something {@link sanitizeLive} lets
 *  through, so those locales keep the dot rather than get a field that eats keys. */
function decimalMark(locale: string | undefined): "," | "." {
  try {
    const part = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal");
    return part?.value === "," ? "," : ".";
  } catch {
    // An invalid tag throws a RangeError; a typo in a locale prop must not take the
    // form down with it.
    return ".";
  }
}

/** `toFixed` rounding rather than `Math.round(n * 10^d)`, which turns 1.005 into
 *  1.00 by way of 100.49999999999999 — the same choice the lenkbank field made. */
function roundTo(n: number, digits: number | undefined): number {
  if (digits === undefined) return n;
  const d = Math.min(Math.max(Math.trunc(digits), 0), 100);
  const rounded = Number(n.toFixed(d));
  return Number.isFinite(rounded) ? rounded : n;
}

// The error line under a field — the same type as `ui.tsx`'s (module-private) one,
// so a NumberField's message is indistinguishable from an Input's.
const FIELD_ERROR_CLASS = "mt-1 text-[11px] leading-tight text-[var(--danger)]";

/**
 * A number field whose value IS a number: {@link NumberInput}'s text, calculator and
 * numpad, with the parse/commit/revert loop every consumer was writing on top of it.
 *
 * WHY THE DRAFT. Half-typed values — "-", "1,", "12+" — are not numbers, and
 * reformatting them mid-keystroke moves the caret and fights the typist; committing
 * per keystroke would also fire whatever a commit fires (a recalculation, a save) for
 * every meaningless intermediate. So the field keeps a draft STRING while it is being
 * typed and resolves it on blur/Enter:
 *
 *  - a number (or a calculation, "2700+50") → rounded to `digits`, clamped into
 *    `[min, max]`, committed, and the draft re-rendered from the result;
 *  - empty → `null` when `nullable`, otherwise the same as the next case — `Number("")`
 *    is 0, and clearing a wheelbase and tabbing away must not set it to zero;
 *  - anything else unparsable → the draft SNAPS BACK to the last committed value
 *    rather than sending NaN on for a server to reject.
 *
 * The draft follows `value` when it changes from outside (a reset, a loaded record);
 * a change that came from here arrives back identical and is a no-op.
 *
 * LOCALE. The decimal mark is the locale's: a German user sees and types "1,5".
 * NumberInput normalises every keystroke to a dot (so its evaluator reads one
 * alphabet); this field maps the dot back before the draft is shown, which also
 * means the numpad's "." key types the mark the field is displaying. There is no
 * digit grouping — "1.000" would read as a thousand in German and as one in English,
 * and a field that parses its own display back must not have that ambiguity.
 */
export function NumberField({
  value,
  onCommit,
  digits,
  min,
  max,
  nullable = false,
  unit,
  unitPlacement = "suffix",
  locale: localeProp,
  label,
  invalid,
  error,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: NumberFieldProps) {
  const locale = useKitLocale(localeProp);
  const mark = decimalMark(locale);
  const localize = (text: string) => (mark === "," ? text.replace(/\./g, ",") : text);
  // `formatResult` for fixed notation: `String(1e-7)` is "1e-7", which the field
  // would read back as 17 (see calc.ts).
  const format = (n: number | null) =>
    n === null || !Number.isFinite(n) ? "" : localize(formatResult(roundTo(n, digits)));

  const [draft, setDraft] = useState(() => format(value));
  // Everything the displayed text depends on, not just `value`: switching the
  // provider's language or a field's `digits` has to re-render the draft too.
  const shownFor = `${value}|${mark}|${digits}`;
  const [seen, setSeen] = useState(shownFor);
  // The last number handed to `onCommit`, so Enter-then-blur (both commit) and a
  // parent that does not echo the value back cannot commit the same number twice.
  // State rather than a ref because the external-change branch below resets it
  // during render, and a ref may not be written there.
  const [committed, setCommitted] = useState(value);

  // Adjust state during render rather than in an effect: React re-renders at once
  // with the new draft, before anything is painted, so there is no frame showing
  // the old text.
  if (shownFor !== seen) {
    setSeen(shownFor);
    setDraft(format(value));
    setCommitted(value);
  }

  const commit = (text: string) => {
    const trimmed = text.trim();
    let next: number | null;
    if (trimmed === "") {
      if (!nullable) return setDraft(format(committed));
      next = null;
    } else {
      // `text` is NumberInput's committed form: an evaluated calculation, dot-decimal.
      // What survives its digits-only fallback can still be "-" or "." alone.
      const parsed = Number(trimmed.replace(/,/g, "."));
      if (!Number.isFinite(parsed)) return setDraft(format(committed));
      next = roundTo(parsed, digits);
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
    }
    // Always re-render the draft from the result — "007" becomes "7", a clamped 500
    // shows the 100 it was clamped to — even when there is nothing new to commit.
    setDraft(format(next));
    if (next !== committed) {
      setCommitted(next);
      onCommit(next);
    }
  };

  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = useId();
  // `null`/`false`/`""` are what `touched && errors.x` evaluates to on the happy path.
  const hasError = error !== undefined && error !== null && error !== false && error !== "";
  const describedBy = [ariaDescribedBy, hasError ? errorId : undefined].filter(Boolean).join(" ");

  // NumberInput takes no `aria-describedby` of its own, so the reference is set on
  // its <input> directly, found by the id this field hands it. React never renders
  // that attribute there, so nothing reconciles it away again.
  useEffect(() => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    if (describedBy) input.setAttribute("aria-describedby", describedBy);
    else input.removeAttribute("aria-describedby");
  }, [fieldId, describedBy]);

  const labelWithUnit =
    unit !== undefined && unitPlacement === "label"
      ? label === undefined || label === ""
        ? unit
        : typeof label === "string" && typeof unit === "string"
          ? `${label} (${unit})`
          : (
            <>
              {label} ({unit})
            </>
          )
      : label;

  const field = (
    <NumberInput
      {...rest}
      id={fieldId}
      label={labelWithUnit}
      value={draft}
      onChange={(text) => setDraft(localize(text))}
      onCommit={commit}
      suffix={unitPlacement === "suffix" ? unit : undefined}
      invalid={invalid || hasError || ariaInvalid === true || ariaInvalid === "true"}
    />
  );
  // Same shape as Input's FieldGroup: no wrapper at all without a message, so adding
  // `error` support changed nothing about the DOM a flex row lays out.
  if (!hasError) return field;
  return (
    <div>
      {field}
      <p id={errorId} className={FIELD_ERROR_CLASS}>
        {error}
      </p>
    </div>
  );
}
