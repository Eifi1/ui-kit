/**
 * A page's mutation in either of the forms the feedback parts take, run once (refactor
 * audit 2026-10-30, FLW-3).
 *
 * The parts used to take TanStack Query's `mutate` with a per-call `onSuccess`. TanStack
 * v5 calls per-call callbacks for the LATEST `mutate()` on an observer only — it
 * overwrites the options and detaches from the earlier mutation — so a second change sent
 * before the first PATCH answered (another swipe, another pill, the Undo itself) lost the
 * first change's Undo toast, and the detail's editor stayed open. The promise
 * `mutateAsync` returns settles for every call, whatever the observer does next.
 *
 * Both forms are called the same way — the patch and `{ onSuccess }` — and the answer is
 * taken from whichever comes first: the callback, or the promise the call returned. A
 * rejected promise is the mutation's own to report (its `onError`), so it is caught here
 * and nothing more happens.
 *
 * @internal Not part of `/feedback` or the barrel.
 */

/**
 * A mutation in either form: the promise form (0.52) — TanStack's `mutateAsync`, any
 * `(patch) => Promise` — or the callback form before it — TanStack's `mutate`, a function
 * that calls `onSuccess` once the PATCH has landed, and only then. One signature for
 * both, so an inline function handed to a prop of this type gets its parameter types (a
 * union of the two leaves `async (patch) => …` an implicit `any`).
 */
export type FeedbackMutationCall<P> = (patch: P, callbacks: { onSuccess: () => void }) => void | Promise<unknown>;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Send `patch` through `call`, and run `landed` once when it has landed. */
export function runMutation<P>(call: FeedbackMutationCall<P>, patch: P, landed: () => void): void {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    landed();
  };
  const answer: unknown = call(patch, { onSuccess: once });
  if (isThenable(answer)) answer.then(once, () => undefined);
}
