import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Info, X } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";

/** `info` (0.8.0) is the sky family, for news that is neither good nor bad: keksdose's
 *  preview and beta-performance banners, which borrowed `warning` for want of it and
 *  so told every user of the preview build that something was wrong. */
export type AlertTone = "danger" | "warning" | "info" | "success" | "neutral";

/** `sm` (0.10.0): 12px type and a 14px glyph — the hint line under a field or a total
 *  that keksdose spells `text-xs text-amber-700 dark:text-amber-400` by hand
 *  (accounts-page's missing-rate note, import-map-step, guest-key-control's two
 *  key states, goal-form). At body size those read as a second heading. */
export type AlertSize = "sm" | "md";

/** Border + surface per tone, WITHOUT a radius or padding, so a caller that owns
 * its own box (a Card, say) can take the tone alone. Single source for both
 * {@link alertFrameClass} and {@link toneFrameClass}.
 *
 * The colored tones are 2px, not 1px, and that is load-bearing rather than
 * decorative. A 1px border is 1.25 device pixels on a 125%-scaled display — the
 * usual Windows setting — so whether it renders as a solid line or as two
 * half-lit pixels depends on where the box happens to land in device-pixel space.
 * The same card then shows a heavy left edge and a right edge that fades out,
 * which is what feedback #264, #277, #491 and #498 all reported. A 2px border is
 * 2.5 device pixels: it always covers at least two pixels fully, on both edges,
 * at any offset. Callers compensate the extra pixel in their own padding so
 * switching tones never shifts the layout. */
const TONE_FRAME: Record<AlertTone, string> = {
  danger: "border-2 border-[var(--danger-border)] bg-[var(--danger-bg)]",
  warning: "border-2 border-[var(--warning-border)] bg-[var(--warning-bg)]",
  info: "border-2 border-[var(--info-border)] bg-[var(--info-bg)]",
  success: "border-2 border-[var(--success-border)] bg-[var(--success-bg)]",
  neutral: "border border-[var(--border)]",
};

/** `elevated`: the same frame on an OPAQUE surface. The dark tone washes are
 *  translucent (a 20–25 % tint), which is right on a page and wrong on anything that
 *  floats over one — keksdose's server-wake notice (#209) let the page's own text
 *  show through the one message whose job is to be read when nothing else makes
 *  sense. So the surface becomes `--bg-surface` and the tone's wash is layered on it
 *  as a background IMAGE (a flat gradient), which keeps the exact tint in both themes
 *  without a second, opaque copy of every `-bg` token. */
const TONE_ELEVATED: Record<AlertTone, string> = {
  danger: "bg-[image:linear-gradient(var(--danger-bg),var(--danger-bg))]",
  warning: "bg-[image:linear-gradient(var(--warning-bg),var(--warning-bg))]",
  info: "bg-[image:linear-gradient(var(--info-bg),var(--info-bg))]",
  success: "bg-[image:linear-gradient(var(--success-bg),var(--success-bg))]",
  neutral: "",
};
const ELEVATED = "bg-[var(--bg-surface)] shadow-lg";

/** The tone's border + surface on their own — for a caller that already has a box
 * with its own radius and padding (e.g. a Card). Remember to shave 1px off that
 * padding for the colored tones, whose border is 2px wide. */
export function toneFrameClass(tone: AlertTone): string {
  return TONE_FRAME[tone];
}

/** Single source for the warning-callout frame (feedback #277): the tone's border
 * and surface plus this component's own radius and padding, the latter
 * compensating the 2px colored border so toggling tones never shifts layout. */
export function alertFrameClass(tone: AlertTone, size: AlertSize = "md"): string {
  const box =
    size === "sm"
      ? tone === "neutral"
        ? "rounded-md px-2.5 py-1.5"
        : "rounded-md px-[9px] py-[5px]"
      : tone === "neutral"
        ? "rounded-md p-3"
        : "rounded-md p-[11px]";
  return `${box} ${TONE_FRAME[tone]}`;
}

