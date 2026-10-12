import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent, MouseEvent, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { FOCUS_RING } from "./focus-ring";
import { usePhoneLayout } from "../hooks/use-breakpoint";
import { useKitLabels } from "../i18n/kit-labels";
import type { CommitScope } from "./write-lock";
import {
  EndHintRow,
  FieldCaption,
  LockedReason,
  mergeDescribedBy,
  type DisabledReasonDisplay,
  useFieldError,
  useFieldHint,
  useLockReason,
} from "./field-parts";
import { DEFAULT_PASSWORD_REVEAL_LABELS } from "./ui-labels";
import {
  CharacterCount,
  FIELD_BASE,
  FIELD_DISPLAY,
  FIELD_INVALID,
  FieldGroup,
  FloatingField,
  FLOATING_INPUT_CLASS,
  FLOATING_PLACEHOLDER_ON_FOCUS,
  fieldBelow,
  hasPlaceholderText,
  useCharacterCountLabels,
  useTypedLength,
  type CharacterCountLabels,
  type PasswordRevealLabels,
} from "./field-base";

// Native date/time inputs only reveal the calendar via the tiny trailing icon;
// open the picker on a click anywhere in the field instead (feedback #224).
const PICKER_TYPES = new Set(["date", "datetime-local", "month", "time", "week"]);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  /** Classes for the `<input>` itself, as distinct from `className`, which
   *  styles the field WRAPPER once a `label` turns this into a FloatingField.
   *  Without it a labelled Input had no way to reach its own element — so
   *  `tabular-nums` on a numeric text field, which NumberInput has supported
   *  all along through the identically named prop, was simply unavailable. */
  inputClassName?: string;
  /** {@link FIELD_DISPLAY} — on a phone, drop the chrome and set the value as a
   *  heading. For the one field a form is about (a feedback subject, an account
   *  name), never for a stack of them. Labelled fields only: the label is what
   *  the placeholder falls back to once it goes `sr-only`. */
  variant?: "field" | "display";
  /** The field is required and unanswered, or holds something that cannot be
   *  saved — {@link FIELD_INVALID}, the same rose border/ring `Select` has worn
   *  since feedback #235.
   *
   *  It exists here because writing `aria-invalid` by hand did NOT do this. The
   *  attribute spreads onto the element and nothing styles it — there is no
   *  `[aria-invalid]` rule in this package or in either consumer's stylesheet —
   *  so three Keksdose dialogs flagged a mismatched passphrase to a screen reader
   *  and painted the field exactly as if it were fine. Setting the prop sets the
   *  attribute too, so the two can no longer be spelled separately. */
  invalid?: boolean;
  /** What is wrong with the value, in the caller's own words ("That IBAN has 21
   *  digits"). Rendered under the field, pointed at by the control's
   *  `aria-describedby` — MERGED with any the caller already passed — and implies
   *  `invalid`, so the field paints as well as announces. `invalid` alone still
   *  covers the case where the message lives elsewhere. See {@link useFieldError}. */
  error?: ReactNode;
  /**
   * Standing advice for the field (keksdose K4: Input had `error` but no `hint`, so the
   * app built the caption by hand under each field, and half of those never reached a
   * screen reader). The {@link Select} rule, so every field reads alike:
   *  - plain TEXT (a string or a number) is a caption UNDER the field, attached with
   *    `aria-describedby` — after the caller's own ids, before the error's;
   *  - anything else (a {@link FieldHint} "?") rides the label line beside the
   *    animated label, as NumberInput's does — or, on a field with no label, sits at the
   *    field's end edge outside the box, and `className` then styles that row.
   */
  hint?: ReactNode;
  /**
   * A live "12/80" under the field, with `maxLength` (keksdose K11 — the broadcast,
   * support and handoff-note fields counted by hand). Read with the field as "12 of 80
   * characters", and announced politely only on entering the last stretch and on
   * reaching the limit — never on every keystroke. See {@link CharacterCount}. Ignored
   * without a `maxLength`: a count with no limit is not what this answers. Counts
   * UTF-16 code units, as `maxLength` itself does. Controlled, it counts `value`;
   * uncontrolled, `defaultValue` and then every change event — a value written from
   * outside without one (a form library's `reset`) shows from the next keystroke.
   */
  showCount?: boolean;
  /** The counter's words. See {@link CharacterCountLabels}. */
  countLabels?: Partial<CharacterCountLabels>;
  /** Names for the password reveal toggle, English by default — it is the one
   *  string this component renders on its own behalf, and a German form was
   *  reading it out in English. See {@link PasswordRevealLabels}. */
  passwordLabels?: Partial<PasswordRevealLabels>;
  /**
   * Why the value cannot be changed — {@link Button}'s `disabledReason`, for a text field
   * that SAVES itself: a name committed on blur (0.34, KS U10 — Kurvenschmiede's segment
   * and profile names, behind a local `CommitInput`). `disabled` takes the field out of
   * the tab order, so the reason never reached a keyboard.
   *
   * With a reason the field stays in the tab order and shows its value, `readOnly` (the
   * settled grey FIELD_BASE gives a `[readonly]` field) and `aria-disabled` — NumberInput's
   * lock (0.33.1), Autocomplete's. Nothing a save listens to is reported: not `onChange`,
   * not `onBlur` (on a field that saves itself, blur IS the save), and not Enter, which is
   * swallowed so the field does not submit the form around it; the caller's `onKeyDown`
   * still hears every other key. The reason is a line under the field at Large and on a
   * touch screen, else in the kit {@link Tooltip} (`disabledReasonDisplay`), and on the
   * input's `aria-describedby`, between the caption and the error. Wins over `disabled`.
   */
  disabledReason?: ReactNode;
  /**
   * Where the reason shows — {@link Button}'s `disabledReasonDisplay`: by default a line
   * under the field at Large and on a touch screen, the tooltip otherwise (§4 "No fact
   * only in a tooltip"; DUP-3, refactor audit 2026-10).
   */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /**
   * This field COMMITS — {@link Button}'s `commit`: under a locked
   * {@link WriteLockProvider} it is locked the `disabledReason` way with the lock's reason
   * (which wins over its own). A field whose value only reaches the server through its
   * form's Save leaves this off and stays editable under the lock — the Save takes
   * `commit`. No provider, or an unlocked one: no effect.
   */
  commit?: CommitScope;
  /** The `<input>`. A React 19 ref prop since 0.34 (MOD-4, refactor audit 2026-10): as
   *  `forwardRef`, with a `displayName` line beside it, this module could not drop an
   *  unused component, and `{ Spinner }` brought Input, Select and Textarea along. */
  ref?: Ref<HTMLInputElement>;
}

