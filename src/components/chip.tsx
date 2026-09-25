import { forwardRef, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
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
/**
 * How much of the tone the chip wears.
 *
 * - `soft` (default): the tinted surface every chip has had.
 * - `outline`: the tone's border and text on NO surface — keksdose's DEV badge in the
 *   account menu and kastlan's 27 shadcn `variant="outline"` badges, which sit on
 *   coloured rows where a second tint would muddy the row.
 * - `solid`: the tone as a fill under contrasting text — the "count" pill (unread
 *   messages, open tasks). It centres its content and sets figures tabular, so a
 *   one-digit count is a round dot and "9" → "10" does not jiggle the row.
 */
export type ChipVariant = "soft" | "outline" | "solid";
/** `pill` (default) is fully rounded; `square` has the small radius of a field or a
 *  button — for a chip that sits in a table cell or beside square controls. */
export type ChipShape = "pill" | "square";

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

// `outline` idle looks: the tone's border and text, the surface left to whatever the
// chip sits on. Selected still takes the tone's `selected` look (below), because an
// outline toggle that stays an outline when on has no visible state.
const OUTLINE: Record<ChipTone, string> = {
  neutral: "border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)]",
  brand: "border-[var(--brand)] bg-transparent text-[var(--brand)]",
  danger: "border-[var(--danger-border)] bg-transparent text-[var(--danger)]",
  warning: "border-[var(--warning-border)] bg-transparent text-[var(--warning)]",
  success: "border-[var(--success-border)] bg-transparent text-[var(--success)]",
  info: "border-[var(--info-border)] bg-transparent text-[var(--info)]",
  income: "border-current/60 bg-transparent text-[var(--money-income)]",
  expense: "border-current/60 bg-transparent text-[var(--money-expense)]",
};

// `solid`: the fill under its contrast pair. Only brand and danger have a declared
// `-contrast` token; the other hues are 700s in the light theme and 300s in the dark
// one, so `--text-inverse` (the surface colour) is the side of the pair that contrasts
// with them in both — which is what the inverse token is for. The border goes
// transparent rather than away, so a solid chip is exactly as tall as a soft one.
const SOLID: Record<ChipTone, string> = {
  neutral: "border-transparent bg-[var(--bg-inverse)] text-[var(--text-inverse)]",
  brand: "border-transparent bg-[var(--brand)] text-[var(--brand-contrast)]",
  danger: "border-transparent bg-[var(--danger)] text-[var(--danger-contrast)]",
  warning: "border-transparent bg-[var(--warning)] text-[var(--text-inverse)]",
  success: "border-transparent bg-[var(--success)] text-[var(--text-inverse)]",
  info: "border-transparent bg-[var(--info)] text-[var(--text-inverse)]",
  income: "border-transparent bg-[var(--money-income)] text-[var(--text-inverse)]",
  expense: "border-transparent bg-[var(--money-expense)] text-[var(--text-inverse)]",
};

/** The status-badge type (`caps`): a size step down, heavier and tracked, because
 *  capitals at body size shout and capitals untracked run together. Per size, so it
 *  replaces the size's own `text-*` through tailwind-merge. */
const CAPS: Record<ChipSize, string> = {
  sm: "text-[10px] font-semibold uppercase tracking-wider",
  md: "text-[11px] font-semibold uppercase tracking-wider",
  lg: "text-xs font-semibold uppercase tracking-wider",
};

function surfaceOf(tone: ChipTone, variant: ChipVariant, selected: boolean | undefined): string {
  const palette = TONE[tone];
  if (variant === "solid") {
    // A solid chip is already the strongest look there is, so "on" is a ring round it.
    return cn(SOLID[tone], selected && "ring-2 ring-[var(--border-strong)] ring-offset-1 ring-offset-[var(--bg-surface)]");
  }
  if (selected) return palette.selected;
  return variant === "outline" ? OUTLINE[tone] : palette.idle;
}

/** What {@link ChipProps.renderLink} is handed: everything the chip would have put on
 *  its own `<a>`. Spread it onto your router's link, mapping `href` to what the link
 *  calls it — `renderLink={({ href, ...p }) => <Link to={href} {...p} />}`. */
export interface ChipLinkProps {
  href: string;
  /** The chip's whole look — keep it, or the pill is a bare link. */
  className: string;
  children: ReactNode;
  /** The chip's forwarded ref. React 19 passes it to a function component as a prop. */
  ref?: Ref<HTMLAnchorElement>;
  "aria-current"?: "true";
  /**
   * The chip's `onClick`, when it was given one — spread it onto the link with the
   * rest. Carried here so a caller need not close over it twice: keksdose's admin pill
   * in the account menu closes the menu on the way to /admin (account-menu.tsx), and
   * with `onClick` on the Chip its `renderLink` stays the one-liner
   * `({ href, ...p }) => <Link to={href} {...p} />`.
   */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  id?: string;
  title?: string;
  [key: `aria-${string}`]: string | boolean | number | undefined;
  [key: `data-${string}`]: unknown;
}

/**
 * `body` is the whole pill when the chip is ONE element. When a link or a button also has
 * a dismiss control, the pill is a wrapper holding two siblings (see the note on
 * {@link Chip}): `split` is then the interactive part's own padding — the full start
 * inset, a short end one before the ×; `tail` is the wrapper's end inset after the ×.
 */
const SIZE: Record<
  ChipSize,
  { body: string; split: string; tail: string; icon: string; remove: string }
> = {
  sm: {
    body: "gap-1 px-2 py-0.5 text-xs",
    split: "gap-1 ps-2 pe-1 py-0.5 text-xs",
    tail: "pe-1.5",
    icon: "size-3",
    remove: "size-3",
  },
  md: {
    body: "gap-1.5 px-2.5 py-1 text-sm",
    split: "gap-1.5 ps-2.5 pe-1.5 py-1 text-sm",
    tail: "pe-2",
    icon: "size-3.5",
    remove: "size-3.5",
  },
  lg: {
    body: "min-h-11 gap-2 px-4 py-2 text-sm",
    split: "min-h-11 gap-2 ps-4 pe-2 py-2 text-sm",
    tail: "min-h-11 pe-3.5",
    icon: "size-4",
    remove: "size-4",
  },
};

const CHIP_PILL = "inline-flex max-w-full items-center rounded-full border transition-colors";
// `focus-visible`, not `focus`: a chip commonly receives focus programmatically (the
// ChipInput moves focus onto one after a removal) and a ring that appears on a
// pointer click reads as a stuck selection.
const CHIP_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]";
const CHIP_BASE = `${CHIP_PILL} ${CHIP_RING}`;

