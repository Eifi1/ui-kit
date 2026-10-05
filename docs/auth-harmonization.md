# Sign-in, sign-up and the account across the kit and the three apps — harmonisation plan

Status: **2026-10-05, reviewed.** Led from ui-kit at Marcel's request. All three apps
reviewed the draft the same day; §10 records what they settled, and §2 has Marcel's
decisions, including those that followed the reviews.
It is built from a read-only audit of the three apps (keksdose `cd0c5954`, kastlan
`1674ad6` plus its local `feat/auth-pages`, Kurvenschmiede `628af3e`). The
full audit is kept outside the repo; the facts this plan rests on are quoted here.
Marcel's decisions are in §2.

This is the first part of the user-management round. The admin side (user list, roles,
deactivation, allow-list screens, audit) follows in its own contract and builds on this
one. It follows the pattern of the feedback and legal rounds: **one contract + kit parts
+ server-kit parts**. keksdose is the reference wherever §2 doesn't decide otherwise.

Paths below are relative to each repo: **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Who signs in | the user (email) | the user (email); the company comes from the user | the user (email) |
| Name | `display_name` (1–120) | `first_name` + `last_name` (DB ≤ 100, no length check in the API) | `display_name` (1–120) |
| Sign-up fields | email, password + confirm, display name, language, currency, terms checkbox | email, password + confirm, first, last, **company (optional)** | email, password, display name, language |
| Without a company | — | **joins the first active company as MANAGER** (`auth_service.py:243-255`, "legacy single-tenant path") | — |
| Gate | first user = admin; env list or `beta_allowlist` | same; `beta_allowlist` global, editable by **every company's admin** | same; `registration_allowlist` with a **role** |
| Role at sign-up | MEMBER (first user ADMIN) | ADMIN with a company, else MANAGER | from the allow-list row (MEMBER / CUSTOMER) |
| Grouping attached at sign-up | own household (owner) | new company, or the first one | none (teams and shares later) |
| Companies per user | — | exactly one (`users.company_id NOT NULL`); `user_role_assignments` carries `company_id`, unique on (user, role) | — |
| Sign-up answer | `201 TokenResponse` (signed in) | tokens | tokens |
| Login answer | `TokenResponse \| {requires_2fa, challenge_token} \| {requires_password_change, challenge_token, encrypted}` | tokens; `/login/2fa` | tokens |
| 2FA | TOTP, sealed secret | TOTP, plaintext secret; backup codes minted on a GET, never accepted | none |
| Passkeys | `/auth/passkey/*`, same paths in all three | same | same, password re-auth first |
| Login throttle | per IP | **none** (reset: 10/h per IP, 3/h per address) | per IP + registration |
| Access / refresh | 24 h / 30 d | 15 min / 7 d, session row per refresh | 24 h / 30 d |
| Token carries | `sub, type, role, iat` | `sub, company_id, roles, first_name, last_name, is_superuser, review_locales, locale`, **no email**; no session check per request | `sub`; cut-off checked per request |
| The user, for the shell | `GET /auth/me` | decoded from the token; `/auth/user` only on the profile page | `GET /auth/me` |
| Password change | `POST /auth/me/password`, keeps other sessions | inside `PATCH /auth/user`, keeps sessions | `POST /auth/me/password`, **ends all sessions** |
| Sign out everywhere | — | sessions API, no UI | `POST /auth/logout` |
| Forgot / reset | `/auth/password-reset/{request,check,confirm}`, 1 h; confirm answers **without** tokens | built locally (`feat/auth-pages`) on keksdose's shape: hashed, 1 h, one live link, redeem ends every session | same as keksdose |
| Email verification | `POST /auth/verify-email {token}`, 48 h, no gate | `GET /auth/verify-email?token=`, public resend | none (waits for the kits, §2.8) |
| Invitations | beta: `/register?email=` (no token); budget shares: `/join?token=`, plaintext token, address optional, no mail, role guest | admin-chosen passwords, replaced locally by a set-password mail (reset table, `purpose=invite`, 72 h) | allow-list: `/register?email=`; shares: pending by email |
| Mail | Resend / console | Resend / console (built locally) | Resend / console |
| Email case | lower-cased everywhere | lower-cased at login | trimmed + lower-cased |

