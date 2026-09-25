// Round tick values for `SeriesChart` — internal, not re-exported by `@eifi1/ui-kit/chart`.
//
// Handed an explicit numeric domain, recharts divides it into equal parts and prints
// wherever those land: a fitted band of [-11, 811] comes out as -11, 189, 389 … and a
// padded [89, 1011] as 89, 289, 489 — numbers nobody can put a ruler against. These
// are the ticks a person would draw instead: every multiple of a 1, 2 or 5 × 10^n step
// that lies INSIDE the domain. The domain itself is left alone, so the 4 % of air the
// fit leaves and a zoom window's exact edges both survive; the frame simply does not
// get a number of its own.

/** Roughly how many ticks to aim for. The 1/2/5 ladder lands anywhere from about half
 *  to about twice this, which is the price of every tick being a round number. */
const TARGET_TICKS = 5;

/** The round step closest to `span / target`: 1, 2 or 5 times a power of ten. */
export function niceStep(span: number, target: number = TARGET_TICKS): number {
  const rough = span / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / magnitude;
  const factor = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return factor * magnitude;
}

/**
 * The round ticks inside `[low, high]`, ascending — or `undefined` when there is no
 * span to divide (no domain, a zero-height one, anything non-finite), which leaves the
 * choice to recharts.
 *
 * Each tick is computed as `k × step` and then rounded to the step's own decimals:
 * accumulating `+= 0.1` would print 0.30000000000000004 on the third tick.
 */
export function niceTicks(
  domain: readonly [number, number] | undefined,
  target: number = TARGET_TICKS,
): number[] | undefined {
  if (!domain) return undefined;
  const [low, high] = domain;
  if (!Number.isFinite(low) || !Number.isFinite(high) || !(high > low)) return undefined;
  const step = niceStep(high - low, target);
  if (!(step > 0) || !Number.isFinite(step)) return undefined;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const ticks: number[] = [];
  // Half a step's tolerance per end would admit ticks outside the frame; a millionth
  // of one only forgives the float error in `low / step`.
  const first = Math.ceil(low / step - 1e-6);
  const last = Math.floor(high / step + 1e-6);
  for (let k = first; k <= last; k++) {
    // `+ 0` turns the -0 that `Number("-0.00")` gives back into a plain 0.
    ticks.push(Number((k * step).toFixed(decimals)) + 0);
  }
  return ticks.length ? ticks : undefined;
}

/**
 * {@link niceTicks} on whole numbers only: the step never drops below 1, so a short
 * index series (a domain of [-0.2, 4.2]) is ticked 0 1 2 3 4 instead of every half.
 * `undefined` when the window holds no whole number at all, so the caller can fall
 * back to the fractional ticks of a deep zoom rather than show none.
 */
export function integerTicks(
  domain: readonly [number, number] | undefined,
  target: number = TARGET_TICKS,
): number[] | undefined {
  if (!domain) return undefined;
  const [low, high] = domain;
  if (!Number.isFinite(low) || !Number.isFinite(high) || !(high >= low)) return undefined;
  const step = high > low ? Math.max(1, niceStep(high - low, target)) : 1;
  const ticks: number[] = [];
  const first = Math.ceil(low / step - 1e-6);
  const last = Math.floor(high / step + 1e-6);
  for (let k = first; k <= last; k++) ticks.push(k * step + 0);
  return ticks.length ? ticks : undefined;
}

/**
 * The slots of a CATEGORY axis that lie inside a window over their positions.
 *
 * `SeriesChart` draws a category axis on the slot INDEX (see `x.type: "category"`), so a
 * zoom window is a range of fractional positions — [2.6, 8.3] after a drag across the
 * third to ninth month. A tick belongs on every whole slot inside it, and on nothing in
 * between: there is no month 2.5. Recharts' `minTickGap` thins them where they crowd.
 */
export function categoryTicks(
  domain: readonly [number, number] | undefined,
  count: number,
): number[] | undefined {
  if (!domain || !(count > 0)) return undefined;
  const first = Math.max(0, Math.ceil(domain[0] - 1e-6));
  const last = Math.min(count - 1, Math.floor(domain[1] + 1e-6));
  const ticks: number[] = [];
  for (let slot = first; slot <= last; slot++) ticks.push(slot);
  return ticks.length ? ticks : undefined;
}

