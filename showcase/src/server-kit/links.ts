import { PAGES } from "../routes";

/**
 * Kit parts ↔ server parts: which showcase pages each server-kit module is the other half
 * of. One map, read both ways — a server page lists its "Kit counterparts" from it, and
 * the page frame (showcase.tsx) puts a "Server side" link under the title of every kit
 * page it names — so the two directions cannot disagree.
 *
 * Keyed by the module's short name (`user_admin`), valued by kit page slugs from
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
  // The plans, the standing and the read-only lock the Subscription page's parts render.
  billing: ["subscription"],
  // The reset and email-change mails the Auth page's forms ask for.
  mail: ["auth-account"],
  feedback: ["feedback-compose", "feedback-inbox"],
  // The attachment policy behind the feedback dialog's attachment field.
  uploads: ["feedback-compose"],
  // `Retry-After` and the per-address delay, which `isRateLimited` / `retryAfterSeconds`
  // read; and the feedback routes' upload and crash windows.
  limiter: ["auth-account", "feedback-compose"],
  // `{detail, code}` — the codes the auth pages switch on instead of the English detail.
  errors: ["auth-account"],
  translation_review: ["localisation", "kit-review"],
  // The extra-origin CORS that lets this very site's Kit review page call keksdose.
  cors: ["kit-review"],
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