The kit already has the settings sections (`ProfileSetting`, `PasswordSetting`,
`TwoFactorSetting`, `PasskeysSetting`, `ReauthDialog`), `AuthLayout`,
`OneTimeCodeInput`, `PasswordStrengthMeter`, `OptionSwitcherMenu`, and since 0.28
`LegalFooter`, `LegalAcceptCheckbox` and `useNoIndex`. **It has no sign-in or sign-up form.**

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
  - **"LastFirst" with no space in zh**.
- The kit gets `formatPersonName({ first, last }, locale)` and `personInitials(…)`.
  `UserAvatar` uses them. server-kit gets `full_name(first, last, locale)` for mails and
  for `stamp_identity`. The feedback context keeps its `user_display_name` key, filled
  with the formatted name.
- **APIs keep a read-only `display_name`**, derived the same way, so everything that only
  shows a name keeps working. Writes take `first_name` and `last_name` only.
- **Whose language decides the order** (§10.6):
  - on screen, the reader's: the kit formats from `first_name` and `last_name`, and the
    API's `display_name` is only a fallback;
  - in a mail or a push, the recipient's;
  - in a copy frozen at the time of writing (the feedback stamp), the author's.
- **Lists sort by `(last_name, first_name, id)`** in SQL. Search matches first name, last
  name, and both orders of the two together.

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

- Answers `201` with the sign-in answer of §6.1, so the user is signed in right away, as
  in all three apps today.
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
- **kastlan's allow-list** becomes the platform's: only a superuser reads or writes it.
  Today any company's admin sees every other company's invited addresses and notes.
  Company admins invite people into their own company (§4.4).
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
  invite).
- It is bound to:
  - **an email address**;
  - **a scope**: a kastlan company, a Kurvenschmiede team or registration, or a keksdose
    budget;
  - **a role**;
  - the inviter.
- **Who may invite a new person**: admins and team managers (§2.11). A Kurvenschmiede
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
- **keksdose's budget-share invites are not this shape yet** (§10.8): plaintext token,
  optional address, no mail, `/join?token=` behind sign-in, and they pass the sign-up
  gate by adding the address to the allow-list. They move to it, and links already out
  keep working for their 14 days.
- **kastlan's admin-created accounts** stop: no admin chooses anyone's password.
  kastlan's interim plan (create the user, mail a set-your-password link on the reset
  token) is replaced by this invitation. Until the kit parts exist, kastlan may keep its
  interim if it is already built. The review decides (§10).

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
  `401 {code: "invalid_credentials"}`, in the same time (a dummy hash for unknown
  addresses). The 2FA, set-password and refresh steps check `is_active` too.
  - The form shows the hint "Account deactivated? Write to …" (§2.10).
  - In kastlan, a **deactivated company** blocks that company only: sign-in opens another
    company of the user's, or "no active company".
- **Every refusal carries a `code`**: `invalid_credentials`, `registration_closed`,
  `email_taken` (409), `invitation_invalid`, `invitation_expired`, `token_invalid`.
  Today the pages show the server's detail strings, so each app switches its server and
  its pages together.
- **Throttle**: per IP as the hard limit. Per address, only failures are counted, and
  the answer slows down rather than locking out, because a lock per address would let
  anyone lock a known address out. A server-kit preset; kastlan gains one.
- After sign-in, the app:
  - loads `/auth/me`;
  - switches to the user's language;
  - goes to the page the visitor was headed for, else the app's start page;
  - in kastlan, opens the **last company used**.

### 5.3 kastlan: several companies

- **Membership** = the user's role assignments per company:
  - `user_role_assignments` becomes unique on `(user_id, company_id, role)`;
  - `users.company_id` becomes `last_company_id`, the one sign-in opens.
