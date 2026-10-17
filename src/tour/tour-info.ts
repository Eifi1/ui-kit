import type { ReactNode } from "react";

/**
 * The tours an app offers, as data (docs/tours-harmonization.md §2.2, §6) — one list for
 * the tours page (`TourCatalogue`) and the top bar's `TourMenu`. The step lists stay the
 * app's own: the kit's engine runs them (`useTour().start`), and this describes them.
 *
 * The kit takes finished strings, never i18n keys (§6.3, kk K-1). Role- and data-gated
 * tours are filtered by the app before they come in; every count counts what it is given
 * (§6.3, kk K-2, ka F6).
 */
export interface TourInfo {
  /** Stable id: what `onLaunch` gets, the progress key, `?tour=`. */
  id: string;
  title: string;
  /** The one-liner under the title (and what the menu could carry). */
  description?: string;
  /** The longer account: which screens it visits, what it explains. Shown from `sm`. */
  about?: string;
  /** The tour's icon, drawn at 16px in the brand colour. */
  icon?: ReactNode;
  /** The id of its `TourGroup`: the section it is listed under. */
  group: string;
  /** The page the tour starts on — `TourMenu`'s "On this page". */
  route?: string;
  /** The day it shipped (ISO `YYYY-MM-DD`): what makes it NEW (§6.4). Without it, never NEW. */
  since?: string;
  /** The last update or fix (§8): a completion from before `updated.date` no longer counts. */
  updated?: TourUpdate;
  /** How many steps it has. Left out, the card shows no step count. */
  steps?: number;
  /** The points it awards (§6.1). Left out, the card draws no chip (never "0 points"). */
  points?: number;
  /** About how long it takes, in minutes — worded by the kit ("About 3 min", §6.5). */
  duration?: number;
  /** A chip beside NEW in the app's words — kastlan's practice mode (§6.5, ka F1). */
  badge?: ReactNode;
}

/** A tour's last update or fix (§8). One at a time: a later update replaces it. */
export interface TourUpdate {
  /** The day it shipped (ISO `YYYY-MM-DD`). */
  date: string;
  /** Why, in a short sentence in the app's words: "The import screen moved; the tour follows it now." */
  reason: string;
}

/** A section of the tours page, in the app's words and order (§2.3). An empty one is hidden. */
export interface TourGroup {
  id: string;
  title: string;
  /** The help line under the heading. */
  help?: string;
  /** The heading's icon, drawn at 16px. */
  icon?: ReactNode;
}

/**
 * Which tours are completed and when: tour id → the ISO timestamp of the completion, or
 * `null` for one recorded without a date (kastlan's old id list, §6.2). A tour that is
 * not a key is untaken.
 */
export type TourCompletions = Readonly<Record<string, string | null>>;

/** The calendar day of an ISO date or timestamp — `"2026-10-17T08:00:00Z"` → `"2026-10-17"`. */
const dayOf = (iso: string) => iso.slice(0, 10);

/**
 * Is this tour NEW for the person looking at it (§2.4, §6.4)? It shipped AFTER the
 * account was opened — compared by calendar day, so a tour shipped on the joining day was
 * already there to be found — and it is not taken yet. No `since`, or no `joined` date,
 * is never NEW: a pill that appears late is better than one that flickers, and a first
 * tour shipped with a feature should not flash NEW at every older account (KS, ka F7).
 *
 * `completed` is whether the tour was EVER completed — a tour reset by an update (§8) is
 * not NEW again; it carries the "Updated" pill instead, and `since` stays its first ship
 * date.
 */
export function isTourNew({
  since,
  joined,
  completed,
}: {
  since?: string | null;
  /** The account's `created_at` (a date or a timestamp); unknown → never NEW. */
  joined?: string | null;
  completed?: boolean;
}): boolean {
  return !!since && !!joined && dayOf(since) > dayOf(joined) && !completed;
}

/**
 * Was this completion reset by an update (§8)? True when the tour carries `updated` and
 * the completion is from an EARLIER calendar day — or has no date at all, which predates
 * any update. A tour never completed (`completedAt` undefined) is never reset: for that
 * person there is nothing to reset. Nothing is deleted; the dates are compared.
 */
export function isTourReset(
  tour: { updated?: TourUpdate | null },
  completedAt: string | null | undefined,
): boolean {
  if (completedAt === undefined || !tour.updated) return false;
  return completedAt === null || dayOf(completedAt) < dayOf(tour.updated.date);
}

/** Does this completion count — completed, and not reset by a later update (§8)? */
export function isTourDone(tour: { updated?: TourUpdate | null }, completedAt: string | null | undefined): boolean {
  return completedAt !== undefined && !isTourReset(tour, completedAt);
}
