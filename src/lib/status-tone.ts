/**
 * What a status means, in five domain-free words, and the tone that says it (0.49 KIT-8).
 *
 * Every app paints its statuses by hand: kastlan's ~15 enums each carry a Chip tone
 * (`shared/enums/enum-meta.ts`), keksdose's job and transaction states theirs, and the
 * same meaning drifted into different colours — "unpaid" amber in one table, brand in
 * the next. The kind is the decision ("does the reader have to act?"), the tone only
 * its colour, so an app maps each of its states to a kind once and the colours agree
 * everywhere:
 *
 * | kind | tone | for |
 * |---|---|---|
 * | `good` | `success` | done, settled, healthy: nothing to do (Paid, Verified) |
 * | `attention` | `warning` | needs a look or an action soon, nothing broken yet (Unpaid, Due soon) |
 * | `problem` | `danger` | something is wrong or late and needs action now (Overdue, Failed) |
 * | `active` | `info` | in progress or current, neither good nor bad (Running, Sent) |
 * | `inactive` | `neutral` | over, paused or not started: out of the way (Draft, Archived) |
 *
 * `brand` is not a status tone: it is the app's own colour, and a status in it reads as
 * "this is the app" rather than as a state. Money (`income` / `expense`) is not one
 * either: it says which way an amount flows, not how a record stands.
 */
export type StatusKind = "good" | "attention" | "problem" | "active" | "inactive";

/** The tones a {@link StatusKind} maps to — a subset of `ChipTone` and `StatusDotTone`. */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

/** The five kinds, in the order the table above lists them. */
export const STATUS_KINDS: readonly StatusKind[] = ["good", "attention", "problem", "active", "inactive"];

const TONES: Readonly<Record<StatusKind, StatusTone>> = {
  good: "success",
  attention: "warning",
  problem: "danger",
  active: "info",
  inactive: "neutral",
};

/** The tone for a status kind: good → success, attention → warning, problem → danger,
 *  active → info, inactive → neutral. See {@link StatusKind}. */
export function statusTone(kind: StatusKind): StatusTone {
  return TONES[kind];
}
