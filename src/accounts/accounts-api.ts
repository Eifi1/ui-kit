import type { AdminConfirmLevel } from "../admin/admin-action-confirm";
import type { AdminAttention } from "../admin/admin-overview";
import type { AdminPerson } from "../admin/admin-parts";
import type { MailTestAnswer } from "../admin/mail-test-card";
import type { UserRosterRow } from "../admin/user-roster";
import type {
  ApiTranslationReview,
  ApiTranslationReviewsResponse,
  ApiTranslationReviewWrite,
  TranslationReviewKey,
} from "../lib/translation-review";
import type { AccountsHttp, AccountTokens } from "./accounts-client";
import type { AccountUser } from "./session-store";

/**
 * The routes of server-kit 0.29's `auth_router` and `invitations_admin_router`, typed once
 * (docs/auth-harmonization.md §12.9 "The API and its hooks"; the route table is server-kit's
 * README, "Account layer"). Each app typed them for itself — Kurvenschmiede's `authApi`, about
 * 95 lines of `endpoints.ts` — with the same paths and bodies, so a field renamed on the server
 * was a fault found in three places.
 *
 * Every call goes through the app's own instance, so the bearer, the refresh and the cold-start
 * notice apply as to any other request. It keeps nothing: the hooks and the client decide what
 * an answer changes (`storeSession` for a password change's fresh pair, `setUser` for `/me`).
 * The paths are the routers' defaults, `/auth` and `/admin/invitations`, under the instance's
 * base URL.
 */

/** `GET /auth/me`'s core (server-kit's `UserResponse`); the app's `me_model` fields extend it. */
export interface AccountMe extends AccountUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  /** Derived on the server, read-only: the name in the account's own language. */
  display_name?: string;
  locale: string;
  role: string | null;
  is_active: boolean;
  email_verified: boolean;
  totp_enabled?: boolean;
  created_at: string;
  /** Derived: first or last name missing (§3.3). */
  name_incomplete?: boolean;
  demo_expires_at?: string | null;
  text_size?: string | null;
  contrast?: string | null;
  device_timezone?: string | null;
}

/** `PATCH /auth/me` (server-kit's `ProfileUpdate`): only what changes; the app's extra
 *  fields beside. Unknown fields are refused, so send only what its `profile_model` takes. */
export interface AccountProfilePatch {
  first_name?: string;
  last_name?: string;
  locale?: string;
  text_size?: string;
  contrast?: string;
  device_timezone?: string;
  [field: string]: unknown;
}

/** `GET /auth/me/email` and its writes: the address now, the change waiting, and whether this
 *  answer's mail went out (`null` on the GET). */
export interface AccountEmailChange {
  email: string;
  pending_email?: string | null;
  pending_expires_at?: string | null;
  sent?: boolean | null;
}

/** `POST /auth/me/email/confirm`: the new address, verified, and how many open invitations
 *  for it were attached. */
export interface AccountEmailConfirmed {
  email: string;
  email_verified: true;
  invitations_attached?: number;
}

/** `POST /auth/verify-email` and `/auth/resend-verification`. */
export interface AccountEmailVerification {
  email: string;
  email_verified: boolean;
}

/** `POST /auth/password-reset/check` and `/confirm`: whose account the link resets. The
 *  app's extras ride beside (keksdose's `encrypted`). */
export interface AccountPasswordReset {
  email: string;
  [field: string]: unknown;
}

/** `POST /auth/invitations/check`: what an invitation is for, without spending it. */
export interface AccountInvitationCheck {
  email: string;
  expires_at: string;
  account_exists: boolean;
  role?: string | null;
  [field: string]: unknown;
}

/** `POST /auth/invitations/accept`: the invitation an existing account took up; the app's
 *  words for what it attached ride beside (a team's name). */
export interface AccountInvitationAccepted {
  email: string;
  role?: string | null;
  [field: string]: unknown;
}

/** One row of `GET /auth/sessions`; `current` marks the caller's (§12.5 item 1). */
export interface AccountSessionInfo {
  /** The session's `sid`, which `DELETE /auth/sessions/{id}` ends. */
  id: string;
  device?: string | null;
  ip_address?: string | null;
  started_at: string;
  last_active: string;
  expires_at: string;
  shared_device?: boolean;
  current?: boolean;
}

/** `GET /auth/me/deletion`: what a deletion would do. `days` is `null` in `operator` mode.
 *  The app's counts ride beside (Kurvenschmiede's `hand_over_count`). */
