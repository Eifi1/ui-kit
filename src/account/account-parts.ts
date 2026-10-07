import { useEffect, useRef } from "react";

/**
 * What the account's own settings parts share (docs/user-admin-harmonization.md §6):
 * the companies a refusal names, a mounted guard, and the card's type.
 *
 * @internal Not part of the barrel; the parts are.
 */

type Bag = Record<string, unknown>;

const isBag = (value: unknown): value is Bag => typeof value === "object" && value !== null;

/** `companies` on a parsed body, or under FastAPI's nested `detail`: a list of names. */
function companiesOfBody(body: unknown): string[] | undefined {
  if (!isBag(body)) return undefined;
  const pick = (value: unknown) =>
    Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string")
      ? (value as string[])
      : undefined;
  return pick(body.companies) ?? (isBag(body.detail) ? pick(body.detail.companies) : undefined);
}

/**
 * The companies a `last_admin` refusal names — kastlan checks the last admin per company
 * and answers `409 {detail, code: "last_admin", companies: ["Example AG"]}` (§6.4,
 * server-kit's `AccountError(…, extra={"companies": …})`). Read where `authErrorCode`
 * reads the code: axios' `response.data`, ofetch's `data`, a generated client's `body`,
 * a body thrown as it came. `undefined` when there is no such list.
 */
export function refusalCompanies(err: unknown): string[] | undefined {
  if (!isBag(err)) return undefined;
  const response = err.response;
  return (
    (isBag(response) ? companiesOfBody(response.data) : undefined) ??
    companiesOfBody(err.data) ??
    companiesOfBody(err.body) ??
    companiesOfBody(err)
  );
}

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
 *  nothing (done at once), a promise, or throw before it returns one. */
export function settle(call: () => unknown): Promise<unknown> {
  try {
    return Promise.resolve(call());
  } catch (error) {
    return Promise.reject(error);
  }
}

/** The settings cards' type scale, PasskeysSetting's: a small title and a muted line. */
export const CARD_TITLE_CLASS = "text-sm font-medium";
export const CARD_DESCRIPTION_CLASS = "text-xs text-[var(--text-muted)]";
