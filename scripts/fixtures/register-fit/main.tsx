/**
 * keksdose's register, as the kit sees it (keksdose register fit, 0.51.2 leftovers): a
 * `virtualize`d DataTable with keksdose's columns and `fitPriority` (Memo 1, Accounts 2,
 * Status 3, Category 4; Payee `grow`; Flag hidden by default; a row-actions column), its
 * selection, its sticky leading row, its period → day bands and `loadMore`, at
 * `density="compact"`, filling the height under a page header. Measured by
 * scripts/register-fit-frames.mjs, which loads it N times per width and logs every frame.
 *
 * What arrives as it does in the app, each at its own random moment per load (the
 * timings are written to `window.__fixture` for the log):
 * - the scheduled previews (keksdose's rules query: two overdue rows) and the
 *   transactions (400 rows) — two requests, either may answer first;
 * - the summary tiles above the table, which move its top (and with `fillHeight`, its
 *   height): what the virtual window sees as the visible part when it first looks;
 * - the period totals in the bands' end slots, after the rows;
 * - with `?font=web`, a web font with `font-display: swap` (the harness serves it late):
 *   every width in the table changes when it lands. keksdose itself uses the system font.
 *
 * The rows' content is the same on every load (data.ts, seeded); only the timing varies.
 * `?rows=` sets the count, `?seed=` and `?monthly=` the content. `window.__edit()` is the
 * harness's edit (keksdose N2: a refetch of the same rows, the first one wider), and
 * `?start=edited` loads that content from the start.
 */
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { Check, CircleDashed, Lock, Pencil, Trash2 } from "lucide-react";
import { Chip, DataTable, Disclosure, Tooltip, rowActionsColumn } from "../../../src/index";
import type { DataTableColumn, DataTableGroupBy } from "../../../src/index";
import { FILL_HEIGHT_CLASS, FillHeight } from "../../../src/shell/fill-height";
import {
  ACCOUNTS,
  CATEGORIES,
  MORTGAGE_ACCOUNT,
  MORTGAGE_CATEGORY,
  PREVIEWS,
  YEARLY_CATEGORY,
  edited,
  makeRows,
  merge,
} from "./data";
import type { Txn } from "./data";
import "./app.css";

const params = new URLSearchParams(location.search);
const ROW_COUNT = Number(params.get("rows") ?? 400);
const SEED = Number(params.get("seed") ?? 3);
// Seed 3 with the mortgage on the 20th: its first row is the 35th on screen (index 34),
// at the edge of what 0.51.2's window drew first, 33 or 35 rows (data.ts).
const MONTHLY = Number(params.get("monthly") ?? 20);

/** The moments things arrived, ms from the module's start: read back by the harness. */
const fixture: Record<string, number> = {};
(window as unknown as { __fixture: typeof fixture }).__fixture = fixture;
const t0 = performance.now();
const mark = (name: string) => (fixture[name] = Math.round(performance.now() - t0));
const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

if (params.get("font") === "web") {
  // The harness serves /font.woff2 late (its `--font-delay`); swap draws the fallback first.
  const style = document.createElement("style");
  style.textContent =
    '@font-face{font-family:"Fixture Sans";src:url(/font.woff2) format("woff2");font-display:swap}' +
    'html{font-family:"Fixture Sans",ui-sans-serif,system-ui,sans-serif}';
  document.head.append(style);
  // When it lands: the load starts with the first text drawn in it, not here.
  document.fonts.addEventListener("loadingdone", () => mark("font"));
}

const LOADED = makeRows(ROW_COUNT, SEED, MONTHLY);
// `?start=edited`: the edit's content from the start, what a fresh load of it shows.
const ALL_ROWS = params.get("start") === "edited" ? edited(LOADED) : LOADED;

const money = (tx: Txn) =>
  new Intl.NumberFormat("de-CH", { style: "currency", currency: tx.currency }).format(tx.amount);
