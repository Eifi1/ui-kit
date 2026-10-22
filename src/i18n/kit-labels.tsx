import { createContext, useContext, useEffect, useMemo } from "react";
import {
  DEFAULT_APP_SHELL_LABELS,
  DEFAULT_CALCULATOR_LABELS,
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_FILE_LABELS,
  DEFAULT_MULTI_SELECT_LABELS,
  DEFAULT_PICKER_SHEET_LABELS,
  DEFAULT_SWIPEABLE_ROW_LABELS,
  DEFAULT_TOP_BAR_LABELS,
  formatFileSize,
} from "./shared-labels";
import type { AnchorHTMLAttributes, ReactElement, Ref } from "react";
import type { ReactNode } from "react";
import type { DataTableLabels } from "../components/data-table-labels";
import type { MiniCalendarLabels, WeekDay } from "../components/mini-calendar";
import type { CalendarHeatmapLabels } from "../components/calendar-heatmap";
import type { PopoverLabels } from "../components/popover";
import type { ChipInputLabels } from "../components/chip";
import type { FieldSyncLabels } from "../components/field-sync";
import type { CharacterCountLabels, PasswordRevealLabels } from "../components/field-base";
import type { TabsLabels } from "../components/tabs";
import type { WizardLabels } from "../wizard/types";
import type { TourLabels } from "../tour/tour";
import type { TourCatalogueLabels } from "../tour/tour-catalogue-labels";
import type { CommandPaletteLabels } from "../search/command-palette";
import type { GlobalSearchLabels } from "../search/global-search";
import type { MonthPickerLabels } from "../components/month-picker";
import type { PageContentsLabels } from "../components/page-contents";
import type { SeriesChartLabels } from "../components/series-chart-labels";
import type { PieChartLabels } from "../components/pie-chart-labels";
import type { SparklineLabels } from "../components/sparkline";
import type { StatTileLabels } from "../components/stat-tile";
import type { SignaturePadLabels } from "../components/signature-pad";
import type { PasswordStrengthLabels } from "../components/password-strength";
import type { DangerConfirmLabels } from "../components/danger-confirm";
import type { SwatchPickerLabels } from "../components/swatch-picker";
import type { IconPickerLabels } from "../components/icon-picker";
import type { DialogFrameLabels } from "../components/dialog-frame";
import type { FilePickerLabels } from "../components/file-button";
import type { MeasuredGridLabels } from "../components/measured-grid";
import type { FeedbackAttachmentFieldLabels } from "../feedback/feedback-attachment";
import type { FeedbackDialogTextLabels } from "../feedback/feedback-dialog";
import type { FeedbackComposerLabels, FeedbackThreadLabels } from "../feedback/feedback-thread";
import type {
  FeedbackCategoryLabels,
  FeedbackStatusLabels,
  FeedbackToastLabels,
} from "../feedback/feedback-labels";
import type { FeedbackMenuLabels } from "../feedback/feedback-menu";
import type { FeedbackPublicLabels } from "../feedback/feedback-public-labels";
import type { FeedbackNotificationTypesLabels } from "../notifications/feedback-notification-types-labels";
import type { FeedbackContextLabels } from "../feedback/feedback-context";
import type { FeedbackPageLabels } from "../feedback/feedback-table";
import type { FeedbackDetailLabels } from "../feedback/feedback-row-detail";
import type { FeedbackVoteLabels } from "../feedback/feedback-vote-button";
import type { FeedbackCommentsLabels } from "../feedback/feedback-comment-thread";
import type { FeedbackRepliesLabels } from "../feedback/feedback-replies";
import type { AccountSettingsLabels } from "../account/account-settings-labels";
import type { ConfirmDialogLabels } from "../components/confirm-dialog";
import type { FloatingPanelLabels } from "../components/floating-panel";
import type { CopyButtonLabels } from "../components/copy-button";
import type { BulkActionBarLabels } from "../components/bulk-action-bar";
import type { ListLabels } from "../components/list";
import type { BreadcrumbsLabels } from "../components/breadcrumbs";
import type { ToastLabels } from "../components/toast";
import type { FormActionsLabels } from "../components/form-actions";
import type { DescriptionListLabels } from "../components/description-list";
import type { LineItemsLabels } from "../components/line-items";
import type { ProgressBarLabels } from "../components/progress-bar";
import type { SignedAmountLabels } from "../components/signed-amount";
import type { ErrorBoundaryLabels } from "../components/error-boundary";
import type { AuthedImageLabels } from "../components/authed-image";
import type { ImageGridLabels } from "../components/image-grid";
import type { LightboxLabels } from "../components/lightbox";
import type { WriteLockLabels } from "../components/write-lock";
import type { LegalLabels } from "../components/legal";
import type { SignInLabels } from "../auth/sign-in-form";
import type { RegisterLabels } from "../auth/register-form";
import type { CompleteNameLabels } from "../auth/complete-name-dialog";
import type { ForgotPasswordLabels } from "../auth/forgot-password-form";
import type { ResetPasswordLabels } from "../auth/reset-password-form";
import type { VerifyEmailLabels } from "../auth/verify-email";
import type { NotFoundLabels } from "../auth/not-found-page";
import type { AcceptInvitationLabels } from "../auth/accept-invitation";
import type { CompanySwitcherLabels } from "../shell/company-switcher";
import type { EmailChangeLabels } from "../account/email-change-setting";
import type { SessionsLabels } from "../account/sessions-setting";
import type { DeleteAccountLabels } from "../account/delete-account-setting";
import type { DataExportLabels } from "../account/data-export-setting";
import type { UserRosterLabels } from "../admin/user-roster";
import type { RoleSelectLabels } from "../admin/role-select";
import type { ReviewerScopeLabels } from "../admin/reviewer-scope-editor";
import type { AdminActionLabels } from "../admin/admin-action-confirm";
import type { AdminActionLogLabels } from "../admin/admin-action-log";
import type { TransferOwnershipLabels } from "../admin/transfer-ownership-dialog";
import type { InvitationsLabels } from "../admin/invitations-panel";
import type { SettingsLabels } from "../settings/settings-labels";
import type { LandingLabels } from "../landing/landing-labels";
import type { DemoLabels } from "../demo/demo-labels";
import type { BillingLabels } from "../billing/billing-labels";
import type { PlanChangeLabels } from "../admin/plan-change";
import type { AppearanceLabels } from "../components/appearance-labels";
import type { DeviceResetLabels } from "../settings/device-reset-setting";
import type { RowActionsLabels } from "../components/row-actions";
import type { AppShellMoreLabels } from "../shell/app-shell";
import type { AccountStateLabels } from "../components/account-chips";
import type { ShareCardLabels } from "../components/share-card";
import type { ReauthDialogLabels } from "../components/reauth-dialog";
import type { ServerWakeLabels } from "../components/server-wake";
import type { TranslationReviewLabels } from "../components/translation-review-labels";
import type { CountrySelectLabels } from "../components/country-select";
import type { InlineEditLabels } from "../components/inline-edit-field";
import type { IbanInputLabels } from "../components/iban-input";
import type { PhoneInputLabels } from "../components/phone-input";
import type { SignChipLabels } from "../components/sign-chip";
import type { ColumnMapperLabels } from "../components/column-mapper";
import type { NotificationsLabels } from "../notifications/notifications-labels";
import type { AdminAreaLabels } from "../admin/admin-area-labels";
import type { MailTestCardLabels } from "../admin/mail-test-card";
import type { TopBarPartsLabels } from "../shell/top-bar-parts-labels";
import type { SignOutPendingDialogLabels } from "../offline/sign-out-pending-dialog";
import type { PwaUpdatePromptLabels } from "../offline/pwa-update-prompt";
import type { SharedComputerLabels } from "../offline/shared-computer";

