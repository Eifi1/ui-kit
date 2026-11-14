import type { LegalBrowserStandardEntries } from "../components/legal";

/**
 * What `@eifi1/ui-kit/accounts` keeps in the browser, named once (docs/auth-harmonization.md
 * §12.9: "The storage keys come from the app's prefix, and the client lists them for the
 * privacy page"). The client reads its keys from here, so the list an app's privacy page
 * draws from cannot miss one the client writes.
 *
 * Why a list at all: a privacy page says what the browser stores, and each app's went wrong
 * the same way — a key written in one module, its line forgotten on the page
 * (Kurvenschmiede's text size and contrast, two days unlisted; its third plan's F102). An
 * entry here is the key AND its line, the latter worded by the kit in its seven languages.
 *
 * What it does not list: the shared-computer choice's own flag (`eifi1-shared-computer`),
 * which `SharedComputerChoice` writes and the client only reads — the app that renders the
 * choice lists it with `standardEntries.sharedComputer`.
 */

/** One key the accounts client keeps in the browser. */
export interface AccountStorageEntry {
  /** The key as the browser holds it: the app's `storagePrefix` and the kit's name for it,
   *  verbatim, as `<UiKitProvider tableStorageKeyPrefix>` puts its prefix in front. */
  key: string;
  /**
   * Its line on the privacy page: a key of the legal namespace's
   * `sections.privacy.browser.standardEntries` (`useLegalLabels()`), which the app places in
   * its `<LegalKitSection section="browser" entries>` where its reading order wants it, as it
   * places `recentData` and `sharedComputer`. Several keys may share one line.
   */
  entry: Extract<keyof LegalBrowserStandardEntries, "session">;
}

/** @internal The session's key: the tokens and the account, one JSON record. */
export function sessionKey(prefix: string): string {
  return `${prefix}session`;
}

/** @internal `pageMode: "per-page"` (0.64): what the tab's next page is loaded as, `"1"` for a
 *  shared computer's — a marker in `sessionStorage`, not the person's data. */
export function sharedPageKey(prefix: string): string {
  return `${prefix}shared-page`;
}

/** @internal `pageMode: "per-page"` (0.64): a sign-in handed to the tab's next page, in
 *  `sessionStorage` from the sign-in until that page starts and takes it. */
export function pendingSessionKey(prefix: string): string {
  return `${prefix}pending-session`;
}

/**
 * The keys the accounts client keeps under `prefix`, each with its privacy line — for the
 * app's privacy page and its own list of keys (Staunlabor's `storage-keys.ts`, Kurvenschmiede's
 * `ENTRY_OF`):
 *
 * ```ts
 * const standard = useLegalLabels().sections.privacy.browser.standardEntries;
 * const lines = accountStorageEntries(STORAGE_PREFIX).map(({ entry }) => standard?.[entry] ?? "");
 * <LegalKitSection section="browser" entries={[...appLines, ...new Set(lines)]} />
 * ```
 *
 * Pass the same `prefix` as `createAccountsClient`'s `storagePrefix`. Pure: it reads and
 * writes nothing, so a module may call it at load.
 *
 * The session: on a personal device in `localStorage`; after a sign-in with "This is a shared
 * computer" in the tab's `sessionStorage`, or in no storage at all on the stricter page-memory
 * path (`sharedSession: "memory"`). With `pageMode: "per-page"` (0.64) two more under the same
 * line, both in the tab's `sessionStorage`: the next page's mode, and a sign-in on its way to
 * that page, kept only between the two.
 */
export function accountStorageEntries(prefix: string): readonly AccountStorageEntry[] {
  return [
    { key: sessionKey(prefix), entry: "session" },
    { key: sharedPageKey(prefix), entry: "session" },
    { key: pendingSessionKey(prefix), entry: "session" },
  ];
}
