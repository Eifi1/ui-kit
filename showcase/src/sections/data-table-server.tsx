import { useMemo, useRef, useState } from "react";
import { Archive, Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import {
  Button,
  DataTable,
  cn,
  encodeFilterValue,
  encodeSorts,
  isFilterActive,
  rowMatches,
} from "@eifi1/ui-kit";
import type {
  DataTableColumn,
  FilterState,
  MobileSwipeActions,
  SortState,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";
import {
  Amount,
  AMOUNT_COL,
  AMOUNT_FMT,
  CallbackLog,
  COLUMNS,
  NAME_COL,
  OPENED_COL,
  ROWS,
  SMALL_COLUMNS,
  SMALL_ROWS,
  STATUS_COL,
  STATUS_LABEL,
  STATUS_ORDER,
  j,
  useCallbackLog,
} from "./data-table-fixture";
import type { Status, TableRow } from "./data-table-fixture";

/**
 * DATA TABLE: SERVER, URL & PHONE — the three shapes in which the table does not own
 * everything itself: the view mirrored into the address (`urlSync`), the rows owned by
 * a server (`serverPagination`), and the phone layout of cards, groups and swipe
 * actions. Shared fixture: data-table-fixture.tsx.
 */
export function DataTableServerSection() {
  return (
    <>
      <UrlSyncTable />
      <ServerTable />
      <PhoneTable />
    </>
  );
}

/* ── urlSync ─────────────────────────────────────────────────────────────── */


function UrlSyncTable() {
  // Sort is CONTROLLED here (`sorts` + `onSortsChange`), which is the other half
  // worth seeing: the table renders the array it is handed and reports clicks
  // back, and urlSync mirrors that same array. One source, two readouts.
  const [sorts, setSorts] = useState<SortState[]>([{ key: "amount", dir: "desc" }]);
  const { search } = useLocation();
  const navigate = useNavigate();
  // Bumped to remount the table, which is the only moment it reads the address.
  const [mount, setMount] = useState(0);
  // What a shared link would carry: Status filtered to "open", page size 25. (Not a
  // sort — sort is controlled here, so the page's `sorts` wins over the URL's.)
  const sharedQuery = `?f.status=${encodeURIComponent(
    encodeFilterValue({ type: "select", values: ["open"] }) ?? "",
  )}&ps=25`;

  return (
    <Example
      label="urlSync — the view lives in the address"
      hint="sort, filter or page this table and watch the hash query below change"
    >
      <Row className="mb-3">
        <Button
          variant="secondary"
          className="px-2 py-1 text-xs"
          onClick={() => {
            navigate({ search: sharedQuery }, { replace: true });
            setMount((m) => m + 1);
          }}
        >
          Open a shared link (Status = Open, 25 per page)
        </Button>
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setMount((m) => m + 1)}>
          Remount — read the address again
        </Button>
      </Row>
      <DataTable
        key={mount}
        rows={SMALL_ROWS}
        columns={SMALL_COLUMNS}
        rowKey={(r) => r.id}
        urlSync
        defaultPageSize={10}
        sorts={sorts}
        onSortsChange={setSorts}
        // No `labels` prop: the showcase's <UiKitProvider> hands every table on the page
        // the active language, including the calendar inside the date filter, which a
        // prop at this call site could never reach.
      />

      <div className="mt-3 space-y-2">
        <OutTable
          rows={[
            ["location.search", search || "— (defaults: nothing to say)"],
            ["sorts (controlled)", JSON.stringify(sorts)],
            ["managed params", "f.<column>, sort, p, ps"],
          ]}
        />
        <Note>
          Only non-default state is written: page 1 drops <code className="font-mono">p</code>
          , a page size equal to <code className="font-mono">defaultPageSize</code> drops{" "}
          <code className="font-mono">ps</code>, and a filter at its empty value drops{" "}
          <code className="font-mono">f.&lt;column&gt;</code> — so an untouched table leaves
          the URL alone. Every write is <code className="font-mono">replace: true</code>:
          sorting a table is not a history entry you want to press Back through.
        </Note>
        <Note>
          The URL is read exactly <em>once</em>, on mount, and only ever written afterwards.
          That is what stops the browser's own history fighting the user's next click — but
          it also means editing the address by hand does nothing until the table remounts
          (a reload, or the <em>Remount</em> button above).
        </Note>
        <Note>
          The showcase runs under <code className="font-mono">HashRouter</code>, where the
          router&apos;s query lives after the <code className="font-mono">#</code> (
          <code className="font-mono">#/data-table-server?f.status=…</code>) and{" "}
          <code className="font-mono">window.location.search</code> is empty. The table reads{" "}
          <em>and</em> writes through <code className="font-mono">useSearchParams</code>, so
          the round trip works under every router: <em>Open a shared link</em> puts a filter
          and a page size into the hash and remounts, and the table opens filtered on 25 rows
          per page.
        </Note>
      </div>
    </Example>
  );
}

/* ── serverPagination ────────────────────────────────────────────────────── */

/** A pretend 70-row server: the same fixture three times over, with fresh ids. */
const SERVER_ROWS: TableRow[] = [0, 1, 2].flatMap((batch) =>
  ROWS.slice(0, batch === 2 ? 20 : ROWS.length).map((r, i) => ({
    ...r,
    id: `S-${String(batch * 100 + i + 1).padStart(3, "0")}`,
    name: batch === 0 ? r.name : `${r.name} ${batch + 1}`,
  })),
);

const SERVER_COLUMNS: DataTableColumn<TableRow>[] = [NAME_COL, OPENED_COL, STATUS_COL, AMOUNT_COL];

interface ServerQuery {
  page: number;
  pageSize: number;
  filters: FilterState;
  sorts: SortState[];
}

/** What the "backend" does with a query — built from the kit's own pure helpers,
 *  which is also how a real server-side port would stay in step with the client. */
function runQuery(q: ServerQuery): { rows: TableRow[]; total: number } {
  let rows = SERVER_ROWS;
  for (const col of SERVER_COLUMNS) {
    const state = q.filters[col.key];
    if (state && isFilterActive(state)) rows = rows.filter((r) => rowMatches(col, r, state));
  }
  if (q.sorts.length) {
    rows = [...rows].sort((a, b) => {
      for (const s of q.sorts) {
        const by = SERVER_COLUMNS.find((c) => c.key === s.key)?.sortBy;
        if (!by) continue;
        const av = by(a) ?? "";
        const bv = by(b) ?? "";
        if (av < bv) return s.dir === "asc" ? -1 : 1;
        if (av > bv) return s.dir === "asc" ? 1 : -1;
      }
      return 0;
    });
  }
  const total = rows.length;
  if (q.pageSize === Infinity) return { rows, total };
  return { rows: rows.slice(q.page * q.pageSize, (q.page + 1) * q.pageSize), total };
}

function queryString(q: ServerQuery): string {
  const sp = new URLSearchParams();
  sp.set("page", String(q.page));
  sp.set("size", q.pageSize === Infinity ? "all" : String(q.pageSize));
  const sort = encodeSorts(q.sorts);
  if (sort) sp.set("sort", sort);
  for (const [key, value] of Object.entries(q.filters)) {
    const enc = encodeFilterValue(value);
    if (enc != null) sp.set(`f.${key}`, enc);
  }
  return `GET /rows?${decodeURIComponent(sp.toString())}`;
}

const INITIAL_QUERY: ServerQuery = { page: 0, pageSize: 10, filters: {}, sorts: [] };

function ServerTable() {
  const [query, setQuery] = useState<ServerQuery>(INITIAL_QUERY);
  const [result, setResult] = useState(() => runQuery(INITIAL_QUERY));
  const [loading, setLoading] = useState(false);
  const [takeOver, setTakeOver] = useState(true);
  const [sizeIsOurs, setSizeIsOurs] = useState(true);
  const latest = useRef(0);
  const { log, record } = useCallbackLog(3);

  // Every change is a round trip: the table shows the old page until the new one
  // arrives 600ms later, exactly as it would over a network.
  const request = (patch: Partial<ServerQuery>, what: string) => {
    record(what);
    const next = { ...query, ...patch };
    setQuery(next);
    setLoading(true);
    const id = ++latest.current;
    window.setTimeout(() => {
      if (id !== latest.current) return; // a newer request superseded this one
      setResult(runQuery(next));
      setLoading(false);
    }, 600);
  };

  // A first load: nothing on screen yet, so the table shows its loading row instead
  // of the empty text ("no results" is a claim it cannot make while the page is out).
  const coldStart = () => {
    setResult({ rows: [], total: 0 });
    request({ page: 0, filters: {}, sorts: [] }, "cold start (first page in flight)");
  };

  return (
    <Example
      label="serverPagination — the server owns the rows"
      hint="600ms simulated latency · uncheck the toggle to see the sort and filter controls disappear"
    >
      <Row className="mb-3 justify-between">
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={takeOver}
            onChange={(e) => {
              setTakeOver(e.target.checked);
              request({ page: 0, filters: {}, sorts: [] }, `takeOver = ${e.target.checked}`);
            }}
          />
          pass onFiltersChange / onSortsChange
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={sizeIsOurs}
            onChange={(e) => {
              setSizeIsOurs(e.target.checked);
              if (!e.target.checked) request({ pageSize: 10, page: 0 }, "server fixes pageSize = 10");
            }}
          />
          pass onPageSizeChange
        </label>
        <Button variant="secondary" className="px-2 py-1 text-xs" onClick={coldStart}>
          Cold start
        </Button>
        <span
          role="status"
          className={cn("text-xs", loading ? "text-[var(--brand)]" : "text-[var(--text-muted)]")}
        >
          {loading ? "request in flight…" : `${result.total} rows on the server`}
        </span>
      </Row>

      <DataTable
        rows={result.rows}
        columns={SERVER_COLUMNS}
        rowKey={(r) => r.id}
        maxBodyHeight="18rem"
        serverPagination={{
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          isLoading: loading,
          onPageChange: (page) => request({ page }, `onPageChange(${page})`),
          // Omitted, the pager renders no page-size select at all — the server's size
          // is not the user's to change, and a select that changed nothing would lie.
          onPageSizeChange: sizeIsOurs
            ? (pageSize) => request({ pageSize, page: 0 }, `onPageSizeChange(${pageSize})`)
            : undefined,
        }}
        {...(takeOver
          ? {
              filters: query.filters,
              // The page reset on a new filter is the owner's job in this mode.
              onFiltersChange: (filters: FilterState) =>
                request({ filters, page: 0 }, `onFiltersChange(${j(filters)})`),
              sorts: query.sorts,
              onSortsChange: (sorts: SortState[]) =>
                request({ sorts, page: 0 }, `onSortsChange(${j(sorts)})`),
            }
          : {})}
        empty="The server returned no rows for this query."
      />

      <div className="mt-3 space-y-2">
        <OutTable rows={[["request", queryString(query)]]} />
        <CallbackLog log={log} />
        <Note>
          In this mode the table renders <code className="font-mono">rows</code> as-is — no
          filtering, sorting or slicing — and the footer is driven by{" "}
          <code className="font-mono">page</code> / <code className="font-mono">pageSize</code>{" "}
          / <code className="font-mono">total</code>. Sort arrows and filter funnels only
          appear when the page takes them over; unchecked above, the headers are plain text.
          On a phone the pager stays (there is no endless scroll over rows that are not here).
        </Note>
        <Note>
          <code className="font-mono">serverPagination.isLoading</code> is the only loading
          signal this table gets — there is no <code className="font-mono">rowClassName</code>{" "}
          here. While a page is in flight the table sets{" "}
          <code className="font-mono">aria-busy</code> and dims the rows it still shows (they
          are the previous page&apos;s, about to go); <em>Cold start</em> empties the table
          first, and then it shows a spinner with “Loading…” instead of the{" "}
          <code className="font-mono">empty</code> text. The pager stays usable during a
          fetch, so focus never drops off the button just pressed. Uncheck{" "}
          <em>pass onPageSizeChange</em> and the page-size select disappears.
        </Note>
      </div>
    </Example>
  );
}

/* ── the phone layout ───────────────────────────────────────────────────── */

/** Pre-sorted by status, then name: `mobileGroupBy` groups CONSECUTIVE rows. */
const BY_STATUS = [...ROWS].sort(
  (a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    a.name.localeCompare(b.name),
);

function PhoneTable() {
  const [statusById, setStatusById] = useState<Record<string, Status>>({});
  const [compact, setCompact] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rtl, setRtl] = useState(false);
  const { log, record } = useCallbackLog(3);

  const rows = useMemo(() => {
    const withOverrides = BY_STATUS.map((r) => ({ ...r, status: statusById[r.id] ?? r.status }));
    return withOverrides.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        a.name.localeCompare(b.name),
    );
  }, [statusById]);

  const setStatus = (r: TableRow, s: Status) => {
    record(`${r.name} → ${STATUS_LABEL[s]}`);
    setStatusById((m) => ({ ...m, [r.id]: s }));
  };

  // Logical sides: `end` is a drag toward the reading end (right in LTR, left in RTL).
  const swipe = (r: TableRow): MobileSwipeActions | null => {
    // A row that must not move returns null — here the archived ones.
    if (r.status === "archived") return null;
    return {
      end: [
        {
          label: "Done",
          icon: <Check className="size-4" />,
          onCommit: () => setStatus(r, "done"),
          className: "bg-[var(--money-neutral)]",
          armedClassName: "bg-[var(--money-income)]",
        },
      ],
      start: [
        {
          label: "Archive",
          icon: <Archive className="size-4" />,
          onCommit: () => setStatus(r, "archived"),
          className: "bg-[var(--money-neutral)]",
          armedClassName: "bg-[var(--money-expense)]",
        },
      ],
    };
  };

  return (
    <Example
      label="Phone layout — mobileCard, mobileGroupBy, mobileSwipeActions"
      hint="below 768px only: narrow the window or open the screen-size preview in the top bar"
    >
      <Row className="mb-3 justify-between">
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} />
          custom <code className="font-mono">mobileCard</code>
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
          right-to-left
        </label>
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          disabled={Object.keys(statusById).length === 0}
          onClick={() => setStatusById({})}
        >
          Undo swipes
        </Button>
      </Row>
      <div dir={rtl ? "rtl" : "ltr"}>
        <DataTable
          rows={rows}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          defaultPageSize={8}
          maxBodyHeight="18rem"
          onRowClick={(r) => setExpandedId((cur) => (cur === r.id ? null : r.id))}
          isExpanded={(r) => r.id === expandedId}
          // Inline on the phone this time (no mobileExpandAsDialog): the chevron points
          // down and flips when the panel is open.
          expandedRow={(r) => (
            <span className="text-xs text-[var(--text-secondary)]">
              {r.id} · opened {r.opened} · {AMOUNT_FMT.format(r.amount)}
            </span>
          )}
          mobileGroupBy={(r) => r.status}
          mobileGroupLabel={(key) => (
            <span className="inline-flex items-center gap-2">
              {STATUS_LABEL[key as Status]}
              <span className="font-normal normal-case tracking-normal">
                ({rows.filter((r) => r.status === key).length})
              </span>
            </span>
          )}
          mobileCard={
            compact
              ? (r) => (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block text-xs text-[var(--text-muted)]">{r.opened}</span>
                    </span>
                    <span className="tabular-nums">
                      <Amount value={r.amount} />
                    </span>
                  </div>
                )
              : undefined
          }
          mobileSwipeActions={swipe}
          rowClassName={(r) => (r.status === "archived" ? "opacity-60" : undefined)}
        />
      </div>
      <div className="mt-3 space-y-2">
        <CallbackLog log={log} />
        <Note>
          On a phone the table becomes a card list and never both — the desktop header, the
          column rail and selection are not rendered at all. Filters move into a{" "}
          <em>Filters</em> bar that opens a bottom sheet; paging becomes endless scroll that
          reveals <code className="font-mono">defaultPageSize</code> more cards (8 here) as
          the “Loading…” sentinel nears the viewport. The actions are logical:{" "}
          <em>Done</em> is <code className="font-mono">end</code> and <em>Archive</em> is{" "}
          <code className="font-mono">start</code>, so a card swipes right for Done and left for
          Archive — and with <em>right-to-left</em> ticked the same definition swipes left for
          Done and right for Archive (<code className="font-mono">left</code> /{" "}
          <code className="font-mono">right</code> still exist for a truly physical side).
          Archived and expanded cards do not move. With the custom
          card unchecked you get the default body: the <code className="font-mono">mobilePrimary</code>{" "}
          column bold on top, the rest as labelled pairs, ID skipped by{" "}
          <code className="font-mono">mobileHidden</code>.
        </Note>
      </div>
    </Example>
  );
}

