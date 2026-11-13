import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSharedComputer } from "../../offline/shared-computer";
import { installFakePush } from "../../test/fake-push";
import { createAccountsClient } from "../accounts-client";
import type { AccountsClientOptions } from "../accounts-client";
import { fakeFetch, fakeHttp, noAnswer, tokens } from "./fake-http";
import type { Answer, Cfg } from "./fake-http";

/**
 * One sign-out, in the contract's order (docs/auth-harmonization.md §6.3, §2.15, §2.16):
 * this device's push first and the session on the server second, both while the token still
 * holds, then the tokens — and a failure in either request still signs out here. Until 0.62
 * an app's sign-out only dropped its own tokens, and the server went on honouring a refresh
 * token it never heard was given up (Kurvenschmiede's, the inventory of 2026-11-13).
 */

const KEY = "app.session";
type User = { id: number; email: string; is_demo?: boolean };
const ada: User = { id: 1, email: "ada@example.com" };
const stored = (token: string, user: User = ada) =>
  localStorage.setItem(KEY, JSON.stringify({ token, refreshToken: "r1", user }));

type Seen = { method?: string; url?: string; bearer: string; stored: boolean; data?: unknown };

function setup(
  options: {
    server?: (config: Cfg) => Answer | Promise<Answer>;
    valid?: string[];
    refresh?: Parameters<typeof fakeFetch>[0];
  } & Partial<AccountsClientOptions<User>> = {},
) {
  const seen: Seen[] = [];
  const valid = new Set(options.valid ?? ["a1"]);
  const http = fakeHttp((config) => {
    const bearer = String(config.headers?.Authorization ?? "");
    seen.push({
      method: config.method,
      url: config.url,
      bearer,
      stored: localStorage.getItem(KEY) !== null || sessionStorage.getItem(KEY) !== null,
      data: config.data,
    });
    if (!valid.has(bearer.replace(/^Bearer /, ""))) return { status: 401, data: { code: "not_signed_in" } };
    return options.server ? options.server(config) : { status: 204 };
  });
  const fetch = fakeFetch(options.refresh ?? (() => ({ status: 401, data: { code: "session_ended" } })));
  const navigate = vi.fn();
  const onSessionEnded = vi.fn();
  const client = createAccountsClient<User>({
    http,
    storagePrefix: "app.",
    publicPaths: ["/", "/login"],
    fetch,
    navigate,
    onSessionEnded,
    ...options,
  });
  clients.push(client);
  return { client, http, fetch, navigate, onSessionEnded, seen };
}

const clients: Array<{ detach(): void }> = [];
let push: ReturnType<typeof installFakePush> | undefined;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/settings");
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
  push?.uninstall();
  push = undefined;
  vi.useRealTimers();
});