/**
 * EVERY string the kit renders, as one typed tree — and an optional provider that
 * hands it to every component at once.
 *
 * WHY THIS EXISTS. The kit renders only labels; it ships seven catalogues (since 0.7.0,
 * `@eifi1/ui-kit/i18n/<code>`); the app decides the language and hands the words in.
 * What was wrong was HOW it had to hand them in —
 * one `labels` prop per component instance, under a different prop name per
 * component (`labels`, `calendarLabels`, `passwordLabels`, `clearLabel`,
 * `searchPlaceholder`, `ariaLabel` …). A translated app therefore rendered English
 * wherever one call site forgot one prop, and nothing told it so: a German showcase
 * still said "Rows per page", "Collapse sidebar" and "Popover" in seven languages.
 *
 * Now there is one key per string, addressed by a dot path (`dataTable.pageSize`,
 * `datePicker.today`), and three sources in a fixed order of precedence:
 *
 *     the component's own prop   >   <UiKitProvider labels>   >   English default
 *
 * A consumer loads a shipped catalogue (`loadUiKitLabels(code)`) or writes its own
 * `UiKitLabels` (or a partial of one), mounts `<UiKitProvider labels={…} locale={…}>`
 * at the root, and every kit component
 * below speaks that language — including the ones nested inside other kit components
 * (the calendar inside the data table's date filter, the popover inside the date
 * picker), which no prop at the outer call site could reach before.
 *
 * Messages that carry a value are FUNCTIONS of that value, never a template to fill:
 * a number glued into an English sentence is untranslatable, because the grammar
 * around it moves with it in most languages.
 */

/* ── Namespaces that had no labels type of their own ─────────────────────── */

/** The words several components share. A component's own namespace wins over these
 *  where both exist; these are what a new component reaches for first. */
export interface CommonLabels {
  close: string;
  clear: string;
  search: string;
  done: string;
  cancel: string;
  save: string;
  back: string;
  next: string;
  remove: string;
  loading: string;
  noResults: string;
  /** "Name: value" — how a field's accessible name is composed with its value.
   *  A colon-and-space is not universal punctuation (French puts a space before
   *  the colon, Chinese uses a full-width one). */
  fieldValue: (field: string, value: string) => string;
  /** The × that puts away a banner or a notice (`AlertBanner onDismiss`). Not `close`:
   *  nothing opened, and "Close" on a banner reads as closing the page it sits on. */
  dismiss: string;
  /** Read after a link that opens a new tab (`<Button href external>`, TextLink):
   *  nothing else tells a screen reader the page is about to change tabs. */
  opensInNewTab: string;
  /** The name of a field's `help` "?" and its panel (round 0.36): "About “<field>”", the
   *  field's label as the argument, quoted so a capitalised label reads as a name — "About
   *  “Jerk shape”" (round 0.37; the other locales quoted it already). A `HelpPopover`
   *  passed as `help` keeps its own name. */
  aboutField: (field: string) => string;
  /** …and of a `help` "?" on a field with no label and no `aria-label` to name it by. */
  help: string;
  /** 0.48: the toggle that shows the rest of a clamped text (`AlertBanner clampMobile`)… */
  showMore: string;
  /** …and folds it back to its one line. */
  showLess: string;
}

/** `DatePicker` / `DateRangePicker` chrome. The calendar inside has its own
 *  namespace, `miniCalendar`. */
export interface DatePickerLabels {
  /** Accessible name of the popover panel the calendar opens in. */
  panel: string;
  /** The same, for `DateRangePicker`'s panel. */
  rangePanel: string;
  clear: string;
  previousDay: string;
  nextDay: string;
  today: string;
  /** `DateRangePicker commit="apply"`: the button that commits the drafted range. */
  apply: string;
  /** …and the one that discards it. */
  cancel: string;
  /** Accessible name of `DateRangePicker`'s preset column. */
  presets: string;
}

/** The whole combobox family: `Combobox`, `EntityCombobox`,
 *  `MultiEntityCombobox`, `InlineEntityCombobox`, `Autocomplete`. */
export interface ComboboxLabels {
  search: string;
  noResults: string;
  clear: string;
  loading: string;
  /** The "add this" row when free entry is allowed. */
  create: (query: string) => string;
  /** Trigger summary once more than one value is picked. */
  selectedCount: (count: number) => string;
  /** An async lookup (`loadOptions`) failed. */
  loadError: string;
  /** Announced (live region) when the list settles on `count` > 0 rows. */
  resultCount: (count: number) => string;
  /** The query is shorter than the `minChars` a lookup needs. */
  minChars: (count: number) => string;
}