interface ChipBaseProps {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  /** See {@link ChipVariant}. Default `soft`. */
  variant?: ChipVariant;
  /** See {@link ChipShape}. Default `pill`. */
  shape?: ChipShape;
  /**
   * The uppercase, tracked "status badge" type — keksdose's ~25 PAID / DRAFT /
   * OVERDUE / ADMIN badges, each spelling `uppercase tracking-wide text-[10px]` by
   * hand. A flag rather than a fourth `variant` because it is TYPE, not surface: a
   * status badge is soft, outlined or solid as the row needs, and a `variant="tag"`
   * would have had to pick one. Screen readers read the text as written, not as
   * drawn, so write it in normal case.
   */
  caps?: boolean;
  icon?: LucideIcon;
  /**
   * Marks the chip as the current one — `aria-current` on a link, `aria-pressed` on a
   * toggle.
   *
   * On an ON/OFF toggle, keep the LABEL the same in both states and let `selected`
   * carry the state. A label that flips with it ("Skip this month" / "Ask again this
   * month") is announced together with "pressed", and then says the opposite of what
   * it does.
   *
   * A control that switches between two NAMED states (outflow ⇄ inflow) is not a
   * toggle but an ACTION button: leave `selected` out, let the visible label and the
   * tone follow the state ("− Outflow" / "+ Inflow"), and name the action in
   * `aria-label` ("Direction: outflow — tap for inflow"). Without `selected` the chip
   * reports no pressed state at all. A fixed label there contradicts the figure beside
   * it — "+ Outflow" in green next to an inflow (keksdose #417).
   */
  selected?: boolean;
  /** Renders a dismiss affordance. Works alongside `href`/`onClick` — see the note below. */
  onRemove?: () => void;
  /** Accessible name for the dismiss button. Default: `common.remove` from the
   *  {@link UiKitProvider}, else "Remove". */
  removeLabel?: string;
  /** Disables the × ONLY — the chip itself stays a working link or toggle. For the
   *  value that may not be removed right now (the last filter of a required set, a
   *  tag the user may read but not edit) where `disabled` would also kill the chip's
   *  own action. */
  removeDisabled?: boolean;
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
 * A chip is a link OR a button, never both — so the types say so. Before 0.7.0 both were
 * accepted and `onClick` was silently dropped whenever `href` was set. A LINK may still
 * run code on its way (close the menu it sits in): that is an `onClick` typed for the
 * anchor, on the link shape, and the pill stays a link — no `aria-pressed`, no button.
 * That shape wants a definite `href` string, so a bare `onClick` is always the
 * button's, with a button's event.
 */
export type ChipProps = ChipBaseProps &
  (
    | {
        /** Renders the chip as a link. */
        href?: string;
        onClick?: never;
        /**
         * Renders the link for `href` — pass your router's `<Link>` here, since a
         * plain `<a>` reloads a single-page app (keksdose's account-menu admin pill).
         * Default: `<a>`. Ignored without `href`.
         *
         * A render function rather than an `as={Link}`, for three reasons. It is the
         * API `StatTile` already has (`renderLink`), so a consumer learns it once.
         * Router links do not take `href` — react-router's takes `to` — so an `as`
         * would either have to pass props through untyped or teach the kit about one
         * router; here the caller maps `href` onto its own link in one line, fully
         * typed. And it keeps `href` as THE link prop, which is what the `href` /
         * `onClick` exclusion below is typed on: the pill is a link because it has an
         * href, whichever element draws it.
         */
        renderLink?: (props: ChipLinkProps) => ReactElement;
      }
    | {
        /** The link shape again, with an `onClick`. `href` is a required string here,
         *  which is what lets TypeScript tell this shape from the button's: a bare
         *  `onClick` can only be the button's, and keeps its button event. */
        href: string;
        /** Runs on the link's click, before the navigation — keksdose's admin pill
         *  closes the account menu with it. Reaches a `renderLink` link as
         *  {@link ChipLinkProps.onClick}. Not called on a disabled chip, which renders
         *  no link. */
        onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
        /** See the link shape above. */
        renderLink?: (props: ChipLinkProps) => ReactElement;
      }
    | {
        href?: never;
        renderLink?: never;
        /** Renders the chip as a toggle button. Mutually exclusive with `href`. Receives
         *  the click, so a chip inside a clickable row can `stopPropagation()`. */
        onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
      }
  );

/**
 * Note on `onRemove` with `href`/`onClick`: a button cannot be nested inside a button or
 * a link, so when both are present the chip renders a wrapper holding TWO siblings — the
 * interactive body and the dismiss control. The WRAPPER is the visual pill (border, tone,
 * `className`) and the two sit inside it, so the × reads as part of the chip; the body's
 * focus ring is drawn on the body alone, and `ref`, `id` and the ARIA props still reach
 * the body — the interactive element.
 */
export const Chip = forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    children,
    tone = "neutral",
    size = "md",
    variant = "soft",
    shape = "pill",
    caps = false,
    icon: Icon,
    selected,
    href,
    renderLink,
    onClick,
    onRemove,
    removeLabel,
    removeDisabled = false,
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
  const interactive = !!href || !!onClick;
  // One radius for every rounded piece — the pill, the body inside a split pill, the ×
  // — so a square chip has no round focus ring inside it.
  const radius = shape === "square" ? (size === "sm" ? "rounded" : "rounded-md") : "rounded-full";
  const type = cn(caps && CAPS[size], variant === "solid" && "justify-center tabular-nums");
  const surface = cn(
    surfaceOf(tone, variant, selected),
    disabled && "cursor-default opacity-50",
  );
  const look = cn(
    CHIP_BASE,
    s.body,
    type,
    radius,
    surface,
    interactive && !disabled && "cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110",
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
      disabled={disabled || removeDisabled}
      className={cn(
        // Logical margins: the × sits at the END of the pill, which is the left in RTL.
        "-me-0.5 ms-0.5 shrink-0 p-0.5 transition-colors",
        shape === "square" ? "rounded-sm" : "rounded-full",
        "hover:bg-[var(--bg-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
        (disabled || removeDisabled) && "pointer-events-none",
        // A disabled chip is already dimmed as a whole; dimming the × again on top
        // would take it to a quarter. `removeDisabled` alone dims just the ×.
        removeDisabled && !disabled && "opacity-40",
      )}
    >
      <X className={s.remove} aria-hidden />
    </button>
  ) : null;

