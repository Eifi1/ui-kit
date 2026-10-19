import { useSyncExternalStore } from "react";

/**
 * vite-plugin-pwa's `registerSW` from `virtual:pwa-register` (`registerType: "prompt"`) —
 * the app passes it in, since a virtual module is the app's build's, not the kit's. It
 * answers the `updateSW(reloadPage)` function.
 */
export type RegisterServiceWorker = (options: {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}) => (reloadPage?: boolean) => Promise<void>;

/** What {@link createServiceWorkerUpdates} answers: one store per app, a module constant. */
export interface ServiceWorkerUpdates {
  /** Registers the service worker — once, however often it is called. Call it at start,
   *  before the router renders, so the sign-in pages get the offline shell too. */
  start: () => void;
  /** Whether a new version waits. */
  needRefresh: () => boolean;
  /** For `useSyncExternalStore`. */
  subscribe: (listener: () => void) => () => void;
  /** Activates the waiting version and reloads (`updateSW(true)`). Before `start`, nothing. */
  reload: () => void;
  /** The person closed the prompt: the version keeps waiting, the prompt stays down. */
  dismiss: () => void;
}

/**
 * 0.46 (kastlan K3, docs/local-first-harmonization.md §1.5 D8): the service worker
 * registered ONCE AT START, and its "a new version waits" state as a small store the
 * prompt reads wherever it lives. vite-plugin-pwa's `useRegisterSW` registers when the
 * component that calls it mounts: an app whose {@link PwaUpdatePrompt} sits in its
 * signed-in shell (it reads the tour state, the route) would register only after sign-in,
 * and the sign-in pages would lose the offline shell on a first visit.
 *
 * ```ts
 * // shared/pwa/sw-updates.ts
 * import { registerSW } from "virtual:pwa-register";
 * export const swUpdates = createServiceWorkerUpdates(registerSW);
 * // main.tsx, before render:   swUpdates.start();
 * // the shell:                 <PwaUpdatePrompt {...useServiceWorkerUpdate(swUpdates)} hold={tourRunning} />
 * ```
 */
export function createServiceWorkerUpdates(register: RegisterServiceWorker): ServiceWorkerUpdates {
  let waiting = false;
  let update: ((reloadPage?: boolean) => Promise<void>) | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const set = (value: boolean) => {
    if (waiting === value) return;
    waiting = value;
    emit();
  };
  return {
    start: () => {
      if (update) return;
      update = register({ onNeedRefresh: () => set(true) });
    },
    needRefresh: () => waiting,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reload: () => {
      void update?.(true);
    },
    dismiss: () => set(false),
  };
}

/** {@link PwaUpdatePrompt}'s props from the store: `needRefresh`, `onReload`, `onDismiss`. */
export function useServiceWorkerUpdate(updates: ServiceWorkerUpdates): {
  needRefresh: boolean;
  onReload: () => void;
  onDismiss: () => void;
} {
  const needRefresh = useSyncExternalStore(updates.subscribe, updates.needRefresh, () => false);
  return { needRefresh, onReload: updates.reload, onDismiss: updates.dismiss };
}