export interface AccountDeletionTerms {
  mode: "after_days" | "operator";
  days?: number | null;
  [field: string]: unknown;
}

/** `POST /auth/me/deletion`'s 202. */
export interface AccountDeletionResult {
  deletion_scheduled_at?: string | null;
  mail_sent: boolean;
  [field: string]: unknown;
}

/** `POST /auth/me/2fa/setup`'s answer (server-kit 0.32): the new secret, PENDING until a code
 *  from it confirms it, and its `otpauth://` URI, which `TwoFactorSetting` draws as a QR code. */
export interface AccountTwoFactorSetup {
  secret: string;
  otpauth_url: string;
}

/** `POST /auth/me/2fa/enable` and `POST /auth/me/2fa/backup-codes` (server-kit 0.32): the
 *  backup codes, shown once — the server keeps their digests only. */
export interface AccountTwoFactorEnabled {
  backup_codes: string[];
}

/** `GET /auth/me/2fa` (server-kit 0.32): on or off, and the backup codes left. */
export interface AccountTwoFactorStatus {
  enabled: boolean;
  backup_codes_left: number;
}

/** One of `GET /auth/passkeys`. */
export interface AccountPasskey {
  id: number;
  name: string;
  created_at: string;
  last_used_at?: string | null;
}

/** A ceremony's begin: the options for `navigator.credentials`, as JSON, and the challenge
 *  the finish sends back. */
export interface AccountPasskeyOptions {
  options: Record<string, unknown>;
  challenge_token: string;
}

/** One row of `GET /admin/invitations` (server-kit's `InvitationRow`). */
export interface AccountInvitation {
  id: number;
  email: string;
  role?: string | null;
  scope?: number | string | null;
  note?: string | null;
  locale: string;
  /** server-kit's `PersonRef`: the kit's `AdminPerson` reads it as it is. */
  invited_by?: { id?: number | null; email?: string | null; first_name?: string; last_name?: string } | null;
  created_at: string;
  expires_at: string;
  status: "open" | "accepted" | "expired" | "revoked";
  /** On the console mail transport only, and only in the answer that minted it. */
  link?: string | null;
  [field: string]: unknown;
}

/** `POST /admin/invitations` and its re-send: the row, whether the mail went out, and the
 *  transport (`"console"` hands the admin the link once, §12.5 item 11). */
export interface AccountInvitationIssued extends AccountInvitation {
  sent: boolean;
  mail_backend: string;
  /** server-kit 0.32: the address had an invitation, and it went again (keksdose's). */
  resent?: boolean;
}

/** `POST /admin/invitations` (server-kit's `InvitationCreate`). */
export interface AccountInvitationDraft {
  email: string;
  role: string;
  scope?: number | string | null;
  note?: string | null;
  locale?: string;
}

// ── The admin's (server-kit 0.30–0.31, `user_admin_router`) ──────────────────

/** One row of `GET /admin/users` (server-kit's `AdminUserRow`): the kit's roster row, with the
 *  reviewer's scope and the app's `extra` (its `row_model` fields). */
export interface AccountAdminUser extends UserRosterRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
  locale?: string;
  is_active: boolean;
  translation_review_locales: string[];
  translation_review_areas: string[] | null;
  /** Whether the account signs in with a second factor (server-kit 0.32 reads its store). */
  totp_enabled?: boolean;
  extra?: Record<string, unknown>;
}

/** `GET /admin/users`'s query (server-kit's `UserListQuery`); a field left out is no filter. */
export interface AccountRosterQuery {
  limit?: number;
  offset?: number;
  /** A sort key, `-` in front for descending (`"-last_login_at"`). */
  sort?: string;
  q?: string;
  role?: string;
  state?: string;
}

/** `GET /admin/users`'s answer (server-kit's `UserListResponse`). `levels` is the
 *  confirmation each action asks for, the server's word (§4.2): the page asks for no less. */
export interface AccountRosterPage<R extends AccountAdminUser = AccountAdminUser> {
  users: R[];
  total: number;
  mail_backend: string;
  summary?: Record<string, unknown> | null;
  levels?: Record<string, AdminConfirmLevel> | null;
}

/** What an action carries to show it was confirmed (server-kit's `ActionConfirmation`): the
 *  tick, or the target's address typed again, as the action's level asks. */
