import type { ValidateResult, FieldErrors } from "./types";

export interface RequiredFieldSpec<T> {
  key: keyof T;
  /**
   * Custom predicate (e.g. numeric `> 0` or range checks). Defaults to a
   * "present" check: a non-empty trimmed string, or a non-null id/enum.
   */
  valid?: (value: unknown, data: T) => boolean;
  /** Per-field message override (defaults to the shared `defaultMessage`). */
  message?: string;
}

/**
 * Folds the copy-pasted `const errors = {}; if (!data.x) errors.x = required; …`
 * step-validate block reimplemented across the single-file entity wizards.
 * Pure-required fields need only `{ key }`; numeric constraints (amount `> 0`,
 * rate in range) pass a `valid` predicate. The message is caller-supplied so
 * each page keeps its own namespace (e.g. `t("common:validation.required")`).
 */
// `T extends object` (0.52, API-2) so a wizard's data may be an interface. The mapped half
// constrains nothing (every object type satisfies it): it is there for
// `Parameters<typeof requiredFieldsValidator>`, which reads the constraint — `keyof object`
// is `never`, so a wrapper typed that way refused every `{ key }` (0.52 code review). With
// it the constraint reads as an indexable record, as 0.51's `Record<string, unknown>` did.
export function requiredFieldsValidator<T extends object & { [K in keyof T]: unknown }>(
  data: T,
  // `readonly` (0.52, API-7): a field list held `as const` passes without a copy.
  fields: readonly RequiredFieldSpec<T>[],
  defaultMessage: string,
): ValidateResult {
  const errors: FieldErrors = {};
  for (const f of fields) {
    const v = data[f.key];
    const ok = f.valid ? f.valid(v, data) : typeof v === "string" ? v.trim() !== "" : v != null;
    if (!ok) errors[String(f.key)] = f.message ?? defaultMessage;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
