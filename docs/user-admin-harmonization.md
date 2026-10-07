# User administration and the account's own settings — harmonisation plan

Status: **2026-10-07, reviewed.** All three apps answered the same day; §9 records what
they settled, and §2 has Marcel's decisions. Led from ui-kit at Marcel's
request. It is the second part of the user-management round. The first part, sign-in,
sign-up and the account core, is `docs/auth-harmonization.md`, shipped as ui-kit 0.29.0
and server-kit 0.3.0, and this plan builds on it: names, invitations, coded refusals,
`sessions_invalid_before`, `/auth/me`.

It is built from a read-only audit of the three apps (2026-10-05; kept outside the repo)
and what they reported while adopting 0.29. Marcel's decisions are in §2.

The pattern is the same as before: **one contract + kit parts + server-kit parts**.
keksdose and Kurvenschmiede are the reference: Kurvenschmiede copied keksdose "value for
value" and added deactivation, role change and transfer. **kk** = keksdose,
**ka** = kastlan, **KS** = Kurvenschmiede.

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| User list | `GET /admin/users`, server-paged, sort and filter (`q`, plan, privacy, state tokens), summary, `mail_backend` | `/auth/users` paged per company + `/platform/users` for the superuser | `GET /admin/users`, **not paged**, owned counts |
| List UI | own table (1150 lines), own Badge | settings page; columns email, name, roles, status, verified, 2FA | kit `DataTable`, `AccountStateChip`, `dateColumn` |
| Deactivate | **none** | a bare **Switch, no confirmation** | typed email (server-checked), ends sessions, never yourself or the last admin |
| Role change | none (reviewer only) | multi-role dialog | `Select`, last-admin guard |
| Force password change | yes (`/password-change`, set + withdraw) | no | no |
| Resend mails | verification + reset (`/users/{id}/mail`) | none | reset (`/reset-mail`, link shown on the console backend) |
| Reviewer scope | `user-reviewer-role.tsx` (Checkbox) | platform column | `reviewer-dialog.tsx` (CheckboxGroup), so three editors in all |
| Confirmation levels | server-decided `none` / `acknowledge` / `type_email` | none | typed email for deactivate and transfer |
| Audit | a log line (plan only) | **DB `audit_logs`, every mutation** | log lines |
| Invitations (0.29) | being adopted | interim set-password invite → invitations | allow-list → invitations (0041) |
| Account deletion | operator runbook (`erase_user_account`), plus "erase all data" (budgets) | none | none: deactivate and transfer |
| Data export | YNAB budget export only | none | curve exports only |
| Email change | none | none | none |
| Sessions | none (cut-off only) | session rows, API only, no UI | "sign out everywhere" |

The kit has the roster chips (`RoleChip`, `AccountStateChip`, `dateColumn`),
`DangerConfirm`, `useConfirm({requireTyped})`, `ShareCard`, `ProfileSetting` (one name,
until 0.29.1 or 0.30), `PasswordSetting`, `TwoFactorSetting` and `PasskeysSetting`. It
has **no** user-list preset, role select, reviewer editor, invitations panel, sessions,
export, email-change or deletion part.

## 2. Decisions (Marcel, 2026-10-07)

1. **Deletion in two stages.**
   - **Stage one, in every app:** the account is **deactivated at once**. It can't sign
     in, its sessions end, and it is marked for deletion.
   - **Stage two depends on the app:**
     - keksdose and Kurvenschmiede **erase it automatically after 30 days**;
     - kastlan leaves the erasure **to an operator**, because company data is involved.
   - The mode and the number of days are per-app settings (§6.4).
2. **Data export: a self-service JSON download** of the user's own account data, in
   every app. App data exports (keksdose's YNAB, Kurvenschmiede's curves) stay.
3. **Audit: a small DB table of admin actions in every app**, shown on the admin page.
   kastlan keeps its full mutation log on top.
4. **Every app's user admin gets the four actions**: deactivate / reactivate, change
   role, force a password change, and resend the verification or reset mail.

Settled by the kit in this draft; the reviews may object:

