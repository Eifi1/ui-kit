import { useState } from "react";
import { Input, LineItems, MoneyField, ToggleGroup, formatMoney } from "@eifi1/ui-kit";
import type { LineItemsColumn, LineItemsSummaryTone } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.16 on the Forms page: `LineItems`' `summary` (a split's remainder, toned, with an
 * action that settles it), `fieldLabels="floating"` (the form's own floating-label
 * fields in the lines) and `narrowColumns={2}` (two short fields to a row on a phone)
 * — what keksdose's split editor needed to stop being a local copy.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

type Split = { id: number; category: string; amount: number | null; date: string };

const TOTAL = 120;
let nextId = 3;

export function LineItems016Demo() {
  const [lines, setLines] = useState<Split[]>([
    { id: 1, category: "Groceries", amount: 80, date: "2026-09-28" },
    { id: 2, category: "Household", amount: null, date: "2026-09-28" },
  ]);
  const [labels, setLabels] = useState<"floating" | "aria">("floating");
  const update = (index: number, patch: Partial<Split>) =>
    setLines((list) => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const known = lines.every((l) => l.amount !== null);
  const assigned = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const remainder = Math.round((TOTAL - assigned) * 100) / 100;
  const tone: LineItemsSummaryTone = !known ? "muted" : remainder === 0 ? "success" : "danger";
  // The last line takes whatever the others leave of the total.
  const settle = () => {
    const others = lines.slice(0, -1).reduce((s, l) => s + (l.amount ?? 0), 0);
    update(lines.length - 1, { amount: Math.round((TOTAL - others) * 100) / 100 });
  };

  const columns: LineItemsColumn<Split>[] = [
    {
      key: "category",
      header: "Category",
      narrowSpan: 2,
      render: ({ item, index, label, fieldLabel }) => (
        <Input
          label={fieldLabel}
          aria-label={label}
          value={item.category}
          onChange={(e) => update(index, { category: e.target.value })}
        />
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "9rem",
      align: "end",
      render: ({ item, index, label, fieldLabel }) => (
        <MoneyField
          label={fieldLabel}
          ariaLabel={label}
          currency="CHF"
          value={item.amount}
          onCommit={(amount) => update(index, { amount })}
        />
      ),
    },
    {
      key: "date",
      header: "Date",
      width: "10rem",
      render: ({ item, index, label, fieldLabel }) => (
        <Input
          type="date"
          label={fieldLabel}
          aria-label={label}
          value={item.date}
          onChange={(e) => update(index, { date: e.target.value })}
        />
      ),
    },
  ];

  return (
    <Example
      label="LineItems — summary, floating field labels, two-up on a phone"
      hint={`a CHF ${TOTAL}.00 receipt split across categories`}
    >
      <Row className="mb-3">
        <ToggleGroup
          ariaLabel="Field labels"
          options={[
            { value: "floating", label: "floating" },
            { value: "aria", label: "aria" },
          ]}
          caption={(v) => `fieldLabels="${v}"`}
          value={labels}
          onChange={setLabels}
        />
      </Row>
      <LineItems
        items={lines}
        columns={columns}
        fieldLabels={labels}
        narrowColumns={2}
        minItems={1}
        addLabel="Add split"
        onAdd={() => setLines((l) => [...l, { id: nextId++, category: "", amount: null, date: "2026-09-28" }])}
        onRemove={(i) => setLines((l) => l.filter((_, j) => j !== i))}
        rowLabel={(i) => `Split ${i + 1}`}
        summary={{
          label: "Left to assign",
          value: known ? formatMoney(remainder, "CHF") : "—",
          tone,
          action: { label: "Set amount to total", onClick: settle, disabled: known && remainder === 0 },
        }}
      />
      <div className="mt-3">
        <Note>
          {code("summary")} takes a {code("label")}, a {code("value")} in a {code("tone")} (
          {code("success")} at zero, {code("danger")} otherwise, {code("muted")} while an amount is
          missing) and an {code("action")}. With {code("fieldLabels=\"floating\"")} each cell's render gets{" "}
          {code("fieldLabel")}, the column's name, for the field's own label, and the header row goes;{" "}
          {code("aria-label")} still names the row. {code("narrowColumns={2}")} pairs Amount and Date on a
          phone; Category's {code("narrowSpan={2}")} keeps a row to itself.
        </Note>
      </div>
    </Example>
  );
}
