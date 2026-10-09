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

/**
 * 0.30.0: the coded refusals of user administration and the account's own settings
 * (docs/user-admin-harmonization.md §4, §6) — server-kit 0.4.0's `AccountErrorCode`,
 * value for value. The same family of answer as the sign-in codes (`{detail, code}`,
 * plus `companies` on kastlan's `last_admin`), read by the same {@link authErrorCode}.
 *
 * - `last_admin` — the action would leave no active admin: deactivating, demoting or
 *   deleting the last one (in kastlan, of a company; the answer names the `companies`).
 * - `self_action` — an admin acting on their own account where that is never allowed.
 * - `other_companies` — kastlan: the account belongs to other companies too, so a
 *   company admin may not deactivate it; "Remove from company" instead (§9.6).
 * - `household_has_members` — keksdose's guard on a deletion request (§6.4).
 * - `confirmation_required`, `confirmation_mismatch` — the action's confirmation level
 *   asked for a typed address (or a tick), and the request carried none, or another
 *   address (§4.2).
 * - `password_incorrect` — the CURRENT password is wrong on a signed-in route (the email
 *   change, the deletion request). `400`, not `401`: an app's client reads a 401 as an
 *   ended session and signs the user out, the wrong answer to a typo. Every other one
 *   is a `409`.
 */
export type AccountErrorCode =
  | "last_admin"
  | "self_action"
  | "other_companies"
  | "household_has_members"
  | "confirmation_required"
  | "confirmation_mismatch"
  | "password_incorrect";

/**
 * 0.31.0: the demo's coded refusals (docs/landing-demo-harmonization.md §6.2) —
 * server-kit 0.5's `DemoErrorCode`, value for value, answered as `{detail, code}` like
 * the others and read by the same {@link authErrorCode}.
 *
 * - `demo_disabled` — `404`: the demo switch is off (it is "not there", not forbidden).
 * - `demo_rate_limited` — `429` with `Retry-After`: the per-IP window of demo starts.
 * - `demo_capacity` — `429`, no `Retry-After`: the cap of live demo users.
 * - `demo_not_ready` — `503`: the demo data has not been seeded yet.
 * - `demo_read_only` — `403`, model R: any write by a demo user. The app's write lock
 *   already explains it, so it shows no toast (§5.4).
 * - `demo_refused` — `403`, both models: an action a demo never may — a way in or out,
 *   mail, uploads, the account export (§6.4).
 */
export type DemoErrorCode =
  | "demo_disabled"
  | "demo_rate_limited"
  | "demo_capacity"
  | "demo_not_ready"
  | "demo_read_only"
  | "demo_refused";

/**
 * 0.32.0: billing's coded refusals (docs/billing-harmonization.md §3.3, §3.4, §4, §12.3) —
 * server-kit 0.6's `BillingError` and `PlanLimitError`, value for value, answered as
 * `{detail, code}` like the others and read by the same {@link authErrorCode}.
 *
 * - `billing_disabled` — `404`: the billing switch is off (§2.9), so every billing route
 *   but `GET /billing/status` is "not there", as a switched-off demo is.
 * - `billing_read_only` — `402`: a write by (or into the data of) a payer out of good
 *   standing (§3.3, §12.1). Inside a sync reply it marks the changes that were refused
 *   and not applied (§12.5). The app's write lock and banner already say why, so — like
 *   `demo_read_only` — it needs no toast of its own.
 * - `plan_limit` — `402`: a create past the plan's limit (§3.4), with the extra fields
 *   `dimension`, `plan`, `limit` and `used` — read them with `isPlanLimit`. A lapsed payer
 *   creating gets `billing_read_only` instead, never this (§12.3).
 * - `billing_not_configured` — billing is switched on but the provider's settings are
 *   missing (the secrets, a price id): the operator's mistake, not the payer's.
 *
 * 0.33.0 (server-kit 0.7, §14.2): the provider's refusals, with the `billing_` prefix of
 * the others (decision 22).
 * - `billing_provider_unavailable` — `502`: Paddle didn't answer, or refused the request.
 *   Try again.
 * - `billing_not_at_provider` — `409`: a portal request before the payer reached the
 *   provider (§14.5) — a stale page; the overview's `at_provider` says it first.
 * - `billing_already_subscribed` — `409`: a checkout while a provider subscription runs
 *   (§14.6). Plan changes go through the portal.
 * - `billing_plan_not_sold` — `422`: a checkout for a plan, currency or interval the
 *   catalogue doesn't sell.
 */
