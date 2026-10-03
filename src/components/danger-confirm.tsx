import { Children, forwardRef, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ComponentPropsWithoutRef, FormEvent, ReactNode } from "react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, Input, Label, Spinner } from "./ui";
import type { ButtonVariant, InputProps } from "./ui";
import { Checkbox } from "./checkbox";
import { Tooltip } from "./tooltip";
import { useCommitReason } from "./write-lock";

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

/** A label that is really there — `null`, `false` and `""` are what a caller's
 *  `cond && reason` evaluates to on the path where there is none. */
function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/** The one word {@link CurrentPasswordInput} says on its own behalf — the
 *  `dangerConfirm.password` label, shared with DangerConfirm's password field, so an
 *  app translates "Password" once. */
export type CurrentPasswordInputLabels = Pick<DangerConfirmLabels, "password">;

/**
 * Everything {@link Input} takes except what makes this field what it is: `type` is
 * always `"password"` and `autoComplete` always `"current-password"`.
 */
export interface CurrentPasswordInputProps extends Omit<InputProps, "type" | "autoComplete" | "label"> {
  /**
   * The visible label. Default `dangerConfirm.password` ("Password") — unless the field
   * is named another way (`aria-label` / `aria-labelledby`), which then stays the only
   * name. Pass the app's own word on a sign-in form ("Password", "Your password"), or
   * `null` for a field whose `<label htmlFor>` is drawn elsewhere (a form library's
   * `FormLabel`), which would otherwise be labelled twice.
   */
  label?: ReactNode;
  /** The value as a string — the `(next) => …` shape, so a caller holding it in
   *  `useState` need not unwrap `event.target.value`. Fires alongside `onChange`,
   *  never instead of it, so a form library's `onChange` keeps working. */
  onValueChange?: (value: string) => void;
  /**
   * A check is running (the sign-in request, the re-auth). The field turns `readOnly`,
   * NOT `disabled`: the field being submitted is usually the focused one (Enter was
   * pressed in it), and disabling a focused field drops focus to `<body>` — the user
   * lands nowhere when the "wrong password" answer comes back.
   */
  busy?: boolean;
  /** Per-instance override of `dangerConfirm.password`. */
  labels?: Partial<CurrentPasswordInputLabels>;
}

/**
 * The "prove it is you" field: a password input that a password manager fills with
 * the CURRENT password and never offers to generate a new one for.
 *
 * It is the field of a sign-in form, a re-auth step ({@link ReauthDialog} draws the same
 * field), and {@link DangerConfirm}'s `requirePassword`. Public since 0.22 for kastlan's
 * sign-in and re-auth (kastlan 1), which wrote `type="password"` +
 * `autoComplete="current-password"` by hand — and a sign-in field that forgets the
 * second half gets the browser's "suggest a strong password" offer on the one form where
 * a NEW password is never what is wanted. The reverse matters as much: a field that sets
 * a NEW password (a passphrase, a sign-up) must NOT be this one — keksdose #170 keeps
 * its passphrase doors on `new-password` / `off` for that reason.
 *
 * Everything else is {@link Input}: the reveal toggle, `error` (under the field,
 * `aria-describedby`, `aria-invalid`), `invalid`, `name`, `id`, `autoFocus`, `required`.
 * The ref is the `<input>`, so it works with `@eifi1/ui-kit/rhf`'s `FormControl` /
 * a `register()` spread, and controlled or uncontrolled.
 *
 * ```tsx
 * <CurrentPasswordInput name="password" label={t("password")} error={errors.password?.message}
 *   busy={isSubmitting} {...register("password")} />
 * ```
 */
export const CurrentPasswordInput = forwardRef<HTMLInputElement, CurrentPasswordInputProps>(
  function CurrentPasswordInput({ label, onValueChange, onChange, busy, readOnly, labels: labelsProp, ...rest }, ref) {
    const labels = useKitLabels("dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS, labelsProp);
    const namedOtherwise = rest["aria-label"] !== undefined || rest["aria-labelledby"] !== undefined;
    return (
      <Input
        {...rest}
        ref={ref}
        // After the spread: a props object spread at the field must not turn it into a
        // text field, or into one the password manager offers a new password for.
        type="password"
        autoComplete="current-password"
        label={label === undefined ? (namedOtherwise ? undefined : labels.password) : hasContent(label) ? label : undefined}
        readOnly={Boolean(busy) || readOnly}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.(e.target.value);
        }}
      />
    );
  },
);
CurrentPasswordInput.displayName = "CurrentPasswordInput";

