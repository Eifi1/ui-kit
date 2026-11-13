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
export { createAccountsClient } from "./accounts/accounts-client";
export type {
  AccountsClient,
  AccountsClientOptions,
  AccountSessionEnd,
  AccountsHttp,
  AccountsPasskeyFinish,
  AccountsRequest,
  AccountTokens,
} from "./accounts/accounts-client";
export type { AccountSession, AccountUser, SharedSessionPlace } from "./accounts/session-store";