export interface MultiSelectLabels {
  search: string;
  selectAll: string;
  clear: string;
  /** Trigger text when nothing is picked, which a multi-select reads as "all". */
  all: string;
  /** Trigger summary once some (but not all) values are picked. The English
   *  default is the bare count, which is what the trigger has always shown. */
  selectedCount: (count: number) => string;
}

/** `CalculatorButton` (desktop popover keypad) and `NumberPadSheet` (phone sheet). */
export interface CalculatorLabels {
  /** The button that opens the calculator. */
  open: string;
  /** The popover / sheet itself. */
  panel: string;
  calculation: string;
  backspace: string;
  clear: string;
  equals: string;
  /** The primary key of the phone pad — visible text, not an aria-label. */
  done: string;
  /** Names of the operator keys and the decimal key. Their glyphs are not names a
   *  screen reader agrees on — "÷" is read as "division sign", "divided by" or
   *  nothing at all depending on the reader — so each says what it does. */
  plus: string;
  minus: string;
  times: string;
  divide: string;
  decimal: string;
}

/** `CurrencySelect` and the currency half of `AmountInput`. */
export interface CurrencyLabels {
  currency: string;
  search: string;
}

export interface AppShellLabels {
  collapse: string;
  expand: string;
  /** Accessible name of an inline group's disclosure button (`subNav="inline"`). */
  toggleGroup: (groupLabel: string) => string;
}

export interface TopBarLabels {
  theme: string;
  palette: string;
  language: string;
  /** 0.49 KIT-10: the language menu's trigger, given the current language's name —
   *  "Choose language, current: Deutsch". */
  languageCurrent: (name: string) => string;
  switchRole: string;
  /** The role switcher's tooltip, given the active role's name. */
  role: (value: string) => string;
}

export interface PickerSheetLabels {
  close: string;
  /** The sticky footer button that closes a multi-select sheet once the rows are ticked
   *  (0.40) — the ticks are already applied, so it confirms rather than saves. */
  done: string;
}

export interface SwipeableRowLabels {
  actions: string;
}

export interface FileLabels {
  /** A file size for display, given its size in BYTES. The default uses
   *  `Intl.NumberFormat`'s unit formatting in the provider's locale. */
  size: (bytes: number) => string;
}

