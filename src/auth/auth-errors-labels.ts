// The English of every `rateLimited` label, in a module with no component code and no
// error probing: the English catalogue (src/i18n/defaults.ts) reaches it through nine
// `*-labels.ts` modules, and until 0.52 that pulled `auth/auth-errors` — and since MOD-6
// its `lib/http-status` — into the `en` chunk (refactor audit 2026-10-30, MOD-6).
// auth/auth-errors re-exports both.

/**
 * The English of every `rateLimited` label (0.30.0): "Too many attempts. Try again in
 * 30 s." with a wait under a minute, in whole minutes from one minute up (keksdose's
 * reset throttle answers in hours, and "3600 s" is a number nobody reads), and "Wait a
 * moment and try again." without one — or with a `0`.
 *
 * @internal The namespaces' English; not part of the barrel.
 */
export function englishRateLimited(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Too many attempts. Wait a moment and try again.";
  return `Too many attempts. Try again in ${englishWait(seconds)}.`;
}

/** "30 s", "2 min" — a wait in English, rounded up. @internal */
export function englishWait(seconds: number): string {
  return seconds < 60 ? `${Math.ceil(seconds)} s` : `${Math.ceil(seconds / 60)} min`;
}
