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