export type BillingErrorCode =
  | "billing_disabled"
  | "billing_read_only"
  | "plan_limit"
  | "billing_not_configured"
  | "billing_provider_unavailable"
  | "billing_not_at_provider"
  | "billing_already_subscribed"
  | "billing_plan_not_sold";

/** Every code the kit reads: the sign-in refusals, the account ones (0.30.0), the demo's
 *  (0.31.0) and billing's (0.32.0). */
export type KitErrorCode = AuthErrorCode | AccountErrorCode | DemoErrorCode | BillingErrorCode;

const BILLING_CODES: ReadonlySet<BillingErrorCode> = new Set<BillingErrorCode>([
  "billing_disabled",
  "billing_read_only",
  "plan_limit",
  "billing_not_configured",
  "billing_provider_unavailable",
  "billing_not_at_provider",
  "billing_already_subscribed",
  "billing_plan_not_sold",
]);

const CODES: ReadonlySet<string> = new Set<KitErrorCode>([
  "invalid_credentials",
  "registration_closed",
  "email_taken",
  "invitation_invalid",
  "invitation_expired",
  "token_invalid",
  "token_expired",
  "account_inactive",
  "last_admin",
  "self_action",
  "other_companies",
  "household_has_members",
  "confirmation_required",
  "confirmation_mismatch",
  "password_incorrect",
  "demo_disabled",
  "demo_rate_limited",
  "demo_capacity",
  "demo_not_ready",
  "demo_read_only",
  "demo_refused",
  ...BILLING_CODES,
]);

type Bag = Record<string, unknown>;

const isBag = (value: unknown): value is Bag => typeof value === "object" && value !== null;

/** A known code, or undefined. */
function known(value: unknown): KitErrorCode | undefined {
  return typeof value === "string" && CODES.has(value) ? (value as KitErrorCode) : undefined;
}

/** `{code}` on a parsed body, or FastAPI's `{detail: {code}}` — what an
 *  `HTTPException(detail={"code": …})` serialises to. */
function codeOfBody(body: unknown): KitErrorCode | undefined {
  if (!isBag(body)) return undefined;
  return known(body.code) ?? (isBag(body.detail) ? known(body.detail.code) : undefined);
}

/**
 * The code an error carries — an {@link AuthErrorCode}, since 0.30.0 an
 * {@link AccountErrorCode}, since 0.31.0 a {@link DemoErrorCode}, since 0.32.0 a
 * {@link BillingErrorCode} — or `undefined` when it carries none.
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
 * status differs per refusal (401, 402, 403, 404, 409, 410).
 */