export interface AccountAdminConfirmation {
  acknowledged?: boolean;
  confirm_email?: string | null;
}

/** `POST /admin/users/{id}/mail`'s answer: `link` only where the transport is the console,
 *  for the admin to hand on (auth §12.8 item 10). */
export interface AccountAdminMailResult {
  sent: boolean;
  mail_backend: string;
  link?: string | null;
}

/** `PUT /admin/users/{id}/reviewer`'s answer. */
export interface AccountReviewerResult {
  user_id: number;
  role: string | null;
  locales: string[];
  areas: string[] | null;
}

/** `POST /admin/users/{id}/erase`'s answer: what the erasure anonymised. */
export interface AccountErasureResult {
  feedback_anonymised: number;
}

/** One row of `GET /admin/actions` (server-kit's `AdminActionRow`): the actor and the target
 *  as people (`PersonRef`), the target's address kept for an erased account's row. */
export interface AccountAdminActionRow {
  id: number;
  at: string;
  action: string;
  actor_id: number | null;
  target_user_id: number | null;
  target_email: string | null;
  detail: Record<string, unknown>;
  actor: AdminPerson | null;
  target: AdminPerson | null;
  /** 0.64: the group a row names (Kurvenschmiede's team), and its name as the server joined
   *  it (`UserAdminHooks.group_names`): the live group's, else the one its deletion kept. */
  target_group_id?: number | null;
  target_group?: { id?: number | null; name?: string | null } | null;
  /** kastlan's company, where its log has one. */
  company_id?: number | null;
}

/** `GET /admin/actions`'s answer. */
export interface AccountAdminActionPage {
  actions: AccountAdminActionRow[];
  total: number;
}

/** `GET /admin/actions`'s query: a page, and the rows about one account by its id or (0.31)
 *  by the address it had. */
export interface AccountAdminActionQuery {
  limit?: number;
  offset?: number;
  target?: number;
  target_email?: string;
}

