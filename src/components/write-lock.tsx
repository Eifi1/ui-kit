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

/**
 * What kind of lock a source is (docs/billing-harmonization.md §12.36, ui-kit 0.33).
 * `"demo"` (the read-only demo, `demo.writeLocked`) and `"billing"` (a lapsed plan,
 * `billing.lockReason`) are the kit's; an app names its own — Kurvenschmiede's
 * `"access"` (a curve shared to view) and `"customer"` (an account that owns nothing).
 * A control exempts itself from a kind with {@link CommitScope}; a source without a
 * kind is never exempted.
 */
export type WriteLockKind = "demo" | "billing" | (string & {});

/** One locked source, as the provider holds it: its kind and its one sentence. */
export interface WriteLockHold {
  kind: WriteLockKind | undefined;
  reason: ReactNode;
}

/**
 * A control's opt-in to the lock — the type of every `commit` prop in the kit.
 *
 * - `true`: every lock refuses the control (a save, an add, an invite).
 * - `{ except: [kinds] }`: every lock but those kinds. A billing lock leaves the
 *   reader able to remove access, revoke sessions, delete the account and change their
 *   own settings (§3.3, §12.13), so the kit's parts for those take
 *   {@link COMMIT_EXCEPT_BILLING} built in, and an app's own controls of that sort do
 *   too.
 * - `false` or left out: no lock reaches it.
 *
 * Under a demo lock and a billing lock together, a control exempt from billing is
 * still refused, with the demo's reason.
 */
export type CommitScope = boolean | { readonly except: readonly WriteLockKind[] };

/** Every lock but billing's: the scope of an action a lapsed plan still allows — removing
 *  access, the account's own settings, an operator's admin route (§12.13). One constant,
 *  so the call sites read alike. */
export const COMMIT_EXCEPT_BILLING = { except: ["billing"] } as const;

/**
 * What {@link useWriteLock} returns: whether commits are locked here as a control with
 * the scope asked for sees it, and why.
 */
export interface WriteLock {
  locked: boolean;
  /** The one sentence a locked commit shows in its tooltip: the first hold in scope's.
   *  Always set while `locked`; `undefined` when not. */
  reason: ReactNode | undefined;
  /** The first hold in scope's kind; `undefined` while unlocked, or for a source that
   *  names none. */
  kind: WriteLockKind | undefined;
  /**
   * EVERY locked source the provider holds, in the order the server refuses them
   * (§12.3: the demo's 403 before billing's 402) — unfiltered by the scope, for code
   * that must know what else locks (a toast that names the plan, a swipe plan). Empty
   * while the provider is unlocked.
   */
  holds: readonly WriteLockHold[];
}

const NO_HOLDS: readonly WriteLockHold[] = [];

const UNLOCKED: WriteLock = { locked: false, reason: undefined, kind: undefined, holds: NO_HOLDS };

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
  /** What kind of lock this is — `"demo"`, `"billing"` or the app's own (see
   *  {@link WriteLockKind}), for a provider of one source. Left out, no control can be
   *  exempt from it. */
  kind?: WriteLockKind;
  /**
   * Every locked source, in refusal order — what `combineWriteLocks` answers, so
   * `<WriteLockProvider {...combineWriteLocks([...])}>` carries them. Given while
   * `locked`, it wins over `kind` and `reason`; a hold without a reason takes
   * `labels.reason`.
   */
  holds?: readonly WriteLockHold[];
  labels?: Partial<WriteLockLabels>;
  children?: ReactNode;
}

