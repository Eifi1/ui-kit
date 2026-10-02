import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { IBAN_LENGTHS, compactIban, formatIban, ibanProblem } from "../lib/iban";
import type { IbanKind, IbanProblem } from "../lib/iban";
import { assignRef, hasMessage } from "./choice-parts";
import { Input, type InputProps } from "./ui";

// ── Labels ────────────────────────────────────────────────────────────────────

/** The messages {@link IbanInput} shows under itself, one per {@link IbanProblem}. */
export interface IbanInputLabels {
  /** The value does not start with a two-letter country code and two check digits. */
  format: string;
  /** The first two letters are no country in the IBAN registry. `code` is those two
   *  letters, as typed (upper case). */
  country: (code: string) => string;
  /** The wrong length for the country: `actual` characters typed, `expected` for that
   *  country (spaces not counted in either). */
  length: (actual: number, expected: number) => string;
  /** The mod-97 check digits do not match — a mistyped or swapped character. */
  checksum: string;
  /** `kind="qr"`: a valid IBAN, but not a QR-IBAN. */
  qrRequired: string;
  /** `kind="plain"`: a QR-IBAN, which cannot receive an ordinary transfer. */
  qrNotAllowed: string;
}

export const DEFAULT_IBAN_INPUT_LABELS: IbanInputLabels = {
  format: "An IBAN starts with a two-letter country code and two check digits.",
  country: (code) => `“${code}” is not the country code of an IBAN.`,
  length: (actual, expected) =>
    `An IBAN from this country has ${expected} characters — this one has ${actual}.`,
  checksum: "The check digits don’t match — a character is probably mistyped.",
  qrRequired: "This is a regular IBAN. A QR-bill needs the account’s QR-IBAN.",
  qrNotAllowed: "This is a QR-IBAN, which only receives QR-bill payments. Enter the account’s regular IBAN.",
};

/**
 * The `ibanInput` namespace: prop > `<UiKitProvider labels>` > English (0.22.0).
 */
function useIbanInputLabels(prop: Partial<IbanInputLabels> | undefined): IbanInputLabels {
  const labels: IbanInputLabels = useKitLabels("ibanInput", DEFAULT_IBAN_INPUT_LABELS, prop);
  return labels;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const alnumCount = (text: string) => text.replace(/[^0-9A-Za-z]/g, "").length;

/** The index just after the `count`-th letter or digit of `text` — where the caret
 *  goes once the grouping has moved the characters it was between. */
function indexAfter(text: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/[0-9A-Za-z]/.test(text[i])) seen += 1;
    if (seen === count) return i + 1;
  }
  return text.length;
}

/**
 * The problem worth SHOWING right now. Settled (not focused): whatever is wrong. While
 * typing: only what more typing cannot fix — a broken start or an unknown country from
 * the fourth character, and the rest once the country's full length is there. A
 * half-typed IBAN is not wrong, and a field that says "wrong length" from the first
 * keystroke is a field people learn to ignore.
 */
function visibleProblem(compact: string, kind: IbanKind, focused: boolean): IbanProblem | null {
  if (compact === "") return null;
  const problem = ibanProblem(compact, kind);
  if (problem === null || !focused) return problem;
  if (compact.length < 4) return null;
  if (problem === "format" || problem === "country") return problem;
  return compact.length >= IBAN_LENGTHS[compact.slice(0, 2)]! ? problem : null;
}

