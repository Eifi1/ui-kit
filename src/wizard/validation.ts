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
export function requiredFieldsValidator<T extends Record<string, unknown>>(
  data: T,
  fields: RequiredFieldSpec<T>[],
  defaultMessage: string,
): ValidateResult {
  const errors: FieldErrors = {};
  for (const f of fields) {
    const v = data[f.key];
    const ok = f.valid
      ? f.valid(v, data)
      : typeof v === "string"
        ? v.trim() !== ""
        : v != null;
    if (!ok) errors[String(f.key)] = f.message ?? defaultMessage;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
