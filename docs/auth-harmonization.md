# Sign-in, sign-up and the account across the kit and the three apps — harmonisation plan

Status: **2026-10-05, a draft for the apps' reviews**, led from ui-kit at Marcel's request.
It is built from a read-only audit of the three apps (keksdose `cd0c5954`, kastlan
`1674ad6` plus its work in progress on password reset, Kurvenschmiede `628af3e`). The
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
| Login throttle | per IP | **none** | per IP + registration |
| Access / refresh | 24 h / 30 d | 15 min / 7 d, session row per refresh | 24 h / 30 d |
| Token carries | `sub, type, role, iat` | `sub, company_id, roles, first_name, last_name, is_superuser, review_locales, locale`, **no email** | `sub` |
| The user, for the shell | `GET /auth/me` | decoded from the token; `/auth/user` only on the profile page | `GET /auth/me` |
| Password change | `POST /auth/me/password`, keeps other sessions | inside `PATCH /auth/user`, keeps sessions | `POST /auth/me/password`, **ends all sessions** |
| Sign out everywhere | — | sessions API, no UI | `POST /auth/logout` |
| Forgot / reset | `/auth/password-reset/{request,check,confirm}`, 1 h | being built on keksdose's shape | same as keksdose |
| Email verification | `POST /auth/verify-email {token}`, 48 h, no gate | `GET /auth/verify-email?token=`, public resend | none (waits for the kits, §2.8) |
| Invitations | beta: `/register?email=` (no token); budget shares: token, 14 d | admin creates the user **with a password the admin chooses** | allow-list: `/register?email=`; shares: pending by email |
| Mail | Resend / console | SMTP / console → Resend (being built) | Resend / console |
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

## 3. The account

### 3.1 Fields (the core every app has)

| Field | Rule |
|---|---|
| `id` | |
| `email` | unique. **Trimmed and lower-cased at every entry**: sign-up, sign-in, reset, invite, allow-list, admin |
| `first_name`, `last_name` | both required at sign-up, 1–100 characters after trimming, any script. Migrated rows may hold an empty `last_name` until completed (§3.3) |
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

### 3.3 Migrating keksdose's and Kurvenschmiede's users

- `first_name` = the old `display_name`, `last_name` = empty.
- `/auth/me` answers `name_incomplete: true` while either is empty.
- After sign-in the app shows the kit's **`CompleteNameDialog`**: first and last name,
  prefilled with what is there, and a save button. Dismissing it only defers it to the
  next sign-in.
- Nothing else waits on it: an incomplete name blocks no page.

## 4. Sign-up

### 4.1 The form (kit `RegisterForm`, the same in every app)

1. First name
2. Last name
3. Email (prefilled and read-only when the sign-up comes from an invitation)
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
  - after that, the address must be on the environment list, on the allow-list table, or
    carry a valid **invitation**;
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

### 4.4 Invitations (one shape)

- An invitation is a **token**: hashed, single use, **14 days** (keksdose's budget-share
  invite).
- It is bound to:
  - **an email address**;
  - **a scope**: a kastlan company, a Kurvenschmiede team or registration, or a keksdose
    budget;
  - **a role**;
  - the inviter.
- The mail goes out in the **invitee's** language, picked in the invite dialog (i18n H7).
  The link is `/register?invite=<token>`.
- **The address has no account yet**: the sign-up form opens with the email fixed. On
  success the invitation is spent and attached.
- **The address has an account**: the link leads to sign-in, then the app attaches the
  invitation (`POST /auth/invitations/accept {token}`). This is how a kastlan user joins
  a second company.
- keksdose's and Kurvenschmiede's token-free `/register?email=` beta links become
  invitations with the registration scope.
- **kastlan's admin-created accounts** stop: no admin chooses anyone's password.
  kastlan's interim plan (create the user, mail a set-your-password link on the reset
  token) is replaced by this invitation. Until the kit parts exist, kastlan may keep its
  interim if it is already built. The review decides (§10).

## 5. Sign-in

