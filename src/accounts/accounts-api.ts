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
  invited_by?: { id: number; display_name?: string; email?: string } | null;
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
}

/** `POST /admin/invitations` (server-kit's `InvitationCreate`). */
export interface AccountInvitationDraft {
  email: string;
  role: string;
  scope?: number | string | null;
  note?: string | null;
  locale?: string;
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
  invitations(): Promise<AccountInvitation[]>;
  invite(draft: AccountInvitationDraft): Promise<AccountInvitationIssued>;
  resendInvitation(id: number): Promise<AccountInvitationIssued>;
  revokeInvitation(id: number): Promise<void>;
}

/** @internal The routes on `http`; `createAccountsClient` hands them out as `client.api`. */
export function createAccountsApi<U extends AccountUser>(http: AccountsHttp): AccountsApi<U> {
  const call = async <T>(method: "get" | "post" | "patch" | "delete", url: string, data?: unknown): Promise<T> =>
    (await http.request({ method, url, data })).data as T;
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
    invitations: () => call("get", "/admin/invitations"),
    invite: (draft) => call("post", "/admin/invitations", draft),
    resendInvitation: (invitation) => call("post", `/admin/invitations/${id(invitation)}/resend`),
    revokeInvitation: (invitation) => none("delete", `/admin/invitations/${id(invitation)}`),
  };
}
