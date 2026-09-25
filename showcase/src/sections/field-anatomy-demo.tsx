import { useState } from "react";
import { Copy, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { IconButton, Input, Label, SearchField, Select, Tabs } from "@eifi1/ui-kit";
import type { TabItem } from "@eifi1/ui-kit";
import { Example, Note, Row, Stage } from "../lib/section";

/**
 * Field anatomy — the parts around a field that the apps hand-rolled because the kit's
 * could not be reached: a label ABOVE a field, a toolbar-height select, the small icon
 * actions of a list row, a tab strip that can add and remove its tabs, and a search box
 * that is a header rather than a field. Every colour is a token, so the palette switch
 * reaches all of it.
 */

function Swatches({ tokens }: { tokens: string[] }) {
  return (
    <>
      {tokens.map((token) => (
        <span
          key={token}
          className="size-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: `var(${token})` }}
        />
      ))}
    </>
  );
}

const INITIAL_SHEETS: TabItem<string>[] = [
  { id: "40", label: "40 km/h", detail: "loop 1", icon: <Swatches tokens={["--chart-1"]} /> },
  {
    id: "80",
    label: "80 km/h",
    detail: "loop 2",
    icon: <Swatches tokens={["--chart-2", "--chart-3"]} />,
  },
  { id: "120", label: "120 km/h", detail: "not measured", empty: true },
];

function SheetStrip({ removeOn, wrap }: { removeOn?: "every" | "active"; wrap?: boolean }) {
  const [sheets, setSheets] = useState(INITIAL_SHEETS);
  const [active, setActive] = useState("80");
  return (
    <div data-stage="wide" className="space-y-3">
      <Tabs
        aria-label="Loops"
        wrap={wrap}
        removeOn={removeOn}
        tabs={sheets}
        active={active}
        onChange={setActive}
        onRemove={(id) => {
          const index = sheets.findIndex((s) => s.id === id);
          const next = sheets.filter((s) => s.id !== id);
          setSheets(next);
          if (id === active && next.length > 0) setActive((next[index - 1] ?? next[0]).id);
        }}
        onAdd={() => {
          const speed = String(40 * (sheets.length + 1));
          setSheets([...sheets, { id: speed, label: `${speed} km/h`, empty: true }]);
          setActive(speed);
        }}
        addLabel="Add loop"
      />
      <p className="text-sm text-[var(--text-secondary)]">
        {sheets.length === 0 ? "No loops." : `Sheet ${active} km/h is open.`}
      </p>
    </div>
  );
}

function RowActions() {
  const [log, setLog] = useState("Nothing yet.");
  return (
    <div data-stage="wide" className="space-y-2">
      {["Warm-up", "Main set"].map((name) => (
        // The row's main action is a button that fills the row; the icon actions are
        // its SIBLINGS on top, never its children.
        <div key={name} className="relative">
          <button
            type="button"
            onClick={() => setLog(`Opened ${name}`)}
            className="flex h-10 w-full items-center rounded-md border border-[var(--border)] ps-3 pe-20 text-start text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
          >
            {name}
          </button>
          <div className="absolute inset-y-0 end-2 flex items-center gap-0.5">
            <IconButton
              size="xs"
              tone="muted"
              aria-label={`Copy ${name}`}
              onClick={() => setLog(`Copied ${name}`)}
            >
              <Copy />
            </IconButton>
            <IconButton
              size="xs"
              tone="danger"
              aria-label={`Delete ${name}`}
              onClick={() => setLog(`Deleted ${name}`)}
            >
              <Trash2 />
            </IconButton>
          </div>
        </div>
      ))}
      <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
        {log}
      </p>
    </div>
  );
}

export function FieldAnatomyDemo() {
  const [period, setPeriod] = useState("month");
  const [query, setQuery] = useState("");
  const [headerQuery, setHeaderQuery] = useState("");
  return (
    <>
      <Example label="Label above a field" hint="a real <label>; required mark is aria-hidden">
        <Stage>
          <div className="space-y-1.5">
            <Label htmlFor="fa-iban" required>
              IBAN
            </Label>
            <Input id="fa-iban" required placeholder="DE89 3704 0044 0532 0130 00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fa-note">Note</Label>
            <Input id="fa-note" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fa-locked" disabled>
              Locked
            </Label>
            <Input id="fa-locked" disabled value="Read only" readOnly />
          </div>
        </Stage>
      </Example>

      <Note>
        <code>required</code> on the label draws the star only; set <code>required</code> on the
        control too — that is what a screen reader announces. The floating labels of{" "}
        <code>Input</code>/<code>Select</code> and <code>FieldLabel</code> are unchanged.
      </Note>

      <Example
        label="Toolbar select"
        hint='size="sm": 28px, 12px type; selectClassName reaches the <select>'
      >
        <Row>
          <Label htmlFor="fa-period" size="sm">
            Period
          </Label>
          <Select
            id="fa-period"
            size="sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </Select>
          <IconButton size="xs" aria-label="Edit period">
            <Pencil />
          </IconButton>
          <Select aria-label="Default size" className="w-40">
            <option>Default (md)</option>
          </Select>
        </Row>
      </Example>

      <Example label="Search as a header" hint='variant="inline" inherits the header’s type size'>
        <Stage>
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-base">
            <SearchField
              variant="inline"
              value={headerQuery}
              onChange={setHeaderQuery}
              aria-label="Search transactions"
              clearLabel="Clear search"
              className="min-w-0 flex-1"
            />
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            aria-label="Filter settings"
            clearLabel="Clear filter"
          />
        </Stage>
      </Example>
    </>
  );
}

/** Icon-button sizes and tones, and actions over a clickable row — controls, not
 *  fields, so they live beside Button and IconButton on "Buttons & surfaces". */
export function IconButtonControls() {
  return (
    <>
      <Example label="Icon button sizes and tones" hint="lg 44 · md 36 · sm 32 · xs 28 · 2xs 24">
        <Row>
          <IconButton size="lg" aria-label="Delete (lg)" tone="danger">
            <Trash2 />
          </IconButton>
          <IconButton aria-label="Delete (md)" tone="danger">
            <Trash2 />
          </IconButton>
          <IconButton size="sm" aria-label="Delete (sm)" tone="danger">
            <Trash2 />
          </IconButton>
          <IconButton size="xs" aria-label="Delete (xs)" tone="danger">
            <Trash2 />
          </IconButton>
          <IconButton size="2xs" aria-label="Delete (2xs)" tone="danger">
            <Trash2 />
          </IconButton>
          <IconButton size="xs" aria-label="Copy (muted)" tone="muted">
            <Copy />
          </IconButton>
          <IconButton size="sm" aria-label="Needs review (warning)" title={`tone="warning"`} tone="warning">
            <TriangleAlert />
          </IconButton>
        </Row>
      </Example>

      <Example
        label="Actions on a clickable row"
        hint="siblings over the row, not buttons inside a button"
      >
        <Stage>
          <RowActions />
        </Stage>
      </Example>

      <Note>
        A button inside a button is invalid HTML, and so is the{" "}
        <code>span role=&quot;button&quot;</code> workaround — a reader flattens it into the outer
        button&apos;s name. Make the row&apos;s main action fill the row and lay the icon buttons
        over its end. Inside a clickable table row or card (not a button),{" "}
        <code>stopPropagation</code> keeps the click and its Enter from reaching the row.
      </Note>
    </>
  );
}

/** Tabs that add and remove — a control, not a field, so it lives beside Tabs on
 *  "Chips & toggles". */
export function TabControls() {
  return (
    <>
      <Example label="Tabs that add and remove" hint="× on the open tab · Delete on a focused tab">
        <Stage>
          <SheetStrip />
        </Stage>
      </Example>

      <Example
        label="Delete on the open tab only"
        hint='removeOn="active" · wrap · Delete on a closed tab does nothing'
      >
        <Stage>
          <SheetStrip removeOn="active" wrap />
        </Stage>
      </Example>

      <Note>
        For a remove that happens at once, with nothing to confirm it (lenkbank deletes a
        measurement sheet), <code>removeOn=&quot;active&quot;</code> narrows the Delete key to the
        tab you are looking at — the same one that wears the ×. Arrow onto a closed tab and press
        Delete: nothing goes. The ×&apos;s room stays reserved on every tab either way.
      </Note>
    </>
  );
}
