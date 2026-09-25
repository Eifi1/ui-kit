import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { AlertTriangle, ChevronRight, Info, X } from "lucide-react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";

/** `info` (0.8.0) is the sky family, for news that is neither good nor bad: keksdose's
 *  preview and beta-performance banners, which borrowed `warning` for want of it and
 *  so told every user of the preview build that something was wrong. */
export type AlertTone = "danger" | "warning" | "info" | "neutral";

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
  neutral: "border border-[var(--border)]",
};

/** The tone's border + surface on their own — for a caller that already has a box
 * with its own radius and padding (e.g. a Card). Remember to shave 1px off that
 * padding for the colored tones, whose border is 2px wide. */
export function toneFrameClass(tone: AlertTone): string {
  return TONE_FRAME[tone];
}

/** Single source for the warning-callout frame (feedback #277): the tone's border
 * and surface plus this component's own radius and padding, the latter
 * compensating the 2px colored border so toggling tones never shifts layout. */
export function alertFrameClass(tone: AlertTone): string {
  const box = tone === "neutral" ? "rounded-md p-3" : "rounded-md p-[11px]";
  return `${box} ${TONE_FRAME[tone]}`;
}

const TONE_TEXT: Record<AlertTone, string> = {
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
  neutral: "text-[var(--text-secondary)]",
};

const TONE_ICON: Record<AlertTone, string> = {
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
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
   */
  variant?: "box" | "inline";
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
  const interactive = href !== undefined || onClick !== undefined;
  const resolvedRole = role ?? (inline ? (tone === "danger" ? "alert" : "status") : undefined);

  const Glyph = TONE_GLYPH[tone];
  const glyph =
    icon === null ? null : icon !== undefined ? (
      <span aria-hidden className={cn("flex shrink-0 [&_svg]:size-4", !inline && "mt-0.5", TONE_ICON[tone])}>
        {icon}
      </span>
    ) : (
      <Glyph aria-hidden className={cn("size-4 shrink-0", !inline && "mt-0.5", TONE_ICON[tone])} />
    );

  // The row layout, shared by every shape below.
  const row = inline ? "inline-flex items-center gap-1.5 text-sm" : "flex items-start gap-2 text-sm";
  const frame = inline ? "" : alertFrameClass(tone);
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]";

  const content = (
    <>
      {glyph}
      <span className={cn(!inline && "flex-1", "min-w-0 text-start")}>{children}</span>
      {interactive && (
        <ChevronRight
          aria-hidden
          className={cn("size-4 shrink-0 opacity-70 rtl:-scale-x-100", !inline && "mt-0.5")}
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
        {dismiss}
      </div>
    );
  }

  const hover = "cursor-pointer transition-[filter] hover:brightness-[0.97] dark:hover:brightness-110";
  // With a dismiss the frame is a wrapper and the row element is stretched over it;
  // without one the row element IS the frame.
  const split = dismiss !== null;
  const actionClass = split
    ? cn(
        "flex min-w-0 flex-1 gap-2 text-start",
        inline ? "items-center" : "items-start",
        "outline-none after:absolute after:inset-0 after:rounded-md after:content-['']",
        "focus-visible:after:ring-2 focus-visible:after:ring-[var(--brand)]",
      )
    : cn(row, !inline && "w-full", frame, TONE_TEXT[tone], hover, focusRing, className);
  // The div's attributes are the row element's: an `id`, a test id or an
  // `aria-describedby` belongs on the thing that takes focus. The live-region role is
  // NOT carried over — a button or a link that is also a `status` is neither.
  const actionRest = split ? {} : rest;

  const action =
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

  if (!split) return action;
  return (
    <div
      {...rest}
      role={resolvedRole}
      className={cn("relative", row, frame, TONE_TEXT[tone], hover, className)}
    >
      {action}
      {dismiss}
    </div>
  );
}