5. **Email change** in every app, with re-verification: the new address must confirm
   before it takes effect, and the old address is told (§6.2).
6. **"Sign out everywhere"** in every app (§6.3). A list of devices only where sessions
   are stored (kastlan).

After the reviews:

7. **Kurvenschmiede hands shared work over at erasure** (Marcel, via its session). A
   deletion request is never refused for owning shared work. The admins have the 30
   days to transfer it; whatever is still owned and shared on day 30 goes to the first
   active admin, with everything it references, logged as `transfer`.

## 3. The user list (admin)

### 3.1 The request

`GET /admin/users?limit=&offset=&sort=&q=&role=&state=` answers
`{ users: AdminUserRow[], total, mail_backend, summary? }`.

- **Paged on the server**, keksdose's shape. Kurvenschmiede's unpaged list moves to it;
  kastlan's `/auth/users` takes the same query.
- `sort`: `name` (last, first, id: auth §3.2), `email`, `role`, `created`,
  `last_login`; descending as `key.desc` (what the kit's `DataTable` writes) or `-key`.
  The server kit accepts both.
- `q` searches first name, last name, both orders together, and email (auth §10.6).
- `state` tokens, comma-separated: `active`, `deactivated`, `invited`, `unverified`,
  `password_change_required`, `deletion_scheduled`, `never_logged_in`, `admin`,
  `reviewer`. These are keksdose's, plus the new ones.

### 3.2 The row

`AdminUserRow` is the auth contract's `UserResponse` core plus:

- `last_login_at`;
- `password_change_required_at`;
- `deletion_scheduled_at` (§6.4);
- `translation_review_locales` and `translation_review_areas`;
- `extra`: the app's own columns (keksdose's plan and key custody, Kurvenschmiede's
  owned counts). kastlan's companies appear **only in the platform list**: a company's
  list never names another company.
- `last_login_at` in kastlan comes from its session rows. It is account-wide, which is
  accepted.
- An app drops the state tokens it has no state for (Kurvenschmiede has no `invited`
  user rows: invitations are their own table).

**State chips** map 1:1 to the kit's `AccountStateChip`. The kit gains `deletion` (with
the date) and `passwordChange` exists already.

### 3.3 The kit's list

`userRosterColumns({ roles, stateOf, extra, actions })` is a `DataTable` column preset:

- identity: `UserIdentityCell`, with avatar, the name in the reader's order, and the
  email under it;
- role: `RoleChip`, or `RoleSelect` inline when the row is editable;
- state chips;
- created and last login (`dateColumn`);
- the app's extra columns;
- a row action menu (§4).

Phone cards come from the same preset.

## 4. Admin actions

### 4.1 The four, in every app (§2.4)

