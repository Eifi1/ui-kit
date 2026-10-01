import {
  Delta,
  ProgressBar,
  SignedAmount,
  StaticLegend,
  StatusDot,
  SwatchPicker,
  statusDotColor,
} from "@eifi1/ui-kit";
import type { StatusDotTone } from "@eifi1/ui-kit";
import { useState } from "react";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.16 on the Formatting page: the money palette for a verdict and a "no change" band
 * (`palette`, `flatWithin`), a part's signed value in a ProgressBar legend, the
 * StatusDot colour table as a function, and StaticLegend without the list framing —
 * keksdose's harmonisation sweep (P1, P9).
 */

const PRICES = [
  { item: "Butter 250 g", change: 0.3 },
  { item: "Milk 1 l", change: -0.15 },
  { item: "Bread", change: 0.001 },
];

const HUES: StatusDotTone[] = ["blue", "teal", "purple", "orange", "indigo"];

export function Signals016Demo() {
  const [hue, setHue] = useState<StatusDotTone | null>("teal");
  return (
    <>
      <Example
        label="A price change in the money colours"
        hint={"`palette=\"money\"` with `goodDirection=\"down\"`: a rise is an expense, a fall is income. `flatWithin={0.005}` makes a sub-cent move a no-change."}
      >
        <div className="space-y-2 text-sm">
          {PRICES.map((p) => (
            <div key={p.item} className="flex items-center justify-between gap-4">
              <span className="min-w-0 truncate text-[var(--text-secondary)]">{p.item}</span>
              <Row className="shrink-0 gap-4">
                <SignedAmount
                  value={p.change}
                  currency="EUR"
                  goodDirection="down"
                  palette="money"
                  flatWithin={0.005}
                  arrow
                />
                <Delta value={p.change / 2.5} unit="percent" digits={1} goodDirection="down" palette="money" flatWithin={0.0005} />
              </Row>
            </div>
          ))}
        </div>
        <Note>Without `palette` the same verdict is `success` / `danger`, as before.</Note>
      </Example>

      <Example
        label="A negative part in a ProgressBar legend"
        hint="The legend and the reader state a part's own value, sign and all. The bar draws nothing for it."
      >
        <ProgressBar
          label="Spending this month"
          segments={[
            { value: 0.45, label: "Groceries", tone: "expense" },
            { value: 0.2, label: "Eating out" },
            { value: -0.05, label: "Refund", tone: "income" },
          ]}
          max={1}
          legend
        />
      </Example>

      <Example
        label="A swatch that matches a status dot"
        hint="`statusDotColor(tone)` is the CSS colour a StatusDot of that tone paints with, for an option the kit does not draw."
      >
        <div className="space-y-3">
          <SwatchPicker
            aria-label="Category colour"
            options={HUES.map((tone) => ({ value: tone, label: tone, color: statusDotColor(tone) }))}
            value={hue}
            onChange={setHue}
          />
          {hue && <StatusDot tone={hue} size="md" label={`Category in ${hue}`} />}
        </div>
      </Example>

      <Example
        label="A legend that is not a list"
        hint={"`as=\"div\"`: a named group of entries, for a key inside a list or a table row."}
      >
        <StaticLegend
          as="div"
          aria-label="Key"
          entries={[
            { key: "in", label: "Income", color: statusDotColor("income") },
            { key: "out", label: "Expense", color: statusDotColor("expense") },
          ]}
        />
      </Example>
    </>
  );
}
