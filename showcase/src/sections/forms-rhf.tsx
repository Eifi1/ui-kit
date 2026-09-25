import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, EntityCombobox, Input, NumberField, Select, Textarea } from "@eifi1/ui-kit";
import type { ComboOption } from "@eifi1/ui-kit";
// The two subpath entries, imported from their source files: the showcase's alias
// (showcase/alias.ts + tsconfig `paths`) maps only "@eifi1/ui-kit" and "/dates", and
// a bare "@eifi1/ui-kit/rhf" would resolve INTO the barrel file. A consumer writes
// `from "@eifi1/ui-kit/rhf"` and `from "@eifi1/ui-kit/table-text"`.
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@eifi1/ui-kit/rhf";
import { Example, Note } from "../lib/section";

/**
 * FORMS (react-hook-form) — `@eifi1/ui-kit/rhf`, the adapter that wires the kit's
 * fields into a react-hook-form `Form`. Its own page, beside the text fields, because it
 * is how those fields are used in a real form; it used to sit at the bottom of the
 * Helpers page, among the pure functions.
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

type ExpenseForm = {
  title: string;
  amount: number | null;
  category: string;
  /** "" = no payee: the schema's spelling, so the picker is told `clearValue=""`. */
  payee: string;
  note: string;
  agree: boolean;
};

/** A part of your own beside the kit's: it reads the field's ids and state through
 *  `useFormField`, and prints them — the same values the kit's parts are wired with. */
function FieldReadout() {
  const { formItemId, describedBy, invalid, isDirty, error } = useFormField();
  return (
    <p className="font-mono text-[10px] text-[var(--text-muted)]">
      useFormField() → {q({ formItemId, describedBy, invalid, isDirty, error: error?.message })}
    </p>
  );
}

function RhfExample() {
  const form = useForm<ExpenseForm>({
    defaultValues: { title: "", amount: null, category: "", payee: "", note: "", agree: false },
    mode: "onTouched",
  });
  const [submitted, setSubmitted] = useState<ExpenseForm | null>(null);

  return (
    <Example
      label="Form · FormField · FormItem · FormLabel · FormControl · FormDescription · FormMessage"
      hint="submit empty to see every message; the control's aria-describedby names only what is on screen"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((data) => setSubmitted(data))}
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="title"
            rules={{ required: "Give the expense a title." }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel required>Title</FormLabel>
                <FormControl>
                  {/* Input paints from `invalid`, not from aria-invalid — pass it. */}
                  <Input {...field} invalid={fieldState.invalid} aria-required />
                </FormControl>
                <FormDescription>What a reader sees in the list.</FormDescription>
                <FormMessage />
                <FieldReadout />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            rules={{
              validate: (v) => (v !== null && v > 0) || "Enter an amount above zero.",
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Amount</FormLabel>
                <FormControl>
                  {/* NumberField paints from the aria-invalid FormControl sets. */}
                  <NumberField
                    value={field.value}
                    // Commits on blur or Enter, so `onCommit` is also the "touched" moment.
                    onCommit={(v) => {
                      field.onChange(v);
                      field.onBlur();
                    }}
                    unit="EUR"
                  />
                </FormControl>
                <FormMessage />
                <FieldReadout />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            rules={{ required: "Pick a category." }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel required>Category</FormLabel>
                <FormControl>
                  <Select {...field} invalid={fieldState.invalid}>
                    <option value="">—</option>
                    <option value="travel">Travel</option>
                    <option value="office">Office</option>
                  </Select>
                </FormControl>
                {/* Children show while there is no error — a standing message. */}
                <FormMessage className="text-[var(--text-muted)]">Used for the monthly report.</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="payee"
            rules={{ required: "Pick who was paid." }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel required>Payee</FormLabel>
                <FormControl>
                  {/* `clearValue=""`: the × hands field.onChange an empty string, the
                      form's own "no choice", and "" reads back as empty — no mapping. */}
                  <EntityCombobox
                    value={field.value}
                    onChange={field.onChange}
                    clearValue=""
                    clearable
                    clearLabel="Clear payee"
                    placeholder="Pick a payee"
                    invalid={fieldState.invalid}
                    options={PAYEES}
                  />
                </FormControl>
                <FormDescription>value: {q(field.value)} — the × clears to &quot;&quot;, never null.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            rules={{ maxLength: { value: 40, message: "Keep it under 40 characters." } }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} invalid={fieldState.invalid} />
                </FormControl>
                <FormDescription>{field.value.length}/40</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agree"
            rules={{ validate: (v) => v || "Confirm the receipt is attached." }}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <FormControl>
                    {/* A native element works too: FormControl only adds id and aria. */}
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormLabel>The receipt is attached</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
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
      <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">
        onSubmit: {submitted ? q(submitted) : "not called yet"}
      </p>
      <Note>
        The words come from the <code className="font-mono">rules</code> (or a schema); the kit
        ships none here. <code className="font-mono">FormMessage</code> is not{" "}
        <code className="font-mono">role=&quot;alert&quot;</code> on purpose — it is read when
        focus reaches the control. The adapter never coerces a value: an entity picker clears
        to <code className="font-mono">null</code> unless it is given{" "}
        <code className="font-mono">clearValue=&quot;&quot;</code>, as Payee is — the fix for a
        zod <code className="font-mono">z.string()</code> field lives on the picker, not here. The only entry in the package that needs{" "}
        <code className="font-mono">react-hook-form</code>, an optional peer.
      </Note>
    </Example>
  );
}
