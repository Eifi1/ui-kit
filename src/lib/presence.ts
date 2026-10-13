import type { ReactNode } from "react";

/**
 * Whether a node says anything — the one copy of the rule (DUP-11, refactor audit
 * 2026-10: it was written fourteen times as `hasContent` / `hasMessage` / `hasReason` /
 * `present` / `given`, and FeedbackComposer's own `!= null && !== false` drifted from it
 * and took `""` for a reason).
 *
 * `undefined`, `null`, `false` and `""` are what a caller's `cond && "…"` or
 * `touched && errors.x` evaluates to when there is nothing to say; none of them is
 * content, and pointing a control's `aria-describedby` at one would describe it with an
 * empty node. A numeric `0` is content.
 *
 * Package-private — not re-exported from the barrel.
 */
export function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}
