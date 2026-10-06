import type { ReactNode, Ref } from "react";
import { PasswordStrengthMeter } from "../components/password-strength";
import { Input } from "../components/ui";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "./form-rules";

/** @internal The words the fields show — the host form's own labels. */
export interface NewPasswordFieldsText {
  password: ReactNode;
  confirm: ReactNode;
  mismatch: ReactNode;
}

/** @internal */
export interface NewPasswordFieldsProps {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  text: NewPasswordFieldsText;
  /** A request is running: both fields `readOnly` (not `disabled`, which would drop
   *  the focus of the one being typed in). */
  busy?: boolean;
  passwordRef?: Ref<HTMLInputElement>;
}

/**
 * "Choose a password": the field, the strength meter with its advisory checklist, and
 * the confirmation — keksdose's `PasswordFields`, which its register form, its reset
 * page and its forced-change step share so that every screen choosing a password does
 * it under the same rules and the same feedback. Here `RegisterForm` and
 * `SignInForm`'s set-a-new-password step share it.
 *
 * Both fields are `new-password`: a password manager offers to generate one and never
 * fills in the current one. The confirmation carries the mismatch as its own `error`,
 * attached with `aria-describedby`; the key is always passed, so the message coming and
 * going never remounts the field under the typist.
 *
 * @internal Not part of the barrel; the forms are.
 */
export function NewPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  text,
  busy = false,
  passwordRef,
}: NewPasswordFieldsProps) {
  const mismatch = confirm !== "" && confirm !== password;
  return (
    <>
      <div>
        <Input
          ref={passwordRef}
          type="password"
          name="new-password"
          autoComplete="new-password"
          label={text.password}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          minLength={PASSWORD_MIN_LENGTH}
          readOnly={busy}
          required
        />
        {/* The 72-byte cap is passed because a SIGN-IN password has one (bcrypt); the
            minimum is passed rather than left to the meter's own default 8, so the two
            cannot drift apart. */}
        <PasswordStrengthMeter value={password} minLength={PASSWORD_MIN_LENGTH} maxBytes={PASSWORD_MAX_BYTES} />
      </div>
      {/* A typo'd password costs a reset mail — and under keksdose's end-to-end
          encryption, data (feedback #124) — so it is typed twice. */}
      <Input
        type="password"
        name="confirm-password"
        autoComplete="new-password"
        label={text.confirm}
        value={confirm}
        onChange={(e) => onConfirmChange(e.target.value)}
        readOnly={busy}
        error={mismatch ? text.mismatch : undefined}
        required
      />
    </>
  );
}
