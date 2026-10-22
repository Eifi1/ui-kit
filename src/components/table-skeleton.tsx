import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
import { Skeleton } from "./skeleton";

export interface TableSkeletonProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Rows per group (or in all, without `groups`). Default 5. */
  rows?: number;
  /** Columns, the name column included. Default 3. */
  columns?: number;
  /**
   * `list` (default): a name bar of varying width, then the other columns as figures at
   * the row's end — from three columns up they go under the name on a phone, as a card
   * list draws them. `grid`: a label column, then one equal block per column, clipped
   * at the edge — a heatmap or a matrix.
   */
  variant?: "list" | "grid";
  /** This many group header bars, each over `rows` rows (a budget's groups). Default none. */
  groups?: number;
  /** A row of this many stat-tile outlines above the panel. Default none. */
  tiles?: number;
  /** A title and a hint line at the top of the panel, as a card's head. */
  heading?: boolean;
  /** The panel's border and surface. Default `true`; `false` for a panel the caller frames. */
  framed?: boolean;
  /** What is said, once. Default `common.loading` ("Loading…") from the provider. */
  label?: string;
}

/** Name widths that differ from row to row, so the outline reads as a list rather than
 *  a striped block. */
const NAME_WIDTHS = ["w-2/5", "w-1/2", "w-1/3", "w-5/12"];

/**
 * The outline of a table or a list while its data loads (0.48, keksdose dev #628) — so a
 * page does not jump from a centred spinner to a long list when the data lands.
 * keksdose hand-built three of these (TabSkeleton, BudgetSkeleton,
 * VarianceHeatmapSkeleton), each a stack of `Skeleton`s with its own sr-only line.
 *
 * ONE `role="status"` region says "Loading…" once; every placeholder inside is
 * `aria-hidden` — not one announcement per row. The pulse stops under reduced motion
 * (`Skeleton`'s own rule); the shapes stay. Props and `ref` go to the region.
 */
export function TableSkeleton({
  rows = 5,
  columns = 3,
  variant = "list",
  groups = 0,
  tiles = 0,
  heading = false,
  framed = true,
  label,
  className,
  ...rest
}: TableSkeletonProps) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const figures = Math.max(0, columns - 1);
  const grid = variant === "grid";
  // Three figures don't fit beside a name on a phone; one or two do.
  const stack = !grid && figures >= 2;

  const row = (key: number) =>
    grid ? (
      <div key={key} className="flex items-center gap-1" data-skeleton-row="">
        <Skeleton className="h-7 w-28 shrink-0" />
        {Array.from({ length: figures }, (_, c) => (
          <Skeleton key={c} className="h-7 w-12 shrink-0" />
        ))}
      </div>
    ) : (
      <div
        key={key}
        className={cn("flex items-center gap-4 px-4 py-3", stack && "max-sm:flex-col max-sm:items-stretch max-sm:gap-2")}
        data-skeleton-row=""
      >
        <Skeleton className={cn("h-4", NAME_WIDTHS[key % NAME_WIDTHS.length])} />
        {figures > 0 && (
          <div className={cn("ms-auto flex gap-6", stack && "max-sm:ms-0 max-sm:justify-between max-sm:gap-2")}>
            {Array.from({ length: figures }, (_, f) => (
              <Skeleton key={f} className="h-4 w-16 md:w-24" />
            ))}
          </div>
        )}
      </div>
    );

  const block = (offset: number) => (
    <div className={grid ? "space-y-1 overflow-hidden" : "divide-y divide-subtle"}>
      {Array.from({ length: rows }, (_, r) => row(offset + r))}
    </div>
  );

  return (
    // `relative`: the containing block for the sr-only text (sr-only-containment.test).
    <div {...rest} role="status" className={cn("relative", className)} data-skeleton-preset="table">
      <span className="sr-only">{label ?? common.loading}</span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        {tiles > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
            {Array.from({ length: tiles }, (_, i) => (
              <div key={i} className="rounded-lg border border-subtle bg-surface p-4" data-skeleton-tile="">
                <Skeleton className="h-3 w-24 max-w-full" />
                <Skeleton className="mt-3 h-7 w-32 max-w-full" />
              </div>
            ))}
          </div>
        )}
        <div
          className={cn("overflow-clip", framed && "rounded-lg border border-subtle bg-surface", grid && "p-3")}
          data-skeleton-panel=""
        >
          {heading && (
            <div className={cn(grid ? "mb-3" : "px-4 pt-4 pb-2")} data-skeleton-heading="">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="mt-2 h-3 w-64 max-w-full" />
            </div>
          )}
          {groups > 0
            ? Array.from({ length: groups }, (_, g) => (
                <div key={g} className={cn(g > 0 && "border-t border-subtle")}>
                  <div className="flex items-center gap-3 bg-surface-2 px-4 py-2.5" data-skeleton-group="">
                    <Skeleton className={cn("h-4", g % 2 ? "w-24" : "w-28")} />
                    <Skeleton className="ms-auto h-4 w-12" />
                  </div>
                  {block(g * rows)}
                </div>
              ))
            : block(0)}
        </div>
      </div>
    </div>
  );
}
