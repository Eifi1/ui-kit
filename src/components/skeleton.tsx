import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";

/**
 * The look of a placeholder, as one class string — the same fill and pulse
 * `StatTile`'s `loading` headline draws (it imports this), so a tile and the list
 * beside it shimmer as one surface.
 *
 * `motion-reduce:animate-none`: a pulse is motion with no information in it, which
 * is exactly what `prefers-reduced-motion` asks to be dropped. The fill stays, so the
 * shape of what is coming is still there.
 */
export const SKELETON_CLASS = "animate-pulse rounded bg-[var(--bg-active)] motion-reduce:animate-none";

export type SkeletonShape = "line" | "block" | "circle";

export interface SkeletonProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** `line` (default): a bar the height of a line of small text. `block`: an area
   *  (an image, a chart, a card body). `circle`: an avatar. Size any of them with
   *  `className` (`w-32`, `h-40`, `size-8`). */
  shape?: SkeletonShape;
  /** For `line`: this many lines, the last one shorter — a paragraph's outline. */
  lines?: number;
}

const SHAPE: Record<SkeletonShape, string> = {
  line: "h-3 w-full",
  block: "h-24 w-full rounded-md",
  circle: "size-10 rounded-full",
};

/**
 * A grey stand-in for content that is on its way.
 *
 * keksdose and kastlan both drew these by hand — `animate-pulse bg-slate-200` in one
 * place, a token in the next, a pulse that ran under reduced motion everywhere.
 *
 * ALWAYS `aria-hidden`. A placeholder is not content, and a reader that met twelve
 * unnamed grey boxes would have learned nothing. Say "loading" once, where it
 * belongs: `aria-busy` on the region being filled, or a `Spinner` / sr-only line
 * beside the skeletons.
 */
export function Skeleton({ shape = "line", lines, className, ...rest }: SkeletonProps) {
  if (shape === "line" && lines !== undefined && lines > 1) {
    return (
      <div {...rest} aria-hidden className={cn("flex flex-col gap-2", className)} data-skeleton="lines">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(SKELETON_CLASS, SHAPE.line, i === lines - 1 && "w-2/3")}
            data-skeleton="line"
          />
        ))}
      </div>
    );
  }
  return (
    <div
      {...rest}
      aria-hidden
      data-skeleton={shape}
      className={cn(SKELETON_CLASS, SHAPE[shape], className)}
    />
  );
}
