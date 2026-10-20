import type { ReactNode } from "react";

/**
 * The shapes the notification cards share (docs/notifications-harmonization.md §3.2,
 * §3.5, §4.2): the server's `GET /notifications/settings` answer, the parts of its
 * `PATCH` the cards send, one push device, and the app's words for its types.
 *
 * Types only — the kit keeps no list of notification types and no defaults (§2.1): the
 * server's registry is the one list, and the cards draw what it answers.
 */

/** The digest's cadence, one for the account (§2.5): Monday, or the 1st, in its zone. */
export type DigestCadence = "weekly" | "monthly";

/**
 * One type's switches in the `GET` (§3.2; §10.2: one per channel). `null` where the type
 * does not offer that channel: `email` for a type with no mail, `app` in an app with no
 * "in the app" channel (Kurvenschmiede: `{app: null, push: null, email: true}`), `push` in
 * an app with no push (server-kit `NotificationTypes(..., push_channel=False)`: kastlan,
 * KS). An unset switch already reads as its default — the server fills it in.
 */
export interface NotificationSwitches {
  app: boolean | null;
  /** 0.46 (§10.2): push, independent of `app`. Left out by a server before
   *  server-kit 0.16, which reads as `null` (not offered). */
  push?: boolean | null;
  email: boolean | null;
}

/** A channel a type may offer (§10.2), in the order the types card draws them. */
export type NotificationChannel = "app" | "push" | "email";

/** The `GET`'s `types`: every type the account can receive, in the registry's order. */
export type NotificationTypesValue = Readonly<Record<string, NotificationSwitches>>;

/**
 * The app's words for one of its types — where an app TYPES its ids, so its own maps
 * (keksdose's inbox icons) are keyed on the same list (§5.1). The kit draws the type
 * only when the server answered it.
 */
export interface NotificationTypeEntry<Id extends string = string> {
  id: Id;
  /** The switch's label: what the person hears about. */
  label: string;
  /** The line under it, attached to the switch. */
  description?: ReactNode;
}

/** A heading over some of the types, in the app's words (keksdose's "Budget", "Scans &
 *  sharing", "Summaries & news"). */
export interface NotificationTypeGroup<Id extends string = string> {
  /** A stable key for the group. */
  id: string;
  label: ReactNode;
  /** The group's types, in the order they are drawn. */
  types: readonly Id[];
}

/**
 * The parts of `PATCH /notifications/settings` (§3.2) the cards send. Omitted keeps; a
 * type's `null` puts its switches back to their defaults; `quiet_hours_*: null`
 * clears a time. One switch per call from the types card (`{types: {digest: {app:
 * true}}}`), or `{digest_cadence}`; quiet hours send a time. No zone: it is the
 * account's, automatic only (§10.3, amended 2026-10-20).
 */
export interface NotificationSettingsPatch<Id extends string = string> {
  types?: Partial<Record<Id, { app?: boolean; push?: boolean; email?: boolean } | null>>;
  digest_cadence?: DigestCadence;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  /** @deprecated 0.46 — the zone is the account's, automatic only (§10.3), and server-kit 0.16 refuses it here;
   *  removed in 0.47. No kit card sends it. */
  timezone?: string;
}

/** One registered push device, as `GET /notifications/devices` lists it (§3.5), oldest
 *  first. The owner gets the whole endpoint, which marks "this device". */
export interface PushDeviceItem<Id extends string | number = string> {
  id: Id;
  endpoint: string;
  /** The browser's user agent at registration; `null` when it sent none. */
  user_agent: string | null;
  /** ISO date-time. */
  created_at: string;
  /** ISO date-time of the last delivery the push service accepted, or `null`. */
  last_success_at: string | null;
  /** Failed deliveries in a row; the server removes the device at 10. */
  failure_count: number;
  /** 0.46 (§10.2): the type ids this device mutes — a device can mute types, never add
   *  them. Left out by a server before server-kit 0.16 (none muted). */
  muted_types?: string[];
}
