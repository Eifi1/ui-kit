import { useState } from "react";
import { ProgressBar } from "@eifi1/ui-kit";
import type { ProgressBarSegment } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * ProgressBar `segments` + `legend` (0.11): a meter of parts — one bar, several fills
 * side by side, named in `aria-valuetext` and listed in a legend.
 */

const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** keksdose's discretionary-spending bar: the steps of ONE hue, from classes. */
const STEP_CLASS = [
  "bg-[color-mix(in_oklab,var(--brand)_100%,var(--bg-surface))]",
  "bg-[color-mix(in_oklab,var(--brand)_70%,var(--bg-surface))]",
  "bg-[color-mix(in_oklab,var(--brand)_45%,var(--bg-surface))]",
];

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
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
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
          <code className="font-mono">segments</code> forces <code className="font-mono">variant=&quot;meter&quot;</code>{" "}
          and draws the parts side by side with a 2px gap. Each part is coloured by its{" "}
          <code className="font-mono">className</code> (the one-hue step ramp), else its{" "}
          <code className="font-mono">color</code> (any CSS colour — &ldquo;Photos&rdquo;), else its{" "}
          <code className="font-mono">tone</code>, else the next <code className="font-mono">--chart-N</code> colour
          (&ldquo;Documents&rdquo; onward, and every part of the last bar). <code className="font-mono">aria-valuenow</code>{" "}
          is the sum and <code className="font-mono">aria-valuetext</code> names every part — &ldquo;Rent: 40%, Food:
          25%, Savings: 15%&rdquo; — through <code className="font-mono">formatValue</code> when given (euros, on the
          second). <code className="font-mono">legend</code> lists the parts under the bar with a swatch and the value;
          push Food past 45% and the sum passes 100%: it is clamped to <code className="font-mono">max</code> and the
          last part is cut off at the track&apos;s end.
        </Note>
      </div>
    </Example>
  );
}
