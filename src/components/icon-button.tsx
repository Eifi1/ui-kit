import { useContext, useId } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from "react";
import { cn } from "../lib/cn";
import { FOCUS_RING_WIDTH } from "./focus-ring";
import { useLargeText } from "../hooks/use-large-text";
import { Tooltip, type TooltipSide } from "./tooltip";
import { DEFAULT_COMMON_LABELS, useKitLabels, useKitLink } from "../i18n/kit-labels";
import type { KitLinkComponent, KitLinkProps } from "../i18n/kit-labels";
import { pickLinkRenderer, replacingClick, routerLinkNavigation } from "./text-link";
import { useCommitReason } from "./write-lock";
import type { CommitScope } from "./write-lock";
import { hasContent } from "../lib/presence";
import { CompactControlsContext, LockedReason, type DisabledReasonDisplay } from "./field-parts";
import { Spinner } from "./spinner";
import {
  HOVER_INK,
  ICON_BUTTON_PRESSED,
  RenderedButtonLink,
  TOUCH_TARGET_LARGE,
  buttonVariantClasses,
} from "./button-look";
import type { ButtonVariant } from "./button-look";

// Canonical square icon-only button. <Button> carries TEXT geometry — px-3 py-2
// gap-2 — so rendering a bare glyph through it gives a small icon in a wide,
// text-shaped box. This fixes a square box instead and, crucially, forces the
// child icon to a size set by the BOX (20px at md/sm) via `[&_svg]:size-*` so a
// caller cannot under-size it. Use it wherever an action is a bare icon
// (edit/delete/tools) so they all match the top-bar icon buttons and can never
// drift apart again.
//
// Draws its colours from the same `buttonVariantClasses` map as <Button>, so the
// two re-skin together with the palette.
const ICON_BUTTON_BASE = cn(
  "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  FOCUS_RING_WIDTH,
);

export type IconButtonSize = "2xl" | "xl" | "lg" | "md" | "sm" | "xs" | "2xs";

// Box and glyph together, so a 24px chip action cannot end up holding a 20px icon
// that touches its edges. The two small steps are lenkbank's list-row (28px) and
// chip (24px) actions, which it had hand-rolled beside the kit's 32/36px ones.
const ICON_BUTTON_SIZES: Record<IconButtonSize, string> = {
  // 64px with a 28px glyph: a camera's shutter (keksdose invoices/camera-capture.tsx:248,
  // `size-16` by hand) — the one control of a full-screen capture view, thumb-sized.
  "2xl": "size-16 [&_svg]:size-7",
  // 48px with a 24px glyph: the one primary action of a phone screen or sheet, a step
  // past the 44px minimum rather than on it.
  xl: "size-12 [&_svg]:size-6",
  // The 44px touch target (WCAG 2.5.5's size) with the same 20px glyph — keksdose's
  // bulk-action bars write `size-11` by hand over an `md` button to get it on phones.
  lg: "size-11 [&_svg]:size-5",
  md: "size-9 [&_svg]:size-5",
  sm: "size-8 [&_svg]:size-5",
  xs: "size-7 rounded [&_svg]:size-4",
  "2xs": "size-6 rounded [&_svg]:size-3.5",
};

// `stretch`: the same WIDTH and glyph, and a height taken from the row instead of
// stated — `size-*` sets a height that `self-stretch` cannot override, so the box is
// written as a width plus a minimum height (the square it would otherwise be).
const ICON_BUTTON_STRETCH_SIZES: Record<IconButtonSize, string> = {
  "2xl": "w-16 min-h-16 self-stretch [&_svg]:size-7",
  xl: "w-12 min-h-12 self-stretch [&_svg]:size-6",
  lg: "w-11 min-h-11 self-stretch [&_svg]:size-5",
  md: "w-9 min-h-9 self-stretch [&_svg]:size-5",
  sm: "w-8 min-h-8 self-stretch [&_svg]:size-5",
  xs: "w-7 min-h-7 self-stretch rounded [&_svg]:size-4",
  "2xs": "w-6 min-h-6 self-stretch rounded [&_svg]:size-3.5",
};

// The label as visible text beside the glyph (0.32, §4: at Large "IconButton shows its
// label"): the same height and glyph as the square, a width taken from the words. A
// map of its own rather than `w-auto` over `size-*`, which tailwind-merge cannot undo
// in one direction.
const ICON_BUTTON_TEXT_SIZES: Record<IconButtonSize, string> = {
  "2xl": "h-16 gap-2 px-4 text-base [&_svg]:size-7",
  xl: "h-12 gap-2 px-3.5 text-sm [&_svg]:size-6",
  lg: "h-11 gap-2 px-3 text-sm [&_svg]:size-5",
  md: "h-9 gap-1.5 px-2.5 text-sm [&_svg]:size-5",
  sm: "h-8 gap-1.5 px-2 text-sm [&_svg]:size-5",
  xs: "h-7 gap-1 rounded px-1.5 text-xs [&_svg]:size-4",
  "2xs": "h-6 gap-1 rounded px-1.5 text-xs [&_svg]:size-3.5",
};
const ICON_BUTTON_TEXT_STRETCH_SIZES: Record<IconButtonSize, string> = {
  "2xl": "min-h-16 self-stretch gap-2 px-4 text-base [&_svg]:size-7",
  xl: "min-h-12 self-stretch gap-2 px-3.5 text-sm [&_svg]:size-6",
  lg: "min-h-11 self-stretch gap-2 px-3 text-sm [&_svg]:size-5",
  md: "min-h-9 self-stretch gap-1.5 px-2.5 text-sm [&_svg]:size-5",
  sm: "min-h-8 self-stretch gap-1.5 px-2 text-sm [&_svg]:size-5",
  xs: "min-h-7 self-stretch gap-1 rounded px-1.5 text-xs [&_svg]:size-4",
  "2xs": "min-h-6 self-stretch gap-1 rounded px-1.5 text-xs [&_svg]:size-3.5",
};