  // ── The combined shape: one pill, two interactive siblings inside it.
  const pill = (inner: ReactNode) => (
    <span className={cn(CHIP_PILL, s.tail, radius, surface, className)}>
      {inner}
      {remove}
    </span>
  );
  // The body inside a pill: no border or surface of its own (the pill has them), a
  // hover wash in the text's own hue so it works on every tone.
  const inner = cn(
    "inline-flex min-w-0 items-center self-stretch transition-colors",
    radius,
    CHIP_RING,
    s.split,
    type,
    !disabled && "cursor-pointer hover:bg-current/10",
    disabled && "cursor-default",
  );

  // ── The three shapes.
  if (href && !disabled) {
    // On this shape `onClick` is the link shape's, typed for the anchor.
    const onLinkClick = onClick as ChipLinkProps["onClick"];
    const linkProps: ChipLinkProps = {
      ...rest,
      ref: ref as Ref<HTMLAnchorElement>,
      href,
      onClick: onLinkClick,
      "aria-current": selected ? "true" : undefined,
      className: remove ? inner : look,
      children: body,
    };
    const link = renderLink ? (
      // Through a component rather than called here, so the forwarded ref arrives as
      // an ordinary prop of an element and is never handed to a function mid-render.
      <RenderedLink render={renderLink} {...linkProps} />
    ) : (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        aria-current={selected ? "true" : undefined}
        onClick={onLinkClick}
        className={remove ? inner : look}
        {...rest}
      >
        {body}
      </a>
    );
    return remove ? pill(link) : link;
  }

