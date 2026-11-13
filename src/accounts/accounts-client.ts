import type { StoreApi, UseBoundStore } from "zustand";

import { isDemoSession } from "../demo/demo-session";
import { NEXT_PARAM, type PathPattern } from "../landing/routing";
import { documentNavigation } from "../lib/document-navigation";
import { matchesPathPattern, routerPathname } from "../lib/path-pattern";
import type { ServerWakeAxiosConfig } from "../lib/server-wake";
import {
  attachSessionRefresh,
  authorize,
  createSessionRefresh,
  markUnanswered,
  watchSessionElsewhere,
  type SessionRenewal,
} from "../lib/session-refresh";
import { createSessionStore, type AccountSession, type AccountUser, type SharedSessionPlace } from "./session-store";
import { sessionKey } from "./storage-entries";

/**
 * The session client of `@eifi1/ui-kit/accounts` (docs/auth-harmonization.md §12.9): one
 * `createAccountsClient(...)` per app, on the app's own axios instance, in place of the
 * session plumbing every app wrote for itself — Kurvenschmiede's `client.ts`,
 * `auth-store.ts` and `session-place.ts`, about 1,200 lines with their tests, most of it the
 * same in all three apps and wrong in different places in each (the inventory of
 * 2026-11-13: no `shared_device`, a sign-out that ended no server session).
 *
 * What it does, against server-kit's `auth_router` (0.29):
 *  - **the bearer** from the stored session on every request (a request interceptor);
 *  - **the refresh**, the kit's flight (`createSessionRefresh` / `attachSessionRefresh`, §11):
 *    one per tab, retried only where waiting helps, never written back over a session that
 *    changed. Its call is a bare `fetch` to `POST /auth/refresh`, never the instance: the
 *    request carries the refresh token in its body, which the app's own interceptors, logs
 *    and crash reports must never see (§11.2 decision 8);
 *  - **the session store** (zustand), kept where §2.14 says: the device's `localStorage`, the
 *    tab's `sessionStorage` after "This is a shared computer", or page memory on the stricter
 *    path;
 *  - **a session that ends without this tab signing out** — the renewal refused, a demo's
 *    401, a sign-out or another account's sign-in in another tab (`watchSessionElsewhere`) —
 *    drops what this tab holds, tells the app (`onSessionEnded`), and leaves a page that
 *    needs a session.
 *
 * What it deliberately does not do: render anything (it has no words), decide the app's
 * routes, or touch the app's query cache — `onSessionEnded` is where the app drops what an
 * account left in the tab.
 */

/** The request config fields the client reads and writes — axios's request config has them
 *  all. */
interface AccountsAxiosConfig extends ServerWakeAxiosConfig {
  /** axios's `AxiosHeaders` (written through its `set`), or a plain record. */
  headers?: unknown;
}

/** One request the client sends on the app's instance itself. `timeout` is axios's. */
export interface AccountsRequest {
  method: "post" | "delete";
  url: string;
  data?: unknown;
  timeout?: number;
}

/** An interceptor manager, structurally. The callback is generic so that axios's — typed
 *  with ITS config, which has more required fields than the kit reads — fits as it is. */
interface InterceptorsLike<V> {
  use(onFulfilled: <T extends V>(value: T) => T | Promise<T>, onRejected: (error: unknown) => unknown): number;
  eject(id: number): void;
}

/**
 * The app's axios instance, structurally, so the kit never imports axios (as
 * `attachServerWake` and `attachSessionRefresh` take it): `axios.create()`'s result fits as
 * it is. `request` sends the client's own calls (the sign-in, the revoke) and the
 * refresh's replays; `defaults.baseURL` is where the bare refresh goes unless `baseURL`
 * says otherwise.
 */
export interface AccountsHttp {
  interceptors: {
    request: InterceptorsLike<AccountsAxiosConfig>;
    response: InterceptorsLike<{ config: AccountsAxiosConfig }>;
  };
  request(config: AccountsRequest | AccountsAxiosConfig): Promise<{ data?: unknown }>;
  defaults?: { baseURL?: string };
}