// `null`/`""`/`false` count as "no reason given": a lock whose tooltip is empty would be
// a disabled button that cannot say why, the thing this replaces.
function given(reason: ReactNode): boolean {
  return reason !== undefined && reason !== null && reason !== false && reason !== "";
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
 * **A lock says its source** (0.33, docs/billing-harmonization.md §12.36). A lapsed
 * plan locks creating and changing, but not removing access or the account's own
 * settings (§3.3, §12.13), and the kit's parts for those hard-coded `commit` — so
 * kastlan's app-wide lock locked a member's own sign-out everywhere. Each source now
 * has a kind, the provider holds every locked one in order (`holds`, from
 * `combineWriteLocks`), and a control's `commit` may name the kinds it is exempt from
 * ({@link CommitScope}). The kit's parts follow §3.3 and §12.13 by themselves.
 *
 * Nested providers: the nearest wins, so an inner `locked={false}` reopens a section
 * the caller may write (a viewer's own notes on a shared curve) — every source at
 * once — and an inner lock with its own reason (Kurvenschmiede's owner lock beside the
 * viewer lock) overrides the outer one's sentence and its holds.
 */
export function WriteLockProvider({ locked, reason, kind, holds, labels, children }: WriteLockProviderProps) {
  // The `writeLock` namespace: prop > `<UiKitProvider labels>` > English.
  const fallback = useKitLabels("writeLock", DEFAULT_WRITE_LOCK_LABELS, labels).reason;
  // `holds` wins while it has any; otherwise this provider is one source of its own.
  const several = locked && holds !== undefined && holds.length > 0 ? holds : undefined;
  const firstKind = several ? several[0].kind : kind;
  const firstGiven = several ? several[0].reason : reason;
  const firstReason = given(firstGiven) ? firstGiven : fallback;
  // Memoised on the first hold's kind and sentence — the strings an app passes — so a
  // one-source lock keeps one context value across renders; a list of several is
  // memoised on its own identity.
  const many = several && several.length > 1 ? several : undefined;
  const value = useMemo<WriteLock>(() => {
    if (!locked) return UNLOCKED;
    const all = many
      ? many.map((hold) => ({ kind: hold.kind, reason: given(hold.reason) ? hold.reason : fallback }))
      : [{ kind: firstKind, reason: firstReason }];
    return { locked: true, reason: firstReason, kind: firstKind, holds: all };
  }, [locked, many, firstKind, firstReason, fallback]);
  return <WriteLockContext.Provider value={value}>{children}</WriteLockContext.Provider>;
}

/**
 * Whether a hold refuses a control with this scope: `true` refuses with every hold,
 * `{ except }` with every hold whose kind it does not name. A hold with no kind is
 * never exempted — an app that forgot to name its source must not reopen by accident.
 */
function inScope(hold: WriteLockHold, scope: CommitScope): boolean {
  if (scope === true) return true;
  if (scope === false) return false;
  return hold.kind === undefined || !scope.except.includes(hold.kind);
}

/**
 * The lock as a control with `scope` sees it — {@link useWriteLock}'s answer, pure, for
 * a scope known only at call time: `useConfirm` reads the CALLER's lock when it is
 * called, and applies each `confirm({ commit })`'s own scope to it when it runs.
 *
 * `undefined` and `false` see no lock (a control without `commit`); `true` sees the
 * lock as it is; `{ except }` sees the first hold of another kind, with its reason
 * and kind. `holds` is passed on unfiltered.
 */
export function writeLockFor(lock: WriteLock, scope: CommitScope | undefined): WriteLock {
  if (!lock.locked || scope === true) return lock;
  // A lock built by hand (a test's, an app's own context) may carry no holds: it is
  // then the one source it describes.
  const holds = lock.holds.length > 0 ? lock.holds : [{ kind: lock.kind, reason: lock.reason }];
  const first = scope === undefined ? undefined : holds.find((hold) => inScope(hold, scope));
  if (!first) return { ...UNLOCKED, holds: lock.holds };
  // The first in scope is the provider's own first: the lock as it is, same object.
  if (first === holds[0]) return lock;
  return { locked: true, reason: first.reason, kind: first.kind, holds: lock.holds };
}

/**
 * The nearest {@link WriteLockProvider}'s lock, as a control with `scope` sees it —
 * unlocked with no provider. Left out, the scope is `true`: every lock.
 *
 * For code that must KNOW rather than a control that opts in: a toast that says why,
 * a swipe plan that leaves an action out, a hand-rolled toggle that disables itself.
 * `useWriteLock(COMMIT_EXCEPT_BILLING)` answers "would a lapsed plan's lock refuse me?"
 * as a removal sees it — what keksdose's `useWriteLockKind() !== "billing"` asked.
 */
export function useWriteLock(scope: CommitScope = true): WriteLock {
  return writeLockFor(useContext(WriteLockContext), scope);
}

/**
 * The `disabledReason` a control with `commit` should use: the lock's reason while
 * the lock refuses this scope — it wins over the control's own, since it is the answer
 * to the question the hover is asking — else the control's own. Internal to the kit's
 * commit controls.
 */
export function useCommitReason(commit: CommitScope | undefined, own: ReactNode): ReactNode {
  const lock = writeLockFor(useContext(WriteLockContext), commit);
  return lock.locked ? lock.reason : own;
}
