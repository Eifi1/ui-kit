import { PAGES } from "../routes";

/**
 * Kit parts ↔ server parts: which showcase pages each server-kit module is the other half
 * of. One map, read both ways — a server page lists its "Kit counterparts" from it, and
 * the page frame (showcase.tsx) puts a "Server side" link under the title of every kit
 * page it names — so the two directions cannot disagree.
 *
 * Keyed by the module's short name (`user_admin`, `feedback.router`), valued by kit page slugs from
 * routes.tsx. A slug that is not a page fails the server-kit test, so a renamed page
 * shows up there rather than as a dead link.
 *
 * Small and free of the export on purpose: the page frame imports it on every page, and
 * the JSON belongs to the Server kit group's own chunk.
 */
export const KIT_COUNTERPARTS: Readonly<Record<string, readonly string[]>> = {
  // The sign-in, register, reset and verify pages, and the session rules behind them.
  auth: ["auth-account"],
  // The admin roster, actions and invitations — and the account's own email change,
  // sessions, deletion and export, which the Auth page shows.
  user_admin: ["user-admin", "auth-account"],
  // One PATCH rule and the account's language: the settings rows, and the kit's own
  // language resolution beside `canonical_locale`.
  settings: ["settings", "localisation"],
  // The demo's start, banner and end, and the routing that lets a demo through.
  demo: ["landing-demo"],
  // The dev-only role and plan switch behind the Shell page's `DevSwitchers` (0.14).
  dev_switch: ["shell"],
  // The plans, the standing and the read-only lock the Subscription page's parts render.
  billing: ["subscription"],
  // The reset and email-change mails the Auth page's forms ask for.
  mail: ["auth-account"],
  // The types, switches, quiet hours, push devices and unsubscribe token the
  // Notifications page's cards read and write (server-kit 0.9).
  notifications: ["notifications"],
  // server-kit 0.16: the inbox routes and the queue's tick job as router factories (the
  // `fastapi` extra), nested like `feedback.router`; the Notifications page's inbox reads them.
  "notifications.router": ["notifications"],
  feedback: ["feedback-compose", "feedback-inbox"],
  // The same two pages' routes, as one router factory (server-kit 0.9, the `fastapi`
  // extra). Nested: its anchor is `#feedback.router` (server-kit/api.ts anchors).
  "feedback.router": ["feedback-compose", "feedback-inbox"],
  // The attachment policy behind the feedback dialog's attachment field.
  uploads: ["feedback-compose"],
  // `Retry-After` and the per-address delay, which `isRateLimited` / `retryAfterSeconds`
  // read; and the feedback routes' upload and crash windows.
  limiter: ["auth-account", "feedback-compose"],
  // `{detail, code}` — the codes the auth pages switch on instead of the English detail.
  errors: ["auth-account"],
  translation_review: ["localisation", "kit-review"],
  // server-kit 0.10: the review's routes as one factory (the `fastapi` extra), nested
  // like `feedback.router`; the kit's review page talks to them.
  "translation_review.router": ["localisation", "kit-review"],
  // server-kit 0.15: tour progress on the account and its routes, which the Tour page's
  // `useTourProgress({account})` reads and writes (tours §10).
  tours: ["tour"],
  "tours.router": ["tour"],
  // server-kit 0.15: the sync shapes behind the Offline page's cache and dialogs (local-first §1).
  // server-kit 0.16: the same shapes are the sync engine's wire (local-first §2.3).
  sync: ["offline", "sync"],
  // server-kit 0.10: the layer-2 services' shared clock; no page of the kit has one.
  clock: [],
  // The extra-origin CORS that lets this very site's Kit review page call keksdose.
  cors: ["kit-review"],
  // The scheduler's token on an app's job routes (server-kit 0.8): no kit page speaks it.
  jobs: [],
};

/** The Server kit page a module is documented on (routes.tsx `serverModules`). */
export function serverPageOf(module: string): string | undefined {
  return PAGES.find((p) => p.serverModules?.includes(module))?.slug;
}

/** The server modules a kit page is the client half of, in the map's order. */
export function serverModulesFor(kitSlug: string): string[] {
  return Object.entries(KIT_COUNTERPARTS)
    .filter(([, slugs]) => slugs.includes(kitSlug))
    .map(([module]) => module);
}