/** The words {@link TypedConfirmField} says on its own behalf — the `dangerConfirm`
 *  namespace's `phrase` and `phrasePlaceholder`, shared with DangerConfirm's own field,
 *  so the sentence "Type “X” to confirm" is translated once. */
export type TypedConfirmFieldLabels = Pick<DangerConfirmLabels, "phrase" | "phrasePlaceholder">;

export interface TypedConfirmFieldProps
  extends Omit<InputProps, "type" | "value" | "defaultValue" | "label" | "placeholder"> {
  /** The text to repeat — a word ("DELETE"), a name, an e-mail address. */
  target: string;
  /** How the typed text is compared with `target` — {@link TypedMatch}. Default
   *  `"trim"`, as {@link typedMatches}; `"caseless"` for an address or an
   *  acknowledgement word a user may type in any case. */
  match?: TypedMatch;
  /** Controlled value. Left out, the field keeps its own (start: `defaultValue`). */
  value?: string;
  defaultValue?: string;
  /** The typed text as a string, on every keystroke. Fires alongside `onChange`. */
  onValueChange?: (value: string) => void;
  /**
   * The typed text started or stopped matching `target` — fired from the keystroke
   * that flipped it, so an uncontrolled field can still drive the button it guards. A
   * controlled caller that resets the value itself (on a close) knows the answer
   * already, and gets no call for that; it can also compute it with {@link typedMatches}.
   */
  onMatchedChange?: (matched: boolean) => void;
  /** The label. Default `dangerConfirm.phrase(target)` — "Type “DELETE” to confirm". */
  label?: ReactNode;
  /** Text inside the empty field. Default `dangerConfirm.phrasePlaceholder` (unset).
   *  Given, the label moves ABOVE the field: a floating label occupies the empty
   *  field, which is exactly where a placeholder shows. `""` means none. */
  placeholder?: string;
  /** The guarded action is running: the field turns `readOnly` (not `disabled`, which
   *  would drop the focus Enter left in it). */
  busy?: boolean;
  labels?: Partial<TypedConfirmFieldLabels>;
}

/**
 * The "type this to confirm" field — {@link DangerConfirm}'s `phrase` field and
 * `useConfirm({ requireTyped })`'s, on its own (keksdose K7).
 *
 * keksdose writes it by hand four times: the privacy enrol, upgrade and sweep dialogs
 * (type the acknowledgement word, then the key doors appear) and the admin's "type the
 * user's address" (`UserActionConfirm`), each an `Input` plus its own
 * `trim().toUpperCase()` / `toLowerCase()` comparison. None of those places is an
 * arm → confirm tile or a modal confirm — what is guarded is a whole form, or the
 * next step of a dialog — so the field had to stand alone. What it brings over a plain
 * `Input`: one match rule ({@link typedMatches}, which lower-cases locale-independently
 * on purpose), the label worded from the target in the app's language, and the
 * attributes a phone keyboard needs to leave the text alone (no autocomplete, no
 * auto-capital, no autocorrect, no spellcheck — a keyboard that "corrects" an e-mail
 * address makes the guard unpassable).
 *
 * The field reports whether it matches (`onMatchedChange`, and `data-matched` on the
 * `<input>` for styling); what the match unlocks is the caller's. The ref is the
 * `<input>`.
 *
 * ```tsx
 * const [ok, setOk] = useState(false);
 * <TypedConfirmField target={t("privacy.enroll_ack_word")} match="caseless" onMatchedChange={setOk} />
 * {ok && <KeyDoorsForm … />}
 * ```
 */
