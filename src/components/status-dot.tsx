import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import type { ProgressBarTone } from "./progress-bar";

/**
 * The tones are `ProgressBar`'s, name for name — which are `Chip`'s, less nothing — so a
 * dot in a legend, the bar it explains and the badge beside it can be given the same
 * word and agree. The money pair is here for the same reason it is there: a legend
 * swatch for income is money, not "success".
 */
export type StatusDotTone = ProgressBarTone;

/** `sm` 8px (keksdose's unread dot on the support trigger), `md` 10px (the avatar's
 *  unread dot), `lg` 12px (kastlan's occupancy legend swatch). */
export type StatusDotSize = "sm" | "md" | "lg";

const FILL: Record<StatusDotTone, string> = {
  brand: "bg-[var(--brand)]",
  neutral: "bg-[var(--text-muted)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  income: "bg-[var(--money-income)]",
  expense: "bg-[var(--money-expense)]",
};

const SIZE: Record<StatusDotSize, string> = { sm: "size-2", md: "size-2.5", lg: "size-3" };

export interface StatusDotProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  tone?: StatusDotTone;
  size?: StatusDotSize;
  /**
   * Visible text beside the dot — a legend entry ("Rented") or a status ("Online"). It
   * is also what a screen reader reads: the dot itself is decorative whenever there is
   * a label.
   *
   * Without a label the dot is hidden from assistive technology, because a coloured
   * circle says nothing to someone who cannot see it. Say the state where it IS read —
   * keksdose's avatar trigger puts "3 unread" in its own `aria-label` — or give the dot
   * an `aria-label` of its own, which makes it an image with that name.
   */
  label?: ReactNode;
  /**
   * A ring in the surface colour round the dot, so a dot laid over the corner of an
   * icon or an avatar reads as a separate mark and not a smudge (keksdose top-bar.tsx
   * :152, account-menu.tsx ~385, both hand-drawing `ring-2 ring-white
   * dark:ring-slate-900`). Position it with `className` (`absolute -end-0.5 -top-0.5`).
   */
  ring?: boolean;
  /** Extra classes for the dot itself; `className` goes on the outer element. */
  dotClassName?: string;
}

/**
 * A small token-coloured dot, with an optional label.
 *
 * kastlan's reporting dashboard (dashboard-tab.tsx:79) paints its occupancy legend
 * with raw `bg-green-500` / `bg-red-500` / `bg-yellow-500`, which ignores the palette
 * and the dark theme; keksdose draws two unread dots by hand in `rose-500`. Both are
 * this.
 */
export function StatusDot({
  tone = "neutral",
  size = "sm",
  label,
  ring = false,
  className,
  dotClassName,
  "aria-label": ariaLabel,
  ...rest
}: StatusDotProps) {
  const dot = (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full",
        SIZE[size],
        FILL[tone],
        ring && "ring-2 ring-[var(--bg-surface)]",
        label == null && className,
        dotClassName,
      )}
      {...(label == null
        ? ariaLabel
          ? { role: "img", "aria-label": ariaLabel, ...rest }
          : { "aria-hidden": true, ...rest }
        : { "aria-hidden": true })}
    />
  );
  if (label == null) return dot;
  return (
    // No `aria-label` here: the visible label is the text, and a name on a role-less
    // span is one ARIA forbids and screen readers ignore.
    <span {...rest} className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm", className)}>
      {dot}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
