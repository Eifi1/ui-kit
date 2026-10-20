# User administration and the account's own settings — harmonisation plan

Led from ui-kit at Marcel's request. It is the second part of the user-management round.
The first part, sign-in, sign-up and the account core, is `docs/auth-harmonization.md`,
shipped as ui-kit 0.29.0 and server-kit 0.3.0, and this plan builds on it: names,
invitations, coded refusals, `sessions_invalid_before`, `/auth/me`.

It is built from a read-only audit of the three apps (2026-10-05; kept outside the repo)
and what they reported while adopting 0.29. Marcel's decisions are in §2.

The pattern is the same as before: **one contract + kit parts + server-kit parts**.
keksdose and Kurvenschmiede are the reference: Kurvenschmiede copied keksdose "value for
value" and added deactivation, role change and transfer. **kk** = keksdose,
**ka** = kastlan, **KS** = Kurvenschmiede.

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the reviews
and adoptions that amended a section are folded into it, and the table names them.
Snapshots, per-repo to-dos and the review logs are in
[archive/user-admin-history.md](archive/user-admin-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | §9.1 (decision 7) |
| 3 | The user list (admin) | ui-kit 0.30.0, server-kit 0.4.0 | §10.1 (`levels`, `active_admins`; server-kit 0.5) |
| 4 | Admin actions | ui-kit 0.30.0, server-kit 0.4.0 | §9.3, §9.6; §10.1, §10.2, §10.9, §10.12; `plan` (ui-kit 0.32.1, server-kit 0.6); round 0.34 (§11, §11.9: ka 10, KS 11) |
| 5 | Invitations (admin side) | ui-kit 0.30.0, server-kit 0.4.0 | §10.5–§10.7 (ui-kit 0.31) |
| 6 | The account's own settings | ui-kit 0.30.0, server-kit 0.4.0 | §9.1, §9.2, §9.4–§9.7; §10.3, §10.8, §10.10, §10.11; `AccountNoticeKind` (server-kit 0.8) |
| 7 | What the kits add, what stays app-side | ui-kit 0.30.0, server-kit 0.4.0 | later additions listed in place |
| 8 | Per repo | — (archived) | |
| 9 | Settled after the reviews | — | index; folded items point to their § |
| 10 | From the adoptions | — | index; folded items point to their § |
| 11 | Groups in the audit | ui-kit 0.34.0, server-kit 0.8.0 | §11.9 (folded); adopt-0.34 (`AdminOtherTarget.id`) |

## 1. Where each one stands

Moved to [archive/user-admin-history.md](archive/user-admin-history.md): the three apps'
user admin as audited on 2026-10-05, and what the kit had then.

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

Settled by the kit, and agreed by the reviews:

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
`{ users: AdminUserRow[], total, mail_backend, summary?, levels? }` (server-kit
`UserListResponse`).

- **Paged on the server**, keksdose's shape; kastlan's `/auth/users` takes the same
  query.
- `total` counts the rows that match the filter, across pages. `summary` describes the
  whole install and does not follow the filter; its `active_admins` key
  (`SUMMARY_ACTIVE_ADMINS`) is the count the last-admin lock reads.
- `levels` maps an action to its `ConfirmationLevel` (§4.2), so the page renders the right
  confirmation before its first request instead of learning it from a refusal.
- `sort`: `name` (last, first, id: auth §3.2), `email`, `role`, `created`,
  `last_login`; descending as `key.desc` (what the kit's `DataTable` writes) or `-key`.
  The server kit accepts both.
- `q` searches first name, last name, both orders together, and email (auth §10.6).
- `state` tokens, comma-separated: `active`, `deactivated`, `invited`, `unverified`,
  `password_change_required`, `deletion_scheduled`, `never_logged_in`, `admin`,
  `reviewer`. These are keksdose's, plus the new ones.

### 3.2 The row

`AdminUserRow` is the auth contract's `UserResponse` core, without `device_timezone`
(server-kit 0.17.0: where a person's device last was is their own data, not the roster's;
the row keeps it as a field with `exclude=True`, read and never answered), plus:

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

**State chips** map 1:1 to the kit's `AccountStateChip`: `deletion` carries the date,
or none in `operator` mode (§6.4), and `passwordChange` marks a forced change.

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
| Change role | `POST /admin/users/{id}/role {role}` (kastlan: `PUT /admin/users/{id}/roles {roles}` for the current company) | Never your own admin role away, never the last admin. Kurvenschmiede: a CUSTOMER is never a team manager, nor an account that owns work, and REVIEWER is set only through `/reviewer`. kastlan: TENANT is not grantable until a tenant portal exists. |
| Force password change | `POST` / `DELETE /admin/users/{id}/password-change` | keksdose's: the next sign-in answers `password_change_required` (auth §5.1), and the user sets a new one. Withdrawing clears it. |
| Resend a mail | `POST /admin/users/{id}/mail {kind: "verification" \| "password_reset"}` → `{sent, mail_backend, link?}` | `link` only while mail goes to the console (dev, or a deploy without mail), the shown-once rule of invitations. Throttled per recipient. |

**kastlan, where an account spans companies:**
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
  The recipient is never a CUSTOMER, a deactivated account, or yourself.

### 4.2 Confirmation levels, decided on the server

Each action states its level: `none`, `acknowledge` (a checkbox naming the consequence)
or `type_email` (keksdose's `admin_user_actions_service`). The **server** enforces it,
and the page asks for what it says.

| Level | Actions |
|---|---|
| `type_email` | deactivate, erase now (operator), transfer, the user's own deletion request |
| `acknowledge` | force password change, change role, change plan (`plan`, billing §6, §14.12), delete a group (`group_delete`, §11) |
| `none` | the rest |

Every action body carries the answer: `acknowledged` and `confirm_email`, a `DELETE`'s
too (Kurvenschmiede's team deletion sends a JSON body). A proxy that drops the body gets
`409 confirmation_required`, so the action fails closed. A typed address that matches
also satisfies `acknowledge`. A missing answer is `409 confirmation_required`, and a
wrong address `409 confirmation_mismatch` (server-kit `require_confirmation`). The level
in the table is a floor: an app may raise it (keksdose: `type_email` for an account
whose key a password opens). A list answer carries the levels (§3.1), so the page asks
before its first request.

The kit's `AdminActionConfirm` renders the right dialog from the level, over
`DangerConfirm` / `useConfirm`. Its confirm button submits through its `form`
attribute, which jsdom doesn't follow, so an app's test submits the dialog's form
(`fireEvent.submit`; ADOPTING.md, step "Tests").

### 4.3 The audit table (§2.3)

**`admin_actions`**:

| Column | Notes |
|---|---|
| `id` | |
| `at` | |
| `actor_id` | |
| `action` | `deactivate`, `reactivate`, `role`, `membership_remove` (kastlan), `password_change_require` / `_withdraw`, `mail_verification` / `mail_reset`, `reviewer`, `invite`, `invite_resend`, `invite_revoke`, `transfer`, `deletion_request` (the actor is the user themselves), `deletion_cancel`, `erase`; since ui-kit 0.32.1 and server-kit 0.6 `plan`, an operator's plan change or grant (billing §6, §14.12); since 0.34 `group_create`, `group_rename`, `group_delete`, `membership_add`, `membership_role` (§11.3; an accepted invitation is a `membership_add` with the invitee as actor). An app's own word is a string beside these: server-kit's `AdminActionRow.action` is `AdminAction \| str`, and the kit's log names it through `labels.actions` |
| `target_user_id` | nullable after an erasure |
| `target_email` | kept as written, for invitations |
| `detail` | JSON: ids, roles, flags and counts. **Never content** (no note, title or body: Kurvenschmiede encrypts those at rest, and a plaintext `detail` would leak them) and never a secret |
| `company_id` | kastlan only, nullable: a company admin's actions carry the company, the platform's carry none (never the operator's acting company), and RLS shows each to its own reader. An account's own deletion request is a platform row (`company_id` NULL), so under RLS its insert needs the bypass for that transaction (kastlan: `set_config('app.bypass_rls', 'on', true)`) |
| `target_group_id` | since 0.34, nullable, no foreign key: the group a group or membership row is about (§11.4). kastlan fills the group from `company_id` instead and has no column |
| `target_group_name` | since 0.34, nullable: written only on a `group_delete` row, so the log can name a deleted group (§11.4) |

- **Written in the same transaction** as the action it records.
- `GET /admin/actions?limit=&offset=&target=` answers newest first. The kit's
  `AdminActionLog` shows it, on the admin page and filtered on a user's row.
- An erasure keeps the log row: the actor, the action and the date stay; the target's
  name and email are scrubbed (`erasure_identifiers`).
- kastlan keeps `audit_logs` (every mutation, an HTTP line) and adds `admin_actions`:
  the HTTP log has no named action, no before and after, and is written after the
  response. It gets two views: a company admin's `GET /admin/actions` and the operator's
  `/platform/actions`. The table's RLS is forced, which binds the owner a migration runs
  as: a migration that backfills it first runs `SET LOCAL app.bypass_rls = 'on'`, or its
  `UPDATE` changes nothing and says nothing.
- `?target=` is a person's; a group is not a filter (§11.4).

## 5. Invitations (admin side)

From auth §4.4: hashed tokens, 14 days, email + scope + role.

- `GET /admin/invitations` → `[{id, email, role, scope, note, locale, invited_by,
  created_at, expires_at, status: "open" | "accepted" | "expired" | "revoked", link?}]`.
  The `link` appears **once**, on creation and on resend, while mail goes to the
  console. `invited_by` is the inviter as a person (server-kit `PersonRef`), not only an
  id, so the panel can name them.
- `POST /admin/invitations {email, role, scope?, note?, locale}` creates one and mails it
  in the invitee's language.
- `POST /admin/invitations/{id}/resend` mints a new token. `DELETE` revokes an open or
  an expired invitation: an app that keeps its rows would otherwise list an expired one
  for good. An app that deletes the row instead (kastlan) shows no `revoked` status, or
  adds a `revoked_at`; either is fine.
- **Who invites:** admins, and team managers into their own team (auth §2.11). In
  kastlan, the company admin invites into the company, and the operator sends sign-up
  invitations. **In keksdose, any budget owner** may invite a new person into a budget
  (Marcel, 2026-10-07: the exception to auth §2.11). Those budget invitations live with
  the budget's sharing, not in the admin panel, which shows registration invitations
  only. The kit's `InvitationsPanel` and server-kit's `invitation_accepts` /
  `registration_decision` assume nothing about who minted an invitation.
- The kit's **`InvitationsPanel`**: a form (email with no `+tag` suggestion, since it is
  someone else's address; role; scope; language; note), then rows with status chips, and
  resend / copy link / revoke (revoke on open and expired rows). `listTitle={null}`
  leaves the list's heading out under a card already headed "Invitations".

## 6. The account's own settings

### 6.1 Profile

`ProfileSetting` edits **first and last name**: `{firstName, lastName}` and
`onSave(values)`, with labels `firstName` / `lastName`. It saves through
`PATCH /auth/me` and clears `name_incomplete`.

### 6.2 Email change (§2.5)

- `POST /auth/me/email {new_email, password}`. The password is asked again because the
  address is the identity. A wrong one answers **`400 password_incorrect`, never a
  401**: an app's client reads a 401 as an ended session and would sign the user out
  over a typo. The same holds for the deletion request (§6.4).
- It mails a one-time token to the **new** address (server-kit `EMAIL_CHANGE_TTL`, 48 h)
  and a notice to the **old** one ("your address is being changed; not you? write to
  …"), sent under the kind `email_change_notice` (server-kit
  `mail.AccountNoticeKind.EMAIL_CHANGE_NOTICE`).
- `POST /auth/me/email/confirm {token}` is **anonymous**: the new mailbox may be opened
  on a device that isn't signed in, and the token is the proof. It switches the address,
  sets `email_verified_at = now`, and keeps the sessions. The page may reuse the kit's
  `VerifyEmailStatus` with its own words.
- The new address is normalised: a `+tag` stays (auth §4.5). It must be free:
  `email_taken` otherwise.
- On confirm, whatever waited for the **new** address attaches, as at registration:
  Kurvenschmiede's pending shares (`materialise`) and open invitations.
- Copies of the address in company records (kastlan's `contacts.email`) are **not**
  synced: they are the company's records, and the company sees the new address in its
  user list.
- A passkey's label in the authenticator keeps the old address. The done state may say
  so.
- An E2EE key file is checked against the public key, not the address, so the change
  doesn't touch it (keksdose).
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
  - In an app under RLS, the request's own reads run with the bypass: telling the guests
    and counting a household's members read across tenants (keksdose's first version
    failed open there: nobody was told, and the guard counted nobody).
  - A mail confirms it, sent under the kind `account_deletion` (server-kit
    `mail.AccountNoticeKind.ACCOUNT_DELETION`). It says what goes and when, and how to cancel (write to the operator
    before the date). It says what it can keep: "copies in database backups and deleted
    files age out within 7 days of the erasure, server logs within 30". These are the
    shared Cloud SQL instance's figures (7 daily backups, 7-day point-in-time recovery;
    7-day soft delete on uploads; 30-day logs).
  - The page signs out.
- **Push and mail stop** for a deactivated account: every send path filters on
  `is_active`.
- **The app's mode**, a setting:
  - `after_days` (keksdose; `days = 30`). The erasure is a **Cloud Scheduler → Cloud
    Run Job**, not code in the service: the services scale to zero, so nothing
    in-process runs then. It is daily, idempotent, erases **one account per
    transaction** (a failure holds back no other), and writes `erase` to `admin_actions`
    in the same transaction. keksdose adds it to its `jobs.py` registry.
  - `operator` (kastlan, Kurvenschmiede): no date. The operator's erasure is an admin or
    platform action (`type_email`, logged), not a script. Kurvenschmiede erases from
    `/admin`, with no scheduler and no `kurvenschmiede-erase` job. It is offered only for
    an account that is deactivated with `deletion_requested_at` set: anything else
    answers 409, and the UI doesn't offer it.
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
    erased. Team memberships go with the account; a team keeps its other members.
  - **keksdose:** a budget the user owns is erased with its shares, as "erase all data"
    does. A hand-over is impossible: it would re-tenant rows across households, and in
    private mode the data is sealed under the owner's key. The **guests are told at the
    request** (push and in-app: "budget X will be deleted on DATE; export it before
    then"). The share keeps working through the 30 days, and a reactivation restores
    everything untouched: the E2EE key wraps stay until the erasure, so it unlocks.
  - **keksdose, also:** the owner's household and every key wrap of it (the guests'
    included) go once no live budget remains in it.
  - **keksdose, a guard:** if a household ever had more than one member row, erasing its
    owner would wipe budgets a co-member uses. Marcel checked production on 2026-10-07:
    every household has exactly one member (its owner), and the code can't create a
    second. The request still refuses with `household_has_members` if one ever appears, a
    cheap guard against a future change.
  - **kastlan:** company records stay with the company. The contact card that links the
    user to a company stays, with its user link nulled. Sessions are deleted.
- **Cancel:** an admin reactivates the account before the date. That clears both
  timestamps and logs `deletion_cancel`.
- **What erasure does:** the app's own list (keksdose's `erase_user_account` is the
  model):
  - the user's own data is deleted;
  - authorship foreign keys are nulled. Every user foreign key has an explicit
    `ON DELETE`, and a cascade becomes SET NULL **only together with** the scrub, never
    alone;
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
- **`data`**, each app's choice:
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
    work shared with the user: a reference at most);
  - storage keys (a feedback file's `key`): an address inside the app, not the user's
    data.
  server-kit's `NEVER_EXPORT` is the list, and an app's test runs `assert_no_secrets`
  over the export of a fully filled fixture account.
- Throttled (once a minute, server-kit `EXPORT_PER_USER`) and logged.
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
- **Audit:** an `AdminAction` enum and the `admin_action_record(...)` builder for the
  row's fields; the table and its insert stay the app's.
- **Roster:** the sort and state-token parsing (keksdose's `STATE_TOKENS` extended).
- **Deletion:** a `DeletionMode` enum (`after_days`, `operator`) and
  `deletion_due(requested_at, days, now)`.
- **Email change:** an `EMAIL_CHANGE_TTL` and token kind (the one-time token recipe).
- **Export:** `export_envelope(app, account, data, now)`.

**Since then:**
- ui-kit 0.31: `InvitationsPanel` revokes an expired invitation too, and takes
  `listTitle={null}` (§5).
- server-kit 0.5: `UserListResponse.levels` and `SUMMARY_ACTIVE_ADMINS` (§3.1); 0.5.1:
  `AdminActionRow.action` takes an app's own word as a string (§4.3).
- ui-kit 0.32.1 and server-kit 0.6: the `plan` action (§4.3).
- ui-kit 0.34 and server-kit 0.8: groups in the audit (§11.8). server-kit 0.8 also has
  `mail.AccountNoticeKind`, the words the email-change notice and the deletion mail are
  sent under (§6.2, §6.4).

**App-side:** the tables and migrations; the queries, RLS and company scoping; what
erasure deletes; what the export holds; the mails' texts; the scheduled erasure job (the
app's scheduler or Cloud Scheduler); kastlan's platform superuser.

## 8. Per repo (summary; the reviews refine it)

Moved to [archive/user-admin-history.md](archive/user-admin-history.md): the round's
per-repo to-dos, all adopted (ui-kit 0.30–0.31, server-kit 0.4–0.5).

## 9. Settled after the reviews (2026-10-07)

The reviews' items keep their numbers, which the code cites. An item that amended a
section above is folded into it and points there. The reviews' wording is in
[archive/user-admin-history.md](archive/user-admin-history.md).

1. **Deleting while owning shared work** → §2.7, §6.4.
2. **A deleted owner's shared budget** → §6.4.
3. **Audit in kastlan** → §4.3.
4. **Export contents** → §6.5.
5. **The erasure job** → §6.4.
6. **Clashes and their fixes** → §4.1 (kastlan's companies, passkey sign-ins,
   Kurvenschmiede's roles and transfer), §4.3 (`detail`), §6.2, §6.4.
7. **No clash** → §6.2, §6.4.

## 10. From the adoptions (2026-10-07, for 0.31 / 0.5)

The apps' notes from adopting ui-kit 0.30 and server-kit 0.4 keep their numbers too. All
but one are folded into the sections they amend; the wording is in the archive.

1. **The list answer carries the confirmation levels and the active-admin count** →
   §3.1, §4.2.
2. **The user's own deletion request is a platform row** → §4.3.
3. **The operator's erase is offered only for a deactivated account with a request**
   → §6.4.
4. **A backup code at the 2FA step goes through `SignInForm`'s own entry.** The form's
   second-factor step switches to a backup code itself (its `recoveryCode` label), and
   `onCode({…, kind: "recovery"})` returns the answer union, so a `password-change`
   answer moves the form to its third step. An app doesn't draw its own step in
   `twoFactorContent` for that (`src/auth/sign-in-form.tsx` `SignInForm`).
5. **`InvitationRow.invited_by` is a person** → §5.
6. **An expired invitation can be revoked** → §5.
7. **`InvitationsPanel listTitle={null}`** → §5.
8. **The export leaves storage keys out** → §6.5.
9. **Tests submit the confirm dialogs' form** → §4.2.
10. **The email-change confirm endpoint is anonymous** → §6.2.
11. **In an RLS app, the deletion request's reads need the bypass** → §6.4.
12. **App-specific actions on the audit row** → §4.3.

## 11. Groups in the audit (round 0.34; settled 2026-10-12)

§4.3's audit has words only for what is done to an account. Kurvenschmiede audits its
team operations through the kits' vocabulary (Marcel, 2026-10-09; its asks S1 and U11;
round 0.34 C11). This adds words for what is done to a group of accounts and to who is in
it, and a log target that is not a person.

### 11.1 Where each one stands

Moved to [archive/user-admin-history.md](archive/user-admin-history.md): how the three
apps and the kits logged groups before round 0.34, as read on 2026-10-12.

### 11.2 Decisions

Taken (Marcel, 2026-10-12): **one vocabulary for both kits; the generic word "group" in
the kinds and codes; each app's own noun only in the labels** (KS team, kastlan company,
keksdose budget: its groups are budgets, not households).

Settled by the draft and agreed by the reviews:

1. **Five new words** beside `membership_remove` (§11.3). `role` stays the account's role,
   kastlan's roles in a company included (§4.1); `membership_role` is a role inside a
   group that is not the account's (KS's team manager and member).
2. **The group is a column, `target_group_id`**, not a key in `detail` as KS's ask had it.
   The log joins its name as it joins a person's, and kastlan's plan rows get a target.
   The column goes where an app logs groups its rows don't already name:
   Kurvenschmiede's. kastlan's `company_id` already names the company on every such row
   (a company's rows go with it), so kastlan fills `target_group_id` from it when it
   reads a row, with no column and no migration of its own. The group is not a filter:
   `?target=` stays a person's.
3. **A log target is a person, a group or something else**, and only a missing person
   reads "an erased account" (§11.4).

Settled as recommended (all three apps agree):

4. **Where the noun's words live: in the kit, whole phrases per noun** (`group`, `team`,
   `company`, `budget`), picked with `groupNoun` (§11.5). A noun dropped into one phrase
   breaks in fr and it (the participle agrees with its gender) and hu (the noun takes a
   suffix), and German needs whole phrases too: "aus dem Team" against "aus dem
   Unternehmen". The `company` set keeps kastlan's strings of 0.33 exactly; the `team`
   set uses KS's own nouns. Noun-free words with the noun as a tag ("Created
   · Team Alpha") would save strings and read worse.
5. **The level of `group_delete`: `acknowledge`**, a tick under the app's sentence of what
   goes with it (KS: "N members, M grants and K invitations go with it"): the cascade is
   what nobody can see afterwards. The other four new words are `none`. kastlan can't
   delete a company.

Settled after the reviews:

6. **A deleted group keeps its name on its `group_delete` row**: a
   `target_group_name` column, written on that row only, with the name the group had,
   outside `detail`. When the log is read, a group that no longer exists takes its name
   from its `group_delete` row, and "a deleted team" shows only where there is none.
   - Without it the one row that records a deletion could never say which team went,
     and after the deletion every row of that team reads "a deleted team".
   - It is a stamp "as written", the precedent `target_email` sets (§4.3), and it keeps
     the log append-only: no old row is rewritten at the deletion.
   - It adds no personal data: KS keeps team names in plaintext by decision and never
     erases them, so the stamp keeps nothing the live row didn't hold. An erasure scrubs
     people, not groups.

### 11.3 The words

| Kind | When | Target | `target_group_id` | `detail` | Level |
|---|---|---|---|---|---|
| `group_create` | a group is created | the group | the group | `{}` | `none` |
| `group_rename` | it is renamed | the group | the group | `{}`: never a name, old or new | `none` |
| `group_delete` | it is deleted, with what goes with it | the group | the group, and `target_group_name` (decision 6) | the app's counts of what goes with it (KS: `{members, grants, invitations}`) | `acknowledge` |
| `membership_add` | an account is put in a group, or accepts an invitation into one | the person | the group | `{role}` | `none` |
| `membership_role` | a member's role in the group changes | the person | the group | `{from, to}` | `none` |
| `membership_remove` (§4.1) | an account is taken out | the person | the group (new) | `{role}` where the app has one (kastlan's carries none) | `none` |

- **Re-adding a member with another role** logs `membership_role`. **A change that
  changes nothing writes no row**: re-adding with the same role, setting the role a
  member already has.
- **A group's manager may act too** (KS's team manager adds and removes members); the
  actor column says who, as for an admin.
- **Accepting an invitation into a group** is a `membership_add` whose actor is the
  invitee, as a `deletion_request` names the user themselves. In KS that is at
  registration and at `/auth/invitations/accept`. A demo's memberships (KS's
  `demo_service` and its system team) are not logged.
- **An invitation into a group** (`invite`, `invite_resend`, `invite_revoke`) carries
  `target_group_id`, and the log names the group beside the address; the group is not
  a key in their `detail` (KS's migration moved its `team_id` there).
- **No name goes in `detail`**, the group's or a person's: `detail` never holds content
  (§4.3), and that is the app's rule to keep. Server-kit's `audit_detail` refuses a
  string with a space but not one word ("Fahrwerk" passes), so it doesn't keep it. The
  log joins names when it is read; a deleted group's name is the one stamp, in its own
  column (decision 6).

### 11.4 The target

The kit's `AdminActionLogEntry` (`src/admin/admin-action-log.tsx`) from 0.34:

```ts
target?: AdminPerson | AdminGroupTarget | AdminOtherTarget | null;
/** The group a membership_* or invitation row happened in. */
group?: AdminGroupTarget | null;

interface AdminGroupTarget { kind: "group"; id?: string | number | null; name?: string | null }
interface AdminOtherTarget { kind: "other"; label: string; id?: string | number | null }  // id, so an app's `e.target.id === target` filter still compiles
```

| Target | Drawn as |
|---|---|
| a person (no `kind`, as before 0.34) | name and address; `null`, or a person with nothing left in it, is "an erased account" |
| `kind: "group"` | the group's name, live or stamped (decision 6); without one, the noun's "a deleted team" |
| `kind: "other"` | its `label`, for an app's own action on something that is neither (a demo dataset, a setting) |
| left out | nothing. Until 0.34 it read as erased; the three apps always pass a person or `null` |

- A membership row draws the person, then the group's name on its own, muted. No
  preposition goes before the name, so no language has to inflect it.
- A group never reads "by the user themselves" (`samePerson` never matches a group) and
  is not a filter button (`?target=` stays a person's).
- **An app maps the row's `target_group`** (server-kit `AdminActionRow.target_group`, a
  `GroupRef`):
  - onto `target` for a row about the group itself: `group_*`, and kastlan's `plan`;
  - onto `group` for a row about a person in it: `membership_*`, `invite`,
    `invite_resend`, `invite_revoke`.

### 11.5 Labels

`AdminActionLog groupNoun="team" | "company" | "budget" | "group"` (default `group`)
picks one set of phrases; an app's own `labels.actions[kind]` still wins. New keys in the
`adminActionLog` namespace, in all seven languages (28 each):

| Key, for `<noun>` = `group`, `team`, `company`, `budget` | English, for `team` |
|---|---|
| `groupActions.<noun>.group_create` | Team created |
| `groupActions.<noun>.group_rename` | Team renamed |
| `groupActions.<noun>.group_delete` | Team deleted |
| `groupActions.<noun>.membership_add` | Added to the team |
| `groupActions.<noun>.membership_role` | Role in the team changed |
| `groupActions.<noun>.membership_remove` | Removed from the team |
| `groupActions.<noun>.deleted` | a deleted team |

`actions.membership_remove` leaves the `actions` defaults, where a catalogue's value would
outrank the noun's set; its seven translations become `groupActions.company.membership_remove`.

**The nouns, per language:**
- **`team`** takes Kurvenschmiede's own words (decision 4): de-CH "Team" (neuter: "aus
  dem Team"), fr "équipe" (feminine), it "team" (masculine, "il team"; never
  "squadra"), es "equipo", hu "csapat" ("a csapatból"), zh "团队".
- **`company`** keeps the `membership_remove` strings of 0.33 exactly (decision 4):
  en "Removed from the company", de-CH "Aus dem Unternehmen entfernt", fr "Retiré de
  l’entreprise", it "Rimosso dall’azienda", es "Quitada de la empresa", hu "Eltávolítva a
  cégből", zh "已从公司移除". The set's other phrases use the same nouns.
- **`budget`** takes keksdose's word where it has one: "Budget" in de-CH, "budget" in fr
  and it (its catalogue). In the other three languages the kit's translators choose.
- **`group`** is the neutral word.

### 11.6 Growing the union

`AdminActionKind` and `ADMIN_ACTION_KINDS` (ui-kit) and `AdminAction` and
`CONFIRMATION_LEVELS` (server-kit) gain `group_create`, `group_rename`, `group_delete`,
`membership_add` and `membership_role`.

- A `switch` over `AdminActionKind` that ends in an exhaustiveness check, or a
  `Record<AdminActionKind, …>`, adds the five (or a `default`). Code that reads
  `entry.target.email` narrows first (`!("kind" in target)`). The changelog lists the
  union under "Exhaustive switches".
- A list answer that builds `levels` from every `CONFIRMATION_LEVELS` entry grows by
  five (§3.1).
- An app writes no row with a new word before its server-kit pin knows the word: a read
  typed as `AdminAction` refuses a word it doesn't know, so `GET /admin/actions` would
  answer 500, while `admin_action_record` writes any string.

### 11.7 Per app

Moved to [archive/user-admin-history.md](archive/user-admin-history.md): each app's
round-0.34 steps (Kurvenschmiede's rows, migration and team deletion; kastlan's mapping
from `company_id`; nothing for keksdose). The rules in them are in §4.2, §4.3 and
§11.2–§11.6.

### 11.8 Build

**ui-kit 0.34:**
- the five kinds;
- new exported types `AdminGroupTarget`, `AdminOtherTarget` (with an optional `id`,
  §11.4) and `AdminGroupNoun` (`"group" | "team" | "company" | "budget"`);
- `AdminActionLogEntry.target` widens and gains `group`; `AdminActionLog` takes
  `groupNoun`; drawing as §11.4, and `samePerson` never matches a group;
- the 28 keys of §11.5 in seven languages, with §11.5's nouns, the `company` set's
  `membership_remove` exactly the 0.33 string; `actions.membership_remove` leaves
  `actions`;
- `AdminActionConfirm.target` takes a group at `none` and `acknowledge`, drawn by its
  name. A group has no address to type, so the props' types allow a group only at those
  two levels; `type_email` stays a person's;
- tests: each target kind; a deleted group with a name and without one; left out against
  `null`; `groupNoun` picks each of the four sets; `labels.actions` still wins; the
  `company` set's `membership_remove` equals the 0.33 string in seven languages; a group
  at `acknowledge` in `AdminActionConfirm`.

**server-kit 0.8, the audit row:**
- `AdminAction` and `CONFIRMATION_LEVELS` gain the five (§11.3);
- the app's table, where it logs groups (Kurvenschmiede), gains `target_group_id`, an
  integer, and `target_group_name`, a string (only on `group_delete`). Both are nullable,
  with **no foreign key**, so a deleted group keeps its rows, as an erased person does;
- `admin_action_record(…, target_group_id=None, target_group_name=None)` puts each key in
  only when it is given, as it does `company_id` (§4.3), so a table without the columns
  takes the record as is;
- `AdminActionRow` gains `target_group_id` and `target_group: GroupRef | None`. `GroupRef`
  (`{id, name}`) is new, joined by the app as `actor` is: from the live group, else the
  `group_delete` row's stamp (kastlan: from `company_id`);
- `require_confirmation(…, target_email: str | None)`. With `None`, a group:
  - `none` passes;
  - `acknowledge` passes on `acknowledged` alone, since no typed address can match;
  - `type_email` raises `ValueError`. That is a programming error: no level table gives
    a group's action `type_email`;
- kastlan's `company_id` stays the row's scope under RLS. The erasure scrub is unchanged:
  it scrubs people, not groups, and it already reaches a membership row through its
  person;
- tests: the record leaves both keys out when they aren't given; the row reads both; the
  levels; `require_confirmation` with `None` at each level.

### 11.9 Settled after the reviews (2026-10-12)

The three apps reviewed §11 on 2026-10-12 and agreed with decisions 4 and 5. Their
findings are folded into the sections above; the reviews' wording is in
[archive/user-admin-history.md](archive/user-admin-history.md).

- **keksdose:** kk 8 (`budget`, not `household`) → §11.2, §11.5; kk 9 (no app breaks) →
  §11.6.
- **kastlan:** ka 10 (a backfill under forced RLS) → §4.3; ka 11 (the mapping) → §11.4;
  ka 12 (no column, no migration) → §11.2; ka 13 (none of the five words in 0.34) →
  archive.
- **Kurvenschmiede:** KS 10 (`require_confirmation` with `None`) → §11.8; KS 11 (the
  confirmation in the `DELETE` body) → §4.2; KS 12 (`group_delete`'s counts) → §11.3;
  KS 13 (`membership_remove` is `{role}`) → §11.3; KS 14 (an accepted invitation) →
  §11.3; KS 15 (invitations carry the group) → §11.3; KS 16 (`target_group_name`) →
  decision 6; KS 17 (no row for no change) → §11.3; KS 18 (not a filter) → §11.2,
  §11.4; KS 19 (no group row before the pin) → §11.6; KS 20 (the erasure scrub) →
  §11.8.
