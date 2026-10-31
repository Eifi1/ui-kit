/**
 * The HTTP status of a thrown error, as one probe (DUP-11, refactor audit 2026-10: the
 * session refresh carried its own copy).
 *
 * It lived in `auth/auth-errors.ts` until 0.52, which made `lib/session-refresh` and
 * `/sync`'s engine import the auth folder — and put auth's English error words in the
 * `/sync` entry's closure — for a three-line reader of `status` (refactor audit
 * 2026-10-30, MOD-6). `auth-errors.ts` re-exports it, so nothing that imported it there
 * moved.
 *
 * @internal Package-private — not re-exported from the barrel.
 */

type Bag = Record<string, unknown>;

const isBag = (value: unknown): value is Bag => typeof value === "object" && value !== null;

/** An HTTP status as a number, or undefined. */
function statusOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/**
 * The HTTP status a thrown error carries, wherever the apps' HTTP clients put it —
 * without depending on any of them:
 *
 *  1. `err.response.status` — axios (all three apps' clients);
 *  2. `err.status` — ofetch's `FetchError`, the generated OpenAPI clients' `ApiError`, and
 *     a `Response` thrown as it came;
 *  3. `err.statusCode` — ofetch's alias, and Node-style errors.
 *
 * `undefined` when none is a whole number.
 */
export function httpStatusOf(err: unknown): number | undefined {
  if (!isBag(err)) return undefined;
  const response = err.response;
  return (isBag(response) ? statusOf(response.status) : undefined) ?? statusOf(err.status) ?? statusOf(err.statusCode);
}