| Action | Request | Rules |
|---|---|---|
| Deactivate / reactivate | `POST /admin/users/{id}/active {active, confirm_email?}` | Deactivating ends every session (`sessions_invalid_before`; kastlan's session rows) and needs the typed email. Never yourself, never the last active admin. Reactivating also clears a pending deletion (§6.4). |
| Change role | `POST /admin/users/{id}/role {role}` (kastlan: `PUT /admin/users/{id}/roles {roles}` for the current company) | Never your own admin role away, never the last admin. Kurvenschmiede: a CUSTOMER is never a team manager. kastlan: TENANT is not grantable until a tenant portal exists. |
| Force password change | `POST` / `DELETE /admin/users/{id}/password-change` | keksdose's: the next sign-in answers `password_change_required` (auth §5.1), and the user sets a new one. Withdrawing clears it. |
| Resend a mail | `POST /admin/users/{id}/mail {kind: "verification" \| "password_reset"}` → `{sent, mail_backend, link?}` | `link` only while mail goes to the console (dev, or a deploy without mail), the shown-once rule of invitations. Throttled per recipient. |

**kastlan, where an account spans companies** (§9.6):
- A company admin may deactivate only a user whose ONLY company is theirs. Otherwise the
  answer is `409 {code: "other_companies"}`, and the page offers **Remove from company**
  (`DELETE /auth/users/{id}/membership`, logged as `membership_remove`) instead.
- The platform operator deactivates an account outright.
- Force password change follows the same rule.
- Resending a mail is harmless everywhere.

**A forced password change also catches a passkey sign-in**: it answers
`password_change_required` too, and the set-password step asks no current password,
because the passkey proved who it is (auth §5.1).

Plus, where an app has them:
- the reviewer scope: `PUT /admin/users/{id}/reviewer {locales, areas}`;
- Kurvenschmiede's transfer of owned work: `POST /admin/users/{id}/transfer {to, confirm_email}`.

### 4.2 Confirmation levels, decided on the server

Each action states its level: `none`, `acknowledge` (a checkbox naming the consequence)
or `type_email` (keksdose's `admin_user_actions_service`). The **server** enforces it,
and the page asks for what it says.

| Level | Actions |
|---|---|
| `type_email` | deactivate, erase now (operator), transfer, the user's own deletion request |
| `acknowledge` | force password change, change role |
| `none` | the rest |

Every action body carries the answer: `acknowledged` and `confirm_email`. A typed
address that matches also satisfies `acknowledge`. A missing answer is
`409 confirmation_required`, and a wrong address `409 confirmation_mismatch`. The level
in the table is a floor: an app may raise it (keksdose: `type_email` for an account
whose key a password opens).

The kit's `AdminActionConfirm` renders the right dialog from the level, over
`DangerConfirm` / `useConfirm`.

### 4.3 The audit table (§2.3)

**`admin_actions`**:

| Column | Notes |
|---|---|
| `id` | |
| `at` | |
| `actor_id` | |
| `action` | `deactivate`, `reactivate`, `role`, `membership_remove` (kastlan), `password_change_require` / `_withdraw`, `mail_verification` / `mail_reset`, `reviewer`, `invite`, `invite_resend`, `invite_revoke`, `transfer`, `deletion_request` (the actor is the user themselves), `deletion_cancel`, `erase` |
| `target_user_id` | nullable after an erasure |
| `target_email` | kept as written, for invitations |
| `detail` | JSON: ids, roles, flags and counts. **Never content** (no note, title or body: Kurvenschmiede encrypts those at rest, and a plaintext `detail` would leak them) and never a secret |
| `company_id` | kastlan only, nullable: a company admin's actions carry the company, the platform's carry none, and RLS shows each to its own reader (§9.3) |

- **Written in the same transaction** as the action it records.
- `GET /admin/actions?limit=&offset=&target=` answers newest first. The kit's
  `AdminActionLog` shows it, on the admin page and filtered on a user's row.
- An erasure keeps the log row: the actor, the action and the date stay; the target's
  name and email are scrubbed (`erasure_identifiers`).
- kastlan keeps `audit_logs` (every mutation, an HTTP line) and adds `admin_actions`:
  the HTTP log has no named action, no before and after, and is written after the
  response. It gets two views: a company admin's `GET /admin/actions` and the operator's
  `/platform/actions`.

## 5. Invitations (admin side)

From auth §4.4: hashed tokens, 14 days, email + scope + role.

- `GET /admin/invitations` → `[{id, email, role, scope, note, locale, invited_by,
  created_at, expires_at, status: "open" | "accepted" | "expired" | "revoked", link?}]`.
  The `link` appears **once**, on creation and on resend, while mail goes to the
  console.
- `POST /admin/invitations {email, role, scope?, note?, locale}` creates one and mails it
  in the invitee's language.
- `POST /admin/invitations/{id}/resend` mints a new token. `DELETE` revokes. An app
  that deletes the row instead (kastlan today) shows no `revoked` status, or adds a
  `revoked_at`; either is fine.
- **Who invites:** admins, and team managers into their own team (auth §2.11). In
  kastlan, the company admin invites into the company, and the operator sends sign-up
  invitations. **In keksdose, any budget owner** may invite a new person into a budget
  (Marcel, 2026-10-07: the exception to auth §2.11). Those budget invitations live with
  the budget's sharing, not in the admin panel, which shows registration invitations
  only. The kit's `InvitationsPanel` and server-kit's `invitation_accepts` /
  `registration_decision` assume nothing about who minted an invitation.
- The kit's **`InvitationsPanel`**: a form (email with no `+tag` suggestion, since it is
  someone else's address; role; scope; language; note), then rows with status chips, and
  resend / copy link / revoke.

## 6. The account's own settings

### 6.1 Profile

`ProfileSetting` edits **first and last name**: `{firstName, lastName}` and
`onSave(values)`, with labels `firstName` / `lastName`. Kurvenschmiede built its own
card meanwhile. It saves through `PATCH /auth/me` and clears `name_incomplete`.

### 6.2 Email change (§2.5)

- `POST /auth/me/email {new_email, password}`. The password is asked again because the
  address is the identity. A wrong one answers **`400 password_incorrect`, never a
  401**: an app's client reads a 401 as an ended session and would sign the user out
  over a typo. The same holds for the deletion request (§6.4).
- It mails a one-time token to the **new** address (server-kit, 48 h) and a notice to the
  **old** one ("your address is being changed; not you? write to …").
- `POST /auth/me/email/confirm {token}` switches the address, sets
  `email_verified_at = now`, and keeps the sessions.
- The new address is normalised: a `+tag` stays (auth §4.5). It must be free:
  `email_taken` otherwise.
- On confirm, whatever waited for the **new** address attaches, as at registration:
  Kurvenschmiede's pending shares (`materialise`) and open invitations.
- Copies of the address in company records (kastlan's `contacts.email`) are **not**
  synced: they are the company's records, and the company sees the new address in its
  user list.
- A passkey's label in the authenticator keeps the old address. The done state may say
  so.
- The kit's `EmailChangeSetting`: the current address, the new one, the password, and a
  pending state ("confirm the link we sent to …", with resend and cancel).

### 6.3 Sessions (§2.6)

- **Every app:** "Sign out everywhere" (`POST /auth/logout`, auth §6.3) in settings. It
  ends every session, this one included, so the page signs out.
- **kastlan only:** the device list (`GET /auth/sessions`, `DELETE /auth/sessions/{id}`)
  in the same card.
- The kit's `SessionsSetting` takes an optional `sessions` list.

### 6.4 Deleting the account (§2.1)

- **Request:** `POST /auth/me/deletion {password, confirm_email}` (403 for a demo
  account).
  - The account is **deactivated at once**: `is_active = false`, every session ends,
    and `deletion_requested_at` and `deletion_scheduled_at` are set. The action is logged
    as `deletion_request`, with the user as the actor.
  - keksdose also **revokes the user's API tokens** at once, as a reset does, so a
    reactivation can't silently revive a script.
  - A mail confirms it, says what goes and when, and how to cancel (write to the operator
    before the date). It says what it can keep: "copies in database backups and deleted
    files age out within 7 days of the erasure, server logs within 30". These are the
    shared Cloud SQL instance's figures (7 daily backups, 7-day point-in-time recovery;
    7-day soft delete on uploads; 30-day logs).
  - The page signs out.
- **Push and mail stop** for a deactivated account: every send path filters on
  `is_active` (keksdose's pushes didn't).
- **The app's mode**, a setting:
  - `after_days` (keksdose, Kurvenschmiede; `days = 30`). The erasure is a **Cloud
    Scheduler → Cloud Run Job**, not code in the service: the services scale to zero, so
    nothing in-process runs then. It is daily, idempotent, erases **one account per
    transaction** (a failure holds back no other), and writes `erase` to `admin_actions`
    in the same transaction. keksdose adds it to its `jobs.py` registry; Kurvenschmiede
    adds `kurvenschmiede-erase` beside its migrate job.
  - `operator` (kastlan): no date. The operator's erasure is a **platform action**
    (superuser, `type_email`, logged with no company), not a script.
- **Before it is allowed** (`409 {code}` otherwise):
  - the last admin can't request it (`last_admin`). In kastlan this is checked per
    company, and the answer names the companies. A **one-person company** is always its
    own last admin, so there the request is accepted and flags both the account and the
    company for the operator.
  - Kurvenschmiede never refuses for shared work (§2.7). The dialog says up front: "N items
    others can see will pass to an administrator".
- **Shared things at erasure**:
  - **Kurvenschmiede:** owned work still shared on day 30 goes to the first ACTIVE admin
    with everything it references, logged as `transfer`. Work nobody else can see is
    erased.
  - **keksdose:** a budget the user owns is erased with its shares, as "erase all data"
    does today. The **guests are told at the request** (push and in-app: "budget X will be
    deleted on DATE; export it before then"). The share keeps working through the 30
    days, and a reactivation restores everything untouched.
  - **keksdose, also:** the owner's household and every key wrap of it (the guests'
    included) go once no live budget remains in it.
  - **keksdose, a guard:** if a household ever had more than one member row, erasing its
    owner would wipe budgets a co-member uses. Marcel checked production on 2026-10-07:
    every household has exactly one member (its owner), and today's code can't create a
    second. The request still refuses with `household_has_members` if one ever appears, a
    cheap guard against a future change.
  - **kastlan:** company records stay with the company. The contact card that links the
    user to a company stays, with its user link nulled. Sessions are deleted.
- **Cancel:** an admin reactivates the account before the date. That clears both
  timestamps and logs `deletion_cancel`.
- **What erasure does:** the app's own list (keksdose's `erase_user_account` is the
  model):
  - the user's own data is deleted;
  - authorship foreign keys are nulled. Every user foreign key gets an explicit
    `ON DELETE` first: Kurvenschmiede's feedback cascades today, and kastlan's sessions,
    audit, contacts and feedback links have none. A cascade becomes SET NULL **only
    together with** the scrub, never alone;
  - feedback is anonymised (`erasure_identifiers`), the encrypted context included;
  - the user row goes, and the `admin_actions` rows stay, scrubbed.
- The kit's `DeleteAccountSetting`: the consequences (the app's list, and the hand-over
  count where it applies), password, typed email, and the mode's sentence ("in 30 days"
  or "an operator will erase it").

