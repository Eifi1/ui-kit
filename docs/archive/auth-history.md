# Sign-in, sign-up and the account across the kit and the three apps — history

What [the auth contract](../auth-harmonization.md) moved out of its body in ui-kit 0.34
(refactor audit DOC-1): its snapshots of the three apps (§1, §11.1), the per-repo to-dos
(§9, §11.5), the review logs (§10, §11.7) and round 0.34's build notes (§11.6). Kept as
written: "today", line numbers and each app's state are as of the day each part was
written, and an item may since have been folded into the contract, which wins. Section
numbers are the contract's.

## Status as written

Status: **2026-10-05, reviewed.** Led from ui-kit at Marcel's request. All three apps
reviewed the draft the same day; §10 records what they settled, and §2 has Marcel's
decisions, including those that followed the reviews. §11 (session refresh, round 0.34)
is **settled, 2026-10-12**: the three apps reviewed it that day, §11.7 records what they
settled, and §11 is corrected in place.
It is built from a read-only audit of the three apps (keksdose `cd0c5954`, kastlan
`1674ad6` plus its local `feat/auth-pages`, Kurvenschmiede `628af3e`). The
full audit is kept outside the repo; the facts this plan rests on are quoted here.
Marcel's decisions are in §2.

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

## 10. Settled after the reviews (2026-10-05) — as written

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
13. **keksdose's budget invitations** (Marcel, 2026-10-07): an exception to §2.11. A
    non-admin budget owner's share to an unknown address is an invitation that lets the
    person register (budget scope, role guest, 14 days). Admins keep the
    registration-scope invitation. The kit and server-kit assume nothing about who minted
    an invitation.
14. **Invitations keep expiring** (Marcel, 2026-10-07). The 14 days are the unused
    link's lifetime, not the account's: an account made through an invitation is
    permanent, and an invitee who registered signs in long after the link ran out. A
    passing "never expire" decision was taken back the same day once that was clear.
15. **`Retry-After` is an exposed CORS header** in every app (keksdose, 2026-10-07):
    without it a browser hides the header from a cross-origin client, and the forms'
    "Try again in N s" (`retryAfterSeconds`) can't read it, as in a development setup
    with the API on another origin.

Nothing is open. Next: server-kit 0.3.0 and ui-kit 0.29.0 (§8), after 0.28.0 and 0.2.1
are released. kastlan's tenant lock (§9 kastlan 1) goes first, on its own.

## 11. Session refresh (round 0.34; settled 2026-10-12) — status as written

**Settled 2026-10-12.** The three apps reviewed the draft (`05309f6`) the same day and
agreed with both of its open decisions (8 and 9). §11.7 records what became of each
finding; the sections below are corrected in place. Nothing is open.

### 11.1 Where each one stands

Read at kk `c6bf6f70` (the same as its main for these files), ka `e3985c9` (the same as its main
`c591e13`) and KS `de88be6` on `refactor/plan-2026-10` (its main has the same code, 18
lines lower). Line numbers are in each app's `frontend/src/shared/api/client.ts` unless a
path is given.

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Concurrent 401s | one shared promise, `refreshOnce` :51-60, :81-86 | a flag and a queue :38-42, :216-225; **the boot refresh is a second flight** (`features/auth/stores/auth-store.ts:41-44`, :82-113) | kk's, line for line :71-83, :106-111 |
| A failed refresh | definitive for no refresh token or a 401/403 from `/auth/refresh`, else transient :62-79 | **every failure signs out**: tokens cleared, `/login` :237-241. The boot path clears on any failure too (auth-store :102-104) | kk's :85-104 |
| After a transient one | the request rejects with its 401; session and outbox kept :169-171 | — | kk's :133 |
| Replay | once (`_retry`) :159-168 | no marker: a replay that 401s again refreshes again | once :125-132 |
| A sign-in step's 401 | ignored for a demo only (`SIGN_IN_STEP` :46-49, used at :182) | ignored for every session (`UNAUTHENTICATED_PATHS` :175-189, :196, :207-214) | ignored for every session :60-69, :124 |
| A demo's 401 | `endDemoSession()` :175-182 | `endDemo()` :99-104, :199-202 | `/demo/ended` :135-140 |
| After a definitive one | `clear({wipeMirror: false})`, `/login` unless already on `/login` or `/register` :183-192; a sync request (`x-hb-sync`) only rejects :153-158 | `clearTokens()`, `/login` :239-240 | `clear()`, `/login` only from a page that needs a session (`needsSession` :54-58) :137-145 |
| Token store | `localStorage` only, written by the refresh; an answer without a refresh token keeps the old one :70-71. The answer's `user` is dropped, and the store's `token` (`shared/state/auth-store.ts:80`) stays the old one | access token in memory, refresh token in `localStorage` (`setTokens` :67-81, where a `null` refresh token marks a demo and drops the real one); the user goes to a listener :233 | the store's `renewSession(…, user)` :98 |
| A refresh that lands after the session changed | written all the same :70-71 | written all the same :232 | written all the same (`renewSession`, `auth-store.ts:58-62`) |

