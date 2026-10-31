/**
 * The bare ISO calendar day, `"YYYY-MM-DD"` — no time, no zone: the day it names in every
 * zone. `toDate` and `formatDate` (lib/format), the kit's day ladder (`useDayFormatter`,
 * lib/day-format) and the preference's renderers (lib/date-format) each kept a copy of this
 * pattern (0.52 code review, lib/day-format.ts). Were one to learn a new shape (say
 * `YYYY-MM-DDT00:00`) alone, the ladder would ask the provider for a different day than the
 * kit prints. One rule.
 *
 * @internal Not part of the barrel: `lib/format` is re-exported whole, so it lives apart.
 */
export function isBareIsoDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
