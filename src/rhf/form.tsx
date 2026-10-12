/**
 * `Form`, and until 0.35 the shadcn scaffold under its old public names — the public face
 * of ./form-core, where the scaffold lives (its header has the whole story: what differs
 * from shadcn's file, why /rhf is its own entry, how a picker clears).
 *
 * 0.34 (refactor audit 2026-10, API-6f): no app builds a form from the scaffold any more.
 * kastlan, the one /rhf consumer, uses `Form`, the bound `Rhf*` fields and `RhfField` for
 * a control of its own, so the seven names and their props types leave the public
 * surface in 0.35. The bound fields import the parts from the core, so the removal is
 * the block below.
 */
import * as core from "./form-core";

export { Form } from "./form-core";

/* ── Deprecated 0.34, removed in 0.35 ───────────────────────────────────────
 * Each is the core's own value under its public name. The replacement for all of them:
 * a bound field (`RhfTextField`, `RhfSelect`, …), or `RhfField` around a control of
 * your own — the same parts, folded into one element. */

/** @deprecated 0.34 — the bound `Rhf*` fields, or `RhfField` for a control of your own;
 *  removed in 0.35 (API-6f). */
export const FormField = core.FormField;
/** @deprecated 0.34 — `RhfField`, which reads the field's ids itself; removed in 0.35
 *  (API-6f). */
export const useFormField = core.useFormField;
/** @deprecated 0.34 — the bound `Rhf*` fields, or `RhfField`; removed in 0.35 (API-6f). */
export const FormItem = core.FormItem;
/** @deprecated 0.34 — the bound fields' and `RhfField`'s `label`; removed in 0.35 (API-6f). */
export const FormLabel = core.FormLabel;
/** @deprecated 0.34 — `RhfField`, which wires its control the same way; removed in 0.35
 *  (API-6f). */
export const FormControl = core.FormControl;
/** @deprecated 0.34 — the bound fields' and `RhfField`'s `hint`; removed in 0.35 (API-6f). */
export const FormDescription = core.FormDescription;
/** @deprecated 0.34 — the bound fields and `RhfField`, which show the error themselves;
 *  removed in 0.35 (API-6f). */
export const FormMessage = core.FormMessage;
/** @deprecated 0.34 — goes with `FormItem`; removed in 0.35 (API-6f). */
export type FormItemProps = core.FormItemProps;
/** @deprecated 0.34 — goes with `FormLabel`; removed in 0.35 (API-6f). */
export type FormLabelProps = core.FormLabelProps;
/** @deprecated 0.34 — goes with `FormControl`; removed in 0.35 (API-6f). */
export type FormControlProps = core.FormControlProps;
/** @deprecated 0.34 — goes with `FormDescription`; removed in 0.35 (API-6f). */
export type FormDescriptionProps = core.FormDescriptionProps;
/** @deprecated 0.34 — goes with `FormMessage`; removed in 0.35 (API-6f). */
export type FormMessageProps = core.FormMessageProps;
