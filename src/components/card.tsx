import { createContext, useContext } from "react";
import type { ComponentPropsWithoutRef, ComponentPropsWithRef, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";

/**
 * A `div`'s props, `ref` included since 0.34 — and the same for every Card part (API-2,
 * refactor audit 2026-10, Skeleton's 0.33.1 change). They always reached the element;
 * `ComponentPropsWithoutRef` only kept `ref` out of the type, so keksdose wrapped a Card in
 * a `<div ref>` to scroll it into view (admin-actions-panel).
 */
export interface CardProps extends ComponentPropsWithRef<"div"> {
  children: ReactNode;
  /**
   * When true, drop the card chrome (border, rounded corners, shadow) on mobile so the
   * card spans edge-to-edge. Chrome reappears at the `md` breakpoint. Use for primary
   * content cards on data pages; leave off for centered dialog/panel cards.
   */
  flush?: boolean;
  /**
   * `inset`: a panel INSIDE a card rather than a card on the page — the raised
   * `--bg-surface-2`, a small radius, `p-3` of its own and no border or shadow, since
   * it is already sitting on the card that has them. Lenkbank's results blocks and
   * corner panels write this by hand (`rounded-md bg-surface-2 p-3`) under a Card of
   * their own. Unlike the default card it carries its padding, because every one of
   * those copies wanted the same one; a caller's `p-*` still wins. `flush` is ignored:
   * an inset panel never runs edge to edge.
   */
  variant?: "default" | "inset" | "outline";
  /**
   * The card's own padding: `none`, `sm` (`p-3`) or `md` (`p-4`).
   *
   * `outline` is the bordered box with no shadow — a row or a block INSIDE a section
   * rather than a card on the page: kastlan's rent breakdown rows
   * (tenancy/components/breakdown-row.tsx, `rounded-lg border p-4`) and the meters
   * list's inline add row (meters/components/meter-add-row.tsx). It takes `md` by
   * default, as every one of those copies does; `sm` is the dense row.
   *
   * Left out, the default card keeps no padding (its CardHeader / CardContent own the
   * rhythm) and `inset` keeps its `p-3`; passing it sets theirs too. A caller's `p-*`
   * in `className` still wins.
   *
   * Whenever the card carries a padding — this prop, or the `inset` / `outline` one —
   * CardHeader, CardContent and CardFooter drop their own `px-6` / `pt-6` / `pb-6`, so
   * the card's padding is the only one. Before 0.16 they kept it regardless and a
   * `padding="md"` card with parts was padded twice (40px a side); keksdose's settings
   * cards zeroed all three parts by hand (`<CardHeader className="p-0">`). A padding set
   * only through `className` cannot be seen from the parts: use the prop.
   */
  padding?: "none" | "sm" | "md";
  /**
   * A card that is a WARNING (or other status) as a whole: the border in the tone's
   * `-border` colour and the {@link CardTitle} in the tone's text colour. kastlan's
   * dunning summary (invoice-detail-page.tsx:231-235) writes both by hand —
   * `border-[var(--warning-border)]` on the Card, `text-[var(--warning)]` on the title
   * — and the next status card would copy the pair (`outline` takes it the same way).
   * An `inset` panel has no border, so it takes the tone's quiet `-bg` fill instead.
   * `data-tone` is set for a caller's own
   * selectors.
   */
  tone?: CardTone;
  /**
   * How loud the `tone` frame is. `"strong"`: a 2px border in the tone's strong
   * colour — `--danger-border-strong` for `danger`, `--warning-border-strong` for
   * `warning` (0.33: amber-600 in dark, where `--warning` stood 13:1 off the card and
   * shouted; docs/colour-roles-harmonization.md §5.2), the tone's own text colour
   * (`--info`, `--success`) for the two with no `-border-strong` token of their own.
   * For the one tile on a page that guards something destructive or security-relevant:
   * keksdose's password / delete-account tile (shared/components/password-danger-card.tsx)
   * wrote `toneFrameClass(tone)` over the Card by hand for the 2px rule, and `p-[15px]`
   * under it so the content did not move. Here the extra pixel comes off the padding the
   * same way (`padding` or the variant's own), so a strong card's content sits exactly
   * where a soft one's does.
   *
   * Default `"soft"`: the 1px `-border` it has always been. No effect without `tone`,
   * nor on `inset`, which has no border to make louder (its tone is a fill).
   */
  toneStrength?: "soft" | "strong";
  /**
   * Wash the card in the tone's quiet `-bg` surface as well as framing it. A toned
   * card is a border and a title colour, at either strength — the wash belongs to
   * `AlertBanner`, the message, not to a card that holds a form — so it stays
   * off by default. Some tiles want both: keksdose's password / delete-account tile
   * was `toneFrameClass(tone)` (border AND wash) before 0.16, and after moving to
   * `toneStrength="strong"` it re-added `bg-[var(--danger-bg)]` by hand. The wash is
   * layered OVER the card's own `--bg-surface` (as AlertBanner's `elevated` does), so
   * the dark theme's translucent tints stay a card, not a hole to the page below.
   *
   * No effect without `tone`, nor on `inset`, whose tone is already the fill.
   */
  toneFill?: boolean;
  /**
   * The parts' type scale. `"compact"`: CardTitle `text-sm font-medium`,
   * CardDescription `text-xs` and the CardHeader's title-to-description gap
   * `gap-0.5` — the small settings / admin card. keksdose wrote those three classes by
   * hand on ~25 cards. Set here, they reach the parts through context; a class on a
   * part still wins, and a Card nested inside starts again from its own density.
   *
   * Default `"comfortable"`: the parts as they have always been.
   */
  density?: CardDensity;
}

export type CardDensity = "comfortable" | "compact";

export type CardTone = "warning" | "danger" | "info" | "success";

// The title is reached through its `data-slot`, so the tone needs no context and a
// caller's `className` on CardTitle still wins (it is on the element itself).
const CARD_TONES: Record<CardTone, { border: string; fill: string; title: string }> = {
  warning: {
    border: "border-warning",
    fill: "bg-warning-soft",
    title: "[&_[data-slot=card-title]]:text-warning",
  },
  danger: {
    border: "border-danger",
    fill: "bg-danger-soft",
    title: "[&_[data-slot=card-title]]:text-danger",
  },
  info: {
    border: "border-info",
    fill: "bg-info-soft",
    title: "[&_[data-slot=card-title]]:text-info",
  },
  success: {
    border: "border-success",
    fill: "bg-success-soft",
    title: "[&_[data-slot=card-title]]:text-success",
  },
};

const CARD_PADDING: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
};

