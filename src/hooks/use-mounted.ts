import { useEffect, useRef } from "react";

/**
 * A mounted guard and a callback-to-promise bridge, for a card that awaits an app's
 * callback and must not set state after the page moved on.
 *
 * Written for the account settings parts (0.34) and then imported by seven notifications
 * modules out of `account/account-parts.ts`: a generic helper living in a feature folder
 * that the folder beside it reached into sideways (refactor audit 2026-10-30, MOD-6).
 * `account-parts.ts` re-exports both, so nothing that imported them there moved, and
 * `admin/admin-parts.ts` re-exports `settle` in place of its own copy (0.52 code review).
 *
 * @internal Not part of the barrel.
 */

/** Whether the component is still mounted — a late answer after the app navigated away
 *  (the deletion signs out) must not set state. */
export function useMounted(): { readonly current: boolean } {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

/** Call `call` and hand back a promise, a throw included — a callback may return
 *  nothing (done at once), a promise, or throw before it returns one. Typed by what it
 *  answers, so the admin parts' copy, which kept the type, could go (0.52 code review,
 *  admin/admin-parts.ts). */
export function settle<R>(call: () => R): Promise<Awaited<R>> {
  try {
    return Promise.resolve(call());
  } catch (error) {
    return Promise.reject(error);
  }
}
