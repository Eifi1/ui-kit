import { useMemo, useState } from "react";
import { Archive } from "lucide-react";
import { Link, useLocation } from "react-router";
import {
  BooleanMark,
  Button,
  CopyButton,
  DataTable,
  SearchField,
  booleanColumn,
  dateFilter,
  filterHref,
  numberFilter,
  rowMatches,
  selectFilter,
  textFilter,
  useConfirm,
  useTableUrlState,
} from "@eifi1/ui-kit";
import type { DataTableColumn, DataTableRowAction } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * DATA TABLE 0.12 — per-row actions, the toolbar, the translated empty label, yes/no
 * columns and a copy button in a cell (the "data-table" page); and the owner-held URL
 * state with `filterHref` links and the filter builders (the "data-table-server" page).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

/* ── Tenants: rowActions, toolbar, empty, BooleanMark, CopyButton ──────────── */

interface Tenant {
  id: string;
  name: string;
  email: string;
  autopay: boolean;
  /** `null`: the check has not been run yet. */
  verified: boolean | null;
  /** A tenant with open arrears cannot be archived. */
  arrears: number;
}

const TENANTS: Tenant[] = [
  { id: "T-01", name: "Ada Brandt", email: "ada.brandt@example.com", autopay: true, verified: true, arrears: 0 },
  { id: "T-02", name: "Kemal Aydın", email: "kemal@example.org", autopay: false, verified: true, arrears: 420 },
  { id: "T-03", name: "Léa Moreau", email: "lea.moreau@example.fr", autopay: true, verified: null, arrears: 0 },
  { id: "T-04", name: "Zsófia Kiss", email: "zsofia.kiss@example.hu", autopay: false, verified: false, arrears: 0 },
  { id: "T-05", name: "Wang Fang", email: "wang.fang@example.cn", autopay: true, verified: true, arrears: 0 },
];

const TENANT_COLUMNS: DataTableColumn<Tenant>[] = [
  {
    key: "name",
    header: "Tenant",
    cell: (r) => r.name,
    sortBy: (r) => r.name.toLowerCase(),
    mobilePrimary: true,
  },
  {
    key: "email",
    header: "Email",
    cell: (r) => (
      <span className="inline-flex items-center gap-1">
        <span className="truncate">{r.email}</span>
        {/* No `tooltipPortal`: left unset, the Tooltip notices the table's data-clips
            scroller and portals itself, so the bubble is not cut off at the edge. */}
        <CopyButton text={r.email} label={`Copy ${r.email}`} size="2xs" stopPropagation />
      </span>
    ),
    className: "whitespace-nowrap",
  },
  booleanColumn<Tenant>({
    key: "autopay",
    header: "Autopay",
    value: (r) => r.autopay,
    // Mostly-true is news only when it is false: dashes read as "the rest".
    falseAs: "dash",
    filterOptions: { true: "On", false: "Off" },
  }),
  booleanColumn<Tenant>({
    key: "verified",
    header: "ID checked",
    value: (r) => r.verified,
    filterOptions: { true: "Checked", false: "Failed", unset: "Not yet" },
  }),
];

export function DataTableActionsDemo() {
  const confirm = useConfirm();
  const [rows, setRows] = useState(TENANTS);
  const [query, setQuery] = useState("");
  const [log, setLog] = useState("—");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const rowActions: DataTableRowAction<Tenant>[] = [
    { kind: "edit", onAction: (r) => setLog(`edit ${r.id}`) },
    {
      label: "Archive",
      icon: <Archive />,
      onAction: (r) => {
        setRows((all) => all.filter((x) => x.id !== r.id));
        setLog(`archived ${r.id}`);
      },
      disabledReason: (r) => (r.arrears > 0 ? `€${r.arrears} in arrears — settle before archiving` : undefined),
    },
    {
      kind: "delete",
      onAction: (r) => {
        setRows((all) => all.filter((x) => x.id !== r.id));
        setLog(`deleted ${r.id}`);
      },
      confirm: (r) =>
        confirm({
          title: `Delete ${r.name}?`,
          body: "The tenant and their payment history are removed. This cannot be undone.",
          confirmLabel: "Delete",
          tone: "danger",
        }),
    },
  ];

  return (
    <Example
      label="rowActions, toolbar and the empty label"
      hint={<>{code("rowActions")} · {code("toolbar")} · {code("booleanColumn")} · a {code("CopyButton")} in a cell</>}
    >
      <DataTable
        rows={visible}
        columns={TENANT_COLUMNS}
        rowKey={(r) => r.id}
        paginated={false}
        rowActions={rowActions}
        onRowClick={(r) => setLog(`row ${r.id} opened`)}
        toolbar={
          <>
            <SearchField
              variant="inline"
              aria-label="Search tenants"
              placeholder="Search tenants"
              value={query}
              onChange={setQuery}
              className="min-w-0 flex-1 basis-40"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRows(TENANTS);
                setQuery("");
              }}
            >
              Restore all
            </Button>
          </>
        }
      />
      <div className="mt-3 space-y-2">
        <p className={READOUT}>last: {log}</p>
        <OutTable
          rows={[
            ["BooleanMark value={true}", <BooleanMark key="t" value />],
            ["BooleanMark value={false}", <BooleanMark key="f" value={false} />],
            ['BooleanMark value={false} falseAs="dash"', <BooleanMark key="d" value={false} falseAs="dash" />],
            ["BooleanMark value={null}", <BooleanMark key="n" value={null} />],
          ]}
        />
        <Note>
          The pencil and the bin are the {code('kind: "edit"')} / {code('"delete"')} presets — icon, translated
          label and tone included; <em>Archive</em> states its own label and icon, and is locked with a{" "}
          {code("disabledReason")} for Kemal, who owes rent. The delete runs only after{" "}
          {code("useConfirm()")} says yes. A press on an action never opens the row. On a phone the column
          disappears and the same actions become the card&apos;s swipes.
        </Note>
        <Note>
          The search lives in the {code("toolbar")}, inside the table&apos;s frame. Type{" "}
          {code("nobody")} — the empty body now says {code("labels.empty")} (&ldquo;No entries&rdquo;, in the
          page&apos;s language) instead of a bare dash. {code("booleanColumn")} gives each yes/no column a
          check-first sort and a Yes/No filter; the screen reader hears the word, not a glyph. Hover a copy
          button: its tooltip leaves the scroller rather than being clipped by it.
        </Note>
      </div>
    </Example>
  );
}

