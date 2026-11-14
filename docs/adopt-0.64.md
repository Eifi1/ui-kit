# Adopting `@eifi1/ui-kit` 0.64

ui-kit 0.64 ships with **server-kit 0.30–0.31**. It continues the account layer
(docs/auth-harmonization.md §12.9): the admin's half of `@eifi1/ui-kit/accounts` — the routes of
server-kit's `user_admin_router` on `client.api`, their hooks, and four sections an app puts into
its admin area — and what Staunlabor's and Kurvenschmiede's runs on the pre-releases found in the
session, the pages and the settings sections. Marcel, 2026-11-14: the three apps move to it
locally and deploy together, once all are ready.

_This document is written as the round goes; the parts still to come (the feedback pages, the
second factor) add their own sections._

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
  `LabelOverride`, which is partial) adds it.

**Behaviour that changes without a code change:**

- `AccountInvitationsSection` says a refusal beside its form, in the app's words first
  (`describeError`) and else the account words — no longer in a toast as well;
- a granted deletion request leaves for `/login?notice=deletion_requested` (the client's
  `signInPath` with the notice), where the sign-in page says the request was received.

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
- `useFailureBeside` is public, for an app's `describeError` beside a kit part.
- `/demo/ended` stands in the app's `frame`; an accepted invitation names what it joined
  (server-kit 0.32's `group`, or the app's field through `invitationName`).
- `SignInForm`'s `onCode` is optional: without it a `2fa` answer reads as a failed sign-in.
- `@eifi1/ui-kit/testing`'s `stubDocumentNavigation` records the kit's full-document
  navigations, which jsdom does not implement.

### Per app

- **Staunlabor**: the admin area on the four sections (`reviewer` on, its areas `experiments`
  and `legal`; `erase` off: its daily call erases after the waiting days).
- **Kurvenschmiede**: `UsersPanel` and `MailTestPanel` go; its teams' and plans' columns and
  actions stay its own (`extraColumns`, `extraActions`). Its `ActivityPanel` stays for now: the
  log section reads a person as the target, not yet a team's rows (`target_group_*`).