describe("signOut", () => {
  it("drops this device's push, then ends the session on the server, then the tokens; then the sign-in", async () => {
    push = installFakePush({ existing: "https://push.example/1" });
    stored("a1");
    const { client, seen, navigate, onSessionEnded } = setup();
    await client.signOut();
    expect(seen.map(({ method, url, bearer, stored }) => ({ method, url, bearer, stored }))).toEqual([
      { method: "post", url: "/notifications/devices/unregister", bearer: "Bearer a1", stored: true },
      { method: "delete", url: "/auth/sessions/current", bearer: "Bearer a1", stored: true },
    ]);
    expect(seen[0]!.data).toEqual({ endpoint: "https://push.example/1" });
    expect(push.current()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(client.useSession.getState()).toEqual({ token: null, user: null });
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "signed-out", user: ada, demo: false });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/login");
  });

  it("asks the server about push only where this browser holds a subscription", async () => {
    stored("a1");
    const { client, seen } = setup();
    await client.signOut();
    expect(seen.map((s) => s.url)).toEqual(["/auth/sessions/current"]);
  });

  it("is a plain function: the idle sign-out may be handed it as it is", async () => {
    stored("a1");
    const { client } = setup();
    const { signOut } = client;
    await signOut();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("takes the app's own unregister in place of the default route", async () => {
    push = installFakePush({ existing: "https://push.example/1" });
    stored("a1");
    const unregisterPush = vi.fn(async () => undefined);
    const { client, seen } = setup({ unregisterPush });
    await client.signOut();
    expect(unregisterPush).toHaveBeenCalledExactlyOnceWith("https://push.example/1");
    expect(seen.map((s) => s.url)).toEqual(["/auth/sessions/current"]);
  });

  for (const [name, failure] of [
    ["a 5xx", () => ({ status: 503 })],
    ["no answer", () => Promise.reject(noAnswer())],
  ] as Array<[string, () => Answer | Promise<Answer>]>) {
    it(`a revoke that fails (${name}) still signs out here`, async () => {
      stored("a1");
      const { client, navigate, onSessionEnded } = setup({
        server: (config) => (config.url === "/auth/sessions/current" ? failure() : { status: 204 }),
      });
      await expect(client.signOut()).resolves.toBeUndefined();
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(onSessionEnded).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/login");
    });
  }

  it("a push unregister the server refuses still ends the session on the server, and the browser lets go", async () => {
    push = installFakePush({ existing: "https://push.example/1" });
    stored("a1");
    const { client, seen } = setup({
      server: (config) => (config.url === "/notifications/devices/unregister" ? { status: 500 } : { status: 204 }),
    });
    await client.signOut();
    expect(seen.map((s) => s.url)).toEqual(["/notifications/devices/unregister", "/auth/sessions/current"]);
    expect(push.current()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("gives a revoke that hangs 15 s, then signs out without it", async () => {
    vi.useFakeTimers();
    stored("a1");
    const { client, seen } = setup({
      server: (config) => (config.url === "/auth/sessions/current" ? new Promise<Answer>(() => {}) : { status: 204 }),
    });
    let done = false;
    void client.signOut().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(14_000);
    expect(done).toBe(false);
    expect(localStorage.getItem(KEY)).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(done).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
    // axios is told the same cut, so the request itself does not linger.
    expect(seen[0]).toMatchObject({ url: "/auth/sessions/current" });
  });

  it("renews an access token that ran out to end the session it renewed, and ends nothing twice", async () => {
    stored("a0");
    const { client, seen, fetch, onSessionEnded } = setup({
      valid: ["a1"],
      refresh: (body) => ({ status: 200, data: tokens("a1", body.refresh_token, ada) }),
    });
    await client.signOut();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(seen.map((s) => `${s.method} ${s.url} ${s.bearer}`)).toEqual([
      "delete /auth/sessions/current Bearer a0",
      "delete /auth/sessions/current Bearer a1",
    ]);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "signed-out", user: ada, demo: false });
  });

  it("a session the server had already ended: the refresh's refusal is this sign-out's, told once", async () => {
    stored("a0");
    const { client, navigate, onSessionEnded } = setup({ valid: [] });
    await client.signOut();
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "signed-out", user: ada, demo: false });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/login");
  });

  it("two presses sign out once", async () => {
    stored("a1");
    const { client, seen, onSessionEnded } = setup();
    await Promise.all([client.signOut(), client.signOut()]);
    expect(seen.filter((s) => s.url === "/auth/sessions/current")).toHaveLength(1);
    expect(onSessionEnded).toHaveBeenCalledTimes(1);
  });

  it("with no session in the tab sends nothing, and still goes to the sign-in", async () => {
    const { client, seen, navigate, onSessionEnded } = setup();
    await client.signOut();
    expect(seen).toEqual([]);
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "signed-out", user: null, demo: false });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/login");
  });

  it("drops a shared computer's session from the tab", async () => {
    setSharedComputer(true);
    sessionStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    const { client, seen } = setup();
    await client.signOut();
    expect(seen.map((s) => s.bearer)).toEqual(["Bearer a1"]);
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("ends a demo at its own page", async () => {
    stored("a1", { ...ada, is_demo: true });
    const { client, navigate, onSessionEnded } = setup({ demo: { endedPath: "/demo/over" } });
    await client.signOut();
    expect(onSessionEnded).toHaveBeenCalledWith({ reason: "signed-out", user: { ...ada, is_demo: true }, demo: true });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/demo/over");
  });
});
