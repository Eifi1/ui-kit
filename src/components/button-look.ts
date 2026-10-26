import { cn } from "../lib/cn";
import { FOCUS_RING_WIDTH } from "./focus-ring";
import type { KitLinkComponent, KitLinkProps } from "../i18n/kit-labels";

/**
 * The button look, which {@link Button} and {@link IconButton} share (0.34, MOD-2, refactor
 * audit 2026-10). In ui.tsx it was the one knot in an otherwise one-way graph: Button drew
 * IconButton's pressed look, and IconButton drew Button's variant colours, its hover ink
 * and its router link. Both now draw from this module, which renders nothing, so neither
 * imports the other.
 *
 * Public through ./ui by name: `buttonClasses`, `TOUCH_TARGET_LARGE` and the four types.
 * The other exports are the two buttons' shared parts (`@internal`).
 */

/**
 * A button's look.
 *
 * - `default`: the quiet action — a warm filled chip with a hairline border. What a
 *   Button with no `variant` draws.
 * - `accent`: the strong one, solid `--brand` with `--brand-contrast` text — the one
 *   call to action a view leads with. "Accent" is the button's role here, painted in
 *   `--brand`; it is not the palette's second anchor colour, also called `accent`
 *   (theme/palette-derive.ts), which no button paints.
 * - `secondary`: an outline. `ghost`: text or glyph only. `danger`: solid `--danger`,
 *   for an action that destroys something. `link`: a text link that acts (a `<button>`).
 * - `primary` and `brand` are **deprecated** aliases of `default` and `accent` (0.49,
 *   same look; a development build warns once per name). They are removed in 0.51, and
 *   `primary` will not come back with another meaning.
 */
export type ButtonVariant =
  | "default"
  | "accent"
  | "secondary"
  | "ghost"
  | "danger"
  | "link";

// Shared base ring for every button-styled element. Kept as a named const so the
// <Button> component and the {@link buttonClasses} helper draw from one source and
// can never drift apart.
//
// The ring is the kit's focus frame (§5): {@link FOCUS_RING_WIDTH} wide, on keyboard focus
// (`focus-visible`) — a tap or a click no longer leaves a ring on the button — in each
// variant's own colour below.
//
// `[&_svg]:shrink-0` (0.32.2, kastlan's 0.32.1 report): an icon beside a label keeps its
// size when the label wraps at Large. Without it the svg was a flex item like the text,
// and a two-line label squeezed it to a sliver ("New invoice" in a page header at 360 px
// / Extra large).
const BUTTON_BASE = cn(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0",
  FOCUS_RING_WIDTH,
);

/**
 * The touch target at Large and Extra large (docs/text-size-harmonization.md §4): at
 * least 48 px, the size a finger needs whatever the type. In px on purpose, like the
 * field floor ({@link FIELD_TOUCH_TEXT}): it is a physical threshold, not a size that
 * follows the text. Normal keeps the kit's own heights; a `large:` variant, so it costs
 * no render and is right on the first paint.
 */
export const TOUCH_TARGET_LARGE = "large:min-h-[48px] large:min-w-[48px]";

/** The 48 px target at Large for a control whose BOX cannot grow (a chip's or a tab's
 *  action, IconButton `2xs`; Tabs' overflow cues, 0.48 KS N3): an invisible `::after`
 *  centred on it takes the taps a finger lands round the glyph. Not public. */
export const HIT_AREA_LARGE =
  "relative large:after:absolute large:after:inset-[calc((100%-48px)/2)] large:after:content-['']";

export type ButtonSize = "sm" | "md";

// Box geometry per size, split out of the base so the two cannot be merged into one
// string that a size then has to fight. `md` is the pre-0.8.0 look, unchanged. `sm` is
// the compact secondary action keksdose repeats by hand as `px-2 py-1 text-xs` (and
// `px-2 py-0.5 text-xs`) on the buttons in a toolbar or a table header; one rung is
// enough, so the two spellings meet at `py-1`. There is no `lg`: no app has asked for
// a bigger text button (IconButton's `lg` is a touch target, not a text size). The
// variant map comes AFTER the size, so `link`'s `p-0` still wins at either size.
//
// At Large and above (§4) `sm` grows to `md`'s height — the padding that makes its
// 1rem line as tall as `md`'s 1.25rem one — and both reach the 48 px touch target. The
// type stays `sm`'s: the compact button is still the quieter one. Not on `link`, which
// is a word in a sentence and has no box to grow (see `buttonLook`).
const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "gap-2 px-3 py-2 text-sm",
  sm: "gap-1.5 px-2 py-1 text-xs",
};
const BUTTON_SIZES_LARGE: Record<ButtonSize, string> = {
  md: "large:min-h-[48px]",
  sm: "large:min-h-[48px] large:py-2.5",
};

