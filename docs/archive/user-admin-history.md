# User administration and the account's own settings — history

What [the user-admin contract](../user-admin-harmonization.md) moved out of its body in
ui-kit 0.34 (refactor audit DOC-1): its snapshots, per-repo to-dos and review logs. Kept
as written: "today", line numbers and each app's state are as of the day each part was
written, and an item may since have been folded into the contract, which wins. Section
numbers are the contract's.

## Status as written

Status: **2026-10-07, reviewed.** All three apps answered the same day; §9 records what
they settled, and §2 has Marcel's decisions. §11 (groups in the audit, round 0.34) is
**settled, 2026-10-12**: the three apps reviewed it that day, §11.9 records what they
settled, and §11 is corrected in place.

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
  - deletion in `operator` mode since 2026-10-07 (erased by an admin from `/admin`),
    with the transfer question (§6.4);
  - the export and email change.

## 9. Settled after the reviews (2026-10-07) — as written

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

## 10. From the adoptions (2026-10-07, for 0.31 / 0.5) — as written

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

keksdose adopted last (feat/user-admin, 2026-10-08). Its notes:

10. **The email-change confirm endpoint is anonymous** (`POST /auth/me/email/confirm
    {token}`): the new mailbox may be opened on a device that isn't signed in. The token
    is the proof. The page reuses the kit's `VerifyEmailStatus` with its own words until
    a dedicated part exists.
