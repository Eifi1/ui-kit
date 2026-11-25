import { create, type StoreApi, type UseBoundStore } from "zustand";

import {
  createMemoryStorage,
  readSessionStored,
  readStored,
  removeStored,
  writeSessionStored,
  writeStored,
} from "../lib/safe-storage";
import { isSharedComputer } from "../offline/shared-computer-store";

/**
 * Where the session lives, and the zustand store that shows it (docs/auth-harmonization.md
 * §2.14, §12.9) — Kurvenschmiede's `session-place.ts` and `auth-store.ts`, for every app,
 * with keksdose's page memory as the stricter path.
 *
 * - **A personal computer:** `localStorage`, which every tab shares and which outlives the
 *   browser.
 * - **"This is a shared computer", the default:** the tab's `sessionStorage`, so a reload,
 *   a phone's background reload included, keeps the session (Marcel 2026-11-13: signing out
 *   on every reload "wäre nicht gut"). Chrome and Firefox bring a closed tab back WITH its
 *   sessionStorage; server-kit 0.27 ends that session after 15 minutes idle and 4 hours at
 *   most, and every sign-out ends it on the server.
 * - **The stricter path** (`sharedSession: "memory"`): page memory only. A reopened tab holds
 *   nothing; a reload lands on the sign-in.
 *
 * **Read the page's memory first, then the tab's, then the device's; write one place and
 * empty the others**, so a session never sits in two, and a sign-in on a computer marked
 * shared drops whatever the device kept from before. The box is read at each sign-in rather
 * than once: it is ticked on the sign-in form, after this module has loaded.
 *
 * Page memory is also where a write lands that the browser's storage did not take (blocked
 * site data, a full quota): read through the kit's guard, a refused storage is "nothing
 * stored", so a sign-in kept only there would have answered every request with a 401 and
 * ended at the first. In memory it holds until the reload.
 *
 * Internal to `@eifi1/ui-kit/accounts`: the client is the only writer, so the stored record
 * and the store's state cannot part.
 */

/** The account as far as the session reads it: its `id` (which account a tab holds, so a
 *  sign-out or another account's sign-in elsewhere is noticed), and server-kit's `is_demo`
 *  (a demo's 401 ends it at its own page). The app's `User` — server-kit's `UserResponse`
 *  with its `me_model` fields — extends it. */
export interface AccountUser {
  id: number | string;
  is_demo?: boolean | null;
}

/**
 * The session store's state: the access token this tab sends, `null` when nobody is signed
 * in, and the account as the last sign-in, refresh or `/auth/me` answered it. Read it with
 * `client.useSession(selector)` in a component, `client.useSession.getState()` outside one;
 * write it only through the client, which keeps the stored copy beside it.
 */
export interface AccountSession<U extends AccountUser = AccountUser> {
  token: string | null;
  user: U | null;
}

/** Where a sign-in with "This is a shared computer" is kept: `"tab"`, the tab's
 *  `sessionStorage` (the default), or `"memory"`, the page's memory, where a reload signs
 *  out (docs/local-first-harmonization.md D6). */
export type SharedSessionPlace = "tab" | "memory";

/** @internal The record kept under the session's key. `refreshToken` is `null` for a
 *  session that cannot be renewed (a demo: server-kit's `TokenResponse.refresh_token`). */
export interface StoredSession<U extends AccountUser> {
  token: string;
  refreshToken: string | null;
  user: U;
}

type Place = "memory" | "tab" | "local";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function parse<U extends AccountUser>(raw: string | null): StoredSession<U> | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || typeof value.token !== "string" || value.token === "") return null;
    if (value.refreshToken !== null && typeof value.refreshToken !== "string") return null;
    const { user } = value;
    if (!isRecord(user) || (typeof user.id !== "number" && typeof user.id !== "string")) return null;
    return { token: value.token, refreshToken: value.refreshToken, user: user as U };
  } catch {
    // Not JSON: another app's value under the same name, or a torn write.
    return null;
  }
}

/** @internal What the client reads and writes; {@link createSessionStore} makes it. */
export interface SessionStore<U extends AccountUser> {
  useSession: UseBoundStore<StoreApi<AccountSession<U>>>;
  /** The session the storage holds now: the page's memory, then the tab's, then the
   *  device's. Another tab's sign-in, renewal or sign-out shows here before any event. */
  read(): StoredSession<U> | null;
  /** The stored access token, read where {@link read} reads it. */
  token(): string | null;
  /** A sign-in: kept where the shared-computer box says now. */
  begin(session: StoredSession<U>): void;
  /** The same session renewed (a refresh, a password change's fresh pair): kept where it is;
   *  with none stored, where the box says. */
  keep(session: StoredSession<U>): void;
  /** A newer copy of the account, the tokens as they are. Nothing without a session. */
  setUser(user: U): void;
  /** The session gone: from every place and from the state. */
  drop(): void;
  /** This tab's state signed out, the storage untouched: another tab may since have stored a
   *  session that is not this tab's to delete. */
  forget(): void;
  /** The state set to what the storage holds now (another tab's renewal). */
  adopt(): void;
}

/** @internal */
export function createSessionStore<U extends AccountUser>(options: {
  key: string;
  sharedSession?: SharedSessionPlace;
}): SessionStore<U> {
  const { key, sharedSession = "tab" } = options;
  // One per store, so one per client and page: a reload is a new page, and the memory goes.
  const page = createMemoryStorage();

  const readAt = (place: Place) =>
    place === "memory" ? readStored(key, page) : place === "tab" ? readSessionStored(key) : readStored(key);
  const writeAt = (place: Place, raw: string | null) => {
    if (place === "memory") writeStored(key, raw, page);
    else if (place === "tab") writeSessionStored(key, raw);
    else if (raw === null) removeStored(key);
    else writeStored(key, raw);
  };

  const found = (): { session: StoredSession<U>; place: Place } | null => {
    for (const place of ["memory", "tab", "local"] as const) {
      const session = parse<U>(readAt(place));
      if (session) return { session, place };
    }
    return null;
  };

  // From the storage at once: a reload stays signed in, with no rehydration to wait for.
  const initial = found()?.session ?? null;
  const useSession = create<AccountSession<U>>()(() => ({
    token: initial?.token ?? null,
    user: initial?.user ?? null,
  }));

  const put = (session: StoredSession<U>, place: Place) => {
    const raw = JSON.stringify(session);
    writeAt(place, raw);
    // Read back: the kit's guard swallows a refused write, which would leave nothing stored.
    const held = place !== "memory" && readAt(place) !== raw ? "memory" : place;
    if (held !== place) writeAt("memory", raw);
    for (const other of ["memory", "tab", "local"] as const) if (other !== held) writeAt(other, null);
    useSession.setState({ token: session.token, user: session.user });
  };

  const placeForSignIn = (): Place => (isSharedComputer() ? (sharedSession === "memory" ? "memory" : "tab") : "local");

  return {
    useSession,
    read: () => found()?.session ?? null,
    token: () => found()?.session.token ?? null,
    begin: (session) => put(session, placeForSignIn()),
    keep: (session) => put(session, found()?.place ?? placeForSignIn()),
    setUser(user) {
      const now = found();
      if (now) put({ ...now.session, user }, now.place);
    },
    drop() {
      for (const place of ["memory", "tab", "local"] as const) writeAt(place, null);
      useSession.setState({ token: null, user: null });
    },
    forget: () => useSession.setState({ token: null, user: null }),
    adopt() {
      const now = found()?.session ?? null;
      useSession.setState({ token: now?.token ?? null, user: now?.user ?? null });
    },
  };
}