/** The complete tree. `UiKitProvider` takes any partial of it. */
export interface UiKitLabels {
  common: CommonLabels;
  dataTable: DataTableLabels;
  miniCalendar: MiniCalendarLabels;
  calendarHeatmap: CalendarHeatmapLabels;
  datePicker: DatePickerLabels;
  monthPicker: MonthPickerLabels;
  popover: PopoverLabels;
  combobox: ComboboxLabels;
  multiSelect: MultiSelectLabels;
  calculator: CalculatorLabels;
  currency: CurrencyLabels;
  chipInput: ChipInputLabels;
  fieldSync: FieldSyncLabels;
  passwordReveal: PasswordRevealLabels;
  tabs: TabsLabels;
  appShell: AppShellLabels;
  pageContents: PageContentsLabels;
  topBar: TopBarLabels;
  pickerSheet: PickerSheetLabels;
  swipeableRow: SwipeableRowLabels;
  file: FileLabels;
  wizard: WizardLabels;
  tour: TourLabels;
  /** 0.43.0: the tours page — `TourCatalogue` and its card (docs/tours-harmonization.md §3). */
  tourCatalogue: TourCatalogueLabels;
  commandPalette: CommandPaletteLabels;
  globalSearch: GlobalSearchLabels;
  seriesChart: SeriesChartLabels;
  pieChart: PieChartLabels;
  sparkline: SparklineLabels;
  statTile: StatTileLabels;
  signaturePad: SignaturePadLabels;
  passwordStrength: PasswordStrengthLabels;
  dangerConfirm: DangerConfirmLabels;
  swatchPicker: SwatchPickerLabels;
  iconPicker: IconPickerLabels;
  dialogFrame: DialogFrameLabels;
  filePicker: FilePickerLabels;
  measuredGrid: MeasuredGridLabels;
  feedbackAttachment: FeedbackAttachmentFieldLabels;
  /** 0.12.0: `FeedbackDialog`'s own strings; `FeedbackThread` / `FeedbackComposer`. */
  feedbackDialog: FeedbackDialogTextLabels;
  feedbackThread: FeedbackThreadLabels;
  feedbackComposer: FeedbackComposerLabels;
  /** 0.27.0: the feedback harmonisation (docs/feedback-harmonization.md §4) — a report's
   *  status and category words, keyed by the enum value; the toasts a feedback page
   *  shows; `FeedbackMenu`; `FeedbackContextBox`; the two pages' table; the row detail.
   *  keksdose's wording is the canon, in every language. */
  feedbackStatus: FeedbackStatusLabels;
  feedbackCategory: FeedbackCategoryLabels;
  feedbackToast: FeedbackToastLabels;
  feedbackMenu: FeedbackMenuLabels;
  /** 0.38.0: the public feedback pages — `FeedbackPublicList`, `FeedbackPublicDetail`,
   *  `FeedbackPublicSwitch` (docs/feedback-harmonization.md §9.15). */
  feedbackPublic: FeedbackPublicLabels;
  /** 0.38.0: `useFeedbackNotificationTypes` — the two feedback types' setting words
   *  (§9.11). */
  feedbackNotificationTypes: FeedbackNotificationTypesLabels;
  feedbackContext: FeedbackContextLabels;
  feedbackPage: FeedbackPageLabels;
  feedbackDetail: FeedbackDetailLabels;
  /** 0.38.0: public feedback (docs/feedback-harmonization.md §9.15) — the vote button,
   *  the comment thread, the replies' timeline and composer. */
  feedbackVote: FeedbackVoteLabels;
  feedbackComments: FeedbackCommentsLabels;
  feedbackReplies: FeedbackRepliesLabels;
  /** 0.12.0: `ProfileSetting`, `PasswordSetting`, `TwoFactorSetting`, `PasskeysSetting`
   *  — one record per section. The provider takes a whole section record; the
   *  components merge it key by key, as a prop. */
  accountSettings: AccountSettingsLabels;
  confirmDialog: ConfirmDialogLabels;
  floatingPanel: FloatingPanelLabels;
  copyButton: CopyButtonLabels;
  bulkActionBar: BulkActionBarLabels;
  list: ListLabels;
  breadcrumbs: BreadcrumbsLabels;
  toast: ToastLabels;
  form: FormActionsLabels;
  descriptionList: DescriptionListLabels;
  lineItems: LineItemsLabels;
  progressBar: ProgressBarLabels;
  signedAmount: SignedAmountLabels;
  errorBoundary: ErrorBoundaryLabels;
  authedImage: AuthedImageLabels;
  imageGrid: ImageGridLabels;
  lightbox: LightboxLabels;
  /** 0.18.0: `WriteLockProvider`'s fallback reason, `AccountStateChip`, `SharePanel` /
   *  `ShareCard` / `ShareDialog`, `ReauthDialog`. */
  writeLock: WriteLockLabels;
  accountState: AccountStateLabels;
  shareCard: ShareCardLabels;
  reauthDialog: ReauthDialogLabels;
  /** 0.18.0: `ServerWakeNotice` — keksdose's cold-start notice, for every app. */
  serverWake: ServerWakeLabels;
  /** 0.19.0: the translation-review parts (`TranslationReviewPanel`, its editor, chip,
   *  progress, locale tabs and export) — keksdose's /translations, for every app. */
  translationReview: TranslationReviewLabels;
  /** 0.19.0: `LegalLinks`' navigation name. 0.28.0: every kit-owned word of the legal
   *  pages — the link labels, titles, back link, terms checkbox and notices, and the
   *  sections that are the same in every app, filled in with the app's operator
   *  (docs/legal-harmonization.md §4.3/§4.4). */
  legal: LegalLabels;
  /** 0.29.0: sign-in form: credentials, passkey, 2FA, forced new password (docs/auth-harmonization.md §5). */
  signIn: SignInLabels;
  /** 0.29.0: the sign-up form, with the +app address tag (§4.1, §4.5). */
  register: RegisterLabels;
  /** 0.29.0: asking a migrated account for first and last name once (§3.3). */
  completeName: CompleteNameLabels;
  /** 0.29.0: requesting a reset link (always the same answer). */
  forgotPassword: ForgotPasswordLabels;
  /** 0.29.0: choosing a new password from a reset link; not a sign-in (§6.3). */
  resetPassword: ResetPasswordLabels;
  /** 0.29.0: the verify-email page and the unverified banner. */
  verifyEmail: VerifyEmailLabels;
  /** 0.29.0: the 404 page. */
  notFound: NotFoundLabels;
  /** 0.29.0: accepting an invitation with an account (§4.4). */
  acceptInvitation: AcceptInvitationLabels;
  /** 0.29.0: kastlan's switcher between a user's companies (§5.3). */
  companySwitcher: CompanySwitcherLabels;
  /** 0.30.0: changing the account's address with re-verification (docs/user-admin-harmonization.md §6.2). */
  emailChange: EmailChangeLabels;
  /** 0.30.0: sign out everywhere, and kastlan's device list (§6.3). */
  sessions: SessionsLabels;
  /** 0.30.0: deletion in two stages (§6.4). */
  deleteAccount: DeleteAccountLabels;
  /** 0.30.0: the self-service JSON export (§6.5). */
  dataExport: DataExportLabels;
  /** 0.30.0: the admin user list's columns (§3). */
  userRoster: UserRosterLabels;
  /** 0.30.0: picking one or several roles, with the reasons a choice is locked (§4.1). */
  roleSelect: RoleSelectLabels;
  /** 0.30.0: a translation reviewer's languages and areas. */
  reviewerScope: ReviewerScopeLabels;
  /** 0.30.0: an admin action's confirmation and refusals (§4.2). */
  adminAction: AdminActionLabels;
  /** 0.30.0: the admin_actions list (§4.3). */
  adminActionLog: AdminActionLogLabels;
  /** 0.30.0: handing an account's work to another (Kurvenschmiede). */
  transferOwnership: TransferOwnershipLabels;
  /** 0.30.0: the invitations panel (§5). */
  invitations: InvitationsLabels;
  /** 0.31.0: the settings and admin pages' shell (docs/settings-harmonization.md §4.3). */
  settings: SettingsLabels;
  /** 0.31.0: the public landing page's kit words (docs/landing-demo-harmonization.md §4). */
  landing: LandingLabels;
  /** 0.31.0: the demo's start, banner and end (§5). */
  demo: DemoLabels;
  /** 0.32.0: plans, standing, banners and the limit notice (docs/billing-harmonization.md §7). */
  billing: BillingLabels;
  /** 0.33.0: the operator's plan parts — `planColumn`, `PlanChangeConfirm` and the
   *  lines of `usePlanChangeResult` (docs/billing-harmonization.md §14.12). */
  planChange: PlanChangeLabels;
  /** 0.32.0: the text-size and contrast settings (docs/text-size-harmonization.md §6). */
  appearance: AppearanceLabels;
  /** 0.36.0: resetting this device's settings, the appearance group's last card
   *  (docs/settings-harmonization.md §11.3). */
  deviceReset: DeviceResetLabels;
  /** 0.32.0: a row's actions folded into a "⋯" menu at Large (text size §10.8). */
  rowActions: RowActionsLabels;
  /** 0.32.0: the phone bar's "More" cell and sheet (text size §10.7). */
  appShellMore: AppShellMoreLabels;
  /** 0.22.0: the screen-reader words of `Input` / `Textarea`'s `showCount` counter. */
  characterCount: CharacterCountLabels;
  /** 0.22.0: `CountrySelect`. Its list's "no results" and counts are `combobox`'s. */
  countrySelect: CountrySelectLabels;
  /** 0.22.0: `InlineEditField` — keksdose K9. */
  inlineEdit: InlineEditLabels;
  /** 0.22.0: `IbanInput`'s messages, one per problem. */
  ibanInput: IbanInputLabels;
  /** 0.22.0: `PhoneInput`'s country-code select. */
  phoneInput: PhoneInputLabels;
  /** 0.22.0: `SignChip` — the outflow / inflow toggle beside an amount. */
  signChip: SignChipLabels;
  /** 0.23.0: `ColumnMapper` / `ColumnRoleTable` — a pasted or dropped table, a role per
   *  column. */
  columnMapper: ColumnMapperLabels;
  /** 0.36.0: the notification cards — the types, quiet hours and the zone picker, this
   *  device's push, the device list, and the unsubscribe page
   *  (docs/notifications-harmonization.md §4.2). */
  notifications: NotificationsLabels;
  /** 0.42.0: the admin area's shared words — the account menu's "Administration" row, the
   *  403 page, the shared sections, the overview's tiles and the Tools list
   *  (docs/admin-harmonization.md §3.1). */
  adminArea: AdminAreaLabels;
  /** 0.42.0: the top bar's shared parts — `TourMenu`, `SyncStatusIndicator`, `DevSwitchers`
   *  (docs/top-bar-harmonization.md §3.1). */
  topBarParts: TopBarPartsLabels;
  /** 0.45.0: "Send a test mail to me" (docs/admin-harmonization.md §9.2.4). */
  mailTestCard: MailTestCardLabels;
  /** 0.45.0: the sign-out question while changes wait to sync (`@eifi1/ui-kit/offline`,
   *  docs/local-first-harmonization.md §1.6). */
  signOutPending: SignOutPendingDialogLabels;
  /** 0.45.0: the service-worker update toast (local-first §1.5 D8). */
  pwaUpdate: PwaUpdatePromptLabels;
  /** 0.45.0: "This is a shared computer" on the sign-in form (local-first §1.5 D6). */
  sharedComputer: SharedComputerLabels;
}

