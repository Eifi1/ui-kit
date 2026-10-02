import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ComponentPropsWithoutRef, FormEvent, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, Input, Label, Spinner } from "./ui";
import { Tooltip } from "./tooltip";

/**
 * How typed text is compared with the text it has to repeat — shared by
 * `DangerConfirm`'s `phraseMatch` and `useConfirm`'s `typedMatch`.
 *
 * - `"trim"` ignores spaces around the typed text — a phone keyboard's autocomplete
 *   likes to add one. Case counts: "delete" is not "DELETE".
 * - `"exact"` compares character for character, spaces included.
 * - `"caseless"` trims AND ignores case: for an e-mail address, whose domain is
 *   case-insensitive and whose local part every real mail server treats so. Both apps'
 *   "type the account's address" rules (keksdose's `TYPE_EMAIL`, Kurvenschmiede's
 *   `TypedConfirm`) compared `trim().toLowerCase()`, and a capital the user's keyboard
 *   put at the start must not make the right row look like the wrong one.
 */
export type TypedMatch = "trim" | "exact" | "caseless";

/** Whether `typed` repeats `target` under `mode` — see {@link TypedMatch}. Exported for
 *  a caller that draws its own field (a dialog that also picks a recipient) and wants
 *  the same rule as the kit's. */
export function typedMatches(typed: string, target: string, mode: TypedMatch = "trim"): boolean {
  if (mode === "exact") return typed === target;
  if (mode === "trim") return typed.trim() === target;
  // `toLowerCase`, not `toLocaleLowerCase`: the comparison must not change with the
  // reader's locale (a Turkish dotless i would otherwise fail an ASCII address).
  return typed.trim().toLowerCase() === target.trim().toLowerCase();
}

/**
 * Busy-while-a-promise-runs, for an action that MAY return one: `run(result, onResolved)`
 * marks the caller pending until `result` settles, calls `onResolved` if it fulfilled,
 * and only clears the flag if it rejected — the caller shows why and the user retries.
 * Nothing runs after unmount. Shared by `DangerConfirm` and `ReauthDialog`, whose
 * contract is the same: resolve = done, reject = stay put.
 *
 * @internal
 */
export function usePromisePending() {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = useCallback((result: unknown, onResolved: () => void): boolean => {
    if (!result || typeof (result as Promise<unknown>).then !== "function") return false;
    setPending(true);
    (result as Promise<unknown>).then(
      () => {
        if (!mounted.current) return;
        setPending(false);
        onResolved();
      },
      () => {
        if (mounted.current) setPending(false);
      },
    );
    return true;
  }, []);
  return { pending, run };
}

/**
 * The "prove it is you" field: a password input the browser's password manager fills
 * with the CURRENT password (`autocomplete="current-password"`), never offers to
 * generate a new one for. `readOnly` rather than `disabled` while busy: disabling the
 * field that has focus (Enter was pressed in it) drops focus to <body>.
 *
 * @internal DangerConfirm's field. ReauthDialog spells it out with the field's own
 * `error`, which keeps the `<input>` mounted while its message comes and goes.
 */
export function CurrentPasswordInput({
  inputRef,
  label,
  value,
  onValueChange,
  busy,
  invalid,
  describedBy,
}: {
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  busy: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <Input
      ref={inputRef}
      type="password"
      autoComplete="current-password"
      label={label}
      value={value}
      readOnly={busy}
      invalid={invalid}
      aria-describedby={describedBy}
      onChange={(e) => onValueChange(e.target.value)}
    />
  );
}

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
  /** Label of the type-to-confirm field. A FUNCTION of the phrase by default, like
   *  every message that carries a value: where the phrase sits in the sentence moves
   *  with the language. A plain STRING is taken as the finished label — for an app
   *  whose catalogue already words it ("Type DELETE to confirm") and would otherwise
   *  wrap it as `() => label`. */
  phrase: string | ((phrase: string) => string);
  /** Placeholder of the type-to-confirm field — a string, or a function of the
   *  phrase (`(p) => p` echoes it). Optional and unset by default: the field keeps its
   *  floating label, as before. Given, the label moves ABOVE the field (a floating
   *  label occupies the empty field, which is exactly where a placeholder shows) and
   *  the placeholder fills the field. An empty string means none. */
  phrasePlaceholder?: string | ((phrase: string) => string);
}

