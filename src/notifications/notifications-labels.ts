// The words of the notification cards (docs/notifications-harmonization.md §4.2), in a
// module with no component code: the English catalogue (src/i18n/defaults.ts) imports
// them without the components, so `en` loads as one chunk like the other languages
// (0.34, KS U8). The cards read it through `useKitLabels("notifications", …)`.

/** The ten IANA regions `Intl` lists zones under — keksdose's `tz_region_*` — in the
 *  kit's words. A region a runtime adds later keeps its IANA name. */
export interface NotificationRegionLabels {
  Africa: string;
  America: string;
  Antarctica: string;
  Arctic: string;
  Asia: string;
  Atlantic: string;
  Australia: string;
  Europe: string;
  Indian: string;
  Pacific: string;
}

/**
 * Every string the notification parts render — the `notifications` namespace of
 * `<UiKitProvider labels>`, overridable per instance through `labels`: the types card,
 * quiet hours, this device's push, the device list, and the
 * unsubscribe page. Cancel is `common.cancel`.
 */
export interface NotificationsLabels {
  /* ── The types card ─────────────────────────────────────────────────── */
  /** The types card's title. */
  typesTitle: string;
  /** The line under it. */
  typesDescription: string;
  /** 0.46 (§10.2): the channel columns' headings, and each switch's name. */
  channelApp: string;
  channelPush: string;
  channelEmail: string;
  /** Under every e-mail switch while the account's address is unverified (decision 16):
   *  no notification mail goes to an unverified address. */
  emailUnverified: string;
  /** The digest's cadence select. */
  digestCadence: string;
  digestWeekly: string;
  digestMonthly: string;
  /** While the settings load. */
  typesLoading: string;
  /** The server answered no types for this account. */
  typesEmpty: string;

  /* ── Quiet hours ────────────────────────────────────────────────────── */
  quietTitle: string;
  /** The line under the title; `inbox`: the app keeps an inbox, which a held push still
   *  reaches; `held` (0.46, §10.4): the app queues a held push and sends it when the
   *  window ends, instead of dropping it. */
  quietDescription: (inbox: boolean, held?: boolean) => string;
  /** 0.46 (§10.3, automatic only): the card names the account's zone, read-only, given
   *  the zone as `zoneName` writes it ("Europe / Zurich"); it follows the device last used. */
  quietZone: (zone: string) => string;
  /** The start time's label. */
  quietFrom: string;
  /** The end time's label. */
  quietUntil: string;
  /** One time set, the other not: quiet hours fail open until both are. */
  quietIncomplete: string;
  /** The zone's region headings, in a zone's name ("Europe / Zurich"). */
  regions: NotificationRegionLabels;

  /* ── This device ────────────────────────────────────────────────────── */
  pushTitle: string;
  pushDescription: string;
  /** The browser has no push. */
  unsupported: string;
  /** iOS outside the installed app, given the app's name. */
  iosInstall: (app: string) => string;
  /** The server has no VAPID keys. */
  notConfigured: string;
  /** The browser's permission is denied. */
  blocked: string;
  /** This device gets notifications for the signed-in account. */
  on: string;
  off: string;
  /** This browser's subscription belongs to another account. */
  otherAccount: string;
  enable: string;
  disable: string;
  sendTest: string;
  /** Turning on did not finish (the permission prompt dismissed, a refusal). */
  enableFailed: string;
  /** No service worker, or one that is not ready in 10 s. */
  noServiceWorker: string;
  /** The browser's push service did not answer in 15 s. */
  pushTimeout: string;
  /** Given how many devices the push service accepted the test for (≥ 1). */
  testSent: (count: number) => string;
  /** The test reached no device. */
  testNone: string;
  testFailed: string;
  /** The explainer before the browser's one permission prompt. */
  explainerTitle: string;
  explainerBody: (app: string) => string;
  explainerHint: string;
  explainerContinue: string;

  /* ── The device list ────────────────────────────────────────────────── */
  devicesTitle: string;
  devicesDescription: string;
  devicesLoading: string;
  devicesEmpty: string;
  /** A device whose user agent says nothing the kit recognises. */
  unknownDevice: string;
  /** The chip on this browser's row. */
  thisDevice: string;
  /** Given the registration date, formatted. */
  added: (date: string) => string;
  /** Given the last accepted delivery, formatted. */
  lastDelivery: (date: string) => string;
  noDelivery: string;
  /** Given the failed deliveries in a row (≥ 1). */
  failures: (count: number) => string;
  /** A row's button, visible text — and the confirm's answer. */
  remove: string;
  /** The same button's accessible name, given the device: it starts with `remove`. */
  removeItem: (device: string) => string;
  /** The question the row asks before it removes. */
  removePrompt: string;
  /** 0.46 (§10.2): the disclosure on a device's row listing the types with push on. */
  deviceTypes: string;
  /** The line inside it. */
  deviceTypesDescription: string;
  /** No type has push on for the account. */
  deviceTypesEmpty: string;

  /* ── The inbox and the bell (0.46, §10.1) ───────────────────────────── */
  /** The inbox's heading (keksdose's "Inbox"). */
  inboxTitle: string;
  inboxLoading: string;
  /** Nothing in the inbox. */
  inboxEmpty: string;
  markAllRead: string;
  /** The header's clear button, and the confirm's answer. */
  clearAll: string;
  /** The question asked before the inbox is cleared. */
  clearPrompt: string;
  /** The row that loads the next page. */
  showMore: string;
  /** The bell's name. */
  bellLabel: string;
  /** Read after the bell's name, given the unread count (≥ 1). */
  bellUnread: (count: number) => string;
  /** The bell panel's link to the app's inbox. */
  allNotifications: string;

