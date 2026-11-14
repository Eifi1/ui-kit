# Adopting `@eifi1/ui-kit` 0.64

ui-kit 0.64 ships with **server-kit 0.32** (the admin's half needs 0.30–0.31, the second factor
0.32). It continues the account layer (docs/auth-harmonization.md §12.9): the admin's half of
`@eifi1/ui-kit/accounts` — the routes of server-kit's `user_admin_router` on `client.api`, their
hooks, and four sections an app puts into its admin area — two-factor sign-in, and what
Staunlabor's, Kurvenschmiede's and keksdose's runs on the pre-releases found in the session, the
pages, the settings sections and the charts. Marcel, 2026-11-14: the three apps move to it
locally and deploy together, once all are ready.

**From 0.63, nothing else first.**

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**New words** (all seven catalogues; **es, hu and zh need native review**, and de-CH, fr and it
are new sentences, not yet reviewed):

- `accountFailure.codes`: the sentences for server-kit 0.30's admin refusals —
  `account_inactive`, `user_not_found`, `role_not_grantable`, `reviewer_is_admin`,
  `email_already_verified`, `deletion_not_requested`;
- the namespace `accountRoster`: the roster section's actions, the question each asks and what
  each says once done (38 words, 19 of them templates naming the account's name or address);
- `deleteAccount.requested`: the sign-in page's notice after a deletion request;
- `accountFailure.codes`: server-kit 0.32's `two_factor_invalid`, `two_factor_unavailable` and
  `two_factor_not_pending`;
- `accountSettings.twoFactor`: `replaceTitle`, `replaceHint` and `replace` (a lost
  authenticator's way back, keksdose's words in de-CH, fr and it), `setupReauth`, `turnedOn` and
  `turnedOff` (the accounts section's).
- the namespace `accountTranslations`: the review page's heading and line, its empty state, the
  source filter's two words, "Saved" and "Marked unreviewed".

**Must change** (in the types only; no app's code is affected today):

- `AccountErrorCode` (and `KitErrorCode` through it) has server-kit 0.30's admin codes and
  `account_inactive` — `account_inactive`, `user_not_found`, `role_not_grantable`,
  `reviewer_is_admin`, `email_already_verified`, `deletion_not_requested` — so an exhaustive
  `switch` over it adds them; `authErrorCode` now answers them instead of `undefined`;
- `AccountsApi` has the admin's methods (below): a test double that implements the interface
  whole adds them, or types itself `Partial<AccountsApi>`;
- `DeleteAccountLabels` has `requested`: a whole `deleteAccount` namespace written out (not a
  `LabelOverride`, which is partial) adds it;
- `AuthErrorCode` has server-kit 0.32's `two_factor_invalid`, `two_factor_unavailable` and
  `two_factor_not_pending`; `AccountsApi` has `twoFactorSetup`, `enableTwoFactor` and
  `disableTwoFactor`, and `AccountsClient` has `verifyCode` (a test double adds them).

**Behaviour that changes without a code change:**

- `AccountInvitationsSection` says a refusal beside its form, in the app's words first
  (`describeError`) and else the account words — no longer in a toast as well;
- a granted deletion request leaves for `/login?notice=deletion_requested` (the client's
  `signInPath` with the notice), where the sign-in page says the request was received;
- `SignInForm`'s code step says "Sign-in failed" instead of "Invalid 2FA code" for a server
  fault (a 5xx, server-kit 0.32's `two_factor_unavailable`): the code was not what failed.

## Two-factor sign-in (server-kit 0.32)

server-kit 0.32 mounts `/auth/login/2fa` and `/auth/me/2fa/setup|enable|disable` when the app
gives `AuthDeps(two_factor=…, secret_seal=…)` (its README, "Two-factor sign-in"). On the front:

- **The sign-in** needs nothing: `accountRoutes`' page passes `client.verifyCode` as `SignInForm`'s
  `onCode`, so an account with 2FA on is asked its code after the password, then signed in, or
  asked for the new password an admin required. A wrong or replayed code is the form's "Invalid
  2FA code"; a second factor the server cannot read, the account words for
  `two_factor_unavailable`. A passkey sign-in asks no code.
- **The settings**: `<AccountTwoFactorSection />` beside the others. A setup asks for the password
  first (`ReauthDialog`), draws the pending secret's QR code and key, and a code switches it on.
  While it is on, "Lost your authenticator?" sets up a new one with the password (the current one
  keeps working until the new code confirms it), and switching off takes the password and a live
  code. Props: `labels`, `reauthLabels`, `renderQr`, `id` (default `two-factor`).
- `TwoFactorSetting` (the card without the wiring) takes `onReplace` for the same way back.
- `client.api.twoFactorSetup(password)` → `{secret, otpauth_url}`, `enableTwoFactor(code)`,
  `disableTwoFactor({password, code})`; `useTwoFactor()` → `{ setup, enable, disable }`, the last
  two reading `/auth/me` again.

**keksdose**: its `two-factor-card.tsx` (the card, the replace card, the reauth dialog) is this
section; its `qr_svg` goes, the kit draws the QR code from `otpauth_url`.

## Charts

- `Treemap` takes `showValues` (keksdose live #517): each tile's value — the `valueFormatter`'s
  text, the one the tooltip prints — as a second, smaller line under its name, tagged
  `data-private`, drawn only where it fits whole (an amount is dropped rather than clipped). A
  `nodeNote` moves to a third line where the tile has the room; a group's band keeps its name.

## The admin's half (`client.api`, the hooks, the sections)

Built against server-kit 0.30–0.31's `user_admin_router` (its README, "User admin"). The app
mounts the router as it mounts `auth_router`; the frontend needs nothing but the client it has.

**The routes on `client.api`**, typed once: `roster(query)` (`GET /admin/users`: paging, sort,
search, the role and state filters; the answer carries the confirmation `levels`, the
transport and `summary.active_admins`), `setActive`, `setRole`, `requirePasswordChange`,
`withdrawPasswordChange`, `sendAccountMail` (`kind: "verification" | "password_reset"`; a console
transport's answer carries the link), `setReviewer`, `eraseAccount`, `adminActions(query)`,
`adminAttention()`, `adminMail()` (`GET /admin/mail`, the transport before any mail) and
`mailTest()`.

**The hooks**, under `accountQueryKeys.admin`, so an action refreshes the roster, the overview's
counts and the log together: `useAdminRoster(query)`, `useAdminUserActions()` (one mutation per
action), `useAdminActions(query)`, `useAdminAttention()`, `useAdminMail()` (read once per
sign-in) and `useMailTest()`.

**The sections**, each a part of the kit's admin area wired to those hooks:

```tsx
import {
  AccountAdminLogSection,
  AccountAdminOverviewSection,
  AccountInvitationsSection,
  AccountMailTestSection,
  AccountUserRosterSection,
} from "@eifi1/ui-kit/accounts";

const ROLES = { ADMIN: { label: t("roles.ADMIN"), tone: "brand" }, MEMBER: { label: t("roles.MEMBER") },
  REVIEWER: { label: t("roles.REVIEWER") } } as const;

<AccountAdminOverviewSection />                                  // /admin, the landing page
<AccountUserRosterSection roles={ROLES} reviewer={{ languages: LANGUAGE_CODES }} />  // /admin/users
<AccountInvitationsSection roles={ROLES} invitableRoles={["MEMBER", "REVIEWER"]} />  // /admin/invitations
<AccountAdminLogSection roleLabel={(role) => ROLES[role]?.label ?? role} />          // /admin/activity
<AccountMailTestSection />                                        // with the system settings
```

- **`AccountUserRosterSection`** pages, sorts and searches on the server, its state in the URL
  under `users.` (a link to "page 3, by last sign-in" works), and reads the overview tile's
  `?state=deletion_requested` as server-kit's `deletion_scheduled`. Every action asks at the
  level the server states (`AdminActionConfirm`): a role change and a required password are
  acknowledged, a deactivation and an erasure type the address. Nobody changes their own role or
  the last active admin's. On a console transport the mail actions show the link to copy and
  hand on. Two actions exist only on some servers and are the app's to switch on: `reviewer`
  (the reviewer's languages and areas, `ReviewerScopeEditor`; a server whose policy names
  `review_locales`) and `erase` ("Erase now"; the `operator` deletion mode). `choosable` names
  the roles the select sets (default: every role but `REVIEWER`); `extraColumns` and
  `extraActions` carry the app's own. Nothing is kept in the browser: the table gets no
  `storageKey`.
- **`AccountAdminLogSection`** reads the log a page at a time; any person's name in it narrows
  the log to that account — by its id, or by the address an erased account's rows kept
  (server-kit 0.31's `target_email`). A role row reads "Member → Admin" through `roleLabel`; the
  app's own actions through `describeDetail`.
- **`AccountAdminOverviewSection`** is `AdminOverview` on `GET /admin/attention`, with its
  "Try again"; **`AccountMailTestSection`** is `MailTestCard`, to the signed-in admin's address.

## The review page (`AccountTranslationReview`)

Built against server-kit 0.31's `translation_review_router` (`GET` and `PUT
/translations/reviews`, `POST /translations/reviews/clear`), which the app mounts on its
`current_user` with its grant (`review_grant`: an admin every language, a reviewer what an admin
granted through the roster). `client.api` has the three routes; `useTranslationReviews()` reads
the verdicts the viewer may see and saves and clears them in the server's chunks, each answer
patching the cached list.

`AccountTranslationReview` is Kurvenschmiede's `TranslationsPage` as a kit part: the language
tabs, `TranslationReviewPanel` with its groups, swipe and Undo, the export of corrections, and
the empty state for a viewer the server grants nothing. The app hands it what only it knows:

```tsx
<AccountTranslationReview
  loadStrings={loadBundle} // one language's catalogue as the app ships it
  kitWords={{ operator: OPERATOR }} // the kit's words under `kit.`, its legal text as the page shows it
  referenceOf={(code) => (code === "de-CH" ? "en" : "de-CH")} // default: English, and English against German
  reviewAreas={["experiments", "legal"]} // the server's review_areas; default ["legal"]
  areaLabels={{ experiments: t("areas.experiments") }}
  exportName="staunlabor" // staunlabor-translation-corrections-<date>.json
/>
```

The language, the filters and the search live in the address. Nothing is kept in the browser
unless the app passes `storageKey` (the panel's sort and page size).

## The feedback pages (`AccountFeedbackPage`, `AccountPublicFeedbackPage`, `useAccountFeedbackSubmit`)

Built against server-kit 0.31's `feedback_router`, which the app mounts on its `current_user` as
the feedback's actor. The kit's feedback parts (`@eifi1/ui-kit/feedback`) did the drawing
already; what each app wrote around them — the routes, the three mutations, whose the inbox is,
where a vote's answer goes, the submit dialog's requests — is the kit's now:

```tsx
<Route path="/feedback" element={<AccountFeedbackPage mine={false} />} />    // the admin's inbox
<Route path="/my-feedback" element={<AccountFeedbackPage mine />} />         // everybody's own
<Route path="/all-feedback" element={<AccountPublicFeedbackPage fallback={<NotFoundPage />} />} />

const submit = useAccountFeedbackSubmit({ version: __APP_VERSION__ });  // the menu's open(category)
<FeedbackMenu onFile={submit.open} myFeedbackHref="/my-feedback" inboxHref="/feedback" />
{submit.dialog}
```

- **`AccountFeedbackPage`** is `FeedbackInbox` on `GET /feedback` (`mine={false}`, an admin's)
  or `GET /feedback/my`; anybody but an admin who opens the inbox is sent to `myPath` (default
  `/my-feedback`), the link's `?row=` kept. Every edit is one `PATCH`; a reply or a rework's
  answer goes into the list at once. Who is the admin (`isAdmin`, default `role === "ADMIN"`)
  and who reads the public parts — the votes column and a report's comments (`publicReader`,
  default everybody signed in but a demo, as server-kit's `public_viewer`) — are the app's to
  say; `swipe`, `pageLinkParams` and `table` go to the inbox.
- **`AccountPublicFeedbackPage`** is `FeedbackPublicPage` on `GET /feedback/public` and
  `/public/{id}`, its sort, search, page and open report in the address; a vote's answer is
  written into every cached view of the report.
- **`useAccountFeedbackSubmit`** is `useFeedbackSubmit` on `POST /feedback/attachments` and
  `POST /feedback`, the signed-in account as the reporter.
- **`accountFeedbackApi(client.http)`** (`useAccountFeedbackApi()` in a component) has the routes
  for anything else; `createAccountsClient` hands out its instance as `client.http`, and a
  request takes `headers` and `signal`.

Nothing new is stored in the browser; the file parts fetch through the session.

## The settings sections

- `AccountInvitationsSection` takes `intro`, `listTitle` and `className` (the panel's), reads the
  transport on load (`GET /admin/mail`) so the console's hint is there before the first
  invitation — unless the app names it, `mailBackend` — takes `describeError` and `appCode`, and
  calls `onChanged` after an invitation is made, sent again or revoked.
- `AccountDeletionSection` takes `labels` (the card's `deleteAccount` words);
  `AccountPasskeysSection` takes `labels` (the card's) and `reauthLabels` (the password question
  before a passkey is added).

## The session and the pages

- `createAccountsClient` takes `privatePaths` as the other way to say which pages need a
  session (one of `publicPaths` and `privatePaths`; both or neither is a `TypeError`).
- `signOut({ notice: "deletion_requested" })` leaves for the sign-in page with the notice;
  `useAccountDeletion` sends it.
- `accountRouteElements(options)` answers the pages as `<Route>` elements for an app with JSX
  `<Routes>`; `accountPage(name, options)` one page's element, for an app that loads each
  lazily. `RequireSession` is a module of its own, so gating eager routes with it no longer pulls
  every form into the first load.
- `useAccountStorageLines(prefix)` answers each key the session keeps with its privacy sentence.
- `createAccountsClient` takes `onPassword(password, step)` (keksdose's KG-9): the password the
  server just took at a sign-in, a sign-up, the forced change and `client.api.changePassword`,
  for an app that keeps a digest of it (keksdose refuses an encryption passphrase that is the
  same string). Never for a refused one.
- `createAccountsClient` takes `pageMode: "per-page"` (keksdose's KG-10): the shared-computer
  mode belongs to the page, read once as it loads (`client.pageShared`), so the app opens its
  stores in the right place once (`createMemoryStorage()` on a shared computer's page). A
  sign-in whose box differs from the page is handed to a fresh load of the tab, and
  `client.afterSignIn(href, inApp)` makes that load (the kit's sign-in and sign-up pages call
  it; an app's own page does too). `accountStorageEntries` lists the two keys it keeps in the
  tab for it, under the session's line. keksdose's `shared-session.ts` hand-over is this.
- `useFailureBeside` is public, for an app's `describeError` beside a kit part.
- `/demo/ended` stands in the app's `frame`; an accepted invitation names what it joined
  (server-kit 0.32's `group`, or the app's field through `invitationName`).
- `SignInForm`'s `onCode` is optional: without it a `2fa` answer reads as a failed sign-in.
- `@eifi1/ui-kit/testing`'s `stubDocumentNavigation` records the kit's full-document
  navigations, which jsdom does not implement.

### Per app

- **Staunlabor**: the admin area on the four sections (`reviewer` on, its areas `experiments`
  and `legal`; `erase` on: its deletion mode is `operator`, so a request deactivates the account
  and the admin erases it) and the review page at `/translations`.
- **Kurvenschmiede**: `UsersPanel` and `MailTestPanel` go; its teams' and plans' columns and
  actions stay its own (`extraColumns`, `extraActions`). Its `ActivityPanel` stays for now: the
  log section reads a person as the target, not yet a team's rows (`target_group_*`).