// The 48 px touch target at Large (§4), per size. `lg` and up are past it already
// (2.75rem is 55 px at Large). `md` … `xs` grow their box to it. `2xs` is the action ON
// a chip or a tab, whose box cannot grow without growing the chip: it keeps its box and
// gets a 48 px hit area instead — an invisible `::after` centred on it, which takes the
// taps a finger lands round the glyph.
const ICON_BUTTON_TOUCH_LARGE: Record<IconButtonSize, string> = {
  "2xl": "",
  xl: "",
  lg: "",
  md: TOUCH_TARGET_LARGE,
  sm: TOUCH_TARGET_LARGE,
  xs: TOUCH_TARGET_LARGE,
  "2xs":
    "relative large:after:absolute large:after:inset-[calc((100%-48px)/2)] large:after:content-['']",
};

// A tone re-colours the glyph without changing what the variant draws around it.
// Each coloured tone comes in two resting looks, picked by `quiet` (see the prop):
// QUIET is placeholder grey until the pointer or focus arrives, then the tone's
// family; TONED wears the tone's colour at rest. The defaults are the looks each tone
// had before `quiet` existed: `danger` is quiet — an action in every row of a list
// must not shout from every row, so the red arrives only on the one row you are about
// to act on — while `warning` and `info` are toned, because they mark the ONE thing
// on the row to notice (keksdose's "needs review" flag, its reconcile action at
// accounts-page:867), and quiet grey would hide the very thing they point out.
// `muted` is quiet by definition and has no toned look; `default` has no tone.
//
// `success` is toned at rest too: the green is the news (keksdose's "in sync" chip).
// `custom` paints from `--icon-button-tone`, which `toneColor` sets — for a glyph whose
// colour FOLLOWS STATE across tones (keksdose's sync chip: rose, amber, sky, green as
// the sync moves), where swapping `tone` would do but the colour is one variable.
export type IconButtonTone = "default" | "muted" | "danger" | "warning" | "info" | "success" | "custom";

type ColouredTone = "danger" | "warning" | "info" | "success" | "custom";

const ICON_BUTTON_TONES: Record<ColouredTone, { quiet: string; toned: string }> = {
  danger: {
    quiet:
      "text-placeholder hover:bg-danger-soft hover:text-danger focus-visible:ring-danger-strong",
    toned: "text-danger hover:bg-danger-soft focus-visible:ring-danger-strong",
  },
  warning: {
    quiet:
      "text-placeholder hover:bg-warning-soft hover:text-warning focus-visible:ring-warning-strong",
    // The ring is warning's loud line (0.33, k27): `--warning-border`, amber-300, was a
    // focus ring at 1.1:1 on the light surfaces.
    toned: "text-warning hover:bg-warning-soft focus-visible:ring-warning-strong",
  },
  info: {
    quiet:
      "text-placeholder hover:bg-info-soft hover:text-info focus-visible:ring-[var(--info-border)]",
    toned: "text-info hover:bg-info-soft focus-visible:ring-[var(--info-border)]",
  },
  success: {
    quiet:
      "text-placeholder hover:bg-success-soft hover:text-success focus-visible:ring-[var(--success-border)]",
    toned: "text-success hover:bg-success-soft focus-visible:ring-[var(--success-border)]",
  },
  // The hover fill and the ring are MIXED from the one colour, since a custom tone
  // brings no `-bg` / `-border` pair of its own. The fallback is the body colour, so a
  // `custom` tone with no colour set is the default look rather than invisible.
  custom: {
    quiet:
      "text-placeholder hover:bg-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_12%,transparent)] hover:text-[var(--icon-button-tone,var(--text-primary))] focus-visible:ring-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_40%,transparent)]",
    toned:
      "text-[var(--icon-button-tone,var(--text-primary))] hover:bg-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_12%,transparent)] focus-visible:ring-[color-mix(in_srgb,var(--icon-button-tone,var(--text-primary))_40%,transparent)]",
  },
};

// The translucent ink on hover, as Button's secondary/ghost (B′, see HOVER_INK).
const ICON_BUTTON_MUTED = `text-placeholder ${HOVER_INK} hover:text-primary`;

/** Which tones sit quiet at rest when `quiet` is left out. */
const QUIET_BY_DEFAULT: Record<ColouredTone, boolean> = {
  danger: true,
  warning: false,
  info: false,
  success: false,
  custom: false,
};

function iconButtonToneClass(tone: IconButtonTone, quiet: boolean | undefined): string {
  if (tone === "default") return "";
  if (tone === "muted") return cn(ICON_BUTTON_MUTED, ICON_BUTTON_QUIET_DISABLED_REST);
  const isQuiet = quiet ?? QUIET_BY_DEFAULT[tone];
  const look = ICON_BUTTON_TONES[tone];
  return isQuiet ? cn(look.quiet, ICON_BUTTON_QUIET_DISABLED_REST) : look.toned;
}

