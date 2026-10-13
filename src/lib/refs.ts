/** Internal (not exported from the package): the kit's ref plumbing. Here, rather than in
 *  components/field-parts (which re-exports both), since round 0.35: Tooltip needs them,
 *  and field-parts renders a Tooltip, so importing them from there closed a cycle. */
import type { Ref, RefCallback } from "react";

/** Point a ref — a callback or an object — at `node`. `undefined` and `null` are no ref. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * One callback ref feeding several — the caller's forwarded `ref` and a field's own
 * (DUP-11: AmountInput, FormActions, ScrollArea and SearchField each wrote this by hand).
 * Wrap it in `useCallback` (or `useMemo`) over the same refs where a new callback every
 * render would detach and re-attach the node.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    for (const ref of refs) assignRef(ref, node);
  };
}
