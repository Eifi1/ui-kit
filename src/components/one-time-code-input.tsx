import { forwardRef, useId, useState } from "react";
import type { ChangeEvent, ClipboardEvent, FocusEvent, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { hasMessage, mergeDescribedBy } from "./choice-parts";
import { FIELD_BASE, FIELD_INVALID, FIELD_WRITABLE_LOOK, FLOATING_INPUT_CLASS, FloatingField } from "./ui";

/**
 * The field for a verification code — the six digits an authenticator app shows, or the
 * ones a sign-in mail or SMS carries.
 *
 * Asked for by kastlan (input audit, item 3) and keksdose (K8) for the sign-in
 * verification step, and already written twice by hand inside {@link TwoFactorSetting}.
 * The three copies agreed on `inputMode="numeric"` and `autoComplete="one-time-code"`
 * and on nothing else: kastlan's login stripped non-digits and capped at six, keksdose's
 * capped at eight and kept whatever was typed, and the settings card kept everything,
 * spaces included — so "123 456" pasted from an authenticator that groups its digits
 * reached the server with the space in it.
 *
 * ONE FIELD, NOT SIX BOXES. The six-box look is the fashionable one, and every part of
 * it works against the two ways a code actually arrives. A paste lands in ONE input,
 * so the boxes need a paste handler that spreads it; the platform's own code autofill
 * (iOS and macOS offer the code from Messages and Mail above the keyboard, Android's
 * keyboards do the same) fills the ONE field marked `one-time-code`, so the boxes need
 * that field to exist anyway, hidden; and a screen reader hears six unlabelled inputs
 * of one character each. One text field gets all three right for free.
 *
 * WHAT IT DOES TO THE TEXT:
 *  - **Digits only**, as a STRING. A code may start with 0, and a number field would
 *    drop it ("012345" → 12345) — kastlan's login says as much in a comment. Every
 *    character that is not a digit is dropped as it arrives, so the spaces and dashes
 *    of "123 456" and "123-456" go, whether typed or pasted. Full-width digits (what a
 *    Chinese input method types: "１２３") are folded to ASCII first (NFKC).
 *  - **No `maxLength` attribute.** The browser applies it BEFORE the change event, so
 *    pasting "123 456" into a `maxLength={6}` field kept "123 45" and the cleaning saw
 *    one digit short. The length is enforced here instead, after the cleaning: a field
 *    that is full refuses another digit, as `maxLength` would.
 *  - **A paste that is a whole code replaces the field**, wherever the caret is: a
 *    person pasting six digits means "this is the code", not "insert these into the
 *    stale one".
 *  - **The caret stays put** when a character is dropped, rather than jumping to the
 *    end as a controlled input does when its value is put back.
 *
 * `onComplete` fires when an edit — a keystroke, a paste, the platform's autofill —
 * makes the code `length` digits long. It is a notification, nothing more: the field
 * never submits a form on its own. Whether a full code verifies at once is the app's
 * call (a sign-in step may; a "turn off two-factor" form that also wants a password
 * should not). It does not fire for a value set from outside.
 *
 * `label`, `hint` and `error` read as on every kit field: a floating label, a text hint
 * as a caption under the field (a {@link FieldHint} "?" rides the label line instead),
 * the error under that, both attached through `aria-describedby` after the caller's own.
 */
export interface OneTimeCodeInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "autoComplete" | "maxLength" | "pattern"
  > {
  /** The digits so far — a string, so leading zeros survive. */
  value: string;
  /** The cleaned code after every edit: digits only, never longer than `length`. */
  onChange: (code: string) => void;
  /** How many digits the code has. Default 6. The field refuses digits past it. */
  length?: number;
  /** Called with the code when an edit makes it `length` digits long. Never submits
   *  anything itself. */
  onComplete?: (code: string) => void;
  /** The floating label, as on {@link Input}. Without one, name the field with
   *  `aria-label` or `aria-labelledby` (kastlan's login points it at its prompt). */
  label?: ReactNode;
  /** Plain text: a caption under the field, attached with `aria-describedby`. Anything
   *  else (a {@link FieldHint}): on the label line — or at the field's end edge when
   *  there is no label. The rule {@link Select}'s `hint` follows. */
  hint?: ReactNode;
  /** What is wrong ("That code has expired"). Rendered under the field, attached with
   *  `aria-describedby`, and implies `invalid`. */
  error?: ReactNode;
  /** Paint the field invalid and set `aria-invalid` without a message of its own. */
  invalid?: boolean;
  /** Classes for the `<input>`; `className` styles the field's wrapper once it has a
   *  label, the `<input>` itself when it has none — as on {@link Input}. */
  inputClassName?: string;
  /**
   * Keep the field `readOnly` until it first takes focus.
   *
   * A browser that has a login saved for the site fills it in on load — and on a page
   * where the code field is the only text field near a password field, it can take the
   * code field for the username and write the address into it. A read-only field is
   * never autofilled, and focus is the moment a person (or the platform's code
   * suggestion, which needs a focused field anyway) starts to use it. So the field
   * stays read-only until then, and only until then.
   *
   * It keeps the LOOK of an editable field throughout ({@link FIELD_WRITABLE_LOOK}):
   * this is the one place where read-only does not mean "you may not type here", and
   * without the opt-out the field would sit there greyed until it is clicked.
   *
   * {@link TwoFactorSetting} has always done this — its code fields share a page with
   * the current-password field of the disable form — and keeps doing it through this
   * prop. Off by default, because it is a trade: a field that is read-only at the
   * moment focus lands can be announced as read-only by a screen reader, and on some
   * mobile browsers it does not raise the keyboard until a second tap. Turn it on where
   * a saved login actually lands in the field.
   */
  readOnlyUntilFocus?: boolean;
}

// The error line under a field — the type of `ui.tsx`'s (module-private) one, so this
// field's message is indistinguishable from an Input's.
const FIELD_ERROR_CLASS = "mt-1 text-caption leading-tight text-[var(--danger)]";
const FIELD_CAPTION_CLASS = "mt-1 text-caption leading-tight text-[var(--text-muted)]";

// Equal-width digits, spaced a little apart, so a code reads — and compares against the
// authenticator's screen — digit by digit.
const CODE_TYPE = "tabular-nums tracking-widest";

/** The ASCII digits in `text`, in order. NFKC folds full-width digits ("１") to "1". */
function digitsOf(text: string): string {
  return text.normalize("NFKC").replace(/\D/g, "");
}

export const OneTimeCodeInput = forwardRef<HTMLInputElement, OneTimeCodeInputProps>(
  function OneTimeCodeInput(props, ref) {
    const {
      value,
      onChange,
      length = 6,
      onComplete,
      label,
      hint,
      error,
      invalid: invalidProp,
      className,
      inputClassName,
      readOnlyUntilFocus = false,
      readOnly,
      id,
      placeholder,
      onFocus,
      onPaste,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...rest
    } = props;
    // A length below one is no code at all; a fractional one is a typo.
    const size = Math.max(1, Math.floor(length) || 1);
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const hintId = useId();
    const errorId = useId();
    // Text is a caption under the field; a FieldHint rides the label line. See `hint`.
    const textHint = (typeof hint === "string" && hint !== "") || typeof hint === "number";
    const hasError = hasMessage(error);
    // Passed at all — even as `undefined` — the field keeps its box, so the `<input>` is
    // never re-parented (and never loses focus) when a message comes or goes. See
    // `FieldGroup` in ui.tsx.
    const reserve = "error" in props || "hint" in props;
    const describedBy = mergeDescribedBy(ariaDescribedBy, textHint && hintId, hasError && errorId);
    const invalid = Boolean(invalidProp) || hasError || ariaInvalid === true || ariaInvalid === "true";
    const labelled = label !== undefined;

    // Focused once = in use; the guard is down for good from then on (see the prop).
    const [focusedOnce, setFocusedOnce] = useState(false);
    const guarding = readOnlyUntilFocus && !focusedOnce;

    const commit = (next: string) => {
      if (next === value) return;
      onChange(next);
      if (next.length === size) onComplete?.(next);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const raw = input.value;
      const cleaned = digitsOf(raw);
      // Past the length: a full field refuses the digit (what `maxLength` does), a
      // partial one keeps the first `size` — a paste longer than the room left.
      const refused = cleaned.length > size && value.length >= size;
      const next = refused ? value : cleaned.slice(0, size);
      if (next !== raw) {
        // Write the cleaned text back NOW, with the caret where the typist left it.
        // React would otherwise put its value back after this handler, and setting an
        // input's value moves the caret to the end — so a space typed mid-code threw
        // the caret to the last digit. React finds the DOM already agreeing and leaves
        // it alone.
        const caret = input.selectionStart ?? raw.length;
        const at = refused
          ? Math.max(0, caret - (raw.length - value.length))
          : Math.min(digitsOf(raw.slice(0, caret)).length, next.length);
        input.value = next;
        try {
          input.setSelectionRange(at, at);
        } catch {
          /* not every input type has a selection; a text field does */
        }
      }
      commit(next);
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(e);
      // A read-only field still receives the event; it must not take the code.
      if (e.defaultPrevented || readOnly || guarding || rest.disabled) return;
      const pasted = digitsOf(e.clipboardData.getData("text"));
      // Anything else — a few digits into a partial code — is an ordinary insertion,
      // and the change handler cleans it.
      if (pasted.length !== size) return;
      e.preventDefault();
      commit(pasted);
    };

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      if (guarding) setFocusedOnce(true);
      onFocus?.(e);
    };

    const input = (
      <input
        ref={ref}
        id={labelled ? fieldId : id}
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        // The numeric keypad's older cue, for the browsers that predate `inputMode`.
        // The value is digits only, so it can never fail the pattern.
        pattern="[0-9]*"
        // A labelled field's placeholder is a single space: it drives the floating
        // label's `placeholder-shown` trick. Unlabelled, the caller's ("000000") shows.
        placeholder={labelled ? " " : placeholder}
        value={value}
        readOnly={readOnly || guarding}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={handleFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          labelled ? FLOATING_INPUT_CLASS : FIELD_BASE,
          CODE_TYPE,
          // Read-only for the guard's sake only: keep the editable look. A caller's
          // own `readOnly` keeps FIELD_BASE's settled grey, as everywhere else.
          guarding && !readOnly && FIELD_WRITABLE_LOOK,
          !labelled && className,
          inputClassName,
          invalid && FIELD_INVALID,
        )}
      />
    );

    const nonTextHint = hasMessage(hint) && !textHint;
    let field: ReactNode;
    if (labelled) {
      field = (
        <FloatingField className={className} htmlFor={fieldId} label={label} hint={nonTextHint ? hint : undefined}>
          {input}
        </FloatingField>
      );
    } else if (nonTextHint) {
      // No label line to ride: the "?" goes at the field's end edge, outside the box —
      // where an unlabelled Select puts it.
      field = (
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">{input}</div>
          <span className="flex shrink-0 items-center">{hint}</span>
        </div>
      );
    } else {
      field = input;
    }

    if (!textHint && !hasError && !reserve) return field;
    return (
      <div>
        {field}
        {textHint && (
          <p id={hintId} className={FIELD_CAPTION_CLASS}>
            {hint}
          </p>
        )}
        {hasError && (
          <p id={errorId} className={FIELD_ERROR_CLASS}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
OneTimeCodeInput.displayName = "OneTimeCodeInput";
