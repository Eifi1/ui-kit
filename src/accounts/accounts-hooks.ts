import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AccountDeletionTerms,
  AccountEmailChange,
  AccountInvitationDraft,
  AccountMe,
  AccountPasskeyOptions,
  AccountProfilePatch,
  AccountAdminActionQuery,
  AccountAdminConfirmation,
  AccountRosterQuery,
} from "./accounts-api";
import { accountQueryKeys, useAccountsClient } from "./accounts-context";
import { passkeyAttestation } from "./passkey-ceremony";
import type { AccountUser } from "./session-store";

/**
 * The account's TanStack Query hooks on server-kit 0.29's `auth_router`
 * (docs/auth-harmonization.md §12.9 "The API and its hooks"): what each app wired by hand
 * around its `authApi` — Kurvenschmiede's account cards, its passkeys card, its admin's
 * invitations — once, with their query keys ({@link accountQueryKeys}).
 *
 * Each reads the client from `<AccountsProvider>` and keeps what an answer changes where the
 * kit keeps it: `/me` and a profile change in the session store (`setUser`), a password
 * change's fresh pair as the session (`storeSession`, §6.3), a deletion request as a
 * sign-out. Errors are the caller's: hand them to `useDescribeAccountFailure()`.
 */

/** Whether this tab holds a session: the signed-in queries wait for one. */
function useSignedIn(): boolean {
  const client = useAccountsClient();
  return client.useSession((state) => state.token !== null);
}

/**
 * `GET /auth/me`, once a session is there: the account as the server has it now, written
 * back to the session store, so a name or role changed elsewhere shows (§6.1: the shell reads
 * the user from `/auth/me`, never from the token). The stored copy is its placeholder, so a
 * reload draws the name at once.
 */
export function useCurrentUser<U extends AccountUser = AccountMe>() {
  const client = useAccountsClient<U>();
  const signedIn = useSignedIn();
  const stored = client.useSession((state) => state.user);
  return useQuery<U>({
    queryKey: accountQueryKeys.me,
    queryFn: async () => {
      const me = await client.api.me();
      client.setUser(me);
      return me;
    },
    enabled: signedIn,
    // `as never`: TanStack types a placeholder as `NonFunctionGuard<U>`, which a type
    // parameter cannot be shown to meet; an account is a plain object.
    placeholderData: (stored ?? undefined) as never,
  });
}

/** `PATCH /auth/me`: the names, the language, the appearance — the answer is the account,
 *  kept in the store and the `/me` query. */
export function useUpdateProfile<U extends AccountUser = AccountMe>() {
  const client = useAccountsClient<U>();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AccountProfilePatch) => client.api.updateMe(patch),
    onSuccess: (me) => {
      client.setUser(me);
      queryClient.setQueryData(accountQueryKeys.me, me);
    },
  });
}

/** `POST /auth/me/password`: every other session ends, and the fresh pair for this one is
 *  kept at once (§6.3) — otherwise the next request would carry a token from before the
 *  change and be signed out by it. */
export function useChangePassword<U extends AccountUser = AccountMe>() {
  const client = useAccountsClient<U>();
  return useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) => client.api.changePassword(body),
    onSuccess: (pair) => client.storeSession(pair),
  });
}

/** The address change (user-admin §6.2): its state from the server (`GET /auth/me/email`, so
 *  another tab's or a reload's shows), and the request, its re-send and its withdrawal, each
 *  answer written to that state. */
export function useEmailChange() {
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const signedIn = useSignedIn();
  const keep = (state: AccountEmailChange) => queryClient.setQueryData(accountQueryKeys.emailChange, state);
  const state = useQuery({
    queryKey: accountQueryKeys.emailChange,
    queryFn: () => client.api.emailChange(),
    enabled: signedIn,
  });
  const request = useMutation({
    mutationFn: (body: { new_email: string; password: string }) => client.api.requestEmailChange(body),
    onSuccess: keep,
  });
  const resend = useMutation({ mutationFn: () => client.api.resendEmailChange(), onSuccess: keep });
  const cancel = useMutation({
    mutationFn: () => client.api.cancelEmailChange(),
    onSuccess: () => {
      const now = queryClient.getQueryData<AccountEmailChange>(accountQueryKeys.emailChange);
      if (now) keep({ ...now, pending_email: null, pending_expires_at: null, sent: null });
      return queryClient.invalidateQueries({ queryKey: accountQueryKeys.emailChange });
    },
  });
  return { state, request, resend, cancel };
}

