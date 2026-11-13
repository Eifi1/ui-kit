# Adopting `@eifi1/ui-kit` 0.63

ui-kit 0.63 ships with **server-kit 0.29**. Its centre is the frontend half of the account layer
(docs/auth-harmonization.md §12.9, Marcel 2026-11-13: "Das sollte doch lieber vollständig in die
kits kommen, frontend wie backend"): a new entry, `@eifi1/ui-kit/accounts`, that wires the kit's
sign-in parts to `auth_router` once, so no app writes its session, its pages or its settings
again. Beside it, the apps' outgoing credits count: an `external` link can keep the referrer
(`referrer`), and the imprint's credits for the kit's chart palette are the kit's own section, in
seven languages (Marcel, 2026-11-13: "Links sind wichtig für Bekanntheit"). And `/offline` loads
without `idb-keyval` and the persister, `TranslationReviewPanel` takes `storage`, and the transfer
dialog's "customer" texts are deprecated.

**From 0.62, nothing else first.**

**Legal wording:**

- the **Privacy Policy**, for an app that lists the new standard browser entry
  `standardEntries.session`, the sign-in `@eifi1/ui-kit/accounts` keeps: move the /privacy
  `updated` date the day you ship it. An app that keeps its own line for its tokens changes
  nothing for the kit;
- the **Impressum**, for an app that adds the credits section: an app that replaces its own
  `credits` section with `<LegalKitSection section="credits" />` moves its /impressum `updated`
  date to the day it ships that. An app that keeps its own section changes nothing.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**New words** (all seven catalogues; **es, hu and zh need native review**, and de-CH, fr and it
of the account words are new sentences, not yet reviewed):

- `legal.sections.privacy.browser.standardEntries.session`;
- the namespace `accountFailure`: a sentence per coded refusal (31: the fourteen new codes, the
  older ones in the words the kit's forms already use for them), `offline`, `timeout`, `server`,
  `rateLimited`, `failed`;
- `legal.sections.impressum.credits.title` and `.body` (from Staunlabor's reviewed
  `legal.impressum.credits`, "and drawings" dropped). The body is a template with `{palette}` and
  `{site}`; the translation review flags a translation that drops one.

**Must change** (in the types only; no app's code is affected today):

- `AuthErrorCode` (and `KitErrorCode` through it) has server-kit 0.29's fourteen new codes —
  `not_signed_in`, `admin_required`, `password_unchanged`, `password_change_not_required`,
  `email_unchanged`, `email_change_not_pending`, `mail_not_sent`, `passkey_refused`,
  `passkey_registration_refused`, `passkey_not_found`, `session_not_found`,
  `invitation_not_found`, `invitation_closed`, `invitation_scope_invalid` — so an exhaustive
  `switch` over it adds them; `authErrorCode` now answers them instead of `undefined`;
- `LegalKitSectionKey` gains `"credits"`: code that handles every key of it exhaustively (a
  `switch` with a `never` default, a `Record` over it) adds the case.

`@eifi1/ui-kit/accounts` is new; it needs `@tanstack/react-query` (already an optional peer,
`/offline`'s), and axios stays the app's (the client takes its instance).

## The session (`createAccountsClient`, `accountStorageEntries`)

Built against server-kit 0.29's `auth_router` (its README, "Account layer"). Staunlabor is the
first app on it; Kurvenschmiede moves in one round with server-kit 0.30 (Marcel, 2026-11-13),
keksdose and kastlan when they move to `auth_router`.

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

**The bearer goes only to the app's own API:** a URL under `baseURL` (else
`http.defaults.baseURL`), never another host the same instance calls; another host's 401
refreshes nothing.

## The rest of the layer (`client.api`, the hooks, `accountRoutes`, the settings sections, `describeAccountFailure`)

Built against server-kit 0.29's route table.

- **`client.api`**: every route of `auth_router` and `invitations_admin_router`, typed
  (`AccountMe`, `AccountSessionInfo` with `current`, `AccountPasskey`, …), on the app's
  instance. `client.signInWithPasskey()` runs the passkey sign-in (no library: the kit
  converts py_webauthn's JSON itself; `passkeysAvailable()` gates it).
  `client.signOut({ everywhere: true })` is "Sign out everywhere" (`POST /auth/logout`) in the
  sign-out's order.
- **The hooks**, under `<AccountsProvider client={accounts}>` inside the app's
  `QueryClientProvider`: `useCurrentUser` (writes `/me` back to the session), `useUpdateProfile`,
  `useChangePassword` (keeps the fresh pair), `useEmailChange`, `useAccountSessions`,
  `usePasskeys` (`begin(password)` then `register({ options, name })`), `useAccountExport`,
  `useAccountDeletion` (a granted request signs out), `useInvitationsAdmin`; keys under
  `accountQueryKeys.all`, which the provider drops when the account changes. The language: the
  kit's `useAccountLanguage` with `save: (locale) => updateProfile.mutateAsync({ locale })`.
- **`accountRoutes(options)`**: `/login`, `/register` (the invitation's check, a dead link's
  banner, `AcceptInvitation`), `/forgot-password`, `/reset-password`, `/verify-email`,
  `/confirm-email`, and `/demo/ended` with `demo`. Options: `paths`, `afterSignIn`, `frame` (the
  app's frame round each page), `signUp` (`"invitation"` by default), `access`, `emailTag`,
  `deactivatedContact`, `signInHint`, `sharedComputerChoice`, `legal` (the terms link may be
  left out), `registerLocale`, `registerFields`, `appCode`, `demo`. No second factor: 0.29 has
  no 2FA routes. `<RequireSession>` gates a private route.
- **The settings sections**: `AccountProfileSection` (`roleLabel`), `AccountPasswordSection`,
  `AccountEmailSection` (`emailTag`), `AccountSessionsSection` (the device list, this device
  first and marked), `AccountPasskeysSection` (`unavailable`), `AccountExportSection`
  (`description`), `AccountDeletionSection` (`consequences`, `handOverField`),
  `AccountInvitationsSection` (the panel's role vocabulary).
- **`describeAccountFailure(error, labels, { appCode })`** and `useDescribeAccountFailure()`:
  the code first, never the server's English; then offline, a timeout, a throttle's wait, an
  uncoded 401 as the session's end, the server's fault.

For Staunlabor: `accountRoutes({ emailTag: "staunlabor", legal: { privacyHref: "/privacy" },
registerLocale: language, frame: SiteFrame })` — no terms, no demo, invitation-only — and the
sections it wants in its own settings page.

### Per app

- **Staunlabor:** nothing to move. List `accountStorageEntries("staunlabor.")` in
  `shared/lib/storage-keys.ts` and its line on the privacy page.
- **Kurvenschmiede**, with its move to `auth_router` (together with server-kit 0.30): the client replaces `client.ts`'s refresh,
  bearer and `watchSessionElsewhere`, `auth-store.ts`, `session-place.ts` and `protected-route`'s
  token read. One sign-out at the move; announce it: `auth_router` checks the session's `sid`
  row on every request, and Kurvenschmiede's tokens carry no `sid`. Its reset of the
  shared-computer flag in `clear()` goes (`signOut()` above). `nameDeferred` stays the app's.

## External links that count for the site they name (`referrer`)

**What changed.** Every kit part with `external` takes an opt-in `referrer`:

- `TextLink`;
- `Button` and `IconButton` with `href`;
- `ListItem`'s link rows;
- `AppShell`'s `sidebarFooterItems`: a single link, and each link of a `links` group.

With it, the link is `rel="noopener"` alone, so the target site sees where its visitors came
from. There is no `nofollow` either way. `noopener` stays: the new tab cannot reach back into
the app. The external-link mark and "opens in a new tab" stay too.

Without `referrer` nothing changes: `rel="noopener noreferrer"`. Button's and IconButton's own
`rel` still wins over the kit's. TextLink's and ListItem's `external` still set the `rel`
themselves, which is why `referrer` exists. `referrer` without `external` does nothing.

Use it for a link the app vouches for: a credit, a recommendation. Not for a URL a user wrote.
The kit's own user-written links (feedback attachments, the lightbox's "open") keep
`noreferrer`.

**Why.** Kurvenschmiede and Staunlabor wanted their imprint's anyplot.ai links to count for
anyplot.ai, so they left `external` for `target="_blank" rel="noopener"` by hand. That lost the
mark and the screen reader's "opens in a new tab".

**What apps do.** Every app's `credits.tsx` draws its links as `<TextLink target="_blank"
rel="noopener">`:

- keksdose `frontend/src/features/legal/credits.tsx:17`;
- kastlan `frontend/src/features/legal/credits.tsx:16`;
- Kurvenschmiede `frontend/src/features/legal/credits.tsx:17`;
- Staunlabor `frontend/src/features/site/credits.tsx:17`.

The simplest step is the next section: the kit's `credits` section replaces the whole file. An
app that keeps its own credits writes `<TextLink href={href} external referrer>` instead. Its
links then get the mark and the announcement, and the rel stays `noopener`.

**Tests:** `src/components/__tests__/external-referrer.test.tsx`: each of the five parts with
and without `referrer`, Button's own `rel`, the footer links expanded and collapsed. An app test
that reads a credit link's `rel` keeps `"noopener"`. One that reads its accessible name now hears
"(opens in a new tab)" after it.

## Credits on the imprint (`<LegalKitSection section="credits" />`)

**What changed.** The kit's default chart palette is anyplot.ai's categorical palette "Imprint".
Every app credited it in an imprint section of its own, with its own words and two hand-made
links. The kit now writes that section.

- `<LegalKitSection section="credits" />`, on the imprint. English:

  > The colours in the charts come from “Imprint”, the categorical palette of anyplot.ai. Its
  > eight hues were validated by anyplot.ai against deuteranopia, protanopia and tritanopia and
  > tuned for warm paper.

  "Imprint" links to https://anyplot.ai/palette and "anyplot.ai" to https://anyplot.ai. Both
  are `external` TextLinks with `referrer`. Each language places the links where its grammar
  wants them (Hungarian and Chinese name the site first).
- The wording is Staunlabor's reviewed `legal.impressum.credits`, in all seven languages, with
  "and drawings" dropped: not every app draws. keksdose's own text says "the data series in
  the charts", so its sentence changes slightly.
- **Optional.** An app that does not colour its charts from the kit's palette leaves the section
  out. `LEGAL_SKELETON.impressum` ends with `{ key: "credits", owner: "kit", optional: true }`,
  after the app's own sections (`"*"`). That is where all four apps have it today.
- The labels: `legal.sections.impressum.credits` (`title`, `body`), an optional key of
  `LegalLabels`. An app's own full `legal` tree without it gets the kit's English.

**What apps do** (each optional, and each moves its /impressum `updated` date when it ships):

- **keksdose:** in `frontend/src/features/legal/impressum-page.tsx:16` replace
  `<LegalSection key="credits" …><CreditsText /></LegalSection>` with
  `<LegalKitSection section="credits" />`. Then delete `features/legal/credits.tsx` and the
  `legal.impressum.credits` keys in the four catalogues. The id stays `credits`.
- **kastlan:** the same in `frontend/src/features/legal/impressum-page.tsx:25`, then
  `features/legal/credits.tsx` and the `impressum.credits` keys of the `legal` namespace go. The
  test "credits the chart palette with two links that count for anyplot.ai"
  (`legal-pages.test.tsx`) reads `#credits`, still there; its link names gain "(opens in a new
  tab)".
- **Kurvenschmiede:** the same in `frontend/src/features/legal/legal-pages.tsx:112`; then
  `features/legal/credits.tsx` and `legal.impressum.credits` in its seven catalogues go.
- **Staunlabor:** the same in `frontend/src/features/site/legal-pages.tsx:39`; then
  `features/site/credits.tsx` and `legal.impressum.credits` go.
- **The skeleton tests** (`LEGAL_SKELETON[page].sections.map((s) => s.key).filter((k) => k !==
  "*")`, in keksdose, kastlan and Kurvenschmiede) still pass: every app has a `credits`
  section, its own or the kit's, last. An app that drops credits altogether filters
  `!s.optional` too.

**Tests:** `src/components/__tests__/legal-page.credits.test.tsx`: the skeleton entry, the links
and their `rel`, the English sentence, every catalogue's link order, a page without it, an app's
legal tree without the key. `legal-wording.test.ts` has the new `impressum` fingerprints in all
seven catalogues; `review.test.ts` has the sentence among the review rows.

## `@eifi1/ui-kit/offline` without `idb-keyval` and the persister

**What changed.** The `/offline` entry imported `idb-keyval` and
`@tanstack/query-async-storage-persister` when it loaded, through `createQueryPersistence`'s
module. The exports map allows no deep import, so an app that took only `SharedComputerChoice`,
`useSharedComputerIdleSignOut` or `useFeedbackCommentsQuery` from it still had to install both.

`createQueryPersistence` now imports them on first use: the persister on the first save,
restore or delete, `idb-keyval` on the first read or write of the default store (and
`removeStaleQueryCopies` on its first sweep). The entry loads with `@tanstack/react-query`
alone. The public API is unchanged:

- `persistOptions.persister` is still a `Persister`;
- it is still throttled by `throttleTime`;
- `clear`, `leave` and `removeStale` behave as before.

A failed load (a chunk that did not arrive) fails that one call, as a failed IndexedDB call did,
and the next call tries again. The kit's `toast` loads `sonner` the same way.

The peers stay optional peers, all four. Each is now needed only for what it serves:

- `@tanstack/react-query`: the entry itself;
- `@tanstack/react-query-persist-client`: the app's own `<PersistQueryClientProvider>`;
- `@tanstack/query-async-storage-persister`: the persisted cache;
- `idb-keyval`: the persisted cache's default store.

**What apps do.** Nothing. keksdose, kastlan and Kurvenschmiede persist their cache and keep all
four installed. In a production build, the persister and `idb-keyval` become chunks of their own,
fetched when the cache is first restored at start. An app that precaches its build's chunks in
its service worker (all three) has them offline too. Staunlabor does not use `/offline`.

**Tests:** `src/offline/__tests__/query-persistence-lazy.test.ts`:

- importing the entry and creating a persistence loads neither (each mock counts its own
  evaluation);
- a save, a restore and a `clear` through IndexedDB load each once;
- the sweep reads the same lazy store.

`packaging-contract.test.ts` "idb-keyval and the persister are imported on first use, not when the
entry loads" walks the entry's static imports. `scripts/verify-package.mjs` loads the installed
`/offline` with `@tanstack/react-query` alone, before it installs the other optional peers.

## `TranslationReviewPanel` takes `storage`

**What changed.** `TranslationReviewPanel` keeps one thing: its table view, under `storageKey`.
That is the sort, the page size and the single table's filters, widths and hidden columns, or
the groups' one view under `groupBy`. Since 0.62 it went to the provider's `tableStorage`, else
`localStorage`. The panel now takes `storage?: Storage` as `DataTable` does: where the view is
kept, for the single table and for the groups alike. The prop wins over the provider's. Left
out, nothing changes. Nothing else the panel holds is stored: the open editor and the folded
groups live as long as the panel.

**What apps do.** Nothing. An app that set `<UiKitProvider tableStorage>` for its shared-computer
session (0.62) already reaches the panel: keksdose
`frontend/src/features/translations/translations-page.tsx:271`. `storage` is for a panel that
should keep its view somewhere other than the app's other tables.

**Tests:** `src/components/__tests__/translation-review.groups.test.tsx` "storage (0.63)": the
groups read and write their view in the given `Storage`, over the provider's, and the ungrouped
table keeps its own there under the app's prefix. Neither writes to `localStorage`.

## The transfer dialog's "customer" texts are deprecated

**What changed.** `TransferOwnershipDialog` still has the reason "a customer" from Kurvenschmiede's
CUSTOMER role. That was an account that owned nothing and so could not receive work.
Kurvenschmiede dropped the role on 2026-11-12 (its migration 0060: every customer became a
member), and no app has customers any more. Both texts are deprecated for one minor and work as
before until 0.64 removes them.

**Deprecated (removed in 0.64):**

- `TransferUnavailable`'s `"customer"` → none: drop the case. A candidate the app cannot hand
  work to for a reason of its own takes its own words in `unavailable`.
- `TransferOwnershipLabels.customer` → none: drop the key from an app's own labels.
  `"customer"` goes with it.

The kit's seven catalogues keep `transferOwnership.customer` until then.

**What apps do.** Nothing. No app passes `unavailable: "customer"` or writes
`transferOwnership.customer` (searched in keksdose's, kastlan's and Kurvenschmiede's
frontends). Kurvenschmiede's `frontend/src/features/admin/users-panel.tsx:562` marks
deactivated accounts only.

**Tests:** `src/__tests__/deprecations.test.ts`:

- "names a member of a union type by its literal, in its type": the scanner now reads a tag on
  a union's `| "literal"`;
- "holds 0.63's": both tags, deprecated in 0.63 and removed in 0.64. This test goes with them in
  0.64.

## server-kit 0.29 for the backends

The account layer's backend half: `auth_router(AuthDeps)`, `invitations_admin_router`, the
`[sql]` tables and stores, `auth.testing` (server-kit's CHANGELOG and README, "Account layer").
Nothing in it breaks an app that stays on its own routes. For an app that moves onto it:

- **Run `generate:api` after every server-kit bump.** The kit's route docstrings become your
  OpenAPI schema's descriptions, so a server-kit release can change the generated types (keksdose's
  `check:openapi` found it).
- **A mail-kind check** that scans the app's `send_email(kind=...)` call sites no longer sees the
  account mails: the kit sends them. Add `set(eifi1_server_kit.auth.mails.ACCOUNT_MAIL_KINDS.values())`
  to the kinds it knows (keksdose's metrics guard).
