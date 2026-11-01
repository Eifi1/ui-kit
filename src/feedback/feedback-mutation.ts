/**
 * A page's mutation, run once (refactor audit 2026-10-30, FLW-3): TanStack Query's
 * `mutateAsync`, or any `(patch) => Promise` that resolves once the PATCH has landed.
 *
 * The parts took TanStack Query's `mutate` with a per-call `onSuccess` until 0.53
 * (deprecated in 0.52). TanStack v5 calls per-call callbacks for the LATEST `mutate()` on
 * an observer only — it overwrites the options and detaches from the earlier mutation —
 * so a second change sent before the first PATCH answered (another swipe, another pill,
 * the Undo itself) lost the first change's Undo toast, and the detail's editor stayed
 * open. The promise `mutateAsync` returns settles for every call, whatever the observer
 * does next.
 *
 * A rejected promise is the mutation's own to report (its `onError`), so it is caught here
 * and nothing more happens.
 *
 * @internal Not part of `/feedback` or the barrel.
 */
export function runMutation<P>(call: (patch: P) => Promise<unknown>, patch: P, landed: () => void): void {
  call(patch).then(landed, () => undefined);
}
