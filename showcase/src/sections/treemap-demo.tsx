import { useState } from "react";
import { Treemap as RechartsTreemap } from "recharts";
import { CHART_ROLES, ChartContainer, Treemap, TreemapCell, fitLabel, paletteFor } from "@eifi1/ui-kit";
import type { TreemapNode } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";
import { numberFormat } from "../lib/number-format";

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
const MONEY = numberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const PERCENT = numberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

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

// Nodes the map has to leave off: a zero, a negative (a refund larger than the spend)
// and a NaN from a failed parse. Only the positive ones are drawn.
const MIXED: TreemapNode[] = [
  { id: "m1", name: "Rent", value: 1050 },
  { id: "m2", name: "Groceries", value: 412 },
  { id: "m3", name: "Refunds", value: -40 },
  { id: "m4", name: "Transport", value: 188 },
  { id: "m5", name: "Gifts", value: 0 },
  { id: "m6", name: "Unparsed", value: Number.NaN },
];
// Arabic category names, long enough that the narrower tiles clip them — so the
// ellipsis shows which end the label is read from.
const SPEND_AR: TreemapNode[] = [
  { id: "a1", name: "السكن والإيجار", value: 1450 },
  { id: "a2", name: "البقالة والمواد الغذائية", value: 620 },
  { id: "a3", name: "المواصلات", value: 410 },
  { id: "a4", name: "الترفيه والمطاعم", value: 280 },
  { id: "a5", name: "الاشتراكات الشهرية", value: 160 },
];
const AR_MONEY = numberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 });
// The hand-built map below: recharts' own Treemap with the kit's cell as `content`.
const HAND_BUILT = SPEND_AR.map((n, i) => ({ name: n.name, size: n.value, fill: paletteFor(i) }));

const DROPPED = MIXED.filter((n) => !(Number.isFinite(n.value) && n.value > 0));

// Shops by chain — keksdose's "purchases without a receipt" (dev #642: "Is there already
// a distinction between shop and chain?"). A chain is a group, its shops its tiles. A
// group's own `value` is not read; pass its tiles' sum, as `chain` does.
const sumOf = (nodes: readonly TreemapNode[]) => nodes.reduce((acc, n) => acc + n.value, 0);
function chain(id: string, name: string, shops: TreemapNode[], fill?: string): TreemapNode {
  return { id, name, value: sumOf(shops), fill, children: shops };
}
const SHOPS_BY_CHAIN: TreemapNode[] = [
  chain("greenway", "Greenway", [
    { id: "gw-centre", name: "Greenway Centre", value: 412 },
    { id: "gw-station", name: "Greenway Station", value: 188 },
    { id: "gw-north", name: "Greenway North", value: 64 },
  ]),
  chain("corner", "Corner Market", [
    { id: "cm-high", name: "High Street", value: 236 },
    { id: "cm-park", name: "Parkside", value: 97 },
  ]),
  chain("riverside", "Riverside", [
    { id: "rs-quay", name: "The Quay", value: 154 },
    { id: "rs-mill", name: "Mill Lane", value: 58 },
    { id: "rs-bridge", name: "Bridge Road", value: 31 },
  ]),
  // A shop of no chain is a tile at the top, beside the chains.
  { id: "bakery", name: "Village Bakery", value: 72 },
  // The rest bucket in the muted role, not a ninth hue a reader would match to a chain.
  chain(
    "other",
    "Other shops",
    [
      { id: "o-farm", name: "Farm shop", value: 41 },
      { id: "o-kiosk", name: "Kiosk", value: 22 },
    ],
    CHART_ROLES.other,
  ),
];
// Names by id, for the clicked path: a callback is handed ids.
const SHOP_NAMES = new Map<string, string>();
(function collect(nodes: readonly TreemapNode[]) {
  for (const n of nodes) {
    SHOP_NAMES.set(n.id, n.name);
    if (n.children) collect(n.children);
  }
})(SHOPS_BY_CHAIN);
// When each shop was last seen, in keksdose's three steps: this month, this quarter, older.
const STEPS = { recent: 1, quarter: 0.78, older: 0.55 } as const;
const SEEN: Record<string, { step: keyof typeof STEPS; note: string }> = {
  "gw-centre": { step: "recent", note: "this week" },
  "gw-station": { step: "quarter", note: "2 months ago" },
  "gw-north": { step: "older", note: "last year" },
  "cm-high": { step: "recent", note: "yesterday" },
  "cm-park": { step: "older", note: "8 months ago" },
  "rs-quay": { step: "quarter", note: "6 weeks ago" },
  "rs-mill": { step: "recent", note: "this week" },
  "rs-bridge": { step: "older", note: "last year" },
  bakery: { step: "recent", note: "today" },
  "o-farm": { step: "quarter", note: "3 months ago" },
  "o-kiosk": { step: "older", note: "last year" },
};
const withRecency = (nodes: readonly TreemapNode[]): TreemapNode[] =>
  nodes.map((n) =>
    n.children ? { ...n, children: withRecency(n.children) } : { ...n, shade: STEPS[SEEN[n.id]?.step ?? "recent"] },
  );
