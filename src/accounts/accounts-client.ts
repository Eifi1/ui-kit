import type { StoreApi, UseBoundStore } from "zustand";

import type { RegisterValues } from "../auth/register-form";
import type { SignInAnswer, SignInCredentials, SignInNewPasswordValues } from "../auth/sign-in-form";
import { isDemoSession } from "../demo/demo-session";
import { NEXT_PARAM, type PathPattern } from "../landing/routing";
import { documentNavigation } from "../lib/document-navigation";
import { matchesPathPattern, routerPathname } from "../lib/path-pattern";
import type { ServerWakeAxiosConfig } from "../lib/server-wake";
import {
  attachSessionRefresh,
  authorize,
  createSessionRefresh,
  isSignedOutStep,
  markUnanswered,
  watchSessionElsewhere,
  type SessionRenewal,
} from "../lib/session-refresh";
import { dropPushSubscription } from "../notifications/use-push-device";
import { isSharedComputer } from "../offline/shared-computer";
import { createAccountsApi, type AccountsApi } from "./accounts-api";
import { passkeyAssertion } from "./passkey-ceremony";
import { createSessionStore, type AccountSession, type AccountUser, type SharedSessionPlace } from "./session-store";
import type { StoredSession } from "./session-store";
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
 *  - **the bearer** from the stored session on every request to the app's own API (a
 *    request interceptor), never to another host the same instance calls;
 *  - **the refresh**, the kit's flight (`createSessionRefresh` / `attachSessionRefresh`, §11):
 *    one per tab, retried only where waiting helps, never written back over a session that
 *    changed. Its call is a bare `fetch` to `POST /auth/refresh`, never the instance: the
 *    request carries the refresh token in its body, which the app's own interceptors, logs
 *    and crash reports must never see (§11.2 decision 8);
 *  - **the session store** (zustand), kept where §2.14 says: the device's `localStorage`, the
 *    tab's `sessionStorage` after "This is a shared computer", or page memory on the stricter
 *    path;
 *  - **the requests that start a session** — the sign-in, its forced password change, the
 *    sign-up, the passkey finish — each answering the kit's `SignInAnswer`, so `SignInForm`
 *    and `RegisterForm` take them as they are; the three that start one from the form send
 *    `shared_device` (server-kit 0.27), which no app sent before;
 *  - **one sign-out in the contract's order** (§6.3): this device's push, then the session on
 *    the server, both while the token still holds, then the tokens — and a request that
 *    fails or hangs still signs out here;
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
  /** The request's own base URL, axios's default merged in. */
  baseURL?: string;
}

/** One request the client sends on the app's instance itself. `timeout` and `responseType`
 *  are axios's. */
