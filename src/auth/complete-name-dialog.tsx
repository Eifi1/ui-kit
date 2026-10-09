import { useContext, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import { usePromisePending } from "../components/danger-confirm";
import { DialogFrame } from "../components/dialog-frame";
import { ModalCloseContext } from "../components/modal";
import { Button, Input } from "../components/ui";
import { personNameOk, PERSON_NAME_MAX_LENGTH } from "./form-rules";
import { COMMIT_EXCEPT_BILLING } from "../components/write-lock";

/** What `CompleteNameDialog` hands `onSave`: both names, trimmed, 1–120 characters —
 *  `PATCH /auth/me {first_name, last_name}` (§6.1). */
export interface CompleteNameValues {
  firstName: string;
  lastName: string;
}

/**
 * Every string the dialog renders — the `completeName` namespace of `<UiKitProvider
 * labels>`, overridable per instance through `labels`.
 */
export interface CompleteNameLabels {
  title: string;
  description: string;
  firstName: string;
  lastName: string;
  save: string;
  /** Dismisses the dialog until the next sign-in. */
  later: string;
  /** Under the fields when `onSave` rejected and the app passed no `error`. */
  failed: string;
}

export const DEFAULT_COMPLETE_NAME_LABELS: CompleteNameLabels = {
  title: "Complete your name",
  description: "First and last name are now asked for separately. Check what is filled in and add what is missing.",
  firstName: "First name",
  lastName: "Last name",
  save: "Save",
  later: "Later",
  failed: "Your name could not be saved. Please try again.",
};

export interface CompleteNameDialogProps {
  /** What the account holds now — after the migration, the old display name (§3.3). */
  firstName?: string;
  /** Usually empty: that is why the dialog is up. */
  lastName?: string;
  /**
   * Save the names (`PATCH /auth/me`). Resolve and the dialog closes (`onClose(true)`);
   * reject and it stays open with the names kept and `error` — or "Your name could not
   * be saved" — under them.
   */
  onSave: (values: CompleteNameValues) => Promise<unknown>;
  /**
   * The dialog has closed: `true` after a resolved `onSave`, `false` for "Later", Escape,
   * the backdrop and Back. `false` only DEFERS it: the app shows it again after the
   * next sign-in while `/auth/me` still answers `name_incomplete: true`.
   */
  onClose: (saved: boolean) => void;
  /** The app's words for the last failed save, instead of `labels.failed`. Hidden again
   *  once a name is edited. */
  error?: ReactNode;
  /** Kept-mounted mode, as on `Modal`: left out, the dialog is open while mounted. */
  open?: boolean;
  labels?: Partial<CompleteNameLabels>;
}

/**
 * "Complete your name" — asked once after sign-in of a user whose name was migrated
 * (docs/auth-harmonization.md §3.3). keksdose's and Kurvenschmiede's accounts had one
 * `display_name`; it moved whole into `first_name`, `last_name` stayed empty, and
 * nothing was split by guesswork (§2.4). The app shows this while `/auth/me` answers
 * `name_incomplete: true` — never for a demo user.
 *
 * Both names prefilled with what is there; "Save" waits until both have 1–120
 * characters after trimming. **"Later" only defers it**: nothing else waits on a
 * complete name, no page is blocked, and the app asks again at the next sign-in.
 *
 * The promise handling is `ReauthDialog`'s: busy while `onSave` runs (the fields
 * read-only, "Later" disabled, Escape held — a request that has left cannot be called
 * back by closing the dialog), closed on resolve, kept open on reject. Save is a
 * `commit` control, so a `WriteLockProvider` above it locks it with its reason — every
 * lock but a lapsed plan's (`COMMIT_EXCEPT_BILLING`, 0.33): one's own name is the
 * account's own settings, which billing never locks (docs/billing-harmonization.md §3.3,
 * §12.36).
 *
 * Focus starts in the first EMPTY field — the last name, as a rule — because filling it
 * in is the whole of what the dialog is for.
 */
export function CompleteNameDialog({
  firstName: initialFirst = "",
  lastName: initialLast = "",
  onSave,
  onClose,
  error,
  open,
  labels: labelsProp,
}: CompleteNameDialogProps) {
  const labels = useKitLabels("completeName", DEFAULT_COMPLETE_NAME_LABELS, labelsProp);
  const [first, setFirst] = useState(initialFirst);
  const [last, setLast] = useState(initialLast);
  // A failed save describes the names that were sent; an edit makes it stale.
  const [failed, setFailed] = useState(false);
  const { pending, run } = usePromisePending();
  const [done, setDone] = useState(false);
  const saved = useRef(false);
  const formId = useId();
  const firstRef = useRef<HTMLInputElement>(null);
  const lastRef = useRef<HTMLInputElement>(null);
  const isOpen = open ?? true;

  // Reopened (kept-mounted): start again from what the account holds. During render,
  // as ReauthDialog wipes its password, so no frame shows the old draft.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setFirst(initialFirst);
      setLast(initialLast);
      setFailed(false);
      setDone(false);
    }
  }

  // After Modal's own effect, so its trap has recorded the trigger before focus moves.
  useEffect(() => {
    if (!isOpen) return;
    saved.current = false;
    const target = firstRef.current?.value.trim() ? lastRef.current : firstRef.current;
    target?.focus();
  }, [isOpen]);

  const canSave = personNameOk(first) && personNameOk(last);

  const submit = () => {
    if (pending || !canSave) return;
    setFailed(false);
    const values = { firstName: first.trim(), lastName: last.trim() };
    let result: Promise<unknown>;
    try {
      result = Promise.resolve(onSave(values));
    } catch (err) {
      result = Promise.reject(err);
    }
    // A rejection must not go unhandled; usePromisePending clears `pending` on it.
    result.catch(() => setFailed(true));
    run(result, () => {
      saved.current = true;
      setDone(true);
    });
  };

  const edit = (set: (value: string) => void) => (value: string) => {
    set(value);
    setFailed(false);
  };

  const message = failed ? (error ?? labels.failed) : undefined;

  return (
    <DialogFrame
      open={open}
      title={labels.title}
      description={labels.description}
      onClose={() => onClose(saved.current)}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (pending && e.key === "Escape") e.preventDefault();
      }}
      aria-busy={pending || undefined}
      actions={
        <CompleteNameActions
          formId={formId}
          done={done}
          busy={pending}
          canSave={canSave}
          laterLabel={labels.later}
          saveLabel={labels.save}
        />
      }
    >
      <form
        id={formId}
        noValidate
        className="grid gap-3 @container"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3 @xs:grid-cols-2">
          <Input
            ref={firstRef}
            name="given-name"
            autoComplete="given-name"
            label={labels.firstName}
            value={first}
            onChange={(e) => edit(setFirst)(e.target.value)}
            maxLength={PERSON_NAME_MAX_LENGTH}
            readOnly={pending}
            required
          />
          <Input
            ref={lastRef}
            name="family-name"
            autoComplete="family-name"
            label={labels.lastName}
            value={last}
            onChange={(e) => edit(setLast)(e.target.value)}
            maxLength={PERSON_NAME_MAX_LENGTH}
            readOnly={pending}
            required
          />
        </div>
        {message !== undefined && (
          <p role="alert" className="text-xs text-[var(--danger)]">
            {message}
          </p>
        )}
      </form>
    </DialogFrame>
  );
}

/** The actions row, inside the `Modal`, where its animated close is in context: a
 *  resolved save lowers the panel through it, as "Later" and Escape do. */
function CompleteNameActions({
  formId,
  done,
  busy,
  canSave,
  laterLabel,
  saveLabel,
}: {
  formId: string;
  done: boolean;
  busy: boolean;
  canSave: boolean;
  laterLabel: string;
  saveLabel: string;
}) {
  const close = useContext(ModalCloseContext);
  useEffect(() => {
    if (done) close?.();
  }, [done, close]);
  return (
    <>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => close?.()}>
        {laterLabel}
      </Button>
      <Button type="submit" form={formId} commit={COMMIT_EXCEPT_BILLING} disabled={!busy && !canSave} pending={busy}>
        {saveLabel}
      </Button>
    </>
  );
}
