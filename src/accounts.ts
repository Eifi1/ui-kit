// `@eifi1/ui-kit/accounts` — the account layer's frontend half (docs/auth-harmonization.md
// §12.9, 0.63): the kit's sign-in parts wired to server-kit's `auth_router` once, so no app
// writes its session, its pages or its settings again. Its first part is the session.
//
// Standalone: an API of its own that shares no name with the main barrel
// (public-surface.test.ts STANDALONE). It asks for nothing beyond the kit's required peers —
// axios stays the app's dependency, taken as an argument and typed structurally — and the
// later rounds' TanStack Query hooks stay out of the barrel with it.
export { accountStorageEntries } from "./accounts/storage-entries";
export type { AccountStorageEntry } from "./accounts/storage-entries";
export { useAccountStorageLines } from "./accounts/storage-lines";
export type { AccountStorageLine } from "./accounts/storage-lines";
export { createAccountsClient } from "./accounts/accounts-client";
export type {
  AccountsClient,
  AccountsClientOptions,
  AccountPasswordStep,
  AccountSessionEnd,
  AccountsHttp,
  AccountsPasskeyFinish,
  AccountsRequest,
  AccountTokens,
} from "./accounts/accounts-client";
export type { AccountSession, AccountUser, SharedSessionPlace } from "./accounts/session-store";
// 0.63 (§12.9 "Refusals"): every coded refusal of the account routes in the kit's seven
// languages, offline and timeouts, and the app's own codes through its catalogue.
export {
  ACCOUNT_FAILURE_CODES,
  DEFAULT_ACCOUNT_FAILURE_LABELS,
  describeAccountFailure,
  useDescribeAccountFailure,
  useFailureBeside,
} from "./accounts/account-failure";
export type {
  AccountFailureCode,
  AccountFailureLabels,
  DescribeAccountFailureOptions,
} from "./accounts/account-failure";
// 0.63 (§12.9 "The API and its hooks"): auth_router's routes typed once, as `client.api`;
// the passkey ceremony with no library.
export type {
  AccountDeletionResult,
  AccountDeletionTerms,
  AccountEmailChange,
  AccountEmailConfirmed,
  AccountEmailVerification,
  AccountInvitation,
  AccountInvitationAccepted,
  AccountInvitationCheck,
  AccountInvitationDraft,
  AccountInvitationIssued,
  AccountMe,
  AccountPasskey,
  AccountPasskeyOptions,
  AccountPasswordReset,
  AccountProfilePatch,
  AccountsApi,
  AccountSessionInfo,
  AccountTwoFactorEnabled,
  AccountTwoFactorSetup,
  AccountTwoFactorStatus,
} from "./accounts/accounts-api";
// 0.64 (§12.9, server-kit 0.30–0.31's user_admin_router): the admin's routes on `client.api`.
export type {
  AccountAdminActionPage,
  AccountAdminActionQuery,
  AccountAdminActionRow,
  AccountAdminConfirmation,
  AccountAdminMailResult,
  AccountAdminUser,
  AccountErasureResult,
  AccountReviewerResult,
  AccountRosterPage,
  AccountRosterQuery,
} from "./accounts/accounts-api";
export { passkeysAvailable } from "./accounts/passkey-ceremony";
// 0.63 (§12.9 "The API and its hooks"): the provider and the TanStack Query hooks, with their
// query keys. `@tanstack/react-query` is an optional peer, and this entry is one that needs it.
export { AccountsProvider, accountQueryKeys, useAccountsClient } from "./accounts/accounts-context";
export type { AccountsProviderProps } from "./accounts/accounts-context";
export {
  useAccountDeletion,
  useAccountExport,
  useAccountSessions,
  useAdminActions,
  useAdminAttention,
  useAdminMail,
  useAdminRoster,
  useAdminUserActions,
  useChangePassword,
  useCurrentUser,
  useEmailChange,
  useInvitationsAdmin,
  useMailTest,
  useTranslationReviews,
  usePasskeys,
  useTwoFactor,
  useUpdateProfile,
} from "./accounts/accounts-hooks";
// 0.63 (§12.9 "The pages"): the signed-out pages as route objects, and the gate.
export { accountPage, accountRouteElements, accountRoutes } from "./accounts/account-pages";
export { RequireSession } from "./accounts/require-session";
export type {
  AccountPageFrameProps,
  AccountPageName,
  AccountPaths,
  AccountRegisterFieldsProps,
  AccountRoutesOptions,
} from "./accounts/account-pages";
export type { RequireSessionProps } from "./accounts/require-session";
// 0.63 (§12.9 "The account's settings"): the kit's cards wired, as sections an app puts into
// its own SettingsLayout beside its own.
export {
  AccountDeletionSection,
  AccountEmailSection,
  AccountExportSection,
  AccountInvitationsSection,
  AccountPasskeysSection,
  AccountPasswordSection,
  AccountProfileSection,
  AccountSessionsSection,
  AccountTwoFactorSection,
} from "./accounts/account-settings-sections";
export type {
  AccountDeletionSectionProps,
  AccountInvitationsSectionProps,
  AccountPasskeysSectionProps,
  AccountProfileSectionProps,
  AccountTwoFactorSectionProps,
} from "./accounts/account-settings-sections";
// 0.64 (§12.9 "The admin's sections"): the kit's admin parts on server-kit 0.30–0.31's
// user_admin_router — the overview, the test mail, the log and the roster with its actions.
export {
  AccountAdminLogSection,
  AccountAdminOverviewSection,
  AccountMailTestSection,
  AccountUserRosterSection,
} from "./accounts/account-admin-sections";
export type {
  AccountAdminLogSectionProps,
  AccountAdminOverviewSectionProps,
  AccountMailTestSectionProps,
  AccountRosterLabels,
  AccountUserRosterSectionProps,
} from "./accounts/account-admin-sections";
export { DEFAULT_ACCOUNT_ROSTER_LABELS } from "./accounts/account-roster-labels";
// 0.64 (§12.9): the review page on server-kit 0.31's translation_review_router.
export { AccountTranslationReview } from "./accounts/account-translation-review";
export type { AccountTranslationReviewProps } from "./accounts/account-translation-review";
export { DEFAULT_ACCOUNT_TRANSLATIONS_LABELS } from "./accounts/account-translations-labels";
export type { AccountTranslationsLabels } from "./accounts/account-translations-labels";
// 0.64 (§12.9): the feedback pages on server-kit 0.31's feedback_router, through the session.
export {
  AccountFeedbackPage,
  AccountPublicFeedbackPage,
  useAccountFeedbackApi,
  useAccountFeedbackSubmit,
} from "./accounts/account-feedback";
export type {
  AccountFeedbackPageProps,
  AccountPublicFeedbackPageProps,
  UseAccountFeedbackSubmitOptions,
} from "./accounts/account-feedback";
export { accountFeedbackApi } from "./accounts/account-feedback-api";
export type { AccountFeedbackApi } from "./accounts/account-feedback-api";