/**
 * A label override, as deep as the labels go: an object of labels (a namespace, or a
 * record inside one such as `accountSettings.passkeys` or `dataTable.presets`) may be
 * partial at every level, because the provider merges it key by key at every level.
 * A leaf stays as it is: a string, a function-valued label (`(n) => …`), and anything
 * that is not purely an object (a `ReactNode` union) is given whole.
 */
export type LabelOverride<T> = [T] extends [(...args: never[]) => unknown]
  ? T
  : [T] extends [readonly unknown[]]
    ? T
    : [T] extends [object]
      ? { [K in keyof T]?: LabelOverride<T[K]> }
      : T;

/** Any subset of the tree — each namespace may be partial, and so may any record
 *  inside one (`accountSettings.passkeys`, `dataTable.presets`): they are merged key
 *  by key, at every depth. */
export type UiKitLabelOverrides = { [K in keyof UiKitLabels]?: LabelOverride<UiKitLabels[K]> };

/* ── English defaults for the namespaces defined here ────────────────────── */

// They live in ./shared-labels, a module of words, as every component's defaults live in
// its `*-labels.ts` (round 0.34). Imported and exported as this module's own, as each
// component does with its defaults: the names, and where the README lists them, stay.
export {
  DEFAULT_APP_SHELL_LABELS,
  DEFAULT_CALCULATOR_LABELS,
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_FILE_LABELS,
  DEFAULT_MULTI_SELECT_LABELS,
  DEFAULT_PICKER_SHEET_LABELS,
  DEFAULT_SWIPEABLE_ROW_LABELS,
  DEFAULT_TOP_BAR_LABELS,
  formatFileSize,
};

/* ── The provider ────────────────────────────────────────────────────────── */

interface KitI18n {
  labels?: UiKitLabelOverrides;
  locale?: string;
  weekStartsOn?: WeekDay;
  linkComponent?: KitLinkComponent;
  chartTooltipPlacement?: ChartTooltipPlacement;
  formatDate?: KitDateFormatter;
  tableStorageKeyPrefix?: string;
  timeZone?: string;
  documentTitleFormat?: string;
  appName?: string;
}

/** What a {@link KitDateFormatter} is told about the date it is formatting. */
export interface KitDateFormatContext {
  /**
   * How much of a date the string is: `"day"` — the `iso` is `"YYYY-MM-DD"`; `"month"` —
   * `"YYYY-MM"` (a `MonthPicker`); `"year"` — `"YYYY"` (`MonthPicker mode="year"`).
   */
  unit: "day" | "month" | "year";
  /** Which kit surface asks: the trigger of a `DatePicker`, of a `DateRangePicker`
   *  (called once per end), of a `MonthPicker`, or a `DateMark`. */
  source: "datePicker" | "dateRangePicker" | "monthPicker" | "dateMark";
  /** The locale the kit would have formatted in — the component's `locale` prop, else
   *  the provider's — or `undefined` for the runtime's. */
  locale: string | undefined;
  /**
   * The kit's suggestion: whether this date stands alone where the day of the week
   * helps — `true` for a `DatePicker`'s trigger and a `DateMark`, `false` for the two
   * ends of a range (twice the width, in a sentence-like "from – to") and for a month
   * or a year. keksdose's rule, which this follows: *"A date in a COLUMN carries the
   * weekday. A date in a SENTENCE does not."* (date-cell.tsx, dev#546). A formatter
   * is free to ignore it.
   */
  weekday: boolean;
}

/**
 * The app's ONE answer to "what does a date look like here" — keksdose K12. Returns the
 * text for an ISO date (see {@link KitDateFormatContext.unit} for the three shapes).
 * Return `""` to fall back to the kit's own formatting for that date.
 */
export type KitDateFormatter = (iso: string, context: KitDateFormatContext) => string;

/** Where a chart shows the values under the pointer — see `SeriesChartTooltip.placement`. */
export type ChartTooltipPlacement = "cursor" | "above" | "below" | "auto";

