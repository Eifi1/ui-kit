import { useState } from "react";
import { Check } from "lucide-react";
import {
  Input,
  LineItems,
  NumberField,
  ToggleGroup,
  formatMoney,
  useConfirm,
  MoneyField,
  Chip,
  Button,
  useTour,
} from "@eifi1/ui-kit";
import type {
  LineItemsColumn,
  LineItemsSummaryTone,
  LineItemsRemoveAlign,
  LineItemsRemovePlacement,
  LineItemsSummary,
} from "@eifi1/ui-kit";
import { Example, Note, Row, code } from "../lib/section";

/**
 * LineItems — the editable list of positions under a form — in one module, rendered as
 * one section of the Forms page. Its specimens were filed by the release that added them
 * (forms-012, line-items-016, line-items-017, misc-022); each keeps its label, so its
 * anchor and its search entry hold, and says since which release in a Note (refactor
 * audit 2026-10, DOC-8).
 */

/* ── since 0.12 ─────────────────────────────────────────────────────────── */

type Position = { id: number; text: string; qty: number | null; price: number | null };

let nextId = 4;

const START_POSITIONS: Position[] = [
  { id: 1, text: "Window cleaning", qty: 2, price: 45 },
  { id: 2, text: "Gutter repair", qty: 1, price: 180 },
  { id: 3, text: "Garden, March", qty: 6, price: 38.5 },
];

function LineItemsTotals() {
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
        <NumberField aria-label={label} value={item.qty} digits={0} min={0} nullable onCommit={(qty) => update(index, { qty })} />
      ),
    },
    {
      key: "price",
      header: "Price",
      width: "7rem",
      align: "end",
      render: ({ item, index, label }) => (
        <NumberField aria-label={label} value={item.price} digits={2} min={0} nullable onCommit={(price) => update(index, { price })} />
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
          aria-label="Remove confirmation"
          // The prop name lives in the caption, not in both options: repeated there it was
          // all a phone showed of either, cut to "confirmRem…" twice.
          options={[
            { value: "press", label: "true" },
            { value: "dialog", label: "useConfirm" },
          ]}
          caption={(v) =>
            v === "press" ? "confirmRemove: true — a second press" : "confirmRemove: useConfirm — a dialog"
          }
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
      <Note>Since 0.12.</Note>
    </Example>
  );
}

/* ── since 0.16 ─────────────────────────────────────────────────────────── */

/**
 * 0.16 on the Forms page: `LineItems`' `summary` (a split's remainder, toned, with an
 * action that settles it), `fieldLabels="floating"` (the form's own floating-label
 * fields in the lines) and `narrowColumns={2}` (two short fields to a row on a phone)
 * — what a split editor needs.
 */

type Split = { id: number; category: string; amount: number | null; date: string };

const TOTAL = 120;

let nextId016 = 3;

function LineItems016Demo() {
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
          aria-label={label}
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
          aria-label="Field labels"
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
        onAdd={() => setLines((l) => [...l, { id: nextId016++, category: "", amount: null, date: "2026-09-28" }])}
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
      <Note>Since 0.16.</Note>
    </Example>
  );
}

/* ── since 0.17 ─────────────────────────────────────────────────────────── */

/**
 * 0.17 on the Forms page: `LineItems`' summary grows a `status` slot (a
 * "Balanced" chip beside a journal entry's difference), the money tones, a tone for a
 * value-less state line and a link-style action (a split remainder); the rows
 * grow `removePlacement="inline"` (the delete button beside the last field on a phone)
 * and `removeAlign` (level with a floating field on the wide grid).
 */

type Entry = { id: number; account: string; debit: number | null; credit: number | null };

let nextEntry = 3;

function LineItemsJournal017Demo() {
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
      <MoneyField aria-label={label} currency="CHF" value={item[key]} onCommit={(v) => update(index, { [key]: v })} />
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
      <Note>Since 0.17.</Note>
    </Example>
  );
}

type Split017 = { id: number; category: string; amount: number | null; memo: string };