export const TypedConfirmField = forwardRef<HTMLInputElement, TypedConfirmFieldProps>(function TypedConfirmField(
  {
    target,
    match = "trim",
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onMatchedChange,
    onChange,
    label: labelProp,
    placeholder: placeholderProp,
    busy,
    readOnly,
    labels: labelsProp,
    id,
    className,
    ...rest
  },
  ref,
) {
  const labels = useKitLabels("dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS, labelsProp);
  const [own, setOwn] = useState(defaultValue);
  const value = valueProp ?? own;
  const matched = typedMatches(value, target, match);
  const generated = useId();
  const fieldId = id ?? generated;
  const label =
    labelProp !== undefined
      ? labelProp
      : typeof labels.phrase === "function"
        ? labels.phrase(target)
        : labels.phrase;
  const fromLabels =
    labels.phrasePlaceholder === undefined
      ? undefined
      : typeof labels.phrasePlaceholder === "function"
        ? labels.phrasePlaceholder(target)
        : labels.phrasePlaceholder;
  const placeholder = placeholderProp ?? fromLabels;

  const fieldProps = {
    ...rest,
    ref,
    id: fieldId,
    value,
    autoComplete: "off",
    autoCapitalize: "off",
    autoCorrect: "off",
    spellCheck: false,
    readOnly: Boolean(busy) || readOnly,
    "data-matched": matched || undefined,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      const next = e.target.value;
      if (valueProp === undefined) setOwn(next);
      onValueChange?.(next);
      const nextMatched = typedMatches(next, target, match);
      if (nextMatched !== matched) onMatchedChange?.(nextMatched);
    },
  };

  if (placeholder) {
    return (
      // A static label above, so the placeholder has the empty field to itself.
      <div className={cn("space-y-1.5", className)}>
        <Label htmlFor={fieldId}>{label}</Label>
        <Input {...fieldProps} placeholder={placeholder} />
      </div>
    );
  }
  return <Input {...fieldProps} label={label} className={className} />;
});
TypedConfirmField.displayName = "TypedConfirmField";

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
  /** 0.22: the checkbox `requireAcknowledge={true}` shows — "I have read what this does
   *  and want to continue" (keksdose's `admin.users.confirm_ack`). */
  acknowledge: string;
  /**
   * 0.23: why the armed confirm is held while the typed phrase does not match yet — in
   * the confirm's tooltip and its description (keksdose G4a). A FUNCTION of the phrase
   * by default ("Type “DELETE” to confirm"), or a finished STRING, as `phrase`.
   */
  needsPhrase: string | ((phrase: string) => string);
  /** 0.23: why the armed confirm is held while the `requireAcknowledge` box is unticked
   *  — "Tick the box to confirm". */
  needsAcknowledge: string;
  /** 0.23: why the armed confirm is held while the `requirePassword` field is empty —
   *  "Enter your password to confirm". */
  needsPassword: string;
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
  acknowledge: "I have read what this does and want to continue.",
  needsPhrase: (phrase: string) => `Type “${phrase}” to confirm`,
  needsAcknowledge: "Tick the box to confirm",
  needsPassword: "Enter your password to confirm",
} satisfies DangerConfirmLabels;

/**
 * What the guards were answered with — the second argument of
 * {@link DangerConfirmProps.onConfirm} (0.23, keksdose G4b). A key is there only when its
 * guard was asked for, so the object can go into a request body as it is.
 */
export interface DangerConfirmValues {
  /**
   * The text typed into the `phrase` field — as the match rule compared it: trimmed
   * under `phraseMatch` `"trim"` and `"caseless"` (the spaces a phone keyboard adds are
   * not part of it), exactly as typed under `"exact"`. The case is the user's, even
   * under `"caseless"`: a server that re-checks applies its own rule to it. Absent
   * without a `phrase`.
   */
  typed?: string;
  /** The entered password — the same value as the first argument. Absent without
   *  `requirePassword`. */
  password?: string;
  /** `true` when the `requireAcknowledge` box was shown — it was ticked, since the
   *  confirm is held until it is. Absent without one. */
  acknowledged?: true;
}

/**
 * One line of {@link DangerConfirmProps.consequences}: what the action will do. A plain
 * string, or this, for a key of its own and the `severe` mark.
 */
export interface DangerConsequence {
  /** React key — keksdose keys its lines by what they say ("api_tokens", "only_door").
   *  Default: the text when it is a string, else the position. */
  key?: string;
  text: ReactNode;
  /** "There is no way back" — painted in the danger colour rather than the list's
   *  muted one. keksdose reserves it for the one line that loses something for good. */
  severe?: boolean;
}

