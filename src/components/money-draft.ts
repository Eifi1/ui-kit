import { useState } from "react";

/**
 * The draft-and-settle loop of a money field whose store is not AmountInput's text.
 * Package-private — a module of its own so `money-field.tsx`'s `export *` in the barrel
 * does not make it API.
 */

/** The number an amount's text reads as — AmountInput reports dot-decimal text — `null`
 *  for empty, `undefined` for no number yet (a lone "-" or ".", a sum still being typed:
 *  "1200+"). */
export function readAmount(text: string): number | null | undefined {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** A stored amount as a number: a number as it is, a stored text read as an amount's
 *  text is, nothing as `null`. */
function amountOf(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? (Number.isFinite(value) ? value : undefined) : readAmount(String(value));
}

/** {@link useMoneyDraft}'s answer. */
export interface MoneyDraft {
  /** The text the field shows — AmountInput's `value`. */
  draft: string;
  /** AmountInput's `onChange`: keeps the typed text, and answers what it reads as — a
   *  number, `null` for empty, `undefined` for no number yet. */
  change: (text: string) => number | null | undefined;
  /** AmountInput's `onCommit`: what the settled text reads as. With no number in it (a
   *  lone "-") the draft goes back to the stored amount — rather than a guess, and rather
   *  than leaving "-" on screen while the store keeps the old figure — and the answer is
   *  `undefined`. A `"string"` store keeps what was typed: it holds that text too. */
  settle: (text: string) => number | null | undefined;
}

/**
 * The draft-and-settle loop of a money field whose store is a number, or text the store
 * holds itself: `MoneyField`'s, and `RhfMoneyField`'s (`valueAs`). One copy since 0.34
 * (DUP-9, refactor audit 2026-10): the twin's own kept a different parse and no
 * snap-back, so a lone "-" stayed on screen while the form kept the old number.
 *
 * The text being typed lives here — a stored number cannot hold "12." or "12+5" — and is
 * re-read from `value` only when `value` moves away from what the draft already says (a
 * reset, another row's save, a `setValue`), so a commit's own echo keeps the typist's
 * spelling ("12.50" stays "12.50" when 12.5 comes back).
 */
export function useMoneyDraft(value: unknown, valueAs: "number" | "string" = "number"): MoneyDraft {
  const external = value === null || value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(external);
  const [seen, setSeen] = useState<unknown>(value);
  if (seen !== value) {
    setSeen(value);
    const same = valueAs === "string" ? draft === external : readAmount(draft) === amountOf(value);
    if (!same) setDraft(external);
  }
  return {
    draft,
    change: (text) => {
      setDraft(text);
      return readAmount(text);
    },
    settle: (text) => {
      const next = readAmount(text);
      if (next === undefined && valueAs === "number") setDraft(external);
      return next;
    },
  };
}
