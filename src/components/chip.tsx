import { forwardRef, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { FIELD_INVALID } from "./ui";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLocale } from "../i18n/kit-labels";

/**
 * A chip: a compact pill carrying one value.
 *
 * Three jobs, deliberately one component. A chip can be inert (a tag on a row), a link
 * (a jump to a section), or a toggle (a filter that is on or off) — and the difference is
 * which prop you pass, not which component you pick. Keeping them together is what stops
 * an app growing three near-identical pills that drift apart; it is the shape this kit
 * already uses for `Button`, which is a link when it is given an href.
 *
 * A chip is not a `Button`. It is smaller, it is rounded to a pill, and it reads as a
 * VALUE rather than as an action — which matters because a row of eight buttons says
 * "choose one of eight things to do" and a row of eight chips says "here are eight
 * things". Using `Button` for both is the mistake this exists to prevent.
 */

export type ChipTone =
  | "neutral"
  | "brand"
  | "danger"
  | "warning"
  | "success"
  | "info"
  | "income"
  | "expense";
/** `lg` is the 44px touch target (`min-h-11`) a phone surface wants; `md` is ~28px. */
export type ChipSize = "sm" | "md" | "lg";

const TONE: Record<ChipTone, { idle: string; selected: string }> = {
  neutral: {
    idle: "border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)]",
    selected: "border-[var(--border-strong)] bg-[var(--bg-active)] text-[var(--text-primary)]",
  },
  brand: {
    idle: "border-[var(--border)] bg-[var(--brand-bg)] text-[var(--brand-muted)]",
    selected: "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]",
  },
  danger: {
    idle: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]",
    selected: "border-[var(--danger)] bg-[var(--danger)] text-[var(--danger-contrast)]",
  },
  warning: {
    idle: "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]",
    selected: "border-[var(--warning)] bg-[var(--warning-bg)] text-[var(--warning)]",
  },
  success: {
    idle: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]",
    selected: "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]",
  },
  info: {
    idle: "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info)]",
    selected: "border-[var(--info)] bg-[var(--info-bg)] text-[var(--info)]",
  },
  // The money pair (Keksdose's direction toggle). Only the TEXT and the BORDER carry
  // the tint, on the neutral chip's own surfaces: the money tokens are chosen for text
  // contrast, and a filled amber pill beside an amber figure reads as one smear.
  // `border-current` takes its hue from the text, so the two cannot drift apart.
  income: {
    idle: "border-current/40 bg-[var(--bg-surface-2)] text-[var(--money-income)]",
    selected: "border-current bg-[var(--bg-active)] text-[var(--money-income)]",
  },
  expense: {
    idle: "border-current/40 bg-[var(--bg-surface-2)] text-[var(--money-expense)]",
    selected: "border-current bg-[var(--bg-active)] text-[var(--money-expense)]",
  },
};

const SIZE: Record<ChipSize, { body: string; icon: string; remove: string }> = {
  sm: { body: "gap-1 px-2 py-0.5 text-xs", icon: "size-3", remove: "size-3" },
  md: { body: "gap-1.5 px-2.5 py-1 text-sm", icon: "size-3.5", remove: "size-3.5" },
  lg: { body: "min-h-11 gap-2 px-4 py-2 text-sm", icon: "size-4", remove: "size-4" },
};

const CHIP_BASE =
  "inline-flex max-w-full items-center rounded-full border transition-colors " +
  // `focus-visible`, not `focus`: a chip commonly receives focus programmatically (the
  // ChipInput moves focus onto one after a removal) and a ring that appears on a
  // pointer click reads as a stuck selection.
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]";

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  icon?: LucideIcon;
  /**
   * Marks the chip as the current one — `aria-current` on a link, `aria-pressed` on a
   * toggle.
   *
   * On a toggle, keep the LABEL the same in both states and let `selected` carry the
   * state. A label that flips with it ("Skip this month" / "Ask again this month") is
   * announced together with "pressed", and then says the opposite of what it does.
   */
  selected?: boolean;
  /** Renders the chip as a link. Mutually exclusive with `onClick`. */
  href?: string;
  /** Renders the chip as a toggle button. Mutually exclusive with `href`. Receives the
   *  click, so a chip inside a clickable row can `stopPropagation()`. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Renders a dismiss affordance. Works alongside `href`/`onClick` — see the note below. */
  onRemove?: () => void;
  /** Accessible name for the dismiss button. Default: `common.remove` from the
   *  {@link UiKitProvider}, else "Remove". */
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Roving focus, for a container that manages a row of chips (see {@link ChipInput}).
   * A chip with no `href`/`onClick` is inert and unfocusable by default; give it a
   * `tabIndex` and a `role` and it becomes the thing arrow keys move between.
   */
  tabIndex?: number;
  role?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  onFocus?: () => void;
  /** Accessible name, when the visible text is not the whole story. */
  "aria-label"?: string;
  /** Any other ARIA attribute — `aria-describedby`, `aria-expanded`, `aria-controls`,
   *  `aria-haspopup` — reaches the chip's interactive element. */
  [key: `aria-${string}`]: string | boolean | number | undefined;
  /** A test id, a `data-tour` anchor, or any other data attribute. */
  [key: `data-${string}`]: unknown;
  id?: string;
  /** A native tooltip. For anything a user must read, prefer the kit's `Tooltip`. */
  title?: string;
}

/**
 * Note on `onRemove` with `href`/`onClick`: a button cannot be nested inside a button or
 * a link, so when both are present the chip renders a wrapper holding TWO siblings — the
 * interactive body and the dismiss control. That is why the outer element is not always
 * the interactive one, and why the focus ring is drawn on the body rather than the
 * wrapper.
 */