  // `!href`: a DISABLED link renders no link, and its link-shaped `onClick` must not
  // turn it into a button instead — it falls through to the inert span, as before.
  if (onClick && !href) {
    const onButtonClick = onClick as (event: MouseEvent<HTMLButtonElement>) => void;
    const button = (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onButtonClick}
        disabled={disabled}
        // Only when `selected` is PASSED: a chip with `onClick` and no `selected` is an
        // action button (it does something), not a toggle (it is on or off), and
        // announcing it "not pressed" would claim a state it does not have.
        aria-pressed={selected}
        className={remove ? inner : look}
        {...rest}
      >
        {body}
      </button>
    );
    return remove ? pill(button) : button;
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

/** Calls a chip's `renderLink` with the props it was given — see its call site. */
function RenderedLink({
  render,
  ...props
}: ChipLinkProps & { render: (props: ChipLinkProps) => ReactElement }) {
  return render(props);
}

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
  // The last refusal, shown under the field until the next edit. The live region alone
  // told only a screen-reader user why Enter did nothing; everyone else saw the text
  // simply stay put.
  const [rejected, setRejected] = useState<string | null>(null);
  const [focusedChip, setFocusedChip] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
          // here would give the field two. Failing that, the DOM spelling wins and
          // the deprecated `ariaLabel` is the fallback.
          aria-label={label ? undefined : (ariaLabelAttr ?? ariaLabel)}
          aria-describedby={describedBy || undefined}
          aria-invalid={isInvalid || !!rejected || undefined}
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
      {rejected && (
        <p id={rejectedId} className="text-xs text-[var(--danger)]" data-chip-input-rejected="">
          {rejected}
        </p>
      )}
    </div>
  );
}
