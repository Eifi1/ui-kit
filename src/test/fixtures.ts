/**
 * Shared fixtures for the kit's own tests (refactor audit 2026-10, TST-10).
 */

/**
 * What the apps' HTTP clients reject with when the server refuses: an axios-shaped
 * error, `{response: {status, headers, data: {detail, code}}}` on an `Error`, as axios'
 * own `AxiosError` is. The kit reads the code, status and `Retry-After` from exactly
 * there (`auth/auth-errors.ts`), for all three apps' clients.
 *
 * Was seven private copies with five signatures; `code` and `headers` are optional
 * because a bare status (a 429 without a code, a 503) is a refusal the kit must read too.
 */
export function refusal(
  status: number,
  code?: string,
  detail = "Refused",
  headers: Record<string, string> = {},
): Error & { response: { status: number; headers: Record<string, string>; data: { detail: string; code?: string } } } {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, headers, data: { detail, ...(code !== undefined && { code }) } },
  });
}