const monthOf = (date: string) => date.slice(0, 7);
const monthLabel = (key: string) =>
  new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${key}-01T00:00:00Z`),
  );
const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

// ---- The columns: keksdose's use-transaction-columns.tsx, its cells reduced to their widths ----

function StatusCell({ tx }: { tx: Txn }) {
  // keksdose's pill: a glyph and the word; a preview's "run now"; "Invoice" beside a receipt.
  const Icon = tx.status === "reconciled" ? Lock : tx.status === "cleared" ? Check : CircleDashed;
  const pill = tx.preview ? (
    <button type="button" className="rounded-full border border-strong px-2 text-xs whitespace-nowrap">
      Run now
    </button>
  ) : (
    <button type="button" className="inline-flex items-center gap-1 rounded-full px-1.5 text-xs whitespace-nowrap">
      <Icon aria-hidden className="size-3" />
      {tx.status === "reconciled" ? "Reconciled" : tx.status === "cleared" ? "Cleared" : "Uncleared"}
    </button>
  );
  if (!tx.receipt) return pill;
  return (
    <div className="flex items-center gap-3">
      {pill}
      <span className="text-xs whitespace-nowrap text-muted">Invoice</span>
    </div>
  );
}

function CategoryCell({ tx }: { tx: Txn }) {
  if (tx.kind === "split")
    return (
      <Chip size="sm" shape="square" tone="purple" className="py-0">
        Split · 3
      </Chip>
    );
  if (tx.kind === "transfer")
    return (
      <Chip size="sm" shape="square" tone="info" className="py-0">
        Transfer
      </Chip>
    );
  return <span className="whitespace-nowrap">{tx.category}</span>;
}

function useColumns(): DataTableColumn<Txn>[] {
  return useMemo<DataTableColumn<Txn>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        // Under the bands only as wide as its header (keksdose UX-2.4): a preview's marker.
        headClassName: "w-px whitespace-nowrap",
        cell: (tx) =>
          tx.preview ? (
            <Chip size="sm" tone="warning" className="py-0">
              overdue
            </Chip>
          ) : null,
        sortBy: (tx) => tx.date,
        filter: { type: "date", getValue: (tx) => tx.date },
      },
      {
        key: "account",
        header: "Accounts",
        fitPriority: 2,
        cell: (tx) => (
          <Tooltip label={tx.account}>
            <span className="block max-w-[16rem] truncate">{tx.account}</span>
          </Tooltip>
        ),
        sortBy: (tx) => tx.account,
        filter: {
          type: "select",
          getValue: (tx) => tx.account,
          options: [...ACCOUNTS, MORTGAGE_ACCOUNT].map((a) => ({ value: a, label: a })),
        },
      },
      {
        key: "payee",
        header: "Payee",
        grow: true,
        cell: (tx) => (
          <span className="flex items-center gap-1">
            <Tooltip label={tx.payee} className="min-w-0">
              <span className="block min-w-0 truncate">{tx.payee}</span>
            </Tooltip>
          </span>
        ),
        sortBy: (tx) => tx.payee,
        filterBy: (tx) => tx.payee,
      },
      {
        key: "category",
        header: "Category",
        fitPriority: 4,
        cell: (tx) => <CategoryCell tx={tx} />,
        sortBy: (tx) => tx.category ?? "",
        filter: {
          type: "select",
          getValue: (tx) => tx.category ?? tx.kind,
          options: [...CATEGORIES, MORTGAGE_CATEGORY, YEARLY_CATEGORY].map((c) => ({ value: c, label: c })),
        },
      },
      {
        key: "memo",
        header: "Memo",
        fitPriority: 1,
        cell: (tx) =>
          tx.memo ? (
            <Tooltip label={tx.memo}>
              <span className="block max-w-[10rem] truncate text-muted">{tx.memo}</span>
            </Tooltip>
          ) : null,
        filterBy: (tx) => tx.memo,
      },
      {
        key: "status",
        header: "Status",
        fitPriority: 3,
        cell: (tx) => <StatusCell tx={tx} />,
        sortBy: (tx) => tx.status,
        filter: {
          type: "select",
          getValue: (tx) => tx.status,
          options: [
            { value: "uncleared", label: "Uncleared" },
            { value: "cleared", label: "Cleared" },
            { value: "reconciled", label: "Reconciled" },
          ],
        },
      },
      {
        key: "flag",
        header: "Flag",
        className: "w-8",
        defaultHidden: true,
        cell: () => null,
      },
      {
        key: "amount",
        header: "Amount",
        headClassName: "text-end",
        className: "text-end whitespace-nowrap",
        cell: (tx) => <span className={tx.preview ? "text-muted" : undefined}>{money(tx)}</span>,
        sortBy: (tx) => tx.amount,
        filter: { type: "number", getValue: (tx) => tx.amount },
      },
      rowActionsColumn<Txn>({
        key: "swipe_actions",
        headerText: "Actions",
        size: "2xs",
        tooltipSide: "start",
        name: (tx) => tx.payee,
        actions: () => [
          { key: "edit", label: "Edit", icon: Pencil, onSelect: () => {} },
          { key: "delete", label: "Delete", icon: Trash2, tone: "danger", confirm: false, onSelect: () => {} },
        ],
        column: { mobileHidden: true },
      }),
    ],
    [],
  );
}

// ---- The page ----

function Tiles() {
  return (
    <div className="mb-4 grid grid-cols-3 gap-3">
      {["Balance", "In this month", "Out this month"].map((label) => (
        <div key={label} className="rounded-lg border border-subtle bg-surface p-3">
          <div className="text-xs text-muted">{label}</div>
          <div className="text-lg font-semibold">CHF 12’345.60</div>
        </div>
      ))}
    </div>
  );
}

function Register() {
  const columns = useColumns();
  const [txns, setTxns] = useState<Txn[] | null>(null);
  const [previews, setPreviews] = useState<Txn[] | null>(null);
  const [tiles, setTiles] = useState(false);
  const [totals, setTotals] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  // Two requests, the tiles and the totals, each at its own moment (the module doc).
  useEffect(() => {
    const timers = [
      setTimeout(() => (mark("previews"), setPreviews(PREVIEWS)), between(100, 600)),
      setTimeout(
        () => {
          mark("rows");
          setTxns(ALL_ROWS);
          timers.push(setTimeout(() => (mark("totals"), setTotals(true)), between(50, 400)));
        },
        between(300, 1100),
      ),
      setTimeout(() => (mark("tiles"), setTiles(true)), between(100, 1200)),
    ];
    // The harness's edit (keksdose N2): a refetch with the same rows, one of them wider.
    (window as unknown as { __edit: () => void }).__edit = () => (mark("edit"), setTxns(edited(LOADED)));
    return () => timers.forEach(clearTimeout);
  }, []);

  // keksdose merges the previews into the loaded rows, by date (newest first).
  const rows = useMemo(() => merge(txns, previews), [txns, previews]);

  const groupBy = useMemo(() => {
    const period: DataTableGroupBy<Txn> = {
      key: (tx) => monthOf(tx.date),
      label: (key) => monthLabel(key),
      end: (_key, groupRows) =>
        totals ? (
          <span className="tabular-nums">
            {groupRows.length} · +8’782.30 · −{groupRows.length * 31}’200.10
          </span>
        ) : null,
    };
    const day: DataTableGroupBy<Txn> = {
      key: (tx) => tx.date,
      label: (key) => dayLabel(key),
      end: (_key, groupRows) => `${groupRows.length} transaction${groupRows.length === 1 ? "" : "s"}`,
    };
    return [period, day] as const;
  }, [totals]);

  return (
    <FillHeight className="py-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold">Transactions</h1>
      {tiles && <Tiles />}
      <div className={FILL_HEIGHT_CLASS}>
        <DataTable<Txn>
          fillHeight
          rows={rows}
          rowKey={(tx) => tx.id}
          empty="None"
          leadingRow={<Disclosure variant="bare" title="3 upcoming" open={false} onOpenChange={() => {}} />}
          leadingRowSticky
          selection={{
            isSelectable: (tx) => !tx.preview,
            isSelected: (tx) => selected.has(tx.id),
            onToggle: (tx, on) =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (on) next.add(tx.id);
                else next.delete(tx.id);
                return next;
              }),
            allSelected: false,
            someSelected: selected.size > 0,
            onToggleAll: (on) => setSelected(new Set(on ? rows.filter((tx) => !tx.preview).map((tx) => tx.id) : [])),
          }}
          groupBy={groupBy}
          loadMore={{ hasMore: true, onLoadMore: () => {}, label: "Load July 2026" }}
          virtualize
          density="compact"
          columns={columns}
        />
      </div>
    </FillHeight>
  );
}

/** keksdose's shell, reduced to what takes width: a sidebar and the page's padding. The
 *  harness sizes the sidebar (`?nav=`) so the table's scroller is the viewport less 367px,
 *  keksdose's at 1124, 1280 and 1440 (757, 913, 1073). */
function Shell() {
  return (
    <div className="flex h-dvh bg-page text-primary">
      <nav className="shrink-0 border-e border-subtle bg-surface" style={{ width: Number(params.get("nav") ?? 302) }} />
      <main className="flex min-w-0 flex-1 flex-col overflow-auto">
        <Register />
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <Shell />
    </MemoryRouter>
  </StrictMode>,
);
