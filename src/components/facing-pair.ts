// Two series charts side by side that are MIRROR IMAGES of each other — the two sides
// of a symmetric system, read against each other — and the arithmetic that keeps their
// plots the same width. Lifted out of lenkbank, where four hand-assembled copies of
// these rules had already drifted apart.
//
// The rules:
//  * The ticks stand on the OUTSIDE: the left chart's on its left, the right chart's on
//    its right. The two plots meet in the middle with nothing between them, and neither
//    column of numbers stands between a picture and the one it is compared with.
//  * The quantity is named ONCE, on the left chart; the right title would be the same
//    words twice.
//  * The untitled right axis still RESERVES the title's strip. Reserve only what its
//    ticks need and its plot comes out `AXIS_TITLE_STRIP` px wider than its neighbour's
//    — inside one shared x window, the same abscissa then lands on different pixels.
//  * A heading sits over the PLOT, not over the column, padded by the axis band on the
//    side that column's axis stands on.
//
// Only the geometry is here. The grid the pair stands in — column widths, where the
// legend goes, the chart height — is a screen's layout, and stays with the screen.
import type { CSSProperties } from "react";
import { DEFAULT_Y_AXIS } from "./chart-zoom";
import { AXIS_TICK_WIDTH, axisBandWidth, type SeriesChartAxis } from "./series-chart";

/** Which chart of a facing pair. Physical, like the axes: charts do not mirror in RTL. */
export type FacingSide = "left" | "right";

/** The two sides, in the order the columns stand. */
export const FACING_SIDES: readonly FacingSide[] = ["left", "right"];

/** The whole band a facing y axis occupies: its ticks, and the strip the rotated title
 *  is drawn in — whether or not this chart is the one that spends it. */
export function facingBand(tickWidth: number = AXIS_TICK_WIDTH): number {
  return axisBandWidth(tickWidth, true);
}

/**
 * The y axis of one chart of a facing pair.
 *
 * The left one carries the row's quantity and the ticks' own width; the right one has
 * no title, stands on the right and reserves the whole band, so the two plots come out
 * the same width. Both may be pinned to one `domain` — whether they are is a statement
 * about the measurement, so it is the caller's.
 */
export function facingAxes({
  side,
  title,
  format,
  tickWidth = AXIS_TICK_WIDTH,
  domain,
  color,
}: {
  side: FacingSide;
  /** The row's quantity, with its unit. Drawn on the left chart only. */
  title: string;
  format?: (value: number) => string;
  tickWidth?: number;
  domain?: [number, number];
  color?: string;
}): SeriesChartAxis[] {
  if (side === "right") {
    return [
      {
        id: DEFAULT_Y_AXIS,
        orientation: "right",
        width: facingBand(tickWidth),
        title: "",
        format,
        domain,
        color,
      },
    ];
  }
  return [{ id: DEFAULT_Y_AXIS, width: tickWidth, title, format, domain, color }];
}

/** What a column heading is padded by to sit over the PLOT rather than the column: the
 *  axis band, on the side that column's axis stands on. Physical padding on purpose —
 *  the chart under it does not flip in RTL, so neither may the heading's offset. */
export function facingHeadingPad(
  side: FacingSide,
  tickWidth: number = AXIS_TICK_WIDTH,
): Pick<CSSProperties, "paddingLeft" | "paddingRight"> {
  return side === "left"
    ? { paddingLeft: facingBand(tickWidth) }
    : { paddingRight: facingBand(tickWidth) };
}