/**
 * The hover of a control that may sit on the page, a card or a well (0.33, B′ —
 * docs/colour-roles-harmonization.md §12.1, §12.10): the body ink at 7 %, TRANSLUCENT,
 * so it darkens (in dark, lightens) whatever is under it by the same step — 1.11:1 or
 * more on all three surfaces, both themes, with the label at 7:1 and up. It was
 * `--bg-surface-2`, which since 0.33 is the page itself in light: a ghost button on the
 * page would not have moved at all. Not `--bg-hover` either, which is mixed against the
 * CARD and stands only 1.04:1 from the page. IconButton's `custom` tone uses the same
 * recipe at 12 %.
 */
export const HOVER_INK = "hover:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)]";

// Warm, palette-token-driven so buttons blend with the fields + cards in every theme.
// Actions default to a warm bordered look (`default` = filled warm chip, secondary =
// outline); `accent` is the solid brand fill for the rare strong CTA; `danger` takes the
// semantic `--danger` family (destructive semantics), so a consumer can re-point the
// destructive hue instead of inheriting a hard-coded red. Focus rings follow each
// variant's own accent: brand for the four neutral ones, danger for `danger`.
export const buttonVariantClasses: Record<ButtonVariant, string> = {
  default:
    // Hovers onto `--bg-active`, not `--border` (0.33, §12.9): More contrast steps the
    // border until it is a 3:1 LINE, and as a fill under the label that left 2.7:1.
    "border border-subtle bg-surface-2 text-primary hover:bg-active focus-visible:ring-brand",
  secondary: `border border-subtle bg-transparent text-primary ${HOVER_INK} focus-visible:ring-brand`,
  ghost: `bg-transparent text-primary ${HOVER_INK} focus-visible:ring-brand`,
  danger:
    "bg-danger text-danger-contrast hover:bg-danger-hover focus-visible:ring-danger-strong",
  accent:
    "bg-brand text-brand-contrast hover:bg-brand-hover focus-visible:ring-brand",
  // A text link that is still a `<button>` — keksdose's six hand-rolled
  // `<button className="text-brand underline">` sites ("Resend code", "Show all",
  // "Undo" in a toast…), which act rather than navigate and so must not be anchors.
  // The box padding goes (`p-0`) so it sits in a sentence at the text's own size, but
  // the base's focus ring stays: those copies had `outline-none` and no ring, so
  // a keyboard user tabbing onto them saw nothing at all. `rounded-sm` keeps that
  // ring hugging the word instead of drawing a pill round it.
  //
  // Under More contrast the word reads `--brand-muted`, the brand AS TEXT (0.36,
  // colour-roles §13.3 decision 8): `--brand` is solved as a mark (3:1), and on More
  // contrast's darker light well Moss's read 3.68:1; the derived dark brands sit at 3.0
  // as text too. Both modes, since `contrast:` does not split them.
  link:
    "rounded-sm p-0 bg-transparent text-brand underline-offset-4 hover:underline focus-visible:ring-brand contrast:text-brand-muted",
};

/**
 * The text colour of a `link` or `ghost` button, over the variant's own.
 *
 * `muted` is the QUIET link keksdose hand-rolls in six places (tours-page:321's "Mark
 * undone", transaction-fields:176/215's "Add line" / "Fill total",
 * invoice-lines-table:376, invoice-review:464): secondary text that darkens to the
 * body colour under the pointer, for an action that must be findable but not compete
 * with the brand-coloured one beside it. `danger` is the same quiet look turning
 * `--danger` on hover — transaction-editor:401's "Remove split", which is a text
 * action that destroys something.
 *
 * A `tone` rather than a `link-muted` variant, because it is the axis IconButton
 * already has (`tone="muted"`, `tone="danger"`, same quiet-until-hover meaning), and
 * because the same two looks are wanted on `ghost`.
 *
 * `danger` also reaches the two NEUTRAL boxed variants, where the box carries it:
 * `secondary` becomes an outlined destructive button (`--danger` text and a
 * `--danger-border` outline, the quiet danger fill on hover) and `default` a soft one
 * (the quiet fill at rest, solid `--danger` on hover). kastlan's meeting-invitations-
 * tab.tsx "Remove all" is `variant="secondary" className="text-destructive"` — a
 * destructive action that must sit in a row of secondary buttons without shouting
 * like the solid `variant="danger"` would, and whose red text alone left the border
 * and hover saying "neutral". `muted` stays a text look and does nothing on a box, and
 * `danger`, `accent` and `link`'s own colours are left alone: a tone that recoloured a
 * solid danger or accent button would be a second variant under another name.
 */
export type ButtonTone = "default" | "muted" | "danger";

// `contrast:text-secondary` restates the tone's own colour under the `contrast:` variant,
// so tailwind-merge drops the link's `contrast:text-brand-muted` (0.36): a quiet link
// stays quiet under More contrast. On `ghost` it reads the same either way.
const BUTTON_TONES: Record<Exclude<ButtonTone, "default">, string> = {
  muted:
    "text-secondary hover:text-primary disabled:hover:text-secondary contrast:text-secondary",
  danger:
    "text-secondary hover:text-danger focus-visible:ring-danger-strong disabled:hover:text-secondary contrast:text-secondary",
};

