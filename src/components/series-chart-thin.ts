// The row budget of a series chart: which rows of a long table reach recharts, when there
// are more than it should draw (`SeriesChartProps.maxRows`). Pure, and apart from the
// chart, so the rule is tested on numbers, as the axis budget is (`series-chart-budget.ts`).
//
// Kurvenschmiede asked for it (KS U2, from its F88; round 0.34 C10). A chart cannot draw
// two hundred thousand points — the SVG would hold more path nodes than the plot has
// pixels — so a long table is thinned before it reaches recharts, and HOW decides what
// the reader sees. Keeping every `ceil(n / 2000)`th sample, which the app did first,
// ALIASES: the 160 Hz top of an acoustic sweep sampled at 1 kHz was kept at about 167 Hz
// and drawn as a slow 6.7 Hz wave at full amplitude, a shape the data does not have,
// drawn with complete confidence. A stride also steps over a spike one sample wide
// whenever it falls between two kept rows — the sample a reader of a jerk channel is
// looking for. So the envelope is the only way the chart thins; there is no stride
// option beside it, because a stride is the one decimation that lies.
//
// **What is kept.** The table is cut into buckets, in order, and from each bucket the row
// where each drawn series is lowest and the row where it is highest — so every line
// still reaches every extreme the table reaches, in the bucket it reaches it in. A tone
// faster than the buckets draws as the band it fills, not as a wave it is not. Each
// series' first and last sample are kept too (a line starts where its data starts, and
// arrives where it arrives), and so are the table's first and last row. The kept rows
// are returned in their order, so a line is still the path in time — which matters where
// the abscissa doubles back (a hysteresis loop drawn against position), and there the
// abscissa is enveloped as well, so the path's turning points stay.
//
// Nothing is interpolated, averaged or smoothed: every point drawn is a row the caller
// handed in.

/** A sample, or a hole: anything that is not a finite number draws nothing. */
const sampled = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** A table the rule reads: rows, and a cell by key. The chart's rows, or any others. */
type ThinRow = Readonly<Record<string, unknown>>;

/**
 * The fewest rows a budget can be met with for `channels` series: the table's first and
 * last row, each series' first and last sample, and one bucket's low and high of each.
 * A smaller `maxRows` is raised to this — an envelope cannot be drawn with less.
 */
export function minimumRows(channels: number): number {
  const c = Math.max(1, channels);
  return 2 + 2 * c + 2 * c;
}

/**
 * The indices of `rows[from, to)` to draw `keys` from, in order — at most `maxRows` of
 * them (but see {@link minimumRows}). A range no longer than `maxRows` comes back whole.
 *
 * Several series share one set of rows (that is what a recharts row is), so the buckets
 * get fewer as the series get more: two rows per series per bucket, plus the first and
 * last ones, and the total stays within the budget, which is what the budget is for.
 * With no key to read an envelope off, each bucket keeps its first row.
 */
export function envelopeIndices(
  rows: readonly ThinRow[],
  keys: readonly string[],
  maxRows: number,
  from = 0,
  to = rows.length,
): number[] {
  const length = Math.max(0, to - from);
  const budget = Math.max(Math.floor(maxRows), minimumRows(keys.length));
  if (length <= budget) return Array.from({ length }, (_, offset) => from + offset);

  const keep = new Uint8Array(length);
  keep[0] = 1;
  keep[length - 1] = 1;
  for (const key of keys) {
    // Where each line starts and stops, which for a series with holes at either end is
    // not the table's first and last row.
    let first = 0;
    while (first < length && !sampled(rows[from + first][key])) first += 1;
    let last = length - 1;
    while (last > first && !sampled(rows[from + last][key])) last -= 1;
    if (first < length) {
      keep[first] = 1;
      keep[last] = 1;
    }
  }

  // What is left after the first and last rows, two per series per bucket.
  const series = Math.max(1, keys.length);
  const buckets = Math.max(1, Math.floor((budget - 2 - 2 * series) / (2 * series)));
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor((bucket * length) / buckets);
    const end = Math.floor(((bucket + 1) * length) / buckets);
    if (keys.length === 0) {
      keep[start] = 1;
      continue;
    }
    for (const key of keys) {
      let low = -1;
      let high = -1;
      let lowest = Infinity;
      let highest = -Infinity;
      for (let offset = start; offset < end; offset += 1) {
        const value = rows[from + offset][key];
        if (!sampled(value)) continue;
        if (value < lowest) {
          lowest = value;
          low = offset;
        }
        if (value > highest) {
          highest = value;
          high = offset;
        }
      }
      if (low >= 0) keep[low] = 1;
      if (high >= 0) keep[high] = 1;
    }
  }

  const indices: number[] = [];
  for (let offset = 0; offset < length; offset += 1) if (keep[offset]) indices.push(from + offset);
  return indices;
}

/** Whether `key` never decreases down the rows — a time axis, a sweep. Holes are skipped. */
export function ascending(rows: readonly ThinRow[], key: string): boolean {
  let previous = -Infinity;
  for (const row of rows) {
    const value = row[key];
    if (!sampled(value)) continue;
    if (value < previous) return false;
    previous = value;
  }
  return true;
}

/**
 * The rows a chart draws under a row budget, as indices into `rows` — or `undefined` when
 * it draws them all (no more rows than the budget, or no budget), so the caller can hand
 * recharts its own array untouched.
 *
 * `xKey` is the abscissa, as plotted. Where it never decreases and the chart is zoomed to
 * `window`, only the rows inside the window are thinned — with one more on each side, so
 * the lines run to the plot's edges — and a zoom far enough in draws every sample there:
 * the budget is spent on what is on show. Where the abscissa doubles back, the window
 * does not cut the table into one stretch, so the whole table is thinned, and the
 * abscissa is one of the enveloped keys: its turning points are part of the shape.
 */
export function thinnedRows(
  rows: readonly ThinRow[],
  xKey: string,
  keys: readonly string[],
  maxRows: number | undefined,
  window?: readonly [number, number],
): number[] | undefined {
  if (maxRows === undefined || !(maxRows > 0) || rows.length <= maxRows) return undefined;
  if (!ascending(rows, xKey)) {
    const indices = envelopeIndices(rows, [...keys, xKey], maxRows);
    return indices.length === rows.length ? undefined : indices;
  }
  let from = 0;
  let to = rows.length;
  if (window) {
    // The first row at or past the window's start, less one; the last at or before its
    // end, plus one. Holes in the abscissa are neither.
    let first = -1;
    let last = -1;
    rows.forEach((row, index) => {
      const at = row[xKey];
      if (!sampled(at)) return;
      if (first === -1 && at >= window[0]) first = index;
      if (at <= window[1]) last = index;
    });
    if (first !== -1 && last >= first) {
      from = Math.max(0, first - 1);
      to = Math.min(rows.length, last + 2);
    } else {
      // A window between two samples: the two rows either side of it, so the line is
      // still drawn across.
      const after = first === -1 ? rows.length : first;
      from = Math.max(0, after - 1);
      to = Math.min(rows.length, after + 1);
    }
  }
  const indices = envelopeIndices(rows, keys, maxRows, from, to);
  return indices.length === rows.length ? undefined : indices;
}
