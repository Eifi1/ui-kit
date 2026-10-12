// A field whose value is a list, entered as chips. Moved out of chip.tsx as it was
// (MOD-9, refactor audit 2026-10). It renders `Chip`, so chip.tsx re-exports only its
// TYPES: re-exporting `ChipInput` itself would make chip ⇄ chip-input a runtime cycle
// (check:graph, import-x/no-cycle). The barrel exports this module.
import { useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { isImeEnter } from "../lib/ime";
import { claimEscape } from "../hooks/use-dismiss";
import { FIELD_INVALID, FIELD_TOUCH_TEXT } from "./ui";
import { FIELD_ERROR_CLASS, mergeRefs } from "./field-parts";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { DEFAULT_CHIP_INPUT_LABELS } from "./chip-labels";
import { Chip, type ChipSize, type ChipTone } from "./chip";

/* ── ChipInput ────────────────────────────────────────────────────────────── */

export interface ChipInputLabels {
  /** Announced after a value is added. Receives the value. */
  added: (value: string) => string;
  /** Announced after a value is removed. Receives the value. */
  removed: (value: string) => string;
  /** Accessible name for each chip's dismiss button. */
  remove: string;
  /** Shown when `max` is reached. Receives the limit. */
  atLimit: (max: number) => string;
  /** Shown when a duplicate is rejected. Receives the value. */
  duplicate: (value: string) => string;
}

// Defined in ./chip-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_CHIP_INPUT_LABELS };

export function resolveChipInputLabels(labels?: Partial<ChipInputLabels>): ChipInputLabels {
  return labels ? { ...DEFAULT_CHIP_INPUT_LABELS, ...labels } : DEFAULT_CHIP_INPUT_LABELS;
}

/**
 * `onChange` is the field's own — the whole LIST, not a DOM event — so the wrapper
 * div's `onChange` is omitted rather than shadowed. `placeholder` is likewise this
 * component's, forwarded to the inner `<input>`; the div has none of its own.
 */
export interface ChipInputProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "placeholder" | "children"> {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Visible label, rendered above the field. Without one, name the field with
   *  `aria-label`. */
  label?: string;
  /** Reject or rewrite a value on commit. Return a string to reject WITH that message. */
  validate?: (raw: string) => string | null;
  /** Characters that commit the current text, besides Enter. Default: comma. */
  separators?: string[];
  allowDuplicates?: boolean;
  max?: number;
  tone?: ChipTone;
  size?: ChipSize;
  disabled?: boolean;
  invalid?: boolean;
  /** Error text. Wires `aria-describedby` and implies `invalid`. */
  error?: ReactNode;
  labels?: Partial<ChipInputLabels>;
  className?: string;
  /** The `<input>` the next value is typed into — the element that takes focus, which
   *  react-hook-form's focus-on-error calls `focus()` on (API-3, refactor audit 2026-10).
   *  Not the wrapper, which takes the rest of the props. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A field whose value is a LIST, entered as chips.
 *
 * The keyboard model is the whole component; the pills are the easy part. Per the WAI
 * pattern for a "tag" input:
 *
 *   Enter, or any separator  commit the typed text
 *   Backspace on empty text  move focus to the last chip (does NOT delete it)
 *   ← →  while on a chip     move between chips, in reading order (mirrored in RTL)
 *   Backspace / Delete       remove the focused chip, focus its neighbour
 *   Escape                   clear what is typed but keep the committed chips
 *   paste                    splits on the separators, so a pasted CSV becomes chips
 *
 * The Backspace-on-empty behaviour is the one worth arguing about. Deleting immediately
 * is more common and is a trap: it is a destructive action with no feedback on a key
 * people hit by reflex, and the value it destroys may have taken a while to type. Moving
 * focus first makes the second Backspace a deliberate one, and it is what lets a
 * keyboard user reach a chip at all.
 */
export function ChipInput({
  value,
  onChange,
  placeholder,
  label,
  validate,
  separators = [","],
  allowDuplicates = false,
  max,
  tone = "neutral",
  size = "md",
  disabled = false,
  invalid = false,
  error,
  labels,
  className,
  "aria-label": ariaLabelAttr,
  ref,
  ...rest
}: ChipInputProps) {
  // `labels` over the provider's `chipInput` over English — the same order
  // `resolveChipInputLabels` gives outside a provider.
  const text = useKitLabels("chipInput", DEFAULT_CHIP_INPUT_LABELS, labels);
  // A batch of pasted values is announced as one list, joined the way the language
  // joins a list in a sentence ("a, b and c added") — hence the long conjunction,
  // where a trigger's summary would use the narrow one.
  const locale = useKitLocale();
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  // The last refusal, shown under the field until the next edit. The live region alone
  // told only a screen-reader user why Enter did nothing; everyone else saw the text
  // simply stay put.
  const [rejected, setRejected] = useState<string | null>(null);
  const [focusedChip, setFocusedChip] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The field's own handle on its input (focus after a chip goes) and the caller's `ref`.
  const setInput = useMemo(() => mergeRefs(inputRef, ref), [ref]);
  const chipRefs = useRef<Array<HTMLElement | null>>([]);
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const rejectedId = `${id}-rejected`;
  const isInvalid = invalid || !!error;
  const describedBy = [error ? errorId : null, rejected ? rejectedId : null]
    .filter(Boolean)
    .join(" ");

  const focusChip = (index: number | null) => {
    setFocusedChip(index);
    if (index === null) inputRef.current?.focus();
    else chipRefs.current[index]?.focus();
  };

  /**
   * Try to add every candidate, as ONE change.
   *
   * Batched rather than looped for a reason that bites immediately: `commit` closes over
   * `value`, so calling it once per pasted item makes every call compute its result from
   * the list as it was BEFORE the paste, and each `onChange` overwrites the last. A
   * pasted "one,two,three" left only "three". Accumulating locally and emitting once is
   * also the correct behaviour for an undo stack — a paste is one action.
   */
  const commitMany = (raws: string[]): { added: string[]; rejection: string | null } => {
    const next = [...value];
    const added: string[] = [];
    let rejection: string | null = null;

    for (const raw of raws) {
      const candidate = raw.trim();
      if (!candidate) continue;
      if (max !== undefined && next.length >= max) {
        rejection ??= text.atLimit(max);
        break;
      }
      if (!allowDuplicates && next.includes(candidate)) {
        rejection ??= text.duplicate(candidate);
        continue;
      }
      const invalidReason = validate?.(candidate);
      if (invalidReason) {
        rejection ??= invalidReason;
        continue;
      }
      next.push(candidate);
      added.push(candidate);
    }

    if (added.length) onChange(next);
    // A rejection is the more useful thing to say: "three added" is obvious from the
    // chips appearing, whereas "already in the list" is the only sign of what did not.
    const addedList = new Intl.ListFormat(locale, { type: "conjunction", style: "long" });
    setMessage(rejection ?? (added.length ? text.added(addedList.format(added)) : ""));
    setRejected(rejection);
    return { added, rejection };
  };

  const commit = (raw: string): boolean => commitMany([raw]).added.length > 0;

  const removeAt = (index: number) => {
    const removed = value[index];
    onChange(value.filter((_, i) => i !== index));
    setMessage(text.removed(removed));
    setRejected(null);
    // Focus the neighbour that takes its place, or the input when the list empties —
    // dropping focus to <body> here is how a keyboard user loses the field entirely.
    const next = index >= value.length - 1 ? null : index;
    requestAnimationFrame(() => focusChip(value.length - 1 === 0 ? null : next));
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // The Enter that confirms an IME composition is the IME's: it commits no chip
      // and submits no form (BUG-9).
      if (isImeEnter(e)) return;
      // Only when there is something to commit: an empty Enter belongs to the form.
      if (draft.trim()) {
        e.preventDefault();
        if (commit(draft)) setDraft("");
      }
      return;
    }
    if (separators.includes(e.key)) {
      e.preventDefault();
      if (commit(draft)) setDraft("");
      return;
    }
    // Clearing the draft is this field's Escape, not a dialog's around it: claimed, so
    // the dialog stays — the same in a Modal and a FullBleedDialog, which read it
    // differently until 0.34 (Wave 2, DUP-1). With nothing typed the key goes on.
    if (e.key === "Escape" && draft) {
      claimEscape(e);
      setDraft("");
      return;
    }
    if (e.key === "Backspace" && !draft && value.length) {
      e.preventDefault();
      focusChip(value.length - 1);
    }
  };

  const onChipKeyDown = (e: KeyboardEvent<HTMLElement>, index: number) => {
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      removeAt(index);
      return;
    }
    // ←/→ follow the reading direction, not DOM order: in RTL the previous chip is to
    // the RIGHT, and ArrowLeft moves on towards the input.
    const step = horizontalStep(e.key, e.currentTarget);
    if (step === -1 && index > 0) {
      e.preventDefault();
      focusChip(index - 1);
      return;
    }
    if (step === 1) {
      e.preventDefault();
      focusChip(index === value.length - 1 ? null : index + 1);
      return;
    }
    // Back to the input, a step inside the field: claimed like the draft's (DUP-1).
    if (e.key === "Escape") {
      claimEscape(e);
      focusChip(null);
    }
  };

  return (
    // The rest lands on the OUTER box — the thing a `data-tour` step or a test id
    // wants to point at — while the accessible name below goes on the `<input>`,
    // because that is what a screen-reader user actually lands in. Spreading the two
    // to the same element would have named a decorative wrapper and left the field
    // anonymous.
    <div {...rest} className={cn("space-y-1", className)}>
      {label && (
        <label htmlFor={`${id}-input`} className="block text-sm text-secondary">
          {label}
        </label>
      )}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a
          pointer convenience that widens the input's hit area to the whole field; the
          keyboard path is the <input> itself, which is in the tab order. */}
      <div
        // `relative` so the live region below can be `sr-only` without escaping to the
        // initial containing block and inflating the document height.
        className={cn(
          "relative flex flex-wrap items-center gap-1.5 rounded-md border border-subtle bg-surface px-2 py-1.5 shadow-sm",
          "focus-within:border-brand focus-within:ring-1 focus-within:ring-brand",
          disabled && "cursor-default bg-surface-2",
          isInvalid && FIELD_INVALID,
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* `display: contents` on the wrappers so the chips participate in the field's
            own flex wrap rather than forming a nested row. The list semantics are
            restored with explicit roles, because `contents` removes the ul/li boxes from
            the accessibility tree in several engines. */}
        {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- NOT redundant here: the
            `contents` display below removes the ul and li boxes from the box tree, and
            several engines drop the list semantics with them. The explicit role is what
            puts "list, 3 items" back. */}
        <ul id={listId} role="list" className="contents">
          {value.map((v, i) => (
            <li key={`${v}-${i}`} role="presentation" className="contents">
              <Chip
                ref={(el: HTMLElement | null) => {
                  chipRefs.current[i] = el;
                }}
                tone={tone}
                size={size}
                disabled={disabled}
                removeLabel={text.remove}
                onRemove={disabled ? undefined : () => removeAt(i)}
                // A ROVING tabIndex: only the focused chip is tabbable, so Tab leaves
                // the field instead of walking through every value in it — the reason a
                // list of twenty tags is otherwise a twenty-stop detour for a keyboard.
                tabIndex={focusedChip === i ? 0 : -1}
                role="listitem"
                aria-label={v}
                onKeyDown={(e) => onChipKeyDown(e, i)}
                onFocus={() => setFocusedChip(i)}
                data-chip-index={i}
              >
                {v}
              </Chip>
            </li>
          ))}
        </ul>
        <input
          id={`${id}-input`}
          ref={setInput}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setMessage("");
            setRejected(null);
          }}
          onKeyDown={onInputKeyDown}
          onBlur={() => {
            // Commit on blur: a value typed and then clicked away from is a value the
            // user meant to add, and losing it silently is the commonest complaint
            // about this pattern.
            if (draft.trim() && commit(draft)) setDraft("");
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            const pattern = new RegExp(`[${separators.map((s) => `\\${s}`).join("")}\n\r]`);
            if (!pattern.test(pasted)) return;
            e.preventDefault();
            if (commitMany(pasted.split(pattern)).added.length) setDraft("");
          }}
          placeholder={value.length ? undefined : placeholder}
          disabled={disabled}
          // A visible `label` is already wired through `htmlFor`, so adding a name
          // here would give the field two.
          aria-label={label ? undefined : ariaLabelAttr}
          aria-describedby={describedBy || undefined}
          aria-invalid={isInvalid || !!rejected || undefined}
          // `w-0` with flex-1: without a width the browser's default input size (20
          // characters) became the field's minimum width and pushed it past a 240 px
          // phone at 150 % (0.32's screenshot run).
          className={cn("w-0 min-w-[6rem] flex-1 bg-transparent py-0.5 text-sm text-primary outline-none placeholder:text-placeholder disabled:cursor-default", FIELD_TOUCH_TEXT)}
        />
        {/* Additions, removals and rejections move no focus, so nothing would announce
            them. `sr-only-fixed` rather than `sr-only`: this sits inside a consumer's
            markup and must not extend the document height. */}
        <span role="status" aria-live="polite" aria-atomic className="sr-only-fixed">
          {message}
        </span>
      </div>
      {/* Every field's error type (DUP-8: these were `text-xs`); the root's `space-y-1`
          spaces them, so not the class's own `mt-1` as well. */}
      {error && (
        <p id={errorId} className={cn(FIELD_ERROR_CLASS, "mt-0")}>
          {error}
        </p>
      )}
      {rejected && (
        <p id={rejectedId} className={cn(FIELD_ERROR_CLASS, "mt-0")} data-chip-input-rejected="">
          {rejected}
        </p>
      )}
    </div>
  );
}