/** A session as server-kit's routes answer it (`TokenResponse`: the sign-in, the sign-up,
 *  the refresh, a password change's fresh pair). `refresh_token` is `null` for a session
 *  that cannot be renewed, a demo's. */
export interface AccountTokens<U extends AccountUser = AccountUser> {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  user: U;
  /** When the access token ends, ISO-8601 in UTC; a demo's countdown reads it. */
  expires_at?: string | null;
}

/** What {@link AccountsClientOptions.onSessionEnded} is told. */
export interface AccountSessionEnd<U extends AccountUser = AccountUser> {
  /**
   * How it ended:
   * - `"signed-out"`: this tab's {@link AccountsClient.signOut};
   * - `"ended"`: the server refused the renewal (`session_ended`: expired, revoked, a
   *   shared computer's idle limit), or a demo's 401;
   * - `"elsewhere"`: signed out, or signed in as another account, in another tab — or this
   *   page came back from the back/forward cache after that;
   * - `"replaced"`: a sign-in as another account over this one, in this tab. The page stays.
   */
  reason: "signed-out" | "ended" | "elsewhere" | "replaced";
  /** The account that was signed in, `null` when the tab held none. */
  user: U | null;
  /** Whether it was a demo (only with {@link AccountsClientOptions.demo}). */
  demo: boolean;
}

/** What {@link createAccountsClient} takes. */
export interface AccountsClientOptions<U extends AccountUser = AccountUser> {
  /**
   * The app's axios instance: `axios.create({ baseURL: "/api/v1" })`. The client adds a
   * request interceptor (the bearer) and the session refresh's two. Create the client
   * AFTER `attachServerWake(http)` and the app's own response interceptors: the refresh's
   * goes last, so each of those sees a 401 settle before the refresh is awaited (§11.3).
   */
  http: AccountsHttp;
  /** Put verbatim in front of every key the client keeps (`"staunlabor."` →
   *  `staunlabor.session`): {@link accountStorageEntries} lists them for the privacy page. */
  storagePrefix: string;
  /**
   * The pages that answer without a session, as React Router matches them: a string is
   * that path and everything under it (`"/exhibits"` is every exhibit; `"/"` only `/`), a
   * RegExp is tested on the decoded path (`/^\/steering$/` for one page whose sub-pages
   * are private). A session that ends on one of them leaves the reader where they are; on
   * any other page it goes to the sign-in. Listing the public pages rather than the private
   * ones is Kurvenschmiede's rule: the private list is the one that grows, and a page
   * forgotten there would have been left standing with nothing behind it.
   */
  publicPaths: readonly PathPattern[];
  /** The sign-in page. Default `"/login"`. A session that ended under a private page goes
   *  there with `?next=` that page. */
  signInPath?: string;
  /** Where a private page goes when another tab signed in as another account: that page was
   *  the last account's. Default `"/"`. */
  homePath?: string;
  /** Where `/auth/refresh` is: the API's base URL. Default `http.defaults.baseURL`, as
   *  axios's other requests go. */
  baseURL?: string;
  /** Where a sign-in with "This is a shared computer" is kept: `"tab"` (the default) or the
   *  stricter `"memory"` (§2.14). */
  sharedSession?: SharedSessionPlace;
  /**
   * The session is over in this tab: drop what else the account left here — the query
   * cache (`queryClient.clear()`), an offline copy, a tour cache. Called once per end,
   * after the client has dropped the session and before it leaves the page. Not called for
   * a session that was never there.
   */
  onSessionEnded?: (end: AccountSessionEnd<U>) => void;
  /**
   * The demo (docs/landing-demo-harmonization.md §5.5), off unless given: an `is_demo`
   * account's 401 then ends the demo at `endedPath` (default `"/demo/ended"`) with no
   * refresh tried, as every end of a demo does.
   */
  demo?: { endedPath?: string };
  /**
   * How the client leaves the page when a session ends: given the address to load, or this
   * page's own (`pathname + search + hash`) to load it again. Default a full load
   * (`location.replace`, or `location.reload` for this page), so nothing of the account
   * stays in the tab's memory. A test passes a spy.
   */
  navigate?: (href: string) => void;
  /** The `fetch` the refresh goes out on. Default the browser's; `wrapFetch(fetch,
   *  serverWake)` counts it as a cold start's wait. */
  fetch?: typeof fetch;
}