/**
 * What every kit link receives: the anchor attributes the kit decided (href, class,
 * aria-current, handlers, children, ref). An app's router link maps them —
 * `({ href, ...p }) => <Link to={href} {...p} />` — ONCE, on the provider.
 *
 * `replace` is the one prop that is not an anchor attribute: see there. Map it
 * explicitly if your router link is not react-router's —
 * `({ href, replace, ...p }) => <Link to={href} replace={replace} {...p} />` — and never
 * spread it onto a DOM `<a>`, where React warns about an unknown attribute.
 */
export type KitLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
  /**
   * Navigate by REPLACING the current history entry, so Back skips it — keksdose F1:
   * a one-shot URL (a magic-link landing, `?checkout=done`, a wizard's "finish" hop)
   * that must not come back when the user presses Back. Present ONLY when the kit link
   * was given `replace` (`true`), so a provider link that spreads its props onto a
   * plain `<a>` keeps working for every link that never asks for it. react-router's
   * `<Link>` takes the same prop, so `({ href, ...p }) => <Link to={href} {...p} />`
   * honours it with no change; any other router maps it to its own replace option.
   * The kit never puts it on a DOM element itself.
   */
  replace?: boolean;
};
export type KitLinkComponent = (props: KitLinkProps) => ReactElement;

const KitI18nContext = createContext<KitI18n>({});

export interface UiKitProviderProps {
  /** Any part of {@link UiKitLabels}. Missing keys fall back to English. */
  labels?: UiKitLabelOverrides;
  /**
   * BCP 47 tag used by every kit component that formats something — dates, numbers,
   * month and weekday names, file sizes — when it is not handed a `locale` prop of
   * its own. Without a provider, and without a prop, those use the runtime default.
   */
  locale?: string;
  /**
   * The first day of the week (0 = Sunday, 1 = Monday …) for every calendar below —
   * `MiniCalendar` and the pickers built on it — that is not handed a `weekStartsOn`
   * of its own. Without it the week start follows `locale`'s week info.
   *
   * Separate from `locale` because the two are separate decisions: a German-built
   * app running in English (`locale="en"`) would otherwise start its weeks on Sunday,
   * and switching it to `en-GB` to get Monday changes every date and number format.
   */
  weekStartsOn?: WeekDay;
  /**
   * The app's router link, used by every kit component that renders an in-app link
   * and was not handed its own `renderLink` — so `renderLink` stops being repeated on
   * each ListItem, Breadcrumbs, StatTile, Chip… (kastlan). A component's own
   * `renderLink` wins; external links and in-page `#anchor`s stay plain `<a>`, and a
   * hash-router `#/path` is handed to it like `/path` (see `pickLinkRenderer`).
   */
  linkComponent?: KitLinkComponent;
  /**
   * Where every `SeriesChart` below shows its tooltip when it does not say so itself
   * (`tooltip.placement`) — set once so an app's phone charts stop putting the box under
   * the reader's finger (keksdose #359). Default: `"cursor"`, the box that follows the
   * pointer, as before.
   */
  chartTooltipPlacement?: ChartTooltipPlacement;
  /**
   * How every kit date below is written, when the component is not told otherwise —
   * keksdose K12. keksdose has a date-format preference (Settings ▸ date format, feedback
   * #180) that is not the UI language, and a weekday in the UI language beside digits
   * in the preference's order (live #246, dev#546): two locales in one string, which
   * no `locale` + `Intl` options can say. Its `DateField` wraps every `DatePicker` to
   * pass `formatValue`, and its report range field formats both ends by hand; with this
   * set once on the provider, those wrappers thin to nothing.
   *
   * Used for the trigger text of `DatePicker`, `DateRangePicker` and `MonthPicker`
   * (month and year mode), and for `DateMark display="date"`. A component's own
   * `formatValue` or `formatOptions` (`dateStyle` on a DateMark) wins: prop >
   * provider > the kit's `Intl` default, the order every kit setting resolves in. Left
   * out (or returning `""`), everything formats exactly as before.
   *
   * Keep it stable (`useCallback`, or a module function): it is in the provider's
   * context value, so a new function every render re-renders every consumer.
   */
  formatDate?: KitDateFormatter;
  /**
   * The `localStorage` prefix every kit table below keeps its view under (sort, filters,
   * page size, widths, hidden columns), when the table is not handed a
   * `storageKeyPrefix` of its own — round 0.34 C5, KS U4. Left out, it is the kit's
   * `"hbui-table:"`, as before.
   *
   * Set once here rather than per table because not every table is the app's to pass a
   * prop to: `TranslationReviewPanel` wraps a `DataTable`, and until this the panel's
   * view landed under the kit's prefix whatever the app's was — so an app that lists
   * what it stores (a privacy page) had to list the kit's prefix as a key of its own.
   * Resolves like every kit setting: the table's own prop > this > the default. The
   * key is the prefix plus the table's `storageKey`, verbatim, so an app that wrapped
   * `DataTable` to pass its prefix (Keksdose's `keksdose-table:`) keeps every stored
   * view when it moves the prefix here.
   */
  tableStorageKeyPrefix?: string;
  /**
   * 0.46 (docs/notifications-harmonization.md §10.3): the IANA zone ("Europe/Zurich") every
   * TIMESTAMP below is shown in through `useKitFormat().formatDate` /
   * `formatRelativeTime`, when the call names none — the account's picked zone, for an app
   * that shows times in it. A bare "YYYY-MM-DD" is never shifted (a calendar day is the day
   * it names in every zone). Left out, timestamps follow the device, as before.
   */
  timeZone?: string;
  /**
   * 0.49 KIT-9: how `useDocumentTitle` and every `PageHeader`'s `h1` write the window's
   * title, from `{page}`, `{section}` and `{app}`. Default
   * `"{page} · {section} · {app}"` (`DEFAULT_DOCUMENT_TITLE_FORMAT`); a missing part
   * drops with its separator.
   */
  documentTitleFormat?: string;
  /** 0.49 KIT-9: the app's name, the `{app}` of the window's title ("Kastlan"). Left
   *  out, titles end at the page or section. */
  appName?: string;
  /**
   * 0.49 KIT-1b: while a person copies a selection in the page, a U+2212 minus standing
   * before a number ("−CHF 1,250.50") goes to the clipboard as "-", in `text/plain` and
   * `text/html` (what Excel pastes), so a spreadsheet reads a number; the page keeps "−".
   * A copy out of an input, a textarea or an editable element is left alone. Installed
   * once per document, by the first provider that has it on. Default `true`; `false` on
   * the outermost provider leaves the clipboard to the browser.
   */
  copyAsciiMinus?: boolean;
  children: ReactNode;
}