/** The `strip` frame: the tone's surface edge to edge, no radius, and only the BOTTOM
 *  border, 1px — a strip is a band across the top of a page, and its one visible edge
 *  is the line it draws under itself. kastlan's trial, past-due and tour banners. */
function stripFrameClass(tone: AlertTone, size: AlertSize): string {
  return cn(
    TONE_FRAME[tone],
    "rounded-none border-0 border-b",
    size === "sm" ? "px-4 py-1.5" : "px-4 py-2",
  );
}

const TONE_TEXT: Record<AlertTone, string> = {
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
  success: "text-[var(--success)]",
  neutral: "text-[var(--text-secondary)]",
};

const TONE_ICON: Record<AlertTone, string> = {
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
  success: "text-[var(--success)]",
  neutral: "text-[var(--text-muted)]",
};

/** Which glyph a tone draws when the caller names none. The triangle belongs to the
 *  two tones that mean "something is wrong"; `info` and `neutral` get the ⓘ. That is
 *  what makes `neutral` safe to offer at all: until 0.8.0 it was withheld because a
 *  triangle with no colour is a warning that looks like a note — and a neutral note
 *  that draws no triangle is simply a note (lenkbank's "values are rounded"). */
const TONE_GLYPH: Record<AlertTone, typeof AlertTriangle> = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  neutral: Info,
};

interface AlertBannerBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "onClick"> {
  /** Default `danger`. `info` for news, `neutral` for a plain note — see
   *  {@link TONE_GLYPH} for why a neutral banner is now allowed. */
  tone?: AlertTone;
  /**
   * `box` (default): the framed callout. `inline`: the tone's colour, glyph and role
   * and NOTHING else — no border, no surface, no padding — so it fits inside a
   * toolbar row beside the controls it is about. Lenkbank's corner-motion toolbar
   * shows "Radius below the minimum" and "Solving…" there; a box would have doubled
   * the row's height every time either appeared.
   *
   * The inline variant is also a LIVE REGION by default — `role="alert"` for
   * `danger`, `role="status"` for the rest — because a message that appears in a
   * toolbar in answer to what the user just did is exactly the kind a screen reader
   * otherwise never hears. The box stays role-less as it always was: it is usually
   * page furniture present at load, and an alert that fires on every navigation is
   * noise. Either way a `role` you pass wins.
   *
   * `strip` (0.10.0): a band across the top of a page or a panel — edge to edge, no
   * radius, only a bottom border, content centred on one line, and usually an
   * {@link action}. kastlan's billing trial-banner and past-due-banner and its tours
   * tour-banner each built this by hand in amber or red Tailwind classes, with a
   * separate dark: spelling apiece. Role-less like the box: it is page furniture.
   */
  variant?: "box" | "inline" | "strip";
  /** See {@link AlertSize}. Default `md`. */
  size?: AlertSize;
  /**
   * `inline` only (0.11.0): lay the message out as a BLOCK — a full-width `flex` row,
   * the glyph on the text's FIRST line when it wraps — instead of the `inline-flex`,
   * centred line it is by default. keksdose writes `className="flex"` on nearly every
   * inline banner it has (accounts-page:564, holdings-panel:631, import-map-step:66/314,
   * guest-key-control:84) to get a line of its own under a total or a field, and a
   * two-line hint there then centres its glyph between the lines.
   *
   * An option rather than the new default, because the inline-flex is load-bearing for
   * the callers the variant was made for: lenkbank's corner-motion toolbar
   * (corner-motion.tsx:178) sets it as a `shrink-0` item beside the controls, kastlan's
   * import page and keksdose's rules page place it in a run of content — a block would
   * take the whole row in the second kind, and top-align the first against a taller
   * control. Ignored by `box` and `strip`, which are blocks already.
   */
  block?: boolean;
  /**
   * `false` opts an inline banner out of its live region (no `role="alert"` /
   * `role="status"`), for a message that is static page content rather than the answer
   * to something the user just did: keksdose's CAMT review step (camt-review-step:214)
   * renders "unresolved rows block the import" as part of the step, and as
   * `role="alert"` a screen reader interrupted with it on every mount. A `role` you pass
   * still wins. Default `true`; the box and the strip are role-less either way.
   */
  live?: boolean;
  /**
   * An opaque, raised surface (a shadow, and no translucency in dark mode) for a
   * notice that floats over the page — see {@link TONE_ELEVATED}. `box` and `strip`
   * only; an inline message has no surface to raise.
   */
  elevated?: boolean;
  /**
   * A trailing control — the "Update payment method" button on kastlan's trial and
   * past-due strips, the "Exit" on its tour strip. Sits at the end of the row,
   * vertically centred, and never shrinks. On a whole-row banner (`href`/`onClick`)
   * it is rendered BESIDE the row's own link or button, as the × is, because
   * interactive content may not nest.
   */
  action?: ReactNode;
  /** Replaces the tone's glyph — a `<Spinner label={null} />` for "Solving…", say.
   *  `null` draws none. Always decorative; the text carries the message. */
  icon?: ReactNode;
  /** Renders an × at the end that calls this. The banner does not hide itself — the
   *  caller removes it (and remembers that it did), as with every other kit control
   *  whose state is app state. */
  onDismiss?: () => void;
  /** Accessible name of the ×. Default: `common.dismiss` from the
   *  {@link UiKitProvider}, else "Dismiss". */
  dismissLabel?: string;
  children: ReactNode;
}

