import { useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, Input, Spinner } from "./ui";

/**
 * Every string the tile renders — the `dangerConfirm` namespace of
 * `<UiKitProvider labels>`, overridable per instance through `labels`. The arm and
 * confirm buttons are usually worded per action ("Delete budget"), which is what the
 * `armLabel` / `confirmLabel` props are for; these are the fallbacks.
 */
export interface DangerConfirmLabels {
  /** The button that arms the tile. */
  arm: string;
  /** The button that runs the action once the guards are satisfied. */
  confirm: string;
  cancel: string;
  /** The warning above the fields, when no `prompt` is given. */
  prompt: string;
  /** Label of the password field (`requirePassword`). */
  password: string;
  /** Label of the type-to-confirm field, given the phrase to type. A FUNCTION, like
   *  every message that carries a value: where the phrase sits in the sentence moves
   *  with the language. */
  phrase: (phrase: string) => string;
}

export const DEFAULT_DANGER_CONFIRM_LABELS: DangerConfirmLabels = {
  arm: "Delete…",
  confirm: "Delete",
  cancel: "Cancel",
  prompt: "This cannot be undone.",
  password: "Password",
  phrase: (phrase) => `Type “${phrase}” to confirm`,
};

export interface DangerConfirmProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /**
   * Runs the action, with the entered password when `requirePassword` is on.
   *
   * Return a promise and the tile manages itself: busy until it settles, disarmed
   * (fields wiped) when it resolves, still armed when it rejects — so the user can
   * correct a wrong password and retry. The rejection is not swallowed for you to
   * miss: handle it (and show why) in the caller, as with any mutation.
   */
  onConfirm: (password?: string) => void | Promise<unknown>;
  /** Show a password field; confirm stays disabled until it is filled. */
  requirePassword?: boolean;
  /** Show a "type <phrase> to confirm" field; confirm stays disabled until the field
   *  matches exactly (case-sensitive, surrounding spaces ignored). */
  phrase?: string;
  /** The warning above the fields. Defaults to `labels.prompt`. */
  prompt?: ReactNode;
  /** `"danger"` (default) for what cannot be undone; `"warning"` for what can, at a
   *  cost (loading demo data over your own). Colours the prompt and the confirm. */
  tone?: "danger" | "warning";
  /** Visible text of the arm button; defaults to `labels.arm`. */
  armLabel?: ReactNode;
  /** Visible text of the confirm button; defaults to `labels.confirm`. */
  confirmLabel?: ReactNode;
  /** The action is running: confirm shows a spinner and nothing can be pressed. For a
   *  caller that tracks the mutation itself (a `useMutation`'s `isPending`); a
   *  promise returned from `onConfirm` does the same on its own. */
  busy?: boolean;
  /** The arm button is disabled. */
  disabled?: boolean;
  /**
   * Why the action is not available — a read-only demo, a write lock, a missing
   * permission. Disables the arm button like `disabled`, and SAYS so: the sentence is
   * shown under the button and attached to it with `aria-describedby`, and the button
   * stays focusable (`aria-disabled`) so a keyboard user can land on it and hear why.
   *
   * On the ARM button rather than the confirm: arming asks for a password, and asking
   * for a password for a write that can never land is the worse of the two.
   */
  lockedReason?: ReactNode;
  /** Controlled armed state. The parent can then collapse the tile from a mutation's
   *  own `onSuccess` without returning a promise. */
  armed?: boolean;
  /** Called with the next armed state — on arm, cancel, and a resolved `onConfirm`. */
  onArmedChange?: (armed: boolean) => void;
  /** User-facing strings; see {@link DangerConfirmLabels}. */
  labels?: Partial<DangerConfirmLabels>;
}

/**
 * An "arm → confirm" tile for destructive actions: one button, which expands into a
 * warning, an optional password field, an optional type-to-confirm field and a
 * confirm that stays disabled until every guard is satisfied.
 *
 * Keksdose hand-rolled it three times (load demo data, wipe everything, reset a
 * budget) and then as `shared/components/danger-confirm.tsx`; the only app-specific
 * part was its write-lock hook, which is `lockedReason` here.
 *
 * The fields are a `<form>`, so Enter confirms once the guards allow it. They are
 * wiped every time the tile disarms — a password must not sit in a collapsed tile.
 * Arming moves focus to the first field (or Cancel, when there is none — never to the
 * destructive button itself), and disarming moves it back to the arm button, so the
 * keyboard user is never left on an element that just vanished.
 */
