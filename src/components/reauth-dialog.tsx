import { useContext, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import { CurrentPasswordInput, usePromisePending } from "./danger-confirm";
import { DialogFrame } from "./dialog-frame";
import { ModalCloseContext } from "./modal";
import { Button, Spinner } from "./ui";

/**
 * Every string the dialog renders — the `reauthDialog` namespace of
 * `<UiKitProvider labels>`, and overridable per instance through `labels`. The title,
 * description and submit button are usually worded per action ("Add a passkey"),
 * which is what the `title` / `description` / `submitLabel` props are for; these are
 * the fallbacks.
 */
export interface ReauthDialogLabels {
  title: string;
  description: string;
  /** Label of the password field. */
  password: string;
  submit: string;
  cancel: string;
}

export const DEFAULT_REAUTH_DIALOG_LABELS: ReauthDialogLabels = {
  title: "Confirm it’s you",
  description: "Enter your current password to continue.",
  password: "Current password",
  submit: "Continue",
  cancel: "Cancel",
};

export interface ReauthDialogProps {
  /**
   * Verifies the password — the app's call, e.g. the request the password guards.
   *
   * Return a promise and the dialog manages itself: busy until it settles, closes
   * (`onClose(true)`) when it resolves, STAYS OPEN with the password kept and selected
   * when it rejects — a wrong password is a typo to correct, not a sign-out. Pass the
   * reason as `error`. Return nothing and the app owns the rest: `busy` for the
   * pending state, unmounting the dialog once it is done.
   */
  onSubmit: (password: string) => void | Promise<unknown>;
  /**
   * The dialog has closed: `true` after a resolved `onSubmit`, `false` for Cancel,
   * Escape, the backdrop and Back. A dismissal while `onSubmit` is still running also
   * answers `false`, and that call's late result is then ignored.
   */
  onClose: (confirmed: boolean) => void;
  /**
   * Why the last attempt failed ("Wrong password"), shown under the field, which turns
   * invalid (`aria-invalid`, `--danger-border-strong`). The app decides the wording —
   * a 400 is a wrong password, a 500 is not. Hidden again as soon as the user edits
   * the field (the message is about the password they had typed), and shown again by
   * the next failed submit.
   */
  error?: ReactNode;
  /** The check is running, for a caller that tracks it itself (a mutation's
   *  `isPending`); a promise returned from `onSubmit` does the same on its own. */
  busy?: boolean;
  /** Default: `labels.title` — "Confirm it’s you". */
  title?: ReactNode;
  /** The line under the title. Default: `labels.description`. */
  description?: ReactNode;
  /** Text of the submit button. Default: `labels.submit` — "Continue". */
  submitLabel?: ReactNode;
  /** `"danger"` when what the password unlocks cannot be undone: the submit is then the
   *  destructive button. Default `"neutral"`. */
  tone?: "neutral" | "danger";
  /** Extra body above the field — what is about to happen, a warning. */
  children?: ReactNode;
  /** Kept-mounted mode, as on `Modal`: left out, the dialog is open while mounted. A
   *  flip to `false` animates it out and wipes the password. */
  open?: boolean;
  /** User-facing strings; see {@link ReauthDialogLabels}. */
  labels?: Partial<ReauthDialogLabels>;
}

/**
 * "Enter your current password to continue" — the step-up check in front of an
 * action that changes how an account signs in (adding a passkey) or what it can
 * reach. Kurvenschmiede asked for the password before registering a passkey in a
 * dialog of its own; keksdose asks for it inline in `DangerConfirm`'s
 * `requirePassword` tile. Both are the same three facts — the field is the CURRENT
 * password (the password manager fills it, never generates one), a wrong one stays in
 * the dialog with its error, and the APP verifies it — so the field and the
 * promise handling are `DangerConfirm`'s own, shared, and this is the modal form of
 * them.
 *
 * A component rather than a `useReauth()` promise: the step that follows the check
 * (Kurvenschmiede's WebAuthn ceremony) needs what the server answered, and the error
 * wording needs the app's own status codes — both already live in the app's mutation,
 * which this dialog only has to be handed (`onSubmit={(pw) => begin.mutateAsync(pw)}`,
 * `error={…}`).
 *
 * The field is a `<form>`, so Enter submits once something is typed. Focus starts in
 * the field and returns to the trigger through `Modal`'s trap. While a check runs,
 * the field is read-only, Cancel is disabled and Escape is held: a request that has
 * left cannot be cancelled by closing the dialog, and the dialog should not pretend it
 * can.
 */
export function ReauthDialog({
  onSubmit,
  onClose,
  error,
  busy: busyProp,
  title,
  description,
  submitLabel,
  tone = "neutral",
  children,
  open,
  labels: labelsProp,
}: ReauthDialogProps) {
  const labels = useKitLabels("reauthDialog", DEFAULT_REAUTH_DIALOG_LABELS, labelsProp);
  const [password, setPassword] = useState("");
  // The error describes the password that was submitted; once the user edits it, it
  // describes nothing on screen. Cleared by the next submit, so a second failure with
  // the same message shows again.
  const [edited, setEdited] = useState(false);
  const { pending, run } = usePromisePending();
  const busy = Boolean(busyProp) || pending;
  const inputRef = useRef<HTMLInputElement>(null);
  // `onSubmit` resolved: the actions row lowers the panel (state, so it re-renders),
  // and `onClose` answers true (a ref, because `Modal` may call the `onClose` it saw
  // BEFORE that re-render — its latest-callback ref is refreshed in an effect that runs
  // after the actions row's).
  const [done, setDone] = useState(false);
  const confirmed = useRef(false);
  const formId = useId();
  const isOpen = open ?? true;

  // A close (kept-mounted) wipes the password: it must not sit in a hidden dialog.
  // During render, like DangerConfirm's disarm, so no frame holds it.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) {
      setPassword("");
      setEdited(false);
      setDone(false);
    }
  }

  // After `Modal`'s own effect (a parent's effects run after its children's), so the
  // trap has recorded the trigger as its restore target before focus moves in.
  useEffect(() => {
    if (!isOpen) return;
    confirmed.current = false;
    inputRef.current?.focus();
  }, [isOpen]);

  const submit = () => {
    if (busy || password === "") return;
    setEdited(false);
    run(onSubmit(password), () => {
      confirmed.current = true;
      setDone(true);
    });
  };

  // A rejection leaves focus where it was (the field, or the submit button) — select
  // the password there so the retry replaces it rather than appending to it.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !done) inputRef.current?.select();
    wasPending.current = pending;
  }, [pending, done]);

  const shownError = edited ? undefined : error;
  const hasError = shownError !== undefined && shownError !== null && shownError !== false && shownError !== "";
  const errorId = useId();

  return (
    <DialogFrame
      open={open}
      title={title ?? labels.title}
      description={description ?? labels.description}
      onClose={() => onClose(confirmed.current)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (busy && e.key === "Escape") e.preventDefault();
      }}
      aria-busy={busy || undefined}
      actions={
        <ReauthActions
          formId={formId}
          done={done}
          busy={busy}
          canSubmit={password !== ""}
          danger={tone === "danger"}
          cancelLabel={labels.cancel}
          submitLabel={submitLabel ?? labels.submit}
        />
      }
    >
      {children}
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <CurrentPasswordInput
          inputRef={inputRef}
          label={labels.password}
          value={password}
          busy={busy}
          // `invalid` + a message of our own rather than `Input`'s `error`: `Input`
          // wraps itself in an extra box only while it HAS an error, so a message that
          // comes and goes remounts the <input> — and the user typing in it loses focus
          // on the first keystroke after a failed attempt. `invalid` paints the same
          // `--danger-border-strong` frame and sets `aria-invalid` without that box.
          invalid={hasError}
          describedBy={hasError ? errorId : undefined}
          onValueChange={(value) => {
            setPassword(value);
            setEdited(true);
          }}
        />
        {hasError && (
          // `Input`'s own error line (FIELD_ERROR_CLASS), drawn here — see above.
          <p id={errorId} className="mt-1 text-[11px] leading-tight text-[var(--danger)]">
            {shownError}
          </p>
        )}
      </form>
    </DialogFrame>
  );
}

/**
 * The actions row. A component of its own because it renders INSIDE the `Modal`, where
 * the panel's animated close is in context: a resolved `onSubmit` lowers the panel
 * through it, the way Cancel and Escape do, and `Modal` then calls `onClose`.
 */
function ReauthActions({
  formId,
  done,
  busy,
  canSubmit,
  danger,
  cancelLabel,
  submitLabel,
}: {
  formId: string;
  done: boolean;
  busy: boolean;
  canSubmit: boolean;
  danger: boolean;
  cancelLabel: ReactNode;
  submitLabel: ReactNode;
}) {
  const close = useContext(ModalCloseContext);
  useEffect(() => {
    if (done) close?.();
  }, [done, close]);
  return (
    <>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => close?.()}>
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        form={formId}
        variant={danger ? "danger" : "primary"}
        disabled={!canSubmit || busy}
        aria-busy={busy || undefined}
      >
        {busy && <Spinner label={null} className="h-4 w-4" />}
        {submitLabel}
      </Button>
    </>
  );
}