- **The access token carries the current company**, as today, and RLS reads it as today.
  `POST /auth/switch-company {company_id}` answers with fresh tokens for a company the
  user belongs to, like today's `/auth/switch-role`.
- `/auth/me` adds `companies: [{id, name, roles}]` and `current_company_id`.
- **Switcher**: the kit's `CompanySwitcher` in the top bar, built on
  `OptionSwitcherMenu`. It shows only for a user in more than one company.
- **What must change in kastlan** (its review, §10.9). Two items must not be missed:
  - **roles per company**: `User.roles` returns the assignments of every company today,
    so an admin in A would be an admin in B. `require_role` and the token's `roles`
    filter by the token's company, and the fallback to `users.role` goes;
  - **membership on every refresh**: refresh mints for `last_company_id` only while the
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
  change; a token is proof of who, not a profile. kastlan's top bar gains the email it
  could not show.
  - An offline-first app (keksdose) boots from the persisted user of its last sign-in
    answer and refreshes it from `/auth/me` when online.
  - kastlan moves everything it reads from the token today (names, locale,
    `is_superuser`, review locales) to `/auth/me` in the same change that drops those
    claims.

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

## 8. What the kits add, what stays app-side

**ui-kit 0.29.0** (all labels in a new `auth` namespace, 7 languages, keksdose's words):

- **Sign-in:**
  - `SignInForm`: email, password, "Forgot password?", the passkey button, the 2FA step
    (`OneTimeCodeInput`) and the set-new-password step;
  - it takes `onSubmit` / `onPasskey` / `onCode` callbacks and renders §5.1's answers.
    **The kit never sends a request itself**: keksdose must see the password on its way
    (it refuses the same string as an encryption passphrase);
  - the email field is `autoComplete="username webauthn"`, so the app can arm passkey
    autofill on mount. The passkey button asks for no email;
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
  - `CompleteNameDialog`.
- **Signed-out pages:** `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailStatus`,
  `EmailVerificationBanner`, `NotFoundPage`, and an `AcceptInvitation` status.
- **Names:** `formatPersonName`, `personInitials`; `UserAvatar` takes `{first, last}`.
- **Switcher:** `CompanySwitcher`, a generic context switcher. kastlan's companies today;
  keksdose's budget switcher could take it later.
- **Errors:** `isAuthError(err, code)` for the coded answers (`invalid_credentials`,
  `registration_closed`, `invitation_invalid`, …).

**server-kit 0.3.0** (Layer 1: pure, no `User` import):

- **Accounts:** `normalise_email`, `registration_decision(is_first, on_env, on_table, invite)`,
  `full_name(first, last, locale)`.
- **Tokens:** one-time tokens (mint, hash, expiry, single use) for reset, verification
  and invitation; claim builders and `token_is_revoked`.
- **Rate limits:** the `AuthLimiters` preset: per IP, failures per address, the reset
  limits kastlan already runs (10/h per IP, 3/h per address).
- **Erasure:** a user's identifiers for `anonymise_feedback` are the email, the old
  `display_name`, and the full name in both orders. A bare first or last name on its own
  is not redacted, because it would shred a report that mentions "Mai" or "Bank".
- **Schemas:** Pydantic for `RegisterRequest` core, `TokenResponse`, the two challenges,
  `UserResponse` core and `ProfileUpdate`.
- **Mail:** a Resend client, `render_message`, `pick(locale, texts)`.

**App-side**:
- the database, migrations and routes;
- what an invitation attaches to (company, team, budget) and RLS;
- the app's sign-up fields;
- the texts of the mails;
- keksdose's demo session, API tokens and E2EE;
- kastlan's platform superuser.

## 9. Per repo

**ui-kit:** §8 as 0.29.0, after 0.28.0 is released.

**server-kit:** §8 as 0.3.0, after 0.2.1 (the review-area patch).

**keksdose:**
0. `features/auth/email-tag.ts` → the kit's `taggedEmail` and `RegisterForm`'s built-in
   suggestion. Your `auth.email_tag_*` keys go to the kit.
1. `display_name` → `first_name` + `last_name`, with the migration of §3.3,
   `name_incomplete` (also in the sign-in answer's user) and `CompleteNameDialog`. The
   read-only `display_name` stays in the API; the demo user is never incomplete. It is
   used in 31 backend files, 63 backend test files and 12 frontend files; factories, the
   seed and the demo write first and last.
2. Where a name is more than a label:
   - lists that sort or search by name → `(last_name, first_name)`: the admin roster,
     support search, share guests, category owners, reviewer names;
   - the E2EE key-recipient list sorts the same way;
   - push texts name the guest in the **recipient's** order;
   - mails greet with `full_name` in the recipient's order, escaped as today;
   - erasure passes the server-kit identifiers (§8);
   - existing passkeys keep the name they were registered with.
3. The register form → `RegisterForm`, with your slots (§8). The beta invite →
   invitations. **Budget-share invites move to §4.4's shape**, and `/join?token=` links
   already out keep working for their 14 days.
4. The password change answers with fresh tokens and ends the other sessions; personal
   access tokens survive it. The sign-in answer's `refresh_token` stays nullable for the
   demo.
5. Coded refusals: the server and `extractApiErrorMessage` switch together.

**kastlan:**
0. Gains the address-tag suggestion with the kit's `RegisterForm` (`+kastlan`). The
   invitation and reset rules of §4.5 apply on the server.
1. **Now, on its own (§2.9): lock company data to staff**:
   - every company-data route requires an employee role;
   - TENANT leaves the create and invite dialogs;
   - production is checked for tenant accounts;
   - a test sweeps the route table so no new route misses the gate.
2. **Remove the first-company path.** "Company" is required without an invitation; an
   invitation names the company and role.
3. **Several companies** (§5.3), from kastlan's review:
   - a. **roles filtered by the token's company** in `require_role` and in the token's
     `roles`; the `users.role` fallback goes; the migration backfills assignments;
   - b. the deactivated-company check reads the token's company;
   - c. **refresh checks membership** and mints for `last_company_id`;
   - d. about 25 reads of `user.company_id` → a `current_company_id` dependency: billing,
     **feedback (a row would land in another company's inbox)**, **offline sync**, handover
     photos, documents, property, rent increase, company, users, platform, switch-role,
     `_issue_tokens`;
   - e. the user list goes through role assignments;
   - f. `contacts.user_id` becomes unique per `(user_id, company_id)`: one contact per
     membership;
   - g. seeds and tests create assignments;
   - h. the WebSocket channels are per company;
   - plus `/auth/switch-company`, `/auth/me` with `companies`, the switcher, and leave and
     remove.
4. `/auth/me` (alias `/auth/user`). The frontend moves names, locale, `is_superuser` and
   review locales from the token to `/auth/me`, and the token drops them in the same
   change.
5. Sign-up takes `locale`. Every entry trims and lower-cases the email (login only
   lower-cases today).
6. **Login throttle** (the server-kit preset; your reset limiters fold into it). One
   `invalid_credentials` answer, with the deactivated hint. `/auth/login` answers with
   keksdose's challenge shapes.
7. **Per-request revocation**: a `sid` claim checked against the session row in
   `get_current_user`. Until then, 15-minute access tokens; refresh 7 d → 30 d.
8. Invitations (§4.4) replace your interim set-password invite once the kits land; the
   interim stays until then. The allow-list moves to the superuser. Mails go in the
   invitee's language.
9. `GET /auth/verify-email?token=` → `POST /auth/verify-email {token}`.
10. 2FA: seal the secret; fix or remove the backup codes (minted on a GET, never
    accepted). This belongs to the user-management round, listed here because it sits in
    the sign-in path.
11. Legal: with Resend live, production no longer logs the verification link, so the
    privacy sentence from the legal round follows that.

**Kurvenschmiede:**
0. Gains the address-tag suggestion with the kit's `RegisterForm` (`+kurvenschmiede`),
   with §4.5's invitation and reset rules on the server.
1. `display_name` → first and last name, the migration, `CompleteNameDialog`. Where a
   name is more than a label:
   - share candidates, `access.display_names` and team members sort by
     `(last_name, first_name)`;
   - the reset mail greets in the recipient's order;
   - the feedback stamp, the reviewer names, the passkey's user name, the CLI and the seed
     are updated.
   Names stay plaintext.
2. The register form gains "confirm password".
3. Allow-list rows → invitations, keeping the role column (CUSTOMER never a team
   manager). Team managers may invite new people into their team (§2.11). That is new:
   today adding an unknown address to a team fails with 404.
4. Coded refusals: `invalid_credentials`, `registration_closed`, `email_taken`, …
   instead of detail strings.
5. Email verification with the kit parts (§2.8); 2FA later, the same way (§10.5).
6. The invite mail's product line is stale ("where a steering gear is sized"); the
   rewrite uses the curves wording.

## 10. Settled after the reviews (2026-10-05)

1. **Deactivated account** → the same `invalid_credentials` plus a hint (Marcel, §2.10).
   keksdose and Kurvenschmiede already answer that way. kastlan's message after a
   correct password goes. A deactivated *company* in kastlan blocks only that company
   (kastlan's point).
2. **Password change ends every other session** and keeps the caller's (all three
   agree; §6.3). keksdose's personal access tokens survive a voluntary change.
3. **Lifetimes**:
   - a per-request revocation check is required everywhere;
   - lifetimes are then a per-app setting, defaulting to 24 h / 30 d;
   - kastlan keeps 15 min until its check exists.
   The two sides argued it out: keksdose and Kurvenschmiede on offline-first use and a
   backend that scales to zero, kastlan on its unchecked access tokens (§6.2).
4. **kastlan's interim** set-password invite (reset table, 72 h) stays until the kit's
   invitations land. The swap needs no data migration (kastlan).
5. **2FA in Kurvenschmiede** comes later, built once from the kit parts.
   `SignInForm` renders the 2FA step from the start, so adding it later is backend
   work only (Kurvenschmiede's recommendation; Marcel has not been asked separately).
6. **Names**:
   - order by the reader's language on screen, the recipient's in mail and push, and
     the author's in a frozen stamp;
   - lists sort by `(last_name, first_name, id)`;
   - 1–120 characters;
   - plaintext;
   - identifiers for erasure as in §8.
7. **Invitations and the gate** (Marcel, §2.11–12):
   - admins and team managers invite new people, and the invitation defines the company
     or team;
   - allow-list entries become invitations;
   - registering through one sets `email_verified_at` only for the exact invited address;
    a tagged variant verifies by its own mail (Kurvenschmiede's point);
   - a member's share to an unknown address stays a pending grant.
8. **keksdose's budget-share invites** were not the model the draft said: plaintext
   token, optional address, no mail, `/join?token=`. They move to §4.4, and the links
   already out keep working.
9. **kastlan's several companies**: RLS itself is fine, because the company comes from
   the token. What breaks is everything keyed on `users.company_id` and the unscoped
   roles (§9 kastlan 3a–h). Medium effort, mostly mechanical, one migration.
10. **Security, found by the reviews**:
    - kastlan's TENANT reads the whole company: locked now (§2.9);
    - a per-address lockout would be a denial-of-service lever, so only failures are
      counted and the answer slows down (§5.2);
    - verify-email by GET lets a link scanner verify an address, so it moves to POST.
11. **The kit forms never send requests**; they pass the input to the app. **A reset is
    not a sign-in.** An offline-first app boots from its persisted user (§5–6).

12. **The address tag** (Marcel, after the reviews): keksdose's `+keksdose` suggestion
    goes into the kit for all three apps (§4.5). It is offered and never applied; an
    invitation accepts the tagged variant; a reset falls back to it; sign-in stays exact.

Nothing is open. Next: server-kit 0.3.0 and ui-kit 0.29.0 (§8), after 0.28.0 and 0.2.1
are released. kastlan's tenant lock (§9 kastlan 1) goes first, on its own.
