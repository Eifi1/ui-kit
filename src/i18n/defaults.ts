import { DEFAULT_DATA_TABLE_LABELS } from "../components/data-table-labels";
import { DEFAULT_MINI_CALENDAR_LABELS } from "../components/mini-calendar";
import { DEFAULT_CALENDAR_HEATMAP_LABELS } from "../components/calendar-heatmap";
import { DEFAULT_MONTH_PICKER_LABELS } from "../components/month-picker";
import { DEFAULT_PAGE_CONTENTS_LABELS } from "../components/page-contents";
import { DEFAULT_POPOVER_LABELS } from "../components/popover";
import { DEFAULT_CHIP_INPUT_LABELS } from "../components/chip";
import { DEFAULT_FIELD_SYNC_LABELS } from "../components/field-sync";
import {
  DEFAULT_CHARACTER_COUNT_LABELS,
  DEFAULT_PASSWORD_REVEAL_LABELS,
  DEFAULT_TABS_LABELS,
} from "../components/ui";
import { DEFAULT_WIZARD_LABELS } from "../wizard/types";
import { DEFAULT_TOUR_LABELS } from "../tour/tour";
import { DEFAULT_COMMAND_PALETTE_LABELS } from "../search/command-palette";
import { DEFAULT_GLOBAL_SEARCH_LABELS } from "../search/global-search";
import { DEFAULT_SERIES_CHART_LABELS } from "../components/series-chart-labels";
import { DEFAULT_PIE_CHART_LABELS } from "../components/pie-chart-labels";
import { DEFAULT_SPARKLINE_LABELS } from "../components/sparkline";
import { DEFAULT_STAT_TILE_LABELS } from "../components/stat-tile";
import { DEFAULT_SIGNATURE_PAD_LABELS } from "../components/signature-pad";
import { DEFAULT_PASSWORD_STRENGTH_LABELS } from "../components/password-strength";
import { DEFAULT_DANGER_CONFIRM_LABELS } from "../components/danger-confirm";
import { DEFAULT_SWATCH_PICKER_LABELS } from "../components/swatch-picker";
import { DEFAULT_ICON_PICKER_LABELS } from "../components/icon-picker";
import { DEFAULT_DIALOG_FRAME_LABELS } from "../components/dialog-frame";
import { DEFAULT_FILE_PICKER_LABELS } from "../components/file-button";
import { DEFAULT_MEASURED_GRID_LABELS } from "../components/measured-grid";
import { DEFAULT_CONFIRM_DIALOG_LABELS } from "../components/confirm-dialog";
import { DEFAULT_FLOATING_PANEL_LABELS } from "../components/floating-panel";
import { DEFAULT_FEEDBACK_ATTACHMENT_LABELS } from "../feedback/feedback-attachment";
import { DEFAULT_FEEDBACK_DIALOG_LABELS } from "../feedback/feedback-dialog";
import {
  DEFAULT_FEEDBACK_COMPOSER_LABELS,
  DEFAULT_FEEDBACK_THREAD_LABELS,
} from "../feedback/feedback-thread";
import {
  DEFAULT_FEEDBACK_CATEGORY_LABELS,
  DEFAULT_FEEDBACK_STATUS_LABELS,
  DEFAULT_FEEDBACK_TOAST_LABELS,
} from "../feedback/feedback-labels";
import { DEFAULT_FEEDBACK_MENU_LABELS } from "../feedback/feedback-menu";
import { DEFAULT_FEEDBACK_CONTEXT_LABELS } from "../feedback/feedback-context";
import { DEFAULT_FEEDBACK_PAGE_LABELS } from "../feedback/feedback-table";
import { DEFAULT_FEEDBACK_DETAIL_LABELS } from "../feedback/feedback-row-detail";
import { DEFAULT_ACCOUNT_SETTINGS_LABELS } from "../components/account-settings-labels";
import { DEFAULT_COPY_BUTTON_LABELS } from "../components/copy-button";
import { DEFAULT_BULK_ACTION_BAR_LABELS } from "../components/bulk-action-bar";
import { DEFAULT_LIST_LABELS } from "../components/list";
import { DEFAULT_BREADCRUMBS_LABELS } from "../components/breadcrumbs";
import { DEFAULT_TOAST_LABELS } from "../components/toast";
import { DEFAULT_FORM_ACTIONS_LABELS } from "../components/form-actions";
import { DEFAULT_DESCRIPTION_LIST_LABELS } from "../components/description-list";
import { DEFAULT_LINE_ITEMS_LABELS } from "../components/line-items";
import { DEFAULT_PROGRESS_BAR_LABELS } from "../components/progress-bar";
import { DEFAULT_SIGNED_AMOUNT_LABELS } from "../components/signed-amount";
import { DEFAULT_ERROR_BOUNDARY_LABELS } from "../components/error-boundary";
import { DEFAULT_AUTHED_IMAGE_LABELS } from "../components/authed-image";
import { DEFAULT_IMAGE_GRID_LABELS } from "../components/image-grid";
import { DEFAULT_LIGHTBOX_LABELS } from "../components/lightbox";
import { DEFAULT_WRITE_LOCK_LABELS } from "../components/write-lock";
import { DEFAULT_LEGAL_LABELS } from "../components/legal";
import { DEFAULT_SIGN_IN_LABELS } from "../auth/sign-in-form";
import { DEFAULT_REGISTER_LABELS } from "../auth/register-form";
import { DEFAULT_COMPLETE_NAME_LABELS } from "../auth/complete-name-dialog";
import { DEFAULT_FORGOT_PASSWORD_LABELS } from "../auth/forgot-password-form";
import { DEFAULT_RESET_PASSWORD_LABELS } from "../auth/reset-password-form";
import { DEFAULT_VERIFY_EMAIL_LABELS } from "../auth/verify-email";
import { DEFAULT_NOT_FOUND_LABELS } from "../auth/not-found-page";
import { DEFAULT_ACCEPT_INVITATION_LABELS } from "../auth/accept-invitation";
import { DEFAULT_COMPANY_SWITCHER_LABELS } from "../shell/company-switcher";
import { DEFAULT_EMAIL_CHANGE_LABELS } from "../account/email-change-setting";
import { DEFAULT_SESSIONS_LABELS } from "../account/sessions-setting";
import { DEFAULT_DELETE_ACCOUNT_LABELS } from "../account/delete-account-setting";
import { DEFAULT_DATA_EXPORT_LABELS } from "../account/data-export-setting";
import { DEFAULT_USER_ROSTER_LABELS } from "../admin/user-roster";
import { DEFAULT_ROLE_SELECT_LABELS } from "../admin/role-select";
import { DEFAULT_REVIEWER_SCOPE_LABELS } from "../admin/reviewer-scope-editor";
import { DEFAULT_ADMIN_ACTION_LABELS } from "../admin/admin-action-confirm";
import { DEFAULT_ADMIN_ACTION_LOG_LABELS } from "../admin/admin-action-log";
import { DEFAULT_TRANSFER_OWNERSHIP_LABELS } from "../admin/transfer-ownership-dialog";
import { DEFAULT_INVITATIONS_LABELS } from "../admin/invitations-panel";
import { DEFAULT_SETTINGS_LABELS } from "../settings/settings-labels";
import { DEFAULT_LANDING_LABELS } from "../landing/landing-labels";
import { DEFAULT_DEMO_LABELS } from "../demo/demo-labels";
import { DEFAULT_BILLING_LABELS } from "../billing/billing-labels";
import { DEFAULT_ACCOUNT_STATE_LABELS } from "../components/account-chips";
import { DEFAULT_SHARE_CARD_LABELS } from "../components/share-card";
import { DEFAULT_REAUTH_DIALOG_LABELS } from "../components/reauth-dialog";
import { DEFAULT_SERVER_WAKE_LABELS } from "../components/server-wake";
import { DEFAULT_TRANSLATION_REVIEW_LABELS } from "../components/translation-review-labels";
import { DEFAULT_COUNTRY_SELECT_LABELS } from "../components/country-select";
import { DEFAULT_INLINE_EDIT_LABELS } from "../components/inline-edit-field";
import { DEFAULT_IBAN_INPUT_LABELS } from "../components/iban-input";
import { DEFAULT_PHONE_INPUT_LABELS } from "../components/phone-input";
import { DEFAULT_SIGN_CHIP_LABELS } from "../components/sign-chip";
import { DEFAULT_COLUMN_MAPPER_LABELS } from "../components/column-mapper";
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
} from "./kit-labels";
import type { UiKitLabels } from "./kit-labels";

