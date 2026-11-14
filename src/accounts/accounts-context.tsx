import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { AccountMe } from "./accounts-api";
import type { AccountsClient } from "./accounts-client";
import type { AccountUser } from "./session-store";

/**
 * The accounts client for the kit's account pages, hooks and settings sections
 * (docs/auth-harmonization.md §12.9): the app makes one client at module scope and hands it
 * down once, under its TanStack `QueryClientProvider`.
 */

/** Typed loosely: the context holds one app's client, whatever its user type. The hooks
 *  name `U` when they read it. */
const AccountsContext = createContext<AccountsClient<AccountUser> | null>(null);

/** The query keys the kit's account hooks use, under one root, so an app can invalidate or
 *  drop them together — and the provider drops them when the account changes. */
export const accountQueryKeys = {
  all: ["accounts"] as const,
  me: ["accounts", "me"] as const,
  emailChange: ["accounts", "email-change"] as const,
  sessions: ["accounts", "sessions"] as const,
  passkeys: ["accounts", "passkeys"] as const,
  deletionTerms: ["accounts", "deletion-terms"] as const,
  invitations: ["accounts", "admin", "invitations"] as const,
  /** Everything the admin reads (0.64): an action invalidates it all at once. */
  admin: ["accounts", "admin"] as const,
  roster: (query: object) => ["accounts", "admin", "users", query] as const,
  adminActions: (query: object) => ["accounts", "admin", "actions", query] as const,
  adminAttention: ["accounts", "admin", "attention"] as const,
  adminMail: ["accounts", "admin", "mail"] as const,
  /** The verdicts the viewer may see (0.64); a save or a clear patches the answer. */
  translationReviews: ["accounts", "translations", "reviews"] as const,
  /** The strings the review reads, per set of languages: what the app ships, so they
   *  never go stale in a tab. */
  translationStrings: ["accounts", "translations", "strings"] as const,
  invitationCheck: (token: string) => ["accounts", "invitation-check", token] as const,
};

export interface AccountsProviderProps {
  client: AccountsClient<AccountUser>;
  children?: ReactNode;
}

/**
 * Hands the client to the kit's account parts: `<AccountsProvider client={accounts}>` inside
 * the app's `QueryClientProvider`.
 *
 * When the account in the session changes — a sign-out, another tab, a sign-in as someone
 * else — it drops the kit's own queries (`accountQueryKeys.all`): what one account read
 * (its sessions, its passkeys, its pending address) is never shown to the next one in this
 * tab, Kurvenschmiede's F33. The app's own queries are its `onSessionEnded`'s to drop.
 */
export function AccountsProvider({ client, children }: AccountsProviderProps) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let account = client.useSession.getState().user?.id ?? null;
    return client.useSession.subscribe((state) => {
      const next = state.user?.id ?? null;
      if (next === account) return;
      account = next;
      queryClient.removeQueries({ queryKey: accountQueryKeys.all });
    });
  }, [client, queryClient]);
  return <AccountsContext.Provider value={client}>{children}</AccountsContext.Provider>;
}

/** The client {@link AccountsProvider} hands down. Throws outside one: a page or hook of the
 *  kit's that cannot reach the session would otherwise act as signed out, silently. */
export function useAccountsClient<U extends AccountUser = AccountMe>(): AccountsClient<U> {
  const client = useContext(AccountsContext);
  if (!client) throw new Error("useAccountsClient needs an <AccountsProvider client={…}> above it");
  return client as unknown as AccountsClient<U>;
}
