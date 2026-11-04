// The English words of ./held-changes-banner, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component (0.34, KS U8).
// keksdose's reviewed words (sync.held_*, sync.discard_held_*, sync.switch_back_held) are
// the canon, without its budgets: the kit cannot know why a change waits, only that it does.

/**
 * `HeldChangesBanner`'s words — the `heldChanges` namespace of `<UiKitProvider labels>`
 * (0.55, docs/top-bar-harmonization.md §2.6.1). The confirm's Cancel is
 * `confirmDialog.cancel`.
 */
export interface HeldChangesBannerLabels {
  /** The banner's sentence when the app passes none: how many wait, that they stay on the
   *  device, and the two ways out. Says nothing of a way back, which the app may not have. */
  message: (count: number) => string;
  /** The way back — keksdose's switch to the budget the changes were made in. */
  switchBack: string;
  /** The button that asks first; the ellipsis says a question follows. */
  discard: string;
  /** The question, with the count that would be lost. */
  confirmTitle: (count: number) => string;
  /** The consequence under it: they are gone, and the device takes the server's state. */
  confirmBody: (count: number) => string;
  /** The button that answers it. */
  confirmAction: string;
  /** A switch back or a discard rejected and the app's `formatError` says nothing better. */
  failed: string;
}

export const DEFAULT_HELD_CHANGES_BANNER_LABELS: HeldChangesBannerLabels = {
  message: (count) =>
    count === 1
      ? "1 change cannot be sent from here. It stays on this device until it can be sent, or until you discard it."
      : `${count} changes cannot be sent from here. They stay on this device until they can be sent, or until you discard them.`,
  switchBack: "Switch back",
  discard: "Discard…",
  confirmTitle: (count) =>
    count === 1
      ? "Discard 1 change that cannot be sent from here?"
      : `Discard ${count} changes that cannot be sent from here?`,
  confirmBody: (count) =>
    count === 1
      ? "It cannot be recovered. This device then syncs with what the server has."
      : "They cannot be recovered. This device then syncs with what the server has.",
  confirmAction: "Discard",
  failed: "That didn’t work. Please try again.",
};