The servers already agree: every definitive refusal of `POST /auth/refresh` is a 401 with
a detail string, never a 403 (kk `backend/keksdose/adapters/api/auth_router.py:860-884`,
KS `backend/kurvenschmiede/adapters/api/auth_router.py:197-206`, ka
`kastlan/adapters/api/auth_router.py:178-198`). No app's refresh invalidates the token it
replaces (kk and KS are stateless, ka keeps the `sid`: `session_service.py:81-95`), so
today the single flight is about load and order, and it keeps the kit right for an app
that makes them single-use.

Two other 401s meet a signed-in client. kastlan's `POST /auth/2fa/disable` answers 401 for
a wrong password or code (`kastlan/domain/services/two_factor_service.py:145-148`; its
settings page relies on it, `settings-page.tsx:242-244`). keksdose's translation-review
token (`translations_router.py:59`) is the kit showcase's Bearer (`kdr_…`), with no
refresh token. §11.5 deals with both.

### 11.4 What it calls back into — the option table as written

| Option | What the app gives | kk | ka | KS |
|---|---|---|---|---|
| `refresh(signal)` | its own `POST /auth/refresh` on a bare client, never the instance. It **writes nothing**. It resolves the answer as a renewal, or `null` when the device holds no refresh token; it throws on failure, and the kit classifies the throw. `replay: false` in the renewal stores it but replays nothing | its bare call :62-72, the `user` kept | its bare call through `serverWake.track`; `replay: false` when the answer's company is not the store's | its bare call :85-97 |
| `store(renewal)` | writes the tokens and the user. The kit calls it only while the session the flight renews is still the app's (§11.3) | `localStorage` :70-71, then `useAuth.setState({ token, user })` | `setTokens(token, refreshToken ?? getRefreshToken())`, then the user (§11.5) | `renewSession(token, refreshToken, user)` :98 |
| `currentToken()` | the access token the app sends now, read where its request interceptor reads it; `null` when there is none | `localStorage` `auth_token` :89 | `getAccessToken()` | `localStorage`'s access token :114 |
| `isDemo()` | whether the session is a demo | `isDemoSession(user)` | no refresh token and `hasDemoSession()` | `isDemoSession(user)` |
| `onEnded({ demo })` | drop the tokens and the user, then navigate: `/demo/ended` for a demo, else `/login` with the page it came from (§5.2) | `endDemoSession()`; `clear({wipeMirror: false})` | `endDemo()`; `logout()` and `queryClient.clear()` | `clear()`; `/login?next=` only where `needsSession` |
| `isSignedOutStep(url)` | optional; replaces the default list | | | |
| `attempts`, `backoffMs`, `timeoutMs` | optional; 3, `[1000, 3000]`, 15 000 | | | |

### 11.5 Per app

**keksdose:**
- `client.ts:46-86` and its 401 branch `:151-193` move onto the kit. It registers its own
  interceptors first (the log and the cold-start watchdog, `:100-105`, :111, :130), then
  `attachSessionRefresh` (kk 4).
- `refresh` is its bare call without the writes, resolving `{ token, refreshToken, user }`.
- `store` writes the two `localStorage` keys (`:70-71`) and calls
  `useAuth.setState({ token, user })`. Not `setSession`, which would also run the mirror
  check and the analytics (`shared/state/auth-store.ts:63-82`). Today the answer's user
  is dropped and the store's token goes stale (kk 3).
- `currentToken` reads `localStorage` `auth_token`, as its request interceptor does
  (`:89`). `onEnded` is today's two branches.
- Decision 9 removes the `x-hb-sync` branch (`client.ts:153-158`) and the header
  (`sync-client.ts:907`, :1073, and the comment at :1059-1060). The sync chip, red on any
  refusal today (`sync-client.ts:1083-1095`), shows "offline" for
  `isTransientRefreshFailure` (kk 2).
- It gains the signed-out-step rule for every session, the backoff and timeout, the
  stale-token replay and the late-refresh guard.
