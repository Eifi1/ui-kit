/**
 * Where the kit review keeps its two pieces of state outside React — both guarded,
 * because reading `sessionStorage`/`localStorage` THROWS where site data is blocked
 * (Safari private browsing, a partitioned webview), and an unguarded read during render
 * is a blank page, not a lost token.
 *
 *  - the review token: `sessionStorage`, so it dies with the tab. keksdose mints it
 *    short-lived and scoped to the review; it is never written to `localStorage`, and it
 *    leaves the URL as soon as the page has read it.
 *  - a development API base: `localStorage`, dev builds only — so the page can be tried
 *    against a local keksdose without a rebuild.
 */

export const TOKEN_KEY = "uikit-kit-review-token";
export const DEV_BASE_KEY = "uikit-kit-review-api-base";

function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // blocked or full — the value lives in React state for this visit
  }
}

const session = () => window.sessionStorage;
const local = () => window.localStorage;

/**
 * The token in memory too, for when `sessionStorage` is blocked. Not a nicety: the
 * showcase's `lazySection` mounts a section a SECOND time on its first re-render after
 * the chunk arrived (it swaps `React.lazy` for the loaded component, a different element
 * type) — and taking the token out of the address is exactly such a re-render. The first
 * mount has stored the token by then; without storage, only this copy carries it over.
 */
let memoryToken: string | null = null;

export const readStoredToken = () => read(session, TOKEN_KEY) || memoryToken;
export const storeToken = (token: string | null) => {
  memoryToken = token;
  write(session, TOKEN_KEY, token);
};

export const readDevBase = () => read(local, DEV_BASE_KEY) || null;
export const storeDevBase = (base: string | null) => write(local, DEV_BASE_KEY, base);

/** An http(s) URL without trailing slashes, or `undefined` for anything else (blank
 *  included) — so a stray space in a repository variable reads as "not configured"
 *  rather than as a base every request fails against. */
export function normaliseBase(raw: string | null | undefined): string | undefined {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : undefined;
  } catch {
    return undefined;
  }
}

/** The build's base (`VITE_REVIEW_API_BASE`), read per call so a test can stub it. */
export const buildBase = () => normaliseBase(import.meta.env.VITE_REVIEW_API_BASE);

/** Whether this is a development build — where the page offers a base field. */
export const isDevBuild = () => Boolean(import.meta.env.DEV);
