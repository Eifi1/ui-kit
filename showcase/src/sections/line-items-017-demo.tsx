import { useState } from "react";
import { Check } from "lucide-react";
import { Chip, Input, LineItems, MoneyField, ToggleGroup, formatMoney } from "@eifi1/ui-kit";
import type {
  LineItemsColumn,
  LineItemsRemoveAlign,
  LineItemsRemovePlacement,
  LineItemsSummary,
} from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.17 on the Forms page: `LineItems`' summary grows a `status` slot (kastlan's
 * "Balanced" chip beside a journal entry's difference), the money tones, a tone for a
 * value-less state line and a link-style action (keksdose's split remainder); the rows
 * grow `removePlacement="inline"` (the delete button beside the last field on a phone)
 * and `removeAlign` (level with a floating field on the wide grid).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

type Entry = { id: number; account: string; debit: number | null; credit: number | null };
let nextEntry = 3;

export function LineItemsJournal017Demo() {
  const [lines, setLines] = useState<Entry[]>([
    { id: 1, account: "1020 Bank", debit: 250, credit: null },
    { id: 2, account: "3200 Revenue", debit: null, credit: 250 },
  ]);
  const update = (index: number, patch: Partial<Entry>) =>
    setLines((list) => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const debit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  const difference = Math.round((debit - credit) * 100) / 100;
  const balanced = difference === 0;

  const money = (key: "debit" | "credit", header: string): LineItemsColumn<Entry> => ({
    key,
    header,
    width: "9rem",
    align: "end",
    render: ({ item, index, label }) => (
      <MoneyField ariaLabel={label} currency="CHF" value={item[key]} onCommit={(v) => update(index, { [key]: v })} />
    ),
  });
  const columns: LineItemsColumn<Entry>[] = [
    {
      key: "account",
      header: "Account",
      render: ({ item, index, label }) => (
        <Input aria-label={label} value={item.account} onChange={(e) => update(index, { account: e.target.value })} />
      ),
    },
    money("debit", "Debit"),
    money("credit", "Credit"),
  ];

  return (
    <Example label="LineItems — a status chip beside the summary" hint="a journal entry that has to balance">
      <LineItems
        items={lines}
        columns={columns}
        minItems={2}
        addLabel="Add line"
        onAdd={() => setLines((l) => [...l, { id: nextEntry++, account: "", debit: null, credit: null }])}
        onRemove={(i) => setLines((l) => l.filter((_, j) => j !== i))}
        totals={{ debit: formatMoney(debit, "CHF"), credit: formatMoney(credit, "CHF") }}
        summary={{
          label: "Difference",
          value: formatMoney(Math.abs(difference), "CHF"),
          tone: balanced ? "success" : "danger",
          status: balanced ? (
            <Chip size="xs" tone="success" icon={Check}>
              Balanced
            </Chip>
          ) : (
            <Chip size="xs" tone="danger">
              {difference > 0 ? "Debit over" : "Credit over"}
            </Chip>
          ),
        }}
      />
      <div className="mt-3">
        <Note>
          {code("summary.status")} sits beside the value — a chip that names the state, so the colour is
          never the only signal. Change an amount to see it flip.
        </Note>
      </div>
    </Example>
  );
}

type Split = { id: number; category: string; amount: number | null; memo: string };
let nextSplit = 3;

export function LineItemsSplit017Demo() {
  const [total, setTotal] = useState<number | null>(-120);
  const [lines, setLines] = useState<Split[]>([
    { id: 1, category: "Groceries", amount: -80, memo: "Weekly shop" },
    { id: 2, category: "Household", amount: null, memo: "" },
  ]);
  const [placement, setPlacement] = useState<LineItemsRemovePlacement>("inline");
  const [align, setAlign] = useState<LineItemsRemoveAlign | "auto">("auto");
  const update = (index: number, patch: Partial<Split>) =>
    setLines((list) => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const assigned = lines.reduce((s, l) => s + (l.amount ?? 0), 0);
  const settle = () => {
    if (total === null) return;
    const others = lines.slice(0, -1).reduce((s, l) => s + (l.amount ?? 0), 0);
    update(lines.length - 1, { amount: Math.round((total - others) * 100) / 100 });
  };
  let summary: LineItemsSummary;
  if (total === null) {
    // No value: the tone quiets the whole line.
    summary = { label: "Waiting for the transaction's total", tone: "muted" };
  } else {
    const remainder = Math.round((total - assigned) * 100) / 100;
    summary = {
      label: "Left to assign",
      value: formatMoney(remainder, "CHF"),
      // The colours of the row behind it: an expense split stays expense-coloured.
      tone: remainder === 0 ? "success" : remainder < 0 ? "expense" : "income",
      action: { label: "Put the rest on the last line", onClick: settle, variant: "link", disabled: remainder === 0 },
    };
  }

  const columns: LineItemsColumn<Split>[] = [
    {
      key: "category",
      header: "Category",
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
      key: "memo",
      header: "Memo",
      narrowSpan: 2,
      render: ({ item, index, label, fieldLabel }) => (
        <Input
          label={fieldLabel}
          aria-label={label}
          value={item.memo}
          onChange={(e) => update(index, { memo: e.target.value })}
        />
      ),
    },
  ];

  return (
    <Example
      label="LineItems — money tones, a state line, inline remove"
      hint="a CHF −120.00 card payment split across categories"
    >
      <Row className="mb-3">
        <ToggleGroup
          ariaLabel="Total"
          options={[
            { value: "known", label: "total known" },
            { value: "unknown", label: "no total yet" },
          ]}
          caption={(v) => (v === "known" ? "summary with a value" : "a value-less state line")}
          value={total === null ? "unknown" : "known"}
          onChange={(v) => setTotal(v === "known" ? -120 : null)}
        />
        <ToggleGroup
          ariaLabel="Remove placement"
          options={[
            { value: "inline", label: "inline" },
            { value: "row", label: "row" },
          ]}
          caption={(v) => `removePlacement="${v}"`}
          value={placement}
          onChange={setPlacement}
        />
        <ToggleGroup
          ariaLabel="Remove alignment"
          options={[
            { value: "auto", label: "auto" },
            { value: "start", label: "start" },
            { value: "center", label: "center" },
            { value: "end", label: "end" },
          ]}
          caption={(v) => (v === "auto" ? "removeAlign unset" : `removeAlign="${v}"`)}
          value={align}
          onChange={setAlign}
        />
      </Row>
      <LineItems
        items={lines}
        columns={columns}
        fieldLabels="floating"
        narrowColumns={2}
        removePlacement={placement}
        removeAlign={align === "auto" ? undefined : align}
        minItems={1}
        addLabel="Add split"
        onAdd={() => setLines((l) => [...l, { id: nextSplit++, category: "", amount: null, memo: "" }])}
        onRemove={(i) => setLines((l) => l.filter((_, j) => j !== i))}
        rowLabel={(i) => `Split ${i + 1}`}
        summary={summary}
      />
      <div className="mt-3">
        <Note>
          {code("tone")} takes {code("income")} / {code("expense")}, SignedAmount's money pair; with no{" "}
          {code("value")} it colours the label, so a state line can be {code("muted")} whole.{" "}
          {code("action.variant=\"link\"")} is a muted text link. On a phone,{" "}
          {code("removePlacement=\"inline\"")} puts the delete button beside the last field — Category
          and Amount over Memo and delete. Wide, {code("removeAlign")} places it in the row's height; unset,
          it centres on floating fields (level with their control) and keeps to the top otherwise.
        </Note>
      </div>
    </Example>
  );
}