- Its `client.test.ts` reaches into the handler indexes (`handlers[0]` at `:36`, 46, 58,
  77, 97; the comment at `client.ts:100-104` says why the watchdog sits inside the
  existing interceptors). The kit's interceptors shift them, and the refresh cases move
  to the kit's tests (kk 5).

**kastlan (B3):**
- **Before adopting:** `POST /auth/2fa/disable` answers 400 for a wrong password or code,
  not 401 (`two_factor_service.py:145-148`; the comment at `settings-page.tsx:242-244`
  follows). Otherwise the replay's second 401 signs the user out (kastlan 2).
- `client.ts:175-245` moves onto the kit. The flag, the queue, `processQueue` and the
  `/auth/refresh` branch at `:207-213` go: the refresh never passes the instance.
- `refresh` is its bare call, through `serverWake.track`, so the cold-start notice watches
  it; the filter (`client.ts:18`) adds `refresh` (kastlan 9). It resolves
  `{ token, refreshToken, user }`, with **`replay: false` when the answer's
  `current_company_id` is not the store's** (kastlan 3).
  - A refresh can land in another company: it opens the company sign-in would
    (`company_to_open`, `auth_router.py:183-186`, `auth_helpers.py:101`). A member removed
    from the company gets a 401 (`dependencies.py:104-105`, :131-132) and refreshes into
    another one; another tab may have moved `last_company_id` (`auth_router.py:252`).
  - A waiting write, such as the handover's `POST /sync` (`sync.ts:142`), must not be
    replayed into that company.
- `store` calls `setTokens(token, refreshToken ?? getRefreshToken())`.
  - `setTokens` itself stays as it is: its `null` means a demo and drops the real token
    (`client.ts:65-77`). A real session's refresh always answers one
    (`auth_helpers.py:110`), so the fallback only guards (kastlan 7).
  - While signed out (the boot) it calls `signIn`, which also sends the crash reports
    that waited and applies the account's language (`auth-store.ts:53-57`). While signed
    in it replaces the user, as the listener does today (kastlan 6).
  - With `replay: false` it then clears the query cache and goes to `/dashboard`, as a
    company switch does (`top-bar.tsx:83-89`).
- `currentToken` is `getAccessToken()`.
- `onEnded`: `endDemo()` for a demo; else the store's `logout()` and `queryClient.clear()`,
  then `/login`. Not `clearTokens()`: `logout()` also forgets the offline handover copy
  (`db.ts:88-96`), the account's language and its last page (`auth-store.ts:62-75`)
  (kastlan 5).
- The boot `rehydrate` (`auth-store.ts:82-113`) calls `session.refresh()`, so it and the
  interceptor share one flight.
  - `renewed`: `store` has signed in, user included.
  - `ended`: it clears, as today.
  - `transient`: **the stored refresh token stays**, and the app shows "Can't reach the
    server" with "Try again" instead of the sign-in.
  - `changed`: it reads the store.
- `restoreDemo` (`auth-store.ts:128-130`) ends a demo only on a 401; a transient failure
  keeps its token. It runs from the landing routes too (`use-landing-session.ts:28`), and
  a PWA started offline must still reach its offline handover copy (`db.ts:78-79`;
  `vite.config.ts:37-38` promises it) (kastlan 8).
- The handover sync (`features/handover/offline/sync.ts`) counts
  `isTransientRefreshFailure` as offline, beside no answer (`:66-68`). No 401 marks a
  change or a photo rejected (`:196-210`): `discardRejected` (`:233-236`) would delete it
  (kastlan 4).

**Kurvenschmiede:**
- `client.ts:60-148` moves onto the kit, as its U6 asked; the wrong comment at `:72-74`
  goes with it (KS 9).
- `refresh` is its bare call without the write (`:85-97`), resolving
  `{ token, refreshToken, user }`. `store` is `renewSession(token, refreshToken, user)`
  (`:98`). `currentToken` reads `localStorage`'s access token, as its request interceptor
  does (`:114`).
- `onEnded`: `clear()`, then `/demo/ended` for a demo, else `/login?next=<the page>`,
  only where `needsSession`. The `next` is built as `ProtectedRoute` builds it
  (`protected-route.tsx:24-25`). This is new work: today it goes to a bare `/login`
  (`client.ts:144`), and `clear()` forgets the last page (`auth-store.ts:15-18`, :73)
  (KS 6).
- `apiErrorMessage` checks `isTransientRefreshFailure` first and says offline or timed
  out. Today it shows the 401's detail (`client.ts:307-313`): the server's English "This
  session has ended…" or "Invalid token" (KS 5).
- `needsSession` stays the app's, inside `onEnded`; its `SIGN_IN_STEP` is part of the
  kit's default.