/**
 * Hand every kit component below this point its strings and its locale.
 *
 * Optional: a component outside any provider behaves exactly as it did before the
 * provider existed. Nesting works as a merge — an inner provider overrides only what
 * it names, so a page can re-label one table's `dataTable.table` without restating
 * the language.
 */
export function UiKitProvider({
  labels,
  locale,
  weekStartsOn,
  linkComponent,
  chartTooltipPlacement,
  formatDate,
  tableStorageKeyPrefix,
  timeZone,
  documentTitleFormat,
  appName,
  copyAsciiMinus = true,
  children,
}: UiKitProviderProps) {
  const outer = useContext(KitI18nContext);
  const value = useMemo<KitI18n>(
    () => ({
      locale: locale ?? outer.locale,
      weekStartsOn: weekStartsOn ?? outer.weekStartsOn,
      labels: mergeOverrides(outer.labels, labels),
      linkComponent: linkComponent ?? outer.linkComponent,
      chartTooltipPlacement: chartTooltipPlacement ?? outer.chartTooltipPlacement,
      formatDate: formatDate ?? outer.formatDate,
      tableStorageKeyPrefix: tableStorageKeyPrefix ?? outer.tableStorageKeyPrefix,
      timeZone: timeZone ?? outer.timeZone,
      documentTitleFormat: documentTitleFormat ?? outer.documentTitleFormat,
      appName: appName ?? outer.appName,
    }),
    [
      outer,
      labels,
      locale,
      weekStartsOn,
      linkComponent,
      chartTooltipPlacement,
      formatDate,
      tableStorageKeyPrefix,
      timeZone,
      documentTitleFormat,
      appName,
    ],
  );
  useTableViewsJoin(value.tableStorageKeyPrefix ?? DEFAULT_TABLE_STORAGE_KEY_PREFIX);
  useClipboardMinus(copyAsciiMinus);
  return <KitI18nContext.Provider value={value}>{children}</KitI18nContext.Provider>;
}

/** The kit's own table prefix: `DEFAULT_PERSIST_PREFIX` of components/use-table-state,
 *  restated because that module imports the router (a test pins the two equal). */
const DEFAULT_TABLE_STORAGE_KEY_PREFIX = "hbui-table:";

/**
 * Reset this device's settings (docs/settings-harmonization.md §11.4): the tables below a
 * provider keep their views under its prefix, so the provider joins the registry with
 * that prefix — a view, no `reset`, since a table reads its view when it next mounts —
 * while it is mounted. Nested providers with one prefix hold one entry.
 *
 * Through a literal `import()`, not a static import: every catalogue reaches this module,
 * and a catalogue may reach nothing outside i18n/ (scripts/check-module-graph.mjs,
 * english-catalogue-graph.test.ts). The theme stores and the shell import the registry
 * statically, so it is loaded already and the join lands a microtask after the mount.
 */
function useTableViewsJoin(prefix: string): void {
  useEffect(() => {
    let leave: (() => void) | undefined;
    let gone = false;
    import("../lib/device-settings").then(
      ({ registerDeviceSetting }) => {
        if (!gone) leave = registerDeviceSetting({ key: prefix, prefix: true, kind: "view" });
      },
      // A module of the kit's own that fails to load has nothing to join; the provider
      // and its tables work as before.
      () => undefined,
    );
    return () => {
      gone = true;
      leave?.();
    };
  }, [prefix]);
}

/**
 * The copy handler (lib/clipboard-minus, 0.49 KIT-1b), through a literal `import()` for
 * the reason {@link useTableViewsJoin} gives: a catalogue may reach nothing outside i18n/.
 * It is in place a microtask after the mount — long before a person selects and copies.
 */
function useClipboardMinus(on: boolean): void {
  useEffect(() => {
    if (!on || typeof document === "undefined") return;
    let uninstall: (() => void) | undefined;
    let gone = false;
    import("../lib/clipboard-minus").then(
      ({ installClipboardMinus }) => {
        if (!gone) uninstall = installClipboardMinus(document);
      },
      // Not loaded: copying works as the browser does it.
      () => undefined,
    );
    return () => {
      gone = true;
      uninstall?.();
    };
  }, [on]);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A record of labels to merge into — not a React element, which is an object too but
 *  is a label given whole. */
function isLabelRecord(v: unknown): v is Record<string, unknown> {
  return isRecord(v) && !("$$typeof" in v);
}

/** Merged key by key at EVERY depth — a namespace, a record inside it
 *  (`accountSettings.passkeys`, `dataTable.presets`), and so on down — to match
 *  {@link LabelOverride}. An `undefined` is skipped at every depth, so it never blanks
 *  out what is under it. */
function mergeNamespace<T extends object>(base: T, over: LabelOverride<T> | Partial<T> | undefined): T {
  if (!over) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    const prev = out[k];
    out[k] = isLabelRecord(prev) && isLabelRecord(v) ? mergeNamespace(prev, v) : v;
  }
  return out as T;
}

function mergeOverrides(
  a: UiKitLabelOverrides | undefined,
  b: UiKitLabelOverrides | undefined,
): UiKitLabelOverrides | undefined {
  if (!a) return b;
  if (!b) return a;
  const out: Record<string, unknown> = { ...a };
  for (const [ns, v] of Object.entries(b)) {
    out[ns] = mergeNamespace((out[ns] as object | undefined) ?? {}, v as object);
  }
  return out as UiKitLabelOverrides;
}