### 6.5 Data export (§2.2)

- `GET /auth/me/export` → a JSON download (`Content-Disposition: attachment`); 403 for a
  demo account.
- **The envelope** (server-kit): `{ "format": "eifi1-account-export", "version": 1,
  "app", "exported_at", "account": {…}, "data": {…} }`.
- **`account`**, every app:
  - the profile, email, language, roles and memberships;
  - sign-in methods: passkeys as name, created and last used; 2FA on or off;
  - created and last login;
  - invitations sent, never with a token or link.
  The app adds its own account fields (keksdose: currencies, plan, privacy mode, API
  tokens as name, scopes, budget and dates).
- **`data`**, each app's choice, from its reviews:
  - **keksdose:**
    - budgets owned (name, currency, created, consents, the shares granted);
    - budgets shared to them (name, role, owner);
    - notification settings and the 90-day log;
    - push registrations as browser and dates;
    - feedback with its comments, the support conversation, assistant threads, and
      translation verdicts.
    No ledger content: that is the YNAB export per budget, and in private mode the server
    only holds ciphertext. `_user_fk_plan()` is the checklist.
  - **kastlan:** the account and what the platform keeps about it: sessions, their own
    feedback, translation reviews. **No company record** (no CompanyMixin row, nor the
    contact card that links a user to a company): for those the company is the
    controller. The setting says: "Your account; your company's records are your
    company's, ask them." Invitations sent show no invitee address.
  - **Kurvenschmiede:**
    - owned work as its inputs (projects, setpoint sessions with profiles and segments,
      gears, transmissions, hysteresis sets, kinematics mappings), never sampled curves;
    - grants made and pending;
    - feedback (attachments as metadata);
    - translation verdicts;
    - team memberships.