/** What {@link createAccountsClient} answers. */
export interface AccountsClient<U extends AccountUser = AccountUser> {
  /** The session store: `client.useSession((s) => s.user)` in a component,
   *  `client.useSession.getState()` outside one. Read it; write it only through the
   *  client, which keeps the stored copy beside it. */
  useSession: UseBoundStore<StoreApi<AccountSession<U>>>;
  /** The access token the next request sends, `null` while signed out. Read from the
   *  storage, where another tab's renewal lands too. */
  currentToken(): string | null;
  /** A newer copy of the account (`GET /auth/me`, `PATCH /auth/me`), kept beside the tokens.
   *  Nothing while signed out. */
  setUser(user: U): void;
  /** Eject the interceptors and stop watching other tabs: for a test, or a hot reload. */
  detach(): void;
}

/** axios's `combineURLs`: one slash between the base and the path. */
const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** @internal Whether an answer is a session (`TokenResponse`), not a challenge. */
export function isTokens<U extends AccountUser>(value: unknown): value is AccountTokens<U> {
  if (!isRecord(value) || typeof value.access_token !== "string" || value.access_token === "") return false;
  const { user } = value;
  return isRecord(user) && (typeof user.id === "number" || typeof user.id === "string");
}

/** A renewal as the client's `store` writes it. */
interface Renewal<U> extends SessionRenewal {
  refreshToken: string | null;
  user: U;
}

/**
 * The session client, once per app, at module scope beside its axios instance:
 *
 * ```ts
 * export const api = axios.create({ baseURL: "/api/v1" });
 * attachServerWake(api, serverWake);
 * export const accounts = createAccountsClient<User>({
 *   http: api,
 *   storagePrefix: "staunlabor.",
 *   publicPaths: ["/", "/exhibits", "/about", "/impressum", "/privacy", "/login", "/register"],
 *   onSessionEnded: () => queryClient.clear(),
 * });
 * ```
 *
 * The session is read from the storage at once, so a reload starts signed in with no
 * rehydration to wait for.
 */