/** The typed routes, on the app's instance: `client.api`. */
export interface AccountsApi<U extends AccountUser = AccountMe> {
  me(): Promise<U>;
  updateMe(patch: AccountProfilePatch): Promise<U>;
  /** `POST /auth/me/password`: every other session ends, and the answer is a fresh pair for
   *  this one (§6.3) — keep it with `client.storeSession`. */
  changePassword(body: { current_password: string; new_password: string }): Promise<AccountTokens<U>>;
  emailChange(): Promise<AccountEmailChange>;
  requestEmailChange(body: { new_email: string; password: string }): Promise<AccountEmailChange>;
  resendEmailChange(): Promise<AccountEmailChange>;
  cancelEmailChange(): Promise<void>;
  confirmEmailChange(token: string): Promise<AccountEmailConfirmed>;
  verifyEmail(token: string): Promise<AccountEmailVerification>;
  resendVerification(): Promise<AccountEmailVerification>;
  requestPasswordReset(email: string): Promise<void>;
  checkPasswordReset(token: string): Promise<AccountPasswordReset>;
  confirmPasswordReset(body: { token: string; new_password: string }): Promise<AccountPasswordReset>;
  checkInvitation(token: string): Promise<AccountInvitationCheck>;
  acceptInvitation(token: string): Promise<AccountInvitationAccepted>;
  sessions(): Promise<AccountSessionInfo[]>;
  endSession(id: string): Promise<void>;
  /** `POST /auth/logout`: every session ends, this one included. `client.signOut({ everywhere:
   *  true })` sends it in the sign-out's order. */
  logoutEverywhere(): Promise<void>;
  deletionTerms(): Promise<AccountDeletionTerms>;
  requestDeletion(body: { password: string; confirm_email: string }): Promise<AccountDeletionResult>;
  /** `GET /auth/me/export`, the JSON download, as a Blob. */
  exportData(): Promise<Blob>;
  passkeys(): Promise<AccountPasskey[]>;
  renamePasskey(id: number, name: string): Promise<AccountPasskey>;
  deletePasskey(id: number): Promise<void>;
  passkeyRegisterBegin(currentPassword: string): Promise<AccountPasskeyOptions>;
  passkeyRegisterFinish(body: { challenge_token: string; credential: unknown; name: string }): Promise<AccountPasskey>;
  passkeyLoginBegin(): Promise<AccountPasskeyOptions>;
  /** `POST /auth/me/2fa/setup {password}` (server-kit 0.32): the password every time, a first
   *  setup and a replacement alike; what signs in now keeps doing so until `enableTwoFactor`. */
  twoFactorSetup(password: string): Promise<AccountTwoFactorSetup>;
  /** `POST /auth/me/2fa/enable {code}`: a code from the pending secret switches it on; the
   *  answer carries the backup codes, once. */
  enableTwoFactor(code: string): Promise<AccountTwoFactorEnabled>;
  /** `GET /auth/me/2fa`: on or off, and the backup codes left. */
  twoFactorStatus(): Promise<AccountTwoFactorStatus>;
  /** `POST /auth/me/2fa/backup-codes {password}`: a new set; the old codes end. */
  renewBackupCodes(password: string): Promise<AccountTwoFactorEnabled>;
  /** `POST /auth/me/2fa/disable {password, code}`: the password and a live code. */
  disableTwoFactor(body: { password: string; code: string }): Promise<void>;
  invitations(): Promise<AccountInvitation[]>;
  invite(draft: AccountInvitationDraft): Promise<AccountInvitationIssued>;
  resendInvitation(id: number): Promise<AccountInvitationIssued>;
  revokeInvitation(id: number): Promise<void>;
  /** The roster, a page of it (`GET /admin/users`). */
  roster(query?: AccountRosterQuery): Promise<AccountRosterPage>;
  setActive(id: number, body: { active: boolean } & AccountAdminConfirmation): Promise<AccountAdminUser>;
  setRole(id: number, body: { role: string } & AccountAdminConfirmation): Promise<AccountAdminUser>;
  requirePasswordChange(id: number, body?: AccountAdminConfirmation): Promise<AccountAdminUser>;
  withdrawPasswordChange(id: number, body?: AccountAdminConfirmation): Promise<AccountAdminUser>;
  sendAccountMail(
    id: number,
    body: { kind: "verification" | "password_reset" } & AccountAdminConfirmation,
  ): Promise<AccountAdminMailResult>;
  setReviewer(id: number, body: { locales: string[]; areas: string[] | null }): Promise<AccountReviewerResult>;
  /** The operator's erasure of an account that asked to be deleted. */
  eraseAccount(id: number, body: { confirm_email: string } & AccountAdminConfirmation): Promise<AccountErasureResult>;
  /** Another account's second factor off (server-kit 0.32, where the server has one): the
   *  account is told by mail. */
  resetTwoFactor(id: number, body?: AccountAdminConfirmation): Promise<AccountAdminUser>;
  adminActions(query?: AccountAdminActionQuery): Promise<AccountAdminActionPage>;
  adminAttention(): Promise<AdminAttention>;
  /** The transport the server mails through (`GET /admin/mail`): `console` means nothing is
   *  sent, so a page says so before the first invitation, not after it. */
  adminMail(): Promise<{ mail_backend: string }>;
  mailTest(): Promise<MailTestAnswer>;
  /** `GET /translations/reviews` (server-kit's `translation_review_router`): the languages and
   *  areas the caller may review and every verdict in them; a 403 for a caller with none. */
  translationReviews(): Promise<ApiTranslationReviewsResponse>;
  /** `PUT /translations/reviews`: up to 2000 verdicts, answered as stored. */
  saveTranslationReviews(items: ApiTranslationReviewWrite[]): Promise<ApiTranslationReview[]>;
  /** `POST /translations/reviews/clear`: back to unreviewed; answers how many there were. */
  clearTranslationReviews(items: TranslationReviewKey[]): Promise<number>;
}

