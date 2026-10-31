import { DEFAULT_DATA_TABLE_LABELS } from "../components/data-table-labels";
import { DEFAULT_MINI_CALENDAR_LABELS } from "../components/mini-calendar-labels";
import { DEFAULT_CALENDAR_HEATMAP_LABELS } from "../components/calendar-heatmap-labels";
import { DEFAULT_MONTH_PICKER_LABELS } from "../components/month-picker-labels";
import { DEFAULT_PAGE_CONTENTS_LABELS } from "../components/page-contents-labels";
import { DEFAULT_POPOVER_LABELS } from "../components/popover-labels";
import { DEFAULT_CHIP_INPUT_LABELS } from "../components/chip-labels";
import { DEFAULT_FIELD_SYNC_LABELS } from "../components/field-sync-labels";
import {
  DEFAULT_CHARACTER_COUNT_LABELS,
  DEFAULT_PASSWORD_REVEAL_LABELS,
  DEFAULT_TABS_LABELS,
} from "../components/ui-labels";
import { DEFAULT_WIZARD_LABELS } from "../wizard/wizard-labels";
import { DEFAULT_TOUR_LABELS } from "../tour/tour-labels";
import { DEFAULT_TOUR_CATALOGUE_LABELS } from "../tour/tour-catalogue-labels";
import { DEFAULT_TOUR_GUIDE_LABELS } from "../tour/tour-guide-labels";
import { DEFAULT_COMMAND_PALETTE_LABELS } from "../search/command-palette-labels";
import { DEFAULT_GLOBAL_SEARCH_LABELS } from "../search/global-search-labels";
import { DEFAULT_SERIES_CHART_LABELS } from "../components/series-chart-labels";
import { DEFAULT_PIE_CHART_LABELS } from "../components/pie-chart-labels";
import { DEFAULT_TREEMAP_LABELS } from "../components/treemap-labels";
import { DEFAULT_SPARKLINE_LABELS } from "../components/sparkline-labels";
import { DEFAULT_STAT_TILE_LABELS } from "../components/stat-tile-labels";
import { DEFAULT_SIGNATURE_PAD_LABELS } from "../components/signature-pad-labels";
import { DEFAULT_PASSWORD_STRENGTH_LABELS } from "../components/password-strength-labels";
import { DEFAULT_DANGER_CONFIRM_LABELS } from "../components/danger-confirm-labels";
import { DEFAULT_SWATCH_PICKER_LABELS } from "../components/swatch-picker-labels";
import { DEFAULT_ICON_PICKER_LABELS } from "../components/icon-picker-labels";
import { DEFAULT_DIALOG_FRAME_LABELS } from "../components/dialog-frame-labels";
import { DEFAULT_FILE_PICKER_LABELS } from "../hooks/use-file-picker-labels";
import { DEFAULT_MEASURED_GRID_LABELS } from "../components/measured-grid-labels";
import { DEFAULT_CONFIRM_DIALOG_LABELS } from "../components/confirm-dialog-labels";
import { DEFAULT_FLOATING_PANEL_LABELS } from "../components/floating-panel-labels";
import { DEFAULT_FEEDBACK_ATTACHMENT_LABELS } from "../feedback/feedback-attachment-labels";
import { DEFAULT_FEEDBACK_DIALOG_LABELS } from "../feedback/feedback-dialog-labels";
import { DEFAULT_FEEDBACK_COMPOSER_LABELS, DEFAULT_FEEDBACK_THREAD_LABELS } from "../feedback/feedback-thread-labels";
import {
  DEFAULT_FEEDBACK_CATEGORY_LABELS,
  DEFAULT_FEEDBACK_STATUS_LABELS,
  DEFAULT_FEEDBACK_TOAST_LABELS,
} from "../feedback/feedback-labels";
import { DEFAULT_FEEDBACK_MENU_LABELS } from "../feedback/feedback-menu-labels";
import { DEFAULT_FEEDBACK_PUBLIC_LABELS } from "../feedback/feedback-public-labels";
import { DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS } from "../notifications/feedback-notification-types-labels";
import { DEFAULT_FEEDBACK_CONTEXT_LABELS } from "../feedback/feedback-context-labels";
import { DEFAULT_FEEDBACK_PAGE_LABELS } from "../feedback/feedback-table-labels";
import { DEFAULT_FEEDBACK_DETAIL_LABELS } from "../feedback/feedback-row-detail-labels";
import {
  DEFAULT_FEEDBACK_COMMENTS_LABELS,
  DEFAULT_FEEDBACK_REPLIES_LABELS,
  DEFAULT_FEEDBACK_VOTE_LABELS,
} from "../feedback/feedback-thread-parts-labels";
import { DEFAULT_ACCOUNT_SETTINGS_LABELS } from "../account/account-settings-labels";
import { DEFAULT_COPY_BUTTON_LABELS } from "../components/copy-button-labels";
import { DEFAULT_BULK_ACTION_BAR_LABELS } from "../components/bulk-action-bar-labels";
import { DEFAULT_LIST_LABELS } from "../components/list-labels";
import { DEFAULT_BREADCRUMBS_LABELS } from "../components/breadcrumbs-labels";
import { DEFAULT_TOAST_LABELS } from "../components/toast-labels";
import { DEFAULT_FORM_ACTIONS_LABELS } from "../components/form-actions-labels";
import { DEFAULT_DESCRIPTION_LIST_LABELS } from "../components/description-list-labels";
import { DEFAULT_LINE_ITEMS_LABELS } from "../components/line-items-labels";
import { DEFAULT_PROGRESS_BAR_LABELS } from "../components/progress-bar-labels";
import { DEFAULT_SIGNED_AMOUNT_LABELS } from "../components/signed-amount-labels";
import { DEFAULT_ERROR_BOUNDARY_LABELS } from "../components/error-boundary-labels";
import { DEFAULT_AUTHED_IMAGE_LABELS } from "../components/authed-image-labels";
import { DEFAULT_IMAGE_GRID_LABELS } from "../components/image-grid-labels";
import { DEFAULT_LIGHTBOX_LABELS } from "../components/lightbox-labels";
import { DEFAULT_WRITE_LOCK_LABELS } from "../components/write-lock-labels";
import { DEFAULT_LEGAL_LABELS } from "../components/legal-labels";
import { DEFAULT_SIGN_IN_LABELS } from "../auth/sign-in-form-labels";
import { DEFAULT_REGISTER_LABELS } from "../auth/register-form-labels";
import { DEFAULT_COMPLETE_NAME_LABELS } from "../auth/complete-name-dialog-labels";
import { DEFAULT_FORGOT_PASSWORD_LABELS } from "../auth/forgot-password-form-labels";
import { DEFAULT_RESET_PASSWORD_LABELS } from "../auth/reset-password-form-labels";
import { DEFAULT_VERIFY_EMAIL_LABELS } from "../auth/verify-email-labels";
import { DEFAULT_NOT_FOUND_LABELS } from "../auth/not-found-page-labels";
import { DEFAULT_ACCEPT_INVITATION_LABELS } from "../auth/accept-invitation-labels";
import { DEFAULT_COMPANY_SWITCHER_LABELS } from "../shell/company-switcher-labels";
import { DEFAULT_EMAIL_CHANGE_LABELS } from "../account/email-change-setting-labels";
import { DEFAULT_SESSIONS_LABELS } from "../account/sessions-setting-labels";
import { DEFAULT_DELETE_ACCOUNT_LABELS } from "../account/delete-account-setting-labels";
import { DEFAULT_DATA_EXPORT_LABELS } from "../account/data-export-setting-labels";
import { DEFAULT_USER_ROSTER_LABELS } from "../admin/user-roster-labels";
import { DEFAULT_ROLE_SELECT_LABELS } from "../admin/role-select-labels";
import { DEFAULT_REVIEWER_SCOPE_LABELS } from "../admin/reviewer-scope-editor-labels";
import { DEFAULT_ADMIN_ACTION_LABELS } from "../admin/admin-action-confirm-labels";
import { DEFAULT_ADMIN_ACTION_LOG_LABELS } from "../admin/admin-action-log-labels";
import { DEFAULT_TRANSFER_OWNERSHIP_LABELS } from "../admin/transfer-ownership-dialog-labels";
import { DEFAULT_INVITATIONS_LABELS } from "../admin/invitations-panel-labels";
import { DEFAULT_SETTINGS_LABELS } from "../settings/settings-labels";
import { DEFAULT_LANDING_LABELS } from "../landing/landing-labels";
import { DEFAULT_DEMO_LABELS } from "../demo/demo-labels";
import { DEFAULT_BILLING_LABELS } from "../billing/billing-labels";
import { DEFAULT_PLAN_CHANGE_LABELS } from "../admin/plan-change-labels";
import { DEFAULT_APPEARANCE_LABELS } from "../components/appearance-labels";
import { DEFAULT_DEVICE_RESET_LABELS } from "../settings/device-reset-setting-labels";
import { DEFAULT_ROW_ACTIONS_LABELS } from "../components/row-actions-labels";
import { DEFAULT_APP_SHELL_MORE_LABELS } from "../shell/app-shell-labels";
import { DEFAULT_ACCOUNT_STATE_LABELS } from "../components/account-chips-labels";
import { DEFAULT_ADMIN_AREA_LABELS } from "../admin/admin-area-labels";
import { DEFAULT_MAIL_TEST_CARD_LABELS } from "../admin/mail-test-card-labels";
import { DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS } from "../offline/sign-out-pending-dialog-labels";
import { DEFAULT_PWA_UPDATE_PROMPT_LABELS } from "../offline/pwa-update-prompt-labels";
import { DEFAULT_SHARED_COMPUTER_LABELS } from "../offline/shared-computer-labels";
import { DEFAULT_TOP_BAR_PARTS_LABELS } from "../shell/top-bar-parts-labels";
import { DEFAULT_SHARE_CARD_LABELS } from "../components/share-card-labels";
import { DEFAULT_REAUTH_DIALOG_LABELS } from "../components/reauth-dialog-labels";
import { DEFAULT_SERVER_WAKE_LABELS } from "../components/server-wake-labels";
import { DEFAULT_TRANSLATION_REVIEW_LABELS } from "../components/translation-review-labels";
import { DEFAULT_COUNTRY_SELECT_LABELS } from "../components/country-select-labels";
import { DEFAULT_INLINE_EDIT_LABELS } from "../components/inline-edit-field-labels";
import { DEFAULT_IBAN_INPUT_LABELS } from "../components/iban-input-labels";
import { DEFAULT_PHONE_INPUT_LABELS } from "../components/phone-input-labels";
import { DEFAULT_SIGN_CHIP_LABELS } from "../components/sign-chip-labels";
import { DEFAULT_COLUMN_MAPPER_LABELS } from "../components/column-mapper-labels";
import { DEFAULT_NOTIFICATIONS_LABELS } from "../notifications/notifications-labels";
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
} from "./shared-labels";
import type { UiKitLabels } from "./kit-labels";

