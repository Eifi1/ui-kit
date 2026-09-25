import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import { DialogFrame } from "./dialog-frame";
import { Button } from "./ui";

/**
 * The `confirmDialog` namespace of `<UiKitProvider labels>`: the two buttons' fallback
 * text. A call that knows what it is confirming says so per call (`confirmLabel:
 * "Delete budget"`), which is what the dialog is for — these are for the rest.
 */
export interface ConfirmDialogLabels {
  confirm: string;
  cancel: string;
}

export const DEFAULT_CONFIRM_DIALOG_LABELS: ConfirmDialogLabels = {
  confirm: "Confirm",
  cancel: "Cancel",
};

export type ConfirmTone = "danger" | "warning" | "neutral";

export interface ConfirmOptions {
  /** The question, and the dialog's accessible name. */
  title: ReactNode;
  /** The smaller line under it — the consequence. Wired to `aria-describedby`. */
  body?: ReactNode;
  /** Default: `confirmDialog.confirm` from the provider, else "Confirm". */
  confirmLabel?: ReactNode;
  /** Default: `confirmDialog.cancel` from the provider, else "Cancel". */
  cancelLabel?: ReactNode;
  /**
   * `"danger"` for what cannot be undone (a delete): the confirm is the destructive
   * button and focus starts on CANCEL. `"warning"` and `"neutral"` (default) start on
   * the confirm. See {@link ConfirmProvider} for why the two differ.
   */
  tone?: ConfirmTone;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * `const confirm = useConfirm()` → `if (!(await confirm({ title }))) return`.
 *
 * The returned function is STABLE for the life of the provider, so it can sit in an
 * effect's or a `useCallback`'s dependency list without re-running it.
 *
 * Throws outside a {@link ConfirmProvider}, rather than falling back to
 * `window.confirm`: a silent fallback is exactly the native dialog the three apps are
 * migrating away from, and it would look like the migration had worked.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm() must be called below a <ConfirmProvider>.");
  }
  return confirm;
}

interface Request extends ConfirmOptions {
  id: number;
  resolve: (answer: boolean) => void;
}

export interface ConfirmProviderProps {
  children: ReactNode;
}