/**
 * The account's sessions (§6.3, §12.5 item 1): the list with the caller's marked `current`,
 * ending one of the others, and "Sign out everywhere" — a sign-out in the contract's order
 * (`client.signOut({ everywhere: true })`), which leaves the page.
 */
export function useAccountSessions() {
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const signedIn = useSignedIn();
  const list = useQuery({
    queryKey: accountQueryKeys.sessions,
    queryFn: () => client.api.sessions(),
    enabled: signedIn,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => client.api.endSession(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.sessions }),
  });
  return { list, revoke, signOutEverywhere: () => client.signOut({ everywhere: true }) };
}

/**
 * The account's passkeys: the list, adding one, renaming and removing. Adding is two steps,
 * because the server asks for the password first (`POST /auth/passkey/register/begin`,
 * server-kit: a session alone is not enough to add a way in): `begin(password)` answers the
 * options, so a wrong password is said before any browser prompt; `register({ options,
 * name })` runs the browser's ceremony and the finish.
 */
export function usePasskeys() {
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const signedIn = useSignedIn();
  const refresh = () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.passkeys });
  const list = useQuery({
    queryKey: accountQueryKeys.passkeys,
    queryFn: () => client.api.passkeys(),
    enabled: signedIn,
  });
  const begin = useMutation({ mutationFn: (password: string) => client.api.passkeyRegisterBegin(password) });
  const register = useMutation({
    mutationFn: async ({ options, name }: { options: AccountPasskeyOptions; name: string }) =>
      client.api.passkeyRegisterFinish({
        challenge_token: options.challenge_token,
        credential: await passkeyAttestation(options.options),
        name,
      }),
    onSuccess: refresh,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => client.api.renamePasskey(id, name),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: number) => client.api.deletePasskey(id), onSuccess: refresh });
  return { list, begin, register, rename, remove };
}

/** `GET /auth/me/export`, the account's data as one JSON file (user-admin §6.5), for
 *  `DataExportSetting`'s `onExport`. Once a minute: a 429 is said as such. */
export function useAccountExport() {
  const client = useAccountsClient();
  return useMutation({ mutationFn: () => client.api.exportData() });
}

/**
 * Deleting the account (user-admin §6.4): the server's terms first (`GET /auth/me/deletion`:
 * the mode, the days, the app's counts), then the request. The server ends every session
 * with it, so a granted request signs this tab out too, in the contract's order.
 */
export function useAccountDeletion() {
  const client = useAccountsClient();
  const signedIn = useSignedIn();
  const terms = useQuery<AccountDeletionTerms>({
    queryKey: accountQueryKeys.deletionTerms,
    queryFn: () => client.api.deletionTerms(),
    enabled: signedIn,
  });
  const request = useMutation({
    mutationFn: (body: { password: string; confirm_email: string }) => client.api.requestDeletion(body),
    onSuccess: () => client.signOut(),
  });
  return { terms, request };
}

/** The admin's invitations (`invitations_admin_router`): the list, inviting, re-sending and
 *  revoking, each refreshing the list. A console transport's answer carries the link once
 *  (§12.5 item 11): the answers are handed back, so `InvitationsPanel` shows it. */
export function useInvitationsAdmin(options: { enabled?: boolean } = {}) {
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const signedIn = useSignedIn();
  const refresh = () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.invitations });
  const list = useQuery({
    queryKey: accountQueryKeys.invitations,
    queryFn: () => client.api.invitations(),
    enabled: signedIn && options.enabled !== false,
  });
  const invite = useMutation({
    mutationFn: (draft: AccountInvitationDraft) => client.api.invite(draft),
    onSuccess: refresh,
  });
  const resend = useMutation({ mutationFn: (id: number) => client.api.resendInvitation(id), onSuccess: refresh });
  const revoke = useMutation({ mutationFn: (id: number) => client.api.revokeInvitation(id), onSuccess: refresh });
  return { list, invite, resend, revoke };
}