export interface AccountsRequest {
  method: "get" | "post" | "patch" | "delete";
  url: string;
  data?: unknown;
  timeout?: number;
  responseType?: "blob";
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

/** `POST /auth/passkey/login/finish`'s body (server-kit's `PasskeyLoginFinish`): the
 *  challenge `…/begin` answered, and the authenticator's answer as JSON (`credential.toJSON()`,
 *  or the app's encoding of it). The client adds `shared_device`. */
export interface AccountsPasskeyFinish {
  challenge_token: string;
  credential: unknown;
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
  /** The API's base URL: the bearer goes only to URLs under it (a relative URL, or an
   *  absolute one on its origin and path), and `/auth/refresh` is under it. Default
   *  `http.defaults.baseURL`, as axios's other requests go. */
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
   * Tell the server this browser's push subscription goes, at a sign-out (§6.3 step 1).
   * Default `POST /notifications/devices/unregister {endpoint}` on `http` (notifications
   * §3.8). Asked only where this browser holds a subscription, so an app without push sends
   * nothing.
   */
  unregisterPush?: (endpoint: string) => Promise<unknown>;
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
  /** The routes of server-kit's `auth_router` and the admin's invitations, typed, on `http`
   *  (`accountsApi`, §12.9). They keep nothing: what an answer changes is the caller's. */
  api: AccountsApi<U>;
  /** The session store: `client.useSession((s) => s.user)` in a component,
   *  `client.useSession.getState()` outside one. Read it; write it only through the
   *  client, which keeps the stored copy beside it. */
  useSession: UseBoundStore<StoreApi<AccountSession<U>>>;
  /** The access token the next request sends, `null` while signed out. Read from the
   *  storage, where another tab's renewal lands too. */
  currentToken(): string | null;
  /**
   * `POST /auth/login {email, password, shared_device}` — `SignInForm`'s `onSubmit` as it is.
   * Resolves the kit's answer: `signed-in` once the session is kept (where the
   * shared-computer box says), or the challenge (`password-change` with the server's app
   * fields as `extra`; `2fa` from a server that asks for one). A refusal rejects with the
   * client's own error, so `authErrorCode` reads its code; nothing is kept.
   */
  signIn(credentials: SignInCredentials): Promise<SignInAnswer>;
  /** `POST /auth/login/set-password {challenge_token, new_password}`, the forced change —
   *  `SignInForm`'s `onSetPassword` as it is. Its challenge carries the box, so it sends
   *  nothing of it. */
  setPassword(values: SignInNewPasswordValues): Promise<SignInAnswer>;
  /** `POST /auth/passkey/login/finish {challenge_token, credential, shared_device}`, the end of
   *  `SignInForm`'s `onPasskey` once the browser's ceremony has answered. */
  passkeyFinish(body: AccountsPasskeyFinish): Promise<SignInAnswer>;
  /**
   * The whole passkey sign-in, `SignInForm`'s `onPasskey` as it is: `POST
   * /auth/passkey/login/begin`, the browser's prompt (no library: the kit converts the JSON
   * itself), then {@link passkeyFinish}. Closing the prompt rejects with an `AbortError`,
   * which the form passes over in silence. Pass it only where `passkeysAvailable()`.
   */
  signInWithPasskey(): Promise<SignInAnswer>;
  /**
   * `POST /auth/register`: `RegisterForm`'s values in the wire's names (`first_name`,
   * `last_name`, …), the app's own fields from `extra` (`invite_token` from the link,
   * `device_timezone`, kastlan's company), and `shared_device` — the box's, whatever `extra`
   * says (server-kit 0.27: a sign-up starts a session as a sign-in does). Resolves the
   * account once its session is kept; a refusal rejects with the client's own error.
   */
  register(values: RegisterValues, extra?: Readonly<Record<string, unknown>>): Promise<U>;
  /**
   * Keep a session another route answered: a password change's fresh pair (`POST
   * /auth/me/password`, §6.3), a demo start, an invitation accepted. The same account is
   * renewed where its session is, its refresh token kept if the answer brings none; another
   * account, or none before, starts as a sign-in does (placed by the box, the one before
   * `"replaced"`). Throws a TypeError for an answer that holds no session.
   */
  storeSession(answer: AccountTokens<U>): void;
  /** A newer copy of the account (`GET /auth/me`, `PATCH /auth/me`), kept beside the tokens.
   *  Nothing while signed out. */
  setUser(user: U): void;
  /**
   * Sign out (§6.3, §2.15, §2.16), in this order, while the token still holds:
   *  1. this device's push goes (`dropPushSubscription(unregisterPush)`), which never rejects;
   *  2. `DELETE /auth/sessions/current` ends this session on the server (not `POST
   *     /auth/logout`, which ends every session); an access token that ran out is renewed
   *     for it first, by the refresh;
   *  3. the tokens go, wherever they were kept; `onSessionEnded({ reason: "signed-out" })`;
   *     the sign-in page (a demo's: its end page), with a full load.
   *
   * A request that fails — refused, offline, a session the server had already ended — still
   * signs out here, and each is given 15 s: the server's own limits end a session it never
   * heard was given up (a shared computer's within 15 minutes). Never rejects but for the
   * app's own `onSessionEnded` throwing. A second call while one runs joins it. A plain
   * function, so `useSharedComputerIdleSignOut({ onSignOut: client.signOut })` takes it.
   *
   * `{ everywhere: true }` ("Sign out everywhere", §6.3) sends `POST /auth/logout`, which ends
   * every session of the account, in step 2's place.
   */
  signOut(options?: { everywhere?: boolean }): Promise<void>;
  /** Eject the interceptors and stop watching other tabs: for a test, or a hot reload. */
  detach(): void;
}

/** axios's `combineURLs`: one slash between the base and the path. */
const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

/** axios's `isAbsoluteURL`: a scheme, or protocol-relative. axios sends it past `baseURL`. */
const isAbsoluteUrl = (url: string) => /^([a-z][a-z\d+.-]*:)?\/\//i.test(url);

/** Whether `url` lies under `base`, both read against the page as the browser reads them:
 *  the same origin, and the base's path a whole segment of the URL's (`/v1` is not `/v1x`). */
function liesUnder(url: string, base: string): boolean {
  const page = typeof window !== "undefined" ? window.location.href : "http://localhost/";
  try {
    const target = new URL(url, page);
    const root = new URL(base || "/", page);
    const prefix = root.pathname.endsWith("/") ? root.pathname : `${root.pathname}/`;
    return target.origin === root.origin && `${target.pathname}/`.startsWith(prefix);
  } catch {
    // A URL the parser refuses is no URL of the API's.
    return false;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** @internal Whether an answer is a session (`TokenResponse`), not a challenge. */
export function isTokens<U extends AccountUser>(value: unknown): value is AccountTokens<U> {
  if (!isRecord(value) || typeof value.access_token !== "string" || value.access_token === "") return false;
  const { user } = value;
  return isRecord(user) && (typeof user.id === "number" || typeof user.id === "string");
}

/** How long each request of a sign-out is given, then it goes on without it: the 15 s the
 *  refresh gives an attempt and the push helpers give the browser (§11.2 decision 5). A press
 *  on "Sign out" is never left hanging on a stalled network or a server waking up. */
const SIGN_OUT_STEP_MS = 15_000;

/** `work`, settled or not after `ms`: resolves either way, and never rejects. */
async function within(work: () => Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cut = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  const done = Promise.resolve()
    .then(work)
    .then(
      () => undefined,
      () => undefined,
    );
  try {
    await Promise.race([done, cut]);
  } finally {
    clearTimeout(timer);
  }
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

  /** The sign-out under way: a second press joins it, and the refresh's end defers to it. */
  let signingOut: Promise<void> | null = null;
  const unregisterPush =
    options.unregisterPush ??
    ((endpoint: string) =>
      http.request({ method: "post", url: "/notifications/devices/unregister", data: { endpoint } }));

  // ── The bearer ──────────────────────────────────────────────────────────────
  // Only to the app's own API: the instance may also call another host (a map's tiles, a
  // payment provider), and a token stamped on every request would have gone there too. A
  // relative URL goes to the request's base URL; an absolute one must lie under the API's.
  const apiBase = options.baseURL ?? http.defaults?.baseURL ?? "";
  const forApi = (url: string, base?: string) =>
    liesUnder(isAbsoluteUrl(url) ? url : joinUrl(base ?? apiBase, url), apiBase);
  // Read from the storage at each request, where the refresh's stamp reads it: another
  // tab's renewal is sent at once, and a request is never stamped with one token and sent
  // with another.
  const bearer = http.interceptors.request.use(
    (config) => {
      const token = store.token();
      if (token && forApi(config.url ?? "", config.baseURL)) authorize(config, token);
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
    // Another host's 401 is about that host, never this session: it refreshes nothing and is
    // never replayed, so the renewed token cannot go out to it either.
    isSignedOutStep: (url) => !forApi(url) || isSignedOutStep(url),
    onEnded: ({ demo }) => {
      // The sign-out's own revoke found the session over: the sign-out ends it, once.
      if (signingOut) return;
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

  // ── Starting a session ──────────────────────────────────────────────────────
  const toStored = (answer: AccountTokens<U>, before: StoredSession<U> | null): StoredSession<U> => ({
    token: answer.access_token,
    refreshToken: answer.refresh_token ?? (before?.user.id === answer.user.id ? before.refreshToken : null),
    user: answer.user,
  });
  /** A sign-in: kept where the box says now. Another account's session before it is gone
   *  from this tab, and the app drops what that account left here (Kurvenschmiede's F33:
   *  the next account was handed the last one's cached lists). */
  const begin = (answer: AccountTokens<U>) => {
    const before = store.read();
    const previous = before?.user ?? useSession.getState().user;
    if (previous !== null && previous.id !== answer.user.id) {
      ended({ reason: "replaced", user: previous, demo: options.demo !== undefined && isDemoSession(previous) }, null);
    }
    store.begin(toStored(answer, before));
  };

  /** A sign-in route's answer, as `SignInForm` reads it (§5.1). */
  const answerOf = (data: unknown): SignInAnswer => {
    if (isRecord(data) && typeof data.challenge_token === "string") {
      const { requires_password_change, requires_2fa, challenge_token, ...extra } = data;
      if (requires_password_change === true) {
        return Object.keys(extra).length > 0
          ? { kind: "password-change", challengeToken: challenge_token, extra }
          : { kind: "password-change", challengeToken: challenge_token };
      }
      if (requires_2fa === true) return { kind: "2fa", challengeToken: challenge_token };
    }
    if (!isTokens<U>(data)) throw new TypeError("the sign-in answered neither a session nor a challenge");
    begin(data);
    return { kind: "signed-in" };
  };
  const post = async (url: string, data: unknown) => (await http.request({ method: "post", url, data })).data;

  const api = createAccountsApi<U>(http);
  const passkeyFinish = async (body: AccountsPasskeyFinish) =>
    answerOf(await post("/auth/passkey/login/finish", { ...body, shared_device: isSharedComputer() }));

  return {
    api,
    useSession,
    currentToken: () => store.token(),
    signIn: async ({ email, password }) =>
      answerOf(await post("/auth/login", { email, password, shared_device: isSharedComputer() })),
    setPassword: async ({ challengeToken, password }) =>
      answerOf(await post("/auth/login/set-password", { challenge_token: challengeToken, new_password: password })),
    passkeyFinish,
    async signInWithPasskey() {
      const begin = await api.passkeyLoginBegin();
      const credential = await passkeyAssertion(begin.options);
      return passkeyFinish({ challenge_token: begin.challenge_token, credential });
    },
    async register({ firstName, lastName, email, password, locale }, extra) {
      const data = await post("/auth/register", {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        locale,
        ...extra,
        shared_device: isSharedComputer(),
      });
      if (!isTokens<U>(data)) throw new TypeError("POST /auth/register answered no session");
      begin(data);
      return data.user;
    },
    storeSession(answer) {
      if (!isTokens<U>(answer)) throw new TypeError("storeSession takes a session: access_token and user");
      const before = store.read();
      if (before?.user.id === answer.user.id) store.keep(toStored(answer, before));
      else begin(answer);
    },
    setUser: (user) => store.setUser(user),
    signOut(signOutOptions) {
      signingOut ??= (async () => {
        const user = store.read()?.user ?? useSession.getState().user;
        const demo = options.demo !== undefined && isDemoSession(user);
        // Both requests need the token; with none, there is nothing to tell the server.
        if (store.token() !== null) {
          await within(() => dropPushSubscription(unregisterPush), SIGN_OUT_STEP_MS);
          if (store.token() !== null) {
            const revoke: AccountsRequest = signOutOptions?.everywhere
              ? { method: "post", url: "/auth/logout", timeout: SIGN_OUT_STEP_MS }
              : { method: "delete", url: "/auth/sessions/current", timeout: SIGN_OUT_STEP_MS };
            await within(() => http.request(revoke), SIGN_OUT_STEP_MS);
          }
        }
        store.drop();
        ended({ reason: "signed-out", user, demo }, demo ? (options.demo?.endedPath ?? "/demo/ended") : signInPath);
      })().finally(() => {
        signingOut = null;
      });
      return signingOut;
    },
    detach() {
      http.interceptors.request.eject(bearer);
      detachRefresh();
      stopWatching();
      if (typeof window !== "undefined") window.removeEventListener("storage", takeUp);
    },
  };
}
