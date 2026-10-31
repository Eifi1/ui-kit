import { useEffect, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode, RefObject } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import type { CommitScope } from "./write-lock";

/**
 * "Confirm in place": a destructive press swaps its row (or a header) for a question with
 * the action and Cancel — for a card that must work without a `ConfirmProvider`, where
 * the question belongs beside the thing it names.
 *
 * Written three times since 0.34 — PasskeysSetting, PushDevicesSetting and
 * NotificationInbox's "Clear all" — and the copies drifted: the passkeys' had no `commit`
 * and no `pending`, so under a locked `WriteLockProvider` (the demo) a passkey could
 * still be deleted (refactor audit 2026-10-30, DUP-10). One copy now:
 *
 * - **Focus moves to Cancel** on open, so the Enter that pressed the trigger cannot also
 *   answer the question.
 * - **Cancel, or Escape on either button, leaves**, and focus goes back to
 *   `returnFocusRef` — the trigger, which the caller renders again in the prompt's place;
 *   otherwise the focus falls to `<body>` with the unmounted prompt. A confirm that
 *   succeeded returns nothing: the row it named is usually gone.
 * - **The action is a `commit` control** in `commit`'s scope, `pending` while `busy`.
 *
 * @internal Not part of the barrel; the cards that use it are.
 */
export interface InlineConfirmProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "prompt"> {
  /** The question, announced when it appears (`role="alert"`). */
  prompt: ReactNode;
  /** The action's words ("Delete", "Remove", "Clear all"). */
  confirmLabel: ReactNode;
  /** The action's accessible name, when its words do not say what it acts on. */
  confirmName?: string;
  cancelLabel: ReactNode;
  onConfirm: () => void;
  /** Cancel, or Escape on either button: the caller closes the prompt. */
  onLeave: () => void;
  /** The action's request runs: the action is `pending`. */
  busy?: boolean;
  /** The action's write-lock scope ({@link Button}'s `commit`). */
  commit?: CommitScope;
  /** Where focus goes once the prompt has left by Cancel or Escape: the trigger. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** The element the prompt replaces: a list row (`li`) or a header (`div`). */
  as?: "li" | "div";
}

export function InlineConfirm({
  prompt,
  confirmLabel,
  confirmName,
  cancelLabel,
  onConfirm,
  onLeave,
  busy = false,
  commit,
  returnFocusRef,
  as: Tag = "div",
  className,
  ...rest
}: InlineConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Set by a leave, read when the prompt unmounts: by then the caller has rendered the
  // trigger again and its ref is attached (refs attach before passive effects run).
  const left = useRef(false);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  useEffect(() => {
    const leaving = left;
    // Read at unmount on purpose: the node wanted is the trigger rendered in this
    // prompt's place, not whatever the ref held when the prompt opened.
    const trigger = returnFocusRef;
    return () => {
      if (leaving.current) trigger?.current?.focus();
    };
  }, [returnFocusRef]);

  const leave = () => {
    left.current = true;
    onLeave();
  };
  const escapeLeaves = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      leave();
    }
  };

  return (
    <Tag {...rest} className={cn("space-y-2", className)}>
      <p role="alert" className="text-sm">
        {prompt}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="danger"
          commit={commit}
          pending={busy}
          aria-label={confirmName}
          onClick={onConfirm}
          onKeyDown={escapeLeaves}
        >
          {confirmLabel}
        </Button>
        <Button ref={cancelRef} type="button" size="sm" variant="ghost" onClick={leave} onKeyDown={escapeLeaves}>
          {cancelLabel}
        </Button>
      </div>
    </Tag>
  );
}
