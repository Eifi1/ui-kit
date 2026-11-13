import type { AccountErrorCode, AuthErrorCode, KitErrorCode } from "../auth/auth-errors";
import { authErrorCode, errorBodyWithCode, isRateLimited, retryAfterSeconds } from "../auth/auth-errors";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { httpStatusOf } from "../lib/http-status";
import { isTransientRefreshFailure } from "../lib/session-refresh";
import { DEFAULT_ACCOUNT_FAILURE_LABELS } from "./account-failure-labels";

/**
 * A failed account request, as one sentence in the reader's language
 * (docs/auth-harmonization.md §12.9 "Refusals") — Kurvenschmiede's `apiErrorMessage` and
 * `describeAuthFailure`, for every app. server-kit 0.29 codes every refusal of `auth_router`
 * (§12.5 item 3), so the kit words each code itself: the server's `detail` is English on
 * every locale, and the pages recognise the code, never the sentence (§5.2).
 *
 * What it deliberately does not word: billing's codes (`billingRefusalText` has them, with
 * the guest's rule), the demo's other refusals, and the app's own codes, which come from the
 * app's catalogue through `appCode`.
 */

/** The coded refusals {@link describeAccountFailure} words: the sign-in's and the account
 *  routes' ({@link AuthErrorCode}), the account settings' and admin's
 *  ({@link AccountErrorCode}), and the demo's `demo_refused`, which several account routes
 *  answer (an export, a password change). */
export type AccountFailureCode = AuthErrorCode | AccountErrorCode | "demo_refused";

/** Every string {@link describeAccountFailure} says — the `accountFailure` namespace of
 *  `<UiKitProvider labels>`. */
export interface AccountFailureLabels {
  /** One sentence per coded refusal. */
  codes: Record<AccountFailureCode, string>;
  /** No answer at all: offline, DNS, CORS — or a refresh that could not reach the server. */
  offline: string;
  /** The request ran past its timeout. */
  timeout: string;
  /** A 5xx with no code: the server's fault, not the reader's. */
  server: string;
  /** HTTP 429, given the wait its `Retry-After` asks for in seconds, or `undefined`. */
  rateLimited: (seconds?: number) => string;
  /** Anything else. */
  failed: string;
}

// Defined in ./account-failure-labels, which holds no code but the words (0.34, KS U8).
export { DEFAULT_ACCOUNT_FAILURE_LABELS };

/** Every code {@link describeAccountFailure} words, in its table's order — for an app's
 *  tests, and a review that lists them. */
export const ACCOUNT_FAILURE_CODES: readonly AccountFailureCode[] = Object.freeze(
  Object.keys(DEFAULT_ACCOUNT_FAILURE_LABELS.codes) as AccountFailureCode[],
);
const WORDED: ReadonlySet<string> = new Set(ACCOUNT_FAILURE_CODES);

/** What {@link describeAccountFailure} takes beside the error and the words. */
export interface DescribeAccountFailureOptions {
  /**
   * The app's own coded refusals: called with a code the kit does not word, and the body
   * that carries it (its extra fields: a team's name, a limit), answering the app's
   * sentence, or `undefined` to go on. Never asked for one of the kit's codes.
   */
  appCode?: (code: string, body: Record<string, unknown>) => string | undefined;
}

const isBag = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** axios's and Node's names for a request cut off by its timeout. */
const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

/**
 * The sentence for a failed account request, in this order:
 *
 *  1. a request the session refresh could not get through (`isTransientRefreshFailure`)
 *     → `offline`: its own 401 would otherwise read as the session's end;
 *  2. a code the kit words → its sentence;
 *  3. another code → the app's `appCode`, when it has words;
 *  4. a 429 → `rateLimited`, with the wait `Retry-After` asks for;
 *  5. no answer → `timeout` for a cut-off request, else `offline` (axios's error without a
 *     `response`, `fetch`'s TypeError);
 *  6. an uncoded 401 → `codes.session_ended`; a 5xx → `server`; anything else → `failed`.
 *
 * Reads the code and the status wherever the kit's other readers do (`authErrorCode`,
 * `httpStatusOf`: axios, ofetch, a generated client, FastAPI's nested `detail`).
 */
export function describeAccountFailure(
  error: unknown,
  labels: AccountFailureLabels,
  options: DescribeAccountFailureOptions = {},
): string {
  if (isTransientRefreshFailure(error)) return labels.offline;
  const code = authErrorCode(error);
  if (code !== undefined && WORDED.has(code)) return labels.codes[code as AccountFailureCode];
  if (options.appCode) {
    const body = errorBodyWithCode(error, (value) => typeof value === "string" && !WORDED.has(value));
    const own = body ? options.appCode(body.code as string, body) : undefined;
    if (own !== undefined) return own;
  }
  if (isRateLimited(error)) return labels.rateLimited(retryAfterSeconds(error));
  const status = httpStatusOf(error);
  if (status === undefined) {
    if (isBag(error) && typeof error.code === "string" && TIMEOUT_CODES.has(error.code)) return labels.timeout;
    const unanswered = error instanceof TypeError || (isBag(error) && error.isAxiosError === true);
    return unanswered ? labels.offline : labels.failed;
  }
  if (status === 401) return labels.codes.session_ended;
  if (status >= 500) return labels.server;
  return labels.failed;
}

/**
 * {@link describeAccountFailure} with the provider's words: `const describe =
 * useDescribeAccountFailure(); toast.error(describe(error))`, or a card's `describeError`.
 * `labels` overrides the provider's, as every kit namespace does.
 */
export function useDescribeAccountFailure(
  options: DescribeAccountFailureOptions & { labels?: LabelOverride<AccountFailureLabels> } = {},
): (error: unknown) => string {
  const labels = useKitLabels("accountFailure", DEFAULT_ACCOUNT_FAILURE_LABELS, options.labels);
  const { appCode } = options;
  return (error) => describeAccountFailure(error, labels, { appCode });
}

/**
 * A kit form's or card's `describeError`, which each asks FIRST: `undefined` for what the
 * component words itself (the codes in `handled`, a dismissed passkey prompt, an uncoded 4xx
 * it calls a plain failure), the account words for the rest — a code it does not know, no
 * answer, a throttle, the server's fault, the app's own codes. Answering everything would
 * have taken the field-level messages (a wrong password under its field) away from the cards.
 *
 * @internal The account pages' and settings sections'.
 */
export function useFailureBeside(
  handled: readonly KitErrorCode[],
  appCode?: DescribeAccountFailureOptions["appCode"],
): (error: unknown) => string | undefined {
  const labels = useKitLabels("accountFailure", DEFAULT_ACCOUNT_FAILURE_LABELS);
  return (error) => {
    if (error instanceof Error && error.name === "AbortError") return undefined;
    const code = authErrorCode(error);
    if (code !== undefined && handled.includes(code)) return undefined;
    const status = httpStatusOf(error);
    const words = describeAccountFailure(error, labels, { appCode });
    if (code !== undefined || status === undefined || status >= 500 || words !== labels.failed) return words;
    return undefined;
  };
}
