/**
 * What the account's own settings parts share (docs/user-admin-harmonization.md §6):
 * the companies a refusal names and the card's type (the mounted guard re-exported).
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

/** The mounted guard and the callback-to-promise bridge, in `hooks/use-mounted.ts` since
 *  0.52: seven notifications modules imported them from here (refactor audit
 *  2026-10-30, MOD-6). Re-exported for the account parts that still do. */
export { settle, useMounted } from "../hooks/use-mounted";

/** The settings cards' type scale, PasskeysSetting's: a small title and a muted line.
 *  Defined with the card look in settings/ since 0.34 (MOD-8, refactor audit 2026-10). */
export { CARD_DESCRIPTION_CLASS, CARD_TITLE_CLASS } from "../settings/settings-card-classes";