export function DangerConfirm({
  onConfirm,
  requirePassword,
  phrase,
  prompt,
  tone = "danger",
  armLabel,
  confirmLabel,
  busy: busyProp,
  disabled,
  lockedReason,
  armed: armedProp,
  onArmedChange,
  labels: labelsProp,
  className,
  ...rest
}: DangerConfirmProps) {
  const labels = useKitLabels("dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS, labelsProp);
  const [armedState, setArmedState] = useState(false);
  const armed = armedProp ?? armedState;
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const busy = Boolean(busyProp) || pending;
  // `readOnly` rather than `disabled` on the fields while busy: disabling the field
  // that has focus (Enter was pressed in it) drops focus to <body>.
  const promptId = useId();
  const reasonId = useId();

  // The kit's Button takes no ref, so the two buttons focus is moved to are found by id.
  const armId = useId();
  const cancelId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // Focus moves only after a transition — never on mount, so a tile that renders armed
  // (controlled) does not take the page's focus merely by existing.
  const moveFocus = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A disarm from anywhere (cancel, a resolved confirm, the parent) wipes the fields.
  // During render, like NumberField's draft, so no frame shows a collapsed tile that
  // still holds a password.
  const [wasArmed, setWasArmed] = useState(armed);
  if (wasArmed !== armed) {
    setWasArmed(armed);
    if (!armed) {
      setPassword("");
      setTyped("");
    }
  }

  const prevArmed = useRef(armed);
  useEffect(() => {
    const changed = prevArmed.current !== armed;
    prevArmed.current = armed;
    const byUser = moveFocus.current;
    moveFocus.current = false;
    if (!changed) return;
    if (armed) {
      if (byUser) (firstFieldRef.current ?? document.getElementById(cancelId))?.focus();
      return;
    }
    // A controlled parent collapsing the tile from its own `onSuccess` did not go
    // through `setArmed`; if focus went down with the form, bring it back too.
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (byUser || lost) document.getElementById(armId)?.focus();
  }, [armed, armId, cancelId]);

  const setArmed = (next: boolean) => {
    moveFocus.current = true;
    if (armedProp === undefined) setArmedState(next);
    onArmedChange?.(next);
  };

  const locked = lockedReason !== undefined && lockedReason !== null && lockedReason !== false && lockedReason !== "";
  const passwordOk = !requirePassword || password !== "";
  const phraseOk = phrase === undefined || typed.trim() === phrase;
  const canConfirm = passwordOk && phraseOk && !busy;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    const result = onConfirm(requirePassword ? password : undefined);
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;
    setPending(true);
    (result as Promise<unknown>).then(
      () => {
        if (!mounted.current) return;
        setPending(false);
        setArmed(false);
      },
      () => {
        // Stays armed, fields kept: the caller shows why, the user retries.
        if (mounted.current) setPending(false);
      },
    );
  };

  const toneText = tone === "warning" ? "text-[var(--warning)]" : "text-[var(--danger)]";

  if (!armed) {
    return (
      <div {...rest} className={cn("space-y-1", className)}>
        <Button
          id={armId}
          type="button"
          variant={tone === "warning" ? "secondary" : "danger"}
          disabled={disabled}
          aria-disabled={locked || undefined}
          aria-describedby={locked ? reasonId : undefined}
          onClick={() => {
            if (!locked) setArmed(true);
          }}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {armLabel ?? labels.arm}
        </Button>
        {locked && (
          <p id={reasonId} className="text-xs text-[var(--text-muted)]">
            {lockedReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div {...rest} className={cn("space-y-2", className)}>
      <form
        className="space-y-2"
        aria-describedby={promptId}
        aria-busy={busy || undefined}
        onSubmit={submit}
        noValidate
      >
        <p id={promptId} className={cn("text-xs font-medium", toneText)}>
          {prompt ?? labels.prompt}
        </p>
        {phrase !== undefined && (
          <Input
            ref={firstFieldRef}
            label={labels.phrase(phrase)}
            value={typed}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            readOnly={busy}
            onChange={(e) => setTyped(e.target.value)}
          />
        )}
        {requirePassword && (
          <Input
            // The phrase field takes the ref when both are there — it comes first.
            ref={phrase === undefined ? firstFieldRef : undefined}
            type="password"
            autoComplete="current-password"
            label={labels.password}
            value={password}
            readOnly={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Button id={cancelId} type="button" variant="ghost" disabled={busy} onClick={() => setArmed(false)}>
            {labels.cancel}
          </Button>
          <Button
            type="submit"
            variant={tone === "warning" ? "primary" : "danger"}
            disabled={!canConfirm}
            aria-busy={busy || undefined}
          >
            {busy && <Spinner label={null} className="h-4 w-4" />}
            {confirmLabel ?? labels.confirm}
          </Button>
        </div>
      </form>
    </div>
  );
}
