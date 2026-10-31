/**
 * Whether the user has asked for no motion (`prefers-reduced-motion: reduce`), read NOW —
 * not at mount: the setting can change under a long-lived page. The kit's one copy
 * (DUP-11, refactor audit 2026-10: the settings focus and the exit timers each had their
 * own, with opposite answers where `matchMedia` is missing).
 *
 * Where there is no `matchMedia` to ask (SSR, jsdom) the answer is `whereUnknown`,
 * default `false`: motion allowed — the platform's own default, `no-preference`, which
 * is what a browser that cannot say otherwise has. A smooth scroll there is harmless.
 *
 * An exit animation passes `true` (`skipsExitAnimation` in `hooks/use-close-transition`):
 * without `matchMedia` nothing is painting, and a timer that holds an unpainted panel on
 * screen only delays its `onClose` — every test suite, the kit's and the apps', reads a
 * closed overlay as gone at once.
 *
 * Public since 0.52 (DUP-8, refactor audit 2026-10-30): Kurvenschmiede's chain animation
 * carried a copy of its own.
 */
export function prefersReducedMotion(whereUnknown = false): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return whereUnknown;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
