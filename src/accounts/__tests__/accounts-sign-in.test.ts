import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authErrorCode } from "../../auth/auth-errors";
import { setSharedComputer } from "../../offline/shared-computer";
import { createAccountsClient } from "../accounts-client";
import { fakeFetch, fakeHttp, tokens } from "../../test/fake-axios";
import type { Answer, Cfg } from "../../test/fake-axios";

/**
 * The requests that start a session (docs/auth-harmonization.md §5.1, §12.9), against
 * server-kit 0.29's routes: each answer is the kit's `SignInAnswer`, so `SignInForm` takes
 * the client's functions as they are, and the three that start a session from the form send
 * `shared_device` — Kurvenschmiede sent none (the inventory of 2026-11-13, finding 1), and a
 * shared computer's sign-in got a personal one's 30 days.
 */

const KEY = "app.session";
type User = { id: number; email: string };
const ada: User = { id: 1, email: "ada@example.com" };
const bob: User = { id: 2, email: "bob@example.com" };

function setup(server: (config: Cfg) => Answer = () => ({ status: 200, data: tokens("a1", "r1", ada) })) {
  const http = fakeHttp(server);
  const onSessionEnded = vi.fn();
  const navigate = vi.fn();
  const client = createAccountsClient<User>({
    http,
    storagePrefix: "app.",
    publicPaths: ["/login"],
    fetch: fakeFetch(() => ({ status: 401 })),
    onSessionEnded,
    navigate,
  });
  clients.push(client);
  return { client, http, onSessionEnded, navigate };
}

const clients: Array<{ detach(): void }> = [];
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
});

const body = (config: Cfg | undefined) => config?.data as Record<string, unknown>;

describe("signIn", () => {
  it("sends shared_device false on a personal computer, and keeps the session on the device", async () => {
    const { client, http } = setup();
    await expect(client.signIn({ email: "ada@example.com", password: "pw" })).resolves.toEqual({ kind: "signed-in" });
    expect(http.sent[0]).toMatchObject({ method: "post", url: "/auth/login" });
    expect(body(http.sent[0])).toEqual({ email: "ada@example.com", password: "pw", shared_device: false });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ token: "a1", refreshToken: "r1", user: ada });
    expect(client.useSession.getState()).toEqual({ token: "a1", user: ada });
  });

  it("sends shared_device true after “This is a shared computer”, and keeps the session with the tab", async () => {
    setSharedComputer(true);
    const { client, http } = setup();
    await client.signIn({ email: "ada@example.com", password: "pw" });
    expect(body(http.sent[0]).shared_device).toBe(true);
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("answers the forced change's challenge with its app fields, and keeps nothing", async () => {
    const { client } = setup(() => ({
      status: 200,
      data: { requires_password_change: true, challenge_token: "c1", encrypted: true },
    }));
    await expect(client.signIn({ email: "ada@example.com", password: "pw" })).resolves.toEqual({
      kind: "password-change",
      challengeToken: "c1",
      extra: { encrypted: true },
    });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(client.useSession.getState().token).toBeNull();
  });

  it("answers a challenge with no app fields without an empty extra", async () => {
    const { client } = setup(() => ({ status: 200, data: { requires_password_change: true, challenge_token: "c1" } }));
    await expect(client.signIn({ email: "a@x", password: "pw" })).resolves.toEqual({
      kind: "password-change",
      challengeToken: "c1",
    });
  });

  it("answers a second factor's challenge, for a server that asks for one", async () => {
    const { client } = setup(() => ({ status: 200, data: { requires_2fa: true, challenge_token: "c2" } }));
    await expect(client.signIn({ email: "a@x", password: "pw" })).resolves.toEqual({
      kind: "2fa",
      challengeToken: "c2",
    });
  });

  it("rejects a refusal with the client's own error, so the form reads its code, and keeps nothing", async () => {
    const { client, http } = setup(() => ({ status: 401, data: { code: "invalid_credentials" } }));
    const error = await client.signIn({ email: "a@x", password: "wrong" }).catch((e: unknown) => e);
    expect(authErrorCode(error)).toBe("invalid_credentials");
    // A signed-out step: its 401 judges the form, never the session, so nothing refreshed.
    expect(http.sent).toHaveLength(1);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("rejects an answer that is neither a session nor a challenge, and keeps nothing", async () => {
    for (const data of [{ access_token: "a1" }, { challenge_token: "c3", requires_magic_link: true }]) {
      const { client } = setup(() => ({ status: 200, data }));
      await expect(client.signIn({ email: "a@x", password: "pw" })).rejects.toThrow(TypeError);
      expect(localStorage.getItem(KEY)).toBeNull();
    }
  });

  it("tells the app that a sign-in as another account replaced the one before, and stays on the page", async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: "b1", refreshToken: "rb", user: bob }));
    const { client, onSessionEnded, navigate } = setup();
    await client.signIn({ email: "ada@example.com", password: "pw" });
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "replaced", user: bob, demo: false });
    expect(navigate).not.toHaveBeenCalled();
    expect(client.useSession.getState().user).toEqual(ada);
  });

  it("tells nothing when the same account signs in again", async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: "a0", refreshToken: "r0", user: ada }));
    const { client, onSessionEnded } = setup();
    await client.signIn({ email: "ada@example.com", password: "pw" });
    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});

