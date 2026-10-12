# Adopting `@eifi1/ui-kit` 0.34 and `eifi1-server-kit` 0.8

Round 0.34 took the candidates from the apps' 0.33 reports, keksdose's feedback run 77 and
Kurvenschmiede's two ask docs, as recommended (Marcel, 2026-10-12;
`audits/round-034-candidates.md` in the kits' notes). Two of them were contracts first,
settled after all three apps reviewed them:
- **session refresh:** `docs/auth-harmonization.md` §11 (review record §11.7);
- **groups in the audit:** `docs/user-admin-harmonization.md` §11 (review record §11.9).

One rule was added to the billing contract: **a manual grant clears `trial_ends_at`**
(§14.17). The contracts' per-app sections are the checklists; this note is the kits' side.

**Nothing has to be switched on to adopt 0.34**, and billing stays off. The Paddle sandbox
checks (billing §14.15) come after Marcel's sandbox run, in a later round.

## 1. What's new

### ui-kit

- **`attachSessionRefresh`** (auth §11): one refresh per tab for concurrent 401s. A
  definitive failure ends the session once: no refresh token, a 401 or 403 from the refresh
  call, or the replay failing again. Anything else is transient: the session is kept, the
  call retried on no answer, timeout, 408, 429 and 5xx (1 s, then 3 s, 15 s each), and the
  request rejects with its own 401 marked for `isTransientRefreshFailure(err)` (a key on the
  axios error itself, so `err.response?.status` still works). Requests are stamped with
  `currentToken()`, so a session that changed meanwhile (another tab, a company switch, a
  password change) is replayed with the current token or rejected quietly, never stored or
  ended. Exports: `createSessionRefresh`, `attachSessionRefresh`, `isTransientRefreshFailure`,
  `isSignedOutStep`; types `SessionRefresh`, `SessionRefreshOptions`, `SessionRenewal`,
  `SessionRefreshOutcome`. `AuthErrorCode` gains `session_ended`. Needs TypeScript ≥ 5.4.
- **Groups in the audit log** (user-admin §11): `AdminActionKind` gains `group_create`,
  `group_rename`, `group_delete`, `membership_add`, `membership_role`; a target is a person, a
  group or other; `groupNoun` (`group`, `team`, `company`, `budget`) picks whole phrases in
  all seven languages; a deleted group reads by the name its `group_delete` row kept;
  `AdminActionConfirm` allows a group only at `none` and `acknowledge`. Types
  `AdminGroupTarget`, `AdminOtherTarget`, `AdminGroupNoun`.
- **`PlanChangeConfirm`'s `usage` takes planColumn's shape** `{ used, limit, label: string |
  PluralForms }` and says it with the same sentence and plural rule as the plan column, so the
  two can't disagree ("1 of 1 budget", German "Budgets: 1 von 5"). A string or node still works.
- **The kit's own markup uses the role utilities** (`text-muted`, `bg-surface`,
  `border-strong`, …) instead of `text-[var(--text-muted)]` and the like: 3,290 classes, the
  same colours rule for rule. So do the exported class constants: `FIELD_BASE`,
  `FIELD_WRITABLE_LOOK`, `FIELD_INVALID`, `FIELD_DISPLAY`, `FIELD_TRIGGER`,
  `FLOATING_LABEL_CLASS`, `FOCUS_RING`, `SETTINGS_FOCUS_RING`, `SECTION_LABEL_CLASS`,
  `CAPTION_CLASS`, `DISABLED_REASON_LINE_CLASS`, `SHEET_ROW_CLASS`, `TOPBAR_*`,
  `FEEDBACK_*_META`, and `toneTextClass`'s output.
- **`HelpPopover`**: a "?" on the label line that opens a Popover on tap, click, Enter or
  Space, for help a paragraph long. It stays a "?" on touch and at Large; a `FieldHint`
  (a fact) still becomes its caption there (text-size §10.23). `Select` and `AmountInput`
  now turn a `FieldHint` into its caption like the other fields.
- **Write locks on more fields:** `commit` and `disabledReason` on `Input`, `AmountInput`,
  `MoneyField`, `RhfMoneyField` and `RhfNumberField`. Locked, the field stays in the tab
  order, read-only, and reports nothing (a locked `Input` reports no blur either).
