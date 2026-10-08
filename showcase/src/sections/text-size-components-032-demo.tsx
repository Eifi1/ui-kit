import { useRef, useState } from "react";
import type { ContextType } from "react";
import { MemoryRouter, UNSAFE_LocationContext } from "react-router";
import {
  BarChart3,
  CalendarDays,
  Flower2,
  Home,
  Pencil,
  Settings,
  Share2,
  Sprout,
  Trash2,
  Users,
} from "lucide-react";
import {
  AppShell,
  Button,
  Checkbox,
  CompactControls,
  DataTable,
  DateMark,
  DEFAULT_MOBILE_BAR_MAX,
  FieldHint,
  FieldSyncIndicator,
  FormActions,
  IconButton,
  Input,
  List,
  ListItem,
  RowActions,
  SignChip,
  StatTile,
  Switch,
  TextSizeSetting,
  ToggleGroup,
  resolveTextSize,
  useTextSize,
  useWindowedRows,
} from "@eifi1/ui-kit";
import type { AppShellNavItem, DataTableColumn } from "@eifi1/ui-kit";
import { useTextSizeStore } from "../stores";
import { Example, Note } from "../lib/section";

/**
 * WHAT THE COMPONENTS DO AT LARGE AND EXTRA LARGE (0.32, docs/text-size-harmonization.md
 * §4, §10.7–10.9). Every example below follows the page's own text size — the switch at
 * the top is the top bar's store — so flip it and watch the same parts change: labels
 * appear beside icons, reasons and hints come out of their tooltips, rows wrap instead
 * of truncating, the phone bar folds into "More".
 *
 * Belongs on the Foundations page "Text size & contrast" (slug `text-size`), after
 * text-size-032-demo: the mechanism first, then what the parts do with it. Components:
 * Button, IconButton (`labelVisible`, `disabledReasonDisplay`), CompactControls,
 * RowActions, DataTable (`mobileDetailsInRow`, `rowName`), ListItem, FormActions
 * (`stack`), FieldHint, Switch, Checkbox, ToggleGroup, StatTile, DateMark, SignChip,
 * FieldSyncIndicator, AppShell (`mobileBarMax`), useWindowedRows.
 *
 * Ada Example and her garden are SYNTHETIC. Nothing sends a request.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** `null` is what a `LocationContext` holds outside any router — see shell.tsx's
 *  playground, whose boxed-in shell this copies. */
const NO_ROUTER = null as unknown as ContextType<typeof UNSAFE_LocationContext>;

function SizeSwitch() {
  const device = useTextSizeStore((s) => s.size);
  const setSize = useTextSizeStore((s) => s.setSize);
  const { size, scale } = useTextSize();
  return (
    <div className="grid gap-2">
      <TextSizeSetting label="This page's text size" labelPlacement="above" value={resolveTextSize(device)} onChange={setSize} />
      <p className="text-xs text-[var(--text-muted)]">
        In force: {code(size)} × {scale}. Every example below reads it.
      </p>
    </div>
  );
}

/* ── Buttons and icons ─────────────────────────────────────────────────────── */

function ControlsDemo() {
  return (
    <Example label="Buttons and icons" hint="at Large: 48 px targets, an IconButton's label as text, the top bar's icons alone">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary">
            Small
          </Button>
          <Button>Medium</Button>
          <IconButton label="Edit the bed">
            <Pencil />
          </IconButton>
          <IconButton label="Share the plan" size="sm">
            <Share2 />
          </IconButton>
          <IconButton label="Delete the bed" size="xs" tone="danger">
            <Trash2 />
          </IconButton>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex size-24 items-end justify-end rounded-md bg-[var(--bg-inverse)] p-1">
            {/* On a picture: the icon alone at every size (`labelVisible={false}`). */}
            <IconButton variant="overlay" size="sm" label="Next photo" labelVisible={false}>
              <Flower2 />
            </IconButton>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1">
            <span className="text-xs text-[var(--text-muted)]">A top bar:</span>
            <CompactControls>
              <IconButton label="Notifications" size="sm">
                <CalendarDays />
              </IconButton>
              <IconButton label="Settings" size="sm">
                <Settings />
              </IconButton>
            </CompactControls>
          </div>
        </div>
      </div>
      <Note>
        At Large `sm` grows to `md`&apos;s height and every target is at least 48 px. An
        IconButton shows its `label` beside the glyph and drops the tooltip; an overlay or
        shutter, `labelVisible={"{false}"}` and a `CompactControls` region (AppShell&apos;s top bar)
        keep the icon alone. A dense row&apos;s icons belong in `RowActions` (below).
      </Note>
    </Example>
  );
}

/* ── No fact only in a tooltip ─────────────────────────────────────────────── */

/** Three days before the page loaded — fixed once, so the mark is the same on every render. */
const WATERED = new Date(Date.now() - 3 * 86_400_000).toISOString();

