import { Children, useContext, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useKitLabels } from "../i18n/kit-labels";
import { AlertBanner } from "../components/alert-banner";
import { Checkbox } from "../components/checkbox";
import { DEFAULT_DANGER_CONFIRM_LABELS, TypedConfirmField, typedMatches } from "../components/danger-confirm";
import type { DangerConsequence } from "../components/danger-confirm";
import { DialogFrame } from "../components/dialog-frame";
import { ModalCloseContext } from "../components/modal";
import { Button } from "../components/ui";
import { authErrorCode } from "../auth/auth-errors";
import type { KitErrorCode } from "../auth/auth-errors";
import { hasMessage, usePersonLabel } from "./admin-parts";
import type { AdminPerson, MaybePromise } from "./admin-parts";
import type { CommitScope } from "../components/write-lock";

/**
 * The confirmation in front of an admin action, at the level the SERVER states
 * (docs/user-admin-harmonization.md §4.2):
 *
 * | level | what it asks | actions |
 * |---|---|---|
 * | `none` | nothing: it confirms at once and renders nothing | resend a mail, reactivate, the reviewer scope… |
 * | `acknowledge` | a tick under the consequence | force a password change, change a role |
 * | `type_email` | the target's address, typed | deactivate, erase now, transfer |
 *
 * keksdose decides the level per action and per account on the server
 * (`admin_user_actions_service`) and Kurvenschmiede asks for the typed address on its
 * two hard-to-undo actions; both drew the dialog by hand beside the kit's `DangerConfirm`
 * and `useConfirm`. The level is a PROP, never derived here: the server enforces it and
 * a hand-written request never sees this dialog, so a page that guessed its own level
 * could only disagree with the server. The comparison (caseless), the field and the tick
 * are `DangerConfirm`'s (`TypedConfirmField`, the `dangerConfirm` words), so the three
 * confirmations in the kit cannot disagree about what counts as the address.
 *
 * WHY TYPE THE TARGET'S ADDRESS and not the admin's password: the admin proved who they
 * are at the admin gate. What is unproven is which ROW they are on (keksdose's
 * `TYPE_EMAIL` rule, Kurvenschmiede's `TypedConfirm`).
 *
 * THE REFUSALS (§4.1, §9.6) are read by code — `authErrorCode`, which knows the account
 * codes beside the sign-in ones — and stay in the dialog, which stays open so the admin
 * can read them: `last_admin`, `self_action`, `confirmation_mismatch`, and kastlan's
 * `other_companies` — with "Remove from company" offered in its place when the app passes
 * `onRemoveFromCompany`. Anything else is `describeError`'s words, else "That didn't work".
 * At level `none` nothing is drawn while the action runs; a refusal opens a dialog of its
 * own to say it.
 *
 * It never sends a request: `onConfirm` does, with what the guards were answered with.
 */

/** How much confirmation an action needs — the server's `confirmation_level(action)`. */
export type AdminConfirmLevel = "none" | "acknowledge" | "type_email";

/** What {@link AdminActionConfirmProps.onConfirm} receives — the guards' answers, for
 *  the request body (the server re-checks both). */
export interface AdminActionConfirmValues {
  /** `type_email`: the address as typed — trimmed, its case the admin's; the body's
   *  `confirm_email`, which the server compares with the account's (server-kit's
   *  `confirm_email_matches`). */
  confirmEmail?: string;
  /** `acknowledge` and `type_email`: the action was confirmed past a guard — the body's
   *  `acknowledged`, which every admin action carries (server-kit 0.4). */
  acknowledged?: true;
}

/** The account the action is about. */
export type AdminActionTarget = AdminPerson & { email: string };

/** The `adminAction` namespace. The tick, the typed field and their held-button reasons
 *  are the `dangerConfirm` namespace's, shared with `DangerConfirm`. */
export interface AdminActionLabels {
  /** The confirm button when the action names none. */
  confirm: string;
  cancel: string;
  /** The refusal dialog's only button (level `none`). */
  close: string;
  /** `409 last_admin`. */
  lastAdmin: string;
  /** `409 self_action`: the admin's own account. */
  self: string;
  /** `confirmation_mismatch`: the typed address is not this account's — the page and
   *  the server disagree about which row this is. */
  confirmationMismatch: string;
  /** kastlan's `409 other_companies` (§9.6). */
  otherCompanies: string;
  /** The alternative offered with it. */
  removeFromCompany: string;
  /** Any other failure, unless `describeError` says better. */
  failed: string;
}