/**
 * The whole-row modes. keksdose's budget-summary card is a banner you tap to open
 * the budget; built from a `<div onClick>` it was a mouse-only target, and built as a
 * banner with a link inside it was a small target inside a big one that looked like
 * one. So `onClick` makes the banner itself ONE `<button>`, and `href` makes it one
 * `<a>`, with a trailing chevron that says so. Mutually exclusive, as on `Chip`.
 *
 * With `onDismiss` as well, the × cannot go inside the button (interactive content
 * may not nest), so the frame becomes a wrapper holding two siblings: the row's
 * button, stretched over the whole frame, and the × on top of it. It still looks and
 * clicks like one banner with an × in its corner, and the two are separate tab stops.
 */
export type AlertBannerProps = AlertBannerBaseProps &
  (
    | {
        /** Makes the whole banner one link. Mutually exclusive with `onClick`. */
        href?: string;
        onClick?: never;
      }
    | {
        href?: never;
        /** Makes the whole banner one button. Mutually exclusive with `href`. The
         *  event's element is the `<button>`, not a `<div>`. */
        onClick?: (event: MouseEvent<HTMLElement>) => void;
      }
  );

/** Warning/danger/info callout box with the shared frame and an icon — or, with
 *  `variant="inline"`, the same message as a frameless line of toned text. */
