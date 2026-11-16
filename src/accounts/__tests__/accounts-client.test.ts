import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { documentNavigation } from "../../lib/document-navigation";
import { isTransientRefreshFailure } from "../../lib/session-refresh";
import { createAccountsClient } from "../accounts-client";
import type { AccountsClientOptions } from "../accounts-client";
import { fakeFetch, fakeHttp, tokens } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";

/**
 * The session half of `@eifi1/ui-kit/accounts` (docs/auth-harmonization.md §12.9): the
 * bearer from the stored session, the refresh through the kit's flight (§11) over a bare
 * `fetch`, and the three ways a session ends without this tab signing out — the server
 * refusing the renewal, a demo's 401, another tab. Kurvenschmiede's client.ts, for every app.
 */

const KEY = "app.session";
type User = { id: number; email: string; is_demo?: boolean };
const ada: User = { id: 1, email: "ada@example.com" };
const stored = (token: string, refreshToken: string | null = "r1", user: User = ada) =>
  localStorage.setItem(KEY, JSON.stringify({ token, refreshToken, user }));
const record = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;

function setup(
  options: {
    valid?: string[];
    server?: (config: Cfg) => Answer | Promise<Answer>;
    refresh?: Parameters<typeof fakeFetch>[0];
  } & Partial<AccountsClientOptions<User>> = {},
) {
  const valid = new Set(options.valid ?? ["a2"]);
  const http = fakeHttp(
    options.server ??
      ((config) => {
        const bearer = String(config.headers?.Authorization ?? "").replace(/^Bearer /, "");
        return valid.has(bearer)
          ? { status: 200, data: { ok: true } }
          : { status: 401, data: { code: "session_ended" } };
      }),
  );
  const fetch = fakeFetch(
    options.refresh ??
      ((body) => ({ status: 200, data: tokens("a2", body.refresh_token, { ...ada, email: "new@x" }) })),
  );
  const navigate = vi.fn();
  const onSessionEnded = vi.fn();
  const client = createAccountsClient<User>({
    http,
    storagePrefix: "app.",
    publicPaths: ["/", "/exhibits", /^\/about$/],
    fetch,
    navigate,
    onSessionEnded,
    ...options,
  });
  return { client, http, fetch, navigate, onSessionEnded };
}

