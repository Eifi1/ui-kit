import { isValidElement, useCallback, useId } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { statusTone, type StatusKind } from "../lib/status-tone";
import { TOUCH_TARGET_LARGE } from "./button-look";
import { FOCUS_RING } from "./focus-ring";
import { assignRef, LockedReason, type DisabledReasonDisplay } from "./field-parts";
import { hasContent } from "../lib/presence";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import { pickLinkRenderer } from "./text-link";
import { useCommitReason, type CommitScope } from "./write-lock";
import { useSnapEdges } from "../lib/chip-edge-snap";
// The edge-snap engine lives in lib/chip-edge-snap.ts and ChipInput in chip-input.tsx
// (MOD-9). `refreshChipEdges` is still this module's; of ChipInput only the types are,
// since a runtime re-export would make chip ⇄ chip-input a cycle — the barrel exports
// chip-input itself.
export { refreshChipEdges } from "../lib/chip-edge-snap";
export type { ChipInputLabels, ChipInputProps } from "./chip-input";

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
  | "expense"
  | ChipHue;
/**
 * Categorical hues (0.10.0): colour that says "a different value" and nothing more —
 * kastlan's status-badge.tsx paints ~15 enums in 9 Tailwind hues by hand. Four of those
 * nine are semantic and already tones (green = `success`, yellow = `warning`, red =
 * `danger`, gray = `neutral`); these five are the rest, each a `--hue-*` token triple
 * in tokens.css with a light and a dark value. Use a semantic tone when the value HAS a
 * meaning (overdue is `danger`), a hue when it only needs telling apart (sent vs
 * accepted vs invoiced).
 */
export type ChipHue = "blue" | "indigo" | "purple" | "teal" | "orange";
/** `lg` is the 44px touch target (`min-h-11`) a phone surface wants; `md` is ~28px.
 *  `xs` (0.10.0) is 11px type at `px-1.5` — keksdose's goal markers and budget-cell
 *  badges, which sit inside a figure's line and must not make it taller. */
export type ChipSize = "xs" | "sm" | "md" | "lg";
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
 * - `dot` (0.10.0): no pill at all — a dot in the tone's colour before plain text, for
 *   a status in a dense list or a table column where eight tinted pills in a column
 *   would outshout the figures beside them (kastlan's unit picker already draws its
 *   UnitStatus this way, from a separate `dotColor` map).
 */
export type ChipVariant = "soft" | "outline" | "solid" | "dot";
/** `pill` (default) is fully rounded; `square` has the small radius of a field or a
 *  button — for a chip that sits in a table cell or beside square controls. */
export type ChipShape = "pill" | "square";

const TONE: Record<ChipTone, { idle: string; selected: string }> = {
  neutral: {
    idle: "border-subtle bg-surface-2 text-secondary",
    selected: "border-strong bg-active text-primary",
  },
  brand: {
    idle: "border-subtle bg-brand-soft text-brand-muted",
    selected: "border-brand bg-brand text-brand-contrast",
  },
  danger: {
    idle: "border-danger bg-danger-soft text-danger",
    selected: "border-[var(--danger)] bg-danger text-danger-contrast",
  },
  warning: {
    idle: "border-warning bg-warning-soft text-warning",
    selected: "border-[var(--warning)] bg-warning-soft text-warning",
  },
  success: {
    idle: "border-success bg-success-soft text-success",
    selected: "border-[var(--success)] bg-success-soft text-success",
  },
  info: {
    idle: "border-info bg-info-soft text-info",
    selected: "border-[var(--info)] bg-info-soft text-info",
  },
  // The money pair (Keksdose's direction toggle). Only the TEXT and the BORDER carry
  // the tint, on the neutral chip's own surfaces: the money tokens are chosen for text
  // contrast, and a filled amber pill beside an amber figure reads as one smear.
  // `border-current` takes its hue from the text, so the two cannot drift apart.
  income: {
    idle: "border-current/40 bg-surface-2 text-money-income",
    selected: "border-current bg-active text-money-income",
  },
  expense: {
    idle: "border-current/40 bg-surface-2 text-money-expense",
    selected: "border-current bg-active text-money-expense",
  },
  // The categorical hues: the `info` recipe with its own token triple, so a hue chip
  // and a status chip in one row carry the same weight.
  blue: {
    idle: "border-hue-blue bg-hue-blue-soft text-hue-blue",
    selected: "border-[var(--hue-blue)] bg-hue-blue-soft text-hue-blue",
  },
  indigo: {
    idle: "border-hue-indigo bg-hue-indigo-soft text-hue-indigo",
    selected: "border-[var(--hue-indigo)] bg-hue-indigo-soft text-hue-indigo",
  },
  purple: {
    idle: "border-hue-purple bg-hue-purple-soft text-hue-purple",
    selected: "border-[var(--hue-purple)] bg-hue-purple-soft text-hue-purple",
  },
  teal: {
    idle: "border-hue-teal bg-hue-teal-soft text-hue-teal",
    selected: "border-[var(--hue-teal)] bg-hue-teal-soft text-hue-teal",
  },
  orange: {
    idle: "border-hue-orange bg-hue-orange-soft text-hue-orange",
    selected: "border-[var(--hue-orange)] bg-hue-orange-soft text-hue-orange",
  },
};