**The kit showcase**, if it adopts: its Bearer against keksdose is a translation-review
token with no refresh token, so its `refresh` resolves `null` and a 401 is definitive. Its
`onEnded` goes to its own sign-in, never an app's `/login` (kk 7).

**Every server:** each definitive refusal of `/auth/refresh` answers
`401 {code: "session_ended"}`, and nothing else there answers 401 or 403 (a database
error stays a 5xx). The detail strings may stay, for logs. kk's five refusals, KS's
`TokenRefusedError` (its `TokenRefusal.ENDED` already has `SESSION_ENDED`'s English,
`auth_service.py:187`) and kastlan's token and session checks switch together. Elsewhere,
a signed-in endpoint answers 401 only about the session (§11.3).

### 11.6 Build — as written

**ui-kit 0.34**, `src/lib/session-refresh.ts` beside `server-wake.ts` (no labels):
- exports: `createSessionRefresh`, `attachSessionRefresh`, `isTransientRefreshFailure`
  (decision 8), `isSignedOutStep(url)` (the default list with whole-step matching,
  exported for an app's tests), and the types `SessionRefresh`, `SessionRefreshOptions`,
  `SessionRenewal`, `SessionRefreshOutcome`;
- the options of §11.4: `refresh(signal)`, `store(renewal)`, `currentToken()`, `isDemo()`,
  `onEnded({ demo })`, and the optional `isSignedOutStep`, `attempts`, `backoffMs`,
  `timeoutMs`;
- `attachSessionRefresh` adds a request interceptor (the stamp) and a response
  interceptor, and its return detaches both; the structural instance type gains
  `request(config)` for the replay;
- the marker is a `Symbol.for` key on the rejected axios error itself, set only after a
  transient failure;
- `AuthErrorCode` gains `session_ended`, with no label: no form shows it. Migration line:
  an exhaustive `switch` over `AuthErrorCode` adds it;
- tests:
  - N concurrent 401s make one `refresh` call and one `store`; definitive → `onEnded`
    once however many waited, and once for a demo's N requests;
  - transient → no `onEnded`, nothing stored; each rejection is the request's own error,
    `response.status` 401, with the marker;
  - attempts at 0, 1 s and 4 s (fake timers) for no answer, 408, 429 and 5xx; one attempt
    for a 400, 404 or 422 and for a non-HTTP throw; none while offline; the timeout
    aborts through the signal;
  - a signed-out step and a demo never refresh; `register` does not match
    `/auth/passkey/register/begin`, nor `invitations/check` `/auth/invitations/accept`,
    nor `me/email/confirm` `/auth/me/email`; `resend-verification` refreshes;
  - at most one replay after a refresh, and at most one for an older token;
  - a request stamped with an older token replays with `currentToken()` and no refresh,
    and rejects without a call when `currentToken()` is `null`; if that replay 401s, it
    refreshes rather than ends the session;
  - the session changes while the flight runs (a sign-out, a new token from elsewhere):
    no `store` and no `onEnded`, whether the answer is a renewal or definitive; the
    waiters replay with the current token or reject;
  - `replay: false`: stored, the waiters reject unmarked, no `onEnded`;
  - `session.refresh()` joins a running flight, never calls `onEnded`, and resolves each
    of its four results.

**server-kit 0.8:**
- `AuthErrorCode.SESSION_ENDED` (`"session_ended"`, 401, "This session has ended. Please
  sign in again."), in `AUTH_ERROR_STATUS` and `AUTH_ERROR_DETAIL`;
- `RefreshRequest {refresh_token}` in `auth.schemas` (each app defines its own today);
- the rule in the `auth.tokens` docstring: what is definitive; that the endpoint never
  turns its own failure into a 401; and that a signed-in endpoint answers 401 only about
  the session, never for a wrong input (kastlan 2).

**For `docs/archive/adopt/adopt-0.34.md`**, per app as §11.5. In short:
- kastlan first moves `/auth/2fa/disable` to 400, then `onEnded` is `logout()` and
  `queryClient.clear()`, its `store` keeps the stored refresh token and signs in at boot,
  and its handover sync reads `isTransientRefreshFailure` as offline;
- keksdose registers its interceptors before the kit's, its `store` sets the store's
  token and user, and `x-hb-sync` goes;
- Kurvenschmiede's `onEnded` keeps `?next=`, and `apiErrorMessage` reads
  `isTransientRefreshFailure` first;
- the showcase's `onEnded` goes to its own sign-in.

### 11.7 Settled after the reviews (2026-10-12) — as written

The three apps reviewed §11 on 2026-10-12: keksdose at `c6bf6f70` (**kk** 1–7), kastlan
(**ka** 1–9) and Kurvenschmiede at `de88be6` (**KS** 1–9). The reviews are kept outside
the repo (`audits/round-034/reviews.md`); kk 8–9, ka 10–13 and KS 10–20 are user-admin
§11.9's. The sections above are corrected in place, and this list is the record.

**Decisions 8 and 9** are settled as recommended: all three agree. kk needs decision 8 for
its sync chip, kastlan for its handover sync, KS for its messages. On decision 9 kastlan
adds no opt-out header of its own, and its sign-out keeps the outbox (ka 5).

**One rule set for a stale session** (ka 3, KS 3, KS 4), chosen by ui-kit:
- every request is stamped with `currentToken()` when it goes out, and every flight
  notes it when it starts;
- both are compared with `currentToken()` when the 401 or the answer comes;
- the app's `refresh` writes nothing, and the kit calls `store` only while the session is
  unchanged;
- a renewal may say `replay: false`.

Why this way:
- **The current token, not a counter.** The apps change tokens outside the kit: other
  tabs, a company or role switch, a password change, a sign-in or sign-out. Only the
  app's own current token sees all of them. A counter would need every one of those
  places to bump it.
- **The access token as the session's identity**, not the refresh token. Every change
  in the three apps replaces it. The one case it cannot tell apart, kastlan's boot
  refresh running with no access token yet, has nothing to sign out of. A sign-in during
  that refresh still shows as a change.
- **The write in the kit.** The guard is then written and tested once, in the kit, rather
  than in each app's callback.

**keksdose**
- kk 1, taken: decision 9's two consequences (the 30 s poll, the E2EE keys) and the
  header lines to remove are named (§11.2, §11.5).
- kk 2, taken: the marker is a `Symbol.for` key on the axios error itself; kk's sync chip
  reads it as offline.
- kk 3, taken: the §11.1 and §11.4 cells are corrected; kk's `store` writes `localStorage`
  and `useAuth.setState({ token, user })`, never `setSession`.
- kk 4, taken, as a general rule: the kit's response interceptor goes after the app's own,
  and keksdose registers its interceptors first (§11.3).
- kk 5, taken: the citations are `client.ts:100-104` and `client.test.ts:36, 46, 58, 77,
  97` (§11.5).
- kk 6, confirmed: the narrower list stands (`invitations/check`, never `accept`), and
  whole-step matching keeps it so.
- kk 7, confirmed, and a line added: every refresh refusal is a 401; the showcase's
  review token ends at the showcase's own sign-in (§11.5).

**kastlan**
- ka 1, confirmed: kastlan's facts, its 401 refusals and its reusable refresh token.
- ka 2, taken (blocking): "a signed-in endpoint answers 401 only about its session" is the
  rule (§11.3, server-kit's docstring); kastlan moves `/auth/2fa/disable` to 400 before
  adopting.
- ka 3, taken, with the token in place of the counter: `replay: false` as asked, and
  "older" judged by the stamp against `currentToken()` (the rule set above).
- ka 4, taken: the handover sync reads the marker as offline, and no 401 rejects a change
  or a photo.
- ka 5, taken: kastlan's `onEnded` is `logout()` and `queryClient.clear()`.
- ka 6, taken differently: the boot's user arrives through `store`, which the kit calls
  before `session.refresh()` resolves; `renewed` also carries the renewal.
- ka 7, taken: §11.5 is corrected; kastlan's `store` keeps the stored refresh token, and
  `setTokens` is unchanged.
- ka 8, taken: `restoreDemo` ends a demo only on a 401.
- ka 9, confirmed: the refresh goes through `serverWake.track`, and kastlan's filter adds
  `refresh`.

**Kurvenschmiede**
- KS 1, taken: `resend-verification` leaves the default list.
- KS 2, taken: entries match whole steps after `/auth/`.
- KS 3, taken: both guards, in the kit; no `store` and no `onEnded` once the session has
  changed.
- KS 4, taken: the `currentToken()` option.
- KS 5, taken: KS's `apiErrorMessage` reads the marker first (§11.5).
- KS 6, taken: KS's `onEnded` builds `?next=` (§11.5).
- KS 7, taken: retries only on no answer, 408, 429 and 5xx; any other transient answer
  ends the flight at once (decision 5).
- KS 8, taken: `onEnded` is called once per session, a demo's too.
- KS 9, confirmed: KS's refusals and its demo match the contract, and the comment at
  `client.ts:72-74` goes with the code.

Nothing is open. Next: ui-kit 0.34 and server-kit 0.8 (§11.6).