/** `satisfies` rather than a type annotation, so `DEFAULT_DANGER_CONFIRM_LABELS.phrase`
 *  stays callable for a caller that composes its own label from it. */
export const DEFAULT_DANGER_CONFIRM_LABELS = {
  arm: "Delete…",
  confirm: "Delete",
  cancel: "Cancel",
  prompt: "This cannot be undone.",
  password: "Password",
  phrase: (phrase: string) => `Type “${phrase}” to confirm`,
} satisfies DangerConfirmLabels;

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
   *  matches (case-sensitive; surrounding spaces ignored unless `phraseMatch="exact"`). */
  phrase?: string;
  /**
   * How the typed text is compared with `phrase`. `"trim"` (default) ignores spaces
   * around it — a phone keyboard's autocomplete likes to add one. `"exact"` compares
   * character for character, spaces included, for an app whose contract is "type
   * exactly this". `"caseless"` (0.18) also ignores case — for a phrase that is an
   * e-mail address (keksdose's "type the user's address" admin rule). See
   * {@link TypedMatch}.
   */
  phraseMatch?: TypedMatch;
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
  phraseMatch = "trim",
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
  const { pending, run } = usePromisePending();
  const busy = Boolean(busyProp) || pending;
  // `readOnly` rather than `disabled` on the fields while busy: disabling the field
  // that has focus (Enter was pressed in it) drops focus to <body>.
  const promptId = useId();
  const reasonId = useId();
  const phraseFieldId = useId();

  // The kit's Button takes no ref, so the two buttons focus is moved to are found by id.
  const armId = useId();
  const cancelId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // Focus moves only after a transition — never on mount, so a tile that renders armed
  // (controlled) does not take the page's focus merely by existing.
  const moveFocus = useRef(false);

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
  const phraseOk = phrase === undefined || typedMatches(typed, phrase, phraseMatch);
  const canConfirm = passwordOk && phraseOk && !busy;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    // Disarms when it resolves; a rejection leaves it armed, fields kept: the caller
    // shows why, the user retries.
    run(onConfirm(requirePassword ? password : undefined), () => setArmed(false));
  };

  const phrasePlaceholder =
    phrase === undefined || labels.phrasePlaceholder === undefined
      ? undefined
      : typeof labels.phrasePlaceholder === "function"
        ? labels.phrasePlaceholder(phrase)
        : labels.phrasePlaceholder;

  const phraseLabel =
    phrase === undefined ? "" : typeof labels.phrase === "function" ? labels.phrase(phrase) : labels.phrase;
  const phraseFieldProps = {
    ref: firstFieldRef,
    value: typed,
    autoComplete: "off",
    autoCapitalize: "off",
    spellCheck: false,
    readOnly: busy,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setTyped(e.target.value),
  };

  const toneText = tone === "warning" ? "text-[var(--warning)]" : "text-[var(--danger)]";

  if (!armed) {
    const arm = (
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
    );
    return (
      <div {...rest} className={cn("space-y-1", className)}>
        {locked ? (
          // The reason on the button itself too, where the pointer that tried it is —
          // the line below can sit out of view in a long settings card. Portalled, so
          // a card that scrolls neither clips it nor grows by it.
          //
          // The button in a FRAGMENT on purpose: Tooltip clones an element child to
          // add the bubble to its `aria-describedby`, and the button is already
          // described by the visible line below — the same sentence twice, read out
          // on every focus. A fragment is left as it is, so the bubble stays visual.
          <Tooltip label={lockedReason} portal>
            <>{arm}</>
          </Tooltip>
        ) : (
          arm
        )}
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
        {phrase !== undefined &&
          (phrasePlaceholder ? (
            // A static label above, so the placeholder has the empty field to itself.
            <div className="space-y-1.5">
              <Label htmlFor={phraseFieldId}>{phraseLabel}</Label>
              <Input id={phraseFieldId} placeholder={phrasePlaceholder} {...phraseFieldProps} />
            </div>
          ) : (
            <Input label={phraseLabel} {...phraseFieldProps} />
          ))}
        {requirePassword && (
          <CurrentPasswordInput
            // The phrase field takes the ref when both are there — it comes first.
            inputRef={phrase === undefined ? firstFieldRef : undefined}
            label={labels.password}
            value={password}
            busy={busy}
            onValueChange={setPassword}
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
