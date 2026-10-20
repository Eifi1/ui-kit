// `@eifi1/ui-kit/push-worker` — the service worker's half of Web Push (0.46,
// docs/notifications-harmonization.md §10.6 rule 5): re-registering a subscription the browser
// rotated. A worker bundle imports from here, never from the main barrel, which reaches React
// and the DOM components:
//
//     // sw.ts
//     import { handlePushSubscriptionChange } from "@eifi1/ui-kit/push-worker";
//
// Worker-safe: this entry reaches no package and no module but src/notifications/push-worker.ts
// (packaging-contract.test.ts, scripts/check-module-graph.mjs, scripts/verify-package.mjs).
// The main barrel keeps re-exporting the same names, so an existing import keeps working.
export {
  PUSH_SUBSCRIPTION_CHANGED,
  handlePushSubscriptionChange,
  pushSubscriptionInput,
  resubscribeAfterChange,
} from "./notifications/push-worker";
export type {
  PushReplaceInput,
  PushResubscribeOutcome,
  PushSubscriptionChangeEventLike,
  PushSubscriptionChangeOptions,
  PushSubscriptionInput,
  PushWorkerScope,
} from "./notifications/push-worker";
