import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useRef } from "react";
import type { ButtonHTMLAttributes, ChangeEvent, ComponentType, InputHTMLAttributes, ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../lib/cn";
import { assignRef, hasMessage, mergeDescribedBy } from "./choice-parts";

/**
 * A checkbox or a radio, presented as a bordered card: a title, a line of description,
 * an optional icon — and the whole card is the hit area.
 *
 * Kastlan built this twice by hand: the "manage roles" dialog wraps a `Checkbox` in a
 * bordered `<label>` per role, and the lease wizard's "set up recurring rent" option is
 * a `Checkbox` with `className="rounded-md border p-3"`. Neither had a focus ring on
 * the card or a checked look beyond the 16px box, and the role picker's border stayed
 * grey whether the role was on or off.
 *
 * Still a native `<input>` underneath, for the reasons {@link Checkbox} gives: it
 * submits with its form, answers to `required`, and a radio set sharing a `name` gets
 * the browser's own arrow-key behaviour — which already flips in a right-to-left page.
 * The card is a `<label>` wrapped round it, so a click anywhere on the card lands on
 * the input; the input is NAMED by the title alone and DESCRIBED by the description,
 * so a screen reader does not read the whole card as its name.
 *
 * Checked is said three ways, none of them colour alone: the box's tick (or the
 * radio's dot), a heavier border, and the brand-tinted surface.
 */

export type ChoiceCardType = "checkbox" | "radio";

export interface ChoiceCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "title"> {
  /** "checkbox" (default) for an on/off option or one of several; "radio" for one of
   *  a set — give every card of the set the same `name`, or use {@link ChoiceCardGroup}. */
  type?: ChoiceCardType;
  /** The option's name — the input's accessible name. */
  title: ReactNode;
  /** A line or two under the title. Attached with `aria-describedby`. */
  description?: ReactNode;
  /** A Lucide icon (or any component taking a `className`), shown at the card's start. */
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Checkbox only: "some but not all". See {@link CheckboxProps.indeterminate}. */
  indeterminate?: boolean;
  /** Paints the card and sets `aria-invalid` together. */
  invalid?: boolean;
  /** What is wrong, in the caller's words. Rendered in the card and attached with
   *  `aria-describedby`; implies `invalid`. */
  error?: ReactNode;
  /** The checked state as a boolean. Fires alongside `onChange`, never instead of it. */
  onCheckedChange?: (checked: boolean) => void;
  /** Classes for the `<input>`. `className` styles the card. */
  inputClassName?: string;
  /**
   * Must be ticked to submit. Reaches the `<input>` as the native `required` (a
   * `<form>` refuses to submit without it, a screen reader announces "required"),
   * and draws the kit's `aria-hidden` star after the title — {@link Checkbox}'s
   * contract, down to writing the title WITHOUT a literal "*". Inside a
   * {@link ChoiceCardGroup} the star goes on the legend instead, once.
   */
  required?: boolean;
}

/** Set by {@link ChoiceCardGroup}: its legend carries the one required mark, so the
 *  cards inside it draw none of their own. Private — not a prop a caller could set
 *  by accident on a lone card. */
const InGroupContext = createContext(false);

/** The kit's required mark — {@link Label}'s: `aria-hidden`, because the word is
 *  announced from the control and a star read out in the name is only noise. */
function RequiredMark() {
  return (
    <span aria-hidden className="ms-0.5 text-[var(--danger)]">
      *
    </span>
  );
}

// The card. `has-[:checked]` and `has-[:focus-visible]` read the INPUT's state, so an
// uncontrolled card (`defaultChecked`, a plain form) looks right with no React state.
const CARD =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-sm transition-colors " +
  "hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] " +
  "has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-bg)] has-[:checked]:ring-1 has-[:checked]:ring-[var(--brand)] " +
  // The focus mark is the CARD's, not the 16px box's: the card is what was clicked and
  // what the eye is on. An OUTLINE rather than a ring, because the checked state already
  // spends the ring — two `ring-*` widths on one element are decided by stylesheet
  // order, and the loser would be the focus mark. Offset, so the two never merge.
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--brand)] " +
  // Read from the input too, so a card disabled by its `<fieldset>` fades as well.
  "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";