// A disabled button must not answer the pointer. The hover classes above are plain
// `hover:` (so a caller's `className="hover:…"` still replaces them through
// tailwind-merge), which means they fire on a disabled button too — the old grey
// icon lit up on hover while refusing the click. Rather than rewrite every hover as
// `enabled:hover:` (which never matches the `<a>` that `buttonClasses` also styles,
// and would out-rank a caller's plain `hover:` override), each variant pins its
// RESTING look under `disabled:hover:`, which out-ranks any `hover:` by specificity
// and only ever matches a disabled button.
const ICON_BUTTON_DISABLED_REST: Record<IconButtonVariant, string> = {
  primary: "disabled:hover:bg-surface-2",
  secondary: "disabled:hover:bg-transparent",
  ghost: "disabled:hover:bg-transparent",
  danger: "disabled:hover:bg-danger",
  brand: "disabled:hover:bg-brand",
  link: "disabled:hover:bg-transparent disabled:hover:no-underline",
  overlay: "disabled:hover:bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)]",
  shutter: "disabled:hover:bg-media-scrim",
};

// The quiet looks change the glyph on hover, so they pin their resting glyph the
// same way. A toned look keeps its glyph on hover and needs no pin.
const ICON_BUTTON_QUIET_DISABLED_REST = "disabled:hover:text-placeholder";

// `variant="overlay"`: a round, translucent disc for a control that sits ON a photo
// (keksdose's receipt-scan preview: close, rotate, retake over the camera image).
// The inverse pair, not the surface one: what has to hold is the contrast between the
// disc and its glyph, whatever the picture underneath is, and `--bg-inverse` /
// `--text-inverse` are the one token pair defined as each other's opposite in both
// themes. The disc is the inverse at 60% (`color-mix`, so it stays a token a palette
// can re-point); the blur keeps a busy background from breaking the glyph's edge.
const ICON_BUTTON_OVERLAY =
  "rounded-full bg-[color-mix(in_srgb,var(--bg-inverse)_60%,transparent)] text-inverse backdrop-blur-sm hover:bg-[color-mix(in_srgb,var(--bg-inverse)_75%,transparent)] focus-visible:ring-[var(--text-inverse)]";

// `variant="shutter"`: the camera's release — keksdose's camera-capture.tsx:248 draws
// it by hand as a 64px circle with a thick white ring round a translucent fill. It sits
// on a live camera picture, which is dark whatever the theme, so it uses the MEDIA
// tokens (tokens.css), white ink on a dark scrim in both themes — the inverse pair
// `overlay` uses would give a dark ring on a dark viewfinder in dark mode. The focus ring stands off by 2px, or it would
// merge into the ring that is part of the look.
const ICON_BUTTON_SHUTTER =
  "rounded-full border-4 border-media-ink bg-media-scrim text-media-ink backdrop-blur-sm hover:bg-media-scrim-hover focus-visible:ring-media-ink focus-visible:ring-offset-2 focus-visible:ring-offset-media-scrim-hover";

export type IconButtonVariant = ButtonVariant | "overlay" | "shutter";

/**
 * The glyph's size in px, over the one the box size implies — see
 * {@link IconButtonProps.glyphSize}.
 */
export type IconButtonGlyphSize = 12 | 14 | 16 | 20 | 24 | 28;

const ICON_BUTTON_GLYPH_SIZES: Record<IconButtonGlyphSize, string> = {
  12: "[&_svg]:size-3",
  14: "[&_svg]:size-3.5",
  16: "[&_svg]:size-4",
  20: "[&_svg]:size-5",
  24: "[&_svg]:size-6",
  28: "[&_svg]:size-7",
};