/** What one tick of a time axis stands for, which is also how its label is written. */
export type TimeTickUnit = "hour" | "day" | "month" | "year";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * The calendar steps a time axis may tick in, with their rough length for choosing.
 * Months and years are stepped with `Date` setters, not by adding their "length":
 * thirty days from the 1st of February is the 3rd of March, and a tick that promises a
 * month start and prints the 3rd is the ruler lying.
 */
const TIME_STEPS: readonly { unit: TimeTickUnit; n: number; ms: number }[] = [
  { unit: "hour", n: 1, ms: HOUR },
  { unit: "hour", n: 3, ms: 3 * HOUR },
  { unit: "hour", n: 6, ms: 6 * HOUR },
  { unit: "hour", n: 12, ms: 12 * HOUR },
  { unit: "day", n: 1, ms: DAY },
  { unit: "day", n: 2, ms: 2 * DAY },
  { unit: "day", n: 7, ms: 7 * DAY },
  { unit: "month", n: 1, ms: 30.44 * DAY },
  { unit: "month", n: 2, ms: 60.88 * DAY },
  { unit: "month", n: 3, ms: 91.31 * DAY },
  { unit: "month", n: 6, ms: 182.62 * DAY },
];

/**
 * Calendar ticks inside a window of epoch milliseconds — midnights, Mondays, month and
 * quarter starts, new years, in LOCAL time — and the unit they are in, so the label can
 * say as much as the tick means ("Mar 26" for a month start, "14 Mar" for a day).
 *
 * The time counterpart of {@link niceTicks}: a 1/2/5 ladder over raw milliseconds lands
 * on 5 × 10⁹ ms, every 58 days, at whatever hour that happens to be. keksdose's price
 * history and cash buffer each thinned their own ticks by hand for exactly this reason.
 */
export function timeTicksWithUnit(
  domain: readonly [number, number] | undefined,
  target: number = TARGET_TICKS,
): { ticks: number[]; unit: TimeTickUnit } | undefined {
  if (!domain) return undefined;
  const [low, high] = domain;
  if (!Number.isFinite(low) || !Number.isFinite(high) || !(high > low)) return undefined;
  const rough = (high - low) / Math.max(1, target);
  let unit: TimeTickUnit = "year";
  let n = 1;
  let best = Infinity;
  for (const step of TIME_STEPS) {
    const miss = Math.abs(Math.log(step.ms / rough));
    if (miss < best) {
      best = miss;
      unit = step.unit;
      n = step.n;
    }
  }
  // The year ladder competes on the same terms as the table: one year is 365.25 days.
  const yearN = Math.max(1, Math.round(niceStep((high - low) / (365.25 * DAY), target)));
  if (Math.abs(Math.log((yearN * 365.25 * DAY) / rough)) < best) {
    unit = "year";
    n = yearN;
  }

  const start = new Date(low);
  start.setMinutes(0, 0, 0);
  if (unit !== "hour") start.setHours(0);
  if (unit === "month" || unit === "year") start.setDate(1);
  if (unit === "year") start.setMonth(0);
  // Onto the step's own grid: hours of the day, Mondays, month indices, years — so a
  // zoom window starting on a Wednesday still ticks on Mondays.
  if (unit === "hour") start.setHours(start.getHours() - (start.getHours() % n));
  if (unit === "day" && n === 7) start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (unit === "month") start.setMonth(start.getMonth() - (start.getMonth() % n));
  if (unit === "year") start.setFullYear(start.getFullYear() - (start.getFullYear() % n));

  const ticks: number[] = [];
  const at = new Date(start);
  // Bounded, so a window of a million years cannot hang the render.
  for (let guard = 0; guard < 1000 && at.getTime() <= high; guard++) {
    if (at.getTime() >= low) ticks.push(at.getTime());
    if (unit === "hour") at.setHours(at.getHours() + n);
    else if (unit === "day") at.setDate(at.getDate() + n);
    else if (unit === "month") at.setMonth(at.getMonth() + n);
    else at.setFullYear(at.getFullYear() + n);
  }
  return ticks.length ? { ticks, unit } : undefined;
}

/** {@link timeTicksWithUnit}, ticks only. */
export function timeTicks(
  domain: readonly [number, number] | undefined,
  target: number = TARGET_TICKS,
): number[] | undefined {
  return timeTicksWithUnit(domain, target)?.ticks;
}