- **`PasswordSetting`** says `password_incorrect` under the current password and focuses it;
  `describeError` is asked first for any other failure, its words in a banner. New label
  `accountSettings.password.wrongPassword`.
- **`Modal` / `DialogFrame` `size="2xl"`** (`max-w-[110rem]`).
- **One table-storage prefix:** `<UiKitProvider tableStorageKeyPrefix>`, read by `DataTable`
  (prop > provider > `hbui-table:`) and `TranslationReviewPanel` (which also takes
  `storageKeyPrefix`).
- **`saveBlob(blob, name)` and `filenameFromDisposition(header, fallback?)`**; the kit's own
  three downloads use them.
- **`SettingsLayout` writes the window title**, "<group> · <page> · <app>", from `appName`;
  `documentTitle={false}` or a function; the old title comes back on unmount.
- **`ServerWakeNotice` sits at the top centre**, inside the safe areas, its wrapper
  `pointer-events-none`, so it no longer covers a sticky Create footer. `navOffset` is
  deprecated (no effect; removed in 0.35).
- **`SeriesChart maxRows`** (opt-in): long tables thinned by envelope, each bucket's lowest
  and highest row per series kept, a zoom re-thinned.
- **The English catalogue is one module**, about 17 kB gzip like the other languages
  (it was ~29 chunks / ~104 kB in an app split by route). No code change.
- **No text is cut at Large** in Tabs, MenuItem, Breadcrumbs, the AppShell sidebar, the
  combobox family, MultiSelect, Country/CurrencySelect, MonthPicker, GroupedPicker, TreeRow,
  ProgressBar's legend, PieChart's centre label, PageHeader `truncateTitle`, passkey names,
  SignatureView, the DataTable column chooser, ProfileSetting's email, feedback attachment
  names and the translation table: they use `truncate-until-large`. ToggleGroup's strip
  wraps at Large (0.32.1's one-row exception is gone; Marcel, 2026-10-12).

### server-kit 0.8

- **Lemon Squeezy is gone** (billing §14.13; deprecated in 0.7).
- **`auth.absent_account_check(hash_password, verify_password, *, cost=None)`**: the dummy
  hash an address with no account is checked against, through the app's own verify.
- **`mail.AccountNoticeKind`**: `email_change_notice` and `account_deletion`.
- **`eifi1_server_kit.jobs`**: `require_jobs_token(getter)` / `check_jobs_token` on
  `X-Jobs-Token` (constant time), `JobsSettings`, `JobsTokenError` (401).
- **`content_disposition(name, fallback=…)`**: the plain `filename=` folds accents and writes
  `_` for the rest, never `?`; `filename*` keeps the real name.
- **Session refresh:** `AuthErrorCode.SESSION_ENDED` (401, every refusal of a refresh) and
  `RefreshRequest`; the `auth.tokens` docstring states the rule the kit relies on: a
  signed-in endpoint answers 401 only about the session.
- **Groups in the audit:** the five words in `AdminAction` and `CONFIRMATION_LEVELS`
  (`group_delete` at `acknowledge`), `admin_action_record(…, target_group_id=None,
  target_group_name=None)`, `GroupRef`, `AdminActionRow.target_group_id` / `target_group`,
  `require_confirmation(target_email: str | None)`.

## 2. Breaking and must-change, every app

- **Removed aliases** (deprecated in 0.32 or earlier):
  - `ariaLabel` on `ToggleGroup`, `ChipInput`, `GroupedPicker`, `HoverMenu` → `aria-label`;
  - the accessible-name `label` on `Tabs` and `SearchField` → `aria-label` (`SearchField`
    now requires it);
  - `PHONE_QUERY` → `usePhoneLayout()`, or `breakpointQuery("max-md", scale)` for the string;
  - `feedbackDialog.attachments` → `attachmentList` / `feedbackAttachment.attachmentList`.
- **Exhaustive switches:** `AdminActionKind` gains five members; `AdminActionLogEntry.target`
  widens to a group or other target; `AdminActionConfirmProps` is a type (an interface can no
  longer extend it); `AuthErrorCode` gains `session_ended`. No app's code breaks on these
  today (each has a `default`), but a new switch must cover them.
- **A complete `UiKitLabels` catalogue** of the app's own needs
  `accountSettings.password.wrongPassword`.
- **Emitted classes changed** in the parts listed under "No text is cut at Large": a test or
  style looking for `.truncate` there looks for `.truncate-until-large`.
- **Kit class names changed to the role utilities** (same colours): a test that asserts a kit
  class switches to the utility's name, as a WHOLE class (`/bg-surface(?![\w-])/` or
  `class~="bg-surface"`): `toContain("bg-surface")` also matches `bg-surface-2`. A
  `.not.toContain("…[var(--…)]")` on kit markup now passes vacuously: rewrite it to the new name.