/* ── Units: useTableUrlState + filterHref + the filter builders ────────────── */

type Occupancy = "vacant" | "let" | "notice";

interface Unit {
  id: string;
  unit: string;
  tenant: string;
  occupancy: Occupancy;
  furnished: boolean;
  rent: number;
  /** ISO date the unit is free from, or null. */
  free: string | null;
}

const OCCUPANCY_LABEL: Record<Occupancy, string> = {
  vacant: "Vacant",
  let: "Let",
  notice: "Under notice",
};

const UNITS: Unit[] = Array.from({ length: 23 }, (_, i) => {
  const occupancy: Occupancy = i % 5 === 0 ? "vacant" : i % 7 === 3 ? "notice" : "let";
  const month = String((i % 12) + 1).padStart(2, "0");
  return {
    id: `U-${i + 1}`,
    unit: `${Math.floor(i / 4) + 1}${"ABCD"[i % 4]}`,
    tenant: occupancy === "vacant" ? "" : ["Brandt", "Aydın", "Moreau", "Kiss", "Wang", "Rossi", "Novak"][i % 7],
    occupancy,
    furnished: i % 3 === 0,
    rent: 780 + ((i * 137) % 900),
    free: occupancy === "let" ? null : `2026-${month}-01`,
  };
});

const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const UNIT_COLUMNS: DataTableColumn<Unit>[] = [
  {
    key: "unit",
    header: "Unit",
    cell: (r) => <span className="font-medium">{r.unit}</span>,
    sortBy: (r) => r.id.length * 100 + Number(r.id.slice(2)),
    filter: textFilter((r) => r.unit),
    mobilePrimary: true,
  },
  {
    key: "tenant",
    header: "Tenant",
    cell: (r) => r.tenant || <span className="text-[var(--text-muted)]">—</span>,
    sortBy: (r) => r.tenant || null,
    filter: textFilter((r) => r.tenant),
  },
  {
    key: "occupancy",
    header: "Occupancy",
    cell: (r) => OCCUPANCY_LABEL[r.occupancy],
    sortBy: (r) => r.occupancy,
    // A server-paged select filter must declare its options: a { value: label } map.
    filter: selectFilter((r) => r.occupancy, OCCUPANCY_LABEL),
  },
  booleanColumn<Unit>({
    key: "furnished",
    header: "Furnished",
    value: (r) => r.furnished,
    falseAs: "dash",
    filterOptions: { true: "Furnished", false: "Unfurnished" },
  }),
  {
    key: "free",
    header: "Free from",
    cell: (r) => <span className="tabular-nums">{r.free ?? "—"}</span>,
    sortBy: (r) => r.free,
    filter: dateFilter((r) => r.free),
    className: "whitespace-nowrap",
  },
  {
    key: "rent",
    header: "Rent",
    cell: (r) => EUR.format(r.rent),
    sortBy: (r) => r.rent,
    filter: numberFilter((r) => r.rent),
    className: "text-end tabular-nums whitespace-nowrap",
    headClassName: "text-end",
  },
];

/** A pretend server: filter, sort and slice what the owner's state asks for. */
function queryUnits(state: ReturnType<typeof useTableUrlState>) {
  let rows = UNITS.filter((r) =>
    UNIT_COLUMNS.every((col) => {
      const f = state.filters[col.key];
      return !f || rowMatches(col, r, f);
    }),
  );
  const q = state.search.trim().toLowerCase();
  if (q) rows = rows.filter((r) => `${r.unit} ${r.tenant}`.toLowerCase().includes(q));
  for (const s of [...state.sorts].reverse()) {
    const col = UNIT_COLUMNS.find((c) => c.key === s.key);
    if (!col?.sortBy) continue;
    const by = col.sortBy;
    rows = [...rows].sort((a, b) => {
      const x = by(a);
      const y = by(b);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      const c = x < y ? -1 : x > y ? 1 : 0;
      return s.dir === "asc" ? c : -c;
    });
  }
  const size = state.pageSize === Infinity ? rows.length : state.pageSize;
  return { total: rows.length, rows: rows.slice(state.page * size, state.page * size + size) };
}