// `outline` idle looks: the tone's border and text, the surface left to whatever the
// chip sits on. Selected still takes the tone's `selected` look (below), because an
// outline toggle that stays an outline when on has no visible state.
const OUTLINE: Record<ChipTone, string> = {
  neutral: "border-strong bg-transparent text-secondary",
  // The brand AS TEXT is `--brand-muted` (0.33): `--brand` itself is solved to 3:1, a
  // fill's boundary, and as text it fell to 3.0:1 in the derived dark presets.
  brand: "border-brand bg-transparent text-brand-muted",
  danger: "border-danger bg-transparent text-danger",
  warning: "border-warning bg-transparent text-warning",
  success: "border-success bg-transparent text-success",
  info: "border-info bg-transparent text-info",
  income: "border-current/60 bg-transparent text-money-income",
  expense: "border-current/60 bg-transparent text-money-expense",
  blue: "border-hue-blue bg-transparent text-hue-blue",
  indigo: "border-hue-indigo bg-transparent text-hue-indigo",
  purple: "border-hue-purple bg-transparent text-hue-purple",
  teal: "border-hue-teal bg-transparent text-hue-teal",
  orange: "border-hue-orange bg-transparent text-hue-orange",
};

// `solid`: the fill under its own foreground, `<fill>-contrast` (0.33, colour-roles
// §5.1): white in light, the tone's 950 (the page, for money) on the dark theme's
// pastels. Until 0.33 only brand and danger had one and the rest borrowed
// `--text-inverse`, the surface colour — which left light warning at 4.24:1 and orange
// at 4.38:1. Neutral keeps the inverse pair: a count pill, louder than the neutral
// fill. The border goes transparent rather than away, so a solid chip is exactly as
// tall as a soft one.
const SOLID: Record<ChipTone, string> = {
  neutral: "border-transparent bg-inverse text-inverse",
  brand: "border-transparent bg-brand text-brand-contrast",
  danger: "border-transparent bg-danger text-danger-contrast",
  warning: "border-transparent bg-warning text-warning-contrast",
  success: "border-transparent bg-success text-success-contrast",
  info: "border-transparent bg-info text-info-contrast",
  income: "border-transparent bg-money-pos text-money-income-contrast",
  expense: "border-transparent bg-money-neg text-money-expense-contrast",
  blue: "border-transparent bg-hue-blue text-hue-blue-contrast",
  indigo: "border-transparent bg-hue-indigo text-hue-indigo-contrast",
  purple: "border-transparent bg-hue-purple text-hue-purple-contrast",
  teal: "border-transparent bg-hue-teal text-hue-teal-contrast",
  orange: "border-transparent bg-hue-orange text-hue-orange-contrast",
};

/** `dot`: the fill of the dot itself — the tone's strongest colour, which is the one
 *  chosen to read on the page surface in both themes. Neutral takes the muted ink: a
 *  grey dot is "no particular state", not a darker black. */
const DOT: Record<ChipTone, string> = {
  neutral: "bg-[var(--text-muted)]",
  brand: "bg-brand",
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-info",
  income: "bg-money-income",
  expense: "bg-money-expense",
  blue: "bg-hue-blue",
  indigo: "bg-hue-indigo",
  purple: "bg-hue-purple",
  teal: "bg-hue-teal",
  orange: "bg-hue-orange",
};

/** Per size: the dot's diameter. */
const DOT_SIZE: Record<ChipSize, string> = { xs: "size-1.5", sm: "size-2", md: "size-2", lg: "size-2.5" };

