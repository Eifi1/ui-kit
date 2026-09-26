import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BellOff, Eye, Info, Trash2, Users, Wallet } from "lucide-react";
import {
  AlertBanner,
  Button,
  BulkActionBar,
  Checkbox,
  Chip,
  CLIPS_ATTRIBUTE,
  EmptyState,
  HoverMenu,
  IconButton,
  Input,
  List,
  ListItem,
  MenuItem,
  SectionLabel,
  Select,
  SeriesChart,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  ToggleGroup,
  Tooltip,
} from "@eifi1/ui-kit";
import type { ChipHue, TableHeaderCellSize, TableHeaderCellWeight, TableVAlign } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.11 props from keksdose's 0.10 feedback (D1–D9), each on the page of the
 * component it belongs to: BulkActionBar's `panel`, `open` and responsive `variant`;
 * IconButton `disabledReason`; MenuItem `badge`; AlertBanner inline `block` and `live`;
 * SectionLabel `size="md"`; EmptyState inline `size="sm"`; Table header `size`/`weight`
 * and `valign`; the `data-clips` marker; SeriesChart `minBarLength`; StatusDot's hues.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── Buttons page: IconButton disabledReason ─────────────────────────────── */

export function IconButtonDisabledReasonDemo() {
  const [balance, setBalance] = useState(120);
  const [log, setLog] = useState("—");
  const reason = balance === 0 ? undefined : "Only an account with a zero balance can be hidden";
  return (
    <Example
      label="IconButton — disabledReason, with and without label"
      hint="aria-disabled rather than disabled: it stays in the Tab order, and the reason is shown and described"
    >
      <Row>
        <IconButton label="Hide account" disabledReason={reason} onClick={() => setLog("hidden")}>
          <Eye />
        </IconButton>
        <IconButton
          aria-label="Delete budget"
          tone="danger"
          quiet={false}
          disabledReason="The active budget cannot be deleted"
          onClick={() => setLog("deleted (should not happen)")}
        >
          <Trash2 />
        </IconButton>
        <Button variant="ghost" size="sm" onClick={() => setBalance((b) => (b === 0 ? 120 : 0))}>
          {balance === 0 ? "Book €120 onto it" : "Clear the balance"}
        </Button>
        <span className={READOUT}>
          balance: €{balance} · last action: {log}
        </span>
      </Row>
      <div className="mt-3">
        <Note>
          Hover or Tab to either button. The first has a {code("label")}: its name stays &ldquo;Hide
          account&rdquo;, and while it is locked the bubble shows the reason instead of the label — clear
          the balance and it becomes an ordinary button with its usual tooltip. The second has only an{" "}
          {code("aria-label")}, and still gets the bubble: a reason nobody can see is not one. Both are
          described by the reason ({code("aria-describedby")}), and a click or Enter does nothing.
        </Note>
      </div>
    </Example>
  );
}

/* ── Lists & menus page: MenuItem badge, BulkActionBar panel / open / responsive ── */

const LONG_BUDGETS: Array<{ name: string; badge?: ReactNode }> = [
  { name: "Household" },
  { name: "Holiday house on the coast, shared with the Lindqvist family", badge: <Chip size="xs" tone="teal">Shared</Chip> },
  { name: "Parents' care costs, managed on behalf of Margarethe", badge: <Chip size="xs" tone="purple">Guest</Chip> },
];

export function MenuItemBadgeDemo() {
  const [budget, setBudget] = useState(LONG_BUDGETS[1].name);
  return (
    <Example
      label="MenuItem — badge beside a long, truncating label"
      hint="the label truncates, the badge never shrinks, and both are the row's name"
    >
      <Row>
        <HoverMenu
          aria-label="Switch budget"
          align="start"
          panelClassName="w-72"
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open} className="max-w-64">
              <span className="truncate">{budget}</span>
            </Button>
          )}
        >
          {(close) => (
            <ul className="py-1">
              {LONG_BUDGETS.map((b) => (
                <li key={b.name}>
                  <MenuItem
                    icon={b.badge ? Users : Wallet}
                    badge={b.badge}
                    checked={budget === b.name}
                    onClick={() => {
                      setBudget(b.name);
                      close();
                    }}
                  >
                    {b.name}
                  </MenuItem>
                </li>
              ))}
            </ul>
          )}
        </HoverMenu>
      </Row>
      <div className="mt-3">
        <Note>
          {code("badge")} sits right after the label text, before the gap that pushes {code("trailing")} (and
          the check mark) to the end. Hand-placed inside the label it was truncated with the name — here the
          name gives way and &ldquo;Shared&rdquo; stays. The row is named &ldquo;Holiday house on the coast, shared
          with the Lindqvist family Shared&rdquo;, so keep a badge text.
        </Note>
      </div>
    </Example>
  );
}

