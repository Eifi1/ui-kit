# Adopting `@eifi1/ui-kit` 0.34 and `eifi1-server-kit` 0.8

Round 0.34 took the candidates from the apps' 0.33 reports, keksdose's feedback run 77 and
Kurvenschmiede's two ask docs, as recommended (Marcel, 2026-10-12;
`audits/round-034-candidates.md` in the kits' notes). Two of them were contracts first,
settled after all three apps reviewed them:
- **session refresh:** `docs/auth-harmonization.md` §11 (review record §11.7);
- **groups in the audit:** `docs/user-admin-harmonization.md` §11 (review record §11.9).

One rule was added to the billing contract: **a manual grant clears `trial_ends_at`**
(§14.17). The contracts' per-app sections are the checklists; this note is the kits' side.

**The refactor audit is in 0.34 too.** Six auditors filed 69 findings on the 0.34 branch
(`docs/refactor-plan-2026-10.md`, evidence in `docs/refactor-audit-2026-10/`). Wave 0 fixed the
live and serious bugs; on Marcel's word ("Wire all waves also into 0.34") Waves 1–5 followed:
shared behaviour, structure and refs, the public API, styling, docs and tests. Most of it is
invisible to an app; what an app sees is in §1–§3 below. Deprecations it adds are due in 0.35.

**Nothing has to be switched on to adopt 0.34**, and billing stays off. The Paddle sandbox
checks (billing §14.15) come after Marcel's sandbox run, in a later round.

## 0.34.1 → 0.35.0

The fixes from the three apps' 0.34 adoptions were built as a 0.34.1 patch and ship in
0.35.0 instead (Marcel, 2026-10-13); `docs/adopt-0.35.md` §1 lists them. The corrections to
this guide stay in place below.

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