let detach: (() => void) | undefined;
function track<T extends { client: { detach(): void } }>(made: T): T {
  detach = () => made.client.detach();
  return made;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/settings?tab=profile#name");
});
afterEach(() => {
  detach?.();
  detach = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const settle = <T>(p: Promise<T>) =>
  p.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

describe("the bearer", () => {
  it("sends the stored access token on every request, and none while signed out", async () => {
    const { client, http } = track(setup({ valid: ["a1"] }));
    await settle(http.get("/open"));
    expect(http.sent[0]!.bearer).toBeNull();
    stored("a1");
    await http.get("/me");
    expect(http.sent[1]!.bearer).toBe("Bearer a1");
    expect(client.currentToken()).toBe("a1");
  });

  it("goes only to the app's own API: never to another host, nor beside the base URL", async () => {
    stored("a1");
    const { http } = track(setup({ valid: ["a1"], baseURL: "https://api.example/v1" }));
    for (const url of ["/me", "https://api.example/v1/me", "https://API.example/v1/me?x=1"]) {
      await http.get(url);
    }
    for (const url of [
      "https://maps.example/tiles/1",
      "https://api.example/v2/me",
      "https://api.example/v1x",
      "//cdn.example/a",
    ]) {
      await settle(http.get(url));
    }
    expect(http.sent.map((c) => [c.url, c.bearer])).toEqual([
      ["/me", "Bearer a1"],
      ["https://api.example/v1/me", "Bearer a1"],
      ["https://API.example/v1/me?x=1", "Bearer a1"],
      ["https://maps.example/tiles/1", null],
      ["https://api.example/v2/me", null],
      ["https://api.example/v1x", null],
      ["//cdn.example/a", null],
    ]);
  });

  it("reads a relative base URL against the page, so a same-origin absolute URL under it is the API's", async () => {
    stored("a1");
    const { http } = track(setup({ valid: ["a1"] }));
    await http.get(`${window.location.origin}/api/v1/me`);
    await settle(http.get(`${window.location.origin}/other/me`));
    expect(http.sent.map((c) => c.bearer)).toEqual(["Bearer a1", null]);
  });

  it("never refreshes for another host's 401, nor replays the token to it", async () => {
    stored("a1");
    const { http, fetch, onSessionEnded } = track(setup({ valid: ["a1"] }));
    const r = await settle(http.get("https://maps.example/tiles/1"));
    expect(r.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(http.sent.map((c) => c.bearer)).toEqual([null]);
  });

  it("shows the stored session in the store from the start", () => {
    stored("a1");
    const { client } = track(setup());
    expect(client.useSession.getState()).toEqual({ token: "a1", user: ada });
  });
});

describe("the refresh", () => {
  it("renews a session whose token ran out over a bare fetch, and replays the request with the new token", async () => {
    stored("a1");
    const { client, http, fetch } = track(setup());
    const res = await http.get("/me");
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("/api/v1/auth/refresh");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ refresh_token: "r1" });
    // The refresh never went through the app's instance, its interceptors or its logs.
    expect(http.sent.map((c) => c.url)).toEqual(["/me", "/me"]);
    expect(http.sent[1]!.bearer).toBe("Bearer a2");
    expect(record()).toEqual({ token: "a2", refreshToken: "r1", user: { ...ada, email: "new@x" } });
    expect(client.useSession.getState()).toEqual({ token: "a2", user: { ...ada, email: "new@x" } });
  });

  it("keeps the stored refresh token when the renewal brings none", async () => {
    stored("a1", "r1");
    const { http } = track(setup({ refresh: () => ({ status: 200, data: tokens("a2", null, ada) }) }));
    await http.get("/me");
    expect(record()).toEqual({ token: "a2", refreshToken: "r1", user: ada });
  });

  it("joins a base URL that ends in a slash as axios joins it", async () => {
    stored("a1");
    const { fetch, http } = track(setup({ baseURL: "https://api.example/v1/" }));
    await http.get("/me");
    expect(fetch.mock.calls[0]![0]).toBe("https://api.example/v1/auth/refresh");
  });

  it("goes out on the browser's fetch by default, at the origin's /auth/refresh without a base URL", async () => {
    stored("a1");
    const browserFetch = fakeFetch((body) => ({ status: 200, data: tokens("a2", body.refresh_token, ada) }));
    vi.stubGlobal("fetch", browserFetch);
    try {
      const http = fakeHttp((config) => ({ status: config.headers?.Authorization === "Bearer a2" ? 200 : 401 }), null);
      track({
        client: createAccountsClient<User>({ http, storagePrefix: "app.", publicPaths: [], navigate: vi.fn() }),
      });
      expect((await http.get("/me")).status).toBe(200);
      expect(browserFetch.mock.calls[0]![0]).toBe("/auth/refresh");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps an account whose id is a string (a UUID), as one whose id is a number", async () => {
    const uuid = { id: "0b9d…", email: "u@example.com" } as unknown as User;
    stored("a1", "r1", uuid);
    const { client, http } = track(
      setup({ refresh: (body) => ({ status: 200, data: tokens("a2", body.refresh_token, uuid as never) }) }),
    );
    await http.get("/me");
    expect(client.useSession.getState().user).toEqual(uuid);
  });

  it("a refresh the server refuses ends the session: gone from the storage and the store, the app told, a private page off to the sign-in with ?next=", async () => {
    stored("a1");
    const { client, http, navigate, onSessionEnded } = track(
      setup({ refresh: () => ({ status: 401, data: { code: "session_ended" } }) }),
    );
    const r = await settle(http.get("/me"));
    expect(r.ok).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(client.useSession.getState()).toEqual({ token: null, user: null });
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "ended", user: ada, demo: false });
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/login?next=${encodeURIComponent("/settings?tab=profile#name")}`);
  });

  it("on a public page, a refused refresh ends the session where the reader stands", async () => {
    window.history.replaceState(null, "", "/exhibits/pendulum");
    stored("a1");
    const { http, navigate, onSessionEnded } = track(setup({ refresh: () => ({ status: 401 }) }));
    await settle(http.get("/me"));
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("reads a public path as the router does: decoded, any case, a RegExp for an exact page", async () => {
    for (const [path, leaves] of [
      ["/Exhibits/%70endulum", false],
      ["/about", false],
      ["/about/team", true],
    ] as const) {
      localStorage.clear();
      window.history.replaceState(null, "", path);
      stored("a1");
      const made = setup({ refresh: () => ({ status: 401 }) });
      await settle(made.http.get("/me"));
      expect(made.navigate.mock.calls.length > 0, path).toBe(leaves);
      made.client.detach();
    }
  });

  it("privatePaths, for an open site: only the pages it lists need a session (Staunlabor, 0.64)", async () => {
    for (const [path, leaves] of [
      ["/", false],
      ["/exhibits/pendulum", false],
      ["/settings/profile", true],
      ["/admin", true],
    ] as const) {
      localStorage.clear();
      window.history.replaceState(null, "", path);
      stored("a1");
      const made = setup({
        publicPaths: undefined,
        privatePaths: ["/settings", "/admin"],
        refresh: () => ({ status: 401 }),
      });
      await settle(made.http.get("/me"));
      expect(made.navigate.mock.calls.length > 0, path).toBe(leaves);
      made.client.detach();
    }
  });

  it("takes one list: publicPaths or privatePaths, never both and never neither", () => {
    const http = fakeHttp(() => ({ status: 204 }));
    const both = { http, storagePrefix: "x.", publicPaths: ["/"], privatePaths: ["/admin"] };
    expect(() => createAccountsClient(both as never)).toThrow(TypeError);
    expect(() => createAccountsClient({ http, storagePrefix: "x." } as never)).toThrow(TypeError);
  });

  it("a refresh that got no answer is asked again, and the session stays", async () => {
    vi.useFakeTimers();
    stored("a1");
    const { http, fetch, onSessionEnded } = track(
      // The fake fetch rejects as the real one does when the network is gone.
      setup({
        refresh: () => {
          throw new TypeError("Failed to fetch");
        },
      }),
    );
    const pending = settle(http.get("/me"));
    await vi.advanceTimersByTimeAsync(10_000);
    const r = await pending;
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(r.ok ? undefined : isTransientRefreshFailure(r.error)).toBe(true);
    expect(record()).toEqual({ token: "a1", refreshToken: "r1", user: ada });
    expect(onSessionEnded).not.toHaveBeenCalled();
  });

  it("a refresh throttled (429) is asked again", async () => {
    vi.useFakeTimers();
    stored("a1");
    let calls = 0;
    const { http } = track(
      setup({
        refresh: (body) =>
          ++calls < 2 ? { status: 429 } : { status: 200, data: tokens("a2", body.refresh_token, ada) },
      }),
    );
    const pending = http.get("/me");
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).status).toBe(200);
    expect(calls).toBe(2);
  });

  it("a device with no refresh token ends the session at the first 401", async () => {
    stored("a1", null);
    const { fetch, http, onSessionEnded } = track(setup());
    await settle(http.get("/me"));
    expect(fetch).not.toHaveBeenCalled();
    expect(onSessionEnded).toHaveBeenCalledWith({ reason: "ended", user: ada, demo: false });
  });

  it("a 401 in a tab that holds no session ends nothing and goes nowhere (not_signed_in)", async () => {
    const { http, navigate, onSessionEnded } = track(setup());
    await settle(http.get("/me"));
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("an answer to the refresh that holds no session is a fault, not an end", async () => {
    stored("a1");
    const { http, onSessionEnded } = track(setup({ refresh: () => ({ status: 200, data: { hello: "world" } }) }));
    const r = await settle(http.get("/me"));
    expect(r.ok ? undefined : isTransientRefreshFailure(r.error)).toBe(true);
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(record()).toEqual({ token: "a1", refreshToken: "r1", user: ada });
  });
});

describe("a demo", () => {
  it("is off unless the app turns it on: an is_demo account's 401 refreshes like any other", async () => {
    stored("a1", "r1", { ...ada, is_demo: true });
    const { fetch, http } = track(setup());
    await http.get("/me");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("turned on, its 401 ends it at its own page with no refresh (landing-demo §5.5)", async () => {
    stored("a1", null, { ...ada, is_demo: true });
    const { fetch, http, navigate, onSessionEnded } = track(setup({ demo: {} }));
    await settle(http.get("/me"));
    expect(fetch).not.toHaveBeenCalled();
    expect(onSessionEnded).toHaveBeenCalledWith({ reason: "ended", user: { ...ada, is_demo: true }, demo: true });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/demo/ended");
  });
});

describe("a session ended in another tab", () => {
  const otherTab = () => window.dispatchEvent(new StorageEvent("storage", { key: KEY }));

  it("a sign-out elsewhere: this tab's state goes, the storage is left alone, a private page goes to the sign-in", () => {
    stored("a1");
    const { client, navigate, onSessionEnded } = track(setup());
    localStorage.removeItem(KEY);
    otherTab();
    expect(client.useSession.getState()).toEqual({ token: null, user: null });
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "elsewhere", user: ada, demo: false });
    // Never with this page to come back to: it was the last account's (keksdose #59).
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/login");
  });

  it("another account signed in elsewhere: its session stays stored, a private page goes home", () => {
    stored("a1");
    const { navigate } = track(setup({ homePath: "/start" }));
    stored("b1", "rb", { id: 2, email: "bob@example.com" });
    otherTab();
    expect(record()).toEqual({ token: "b1", refreshToken: "rb", user: { id: 2, email: "bob@example.com" } });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/start");
  });

  it("a demo signed out in another tab ends at its own page", () => {
    stored("a1", null, { ...ada, is_demo: true });
    const { navigate, onSessionEnded } = track(setup({ demo: {} }));
    localStorage.removeItem(KEY);
    otherTab();
    expect(onSessionEnded).toHaveBeenCalledWith({ reason: "elsewhere", user: { ...ada, is_demo: true }, demo: true });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/demo/ended");
  });

  it("a tab that holds no session ends nothing when another tab signs in", () => {
    const { navigate, onSessionEnded } = track(setup());
    stored("b1", "rb", { id: 2, email: "bob@example.com" });
    otherTab();
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("on a public page, the page is loaded again where it stands", () => {
    window.history.replaceState(null, "", "/exhibits/pendulum?run=2#plot");
    stored("a1");
    const { navigate } = track(setup());
    localStorage.removeItem(KEY);
    otherTab();
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/exhibits/pendulum?run=2#plot");
  });

  it("a renewal elsewhere is no end: the store takes up its token and account", () => {
    stored("a1");
    const { client, navigate, onSessionEnded } = track(setup());
    stored("a7", "r1", { ...ada, email: "renamed@x" });
    otherTab();
    expect(client.useSession.getState()).toEqual({ token: "a7", user: { ...ada, email: "renamed@x" } });
    expect(onSessionEnded).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("leaving the page", () => {
  it("by default is a full load, so nothing of the account stays in the tab's memory", async () => {
    const replace = vi.spyOn(documentNavigation, "replace").mockImplementation(() => undefined);
    const reload = vi.spyOn(documentNavigation, "reload").mockImplementation(() => undefined);
    stored("a1");
    const { client, http } = setup({ navigate: undefined, refresh: () => ({ status: 401 }) });
    track({ client });
    await settle(http.get("/me"));
    expect(replace).toHaveBeenCalledExactlyOnceWith(`/login?next=${encodeURIComponent("/settings?tab=profile#name")}`);
    expect(reload).not.toHaveBeenCalled();
  });

  it("loads a public page again by reloading it, not by a replace a fragment would turn into a scroll", () => {
    const replace = vi.spyOn(documentNavigation, "replace").mockImplementation(() => undefined);
    const reload = vi.spyOn(documentNavigation, "reload").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/exhibits#plot");
    stored("a1");
    track(setup({ navigate: undefined }));
    localStorage.removeItem(KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it("goes to the app's own sign-in, a query kept", async () => {
    stored("a1");
    const { http, navigate } = track(setup({ signInPath: "/sign-in?from=expired", refresh: () => ({ status: 401 }) }));
    await settle(http.get("/me"));
    expect(navigate).toHaveBeenCalledWith(
      `/sign-in?from=expired&next=${encodeURIComponent("/settings?tab=profile#name")}`,
    );
  });
});

describe("setUser and detach", () => {
  it("setUser writes a newer account beside the tokens", () => {
    stored("a1");
    const { client } = track(setup());
    client.setUser({ ...ada, email: "me@new" });
    expect(record()).toEqual({ token: "a1", refreshToken: "r1", user: { ...ada, email: "me@new" } });
    expect(client.useSession.getState().user).toEqual({ ...ada, email: "me@new" });
  });

  it("detach ejects the interceptors and stops watching other tabs", async () => {
    stored("a1");
    const { client, http, onSessionEnded } = setup({ valid: ["a1"] });
    client.detach();
    await settle(http.get("/me"));
    expect(http.sent[0]!.bearer).toBeNull();
    localStorage.removeItem(KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});
