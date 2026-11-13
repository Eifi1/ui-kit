# Adopting `@eifi1/ui-kit` 0.63

ui-kit 0.63 ships with **server-kit 0.29**. Its centre is the frontend half of the account layer
(docs/auth-harmonization.md §12.9, Marcel 2026-11-13: "Das sollte doch lieber vollständig in die
kits kommen, frontend wie backend"): a new entry, `@eifi1/ui-kit/accounts`, that wires the kit's
sign-in parts to `auth_router` once, so no app writes its session, its pages or its settings
again. This note grows with the round; its first part is the session.

**From 0.62, nothing else first.**

**Legal wording:** the **Privacy Policy**, for an app that lists the new standard browser entry:
`standardEntries.session`, the sign-in `@eifi1/ui-kit/accounts` keeps. Move the /privacy
`updated` date the day you ship it. An app that keeps its own line for its tokens changes
nothing for the kit.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**New words** (all seven catalogues; **es, hu and zh need native review**, and de-CH, fr and it
are new sentences, not yet reviewed): `legal.sections.privacy.browser.standardEntries.session`.

**Must change:** nothing. `@eifi1/ui-kit/accounts` is new, and it asks for no peer beyond the
required ones (axios stays the app's; the client takes its instance).

## The session (`createAccountsClient`, `accountStorageEntries`)

Built against server-kit 0.29's `auth_router` (its README, "Account layer"). Staunlabor is the
first app on it; Kurvenschmiede moves with its server-kit 0.29 round, keksdose and kastlan when
they move to `auth_router`.

**What it is.** One client per app, at module scope beside its axios instance:

```ts
export const api = axios.create({ baseURL: "/api/v1" });
attachServerWake(api, serverWake); // and the app's own response interceptors: all before the client
export const accounts = createAccountsClient<User>({
  http: api,
  storagePrefix: "staunlabor.",
  publicPaths: ["/", "/exhibits", "/about", "/impressum", "/privacy", "/login", "/register"],
  onSessionEnded: () => queryClient.clear(),
});
```

- **The bearer** from the stored session on every request.
- **The refresh** is the kit's flight (§11) over a bare `fetch` to `POST /auth/refresh` at
  `http.defaults.baseURL` (or `baseURL`): never the instance, whose interceptors, logs and crash
  reports must not see the refresh token. `fetch: wrapFetch(fetch, serverWake)` counts it as a
  cold start's wait.
- **The store**, `accounts.useSession` (zustand: `{ token, user }`), read from the storage at
  once. Kept in `localStorage`; after "This is a shared computer" in the tab's `sessionStorage`,
  or in page memory with `sharedSession: "memory"`.
- **The requests that start a session**, each answering `SignInAnswer`: `signIn` (`SignInForm`'s
  `onSubmit`), `setPassword` (`onSetPassword`), `passkeyFinish` (the end of `onPasskey`),
  `register(values, extra)` (`RegisterForm`'s `onSubmit`, with `invite_token` and the app's
  fields in `extra`). The three from the form send `shared_device`. `storeSession(answer)` keeps a
  password change's fresh pair.
- **`signOut()`** in §6.3's order; hand it to `useSharedComputerIdleSignOut({ onSignOut })` too.
  It does NOT reset the shared-computer flag: a reset fails toward the unsafe side, signing the
  next person at a shared computer in to `localStorage` without the tick, and the flag lives in
  the tab's storage and goes with the tab.
- **A session that ends by itself** (the refresh refused, a demo's 401 with `demo: {}`, another
  tab): `onSessionEnded({ reason, user, demo })`, then a full load of the sign-in (`?next=` the
  page), the home page, or the page itself; a public page stays where it is when the server
  ended the session.
- **The privacy page:** `accountStorageEntries(prefix)` → `[{ key: "<prefix>session", entry:
  "session" }]`; draw the line from `useLegalLabels().sections.privacy.browser.standardEntries`.

**`publicPaths` are React Router's patterns**, as `useLastVisitedPage`'s `exclude`: a string is
that path and everything under it, a RegExp is tested on the decoded path. Kurvenschmiede's list is
exact paths (`/steering` is public, `/steering/curves` is not): it writes `/^\/steering$/` for
those.

**Not in it yet:** the pages, the `accountsApi` hooks and the settings cards (with server-kit
0.29's route table, next in this round); the 2FA step (`/auth/login/2fa` is not in 0.29's cut;
an app with 2FA keeps its own `onCode`).

### Per app

- **Staunlabor:** nothing to move. List `accountStorageEntries("staunlabor.")` in
  `shared/lib/storage-keys.ts` and its line on the privacy page.
- **Kurvenschmiede**, with its move to `auth_router`: the client replaces `client.ts`'s refresh,
  bearer and `watchSessionElsewhere`, `auth-store.ts`, `session-place.ts` and `protected-route`'s
  token read. One sign-out at the move; announce it: `auth_router` checks the session's `sid`
  row on every request, and Kurvenschmiede's tokens carry no `sid`. Its reset of the
  shared-computer flag in `clear()` goes (below). `nameDeferred` stays the app's.
