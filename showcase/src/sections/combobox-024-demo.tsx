import { useState } from "react";
import { useForm } from "react-hook-form";
import { Autocomplete, Button, FieldHint } from "@eifi1/ui-kit";
import type { ComboOption } from "@eifi1/ui-kit";
// See forms-rhf.tsx: the showcase alias maps "@eifi1/ui-kit/rhf" to src/rhf.ts.
import { Form, RhfInlineEntityCombobox, RhfMoneyField } from "@eifi1/ui-kit/rhf";
import { Example, Note } from "../lib/section";

/**
 * 0.24 for the Combobox family. Two demos, two pages:
 *
 *  - {@link RhfInlineEntity024Demo} (Forms): kastlan's budget line item — an inline
 *    account picker bound in one line, and a failed Save lands focus in it;
 *  - {@link AutocompleteHint024Demo} (Comboboxes): an unlabelled Autocomplete whose "?"
 *    comes and goes while you type, and the field keeps the caret.
 *
 * Synthetic data throughout.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap [overflow-wrap:anywhere]";
const code = (s: string) => <code className="font-mono">{s}</code>;

const CHART: ComboOption<number>[] = [
  { value: 1000, label: "1000 Example cash", group: "Assets" },
  { value: 1020, label: "1020 Sample bank", group: "Assets" },
  { value: 2000, label: "2000 Sample payables", group: "Liabilities" },
  { value: 4000, label: "4000 Example materials", group: "Expenses" },
  { value: 6000, label: "6000 Sample rent", group: "Expenses" },
];

type LineItem = {
  account: number | null;
  /** Optional, and `""` when cleared — as a `z.string()` schema spells "none". */
  costCentre: number | "";
  amount: number | null;
};

/** Forms page (slug `forms`). */
export function RhfInlineEntity024Demo() {
  const form = useForm<LineItem>({ defaultValues: { account: null, costCentre: "", amount: null } });
  const [chart, setChart] = useState(CHART);
  const [submitted, setSubmitted] = useState("—");
  return (
    <Example
      label="RhfInlineEntityCombobox"
      hint="save empty: focus lands in the account field — the inline picker's <input>"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => setSubmitted(JSON.stringify(v)))}
          className="grid gap-4 md:grid-cols-2"
        >
          <RhfInlineEntityCombobox<LineItem, "account", number>
            name="account"
            label="Account"
            hint="Type the number or the name"
            required
            options={chart}
            placeholder="1000 …"
            rules={{ required: "Choose an account" }}
            // The create row: the caller makes the record and stores its id.
            onCreate={(name) => {
              const next = Math.max(...chart.map((o) => o.value)) + 10;
              setChart((c) => [...c, { value: next, label: `${next} ${name}`, group: "New" }]);
              form.setValue("account", next, { shouldValidate: true });
            }}
          />
          <RhfInlineEntityCombobox<LineItem, "costCentre", number>
            name="costCentre"
            label="Cost centre"
            hint="Optional — the × clears it"
            options={chart.filter((o) => o.group === "Expenses")}
            clearable
            clearValue=""
          />
          <RhfMoneyField<LineItem>
            name="amount"
            label="Amount"
            currency="CHF"
            required
            rules={{ required: "Enter an amount" }}
          />
          <div className="md:col-span-2">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Form>
      <p className={READOUT}>submitted: {submitted}</p>
      <Note>
        Bound the way {code("RhfCountrySelect")} is: {code("field.ref")} reaches the picker&apos;s {code("<input>")}{" "}
        through its new {code("ref")}, so a failed submit focuses it; the form&apos;s error paints the input and is
        the message under it; the hint is the form&apos;s description, so the picker&apos;s box never changes. The
        form&apos;s label names the input and titles the phone sheet. {code("commit")}, {code("disabledReason")} and
        the create row ({code("onCreate")}, {code("createEmptyLabel")}, {code("createCommit")}) pass through — type
        a name nothing matches to see it. Every Combobox-family member takes a {code("ref")} to its focusable control
        since 0.24.
      </Note>
    </Example>
  );
}

const STREETS: ComboOption<string>[] = [
  { value: "1", label: "Example Street 1, 0000 Sampletown" },
  { value: "2", label: "Example Street 12, 0000 Sampletown" },
  { value: "3", label: "Sample Road 3, 0000 Demoville" },
];

/** Comboboxes page (slug `comboboxes`). */
export function AutocompleteHint024Demo() {
  const [text, setText] = useState("");
  // The "?" only says something once there is a search to explain.
  const hint = text.trim() ? <FieldHint label="Only addresses in the sample region are offered" /> : undefined;
  return (
    <Example
      label="Autocomplete — a hint that comes and goes"
      hint="type: the '?' appears beside the field, and the caret stays where it was"
    >
      <div className="max-w-md">
        <Autocomplete
          aria-label="Search an address"
          placeholder="Search an address"
          value={text}
          onChange={setText}
          options={STREETS}
          // Passed even while it is `undefined`: that is what keeps the field's row.
          hint={hint}
        />
      </div>
      <Note>
        The family&apos;s rule since 0.22, on Autocomplete since 0.24: a field that is passed {code("hint")} at all —
        even {code("undefined")} — keeps one box, so on an unlabelled field the end-edge row the &quot;?&quot; sits in
        is there whether or not the &quot;?&quot; is. Before, the row came and went with it, the {code("<input>")}{" "}
        was re-parented, and the first letter typed lost focus.
      </Note>
    </Example>
  );
}
