// `@eifi1/ui-kit/offline` — local-first phase 1 (docs/local-first-harmonization.md §1.6,
// 0.45): the persisted query cache with its scrub list, the sign-out question while changes
// wait, the service-worker update prompt, and the shared-computer choice.
//
// The only entry point that requires `@tanstack/react-query`,
// `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` and
// `idb-keyval` — optional peers for that reason. NOT re-exported from the main barrel, which
// would make them everyone's install; the packaging contract test holds that line.
export { createQueryPersistence, DEFAULT_SCRUB_FIELDS, isCacheSafe } from "./offline/query-persistence";
export type {
  QueryPersistence,
  QueryPersistenceOptions,
  QueryPersistenceStorage,
  ScrubField,
} from "./offline/query-persistence";
export { SignOutPendingDialog, DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS } from "./offline/sign-out-pending-dialog";
export type { SignOutPendingDialogProps, SignOutPendingDialogLabels } from "./offline/sign-out-pending-dialog";
export { PwaUpdatePrompt, DEFAULT_PWA_UPDATE_PROMPT_LABELS } from "./offline/pwa-update-prompt";
export type { PwaUpdatePromptProps, PwaUpdatePromptLabels } from "./offline/pwa-update-prompt";
export {
  SharedComputerChoice,
  DEFAULT_SHARED_COMPUTER_LABELS,
  isSharedComputer,
  setSharedComputer,
} from "./offline/shared-computer";
export type { SharedComputerChoiceProps, SharedComputerLabels, SharedComputerStorage } from "./offline/shared-computer";