11. **In an RLS app, the deletion request's reads need the bypass.** Telling the guests
    and the household guard's member count must read across tenants. keksdose's first
    version failed open there (guests weren't told, and the guard counted nobody); it is
    fixed with a Postgres test, and the rule holds for every RLS app.
12. **App-specific actions on the audit row** (keksdose's `plan`): server-kit 0.5.1's
    `AdminActionRow.action` takes them as strings, so no app widens the type itself.

## 11. Groups in the audit — the status as written

**Settled 2026-10-12.** The three apps reviewed the draft (`05309f6`) the same day and
agreed with both of its open decisions (4 and 5). §11.9 records what became of each
finding; the sections below are corrected in place. Nothing is open.

### 11.1 Where each one stands

Read at KS `de88be6` (`refactor/plan-2026-10`), ka `e3985c9`, kk `c6bf6f70`.

- **Kurvenschmiede** logs six team operations as lines with ids and roles only
  (`backend/kurvenschmiede/domain/services/team_service.py`): create :197, rename :209,
  delete :216, add, or re-add with another role, :282, a member's role :303, remove :317;
  the comment at :37-46 says they wait for this. The activity panel maps rows onto the
  kit's log (`frontend/src/features/admin/activity-panel.tsx:70-80`).
  - **Deleting a team** takes its grants (`team.py:3-10`, `team_service.py:15-17`) and
    its pending invitations (`invitation.py:60`) with it, by cascade. **Removing a
    member** takes only the membership (`team_service.py:314`): the grants stay with the
    team.
  - **Re-adding with the same role** changes nothing and still logs a line
    (`team_service.py:267-282`).
  - **Invitations:** one into a team is already an `invite` row with `team_id` in its
    detail (`invitation_service.py:334-340`), and so are its `invite_resend` and
    `invite_revoke` (:350-367). Accepting one puts the invitee in the team, at
    registration or at `/auth/invitations/accept`, with no row
    (`invitation_service.py:441-462`).
  - **Team names** are plaintext by decision and never erased (`team.py:20-26`).
- **kastlan** has `membership_remove` (§4.1; `kastlan/domain/services/admin_user_service.py:352`).
  The operator's plan change is a row of the company with **no person in it**
  (`kastlan/adapters/api/platform_router.py:124-136`: `company_id` set, both target
  columns empty). The company admin's log maps it to `target: null`
  (`frontend/src/features/settings/components/admin-actions-card.tsx:11-19`), so it reads
  **"Plan changed · an erased account"** today.
  - Both rows carry `company_id`, and a company's rows go with it
    (`ON DELETE CASCADE`, `kastlan/domain/models/admin_action.py:35-37`).
  - `admin_actions` has forced row-level security (`kastlan/infrastructure/rls.py:57`,
    :78-81), which binds the owner that migrations run as.
  - It logs none of the five new words: founding a company (`POST /auth/companies`),
    renaming it (`PATCH /companies/settings`), accepting an invitation
    (`invitation_service.py:231-262`) and leaving one are not logged.
- **keksdose:** its groups with members are **budgets**. A budget's owner shares it with
  guests (owner and guest, `models/budget_share.py`; `remove_guest`,
  `budget_share_service.py:698`). The owner does that, not an admin, and nothing is
  logged. A household has one member (§6.4), so `household` would never be drawn.
- **The kits:** server-kit's `AdminAction` (`user_admin/actions.py:25-59`) and ui-kit's
  `AdminActionKind` (`src/admin/admin-action-log.tsx:33-74`) have no word for a group.
  An entry's target is a person or nothing, and nothing reads "an erased account"
  (`scrubbed` :182-184, :214). The kit's `membership_remove` label carries kastlan's noun
  in all seven languages: "Removed from the company". server-kit's `require_confirmation`
  requires `target_email: str` (`user_admin/rules.py:79-85`); kastlan's plan change passes
  `""` (`platform_router.py:120`).

### 11.6 Growing the union — the apps' code, as read

No app breaks: kk's `detailOf` (`frontend/src/features/admin/admin-actions-panel.tsx:34-59`,
its `default` at :57-58) and KS's `useDetail` (`activity-panel.tsx:26-42`) end in
`default`; kastlan has no switch, and no app reads `target.email` (kk 9). KS's list
answer builds `levels` from every `CONFIRMATION_LEVELS` entry
(`backend/kurvenschmiede/adapters/api/admin_router.py:159`), so it grows by five;
kastlan's `roster_levels` names its own (`kastlan/domain/schemas/user_admin.py:38-53`).
The changelog lists the union under "Exhaustive switches", as it did `BillingErrorCode`
in 0.33.

### 11.7 Per app

**Kurvenschmiede:**
- **The rows.** The six log lines become rows through `audit_service.record`, in the
  operation's transaction, and an accepted team invitation adds a `membership_add` by
  the invitee (KS 14).
  - `membership_remove` writes `{role}`; no grants go with a member (KS 13).
  - `group_delete` writes `{members, grants, invitations}` and `target_group_name`
    (KS 12, decision 6).
  - Re-adding with the same role writes nothing (KS 17).
- **The migration** adds `target_group_id` and `target_group_name`, both nullable and
  with no foreign key. It also moves the invitations' team out of `detail` (KS 15):

  ```sql
  UPDATE admin_actions
     SET target_group_id = (detail->>'team_id')::int,
         detail = detail - 'team_id'
   WHERE action IN ('invite', 'invite_resend', 'invite_revoke')
     AND detail->'team_id' IS NOT NULL;
  ```

  `detail` is JSONB, and an invitation with no team just loses its `null` key. New
  invitation rows write the column only.
- **Reading.** `AdminActionOut` (`domain/schemas/admin.py:247-267`) gains
  `target_group_id` and `target_group`, and its copy test follows. Its `/admin/actions`
  join takes the group's name from the live team, else from that team's `group_delete`
  row.
- **The pin.** No group row is written before the server-kit pin moves. The reason is the
  read (KS 19). `AdminActionOut.action: AdminAction` (:261) refuses a word it doesn't
  know when a row is read, while `admin_action_record` writes any string (server-kit
  `audit.py:166-169`). So a group row written first would make `GET /admin/actions`
  answer 500.
- **Deleting a team** (KS 11):
  - `acknowledged` (decision 5) travels in the `DELETE /admin/teams/{id}` JSON body
    (`admin_router.py:543-551`; `endpoints.ts:293`), as every action body carries it
    (§4.2). A proxy that drops the body gets `409 confirmation_required`, so the
    deletion fails closed.
  - The admin's team list, a bare `list[TeamOut]` today (`admin_router.py:510-515`,
    `teams-panel.tsx:32`), answers `{teams, levels}`, as the user list answers `levels`
    (§10.1). The levels come only with the roster today (`admin_router.py:159`,
    `users-panel.tsx:239`).
  - Each team in it gains `grant_count`, for the tick's sentence: `TeamOut` lists
    members and invitations, not grants (`teams_router.py:47-84`).
  - The confirm becomes `AdminActionConfirm`, its sentence in KS's own words: "N members,
    M grants and K invitations go with it" (KS 12).
- **The panel** maps the group (§11.4) and passes `groupNoun="team"`; `useDetail` adds
  the delete's counts and the role's from → to.

**kastlan:**
- **No column and no migration** (kastlan 12).
  - Every row of kastlan's about a company carries `company_id`: the plan change
    (`platform_router.py:124-128`) and `membership_remove` (`admin_user_service.py:352`).
  - A company's rows go with it (`admin_action.py:35-37`), so a copy of its id would add
    nothing, and "a deleted company" never shows.
  - Without a migration, the forced-RLS backfill that would have changed no row without
    a word (kastlan 10) goes too.
- `action_row` (`domain/schemas/user_admin.py:108-121`) fills `target_group_id` from
  `company_id`, and `target_group` with the company's name, for `plan` and
  `membership_remove`.
- `logEntry` (`admin-actions-card.tsx:11-19`) maps it as §11.4: the plan row's `target`,
  the removal's `group`. The plan row then reads "Plan changed · <company>". The card's
  comment at :21-24 ("the platform operator's actions are not here") is stale, since plan
  rows show; it is corrected.
