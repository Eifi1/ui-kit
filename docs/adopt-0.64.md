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
  each says once done (40 words, 19 of them templates naming the account's name or address;
  `roleToAdminBody` and `roleFromAdminBody` for a change to or from the admin role, and
  `requirePasswordChangeBody` says every session ends at once);
- `deleteAccount.requested`: the sign-in page's notice after a deletion request;
- `accountFailure.codes`: server-kit 0.32's `two_factor_invalid`, `two_factor_unavailable` and
  `two_factor_not_pending`;
- `accountSettings.twoFactor`: `replaceTitle`, `replaceHint` and `replace` (a lost
  authenticator's way back, keksdose's words in de-CH, fr and it), `setupReauth`, `turnedOn` and
  `turnedOff` (the accounts section's), and the backup codes' `backupTitle`, `backupHint`,
  `backupLeft(count)`, `backupRenew`, `backupRenewHint`, `backupCopy`, `backupDownload`,
  `backupDone`;
- `accountRoster`: `resetTwoFactor`, `resetTwoFactorTitle(name)`, `resetTwoFactorBody`,
  `twoFactorReset(email)`; `adminActionLog.actions.two_factor_reset`; `accountFailure.codes`'
  `two_factor_not_enabled`.
- the namespace `accountTranslations`: the review page's heading and line, its empty state, the
  source filter's two words, "Saved" and "Marked unreviewed".
- the namespace `accountTeams`: the teams' parts (below) — Kurvenschmiede's `teams.*` words, as
  its reviewers read them, with the kit's "administrator" — and a team's six coded refusals
  (`accountTeams.codes`); `team_not_found`'s sentence and `team_changed`'s second half are new.
- `feedbackToast.legacyReworkAppend`: the coded `legacy_rework_append` on the feedback pages
  ("This page is out of date. Reload it and try again.").

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
  `disableTwoFactor`, and `AccountsClient` has `verifyCode`, `pageShared`, `afterSignIn` and `http`
  (a test double adds them);
- `AdminActionKind` (and `ADMIN_ACTION_KINDS`) has server-kit 0.32's `two_factor_reset`: an
  exhaustive `switch` over it adds the case.

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
- **Backup codes and the admin reset** (Marcel 2026-11-14, over keksdose's "none": a lost
  phone with no passkey locked the account out for good). Switching on answers ten backup codes,
  which the section shows once (copy, download, "I have saved them"); then "N backup codes
  left." and "Make new backup codes" behind the password. The sign-in page's code step offers
  "Use a backup code" (`SignInForm`'s `recoveryCode`), sent in the same `code`.
  `AccountUserRosterSection` takes `twoFactorReset` (the server mounts the route with its second
  factor): "Reset two-factor sign-in" on another account with it on, acknowledged; the account
  is told by mail. The log words it ("Two-factor sign-in reset").
- `TwoFactorSetting` (the card without the wiring) takes `onReplace` for the same way back, and
  `backupCodes` (`fresh`, `left`, `onRenew`, `onDismiss`, `fileName`).
- `client.api.twoFactorSetup(password)` → `{secret, otpauth_url}`, `enableTwoFactor(code)` →
  `{backup_codes}`, `twoFactorStatus()` → `{enabled, backup_codes_left}`,
  `renewBackupCodes(password)` → `{backup_codes}`, `disableTwoFactor({password, code})`, and the
  admin's `resetTwoFactor(id, confirmation)`; `useTwoFactor()` → `{ status, setup, enable,
  disable, renew }`, each change reading `/auth/me` and the status again.

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
  `extraActions` carry the app's own, typed on the app's row (the second type parameter,
  `AccountUserRosterSection<Role, Row>`). The Reviews column names an area-limited reviewer's
  areas in `reviewer.areas`' words; the confirmation dialog says its own refusals (the last
  admin, oneself, a mistyped address) in its words; a role change to or from the admin role says
  what it brings (`roleToAdminBody`, `roleFromAdminBody`), and requiring a new password says
  every session ends at once. Nothing is kept in the browser: the table gets no `storageKey`.
- **`AccountAdminLogSection`** reads the log a page at a time; any person's name in it narrows
  the log to that account — by its id, or by the address an erased account's rows kept
  (server-kit 0.31's `target_email`). A role row reads "Member → Admin" through `roleLabel`; the
  app's own actions through `describeDetail`. A group's rows (Kurvenschmiede's teams,
  `target_group_*`) have the group as their target, a membership row the person with the group
  beside them, its role through `groupRoleLabel`; a group with no name left reads as the noun's
  "a deleted team".
- **A reviewer row with no language reads "No longer a reviewer"** (`adminActionLog.reviewerNone`,
  all seven catalogues; Kurvenschmiede on 0.64.0-dev.6): the grant was withdrawn, which "No
  languages" misread.
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

- The feedback's query keys sit under their own root, `["feedback", …]` (`accountQueryKeys.feedback*`),
  beside the comment threads (`feedbackCommentsQueryKey`), not under `accounts`: an app persisting
  its cache denies the account's root and may keep a reader's own reports (`["feedback", "mine"]`)
  for offline. `AccountsProvider` drops both roots when the account changes.
- **The account is `/auth/me`'s, else the session's** (Kurvenschmiede on 0.64.0-dev.6): after a
  failed first `/auth/me` both pages draw for the account the session holds, no longer their
  spinner for good, and `useAccountFeedbackSubmit` files the report in that account's name, no
  longer in nobody's.
- **A refusal keeps its reason** (Kurvenschmiede on 0.64.0-dev.6): both pages take
  `describeError`, asked first as on the other account sections; then the coded
  `legacy_rework_append` in the kit's words, the account words, and for an uncoded 4xx the
  server's `detail` sentence, as the apps showed it before — no longer "Could not save that
  change." or "Could not send the reply." for every refusal. The comments and the vote toast
  text: there an answer of `describeError` that is not a string is the kit's words.

## Teams (opt-in)

Built against server-kit 0.32's `eifi1_server_kit.teams` (`teams_router`, `teams_admin_router`;
Marcel, 2026-11-14). **Nothing changes for an app that mounts neither part**: no request is made,
no word is shown, and the account's and the admin's other parts behave as before.

```tsx
// The admin's area: one more section, in the app's own sidebar entry
<AccountTeamsSection />                                   // anchor "teams"
// A member's page
<Route path="/teams" element={<AccountTeamsPage />} />
```

- **`AccountTeamsSection`** (`GET /admin/teams`): every team in a table — its name, how many are
  in it, its managers, its waiting invitations — a row opening the team's people under it (a
  dialog on a phone). Create by name; rename in a dialog, against the version read
  (`If-Match`); delete on `AdminActionConfirm` at the level the server states (`group_delete`,
  `acknowledge`), the tick under what goes with the team, counted from the team in hand ("2
  members, 3 shares and 1 invitation"; the shares are the app's `grant_count`). In the open
  team: add anybody by address as a member or a manager — an address with no account is invited
  into the team, in the language picked (`languages`, default the kit's seven) — switch a
  member's role, remove anybody, re-send or withdraw a waiting invitation (through the account
  layer's `/admin/invitations/{id}`: the admin's teams router has none).
- **`AccountTeamsPage`** (`GET /teams`): the caller's teams, each a card with its members. A
  manager adds members (never a manager) against the version read, removes members after
  asking, and re-sends or withdraws the team's invitations. Adding and re-sending are `commit`s,
  removals `COMMIT_EXCEPT_BILLING`: an app with a billing lock (server-kit's `billing_gate`) puts
  its `WriteLockProvider` round the page.
- An add or a re-send that **invited** says so; while the server's mail is the console's, the
  link is shown above the teams to copy and hand on.
- A team's refusal is said from `accountTeams.codes`, naming the team or the address the answer
  carries; the parts read the team again after a refusal, so a team that moved on
  (`team_changed`) shows as it is now. `describeError` and `appCode` (the app's `billing_gate`'s
  and `refuse_address`' codes) are asked first.
- **`accountTeamsApi(client.http)`** has the routes for anything else; the hooks are `useMyTeams`, `useTeamActions`,
  `useAdminTeams` and `useAdminTeamActions`, and the wire's types `AccountTeam`,
  `AccountAdminTeam`, `AccountTeamMember`, `AccountTeamInvitation`, `AccountTeamRole`.
- Their query keys sit under their own root, `["teams", …]` (`accountQueryKeys.teams`,
  `teamsMine`, `teamsAdmin`), beside the feedback's; `AccountsProvider` drops it when the account
  changes. `accountTeams.title` and `adminHelp` are the words for the app's sidebar entry.
- **The admin's log words a team's deletion** (Kurvenschmiede on 0.64.0-dev.6):
  `AccountAdminLogSection` reads a `group_delete` row's `{members, grants, invitations}` as the
  delete dialog counted them ("2 members, 3 shares and 1 invitation", `accountTeams`' count
  words, a count of nothing left out). An app's `describeDetail` for it can go.
- **The add row asks the language before Add** (Kurvenschmiede on 0.64.0-dev.6): the tab goes
  address → role (the admin's) → language → Add, and the row has a column per field at `sm`, so
  the language no longer wraps under the address.

## The settings sections

- `AccountInvitationsSection` takes `intro`, `listTitle` and `className` (the panel's), reads the
  transport on load (`GET /admin/mail`) so the console's hint is there before the first
  invitation — unless the app names it, `mailBackend` — takes `describeError` and `appCode`, and
  calls `onChanged` after an invitation is made, sent again or revoked.
- `AccountDeletionSection` takes `labels` (the card's `deleteAccount` words);
  `AccountPasskeysSection` takes `labels` (the card's) and `reauthLabels` (the password question
  before a passkey is added); `AccountPasswordSection` takes `labels` (the card's).
- `DEFAULT_ADMIN_ATTENTION_HREFS` is exported from the main barrel, for an app's own link to the
  roster's filters (an every-page deletion banner).

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
  tab for it, under the session's line, when asked with `{ pageMode: "per-page" }` (so does
  `useAccountStorageLines`). keksdose's `shared-session.ts` hand-over is this.
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
- **Kurvenschmiede**: `UsersPanel`, `MailTestPanel` and `ActivityPanel` go; its teams' and plans'
  columns and actions stay its own (`extraColumns`, `extraActions`), and the log section shows its
  team rows (`groupNoun="team"`, `groupRoleLabel` for "Member → Manager", `describeDetail` for a
  team deletion's counts). With server-kit 0.32's teams, `TeamsPanel`, `TeamsPage`, `TeamCard`,
  `team-toll.ts` and `announce-invited.ts` go too: `AccountTeamsSection` and `AccountTeamsPage`
  speak its wire, and its `teams.*` and the five `error.refusal.*` team words are the kit's.