// ── The admin's (0.64, server-kit 0.30–0.31's user_admin_router) ─────────────

/** A page of the roster for `query` (`GET /admin/users`). The previous page stays shown while
 *  the next loads, so a table does not flash empty between pages. */
export function useAdminRoster(query: AccountRosterQuery, options: { enabled?: boolean } = {}) {
  const client = useAccountsClient();
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: accountQueryKeys.roster(query),
    queryFn: () => client.api.roster(query),
    enabled: signedIn && options.enabled !== false,
    placeholderData: keepPreviousData,
  });
}

/**
 * The roster's actions, each a mutation taking the account's `id` with the action's body. Every
 * one, done, reads the admin's data again (the roster, the log, the overview, the invitations:
 * `accountQueryKeys.admin`), since an action changes rows the page may show in several places.
 * The answer is handed back as the server sent it: the admin's mail's console `link` once.
 */
export function useAdminUserActions() {
  const client = useAccountsClient();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.admin });
  const done = { onSuccess: refresh };
  type Confirmed = { id: number } & AccountAdminConfirmation;
  return {
    setActive: useMutation({
      mutationFn: ({ id, ...body }: Confirmed & { active: boolean }) => client.api.setActive(id, body),
      ...done,
    }),
    setRole: useMutation({
      mutationFn: ({ id, ...body }: Confirmed & { role: string }) => client.api.setRole(id, body),
      ...done,
    }),
    requirePasswordChange: useMutation({
      mutationFn: ({ id, ...body }: Confirmed) => client.api.requirePasswordChange(id, body),
      ...done,
    }),
    withdrawPasswordChange: useMutation({
      mutationFn: ({ id, ...body }: Confirmed) => client.api.withdrawPasswordChange(id, body),
      ...done,
    }),
    sendMail: useMutation({
      mutationFn: ({ id, ...body }: Confirmed & { kind: "verification" | "password_reset" }) =>
        client.api.sendAccountMail(id, body),
      ...done,
    }),
    setReviewer: useMutation({
      mutationFn: ({ id, ...body }: { id: number; locales: string[]; areas: string[] | null }) =>
        client.api.setReviewer(id, body),
      ...done,
    }),
    erase: useMutation({
      mutationFn: ({ id, ...body }: Confirmed & { confirm_email: string }) => client.api.eraseAccount(id, body),
      ...done,
    }),
  };
}

/** A page of the admin's log (`GET /admin/actions`), for one account when `target` or
 *  `target_email` names it. */
export function useAdminActions(query: AccountAdminActionQuery, options: { enabled?: boolean } = {}) {
  const client = useAccountsClient();
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: accountQueryKeys.adminActions(query),
    queryFn: () => client.api.adminActions(query),
    enabled: signedIn && options.enabled !== false,
    placeholderData: keepPreviousData,
  });
}

/** The overview's counts (`GET /admin/attention`). */
export function useAdminAttention(options: { enabled?: boolean } = {}) {
  const client = useAccountsClient();
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: accountQueryKeys.adminAttention,
    queryFn: () => client.api.adminAttention(),
    enabled: signedIn && options.enabled !== false,
  });
}

/** The transport the server mails through (`GET /admin/mail`): read on load, so a page says
 *  "nothing is sent" before the first invitation rather than after it. It changes with a
 *  deploy only, so it is read once per sign-in. */
export function useAdminMail(options: { enabled?: boolean } = {}) {
  const client = useAccountsClient();
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: accountQueryKeys.adminMail,
    queryFn: () => client.api.adminMail(),
    enabled: signedIn && options.enabled !== false,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** The test mail (`POST /admin/mail/test`, 3 in 10 minutes per admin). */
export function useMailTest() {
  const client = useAccountsClient();
  return useMutation({ mutationFn: () => client.api.mailTest() });
}
