/**
 * The coded refusals of sign-in and sign-up (docs/auth-harmonization.md §5.2): every
 * refusal the auth routes answer carries a machine-readable `code`, and the pages
 * recognise the CODE, never the server's sentence.
 *
 * Today each app's pages print the server's `detail` string (keksdose's
 * `extractApiErrorMessage`), which is English on every locale and, on a credential
 * check, would be an account-enumeration oracle if it ever said more than one thing.
 * keksdose already keys one refusal on a code (`features/budgets/plan-limit.ts`,
 * `402 {detail, code: "plan_budget_limit"}`); §5.2 makes that the rule for auth. Each
 * app switches its server and its pages together (§9).
 *
 * - `invalid_credentials` — unknown address, wrong password AND deactivated account:
 *   one answer, in the same time (§2.10). `401`.
 * - `registration_closed` — the sign-up gate refused the address. `403`.
 * - `email_taken` — an account with this address exists. `409`.
 * - `invitation_invalid`, `invitation_expired` — the `invite` token of a sign-up or an
 *   accept (§4.4).
 * - `token_invalid` — a one-time token (reset, verification, a sign-in challenge) is
 *   unknown, spent or expired.
 * - `account_inactive` — **no server answers it.** §2.10 decided that a deactivated
 *   account gets `invalid_credentials`, because a separate answer after a correct
 *   password would confirm a leaked one. It stays in the union only for a future server
 *   step that is past the password (an admin view, a signed-in refresh) and may say so.
 */
export type AuthErrorCode =
  | "invalid_credentials"
  | "registration_closed"
  | "email_taken"
  | "invitation_invalid"
  | "invitation_expired"
  | "token_invalid"
  /** 0.29.1: a link that WAS valid and ran out (verification, reset) — keksdose's step-3
   *  refusals tell it from `token_invalid`, so a page can say "expired, ask for a new one". */
  | "token_expired"
  | "account_inactive";

const CODES: ReadonlySet<string> = new Set<AuthErrorCode>([
  "invalid_credentials",
  "registration_closed",
  "email_taken",
  "invitation_invalid",
  "invitation_expired",
  "token_invalid",
  "token_expired",
  "account_inactive",
]);

type Bag = Record<string, unknown>;

const isBag = (value: unknown): value is Bag => typeof value === "object" && value !== null;

/** A known code, or undefined. */
function known(value: unknown): AuthErrorCode | undefined {
  return typeof value === "string" && CODES.has(value) ? (value as AuthErrorCode) : undefined;
}

/** `{code}` on a parsed body, or FastAPI's `{detail: {code}}` — what an
 *  `HTTPException(detail={"code": …})` serialises to. */
function codeOfBody(body: unknown): AuthErrorCode | undefined {
  if (!isBag(body)) return undefined;
  return known(body.code) ?? (isBag(body.detail) ? known(body.detail.code) : undefined);
}

/**
 * The {@link AuthErrorCode} an error carries, or `undefined` when it carries none.
 *
 * Reads the parsed response body wherever the apps' HTTP clients put it, without
 * depending on any of them:
 *
 *  1. `err.response.data` — axios (keksdose's, kastlan's and Kurvenschmiede's clients;
 *     keksdose's `isPlanBudgetLimitRefusal` reads the same path);
 *  2. `err.data` — ofetch's `FetchError`, and most `fetch` wrappers that parse the body;
 *  3. `err.body` — the generated OpenAPI clients' `ApiError`;
 *  4. `err` itself — a body thrown as it came (`throw await res.json()`).
 *
 * In each, `code` or FastAPI's nested `detail.code`. Last, `err.code` — but only when
 * it is one of the codes above: axios writes its OWN codes there (`ERR_NETWORK`,
 * `ECONNABORTED`, `ERR_BAD_REQUEST`), and so does Node, so an unknown value is never
 * read as a refusal. The HTTP status is not checked: the code is the contract, and the
 * status differs per refusal (401, 403, 409, 410).
 */
export function authErrorCode(err: unknown): AuthErrorCode | undefined {
  if (!isBag(err)) return undefined;
  const response = err.response;
  return (
    (isBag(response) ? codeOfBody(response.data) : undefined) ??
    codeOfBody(err.data) ??
    codeOfBody(err.body) ??
    codeOfBody(err)
  );
}

/**
 * Whether `err` is a coded auth refusal — any of them, or the one named:
 *
 * ```ts
 * try { await api.register(values) }
 * catch (err) { if (isAuthError(err, "email_taken")) … }
 * ```
 *
 * The kit's `SignInForm` and `RegisterForm` call it on what their callbacks reject
 * with, so an app's `onSubmit` can simply let its client's error through. See
 * {@link authErrorCode} for the shapes it reads.
 */
export function isAuthError(err: unknown, code?: AuthErrorCode): boolean {
  const found = authErrorCode(err);
  return found !== undefined && (code === undefined || found === code);
}