function messageFor(problem: IbanProblem, compact: string, labels: IbanInputLabels): string {
  switch (problem) {
    case "format":
      return labels.format;
    case "country":
      return labels.country(compact.slice(0, 2));
    case "length":
      return labels.length(compact.length, IBAN_LENGTHS[compact.slice(0, 2)]!);
    case "checksum":
      return labels.checksum;
    case "qrRequired":
      return labels.qrRequired;
    case "qrNotAllowed":
      return labels.qrNotAllowed;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface IbanInputProps extends Omit<InputProps, "type" | "value" | "defaultValue"> {
  /** The IBAN, compact or not — it is shown in groups of four either way. `""` is
   *  "no IBAN". */
  value: string;
  /** The compact, upper-case IBAN (the electronic format, what to store) on every
   *  change — valid or not: a half-typed IBAN is still the field's value. Plain
   *  `onChange` still fires alongside it with the raw event, whose text is the GROUPED
   *  one, so bind this rather than `onChange` to a form. */
  onValueChange?: (value: string) => void;
  /** Which IBANs the field accepts. Default `"any"`. `"qr"` / `"plain"`: see
   *  {@link IbanKind} — and why the difference matters, {@link isQrIban}. */
  kind?: IbanKind;
  /** The messages, per field. See {@link IbanInputLabels}. */
  labels?: Partial<IbanInputLabels>;
  /** The caller's own message, shown INSTEAD of the built-in one while it is set (a
   *  server's "this account is already on file"). `null`, `false` and `""` are no
   *  message, so `touched && errors.iban` can be passed as it is. */
  error?: ReactNode;
}

/**
 * An IBAN field (kastlan, keksdose): typed in any shape, shown in groups of four,
 * reported compact.
 *
 * Both apps had a text field and a regex. What that left out is everything between
 * the keyboard and the stored value: a pasted "ch09 0000-0000…" stayed lower case
 * with its hyphens, the grouping that makes 21 characters checkable by eye was
 * missing, and a wrong IBAN was found out by the bank. Here:
 *
 *  - **Grouped as you type.** The field shows the paper format ({@link formatIban});
 *    spaces, hyphens and lower case in what is typed or pasted are folded away, and
 *    the caret stays between the same two characters while the groups move around it.
 *  - **Compact out.** `onValueChange` gets the electronic format — upper case, no
 *    spaces — which is the one to store and to compare.
 *  - **Checked, never blocked.** A wrong country, length or checksum shows a message
 *    under the field, through the kit's `error` (so it is the field's
 *    `aria-describedby` and paints it), but every keystroke still lands: a field that
 *    refuses characters cannot be corrected one character at a time. While the field
 *    has focus only what more typing cannot fix is shown; the rest waits for the full
 *    length or for blur. Whether the field is REQUIRED stays the form's rule — an empty
 *    field says nothing.
 *  - **QR-IBAN or not** (kastlan): `kind="qr"` refuses a regular IBAN and
 *    `kind="plain"` refuses a QR-IBAN — a QR-bill can only be paid to a QR-IBAN, and a
 *    QR-IBAN can receive nothing else. See {@link isQrIban}.
 *
 * It is {@link Input} underneath, so `label`, `hint`, `error`, `invalid` and the rest
 * are Input's own and the field reads like every other. A form that must not submit
 * an invalid IBAN checks {@link isValidIban} / {@link ibanProblem} itself — the field
 * shows the problem but does not own the submit.
 */
export const IbanInput = forwardRef<HTMLInputElement, IbanInputProps>(function IbanInput(
  { value, onValueChange, onChange, onFocus, onBlur, kind = "any", labels, error, inputClassName, ...rest },
  ref,
) {
  const text = useIbanInputLabels(labels);
  const compact = compactIban(value);
  const shown = formatIban(compact);
  const [focused, setFocused] = useState(false);
  const innerRef = useRef<HTMLInputElement | null>(null);
  // Letters and digits before the caret, kept across the re-render that regroups.
  const caretRef = useRef<number | null>(null);
  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      innerRef.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  // Every render: when a change moved the groups, put the caret back after the same
  // character it followed. Only while focused — a value set from outside moves nothing.
  useLayoutEffect(() => {
    const el = innerRef.current;
    const count = caretRef.current;
    if (el === null || count === null) return;
    caretRef.current = null;
    if (el.ownerDocument.activeElement !== el) return;
    const at = indexAfter(el.value, count);
    el.setSelectionRange(at, at);
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    const el = e.target;
    const raw = el.value;
    const next = compactIban(raw);
    // Characters compactIban dropped from the front (a pasted "IBAN " label) are not
    // in the value, so they are not counted before the caret either.
    const dropped = alnumCount(raw) - next.length;
    const count = Math.max(0, alnumCount(raw.slice(0, el.selectionStart ?? raw.length)) - dropped);
    if (next === compact) {
      // Nothing the value holds changed — a space typed, a group's space deleted — so
      // no re-render will come to regroup it. Regroup now, and keep the caret: after
      // a Backspace on a group's space, that is just before it.
      el.value = shown;
      const at = indexAfter(shown, count);
      el.setSelectionRange(at, at);
    } else {
      caretRef.current = count;
    }
    onValueChange?.(next);
  };

  const problem = visibleProblem(compact, kind, focused);
  return (
    <Input
      ref={setRefs}
      {...rest}
      type="text"
      value={shown}
      onChange={handleChange}
      onFocus={(e: FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e: FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(e);
      }}
      autoComplete={rest.autoComplete ?? "off"}
      autoCapitalize={rest.autoCapitalize ?? "characters"}
      autoCorrect={rest.autoCorrect ?? "off"}
      spellCheck={rest.spellCheck ?? false}
      // ALWAYS passed, even while there is no message: a field that takes `error`
      // keeps its box, so the message coming and going under the caret never remounts
      // the input (see Input's FieldGroup) — this one comes and goes as you type.
      error={hasMessage(error) ? error : problem ? messageFor(problem, compact, text) : undefined}
      // Groups of four line up only when every digit is the same width.
      inputClassName={cn("tabular-nums", inputClassName)}
    />
  );
});
IbanInput.displayName = "IbanInput";
