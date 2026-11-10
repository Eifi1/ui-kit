import { useState } from "react";
import { ProgressBar } from "@eifi1/ui-kit";
import type { ProgressBarSegment } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";
import { numberFormat } from "../lib/number-format";

/**
 * ProgressBar `segments` + `legend` (0.11): a meter of parts — one bar, several fills
 * side by side, named in `aria-valuetext` and listed in a legend. And `markers` (0.58):
 * ticks at a recommendation, a target, a limit, in the bar's description.
 */

const eur = numberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** A discretionary-spending bar: the steps of ONE hue, from classes. */
const STEP_CLASS = [
  "bg-[color-mix(in_oklab,var(--brand)_100%,var(--bg-surface))]",
  "bg-[color-mix(in_oklab,var(--brand)_70%,var(--bg-surface))]",
  "bg-[color-mix(in_oklab,var(--brand)_45%,var(--bg-surface))]",
];

/** A food-pyramid-style group: its share of the shopping, against the share the
 *  recommendations give it. */
interface FoodGroup {
  name: string;
  share: number;
  recommended: number;
}

const FOOD_GROUPS: FoodGroup[] = [
  { name: "Vegetables & fruit", share: 0.31, recommended: 0.35 },
  { name: "Grains & potatoes", share: 0.27, recommended: 0.25 },
  { name: "Dairy, meat, fish & eggs", share: 0.29, recommended: 0.2 },
  { name: "Sweets & snacks", share: 0.09, recommended: 0.05 },
];

const pct = numberFormat("en-GB", { style: "percent", maximumFractionDigits: 0 });

/** ProgressBar `markers`: a recommendation tick on a meter that runs to twice it, so the
 *  tick is always the middle — a fill short of it is under, one past it over. */
export function ProgressMarkersDemo() {
  return (
    <Example label="ProgressBar — markers" hint="a tick at a recommendation, a target, a limit — said, not only drawn">
      <div className="grid gap-2 sm:grid-cols-2">
        {FOOD_GROUPS.map((g) => (
          <div key={g.name} className="rounded-md bg-surface-2 px-2.5 py-2">
            <p className="text-xs text-secondary">{g.name}</p>
            <p className="text-base font-semibold tabular-nums">{pct.format(g.share)}</p>
            <ProgressBar
              variant="meter"
              size="slim"
              value={g.share}
              max={g.recommended * 2}
              aria-label={g.name}
              formatValue={() => `${pct.format(g.share)} of the shopping`}
              markers={[{ value: g.recommended, label: "Recommended", valueText: pct.format(g.recommended) }]}
            />
            <p className="text-xs text-muted">Recommended {pct.format(g.recommended)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-4">
        <ProgressBar
          label="Monthly budget"
          showValue
          value={72}
          tone="warning"
          hint="CHF 1'440 of CHF 2'000 spent"
          markers={[
            { value: 60, label: "Plan for today" },
            { value: 90, label: "Alert", tone: "danger" },
          ]}
        />
        <ProgressBar
          label="Spending, by part, against the budget"
          max={1}
          segments={[
            { label: "Rent", value: 0.45, tone: "expense" },
            { label: "Food", value: 0.2, tone: "warning" },
          ]}
          markers={[{ value: 0.8, label: "Budget" }]}
        />
      </div>
      <div className="mt-3">
        <Note>
          Each marker is a 2px tick standing 4px out of the track, in the body text colour or its own `tone`, at its
          value clamped into the scale. A reader hears the markers in the bar&apos;s description — &ldquo;Recommended:
          35%&rdquo; — each label with its value through `formatValue`, or its own `valueText` where the scale is not
          the figure&apos;s own: these meters run to twice the recommendation, so the tick at their middle says the
          recommended share, not 50%. The bar keeps room for the ticks where nothing next to it gives it, so they never
          paint over a neighbour.
        </Note>
      </div>
    </Example>
  );
}

export function ProgressSegmentsDemo() {
  const [food, setFood] = useState(25);
  const [showValue, setShowValue] = useState(true);
  const budget: ProgressBarSegment[] = [
    { label: "Rent", value: 40, tone: "expense" },
    { label: "Food", value: food, tone: "warning" },
    { label: "Savings", value: 15, tone: "income" },
  ];
  return (
    <Example
      label="ProgressBar — segments, legend and showValue"
      hint="a meter of parts: tones, colours, a class ramp, labels"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <ProgressBar label="This month's budget" segments={budget} legend showValue={showValue} />
          <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
            <label className="flex items-center gap-2">
              Food
              <input
                type="range"
                min={0}
                max={60}
                value={food}
                onChange={(e) => setFood(Number(e.target.value))}
                aria-label="Food share"
              />
              <span className="font-mono text-xs">{food}%</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showValue} onChange={(e) => setShowValue(e.target.checked)} />
              <code className="font-mono">showValue</code>
            </label>
          </div>
        </div>
        <ProgressBar
          label="Discretionary spending, by step (className ramp)"
          min={0}
          max={600}
          formatValue={(v) => eur.format(v)}
          size="lg"
          legend
          segments={[
            { label: "Essential", value: 240, className: STEP_CLASS[0] },
            { label: "Nice to have", value: 150, className: STEP_CLASS[1] },
            { label: "Treats", value: 90, className: STEP_CLASS[2] },
          ]}
        />
        <ProgressBar
          label="Storage (colours and the chart ramp)"
          size="md"
          legend
          showValue
          segments={[
            { label: "Photos", value: 30, color: "var(--hue-indigo)" },
            { label: "Documents", value: 12 },
            { label: "Mail", value: 8 },
            { label: "Other", value: 5 },
          ]}
        />
        <ProgressBar
          label="Unlabelled parts, no legend"
          size="slim"
          segments={[{ value: 20 }, { value: 30 }, { value: 10 }]}
        />
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">segments</code> forces{" "}
          <code className="font-mono">variant=&quot;meter&quot;</code> and draws the parts side by side with a 2px gap.
          Each part is coloured by its <code className="font-mono">className</code> (the one-hue step ramp), else its{" "}
          <code className="font-mono">color</code> (any CSS colour — &ldquo;Photos&rdquo;), else its{" "}
          <code className="font-mono">tone</code>, else the next <code className="font-mono">--chart-N</code> colour
          (&ldquo;Documents&rdquo; onward, and every part of the last bar).{" "}
          <code className="font-mono">aria-valuenow</code> is the sum and{" "}
          <code className="font-mono">aria-valuetext</code> names every part — &ldquo;Rent: 40%, Food: 25%, Savings:
          15%&rdquo; — through <code className="font-mono">formatValue</code> when given (euros, on the second).{" "}
          <code className="font-mono">legend</code> lists the parts under the bar with a swatch and the value; push Food
          past 45% and the sum passes 100%: it is clamped to <code className="font-mono">max</code> and the last part is
          cut off at the track&apos;s end.
        </Note>
      </div>
    </Example>
  );
}
