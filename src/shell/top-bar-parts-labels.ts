import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";

/**
 * The `topBarParts` namespace (0.42, docs/top-bar-harmonization.md §3.1): the words of the
 * top bar's shared parts — `TourMenu`, `SyncStatusIndicator` and `DevSwitchers`. A module
 * of words with no component code, like every `*-labels.ts` (0.34, KS U8). The language
 * sub-list (`AccountMenuLanguage`) names itself with `topBar.language`, and the dev role
 * switcher's name and tooltip are `topBar.switchRole` / `topBar.role`, as `RoleSwitcher`'s.
 */

/** `TourMenu`'s words (§2.4). */
export interface TourMenuLabels {
  /** The compass's name, and the menu's. */
  menu: string;
  /** The NEW dot on the compass, for a reader: it joins the trigger's name. */
  newDot: string;
  /** The heading over the tours that start on the open page. */
  thisPage: string;
  /** The heading over the untaken new tours. */
  newTours: string;
  /** The last row, the way to the app's tours page (only with `href`). */
  allTours: string;
  /** The chip on a new tour's row. */
  badgeNew: string;
  /** What the ✓ on a taken tour's row says to a reader. */
  completed: string;
  /** The chip on a tour reset by an update (0.43, docs/tours-harmonization.md §8). */
  badgeUpdated: string;
  /** The dot on the compass while only updated tours light it, for a reader. */
  updatedDot: string;
  /** The heading over the untaken new tours when updated ones are among them. */
  newAndUpdated: string;
}

/** `SyncStatusIndicator`'s words (§2.6). The "waiting for a plan" state is
 *  `billing.waitingChanges`, the kit's words for it since billing §12.5. */
export interface SyncStatusLabels {
  /** Writes this device cannot send (keksdose: no key for the budget). Ranked first. */
  blocked: (count: number) => string;
  offline: string;
  /** The server refused the last round. */
  refused: string;
  syncing: string;
  pending: (count: number) => string;
  /** Settled, with the time of the last good round (already formatted). */
  syncedAt: (time: string) => string;
  /** Settled, before the first round. */
  idle: string;
  /** Joined to the state when a tap syncs: what the tap does. */
  syncHint: string;
  /** Joined to the state while offline, when a tap can do nothing. */
  offlineHint: string;
  /** The state and what a tap does, as one tooltip: "Offline — nothing to sync…". */
  withHint: (state: string, hint: string) => string;
  /** The state with the app's `scope` words before it: "Handovers on this device: …". */
  scoped: (scope: string, state: string) => string;
  /** The short words beside the cloud (`showLabel`): offline. */
  offlineShort: string;
  /** The short words while syncing. */
  syncingShort: string;
  /** The short words while changes wait (pending, held for a plan, or blocked). */
  waitingShort: (count: number) => string;
  /** The short words after a refused round. */
  refusedShort: string;
  /** Offline in an online-only app (`storage="none"`): nothing is kept on the device. */
  offlineUnsaved: string;
  /** A round under way in an online-only app — it saves, it doesn't sync. Also its short
   *  words beside the cloud. */
  saving: string;
}

/** `DevSwitchers`' words (§2.7, §6.2, §6.3). */
export interface DevSwitchersLabels {
  /** The heading of the role menu. */
  roleHeading: string;
  /** The plan switcher's name. */
  switchPlan: string;
  /** The plan switcher's tooltip, given the active plan. */
  plan: (value: string) => string;
  /** The heading of the plan menu. */
  planHeading: string;
  /** The row back to the role the session started with. */
  backTo: (role: string) => string;
  /** The plan menu's note while billing is off locally. */
  billingOff: string;
}

export interface TopBarPartsLabels {
  tours: TourMenuLabels;
  sync: SyncStatusLabels;
  dev: DevSwitchersLabels;
}

export const DEFAULT_TOP_BAR_PARTS_LABELS: TopBarPartsLabels = {
  tours: {
    menu: "Guided tours",
    newDot: "New tours",
    thisPage: "On this page",
    newTours: "New tours",
    allTours: "All tours…",
    badgeNew: "New",
    completed: "Completed",
    badgeUpdated: "Updated",
    updatedDot: "Updated tours",
    newAndUpdated: "New and updated",
  },
  sync: {
    blocked: (count) =>
      count === 1
        ? "1 change cannot be sent from this device"
        : `${count} changes cannot be sent from this device`,
    offline: "Offline — changes are saved on this device and will sync when you reconnect",
    refused: "The server refused the last sync",
    syncing: "Syncing…",
    pending: (count) => (count === 1 ? "1 change waiting to sync" : `${count} changes waiting to sync`),
    syncedAt: (time) => `Synced at ${time}`,
    idle: "Up to date",
    syncHint: "Tap to sync now",
    offlineHint: "nothing to sync while offline",
    withHint: (state, hint) => `${state} — ${hint}`,
    scoped: (scope, state) => `${scope}: ${state}`,
    offlineShort: "Offline",
    syncingShort: "Syncing…",
    waitingShort: (count) => `${count} waiting`,
    refusedShort: "Not synced",
    offlineUnsaved: "Offline — changes can't be saved until you reconnect",
    saving: "Saving…",
  },
  dev: {
    roleHeading: "Dev · role",
    switchPlan: "Switch plan",
    plan: (value) => `Plan: ${value}`,
    planHeading: "Dev · plan",
    backTo: (role) => `Back to ${role}`,
    billingOff: "Billing is off locally: plans change nothing",
  },
};

/** The `topBarParts` namespace, resolved — English, then the provider, then `labels`. */
export function useTopBarPartsLabels(labels?: LabelOverride<TopBarPartsLabels>): TopBarPartsLabels {
  return useKitLabels("topBarParts", DEFAULT_TOP_BAR_PARTS_LABELS, labels);
}