- `groupNoun="company"` keeps "Removed from the company".
- The operator's role rows keep the company in `detail.company`
  (`platform_service.py:310-332`): they are about a person, and stay as they are in 0.34.
- **None of the five new words in 0.34** (kastlan 13). If kastlan logs founding,
  renaming, joining or leaving a company later, those rows take their group from
  `company_id` the same way, and an accepted invitation is a `membership_add` by the
  invitee (§11.3).
- **A later backfill of `admin_actions`** in a migration first runs
  `SET LOCAL app.bypass_rls = 'on'`, as `b4d6f8a0c2e4_feedback_fold_comments.py:43`
  does. The table's forced RLS binds the owner a migration runs as, so without it an
  `UPDATE` changes nothing and says nothing (kastlan 10).

**keksdose:** nothing to write today, and no migration: the record leaves the keys out.
`groupNoun="budget"` once it logs a budget's sharing (kk 8).

### 11.8 Build — the lines for adopt-0.34, as written

**For `docs/archive/adopt/adopt-0.34.md`**, beside §11.6's line:
- Kurvenschmiede: the migration and its backfill, the team list's `{teams, levels}` and
  `grant_count`, `acknowledged` in the delete's body, and no group row before the pin;
- kastlan: `action_row` fills the group from `company_id`, and `logEntry` maps it;
- keksdose: nothing.

### 11.9 Settled after the reviews (2026-10-12) — as written

The three apps reviewed §11 on 2026-10-12: keksdose at `c6bf6f70` (**kk** 8–9), kastlan
(**ka** 10–13) and Kurvenschmiede at `de88be6` (**KS** 10–20). The reviews are kept
outside the repo (`audits/round-034/reviews.md`); kk 1–7, ka 1–9 and KS 1–9 are auth
§11.7's. The sections above are corrected in place, and this list is the record.

**Decisions 4 and 5** are settled as recommended: all three agree. kastlan adds that
German needs whole phrases too, and that the `company` set must keep today's strings
exactly. KS adds that the `team` set takes its nouns (§11.5), and agrees to decision 5
given its points 10–12. kastlan can't delete a company, and keksdose has no stake in
decision 5.

**keksdose**
- kk 8, taken: `budget` replaces `household` in the noun set (§11.2, §11.5); keksdose
  still writes nothing and needs no migration.
- kk 9, confirmed: `detailOf` ends in `default`, and nothing has a
  `Record<AdminActionKind, …>`, an exhaustive switch or a `target.email` read (§11.6).

**kastlan**
- ka 10, moot and recorded: with no migration (ka 12) there is no backfill; the
  forced-RLS rule for a later one is in §11.7.
- ka 11, taken: the mapping rule covers both a row about the group (`group_*`, `plan` →
  `target`) and one about a person in it (→ `group`) (§11.4).
- ka 12, taken: kastlan needs no column and no migration; `action_row` fills the group
  from `company_id` (decision 2, §11.7).
- ka 13, taken: none of the five words in 0.34 for kastlan, and the stale card comment is
  corrected (§11.7).

**Kurvenschmiede**
- KS 10, taken: `require_confirmation` takes `target_email: str | None`, and `type_email`
  raises for a group (§11.8).
- KS 11, taken: `acknowledged` goes in the `DELETE` body, which fails closed; the team
  list answers `{teams, levels}` and each team its `grant_count` (§11.7).
- KS 12, taken: `group_delete`'s detail is `{members, grants, invitations}`, and the
  sentence names the invitations.
- KS 13, taken: KS's `membership_remove` is `{role}`; the draft's "counts of what went"
  is struck.
- KS 14, taken: an accepted invitation into a group is a `membership_add` by the invitee;
  a demo's memberships stay out.
- KS 15, taken: all three invitation words carry `target_group_id`, and the migration
  moves `team_id` out of `detail` (the key goes).
- KS 16, taken: `target_group_name` on the `group_delete` row (decision 6). The draft's
  `audit_detail` argument is struck: names stay out of `detail` by the app's rule.
- KS 17, taken: a change that changes nothing writes no row.
- KS 18, taken: decision 2's "an app can filter by it" is struck; the group is not a
  filter in 0.34.
- KS 19, taken: the reason is now the read, where `AdminActionOut.action` refuses a new
  word and `GET /admin/actions` would answer 500; the conclusion stands.
- KS 20, confirmed: the erasure scrubs membership rows (`audit_service.py:47`,
  `erasure_service.py:399-401`), only an admin deletes a team, and today's confirmation
  names the consequence (`en.json:1795`).

Nothing is open. Next: ui-kit 0.34 and server-kit 0.8 (§11.8).