export interface DangerConfirmProps extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  /**
   * Runs the action, with the entered password when `requirePassword` is on.
   *
   * Return a promise and the tile manages itself: busy until it settles, disarmed
   * (fields wiped) when it resolves, still armed when it rejects — so the user can
   * correct a wrong password and retry. The rejection is not swallowed for you to
   * miss: handle it (and show why) in the caller, as with any mutation.
   *
   * 0.23: the second argument is what every guard was answered with — the typed phrase,
   * the password, the tick ({@link DangerConfirmValues}). keksdose G4b: its admin
   * actions send the address the admin TYPED, and the server re-checks it against the
   * account (`assert_confirmed`), so a client that put the wrong row's id in the request
   * is refused rather than obeyed; the tile kept the text to itself.
   *
   *     onConfirm={(_password, { typed }) =>
   *       reset.mutateAsync({ id, confirm: { acknowledged: true, confirm_email: typed ?? null } })}
   *
   * A second argument rather than one object in place of the password: every
   * `(password) => …` and `() => …` handler, and a `mutation.mutate` passed as it is,
   * keeps working unchanged, and a handler that needs one guard's answer names it.
   */
  onConfirm: (password: string | undefined, values: DangerConfirmValues) => void | Promise<unknown>;
  /** Show a password field; confirm is held until it is filled. */
  requirePassword?: boolean;
  /**
   * Show an "I understand" checkbox; confirm is held until it is ticked
   * (keksdose K7). `true` words it with `labels.acknowledge`; any other node IS the
   * checkbox's label ("I understand Anna will be signed out everywhere").
   *
   * The guard for an action whose risk is MIS-TARGETING less than carelessness:
   * keksdose's admin password reset asks for a typed address when the account has an
   * encrypted door to lose, and a tick otherwise (`UserActionConfirm`), and its plan
   * editor asks for the tick alone (`UserPlanEditor`). Both were hand-built beside this
   * tile because it had no tick. It combines with `phrase` and `requirePassword`: every
   * guard given must be satisfied.
   */
  requireAcknowledge?: ReactNode;
  /**
   * What the action will do, said before it happens — a list under the prompt, shown
   * once armed (keksdose K7, `UserActionConfirm`'s consequences). Strings, or
   * {@link DangerConsequence}s for a `severe` line in the danger colour.
   *
   * Derive them from the row's own facts rather than reciting the worst case: an admin
   * who reads the same paragraph on every row stops reading it (keksdose dev#488).
   */
  consequences?: readonly (string | DangerConsequence)[];
  /** Show a "type <phrase> to confirm" field; confirm is held until the field matches
   *  (case-sensitive; surrounding spaces ignored unless `phraseMatch="exact"`). */
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
   *  cost (loading demo data over your own). Colours the prompt, and picks the arm
   *  button's variant and — unless {@link DangerConfirmProps.confirmVariant} is
   *  given — the confirm's. */
  tone?: "danger" | "warning";
  /**
   * The confirm button's variant, apart from `tone` (0.24, keksdose). Default: what
   * `tone` picks, as before — `"danger"` for `"danger"`, `"primary"` for `"warning"`.
   *
   * `tone` says how bad the outcome is; this says how loud the last press is, and the two
   * need not agree. keksdose's `UserActionConfirm` (an admin resets somebody else's
   * password) asks an AMBER question — what it guards against is mis-targeting, not data
   * loss, so the danger colour stays its one `severe` consequence's — and ends in a RED
   * Go, as its hand-built panel did before it moved onto this tile in 0.23; with only
   * `tone`, the amber question made Go the neutral primary fill. `tone="warning"
   * confirmVariant="danger"` is that panel again.
   */
  confirmVariant?: ButtonVariant;
  /**
   * Hold the armed confirm for a reason of the CALLER's own (0.24, keksdose) — the
   * tile's counterpart of FormActions' `submitDisabledReason`. While it has content the
   * confirm is held exactly as by the built-in guards: `aria-disabled` but focusable,
   * the reason in the kit {@link Tooltip} and its description, a press — or Enter in a
   * field — does nothing. Nothing else changes: the arm button stays usable, and no
   * line is printed under the buttons.
   *
   * keksdose's `UserPlanEditor` ("move this account onto another plan") must not confirm
   * the plan the account already holds — the request would only write FREE → FREE into
   * the audit trail. With no guard of its own to give, it passed "Pick a different plan"
   * as `lockedReason`, which is a LOCK: documented as "the action is not available",
   * spelled out under the buttons as well as in the tooltip, and meant for a write the
   * user cannot make land. A guard the user lifts by changing a field is this prop.
   *
   * Which reason the held confirm names: a write lock's first (`lockedReason`, `commit`
   * — nothing in the tile lifts it), then this one, then the built-in guards in the
   * order they are drawn (the tick, the phrase, the password). This one before the
   * built-ins because it is usually about a field in
   * {@link DangerConfirmProps.children}, which is drawn ABOVE them — the rule since 0.23
   * is "the first open guard in the order the user meets it" — and because it is about
   * WHAT is being confirmed (which plan), which has to be settled before acknowledging
   * it means anything. It is also the order keksdose's plan editor had, its
   * `lockedReason` winning over the tick.
   */
  confirmDisabledReason?: ReactNode;
  /**
   * Fields of the caller's own, drawn INSIDE the armed tile (0.24, keksdose): after the
   * prompt and the consequences, before the tick, the typed phrase and the password —
   * the order is "what this does, what to do it with, then prove you mean it". Nothing
   * is drawn for them while the tile is disarmed, and nothing at all without them, so a
   * tile without children is laid out exactly as before.
   *
   * keksdose's `UserPlanEditor` asks WHICH plan before it asks for the tick; with no
   * place inside the tile for the picker, the `Select` sat above it, and the tile's
   * prompt — the panel's title by rights — became the "FREE → PRO" line under the
   * picker. With the picker here, the prompt is the title again.
   *
   * The fields are the caller's: their values are not wiped on disarm (an uncontrolled
   * field starts over anyway — the slot unmounts), not passed to `onConfirm`, and a
   * guard on them is {@link DangerConfirmProps.confirmDisabledReason}. Arming moves
   * focus to their first form field (an input, a select, a combobox, a radio…), else to
   * the tile's own first field as before; Tab then goes on through the tick, the phrase
   * and the password to Cancel and the confirm. They sit inside the tile's `<form>`:
   * Enter in a text field confirms once every guard allows, and a {@link Button} among
   * them needs `type="button"` — without one it SUBMITS the form, as a native button
   * does.
   */
  children?: ReactNode;
  /** Visible text of the arm button; defaults to `labels.arm`. */
  armLabel?: ReactNode;
  /** Visible text of the confirm button; defaults to `labels.confirm`. */
  confirmLabel?: ReactNode;
  /**
   * The action is running: confirm shows a spinner and nothing can be pressed — Cancel
   * included. For a caller that tracks the mutation itself (a `useMutation`'s
   * `isPending`); a promise returned from `onConfirm` does the same on its own.
   *
   * Cancel stays disabled ON PURPOSE, unlike FormActions' (keksdose asked in 0.24 why the
   * two differ). Once the request has left, nothing on the client can call it back —
   * not even an `AbortSignal`, which only stops the waiting, not the server — so a usable
   * Cancel could only collapse the tile while the action went on: "Cancel" pressed, and
   * the account reset anyway. Every way of settling what comes back is wrong somewhere: a
   * resolve after the Cancel did what the user called off; a reject finds the fields
   * wiped (a collapsed tile holds no password), so the 0.23 "stay armed and retry" is
   * gone; and re-arming while the first request runs is either a busy tile with empty
   * fields or — if the busy state went with the Cancel — a second destructive request
   * beside the first. FormActions' Cancel leaves an editor whose save is the user's own
   * edit landing, and a form can be edited again; the tile's action is the one that
   * cannot be undone, so it says nothing it cannot keep and waits — the wait is one
   * request long.
   *
   * When the action settles still armed (it failed) and the press on the confirm had
   * dropped the focus — a natively disabled button loses it — focus comes back to the
   * confirm, so a keyboard user can retry or Shift+Tab to the field to correct (0.24).
   */
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
   * for a password for a write that can never land is the worse of the two. A tile that
   * is ALREADY armed when the reason arrives (controlled `armed`, or a lock that landed
   * while it was open) keeps its fields but its confirm takes the reason the same way
   * — focusable, `aria-disabled`, the reason in its tooltip — and Enter does nothing.
   */
  lockedReason?: ReactNode;
  /**
   * This tile COMMITS — the 0.18 write-lock opt-in that {@link Button} has (keksdose
   * K3). Under a locked {@link WriteLockProvider} the lock's reason becomes
   * `lockedReason` (and wins over one of the tile's own), so a page that mounts the
   * provider no longer threads `lockedReason={lock.locked ? lock.reason : undefined}`
   * into every tile. No provider, or an unlocked one: no effect.
   */
  commit?: boolean;
  /** Controlled armed state. The parent can then collapse the tile from a mutation's
   *  own `onSuccess` without returning a promise. */
  armed?: boolean;
  /** Called with the next armed state — on arm, cancel, and a resolved `onConfirm`. */
  onArmedChange?: (armed: boolean) => void;
  /** User-facing strings; see {@link DangerConfirmLabels}. */
  labels?: Partial<DangerConfirmLabels>;
}