// No hover offer on a card that cannot be changed.
const CARD_DISABLED = "hover:border-[var(--border)] hover:bg-[var(--bg-surface)]";

const CARD_INVALID =
  "border-[var(--danger-border)] ring-1 ring-[var(--danger-border)] has-[:checked]:border-[var(--danger-border)] has-[:checked]:ring-[var(--danger-border)]";

const BOX =
  "peer size-4 shrink-0 appearance-none border border-[var(--border-strong)] bg-[var(--bg-surface)] transition-colors " +
  "checked:border-[var(--brand)] focus:outline-none disabled:cursor-not-allowed";
const CHECKBOX = "rounded-[4px] checked:bg-[var(--brand)]";
// A radio's dot is its BORDER: a 5px brand border round a surface-coloured 4px
// centre. No glyph to lay over it, and it scales with the box.
const RADIO = "rounded-full checked:border-[5px]";

export const ChoiceCard = forwardRef<HTMLInputElement, ChoiceCardProps>(function ChoiceCard(
  {
    type = "checkbox",
    title,
    description,
    icon: Icon,
    indeterminate = false,
    invalid,
    error,
    onCheckedChange,
    onChange,
    className,
    inputClassName,
    id,
    disabled,
    required,
    ...rest
  },
  ref,
) {
  const inGroup = useContext(InGroupContext);
  const generated = useId();
  const inputId = id ?? generated;
  const titleId = `${inputId}-title`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const showDescription = hasMessage(description);
  const showError = hasMessage(error);
  const isInvalid = Boolean(invalid) || showError;
  const mixed = type === "checkbox" && indeterminate;

  const local = useRef<HTMLInputElement | null>(null);
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      local.current = node;
      assignRef(ref, node);
    },
    [ref],
  );
  // After every render, as Checkbox does: a click clears the DOM property.
  useEffect(() => {
    if (local.current) local.current.indeterminate = mixed;
  });

  return (
    <label
      htmlFor={inputId}
      className={cn(CARD, disabled && CARD_DISABLED, isInvalid && CARD_INVALID, className)}
    >
      {/* A 20px cell, so the box centres on the title's first line (text-sm). */}
      <span className="relative flex h-5 shrink-0 items-center">
        <input
          ref={setRef}
          id={inputId}
          disabled={disabled}
          required={required}
          {...rest}
          type={type}
          aria-labelledby={rest["aria-labelledby"] ?? titleId}
          aria-invalid={isInvalid || rest["aria-invalid"] || undefined}
          aria-describedby={mergeDescribedBy(
            rest["aria-describedby"],
            showDescription && descriptionId,
            showError && errorId,
          )}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
          className={cn(
            BOX,
            type === "radio" ? RADIO : CHECKBOX,
            mixed && "border-[var(--brand)] bg-[var(--brand)]",
            inputClassName,
          )}
        />
        {type === "checkbox" &&
          (mixed ? (
            <Minus
              aria-hidden
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto size-3 text-[var(--brand-contrast)]"
            />
          ) : (
            <Check
              aria-hidden
              strokeWidth={3}
              className="pointer-events-none invisible absolute inset-0 m-auto size-3 text-[var(--brand-contrast)] peer-checked:visible"
            />
          ))}
      </span>
      {Icon && <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--text-secondary)]" />}
      <span className="min-w-0 flex-1">
        <span
          id={titleId}
          // `select-none`: a double-click to toggle twice would otherwise select the words.
          className="block select-none text-sm font-medium leading-5 text-[var(--text-primary)]"
        >
          {title}
          {required && !inGroup && <RequiredMark />}
        </span>
        {showDescription && (
          <span id={descriptionId} className="mt-0.5 block text-xs text-[var(--text-muted)]">
            {description}
          </span>
        )}
        {showError && (
          <span id={errorId} className="mt-1 block text-[11px] leading-tight text-[var(--danger)]">
            {error}
          </span>
        )}
      </span>
    </label>
  );
});
ChoiceCard.displayName = "ChoiceCard";