### 5.1 The request and its answers (keksdose's shape)

`POST /auth/login {email, password}` answers one of:
- `TokenResponse` `{access_token, refresh_token, token_type, user}`;
- `{requires_2fa: true, challenge_token}`, then `POST /auth/login/2fa {challenge_token, code}`;
- `{requires_password_change: true, challenge_token}`, then `POST /auth/login/set-password`.

A passkey sign-in (`/auth/passkey/login/begin|finish`, already the same paths in all
three) answers the same way.

### 5.2 Rules

- **One error for unknown address and wrong password**: `401 {code: "invalid_credentials"}`.
  A deactivated account gets the same answer: it must not reveal that the account exists.
  The review settles whether a deactivated account deserves its own message after a
  correct password.
- **Throttle** per IP and per address (a server-kit preset). kastlan gains one.
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

### 6.2 Tokens

- **The access token carries what the server needs to authorise**: `sub`, `type`, `iat`;
  kastlan also `company_id` and `roles` for RLS. **No names, no email, no locale.**
- Lifetimes are a decision for the review (§10): today 24 h / 30 d in two apps, and
  15 min / 7 d in kastlan.

### 6.3 Ending sessions

- `POST /auth/logout` ends **every** session (Kurvenschmiede's). Signing out on one
  device is the client dropping its tokens.
- **A password change or reset ends every other session** (Kurvenschmiede's and keksdose's
  reset; keksdose's change keeps them today). The review confirms (§10).
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
- **Sign-up:** `RegisterForm` (§4.1, with the app-field slot), `CompleteNameDialog`.
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
- **Rate limits:** the `AuthLimiters` preset.
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
1. `display_name` → `first_name` + `last_name`, with the migration of §3.3,
   `name_incomplete` and `CompleteNameDialog`. The read-only `display_name` stays in
   the API.
2. The register form → `RegisterForm`: first and last name, with currency in the slot.
3. Beta invites → token invitations (§4.4). Budget-share invites already have the shape.
4. Mails greet with `full_name`.

**kastlan:**
1. **Remove the first-company path.** "Company" is required without an invitation.
2. **Several companies** (§5.3):
   - the role-assignment constraint;
   - `last_company_id`;
   - `/auth/switch-company`;
   - `/auth/me` with `companies`;
   - the switcher;
   - leave and remove.
3. `/auth/me` (alias `/auth/user`). The shell reads it, not the token, and the token
   drops names and locale.
4. Sign-up takes `locale`. Every entry lower-cases the email.
5. **Login throttle.** One `invalid_credentials` answer. `/auth/login` answers with
   keksdose's challenge shapes.
6. **Invitations** (§4.4) replace admin-chosen passwords. The allow-list moves to the
   superuser.
7. `GET /auth/verify-email?token=` → `POST /auth/verify-email {token}`. The page reads
   the token from the URL and posts it, so a link scanner's GET verifies nothing.
8. 2FA: seal the secret; fix or remove the backup codes (minted on a GET, never
   accepted). This is the user-management round's, listed here because it sits in the
   sign-in path.

**Kurvenschmiede:**
1. `display_name` → first and last name, the migration, `CompleteNameDialog`.
2. The register form gains "confirm password".
3. Allow-list `/register?email=` links → token invitations. The allow-list keeps its
   role column.
4. Email verification with the kit parts (§2.8).

## 10. Open points for the reviews

1. **Deactivated account**: the same `invalid_credentials`, or a message of its own
   once the password was right?
2. **Password change ends other sessions** in every app?
3. **Token lifetimes**: keksdose's 24 h / 30 d, or kastlan's 15 min / 7 d?
4. **kastlan's interim** set-password link for admin-created users: keep until the kit's
   invitation lands, or go straight to invitations?
5. **2FA in Kurvenschmiede**: part of this round, or later?
6. Each app: anything in its sign-in or sign-up that this plan misses or breaks
   (keksdose's demo session and E2EE sign-in, kastlan's tenant role, Kurvenschmiede's
   customers).
