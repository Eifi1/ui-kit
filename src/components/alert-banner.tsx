import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/cn";

export type AlertTone = "danger" | "warning" | "neutral";

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

const TONE_TEXT: Record<Exclude<AlertTone, "neutral">, string> = {
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
};

const TONE_ICON: Record<Exclude<AlertTone, "neutral">, string> = {
  danger: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
};

export interface AlertBannerProps extends ComponentPropsWithoutRef<"div"> {
  /** `neutral` is deliberately not offered: a callout with a warning triangle in it
   *  and no colour is a warning that looks like a note, which is the one thing this
   *  box must never be. The neutral frame is still available on its own through
   *  {@link toneFrameClass}. */
  tone?: Exclude<AlertTone, "neutral">;
  children: ReactNode;
}

/** Static warning/danger callout box with the shared frame and an icon. */
export function AlertBanner({ tone = "danger", className, children, ...rest }: AlertBannerProps) {
  return (
    <div
      // Arbitrary attributes first — a `data-tour` anchor, a test id, an
      // `aria-describedby` — then the layout and tone classes, which are merged
      // through `cn` rather than spread so a caller's `className` refines the box
      // instead of replacing it.
      {...rest}
      className={cn("flex items-start gap-2 text-sm", alertFrameClass(tone), TONE_TEXT[tone], className)}
    >
      <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[tone])} />
      <span className="flex-1">{children}</span>
    </div>
  );
}