/** What counts as a FIELD among the caller's `children` — what arming focuses. Not
 *  any tabbable element: a "see the plans" link or a disclosure button before the
 *  picker is not where the user starts. `[tabindex="-1"]` is a roving radio group's
 *  unselected option; the selected one (`0`) is the group's stop. */
const SLOT_FIELD = [
  'input:not([type="hidden"])',
  "select",
  "textarea",
  ...["combobox", "listbox", "radio", "checkbox", "switch", "slider", "spinbutton", "textbox"].map(
    (role) => `[role="${role}"]`,
  ),
]
  .map((selector) => `${selector}:not(:disabled):not([tabindex="-1"]):not([aria-hidden="true"])`)
  .join(", ");

/** The first field among the caller's `children`, skipping a native radio that is not
 *  the checked one of its group (Tab lands on the checked one). */
function firstSlotField(slot: HTMLElement | null): HTMLElement | null {
  if (!slot) return null;
  for (const el of slot.querySelectorAll<HTMLElement>(SLOT_FIELD)) {
    if (el.closest("[hidden], [inert]")) continue;
    if (el instanceof HTMLInputElement && el.type === "radio" && !el.checked && el.name) {
      const group = el.form?.elements.namedItem(el.name);
      const checked =
        group instanceof RadioNodeList && Array.from(group).some((r) => r instanceof HTMLInputElement && r.checked);
      if (checked) continue;
    }
    return el;
  }
  return null;
}

