import type { ReactNode, Ref } from "react";

/**
 * Small pieces the native choice controls (`Checkbox`, `Switch`) share. Private to
 * the package — not re-exported from the barrel.
 *
 * `mergeDescribedBy` and `hasMessage` restate two rules ui.tsx's `useFieldError`
 * keeps for Input/Select/Textarea; that hook is module-private and shaped around a
 * single error node, while these controls also describe themselves with a
 * `description`, so they compose the ids themselves under the same rules.
 */

/** Ids to describe the control by, merged in reading order: whatever the caller
 *  already pointed at (standing advice), then the description, then the error (the
 *  news). Merge, never replace — the rule ui.tsx's `useFieldError` keeps for Input.
 *  An empty list is `undefined`, never `""`: a dangling attribute describes the
 *  control as nothing at all. */
export function mergeDescribedBy(...ids: Array<string | false | null | undefined>): string | undefined {
  const list = ids.filter(Boolean);
  return list.length ? list.join(" ") : undefined;
}

/** `null`, `false` and `""` are what `touched && errors.x` evaluates to on the happy
 *  path. None of them is a message. */
export function hasMessage(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/** Point a forwarded ref and a local one at the same node. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}
