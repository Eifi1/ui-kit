import { passwordByteLength } from "../components/password-strength";

/**
 * The few hard rules of the sign-up and sign-in forms, in one place — and the only ones
 * (docs/auth-harmonization.md §3.1, §8). The servers check the same; the kit adds no
 * rule of its own, and everything the strength meter shows beyond these is advice.
 *
 * @internal Shared by RegisterForm, SignInForm and CompleteNameDialog; the coordinator
 * decides whether the constants join the barrel.
 */

/** At least 8 characters. */
export const PASSWORD_MIN_LENGTH = 8;

/** At most 72 BYTES — bcrypt reads no further, so a longer password would be silently
 *  cut. "ü" is two bytes, an emoji four. */
export const PASSWORD_MAX_BYTES = 72;

/** A first or last name: 1–120 characters after trimming — the old `display_name`
 *  limit, so a migrated name fits (§3.1). */
export const PERSON_NAME_MAX_LENGTH = 120;

/** 1–120 characters after trimming. */
export function personNameOk(value: string): boolean {
  const length = value.trim().length;
  return length >= 1 && length <= PERSON_NAME_MAX_LENGTH;
}

/**
 * Why a new password and its confirmation may not be submitted yet, or `null` when they
 * may — keksdose's `passwordPairError` (features/auth/password-fields.tsx). Characters
 * are counted as code points, as the strength meter counts them: an emoji is one
 * character to the person typing it.
 */
export function newPasswordProblem(password: string, confirm: string): "length" | "bytes" | "mismatch" | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return "length";
  if (passwordByteLength(password) > PASSWORD_MAX_BYTES) return "bytes";
  if (password !== confirm) return "mismatch";
  return null;
}