// The same padding one pixel short, for a 2px `toneStrength="strong"` frame: the
// border grows inwards by that pixel, so the content stays where the 1px card had it.
// `calc(rem − 1px)` (0.32, §3.2): the padding grows with the text like `p-3` / `p-4`,
// the border does not — a fixed 11 / 15 px stopped matching them at 125 %, and toggling
// the tone shifted the content.
const CARD_PADDING_STRONG: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-[calc(0.75rem-1px)]",
  md: "p-[calc(1rem-1px)]",
};

// The wash as a background IMAGE over the card's opaque `--bg-surface` — see
// `toneFill`. A plain `bg-danger-soft` would REPLACE the surface, and the dark
// theme's washes are a translucent tint.
const CARD_TONE_WASH: Record<CardTone, string> = {
  warning: "bg-[image:linear-gradient(var(--warning-bg),var(--warning-bg))]",
  danger: "bg-[image:linear-gradient(var(--danger-bg),var(--danger-bg))]",
  info: "bg-[image:linear-gradient(var(--info-bg),var(--info-bg))]",
  success: "bg-[image:linear-gradient(var(--success-bg),var(--success-bg))]",
};

const CARD_TONES_STRONG: Record<CardTone, string> = {
  warning: "border-2 border-warning-strong",
  danger: "border-2 border-danger-strong",
  info: "border-2 border-[var(--info)]",
  success: "border-2 border-[var(--success)]",
};

/**
 * Whether the {@link Card} round the parts carries the padding itself — so CardHeader,
 * CardContent and CardFooter must not add theirs on top. `false` (no Card, or a default
 * card with no `padding`) keeps the parts' own `px-6` rhythm, as it always was.
 */
const CardPaddedContext = createContext(false);

/** The {@link CardProps.density} of the nearest Card — the parts' type scale. */
const CardDensityContext = createContext<CardDensity>("comfortable");