/** Only the two transparent variants take every tone; see {@link ButtonTone}. */
const TONED_VARIANTS = new Set<ButtonVariant>(["link", "ghost"]);

// `tone="danger"` on the neutral boxed variants — see {@link ButtonTone}. Each string
// restates every colour the variant sets (border, fill, text, hover, ring) so none of
// the neutral ones survives the merge.
const BUTTON_BOXED_DANGER: Partial<Record<ButtonVariant, string>> = {
  // Not boxed, but its hover is a fill: the danger wash under the danger text, as
  // IconButton's danger tone (0.33). On B′'s translucent ink `--danger` fell to 4.2:1
  // over a light page.
  ghost: "hover:bg-danger-soft",
  secondary:
    "border-danger bg-transparent text-danger hover:bg-danger-soft focus-visible:ring-danger-strong",
  default:
    "border-danger bg-danger-soft text-danger hover:border-[var(--danger)] hover:bg-danger hover:text-danger-contrast focus-visible:ring-danger-strong disabled:hover:border-danger disabled:hover:bg-danger-soft disabled:hover:text-danger",
};

// `pressed` on a `link`: the brand colour and a heavier weight, which is exactly what
// lenkbank's "All speeds" toggle paints by hand (gear/hysteresis-charts.tsx:482). After
// the tone, so a pressed muted link is brand, and an unpressed one is quiet grey. Under
// More contrast the brand as text, `--brand-muted`, at rest and hovered (0.36, as the
// `link` variant), whatever the tone.
export const BUTTON_LINK_PRESSED =
  "font-medium text-brand hover:text-brand disabled:hover:text-brand contrast:text-brand-muted contrast:hover:text-brand-muted contrast:disabled:hover:text-brand-muted";

/** The second argument of {@link buttonClasses} in its options form. */
export interface ButtonClassesOptions {
  /** See {@link ButtonProps.size}. */
  size?: ButtonSize;
  className?: string;
}

/**
 * Button classes for the rare case where the styling must land on a non-`<button>`
 * element that {@link Button} can't render — e.g. a router `<Link>` or a Radix
 * AlertDialog Action/Cancel (which must stay the Radix element). Everywhere a real
 * button works, prefer `<Button>`. Draws from the same base, size and variant maps as
 * `<Button>`, so the two stay in lockstep.
 *
 * The second argument is either the extra classes (the pre-0.8.0 form) or
 * `{ size, className }` — `buttonClasses("secondary", { size: "sm" })` for keksdose's
 * compact toolbar links.
 */
export function buttonClasses(
  variant: ButtonVariant = "default",
  classNameOrOptions?: string | ButtonClassesOptions,
): string {
  const { size = "md", className } =
    typeof classNameOrOptions === "object" ? classNameOrOptions : { className: classNameOrOptions };
  return cn(
    BUTTON_BASE,
    BUTTON_SIZES[size],
    variant !== "link" && BUTTON_SIZES_LARGE[size],
    buttonVariantClasses[variant],
    className,
  );
}

// `pressed`: a toggle that is on. The brand glyph on the quiet brand fill — the
// "selected" look of a Chip or a SegmentedControl option, so an on toggle reads as on
// beside them. After the tone, so a pressed `muted` button is brand, not grey. On hover
// the glyph turns brand-muted: `--brand` on `--brand-bg-hover` is 2.69–2.80 in four dark
// presets, under an icon's 3:1 (colour-roles §12.12). Button's `pressed` draws it on its
// boxed variants too, which is why it lives here and not in ./icon-button.
export const ICON_BUTTON_PRESSED =
  "bg-brand-soft text-brand hover:bg-brand-soft-hover hover:text-brand-muted disabled:hover:bg-brand-soft disabled:hover:text-brand";

/** @internal The button look shared by the `<button>` and the `<a>` form. */
export function buttonLook(variant: ButtonVariant, size: ButtonSize, stretch: boolean | undefined, tone: ButtonTone) {
  return cn(
    BUTTON_BASE,
    BUTTON_SIZES[size],
    // §4: `sm` at `md`'s height and the 48 px target at Large — not on a `link`. In the
    // order `buttonClasses` has it, so the two strings stay identical.
    variant !== "link" && BUTTON_SIZES_LARGE[size],
    // In a flex row next to a taller labelled field, `stretch` makes the button
    // fill the field's height so the two line up (self-stretch overrides the row's
    // align-items). No effect outside a flex row / when it's already the tallest.
    stretch && "self-stretch",
    buttonVariantClasses[variant],
    tone !== "default" && TONED_VARIANTS.has(variant) && BUTTON_TONES[tone],
    tone === "danger" && BUTTON_BOXED_DANGER[variant],
  );
}

/** @internal Calls a `renderLink` / provider link as a function, as ListItem and Chip
 *  do — an inline `renderLink` arrow would otherwise be a new component type every
 *  render. Both buttons' link forms render through it. */
export function RenderedButtonLink({ render, ...props }: KitLinkProps & { render: KitLinkComponent }) {
  return render(props);
}