// `pending`'s spinner, the size of the glyph it replaces (the `[&_svg]` rules above
// size only an svg, and the spinner is a bordered span).
const ICON_BUTTON_SPINNER: Record<IconButtonSize, string> = {
  "2xl": "size-7",
  xl: "size-6",
  lg: "size-5",
  md: "size-5",
  sm: "size-5",
  xs: "size-4",
  "2xs": "size-3.5",
};
const ICON_BUTTON_SPINNER_GLYPH: Record<IconButtonGlyphSize, string> = {
  12: "size-3",
  14: "size-3.5",
  16: "size-4",
  20: "size-5",
  24: "size-6",
  28: "size-7",
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Any {@link ButtonVariant}; `overlay` — a round translucent disc for use over
   *  an image (see `ICON_BUTTON_OVERLAY`); or `shutter` — a camera's release, a ringed
   *  disc over the viewfinder (see `ICON_BUTTON_SHUTTER`; pair it with `size="2xl"`). */
  variant?: IconButtonVariant;
  /** Box size: 2xl = 64px with a 28px icon (a camera shutter), xl = 48px with a 24px
   *  icon, lg = 44px (a phone's touch target), md = 36px (matches the top bar),
   *  sm = 32px — all three with a 20px icon;
   *  xs = 28px with a 16px icon (an action in a list row), 2xs = 24px with a 14px
   *  icon (an action on a chip or a tab). `glyphSize` overrides the icon. */
  size?: IconButtonSize;
  /**
   * The icon's size in px, when the box's own is not the one wanted. keksdose's sync
   * chip (app/sync-status-indicator.tsx:142) is a 24px round chip round a 20px cloud —
   * `size="2xs" glyphSize={20} shape="round"` — where `2xs` alone draws 14px. A number
   * over a new size step because the box and the glyph are two independent choices; a
   * step per combination (`"sm-lg"`) would have to be named for every one.
   */
  glyphSize?: IconButtonGlyphSize;
  /**
   * A small mark on the button's corner — the sync chip's 12px check over its cloud
   * ("all good", feedback #67). Rendered OUTSIDE the `<button>`, in a wrapper beside
   * it, so the box's `[&_svg]:size-*` rule that sizes the glyph does not blow the badge
   * up to the glyph's size; a bare `<Check />` comes out 12px, on a
   * `--bg-surface` disc that keeps it legible over the glyph. Decorative
   * (`aria-hidden`): the name (`label` / `aria-label`) must already carry the state.
   * With a badge, `className` still lands on the button; the wrapper is the flex item.
   */
  badge?: ReactNode;
  /**
   * `keep`: a disabled button keeps its full colour (no 50% drop) and an ordinary
   * cursor. For a STATUS that is also an action — the sync chip shows "in sync" in
   * green and refreshes on click, and is disabled while offline or syncing, when the
   * state it shows matters most; dimmed it read as broken (keksdose wrote
   * `disabled:cursor-default` by hand and left out the dimming). Default `dim`.
   */
  disabledStyle?: "dim" | "keep";
  /**
   * Fill the height of the flex row it stands in, keeping its width — the delete at
   * the end of keksdose's split line (transaction-fields:162), level with the labelled
   * fields beside it rather than floating at half their height. {@link Button}'s
   * `stretch`; no effect outside a flex row. With a `label`, the tooltip's wrapper is
   * what stretches.
   */
  stretch?: boolean;
  /** `round`: a circle instead of the rounded square — a compact status chip in a top
   *  bar (keksdose's sync indicator). `overlay` is always round. */
  shape?: "square" | "round";
  /**
   * The colour of `tone="custom"`, as any CSS colour — a token (`var(--warning)`),
   * ideally. Sets `--icon-button-tone` on the button, so passing a different one per
   * state re-colours the glyph, its hover fill and its focus ring together. Passing it
   * implies `tone="custom"`. Or leave it out and set the variable yourself from a class
   * (`className="[--icon-button-tone:var(--success)]"`).
   *
   * Or a `{ light, dark }` pair, one colour per theme — keksdose: a raw colour that reads
   * on the light surface (`#be123c`) is too dark on the dark one, and an inline style
   * cannot say "in dark mode". See {@link IconButtonToneColor}.
   */
  toneColor?: IconButtonToneColor;
  /** Glyph colour over the variant. `muted`: placeholder grey, full text colour on
   *  hover. `danger`: the same grey at rest, `--danger` on hover and focus — for a
   *  remove/delete that repeats down a list. `warning`: amber at rest — a flag that
   *  wants attention. `info`: sky at rest — a notice-worthy but harmless action
   *  (keksdose's reconcile). `success`: green at rest — a good state worth seeing.
   *  `custom`: the colour of `toneColor` (see there). Default: the variant's own colours. See `quiet` for
   *  turning a coloured tone's resting look the other way. */
  tone?: IconButtonTone;
  /**
   * Whether a coloured tone (`danger`, `warning`, `info`) waits for the pointer:
   * `true` is placeholder grey at rest and the tone's colour on hover and focus;
   * `false` wears the tone's colour at rest. Left out, each tone keeps its own
   * default — `danger` quiet, `warning` and `info` not. Ignored for `muted` (quiet by
   * definition) and `default` (no tone).
   *
   * `quiet={false}` on `danger` is for a destructive action that stands ALONE, where
   * hover-to-reveal hides it: keksdose's phone bulk bar (mobile-bulk-bar.tsx) has one
   * "delete all" and a touch screen that never hovers, so it painted rose by hand.
   * `quiet` on `warning`/`info` is the same switch the other way, for a flag repeated
   * down a list. A boolean over the tone rather than a new tone (`danger-solid`) or an
   * `emphasis` scale: there are exactly two resting looks, every coloured tone has
   * both, and which one fits is a question about the SITE (alone or repeated, touch or
   * pointer), not about the tone — so it is one switch the family shares.
   */
  quiet?: boolean;
  /**
   * Make it a toggle button. `true` sets `aria-pressed="true"` and draws the "on" look
   * (brand glyph on the quiet brand fill); `false` sets `aria-pressed="false"` with the
   * normal look, so a screen reader still hears a toggle that is off. Left out, it is
   * an ordinary button with no `aria-pressed` — or whatever `aria-pressed` the caller
   * passes. For keksdose's budget share toggle (budgets-page:291), which paints its own
   * brand colour over a ghost button today. Keep the `aria-label` the same in both
   * states ("Share budget"): the pressed state already says whether it is on.
   */
  pressed?: boolean;
  /** Keep the click (and the Enter/Space that produces it) from reaching an
   *  ancestor's handler — for an action inside a clickable table row or card.
   *
   *  **Not a licence to put this inside another `<button>`.** HTML forbids any
   *  interactive content, and any element with a `tabindex`, inside a button — so
   *  the `<span role="button" tabIndex={0}>` workaround is invalid too — and ARIA
   *  makes a button's children presentational, so a screen reader flattens the
   *  inner one into the outer one's name and it cannot be reached at all. Make the
   *  row's main action a button that fills the row and put this one BESIDE it, on
   *  top:
   *
   *  ```tsx
   *  <div className="relative">
   *    <button className="w-full pe-16 …" onClick={open}>…row…</button>
   *    <div className="absolute inset-y-0 end-2 flex items-center gap-0.5">
   *      <IconButton size="xs" tone="danger" aria-label="Delete" onClick={remove}>
   *        <Trash2 />
   *      </IconButton>
   *    </div>
   *  </div>
   *  ```
   *
   *  The pair look exactly like the nested version, click exactly like it, and
   *  are two tab stops a screen reader can tell apart. */
  stopPropagation?: boolean;
  /**
   * The button's name, said once: it becomes the `aria-label` AND the text of a kit
   * {@link Tooltip} round the button.
   *
   * Every app writes the pair by hand. lenkbank's nine icon actions all carry
   * `aria-label={t(x)} title={t(x)}` (shared/lib/table-columns.tsx:103,
   * projects-page.tsx:83, setpoint/segment-list.tsx:198/207, profile-bar.tsx:128/142,
   * shortcut-dialog.tsx:815/857/1007) — and `title` is the browser's own tooltip,
   * which shows late, never on focus and never on touch, and looks like no other
   * label in the kit. kastlan's RowAction (shared/components/data-table/row-action.tsx)
   * and keksdose's icon wrappers each exist to put a Tooltip round an IconButton.
   *
   * A caller's own `aria-label` still wins, for the rare name that should be longer
   * than the bubble. The bubble is visual only: it would otherwise describe the button
   * with its own name, and a screen reader would read the same word twice. Tooltip's
   * default placement applies — in place, or portalled inside a scroll container —
   * unless `tooltipPortal` says otherwise.
   */
  label?: string;
  /**
   * Show `label` as visible text beside the icon at Large and Extra large (0.32,
   * docs/text-size-harmonization.md §4, §10.8). A reader who asked for bigger type is
   * the one an unlabelled glyph fails, and on touch the tooltip never opens. Then there
   * is no tooltip: the words are on the button.
   *
   * Default `true` — except for `variant="overlay"` and `"shutter"`, which sit ON a
   * picture, and inside {@link CompactControls} (AppShell's top bar, `RowActions`'
   * inline icons). `false`: the icon alone at every size, for an icon on content — a
   * receipt overlay, a map's zoom, a viewfinder, a photo thumbnail. That must be rare;
   * a dense row's actions belong in `RowActions`, which collapses them into a "⋯" menu
   * at Large instead (§10.8). Normal never shows it. `tooltip={false}` (a universally
   * read glyph, a dialog's ✕) keeps the icon alone too.
   */
  labelVisible?: boolean;
  /** Show `label` as a tooltip. Default `true`; `false` keeps `label` as the
   *  accessible name only — for a button whose glyph is universally read (a close ✕ in
   *  a dialog header) or that already sits under a tooltip of its own. It also keeps the
   *  label from showing as text at Large (see `labelVisible`). */
  tooltip?: boolean;
  /** Where the `label` tooltip opens. See {@link Tooltip}'s `side`. */
  tooltipSide?: TooltipSide;
  /** Passed to the `label` tooltip's `portal`. Left out, Tooltip decides (see there). */
  tooltipPortal?: boolean;
  /**
   * Mount the `label` bubble only while it is up — {@link Tooltip}'s `lazy`. Default
   * `true` since 0.16.0; `false` is the always-mounted in-place bubble of before.
   *
   * Why the label bubble can be lazy when Tooltip's default is not: this bubble
   * describes nothing. It is wrapped round the button in a fragment precisely so that
   * it is NOT the button's `aria-describedby` (it would repeat the button's own name),
   * so there is no description for a lazy mount to take away — the name is the
   * `aria-label` either way, read in browse mode and on focus alike. What the
   * always-mounted bubble did do was sit in the DOM as a `role="tooltip"` node full of
   * text: every IconButton in a row added one to `getAllByRole("tooltip")` and its label
   * to the row's `textContent`, and two keksdose tests tripped over that (0.15.5 P6).
   * The cost is the one {@link Tooltip}'s "Lazy in place" note names — a test that
   * looked the bubble up without hovering now has to hover (or focus) first; pass
   * `false` while it is migrated. A `disabledReason` bubble is unaffected: that one
   * stays mounted as it was.
   */
  tooltipLazy?: boolean;
  /**
   * Busy — the action is in flight: the glyph is swapped for a spinner of the same
   * size, the button is `aria-busy`, and clicks (and the Enter/Space and form
   * submission they stand for) are swallowed, so a second press cannot start the
   * action twice. {@link Button}'s `pending`, with the same contract: `aria-disabled`
   * rather than `disabled`, so the button that was pressed keeps its focus. The name
   * (`label` / `aria-label`) stays — `aria-busy` is what says it is working. A SWAP
   * rather than Button's overlay: the box is square and fixed, so there is no width
   * for the glyph to hold, and a spinner drawn over a glyph would be two marks in one
   * 20px square.
   */
  pending?: boolean;
  /**
   * Why the action is not available — {@link Button}'s `disabledReason`, on the icon
   * button: keksdose's accounts page cannot hide an account with a balance or delete
   * one with bookings (accounts-page:879/913 — "hide requires zero", "delete blocked"),
   * nor its budgets page delete the only budget (budgets-page:330), and each wrapped a
   * natively disabled IconButton in a Tooltip that swaps its label for the reason — a
   * bubble a keyboard never opens, since `disabled` leaves the tab order, and a reason
   * a screen reader never hears.
   *
   * The same contract as Button's: `aria-disabled` instead of `disabled`, so it stays
   * focusable and hoverable; clicks (and the Enter/Space they stand for) are swallowed
   * — `stopPropagation` still applies, so a locked action in a clickable row does not
   * open the row either; the reason shows in the kit {@link Tooltip} and is attached
   * through `aria-describedby` as a `hidden` copy. The NAME stays `aria-label` /
   * `label` — "Delete", described by "The active budget cannot be deleted" — and the
   * bubble shows the reason in place of the label, since the glyph already says what
   * the button is and the reason is the news. Shown even with `tooltip={false}`: a
   * reason nobody can see is not one. Wins over `disabled`, as on Button.
   *
   * 0.32: at Large and on a touch screen the reason is a line under the button rather
   * than a bubble — see `disabledReasonDisplay`.
   */
  disabledReason?: ReactNode;
  /** Where `disabledReason` shows — {@link Button}'s `disabledReasonDisplay`. */
  disabledReasonDisplay?: DisabledReasonDisplay;
  /** This action COMMITS — {@link Button}'s `commit`: under a locked
   *  {@link WriteLockProvider} it takes the `disabledReason` path with the lock's
   *  reason. No effect without a lock. A {@link CommitScope} since 0.33. */
  commit?: CommitScope;
  /** The `<button>` element — a prop in React 19, as on {@link Button}. */
  ref?: Ref<HTMLButtonElement>;
  /** Only on the link form — see {@link IconButtonLinkProps}. */
  href?: never;
  renderLink?: never;
  external?: never;
  replace?: never;
  reloadDocument?: never;
}

