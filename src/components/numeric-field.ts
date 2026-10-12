import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useKitLocale } from "../i18n/kit-labels";
import { decimalMark, localizeMark, readTyped, showsTyped } from "../lib/decimal-marks";
import {
  mergeDescribedBy,
  useFieldError,
  useFieldHint,
  useLockReason,
  type FieldHintParts,
  type LockReason,
} from "./field-parts";
import type { CommitScope } from "./write-lock";

/**
 * The engine NumberInput and AmountInput share (DUP-10, refactor audit 2026-10): the
 * lock, the hint and its caption, the error, the `aria-describedby` order, the typist's
 * draft and what the field shows, the calculator and the phone's numpad, and the room
 * its end controls take. They were two copies of it, and each fix had to be made twice —
 * some reached only one: NumberInput measured its end controls (keksdose live #367) and
 * took a `locale`, AmountInput did neither; the 0.32 FieldHint caption reached
 * AmountInput two releases late.
 *
 * Each field keeps what is its own: the settle (money's minor unit and `min`/`max`
 * against NumberInput's "what was typed"), the caller-owned sign, and its trailing
 * controls. Package-private — not re-exported from the barrel.
 */

/** The props both fields take and this engine reads. */
export interface NumericFieldProps {
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  disabled?: boolean;
  disabledReason?: ReactNode;
  commit?: CommitScope;
  /** Show the desktop calculator trigger. Default `true`. */
  calculator?: boolean;
  variant?: "field" | "display";
  locale?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export interface NumericFieldOptions {
  /** The field's own settle, dot-decimal in and out — AmountInput's minor unit and
   *  `min` / `max`; NumberInput's identity (it never rounds). */
  settle: (text: string) => string;
  /** What the field shows while no typed draft stands, dot-decimal, given whether it
   *  has focus — spelt in the locale's mark here (`derived`). */
  display: (focused: boolean) => string;
}

export interface NumericField {
  /** The write lock: focusable, `readOnly`, nothing changes or commits. */
  lock: LockReason;
  locked: boolean;
  /** Natively `disabled`: `disabled`, and no lock — a reason wins over it. */
  off: boolean;
  /** The hint, split into the caption under the field and the label line's "?". */
  hint: FieldHintParts;
  /** `invalid`, a message, or a form library's `aria-invalid`. */
  isInvalid: boolean;
  /** The caller's ids, the caption, a lock's reason, the error — Select's order. */
  describedBy: string | undefined;
  /** The message under the field, or `null`. */
  errorEl: ReactNode;
  /** The phone layout: the numpad sheet replaces the keyboard and the calculator. */
  isMobile: boolean;
  /** `variant="display"`, on a phone. */
  asDisplay: boolean;
  showCalc: boolean;
  showNumpad: boolean;
  focused: boolean;
  setFocused: (focused: boolean) => void;
  /** The locale's decimal mark — the field's `locale`, else the provider's. */
  mark: "," | ".";
  /** The typist's own text while a figure is typed, else `null`. */
  draft: string | null;
  setDraft: (draft: string | null) => void;
  /** `display(focused)` in the locale's mark. */
  derived: string;
  /** The draft, while it still says what `canonical` (dot-decimal) says and holds
   *  nothing the field would drop — see `showsTyped`; else `null`. */
  typedFor: (canonical: string) => string | null;
  /** A keystroke's raw text: kept as the draft, and read as a number reads it —
   *  grouping off, dot-decimal. */
  read: (raw: string) => string;
  settle: (text: string) => string;
}

export function useNumericField(props: NumericFieldProps, { settle, display }: NumericFieldOptions): NumericField {
  const lock = useLockReason(props.commit, props.disabledReason);
  const locked = lock.locked;
  // §4: a FieldHint is the caption at Large and on touch, as on every field.
  const hint = useFieldHint(props.hint, props["aria-describedby"]);
  // The standing advice first, the news second: the caller's ids, the caption, the
  // error — a lock's reason between the last two, as on Select.
  const field = useFieldError(
    props.error,
    props.invalid,
    mergeDescribedBy(hint.describedBy, locked && lock.reasonId),
    props["aria-invalid"],
  );
  // On phones the OS keyboard is suppressed (`inputMode="none"`) for the kit's numpad
  // sheet, so the desktop calculator trigger is hidden (feedback #334). A locked field
  // offers neither: their result would be a value.
  const isMobile = usePhoneLayout();
  const [focused, setFocused] = useState(false);
  const mark = decimalMark(useKitLocale(props.locale));
  const [draft, setDraft] = useState<string | null>(null);
  return {
    lock,
    locked,
    off: Boolean(props.disabled) && !locked,
    hint,
    isInvalid: field.isInvalid,
    describedBy: field.describedBy,
    errorEl: field.errorEl,
    isMobile,
    asDisplay: isMobile && props.variant === "display",
    showCalc: (props.calculator ?? true) && !props.disabled && !locked && !isMobile,
    showNumpad: isMobile && !props.disabled && !locked && focused,
    focused,
    setFocused,
    mark,
    draft,
    setDraft,
    derived: localizeMark(display(focused), mark),
    typedFor: (canonical) => (draft !== null && showsTyped(draft, mark, canonical) ? draft : null),
    read: (raw) => {
      setDraft(raw);
      return readTyped(raw, mark);
    },
    settle,
  };
}

/**
 * The measured width of a field's end controls (keksdose live #367), and the ref for
 * their track: `null` before the first measurement and wherever there is no layout
 * (jsdom), where the field keeps its class fallback. A `ResizeObserver` calls back once
 * on `observe`, and again whenever the controls change size (a chip's code, a translated
 * label, the text size). A pair, so the width reads as the plain number it is.
 */
export function useEndWidth(present: boolean): [RefObject<HTMLDivElement | null>, number | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!present || !el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const measured = el.getBoundingClientRect().width;
      setWidth(measured > 0 ? Math.ceil(measured) : null);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [present]);
  return [ref, width];
}