/* ── ActionCard ──────────────────────────────────────────────────────────── */

/** The colour of {@link ActionCardProps.meta}. */
export type ActionCardMetaTone = "muted" | "warning" | "danger" | "info" | "success";

const META_TONE: Record<ActionCardMetaTone, string> = {
  muted: "text-[var(--text-muted)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  info: "text-[var(--info)]",
  success: "text-[var(--success)]",
};

export interface ActionCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  /** What the card does — the button's accessible name. */
  title: ReactNode;
  /** A line or two on what it means. Attached with `aria-describedby`. */
  description?: ReactNode;
  /**
   * What it costs, or what else to know — a third line, said as prose and not as fine
   * print (keksdose's custody choice: both options are legitimate and neither is free,
   * so a card listing only benefits would be selling rather than explaining). Attached
   * with `aria-describedby` after the description.
   */
  meta?: ReactNode;
  /** The meta line's colour. Default `muted`; keksdose's cost line is `warning`. */
  metaTone?: ActionCardMetaTone;
  /** A Lucide icon (or any component taking a `className`), shown at the card's start. */
  icon?: ChoiceCardProps["icon"];
}

/**
 * A {@link ChoiceCard} that ACTS rather than holds a state: a `<button>` with the
 * card's icon, title and description, plus a `meta` line, that runs `onClick` the
 * moment it is pressed. keksdose's privacy enrolment (privacy-enroll-dialog:345,
 * `CustodyOption`) offers two custody modes this way — picking one IS the next step,
 * so there is no checked state to show and no "Continue" to press after it.
 *
 * A separate component rather than `ChoiceCard as="button"`: a ChoiceCard is an
 * `<input>` (its ref, its `checked`, its form value), and a button shares none of it.
 * Named by the title alone and described by the rest, so a screen reader hears
 * "Keep the key yourself, button" and then the explanation, not one long name.
 */
export const ActionCard = forwardRef<HTMLButtonElement, ActionCardProps>(function ActionCard(
  { title, description, meta, metaTone = "muted", icon: Icon, className, id, type = "button", ...rest },
  ref,
) {
  const generated = useId();
  const baseId = id ?? generated;
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const metaId = `${baseId}-meta`;
  const showDescription = hasMessage(description);
  const showMeta = hasMessage(meta);
  return (
    <button
      ref={ref}
      id={id}
      type={type}
      {...rest}
      aria-labelledby={rest["aria-labelledby"] ?? titleId}
      aria-describedby={mergeDescribedBy(
        rest["aria-describedby"],
        showDescription && descriptionId,
        showMeta && metaId,
      )}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-start shadow-sm transition-colors",
        "hover:border-[var(--brand)] hover:bg-[var(--bg-hover)]",
        // The outline, as on ChoiceCard: the card is what the eye is on.
        "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-[var(--border)] disabled:hover:bg-[var(--bg-surface)]",
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-[var(--text-secondary)]" />}
      <span className="min-w-0 flex-1 space-y-1">
        <span id={titleId} className="block text-sm font-medium leading-5 text-[var(--text-primary)]">
          {title}
        </span>
        {showDescription && (
          <span id={descriptionId} className="block text-sm text-[var(--text-secondary)]">
            {description}
          </span>
        )}
        {showMeta && (
          <span id={metaId} className={cn("block text-sm", META_TONE[metaTone])}>
            {meta}
          </span>
        )}
      </span>
    </button>
  );
});
ActionCard.displayName = "ActionCard";

/* ── ChoiceCardGroup ─────────────────────────────────────────────────────── */

export interface ChoiceCardOption<T extends string> {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  icon?: ChoiceCardProps["icon"];
  disabled?: boolean;
}