/**
 * `<IconButton href>`: an icon-only LINK — keksdose F2 and kastlan 45, whose icon
 * actions that navigate (a row's "open", a card's "edit" that goes to the edit page, a
 * top bar's settings cog) were `<IconButton onClick={() => navigate(…)}>`: a button that
 * changes the page, with no middle click, no "open in new tab" and no URL on hover.
 *
 * The same rule as {@link Button}'s `href` (see {@link ButtonLinkProps}): an in-app
 * `href` goes through `renderLink`, else the provider's `linkComponent`; an external one
 * or an in-page `#anchor` stays a plain `<a>`; `external` opens a new tab and says so to
 * a screen reader; `replace` and `reloadDocument` as on Button. The look, the `label` →
 * `aria-label` + Tooltip, the badge, `toneColor` and `stopPropagation` are the button's.
 *
 * `disabled` renders an inert `<a>` with no `href` — `role="link"`, `aria-disabled`, out
 * of the tab order, dimmed — like Button's disabled link. `pressed`, `disabledReason` and
 * `disabledStyle` are a button's and are typed out: a link is not a toggle, and a link
 * that explains why it cannot be followed is a job for a disabled BUTTON.
 */
export interface IconButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "type" | "href">,
    Pick<
      IconButtonProps,
      | "variant"
      | "size"
      | "glyphSize"
      | "badge"
      | "stretch"
      | "shape"
      | "toneColor"
      | "tone"
      | "quiet"
      | "stopPropagation"
      | "label"
      | "labelVisible"
      | "tooltip"
      | "tooltipSide"
      | "tooltipPortal"
      | "tooltipLazy"
    > {
  href: string;
  /** See {@link ButtonLinkProps.renderLink}. */
  renderLink?: KitLinkComponent;
  /** See {@link ButtonLinkProps.external}. */
  external?: boolean;
  /** See {@link ButtonLinkProps.replace}. */
  replace?: boolean;
  /** See {@link ButtonLinkProps.reloadDocument}. */
  reloadDocument?: boolean;
  /** See {@link ButtonLinkProps.disabled}. */
  disabled?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  type?: never;
  form?: never;
  pressed?: never;
  disabledReason?: never;
  disabledReasonDisplay?: never;
  commit?: never;
  disabledStyle?: never;
  pending?: never;
}

