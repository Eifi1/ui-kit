import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button, FormActions, ToggleGroup, formatMoney } from "@eifi1/ui-kit";
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
  RhfCombobox,
  RhfDateField,
  RhfField,
  RhfLineItems,
  RhfMoneyField,
  RhfTextCombobox,
} from "@eifi1/ui-kit/rhf";
import { Example, Note, code, READOUT_PRE } from "../lib/section";
import { Bell } from "lucide-react";
import { Input } from "../../../src/components/input";
import { Select } from "../../../src/components/select";
import { Checkbox } from "../../../src/components/checkbox";
import { Switch } from "../../../src/components/switch";
import { List, ListItem } from "../../../src/components/list";
import { WriteLockProvider } from "../../../src/components/write-lock";
import { NumberField } from "../../../src/components/number-field";
import { MoneyField } from "../../../src/components/money-field";

/**
 * FORMS (react-hook-form) — `@eifi1/ui-kit/rhf`, the adapter that wires the kit's
 * fields into a react-hook-form `Form`. Its own page, beside the text fields, because it
 * is how those fields are used in a real form; it used to sit at the bottom of the
 * Helpers page, among the pure functions.
 *
 * 0.34: built from the bound `Rhf*` fields. It was built from the shadcn scaffold
 * (`FormField` → `FormItem` → `FormLabel` → `FormControl` → … → `FormMessage`), which
 * 0.34 deprecated and 0.35 removed (refactor audit 2026-10, API-6f): no app writes a form
 * that way any more, and each bound field is those parts folded into one element.
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
            <Button type="submit" variant="accent">
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
        <code className="font-mono">FormMessage</code> and <code className="font-mono">useFormField</code> — was
        deprecated in 0.34 and left the package in 0.35. Each bound field is those parts in one
        element; <code className="font-mono">RhfField</code> wraps a control of your own the same way.
      </Note>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

export function CommitControls022Demo() {
  const [locked, setLocked] = useState(true);
  const [digest, setDigest] = useState(true);
  const [reviewer, setReviewer] = useState(false);
  const [role, setRole] = useState("member");
  const [read, setRead] = useState(0);
  const [profile, setProfile] = useState("Morning ramp");
  const [wheelbase, setWheelbase] = useState<number | null>(2700);
  const [assigned, setAssigned] = useState<number | null>(120.5);
  return (
    <Example
      label="commit on the controls that save themselves"
      hint="keksdose K3 — Switch, Checkbox, Select and a ListItem click, Button's pattern; the fields saved on blur since 0.33.1 / 0.34"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Viewing a budget shared to read" />
        <WriteLockProvider locked={locked} reason="Shared with you to read — saving is off.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Switch commit checked={digest} onCheckedChange={setDigest} label="Email me the weekly summary" />
              <Checkbox commit checked={reviewer} onCheckedChange={setReviewer} label="May review translations" />
              <Select commit label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
              {/* Fields that ARE their own save (committed on blur): NumberField since 0.33.1,
                  Input and the amount fields since 0.34 (KS U10, round 0.34 C2). */}
              <Input commit label="Profile name" value={profile} onChange={(e) => setProfile(e.target.value)} />
              <NumberField commit label="Wheelbase (mm)" value={wheelbase} onCommit={setWheelbase} />
              <MoneyField commit label="Assigned" currency="CHF" value={assigned} onCommit={setAssigned} />
            </div>
            <List separator="divider">
              <ListItem
                commit
                icon={Bell}
                title="Mark all as read"
                subtitle={`Marked ${read} time${read === 1 ? "" : "s"}`}
                onClick={() => setRead((n) => n + 1)}
              />
            </List>
          </div>
        </WriteLockProvider>
      </div>
      <Note>
        Under a lock each control is {code("aria-disabled")} but stays focusable, says why in the kit tooltip — a
        line under it at Large and on a touch screen, as on Button ({code("disabledReasonDisplay")}) — and in its
        description, and fires no change. Without a provider (or unlocked) {code("commit")} does nothing;{" "}
        {code("disabledReason")} does the same for a reason of the control&apos;s own. A field that saves itself is{" "}
        {code("readOnly")} besides — it shows its value, and reports no change, no blur and no Enter; the amount
        fields offer no calculator, numpad or currency picker. A field that only reaches the server through the
        form&apos;s Save leaves {code("commit")} off and stays editable.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── since 0.12 ─────────────────────────────────────────────────────────── */

/**
 * 0.12 on the Forms page: the bound `Rhf*` fields (one line per field, the red border
 * and focus-on-error included), `RhfLineItems` over `useFieldArray`, and the plain
 * `LineItems` and `FormActions` they end in.
 */

/* ── every Rhf* field in one form ─────────────────────────────────────────── */

type Line = { description: string; amount: number | null };

type Lease = {
  name: string;
  notes: string;
  units: number | null;
  rent: number | null;
  start: string;
  type: string;
  tenantId: number | null;
  payee: string;
  colour: string;
  isDefault: boolean;
  lines: Line[];
};

const EMPTY_LEASE: Lease = {
  name: "",
  notes: "",
  units: null,
  rent: null,
  start: "",
  type: "",
  tenantId: null,
  payee: "",
  colour: "",
  isDefault: false,
  lines: [{ description: "", amount: null }],
};

const LEASE_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "parking", label: "Parking space" },
];

const TENANTS: ComboOption<number>[] = [
  { value: 1, label: "Ada Lovelace", sublabel: "Flat 2B" },
  { value: 2, label: "Grace Hopper", sublabel: "Flat 3A" },
  { value: 3, label: "Alan Turing", sublabel: "Shop 1" },
];

const PAYEES_012 = ["City utilities", "Caretaker Müller", "Insurance AG", "Cleaning service"];