const SHOPS_BY_RECENCY = withRecency(SHOPS_BY_CHAIN);
const recencyNote = (id: string) => SEEN[id]?.note;

export function TreemapDemo() {
  const [allZero, setAllZero] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const drilled = group ? CHILDREN[group] : undefined;
  // Every child in its parent's colour — the use `fill` exists for. Read off the same
  // token the parent's tile took, so the two maps agree without either knowing a hex.
  const parentIndex = SPEND.findIndex((n) => n.id === group);

  return (
    <>
      <Note>
        <strong>
          Needs <code className="font-mono">recharts</code>
        </strong>
        , like everything behind <code className="font-mono">@eifi1/ui-kit/chart</code>, and an explicit{" "}
        <code className="font-mono">height</code> (default 320px). A node whose <code className="font-mono">value</code>{" "}
        is not positive is left off — an area cannot be negative — and saying so is the caller&apos;s job; when nothing
        is drawable the component renders nothing at all.
      </Note>

      <Example
        label="Treemap — values and share"
        hint="the formatter is handed each tile's share of what is drawn as a second argument"
      >
        <Treemap
          data={SPEND}
          valueFormatter={moneyAndShare}
          height={320}
          aria-label="Spending by group, last month"
          description="Housing is more than half of the month; groceries a fifth."
        />
        <p className="mt-2 text-xs text-secondary">
          Hover a tile for its amount and share. The two smallest tiles have no label: under ~44×20px there is no room
          for a word, and a one-letter stub bleeding over the edge reads worse than none. The name is still in the
          tooltip.
        </p>
        <p className="mt-2 text-xs text-secondary">
          Or Tab to the map: it is ONE tab stop, a <code className="font-mono">figure</code> named by{" "}
          <code className="font-mono">aria-label</code> and described by <code className="font-mono">description</code>,
          and the arrow keys, Home and End walk the tiles in the order given. Each tile is named &ldquo;Housing: £1,240
          (57%)&rdquo; (<code className="font-mono">treemap.tile</code>) — the formatter is asked once more without the
          share, since the name says it. Nobody clicks these tiles, so each is an image to read.
        </p>
      </Example>

      <Example
        label="Treemap — clickable tiles, drilling down"
        hint="onNodeClick makes each tile a button: Tab to the map, the arrows between tiles, Enter or Space to open"
      >
        <Row className="mb-2 text-xs text-secondary">
          {group ? (
            <button
              type="button"
              onClick={() => setGroup(null)}
              className="rounded px-2 py-1 text-brand hover:bg-hover"
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
        <p className="mt-2 font-mono text-xs text-muted">last clicked: {clicked ?? "—"}</p>
        <p className="mt-2 text-xs text-secondary">
          The drilled map paints every child in its parent&apos;s colour with the node&apos;s own{" "}
          <code className="font-mono">fill</code>, a bare <code className="font-mono">var(--chart-N)</code> here: the
          kit reads that token off the page and measures the label ink against it, as it does a hex. To see both levels
          at once instead of one after the other, give the groups <code className="font-mono">children</code> — next.
        </p>
      </Example>

      <Example
        label="Treemap — groups: shops by chain"
        hint="children makes a node a group: a labelled frame, its tiles inside in its colour; Tab to the map, then the arrows walk each frame and its tiles"
      >
        <GroupedTreemap />
      </Example>

      <Example
        label="Treemap — a second line per tile"
        hint="nodeNote: one extra figure the name cannot carry; drawn only where it fits"
      >
        <Treemap data={SPEND} valueFormatter={moneyAndShare} height={320} nodeNote={(id) => DELTAS[id]} />
      </Example>

      <Example
        label="Treemap — names that are the user's own data"
        hint="redactNames: tile labels and the tooltip bubble carry data-private"
      >
        <Treemap data={PAYEES} valueFormatter={moneyAndShare} height={240} redactNames />
        <p className="mt-2 text-xs text-secondary">
          The kit only sets the attribute; the host&apos;s own <code className="font-mono">[data-private]</code> rule
          decides what it looks like — the same contract as <code className="font-mono">Tooltip redact</code>. A
          category is a label of the app and stays readable; a payee is the user&apos;s and does not.
        </p>
      </Example>

      <Example
        label="Treemap — a series that is not money"
        hint="counts, capped: maxTiles draws the first N drawable nodes in the order given; the cap matters most on a phone, where small tiles lose their labels first"
      >
        <Treemap data={COUNTS} height={200} maxTiles={3} valueFormatter={(v) => `${v} transactions`} />
        <p className="mt-2 text-xs text-muted">
          {COUNTS.length - 3} more not shown — the caller&apos;s line, since only it knows how many it passed.
        </p>
      </Example>

      <Example
        label="Treemap — default format, dropped nodes, nothing drawable"
        hint="no valueFormatter: the bare number in the provider's locale; zero, negative and NaN nodes are left off"
      >
        <Row className="mb-2 text-xs">
          <button
            type="button"
            aria-pressed={allZero}
            onClick={() => setAllZero((z) => !z)}
            className="rounded border border-subtle px-2 py-1 text-secondary hover:bg-hover"
          >
            {allZero ? "Restore the values" : "Set every value to 0"}
          </button>
        </Row>
        <Treemap data={allZero ? MIXED.map((n) => ({ ...n, value: 0 })) : MIXED} height={220} />
        <p className="mt-2 font-mono text-xs text-muted">
          {allZero
            ? "Treemap rendered nothing: this sentence is the caller's."
            : `not drawn: ${DROPPED.map((n) => `${n.name} (${String(n.value).replace("-", "\u2212")})`).join(", ")}`}
        </p>
        <div className="mt-3">
          <OutTable
            rows={[
              ['fitLabel("Groceries", 120, 12)', String(fitLabel("Groceries", 120, 12))],
              ['fitLabel("Leisure & entertainment", 90, 12)', String(fitLabel("Leisure & entertainment", 90, 12))],
              ['fitLabel("Gifts", 30, 12)', `${String(fitLabel("Gifts", 30, 12))}  // no room: no label`],
            ]}
          />
        </div>
        <div className="mt-3">
          <Note>
            <code className="font-mono">fitLabel</code> and <code className="font-mono">TreemapCell</code> are exported
            so a caller drawing its own recharts <code className="font-mono">&lt;Treemap&gt;</code> gets the same label
            rules. The colours are still by index into <code className="font-mono">data</code> as given, dropped nodes
            included — so Transport keeps the colour it would have with Refunds present.
          </Note>
        </div>
      </Example>

      <Example label="Treemap — labelColor" hint="the ink for a fill the kit cannot measure: a var() or a color-mix()">
        <LabelColorTreemaps />
      </Example>

      <Example
        label="Treemap — right-to-left"
        hint="left: Treemap under dir=rtl reads the direction itself; right: a hand-built recharts Treemap with <TreemapCell dir> — toggle it"
      >
        <RtlTreemaps />
      </Example>
    </>
  );
}

/** A recency plot: one hue, faded by age with `color-mix` — a fill with no
 *  hex to measure, so without `labelColor` the ink is `currentColor`. */
function LabelColorTreemaps() {
  const [withInk, setWithInk] = useState(true);
  const mixes = [100, 85, 70, 55, 40, 30, 20, 12];
  const data: TreemapNode[] = SPEND.map((n, i) => ({
    ...n,
    fill: `color-mix(in srgb, var(--chart-1) ${mixes[i]}%, transparent)`,
    // Strong fills get the inverse ink, the faded ones the page's own text.
    labelColor: withInk ? (mixes[i] >= 55 ? "#ffffff" : "var(--text-primary)") : undefined,
  }));
  return (
    <>
      <Row className="mb-2">
        <label className="flex items-center gap-2 text-xs text-secondary">
          <input type="checkbox" checked={withInk} onChange={(e) => setWithInk(e.target.checked)} />
          <span>
            <code className="font-mono">labelColor</code> per node
          </span>
        </label>
      </Row>
      <Treemap data={data} valueFormatter={moneyAndShare} height={260} />
      <p className="mt-2 text-xs text-secondary">
        Every tile is <code className="font-mono">color-mix(in srgb, var(--chart-1) N%, transparent)</code>. The kit
        measures a hex fill and picks black or white ink itself; a mix it cannot measure, so it falls back to{" "}
        <code className="font-mono">currentColor</code> — untick the box and the page&apos;s dark text sits on
        full-strength colour (~1.5:1 in the light theme). <code className="font-mono">labelColor</code> wins over the
        measured ink whenever it is given. For a strength on one hue, <code className="font-mono">shade</code> needs
        neither: the kit mixes the hue into the card as a hex and measures that (the groups example above).
      </p>
    </>
  );
}

/** keksdose's #642 map: each chain a group in its own hue, each shop shaded by how
 *  recently it was seen, and the path of the last click. */
function GroupedTreemap() {
  const [recency, setRecency] = useState(true);
  const [clicked, setClicked] = useState<string | null>(null);
  const path = (id: string, groups: readonly string[] = []) =>
    [...groups, id].map((g) => SHOP_NAMES.get(g) ?? g).join(" › ");
  return (
    <>
      <Row className="mb-2">
        <label className="flex items-center gap-2 text-xs text-secondary">
          <input type="checkbox" checked={recency} onChange={(e) => setRecency(e.target.checked)} />
          <span>
            <code className="font-mono">shade</code> by how recently each shop was seen
          </span>
        </label>
      </Row>
      <Treemap
        data={recency ? SHOPS_BY_RECENCY : SHOPS_BY_CHAIN}
        valueFormatter={moneyAndShare}
        height={340}
        nodeNote={recency ? recencyNote : undefined}
        onNodeClick={(id, _name, groups) => setClicked(path(id, groups))}
        onGroupClick={(id, _name, groups) => setClicked(`${path(id, groups)} (the chain)`)}
        aria-label="Spending without a receipt, by shop and chain"
        description="Greenway is nearly half of it, most of that at its Centre."
      />
      <p className="mt-2 font-mono text-xs text-muted">last clicked: {clicked ?? "—"}</p>
      <p className="mt-2 text-xs text-secondary">
        A node with <code className="font-mono">children</code> is a group: a frame in the page&apos;s own colours with
        its name in a band along the top, and its tiles laid out inside it, squarified as recharts does. The frame is
        given its own area on top of its tiles&apos;, so a tile&apos;s area is its share of the picture in whichever
        group it sits — £100 is drawn the same size in Greenway as in Riverside. The band is drawn only where the group
        has the room, 61px tall at Normal; a smaller group keeps a 3px margin and is named in its tiles. Groups nest.
      </p>
      <p className="mt-2 text-xs text-secondary">
        A group&apos;s <code className="font-mono">fill</code> is its tiles&apos; default — the chain&apos;s hue; one
        left without takes the ramp by its index, as a tile does, and a tile&apos;s own{" "}
        <code className="font-mono">fill</code> wins. <code className="font-mono">shade</code> (here 1, 0.78 and 0.55)
        mixes the hue into the card as a hex, so the ink is still measured; untick it and every shop is its chain&apos;s
        full hue.
      </p>
      <p className="mt-2 text-xs text-secondary">
        From the keyboard the frame comes first, named as a group with its total — &ldquo;Greenway, group: £664
        (48%)&rdquo; (<code className="font-mono">treemap.group</code>) — then its tiles, each named in its group:
        &ldquo;Greenway Centre: £412 (30%), in Greenway&rdquo; (<code className="font-mono">treemap.inGroup</code>).{" "}
        <code className="font-mono">onNodeClick</code> is handed a tile&apos;s groups as a third argument;{" "}
        <code className="font-mono">onGroupClick</code> makes the frames buttons.
      </p>
    </>
  );
}

function RtlTreemaps() {
  const [cellDir, setCellDir] = useState<"ltr" | "rtl">("rtl");
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div dir="rtl" lang="ar" className="min-w-0">
          <p className="mb-1 font-mono text-caption text-muted">&lt;Treemap&gt; under dir=&quot;rtl&quot;</p>
          <Treemap data={SPEND_AR} valueFormatter={(v) => AR_MONEY.format(v)} height={220} />
        </div>
        <div className="min-w-0">
          <Row className="mb-1 text-xs">
            <span className="font-mono text-caption text-muted">&lt;TreemapCell dir=&quot;{cellDir}&quot; /&gt;</span>
            <button
              type="button"
              onClick={() => setCellDir((d) => (d === "rtl" ? "ltr" : "rtl"))}
              className="rounded border border-subtle px-2 py-0.5 text-secondary hover:bg-hover"
            >
              Switch to {cellDir === "rtl" ? "ltr" : "rtl"}
            </button>
          </Row>
          <ChartContainer config={{}} style={{ height: 220 }}>
            <RechartsTreemap
              data={HAND_BUILT}
              dataKey="size"
              isAnimationActive={false}
              content={<TreemapCell dir={cellDir} />}
            />
          </ChartContainer>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The tiles are not mirrored — the plot keeps its physical layout, as every chart in the kit does — but each
          label stands at the tile&apos;s <em>start</em> edge: the top right corner in RTL, shaped right-to-left, so a
          clipped name ends in its ellipsis on the reading end. <code className="font-mono">Treemap</code> reads the
          direction off its own root after mount; a caller drawing its own recharts map passes{" "}
          <code className="font-mono">dir</code> to <code className="font-mono">TreemapCell</code> (default{" "}
          <code className="font-mono">ltr</code>). Switch the right-hand map to <code className="font-mono">ltr</code>{" "}
          and the Arabic labels jump to the left corner and clip at the wrong end.
        </Note>
      </div>
    </>
  );
}