export function AlertBanner({
  tone = "danger",
  variant = "box",
  size = "md",
  block = false,
  live = true,
  elevated = false,
  action,
  icon,
  onDismiss,
  dismissLabel,
  href,
  onClick,
  className,
  children,
  role,
  ...rest
}: AlertBannerProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, { dismiss: dismissLabel });
  const inline = variant === "inline";
  const strip = variant === "strip";
  const sm = size === "sm";
  const interactive = href !== undefined || onClick !== undefined;
  // A block-laid inline banner behaves like a box for layout: a row that may wrap.
  const inlineRow = inline && !block;
  const resolvedRole = role ?? (inline && live ? (tone === "danger" ? "alert" : "status") : undefined);

  const Glyph = TONE_GLYPH[tone];
  // Onto the first line of a box's text: 2px at 14px/20px, 1px at 12px/16px.
  const nudge = inlineRow || strip ? undefined : sm ? "mt-px" : "mt-0.5";
  const glyph =
    icon === null ? null : icon !== undefined ? (
      <span
        aria-hidden
        className={cn("flex shrink-0", sm ? "[&_svg]:size-3.5" : "[&_svg]:size-4", nudge, TONE_ICON[tone])}
      >
        {icon}
      </span>
    ) : (
      <Glyph aria-hidden className={cn(sm ? "size-3.5" : "size-4", "shrink-0", nudge, TONE_ICON[tone])} />
    );

  // The row layout, shared by every shape below. A strip centres, and WRAPS: on a
  // phone a long message plus an action would otherwise squeeze the text into a narrow
  // column, so the action drops under it instead. A box may wrap its text, so it
  // top-aligns and nudges the glyph onto the first line.
  const row = cn(
    inlineRow ? "inline-flex items-center" : strip ? "flex flex-wrap items-center gap-y-1" : "flex items-start",
    sm ? "gap-1.5 text-xs" : inline ? "gap-1.5 text-sm" : "gap-2 text-sm",
  );
  const frame = inline
    ? ""
    : cn(
        strip ? stripFrameClass(tone, size) : alertFrameClass(tone, size),
        elevated && cn(ELEVATED, TONE_ELEVATED[tone]),
      );
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]";

  const content = (
    <>
      {glyph}
      <span className={cn(!inlineRow && "flex-1", "min-w-0 text-start")}>{children}</span>
      {interactive && (
        <ChevronRight
          aria-hidden
          className={cn(sm ? "size-3.5" : "size-4", "shrink-0 opacity-70 rtl:-scale-x-100", nudge)}
        />
      )}
    </>
  );

  const dismiss = onDismiss ? (
    <button
      type="button"
      aria-label={common.dismiss}
      onClick={(e) => {
        // A dismiss inside a whole-row banner must not also follow the row.
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }}
      className={cn(
        // Negative margins so the × does not make the box taller than its text; the
        // hover wash takes the tone's own hue, so it works on every tone.
        "relative z-10 -my-0.5 -me-0.5 flex size-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-current/10",
        focusRing,
      )}
    >
      <X aria-hidden className="size-4" />
    </button>
  ) : null;

  // `relative z-10` so it stays clickable over a whole-row banner's stretched target.
  const trailing =
    action !== undefined && action !== null ? (
      <div className={cn("relative z-10 flex shrink-0 items-center gap-2", !strip && !inlineRow && "self-center", strip && "ms-auto")}>
        {action}
      </div>
    ) : null;

  if (!interactive) {
    return (
      <div
        // Arbitrary attributes first — a `data-tour` anchor, a test id, an
        // `aria-describedby` — then the layout and tone classes, which are merged
        // through `cn` rather than spread so a caller's `className` refines the box
        // instead of replacing it.
        {...rest}
        role={resolvedRole}
        className={cn(row, frame, TONE_TEXT[tone], className)}
      >
        {content}
        {trailing}
        {dismiss}
      </div>
    );
  }

  const hover = "cursor-pointer transition-[filter] hover:brightness-[0.97] dark:hover:brightness-110";
  // With a dismiss the frame is a wrapper and the row element is stretched over it;
  // without one the row element IS the frame.
  const split = dismiss !== null || trailing !== null;
  const actionClass = split
    ? cn(
        "flex min-w-0 flex-1 text-start",
        sm ? "gap-1.5" : "gap-2",
        inlineRow || strip ? "items-center" : "items-start",
        "outline-none after:absolute after:inset-0 after:content-['']",
        strip ? "after:rounded-none" : "after:rounded-md",
        "focus-visible:after:ring-2 focus-visible:after:ring-[var(--brand)]",
      )
    : cn(row, !inlineRow && "w-full", frame, TONE_TEXT[tone], hover, focusRing, className);
  // The div's attributes are the row element's: an `id`, a test id or an
  // `aria-describedby` belongs on the thing that takes focus. The live-region role is
  // NOT carried over — a button or a link that is also a `status` is neither.
  const actionRest = split ? {} : rest;

  const rowAction =
    href !== undefined ? (
      <a
        {...(actionRest as ComponentPropsWithoutRef<"a">)}
        href={href}
        className={actionClass}
      >
        {content}
      </a>
    ) : (
      <button
        {...(actionRest as ComponentPropsWithoutRef<"button">)}
        type="button"
        onClick={onClick}
        className={actionClass}
      >
        {content}
      </button>
    );

  if (!split) return rowAction;
  return (
    <div
      {...rest}
      role={resolvedRole}
      className={cn("relative", row, frame, TONE_TEXT[tone], hover, className)}
    >
      {rowAction}
      {trailing}
      {dismiss}
    </div>
  );
}
