/**
 * Whether a callback's answer is a promise to wait for — an object or a function with a
 * `then` (Promises/A+ "thenable"). A callback that answers nothing is done when it
 * returns.
 *
 * The auth forms (`auth/status-parts`), the admin confirm and the feedback mutation each
 * wrote their own, three spellings of one check — and the admin's turned a thenable
 * FUNCTION away (0.52 code review, feedback/feedback-mutation.ts; the refactor audit's
 * DUP findings).
 *
 * @internal Package-private — not re-exported from the barrel.
 */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