- **Never leaves, in any app:**
  - the password hash;
  - TOTP secrets and backup-code digests;
  - every token or token hash (refresh, API, reset, verification, invitation,
    translation review);
  - passkey credential ids and public keys;
  - push endpoints and their keys (an endpoint is a capability URL);
  - **all E2EE material** (key wraps with their Argon2 parameters and salts, recovery
    verifiers; at most a public-key fingerprint and the key epoch);
  - other people's addresses and data (other team members, invitees in kastlan, others'
    work shared with the user: a reference at most).
- Throttled (once a minute) and logged.
- The kit's `DataExportSetting`: a description (the app's sentence), a button and the
  download.

## 7. What the kits add, what stays app-side

**ui-kit 0.30.0** (labels in all seven languages):

- **The user list:**
  - `userRosterColumns`, `UserIdentityCell`;
  - `RoleSelect` and `RolesEditor` (kastlan's several roles), with reasons why a choice is
    disabled ("last admin", "yourself");
  - `ReviewerScopeEditor`: one editor instead of three;
  - `AccountStateChip` gains `deletion`.
- **Admin actions:** `AdminActionConfirm`, `AdminActionLog`, and
  `TransferOwnershipDialog` (Kurvenschmiede's typed confirm).
- **Invitations:** `InvitationsPanel`.
- **The account's own settings:** `ProfileSetting` (first and last), `EmailChangeSetting`,
  `SessionsSetting`, `DeleteAccountSetting` and `DataExportSetting`.

**server-kit 0.4.0** (Layer 1):

- **Admin rules:** `refuse_self`, `refuse_last_admin(active_admins, …)`,
  `confirmation_level(action)`, `confirm_email_matches` (caseless, normalised).
- **Schemas:** `AdminUserRow`, `ActiveChange`, `RoleChange`, `MailRequest` /
  `MailResult`, `InvitationRow` / `InvitationCreate`, `ReviewerUpdate`,
  `AdminActionRow`, `EmailChangeRequest`, `DeletionRequest`.
- **Audit:** an `AdminAction` enum and a `record(...)` builder for the row's fields; the
  table and its insert stay the app's.
- **Roster:** the sort and state-token parsing (keksdose's `STATE_TOKENS` extended).
- **Deletion:** a `DeletionMode` enum (`after_days`, `operator`) and
  `deletion_due(requested_at, days, now)`.
- **Email change:** an `EMAIL_CHANGE_TTL` and token kind (the one-time token recipe).
- **Export:** `export_envelope(app, account, data, now)`.

**App-side:** the tables and migrations; the queries, RLS and company scoping; what
erasure deletes; what the export holds; the mails' texts; the scheduled erasure job (the
app's scheduler or Cloud Scheduler); kastlan's platform superuser.

## 8. Per repo (summary; the reviews refine it)

- **keksdose:**
  - gains deactivate and role change;
  - its roster moves to the kit preset (the plan and key-custody columns as `extra`);
  - `admin_actions` replaces the plan log line;
  - self-service deletion in `after_days` mode, using its runbook's `erase_user_account`;
  - the account export;
  - email change and "sign out everywhere".
- **kastlan:**
  - deactivation gets its confirmation;
  - resend mails and force password change;
  - the user list takes the query of §3.1;
  - `admin_actions` beside `audit_logs`;
  - deletion in `operator` mode;
  - the export, email change, and the device list it already has in its API.
- **Kurvenschmiede:**
  - force password change and resend verification (now that verification exists);
  - its list becomes paged;
  - `admin_actions` replaces log lines;
  - deletion in `after_days` mode, with the transfer question (§6.4);
  - the export and email change.

## 9. Settled after the reviews (2026-10-07)

1. **Deleting while owning shared work** (Kurvenschmiede): never refused; handed to the
   first active admin at erasure (Marcel, §2.7). Its references go with it, and the
   dialog warns with the count.
2. **A deleted owner's shared budget** (keksdose): the share ends at erasure, as "erase
   all data" already does. A hand-over is impossible: re-tenanting rows across
   households, and in private mode data sealed under the owner's key. Guests are told at
   the request and have the 30 days to export. Marcel's production check (2026-10-07) found no
   household with more than one member; `household_has_members` stays as a guard (§6.4).
3. **Audit in kastlan:** a new `admin_actions` table with a nullable company, and two
   views; `audit_logs` stays. kastlan also stops logging platform actions into the
   operator's acting company.
4. **Export contents:** per app (§6.5), and one rule for what never leaves. In kastlan,
   company records belong to the company.
5. **The erasure job:** Cloud Scheduler → a Cloud Run Job (keksdose, Kurvenschmiede);
   kastlan needs none (operator mode). The deletion mail states the backup and log
   retention.
6. **Clashes and their fixes:**
   - kastlan deactivation per company (`other_companies`, "Remove from company"), and
     one-person companies flagged rather than refused;
   - a forced password change catches passkey sign-ins;
   - an email change attaches what waited for the new address;
   - push and mail stop for a deactivated account (keksdose's gap);
   - the API tokens are revoked at the request (keksdose);
   - the household and its key wraps go at erasure (keksdose);
   - `detail` never holds content (Kurvenschmiede's encrypted columns);
   - every user foreign key gets an explicit `ON DELETE`, changed together with the
     scrub;
   - Kurvenschmiede refuses CUSTOMER for an account that owns work, and REVIEWER is set
     only through `/reviewer`;
   - transfer recipients are never a CUSTOMER, a deactivated account, or yourself.
7. **No clash:**
   - E2EE on deactivation: the key wraps stay for the 30 days, so a reactivation unlocks;
   - E2EE on email change: the key file is checked against the public key, not the
     address;
   - Kurvenschmiede's teams: memberships cascade, and a team keeps its members.

Nothing is open. Next: server-kit 0.4.0 and ui-kit 0.30.0 (§7). The
0.30 kit round also takes the apps' auth findings: a backup-code entry on the 2FA step,
the challenge token passed to its slot, a "too many attempts" label, and `ProfileSetting`
with first and last name.

## 10. From the adoptions (2026-10-07, for 0.31 / 0.5)

kastlan adopted 0.30 / 0.4 first (feat/user-admin-0.30). Its notes, settled:

1. **The list answer carries the confirmation levels and the active-admin count.**
   `UserListResponse.levels` maps an action to its `ConfirmationLevel`, so the page
   renders the right confirmation before its first request. `summary.active_admins`
   (`SUMMARY_ACTIVE_ADMINS`) is what the last-admin lock reads. Both are in server-kit
   0.5; kastlan and Kurvenschmiede already send this shape.
2. **The user's own deletion request is a platform row** (`company_id` NULL). In an app
   whose `admin_actions` is company-scoped under RLS, the insert needs the bypass for
   that one transaction (kastlan: `set_config('app.bypass_rls', 'on', true)`).
3. **The operator's erase is offered only for an account that is deactivated with
   `deletion_requested_at` set.** Anything else answers 409, and the UI doesn't offer it.
4. **A backup code at the 2FA step goes through `SignInForm`'s own `recoveryCode`
   entry** (0.30). `onCode({…, kind: "recovery"})` returns the answer union, so a
   `password-change` answer moves the form to its third step. An app doesn't draw its
   own step in `twoFactorContent` for that.
5. **`InvitationRow.invited_by`** is the inviter as a person (`PersonRef`). An app sends
   it, not only the id, so the panel can name them.

Kurvenschmiede adopted next (feat/user-admin, 2026-10-07). Its notes, settled in 0.31:

6. **An expired invitation can be revoked**, not only resent. In an app that keeps the
   rows it would otherwise stay listed for good. `InvitationsPanel` offers revoke on
   open and expired rows.
7. **`InvitationsPanel listTitle={null}`** leaves the list's heading out under a card
   already headed "Invitations".
8. **The export leaves storage keys out.** A feedback file's `key` trips
   `assert_no_secrets`, rightly: it is an address inside the app, not the user's data.
9. **Tests submit the confirm dialogs' form** (`fireEvent.submit`), because their button
   submits through its `form` attribute, which jsdom doesn't follow (ADOPTING.md
   step 7).
