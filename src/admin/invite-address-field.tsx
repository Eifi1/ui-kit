import { Input } from "../components/input";
import type { InputProps } from "../components/input";

/** What {@link InviteAddressField} takes: the address as text, and whether its shape failed. */
export interface InviteAddressFieldProps extends Omit<
  InputProps,
  "type" | "value" | "onChange" | "error" | "inputMode" | "autoCapitalize" | "spellCheck"
> {
  value: string;
  onChange: (value: string) => void;
  /** The shape check failed on the last submit (`isEmailShape`): `invalidText` shows. */
  invalid?: boolean;
  /** The words under a refused address: `invitations.invalidEmail`. */
  invalidText: string;
}

/**
 * The address to invite, as InvitationsPanel and the teams' add row both ask it (refactor
 * audit 2026-11-22, DUP-8: the two had drifted). The form is `noValidate` and checks the shape
 * itself on submit, so a refused address is said under the field in the kit's words rather
 * than in the browser's `type=email` bubble, in the browser's language. A phone's keyboard
 * shows its `@`, the address is not capitalised or spell-checked, and `data-private` keeps it
 * out of a session replay.
 *
 * @internal Not part of the barrel.
 */
export function InviteAddressField({
  value,
  onChange,
  invalid = false,
  invalidText,
  ...rest
}: InviteAddressFieldProps) {
  return (
    <Input
      autoComplete="off"
      {...rest}
      type="email"
      inputMode="email"
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      error={invalid ? invalidText : undefined}
      data-private
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
