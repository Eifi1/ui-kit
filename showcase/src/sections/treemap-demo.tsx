import { useState } from "react";
import { Treemap } from "@eifi1/ui-kit";
import type { TreemapNode } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * Treemap — the tile chart.
 *
 * Unlike the rest of the chart kit this one IS a whole chart, not a shell: the tile
 * layout, the label fitting and the ink choice are the same decisions every caller
 * would otherwise make again, and badly (the label ink especially). It still sits on
 * `ChartContainer` and the chart tooltip, so it themes with the others.
 *
 * No colour is written below either. Tiles take the page's live `--chart-N` tokens by
 * index; switch the palette or the theme and the map follows, label ink included.
 */

// Module scope: an Intl formatter is expensive to construct, and these are stateless.
const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const PERCENT = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

/** Amount and share of the map, the way a spending breakdown wants it read. */
function moneyAndShare(value: number, share: number | undefined): string {
  return share == null ? MONEY.format(value) : `${MONEY.format(value)} · ${PERCENT.format(share)}`;
}

const SPEND: TreemapNode[] = [
  { id: "housing", name: "Housing", value: 1240 },
  { id: "groceries", name: "Groceries", value: 412 },
  { id: "transport", name: "Transport", value: 188 },
  { id: "utilities", name: "Utilities", value: 144 },
  { id: "leisure", name: "Leisure & entertainment", value: 96 },
  { id: "health", name: "Health", value: 61 },
  { id: "gifts", name: "Gifts", value: 38 },
  { id: "fees", name: "Bank fees", value: 9 },
];

// The children of the first three groups above, for the drill-down specimen. Keyed by
// the parent id, so a click is one lookup.
const CHILDREN: Record<string, TreemapNode[]> = {
  housing: [
    { id: "rent", name: "Rent", value: 1050 },
    { id: "insurance", name: "Home insurance", value: 38 },
    { id: "council", name: "Council tax", value: 152 },
  ],
  groceries: [
    { id: "supermarket", name: "Supermarket", value: 318 },
    { id: "bakery", name: "Bakery", value: 41 },
    { id: "market", name: "Farmers' market", value: 53 },
  ],
  transport: [
    { id: "rail", name: "Rail pass", value: 124 },
    { id: "fuel", name: "Fuel", value: 64 },
  ],
};

// Year-on-year deltas for the note line. Absent means "nothing to add", and the tile
// then draws one line exactly as it would without the prop.
const DELTAS: Record<string, string> = {
  housing: "+3%",
  groceries: "+12%",
  transport: "−8%",
  leisure: "new",
};

// Payees are the user's own data, unlike category names — the redaction specimen.
const PAYEES: TreemapNode[] = [
  { id: "p1", name: "Riverside Lettings", value: 1050 },
  { id: "p2", name: "Greenway Foods", value: 318 },
  { id: "p3", name: "Northern Rail", value: 124 },
  { id: "p4", name: "City Council", value: 152 },
  { id: "p5", name: "Corner Bakery", value: 41 },
];

// Transaction counts rather than money — why the formatter is a prop.
const COUNTS: TreemapNode[] = [
  { id: "c1", name: "Groceries", value: 46 },
  { id: "c2", name: "Transport", value: 22 },
  { id: "c3", name: "Leisure", value: 14 },
  { id: "c4", name: "Health", value: 5 },
];

export function TreemapDemo() {
  const [group, setGroup] = useState<string | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const drilled = group ? CHILDREN[group] : undefined;
  // Every child in its parent's colour — the use `fill` exists for. Read off the same
  // token the parent's tile took, so the two maps agree without either knowing a hex.
  const parentIndex = SPEND.findIndex((n) => n.id === group);

  return (
    <>
      <Note>
        <strong>Needs <code className="font-mono">recharts</code></strong>, like everything behind{" "}
        <code className="font-mono">@eifi1/ui-kit/chart</code>, and an explicit{" "}
        <code className="font-mono">height</code> (default 320px). A node whose{" "}
        <code className="font-mono">value</code> is not positive is left off — an area cannot be
        negative — and saying so is the caller&apos;s job; when nothing is drawable the component
        renders nothing at all.
      </Note>

      <Example
        label="Treemap — values and share"
        hint="the formatter is handed each tile's share of what is drawn as a second argument"
      >
        <Treemap data={SPEND} valueFormatter={moneyAndShare} height={320} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Hover a tile for its amount and share. The two smallest tiles have no label: under ~44×20px
          there is no room for a word, and a one-letter stub bleeding over the edge reads worse than
          none. The name is still in the tooltip.
        </p>
      </Example>

      <Example
        label="Treemap — clickable tiles, drilling down"
        hint="onNodeClick makes each tile a focusable button: Tab to it, Enter or Space to open"
      >
        <Row className="mb-2 text-xs text-[var(--text-secondary)]">
          {group ? (
            <button
              type="button"
              onClick={() => setGroup(null)}
              className="rounded px-2 py-1 text-[var(--brand)] hover:bg-[var(--bg-hover)]"
            >
              ← All groups
            </button>
          ) : (
            <span>Housing, Groceries and Transport open their categories.</span>
          )}
        </Row>
        {drilled ? (
          <Treemap
            key={group}
            data={drilled.map((n) => ({ ...n, fill: `var(--chart-${(parentIndex % 9) + 1})` }))}
            valueFormatter={moneyAndShare}
            height={280}
            onNodeClick={(_, name) => setClicked(name)}
          />
        ) : (
          <Treemap
            data={SPEND}
            valueFormatter={moneyAndShare}
            height={280}
            onNodeClick={(id, name) => (CHILDREN[id] ? setGroup(id) : setClicked(name))}
          />
        )}
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
          last clicked: {clicked ?? "—"}
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The drilled map paints every child in its parent&apos;s colour with the node&apos;s own{" "}
          <code className="font-mono">fill</code>. That is a CSS var here, so the label takes{" "}
          <code className="font-mono">currentColor</code> ink — pass a concrete hex when the ink has
          to be measured against the tile.
        </p>
      </Example>

      <Example
        label="Treemap — a second line per tile"
        hint="nodeNote: one extra figure the name cannot carry; drawn only where it fits"
      >
        <Treemap
          data={SPEND}
          valueFormatter={moneyAndShare}
          height={320}
          nodeNote={(id) => DELTAS[id]}
        />
      </Example>

      <Example
        label="Treemap — names that are the user's own data"
        hint='redactNames: tile labels and the tooltip bubble carry data-private'
      >
        <Treemap data={PAYEES} valueFormatter={moneyAndShare} height={240} redactNames />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The kit only sets the attribute; the host&apos;s own{" "}
          <code className="font-mono">[data-private]</code> rule decides what it looks like — the same
          contract as <code className="font-mono">Tooltip redact</code>. A category is a label of the
          app and stays readable; a payee is the user&apos;s and does not.
        </p>
      </Example>

      <Example
        label="Treemap — a series that is not money"
        hint="counts, capped: maxTiles draws the first N drawable nodes in the order given"
      >
        <Treemap
          data={COUNTS}
          height={200}
          maxTiles={3}
          valueFormatter={(v) => `${v} transactions`}
        />
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {COUNTS.length - 3} more not shown — the caller&apos;s line, since only it knows how many it
          passed.
        </p>
      </Example>
    </>
  );
}