const RECEIPT_LINES = ["Bread", "Coffee beans", "Batteries (4)", "Dish soap", "Tomatoes", "Birthday card"];

export function BulkActionBarPanelDemo() {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState("groceries");
  const [exclude, setExclude] = useState(false);
  const [log, setLog] = useState("—");
  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  const done = () => {
    setSelected([]);
    setSelecting(false);
  };
  const allSelected = selected.length === RECEIPT_LINES.length;
  return (
    <Example
      label="BulkActionBar — panel, open at zero, responsive variant"
      hint='a form under the toolbar; selection mode before the first tick; variant={{ base: "floating", md: "sticky" }}'
    >
      <Row className="mb-3">
        <Button variant="secondary" size="sm" onClick={() => setSelecting(true)} disabled={selecting}>
          Select
        </Button>
        <span className={READOUT}>
          selecting: {String(selecting)} · count: {selected.length} · last: {log}
        </span>
      </Row>
      {/* `transform` makes the box the containing block of the floating bar's `position:
          fixed`, so below md the phone's card is held inside the box. */}
      <div
        className="relative h-96 overflow-hidden rounded-md border border-[var(--border)] [transform:translateZ(0)]"
        style={{ ["--app-nav-h" as string]: "0px" }}
      >
        <div className="h-full overflow-auto">
          <BulkActionBar
            variant={{ base: "floating", md: "sticky" }}
            open={selecting || selected.length > 0}
            count={selected.length}
            onClear={done}
            labels={{ selected: (n) => `${n} line${n === 1 ? "" : "s"} selected` }}
            panel={
              selected.length > 0 ? (
                <form
                  className="flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setLog(`${selected.length} → ${category}${exclude ? ", excluded" : ""}`);
                  }}
                >
                  <div className="w-44">
                    <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="groceries">Groceries</option>
                      <option value="household">Household</option>
                      <option value="gifts">Gifts</option>
                    </Select>
                  </div>
                  <Checkbox label="Exclude from reports" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
                  <Button type="submit" size="sm">
                    Apply
                  </Button>
                </form>
              ) : null
            }
          >
            <Button variant="ghost" size="sm" onClick={() => setSelected(allSelected ? [] : RECEIPT_LINES)}>
              {allSelected ? "Select none" : "Select all"}
            </Button>
            <Button variant="ghost" size="sm" onClick={done}>
              Done
            </Button>
          </BulkActionBar>
          <div className="p-1 pb-40 md:pb-1">
            <List density="compact" separator="divider">
              {RECEIPT_LINES.map((line) => (
                <ListItem
                  key={line}
                  title={line}
                  selected={selected.includes(line)}
                  leading={
                    selecting || selected.length > 0 ? (
                      <Checkbox aria-label={`Select ${line}`} checked={selected.includes(line)} onChange={() => toggle(line)} />
                    ) : undefined
                  }
                />
              ))}
            </List>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          Press <strong>Select</strong>: {code("open")} brings the bar in at &ldquo;0 lines selected&rdquo; with
          its way out (<strong>Done</strong>, and the clear) and a <strong>Select all</strong>, where a bar gated on
          the count would have shown nothing until the first tick. Tick a line and the {code("panel")} appears
          under the toolbar, in the same surface: its fields keep their own Tab stops, and the toolbar&apos;s
          arrow keys never walk into them. Narrow the window below 768px and the same bar is the phone&apos;s
          floating card — the variant is resolved per breakpoint, mobile first — with the panel scrolling inside
          60% of the viewport&apos;s height.
        </Note>
      </div>
    </Example>
  );
}

/* ── Feedback page: AlertBanner block / live, EmptyState size sm ─────────── */

