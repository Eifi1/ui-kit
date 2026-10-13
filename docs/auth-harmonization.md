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
| 2 | Decisions | — | decisions 9–13 after the reviews (§10) |
| 3 | The account | ui-kit 0.29.0, server-kit 0.3.0 | §10.6 |
| 4 | Sign-up | ui-kit 0.29.0, server-kit 0.3.0 | §10.4, §10.7, §10.8, §10.12–14; ui-kit 0.30.0 (`defaultEmail`, `token_expired`) |
| 5 | Sign-in | ui-kit 0.29.0, server-kit 0.3.0 | §10.1, §10.9, §10.10, §10.15; ui-kit 0.30.0 (the 429 line); server-kit 0.8.0 (`absent_account_check`) |
| 6 | The session | ui-kit 0.29.0, server-kit 0.3.0 | §10.2, §10.3, §10.11; §11 |
| 7 | Signed-out pages | ui-kit 0.29.0 | §10.10 |
| 8 | What the kits add | ui-kit 0.29.0, server-kit 0.3.0 | §10.5, §10.6, §10.11; later releases as listed there |
| 9 | Per repo | — (archived) | |
| 10 | Settled after the reviews | — | index; folded items point to their § |
| 11 | Session refresh | ui-kit 0.34.0, server-kit 0.8.0 | §11.7 |
| 11.1, 11.5 | Where each one stands; per app | — (archived) | |
| 11.7 | Settled after the reviews | — | index; folded into §11.2–§11.4 |

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
  Kurvenschmiede's CUSTOMER rule holds for invitations too: a customer is never a team
  manager.

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
  ending sessions takes effect at once, whatever the lifetime.
- **Lifetimes are a per-app setting** with a server-kit default of 24 h access and 30 d
  refresh. keksdose is an offline-first app people may open weekly. kastlan keeps
  15 min until its per-request check exists, and its refresh moves to 30 d.

### 6.3 Ending sessions

- `POST /auth/logout` ends **every** session (Kurvenschmiede's), behind its own "Sign out
  everywhere" action. The normal sign-out stays on this device only: the client drops
  its tokens (and keksdose wipes this device's offline copy).
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
the session refresh (§11.6).

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
| `onEnded({ demo })` | drop the tokens and the user, then navigate: `/demo/ended` for a demo, else `/login` with the page it came from (§5.2) | `endDemoSession()`; `clear({wipeMirror: false})` | `endDemo()`; `logout()` and `queryClient.clear()` | `clear()`; `/login?next=` only where `needsSession` |
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
reviews settled them; `docs/adopt-0.34.md` §2–§3 carries them for the apps. The rule
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

Each app's steps are in the archive (§11.5) and `docs/adopt-0.34.md`.

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