  /* ── The unsubscribe page ───────────────────────────────────────────── */
  unsubscribeTitle: string;
  /** Given the type's name in the app's words. */
  unsubscribeAbout: (type: string) => string;
  /** No type name to give. */
  unsubscribeGeneric: string;
  stopThese: string;
  stopAll: (app: string) => string;
  stoppedThese: string;
  stoppedAll: (app: string) => string;
  /** Account mail is not a notification, and keeps coming. */
  accountMail: string;
  turnBackOn: string;
  openSettings: string;
  /** A token the server refused, or one that does not parse. */
  invalidLink: string;

  /* ── Every card ─────────────────────────────────────────────────────── */
  /** A request failed, and the app had no words of its own. */
  failed: string;
}

export const DEFAULT_NOTIFICATIONS_LABELS: NotificationsLabels = {
  typesTitle: "Notify me about",
  typesDescription: "Choose what you hear about, and how.",
  channelApp: "In the app",
  channelPush: "Push",
  channelEmail: "E-mail",
  emailUnverified: "Confirm your address to receive these.",
  digestCadence: "Frequency",
  digestWeekly: "Weekly",
  digestMonthly: "Monthly",
  typesLoading: "Loading notification settings…",
  typesEmpty: "There are no notifications for this account.",

  quietTitle: "Quiet hours",
  quietDescription: (inbox, held) =>
    held
      ? inbox
        ? "Push notifications wait during this window and arrive when it ends. They reach your inbox at once."
        : "Push notifications wait during this window and arrive when it ends."
      : inbox
        ? "No push notifications during this window. They still reach your inbox."
        : "No push notifications during this window.",
  quietZone: (zone) => `In your time zone (${zone}), which follows the device you last used.`,
  quietFrom: "From",
  quietUntil: "Until",
  quietIncomplete: "Set both a start and an end time. Quiet hours take effect once both are set.",
  regions: {
    Africa: "Africa",
    America: "Americas",
    Antarctica: "Antarctica",
    Arctic: "Arctic",
    Asia: "Asia",
    Atlantic: "Atlantic",
    Australia: "Australia",
    Europe: "Europe",
    Indian: "Indian Ocean",
    Pacific: "Pacific",
  },

  pushTitle: "Push notifications",
  pushDescription: "Notifications on this device, also while the app is closed.",
  unsupported: "This browser doesn’t support push notifications.",
  iosInstall: (app) =>
    `On iPhone or iPad, add ${app} to your Home Screen first: iOS delivers notifications only to the installed app.`,
  notConfigured: "Push notifications aren’t set up on this server.",
  blocked: "Notifications are blocked in this browser’s settings.",
  on: "Notifications are on for this device.",
  off: "Notifications are off for this device.",
  otherAccount:
    "This browser gets notifications for another account. Turn them on here to get them for the account you’re signed in with.",
  enable: "Turn on notifications",
  disable: "Turn off",
  sendTest: "Send a test",
  enableFailed: "Couldn’t turn on notifications.",
  noServiceWorker: "Couldn’t reach the app’s service worker. Reload the page and try again.",
  pushTimeout: "The browser’s push service didn’t answer. Check your connection and try again.",
  testSent: (count) => (count === 1 ? "Test sent to 1 device" : `Test sent to ${count} devices`),
  testNone: "No device accepted the test. Turn notifications on for this device first.",
  testFailed: "Couldn’t send a test notification.",
  explainerTitle: "Turn on notifications?",
  explainerBody: (app) =>
    `${app} sends a notification only for the kinds you choose, and you can turn them off at any time.`,
  explainerHint: "Your browser asks for permission next.",
  explainerContinue: "Continue",

  devicesTitle: "Notification devices",
  devicesDescription: "Every device that gets push notifications for your account. Remove any you no longer use.",
  devicesLoading: "Loading devices…",
  devicesEmpty: "No device gets notifications yet.",
  unknownDevice: "Unknown device",
  thisDevice: "This device",
  added: (date) => `Added ${date}`,
  lastDelivery: (date) => `Last delivery ${date}`,
  noDelivery: "No delivery yet",
  failures: (count) => (count === 1 ? "1 failed delivery in a row" : `${count} failed deliveries in a row`),
  remove: "Remove",
  removeItem: (device) => `Remove ${device}`,
  removePrompt: "Stop sending notifications to this device?",
  deviceTypes: "Types on this device",
  deviceTypesDescription: "Turn a type off to mute it on this device only.",
  deviceTypesEmpty: "No type has push notifications turned on.",

  inboxTitle: "Inbox",
  inboxLoading: "Loading notifications…",
  inboxEmpty: "You’re all caught up.",
  markAllRead: "Mark all as read",
  clearAll: "Clear all",
  clearPrompt: "Delete all notifications from your inbox?",
  showMore: "Show more",
  bellLabel: "Notifications",
  bellUnread: (count) => `${count} unread`,
  allNotifications: "All notifications",

  unsubscribeTitle: "E-mail notifications",
  unsubscribeAbout: (type) => `You get e-mails about: ${type}.`,
  unsubscribeGeneric: "You get notification e-mails.",
  stopThese: "Stop these e-mails",
  stopAll: (app) => `Stop all notification e-mails from ${app}`,
  stoppedThese: "Done. You won’t get these e-mails any more.",
  stoppedAll: (app) => `Done. You won’t get notification e-mails from ${app} any more.`,
  accountMail: "E-mails about your account still come.",
  turnBackOn: "You can turn them back on at any time in Settings.",
  openSettings: "Open Settings",
  invalidLink: "This link doesn’t work any more. You can turn e-mails off in Settings instead.",

  failed: "That didn’t work. Please try again.",
};