export function Card({
  className,
  children,
  flush,
  variant = "default",
  tone,
  toneStrength = "soft",
  toneFill = false,
  density = "comfortable",
  padding,
  ...rest
}: CardProps) {
  const toned = tone ? CARD_TONES[tone] : undefined;
  // An outline card is bordered like the default one, so a tone recolours its border.
  const bordered = variant !== "inset";
  const strong = toned !== undefined && bordered && toneStrength === "strong";
  // The padding the card itself carries: the prop, else the variant's own (`inset`
  // p-3, `outline` p-4). A default card with no prop carries none — its parts do.
  const ownPadding = padding ?? (variant === "inset" ? "sm" : variant === "outline" ? "md" : undefined);
  return (
    <div
      data-tone={tone}
      data-tone-strength={strong ? "strong" : undefined}
      data-density={density === "compact" ? "compact" : undefined}
      {...rest}
      className={cn(
        variant === "inset"
          ? "rounded-md bg-surface-2 p-3"
          : variant === "outline"
            ? // No shadow and no `flush`: it sits on a surface that already has both.
              "rounded-lg border border-subtle bg-surface p-4"
            : cn(
              // Surface + border are theme tokens so the palette switcher (feedback
              // #307) can re-skin every card; a caller's own bg-*/border-* override
              // still wins via tailwind-merge.
              "bg-surface",
              flush
                ? "border-y border-subtle md:rounded-lg md:border md:shadow-sm"
                : "rounded-lg border border-subtle shadow-sm",
            ),
        toned && (bordered ? toned.border : toned.fill),
        strong && tone && CARD_TONES_STRONG[tone],
        toneFill && bordered && tone && CARD_TONE_WASH[tone],
        toned?.title,
        ownPadding && (strong ? CARD_PADDING_STRONG : CARD_PADDING)[ownPadding],
        className,
      )}
    >
      <CardPaddedContext.Provider value={ownPadding !== undefined}>
        <CardDensityContext.Provider value={density}>{children}</CardDensityContext.Provider>
      </CardPaddedContext.Provider>
    </div>
  );
}

// Composed shadcn-style Card sub-parts. A default `Card` with no `padding` stays
// padding-less, so these own the padding/rhythm (`px-6`, the header's `pt-6`, the
// last part's `pb-6`). A Card that carries a padding of its own — the `padding` prop,
// or `inset` / `outline`, which have one built in — tells them so through context and
// they add none on top (see CardPaddedContext). Token-driven so they re-skin with the
// palette. Use CardHeader → CardTitle/CardDescription (+ optional CardAction,
// top-right) → CardContent → CardFooter.
/** The sub-parts add nothing to a `<div>`'s props — they are the SAME element with a
 *  `data-slot` and a padding rhythm — so most names are aliases rather than an empty
 *  interface pretending to be more. They exist so a consumer's own wrapper can say
 *  `CardHeaderProps` instead of `ComponentProps<typeof CardHeader>`. */
export interface CardHeaderProps extends ComponentPropsWithRef<"div"> {
  /**
   * Below the `sm` breakpoint, put the {@link CardAction} UNDER the title and
   * description instead of beside them. For an action that is wider than an icon —
   * a "Set up two-factor" button, a checkbox and a filter — which, kept in the
   * top-end column on a 390px phone, squeezed the title into a ribbon two words wide
   * (keksdose's settings cards). Off by default at Normal: an icon action (the wizard
   * summary's pencil) is narrow enough to stay beside the title at every width.
   *
   * Unset, it stacks at Large and Extra large only (0.32.1, the 360 px Extra-large
   * sweep; docs/text-size-harmonization.md §4): there an IconButton shows its label as
   * text, so the "icon" action is a word-wide pill, and "Refresh sessions" beside
   * "Sessions" ran 47 px past a 360 px phone. `false` keeps the action beside the title
   * at every size, for an action the caller knows stays narrow (`labelVisible={false}`).
   */
  stackAction?: boolean;
}
export type CardTitleLevel = "div" | "h2" | "h3" | "h4";
export interface CardTitleProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The element the title is: `"div"` (default) or a heading level. Five of keksdose's
   * settings cards nested their own `<h2>` / `<h3>` INSIDE CardTitle to put the card in
   * the page's outline — a heading in a div that looks like a heading. The heading
   * takes the title's look unchanged (the reset leaves `h2`–`h4` at inherited size and
   * weight), so only the outline changes.
   */
  as?: CardTitleLevel;
  /** The title's element — a `div` or the heading `as` names, hence `HTMLElement`. */
  ref?: Ref<HTMLElement>;
}
export type CardDescriptionProps = ComponentPropsWithRef<"div">;
export type CardActionProps = ComponentPropsWithRef<"div">;
export type CardContentProps = ComponentPropsWithRef<"div">;
export type CardFooterProps = ComponentPropsWithRef<"div">;

