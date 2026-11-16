import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSharedComputer } from "../../offline/shared-computer";
import { createSessionStore } from "../session-store";

/**
 * Where the session lives (docs/auth-harmonization.md §2.14, §12.9): the device's
 * `localStorage` on a personal computer; after "This is a shared computer" the tab's
 * `sessionStorage` (the default), or page memory on the stricter path, where a reload signs
 * out. Kurvenschmiede's session-place.ts, for every app: read the tab's first, write one
 * place and empty the others, so a session never sits in two.
 */

const KEY = "app.session";
type User = { id: number; email: string };
const ada = { token: "a1", refreshToken: "r1", user: { id: 1, email: "ada@example.com" } };
const bob = { token: "b1", refreshToken: "rb", user: { id: 2, email: "bob@example.com" } };

const local = () => localStorage.getItem(KEY);
const tab = () => sessionStorage.getItem(KEY);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("the session store", () => {
  it("keeps a sign-in on a personal computer in localStorage, and nothing in the tab", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    expect(JSON.parse(local()!)).toEqual(ada);
    expect(tab()).toBeNull();
    expect(store.useSession.getState()).toEqual({ token: "a1", user: ada.user });
    expect(store.token()).toBe("a1");
  });

  it("keeps a shared-computer sign-in in the tab's storage, and drops what the device kept", () => {
    localStorage.setItem(KEY, JSON.stringify(bob));
    setSharedComputer(true);
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    expect(JSON.parse(tab()!)).toEqual(ada);
    expect(local()).toBeNull();
    expect(store.token()).toBe("a1");
  });

  it("keeps a shared-computer sign-in in page memory on the stricter path: no storage holds it, a reload signs out", () => {
    setSharedComputer(true);
    const store = createSessionStore<User>({ key: KEY, sharedSession: "memory" });
    store.begin(ada);
    expect(local()).toBeNull();
    expect(tab()).toBeNull();
    expect(store.token()).toBe("a1");
    expect(store.read()).toEqual(ada);
    // A reload is a new page: a new store, and the memory is gone with the old one.
    expect(createSessionStore<User>({ key: KEY, sharedSession: "memory" }).useSession.getState().token).toBeNull();
  });

  it("starts from what the storage holds, so a reload stays signed in", () => {
    localStorage.setItem(KEY, JSON.stringify(ada));
    expect(createSessionStore<User>({ key: KEY }).useSession.getState()).toEqual({ token: "a1", user: ada.user });
    localStorage.clear();
    sessionStorage.setItem(KEY, JSON.stringify(bob));
    expect(createSessionStore<User>({ key: KEY }).useSession.getState()).toEqual({ token: "b1", user: bob.user });
  });

  it("reads the tab's session before the device's", () => {
    localStorage.setItem(KEY, JSON.stringify(bob));
    sessionStorage.setItem(KEY, JSON.stringify(ada));
    expect(createSessionStore<User>({ key: KEY }).read()).toEqual(ada);
  });

  it("renews a session where it already is, whatever the box says now", () => {
    setSharedComputer(true);
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    setSharedComputer(false);
    store.keep({ ...ada, token: "a2" });
    expect(JSON.parse(tab()!).token).toBe("a2");
    expect(local()).toBeNull();
    expect(store.useSession.getState().token).toBe("a2");
  });

  it("puts a renewal with no session behind it where the box says, as a sign-in", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.keep(ada);
    expect(JSON.parse(local()!)).toEqual(ada);
  });

  it("reads a record of another shape as no session at all", () => {
    for (const raw of ["not json", "null", "{}", JSON.stringify({ token: "", refreshToken: null, user: { id: 1 } })]) {
      localStorage.setItem(KEY, raw);
      const store = createSessionStore<User>({ key: KEY });
      expect(store.read()).toBeNull();
      expect(store.token()).toBeNull();
      expect(store.useSession.getState()).toEqual({ token: null, user: null });
    }
    localStorage.setItem(KEY, JSON.stringify({ ...ada, user: { email: "no id" } }));
    expect(createSessionStore<User>({ key: KEY }).read()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ ...ada, refreshToken: 7 }));
    expect(createSessionStore<User>({ key: KEY }).read()).toBeNull();
  });

  it("keeps a session that has no refresh token, as a demo's", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.begin({ ...ada, refreshToken: null });
    expect(store.read()).toEqual({ ...ada, refreshToken: null });
  });

  it("writes a newer account into the stored session and the state, the tokens as they are", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    store.setUser({ id: 1, email: "ada@new.example" });
    expect(JSON.parse(local()!)).toEqual({ ...ada, user: { id: 1, email: "ada@new.example" } });
    expect(store.useSession.getState().user).toEqual({ id: 1, email: "ada@new.example" });
  });

  it("keeps no account without a session, and takes up nothing when nothing is stored", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.setUser(ada.user);
    expect(local()).toBeNull();
    expect(store.useSession.getState()).toEqual({ token: null, user: null });
    store.adopt();
    expect(store.useSession.getState()).toEqual({ token: null, user: null });
  });

  it("drops the session from every place and from the state", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    sessionStorage.setItem(KEY, JSON.stringify(bob));
    store.drop();
    expect(local()).toBeNull();
    expect(tab()).toBeNull();
    expect(store.useSession.getState()).toEqual({ token: null, user: null });
  });

  it("forgets the tab's state without touching what another tab stored", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    localStorage.setItem(KEY, JSON.stringify(bob));
    store.forget();
    expect(store.useSession.getState()).toEqual({ token: null, user: null });
    expect(JSON.parse(local()!)).toEqual(bob);
  });

  it("takes up what the storage holds now, as another tab's renewal left it", () => {
    const store = createSessionStore<User>({ key: KEY });
    store.begin(ada);
    localStorage.setItem(KEY, JSON.stringify({ ...ada, token: "a9", user: { id: 1, email: "renamed" } }));
    store.adopt();
    expect(store.useSession.getState()).toEqual({ token: "a9", user: { id: 1, email: "renamed" } });
  });

  it("keeps a sign-in in page memory where the browser's storage refuses, so it holds until a reload", () => {
    // Blocked site data: every access throws (Kurvenschmiede's client.ts: "here it would
    // have failed every request"). Read through the kit's guard, that is "nothing stored",
    // so a sign-in written only there would 401 at its first request and end at once.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const store = createSessionStore<User>({ key: KEY });
    expect(store.read()).toBeNull();
    expect(() => store.begin(ada)).not.toThrow();
    expect(store.token()).toBe("a1");
    expect(store.read()).toEqual(ada);
    expect(createSessionStore<User>({ key: KEY }).read()).toBeNull();
  });
});