**Fixed before the release** (the refactor audit's Wave 0, `docs/refactor-plan-2026-10.md`,
and keksdose's feedback run 78), nothing to change unless noted in §2:
- **Escape on an open picker list inside a dialog closes only the list**; the next Escape
  closes the dialog. Every picker, AmountInput's currency chip included (it was closing a
  Modal, DialogFrame or FullBleedDialog and losing the form: kastlan's lease dialog).
- **Tab stays inside** the DatePicker and MonthPicker popovers and the phone picker sheet
  (the focus trap counted `tabindex="-1"` controls).
- **DataTable's phone filter sheet is a real dialog**: named "Filters", focus moves in and
  back to the Filters button, Escape and Back close it.
- **DataTable's date filter matches the local day the cell shows**: the feedback inboxes
  filed rows from 00:00–02:00 under the day before.
- **An empty paged table's pager** says the row count, not "1–0 / 0".
- **A reopened photo** in Lightbox / ImageGrid / AuthedImage no longer shows the error state.
- **A field locked through `commit` or `disabledReason` shows its reason as a line** under
  the control on a phone and at Large, as Button does (text-size §4); one kit frame draws
  it. `disabledReasonDisplay="tooltip"` keeps the bubble, e.g. for many locked rows under a
  banner.
- **German number fields read "0.500" as 0.5**, no longer 500, and `roundToCurrency`
  never returns NaN or −0 (AmountInput no longer blanks "0.0000001" or a 22-digit amount).
- **A strip's label clears its group's border** (keksdose dev #593): the strip is 20 px,
  a ToggleGroup's segments in it a 16 px line, so a strip field keeps a labelled Input's
  42 px. `FieldStrip`'s `pad` is deprecated (both values are 20 px).
- **The DatePicker's stepper keeps a full-strength focus line at 125 %** (keksdose live
  #394): an inset 1 px ring beside the 1 px border.

**The refactor waves** (`docs/refactor-plan-2026-10.md`):
- **One Escape stack:** Escape closes only the topmost layer — a tooltip, menu, numpad or
  palette inside a dialog, a picker in a Popover in a dialog. A field's bare `preventDefault`
  no longer holds a Modal open (FullBleedDialog's rule). Escape outside a dialog's panel closes
  the topmost dialog.
- **Pickers on one foundation:** CurrencySelect, MultiSelect and GroupedPicker run on the
  combobox core — the phone sheet, portal anchoring, the live result count; the phone sheet
  takes arrows and Enter; a composing (IME) Enter never picks or submits. One search fold
  everywhere: "zurich" finds Zürich in every list and the DataTable text filter
  (`foldForSearch`, `rankMatch` exported).
- **MultiSelect is generic** (`MultiSelect<V>`, no casts), takes `value`, `labels`,
  `disabledReason` / `commit` and a `ref`.
- **Fields share their plumbing:** every field turns a FieldHint into its caption on touch and
  at Large (Slider, CountrySelect, CurrencySelect, OneTimeCodeInput, PhoneInput, SwatchPicker,
  IconPicker, DescriptionItem and every Rhf twin too); one error wiring (Autocomplete paints
  `aria-invalid`, MultiSelect puts a Field spread on its trigger); NumberInput and AmountInput
  share one engine (AmountInput takes `locale`); RhfSelect, RhfCheckbox and RhfMoneyField take
  `commit`; every field's focus keeps a full-strength line at 125 %.
- **Every component takes a `ref`:** React 19 ref-as-prop across the kit — Card, EmptyState,
  PageHeader, every field and picker; Rhf focus-on-error reaches every twin.
- **Lighter entry chunks:** the feedback dialog and the search palette load on first open; the
  shell every app loads at once falls from 121 to 74 kB minified (40 → 26 kB gzip).
  `{ Button }` alone costs 6.8 kB gzip (was 11.3), `{ Spinner }` 0.9 (was 10.1).
- **DataTable:** the closed Columns drawer leaves the tab order; filter buttons are named per
  column ("Filter Amount", new label `dataTable.filterColumn`); the number filter reads the
  locale's decimal mark and ignores a bad URL bound.
- **Types:** every `labels` prop takes a deep partial; `AmountInputProps`, `NumberInputProps`
  and `ThemeSettingSelectProps` are exported; LanguageSetting's options carry their `lang`.
- **Styling:** utilities with variants for the focus width (`ring-focus`, `outline-focus`), ring
  offsets (`ring-offset-surface` / `-page`), the ring on brand (`ring-brand-contrast`) and money
  (`text-` / `bg-money-{income,expense,net,neutral}`).
- **i18n:** counts carry thousands separators in all seven languages ("1’234 Punkte").
- **Colour presets** (Ink, Moss, Plum, Contrast) move about one hex step: every derived pair now
  meets its contrast on the hex it ships.
- **`@eifi1/ui-kit/testing`** ships `stubViewportWidth`, `viewportMatchMedia` and
  `stubResizeObserver`; StatusDot, Chip and AlertBanner carry `data-tone`.
- **Docs:** the contracts say what the code does, in their bodies (history in `docs/archive/`);
  README and ADOPTING describe today's kit, with a generated Styling section; `docs/README.md`
  indexes everything. The published `.d.ts` are one file per module (same names).

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
- **`ariaLabel` is deprecated on every component that still takes it** (removed in 0.35):
  AmountInput, MoneyField, NumberInput, NumberField, IntegerField, CalculatorButton,
  RhfNumberField / RhfIntegerField / RhfMoneyField, WizardStepper, ThemeToggle, PaletteMenu,
  LanguageMenu, OptionSwitcherMenu, RoleSwitcher, TopBarActionMenu. They take `aria-label`,
  which wins. One rule for all twenty components with the four removed above:
  `ariaLabel` → `aria-label`. Rename now or by 0.35.
- **Peers: `react` and `react-dom` `>=19.2`** (`useEffectEvent`); all three apps already are.
- **App tests:** a test counting tab stops inside a dialog may shift (BUG-4); the phone
  filter sheet's dialog role is on its panel now, not the backdrop, its title an `<h2>`, and
  its close plays a 220 ms exit where `matchMedia` is stubbed without reduced motion, so
  assert its absence with `waitFor`.
- **Exhaustive switches:** `AdminActionKind` gains five members; `AdminActionLogEntry.target`
  widens to a group or other target; `AdminActionConfirmProps` is a type (an interface can no
  longer extend it); `AuthErrorCode` gains `session_ended`. No app's code breaks on these
  today (each has a `default`), but a new switch must cover them.
- **A complete `UiKitLabels` catalogue** of the app's own needs
  `accountSettings.password.wrongPassword` — only an app that ships its OWN catalogue for a
  language; one that mounts the kit's catalogues needs nothing (corrected in 0.34.1).
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
- **From the refactor waves — what app tests may notice:**
  - Escape closes only the topmost layer: a test that presses Escape once with a tooltip
    showing in a dialog needs a second press; hold Escape in a Modal in the dialog's own
    `onKeyDown`, not by a field's `preventDefault`.
  - Picker rows are `role="option"` and pick on mousedown (CurrencySelect, the AmountInput
    chip, GroupedPicker, MultiSelect): use `getByRole("option")` with `user.click` or
    `fireEvent.mouseDown` — `fireEvent.click` no longer picks. GroupedPicker's trigger is a
    combobox. DataTable's number bounds are textboxes, its filter buttons "Filter <column>".
  - The feedback dialog and the search palette appear a render after opening: `await findBy…`.
  - (0.34.1) The no-match row in CurrencySelect, MultiSelect and the AmountInput chip is the
    combobox core's `role="status"` "No results", not "—"; a currency row's accessible name has
    spaces ("CHF CHF Swiss Franc", was "CHFCHFSwiss Franc"); the wake notice's live region is
    always in the DOM, so `getByRole("status").first()` may hit it; MultiSelect's panel is
    portalled to the body with an inline width, so a `panelClassName` width utility is inert and
    the panel is no longer under the trigger's parent.
  - A FieldHint on the fields above prints as words at Large and on touch, not a "?".
  - Kit class names: `FIELD_BASE` focus = `focus:border-brand focus:ring-1 focus:ring-inset
    focus:ring-brand`; `FIELD_DISPLAY` adds `focus:shadow-[inset_0_-1px_0_var(--brand)]`;
    ChipInput / FileDropzone errors = `text-caption leading-tight text-danger`;
    `ring-[length:var(--focus-ring-width)]` → `ring-focus`, `outline-[length:…]` →
    `outline-focus`, `ring-offset-[var(--bg-surface)]` → `ring-offset-surface`,
    `ring-offset-[var(--bg-page)]` → `ring-offset-page`, `ring-[var(--brand-contrast)]` →
    `ring-brand-contrast`, `text-[var(--money-…)]` → `text-money-…`, `bg-[var(--money-…)]` →
    `bg-money-…`. `FOCUS_RING`, `FOCUS_RING_WIDTH`, `SETTINGS_FOCUS_RING` and
    `toneTextClass()` change value. `.text-money-net` and `.bg-money-neutral` are layered theme
    utilities now; the other `.text-money-pos`-style statics stay.
  - Preset hex values move about one step (a test that pins a preset's hex updates it).
  - Accessibility fixes from the showcase's new axe check: an expandable DataTable row (desktop,
    `onRowClick` + `expandedRow`) carries no `aria-expanded` on its `<tr>` — a visually hidden
    "Details" button in the first cell holds it (`getByRole("button", { name: "Details",
    expanded: true })`; the first cell's accessible name gains "Details", so a
    `getByRole("cell", { name: "Alpha" })` needs a regex); Tabs' named "Remove <tab>" button
    sits right after the tablist, not inside it (`within(tablist)` no longer finds it,
    `screen.getByRole` does); FeedbackNoteEditor without a placeholder is named "Note" (new
    `label` prop; keys `feedbackDetail.note`, `dataTable.rowDetails` in all seven languages);
    FileDropzone's and FeedbackAttachmentField's hidden file inputs left the tab order.
  - Types: `ThemeSettingProps` is the union; `LanguageSettingProps` drops `multiple`; 25
    components are function components, not `ForwardRefExoticComponent` (JSX,
    `ComponentProps` and `ComponentRef` work as before; `X.displayName` is gone).
- **Deprecated in 0.34, removed in 0.35** (besides `ariaLabel`): MultiSelect `values` →
  `value`, `allLabel` / `searchLabel` / `selectAllLabel` / `clearLabel` → `labels`;
  `resolveChipInputLabels`, `resolveFieldSyncLabels`, `resolveWizardLabels`,
  `resolvePasswordRevealLabels`, `resolveDataTableLabels`, `missingDataTableLabels`
  (→ `missingKitLabels`); the 13 chart-zoom maths exports; `ALTERNATIVE_PRESETS`;
  `FeedbackComposer` → `ChatComposer`; `align: "left" | "right"` → the logical values;
  /rhf's `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`,
  `FormMessage`, `useFormField`; ServerWakeNotice `navOffset`, FieldStrip `pad` and SwipeAction
  `className` / `armedClassName` (0.33). `npx vitest run src/__tests__/deprecations.test.ts
  --silent=false` in the kit prints the list.

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
- **`commit`** on the controls that save on their own (keksdose: one — the budget's inline
  assigned figure; fields behind a commit-locked Save are covered by it). The "25 sites" first
  given here was a grep count (corrected in 0.34.1).
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
- **K4 / K5 overrides go:** `cleared-status-toggle.tsx:330` drops `pt-5
  [&>[role=radiogroup]]:flex` (keep `@3xl:py-0 @3xl:leading-4` at :335: its own `text-sm`
  cancels the kit's 16 px line); `shared/components/date-field.tsx:99` drops
  `[&_button:focus]:ring-1 [&_button:focus]:ring-inset`.
- **`ariaLabel` → `aria-label`** (by 0.35): 24 sites (AmountInput ×15, e.g.
  transaction-fields.tsx:753, budget-cells.tsx:501; TopBarActionMenu account-menu.tsx:365,
  tour-menu.tsx:80; RoleSwitcher top-bar.tsx:94, :117; WizardStepper
  file-import-panel.tsx:72), plus 15 in tests.
- **Refactor waves:** MultiSelect at price-shop-picker.tsx:403 drops `next.map(String)`,
  `values` → `value`, `allLabel` → `labels.all` (its `panelClassName` width is inert now — drop it) and at
  reports-filters.tsx:216 drops `as string[]`; CurrencySelect (×6) and GroupedPicker (×2) get
  the phone sheet; `FeedbackComposer` → `ChatComposer` (features/support/support-thread.tsx; line
  numbers here may have moved — locate by content);
  data-table-pagination.test.tsx:4, :14 `resolveDataTableLabels({…})` →
  `{ ...DEFAULT_DATA_TABLE_LABELS, … }`; `admin-actions-panel.tsx:129`'s wrapper div can go
  (`<Card ref={card}>`); kit-markup money asserts → `text-money-expense` / `text-money-income`
  (report-amount-tones.test's KIT_EXPENSE / KIT_INCOME, investment-history-panel:98,
  reports-page:286-287, food-groups-and-level:247, tax-tab:193, :197, investments-tab:218;
  and food-groups-and-level.test.tsx:192's `.bg-[var(--brand)]` for ProgressBar's fill →
  `bg-brand` — it fails as a TypeError, not an assertion). keksdose has no
  `[var(--money-…)]` left; it uses the unlayered statics (`text-money-pos/-neg/-muted`,
  `bg-money-pos`), which beat the layered `text-money-*` utilities on the same element — swap
  them only together with any other colour class there. The 41 hand-written
  matchMedia stubs can use `stubViewportWidth` from `@eifi1/ui-kit/testing`.

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
- **`commit`** on the controls that save on their own (kastlan: five — the lease tenant share,
  the handover meter reading, the two notification Switches, the operator's two "active"
  Switches). The "21 files" first given here was a grep count (corrected in 0.34.1).
- **Settings title:** `SettingsChrome` keeps its breadcrumb, drops its title effect, passes
  `appName="Kastlan"`.
- **Downloads:** `openAuthenticatedFile` opens a tab rather than saving and stays; a real
  download is `saveBlob` + `filenameFromDisposition(res.headers["content-disposition"])`.
- **server-kit:** `_DUMMY_HASH` → `absent_account_check(hash_password, verify_password)`;
  `kind="deletion"` → `AccountNoticeKind.ACCOUNT_DELETION` (the log word changes to
  `account_deletion`: move a log query or alert with it); the ops router uses
  `Depends(require_jobs_token(lambda: settings.jobs_token))`, settings may inherit
  `JobsSettings` (same 401 and detail); the ports' "Paddle or Lemon Squeezy" wording goes.
- **Removed aliases:** none used. **`ariaLabel` → `aria-label`** (by 0.35): 23 sites
  (NumberField ×4, RhfNumberField ×3, AmountInput ×5, top-bar.tsx:112, :114, :149, …).
- **Refactor waves:** RhfMoneyField, RhfSelect and RhfCheckbox take `commit`; the 49 Rhf
  number and date sites get real focus-on-error (and `setFocus(name, { shouldSelect: true })`
  selects the figure); `align="right"` at top-bar.tsx:149 can go (the default `end` is the same).

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
- **`ariaLabel` → `aria-label`** (by 0.35): 1 site (chrome-controls.tsx:31).
- **Refactor waves:** MultiSelect at hysteresis-compare.tsx:112, kinematics-compare.tsx:109
  and transmission-compare.tsx:250 drops `as number[]`, `values` → `value`, and passes
  `labels={{ search, selectAll, clear, all }}` instead of the string props; slider-field's
  FieldHints print on phones; `align="right"` at account-menu.tsx:138 can go.

## 4. Versions

- **`@eifi1/ui-kit` `^0.34.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.8.0**, the release wheel by URL, with each app's extras and the
  sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.8.0/eifi1_server_kit-0.8.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.8.0/eifi1_server_kit-0.8.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.8.0/eifi1_server_kit-0.8.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `e6a87ea3e5d61772e1ed6d6e5f3126662e4aa8316535cc7d4184958cb328860c`

## Where the build differs from the contracts

- **`AdminOtherTarget` has an optional `id`**, so keksdose's `e.target.id === target` and the
  showcase's filter still compile (now written into user-admin §11.4).
- **The truncation sweep runs in CI on the release PR** (Marcel, 2026-10-12: the repo is
  public, so Actions cost nothing, and it keeps Chromium off the shared machine): the job
  "Truncation sweep (release)" runs for a PR or push that changes `package.json`'s version.
  By hand: `npm run check:sweep` (after `npx playwright-core install chromium-headless-shell`).
  Never in `npm run check`.
