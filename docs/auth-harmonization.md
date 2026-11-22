# Sign-in, sign-up and the account across the kit and the three apps — harmonisation plan

Led from ui-kit at Marcel's request. It is built from a read-only audit of the three apps
(keksdose `cd0c5954`, kastlan `1674ad6` plus its local `feat/auth-pages`, Kurvenschmiede
`628af3e`), kept outside the repo, and Marcel's decisions in §2.

This is the first part of the user-management round. The admin side (user list, roles,
deactivation, allow-list screens, audit) is its own contract
(`docs/user-admin-harmonization.md`) and builds on this one. It follows the pattern of the
feedback and legal rounds: **one contract + kit parts + server-kit parts**. keksdose is
the reference wherever §2 doesn't decide otherwise.

Paths below are relative to each repo: **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the reviews
and adoptions that amended a section are folded into it, and the table names them.
Snapshots, per-repo to-dos and the review logs are in
[archive/auth-history.md](archive/auth-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | decisions 9–13 after the reviews (§10); decisions 14–16 (2026-11-12, 2026-11-13) |
| 3 | The account | ui-kit 0.29.0, server-kit 0.3.0 | §10.6 |
| 4 | Sign-up | ui-kit 0.29.0, server-kit 0.3.0 | §10.4, §10.7, §10.8, §10.12–14; ui-kit 0.30.0 (`defaultEmail`, `token_expired`) |
| 5 | Sign-in | ui-kit 0.29.0, server-kit 0.3.0 | §10.1, §10.9, §10.10, §10.15; ui-kit 0.30.0 (the 429 line); server-kit 0.8.0 (`absent_account_check`); ui-kit 0.62, server-kit 0.27 (`shared_device`, §2.14) |
| 6 | The session | ui-kit 0.29.0, server-kit 0.3.0 | §10.2, §10.3, §10.11; §11; §2.14–16: ui-kit 0.62, server-kit 0.27 (a shared session's short life, every sign-out revokes, push dropped) |
| 7 | Signed-out pages | ui-kit 0.29.0 | §10.10 |
| 8 | What the kits add | ui-kit 0.29.0, server-kit 0.3.0 | §10.5, §10.6, §10.11; later releases as listed there (ui-kit 0.62) |
| 9 | Per repo | — (archived) | |
| 10 | Settled after the reviews | — | index; folded items point to their § |
| 11 | Session refresh | ui-kit 0.34.0, server-kit 0.8.0 | §11.7 |
| 11.1, 11.5 | Where each one stands; per app | — (archived) | |
| 11.7 | Settled after the reviews | — | index; folded into §11.2–§11.4 |
| 12 | Layer 2: the kits run the account routes, server and frontend | ui-kit 0.63–0.65, server-kit 0.29–0.32 | §12.8; §12.9 (0.64: admin, second factor, review, feedback, teams) |

## 1. Where each one stands

Moved to [archive/auth-history.md](archive/auth-history.md): the three apps' sign-in,
sign-up and session as the audit found them (2026-10-05), and the kit's parts before 0.29.

## 2. Decisions (Marcel, 2026-10-05)

1. **The user signs in, always**: email and password, or a passkey, then the second
   factor if it is on. Nothing else is part of signing in: no company, household or team.
2. **Everything else is associated with the user.** kastlan's companies, keksdose's
   households and budgets, and Kurvenschmiede's teams belong to the user. They are
   attached at sign-up, by an invitation, or by an admin, and loaded after sign-in.
3. **First and last name, both required**, at sign-up in every app. `display_name` as
   an input goes.
4. **Existing keksdose and Kurvenschmiede users** keep their whole display name as the
   first name. They are asked once, after their next sign-in, to complete first and last
   name. Nothing is split by guesswork.
5. **kastlan's sign-up form keeps "Company"**: it creates the company, and the user
   becomes its admin.
6. **A kastlan user can belong to several companies**, with a company switcher after
   sign-in.
7. **Every app gets the full set of signed-out pages**: sign-in, register, forgot
   password, reset password, verify email, a 404 and the legal pages (legal contract §7.9).
8. **Kurvenschmiede's email verification waits for the kit parts**, so it is built once.
   As in keksdose, verification does not gate sign-in.

After the reviews:

9. **kastlan locks its company data to staff now.** Every company-data route requires
   an employee role, TENANT leaves the create and invite dialogs, and kastlan checks
   production for existing tenant accounts. The review found that a TENANT reads the
   whole company: about 100 routes check only that someone is signed in, and RLS
   separates companies, not the people in one. A tenant portal comes later.
10. **A deactivated account gets the same answer as a wrong password**, plus a hint under
    the form: "Account deactivated? Write to …". A separate message after a correct
    password would confirm to an attacker that a leaked password is right.
11. **Only admins and team managers bring a new person in, and the invitation defines
    the company** (or team): a sign-up through an invitation needs no Company field, and
    the invitee joins what the invitation names, in the role it names.
12. **An allow-list entry becomes an invitation**: only the mailbox owner can register,
    and "resend" mints a new token. The environment list stays only to bootstrap the
    first admin.
13. **The address tag in every app** (0.29.0): the sign-up form offers
    `you+<app>@example.com` as one click, as keksdose does (§4.5).

Later (Marcel, 2026-11-12 and 2026-11-13; ui-kit 0.62, server-kit 0.27). The 0.61 rule kept a
shared-computer session in `sessionStorage` "so it ends with the tab", but Chrome and Firefox
bring a closed tab back with its sessionStorage (kastlan's finding; keksdose's test in Chromium
156), and the next person at a library PC reopened it signed in:

14. **A shared-computer sign-in has a short life.** The sign-in says so (`shared_device: true`,
    §5.1), and the server ends that session after 15 minutes idle and 4 hours at most
    (server-kit 0.27 `SessionPolicy`, §6.2). The client keeps it in the tab's storage, so a
    reload keeps it, and the server's limit covers a tab the browser restores; or, stricter,
    in page memory, where a reload signs out (docs/local-first-harmonization.md D6; Marcel
    2026-11-13: the tab's storage is the default). It signs an abandoned tab out after 15
    minutes without input (`useSharedComputerIdleSignOut`, §6.3).
15. **Every sign-out ends the session on the server**, shared or not: the client calls the
    app's revoke of this session first, then drops its tokens (§6.3).
16. **No push on a shared computer, and every sign-out drops this device's push** (2026-11-13):
    a push subscription belongs to the browser, not to the tab or the sign-in (§6.3, §8).

## 3. The account

### 3.1 Fields (the core every app has)

| Field | Rule |
|---|---|
| `id` | |
| `email` | unique. **Trimmed and lower-cased at every entry**: sign-up, sign-in, reset, invite, allow-list, admin |
| `first_name`, `last_name` | both required at sign-up, 1–120 characters after trimming (the old `display_name` limit, so a migrated name fits; kastlan widens its columns from 100), any script. Migrated rows may hold an empty `last_name` until completed (§3.3). Plaintext, because lists sort by them |
| `locale` | from the sign-up form, defaulting to the UI language; used for every mail to the user |
| `is_active` | |
| `email_verified_at` | null = unverified |
| `created_at`, `last_login_at` | `last_login_at` is stamped on sign-in, not on refresh (keksdose's rule) |
| `sessions_invalid_before` | the cut-off that ends sessions (keksdose, Kurvenschmiede). kastlan keeps its session rows (§6.3) |
| `role` | the app's vocabulary. In kastlan, roles are **per company** (§5.3) |

### 3.2 Showing a name

One rule everywhere a name is shown: the top bar, the account menu, user lists,
avatars, feedback, and the greeting in a mail.

- **Order follows the language**:
  - "First Last" in de-CH, en, fr, it and es;
  - **"Last First" in hu**;
  - **"LastFirst" with no space in zh**, for a name written in CJK script in both parts
    (李 + 小龙 → 李小龙). A Latin name stays as written: "Ada Lovelace", never
    "LovelaceAda" (refined while building, 0.29).
- The kit gets `formatPersonName({ first, last }, locale)` and `personInitials(…)`.
  `UserAvatar` uses them. server-kit gets `full_name(first, last, locale)` for mails and
  for `stamp_identity`. The feedback context keeps its `user_display_name` key, filled
  with the formatted name.
- **APIs keep a read-only `display_name`**, derived the same way, so everything that only
  shows a name keeps working. Writes take `first_name` and `last_name` only.
- **Every API that returns a person returns `first_name` and `last_name`**: lists,
  members, shares, comment authors, not only `/auth/me`. The client formats them in the
  reader's language. `display_name` beside them is a fallback, and an app may drop it one
  release after its clients read the two (keksdose, 2026-10-07).
- **Whose language decides the order** (§10.6):
  - on screen, the reader's: the kit formats from `first_name` and `last_name`, and the
    API's `display_name` is only a fallback;
  - in a mail or a push, the recipient's;
  - in a copy frozen at the time of writing (the feedback stamp), the author's.
- **Lists sort by `(last_name, first_name, id)`** in SQL. While a migrated `last_name` can
  be empty (§3.3), sort by `COALESCE(NULLIF(last_name, ''), first_name), first_name, id`,
  so a first-name-only person sorts among the last names instead of first. Search matches
  first name, last name, and both orders of the two together.

### 3.3 Migrating keksdose's and Kurvenschmiede's users

- `first_name` = the old `display_name`, `last_name` = empty.
- `/auth/me` answers `name_incomplete: true` while either is empty.
- After sign-in the app shows the kit's **`CompleteNameDialog`**: first and last name,
  prefilled with what is there, and a save button. Dismissing it only defers it to the
  next sign-in.
- Nothing else waits on it: an incomplete name blocks no page.
- **A demo user never counts as incomplete**: keksdose's demo session gets a complete
  name, or `name_incomplete` is false whenever `is_demo`.
- `name_incomplete` is also in the user inside the sign-in answer, for an app that boots
  from it (§6.1).

## 4. Sign-up

### 4.1 The form (kit `RegisterForm`, the same in every app)

1. First name
2. Last name
3. Email (prefilled when the sign-up comes from an invitation), with the **address-tag
   suggestion** (§4.5)
4. Password, with the strength meter
5. Confirm password. keksdose and kastlan have it; Kurvenschmiede gains it.
6. Language, preselected from the UI language
7. **App fields**, in a slot:
   - kastlan: **Company**, required unless the sign-up comes from an invitation;
   - keksdose: reporting currency.
8. `LegalAcceptCheckbox` (legal contract §3.4), then "Create account".

### 4.2 The request

`POST /auth/register`
`{ email, password, first_name, last_name, locale, invite_token?, …app fields }`

- Answers `201` with the sign-in answer of §6.1, so the user is signed in right away.
- A verification mail goes out, but it gates nothing (§2.8).

### 4.3 Who may register, and what they get

- **Gate** (the same everywhere already):
  - the first user ever becomes the admin;
  - after that, the address must carry a valid **invitation** (§4.4). An allow-list entry
    *is* an invitation (§2.12); the environment list only bootstraps the first admin;
  - anyone else gets `403 {code: "registration_closed"}`.
- **The role and the associations never come from the form.** They come from:
  - **an invitation** (§4.4): the company and its role in kastlan, the role in
    Kurvenschmiede, the budget share in keksdose;
  - **the allow-list row**: Kurvenschmiede's role;
  - **the app's default**:
    - keksdose: MEMBER, with the user's own household;
    - kastlan with "Company": a new company, with the user as its admin;
    - Kurvenschmiede: MEMBER.
- **kastlan's "join the first active company" path goes.** Without an invitation, the
  company field is required.
- **kastlan's allow-list** is the platform's: only a superuser reads or writes it, so no
  company's admin sees another company's invited addresses and notes. Company admins
  invite people into their own company (§4.4).
- **Registering through an invitation proves the mailbox**, so the account starts with
  `email_verified_at` set, but **only when the registered address is exactly the
  invited one**. A tagged registration (§4.5) gets its own verification mail like any
  other: the token reached `you@x`, which says nothing about whether `you+app@x` is
  delivered.
- **TENANT is not an invitable role** in kastlan until a tenant portal exists (§2.9).
  Kurvenschmiede invites members only: its CUSTOMER (never a team manager, on an
  invitation either) went in its migration 0060 (Marcel, 2026-11-12).

### 4.4 Invitations (one shape)

- An invitation is a **token**: hashed, single use, **14 days** (keksdose's budget-share
  invite). The 14 days are the unused link's lifetime, not the account's: an account made
  through an invitation is permanent, and its holder signs in long after the link ran out
  (§10.14).
- It is bound to:
  - **an email address**;
  - **a scope**: a kastlan company, a Kurvenschmiede team or registration, or a keksdose
    budget;
  - **a role**;
  - the inviter.
- **Who may invite a new person**: admins and team managers (§2.11). **keksdose's
  exception** (Marcel, 2026-10-07): a budget OWNER who is no admin may share a budget
  with an address that has no account, and that invitation lets the person register.
  It is a token invitation scoped to the budget, role guest, in the invitee's language,
  14 days. Its holder passes `registration_decision` as `invite`, whoever minted it. A Kurvenschmiede
  team manager invites into the team; a kastlan company admin into the company. A
  member's share to an unknown address stays a pending grant, attached by address once
  the person is let in.
- The mail goes out in the **invitee's** language, picked in the invite dialog (i18n H7).
  The link is `/register?invite=<token>`.
- Shown once: the token is stored hashed, so an admin page cannot show the link again.
  "Resend" mints a new token. An expired invitation stays listed as expired until it is
  resent or removed.
- **The address has no account yet**: the sign-up form opens with the email fixed. On
  success the invitation is spent and attached.
- **The address has an account**: the link leads to sign-in, then the app attaches the
  invitation (`POST /auth/invitations/accept {token}`). This is how a kastlan user joins
  a second company.
- keksdose's and Kurvenschmiede's token-free `/register?email=` beta links become
  invitations with the registration scope.
- **keksdose's budget-share invites take this shape** (§10.8). The old ones (plaintext
  token, optional address, no mail, `/join?token=` behind sign-in, passing the sign-up
  gate through the allow-list) keep working for their 14 days.
- **No admin-created accounts**: no admin chooses anyone's password. kastlan's interim
  (create the user, mail a set-your-password link on the reset token, 72 h) is replaced
  by this invitation, with no data migration (§10.4).

### 4.5 The address tag (keksdose's, for every app — Marcel, 2026-10-05)

Under the email field, once the address is plausible, the form offers the address with
the app's name as a sub-address, as **one click with the exact result on the button**:
"Use you+kastlan@example.com". After it a short hint reads: many providers deliver
`name+tag@…` to the same inbox, so the app's mail is easy to filter and trace; check
yours does; you then sign in with the tagged address.

- **Offered, never applied.** `+` is valid in an address (RFC 5322), and sub-addressing
  is specified (RFC 5233). But it is a convention the *receiving* server may implement:
  Gmail, Outlook, iCloud, Fastmail and Proton do; many Exchange installs, small hosters
  and corporate filters don't. Silently rewriting would send the verification mail down
  a path nobody checked, and the user would sign in with an address they never typed
  (keksdose `features/auth/email-tag.ts`, feedback dev#481).
- **No offer** when the address already carries a `+` (their own scheme wins; stacking
  two would be wrong) or isn't complete enough to split.
- **The tag** is the app's name in lower case: `keksdose`, `kastlan`, `kurvenschmiede`.
- **The tagged address is the identity.** Normalisation trims and lower-cases and never
  strips a tag; `you@…` and `you+kastlan@…` are different addresses.
- **With an invitation:** the invitee may take the tag. An invitation for
  `you@example.com` also accepts `you+<app>@example.com` (same local part, same domain,
  the app's own tag only), and the account keeps the tagged address. It starts
  **unverified** and is sent its own verification mail (§4.3).
- **Sign-in stays exact.** After `invalid_credentials` the form's hint also says:
  "Signed up with name+kastlan@…? Use that address." The server looks nothing up.
- **A password reset** for `you@example.com` that finds no account also tries
  `you+<app>@example.com`. The mail goes to **the account's own address, the tagged
  one**, because that is the identity and the address the user signs in with. The answer
  is `204` either way, so it reveals nothing.
- **Where else an address is typed for oneself** (a later email change in the profile),
  the same suggestion appears. Never in a field for someone else's address (invite
  dialogs, shares).

## 5. Sign-in

### 5.1 The request and its answers (keksdose's shape)

`POST /auth/login {email, password}` answers one of:
- `TokenResponse` `{access_token, refresh_token, token_type, user}`;
- `{requires_2fa: true, challenge_token}`, then `POST /auth/login/2fa {challenge_token, code}`;
- `{requires_password_change: true, challenge_token}`, then `POST /auth/login/set-password`.

A passkey sign-in (`/auth/passkey/login/begin|finish`, already the same paths in all
three) answers the same way.

- `refresh_token` may be **null**: keksdose's demo session has a 60-minute access token
  and no refresh.
- The challenges may carry **app fields**, which the kit passes through: keksdose's
  `encrypted` on the password-change challenge, `key_wrap_unchanged` on its answer.
- keksdose's passkey PRF unlock is not part of sign-in. It is a separate step after it,
  and stays the app's.
- **`shared_device`** (§2.14; ui-kit 0.62, server-kit 0.27): `true` when the person ticked
  "This is a shared computer" (`isSharedComputer()`, `@eifi1/ui-kit/offline`). Absent means
  `false`. The kit's forms send no request (§8), so the app adds it beside the credentials
  (`{ ...credentials, shared_device: isSharedComputer() }`) on the two requests that start a
  sign-in:
  - `POST /auth/login`: server-kit's `LoginRequest.shared_device: bool = False`;
  - the passkey finish: the app's own request model takes the mixin `SharedDeviceChoice`.

  The challenge steps need nothing: a 2FA or set-password challenge carries it in its
  `shared_device` claim, and `/auth/login/2fa` and `/auth/login/set-password` mint the
  session from there. A server whose request schema refuses unknown fields
  (`extra="forbid"`) takes the field before its client sends it.

### 5.2 Rules

- **One error for an unknown address, a wrong password and a deactivated account**:
  `401 {code: "invalid_credentials"}`, in the same time. An address with no account is
  checked against a dummy hash of a random secret, through the app's own verify:
  server-kit's `absent_account_check(hash_password, verify_password, *, cost=None)`
  (`eifi1_server_kit.auth`, 0.8.0) holds that rule once. The 2FA, set-password and
  refresh steps check `is_active` too.
  - The form shows the hint "Account deactivated? Write to …" (§2.10). A separate
    message after a correct password would confirm a leaked one, so no server answers
    `account_inactive`.
  - In kastlan, a **deactivated company** blocks that company only: sign-in opens another
    company of the user's, or "no active company".
- **Every refusal carries a `code`**: `invalid_credentials` (401), `registration_closed`
  (403), `email_taken` (409), `invitation_invalid`, `invitation_expired`, `token_invalid`,
  `token_expired` (400 each; a link that was valid and ran out), and `session_ended`
  (401, §11). The pages recognise the code, never the server's sentence (`isAuthError`,
  `authErrorCode` in `src/auth/auth-errors.ts`; server-kit's `AuthErrorCode`), so an app
  switches its server and its pages together.
- **Throttle**: per IP as the hard limit. Per address, only failures are counted, and
  the answer slows down rather than locking out, because a lock per address would let
  anyone lock a known address out (server-kit's `AuthLimiters` preset). A throttled
  answer is a 429 with `Retry-After`; the forms say "Try again in N s" from it
  (`isRateLimited`, `retryAfterSeconds`). **`Retry-After` is an exposed CORS header** in
  every app, or a browser hides it from a client on another origin (§10.15).
- After sign-in, the app:
  - loads `/auth/me`;
  - switches to the user's language;
  - goes to the page the visitor was headed for, else the app's start page;
  - in kastlan, opens the **last company used**.

### 5.3 kastlan: several companies

- **Membership** = the user's role assignments per company:
  - `user_role_assignments` becomes unique on `(user_id, company_id, role)`;
  - `users.company_id` becomes `last_company_id`, the one sign-in opens.
- **The access token carries the current company**, and RLS reads it from there, so RLS
  itself needs no change (§10.9). `POST /auth/switch-company {company_id}` answers with
  fresh tokens for a company the user belongs to, like `/auth/switch-role`.
- `/auth/me` adds `companies: [{id, name, roles}]` and `current_company_id`.
- **Switcher**: the kit's `CompanySwitcher` in the top bar, built on
  `OptionSwitcherMenu`. It shows only for a user in more than one company.
- **Roles are per company**: `require_role` and the token's `roles` filter by the token's
  company, with no fallback to `users.role`, so an admin in A is not an admin in B.
  Everything else keyed on `users.company_id` reads the current company.
- **Membership on every refresh**: refresh mints for `last_company_id` only while the
  user still belongs to it.
- **Leaving and removing**: a user leaves a company, or its admin removes them. The last
  admin cannot leave. A user with no company left sees "Create a company" (the sign-up's
  company field, on its own page) or waits for an invitation.

## 6. The session

### 6.1 `/auth/me`

- `GET /auth/me` answers `UserResponse`:
  - `{id, email, first_name, last_name, display_name (derived), locale, role, is_active, email_verified, totp_enabled, created_at, name_incomplete}`;
  - plus the app's own fields: keksdose's plan and currency, kastlan's companies, the
    review scopes.
- `PATCH /auth/me {first_name?, last_name?, locale?}`, with unknown fields refused.
- kastlan's `/auth/user` gets `/auth/me` as its name; the old path stays as an alias for
  one release.
- **The shell reads the user from `/auth/me`, never from the token.** Names and email
  change; a token is proof of who, not a profile.
  - An offline-first app (keksdose) boots from the persisted user of its last sign-in
    answer and refreshes it from `/auth/me` when online (§10.11).
  - An app that read the profile from the token (kastlan: names, locale,
    `is_superuser`, review locales) moves it to `/auth/me` in the same change that drops
    those claims.

### 6.2 Tokens

- **The access token carries what the server needs to authorise**: `sub`, `type`, `iat`;
  kastlan also `company_id` and `roles` for RLS. **No names, no email, no locale.**
- **Every request checks revocation**: the `iat` cut-off (keksdose, Kurvenschmiede) or
  the session row (kastlan, via a `sid` claim), in `get_current_user` and on refresh. So
  ending sessions takes effect at once, whatever the lifetime. With server-kit 0.27 every
  app checks both: the cut-off ends every session, the row one device's (§6.3).
- **Lifetimes are a per-app setting** with a server-kit default of 24 h access and 30 d
  refresh. keksdose is an offline-first app people may open weekly. kastlan keeps
  15 min until its per-request check exists, and its refresh moves to 30 d.
- **A shared-computer session has a short life** (§2.14, server-kit 0.27 `SessionPolicy`):
  signed in with `shared_device: true`, it ends after 15 minutes idle (`shared_idle`) and 4
  hours after the sign-in at most (`shared_absolute`), whatever the app's lifetimes; the
  refresh then answers `session_ended` (§11). Its access token lives **5 minutes**
  (`shared_access_lifetime`), shorter than the idle limit on purpose: the client renews on
  the first 401 (§11), so a busy person renews about every 5 minutes and keeps the session,
  while a tab nobody uses stops asking and its session ends 10 to 15 minutes after its last
  request. The server keeps the flag on the session row (`user_sessions.shared_device`,
  with `expires_at`), so every renewal keeps the limits.

### 6.3 Ending sessions

- **Every sign-out ends this session on the server** (§2.15, 2026-11-12), shared or not:
  the explicit one and `useSharedComputerIdleSignOut`'s, in this order, while the token
  still holds:
  1. this device's push goes: `dropPushSubscription(unregister)` (§2.16; ui-kit 0.62), which
     tells the server and unsubscribes the browser and never rejects;
  2. **`DELETE /auth/sessions/current`** (server-kit 0.27): ends this device's session and
     answers 204, also when the session had already ended. Not `POST /auth/logout`, which
     stays "Sign out everywhere". In kastlan the route is declared before
     `/auth/sessions/{session_id}`, which would otherwise take `current` for an id;
  3. the tokens and this device's copy go (keksdose also wipes its offline copy), and the
     app goes to the sign-in page.

  Push goes first because both its `unregister` and the revoke need the token. After the
  revoke, or with the tokens gone, `unregister` would meet a 401, and the app's session
  refresh would try to renew a session the person just ended (§11). A revoke that fails
  (offline, a 5xx) does not stop the sign-out: the tokens go all the same, and the server's
  limits end the session (a shared one within 15 minutes). Until 0.62 the normal sign-out
  only dropped the client's tokens, and the server went on honouring a refresh token it
  never heard was given up.
- **Sessions are rows in every app** (server-kit 0.27): keksdose and Kurvenschmiede add
  `user_sessions` (kastlan's shape, plus `shared_device` and `expires_at`), a `sid` claim on
  both tokens and the per-request row check kastlan has (§6.2). The `iat` cut-off stays for
  "end every session".
- **A session that ended on its own** (the refresh refused, §11; ended in another tab) calls
  no revoke: the server already ended it, and its token can no longer ask. Its device keeps
  push (Marcel's decision 2 of 2026-10-30); a shared computer's never had any (§2.16).
- `POST /auth/logout` ends **every** session (Kurvenschmiede's), behind its own "Sign out
  everywhere" action.
- **A password change ends every other session and keeps the caller's**: stamp the
  cut-off, then mint fresh tokens (keksdose's forced-change endpoint). So the change
  answers with tokens, not `204`. kastlan ends every session row but the token's `sid`.
  - Side effect: translation-review tokens end with the cut-off.
  - keksdose's personal access tokens survive a voluntary change; a reset revokes them.
- **A reset is not a sign-in**: confirm answers without tokens, so 2FA cannot be
  skipped, and the page ends on "Sign in" with the email filled in. The app's outcomes
  are shown there (keksdose: the recovery-code notice, "N API tokens revoked"). The page
  checks the token (`/check`) before it shows the form.
- kastlan keeps its session rows, so it can later show devices. The rule above holds for
  it as well.

## 7. Signed-out pages (all apps, §2.7)

| Page | Content |
|---|---|
| `/login` | `SignInForm`: email, password, passkey, the 2FA step |
| `/register` | `RegisterForm` |
| `/forgot-password` | `ForgotPasswordForm` |
| `/reset-password?token=` | `ResetPasswordForm` |
| `/verify-email?token=` | `VerifyEmailStatus` |
| 404 | `NotFoundPage` |
| `/impressum`, `/privacy`, `/terms` | `LegalPage` |

Each signed-out page is on `AuthLayout`, with `LegalFooter` and `useNoIndex`.

**The verification link redeems by POST** (§10.10): `VerifyEmailStatus` calls the app's
`onVerify(token)`, `POST /auth/verify-email {token}`, once per token on mount. The link's
own GET verifies nothing, so a mail scanner that opens every link cannot confirm an
address nobody read.

## 8. What the kits add, what stays app-side

**ui-kit 0.29.0** (all labels in a new `auth` namespace, 7 languages, keksdose's words):

- **Sign-in:**
  - `SignInForm`: email, password, "Forgot password?", the passkey button, the 2FA step
    (`OneTimeCodeInput`) and the set-new-password step;
  - it takes `onSubmit` / `onPasskey` / `onCode` callbacks and renders §5.1's answers.
    **The kit never sends a request itself** (§10.11): keksdose must see the password on
    its way (it refuses the same string as an encryption passphrase);
  - the email field is `autoComplete="username webauthn"`, so the app can arm passkey
    autofill on mount. The passkey button asks for no email;
  - the 2FA step is there from the start, so an app that adds 2FA later
    (Kurvenschmiede) does backend work only (§10.5). With `recoveryCode` (0.30.0) a
    switch under the field takes a backup code, through the same `onCode` with
    `kind: "recovery"`;
  - a throttled answer (429) says "Try again in N s" from its `Retry-After` on any step
    (0.30.0);
  - slots for each step's app content (keksdose's private-mode note on the
    password-change step).
- **Sign-up:**
  - `RegisterForm` (§4.1), with the address-tag suggestion built in (`emailTag="kastlan"`,
    §4.5) and `taggedEmail(email, tag)` exported for other fields. Its slots: above the form (keksdose's closed-beta banner),
    under the email (keksdose's address-tag hint), the app fields, and after them
    (keksdose's privacy-mode note);
  - the language field may be bound to the app's i18n with no local state;
  - the password rules are min 8 characters and 72 bytes. Any checklist is advisory, and
    the kit adds no rule of its own;
  - `CompleteNameDialog`;
  - `invitedEmail` fixes an invitation's address (§4.4); `defaultEmail` (0.30.0) only
    starts with one and stays editable, for a token-free `/register?email=` link.
- **Signed-out pages:** `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailStatus`
  (with `describeError` on its resend since 0.30.0), `EmailVerificationBanner`,
  `NotFoundPage`, and an `AcceptInvitation` status. A reset is not a sign-in (§6.3,
  §10.11).
- **Names:** `formatPersonName`, `personInitials` (`src/lib/person-name.ts`), in the
  reader's language (§3.2, §10.6); `UserAvatar` takes `person: {first, last}`.
- **Switcher:** `CompanySwitcher`, a generic context switcher. kastlan's companies;
  keksdose's budget switcher could take it later.
- **Errors:** `isAuthError(err, code)` and `authErrorCode(err)` for the coded answers
  (`AuthErrorCode`: `invalid_credentials`, `registration_closed`, `invitation_invalid`,
  …; `token_expired` since 0.30.0); `isRateLimited` and `retryAfterSeconds` for a 429.

**server-kit 0.3.0** (`eifi1_server_kit.auth`, Layer 1: pure, no `User` import):

- **Accounts:** `normalise_email`, `registration_decision(is_first, on_env, on_table, invite)`,
  `full_name(first, last, locale)`, `name_incomplete`, and the address tag's
  `tagged_variant`, `invitation_accepts`, `verified_by_invitation` and
  `addresses_for_reset` (§4.5).
- **Tokens:** one-time tokens (`mint`, `hash_token`, `is_expired`) for reset,
  verification and invitation; claim builders (`access_claims`, `refresh_claims`,
  `challenge_claims`) and `token_is_revoked`.
- **Rate limits:** the `AuthLimiters` preset: per IP, failures per address, the reset
  limits kastlan already ran (10/h per IP, 3/h per address).
- **Erasure:** `erasure_identifiers`, a user's identifiers for `anonymise_feedback`: the
  email, the old `display_name`, and the full name in both orders. A bare first or last
  name on its own is not redacted, because it would shred a report that mentions "Mai"
  or "Bank".
- **Schemas:** Pydantic for `RegisterRequest` core, `TokenResponse`, the two challenges,
  `UserResponse` core and `ProfileUpdate`.
- **Mail:** a Resend client, `render_message`, `pick(locale, texts)`.

Later: `AuthErrorCode.TOKEN_EXPIRED` (server-kit 0.4.0); `absent_account_check` (§5.2),
`AuthErrorCode.SESSION_ENDED` and `RefreshRequest` (0.8.0, §11.6). ui-kit 0.34.0 adds
the session refresh (§11.6). server-kit 0.27 adds `shared_device` (`LoginRequest`, the
`SharedDeviceChoice` mixin, the challenge claim) and a shared session's `SessionPolicy`
(§5.1, §6.2), session rows in every app, and `DELETE /auth/sessions/current` (§6.3). ui-kit 0.62 adds
`useSharedComputerIdleSignOut` (`@eifi1/ui-kit/offline`), `dropPushSubscription`, and
`PushDeviceSetting`'s refusal on a shared computer (§6.3).

**App-side**:
- the database, migrations and routes;
- what an invitation attaches to (company, team, budget) and RLS;
- the app's sign-up fields;
- the texts of the mails;
- keksdose's demo session, API tokens and E2EE;
- kastlan's platform superuser.

## 9. Per repo

Moved to [archive/auth-history.md](archive/auth-history.md): the round's per-repo to-dos for
ui-kit 0.29, server-kit 0.3 and the three apps.

## 10. Settled after the reviews (2026-10-05)

The reviews' items keep their numbers, which the code cites. An item that amended a
section above is folded into it and points there; an item that is a rule of its own
stands here. The reviews' wording is in [archive/auth-history.md](archive/auth-history.md).

1. **A deactivated account** → §2.10, §5.2.
2. **A password change ends every other session** → §6.3.
3. **Lifetimes** → §6.2.
4. **kastlan's interim set-password invite** → §4.4.
5. **2FA in Kurvenschmiede, later** → §8 (`SignInForm`).
6. **Names** → §3.1, §3.2, §8.
7. **Invitations and the gate** → §2.11–12, §4.3, §4.4.
8. **keksdose's budget-share invites** → §4.4.
9. **kastlan's several companies** → §5.3.
10. **Security, found by the reviews** → §2.9, §5.2, §7.
11. **The kit forms never send requests; a reset is not a sign-in** → §6.1, §6.3, §8.
12. **The address tag** → §2.13, §4.5.
13. **keksdose's budget invitations** → §4.4.
14. **Invitations keep expiring** → §4.4.
15. **`Retry-After` is an exposed CORS header** → §5.2.

## 11. Session refresh (round 0.34; settled 2026-10-12)

ui-kit 0.34 has the client half of renewing a session, `attachSessionRefresh` (KS's U6,
round 0.34 C7), and server-kit 0.8 the refresh's coded refusal. It ends kastlan's sign-out
over a network blip (B3). It builds on §6.2–6.3 and landing-demo §5.5.

### 11.1 Where each one stands

Moved to [archive/auth-history.md](archive/auth-history.md): each app's refresh as the
reviews read it (2026-10-12), and what the three servers answered.

### 11.2 Decisions

Settled by the draft, and agreed by the reviews:

1. **The kit owns the rule; the app owns the call.** The kit decides when to refresh, who
   waits, what a failure means, when the session ends and whether a renewal may still be
   stored. The app keeps its endpoint, its token storage, its sign-out and where it
   navigates (§11.4).
2. **One flight per tab.** Every 401 that arrives while a refresh runs waits for it, and
   so does a refresh the app starts itself (kastlan's boot).
3. **Definitive: the session is over.** The device holds no refresh token; or
   `/auth/refresh` answers **401 or 403** (expired, revoked by the cut-off or the session
   row, a deactivated account, a required password change: §6.2, §6.3); or the request,
   replayed with the fresh token, gets a 401 again. Only then does the app sign out, and
   only while that session is still the app's (§11.3).
4. **Transient: everything else.** No answer (offline, DNS, CORS), a timeout, 408, 429,
   any 5xx, and also any other answer from the refresh that is not a 401 or 403, such as
   a 400, 404 or 422: a client or deploy fault that a sign-out would not mend. The
   session stays. Nothing is signed out, no token or cache is touched, nothing
   redirects, and the kit shows nothing.
5. **Retry only where waiting helps.** No answer, a timeout, 408, 429 and any 5xx get up
   to three attempts, 1 s and then 3 s apart, each cut off after 15 s; no further attempt
   while the browser reports itself offline, or once the session the flight renews is no
   longer the app's (§11.3). Any other transient answer (a 400, 404, 422) and anything
   else the app's `refresh` throws ends the flight at the first attempt: asking again
   would get the same answer (KS 7). Then the waiting requests reject, and the next 401
   starts a new flight.
6. **landing-demo §5.5 holds for every session:** a signed-out step's 401 (§11.3) never
   refreshes and ends nothing; a demo's 401 ends the demo at `/demo/ended`, with no
   refresh tried, once however many of its requests 401 (KS 8).
7. **server-kit names the refusal:** every definitive refusal of `POST /auth/refresh`
   answers `401 {code: "session_ended"}` (`AuthErrorCode.SESSION_ENDED`; §5.2: every
   refusal carries a code), and nothing else on that route answers 401 or 403: a
   database error, a timeout or a bug stays a 5xx, which the client reads as transient.
   The detail strings may stay, for logs. The client still decides by status, so an app
   whose server has not switched yet keeps working.

Open in the draft, settled as recommended (all three apps agree):

8. **After a transient failure, a request rejects with its own 401, marked.** The marker
   is a property on that very axios error (a `Symbol.for` key set to `true`), not a
   wrapper, so `err.response?.status` and every check an app already has keep working,
   and a log that serialises the error doesn't print it (kk 2).
   `isTransientRefreshFailure(error)` reads it, so an app's message can say "can't reach
   the server" instead of "not signed in". Rejecting with the refresh's own error would
   name the cause too, but its config carries the refresh token in its body, into any log
   or crash report that keeps the error. The request's own 401 carries only the access
   token it was sent with. An app reads the marker first wherever it tells offline from
   signed out: kk's sync chip, kastlan's handover sync, KS's `apiErrorMessage`.
9. **No sync opt-out** (keksdose's `x-hb-sync` header, whose request only rejected on a
   definitive failure, goes). A definitive failure means the session is over, whichever
   request found it. Nothing unsynced is lost: keksdose's `clear({wipeMirror: false})`
   keeps the mirror, the outbox and `MIRROR_USER_ID`. Two consequences (kk 1):
   - **the timing:** sync polls every 30 s per tab, so a definitive end reaches `/login`
     within one poll, even on an idle page. Unsaved input there is caught only by the
     app's `beforeunload` guard;
   - **the E2EE keys:** `clear` also drops the unlocked keys, as every 401 sign-out does.

### 11.3 The flow

**Every request is stamped when it goes out** with the app's `currentToken()`: a key on
the config, as `attachServerWake` keeps `_serverWake`, never a header. A request was sent
with an **older token** when its stamp is no longer the app's `currentToken()`. That holds
however the token changed:
- a refresh;
- another tab (kk and KS keep their tokens in `localStorage`, shared across tabs);
- kastlan's company or role switch;
- a password change, which stores a fresh pair;
- a sign-in, a demo start, a sign-out.

**The current token, not a counter, is the session's identity.** The apps change tokens
outside the kit, and only the app's own current token sees every change; a counter would
need each of those places to bump it. The access token, not the refresh token, because
every change in the three apps replaces it. The one case it cannot tell apart, kastlan's
boot refresh running with no access token yet, has nothing to sign out of. The guard is
written and tested once, in the kit: the app's `refresh` writes nothing, and the kit calls
`store` only while the session is unchanged. A request the kit never stamped (sent before
it was attached) counts as current.

On a 401 from the instance, in this order:

1. **A signed-out step** → reject, nothing else. The kit's default list is every `/auth/`
   call made without a session, the union of the three apps' lists: `login` (with its
   `2fa` and `set-password` steps), `passkey/login`, `register`, `demo-session`,
   `password-reset`, `verify-email`, `invitations/check`, `me/email/confirm` and
   `refresh`.
   - **Whole steps only** (KS 2). The part of the URL's path after its `auth/` segment,
     without the query string, is the entry itself or starts with the entry and a `/`
     (`login/2fa` is `login`'s). So `register`
     never catches `/auth/passkey/register/begin` or `…/finish` (adding a passkey, which
     needs a session in KS), `invitations/check` never `/auth/invitations/accept` (which
     needs a session in kk and KS), and `me/email/confirm` never `/auth/me/email`.
   - **`resend-verification` is not on it** (KS 1). In kk and KS it needs a session; in
     kastlan it is public and never answers 401.
   - `isSignedOutStep` replaces the list.
2. **Sent with an older token** → if the app holds a token now, the request is replayed
   with it, with no refresh, once for this reason; a 401 to that replay goes through
   these steps again, now with a current stamp. Otherwise it rejects with its 401 and
   nothing else happens: the session it was sent for is gone, and whatever ended it has
   already done what follows (kastlan 3, KS 3, KS 4).
3. **A demo** (`isDemo()`) → `onEnded({ demo: true })`, reject.
4. **Already replayed after a refresh** → definitive (decision 3):
   `onEnded({ demo: false })`, reject. A replay for an older token (step 2) doesn't count
   here: the app's current token may simply have expired too, and that needs a refresh,
   not a sign-out.
5. **Otherwise** it joins the flight, or starts it. A flight notes `currentToken()` when it
   starts: the session it renews. When the answer comes:
   - **the session changed meanwhile** (`currentToken()` is no longer the noted one) →
     the kit stores nothing and ends nothing, whatever the answer. Each waiting request
     goes through step 2: replayed with the app's token, or rejected. So a late refresh
     never writes the old session back over a sign-out, a demo start or a password change,
     and the old session's refusal never signs out someone who has just changed their
     password (KS 3);
   - **a renewal** → `store(renewal)`, then each waiting request is replayed once, its
     `Authorization` set to `renewal.token`. A renewal with `replay: false` is stored, and
     each waiting request rejects with its 401 instead, unmarked (kastlan 3: the refresh
     landed in another company);
   - **definitive** → `onEnded({ demo: false })`, and each rejects with its 401;
   - **transient** → each rejects with its own 401, marked (decision 8); nothing else
     happens.

**`onEnded` is called once per session.** The kit keeps the token it ended, and a later
401 about the same session (another waiter, a demo's other requests, the next flight)
rejects without a second call (KS 8). Once the app has dropped the token, step 2 rejects
those anyway.

**Any other status passes through untouched**, and a signed-in request answers 401 only
about its session. A wrong current password answers `400 password_incorrect` (user-admin
§6.2), and so does any other wrong input: a replayed request that 401s again is
definitive, so an endpoint that answers 401 for a wrong input would sign its user out
(server-kit's `auth.tokens` docstring states the rule; kastlan 2). The signed-out steps
may answer 401 for a wrong credential: the client never refreshes on them.

- **Order:** the kit's response interceptor goes last. It comes after `attachServerWake`,
  which asks to be attached before the app's own (`src/lib/server-wake.ts`,
  `attachServerWake`), and after the app's own (logging, a watchdog of its own). Axios
  runs response interceptors in the order they were added, and each must see the 401
  settle before the refresh is awaited. keksdose's cold-start watchdog decrements inside
  its own response interceptor, so it registers its interceptors before
  `attachSessionRefresh` (kk 4). The request side's order does not matter: the stamp
  reads `currentToken()`, the same source the app's request interceptor reads.
- **The refresh answer:** the app's `store` writes it.
  - A missing `refresh_token` keeps the stored one (kk's rule).
  - The user in the answer goes to the app's store, so a role changed on the server
    shows without a new sign-in (kk 3).
- **Tabs:** there is no lock across tabs. That is safe while no app's refresh token is
  single-use; an app that makes it single-use adds one (`navigator.locks`) first.
  Another tab's refresh is caught by step 2 and by the flight's check.

### 11.4 What it calls back into

`createSessionRefresh(options)` makes the flight. `attachSessionRefresh(instance,
session)` hooks it to an axios instance: a request interceptor for the stamp and a
response interceptor for the 401. It returns a function that detaches both. It is the
`createServerWake` / `attachServerWake` pair again, typed structurally, so the kit does
not depend on axios.

```ts
/** What the app's `refresh` resolves: the new access token, plus whatever its `store`
 *  needs (its refresh token, the user). */
interface SessionRenewal { token: string; replay?: false }

function createSessionRefresh<R extends SessionRenewal>(
  options: SessionRefreshOptions<R>,
): SessionRefresh<R>;
```

| Option | What the app gives | kk | ka | KS |
|---|---|---|---|---|
| `refresh(signal)` | its own `POST /auth/refresh` on a bare client, never the instance. It **writes nothing**. It resolves the answer as a renewal, or `null` when the device holds no refresh token; it throws on failure, and the kit classifies the throw. It passes `signal`, which aborts at the timeout, to its request. `replay: false` in the renewal stores it but replays nothing | its bare call, the `user` kept | its bare call through `serverWake.track`; `replay: false` when the answer's company is not the store's | its bare call |
| `store(renewal)` | writes the tokens and the user, **synchronously**, where `currentToken` reads them: the replay is stamped again. The kit calls it only while the session the flight renews is still the app's (§11.3), before any waiting request is replayed. A throw is the app's bug: the waiters and `session.refresh()` reject with it | `localStorage`, then `useAuth.setState({ token, user })` (not `setSession`) | `setTokens(token, refreshToken ?? getRefreshToken())`, then the user | `renewSession(token, refreshToken, user)` |
| `currentToken()` | the access token the app sends now, read where its request interceptor reads it; `null` when there is none | `localStorage` `auth_token` | `getAccessToken()` | `localStorage`'s access token |
| `isDemo()` | whether the session is a demo | `isDemoSession(user)` | no refresh token and `hasDemoSession()` | `isDemoSession(user)` |
| `onEnded({ demo })` | drop the tokens and the user, then navigate: `/demo/ended` for a demo, else `/login` with the page it came from (§5.2). No `DELETE /auth/sessions/current` (§6.3): the server already ended the session | `endDemoSession()`; `clear({wipeMirror: false})` | `endDemo()`; `logout()` and `queryClient.clear()` | `clear()`; `/login?next=` only where `needsSession` |
| `isSignedOutStep(url)` | optional; replaces the default list | | | |
| `attempts`, `backoffMs`, `timeoutMs` | optional; 3, `[1000, 3000]`, 15 000 | | | |

**How the kit classifies a throw** (`src/lib/session-refresh.ts`, `classify`): the
status is read from `err.response.status` (axios), `err.status` or `err.statusCode`. A
401 or 403 is definitive. No answer (an axios error without a response), the kit's own
timeout, 408, 429 and 5xx are transient and retried. Any other answer, and anything that
is not an HTTP error (a bug in the app's `refresh`), is transient and not retried.

`session.refresh()` is the same flight for a caller outside the interceptor, kastlan's
boot. It never calls `onEnded`: the caller decides. It resolves a
`SessionRefreshOutcome<R>`, by `result`:

| `result` | When | What the kit has done |
|---|---|---|
| `"renewed"`, with `renewal` | a renewal while the session was unchanged | `store(renewal)` |
| `"ended"` | definitive | nothing; if requests waited on the same flight, `onEnded` for them |
| `"transient"` | transient | nothing |
| `"changed"` | the session changed while it ran | nothing; the caller reads the app's own state |

### 11.5 Per app

Moved to [archive/auth-history.md](archive/auth-history.md): each app's steps, as the
reviews settled them; `docs/archive/adopt/adopt-0.34.md` §2–§3 carries them for the apps. The rule
for every server is decision 7 (§11.2).

### 11.6 Build

**ui-kit 0.34.0**, `src/lib/session-refresh.ts` beside `server-wake.ts` (no labels):
- exports: `createSessionRefresh`, `attachSessionRefresh`, `isTransientRefreshFailure`
  (decision 8), `isSignedOutStep(url)` (the default list with whole-step matching,
  exported for an app's tests and for an app's own list that adds to it), and the types
  `SessionRefresh`, `SessionRefreshOptions`, `SessionRenewal`, `SessionRefreshOutcome`;
- the options of §11.4: `refresh(signal)`, `store(renewal)`, `currentToken()`, `isDemo()`,
  `onEnded({ demo })`, and the optional `isSignedOutStep`, `attempts`, `backoffMs`,
  `timeoutMs`;
- `attachSessionRefresh` adds a request interceptor (the stamp) and a response
  interceptor, and its return detaches both; the structural instance type has
  `request(config)` for the replay. It takes only a session `createSessionRefresh` made;
- the marker is a `Symbol.for` key on the rejected axios error itself, set only after a
  transient failure;
- `AuthErrorCode` (`src/auth/auth-errors.ts`) has `session_ended`, with no label: no form
  shows it. An exhaustive `switch` over `AuthErrorCode` covers it;
- `src/lib/__tests__/session-refresh.test.ts` pins every rule of §11.2–§11.4: one flight
  for N 401s, `onEnded` once per session, the attempts and the timeout, whole-step
  matching, the replays, a session that changes mid-flight, `replay: false`, and
  `session.refresh()`'s four results.

**server-kit 0.8.0** (`eifi1_server_kit.auth`):
- `AuthErrorCode.SESSION_ENDED` (`"session_ended"`, 401, "This session has ended. Please
  sign in again."), in `AUTH_ERROR_STATUS` and `AUTH_ERROR_DETAIL`;
- `RefreshRequest {refresh_token}` in `auth.schemas`;
- the rule in the `auth.tokens` docstring: what is definitive; that the route never
  turns its own failure into a 401; and that a signed-in endpoint answers 401 only about
  the session, never for a wrong input (kastlan 2).

Each app's steps are in the archive (§11.5) and `docs/archive/adopt/adopt-0.34.md`.

### 11.7 Settled after the reviews (2026-10-12)

The three apps' reviews (**kk** 1–7, **ka** 1–9, **KS** 1–9) are folded into §11.2–§11.4,
and their wording is in [archive/auth-history.md](archive/auth-history.md). Where each
went:
- decisions 8 and 9, settled as recommended → §11.2;
- the stale-session rule set (ka 3, KS 3, KS 4: the stamp, the flight's noted token,
  `store` only while the session is unchanged, `replay: false`) and why the access token
  is the session's identity → §11.3, §11.4;
- the default list and whole-step matching (KS 1, KS 2, kk 6) → §11.3;
- retries only where waiting helps (KS 7) → §11.2, decision 5;
- `onEnded` once per session, a demo's too (KS 8) → §11.3;
- the kit's interceptor goes last (kk 4) → §11.3;
- a signed-in endpoint answers 401 only about the session (ka 2) → §11.3, and decision 7;
- each app's own steps (kk 1–5, kk 7, ka 4–9, KS 5, KS 6, KS 9) → the archive's §11.5.

## 12. Layer 2: the server-kit runs the account routes

**Status: decided 2026-11-13 (A from Marcel's "as soon as possible" and his "2"; B and C "wie
empfohlen"); kastlan rests, so its seams wait. Shipped: ui-kit 0.63–0.65 on server-kit 0.29–0.32
(`@eifi1/ui-kit/accounts`, §12.9; Staunlabor runs it).** Marcel, 2026-11-13, in
Staunlabor's session: accounts and user admin should move into the server-kit next, "wenn das
in weiten Teilen, wenn nicht sogar komplett, gleich ist". Staunlabor, a fourth app, starts
accounts, admin, public feedback, passkeys and the translation review now, and would otherwise
copy about 5,000 lines of backend a fourth time. The edge-token gap in the per-IP limits (only
keksdose had the fix) shows what four copies cost. This section asks whether the copies are
alike enough, and draws the cut on the pattern of feedback (server-kit 0.9) and the translation
review (0.10): services behind ports that each app fills with its own tables, and a router
factory (`docs/server-services-harmonization.md` §2).

Sources: three read-only maps of the backends (2026-11-13: keksdose `main`, kastlan `main`,
Kurvenschmiede `fix/edge-token` = `origin/main` + the edge token), and Staunlabor's two maps.

### 12.1 Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Auth + account + user-admin backend, no tests | ≈ 11,800 lines (+ ≈ 450 erasure) | ≈ 6,300 (+ ≈ 2,200 shared with other parts) | ≈ 8,300 (teams, demo and dev switch ≈ 1,200 of it) |
| Their tests | ≈ 12,700 | ≈ 3,900 | ≈ 6,000 |
| server-kit pinned | 0.25 | 0.25 | 0.26 |
| Sessions | the `iat` cut-off only | rows (`sid`), no expiry, never pruned | the `iat` cut-off only |
| Access token | 24 h | 15 min, carries `company_id`, `roles`, `sid` | 24 h |
| 2FA | TOTP, no backup codes | TOTP + 8 backup codes | none |
| Passkeys | resident key; PRF for private mode; "passkey added" notice | resident key | resident key; spent-challenge table; name sealed |
| Invitations | registration table + budget-share invites, one token lookup | one table: company + role, or a sign-up invitation | one table: role + team |
| Pending address, links | token tables | columns on `users` | token tables |
| Deletion | after 30 days, a job erases | operator: the platform erases | operator: an admin erases |
| Admin scope | everybody | the acting company; a superuser's `/platform` | everybody |
| Mail texts | inline, 4 languages | one file, 4 languages | inline, 7 languages |

**The route surface is the same.** All three serve `register`, `login`, `login/set-password`,
`refresh`, `logout`, `me` (GET, PATCH), `me/password`, `me/email` (with `resend`, `DELETE` and
`confirm`), `me/export`, `me/deletion`, `invitations/check` and `invitations/accept`,
`verify-email`, `resend-verification`, `password-reset/request`, `check` and `confirm`,
`passkey/{register,login}/{begin,finish}`, `passkeys` (GET, PATCH, DELETE) and `demo-session`:
about 30 routes, with the same bodies and answers within a field or a status, and the decisions
inside them already server-kit layer 1 (`registration_decision`, `absent_account_check`, the
claims, `mint`/`hash_token`, the schemas and `AuthErrorCode`). The admin surface is the same as
well: the roster, active, role, forced password change, the two mails, the log, the attention
tile, invitations, erase, the reviewer scope and the test mail, on `user_admin` layer 1.

What only some have: 2FA (keksdose, kastlan), a sessions list (kastlan), the company routes
(kastlan: switch company or role, create, leave), private mode's routes (keksdose: PRF, the key
wrap) and keksdose's data operations under `/auth/me` (reset budget, wipe, load demo).

### 12.2 The verdict: alike enough, with six seams

What differs between the apps sits in six places, and each is a hook, not a fork:

1. **What a sign-up and an accepted invitation attach**: keksdose's subscription, household,
   budget and starter categories, or a budget share; kastlan's company, membership, contact and
   subscription (with its RLS binding); Kurvenschmiede's subscription, team and shares.
2. **What a token carries and what each request binds**: kastlan's acting company and roles,
   the membership check (401) and the company check (403), the RLS variables.
3. **Private mode around passwords and passkeys** (keksdose): the `encrypted` flag on the
   challenge and the reset, the key wrap on a password change, PRF, and the last unlock path
   that may not be deleted.
4. **What else ends with the sessions**, and why: keksdose's API tokens and push devices
   (revoked at a reset, a deactivation and a deletion request; kept at a password change).
5. **Deletion and erasure**: the mode (operator or after N days, server-kit
   `deletion_schedule`), what the request cancels or tells (billing, budget guests), and what
   the erasure hands over (Kurvenschmiede's shared work, keksdose's budgets).
6. **The extras on `/auth/me` and on the roster row**: plan, review scope, companies, privacy
   fields, counts.

Everything else is the same code three times, and **the drift between the copies is where the
faults are**:
- every app mails before its commit, so a request that rolls back can send a link that does not
  work (only the public reset waits);
- the token redemptions (`verify-email`, `password-reset/check|confirm`, `invitations/check`),
  `refresh` and, in kastlan, the passkey, 2FA, password and address routes run without a limit;
- kastlan checks `email_taken` before the registration gate, so an anonymous caller can tell
  which addresses have an account;
- kastlan's reset leaves an admin's forced password change in place; its forced change ends no
  session; its `GET /auth/sessions` never marks the current one;
- Kurvenschmiede's address confirmation attaches every unaccepted invitation for the new
  address, expired ones included;
- many refusals have no code (the bearer 401s, a wrong 2FA code, the passkey errors), so the
  frontends show the server's English sentence;
- a passkey sign-in skips the second factor in keksdose and kastlan, while no app asks the
  authenticator to verify the person (UV).

### 12.3 The cut

Two router factories, on the pattern of `feedback_router(FeedbackDeps(...))`:

- **`auth_router(AuthDeps(...))`** in `eifi1_server_kit.auth` (new `auth.ports`, `auth.service`,
  `auth.router`, `auth.testing`): the ≈ 30 routes of §12.1, with 2FA, passkeys, the sessions
  list and the demo session each mounted only when the app gives what they need.
- **`user_admin_router(UserAdminDeps(...))`** in `eifi1_server_kit.user_admin`: the admin
  surface of §12.1. kastlan mounts it twice, its company admin and its platform, each with its
  own scope (§12.4).

What stays app-side: the database and migrations, the app's routes beside the kit's (kastlan's
company routes, keksdose's private-mode and data routes, Kurvenschmiede's teams), the hooks'
bodies, and JWT signing (the kit keeps "no JWT library", §8: the app hands a signer).

**The ports.** Async, in the caller's transaction; every write flushes and none commits
(server-services §2.7). Rows are read through protocols, so an app's own columns and sealed
fields stay in its adapter.

| Port | Holds | Notes |
|---|---|---|
| `UserStore[UserT]` | the account row: `AccountRow` protocol (id, email, password hash, names, locale, role, active, verified, last sign-in, forced change, deletion stamps, appearance, zone, created, the review scope's locales and areas); optional, with a default: `is_demo` (false) and the `iat` cut-off (absent) | lookups by id and exact address (and the address tag's variants); add; update named fields; count people; delete |
| `SessionStore` | the `user_sessions` rows of server-kit 0.27 (`sid`, user, device, address, started, last active, `shared_device`, `expires_at`, active) | start, get, touch, end one, end all but one, list a user's live ones |
| `OneTimeTokenStore` | the reset, verification and address-change links (`OneTimeTokenKind`): hash, user, pinned address or new address, expiry | put replaces the user's earlier one of that kind; take by hash; drop. kastlan fills it from its `users` columns |
| `InvitationStore[InvT]` | invitations: address, role, the app's `scope` (company, team, budget; opaque to the kit), expiry, accepted, revoked | by token hash; open ones for an address; accept; and the admin's list, add, re-mint, revoke |
| `PasskeyStore` | credentials (id, public key, sign count, transports, name, used) and spent challenges | one-use challenges through a spend that answers false the second time (Kurvenschmiede's table), for every app |
| `TwoFactorStore` (optional) | the sealed secret, the pending secret, the last step, the backup-code digests | mounted only with it; the app hands a `SecretSeal` (seal, open), so keksdose and kastlan keep their keys |
| `AdminActionLog` | `admin_actions` rows (`admin_action_record`) | add; page by target; kastlan's company column through the scope |
| `Mailer` | the transport (exists: Resend, console; kastlan's SMTP as its own `Mailer`) | with the console transport, the admin's answer shows the link once (§12.5 item 11) |
| `AfterCommit` | work that waits for the app's commit: the account mails, the purge of an erased person's files | `later(fn)`; the app runs the queue from its session's commit event (Kurvenschmiede's `send_after_commit`) and drops it on a rollback. The kit never commits, so it cannot know otherwise |
| `TokenSigner` | sign and verify the app's JWTs | the kit builds and checks the claims, as today |

**The hooks** (`AuthHooks`, every one optional). `AuthDeps.hooks` is a **dependency** that
answers the hooks for this request, as the stores are, so a hook works on the request's own
session and transaction (kastlan's `on_register` makes a company in it):
- `on_register(user, invitation: InvT | None, body)` and `on_invitation_redeemed(user,
  invitation)`: seam 1. The invitation is `None` for the first account and any sign-up the
  gate lets in without one.
  The second also runs at an address confirmation, for open and unexpired invitations only.
  `register_model` (a subclass of `RegisterRequest`) carries the app's fields: keksdose's
  currency and terms version, kastlan's company name.
- `claims(user, session)` and `bind(user, claims)`: seam 2. The kit's `current_user`
  dependency checks the token, the session row and the cut-off, then calls `bind`, which may
  refuse (kastlan's 401 for a lost membership, 403 for a deactivated company).
- `password_changing(user, body)`, `challenge_extras(user)`, `reset_extras(user)`,
  `passkey_extensions(user, ceremony)` and `passkey_removing(user, credential)`: seam 3, each
  with a schema subclass where the body grows.
- `sessions_ended(user, reason)`, the reason one of logout everywhere, password changed,
  reset, deactivated, deletion requested, forced change: seam 4. "Every session" means every
  row; the `iat` cut-off is stamped too only where the app's `AccountRow` has it (keksdose and
  Kurvenschmiede, until their tokens all carry a `sid`). A new app builds rows only.
- `DeletionPolicy` (server-kit's `deletion_schedule`), `on_deletion_requested(user)`,
  `on_deletion_withdrawn(user)` and `erase(user)` (the hand-over; the kit then scrubs the log,
  anonymises the feedback through `FeedbackService.erase_author` when the app gives its
  feedback stores, hands the returned file keys to `AfterCommit` for the purge, and deletes
  the row): seam 5. An app without feedback skips that step.
- `me_model` (a subclass of `UserResponse`) with `to_me(user)`, and `row_model` with
  `to_row(user)` on the roster: seam 6.
- `demo_guard` and `admin_guard`, the factories `feedback_router` already takes.
- **One `current_user` for every router**: `auth_router` exports the dependency it checks the
  bearer with (token, session row, cut-off, `bind`), and `admin_guard` built on it, so
  `FeedbackDeps.actor` and `TranslationReviewDeps.reviewer` are a mapping from that user, not
  a second bearer check.
- **Mail texts**: the kit writes the account mails in the seven languages (reset,
  verification, address change and its notice, invitation, deletion, passkey added, the test
  mail), as the ui-kit writes the sign-in words: German is `de-CH`, formal, with "ss", as in
  the ui-kit's catalogues. An app may replace one kind.

**Testing support** (`auth.testing`, `user_admin.testing`): in-memory stores, a `check_*`
contract suite per port that an app runs against its own adapters, and a software
authenticator for passkey tests (keksdose and Kurvenschmiede each have a `soft_webauthn.py`
today).

### 12.4 The admin scope

`user_admin_router` takes an `AdminScope`: which accounts an admin sees and acts on, how the last
admin is counted, whether a role is one value or a set, and which roles may be given. keksdose,
Kurvenschmiede and Staunlabor use the global scope (one role per account). kastlan mounts its
company admin with a company scope (the roles of the acting company, `other_companies`,
`last_admin` naming the companies, seats through a hook) and its platform with the global scope
under `/platform`. Teams (Kurvenschmiede) and budget shares (keksdose) stay app routes.

### 12.5 What the kit settles where the copies differ

The router does one thing where the apps do three. Most of it is the contract as written
(§4–§6, §11, server-kit 0.27); these are the points where at least one app does otherwise
today, and its adopt note names each:

1. **Session rows and `sid` in every app** (0.27 already says so); `POST /auth/logout` ends
   every session, `DELETE /auth/sessions/current` this one (§6.3); `GET /auth/sessions` marks
   the caller's.
2. **Mail after the commit**, every account mail (feedback already works this way, server-services
   §2.16).
3. **A code on every refusal**: new `AuthErrorCode` values for the bearer 401s, a wrong 2FA code
   and a refused passkey, so the ui-kit says them in seven languages.
4. **A limit on every anonymous redemption and on `refresh`** (per address of the caller, through
   the edge-token check), and keksdose's per-account limit on signed-in password checks for all.
5. **Sign-up checks in the order invitation, gate, `email_taken`**: kastlan changes.
6. **A reset ends a forced password change, ends every session, and marks the address
   verified** (it proved the address): kastlan's first part changes; keksdose and
   Kurvenschmiede gain the last.
7. **A forced password change ends the person's sessions** (keksdose, Kurvenschmiede): kastlan
   changes.
8. **Passkeys: one use per challenge through the store**; a passkey sign-in asks the
   authenticator to verify the person (UV required) and then counts as both factors, so a
   person with 2FA is not asked for a code after it. Today no app requires UV.
9. **Only open, unexpired invitations attach** at an address confirmation (Kurvenschmiede
   changes).
10. **The kit's mail texts** in seven languages; an app may keep its own kind by kind.
11. **Without a mail transport** (the console mailer, Staunlabor's start): the admin's answer to
    `users/{id}/mail` and to creating or re-sending an invitation carries the link once
    (Kurvenschmiede's rule; server-kit `MailResult` already allows it only then), and a sign-up
    through an invitation to its exact address counts as verified (`verified_by_invitation`).

Not in this cut: rotating refresh tokens with reuse detection (no app rotates today; two tabs
renewing at once would sign each other out without a grace window), and security notices for a
password, 2FA or new sign-in (no app sends them). Both are later rounds if Marcel wants them.

### 12.6 The order

The numbers moved by one: the edge-token proof shipped alone as server-kit 0.28
(`vouched_hops`), so the accounts are 0.29 and the admin 0.30.

1. **server-kit 0.29**: `auth_router` with its ports, hooks, texts and testing support, the
   admin's invitation routes (list, create, re-send, revoke: an invitation-only app cannot let
   anybody in without them), the `[sql]` tables and stores (decision C). Staunlabor builds its side against the draft ports at the same time
   (models, adapters, migration 0001, the contract suites) and reports gaps; it is the first
   app on it.
2. **server-kit 0.30**: `user_admin_router` with `AdminScope`, the rest of the admin surface,
   and one public entry for a demo: start a session for an account just made, with a fixed
   end (no sliding, no refresh token), and its access token with the `sid` and that life
   (`start_session(user, *, expires_at, refresh=False, shared_device=False)`, Kurvenschmiede's
   `demo_router`, keksdose's 60-minute demo the same shape). Reaping a demo account takes its
   rows along: `[sql]`'s `user_sessions` cascades, an app's own table calls `end_all`.
   Staunlabor next, then Kurvenschmiede (closest
   to the kit: one role, global scope). Its 0.27 session table comes with the switch, from
   `[sql]`, not wired by hand before it: until then it stays on server-kit 0.26 with its own
   copy of the proxy rule, live and checked against production (2026-11-13). It may move its
   account routes on 0.29 and keep its admin and demo routes until 0.30.
3. **kastlan and keksdose when it suits them**: kastlan's company scope and binding, keksdose's
   private mode, are the largest hooks. Each keeps its own routes until it moves; nothing in the
   kit forces a date.

The ui-kit side is small: the new codes' words (§12.5 item 3) and the sessions list's current
mark, in the round that ships with 0.29 (ui-kit 0.63).

### 12.7 Decided 2026-11-13

- **A. The cut and the order** of §12.3–§12.6: two routers, the ports and hooks as drawn,
  server-kit 0.28 (accounts) and 0.29 (admin) (shipped as 0.29 and 0.30, §12.6), Staunlabor first, then Kurvenschmiede, kastlan
  and keksdose at their own pace. *Recommended.*
- **B. The kit's behaviour where the copies differ** (§12.5), as the default for every app.
  Two of them a person notices: a passkey sign-in asks to unlock the device (PIN, fingerprint)
  and then needs no 2FA code; and the account mails read in the kit's words.
  *Recommended.*
- **C. Ready tables for the common case** (Staunlabor's proposal): an optional extra
  `eifi1-server-kit[sql]` with SQLAlchemy mixins for `users`, `user_sessions`,
  `one_time_tokens`, `invitations`, `passkeys` and `admin_actions`, and the stores over them.
  An app with one role and the global scope (Staunlabor, Kurvenschmiede, a new app) inherits
  them, adds its columns and writes only its Alembic migration; keksdose and kastlan keep their
  own adapters behind the same ports. It bends §8's "the database is app-side" (the tables'
  shape moves into the kit, the database and the migrations stay with the app), and the kit
  pins SQLAlchemy 2 in that extra. Without it Staunlabor and Kurvenschmiede write the same
  adapters twice. *Recommended.*

### 12.8 After Staunlabor's reading (2026-11-13)

Staunlabor, the first app on it, read the draft (13 points). Folded in: `last_login_at` and the
review scope on `AccountRow`, `is_demo` and the cut-off optional (§12.3); hooks as a per-request
dependency, `on_register`'s invitation may be `None`, the `AfterCommit` port, erasure with or
without feedback, one `current_user` for every router (§12.3); the console-transport rule and
`de-CH` mail texts (§12.3, §12.5 item 11); the invitation routes with the accounts (0.29, §12.6). Its point 13
is decision C (§12.7).

### 12.9 The frontend half: `@eifi1/ui-kit/accounts` (2026-11-13)

Marcel, 2026-11-13 (in Staunlabor's session): "Das sollte doch lieber vollständig in die kits
kommen, frontend wie backend. Noch eine nahezu ähnliche Fassung ist nicht wünschenswert." The
ui-kit already ships the parts (`SignInForm`, the settings cards, `InvitationsPanel`,
`FeedbackInbox`, `TranslationReviewPanel`, …); each app wires them itself. In Kurvenschmiede that
wiring is about 5,000 lines (Staunlabor's inventory, 2026-11-13): the session ≈ 1,200, the
sign-in pages ≈ 550, settings ≈ 800, admin ≈ 1,190, feedback ≈ 390, the review ≈ 330, the shell
≈ 700, most of it generic. With `auth_router` making the routes one, the wiring can be one too:
a new entry `@eifi1/ui-kit/accounts`, on react-router, TanStack Query and zustand, which the kit
already uses or names as peers.

**What it takes over:**

- **The session**: `createAccountsClient({ http, storagePrefix, publicPaths, signInPath, … })`
  on the app's axios instance: the bearer from the stored session, the refresh
  (`createSessionRefresh`/`attachSessionRefresh`, §11), `watchSessionElsewhere`, the session
  store (zustand; the tab's storage on a shared computer, page memory on the stricter path,
  local storage otherwise, §2.14), and **one sign-out in the contract's order** (§6.3:
  `dropPushSubscription`, then `DELETE /auth/sessions/current`, then the tokens; a failed
  revoke still signs out). The sign-in, the sign-up and the passkey finish **send
  `shared_device`** (server-kit 0.27). The storage keys come from the app's prefix, and the
  client lists them for the privacy page (`accountStorageEntries`).
- **The API and its hooks**: the routes of `auth_router` typed once (`accountsApi`), and
  `useCurrentUser`, `useSignIn`, `useRegister`, `useSessions` (with `current` and the revoke),
  `usePasskeys`, `useEmailChange`, `useDeletion`, `useExport`, `useAccountLanguage`,
  `useInvitationsAdmin`, with their query keys.
- **The pages**: `accountRoutes(options)` answers plain route objects for the sign-in,
  sign-up (with the invitation check, a dead link's banner and `AcceptInvitation` for an
  existing account), forgotten and new password, verification and address confirmation; and
  `RequireSession` for the private routes.
- **The account's settings**: the cards wired (profile, password, language, address, sessions
  with the device list, passkeys, export, deletion) as sections the app puts into its own
  `SettingsLayout`, beside its own.
- **Refusals**: `describeAccountFailure`: every coded refusal (§12.5 item 3) in the kit's seven
  languages, offline and timeouts, and the app's own codes through its catalogue.
- **Usable outside `AppShell`**: the account menu's rows, the sign-out and the role chip work in
  an app's own header (Staunlabor has no `AppShell`).

**What the app passes in:** its axios instance and base URL, the storage prefix and the privacy
lines, the public paths and the page after sign-in, its `User` type (the kit's
`UserResponse` and the app's `me_model` fields), extra sign-up fields (rendered in
`RegisterForm`'s slot and sent in the body), the sign-in hint and contact address, its legal
links (a terms link may be left out), the deletion mode's wording, and which optional parts it
has. Demo, billing, teams, 2FA and tours are **off unless the app turns them on**.

**Later rounds of the same entry**: the admin pages (roster, action log, test mail, attention
tile) with server-kit 0.30; the feedback pages (inbox, my feedback, public) and the review page
wired to `current_user` after them. The invitations panel comes first, with 0.29's routes.

**The admin's sections** (0.64, on server-kit 0.30–0.31's `user_admin_router`): the routes on
`client.api` and their hooks under `accountQueryKeys.admin`, so every action refreshes the
roster, the overview's counts and the log together; then four sections an app puts into its
admin `SettingsLayout` — `AccountAdminOverviewSection` (`GET /admin/attention`),
`AccountMailTestSection` (`GET /admin/mail`, `POST /admin/mail/test`), `AccountAdminLogSection`
(`GET /admin/actions`, filtered by a person's id or, for an erased account, by the address the
row kept) and `AccountUserRosterSection`. The roster pages, sorts and searches on the server
with its state in the URL, asks each action at the level the server states, shows a mail's link
while the transport is the console, and reads the overview tile's `?state=deletion_requested`
(server-kit's token is `deletion_scheduled`; both are read). What exists only in some servers is
the app's to switch on: the reviewer's scope (`reviewer`, a server with review languages) and
"Erase now" (`erase`, the `operator` deletion mode). Its words are the `accountRoster` namespace,
in the seven languages; the app brings its roles (`roles`, `choosable`) and its own columns and
actions. Kurvenschmiede's `UsersPanel`, `ActivityPanel` and `MailTestPanel`, ≈ 830 lines, were
the model.

**The second factor** (0.64, on server-kit 0.32's `/auth/login/2fa` and `/auth/me/2fa/*`,
keksdose's rules, its KG-1): the sign-in page passes `client.verifyCode` as `SignInForm`'s
`onCode`, so the code step needs no wiring; `AccountTwoFactorSection` is keksdose's card — every
setup behind the password (`ReauthDialog`), the pending secret's QR code drawn by the kit from
`otpauth_url`, "Lost your authenticator?" while it is on (the current one works until the new
code confirms), switching off by the password and a live code. Its three refusals
(`two_factor_invalid`, `two_factor_unavailable`, `two_factor_not_pending`) are said in the
account words; an unreadable second factor is never said as a wrong code.

**The review page** (0.64, on server-kit 0.31's `translation_review_router`): the three routes on
`client.api`, `useTranslationReviews`, and `AccountTranslationReview` — the language tabs, the
panel, the export and the empty state for a viewer granted nothing, with the strings from the app
(`loadStrings`) and the kit's own catalogues under `kit.`. Kurvenschmiede's `TranslationsPage`,
≈ 300 lines, was the model; its words are the `accountTranslations` namespace.

**The feedback pages** (0.64, on server-kit 0.31's `feedback_router`): `accountFeedbackApi` on the
client's `http` — its own module, so the routes load with the pages and not with every sign-in —
and `AccountFeedbackPage` (the inbox and one's own reports, on `FeedbackInbox`),
`AccountPublicFeedbackPage` (on `FeedbackPublicPage`) and `useAccountFeedbackSubmit`.
Kurvenschmiede's `FeedbackPage`, `AllFeedbackPage` and `useAppFeedbackSubmit`, ≈ 400 lines with
their requests, were the model; the parts' words were the kit's already.

**The teams** (0.64, opt-in, on server-kit 0.32's `teams_router` and `teams_admin_router`; Marcel,
2026-11-14: in both kits before the apps' joint deploy): `accountTeamsApi` on the client's `http`
in its own module, the hooks under their own `["teams", …]` root, `AccountTeamsSection` (the
admin's: the teams in a table, create, rename, delete at the stated level with what goes with the
team, members by address in either role, the waiting invitations) and `AccountTeamsPage` (a
member's teams; a manager's adds, removals and invitations), the six team refusals worded in
`accountTeams`. Kurvenschmiede's `TeamsPanel`, `TeamsPage` and `TeamCard`, whose wire server-kit
lifted, were the model; nothing appears unless the app mounts them.

**Found on the way** (Staunlabor's inventory):
- `@eifi1/ui-kit/offline` imports `idb-keyval` and `@tanstack/query-async-storage-persister`
  statically, so an app that needs only `SharedComputerChoice` must install both: the
  persistence moves behind a lazy import or its own entry (ui-kit 0.63).
- Kurvenschmiede sends no `shared_device` and its sign-out ends no server session; it has no
  session rows yet, so both come with its move to the kit, not as a fix now.
- `SessionsSetting` takes `sessions`, `onRevoke` and `current` since 0.61; no app passes them.
  The wired card does.

**Order**: ui-kit **0.63** with server-kit 0.29 (session, pages, the account's settings, the
invitations panel, the `offline` split, plus the legal credits and the link referrer collected
for 0.63); ui-kit **0.64** with server-kit 0.30 (the admin pages) and 0.32 (the second factor),
then the feedback and review pages. Staunlabor goes live on 0.63/0.29 for accounts and on 0.64/0.30 for the admin, with no
account wiring of its own.

