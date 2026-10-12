# Adopting `@eifi1/ui-kit` 0.30 and `eifi1-server-kit` 0.4

User administration and the account's own settings (Marcel, 2026-10-07): the second
part of the user-management round, after the sign-in round (0.29 / 0.3).

The contract is `docs/user-admin-harmonization.md`, reviewed by all three apps. §6 has
each app's deletion and export, and §9 what the reviews settled. This note is the kits'
side.

0.30.0 also carries what was going to be 0.29.1 (Marcel folded it in). That part is
described first, since it applies on the bump alone.

## Everyone, on the bump

1. Bump the kit to `^0.30.0` by hand (a caret below 1.0 locks the minor version). Take
   server-kit 0.4.0: the release wheel's URL in the install line, with the sha256 pinned
   in `uv.lock`.
2. **Changes you may see** (the old 0.29.1):
   - **Dropdowns open above** when the list's full height (320 px) doesn't fit below but
     fits above, or when above is clearly roomier (48 px or more). This affects every
     `useAnchoredPanel` consumer (keksdose live #384).
   - **Every auth form recognises HTTP 429** (`isRateLimited`) and shows "Too many
     attempts. Try again in N s / N min." from `Retry-After` (`retryAfterSeconds`). Your
     `describeError` is still asked first.
   - **The hu and es sign-in wording** follows Kurvenschmiede's corrections.
3. **New options on existing parts**, nothing required:
   - `RegisterForm defaultEmail`: an editable start address. `invitedEmail` still locks
     the field.
   - `describeError` on `EmailVerificationBanner` / `VerifyEmailStatus` for a refused
     resend.
   - `token_expired` among the codes: `VerifyEmailStatus` shows it as "expired".
   - `SignInForm recoveryCode`: a "Use a backup code" entry on the 2FA step, posting
     `onCode({…, kind: "recovery"})`. `twoFactorContent` may be a function of the
     challenge token.
   - `ProfileSetting firstName` / `lastName` / `onSave(values)`: the single-name API is
     unchanged.
4. **server-kit 0.4 ⚠ breaking change:** `render_message` and `MailText.render` take the
   `subject` and `lang`, and return a whole HTML document, which helps with Outlook's
   junk filter. No app used them yet. `render_mail(locale, texts, link=…)` does pick and
   render in one call. `ResendClient(reply_to=…)` takes the per-app `*_EMAIL_REPLY_TO`,
   defaulting to `support@<domain>` (`support_address`); Email Routing is live on all
   three domains.

## New in the kit

**The admin side:**
- `userRosterColumns` / `useUserRosterColumns`: a `DataTable` preset.
  - Columns: `UserIdentityCell` (avatar, the name in the reader's order, the email), the
    role (chip, or `RoleSelect` where `editableRole(row)`), state chips (`adminUserStates`,
    with `deletion`), created and last login, your `extra` columns, and a row action
    popover (`UserRowActions`).
  - Phone cards come from the same preset.
  - Sort keys equal the server's (`userRosterSort`, `key.desc`).
- `RoleSelect` / `RolesEditor` (kastlan's several roles), with lock reasons: last admin,
  yourself, or your own words.
- `ReviewerScopeEditor`: languages and areas, saved in one step. It replaces the three
  app editors.
- `AdminActionConfirm` renders the **server's** level:
  - `none` confirms at once; `acknowledge` shows a checkbox; `type_email` asks for the
    typed address. It hands `{confirmEmail?, acknowledged?}` to `onConfirm`.
  - It shows the refusals: `last_admin`, `self_action`, `other_companies` (with "Remove
    from company"), `confirmation_mismatch`.
- `AdminActionLog`: the `admin_actions` list, with paging and a target filter.
- `TransferOwnershipDialog` (Kurvenschmiede): a recipient with reasons, and the typed
  address.
- `InvitationsPanel`:
  - the form (no `+tag` suggestion, since it's someone else's address);
  - rows with status chips, resend and revoke;
  - copy link, **shown once**;
  - the console-mail hint.
  It assumes nothing about who invites (keksdose's budget owners invite from their
  sharing UI).
- `AccountStateChip` gains `deletion` (with its date, or "requested").

**The account's own settings:**
- `EmailChangeSetting`: the new address, the password, then a pending state with resend
  and cancel, and the done state. It shows `email_taken` and `password_incorrect` under
  their fields.
- `SessionsSetting`: "Sign out everywhere" (it signs this device out too), and an
  optional device list (kastlan).
- `DeleteAccountSetting`:
  - `mode="after_days"` with `days`, or `"operator"`;
  - your consequences list, and `handOverCount` (Kurvenschmiede);
  - password and the typed email.
  - Refusals: `last_admin` (with kastlan's companies), `household_has_members`,
    `password_incorrect`, `confirmation_mismatch`.
- `DataExportSetting`: your sentence (kastlan: "Your account; your company's records are
  your company's, ask them."), the download, and a throttle message.
- Codes: `AccountErrorCode` / `KitErrorCode`, known to `authErrorCode` / `isAuthError`.

Eleven label namespaces in all seven languages. The showcase has a **User
administration** page.

## New in the server kit (0.4.0)

`eifi1_server_kit.user_admin`:

- **Rules:** `refuse_self`, `refuse_last_admin`, `confirm_email_matches`,
  `require_confirmation(level, …)`.
- **Levels:** `confirmation_level(action, at_least=…)`. The contract's level is a floor;
  keksdose raises it where a password opens a key.
- **Refusals:** `AccountError` / `AccountErrorCode`. Every code is 409, except
  `password_incorrect` at **400**, so a wrong current password never reads as an ended
  session. Its `extra` fields go beside `detail` and `code` (kastlan's `companies`).
- **The user list:** `parse_roster_query(…)` → `UserListQuery`, accepting `key.desc` and
  `-key`. `STATE_TOKENS` is extensible: keksdose adds `allowlisted`, and an app may
  restrict the tokens.
- **Audit:** `admin_action_record(…)`, with a `detail` guard: tokens, ids and counts only,
  never content, never a secret.
- **Shapes:** `AdminUserRow`, `UserListResponse`, `ActiveChange` / `RoleChange` /
  `RolesChange` / `MailRequest` (each carrying `acknowledged` and `confirm_email`),
  `MailResult` (a link only on the console backend), the invitation shapes and
  `invitation_status`, `ReviewerUpdate`, `AdminActionRow`, `EmailChangeRequest` /
  `Confirm`, `DeletionRequest`.
- **Deletion:** `DeletionMode`, `deletion_schedule`, `deletion_due` (never before the date
  the mail promised), and `deletion_mail_retention_note` (7-day backups, 30-day logs).
- **Export:** `export_envelope`, `export_filename`, and `assert_no_secrets(obj)`. Run the
  last in a test over your export.
- **Tokens:** `EMAIL_CHANGE_TTL` (48 h) and `OneTimeTokenKind.EMAIL_CHANGE`;
  `AuthErrorCode.TOKEN_EXPIRED`.

## Per app

The contract's §6.4 and §6.5 hold each app's deletion and export. Its §8 holds the rest.
In short:

- **keksdose:**
  - gains deactivate and role change;
  - its roster moves to the preset;
  - `admin_actions` replaces the plan log line;
  - deletion in `after_days` mode: API tokens revoked at the request, guests told, the
    household and its key wraps erased with the owner, and pushes stopped for a
    deactivated account;
  - an `account_erasure` job in `jobs.py`;
  - the export, without E2EE material;
  - email change and sessions.
- **kastlan:**
  - deactivation per company (`other_companies` → "Remove from company"; the operator
    deactivates accounts);
  - a new `admin_actions` table with `company_id`, plus `/platform/actions`;
  - deletion in `operator` mode: a one-person company is flagged rather than refused,
    and the erasure is a logged platform action;
  - the account-only export;
  - force password change (the login answer arrives).
- **Kurvenschmiede:**
  - force password change and resend;
  - a paged roster;
  - `admin_actions` (never content);
  - deletion in `after_days` mode, with shared work handed to the first active admin at
    erasure;
  - `kurvenschmiede-erase` as a Cloud Run Job;
  - feedback anonymised, with its foreign key made SET NULL together with the scrub;
  - the export and email change.