/**
 * The whole English tree in one object: what a translation is written against, and
 * the `reference` for {@link missingKitLabels}.
 *
 * A separate module from the provider on purpose. Components import the provider's
 * hooks; this file imports the components' defaults. Kept together they would be an
 * import cycle through every component in the kit.
 *
 * Every import here is a module of WORDS — a `*-labels.ts` beside its component, which
 * the component re-exports (`shared-labels` for the namespaces the provider types
 * itself, which `kit-labels` re-exports) — never a component. The
 * English catalogue (`locales/en.ts`) is built on this object, so a component imported
 * here rides along with English: in 0.33 that was 79 of them, and an app fetching `en`
 * lazily fetched ~40 chunks of component code with it, where every other language is one
 * (0.34, KS U8). `__tests__/english-catalogue-graph.test.ts` holds the line, and the
 * build makes `dist/i18n/locales/en.js` one file (scripts/flatten-en.mjs).
 */
export const DEFAULT_UI_KIT_LABELS: UiKitLabels = {
  common: DEFAULT_COMMON_LABELS,
  dataTable: DEFAULT_DATA_TABLE_LABELS,
  miniCalendar: DEFAULT_MINI_CALENDAR_LABELS,
  calendarHeatmap: DEFAULT_CALENDAR_HEATMAP_LABELS,
  datePicker: DEFAULT_DATE_PICKER_LABELS,
  monthPicker: DEFAULT_MONTH_PICKER_LABELS,
  popover: DEFAULT_POPOVER_LABELS,
  combobox: DEFAULT_COMBOBOX_LABELS,
  multiSelect: DEFAULT_MULTI_SELECT_LABELS,
  calculator: DEFAULT_CALCULATOR_LABELS,
  currency: DEFAULT_CURRENCY_LABELS,
  chipInput: DEFAULT_CHIP_INPUT_LABELS,
  fieldSync: DEFAULT_FIELD_SYNC_LABELS,
  passwordReveal: DEFAULT_PASSWORD_REVEAL_LABELS,
  tabs: DEFAULT_TABS_LABELS,
  appShell: DEFAULT_APP_SHELL_LABELS,
  pageContents: DEFAULT_PAGE_CONTENTS_LABELS,
  topBar: DEFAULT_TOP_BAR_LABELS,
  pickerSheet: DEFAULT_PICKER_SHEET_LABELS,
  swipeableRow: DEFAULT_SWIPEABLE_ROW_LABELS,
  file: DEFAULT_FILE_LABELS,
  wizard: DEFAULT_WIZARD_LABELS,
  tour: DEFAULT_TOUR_LABELS,
  tourCatalogue: DEFAULT_TOUR_CATALOGUE_LABELS,
  tourGuide: DEFAULT_TOUR_GUIDE_LABELS,
  commandPalette: DEFAULT_COMMAND_PALETTE_LABELS,
  globalSearch: DEFAULT_GLOBAL_SEARCH_LABELS,
  seriesChart: DEFAULT_SERIES_CHART_LABELS,
  pieChart: DEFAULT_PIE_CHART_LABELS,
  treemap: DEFAULT_TREEMAP_LABELS,
  sparkline: DEFAULT_SPARKLINE_LABELS,
  statTile: DEFAULT_STAT_TILE_LABELS,
  signaturePad: DEFAULT_SIGNATURE_PAD_LABELS,
  passwordStrength: DEFAULT_PASSWORD_STRENGTH_LABELS,
  dangerConfirm: DEFAULT_DANGER_CONFIRM_LABELS,
  swatchPicker: DEFAULT_SWATCH_PICKER_LABELS,
  iconPicker: DEFAULT_ICON_PICKER_LABELS,
  dialogFrame: DEFAULT_DIALOG_FRAME_LABELS,
  filePicker: DEFAULT_FILE_PICKER_LABELS,
  measuredGrid: DEFAULT_MEASURED_GRID_LABELS,
  feedbackAttachment: DEFAULT_FEEDBACK_ATTACHMENT_LABELS,
  feedbackDialog: DEFAULT_FEEDBACK_DIALOG_LABELS,
  feedbackThread: DEFAULT_FEEDBACK_THREAD_LABELS,
  feedbackComposer: DEFAULT_FEEDBACK_COMPOSER_LABELS,
  feedbackStatus: DEFAULT_FEEDBACK_STATUS_LABELS,
  feedbackCategory: DEFAULT_FEEDBACK_CATEGORY_LABELS,
  feedbackToast: DEFAULT_FEEDBACK_TOAST_LABELS,
  feedbackMenu: DEFAULT_FEEDBACK_MENU_LABELS,
  feedbackPublic: DEFAULT_FEEDBACK_PUBLIC_LABELS,
  feedbackNotificationTypes: DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS,
  feedbackContext: DEFAULT_FEEDBACK_CONTEXT_LABELS,
  feedbackPage: DEFAULT_FEEDBACK_PAGE_LABELS,
  feedbackDetail: DEFAULT_FEEDBACK_DETAIL_LABELS,
  feedbackVote: DEFAULT_FEEDBACK_VOTE_LABELS,
  feedbackComments: DEFAULT_FEEDBACK_COMMENTS_LABELS,
  feedbackReplies: DEFAULT_FEEDBACK_REPLIES_LABELS,
  accountSettings: DEFAULT_ACCOUNT_SETTINGS_LABELS,
  confirmDialog: DEFAULT_CONFIRM_DIALOG_LABELS,
  floatingPanel: DEFAULT_FLOATING_PANEL_LABELS,
  copyButton: DEFAULT_COPY_BUTTON_LABELS,
  bulkActionBar: DEFAULT_BULK_ACTION_BAR_LABELS,
  list: DEFAULT_LIST_LABELS,
  breadcrumbs: DEFAULT_BREADCRUMBS_LABELS,
  toast: DEFAULT_TOAST_LABELS,
  form: DEFAULT_FORM_ACTIONS_LABELS,
  descriptionList: DEFAULT_DESCRIPTION_LIST_LABELS,
  lineItems: DEFAULT_LINE_ITEMS_LABELS,
  progressBar: DEFAULT_PROGRESS_BAR_LABELS,
  signedAmount: DEFAULT_SIGNED_AMOUNT_LABELS,
  errorBoundary: DEFAULT_ERROR_BOUNDARY_LABELS,
  authedImage: DEFAULT_AUTHED_IMAGE_LABELS,
  imageGrid: DEFAULT_IMAGE_GRID_LABELS,
  lightbox: DEFAULT_LIGHTBOX_LABELS,
  writeLock: DEFAULT_WRITE_LOCK_LABELS,
  accountState: DEFAULT_ACCOUNT_STATE_LABELS,
  shareCard: DEFAULT_SHARE_CARD_LABELS,
  reauthDialog: DEFAULT_REAUTH_DIALOG_LABELS,
  serverWake: DEFAULT_SERVER_WAKE_LABELS,
  translationReview: DEFAULT_TRANSLATION_REVIEW_LABELS,
  legal: DEFAULT_LEGAL_LABELS,
  signIn: DEFAULT_SIGN_IN_LABELS,
  register: DEFAULT_REGISTER_LABELS,
  completeName: DEFAULT_COMPLETE_NAME_LABELS,
  forgotPassword: DEFAULT_FORGOT_PASSWORD_LABELS,
  resetPassword: DEFAULT_RESET_PASSWORD_LABELS,
  verifyEmail: DEFAULT_VERIFY_EMAIL_LABELS,
  notFound: DEFAULT_NOT_FOUND_LABELS,
  acceptInvitation: DEFAULT_ACCEPT_INVITATION_LABELS,
  companySwitcher: DEFAULT_COMPANY_SWITCHER_LABELS,
  emailChange: DEFAULT_EMAIL_CHANGE_LABELS,
  sessions: DEFAULT_SESSIONS_LABELS,
  deleteAccount: DEFAULT_DELETE_ACCOUNT_LABELS,
  dataExport: DEFAULT_DATA_EXPORT_LABELS,
  userRoster: DEFAULT_USER_ROSTER_LABELS,
  roleSelect: DEFAULT_ROLE_SELECT_LABELS,
  reviewerScope: DEFAULT_REVIEWER_SCOPE_LABELS,
  adminAction: DEFAULT_ADMIN_ACTION_LABELS,
  adminActionLog: DEFAULT_ADMIN_ACTION_LOG_LABELS,
  transferOwnership: DEFAULT_TRANSFER_OWNERSHIP_LABELS,
  invitations: DEFAULT_INVITATIONS_LABELS,
  settings: DEFAULT_SETTINGS_LABELS,
  landing: DEFAULT_LANDING_LABELS,
  demo: DEFAULT_DEMO_LABELS,
  billing: DEFAULT_BILLING_LABELS,
  planChange: DEFAULT_PLAN_CHANGE_LABELS,
  appearance: DEFAULT_APPEARANCE_LABELS,
  deviceReset: DEFAULT_DEVICE_RESET_LABELS,
  rowActions: DEFAULT_ROW_ACTIONS_LABELS,
  appShellMore: DEFAULT_APP_SHELL_MORE_LABELS,
  characterCount: DEFAULT_CHARACTER_COUNT_LABELS,
  countrySelect: DEFAULT_COUNTRY_SELECT_LABELS,
  inlineEdit: DEFAULT_INLINE_EDIT_LABELS,
  ibanInput: DEFAULT_IBAN_INPUT_LABELS,
  phoneInput: DEFAULT_PHONE_INPUT_LABELS,
  signChip: DEFAULT_SIGN_CHIP_LABELS,
  columnMapper: DEFAULT_COLUMN_MAPPER_LABELS,
  notifications: DEFAULT_NOTIFICATIONS_LABELS,
  adminArea: DEFAULT_ADMIN_AREA_LABELS,
  topBarParts: DEFAULT_TOP_BAR_PARTS_LABELS,
  mailTestCard: DEFAULT_MAIL_TEST_CARD_LABELS,
  signOutPending: DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS,
  pwaUpdate: DEFAULT_PWA_UPDATE_PROMPT_LABELS,
  sharedComputer: DEFAULT_SHARED_COMPUTER_LABELS,
};
