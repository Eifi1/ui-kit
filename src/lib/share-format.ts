/**
 * How a chart says a share of its whole — PieChart's slices and centre, Treemap's tiles
 * and groups. Internal, not exported from the barrel.
 *
 * Each chart held a copy of the same two `Intl` formats and the same switch between them
 * (0.52 code review of treemap.tsx, finding 9); one copy is the rule both say.
 */

/**
 * A formatter for shares (0–1) in `locale`, as a percent: one decimal under 10 %, where
 * rounding to whole percents starts to lie — a slice of 0.4 % said as "0%" says it is not
 * there — and whole percents above. Make it once per locale (it builds two `Intl` formats).
 */
export function shareFormat(locale: string | undefined): (share: number) => string {
  const whole = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const fine = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  return (share) => (share < 0.1 ? fine : whole).format(share);
}