/**
 * An "arm → confirm" tile for destructive actions: one button, which expands into a
 * warning, an optional list of consequences, optional fields of the caller's own
 * (`children`, 0.24), an optional "I understand" tick, an optional type-to-confirm
 * field, an optional password field and a confirm that is held until every guard is
 * satisfied — the built-in ones, and the caller's `confirmDisabledReason` (0.24).
 *
 * A held confirm SAYS which guard is still open (0.23, keksdose G4a): it is
 * `aria-disabled` rather than `disabled` — still focusable, so a keyboard user can land
 * on it — with the reason in the kit {@link Tooltip} and its description ("Type
 * “DELETE” to confirm", "Tick the box to confirm", "Enter your password to confirm";
 * `labels.needs*`), the first open guard in the order they are drawn. FormActions'
 * `submitDisabledReason` does the same for a form's Save. Pressing it, or Enter in a
 * field, does nothing. A lock's reason wins over a guard's, the caller's guard over the
 * built-in ones; while the action runs the confirm is plainly disabled, its spinner
 * saying why — and so is Cancel, which cannot call back a request that has left (see
 * `busy`).
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
  requireAcknowledge,
  consequences,
  phrase,
  phraseMatch = "trim",
  prompt,
  tone = "danger",
  confirmVariant,
  confirmDisabledReason,
  children,
  armLabel,
  confirmLabel,
  busy: busyProp,
  disabled,
  lockedReason: ownLockedReason,
  commit,
  armed: armedProp,
  onArmedChange,
  labels: labelsProp,
  className,
  ...rest
}: DangerConfirmProps) {
  const labels = useKitLabels("dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS, labelsProp);
  const lockedReason = useCommitReason(commit, ownLockedReason);
  const [armedState, setArmedState] = useState(false);
  const armed = armedProp ?? armedState;
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const { pending, run } = usePromisePending();
  const busy = Boolean(busyProp) || pending;
  // `readOnly` rather than `disabled` on the fields while busy: disabling the field
  // that has focus (Enter was pressed in it) drops focus to <body>.
  const promptId = useId();
  const consequencesId = useId();
  const reasonId = useId();

  // The buttons focus is moved to are found by id.
  const armId = useId();
  const cancelId = useId();
  const confirmId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // The caller's fields (`children`), searched for their first form field on arm.
  const slotRef = useRef<HTMLDivElement>(null);
  // Focus moves only after a transition — never on mount, so a tile that renders armed
  // (controlled) does not take the page's focus merely by existing.
  const moveFocus = useRef(false);
  // A confirm from this tile is under way — see the focus return after a failure below.
  const confirmed = useRef(false);

  // A disarm from anywhere (cancel, a resolved confirm, the parent) wipes the fields.
  // During render, like NumberField's draft, so no frame shows a collapsed tile that
  // still holds a password.
  const [wasArmed, setWasArmed] = useState(armed);
  if (wasArmed !== armed) {
    setWasArmed(armed);
    if (!armed) {
      setPassword("");
      setTyped("");
      setAcknowledged(false);
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
      if (byUser) {
        // The caller's fields come first on the page, so first in focus too.
        (firstSlotField(slotRef.current) ?? firstFieldRef.current ?? document.getElementById(cancelId))?.focus();
      }
      return;
    }
    confirmed.current = false;
    // A controlled parent collapsing the tile from its own `onSuccess` did not go
    // through `setArmed`; if focus went down with the form, bring it back too.
    const lost = document.activeElement === null || document.activeElement === document.body;
    if (byUser || lost) document.getElementById(armId)?.focus();
  }, [armed, armId, cancelId]);

  // The action settled and the tile is still armed — it failed, and the user retries.
  // The confirm was natively disabled while it ran, and a focused button that turns
  // disabled drops the focus to <body>: bring it back to the button that was pressed.
  // Only after a confirm from THIS tile (`confirmed`), so a `busy` that comes and goes
  // on its own never pulls the page's focus in. (A resolve disarms, and the effect
  // above takes the focus to the arm button.)
  const wasBusy = useRef(busy);
  useEffect(() => {
    const settled = wasBusy.current && !busy;
    wasBusy.current = busy;
    if (!settled) return;
    const ours = confirmed.current;
    confirmed.current = false;
    if (!ours || !armed) return;
    if (document.activeElement === null || document.activeElement === document.body) {
      document.getElementById(confirmId)?.focus();
    }
  }, [busy, armed, confirmId]);

  const setArmed = (next: boolean) => {
    moveFocus.current = true;
    if (armedProp === undefined) setArmedState(next);
    onArmedChange?.(next);
  };

  const locked = hasContent(lockedReason);
  // `true` words the tick with the namespace; any other node is its label; `false`,
  // `null` and `""` are no tick at all.
  const acknowledgeLabel: ReactNode =
    requireAcknowledge === true ? labels.acknowledge : hasContent(requireAcknowledge) ? requireAcknowledge : null;
  const asksAcknowledge = acknowledgeLabel !== null;
  const passwordOk = !requirePassword || password !== "";
  const phraseOk = phrase === undefined || typedMatches(typed, phrase, phraseMatch);
  const acknowledgeOk = !asksAcknowledge || acknowledged;
  const callerHeld = hasContent(confirmDisabledReason);
  // `{cond && <Select />}` and `[null, false]` are no fields: no wrapper, no gap.
  const hasFields = Children.toArray(children).some(hasContent);
  const canConfirm = passwordOk && phraseOk && acknowledgeOk && !callerHeld && !busy;
  // The first guard still open, in the order the fields are drawn — the one the user
  // meets next, so the sentence points at it.
  const guardReason: string | undefined = !acknowledgeOk
    ? labels.needsAcknowledge
    : !phraseOk
      ? typeof labels.needsPhrase === "function"
        ? labels.needsPhrase(phrase ?? "")
        : labels.needsPhrase
      : !passwordOk
        ? labels.needsPassword
        : undefined;
  // The lock first (no guard can lift it); none while busy, when the guards were met and
  // the spinner is the state; then the caller's guard — about the fields drawn above the
  // built-in ones, and about WHAT is confirmed — then the first built-in guard still open.
  const confirmReason: ReactNode = locked
    ? lockedReason
    : busy
      ? undefined
      : callerHeld
        ? confirmDisabledReason
        : guardReason;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // `locked` too: Enter in a field submits the form without the button's say (and
    // `canConfirm` holds the caller's guard the same way).
    if (!canConfirm || locked) return;
    const values: DangerConfirmValues = {
      ...(phrase !== undefined && { typed: phraseMatch === "exact" ? typed : typed.trim() }),
      ...(requirePassword && { password }),
      ...(asksAcknowledge && { acknowledged: true as const }),
    };
    confirmed.current = true;
    // Disarms when it resolves; a rejection leaves it armed, fields kept: the caller
    // shows why, the user retries.
    run(onConfirm(values.password, values), () => setArmed(false));
  };

  // The first field takes focus on arm: the tick, then the phrase, then the password —
  // the order they are drawn in.
  const firstField = asksAcknowledge ? "acknowledge" : phrase !== undefined ? "phrase" : "password";
  const lines = (consequences ?? []).map((item, index) =>
    typeof item === "string"
      ? { key: item, text: item as ReactNode, severe: false }
      : { key: item.key ?? String(index), text: item.text, severe: Boolean(item.severe) },
  );

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
        aria-describedby={lines.length > 0 ? `${promptId} ${consequencesId}` : promptId}
        aria-busy={busy || undefined}
        onSubmit={submit}
        noValidate
      >
        <p id={promptId} className={cn("text-xs font-medium", toneText)}>
          {prompt ?? labels.prompt}
        </p>
        {lines.length > 0 && (
          <ul id={consequencesId} className="list-disc space-y-1 ps-5 text-xs text-[var(--text-secondary)]">
            {lines.map((line) => (
              <li key={line.key} className={line.severe ? "text-[var(--danger)]" : undefined}>
                {line.text}
              </li>
            ))}
          </ul>
        )}
        {/* The caller's fields: after what the action does, before the proof that it is
            meant. No wrapper without them — a 0.23 tile's markup is unchanged. */}
        {hasFields && (
          <div ref={slotRef} className="space-y-2">
            {children}
          </div>
        )}
        {asksAcknowledge && (
          <Checkbox
            ref={firstField === "acknowledge" ? firstFieldRef : undefined}
            label={acknowledgeLabel}
            checked={acknowledged}
            // Not `disabled` while busy, for the same reason the fields are readOnly:
            // the box may hold the focus. A change while busy is simply not taken.
            onCheckedChange={(next) => {
              if (!busy) setAcknowledged(next);
            }}
          />
        )}
        {phrase !== undefined && (
          <TypedConfirmField
            ref={firstField === "phrase" ? firstFieldRef : undefined}
            target={phrase}
            match={phraseMatch}
            value={typed}
            onValueChange={setTyped}
            busy={busy}
            // Already resolved through this tile's own `labels` prop; handed on so a
            // per-instance phrase wording reaches the field.
            labels={{ phrase: labels.phrase, phrasePlaceholder: labels.phrasePlaceholder }}
          />
        )}
        {requirePassword && (
          <CurrentPasswordInput
            ref={firstField === "password" ? firstFieldRef : undefined}
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
            id={confirmId}
            type="submit"
            variant={confirmVariant ?? (tone === "warning" ? "primary" : "danger")}
            disabled={!canConfirm}
            // Held by a guard (the caller's or a built-in one), or armed and then locked
            // (or rendered armed under a lock): the confirm says why the way Button
            // does — focusable, `aria-disabled`, the reason in its tooltip and
            // description, a press swallowed (the submit with it) — and the fields stay
            // as typed. Only busy is the native `disabled`.
            disabledReason={confirmReason}
            aria-busy={busy || undefined}
          >
            {busy && <Spinner label={null} className="h-4 w-4" />}
            {confirmLabel ?? labels.confirm}
          </Button>
        </div>
        {locked && <p className="text-xs text-[var(--text-muted)]">{lockedReason}</p>}
      </form>
    </div>
  );
}