/**
 * The whole English tree in one object: what a translation is written against, and
 * the `reference` for {@link missingKitLabels}.
 *
 * A separate module from the provider on purpose. Components import the provider's
 * hooks; this file imports the components' defaults. Kept together they would be an
 * import cycle through every component in the kit.
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
  commandPalette: DEFAULT_COMMAND_PALETTE_LABELS,
  globalSearch: DEFAULT_GLOBAL_SEARCH_LABELS,
  seriesChart: DEFAULT_SERIES_CHART_LABELS,
  pieChart: DEFAULT_PIE_CHART_LABELS,
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
  feedbackContext: DEFAULT_FEEDBACK_CONTEXT_LABELS,
  feedbackPage: DEFAULT_FEEDBACK_PAGE_LABELS,
  feedbackDetail: DEFAULT_FEEDBACK_DETAIL_LABELS,
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
  characterCount: DEFAULT_CHARACTER_COUNT_LABELS,
  countrySelect: DEFAULT_COUNTRY_SELECT_LABELS,
  inlineEdit: DEFAULT_INLINE_EDIT_LABELS,
  ibanInput: DEFAULT_IBAN_INPUT_LABELS,
  phoneInput: DEFAULT_PHONE_INPUT_LABELS,
  signChip: DEFAULT_SIGN_CHIP_LABELS,
  columnMapper: DEFAULT_COLUMN_MAPPER_LABELS,
};