/** The table and its owner. Keyed by the parent so a `filterHref` link remounts it —
 *  the URL is read once, on mount, exactly as with `urlSync`. */
/** The `urlSync` table above uses the unprefixed keys; this one keeps its own. */
const UNITS_PREFIX = "units.";

function UnitsTable() {
  const state = useTableUrlState<Unit>({
    columns: UNIT_COLUMNS,
    defaultPageSize: 5,
    search: true,
    urlPrefix: UNITS_PREFIX,
  });
  const { rows, total } = queryUnits(state);
  return (
    <>
      <DataTable
        rows={rows}
        columns={UNIT_COLUMNS}
        rowKey={(r) => r.id}
        {...state.tableProps(total)}
        toolbar={
          <SearchField
            variant="inline"
            aria-label="Search units"
            placeholder="Search units (units.q)"
            value={state.search}
            onChange={state.setSearch}
            className="min-w-0 flex-1 basis-40"
          />
        }
      />
      <div className="mt-3">
        <OutTable
          rows={[
            ["page · pageSize", `${state.page} · ${state.pageSize}`],
            ["filters", JSON.stringify(state.filters)],
            ["sorts", JSON.stringify(state.sorts)],
            ["search", JSON.stringify(state.search)],
          ]}
        />
      </div>
    </>
  );
}

export function DataTableUrlFiltersDemo() {
  const location = useLocation();
  const { pathname, search } = location;
  // A `filterHref` link carries a fresh seed in its route state; the table is keyed by
  // it, so following a link remounts the table and it reads the new filter. The hook
  // carries the route state over its own `replace` writes, so the key holds still.
  const seed = (location.state as { unitsSeed?: number } | null)?.unitsSeed ?? 0;
  const links: Array<[string, string]> = [
    ["Vacant units", filterHref(pathname, "occupancy", ["vacant"], { prefix: UNITS_PREFIX })],
    ["Vacant or under notice", filterHref(pathname, "occupancy", ["vacant", "notice"], { prefix: UNITS_PREFIX })],
    ["Furnished", filterHref(pathname, "furnished", ["true"], { prefix: UNITS_PREFIX })],
    ["Tenant “Kiss”", filterHref(pathname, "tenant", "Kiss", { prefix: UNITS_PREFIX })],
    ["Rent €1,000–1,400", filterHref(pathname, "rent", { type: "number", min: "1000", max: "1400", abs: false }, { prefix: UNITS_PREFIX })],
    ["Free in the first half of 2026", filterHref(pathname, "free", { type: "date", from: "2026-01-01", to: "2026-06-30" }, { prefix: UNITS_PREFIX })],
  ];
  return (
    <Example
      label="useTableUrlState, filterHref and the filter builders"
      hint={<>{code("textFilter")} · {code("selectFilter")} · {code("dateFilter")} · {code("numberFilter")} · {code("booleanColumn")}</>}
    >
      <Row className="mb-3 gap-x-4 gap-y-1">
        {links.map(([label, href]) => (
          <Link
            key={label}
            to={href}
            state={{ unitsSeed: seed + 1 }}
            className="text-sm text-[var(--brand)] underline underline-offset-2"
          >
            {label}
          </Link>
        ))}
        <Link to={pathname} state={{ unitsSeed: seed + 1 }} className="text-sm text-[var(--text-secondary)] underline underline-offset-2">
          No filter
        </Link>
      </Row>
      <UnitsTable key={seed} />
      <div className="mt-3 space-y-2">
        <OutTable
          rows={[
            ["location.search", search || "—"],
            ...links.slice(0, 3).map(([, href]): [string, string] => ["filterHref(…)", href]),
          ]}
        />
        <Note>
          A {code("serverPagination")} table owns none of its state: {code("useTableUrlState")} holds the
          filters, sorts, page, page size and (with {code("search: true")}) the {code("q")} term, writes them
          into the address in the table&apos;s own scheme, and hands the table everything it needs through{" "}
          {code("tableProps(total)")}. The owner turns that state into its query — here a pretend server
          that filters with {code("rowMatches")}. Any change but the page itself goes back to page 1.
        </Note>
        <Note>
          The links are {code("filterHref(path, column, value, { prefix })")}: a string is a text filter, an
          array a select filter, and any {code("FilterValue")} works for dates and numbers — the link a
          dashboard tile or another page would write to open this list pre-filtered. This page has a second
          URL-synced table above, so this one is namespaced with {code('urlPrefix: "units."')}: its keys
          are {code("units.f.<column>")}, {code("units.sort")}, {code("units.p")}, {code("units.ps")} and{" "}
          {code("units.q")}, and the two tables no longer share a sort or a page.
        </Note>
      </div>
    </Example>
  );
}
