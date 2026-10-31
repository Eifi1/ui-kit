import { useState } from "react";
import { formatResult } from "../lib/calc";

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
  // A number that is not finite is no amount, as on NumberField. NaN never equals itself,
  // and the re-read below took it for a new value on every render until React threw "Too
  // many re-renders" — MoneyField and RhfMoneyField both (refactor audit 2026-10-30,
  // INP-11).
  const stored = typeof value === "number" && !Number.isFinite(value) ? null : value;
  // `formatResult`, not `String`: `String` writes exponent form below 1e-6 and from 1e21,
  // and the commit's digits-only cleanup strips the "e" — one click into the field and
  // away committed a float leftover of 5.1e-15 as 5.12, 1e-7 as 17 and 1e21 as 121
  // (INP-12, BUG-11's class).
  const external =
    stored === null || stored === undefined ? "" : typeof stored === "number" ? formatResult(stored) : String(stored);
  const [draft, setDraft] = useState(external);
  const [seen, setSeen] = useState<unknown>(stored);
  if (!Object.is(seen, stored)) {
    setSeen(stored);
    const same = valueAs === "string" ? draft === external : readAmount(draft) === amountOf(stored);
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