- **`PasswordSetting` says the wrong password itself**: drop that case from the app's toast.
- **The wake notice moved** to the top centre (an app mounting the kit's sees it there).
- **Kit downloads revoke their URL after 60 s** instead of on the next task.
- **`SettingsLayout` writes the window title by default**: an app that sets it itself inside
  a group passes `appName` (else its own title loses the app name) or `documentTitle={false}`.
- **server-kit:** `BillingProvider.LEMONSQUEEZY` and its event map, statuses, signature check
  and header are gone; a numeric price id is refused; the deletion mail's word is
  `account_deletion`.
- **Session refresh, when an app adopts it:** attach it LAST, after `attachServerWake` and the
  app's own interceptors:
  `attachSessionRefresh(api, createSessionRefresh({ refresh, store, currentToken, isDemo, onEnded }))`.
  `refresh(signal)` passes `signal` to its bare axios call and writes nothing; `store` writes
  the token synchronously where `currentToken` reads it. The server answers every refusal of
  a refresh with `AuthError(AuthErrorCode.SESSION_ENDED)` and takes the kit's
  `RefreshRequest`.

## 3. Per app

### keksdose

- **Session refresh** (auth §11.5): the client moves onto `attachSessionRefresh` almost as it
  is; register its own interceptors (the cold-start watchdog) first; its `refresh` resolves
  the renewal and `store` sets `useAuth.setState({ token, user })` (not `setSession`); the
  `x-hb-sync` opt-out and its two headers go (sync-client.ts:907, :1073); the sync chip maps
  `isTransientRefreshFailure` to "offline"; `client.test.ts`'s handler indexes shift.
- **Removed aliases:** `ToggleGroup ariaLabel` (holdings-panel:421, metrics-panel:304,
  food-group-card:349, price-shop-picker:427, matching-tab:701, tours-page:217,
  transaction-create-card:411); `SearchField label` (support-panel:270, banks-page:167,
  taxonomy-match-dialog:97, tours-page:189); `Tabs label` (reports-page:354);
  `GroupedPicker ariaLabel` (ynab-import/steps/catalog-picker:54,
  shared/components/category-select:114); `HoverMenu ariaLabel`
  (shared/components/__tests__/misc.test.tsx:59, 84, 105, 124, 133).
- **`HelpPopover`:** swap the local help-popover at its three sites (`text=` becomes the
  children) and delete it. In the status explanation, "Reconciled … cannot be set by hand"
  is a fact: the status picker says it itself; the rest can stay behind the "?".
- **`PasswordSetting`:** `/me/password` sends a plain 400 without a code; answer
  `AccountError(PASSWORD_INCORRECT)`, then drop that case from the toast. The comment that it
  "takes no validator prop" is stale (`maxBytes`).
- **`commit`** on the fields that save on blur (25 sites).
- **Table prefix:** `<UiKitProvider tableStorageKeyPrefix="keksdose-table:">`; drop the
  `storageKeyPrefix` line from `shared/components/data-table.tsx` (keys unchanged; the wrapper
  stays for `mobileExpandAsDialog`). The translations panel moves from
  `hbui-table:translations` to `keksdose-table:translations`: its sort and page size reset once.
- **Wake notice:** `app/server-wake-notice.tsx` can go for the kit's (same place; its store on
  a kit watcher; the local-copy sentence through `labels`).