/** @internal The routes on `http`; `createAccountsClient` hands them out as `client.api`. */
export function createAccountsApi<U extends AccountUser>(http: AccountsHttp): AccountsApi<U> {
  const call = async <T>(
    method: "get" | "post" | "put" | "patch" | "delete",
    url: string,
    data?: unknown,
  ): Promise<T> => (await http.request({ method, url, data })).data as T;
  // A filter the caller left out is no field in the query: `?q=` would search for nothing.
  const read = async <T>(url: string, query: object = {}): Promise<T> => {
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    ) as Record<string, string | number | boolean>;
    return (await http.request({ method: "get", url, params })).data as T;
  };
  const none = async (method: "post" | "delete", url: string, data?: unknown): Promise<void> => {
    await http.request({ method, url, data });
  };
  const id = (value: number | string) => encodeURIComponent(String(value));
  return {
    me: () => call("get", "/auth/me"),
    updateMe: (patch) => call("patch", "/auth/me", patch),
    changePassword: (body) => call("post", "/auth/me/password", body),
    emailChange: () => call("get", "/auth/me/email"),
    requestEmailChange: (body) => call("post", "/auth/me/email", body),
    resendEmailChange: () => call("post", "/auth/me/email/resend"),
    cancelEmailChange: () => none("delete", "/auth/me/email"),
    confirmEmailChange: (token) => call("post", "/auth/me/email/confirm", { token }),
    verifyEmail: (token) => call("post", "/auth/verify-email", { token }),
    resendVerification: () => call("post", "/auth/resend-verification"),
    requestPasswordReset: (email) => none("post", "/auth/password-reset/request", { email }),
    checkPasswordReset: (token) => call("post", "/auth/password-reset/check", { token }),
    confirmPasswordReset: (body) => call("post", "/auth/password-reset/confirm", body),
    checkInvitation: (token) => call("post", "/auth/invitations/check", { token }),
    acceptInvitation: (token) => call("post", "/auth/invitations/accept", { token }),
    sessions: () => call("get", "/auth/sessions"),
    endSession: (sid) => none("delete", `/auth/sessions/${id(sid)}`),
    logoutEverywhere: () => none("post", "/auth/logout"),
    deletionTerms: () => call("get", "/auth/me/deletion"),
    requestDeletion: (body) => call("post", "/auth/me/deletion", body),
    exportData: async () =>
      (await http.request({ method: "get", url: "/auth/me/export", responseType: "blob" })).data as Blob,
    passkeys: () => call("get", "/auth/passkeys"),
    renamePasskey: (passkey, name) => call("patch", `/auth/passkeys/${id(passkey)}`, { name }),
    deletePasskey: (passkey) => none("delete", `/auth/passkeys/${id(passkey)}`),
    passkeyRegisterBegin: (currentPassword) =>
      call("post", "/auth/passkey/register/begin", { current_password: currentPassword }),
    passkeyRegisterFinish: (body) => call("post", "/auth/passkey/register/finish", body),
    passkeyLoginBegin: () => call("post", "/auth/passkey/login/begin"),
    twoFactorSetup: (password) => call("post", "/auth/me/2fa/setup", { password }),
    enableTwoFactor: (code) => call("post", "/auth/me/2fa/enable", { code }),
    twoFactorStatus: () => call("get", "/auth/me/2fa"),
    renewBackupCodes: (password) => call("post", "/auth/me/2fa/backup-codes", { password }),
    disableTwoFactor: (body) => none("post", "/auth/me/2fa/disable", body),
    invitations: () => call("get", "/admin/invitations"),
    invite: (draft) => call("post", "/admin/invitations", draft),
    resendInvitation: (invitation) => call("post", `/admin/invitations/${id(invitation)}/resend`),
    revokeInvitation: (invitation) => none("delete", `/admin/invitations/${id(invitation)}`),
    roster: (query) => read("/admin/users", query),
    setActive: (user, body) => call("post", `/admin/users/${id(user)}/active`, body),
    setRole: (user, body) => call("post", `/admin/users/${id(user)}/role`, body),
    requirePasswordChange: (user, body = {}) => call("post", `/admin/users/${id(user)}/password-change`, body),
    withdrawPasswordChange: (user, body = {}) => call("delete", `/admin/users/${id(user)}/password-change`, body),
    sendAccountMail: (user, body) => call("post", `/admin/users/${id(user)}/mail`, body),
    setReviewer: (user, body) => call("put", `/admin/users/${id(user)}/reviewer`, body),
    eraseAccount: (user, body) => call("post", `/admin/users/${id(user)}/erase`, body),
    resetTwoFactor: (user, body = {}) => call("post", `/admin/users/${id(user)}/two-factor-reset`, body),
    adminActions: (query) => read("/admin/actions", query),
    adminAttention: () => call("get", "/admin/attention"),
    adminMail: () => call("get", "/admin/mail"),
    mailTest: () => call("post", "/admin/mail/test"),
    translationReviews: () => call("get", "/translations/reviews"),
    saveTranslationReviews: async (items) =>
      (await call<{ reviews: ApiTranslationReview[] }>("put", "/translations/reviews", { items })).reviews,
    clearTranslationReviews: async (items) =>
      (await call<{ cleared: number }>("post", "/translations/reviews/clear", { items })).cleared,
  };
}