export function createAccountsClient<U extends AccountUser = AccountUser>(
  options: AccountsClientOptions<U>,
): AccountsClient<U> {
  const { http, signInPath = "/login", homePath = "/" } = options;
  const store = createSessionStore<U>({ key: sessionKey(options.storagePrefix), sharedSession: options.sharedSession });
  const { useSession } = store;
  const fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const refreshUrl = joinUrl(options.baseURL ?? http.defaults?.baseURL ?? "", "auth/refresh");

  const isDemo = () => options.demo !== undefined && isDemoSession(useSession.getState().user);
  const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const needsSession = (pathname: string) => {
    const path = routerPathname(pathname);
    return !options.publicPaths.some((pattern) => matchesPathPattern(path, pattern));
  };
  const withNext = (path: string, next: string) =>
    `${path}${path.includes("?") ? "&" : "?"}${NEXT_PARAM}=${encodeURIComponent(next)}`;
  const navigate =
    options.navigate ??
    ((href: string) => (href === here() ? documentNavigation.reload() : documentNavigation.replace(href)));

  /** Tell the app, then leave: the navigation happens even when the app's handler throws. */
  const ended = (end: AccountSessionEnd<U>, leaveTo: string | null) => {
    try {
      options.onSessionEnded?.(end);
    } finally {
      if (leaveTo !== null) navigate(leaveTo);
    }
  };

  // ── The bearer ──────────────────────────────────────────────────────────────
  // Read from the storage at each request, where the refresh's stamp reads it: another
  // tab's renewal is sent at once, and a request is never stamped with one token and sent
  // with another.
  const bearer = http.interceptors.request.use(
    (config) => {
      const token = store.token();
      if (token) authorize(config, token);
      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── The refresh ─────────────────────────────────────────────────────────────
  const session = createSessionRefresh<Renewal<U>>({
    // A bare fetch, never `http`: the body holds the refresh token. It writes nothing; the
    // kit hands the answer to `store`, and only while the session it renews is still this
    // tab's.
    refresh: async (signal) => {
      const refreshToken = store.read()?.refreshToken;
      if (!refreshToken) return null;
      let response: Response;
      try {
        response = await fetchImpl(refreshUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
          signal,
        });
      } catch (error) {
        // fetch's network failure is a TypeError: marked, it is retried as axios's is.
        throw isRecord(error) ? markUnanswered(error) : error;
      }
      // The status alone: the error carries no body and no request, so nothing that keeps
      // it can print the token.
      if (!response.ok) {
        throw Object.assign(new Error(`POST /auth/refresh answered ${response.status}`), { status: response.status });
      }
      const answer: unknown = await response.json();
      if (!isTokens<U>(answer)) throw new TypeError("POST /auth/refresh answered no session");
      return { token: answer.access_token, refreshToken: answer.refresh_token ?? null, user: answer.user };
    },
    // A renewal without a refresh token keeps the stored one (§11.3, keksdose's rule); its
    // user replaces the stored account, so a role changed on the server shows (kk 3).
    store: ({ token, refreshToken, user }) =>
      store.keep({ token, refreshToken: refreshToken ?? store.read()?.refreshToken ?? null, user }),
    currentToken: () => store.token(),
    isDemo,
    onEnded: ({ demo }) => {
      const { token, user } = useSession.getState();
      // A 401 in a tab that holds no session (`not_signed_in` on a public page): nothing ends.
      if (token === null && store.read() === null) return;
      store.drop();
      const leaveTo = demo
        ? (options.demo?.endedPath ?? "/demo/ended")
        : needsSession(window.location.pathname)
          ? withNext(signInPath, here())
          : null;
      ended({ reason: "ended", user, demo }, leaveTo);
    },
  });
  const detachRefresh = attachSessionRefresh(http, session);

  // ── Another tab ─────────────────────────────────────────────────────────────
  /** This tab holds a session, and the storage no longer holds that account's. */
  const endedElsewhere = () => {
    const { token, user } = useSession.getState();
    if (token === null || user === null) return false;
    return store.read()?.user.id !== user.id;
  };
  const stopWatching = watchSessionElsewhere({
    ended: endedElsewhere,
    // Not the sign-out: the other tab has removed what the device kept, and may since have
    // stored a session that is not this tab's to delete. Only this tab's state goes.
    onEnded: () => {
      const { user } = useSession.getState();
      const demo = isDemo();
      const signedOut = store.read() === null;
      store.forget();
      const leaveTo =
        demo && signedOut
          ? (options.demo?.endedPath ?? "/demo/ended")
          : needsSession(window.location.pathname)
            ? signedOut
              ? signInPath
              : homePath
            : here();
      ended({ reason: "elsewhere", user, demo }, leaveTo);
    },
  });
  /** Another tab's renewal of the same account: the store shows its token and account. */
  const takeUp = () => {
    const now = store.read();
    const { token, user } = useSession.getState();
    if (now && user !== null && now.user.id === user.id && now.token !== token) store.adopt();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", takeUp);

  return {
    useSession,
    currentToken: () => store.token(),
    setUser: (user) => store.setUser(user),
    detach() {
      http.interceptors.request.eject(bearer);
      detachRefresh();
      stopWatching();
      if (typeof window !== "undefined") window.removeEventListener("storage", takeUp);
    },
  };
}