export const Chip = forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    children,
    tone = "neutral",
    size = "md",
    icon: Icon,
    selected = false,
    href,
    onClick,
    onRemove,
    removeLabel,
    disabled = false,
    className,
    tabIndex,
    role,
    onKeyDown,
    onFocus,
    ...rest
  },
  ref,
) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, { remove: removeLabel });
  const s = SIZE[size];
  const palette = TONE[tone];
  const interactive = !!href || !!onClick;
  const look = cn(
    CHIP_BASE,
    s.body,
    selected ? palette.selected : palette.idle,
    interactive && !disabled && "cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110",
    disabled && "cursor-default opacity-50",
    className,
  );

  const body = (
    <>
      {Icon && <Icon className={cn(s.icon, "shrink-0")} aria-hidden />}
      <span className="min-w-0 truncate">{children}</span>
    </>
  );

  const remove = onRemove ? (
    <button
      type="button"
      // The name carries WHAT is being removed, not just "Remove" — a screen-reader user
      // tabbing a row of eight dismiss buttons otherwise hears the same word eight times
      // with no way to tell which one they are on.
      // Composed through `common.fieldValue` because the punctuation between the two
      // halves is the language's, not ours. A chip whose content is not plain text
      // has no value to name, and gets the bare verb rather than a dangling colon.
      aria-label={
        typeof children === "string" && children
          ? common.fieldValue(common.remove, children)
          : common.remove
      }
      onClick={(e) => {
        // The chip may itself be a link; removing it must not also follow it.
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }}
      disabled={disabled}
      className={cn(
        "-mr-0.5 ml-0.5 shrink-0 rounded-full p-0.5 transition-colors",
        "hover:bg-[var(--bg-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
        disabled && "pointer-events-none",
      )}
    >
      <X className={s.remove} aria-hidden />
    </button>
  ) : null;

  // ── The three shapes.
  if (href && !disabled) {
    const link = (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        aria-current={selected ? "true" : undefined}
        className={cn(look, remove && "pr-1.5")}
        {...rest}
      >
        {body}
        {!remove && null}
      </a>
    );
    return remove ? (
      <span className="inline-flex items-center">
        {link}
        {remove}
      </span>
    ) : (
      link
    );
  }

  if (onClick) {
    const button = (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        className={cn(look, remove && "pr-1.5")}
        {...rest}
      >
        {body}
      </button>
    );
    return remove ? (
      <span className="inline-flex items-center">
        {button}
        {remove}
      </span>
    ) : (
      button
    );
  }

  return (
    <span
      ref={ref as React.Ref<HTMLSpanElement>}
      className={look}
      tabIndex={tabIndex}
      role={role}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      {...rest}
    >
      {body}
      {remove}
    </span>
  );
});

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

export const DEFAULT_CHIP_INPUT_LABELS: ChipInputLabels = {
  added: (v) => `${v} added`,
  removed: (v) => `${v} removed`,
  remove: "Remove",
  atLimit: (max) => `Limit of ${max} reached`,
  duplicate: (v) => `${v} is already in the list`,
};

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
  /**
   * @deprecated Pass `aria-label` instead — the DOM spelling the rest of this kit
   * now uses. Still honoured, and still second to `aria-label` when both are given.
   */
  ariaLabel?: string;
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
}

/**
 * A field whose value is a LIST, entered as chips.
 *
 * The keyboard model is the whole component; the pills are the easy part. Per the WAI
 * pattern for a "tag" input:
 *
 *   Enter, or any separator  commit the typed text
 *   Backspace on empty text  move focus to the last chip (does NOT delete it)
 *   ← →  while on a chip     move between chips
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
  ariaLabel,
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
  const [focusedChip, setFocusedChip] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef<Array<HTMLElement | null>>([]);
  const id = useId();
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const isInvalid = invalid || !!error;

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
    return { added, rejection };
  };

  const commit = (raw: string): boolean => commitMany([raw]).added.length > 0;

  const removeAt = (index: number) => {
    const removed = value[index];
    onChange(value.filter((_, i) => i !== index));
    setMessage(text.removed(removed));
    // Focus the neighbour that takes its place, or the input when the list empties —
    // dropping focus to <body> here is how a keyboard user loses the field entirely.
    const next = index >= value.length - 1 ? null : index;
    requestAnimationFrame(() => focusChip(value.length - 1 === 0 ? null : next));
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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
    if (e.key === "Escape" && draft) {
      e.preventDefault();
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
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusChip(index - 1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusChip(index === value.length - 1 ? null : index + 1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
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
        <label htmlFor={`${id}-input`} className="block text-sm text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div
        // `relative` so the live region below can be `sr-only` without escaping to the
        // initial containing block and inflating the document height.
        className={cn(
          "relative flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5 shadow-sm",
          "focus-within:border-[var(--brand)] focus-within:ring-1 focus-within:ring-[var(--brand)]",
          disabled && "cursor-default bg-[var(--bg-surface-2)]",
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
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setMessage("");
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
          // here would give the field two. Failing that, the DOM spelling wins and
          // the deprecated `ariaLabel` is the fallback.
          aria-label={label ? undefined : (ariaLabelAttr ?? ariaLabel)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={isInvalid || undefined}
          className="min-w-[6rem] flex-1 bg-transparent py-0.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-placeholder)] disabled:cursor-default"
        />
        {/* Additions, removals and rejections move no focus, so nothing would announce
            them. `sr-only-fixed` rather than `sr-only`: this sits inside a consumer's
            markup and must not extend the document height. */}
        <span role="status" aria-live="polite" aria-atomic className="sr-only-fixed">
          {message}
        </span>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
