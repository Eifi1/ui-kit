import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Button,
  DialogFrame,
  FormActions,
  Input,
  LineItems,
  NumberField,
  ToggleGroup,
  formatMoney,
  useConfirm,
} from "@eifi1/ui-kit";
import type { ComboOption, LineItemsColumn } from "@eifi1/ui-kit";
// See forms-rhf.tsx: the showcase alias maps "@eifi1/ui-kit/rhf" to src/rhf.ts.
import {
  Form,
  RhfCheckbox,
  RhfCombobox,
  RhfDateField,
  RhfField,
  RhfLineItems,
  RhfMoneyField,
  RhfNumberField,
  RhfSelect,
  RhfTextCombobox,
  RhfTextField,
  RhfTextarea,
} from "@eifi1/ui-kit/rhf";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.12 on the Forms page: the bound `Rhf*` fields (one line per field, the red border
 * and focus-on-error included), `RhfLineItems` over `useFieldArray`, and the plain
 * `LineItems` and `FormActions` they end in.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap [overflow-wrap:anywhere]";
const code = (s: string) => <code className="font-mono">{s}</code>;

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

const PAYEES = ["City utilities", "Caretaker Müller", "Insurance AG", "Cleaning service"];

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
            options={PAYEES}
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
                  ariaLabel="Colour tag"
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
                      ariaLabel={label}
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
      <p className={`mt-3 ${READOUT}`}>submitted: {submitted}</p>
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
    </Example>
  );
}

/* ── FormActions and LineItems ───────────────────────────────────────────── */

type Position = { id: number; text: string; qty: number | null; price: number | null };

let nextId = 4;

const START_POSITIONS: Position[] = [
  { id: 1, text: "Window cleaning", qty: 2, price: 45 },
  { id: 2, text: "Gutter repair", qty: 1, price: 180 },
  { id: 3, text: "Garden, March", qty: 6, price: 38.5 },
];

export function FormLayoutDemo() {
  return (
    <>
      <FormActionsPlacements />
      <LineItemsDemo />
    </>
  );
}

function FormActionsPlacements() {
  const [log, setLog] = useState("—");
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const save = (where: string) => {
    setPending(true);
    setLog(`${where}: saving…`);
    window.setTimeout(() => {
      setPending(false);
      setLog(`${where}: saved`);
    }, 1200);
  };
  return (
    <Example
      label="FormActions — inline, sticky, dialog, destructive and pending"
      hint="the Save / Cancel row every form ends in; labels from the provider"
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            placement=&quot;inline&quot; (default) — submits the enclosing form, pending on click
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save("inline");
            }}
            className="rounded-md border border-[var(--border)] p-3"
          >
            <Input label="Account name" defaultValue="Household" />
            <FormActions onCancel={() => setLog("inline: cancelled")} pending={pending} pendingLabel="Saving…" />
          </form>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            placement=&quot;sticky&quot; — scroll the box: the row stays on its bottom edge
          </p>
          <div className="h-48 overflow-y-auto rounded-md border border-[var(--border)] px-3 pt-3">
            <div className="space-y-3">
              {["Street", "Postcode", "City", "Country", "Floor", "Door code"].map((f) => (
                <Input key={f} label={f} />
              ))}
            </div>
            <FormActions
              placement="sticky"
              onCancel={() => setLog("sticky: cancelled")}
              onSubmit={() => save("sticky")}
              pending={pending}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            placement=&quot;dialog&quot; in DialogFrame&apos;s footer, a destructive action, and a disabled reason
          </p>
          <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)}>
            Edit budget…
          </Button>
          <DialogFrame
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Edit budget"
            actions={
              <FormActions
                placement="dialog"
                onCancel={() => {
                  setDialogOpen(false);
                  setLog("dialog: cancelled");
                }}
                onSubmit={() => save("dialog")}
                submitDisabled
                submitDisabledReason="The lines do not add up to the budget"
                destructive={{
                  label: "Delete budget",
                  onClick: () => {
                    setDialogOpen(false);
                    setLog("dialog: delete pressed");
                  },
                }}
              />
            }
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Save is disabled with a reason — hover or Tab to it. Delete sits at the start, so the row
              aligns <code className="font-mono">between</code>.
            </p>
          </DialogFrame>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            align=&quot;start&quot;, extra children, submitVariant=&quot;danger&quot;, no Cancel
          </p>
          <FormActions
            align="start"
            submitLabel="Close the year"
            submitVariant="danger"
            onSubmit={() => setLog("start: close the year")}
          >
            <Button type="button" variant="ghost" onClick={() => setLog("start: preview")}>
              Preview
            </Button>
          </FormActions>
        </div>
      </div>
      <p className={`mt-3 ${READOUT}`}>last: {log}</p>
    </Example>
  );
}