interface ChoiceCardGroupBaseProps<T extends string> {
  options: ChoiceCardOption<T>[];
  /** The question the cards answer. Rendered as the fieldset's `<legend>`, which is
   *  what names the group. Without one, pass `aria-label`. */
  legend?: ReactNode;
  "aria-label"?: string;
  /** Shared by every input — what a plain form submits under. Generated if omitted. */
  name?: string;
  /** Classes for the card grid. Default: one column, two from `sm` up. */
  className?: string;
  /** Classes for every card. */
  cardClassName?: string;
  disabled?: boolean;
  /** What is wrong with the answer as a whole. Rendered under the cards and attached
   *  to the fieldset. */
  error?: ReactNode;
  /**
   * An answer is needed. Draws the required star after the `legend` (none without
   * one — the name then comes from `aria-label`, which has nowhere to draw it), and
   * reaches the inputs as the native `required`:
   *  - radios: every radio of the set, which is how HTML marks a radio group — the
   *    group is satisfied by any one of them, and each announces "required";
   *  - checkboxes: every box while NONE is ticked, dropped from all of them once one
   *    is — "at least one", which checkboxes cannot say natively. A form then refuses
   *    to submit an empty set, and nothing is left demanding a second box.
   */
  required?: boolean;
}

/** One of the set: radios. `value` is `null` while nothing is chosen. */
export interface ChoiceCardSingleProps<T extends string> extends ChoiceCardGroupBaseProps<T> {
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
}

/** Any of the set: checkboxes. */
export interface ChoiceCardMultipleProps<T extends string> extends ChoiceCardGroupBaseProps<T> {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
}

export type ChoiceCardGroupProps<T extends string> =
  | ChoiceCardSingleProps<T>
  | ChoiceCardMultipleProps<T>;

/**
 * A set of {@link ChoiceCard}s answering one question, in a `<fieldset>`.
 *
 * `multiple` picks the input: radios (one of the set, the browser's arrow keys
 * between them) or checkboxes (any of the set, Tab between them). The value is kept
 * in the order of `options`, not the order the boxes were ticked, so a list saved
 * from it does not depend on the order someone clicked in.
 */
export function ChoiceCardGroup<T extends string>(props: ChoiceCardGroupProps<T>) {
  const { options, legend, name, className, cardClassName, disabled, error, required } = props;
  const generated = useId();
  const groupName = name ?? generated;
  const errorId = `${generated}-error`;
  const showError = hasMessage(error);

  const isChecked = (v: T) => (props.multiple ? props.value.includes(v) : props.value === v);
  const toggle = (v: T, on: boolean) => {
    if (props.multiple) {
      const next = new Set(props.value);
      if (on) next.add(v);
      else next.delete(v);
      props.onChange(options.map((o) => o.value).filter((x) => next.has(x)));
    } else if (on) {
      props.onChange(v);
    }
  };

  return (
    <InGroupContext.Provider value={true}>
      <fieldset
        aria-label={props["aria-label"]}
        aria-describedby={showError ? errorId : undefined}
        disabled={disabled}
        className="min-w-0"
      >
        {legend !== undefined && (
          <legend className="mb-2 text-sm font-medium text-[var(--text-primary)]">
            {legend}
            {required && <RequiredMark />}
          </legend>
        )}
        <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
          {options.map((o) => (
            <ChoiceCard
              key={o.value}
              type={props.multiple ? "checkbox" : "radio"}
              name={groupName}
              value={o.value}
              title={o.title}
              description={o.description}
              icon={o.icon}
              disabled={o.disabled}
              invalid={showError}
              required={required && (!props.multiple || props.value.length === 0) ? true : undefined}
              checked={isChecked(o.value)}
              onCheckedChange={(on) => toggle(o.value, on)}
              className={cardClassName}
            />
          ))}
        </div>
        {showError && (
          <p id={errorId} className="mt-1 text-[11px] leading-tight text-[var(--danger)]">
            {error}
          </p>
        )}
      </fieldset>
    </InGroupContext.Provider>
  );
}
