/**
 * The way back from the provider's checkout (docs/billing-harmonization.md §14.4,
 * decision 20): `?checkout=done` on the app's subscription page — kastlan's
 * `/admin/billing`, keksdose's and Kurvenschmiede's `/settings/subscription`.
 *
 * The checkout request carries NO success URL: a redirect the client chooses is an open
 * redirect, and Paddle's create-transaction takes none. The way back is configuration
 * instead — the pay page's Paddle.js `successUrl` (`checkoutReturnUrl(returnUrl)`), or a
 * hosted checkout's redirect in Paddle's dashboard — and the page that lands reads the
 * marker with {@link isCheckoutReturn}, then drops it with `replace`
 * ({@link withoutCheckoutReturn}) so a reload or a shared link does not count twice.
 *
 * Pure and router-agnostic, and imports nothing: the pay page (`dist/pay/`, no React)
 * bundles this module too. server-kit names the same two values
 * (`CHECKOUT_RETURN_PARAM`, `CHECKOUT_RETURN_VALUE`, `checkout_return_url`) for the
 * deploy notes and its tests.
 */

/** The query parameter of the way back. */
export const CHECKOUT_RETURN_PARAM = "checkout";
/** Its one value: the buyer came back from a completed checkout. */
export const CHECKOUT_RETURN_VALUE = "done";

/** The query of `where`, however the app holds it: a search string ("?a=1"), a whole
 *  URL, `URLSearchParams`, or a location (`{ search }`). */
function paramsOf(where: string | URLSearchParams | { search: string }): URLSearchParams {
  if (where instanceof URLSearchParams) return where;
  const text = typeof where === "string" ? where : where.search;
  const query = text.includes("?") ? text.slice(text.indexOf("?") + 1) : text;
  // A whole URL's hash is not part of its query.
  return new URLSearchParams(query.split("#")[0]);
}

/**
 * Whether the page was reached as the way back from a checkout: `?checkout=done`.
 *
 *     const returned = isCheckoutReturn(location.search);       // react-router's useLocation()
 *     const returned = isCheckoutReturn(searchParams);           // useSearchParams()[0]
 */
export function isCheckoutReturn(where: string | URLSearchParams | { search: string }): boolean {
  return paramsOf(where).get(CHECKOUT_RETURN_PARAM) === CHECKOUT_RETURN_VALUE;
}

/**
 * The same parameters without the marker — every other one kept, in order. A new
 * object; the one passed in is not changed:
 *
 *     setSearchParams((p) => withoutCheckoutReturn(p), { replace: true });
 */
export function withoutCheckoutReturn(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(CHECKOUT_RETURN_PARAM);
  return next;
}

/**
 * The subscription page's way-back URL: `page` with `checkout=done` in its query —
 * after any query it already has, before its hash. A marker already there is replaced,
 * not doubled.
 *
 *     checkoutReturnUrl("https://keksdose.app/settings/subscription")
 *     // → "https://keksdose.app/settings/subscription?checkout=done"
 *
 * What the pay page hands Paddle.js as `successUrl`, and what a hosted checkout's
 * redirect is set to in Paddle's dashboard.
 */
export function checkoutReturnUrl(page: string): string {
  const hashAt = page.indexOf("#");
  const hash = hashAt === -1 ? "" : page.slice(hashAt);
  const beforeHash = hashAt === -1 ? page : page.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  // Kept as written, part by part: a URLSearchParams round trip would re-encode the
  // page's own parameters (a space as "+").
  const kept = (queryAt === -1 ? "" : beforeHash.slice(queryAt + 1))
    .split("&")
    .filter((part) => part !== "" && decodeKey(part) !== CHECKOUT_RETURN_PARAM);
  kept.push(`${CHECKOUT_RETURN_PARAM}=${CHECKOUT_RETURN_VALUE}`);
  return `${path}?${kept.join("&")}${hash}`;
}

/** The decoded key of one `key=value` part of a query. */
function decodeKey(part: string): string {
  const key = part.split("=")[0].replace(/\+/g, " ");
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}