/** What a locked {@link Input} swallows of a key: Enter, which would submit the form. */
function swallowEnter(onKeyDown: ((e: KeyboardEvent<HTMLInputElement>) => void) | undefined) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      return;
    }
    onKeyDown?.(e);
  };
}

export function Input(props: InputProps) {
  const {
    ref,
    className,
    inputClassName,
    label,
    id,
    placeholder,
    type,
    variant = "field",
    invalid,
    error,
    hint,
    showCount,
    countLabels,
    passwordLabels,
    disabledReason,
    disabledReasonDisplay,
    commit,
    ...rest
  } = props;
  // Passed at all — even as `undefined` — the field keeps its box; see FieldGroup. The
  // same for `hint` and `showCount` (keksdose, 0.22): a caption coming and going under
  // the control must not rebuild it, or focus and the caret are lost mid-edit.
  const reserve = "error" in props || "hint" in props || "showCount" in props;
  const generated = useId();
  const fieldId = id ?? generated;
  const countId = useId();
  const hintParts = useFieldHint(hint, rest["aria-describedby"]);
  const maxLength = rest.maxLength;
  const counting = Boolean(showCount) && typeof maxLength === "number" && maxLength > 0;
  const length = useTypedLength(rest.value, rest.defaultValue);
  const countText = useCharacterCountLabels(countLabels);
  // The lock (0.34, KS U10): focusable, `readOnly`, nothing a save listens to is
  // reported — see `disabledReason`.
  const lock = useLockReason(commit, disabledReason);
  const locked = lock.locked;
  const { isInvalid, describedBy, errorEl } = useFieldError(
    error,
    invalid,
    // Caller's, caption, count, a lock's reason — then the error, appended by the hook.
    mergeDescribedBy(hintParts.describedBy, counting && countId, locked && lock.reasonId),
    rest["aria-invalid"],
  );
  const counter = counting ? (
    <CharacterCount
      id={countId}
      used={length.used}
      max={maxLength}
      labels={countText}
      caption={<FieldCaption parts={hintParts} className="mt-0" />}
    />
  ) : null;
  const below = fieldBelow(hintParts, counter, errorEl);
  const onChange = locked
    ? undefined
    : counting
      ? (e: ChangeEvent<HTMLInputElement>) => {
          length.track(e.target.value);
          rest.onChange?.(e);
        }
      : rest.onChange;
  // Locked, these win over what the caller's spread carried: focusable rather than
  // `disabled`, `readOnly`, no blur reported (blur is a self-saving field's save), and
  // Enter swallowed. Spread AFTER `rest` on every branch's input.
  const lockProps = locked
    ? {
        disabled: undefined,
        readOnly: true,
        "aria-disabled": true as const,
        onBlur: undefined,
        onKeyDown: swallowEnter(rest.onKeyDown),
      }
    : undefined;
  // While locked the field sits in the reason's frame (the line, or the Tooltip), which
  // becomes its outermost box — so `className` (a width, a flex or grid cell) moves onto
  // that, as on Select, and the form keeps its layout. `block` so a full-width field
  // stays full width in it.
  const boxClass = locked ? undefined : className;
  const withReason = (box: ReactNode) =>
    locked ? (
      <LockedReason lock={lock} display={disabledReasonDisplay} className={cn("block", className)}>
        {box}
      </LockedReason>
    ) : (
      box
    );
  const asDisplay = usePhoneLayout() && variant === "display";
  // Password fields get a reveal toggle so users can check what they typed.
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  const effectiveType = isPassword && revealed ? "text" : type;
  const handleClick = PICKER_TYPES.has(type ?? "")
    ? (e: MouseEvent<HTMLInputElement>) => {
        rest.onClick?.(e);
        try {
          // showPicker throws if unsupported or not user-activated — a click is
          // a valid activation, so this is safe; guard for older browsers.
          (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } catch {
          /* ignore */
        }
      }
    : rest.onClick;
  const passwordText = useKitLabels("passwordReveal", DEFAULT_PASSWORD_REVEAL_LABELS, passwordLabels);
  const revealToggle = isPassword ? (
    <button
      type="button"
      // `tabIndex={-1}` sat here, which made this a painted, clickable control that
      // Tab stepped straight over — on the one field whose value cannot be checked by
      // looking at it. There is no mouse-only case for a reveal toggle; the people who
      // cannot see what they typed are exactly who it is for. It is a tab stop now,
      // and it needs a focus ring of its own, because FIELD_BASE's ring belongs to the
      // input underneath and stays put while focus moves onto the button on top of it.
      onClick={() => setRevealed((v) => !v)}
      // …and since it is a tab stop, a field the user may not edit must not hand the
      // keyboard a control that shows what is in it — a locked one included.
      disabled={rest.disabled || locked}
      aria-label={revealed ? passwordText.hide : passwordText.show}
      aria-pressed={revealed}
      className={cn(
        "absolute inset-y-0 end-0 flex items-center rounded-e-md px-2.5 text-placeholder transition-colors hover:text-secondary focus:outline-none disabled:cursor-default disabled:opacity-50",
        FOCUS_RING,
      )}
    >
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  ) : null;
  if (label === undefined) {
    // A "?" with no label line to ride goes at the end edge, outside the box, and
    // `className` moves to that row (see `hint`); without one nothing moves.
    const endHint = hintParts.labelHint;
    const ownClass = endHint === undefined ? boxClass : undefined;
    if (!isPassword) {
      return (
        <FieldGroup errorEl={below} reserve={reserve}>
          {withReason(
            <EndHintRow hint={endHint} className={boxClass}>
              <input
                ref={ref}
                id={id}
                type={type}
                placeholder={placeholder}
                {...rest}
                {...lockProps}
                // AFTER the spread, so the prop wins — but OR-ed with whatever the spread
                // carried, or setting `invalid` would have quietly deleted a caller's own
                // `aria-invalid`. The prop is the one that also paints; a bare attribute
                // still announces, which is all it ever did.
                aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
                // Likewise merged rather than replaced — see {@link useFieldError}.
                aria-describedby={describedBy}
                onClick={handleClick}
                onChange={onChange}
                className={cn(FIELD_BASE, ownClass, inputClassName, isInvalid && FIELD_INVALID, locked && "cursor-not-allowed")}
              />
            </EndHintRow>,
          )}
        </FieldGroup>
      );
    }
    return (
      <FieldGroup errorEl={below} reserve={reserve}>
        {withReason(
          <EndHintRow hint={endHint} className={boxClass}>
            <div className={cn("relative", ownClass)}>
              <input
                ref={ref}
                id={id}
                type={effectiveType}
                placeholder={placeholder}
                {...rest}
                {...lockProps}
                aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
                aria-describedby={describedBy}
                onChange={onChange}
                className={cn(FIELD_BASE, "pe-9", inputClassName, isInvalid && FIELD_INVALID, locked && "cursor-not-allowed")}
              />
              {revealToggle}
            </div>
          </EndHintRow>,
        )}
      </FieldGroup>
    );
  }
  const ownPlaceholder = hasPlaceholderText(placeholder);
  return (
    <FieldGroup errorEl={below} reserve={reserve}>
      {withReason(
        <FloatingField
          className={boxClass}
          htmlFor={fieldId}
          label={label}
          srOnlyLabel={asDisplay}
          hint={hintParts.labelHint}
        >
          <input
            ref={ref}
            id={fieldId}
            type={effectiveType}
            // A labelled field with no placeholder of its own gets a single space, which
            // feeds the floating label's peer-placeholder-shown trick. A caller's own is
            // kept and shown on focus, once the label has floated out of its way (kastlan
            // 8) — see FLOATING_PLACEHOLDER_ON_FOCUS. With the label sr-only there is no
            // float left to drive, and an empty borderless line would say nothing at all
            // — so there the label text is the placeholder when the caller gave none.
            placeholder={
              asDisplay
                ? (placeholder ?? (typeof label === "string" ? label : " "))
                : ownPlaceholder
                  ? placeholder
                  : " "
            }
            {...rest}
            {...lockProps}
            aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
            aria-describedby={describedBy}
            onClick={handleClick}
            onChange={onChange}
            className={cn(
              asDisplay
                ? cn(FIELD_DISPLAY, "text-xl font-semibold leading-snug")
                : cn(FLOATING_INPUT_CLASS, ownPlaceholder && FLOATING_PLACEHOLDER_ON_FOCUS),
              isPassword && "pe-9",
              inputClassName,
              isInvalid && FIELD_INVALID,
              locked && "cursor-not-allowed",
            )}
          />
          {revealToggle}
        </FloatingField>,
      )}
    </FieldGroup>
  );
}