- **Optional:** the drilldown's `size="2xl"` without `max-w-5xl` (it then grows past 64rem).
- **Captions:** a FieldHint on Select, AmountInput or MoneyField now shows as a caption on
  phones and at Large (account-type-select, category-editor, transaction-fields).
- **Strip:** the cleared-status ToggleGroup wraps at Large when the statuses don't fit.
- **server-kit:** `_dummy_hash` → `check_absent = absent_account_check(hash_password,
  verify_password)`; the two notices take `kind=AccountNoticeKind.EMAIL_CHANGE_NOTICE` /
  `ACCOUNT_DELETION` (the words are already yours); drop "lemonsqueezy" from
  `.env.example:161` and `settings.py:107` (`test_billing_webhook.py:105` still gets its 404).
- **Audit:** nothing; `groupNoun="budget"` once budget sharing is logged.
- **`PlanConfirm`:** pass `usage={{ used: user.budgets_owned, limit: budgetLimitOf(user),
  label: { one: t(…budget_one), other: t(…budget_other) } }}` and drop
  `admin.users.budgets_of_limit` (user-admin-confirm.tsx:145).
- **Tests on kit classes:** `ui.test.tsx` :304, :312, :313 fail and become
  `[&[readonly]]:bg-surface-2` / `[&[readonly]]:text-muted`; :328, :329 become
  `[&[readonly]]:bg-surface` (a regex, or it also matches `…bg-surface-2`) and
  `[&[readonly]]:text-primary`; the :330, :331 negatives pass vacuously until renamed.
  `top-bar.test.tsx` :259, :272, :278 `class*="bg-[var(--danger)]"` → `class~="bg-danger"`
  (:278's toBeNull is vacuous otherwise); `feedback-page.test.tsx` :446-447 →
  `bg-danger-soft` / `text-danger`; `image-cropper.test.tsx` :134 → `bg-surface`;
  `invoice-line-confidence.test.tsx` :148-150 → `text-danger` / `-warning` / `-success`;
  `danger-card-frame.test.tsx` :55 → `border-danger-strong`.

### kastlan

- **Before session refresh:** `POST /auth/2fa/disable` answers 400, not 401, for a wrong
  password or code (auth §11: a signed-in endpoint answers 401 only about the session).
- **Session refresh** (auth §11.5): fixes the sign-out after a brief refresh failure
  (client.ts ~225-245) and at start-up (auth-store.ts:102-104); `refresh` resolves
  `replay: false` after a company switch; `onEnded` is `logout()` plus `queryClient.clear()`;
  the boot gets the user through `store`; `sync.ts` counts `isTransientRefreshFailure` as
  offline (a handover photo is not discarded); `restoreDemo` and the landing routes' rehydrate
  keep the session on a transient failure; the bare refresh goes through `serverWake.track`.
- **Audit (must):** `groupNoun="company"` (else a removal reads "Removed from the group");
  `action_row` fills `target_group_id` and `target_group` from `company_id` (no column, no
  migration); `logEntry` maps the plan row's group to `target` and the removal's to `group`;
  the plan change may pass `target_email=None`. None of the five new words is logged in 0.34.
- **Billing (§14.17):** `billing_service.set_plan` clears `trial_ends_at` on a manual grant.
- **`PasswordSetting`:** the `.catch` toasts "profile.wrongPassword" on every failure; let the
  code reach the card and keep a generic toast for the rest.
- **`commit`** on the fields that save on blur (21 files).
- **Settings title:** `SettingsChrome` keeps its breadcrumb, drops its title effect, passes
  `appName="Kastlan"`.
- **Downloads:** `openAuthenticatedFile` opens a tab rather than saving and stays; a real
  download is `saveBlob` + `filenameFromDisposition(res.headers["content-disposition"])`.
- **server-kit:** `_DUMMY_HASH` → `absent_account_check(hash_password, verify_password)`;
  `kind="deletion"` → `AccountNoticeKind.ACCOUNT_DELETION` (the log word changes to
  `account_deletion`: move a log query or alert with it); the ops router uses
  `Depends(require_jobs_token(lambda: settings.jobs_token))`, settings may inherit
  `JobsSettings` (same 401 and detail); the ports' "Paddle or Lemon Squeezy" wording goes.
- **Removed aliases:** none used.

### Kurvenschmiede

- **Session refresh** (auth §11.5, U6): the client moves onto `attachSessionRefresh`;
  `apiErrorMessage` checks `isTransientRefreshFailure` first and says offline or timeout;
  `onEnded` keeps the page in `?next=`; the wrong comment at client.ts:72-74 goes.
- **Audit** (user-admin §11.7, U11/S1): the migration adds `target_group_id` and
  `target_group_name`, with the backfill for `invite`, `invite_resend`, `invite_revoke`
  (`detail->>'team_id'`); the team list answers `{teams, levels}` with `grant_count`;
  `acknowledged` travels in the DELETE's JSON body; an accepted invitation writes
  `membership_add` with the invitee as actor (the demo's memberships stay out); no change, no
  row; `groupNoun="team"`; narrow a group's level to `none | acknowledge` for
  `AdminActionConfirm`. Write no group row before the server-kit 0.8 pin.
- **Billing (§14.17):** `change_plan` clears `trial_ends_at` on a manual grant.
- **`commit`:** `CommitInput` goes: `<Input commit>` at segment-editor:211 and
  profile-settings:76, the kit `NumberField commit` in the shared/ui wrapper.
- **`PasswordSetting`:** drop the `password_incorrect` branch of `PasswordCard`'s toast.
- **Dialogs:** `WIDE_DIALOG` → `size="2xl"` on the five dialogs (gear-wizard keeps
  `max-h-[92dvh] … p-5`).
- **Table prefix:** `tableStorageKeyPrefix={STORAGE.tables}`; `STORAGE.kitTables` and the
  per-table props go; the panel moves to `steering-table:translations` (one reset, as U4
  expected).
- **Downloads:** `shared/lib/download.ts` → the kit's `saveBlob` and `filenameFromDisposition`;
  exports may pass `content_disposition(name, fallback="curve-12.csv")` (update `naming.py`'s
  docstring note).
- **Titles:** `GroupTitle` goes; pass `appName={t("app.name")}` to the settings and admin
  layouts (admin gains titles).
- **Charts:** `maxRows={2000}` on the curve plot, the tracking chart and the profile
  comparison, every row handed in; `shared/charts/decimate.ts` goes.
- **Captions:** a FieldHint on Select, AmountInput or MoneyField now shows as a caption on
  phones and at Large (the gear, control and setpoint editors).
- **Tests on kit classes:** `checks-list.test.tsx` :54-55 (`toneTextClass`) → `text-warning` /
  `text-success`.
- **Removed aliases:** `HoverMenu ariaLabel` (app/account-menu:139); `ToggleGroup ariaLabel`
  ×13 (signal-source:95, 102; corner-page:392; hysteresis-charts:268; kinematics-charts:480;
  ratio-shape:96, 111; segment-editor:259; ownership:47; ackermann-chart:130; input-panel:73;
  plan-view:159; team-card:191, 299).
- **server-kit:** `verify_password_of_absent_account` → `absent_account_check(hash_password,
  verify_password, cost=lambda: get_settings().bcrypt_rounds)`; the local `NoticeKind` → the
  kit's `AccountNoticeKind`, `deletion_request` → `account_deletion`; the ops router uses the
  kit's `require_jobs_token(lambda: get_settings().jobs_token)` (the 401's detail becomes "A
  valid X-Jobs-Token is required").

## 4. Versions

- **`@eifi1/ui-kit` `^0.34.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.8.0**, the release wheel by URL, with each app's extras and the
  sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.8.0/eifi1_server_kit-0.8.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.8.0/eifi1_server_kit-0.8.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.8.0/eifi1_server_kit-0.8.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `<sha256 at release>`

## Where the build differs from the contracts

- **`AdminOtherTarget` has an optional `id`** (user-admin §11.4 has none): without it,
  keksdose's `e.target.id === target` and the showcase's filter stop compiling.
- **The truncation sweep gates `npm run release`, not CI**: Chromium runs locally before the
  version bump (`npm run check:sweep`), never in `npm run check` or a workflow.
