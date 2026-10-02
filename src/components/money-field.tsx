import { useState, type ComponentProps, type Ref } from "react";
import { AmountInput } from "./amount-input";

type AmountInputProps = ComponentProps<typeof AmountInput>;

export interface MoneyFieldProps
  extends Omit<AmountInputProps, "value" | "onChange" | "onCommit" | "negative" | "onNegativeChange" | "ref"> {
  /** The amount, or `null` for an empty field. */
  value: number | null;
  /**
   * The settled amount — on blur, on Enter, on the numpad's "=" and on a calculator
   * result; never a half-typed "1200+". Rounded to the currency's minor unit (or
   * `digits`) and clamped to `min` / `max`, like {@link AmountInput}. `null` when the
   * field was emptied. Not fired when the settled amount equals `value`, so an
   * Enter-then-blur saves once.
   */
  onCommit: (value: number | null) => void;
  ref?: Ref<HTMLInputElement>;
}

/** The number a settled text reads as: `null` for empty, `undefined` for no number
 *  (a lone "-" or "."). */
function parseSettled(text: string): number | null | undefined {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * {@link AmountInput} with a NUMBER in and a number out, for money edited outside a
 * form — a budget row, a table cell (kastlan 52: new-budget-page edited a CHF amount per
 * row with `NumberField` because AmountInput is string-valued and reports every
 * keystroke, "1200+" included, so a number-state row needed its own parse-and-settle
 * glue). This is that glue, the same one `RhfMoneyField` has: the text being typed
 * lives here, and only a settled figure reaches `onCommit`.
 *
 * The currency chip, the calculator, the numpad, the locale's decimal mark, the
 * rounding to the currency's minor unit and `min` / `max` are AmountInput's. A caller-
 * owned sign (`negative`) is not offered: the figure here carries its own minus.
 *
 * So are two props a table cell needs (keksdose K4, K6): `error`, the message under the
 * field that paints and describes it like {@link Input}'s, and `calculator={false}`,
 * for an amount in a close-on-blur inline editor, where a click on the calculator icon
 * blurs the field and tears the editor down before the popover can open (typed
 * calculations still evaluate).
 *
 * `inputClassName` (0.23, keksdose G7) styles the `<input>` itself — `text-end` for a
 * money column — where `className` sizes the wrapper; see {@link AmountInput}'s.
 *
 * This, not a `NumberField` with `digits={2}`, is the number-valued field for money:
 * it settles to the CURRENCY's minor unit (JPY 0, CHF 2) and `digits` takes a unit
 * price's finer scale (kastlan 5).
 *
 * ```tsx
 * <MoneyField ariaLabel="Amount" currency="CHF" value={row.amount}
 *   onCommit={(amount) => updateRow(row.id, { amount })} />
 * ```
 */
export function MoneyField({ value, onCommit, ref, ...props }: MoneyFieldProps) {
  const external = value === null ? "" : String(value);
  // The draft is re-read from `value` only when `value` moves away from what the draft
  // already says (a reset, another row's save), so a commit's own echo keeps the
  // typist's spelling ("12.50" stays "12.50" when 12.5 comes back).
  const [draft, setDraft] = useState(external);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (parseSettled(draft) !== value) setDraft(external);
  }
  return (
    <AmountInput
      {...props}
      ref={ref}
      value={draft}
      onChange={setDraft}
      onCommit={(text) => {
        const next = parseSettled(text);
        // No number ("-" alone): back to the stored amount rather than a guess.
        if (next === undefined) {
          setDraft(external);
          return;
        }
        if (next !== value) onCommit(next);
      }}
    />
  );
}
