import { isTransientRefreshFailure } from "../lib/session-refresh";

/*
 * The leaf utilities of local-first (docs/local-first-harmonization.md §2.3, 0.46): what a
 * page and a sync engine both need, with no store behind them. One module that both
 * `@eifi1/ui-kit/offline` and `@eifi1/ui-kit/sync` export, so `/sync` never loads
 * `/offline`'s TanStack and idb-keyval peers, and `/offline` never loads Dexie. It imports
 * no package at all (packaging-contract.test.ts holds that).
 */

/**
 * An `updated_at` that wins Last-Write-Wins over `previous`: now, or one millisecond past
 * `previous` when that is not behind this clock (keksdose's sync-client.ts:639-643).
 *
 * `/sync` keeps the server's row when it is STRICTLY newer, comparing this device's clock
 * with the server's. A row the server just wrote carries the server's time, so an edit
 * stamped by a clock a second slow would lose and come straight back. The millisecond is
 * enough although the server keeps microseconds: `Date.parse` truncates them.
 */
export function stampAfter(previous: unknown): string {
  const now = Date.now();
  const prior = typeof previous === "string" ? Date.parse(previous) : Number.NaN;
  return new Date(Number.isFinite(prior) && prior >= now ? prior + 1 : now).toISOString();
}

/**
 * The connection, not the server, failed: the request had no answer (an axios-like error
 * without `response`, or `fetch`'s `TypeError`), or the session refresh marked a 401 as
 * passing because the server was out of reach ({@link isTransientRefreshFailure}). A real
 * HTTP answer — a 4xx or a 5xx — is never offline: the caller must see it.
 */
export function isOfflineError(err: unknown): boolean {
  if (isTransientRefreshFailure(err)) return true;
  if (typeof err !== "object" || err === null) return false;
  const bag = err as { isAxiosError?: unknown; response?: unknown };
  if (bag.isAxiosError === true || "response" in bag) return bag.response == null;
  return err instanceof TypeError;
}

/**
 * Read from the server, and from the device's copy only when the connection failed
 * ({@link isOfflineError}); a 4xx or 5xx still throws. `onOnline` gets the server's answer
 * before it is returned (to refresh the copy, say); a throw from it counts as a failure of
 * the online path. The plain form of keksdose's net.ts:58, without its sealed-household
 * and cold-start branches (those stay keksdose's).
 */
export async function readLocalFirst<T>(
  online: () => Promise<T>,
  offline: () => Promise<T>,
  onOnline?: (result: T) => void | Promise<void>,
): Promise<T> {
  try {
    const result = await online();
    await onOnline?.(result);
    return result;
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    return offline();
  }
}

/**
 * Write through the server first (`rest`), and queue the change on the device (`queue`)
 * only when the connection failed; any other failure throws, nothing queued. Online writes
 * stay server-stamped (D2). A create mints its id BEFORE calling this and sends it on both
 * paths, so a REST create that timed out after the server applied it is not created twice
 * (D16).
 */
export async function writeLocalFirst<T>(rest: () => Promise<T>, queue: () => Promise<T>): Promise<T> {
  try {
    return await rest();
  } catch (err) {
    if (!isOfflineError(err)) throw err;
    return queue();
  }
}