function TooltipFactsDemo() {
  const [planBy, setPlanBy] = useState<"m" | "y">("m");
  return (
    <Example label="No fact only in a tooltip" hint="reasons and hints come into the layout at Large and on touch">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Button disabledReason="Ada's plan is read-only while it is shared">Save the plan</Button>
          <IconButton label="Delete the bed" disabledReason="The bed still has plantings">
            <Trash2 />
          </IconButton>
          <Switch label="Weekly watering reminder" disabledReason="Reminders are off for this garden" />
          <Checkbox label="Share with the allotment" disabledReason="Set by the allotment's owner" />
        </div>
        <div className="space-y-3">
          <Input
            label="Bed length (m)"
            defaultValue="4"
            hint={<FieldHint label="Measured along the path, not the fence" />}
          />
          <ToggleGroup
            label="Plan by"
            value={planBy}
            onChange={setPlanBy}
            hint={<FieldHint label="A year plan repeats the month plan" />}
            options={[
              { value: "m", label: "Month" },
              { value: "y", label: "Year" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Last watered:</span>
            <DateMark value={WATERED} display="relative" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SignChip negative onNegativeChange={() => {}} />
            <FieldSyncIndicator state="synced" />
          </div>
        </div>
      </div>
      <Note>
        At Normal with a mouse a reason is a tooltip and a hint a "?". At Large and Extra
        large — and on any touch screen — the reason is a line under its control
        (`disabledReasonDisplay`: `auto` / `line` / `tooltip`) and a FieldHint becomes the
        field&apos;s caption. A relative date shows the exact one at every size; SignChip
        says what a press does and FieldSyncIndicator its state&apos;s word at Large.
      </Note>
    </Example>
  );
}

/* ── Rows ──────────────────────────────────────────────────────────────────── */

interface Bed {
  id: number;
  name: string;
  crop: string;
  sown: string;
  notes: string;
}

const BEDS: Bed[] = [
  { id: 1, name: "North bed by the greenhouse door", crop: "Tomatoes (Black Krim)", sown: "2026-03-14", notes: "Stake before June; feed fortnightly" },
  { id: 2, name: "Herb spiral", crop: "Basil, thyme, sage", sown: "2026-04-02", notes: "Pinch basil tops weekly" },
  { id: 3, name: "South border", crop: "Runner beans", sown: "2026-05-10", notes: "Canes up; net against pigeons" },
];

const BED_COLUMNS: DataTableColumn<Bed>[] = [
  { key: "name", header: "Bed", cell: (b) => <span className="truncate">{b.name}</span>, mobilePrimary: true },
  { key: "crop", header: "Crop", cell: (b) => b.crop },
  { key: "sown", header: "Sown", cell: (b) => <DateMark value={b.sown} /> },
  { key: "notes", header: "Notes", cell: (b) => b.notes, mobileHidden: true },
];

function RowsDemo() {
  const [log, setLog] = useState("Nothing yet.");
  return (
    <Example label="Rows that make room" hint="RowActions, the phone card, ListItem — narrow the window for the card">
      <div className="space-y-4">
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {BEDS.slice(0, 2).map((bed) => (
            <li key={bed.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{bed.name}</span>
              <RowActions
                name={bed.name}
                actions={[
                  { label: "Edit", icon: Pencil, onSelect: () => setLog(`Edit ${bed.name}`) },
                  { label: "Share", icon: Share2, onSelect: () => setLog(`Share ${bed.name}`) },
                  {
                    label: "Delete",
                    icon: Trash2,
                    tone: "danger",
                    onSelect: () => setLog(`Delete ${bed.name}`),
                    disabledReason: bed.id === 1 ? "The bed still has plantings" : undefined,
                  },
                ]}
              />
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
          Last action: {log}
        </p>
        <DataTable
          rows={BEDS}
          columns={BED_COLUMNS}
          rowKey={(b) => b.id}
          rowName={(b) => b.name}
          mobileDetailsInRow
          rowActions={[
            { kind: "edit", onAction: (b) => setLog(`Edit ${b.name}`) },
            { kind: "delete", onAction: (b) => setLog(`Delete ${b.name}`) },
          ]}
        />
        <List>
          <ListItem
            title="Sow the second sweetcorn batch in the cold frame by the shed"
            subtitle="Ada Example · Ada's Garden Planner · seed tray B, the one with the cracked corner"
            meta="in 3 days"
          />
        </List>
      </div>
      <Note>
        `RowActions` keeps a row&apos;s icons inline at Normal and folds two or more into a
        "⋯" menu at Large, where a locked one stays listed and says why. DataTable&apos;s
        `rowActions` go through it (`rowName` names each menu). On the phone card at Large
        each label sits above its value and nothing truncates; `mobileDetailsInRow` puts the
        `mobileHidden` Notes into the opened row. ListItem wraps its title, subtitle and meta
        at Large.
      </Note>
    </Example>
  );
}

/* ── Forms, tiles ──────────────────────────────────────────────────────────── */

function FormAndTileDemo() {
  return (
    <Example label="Forms and tiles" hint="FormActions stacks on a phone at Large; StatTile leads with its one number">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] p-3">
          <Input label="Bed name" defaultValue="Herb spiral" />
          <FormActions onCancel={() => {}} onSubmit={() => {}} submitLabel="Save the bed" />
        </div>
        <StatTile
          label="Harvested this month"
          value={12.4}
          unit="kg"
          hint="Weighed at the shed, before washing"
          delta={{ value: 2.1, label: "vs August" }}
          goodDirection="up"
          trend={[4, 6, 5, 8, 9, 12.4]}
          subValues={[
            { label: "August", value: 10.3 },
            { label: "Best month", value: 14.0 },
          ]}
        />
      </div>
      <Note>
        On the phone layout at Large FormActions stacks its buttons full width, Save at the
        bottom under the thumb (`stack`: `auto` / `phone` / `never`). StatTile at Large puts
        the hint in words, never truncates its label, and moves the sub-values (label over
        figure) and then the sparkline below the one big number.
      </Note>
    </Example>
  );
}

/* ── The phone bar ─────────────────────────────────────────────────────────── */

const SHELL_NAV: AppShellNavItem[] = [
  { to: "/", label: "Today", icon: Home },
  { to: "/beds", label: "Beds", icon: Sprout, dataTour: "nav-beds" },
  { to: "/calendar", label: "Sowing calendar", icon: CalendarDays },
  {
    to: "/harvest",
    label: "Harvest",
    icon: BarChart3,
    items: [
      { to: "/harvest/log", label: "Harvest log", icon: BarChart3 },
      { to: "/harvest/yields", label: "Yields by bed", icon: Sprout },
    ],
  },
  { to: "/members", label: "Allotment members", icon: Users, dataTour: "nav-members" },
  { to: "/settings", label: "Settings", icon: Settings },
];

function ShellDemo() {
  const { size } = useTextSize();
  return (
    <Example label="The phone bar folds into More" hint="six entries: all six at Normal, four + More at Large, three + More at Extra large">
      <div className="h-[24rem] max-w-sm overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-page)]">
        <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
          <MemoryRouter initialEntries={["/beds"]}>
            <AppShell
              nav={SHELL_NAV}
              embedded
              topBar={<div className="flex h-12 items-center px-3 text-sm font-semibold">Ada&apos;s Garden Planner</div>}
            >
              <div className="p-4 text-sm text-[var(--text-secondary)]">
                The bar shows {DEFAULT_MOBILE_BAR_MAX[size] === Number.POSITIVE_INFINITY ? "every entry" : `${DEFAULT_MOBILE_BAR_MAX[size]} entries and More`} at this size.
              </div>
            </AppShell>
          </MemoryRouter>
        </UNSAFE_LocationContext.Provider>
      </div>
      <Note>
        `mobileBarMax` takes the app&apos;s order: the first entries stay, the rest open from
        "More" as a sheet, each group with its pages. The More cell carries the hidden
        entries&apos; links and `dataTour` anchors, so a tour step aimed at "Allotment members"
        lands on More. Labels wrap to two lines instead of truncating; the sidebar never
        collapses to icons at Large. The bar is the phone layout&apos;s: narrow the window (or
        open the device preview) to see it.
      </Note>
    </Example>
  );
}

/* ── A windowed list whose rows wrap ───────────────────────────────────────── */

const DIARY = Array.from({ length: 400 }, (_, i) => ({
  id: i,
  text:
    i % 3 === 0
      ? `Day ${i + 1}: watered the north bed, tied in the tomatoes and pinched out the side shoots along the cane`
      : `Day ${i + 1}: watered`,
}));

function WindowedDemo() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useWindowedRows(DIARY.length, 32, scrollRef);
  return (
    <Example label="A windowed list whose rows wrap" hint="useWindowedRows measures each rendered row (§10.9)">
      <div ref={scrollRef} className="relative h-56 overflow-y-auto rounded-md border border-[var(--border)]">
        <div style={{ height: rows.totalHeight }} className="relative">
          {DIARY.slice(rows.first, rows.last).map((entry) => (
            <div
              key={entry.id}
              ref={rows.measureRef}
              data-row-index={entry.id}
              className="absolute inset-x-0 border-b border-[var(--border)] px-3 py-1.5 text-sm"
              style={{ top: rows.offsetOf(entry.id), minHeight: rows.estimate }}
            >
              {entry.text}
            </div>
          ))}
        </div>
      </div>
      <Note>
        A row is placed at `offsetOf(i)` with `minHeight: estimate` (`rowHeight × scale`),
        and `measureRef` hands its real height back, so a diary entry that wraps to three
        lines at Extra large pushes the next one down instead of being cut. MeasuredGrid
        does the same.
      </Note>
    </Example>
  );
}

export function TextSizeComponents032Demo() {
  return (
    <>
      <Example label="Pick a size" hint="the same store as the top bar's menu">
        <SizeSwitch />
      </Example>
      <ControlsDemo />
      <TooltipFactsDemo />
      <RowsDemo />
      <FormAndTileDemo />
      <ShellDemo />
      <WindowedDemo />
    </>
  );
}
