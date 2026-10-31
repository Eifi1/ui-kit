import type { ReactNode } from "react";
import { hasContent } from "./presence";

/**
 * The failure ladder, once: the app's words for a failure when it has any, else the
 * kit's `fallback`.
 *
 * "Any" is {@link hasContent}, so an app's `describeError` answering `""` (nothing to say
 * about this one) gets the kit's sentence. Written as `own ?? fallback` in the auth forms,
 * where `""` printed an empty alert, and both ways within one file in the reviewer scope
 * editor; it lived in the notification cards' parts only (refactor audit 2026-10-30,
 * DUP-14).
 *
 * @internal Package-private — not re-exported from the barrel.
 */
export function describeFailure(own: ReactNode | undefined, fallback: ReactNode): ReactNode {
  return hasContent(own) ? own : fallback;
}
