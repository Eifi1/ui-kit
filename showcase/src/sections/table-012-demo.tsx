import { useState } from "react";
import {
  Checkbox,
  DescriptionItem,
  DescriptionList,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.12 on the Description list & table page: Table `framed`, the statement row
 * variants (`group`, `subtotal`, `total`), `rowDividers` and a row's own `bordered`,
 * TableHead `bordered`; and DescriptionItem `placeholder`.
 *
 * Figures are formatted once with en-GB, so the specimens do not move with the language.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const chf = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "CHF" }).format(n);

type Line = { label: string; amount: number };
const GROUPS: Array<{ name: string; lines: Line[] }> = [
  {
    name: "Current assets",
    lines: [
      { label: "Cash at bank", amount: 48_200 },
      { label: "Rent receivable", amount: 6_350 },
    ],
  },
  {
    name: "Fixed assets",
    lines: [
      { label: "Building, Bahnhofstrasse 4", amount: 1_240_000 },
      { label: "Heating plant", amount: 38_000 },
    ],
  },
];
const sum = (lines: Line[]) => lines.reduce((s, l) => s + l.amount, 0);

export function TableVariantsDemo() {
  const [framed, setFramed] = useState(true);
  const [dividers, setDividers] = useState(true);
  const [headRule, setHeadRule] = useState(true);
  const grand = GROUPS.reduce((s, g) => s + sum(g.lines), 0);
  return (
    <Example
      label="Table — framed, group, subtotal and total rows, dividers"
      hint="a balance sheet in the four kinds of line a statement is made of"
    >
      <Row className="mb-3">
        <Checkbox label="framed" checked={framed} onCheckedChange={setFramed} />
        <Checkbox label="rowDividers" checked={dividers} onCheckedChange={setDividers} />
        <Checkbox label="TableHead bordered" checked={headRule} onCheckedChange={setHeadRule} />
      </Row>
      <Table framed={framed} rowDividers={dividers} hover zebra>
        <TableCaption>Balance sheet, 31 December (assets)</TableCaption>
        <TableHead bordered={headRule}>
          <TableRow>
            <TableHeaderCell>Account</TableHeaderCell>
            <TableHeaderCell numeric>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {GROUPS.map((g) => (
            <GroupRows key={g.name} name={g.name} lines={g.lines} />
          ))}
          <TableRow variant="total">
            <TableHeaderCell scope="row">Total assets</TableHeaderCell>
            <TableCell numeric>{chf(grand)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className="mt-3">
        <Note>
          {code('variant="group"')} is the tinted heading row, {code('"subtotal"')} the medium-weight sum
          under a group, {code('"total"')} the heavy rule over the last line. Zebra and hover (both on here)
          tint ordinary rows only. {code("rowDividers={false}")} drops the rule between body rows — and a
          single row can take it back with {code("bordered")}: each subtotal keeps its rule whatever the
          table says. {code("framed")} draws the rounded border on the scroll wrapper, so the tints clip to
          its corners; {code("TableHead bordered={false}")} loses the rule under the head.
        </Note>
      </div>
    </Example>
  );
}

function GroupRows({ name, lines }: { name: string; lines: Line[] }) {
  return (
    <>
      <TableRow variant="group">
        <TableCell colSpan={2}>{name}</TableCell>
      </TableRow>
      {lines.map((l) => (
        <TableRow key={l.label}>
          <TableCell className="ps-6">{l.label}</TableCell>
          <TableCell numeric>{chf(l.amount)}</TableCell>
        </TableRow>
      ))}
      <TableRow variant="subtotal" bordered>
        <TableCell>Subtotal {name.toLowerCase()}</TableCell>
        <TableCell numeric>{chf(sum(lines))}</TableCell>
      </TableRow>
    </>
  );
}

export function DescriptionPlaceholderDemo() {
  return (
    <Example
      label="DescriptionItem — placeholder for a missing value"
      hint="null, undefined, false and an empty string show the placeholder; 0 is a value"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Default (the provider&apos;s “—”)</p>
          <DescriptionList>
            <DescriptionItem term="Tenant">Ada Lovelace</DescriptionItem>
            <DescriptionItem term="Phone">{null}</DescriptionItem>
            <DescriptionItem term="Email">{""}</DescriptionItem>
            <DescriptionItem term="Open balance" numeric>
              {0}
            </DescriptionItem>
          </DescriptionList>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
            List placeholder “Not set”, one item overriding, one showing nothing
          </p>
          <DescriptionList placeholder="Not set">
            <DescriptionItem term="Move-in">1 March 2026</DescriptionItem>
            <DescriptionItem term="Move-out">{undefined}</DescriptionItem>
            <DescriptionItem term="Deposit" placeholder="Waived">
              {false}
            </DescriptionItem>
            <DescriptionItem term="Notes" placeholder={null}>
              {null}
            </DescriptionItem>
          </DescriptionList>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The placeholder is drawn in the muted ink, so an absent value does not read as a value of “—”.
          Precedence: the item&apos;s {code("placeholder")}, else the list&apos;s, else{" "}
          {code("descriptionList.empty")} from the provider — switch the language to see it translated —
          else “—”. {code("placeholder={null}")} shows nothing, as before 0.12.
        </Note>
      </div>
    </Example>
  );
}