describe("setPassword", () => {
  it("sends the challenge and the new password to the forced change, and keeps the session it answers", async () => {
    setSharedComputer(true);
    const { client, http } = setup();
    await expect(client.setPassword({ challengeToken: "c1", password: "new-secret" })).resolves.toEqual({
      kind: "signed-in",
    });
    expect(http.sent[0]).toMatchObject({ method: "post", url: "/auth/login/set-password" });
    // The challenge carries the shared-computer choice: the step sends nothing of it.
    expect(body(http.sent[0])).toEqual({ challenge_token: "c1", new_password: "new-secret" });
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });
});

describe("passkeyFinish", () => {
  it("sends the authenticator's answer with shared_device, and keeps the session", async () => {
    setSharedComputer(true);
    const { client, http } = setup();
    const credential = { id: "cred", response: { clientDataJSON: "x" } };
    await expect(client.passkeyFinish({ challenge_token: "c9", credential })).resolves.toEqual({ kind: "signed-in" });
    expect(http.sent[0]).toMatchObject({ method: "post", url: "/auth/passkey/login/finish" });
    expect(body(http.sent[0])).toEqual({ challenge_token: "c9", credential, shared_device: true });
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });
});

describe("register", () => {
  const values = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    password: "long-enough",
    locale: "de-CH" as const,
  };

  it("sends the form's values in the wire's names, the app's fields and shared_device, and answers the account", async () => {
    const { client, http } = setup(() => ({ status: 201, data: tokens("a1", "r1", ada) }));
    await expect(client.register(values, { invite_token: "inv", device_timezone: "Europe/Zurich" })).resolves.toEqual(
      ada,
    );
    expect(http.sent[0]).toMatchObject({ method: "post", url: "/auth/register" });
    expect(body(http.sent[0])).toEqual({
      email: "ada@example.com",
      password: "long-enough",
      first_name: "Ada",
      last_name: "Lovelace",
      locale: "de-CH",
      invite_token: "inv",
      device_timezone: "Europe/Zurich",
      shared_device: false,
    });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ token: "a1", refreshToken: "r1", user: ada });
  });

  it("sends the box as it is, whatever an app field of the same name says", async () => {
    setSharedComputer(true);
    const { client, http } = setup(() => ({ status: 201, data: tokens("a1", "r1", ada) }));
    await client.register(values, { shared_device: false });
    expect(body(http.sent[0]).shared_device).toBe(true);
  });

  it("rejects an answer that holds no session, and keeps nothing", async () => {
    const { client } = setup(() => ({ status: 201, data: { user: ada } }));
    await expect(client.register(values)).rejects.toThrow(TypeError);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("rejects a refusal with the client's own error, and keeps nothing", async () => {
    const { client } = setup(() => ({ status: 403, data: { code: "registration_closed" } }));
    const error = await client.register(values).catch((e: unknown) => e);
    expect(authErrorCode(error)).toBe("registration_closed");
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("storeSession", () => {
  it("keeps a password change's fresh pair where the session already is", () => {
    setSharedComputer(true);
    const { client } = setup();
    sessionStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    setSharedComputer(false);
    client.storeSession(tokens("a2", "r2", ada));
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ token: "a2", refreshToken: "r2", user: ada });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(client.currentToken()).toBe("a2");
  });

  it("keeps the stored refresh token when the answer brings none", () => {
    const { client } = setup();
    localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
    client.storeSession(tokens("a2", null, ada));
    expect(JSON.parse(localStorage.getItem(KEY)!).refreshToken).toBe("r1");
  });

  it("starts another account's session as a sign-in: placed by the box, the one before replaced", () => {
    localStorage.setItem(KEY, JSON.stringify({ token: "b1", refreshToken: "rb", user: bob }));
    setSharedComputer(true);
    const { client, onSessionEnded } = setup();
    client.storeSession(tokens("a1", null, ada));
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith({ reason: "replaced", user: bob, demo: false });
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ token: "a1", refreshToken: null, user: ada });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("refuses an answer that holds no session", () => {
    const { client } = setup();
    expect(() => client.storeSession({ access_token: "", user: ada })).toThrow(TypeError);
  });
});
