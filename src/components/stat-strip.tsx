import { Children, isValidElement } from "react";
import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_STAT_TILE_LABELS } from "./stat-tile-labels";
import { StatTileGridLoadingContext, StatTileStripContext } from "./stat-tile-context";
import type { StatTileLabels } from "./stat-tile";

export interface StatStripProps extends ComponentPropsWithRef<"div"> {
  /**
   * Every tile in the strip is loading: each shows its skeleton, and the strip says
   * "Loading…" ONCE in a polite status region, as {@link StatTileGrid}'s `loading` does. A
   * tile's own `loading` in a strip that is not loading still speaks for itself.
   */
  loading?: boolean;
  /** The strip's one sentence — `loading` from {@link StatTileLabels}. */
  labels?: LabelOverride<Pick<StatTileLabels, "loading">>;
}

/**
 * A quiet row of three to six figures — a public page's "42 experiments · 9 topics · 1.2K
 * visitors" — where {@link StatTileGrid}'s cards would be a dashboard. No cards: a hairline
 * above and below is the frame, and the tiles in it are `plain` {@link StatTile}s (unless
 * one names a `variant` of its own), so each keeps its `loading`, its `href`/`renderLink`
 * and its number formatting.
 *
 * ```tsx
 * <StatStrip>
 *   <StatTile label="Experiments" value={42} href="/experiments" />
 *   <StatTile label="Topics" value={9} />
 *   <StatTile label="Visitors" value={1240} compact />
 * </StatStrip>
 * ```
 *
 * Start-aligned. Two columns on a phone; from `sm` three (two for four tiles, so a 2 × 2
 * rather than three and one left over); from `lg` one row, every tile the same width. By
 * the viewport, not the strip's own width like StatTileGrid: a strip runs the width of a
 * page's content, and its rows are a count, not a fit. Past six tiles one row from `lg` is
 * cramped — use StatTileGrid there.
 */
export function StatStrip({ loading = false, labels, className, children, ...rest }: StatStripProps) {
  const text = useKitLabels("statTile", DEFAULT_STAT_TILE_LABELS, labels);
  const count = Children.toArray(children).filter(isValidElement).length;
  return (
    <div
      {...rest}
      aria-busy={loading || rest["aria-busy"] || undefined}
      // `relative`: the containing block for the sr-only status, which is absolutely
      // positioned and so also takes no grid cell.
      className={cn(
        "relative grid grid-cols-2 gap-x-6 gap-y-4 border-y border-subtle py-4",
        count !== 4 && "sm:grid-cols-3",
        "lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none",
        className,
      )}
    >
      {/* Always mounted, filled while loading: a live region announces a CHANGE. */}
      <span role="status" className="sr-only">
        {loading ? text.loading : ""}
      </span>
      <StatTileStripContext.Provider value>
        <StatTileGridLoadingContext.Provider value={loading}>{children}</StatTileGridLoadingContext.Provider>
      </StatTileStripContext.Provider>
    </div>
  );
}