/**
 * The host for {@link useConfirm}: ONE confirm dialog for the whole app, rendered on
 * {@link DialogFrame}, answering a promise.
 *
 * Asked for by all three apps at once — keksdose has 20+ `window.confirm` calls,
 * kastlan 7, lenkbank 1. The native dialog cannot be translated past its OK/Cancel
 * (those are the BROWSER's language, not the app's), cannot say which button is the
 * destructive one, and on an installed PWA it prints the origin over the question.
 * A promise is what lets each of those call sites change by one `await`:
 *
 *     if (!window.confirm(t("budget.delete_confirm"))) return;
 *     // becomes
 *     if (!(await confirm({ title: t("budget.delete_confirm"), tone: "danger" }))) return;
 *
 * ## Its own provider, not part of `UiKitProvider`
 *
 * `UiKitProvider` renders nothing: it is strings and a locale, it is optional, and it
 * NESTS (an inner one re-labels one table). A dialog host inside it would mount a host
 * per nested provider, and a component under the inner one would open a second dialog
 * layer of its own. So the host is its own component, mounted once — inside the
 * `UiKitProvider` whose strings it should speak, which is also the order the labels
 * need.
 *
 * ## Focus
 *
 * On CANCEL for `tone: "danger"`, on CONFIRM otherwise. A confirm is often answered by
 * a reflexive Enter — the key that pressed the Delete button in the first place may
 * still be down — and for an action that cannot be undone that reflex must land on the
 * harmless answer; `DangerConfirm` makes the same call ("never to the destructive
 * button itself"). For everything else the confirm is the expected answer and Enter
 * accepting it is what `window.confirm` taught users, which the migrating call sites'
 * users already rely on. Focus returns to whatever opened it, through `Modal`'s trap.
 *
 * ## Escape, the backdrop, Back and Cancel all answer `false`
 *
 * Only the confirm button answers `true`. Anything that merely dismisses is a no.
 *
 * ## A second `confirm` while one is open QUEUES
 *
 * It is shown when the first is answered, and each call gets its own answer. The
 * alternative — answering the open one `false` to make room — would answer a question
 * the user never answered: a background prompt ("your session is about to expire")
 * would cancel the delete they were reading. `false` has to mean "the user said no".
 * A double-click cannot queue two of the same: the first click opens the modal
 * synchronously (a discrete event's update is flushed before the next one), so the
 * second lands on the open dialog rather than on the button — at worst on its
 * backdrop, which answers `false`, the safe way to be wrong.
 *
 * Unmounting the provider answers everything still pending `false`, so no caller's
 * `await` hangs forever.
 *
 * ## keksdose's synchronous call (transaction-swipe-plan.ts)
 *
 * `buildTxSwipeActions` is synchronous, but its `window.confirm` sits inside the
 * action THUNK (`confirmed(key, run)` returns `() => { if (confirm(…)) run() }`), and a
 * thunk may be async without its caller knowing. So the plan builder stays
 * synchronous; it takes the confirm as an argument and the thunk awaits it:
 *
 *     // mobile-transaction-list.tsx
 *     const confirm = useConfirm();
 *     buildTxSwipeActions({ tx, …, confirm });
 *
 *     // transaction-swipe-plan.ts
 *     const confirmed = (messageKey: string, run: () => void) => () => {
 *       void confirm({ title: t(messageKey), tone: "danger" }).then((ok) => ok && run());
 *     };
 *
 * Its test then passes `confirm: vi.fn(async () => false)` instead of stubbing the
 * global, and asserts after an `await` (the mutation now runs a microtask later). The
 * row snaps back when the swipe commits, before the answer — which is right: the
 * dialog, not the half-swiped row, is where the question now is.
 */
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [queue, setQueue] = useState<Request[]>([]);
  const nextId = useRef(0);
  // Every unanswered request, including the ones not yet in state — the unmount
  // cleanup below must reach a request made in the same tick it unmounts.
  const pending = useRef(new Set<Request>());

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        const request: Request = { ...options, id: ++nextId.current, resolve };
        pending.current.add(request);
        setQueue((q) => [...q, request]);
      }),
    [],
  );

  useEffect(() => {
    const open = pending.current;
    return () => {
      for (const r of open) r.resolve(false);
      open.clear();
    };
  }, []);

  const answer = useCallback((request: Request, value: boolean) => {
    if (!pending.current.delete(request)) return;
    request.resolve(value);
    setQueue((q) => q.filter((r) => r !== request));
  }, []);

  const current = queue[0];
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {current && (
        // Keyed per request, so a queued one gets a fresh Modal: the first one's trap
        // hands focus back to the page, and the next one's captures that as its own
        // restore target instead of a button that has just been unmounted.
        <ConfirmDialogView key={current.id} request={current} onAnswer={answer} />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialogView({
  request,
  onAnswer,
}: {
  request: Request;
  onAnswer: (request: Request, value: boolean) => void;
}) {
  const labels = useKitLabels("confirmDialog", DEFAULT_CONFIRM_DIALOG_LABELS);
  const tone = request.tone ?? "neutral";
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Set by the confirm button, read once the panel has finished lowering. Everything
  // else that ends in `onClose` — Escape, the backdrop, Back, Cancel — leaves it false.
  const accepted = useRef(false);

  // In THIS component's effect, which runs after `Modal`'s own (a parent's effects run
  // after its children's). `Modal` engages its focus trap on the panel first — and
  // records the page's focused element as the restore target — and only then does
  // focus move to the button. Focusing it from inside the panel would run first and
  // make the button the restore target.
  useEffect(() => {
    (tone === "danger" ? cancelRef : confirmRef).current?.focus();
  }, [tone]);

  return (
    <DialogFrame
      title={request.title}
      description={request.body}
      onClose={() => onAnswer(request, accepted.current)}
      // A confirmation interrupts to ask a question that must be answered.
      role="alertdialog"
      data-confirm-tone={tone}
      actions={(close) => (
        <>
          <Button ref={cancelRef} type="button" variant="ghost" onClick={close}>
            {request.cancelLabel ?? labels.cancel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              accepted.current = true;
              close();
            }}
          >
            {request.confirmLabel ?? labels.confirm}
          </Button>
        </>
      )}
    />
  );
}
