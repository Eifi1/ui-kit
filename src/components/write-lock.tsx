import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";

/** The words {@link WriteLockProvider} renders on its own behalf. */
export interface WriteLockLabels {
  /** The tooltip of a locked commit when the provider gives no `reason`. */
  reason: string;
}

export const DEFAULT_WRITE_LOCK_LABELS: WriteLockLabels = {
  reason: "You can view this but not change it.",
};

/** What {@link useWriteLock} returns: whether commits are locked here, and why. */
export interface WriteLock {
  locked: boolean;
  /** The one sentence a locked commit shows in its tooltip. Always set while
   *  `locked`; `undefined` when not. */
  reason: ReactNode | undefined;
}

const UNLOCKED: WriteLock = { locked: false, reason: undefined };

const WriteLockContext = createContext<WriteLock>(UNLOCKED);

export interface WriteLockProviderProps {
  /** Commits below are locked. `false` unlocks a subtree under an outer lock. */
  locked: boolean;
  /**
   * The one sentence that says why — "Shared with you to read", "Read-only demo —
   * saving is disabled", "A customer account cannot create curves". The app's policy,
   * already translated. Left out: `labels.reason`.
   */
  reason?: ReactNode;
  labels?: Partial<WriteLockLabels>;
  children?: ReactNode;
}

/**
 * The read-only lock — **everything renders; only the commit is locked.**
 *
 * keksdose (features/budgets/write-lock.tsx, the read-only demo budget) and
 * Kurvenschmiede (features/sharing/write-lock.tsx, a curve shared to view, a customer
 * account that owns nothing) each built the same `SaveGuard`: the page, its tabs,
 * forms and dialogs render exactly as for an owner, because a viewer looking at half
 * a page is not looking at what they were sent; what changes is that the control
 * that SAVES is off and says why on hover or focus. Both wrapped each Save in a
 * Tooltip and forced a native `disabled` on it — out of the tab order, so the reason
 * never reached a keyboard — and both had to remember it at thirty call sites.
 *
 * Here the page mounts one provider and each commit control opts in with `commit`
 * ({@link Button}, {@link IconButton}, {@link FormActions}): under a lock it takes the
 * kit's `disabledReason` path with this reason — `aria-disabled` and focusable,
 * every activation swallowed, the reason in the kit Tooltip and its description.
 *
 * Who is locked is the app's: the provider takes a boolean, never a role. Fields stay
 * editable — nothing in them reaches the server until the commit is pressed, and a
 * form you cannot fill in is not a demo of the form (keksdose accounts-page). A
 * control that IS its own commit (a toggle that saves on change) reads
 * {@link useWriteLock} and disables itself. The lock is a courtesy, not a guard: the
 * server still refuses the write.
 *
 * Nested providers: the nearest wins, so an inner `locked={false}` reopens a section
 * the caller may write (a viewer's own notes on a shared curve), and an inner lock
 * with its own reason (Kurvenschmiede's owner lock beside the viewer lock) overrides
 * the outer one's sentence.
 */
export function WriteLockProvider({ locked, reason, labels, children }: WriteLockProviderProps) {
  // The `writeLock` namespace: prop > `<UiKitProvider labels>` > English.
  const fallback = useKitLabels("writeLock", DEFAULT_WRITE_LOCK_LABELS, labels).reason;
  // `null`/`""`/`false` count as "no reason given": a lock whose tooltip is empty
  // would be a disabled button that cannot say why, the thing this replaces.
  const given = reason !== undefined && reason !== null && reason !== false && reason !== "";
  const resolved = locked ? (given ? reason : fallback) : undefined;
  const value = useMemo<WriteLock>(
    () => (locked ? { locked: true, reason: resolved } : UNLOCKED),
    [locked, resolved],
  );
  return <WriteLockContext.Provider value={value}>{children}</WriteLockContext.Provider>;
}

/** The nearest {@link WriteLockProvider}'s lock; unlocked with no provider. */
export function useWriteLock(): WriteLock {
  return useContext(WriteLockContext);
}

/**
 * The `disabledReason` a control with `commit` should use: the lock's reason while
 * locked — it wins over the control's own, since it is the answer to the question the
 * hover is asking — else the control's own. Internal to the kit's commit controls.
 */
export function useCommitReason(commit: boolean | undefined, own: ReactNode): ReactNode {
  const lock = useWriteLock();
  return commit && lock.locked ? lock.reason : own;
}
