/**
 * The two demo models (docs/landing-demo-harmonization.md §2.3):
 *
 * - `read-only` (R) — keksdose and kastlan: one pre-filled shared dataset a throwaway
 *   demo user may look at but not change;
 * - `sandbox` (S) — Kurvenschmiede: the demo user reads system-owned worked examples and
 *   may create or copy work of its own, deleted with the demo account.
 */
export type DemoModel = "read-only" | "sandbox";

/** The fields of an `/auth/me` answer {@link isDemoSession} reads — server-kit's
 *  `UserResponse.is_demo` (0.5: and `demo_expires_at`), or a client's camel-cased copy. */
export interface DemoSessionUser {
  is_demo?: boolean | null;
  isDemo?: boolean | null;
}

/**
 * Whether the signed-in user is a demo (§5, §6.5): server-kit's `is_demo` on
 * `/auth/me`, or a client's `isDemo`. `false` for no user at all.
 *
 * What the client branches on: the demo banner instead of keksdose's preview banner, the
 * header's "Continue the demo", a 401 that ends at `/demo/ended` instead of `/login`, and
 * the crash reporter, which files nothing for a demo:
 *
 * ```ts
 * createCrashReporter({ …, suppress: () => isDemoSession(useAuth.getState().user) });
 * ```
 */
export function isDemoSession(me: DemoSessionUser | null | undefined): boolean {
  return me?.is_demo === true || me?.isDemo === true;
}