const COLOURS = [
  { value: "sky", label: "Sky" },
  { value: "moss", label: "Moss" },
  { value: "clay", label: "Clay" },
];

export function RhfFieldsDemo() {
  const form = useForm<Lease>({ defaultValues: EMPTY_LEASE, mode: "onTouched" });
  const [submitted, setSubmitted] = useState("—");
  const lines = useWatch({ control: form.control, name: "lines" });
  const total = (lines ?? []).reduce((sum, l) => sum + (l?.amount ?? 0), 0);

  return (
    <Example
      label="Rhf* bound fields — every field in one form, with errors"
      hint="press Save on the empty form: every field paints red, says why, and focus lands on the first"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(
            (v) => setSubmitted(JSON.stringify(v, null, 1)),
            (errors) => setSubmitted(`invalid: ${Object.keys(errors).join(", ")}`),
          )}
          className="grid gap-4 md:grid-cols-2"
        >
          <RhfTextField<Lease>
            name="name"
            label="Lease name"
            hint="As printed on the contract"
            required
            rules={{ required: "Give the lease a name." }}
          />
          <RhfSelect<Lease>
            name="type"
            label="Type"
            placeholder="Choose…"
            options={LEASE_TYPES}
            required
            rules={{ required: "Pick a type." }}
          />
          <RhfNumberField<Lease>
            name="units"
            label="Units"
            unit="pcs"
            digits={0}
            min={0}
            required
            rules={{
              validate: (v) => (typeof v === "number" && v > 0) || "At least one unit.",
            }}
          />
          <RhfMoneyField<Lease>
            name="rent"
            label="Net rent"
            currency="CHF"
            required
            rules={{
              validate: (v) => (typeof v === "number" && v > 0) || "Enter the monthly rent.",
            }}
          />
          <RhfDateField<Lease>
            name="start"
            label="Start"
            required
            rules={{ required: "When does the lease start?" }}
          />
          <RhfCombobox<Lease, "tenantId", number>
            name="tenantId"
            label="Tenant"
            options={TENANTS}
            clearable
            required
            rules={{ validate: (v) => v != null || "Pick the tenant." }}
          />
          <RhfTextCombobox<Lease>
            name="payee"
            label="Pays utilities to"
            options={PAYEES_012}
            hint="Free text; the list only suggests"
            rules={{ required: "Who receives the utilities?" }}
            required
          />
          <RhfField<Lease>
            name="colour"
            label="Colour tag (RhfField + your own control)"
            rules={{ required: "Pick a colour tag." }}
            render={({ field, invalid }) => (
              <div
                data-invalid={invalid || undefined}
                className={invalid ? "rounded-md ring-1 ring-[var(--danger)]" : undefined}
              >
                <ToggleGroup
                  aria-label="Colour tag"
                  allowEmpty
                  options={COLOURS}
                  value={(field.value as string) || null}
                  onChange={(v) => {
                    field.onChange(v ?? "");
                    field.onBlur();
                  }}
                />
              </div>
            )}
          />
          <RhfTextarea<Lease>
            name="notes"
            label="Notes"
            className="md:col-span-2"
            rules={{ maxLength: { value: 80, message: "At most 80 characters." } }}
            hint="Optional; more than 80 characters is an error"
          />
          <RhfCheckbox<Lease>
            name="isDefault"
            label="I have read the lease"
            hint="Required: the box has to be ticked"
            className="md:col-span-2"
            rules={{ validate: (v) => v === true || "Tick the box to continue." }}
          />
          <div className="md:col-span-2">
            <RhfLineItems<Lease, "lines">
              name="lines"
              rules={{
                validate: (v) =>
                  (v as Line[]).length >= 2 || "A lease needs at least two cost lines.",
              }}
              newItem={() => ({ description: "", amount: null })}
              addLabel="Add cost line"
              columns={[
                {
                  key: "description",
                  header: "Description",
                  render: ({ name, label }) => (
                    <RhfTextField<Lease>
                      name={`${name}.description`}
                      aria-label={label}
                      rules={{ required: "Describe the cost." }}
                    />
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  width: "9rem",
                  align: "end",
                  render: ({ name, label }) => (
                    <RhfMoneyField<Lease>
                      name={`${name}.amount`}
                      aria-label={label}
                      currency="CHF"
                      rules={{ validate: (v) => (typeof v === "number" && v > 0) || "Amount?" }}
                    />
                  ),
                },
              ]}
              totals={{ amount: formatMoney(total, "CHF") }}
            />
          </div>
          <FormActions
            className="md:col-span-2"
            onCancel={() => {
              form.reset(EMPTY_LEASE);
              setSubmitted("—");
            }}
            cancelLabel="Reset"
          />
        </form>
      </Form>
      <p className={`mt-3 ${READOUT_PRE}`}>submitted: {submitted}</p>
      <div className="mt-3">
        <Note>
          One line per field: {code("RhfTextField")}, {code("RhfSelect")}, {code("RhfNumberField")},{" "}
          {code("RhfMoneyField")}, {code("RhfDateField")}, {code("RhfCombobox")} (an entity id),{" "}
          {code("RhfTextCombobox")} (free text), {code("RhfTextarea")}, {code("RhfCheckbox")}, and{" "}
          {code("RhfField")} — the shell they are built on — round a {code("ToggleGroup")}. None is given{" "}
          {code("control")}: under {code("<Form {...form}>")} they find the form through context. The
          cost lines are {code("RhfLineItems")} over {code("useFieldArray")}: its {code("rules")} message
          (fewer than two lines) is the list&apos;s error, each cell binds to {code("`${name}.amount`")},
          and the totals row sums the watched values.
        </Note>
      </div>
      <Note>Since 0.12.</Note>
    </Example>
  );
}