function LineItemsDemo() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Position[]>(START_POSITIONS);
  const [mode, setMode] = useState<"press" | "dialog">("press");
  const total = items.reduce((s, p) => s + (p.qty ?? 0) * (p.price ?? 0), 0);
  const update = (index: number, patch: Partial<Position>) =>
    setItems((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const columns: LineItemsColumn<Position>[] = [
    {
      key: "text",
      header: "Position",
      render: ({ item, index, label }) => (
        <Input aria-label={label} value={item.text} onChange={(e) => update(index, { text: e.target.value })} />
      ),
    },
    {
      key: "qty",
      header: "Qty",
      width: "5rem",
      align: "end",
      render: ({ item, index, label }) => (
        <NumberField ariaLabel={label} value={item.qty} digits={0} min={0} nullable onCommit={(qty) => update(index, { qty })} />
      ),
    },
    {
      key: "price",
      header: "Price",
      width: "7rem",
      align: "end",
      render: ({ item, index, label }) => (
        <NumberField ariaLabel={label} value={item.price} digits={2} min={0} nullable onCommit={(price) => update(index, { price })} />
      ),
    },
    {
      key: "sum",
      header: "Sum",
      width: "7rem",
      align: "end",
      render: ({ item }) => (
        <span className="block py-2 text-end text-sm tabular-nums">
          {formatMoney((item.qty ?? 0) * (item.price ?? 0), "EUR")}
        </span>
      ),
    },
  ];

  return (
    <Example
      label="LineItems — totals, a minimum, and remove confirmation"
      hint="plain state; Ctrl/⌘+Enter in a row adds one; narrow panes stack each row"
    >
      <Row className="mb-3">
        <ToggleGroup
          ariaLabel="Remove confirmation"
          options={[
            { value: "press", label: "confirmRemove: true" },
            { value: "dialog", label: "confirmRemove: useConfirm" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Row>
      <LineItems
        items={items}
        columns={columns}
        minItems={1}
        maxItems={6}
        addLabel="Add position"
        onAdd={() => setItems((l) => [...l, { id: nextId++, text: "", qty: 1, price: null }])}
        onRemove={(i) => setItems((l) => l.filter((_, j) => j !== i))}
        confirmRemove={
          mode === "press"
            ? true
            : (item) =>
                confirm({
                  title: `Remove “${item.text || "this position"}”?`,
                  body: "The line and its amount leave the invoice.",
                  tone: "danger",
                  confirmLabel: "Remove",
                })
        }
        rowLabel={(i) => `Position ${i + 1}`}
        totals={{ sum: formatMoney(total, "EUR") }}
        totalsLabel="Invoice total"
        empty="No positions yet."
        error={total > 2000 ? "The invoice is over the €2,000 approval limit." : undefined}
      />
      <div className="mt-3">
        <Note>
          {code("minItems={1}")} disables the last remove button; {code("maxItems={6}")} disables Add at six
          rows. With {code("confirmRemove")} set to {code("true")} the remove button asks for a second press
          (Escape or leaving it calls it off); as a function it is asked — here {code("useConfirm")} with a
          danger tone. Raise a quantity until the total passes €2,000 to see the list-level {code("error")}.
        </Note>
      </div>
    </Example>
  );
}