export function AlertBannerBlockDemo() {
  const [live, setLive] = useState(false);
  return (
    <Example
      label="AlertBanner — inline block and live={false}"
      hint="a line of its own with the glyph on the first line; static page content outside the live region"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="max-w-xs space-y-1.5">
          <p className="text-sm text-[var(--text-secondary)]">
            Total <strong>€ 1,425.50</strong>
          </p>
          <AlertBanner tone="info" variant="inline" size="sm" block live={false}>
            block: two currencies are converted at the rate of each booking day, so this total can differ from the
            statement&apos;s by a few cents.
          </AlertBanner>
          <AlertBanner tone="info" variant="inline" size="sm" live={false}>
            default: the same wrapped hint centres its glyph between the lines.
          </AlertBanner>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            live (role=&quot;alert&quot;)
          </label>
          <AlertBanner tone="danger" variant="inline" block live={live}>
            3 unresolved rows block the import.
          </AlertBanner>
          <p className={READOUT}>role: {live ? "alert" : "none"}</p>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          {code("block")} lays an inline banner out as a full-width row with the glyph on the text&apos;s first
          line, instead of the inline, centred line it is by default (which a toolbar or a run of content
          needs). {code("live={false}")} drops {code('role="alert"')} / {code('role="status"')} for a message that
          is part of the page, like a review step&apos;s standing warning, so a screen reader does not interrupt
          with it on every mount. A {code("role")} you pass still wins.
        </Note>
      </div>
    </Example>
  );
}