export const DEFAULT_ADMIN_ACTION_LABELS: AdminActionLabels = {
  confirm: "Confirm",
  cancel: "Cancel",
  close: "Close",
  lastAdmin: "This is the last active administrator. Make someone else an administrator first.",
  self: "You can’t do this to your own account.",
  confirmationMismatch: "The address doesn’t match this account. Check which account you are on.",
  otherCompanies:
    "This account also belongs to other companies, so only the platform operator can do this. You can remove it from this company instead.",
  removeFromCompany: "Remove from company",
  failed: "That didn’t work. Please try again.",
};

export interface AdminActionConfirmProps {
  /** The level the server states for this action on this account (§4.2). */
  level: AdminConfirmLevel;
  /** Whom it is about: the address (typed at `type_email`) and the name parts. */
  target: AdminActionTarget;
  /** The confirm button — "Deactivate". Also the title when no `title` is given. */
  confirmLabel?: ReactNode;
  /** The dialog's heading — "Deactivate Ada Example?". Default `confirmLabel`. */
  title?: ReactNode;
  /**
   * What the action does to THIS account, said before it happens: a sentence, or lines
   * (`DangerConsequence`, a `severe` one in the danger colour). Derive them from the
   * row's facts rather than reciting the worst case (keksdose dev#488).
   */
  consequence?: ReactNode | readonly (string | DangerConsequence)[];
  /** The tick's words at `acknowledge`. Default `dangerConfirm.acknowledge` — "I have
   *  read what this does and want to continue." */
  acknowledgeLabel?: ReactNode;
  /** `danger` (default at `type_email`): a red confirm. `warning` (default at
   *  `acknowledge`) and `neutral`: the primary confirm. */
  tone?: "danger" | "warning" | "neutral";
  /**
   * Runs the action. Return a promise and the dialog manages itself: busy until it
   * settles, closed (`onClose(true)`) when it resolves, open with the refusal when it
   * rejects. Return nothing and the app owns the rest — `busy`, `error`, closing it.
   */
  onConfirm: (values: AdminActionConfirmValues) => MaybePromise;
  /** The dialog has closed: `true` after the action (or the alternative) went through,
   *  `false` for Cancel, Escape, the backdrop or Back. */
  onClose: (done: boolean) => void;
  /** kastlan: offered with an `other_companies` refusal — `DELETE …/membership`,
   *  logged as `membership_remove` (§4.1). Promise handling as `onConfirm`. */
  onRemoveFromCompany?: () => MaybePromise;
  /** The app's words for a failure the kit has no code for. Asked first. */
  describeError?: (error: unknown) => ReactNode | undefined;
  /** A refusal the app caught itself, when `onConfirm` returns nothing. */
  error?: unknown;
  /** The action is running, for an app that tracks it itself. */
  busy?: boolean;
  /**
   * Fields of the action's own, above the guard — the transfer's recipient, kastlan's
   * roles (`RolesEditor`). Their values are the app's; hold the confirm with
   * `confirmDisabledReason` until they are complete.
   */
  children?: ReactNode;
  /** Why the confirm is held for a reason of the app's ("Choose who receives it").
   *  Named before the guard's own, since the fields are above it. */
  confirmDisabledReason?: ReactNode;
  /** Kept-mounted mode, as on `DialogFrame`; left out, open while mounted. */
  open?: boolean;
  /** The confirm COMMITS: under a locked `WriteLockProvider` it is held with the lock's
   *  reason. Off by default — an admin action is not a write to the open record. */
  commit?: CommitScope;
  labels?: Partial<AdminActionLabels>;
}

/** Whether a callback answered a promise. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && typeof (value as PromiseLike<unknown>).then === "function";
}

/** The refusal's words and code. */
function refusalOf(
  error: unknown,
  present: boolean,
  describeError: AdminActionConfirmProps["describeError"],
  labels: AdminActionLabels,
): { text: ReactNode; code: KitErrorCode | undefined } | null {
  if (!present) return null;
  const code = authErrorCode(error);
  const own = describeError?.(error);
  if (hasMessage(own)) return { text: own, code };
  const text =
    code === "last_admin"
      ? labels.lastAdmin
      : code === "self_action"
        ? labels.self
        : code === "confirmation_mismatch"
          ? labels.confirmationMismatch
          : code === "other_companies"
            ? labels.otherCompanies
            : labels.failed;
  return { text, code };
}

