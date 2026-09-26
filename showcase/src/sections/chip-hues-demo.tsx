import { useState } from "react";
import { Chip, FieldHint, Input, Select, ToggleGroup } from "@eifi1/ui-kit";
import type { ChipHue, ChipTone, ChipVariant } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * CHIPS & TOGGLES — the 0.10.0 additions: five categorical hues, the `xs` size, the
 * checkbox mode and the dot variant of Chip; the small ToggleGroup, and the group
 * standing in a form row as a field.
 */

const HUES: ChipHue[] = ["blue", "indigo", "purple", "teal", "orange"];
const HUE_VARIANTS: ChipVariant[] = ["soft", "outline", "solid", "dot"];
const QUOTE_STATES: Record<ChipHue, string> = {
  blue: "Sent",
  indigo: "Accepted",
  purple: "Invoiced",
  teal: "Scheduled",
  orange: "On hold",
};

function ChipHues() {
  return (
    <Example
      label="Chip — the five categorical hues × every variant"
      hint="colour that only says “a different value”: blue, indigo, purple, teal, orange — each a token triple with a dark value"
    >
      <div className="overflow-x-auto">
        <table className="text-xs text-[var(--text-secondary)]">
          <tbody>
            {HUE_VARIANTS.map((variant) => (
              <tr key={variant}>
                <td className="pe-3 py-1 font-mono">{variant}</td>
                {HUES.map((hue) => (
                  <td key={hue} className="px-1 py-1">
                    <Chip tone={hue} variant={variant} size="sm">
                      {QUOTE_STATES[hue]}
                    </Chip>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Note>
          Use a semantic tone when the value HAS a meaning (overdue is <code className="font-mono">danger</code>),
          a hue when it only needs telling apart — sent vs accepted vs invoiced. The hues are the{" "}
          <code className="font-mono">info</code> recipe on their own <code className="font-mono">--hue-*</code>{" "}
          tokens, so a hue chip and a status chip in one row carry the same weight. Flip the theme: each has a
          dark value of its own.
        </Note>
      </div>
    </Example>
  );
}

const CATEGORIES = ["Groceries", "Rent", "Transport", "Leisure", "Insurance"];

function ChipXsCheckboxDot() {
  const [included, setIncluded] = useState<string[]>(["Groceries", "Rent"]);
  const [statusOn, setStatusOn] = useState(true);
  const toggle = (c: string) => setIncluded((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <Example
      label="Chip — xs, checkbox mode and the dot variant"
      hint="xs fits inside a line of figures; checkbox reads as TICKED; dot is a status in a dense column"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-primary)]">
          Groceries € 412.80{" "}
          <Chip size="xs" tone="warning">
            92 %
          </Chip>{" "}
          of € 450.00{" "}
          <Chip size="xs" tone="teal" shape="square">
            goal
          </Chip>{" "}
          <Chip size="xs" tone="danger" variant="solid">
            3
          </Chip>
        </p>
        <div>
          <p className="mb-1 font-mono text-xs text-[var(--text-secondary)]">
            checkbox — which categories come along: {included.join(", ") || "none"}
          </p>
          <Row>
            {CATEGORIES.map((c) => (
              <Chip key={c} checkbox tone="brand" selected={included.includes(c)} onClick={() => toggle(c)}>
                {c}
              </Chip>
            ))}
          </Row>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-start text-xs text-[var(--text-muted)]">
                <th className="pe-6 text-start font-medium">Unit</th>
                <th className="text-start font-medium">Status (variant=&quot;dot&quot;)</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              {[
                ["1st floor, west", "success", "Rented"],
                ["1st floor, east", "warning", "Notice given"],
                ["2nd floor, west", "danger", "Vacant"],
                ["2nd floor, east", "purple", "Renovation"],
                ["Attic", "neutral", "Not let"],
              ].map(([unit, tone, text]) => (
                <tr key={unit}>
                  <td className="pe-6 py-0.5">{unit}</td>
                  <td className="py-0.5">
                    <Chip variant="dot" tone={tone as ChipTone} size="sm">
                      {text}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Row>
          <Chip variant="dot" tone="success" selected={statusOn} onClick={() => setStatusOn((v) => !v)}>
            Online only (a dot toggle)
          </Chip>
          <Chip variant="dot" tone="orange" size="xs">
            xs dot
          </Chip>
          <Chip variant="dot" tone="blue" size="lg">
            lg dot
          </Chip>
        </Row>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">xs</code> is 11px type at <code className="font-mono">px-1.5</code>: a
          badge that sits in a figure&apos;s line without making it taller. <code className="font-mono">checkbox</code>{" "}
          on a toggle chip (<code className="font-mono">onClick</code> + <code className="font-mono">selected</code>)
          draws a box that ticks and reports <code className="font-mono">role=&quot;checkbox&quot;</code> +{" "}
          <code className="font-mono">aria-checked</code> instead of <code className="font-mono">aria-pressed</code>;
          the box is drawn in both states, so ticking never shifts the label. <code className="font-mono">dot</code>{" "}
          drops the pill for a dot before plain text — an inert one has no inset, so it lines up with its column
          header; selected, the text turns primary and medium.
        </Note>
      </div>
    </Example>
  );
}

type Gear = "p" | "r" | "n" | "d";

function ToggleGroupSmallAndField() {
  const [range, setRange] = useState<"1d" | "7d" | "30d">("7d");
  const [gear, setGear] = useState<Gear>("d");
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [error, setError] = useState(false);
  return (
    <Example
      label="ToggleGroup — size sm, and label, hint and error in a form row"
      hint="with a label the group wears the field's chrome and levels itself with an Input and a Select"
    >
      <div className="space-y-4">
        <Row>
          <span className="text-xs text-[var(--text-muted)]">Range</span>
          <ToggleGroup<"1d" | "7d" | "30d">
            aria-label="Range"
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { value: "1d", label: "1 day" },
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
            ]}
          />
          <span className="font-mono text-xs text-[var(--text-secondary)]">size=&quot;sm&quot; · {range}</span>
        </Row>
        <div className="grid items-stretch gap-3 sm:grid-cols-3">
          <Input label="Speed (km/h)" defaultValue="80" inputMode="decimal" />
          <Select label="Axle" defaultValue="front" hint={<FieldHint label="The axle the sensor sits on." />}>
            <option value="front">Front</option>
            <option value="rear">Rear</option>
          </Select>
          <ToggleGroup<Gear>
            label="Gear"
            hint={<FieldHint label="The gear the sweep was recorded in." />}
            error={error ? "Pick the gear the test ran in." : undefined}
            value={gear}
            onChange={setGear}
            options={[
              { value: "p", label: "P" },
              { value: "r", label: "R" },
              { value: "n", label: "N" },
              { value: "d", label: "D" },
            ]}
          />
        </div>
        <div className="grid items-stretch gap-3 sm:grid-cols-3">
          <ToggleGroup<"auto" | "manual">
            label="Shift mode"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "auto", label: "Automatic" },
              { value: "manual", label: "Manual" },
            ]}
          />
          <Input label="Notes" placeholder="Optional" />
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={error} onChange={(e) => setError(e.target.checked)} />
          show the Gear field&apos;s <code className="font-mono">error</code>
        </label>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">size=&quot;sm&quot;</code> is 12px options at <code className="font-mono">px-2 py-1</code>,
          for a group beside a small caption. With a <code className="font-mono">label</code> the group stands in a
          form row AS a field: the border, the surface and the small static label strip of a labelled{" "}
          <code className="font-mono">Select</code>, stretched to its row so it levels with the select whatever the
          browser makes of that. The label names the group (<code className="font-mono">aria-labelledby</code>);{" "}
          <code className="font-mono">hint</code> is the ? on the label line; <code className="font-mono">error</code>{" "}
          paints the frame, marks the group <code className="font-mono">aria-invalid</code> and describes it with the
          message.
        </Note>
      </div>
    </Example>
  );
}

export function ChipHuesToggleField() {
  return (
    <>
      <ChipHues />
      <ChipXsCheckboxDot />
      <ToggleGroupSmallAndField />
    </>
  );
}