/**
 * Whether an IconButton draws its `label` as text (see `labelVisible`): at Large and
 * above, with a label to draw, not switched off by the caller, the variant (`overlay`,
 * `shutter`), `tooltip={false}` or a {@link CompactControls} region.
 */
function useIconButtonText(
  label: string | undefined,
  labelVisible: boolean | undefined,
  variant: IconButtonVariant,
  tooltip: boolean,
): boolean {
  const large = useLargeText();
  const compact = useContext(CompactControlsContext);
  if (!large || label === undefined || label === "" || !tooltip) return false;
  const visible = labelVisible ?? (!compact && variant !== "overlay" && variant !== "shutter");
  return visible;
}

/** The visible label (see `labelVisible`). */
function IconButtonText({ label }: { label: string }) {
  return <span data-slot="icon-button-label">{label}</span>;
}

/**
 * `toneColor`: one CSS colour, or one per theme.
 *
 * The pair is two custom properties on the element — `--icon-button-tone-light` and
 * `--icon-button-tone-dark` — and a class that points `--icon-button-tone` at one or the
 * other by the kit's `dark` variant (`.dark` on an ancestor, tokens.css), so the colour
 * follows a theme switch in CSS alone, with no re-render and no JS reading the theme.
 * Both values are any CSS colour; a token that already flips (`var(--warning)`) needs no
 * pair.
 */
export type IconButtonToneColor = string | { light: string; dark: string };

const ICON_BUTTON_TONE_PAIR =
  "[--icon-button-tone:var(--icon-button-tone-light)] dark:[--icon-button-tone:var(--icon-button-tone-dark)]";

/** The inline custom properties `toneColor` sets over the caller's `style`. */
function toneColorStyle(toneColor: IconButtonToneColor | undefined, style: CSSProperties | undefined) {
  if (toneColor === undefined) return style;
  const vars: Record<string, string> =
    typeof toneColor === "string"
      ? { "--icon-button-tone": toneColor }
      : { "--icon-button-tone-light": toneColor.light, "--icon-button-tone-dark": toneColor.dark };
  return { ...style, ...vars } as CSSProperties;
}

