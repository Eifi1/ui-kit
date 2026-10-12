import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@eifi1/ui-kit";
import type { ComboOption } from "@eifi1/ui-kit";
// The two subpath entries, imported from their source files: the showcase's alias
// (showcase/alias.ts + tsconfig `paths`) maps only "@eifi1/ui-kit" and "/dates", and
// a bare "@eifi1/ui-kit/rhf" would resolve INTO the barrel file. A consumer writes
// `from "@eifi1/ui-kit/rhf"` and `from "@eifi1/ui-kit/table-text"`.
import {
  Form,
  RhfCheckbox,
  RhfInlineEntityCombobox,
  RhfNumberField,
  RhfSelect,
  RhfTextarea,
  RhfTextField,
} from "@eifi1/ui-kit/rhf";
import { Example, Note } from "../lib/section";

/**
 * FORMS (react-hook-form) — `@eifi1/ui-kit/rhf`, the adapter that wires the kit's
 * fields into a react-hook-form `Form`. Its own page, beside the text fields, because it
 * is how those fields are used in a real form; it used to sit at the bottom of the
 * Helpers page, among the pure functions.
 *
 * 0.34: built from the bound `Rhf*` fields. It was built from the shadcn scaffold
 * (`FormField` → `FormItem` → `FormLabel` → `FormControl` → … → `FormMessage`), which
 * 0.34 deprecates (refactor audit 2026-10, API-6f): no app writes a form that way any
 * more, and each bound field is those parts folded into one element.
 */
export function FormsRhf() {
  return <RhfExample />;
}

const q = (v: unknown) => JSON.stringify(v);

const PAYEES: ComboOption<string>[] = [
  { value: "rail", label: "National Rail" },
  { value: "hotel", label: "Hotel Adler" },
  { value: "shop", label: "Office supplies Ltd" },
];

const CATEGORIES = [
  { value: "travel", label: "Travel" },
  { value: "office", label: "Office" },
];

type ExpenseForm = {
  title: string;
  amount: number | null;
  category: string;
  /** "" = no payee: the schema's spelling, so the picker is told `clearValue=""`. */
  payee: string;
  note: string;
  agree: boolean;
};

function RhfExample() {
  const form = useForm<ExpenseForm>({
    defaultValues: { title: "", amount: null, category: "", payee: "", note: "", agree: false },
    mode: "onTouched",
  });
  const [submitted, setSubmitted] = useState<ExpenseForm | null>(null);

  return (
    <Example
      label="Form · RhfTextField · RhfNumberField · RhfSelect · RhfInlineEntityCombobox · RhfTextarea · RhfCheckbox"
      hint="submit empty to see every message; each control's aria-describedby names only what is on screen"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((data) => setSubmitted(data))}
          // `grid-cols-1` below `sm`: an untemplated column grew to its widest line and ran
          // 94 px past a 360 px phone at Extra large (0.32.1).
          className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <RhfTextField<ExpenseForm>
            name="title"
            label="Title"
            hint="What a reader sees in the list."
            required
            rules={{ required: "Give the expense a title." }}
          />
          <RhfNumberField<ExpenseForm>
            name="amount"
            label="Amount"
            unit="EUR"
            required
            rules={{
              validate: (v) => (typeof v === "number" && v > 0) || "Enter an amount above zero.",
            }}
          />
          <RhfSelect<ExpenseForm>
            name="category"
            label="Category"
            placeholder="—"
            options={CATEGORIES}
            hint="Used for the monthly report."
            required
            rules={{ required: "Pick a category." }}
          />
          {/* `clearValue=""`: the × hands the form an empty string, its own "no choice",
              and "" reads back as empty — no mapping. */}
          <RhfInlineEntityCombobox<ExpenseForm, "payee", string>
            name="payee"
            label="Payee"
            options={PAYEES}
            clearValue=""
            placeholder="Pick a payee"
            hint={'The × clears to "", never null.'}
            required
            rules={{ required: "Pick who was paid." }}
          />
          <RhfTextarea<ExpenseForm>
            name="note"
            label="Note"
            rows={2}
            hint="At most 40 characters."
            rules={{ maxLength: { value: 40, message: "Keep it under 40 characters." } }}
          />
          <RhfCheckbox<ExpenseForm>
            name="agree"
            label="The receipt is attached"
            className="sm:col-span-2"
            rules={{ validate: (v) => v === true || "Confirm the receipt is attached." }}
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="brand">
              Submit
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                form.reset();
                setSubmitted(null);
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Form>
      <p className="mt-3 font-mono text-xs text-secondary">
        onSubmit: {submitted ? q(submitted) : "not called yet"}
      </p>
      <Note>
        The words come from the <code className="font-mono">rules</code> (or a schema); the kit
        ships none here. The message under a field is not{" "}
        <code className="font-mono">role=&quot;alert&quot;</code> on purpose — it is read when
        focus reaches the control. The adapter never coerces a value: an entity picker clears
        to <code className="font-mono">null</code> unless it is given{" "}
        <code className="font-mono">clearValue=&quot;&quot;</code>, as Payee is — the fix for a
        zod <code className="font-mono">z.string()</code> field lives on the picker, not here. The only entry in the package that needs{" "}
        <code className="font-mono">react-hook-form</code>, an optional peer.
      </Note>
      <Note>
        The shadcn scaffold the adapter started as — <code className="font-mono">FormField</code>,{" "}
        <code className="font-mono">FormItem</code>, <code className="font-mono">FormLabel</code>,{" "}
        <code className="font-mono">FormControl</code>, <code className="font-mono">FormDescription</code>,{" "}
        <code className="font-mono">FormMessage</code> and <code className="font-mono">useFormField</code> — is
        deprecated in 0.34 and leaves the package in 0.35. Each bound field is those parts in one
        element; <code className="font-mono">RhfField</code> wraps a control of your own the same way.
      </Note>
    </Example>
  );
}
