import { useState } from "react";
import { IntegerField, MoneyField, formatMoney } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.14.2 on the Forms page: `MoneyField` (kastlan 52), a number-valued money input for
 * rows and cells outside a form, and `IntegerField` (kastlan 51), the plain whole-number
 * preset.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

interface BudgetRow {
  id: number;
  name: string;
  amount: number | null;
}

export function Forms0142Demo() {
  const [rows, setRows] = useState<BudgetRow[]>([
    { id: 1, name: "Heating", amount: 1200 },
    { id: 2, name: "Caretaker", amount: null },
  ]);
  const [commits, setCommits] = useState(0);
  const [year, setYear] = useState<number | null>(1987);
  const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  return (
    <>
      <Example label="MoneyField — a number per row" hint='type 1200+80 or 99.999; the row stores a number only when it settles'>
        <div className="space-y-2">
          {rows.map((row) => (
            // One column on a phone at Large: an 8rem name column left the field less than
            // its own width on a 360 px phone at Extra large (0.32.1).
            <div key={row.id} className="grid grid-cols-[8rem_1fr] items-center gap-3 large:max-sm:grid-cols-1 large:max-sm:gap-1">
              <span className="text-sm">{row.name}</span>
              <MoneyField
                ariaLabel={`${row.name} amount`}
                currency="CHF"
                min={0}
                value={row.amount}
                onCommit={(amount) => {
                  setCommits((n) => n + 1);
                  setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, amount } : r)));
                }}
              />
            </div>
          ))}
          <p className={READOUT}>
            total {formatMoney(total, "CHF")} · commits {commits}
          </p>
        </div>
        <Note>
          The same parse-and-settle glue as RhfMoneyField: a half-typed sum never reaches the row, and an
          unchanged amount is not committed twice.
        </Note>
      </Example>
      <Example label="IntegerField — whole numbers" hint="digits 0 and no calculator, each overridable">
        <div className="max-w-xs space-y-2">
          <IntegerField label="Construction year" value={year} nullable onCommit={setYear} />
          <p className={READOUT}>{String(year)}</p>
        </div>
      </Example>
    </>
  );
}