let nextSplit = 3;

function LineItemsSplit017Demo() {
  const [total, setTotal] = useState<number | null>(-120);
  const [lines, setLines] = useState<Split017[]>([
    { id: 1, category: "Groceries", amount: -80, memo: "Weekly shop" },
    { id: 2, category: "Household", amount: null, memo: "" },
  ]);
  const [placement, setPlacement] = useState<LineItemsRemovePlacement>("inline");
  const [align, setAlign] = useState<LineItemsRemoveAlign | "auto">("auto");
  const update = (index: number, patch: Partial<Split017>) =>
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

  const columns: LineItemsColumn<Split017>[] = [
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
          aria-label={label}
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
          aria-label="Total"
          options={[
            { value: "known", label: "total known" },
            { value: "unknown", label: "no total yet" },
          ]}
          caption={(v) => (v === "known" ? "summary with a value" : "a value-less state line")}
          value={total === null ? "unknown" : "known"}
          onChange={(v) => setTotal(v === "known" ? -120 : null)}
        />
        <ToggleGroup
          aria-label="Remove placement"
          options={[
            { value: "inline", label: "inline" },
            { value: "row", label: "row" },
          ]}
          caption={(v) => `removePlacement="${v}"`}
          value={placement}
          onChange={setPlacement}
        />
        <ToggleGroup
          aria-label="Remove alignment"
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
      <Note>Since 0.17.</Note>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

interface Condition {
  id: number;
  field: string;
  value: string;
}

let nextCondition = 3;

function LineItemsRowProps022Demo() {
  const [rows, setRows] = useState<Condition[]>([
    { id: 1, field: "Payee", value: "Migros" },
    { id: 2, field: "Amount", value: "> 100" },
  ]);
  const { start } = useTour();
  const update = (index: number, patch: Partial<Condition>) =>
    setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const columns: LineItemsColumn<Condition>[] = [
    {
      key: "field",
      header: "Field",
      render: ({ item, index, label }) => (
        <Input aria-label={label} value={item.field} onChange={(e) => update(index, { field: e.target.value })} />
      ),
    },
    {
      key: "value",
      header: "Matches",
      render: ({ item, index, label }) => (
        <Input aria-label={label} value={item.value} onChange={(e) => update(index, { value: e.target.value })} />
      ),
    },
  ];
  return (
    <Example label="LineItems — attributes on each row" hint="`rowProps(item, index)`: a tour anchor, a test id">
      <div className="space-y-3">
        <LineItems
          items={rows}
          columns={columns}
          rowLabel={(i) => `Condition ${i + 1}`}
          onAdd={() => setRows((list) => [...list, { id: nextCondition++, field: "", value: "" }])}
          onRemove={(i) => setRows((list) => list.filter((_, j) => j !== i))}
          rowProps={(item, index) => ({
            "data-tour": index === 0 ? "showcase-rule-condition" : undefined,
            "data-testid": `condition-${item.id}`,
          })}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            start([
              {
                target: '[data-tour="showcase-rule-condition"]',
                title: "A condition",
                body: "The whole first row is the anchor — not one field inside it.",
              },
            ])
          }
        >
          Spotlight the first row
        </Button>
      </div>
      <Note>
        The row&apos;s {code("role")}, its {code("aria-label")} ({code("rowLabel")}) and {code("data-line-items-row")} stay
        the list&apos;s; a {code("className")} is added after the row&apos;s own, and an {code("onKeyDown")} runs before
        the row&apos;s Ctrl/⌘+Enter &ldquo;add a row&rdquo; ({code("preventDefault()")} keeps it from adding). A tour step can
        anchor on the row itself rather than on a span around one field.
      </Note>
      <Note>Since 0.22.</Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Every LineItems specimen, in the order the releases added them. */
export function LineItemsDemo() {
  return (
    <>
      <LineItemsTotals />
      <LineItems016Demo />
      <LineItemsJournal017Demo />
      <LineItemsSplit017Demo />
      <LineItemsRowProps022Demo />
    </>
  );
}
