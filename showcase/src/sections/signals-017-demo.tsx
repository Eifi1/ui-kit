import { useState } from "react";
import { Delta, FormActions, Input, ProgressBar, SignedAmount, Switch } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.17 additions from keksdose's adoption of 0.16 (Q4, Q6, Q7): a percent change in
 * POINTS (`ratio={false}`), a ProgressBar whose printed figures are tagged for the
 * demo-mode blur (`sensitive`), and a FormActions row that is sticky on a phone only
 * and bleeds over its pane's padding (`placement` per breakpoint, `bleed`).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── Formatting page ──────────────────────────────────────────────────────── */

// As a backend sends them: percent points, not ratios.
const PRICE_CHANGES = [
  { item: "Butter 250 g", pct: 12.5 },
  { item: "Milk 1 l", pct: -4.2 },
  { item: "Bread", pct: 0.3 },
];

export function Signals017Demo() {
  const [blur, setBlur] = useState(true);
  return (
    <>
      <Example
        label="A percent change in points"
        hint={'`unit="percent" ratio={false}`: `12.5` is 12.5 %, and `flatWithin={0.5}` is half a point.'}
      >
        <div className="space-y-2 text-sm">
          {PRICE_CHANGES.map((p) => (
            <div key={p.item} className="flex items-center justify-between gap-4">
              <span className="min-w-0 truncate text-[var(--text-secondary)]">{p.item}</span>
              <Row className="shrink-0 gap-4">
                <SignedAmount value={p.pct} unit="percent" ratio={false} flatWithin={0.5} goodDirection="down" />
                <Delta
                  value={p.pct}
                  unit="percent"
                  ratio={false}
                  digits={1}
                  flatWithin={0.5}
                  goodDirection="down"
                  palette="money"
                />
              </Row>
            </div>
          ))}
        </div>
        <Note>
          The default stays a ratio ({code("0.125")} is 12.5 %). With {code("ratio={false}")} the value and{" "}
          {code("flatWithin")} are both in points, so no site divides by 100 — Bread&apos;s 0.3 points is inside the
          half-point band and reads as no change.
        </Note>
      </Example>

      <Example
        label="ProgressBar figures under a demo-mode blur"
        hint="`sensitive` tags the value, each legend figure and the overage line `data-private`"
      >
        <div className="space-y-4">
          <Switch label="Demo mode (blur private values)" checked={blur} onCheckedChange={setBlur} />
          <div className={blur ? "demo-mode" : undefined}>
            <ProgressBar
              sensitive
              label="Spending this month"
              showValue
              legend
              max={2000}
              formatValue={(v) => `CHF ${v.toLocaleString("en-US")}`}
              segments={[
                { value: 820, label: "Groceries", tone: "expense" },
                { value: 310, label: "Eating out" },
                { value: 140, label: "Household" },
              ]}
            />
          </div>
        </div>
        <Note>
          The track, the swatches and the part names stay readable; the figures blur. Before this an app passed{" "}
          {code("legendValue")} only to wrap each figure in a tagged span.
        </Note>
      </Example>
    </>
  );
}

/* ── Forms page ───────────────────────────────────────────────────────────── */

export function FormActions017Demo() {
  return (
    <Example
      label="FormActions — sticky on a phone, inline from md up, bled to the pane's edges"
      hint={'`placement={{ base: "sticky", md: "inline" }}` · `bleed="0.75rem"`'}
    >
      <div className="h-64 max-w-xl overflow-y-auto rounded-md border border-[var(--border)] px-3">
        <div className="space-y-3 py-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Input key={i} label={`Field ${i + 1}`} value="" onChange={() => {}} />
          ))}
        </div>
        <FormActions
          placement={{ base: "sticky", md: "inline" }}
          stickyWithin="container"
          bleed="0.75rem"
          className="pb-3"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      </div>
      <Note>
        Narrower than 768px the row sticks to the pane&apos;s bottom and its rule and surface run under the pane&apos;s{" "}
        {code("px-3")} to both edges, the buttons still on the fields&apos; line. From md up it is the inline row under
        the last field, and {code("bleed")} does nothing. The breakpoints are BulkActionBar&apos;s.
      </Note>
    </Example>
  );
}
