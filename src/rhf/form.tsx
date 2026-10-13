/**
 * `Form` — the public face of ./form-core, where the shadcn scaffold the bound fields are
 * built from lives (its header has the whole story: what differs from shadcn's file, why
 * /rhf is its own entry, how a picker clears).
 *
 * The scaffold itself (`FormField`, `useFormField`, `FormItem`, `FormLabel`, `FormControl`,
 * `FormDescription`, `FormMessage` and five props types) was public until 0.35 (refactor
 * audit 2026-10, API-6f; deprecated in 0.34): no app builds a form from it any more.
 * kastlan, the one /rhf consumer, uses `Form`, the bound `Rhf*` fields and `RhfField` for
 * a control of its own — the same parts, folded into one element.
 */
export { Form } from "./form-core";
