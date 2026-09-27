// The axis budget of a series chart: which of its y axes are drawn, when there are more
// than the width can carry. Pure, and apart from the chart, so the rule is tested on
// numbers rather than on a jsdom that has no layout to measure.
//
// lenkbank's curve plot declares four visible axes — velocity, position and acceleration
// on the left, loads on the right — and every one reserves its band of ticks and title.
// At 1280 px that is a quarter of the card; at 390 px it is all of it, and the plot the
// axes are for is ten pixels wide. An axis over budget is drawn the way a `hide: true`
// one always was: it still scales its lines (and the zoom still refits it), but it draws
// no ticks, no title, and reserves no width.

/**
 * How many y axes a chart draws. A number caps the TOTAL; `{ left, right }` caps each
 * side (a side left out is not capped). Axes over the cap are hidden in declaration
 * order — the first of each side is the last to go, see {@link budgetedAxes}.
 */
export type SeriesChartAxisBudget = number | { left?: number; right?: number };

/** The part of an axis the budget reads. */
interface BudgetAxis {
  id: string;
  orientation?: "left" | "right";
  hide?: boolean;
  title?: string;
  width?: number;
}

/**
 * The narrowest the plot may get before the automatic budget steps in, in px.
 *
 * About a phone's plot with one axis a side (390 px viewport, card padding, two bands
 * of 48 + 16), where a curve's shape still reads. It is the point below which the chart
 * is already broken today — a plot the width of a thumb between four columns of numbers
 * — so the rule changes nothing that was working.
 */
export const MIN_PLOT_WIDTH = 160;

/** The budget the automatic rule applies: one axis a side. */
export const NARROW_AXIS_BUDGET: SeriesChartAxisBudget = { left: 1, right: 1 };

/** The plot's margin on a side no axis band covers — `SeriesPlot`'s own. */
const BARE_SIDE_MARGIN = 10;

const sideOf = (axis: BudgetAxis) => axis.orientation ?? "left";

/**
 * The ids of the VISIBLE axes a budget hides — axes already `hide: true` are neither
 * counted nor returned. Empty for no budget.
 *
 * Kept, in order of priority: the first visible axis of each side (in declaration order,
 * so the axis a caller lists first — the one the grid hangs its rules off — always
 * stays), then the rest in declaration order, until the cap. Per side, that is simply the
 * first `left` left-hand axes and the first `right` right-hand ones.
 */
export function budgetedAxes(
  axes: readonly BudgetAxis[],
  budget: SeriesChartAxisBudget | undefined,
): string[] {
  if (budget === undefined) return [];
  const visible = axes.filter((axis) => !axis.hide);
  if (typeof budget === "number") {
    const cap = Math.max(0, Math.floor(budget));
    const firsts = new Set<string>();
    const seen = new Set<string>();
    for (const axis of visible) {
      if (!seen.has(sideOf(axis))) firsts.add(axis.id);
      seen.add(sideOf(axis));
    }
    const priority = [
      ...visible.filter((axis) => firsts.has(axis.id)),
      ...visible.filter((axis) => !firsts.has(axis.id)),
    ];
    const kept = new Set(priority.slice(0, cap).map((axis) => axis.id));
    return visible.filter((axis) => !kept.has(axis.id)).map((axis) => axis.id);
  }
  const used = { left: 0, right: 0 };
  const out: string[] = [];
  for (const axis of visible) {
    const side = sideOf(axis);
    const cap = budget[side];
    if (cap !== undefined && used[side] >= Math.max(0, Math.floor(cap))) out.push(axis.id);
    else used[side] += 1;
  }
  return out;
}

/**
 * The automatic budget for a chart `width` px wide: {@link NARROW_AXIS_BUDGET} when the
 * visible axes' bands would leave the plot under {@link MIN_PLOT_WIDTH} AND some side
 * draws more than one axis — the only case one-a-side gives anything back. `undefined`
 * otherwise, and for a width that is not known (no layout, no `ResizeObserver`).
 *
 * Decided on the CHART's width and the axes as declared, never on the plot the budget
 * produced, so hiding an axis cannot widen the plot back over the line and bring it
 * back: the rule has no feedback to oscillate on.
 */
export function autoAxisBudget(
  axes: readonly BudgetAxis[],
  width: number | undefined,
  bandWidth: (axis: BudgetAxis) => number,
): SeriesChartAxisBudget | undefined {
  if (width === undefined || !(width > 0)) return undefined;
  const visible = axes.filter((axis) => !axis.hide);
  const left = visible.filter((axis) => sideOf(axis) === "left");
  const right = visible.filter((axis) => sideOf(axis) === "right");
  if (left.length <= 1 && right.length <= 1) return undefined;
  const bands = visible.reduce((sum, axis) => sum + bandWidth(axis), 0);
  const margins = (left.length ? 0 : BARE_SIDE_MARGIN) + (right.length ? 0 : BARE_SIDE_MARGIN);
  return width - bands - margins < MIN_PLOT_WIDTH ? NARROW_AXIS_BUDGET : undefined;
}

/**
 * The unit an axis' series say when the axis is not drawn: its `unit`, or else the
 * parenthesised tail of its title — "Load (N)" says "N", which is how the apps write
 * every axis title. `undefined` when neither says one.
 */
export function axisUnit(axis: { unit?: string; title?: string }): string | undefined {
  if (axis.unit !== undefined) return axis.unit || undefined;
  const tail = /\(([^()]+)\)\s*$/.exec(axis.title ?? "");
  return tail?.[1].trim() || undefined;
}