export function authErrorCode(err: unknown): KitErrorCode | undefined {
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
 * {@link authErrorCode} for the shapes it reads. Since 0.30.0 it knows the account codes
 * too: `isAuthError(err, "last_admin")`; since 0.31.0 the demo's:
 * `isAuthError(err, "demo_read_only")`; since 0.32.0 billing's:
 * `isAuthError(err, "billing_read_only")` (or {@link isBillingError}).
 */
export function isAuthError(err: unknown, code?: KitErrorCode): boolean {
  const found = authErrorCode(err);
  return found !== undefined && (code === undefined || found === code);
}

/**
 * Whether `err` is one of billing's coded refusals (0.32.0, docs/billing-harmonization.md
 * §10, §14.2) — any of them, or the one named. {@link isAuthError} answers the same for a
 * named code; this one also answers "is it billing's at all", which an app's error
 * handler asks before it decides between the write lock, a `PlanLimitNotice` and a toast.
 */
export function isBillingError(err: unknown, code?: BillingErrorCode): boolean {
  const found = authErrorCode(err);
  return found !== undefined && BILLING_CODES.has(found as BillingErrorCode) && (code === undefined || found === code);
}

/**
 * The parsed body that carries a code, wherever {@link authErrorCode} would find it (in
 * the same order) — the object with the `code`, so FastAPI's nested `detail` when the code
 * is there. For a reader of a refusal's EXTRA fields (`isPlanLimit`: `dimension`, `limit`,
 * `used` sit beside the code). `accept` decides which codes count; default, the known ones.
 *
 * @internal Not part of the barrel.
 */
export function errorBodyWithCode(
  err: unknown,
  accept: (code: unknown) => boolean = (code) => known(code) !== undefined,
): Record<string, unknown> | undefined {
  if (!isBag(err)) return undefined;
  const response = err.response;
  for (const body of [isBag(response) ? response.data : undefined, err.data, err.body, err]) {
    if (!isBag(body)) continue;
    if (accept(body.code)) return body;
    if (isBag(body.detail) && accept(body.detail.code)) return body.detail;
  }
  return undefined;
}

/** An HTTP status as a number, or undefined. */
function statusOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/**
 * Whether `err` is a throttled request — HTTP `429 Too Many Requests` (0.30.0, from the
 * apps' 0.29 adoption: every app answered a throttled sign-in, sign-up or reset through
 * its own `describeError`, with three wordings of one sentence).
 *
 * A throttle carries no `code` in the contract — the STATUS is the answer, set by the
 * apps' limiters (server-kit's `AuthLimiters`, keksdose's per-IP limit) — so this reads
 * the status, wherever the apps' HTTP clients put it, without depending on any of them:
 *
 *  1. `err.response.status` — axios (all three apps' clients);
 *  2. `err.status` — ofetch's `FetchError`, the generated OpenAPI clients' `ApiError`, and
 *     a `Response` thrown as it came;
 *  3. `err.statusCode` — ofetch's alias, and Node-style errors.
 *
 * There is no `rate_limited` code: keksdose answers its 429s uncoded, with a
 * `Retry-After` header, and the status is the one signal every limiter gives.
 *
 * The kit's `SignInForm`, `RegisterForm`, `ForgotPasswordForm` and `ResetPasswordForm`
 * call it AFTER the app's `describeError` — an app with words of its own keeps them —
 * and before their generic failure, so "Too many attempts. Try again in 30 s." (with
 * {@link retryAfterSeconds}) or "… Wait a moment and try again." needs no app code.
 */
export function isRateLimited(err: unknown): boolean {
  if (!isBag(err)) return false;
  const response = err.response;
  const status =
    (isBag(response) ? statusOf(response.status) : undefined) ?? statusOf(err.status) ?? statusOf(err.statusCode);
  return status === 429;
}

/** A header's value from a `Headers` (fetch, ofetch's `response`), axios' `AxiosHeaders`
 *  or a plain record — whose keys may come in any case. */
function headerOf(headers: unknown, name: string): unknown {
  if (!isBag(headers)) return undefined;
  if (typeof headers.get === "function") {
    try {
      const value: unknown = (headers.get as (key: string) => unknown).call(headers, name);
      if (value !== undefined && value !== null) return value;
    } catch {
      // A `get` that is not a header lookup; the record below is.
    }
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) return value;
  }
  return undefined;
}

/** `Retry-After` as seconds from `now`: delta-seconds ("30"), or an HTTP date
 *  ("Wed, 07 Oct 2026 10:00:00 GMT") counted from now, never below 0 (RFC 9110 §10.2.3). */
function parseRetryAfter(value: unknown, now: number): number | undefined {
  const raw = Array.isArray(value) ? (value as unknown[])[0] : value;
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? Math.ceil(raw) : undefined;
  if (typeof raw !== "string") return undefined;
  const text = raw.trim();
  if (/^\d+$/.test(text)) return Number(text);
  // An HTTP date names its day and month ("Wed, 07 Oct 2026 …"). Without a letter it is
  // a malformed number ("-5", "1.5"), which `Date.parse` would happily read as a year.
  if (!/[a-z]/i.test(text)) return undefined;
  const at = Date.parse(text);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

/**
 * How long a throttled request asks to wait, in whole seconds — its `Retry-After`
 * header (0.30.0, keksdose: its 429s carry no code, only the header) — or `undefined`
 * when there is none, or none that parses.
 *
 * Read where the apps' clients keep the response headers, without depending on any of
 * them: `err.response.headers` (axios' `AxiosHeaders` or a plain record; ofetch's
 * `FetchError.response`, a fetch `Headers`), then `err.headers` (a `Response` thrown as
 * it came). The value is delta-seconds, or an HTTP date turned into seconds from `now`
 * (default: the present moment) — never below 0.
 *
 * The forms hand it to their `rateLimited` label when {@link isRateLimited} is true:
 * "Too many attempts. Try again in 30 s." — and, without one, "… Wait a moment and try
 * again." A browser only exposes `Retry-After` to a cross-origin page when the server
 * lists it in `Access-Control-Expose-Headers`.
 */
export function retryAfterSeconds(err: unknown, now: number | Date = Date.now()): number | undefined {
  if (!isBag(err)) return undefined;
  const at = typeof now === "number" ? now : now.getTime();
  const response = err.response;
  const value =
    (isBag(response) ? headerOf(response.headers, "retry-after") : undefined) ?? headerOf(err.headers, "retry-after");
  return value === undefined ? undefined : parseRetryAfter(value, at);
}

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