/**
 * What the nearest provider says about one namespace — `undefined` outside one. Nested
 * providers' words come merged, at every depth; no English default is filled in.
 *
 * A {@link LabelOverride}, partial at every depth, like the components' `labels` props
 * that take it: a provider that names one key of a section (`accountSettings.passkeys`)
 * or one preset (`dataTable.presets`) hands over just that (round 0.35 R3 — until then
 * it was typed partial at the top only, so a nested section read as complete).
 *
 * For a component whose own resolver does more than a merge (the data table derives
 * `columnsCount` from `columns`): merge the component's prop over it — a record key by
 * key — and feed the result to that resolver.
 */
export function useKitLabelOverrides<K extends keyof UiKitLabels>(
  ns: K,
): LabelOverride<UiKitLabels[K]> | undefined {
  return useContext(KitI18nContext).labels?.[ns];
}

/**
 * One namespace, resolved: `defaults`, then the provider, then the component's own
 * `prop`. Record-valued keys are merged key by key at each step — so `prop` is a
 * {@link LabelOverride}, partial at every depth as the provider's labels are, and a
 * component's `labels` prop, typed the same, is handed over without a cast (refactor
 * audit 2026-10, API-9).
 */
export function useKitLabels<K extends keyof UiKitLabels>(
  ns: K,
  defaults: UiKitLabels[K],
  prop?: LabelOverride<UiKitLabels[K]>,
): UiKitLabels[K] {
  const fromProvider = useKitLabelOverrides(ns);
  return useMemo(
    () => mergeNamespace(mergeNamespace(defaults, fromProvider), prop),
    [defaults, fromProvider, prop],
  );
}

/** The component's own `locale` prop, else the provider's, else `undefined` (which
 *  every `Intl` API reads as "the runtime's default"). */
export function useKitLocale(prop?: string): string | undefined {
  const fromProvider = useContext(KitI18nContext).locale;
  return prop ?? fromProvider;
}

/** The week start the nearest `<UiKitProvider weekStartsOn>` pins, else `undefined`
 *  (the caller then asks the locale). A component's own prop goes first:
 *  `prop ?? useKitWeekStart()`. */
/** The provider's router link, or `undefined` — a component's own `renderLink` should
 *  win over it: `const Link = renderLink ?? useKitLink()`. */
export function useKitLink(): KitLinkComponent | undefined {
  return useContext(KitI18nContext).linkComponent;
}

export function useKitWeekStart(): WeekDay | undefined {
  return useContext(KitI18nContext).weekStartsOn;
}

/** The provider's `chartTooltipPlacement`, or `undefined` — a chart's own prop wins. */
export function useKitChartTooltipPlacement(): ChartTooltipPlacement | undefined {
  return useContext(KitI18nContext).chartTooltipPlacement;
}

/** The nearest provider's `formatDate`, or `undefined` — a component's own
 *  `formatValue` / `formatOptions` wins over it. See {@link KitDateFormatter}. */
export function useKitDateFormatter(): KitDateFormatter | undefined {
  return useContext(KitI18nContext).formatDate;
}

/** The nearest provider's `tableStorageKeyPrefix`, or `undefined` — a table's own
 *  `storageKeyPrefix` wins over it, and the kit's `"hbui-table:"` comes after both. */
export function useKitTableStorageKeyPrefix(): string | undefined {
  return useContext(KitI18nContext).tableStorageKeyPrefix;
}

/** The nearest provider's `timeZone` (0.46), or `undefined` — the device's. A call's own
 *  `timeZone` wins over it. */
export function useKitTimeZone(): string | undefined {
  return useContext(KitI18nContext).timeZone;
}

/** The nearest provider's `documentTitleFormat` and `appName`, or `undefined` each —
 *  what `useDocumentTitle` writes with (the format's default is
 *  `DEFAULT_DOCUMENT_TITLE_FORMAT`, applied there: this module reaches nothing outside
 *  i18n/). */
export function useKitDocumentTitle(): { format: string | undefined; appName: string | undefined } {
  const { documentTitleFormat, appName } = useContext(KitI18nContext);
  return { format: documentTitleFormat, appName };
}

/** {@link DEFAULT_FILE_LABELS}, but formatting in the provider's locale. */
export function useKitFileLabels(prop?: Partial<FileLabels>): FileLabels {
  const locale = useKitLocale();
  const defaults = useMemo<FileLabels>(
    () => ({ size: (bytes) => formatFileSize(bytes, locale) }),
    [locale],
  );
  return useKitLabels("file", defaults, prop);
}

/**
 * The dot paths of every key `labels` does NOT supply — the ones a translated app is
 * still showing in English. Assert on it in the app's own test:
 *
 *     expect(missingKitLabels(labels, DEFAULT_UI_KIT_LABELS)).toEqual([]);
 *
 * `reference` is the complete tree to check against — pass
 * {@link DEFAULT_UI_KIT_LABELS} (src/i18n/defaults.ts). It is a parameter rather than an import
 * because the defaults live beside their components, and this module is imported BY
 * those components. Left out (a test file is not type-checked), it throws saying so
 * rather than "Cannot convert undefined or null to object" (keksdose, 0.18).
 */
export function missingKitLabels(
  labels: UiKitLabelOverrides | undefined,
  reference: UiKitLabels,
): string[] {
  if (!isRecord(reference)) {
    throw new TypeError(
      "missingKitLabels(labels, reference): pass DEFAULT_UI_KIT_LABELS as the reference — " +
        "it is the tree the labels are checked against.",
    );
  }
  const missing: string[] = [];
  for (const [ns, keys] of Object.entries(reference)) {
    const given = (labels as Record<string, Record<string, unknown> | undefined> | undefined)?.[ns];
    for (const [key, value] of Object.entries(keys as Record<string, unknown>)) {
      const got = given?.[key];
      if (got === undefined) {
        missing.push(`${ns}.${key}`);
      } else if (isRecord(value) && isRecord(got)) {
        for (const sub of Object.keys(value)) {
          if (got[sub] === undefined) missing.push(`${ns}.${key}.${sub}`);
        }
      }
    }
  }
  return missing;
}