export function EmptyStateSmallDemo() {
  return (
    <Example
      label="EmptyState — inline size sm"
      hint="12px, start-aligned and tight: the empty line inside a detail panel"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {(["sm", "md"] as const).map((size) => (
          <div key={size} className="rounded-md border border-[var(--border)] px-3 py-2">
            <SectionLabel as="p" size="xs">
              Holdings (size {size})
            </SectionLabel>
            <ul className="mt-1 space-y-0.5 text-xs text-[var(--text-secondary)]">
              <li>ACME Corp · 12 shares</li>
            </ul>
            <SectionLabel as="p" size="xs" className="mt-2">
              Dividends
            </SectionLabel>
            <EmptyState variant="inline" size={size} icon={<BellOff />} title="No dividends this year" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          {code('size="sm"')} fits among {code("text-xs")} rows under a panel heading; the default{" "}
          {code("md")} (right) is a centred 14px line with room above and below, which reads as a section of
          its own there.
        </Note>
      </div>
    </Example>
  );
}

/* ── Page structure page: SectionLabel md, StatusDot hues ────────────────── */

export function SectionLabelMdDemo() {
  const figures: Array<[string, string]> = [
    ["Assigned", "€ 2,340"],
    ["Activity", "−€ 1,812"],
    ["Available", "€ 528"],
  ];
  return (
    <Example label="SectionLabel — size md" hint="11px, the rung between xs (10px) and sm (12px): the label over a figure">
      <div className="grid grid-cols-3 gap-4">
        {figures.map(([label, value]) => (
          <div key={label}>
            <SectionLabel as="p" size="md">
              {label}
            </SectionLabel>
            <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          10px reads as a footnote under a figure this size and 12px competes with it. It is named{" "}
          {code("md")} rather than slotted into order because {code("sm")} was already the default.
        </Note>
      </div>
    </Example>
  );
}

const HUES: ChipHue[] = ["blue", "indigo", "purple", "teal", "orange"];
const HUE_STATES: Record<ChipHue, string> = {
  blue: "Sent",
  indigo: "Accepted",
  purple: "Invoiced",
  teal: "Scheduled",
  orange: "On hold",
};

export function StatusDotHuesDemo() {
  return (
    <Example label="StatusDot — hues beside matching Chips" hint="Chip's five categorical hues, name for name">
      <div className="flex flex-col gap-2">
        {HUES.map((hue) => (
          <Row key={hue}>
            <span className="w-16 font-mono text-xs text-[var(--text-secondary)]">{hue}</span>
            <StatusDot tone={hue} size="lg" label={HUE_STATES[hue]} />
            <Chip tone={hue} size="xs">
              {HUE_STATES[hue]}
            </Chip>
          </Row>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          A dot in a legend and the Chip in the table it explains are the same colour, because both paint with
          the {code("--hue-*")} tokens. Use a hue for values that only need telling apart, and a semantic tone
          for values that mean something (overdue is {code("danger")}).
        </Note>
      </div>
    </Example>
  );
}

/* ── Description list & table page: header size / weight, valign ─────────── */

const VAT_RATES = [
  { rate: "19\u00a0%", net: 1200 },
  { rate: "7\u00a0%", net: 310.5 },
];
const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });

export function TableHeaderValignDemo() {
  const [size, setSize] = useState<TableHeaderCellSize>("sm");
  const [weight, setWeight] = useState<TableHeaderCellWeight>("normal");
  const [valign, setValign] = useState<TableVAlign>("middle");
  const [nets, setNets] = useState(VAT_RATES.map((r) => String(r.net)));
  return (
    <Example
      label="Table — header size and weight, valign on a table of inputs"
      hint="a quiet header at the body size; read-out figures centred on the fields beside them"
    >
      <Row className="mb-3">
        <ToggleGroup<TableHeaderCellSize>
          aria-label="header size"
          size="sm"
          value={size}
          onChange={setSize}
          options={[
            { value: "xs", label: "size xs" },
            { value: "sm", label: "size sm" },
          ]}
        />
        <ToggleGroup<TableHeaderCellWeight>
          aria-label="header weight"
          size="sm"
          value={weight}
          onChange={setWeight}
          options={[
            { value: "normal", label: "normal" },
            { value: "medium", label: "medium" },
            { value: "semibold", label: "semibold" },
          ]}
        />
        <ToggleGroup<TableVAlign>
          aria-label="row valign"
          size="sm"
          value={valign}
          onChange={setValign}
          options={[
            { value: "top", label: "top" },
            { value: "middle", label: "middle" },
            { value: "bottom", label: "bottom" },
          ]}
        />
      </Row>
      <Table aria-label="VAT summary">
        <TableHead>
          <TableRow>
            <TableHeaderCell size={size} weight={weight}>
              Rate
            </TableHeaderCell>
            <TableHeaderCell size={size} weight={weight}>
              Net
            </TableHeaderCell>
            <TableHeaderCell size={size} weight={weight} numeric>
              VAT
            </TableHeaderCell>
            <TableHeaderCell size={size} weight={weight} numeric>
              Gross
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {VAT_RATES.map((r, i) => {
            const net = Number(nets[i]) || 0;
            const pct = parseFloat(r.rate) / 100;
            return (
              <TableRow key={r.rate} valign={valign}>
                <TableCell>{r.rate}</TableCell>
                <TableCell>
                  <div className="w-32">
                    <Input
                      aria-label={`Net at ${r.rate}`}
                      inputMode="decimal"
                      value={nets[i]}
                      onChange={(e) => setNets((n) => n.map((v, j) => (j === i ? e.target.value : v)))}
                    />
                  </div>
                </TableCell>
                <TableCell numeric>{EUR.format(net * pct)}</TableCell>
                <TableCell numeric>{EUR.format(net * (1 + pct))}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="mt-3">
        <Note>
          {code("TableHeaderCell")}&apos;s {code("size")} and {code("weight")} say &ldquo;a quiet header at the
          body size&rdquo; without overriding classes. {code("TableRow valign")} reaches every cell of the row
          that does not set its own (each cell states its default — top in the body, bottom in the head — so a
          class on the row could not): at {code("top")} the figures sit above the middle of the field beside them.
        </Note>
      </div>
    </Example>
  );
}

/* ── Popovers page: data-clips / CLIPS_ATTRIBUTE ─────────────────────────── */

const ACCOUNTS = ["Checking", "Savings", "Credit card", "Brokerage", "Cash"];

export function ClipsMarkerDemo() {
  const ref = useRef<HTMLUListElement>(null);
  const [text, setText] = useState("…");
  useEffect(() => {
    // After the tooltips' mount-time check has settled.
    const frame = requestAnimationFrame(() => setText(ref.current?.querySelector("li")?.textContent ?? ""));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Example
      label="Tooltip — data-clips marks an app's own scroller"
      hint="CLIPS_ATTRIBUTE: counts as clipping whatever its computed overflow, so jsdom portals like the browser"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <p className={READOUT}>
            &lt;div {CLIPS_ATTRIBUTE} className=&quot;overflow-auto&quot;&gt;
          </p>
          <div
            {...{ [CLIPS_ATTRIBUTE]: "" }}
            className="h-40 w-full max-w-64 overflow-auto rounded-md border border-[var(--border)]"
          >
            <ul ref={ref} className="divide-y divide-[var(--border)]">
              {ACCOUNTS.map((name) => (
                <li key={name} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-[var(--text-primary)]">
                  <span className="truncate">{name}</span>
                  <Tooltip label={`${name}: booked daily`} side="end">
                    <IconButton size="xs" aria-label={`About ${name}`}>
                      <Info />
                    </IconButton>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
          <p className={READOUT}>first row&apos;s textContent: &ldquo;{text}&rdquo;</p>
        </div>
        <pre className="min-w-0 whitespace-pre-wrap break-words rounded-md bg-[var(--bg-surface-2)] p-3 font-mono text-xs text-[var(--text-secondary)]">
          {`// in the app\n<div {...{ [CLIPS_ATTRIBUTE]: "" }}\n     className="overflow-auto">\n\n// in its jsdom test — no\n// "CheckingChecking: booked daily"\nexpect(row).toHaveTextContent(/^Checking$/);`}
        </pre>
      </div>
      <div className="mt-3">
        <Note>
          The auto-portal looks for an ancestor whose computed {code("overflow")} clips, and jsdom computes no
          Tailwind: under test every scroller reads {code("visible")}, the bubble stays in place, and its text
          joins the row&apos;s. Marked with {code("data-clips")} (or {code("{ [CLIPS_ATTRIBUTE]: \"\" }")}), the
          scroller counts as clipping in both, so the tooltip portals in the browser (hover a row: the bubble
          is not cut by the box&apos;s edge) and in the test alike, and the row reads &ldquo;Checking&rdquo; in both.
          DataTable&apos;s body and Table&apos;s wrapper carry it already.
        </Note>
      </div>
    </Example>
  );
}

/* ── Series chart marks page: minBarLength ───────────────────────────────── */

const WEEKDAYS = [
  { day: "Mon", thisWeek: 42, average: 38 },
  { day: "Tue", thisWeek: 18, average: 25 },
  { day: "Wed", thisWeek: 55, average: 31 },
  { day: "Thu", thisWeek: 1, average: 29 },
  { day: "Fri", thisWeek: 76, average: 64 },
  { day: "Sat", thisWeek: 120, average: 88 },
  { day: "Sun", thisWeek: 0, average: 0 },
];

export function MinBarLengthDemo() {
  const [chartWide, setChartWide] = useState(true);
  const [averageOff, setAverageOff] = useState(true);
  return (
    <Example
      label="Bars — minBarLength, chart-wide and per series"
      hint="a zero keeps a visible stub; the axis, tooltip and names still say 0"
    >
      <Row className="mb-3">
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={chartWide} onChange={(e) => setChartWide(e.target.checked)} />
          chart minBarLength={"{3}"}
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={averageOff} onChange={(e) => setAverageOff(e.target.checked)} />
          average: minBarLength={"{0}"} (off for that series)
        </label>
      </Row>
      <SeriesChart
        rows={WEEKDAYS}
        x={{ type: "category", key: "day", title: "Weekday" }}
        axes={[{ id: "y", title: "EUR" }]}
        minBarLength={chartWide ? 3 : undefined}
        series={[
          { key: "thisWeek", label: "This week", type: "bar", color: "var(--chart-1)" },
          {
            key: "average",
            label: "Average",
            type: "bar",
            color: "var(--chart-3)",
            ...(averageOff ? { minBarLength: 0 } : {}),
          },
        ]}
        valueFormat={(v) => `€${v}`}
      />
      <div className="mt-3">
        <Note>
          Sunday is 0 in both series and Thursday&apos;s €1 is too small to see. With the chart&apos;s{" "}
          {code("minBarLength")} each is drawn as a 3px stub, so an empty slot still reads as a slot with a
          value rather than a gap; the Average series sets {code("0")} to opt out. Only the drawing changes. The
          axis is fitted to the values, and hovering Sunday still says €0.
        </Note>
      </div>
    </Example>
  );
}
