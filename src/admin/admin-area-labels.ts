import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import type { SettingsGroupLabels } from "../settings/settings-labels";

/**
 * The `adminArea` namespace (0.42, docs/admin-harmonization.md §3.1): the kit's words of
 * the admin area every app shares — the account menu's "Administration" row, the 403
 * page, the shared sections' names and help lines, the overview's tiles and the Tools
 * list. A module of words with no component code, like every `*-labels.ts` (0.34, KS U8).
 * An app's own sections and tiles bring their own words.
 */

/** The sections every app's admin area shares, in the template's order (§2.3). */
export type AdminSharedSection = "overview" | "users" | "invitations" | "billing" | "activity";

/** The overview's shared tiles (§2.4, §6.1). */
export interface AdminTileLabels {
  /** `feedback_waiting`: OPEN reports, crash reports included (§6.1). */
  feedbackWaiting: string;
  /** `deletion_requests`. */
  deletionRequests: string;
  /** `invitations_pending`. */
  invitationsPending: string;
  /** `users_total`. */
  users: string;
  /** `users_new_7d`, the line under the users tile. */
  usersNew: (count: number) => string;
  /** 0.46 (Kurvenschmiede 1, admin §9.5): server-kit's `awaiting_verdict` as an `extra`
   *  tile — answered reports that wait on a verdict (IN_EVALUATION, NEEDS_LIVE_TEST). */
  awaitingVerdict: string;
  /** Its line under the count. */
  awaitingVerdictHint: string;
  /** 0.46: server-kit's `released_for_work` — the reports released for the work queue. */
  releasedForWork: string;
  /** Its line under the count. */
  releasedForWorkHint: string;
}

export interface AdminAreaLabels {
  /** "Administration": the account menu's row, and the admin page's heading. */
  title: string;
  /** The row's waiting count, for a reader ("Administration, 3 waiting"); the eye sees
   *  the number in the badge. */
  waiting: (count: number) => string;
  /**
   * 0.45 (admin §9.3.4): a button's whole name with its count — "Platform, 2 waiting" —
   * for an `IconButton` whose `badge` is an `AdminWaitingBadge`: the badge is decorative
   * there, so the name carries the count. `label` is the button's own name.
   */
  waitingLabel: (label: string, count: number) => string;
  /** The 403 page's heading (§2.2 decision 8). */
  forbiddenTitle: string;
  /**
   * Under it. Says only that THIS area is closed to the account — never that the person
   * administers nothing anywhere (§6.7: a kastlan superuser who isn't ADMIN in the acting
   * company gets this page).
   */
  forbiddenBody: (appName: string) => string;
  /** The button back to the app's start, unless the app names its own (`homeLabel`). */
  forbiddenHome: string;
  /** A reviewer's second way out, to the translations review. */
  forbiddenReviewer: string;
  /** The shared sections' names and help lines (§2.3 decision 11). */
  sections: Record<AdminSharedSection, SettingsGroupLabels>;
  /** The overview's tiles. */
  tiles: AdminTileLabels;
  /** 0.43: `AdminOverview`'s `error` — the counts could not be loaded. */
  overviewError: string;
  /** 0.43: its button, which calls `onRetry`. */
  retry: string;
  /** The Tools list's heading and name (§2.5 decision 16). */
  tools: string;
}

export const DEFAULT_ADMIN_AREA_LABELS: AdminAreaLabels = {
  title: "Administration",
  waiting: (count) => `${count} waiting`,
  waitingLabel: (label, count) => `${label}, ${count} waiting`,
  forbiddenTitle: "Only for administrators",
  forbiddenBody: (appName) => `This is where administrators run ${appName}. Your account cannot open this page.`,
  forbiddenHome: "Go to the start page",
  forbiddenReviewer: "Review translations",
  sections: {
    overview: { title: "Overview", help: "What is waiting, at a glance." },
    users: { title: "Users", help: "Who has an account, and what each may do." },
    invitations: { title: "Invitations", help: "Invite people by e-mail in their language; resend or revoke what’s still open." },
    billing: { title: "Billing", help: "The plan, the payment and the invoices." },
    activity: { title: "Activity", help: "What the admins did, newest first." },
  },
  tiles: {
    feedbackWaiting: "To triage",
    deletionRequests: "Deletion requests",
    invitationsPending: "Pending invitations",
    users: "Users",
    usersNew: (count) => `${count} new in 7 days`,
    awaitingVerdict: "Awaiting a verdict",
    awaitingVerdictHint: "Answered, and waiting for you or the reporter to confirm the fix",
    releasedForWork: "Released for work",
    releasedForWorkHint: "Ready, rework requested or in progress",
  },
  overviewError: "The overview couldn’t be loaded.",
  retry: "Try again",
  tools: "Tools",
};

/**
 * The `adminArea` namespace, resolved — English, then the provider, then `labels`. What
 * an app reads to hand {@link adminSections} its words from inside a component.
 */
export function useAdminAreaLabels(labels?: LabelOverride<AdminAreaLabels>): AdminAreaLabels {
  return useKitLabels("adminArea", DEFAULT_ADMIN_AREA_LABELS, labels);
}