/** Everything but the element: the look both forms of IconButton share. */
function iconButtonLook({
  variant,
  size,
  stretch,
  glyphSize,
  shape,
  tone,
  quiet,
  toneColor,
  withText = false,
}: {
  variant: IconButtonVariant;
  size: IconButtonSize;
  stretch: boolean | undefined;
  glyphSize: IconButtonGlyphSize | undefined;
  shape: "square" | "round";
  tone: IconButtonTone;
  quiet: boolean | undefined;
  toneColor: IconButtonToneColor | undefined;
  /** The label is drawn beside the glyph (see `labelVisible`). */
  withText?: boolean;
}) {
  return cn(
    ICON_BUTTON_BASE,
    withText
      ? cn("font-medium whitespace-nowrap", stretch ? ICON_BUTTON_TEXT_STRETCH_SIZES[size] : ICON_BUTTON_TEXT_SIZES[size])
      : stretch
        ? ICON_BUTTON_STRETCH_SIZES[size]
        : ICON_BUTTON_SIZES[size],
    // With text the pill is a 48 px target at any size; the square follows its size.
    withText ? TOUCH_TARGET_LARGE : ICON_BUTTON_TOUCH_LARGE[size],
    glyphSize !== undefined && ICON_BUTTON_GLYPH_SIZES[glyphSize],
    // After the size, so the overlay's `rounded-full` beats the small sizes' `rounded`.
    variant === "overlay"
      ? ICON_BUTTON_OVERLAY
      : variant === "shutter"
        ? ICON_BUTTON_SHUTTER
        : buttonVariantClasses[variant],
    shape === "round" && "rounded-full",
    ICON_BUTTON_DISABLED_REST[variant],
    iconButtonToneClass(tone, quiet),
    toneColor !== undefined && typeof toneColor !== "string" && ICON_BUTTON_TONE_PAIR,
  );
}

/** The badge beside the control, not in it — see `badge`. The wrapper is only a
 *  positioning box: the control inside it keeps its own focus ring and hit area. */
function withIconButtonBadge(control: ReactElement, badge: ReactNode, stretch: boolean | undefined) {
  if (!hasContent(badge)) return control;
  return (
    <span className={cn("relative inline-flex shrink-0", stretch && "self-stretch")}>
      {control}
      <span
        aria-hidden
        data-slot="icon-button-badge"
        className="pointer-events-none absolute -end-0.5 -bottom-0.5 inline-flex rounded-full bg-surface [&_svg]:size-3"
      >
        {badge}
      </span>
    </span>
  );
}

// Declared link-first, as Button is, so `<IconButton href>` picks the link props and
// `ComponentProps<typeof IconButton>` (the LAST signature) is still the button's.
export function IconButton(props: IconButtonLinkProps): ReactElement;
export function IconButton(props: IconButtonProps): ReactElement;
export function IconButton(props: IconButtonProps | IconButtonLinkProps): ReactElement {
  if (props.href !== undefined) return <IconButtonLink {...(props as IconButtonLinkProps)} />;
  return <IconButtonElement {...(props as IconButtonProps)} />;
}

function IconButtonLink({
  href,
  renderLink,
  external,
  replace,
  reloadDocument,
  disabled,
  variant = "ghost",
  size = "md",
  tone: toneProp,
  quiet,
  stopPropagation,
  stretch,
  shape = "square",
  toneColor,
  label,
  labelVisible,
  tooltip = true,
  tooltipSide,
  tooltipPortal,
  tooltipLazy = true,
  glyphSize,
  badge,
  className,
  style,
  target,
  rel,
  onClick,
  onKeyDown,
  children: glyph,
  ref,
  ...rest
}: IconButtonLinkProps) {
  const withText = useIconButtonText(label, labelVisible, variant, tooltip);
  const children = withText ? (
    <>
      {glyph}
      <IconButtonText label={label!} />
    </>
  ) : (
    glyph
  );
  const kitLink = useKitLink();
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const tone = toneProp ?? (toneColor !== undefined ? "custom" : "default");
  // Button's rule, word for word: `reloadDocument` bypasses the router, an external
  // href or an in-page `#anchor` never reaches it.
  const Link = reloadDocument ? undefined : pickLinkRenderer<KitLinkProps>(renderLink, kitLink, href);
  const newTab = !disabled && (external || target === "_blank");
  const name = rest["aria-label"] ?? label;
  // "(opens in a new tab)" joins the NAME here, not the body: an icon link has no text
  // for an sr-only span to follow, and `aria-label` would override one anyway.
  const ariaLabel = name !== undefined && newTab ? `${name} (${common.opensInNewTab})` : name;
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) e.stopPropagation();
    onClick?.(e);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
    // A link activates on Enter only; that key still bubbles to a clickable row.
    if (stopPropagation && e.key === "Enter") e.stopPropagation();
    onKeyDown?.(e);
  };
  const cls = cn(
    iconButtonLook({ variant, size, stretch, glyphSize, shape, tone, quiet, toneColor, withText }),
    // BASE's `disabled:` classes never match an `<a>` — Button's disabled link look.
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className,
  );
  const look = { style: toneColorStyle(toneColor, style), className: cls };
  let control: ReactElement;
  if (disabled) {
    control = (
      <a {...rest} {...look} ref={ref} role="link" aria-disabled="true" aria-label={ariaLabel}>
        {children}
      </a>
    );
  } else if (external || !Link) {
    control = (
      <a
        {...rest}
        {...look}
        ref={ref}
        href={href}
        aria-label={ariaLabel}
        target={external ? "_blank" : target}
        rel={external ? (rel ?? "noopener noreferrer") : rel}
        onClick={external ? handleClick : replacingClick(handleClick, href, replace, target)}
        onKeyDown={handleKeyDown}
      >
        {children}
      </a>
    );
  } else {
    control = (
      <RenderedButtonLink
        render={Link}
        {...rest}
        {...look}
        {...routerLinkNavigation(replace)}
        ref={ref}
        href={href}
        aria-label={ariaLabel}
        target={target}
        rel={rel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {children}
      </RenderedButtonLink>
    );
  }
  control = withIconButtonBadge(control, badge, stretch);
  // The words are on the link at Large: a bubble would only repeat them.
  if (!tooltip || withText || label === undefined || label === "") return control;
  return (
    // A fragment, as on the button: the bubble says what `aria-label` already does.
    <Tooltip
      label={label}
      side={tooltipSide}
      portal={tooltipPortal}
      lazy={tooltipLazy}
      className={stretch ? "self-stretch" : undefined}
    >
      <>{control}</>
    </Tooltip>
  );
}

