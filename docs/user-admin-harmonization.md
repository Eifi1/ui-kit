# User administration and the account's own settings — harmonisation plan

Status: **2026-10-07, a draft for the apps' reviews**, led from ui-kit at Marcel's
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

## 3. The user list (admin)

### 3.1 The request

`GET /admin/users?limit=&offset=&sort=&q=&role=&state=` answers
`{ users: AdminUserRow[], total, mail_backend, summary? }`.

- **Paged on the server**, keksdose's shape. Kurvenschmiede's unpaged list moves to it;
  kastlan's `/auth/users` takes the same query.
- `sort`: `name` (last, first, id: auth §3.2), `email`, `role`, `created`,
  `last_login`; a leading `-` for descending.
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
  owned counts, kastlan's companies).

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

Plus, where an app has them:
- the reviewer scope: `PUT /admin/users/{id}/reviewer {locales, areas}`;
- Kurvenschmiede's transfer of owned work: `POST /admin/users/{id}/transfer {to, confirm_email}`.

### 4.2 Confirmation levels, decided on the server

Each action states its level: `none`, `acknowledge` (a checkbox naming the consequence)
or `type_email` (keksdose's `admin_user_actions_service`). The **server** enforces it,
and the page asks for what it says.

| Level | Actions |
|---|---|
| `type_email` | deactivate, erase now (operator), transfer |
| `acknowledge` | force password change, change role |
| `none` | the rest |

The kit's `AdminActionConfirm` renders the right dialog from the level, over
`DangerConfirm` / `useConfirm`.

### 4.3 The audit table (§2.3)

**`admin_actions`**:

| Column | Notes |
|---|---|
| `id` | |
| `at` | |
| `actor_id` | |
| `action` | `deactivate`, `reactivate`, `role`, `password_change_require` / `_withdraw`, `mail_verification` / `mail_reset`, `reviewer`, `invite`, `invite_resend`, `invite_revoke`, `transfer`, `deletion_cancel`, `erase` |
| `target_user_id` | nullable after an erasure |
| `target_email` | kept as written, for invitations |
| `detail` | JSON: before and after, never a secret |

- **Written in the same transaction** as the action it records.
- `GET /admin/actions?limit=&offset=&target=` answers newest first. The kit's
  `AdminActionLog` shows it, on the admin page and filtered on a user's row.
- An erasure keeps the log row: the actor, the action and the date stay; the target's
  name and email are scrubbed (`erasure_identifiers`).
- kastlan keeps `audit_logs` (every mutation) and adds `admin_actions` for this list. Or
  it maps its existing rows: its review decides.

## 5. Invitations (admin side)

From auth §4.4: hashed tokens, 14 days, email + scope + role.

- `GET /admin/invitations` → `[{id, email, role, scope, note, locale, invited_by,
  created_at, expires_at, status: "open" | "accepted" | "expired" | "revoked", link?}]`.
  The `link` appears **once**, on creation and on resend, while mail goes to the
  console.
- `POST /admin/invitations {email, role, scope?, note?, locale}` creates one and mails it
  in the invitee's language.
- `POST /admin/invitations/{id}/resend` mints a new token. `DELETE` revokes.
- **Who invites:** admins, and team managers into their own team (auth §2.11).
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
  address is the identity.
- It mails a one-time token to the **new** address (server-kit, 48 h) and a notice to the
  **old** one ("your address is being changed; not you? write to …").
- `POST /auth/me/email/confirm {token}` switches the address, sets
  `email_verified_at = now`, and keeps the sessions.
- The new address is normalised: a `+tag` stays (auth §4.5). It must be free:
  `email_taken` otherwise.
- The kit's `EmailChangeSetting`: the current address, the new one, the password, and a
  pending state ("confirm the link we sent to …", with resend and cancel).

### 6.3 Sessions (§2.6)

- **Every app:** "Sign out everywhere" (`POST /auth/logout`, auth §6.3) in settings. It
  ends every session, this one included, so the page signs out.
- **kastlan only:** the device list (`GET /auth/sessions`, `DELETE /auth/sessions/{id}`)
  in the same card.
- The kit's `SessionsSetting` takes an optional `sessions` list.

### 6.4 Deleting the account (§2.1)

- **Request:** `POST /auth/me/deletion {password, confirm_email}`.
  - The account is **deactivated at once**: `is_active = false`, every session ends, and
    `deletion_requested_at` and `deletion_scheduled_at` are set.
  - A mail confirms it, says what goes and when, and tells how to cancel: write to the
    operator before the date.
  - The page signs out.
- **The app's mode**, a setting:
  - `after_days` (keksdose, Kurvenschmiede; `days = 30`): a daily job erases accounts
    past their date, with keksdose's `erase_user_account` logic.
  - `operator` (kastlan): no date. The admin list shows "deletion requested", and an
    operator erases (`type_email` level).
- **Before it is allowed** (the request answers `409 {code}` with a reason):
  - the last admin can't delete themselves (`last_admin`);
  - in Kurvenschmiede, owned work that others can see must be transferred first
    (`owns_shared_work`), or the review picks the first admin as the default receiver;
  - in keksdose, a budget shared with others: the review settles whether its owner's
    deletion ends the share, or hands it to a member.
- **Cancel:** an admin reactivates the account before the date. That clears both
  timestamps and logs `deletion_cancel`.
- **What erasure does:** the app's own list (keksdose's `erase_user_account` is the
  model):
  - the user's own data is deleted;
  - authorship foreign keys are nulled;
  - feedback is anonymised (`erasure_identifiers`);
  - the user row goes, and the `admin_actions` rows stay, scrubbed.
- The kit's `DeleteAccountSetting`: the consequences (the app's list), password, typed
  email, and the mode's sentence ("in 30 days" or "an operator will erase it").

### 6.5 Data export (§2.2)

- `GET /auth/me/export` → a JSON download (`Content-Disposition: attachment`).
- **The envelope** (server-kit): `{ "format": "eifi1-account-export", "version": 1,
  "app", "exported_at", "account": {…}, "data": {…} }`.
  - `account`: the profile, email, language, roles and memberships, sign-in methods
    (passkey names and dates, 2FA on/off, **never a secret**), created and last login,
    and invitations sent;
  - `data`: what the app keeps about the user and what they authored. It is the app's
    choice, documented per app. keksdose's budgets have their own export.
- Throttled (once a minute) and logged.
- The kit's `DataExportSetting`: a description, a button and the download.

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

## 9. Open points for the reviews

1. **Kurvenschmiede:** a deletion while owning shared work: refuse until transferred, or
   hand it to the first admin automatically?
2. **keksdose:** a deleted owner's budget that others share: end the share, or hand the
   budget to a member? What does the existing "erase all data" do then?
3. **kastlan:** a new `admin_actions` table, or map `audit_logs` rows into the list?
4. **All:** what the export's `data` holds (§6.5), and any personal data that must not
   leave in it.
5. **All:** the daily erasure job: the app's scheduler or Cloud Scheduler? kastlan's
   review noted its scheduler only starts with billing or rent enabled.
6. **All:** anything this plan misses, or that clashes with an app's rules (keksdose's
   E2EE key custody on deactivation; kastlan's company roles; Kurvenschmiede's teams).