/** {@link CardHeaderProps.stackAction}: one column under `sm`, and the action back into
 *  the flow (DOM order, so after the description when it is written after it), at the
 *  start edge. The descendant selector outranks CardAction's own placement classes. */
const CARD_STACK_ACTION =
  "max-sm:grid-cols-1 max-sm:[&>[data-slot=card-action]]:col-start-1 max-sm:[&>[data-slot=card-action]]:row-span-1 max-sm:[&>[data-slot=card-action]]:row-start-auto max-sm:[&>[data-slot=card-action]]:justify-self-start";
/** The same at Large and Extra large only — `stackAction` unset (see its note). A
 *  `large:` class over the scaled `max-sm`, so it costs no render and is right on the
 *  first paint. */
const CARD_STACK_ACTION_AT_LARGE =
  "large:max-sm:grid-cols-1 large:max-sm:[&>[data-slot=card-action]]:col-start-1 large:max-sm:[&>[data-slot=card-action]]:row-span-1 large:max-sm:[&>[data-slot=card-action]]:row-start-auto large:max-sm:[&>[data-slot=card-action]]:justify-self-start";

export function CardHeader({ className, stackAction, ...props }: CardHeaderProps) {
  const padded = useContext(CardPaddedContext);
  const compact = useContext(CardDensityContext) === "compact";
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Grid (not flex) so CardAction can occupy a top-right column; with no
        // action it collapses to one column and title/description stack.
        //
        // The two-column switch sets a VARIABLE, not `grid-template-columns`. As
        // `has-data-[slot=card-action]:grid-cols-[1fr_auto]` it was two classes of
        // specificity (the class plus the attribute inside `:has()`), and a caller's
        // `max-sm:grid-cols-1` — one class inside a media query — lost to it at every
        // width, so the action could never be stacked on a phone from outside. Now the
        // property itself is set by a plain one-class utility that any `grid-cols-*`
        // variant of the caller's outranks by coming later in the sheet; the `:has()`
        // rule only picks the value. The base `1fr` resets the variable so a header
        // never inherits an ancestor header's two columns.
        "grid auto-rows-min items-start gap-1.5 [--card-header-cols:1fr] has-data-[slot=card-action]:[--card-header-cols:1fr_auto] grid-cols-[var(--card-header-cols,1fr)]",
        padded ? "px-0 pt-0" : "px-6 pt-6",
        compact && "gap-0.5",
        stackAction === true && CARD_STACK_ACTION,
        stackAction === undefined && CARD_STACK_ACTION_AT_LARGE,
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, as: Tag = "div", ref, ...props }: CardTitleProps) {
  const compact = useContext(CardDensityContext) === "compact";
  return (
    <Tag
      ref={ref as Ref<HTMLDivElement & HTMLHeadingElement>}
      data-slot="card-title"
      // Compact is `leading-snug`, not `leading-none`: there the title sits on a
      // 12px description `gap-0.5` below, and a line box exactly the cap height left
      // the hint hugging the title's descenders (every keksdose admin card added
      // `leading-normal` by hand). Comfortable keeps `leading-none` — its 14px
      // description is `gap-1.5` away and has always read right.
      className={cn(compact ? "text-sm font-medium leading-snug" : "font-semibold leading-none", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  const compact = useContext(CardDensityContext) === "compact";
  return (
    <div
      data-slot="card-description"
      // `--text-muted`, the kit's secondary-line colour (StatTile's description, the
      // field captions). It was `--money-neutral`, a MONEY token that happened to be
      // a similar grey — and a palette that re-tunes the money colours moved every
      // card's description with them.
      className={cn(compact ? "text-xs" : "text-sm", "text-muted", className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-start-1 row-span-2 self-start justify-self-end", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardContentProps) {
  const padded = useContext(CardPaddedContext);
  // `last:pb-6`, not a plain `pb-6`: CardHeader owns the top padding and CardFooter
  // owns the bottom one, so a card WITHOUT a footer had nothing closing it off and
  // its last field sat flush against the card edge (kastlan feedback: the language
  // input touching the card bottom on /profile). Scoping to `:last-child` fixes that
  // case and leaves a footered card's rhythm exactly as it was. Inside a padded Card
  // the card closes itself off, so there is nothing to add.
  return <div data-slot="card-content" className={cn(!padded && "px-6 last:pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  const padded = useContext(CardPaddedContext);
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", !padded && "px-6 pb-6", className)}
      {...props}
    />
  );
}