function IconButtonElement(
  {
    variant = "ghost",
    size = "md",
    tone: toneProp,
    quiet,
    pressed,
    stopPropagation,
    stretch,
    shape = "square",
    toneColor,
    label,
    labelVisible,
    tooltip = true,
    tooltipSide,
    tooltipPortal,
    tooltipLazy = true,
    disabledReason: ownDisabledReason,
    disabledReasonDisplay,
    commit,
    pending,
    glyphSize,
    badge,
    disabledStyle = "dim",
    className,
    style,
    onClick,
    onKeyDown,
    children,
    href: _href,
    renderLink: _renderLink,
    external: _external,
    replace: _replace,
    reloadDocument: _reloadDocument,
    ref,
    ...rest
  }: IconButtonProps,
) {
  const tone = toneProp ?? (toneColor !== undefined ? "custom" : "default");
  const keep = disabledStyle === "keep";
  const withText = useIconButtonText(label, labelVisible, variant, tooltip);
  const reasonId = useId();
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  // Pending is inert like a locked button — focusable, every activation swallowed —
  // without the locked look: the spinner is the state.
  const inert = locked || Boolean(pending);
  const ownDescribedBy = rest["aria-describedby"];
  const button = (
    <button
      ref={ref}
      {...rest}
      disabled={inert ? undefined : rest.disabled}
      aria-disabled={inert || rest["aria-disabled"]}
      aria-busy={pending || rest["aria-busy"]}
      aria-describedby={locked ? (ownDescribedBy ? `${ownDescribedBy} ${reasonId}` : reasonId) : ownDescribedBy}
      aria-label={rest["aria-label"] ?? label}
      aria-pressed={pressed ?? rest["aria-pressed"]}
      style={toneColorStyle(toneColor, style)}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        // `preventDefault` too: a locked (or pending) submit must not submit its form.
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        // A button turns Enter/Space into a click of its own, but the KEY still
        // bubbles — and a clickable row listening for Enter would act on it too.
        if (stopPropagation && (e.key === "Enter" || e.key === " ")) e.stopPropagation();
        onKeyDown?.(e);
      }}
      className={cn(
        iconButtonLook({ variant, size, stretch, glyphSize, shape, tone, quiet, toneColor, withText }),
        pressed && ICON_BUTTON_PRESSED,
        // The disabled look for the focusable kind of disabled, as on Button.
        locked && (keep ? "cursor-default" : "cursor-not-allowed opacity-50"),
        keep && "disabled:cursor-default disabled:opacity-100",
        pending && "cursor-progress",
        className,
      )}
    >
      {pending ? (
        // Decorative, as on Button: `aria-busy` says it. Sized to the glyph it stands
        // in for, in the glyph's colour, so the swap does not change the button's look.
        <Spinner
          label={null}
          className={cn(
            "border-current/30 border-t-current",
            glyphSize !== undefined ? ICON_BUTTON_SPINNER_GLYPH[glyphSize] : ICON_BUTTON_SPINNER[size],
          )}
        />
      ) : (
        children
      )}
      {withText && <IconButtonText label={label!} />}
    </button>
  );
  const control = withIconButtonBadge(button, badge, stretch);
  if (locked) {
    return (
      // Button's shape: the reason as a line under it, or the bubble with a hidden copy
      // for the description (see LockedReason).
      <LockedReason
        lock={{ reason: disabledReason, reasonId }}
        display={disabledReasonDisplay}
        side={tooltipSide}
        portal={tooltipPortal}
        className={stretch ? "self-stretch" : undefined}
      >
        {control}
      </LockedReason>
    );
  }
  // The words are on the button at Large: a bubble would only repeat them.
  if (!tooltip || withText || label === undefined || label === "") return control;
  return (
    // A fragment, so Tooltip leaves the button's description alone: the bubble says
    // exactly what `aria-label` already does. Lazy by default — see `tooltipLazy`.
    <Tooltip
      label={label}
      side={tooltipSide}
      portal={tooltipPortal}
      lazy={tooltipLazy}
      className={stretch ? "self-stretch" : undefined}
    >
      <>{control}</>
    </Tooltip>
  );
}