/** The selector for the first field among the caller's `children` — what opening focuses. */
const FIELD = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="combobox"]';

export function AdminActionConfirm({
  level,
  target,
  confirmLabel,
  title,
  consequence,
  acknowledgeLabel,
  tone: toneProp,
  onConfirm,
  onClose,
  onRemoveFromCompany,
  describeError,
  error: errorProp,
  busy: busyProp,
  children,
  confirmDisabledReason,
  open,
  commit,
  labels: labelsProp,
}: AdminActionConfirmProps) {
  const labels = useKitLabels("adminAction", DEFAULT_ADMIN_ACTION_LABELS, labelsProp);
  const guardLabels = useKitLabels("dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS);
  const nameOf = usePersonLabel();
  const isOpen = open ?? true;
  const [typed, setTyped] = useState("");
  const [ticked, setTicked] = useState(false);
  const [pending, setPending] = useState(false);
  // The last rejection, boxed so a rejection with `undefined` still counts as one.
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  // Resolved: the actions row lowers the panel, and `onClose` answers true.
  const [done, setDone] = useState(false);
  const confirmed = useRef(false);
  const mounted = useRef(true);
  const started = useRef(false);
  const formId = useId();
  const slotRef = useRef<HTMLDivElement>(null);
  const guardRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A close (kept-mounted) wipes the guards and the refusal: a reopened dialog starts
  // over. During render, like ReauthDialog's, so no frame shows the old answers.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setTyped("");
      setTicked(false);
      setFailure(null);
      setDone(false);
    }
  }

  const busy = Boolean(busyProp) || pending;

  /** Runs `call`, managing busy, the refusal and the close — or not, when it answers
   *  no promise (the app owns it then). */
  const perform = (call: () => MaybePromise) => {
    let result: MaybePromise;
    try {
      result = call();
    } catch (caught) {
      setFailure({ error: caught });
      return;
    }
    if (!isThenable(result)) return;
    setFailure(null);
    setPending(true);
    result.then(
      () => {
        if (!mounted.current) return;
        setPending(false);
        confirmed.current = true;
        setDone(true);
      },
      (caught: unknown) => {
        if (!mounted.current) return;
        setPending(false);
        setFailure({ error: caught });
      },
    );
  };

  // Level `none`: confirmed the moment it opens, once per opening. Nothing is drawn
  // while it runs; the promise's answer comes back asynchronously.
  useEffect(() => {
    if (level !== "none") return;
    if (!isOpen) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;
    confirmed.current = false;
    let result: unknown;
    try {
      result = onConfirm({});
    } catch (caught) {
      result = Promise.reject(caught);
    }
    // No promise: the app owns the rest (it closes the part, or passes `error`).
    if (!isThenable(result)) return;
    result.then(
      () => {
        if (mounted.current) onClose(true);
      },
      (caught: unknown) => {
        if (mounted.current) setFailure({ error: caught });
      },
    );
  }, [level, isOpen, onConfirm, onClose]);

  // Focus the first thing the dialog waits for, after Modal's own effect has recorded
  // the trigger to return to (a parent's effects run after its children's).
  useEffect(() => {
    if (!isOpen || level === "none") return;
    const field = slotRef.current?.querySelector<HTMLElement>(FIELD) ?? guardRef.current;
    field?.focus();
  }, [isOpen, level]);

  const hasRefusal = failure !== null || errorProp !== undefined;
  const refusal = refusalOf(failure ? failure.error : errorProp, hasRefusal, describeError, labels);
  const offerRemoval = refusal?.code === "other_companies" && onRemoveFromCompany !== undefined;

  const name = nameOf(target);
  const identity = (
    <span data-private>{name && name !== target.email ? `${name} · ${target.email}` : target.email}</span>
  );
  const heading = title ?? confirmLabel ?? labels.confirm;

  const refusalBanner = refusal && (
    <AlertBanner
      tone="danger"
      size="sm"
      action={
        offerRemoval ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => perform(() => onRemoveFromCompany!())}
          >
            {labels.removeFromCompany}
          </Button>
        ) : undefined
      }
    >
      {refusal.text}
    </AlertBanner>
  );

  if (level === "none") {
    // Nothing to ask: only a refusal is worth a dialog.
    if (!isOpen || !refusal) return null;
    return (
      <DialogFrame
        role="alertdialog"
        title={heading}
        description={identity}
        onClose={() => onClose(confirmed.current)}
        actions={(close) => (
          <CloseOnDone done={done}>
            <Button type="button" variant="secondary" disabled={busy} onClick={close}>
              {labels.close}
            </Button>
          </CloseOnDone>
        )}
      >
        {refusalBanner}
      </DialogFrame>
    );
  }

  const tone = toneProp ?? (level === "type_email" ? "danger" : "warning");
  const askTyped = level === "type_email";
  const typedOk = !askTyped || typedMatches(typed, target.email, "caseless");
  const tickOk = askTyped || ticked;
  const guardReason: ReactNode = hasMessage(confirmDisabledReason)
    ? confirmDisabledReason
    : !tickOk
      ? guardLabels.needsAcknowledge
      : !typedOk
        ? typeof guardLabels.needsPhrase === "function"
          ? guardLabels.needsPhrase(target.email)
          : guardLabels.needsPhrase
        : undefined;

  const submit = () => {
    if (busy || guardReason !== undefined) return;
    perform(() =>
      onConfirm(askTyped ? { confirmEmail: typed.trim(), acknowledged: true } : { acknowledged: true }),
    );
  };

  const lines = Array.isArray(consequence)
    ? (consequence as readonly (string | DangerConsequence)[]).map((item, index) =>
        typeof item === "string"
          ? { key: item, text: item as ReactNode, severe: false }
          : { key: item.key ?? String(index), text: item.text, severe: Boolean(item.severe) },
      )
    : null;

  return (
    <DialogFrame
      open={open}
      role="alertdialog"
      title={heading}
      description={identity}
      onClose={() => onClose(confirmed.current)}
      // A request that has left cannot be called back by closing the dialog.
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (busy && event.key === "Escape") event.preventDefault();
      }}
      aria-busy={busy || undefined}
      actions={(close) => (
        <CloseOnDone done={done}>
          <Button type="button" variant="ghost" disabled={busy} onClick={close}>
            {labels.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={tone === "danger" ? "danger" : "primary"}
            pending={busy}
            commit={commit}
            disabledReason={busy ? undefined : guardReason}
          >
            {confirmLabel ?? labels.confirm}
          </Button>
        </CloseOnDone>
      )}
    >
      <form
        id={formId}
        noValidate
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {lines ? (
          <ul className="list-disc space-y-1 ps-5 text-sm text-[var(--text-secondary)]">
            {lines.map((line) => (
              <li key={line.key} className={line.severe ? "text-[var(--danger)]" : undefined}>
                {line.text}
              </li>
            ))}
          </ul>
        ) : (
          hasMessage(consequence as ReactNode) && (
            <p className="text-sm text-[var(--text-secondary)]">{consequence as ReactNode}</p>
          )
        )}
        {Children.toArray(children).some(hasMessage) && (
          <div ref={slotRef} className="space-y-3">
            {children}
          </div>
        )}
        {askTyped ? (
          <TypedConfirmField
            ref={guardRef}
            target={target.email}
            match="caseless"
            value={typed}
            onValueChange={setTyped}
            busy={busy}
            data-private
          />
        ) : (
          <Checkbox
            ref={guardRef}
            label={acknowledgeLabel ?? guardLabels.acknowledge}
            checked={ticked}
            // Not `disabled` while busy: the box may hold the focus.
            onCheckedChange={(next) => {
              if (!busy) setTicked(next);
            }}
          />
        )}
        {refusalBanner}
      </form>
    </DialogFrame>
  );
}

/**
 * The actions row's wrapper: it renders INSIDE the Modal, where the panel's animated
 * close is in context, so a resolved action lowers the panel the way Cancel does and
 * Modal then calls `onClose` (ReauthDialog's pattern).
 */
function CloseOnDone({ done, children }: { done: boolean; children: ReactNode }) {
  const close = useContext(ModalCloseContext);
  useEffect(() => {
    if (done) close?.();
  }, [done, close]);
  return <>{children}</>;
}