/** The status-badge type (`caps`): a size step down, heavier and tracked, because
 *  capitals at body size shout and capitals untracked run together. Per size, so it
 *  replaces the size's own `text-*` through tailwind-merge. */
const CAPS: Record<ChipSize, string> = {
  xs: "text-micro font-semibold uppercase tracking-wider",
  sm: "text-micro font-semibold uppercase tracking-wider",
  md: "text-caption font-semibold uppercase tracking-wider",
  lg: "text-xs font-semibold uppercase tracking-wider",
};

function surfaceOf(tone: ChipTone, variant: ChipVariant, selected: boolean | undefined): string {
  const palette = TONE[tone];
  if (variant === "dot") {
    // No surface and no border colour: the dot carries the tone, the text stays ink.
    // The border goes transparent rather than away, so a dot chip lines up with a pill.
    return selected
      ? "border-transparent bg-transparent font-medium text-primary"
      : "border-transparent bg-transparent text-secondary";
  }
  if (variant === "solid") {
    // A solid chip is already the strongest look there is, so "on" is a ring round it.
    return cn(SOLID[tone], selected && "ring-2 ring-strong ring-offset-1 ring-offset-surface");
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
  xs: {
    body: "gap-1 px-1.5 py-0 text-caption leading-4",
    split: "gap-1 ps-1.5 pe-0.5 py-0 text-caption leading-4",
    tail: "pe-1",
    icon: "size-3",
    remove: "size-2.5",
  },
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
const CHIP_RING = `${FOCUS_RING} focus-visible:ring-offset-1 focus-visible:ring-offset-surface`;
const CHIP_BASE = `${CHIP_PILL} ${CHIP_RING}`;

/**
 * A text chip's label at Large and Extra large (0.32.1, keksdose's 0.32 report;
 * docs/text-size-harmonization.md §4 "nothing truncates"): it wraps instead of ending in
 * "…". keksdose's "Zur Prüfung zurücklegen" read "Zur Prüfung zu…" on a phone at Extra
 * large, which is a different instruction. No size has a fixed height (padding and
 * `min-h-*` only), so the pill grows with its lines; the mark before the text stays
 * centred on them, as in a pill. A `large:` rule, so Normal keeps its one-line chip.
 *
 * 0.33 (§10.17): the kit's one `truncate-until-large` (tokens.css) in place of this
 * file's own `truncate` + `large:whitespace-normal large:break-words`, as StatusDot's
 * label took it. The utility breaks with `overflow-wrap: anywhere`, which lowers the
 * label's min-content width to one letter: a status chip in an auto-sized table column
 * wants the column given a width at Large, or it is squeezed to a letter per line
 * (StatusDot's label was, in the showcase's tone table at 360 px, Extra large).
 */
const CHIP_LABEL_TRUNCATE = "truncate-until-large";

/**
 * An interactive chip's touch target at Large and Extra large (docs/text-size-harmonization.md
 * §4: "touch targets at least 48 px … for buttons, inputs, chips"): a link or toggle chip
 * grows its pill to 48 px, as Button `sm` does, and centres what is in it once the
 * minimum width is what sizes it. An inert chip (a tag on a row) is no target and keeps
 * its size; a disabled one is no target either.
 */
const CHIP_TOUCH_LARGE = `${TOUCH_TARGET_LARGE} large:justify-center`;

/**
 * The ×'s 48 px hit area at Large (§4) — IconButton's `2xs` pattern: a box that cannot
 * grow without growing the chip around it keeps its size and gets an invisible
 * `::after`, 48 px square and centred on it, which takes the taps a finger lands round
 * the glyph. On an inert removable chip (ChipInput's values) the × is the only target.
 */
const REMOVE_HIT_AREA_LARGE =
  "relative large:after:absolute large:after:inset-[calc((100%-48px)/2)] large:after:content-['']";

interface ChipBaseProps {
  children: ReactNode;
  tone?: ChipTone;
  /**
   * What the value means as a status (0.49 KIT-8), instead of a `tone`: `good` (success),
   * `attention` (warning), `problem` (danger), `active` (info), `inactive` (neutral) —
   * {@link statusTone}. An explicit `tone` wins. Never `brand` for a status.
   */
  status?: StatusKind;
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
  /**
   * The leading glyph: a lucide component (`icon={Check}`, drawn at the chip's size), or
   * — since 0.15.4 — a ready element (`icon={<Check className="text-success" />}`)
   * for a glyph whose colour or stroke carries a state; it is sized to the same box
   * (keksdose live #358 built that slot by hand inside `children`).
   */
  icon?: LucideIcon | ReactElement;
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
  /**
   * Checkbox mode (0.10.0), for a toggle chip (`onClick` + `selected`): a small box
   * at the start that shows a tick when `selected`, and the button reports
   * `role="checkbox"` + `aria-checked` instead of `aria-pressed`. For a set of
   * include/exclude choices where "on" must read as TICKED, not merely tinted —
   * keksdose's add-group-card (the "which categories come along" pills), which put a
   * real `<Checkbox>` inside a `<label>` pill by hand. The box is drawn in both
   * states so ticking one never shifts its label.
   */
  checkbox?: boolean;
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
  /**
   * Even hairlines on fractional-ratio displays (0.18.0). At a device-pixel ratio of
   * 1.25 — a 125 % Windows display, or 125 % zoom — Chrome draws a chip's two 1px
   * side borders on different sub-pixel phases, one crisp and one a half-strength
   * smear that reads as a thinner line (worst on the 60 %-alpha `danger` border).
   * `snapEdges` widens the chip by under 4px, from where it sits, so the two edges
   * rasterise as mirror images, and centres its content in the extra.
   *
   * Off by default: it reads the chip's position (batched for every snapped chip into
   * one pass a frame, through one shared observer), and the fix is only as fresh as the
   * last pass — it re-snaps on render, resize, zoom and ratio change, but not when
   * something else moves the chip; call {@link refreshChipEdges} then. At an integer
   * ratio, and at 1.5, it writes nothing. Turn it on for status chips that sit in a
   * column and are compared side by side; a chip with no visible border (`dot`) has
   * nothing to snap.
   */
  snapEdges?: boolean;
  /** The interactive element — the pill, or a split pill's body. A React 19 ref prop
   *  since 0.34 (MOD-4, refactor audit 2026-10); it was `forwardRef`. */
  ref?: Ref<HTMLElement>;
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
         * Default: the `<UiKitProvider linkComponent>`, then `<a>`. Ignored without
         * `href`.
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
        commit?: never;
        disabledReason?: never;
        disabledReasonDisplay?: never;
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
        commit?: never;
        disabledReason?: never;
        disabledReasonDisplay?: never;
      }
    | {
        href?: never;
        renderLink?: never;
        /** Renders the chip as a toggle button. Mutually exclusive with `href`. Receives
         *  the click, so a chip inside a clickable row can `stopPropagation()`. */
        onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
        /**
         * Why the toggle cannot be pressed right now — {@link Button}'s
         * `disabledReason`, on the chip's button shape (keksdose K3: a filter or flag
         * chip that saves on press, under a read-only lock). The chip stays focusable
         * and `aria-disabled`, a press (and its `onRemove` ×) does nothing, and the
         * reason describes the chip — as a line under it at Large and on a touch
         * screen, in the kit {@link Tooltip} otherwise (see `disabledReasonDisplay`).
         * Wins over `disabled`. A link chip navigates rather than commits, so it takes
         * neither this nor `commit`; an inert chip has nothing to refuse.
         */
        disabledReason?: ReactNode;
        /**
         * Where `disabledReason` shows (0.32, docs/text-size-harmonization.md §4 "No fact
         * only in a tooltip") — {@link Button}'s `disabledReasonDisplay`: by default a line
         * under the chip at Large and Extra large and on a touch screen, where a bubble
         * cannot be hovered open, and the tooltip otherwise and inside
         * `CompactControls`. `"line"` / `"tooltip"` force one. See
         * {@link DisabledReasonDisplay}.
         */
        disabledReasonDisplay?: DisabledReasonDisplay;
        /** This chip COMMITS — pressing it saves. Under a locked
         *  {@link WriteLockProvider} it takes the `disabledReason` path with the lock's
         *  reason, as {@link Button}'s `commit` does. */
        commit?: CommitScope;
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
export function Chip({
  ref,
  children,
  tone: toneProp,
  status,
  size = "md",
  variant = "soft",
  shape = "pill",
  caps = false,
  icon: Icon,
  selected,
  checkbox = false,
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
  snapEdges = false,
  disabledReason: ownDisabledReason,
  disabledReasonDisplay,
  commit,
  ...rest
}: ChipProps) {
  const tone: ChipTone = toneProp ?? (status ? statusTone(status) : "neutral");
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, { remove: removeLabel });
  const reasonId = useId();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  // Only the BUTTON shape commits: a link navigates, an inert chip does nothing.
  const locked = Boolean(onClick) && !href && hasContent(disabledReason);
  const kitLink = useKitLink();
  const s = SIZE[size];
  const interactive = !!href || !!onClick;
  // One radius for every rounded piece — the pill, the body inside a split pill, the ×
  // — so a square chip has no round focus ring inside it.
  const radius =
    shape === "square" ? (size === "sm" || size === "xs" ? "rounded" : "rounded-md") : "rounded-full";
  const dot = variant === "dot";
  const type = cn(caps && CAPS[size], variant === "solid" && "justify-center tabular-nums");
  const surface = cn(
    surfaceOf(tone, variant, selected),
    // A reason wins over `disabled`: the focusable kind of disabled, with the cursor
    // that says "refused" rather than "nothing here".
    disabled && !locked && "cursor-default opacity-50",
    locked && "cursor-not-allowed opacity-50",
  );
  const snap = snapEdges && !dot;
  // A finger's target at Large (§4): what can be pressed, refused or not — see
  // CHIP_TOUCH_LARGE. A disabled link renders as the inert span below and is none.
  const target = interactive && (!disabled || locked);
  const snapRef = useSnapEdges(snap);
  // The visible pill carries the snap: the whole chip, or the wrapper of a split one
  // (whose body gets the forwarded ref instead).
  const ownRef = useCallback(
    (el: HTMLElement | null) => {
      snapRef(el);
      assignRef(ref, el);
    },
    [snapRef, ref],
  );
  const look = cn(
    CHIP_BASE,
    s.body,
    type,
    radius,
    surface,
    interactive && !disabled && !locked && "cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110",
    // §4: a link or toggle is a 48 px target at Large — a locked one too, since it is
    // still focusable and still says why when pressed.
    target && CHIP_TOUCH_LARGE,
    // An inert dot chip is text in a column: no inset, so it aligns with the header.
    dot && !interactive && "px-0",
    // The under-4px a snap adds is split between the two sides, not stacked at the end.
    snap && "justify-center",
    className,
  );

  // The tone as data on the visible pill (0.34, refactor audit 2026-10, TST-9): a stable
  // hook for a test or a caller's selector, where the surface classes are the kit's to
  // change. On the pill wrapper of a split chip, else on the chip itself; before the
  // caller's props, so a `data-tone` of their own wins.
  const toneData = { "data-tone": onRemove ? undefined : tone } as Record<string, string | undefined>;

  // The checkbox box, only on the toggle shape it has meaning on.
  const isCheckbox = checkbox && !!onClick && !href;
  const body = (
    <>
      {isCheckbox && (
        <span
          aria-hidden
          data-chip-check=""
          className={cn(
            "flex shrink-0 items-center justify-center rounded-sm border",
            s.icon,
            selected ? "border-current bg-current/15" : "border-current/50",
          )}
        >
          {selected && <Check className="size-full" strokeWidth={3} />}
        </span>
      )}
      {dot && <span aria-hidden data-chip-dot="" className={cn("shrink-0 rounded-full", DOT_SIZE[size], DOT[tone])} />}
      {Icon &&
        (isValidElement(Icon) ? (
          <span aria-hidden className={cn(s.icon, "inline-flex shrink-0 [&>svg]:size-full")}>
            {Icon}
          </span>
        ) : (
          <Icon className={cn(s.icon, "shrink-0")} aria-hidden />
        ))}
      {/* Text truncates at Normal and wraps at Large (CHIP_LABEL_TRUNCATE). Mixed
          children (an icon and a word) sit in a row instead: as a plain span, the svg —
          a block under Tailwind's preflight — stacked above the text (keksdose live
          #358). */}
      <span
        className={cn(
          "min-w-0",
          typeof children === "string" || typeof children === "number"
            ? CHIP_LABEL_TRUNCATE
            : "inline-flex items-center gap-1 [&>svg]:size-[1em] [&>svg]:shrink-0",
        )}
      >
        {children}
      </span>
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
        // Removing a value from a chip that commits is a commit too.
        if (locked) return;
        onRemove();
      }}
      disabled={(disabled && !locked) || removeDisabled}
      aria-disabled={locked || undefined}
      aria-describedby={locked ? reasonId : undefined}
      className={cn(
        // Logical margins: the × sits at the END of the pill, which is the left in RTL.
        "-me-0.5 ms-0.5 shrink-0 p-0.5 transition-colors",
        shape === "square" ? "rounded-sm" : "rounded-full",
        FOCUS_RING,
        // §4: the × is a 48 px target at Large without growing the chip around it.
        REMOVE_HIT_AREA_LARGE,
        !locked && "hover:bg-active",
        locked && "cursor-not-allowed",
        ((disabled && !locked) || removeDisabled) && "pointer-events-none",
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
    <span
      ref={snap ? snapRef : undefined}
      data-tone={tone}
      // The pill is the target's box here (§4): the body inside stretches to its height.
      className={cn(CHIP_PILL, s.tail, radius, surface, target && CHIP_TOUCH_LARGE, snap && "justify-center", className)}
    >
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
    !disabled && !locked && "cursor-pointer hover:bg-current/10",
    disabled && !locked && "cursor-default",
    locked && "cursor-not-allowed",
  );

  // ── The three shapes.
  if (href && !disabled) {
    // On this shape `onClick` is the link shape's, typed for the anchor.
    const onLinkClick = onClick as ChipLinkProps["onClick"];
    const linkProps: ChipLinkProps = {
      ...toneData,
      ...rest,
      ref: (remove ? ref : ownRef) as Ref<HTMLAnchorElement>,
      href,
      onClick: onLinkClick,
      "aria-current": selected ? "true" : undefined,
      className: remove ? inner : look,
      children: body,
    };
    const render = pickLinkRenderer(renderLink, kitLink, href);
    const link = render ? (
      // Through a component rather than called here, so the forwarded ref arrives as
      // an ordinary prop of an element and is never handed to a function mid-render.
      <RenderedLink render={render} {...linkProps} />
    ) : (
      <a
        ref={(remove ? ref : ownRef) as React.Ref<HTMLAnchorElement>}
        {...toneData}
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
    const ownDescribedBy = rest["aria-describedby"];
    const button = (
      <button
        ref={(remove ? ref : ownRef) as React.Ref<HTMLButtonElement>}
        {...toneData}
        type="button"
        onClick={(e) => {
          // Locked: the press is swallowed — the chip saves on press, and a lock that
          // let it through would toggle a state that is never stored.
          if (locked) {
            e.preventDefault();
            return;
          }
          onButtonClick(e);
        }}
        disabled={disabled && !locked}
        // Only when `selected` is PASSED: a chip with `onClick` and no `selected` is an
        // action button (it does something), not a toggle (it is on or off), and
        // announcing it "not pressed" would claim a state it does not have.
        // A checkbox chip says "checked", not "pressed" — the same state in the words
        // of the control it looks like.
        role={isCheckbox ? "checkbox" : undefined}
        aria-pressed={isCheckbox ? undefined : selected}
        aria-checked={isCheckbox ? !!selected : undefined}
        className={remove ? inner : look}
        {...rest}
        // After the spread, merged with it: the lock's state and reason are not the
        // caller's to drop by passing an `aria-describedby` of their own.
        aria-disabled={locked || (rest["aria-disabled"] as boolean | "true" | "false" | undefined)}
        aria-describedby={
          locked ? [ownDescribedBy, reasonId].filter(Boolean).join(" ") : (ownDescribedBy as string | undefined)
        }
      >
        {body}
      </button>
    );
    const shaped = remove ? pill(button) : button;
    if (!locked) return shaped;
    return (
      <LockedReason lock={{ reason: disabledReason, reasonId }} display={disabledReasonDisplay}>
        {shaped}
      </LockedReason>
    );
  }

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the handlers are
       the roving-focus hooks, live only when the container passes `role` and `tabIndex`
       (ChipInput does); the role is a prop, so the rule cannot see it. */
    <span
      ref={ownRef as React.Ref<HTMLSpanElement>}
      {...toneData}
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
}

/** Calls a chip's `renderLink` with the props it was given — see its call site. */
function RenderedLink({
  render,
  ...props
}: ChipLinkProps & { render: (props: ChipLinkProps) => ReactElement }) {
  return render(props);
}
