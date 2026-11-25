import { useMemo } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Plus } from "lucide-react";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableGroupBy } from "../data-table";
import { withHeadGroups, type RowGroup } from "../data-table-groups";
import { planBodies } from "../data-table-virtual";
import { IconButton } from "../icon-button";
import { stubPhone } from "../../test/viewport";

/**
 * 0.66 (keksdose live #536, Marcel: "Einverstanden. Bereite es auf"): `headGroups` — the
 * days between the newest booked one and today, drawn as empty day bands with their "+",
 * in keksdose's register: two levels (`[period, day]`), `virtualize`, and a `loadMore`
 * with more to come — the three things a level's `keys` refuses. The head is certain where
 * the rest of the list is not: the newest rows are loaded first.
 */

interface Tx {
  id: string;
  date: string;
  payee: string;
}

const UPCOMING = "upcoming";
const periodOf = (date: string) => (date > "2026-11-25" ? UPCOMING : date.slice(0, 7));

// Newest first, as the register sorts: one upcoming booking, then November's.
const TXS: Tx[] = [
  { id: "u1", date: "2026-11-28", payee: "Rent" },
  { id: "t1", date: "2026-11-22", payee: "Coop" },
  { id: "t2", date: "2026-11-22", payee: "Migros" },
  { id: "t3", date: "2026-11-20", payee: "SBB" },
];

const COLUMNS: DataTableColumn<Tx>[] = [
  {
    key: "payee",
    header: "Payee",
    cell: (r) => r.payee,
    filter: { type: "text", getValue: (r) => r.payee },
  },
];

function levels(onAdd: (day: string) => void = () => {}): [DataTableGroupBy<Tx>, DataTableGroupBy<Tx>] {
  return [
    { key: (r) => periodOf(r.date), label: (k) => `Period ${k}` },
    {
      key: (r) => r.date,
      label: (k) => `Day ${k}`,
      action: (k) => (
        <IconButton label={`Add on ${k}`} onClick={() => onAdd(k)}>
          <Plus />
        </IconButton>
      ),
      empty: () => null,
    },
  ];
}

// Today 2026-11-25 back to the newest booked day, 22 — which has rows and anchors the rest.
const HEAD = [
  ["2026-11", "2026-11-25"],
  ["2026-11", "2026-11-24"],
  ["2026-11", "2026-11-23"],
  ["2026-11", "2026-11-22"],
] as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

const bands = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("th[data-group-band] span.min-w-0")).map((el) => el.textContent);

const g = <T,>(key: string, start: number, rows: T[], children: RowGroup<T>[] | null = null): RowGroup<T> => ({
  key,
  rows,
  start,
  children,
});

describe("withHeadGroups — where the head's empty groups go", () => {
  it("puts the empty days into the anchor's period, before the anchor day — after an upcoming block", () => {
    const groups = [
      g(UPCOMING, 0, [1], [g("2026-11-28", 0, [1])]),
      g("2026-11", 1, [2, 3, 4], [g("2026-11-22", 1, [2, 3]), g("2026-11-20", 3, [4])]),
    ];
    const { groups: out, ignored } = withHeadGroups(groups, HEAD, 2);
    expect(ignored).toEqual([]);
    expect(out.map((x) => x.key)).toEqual([UPCOMING, "2026-11"]);
    expect(out[1].children!.map((c) => [c.key, c.empty ?? false, c.start, c.rows.length])).toEqual([
      ["2026-11-25", true, 1, 0],
      ["2026-11-24", true, 1, 0],
      ["2026-11-23", true, 1, 0],
      ["2026-11-22", false, 1, 2],
      ["2026-11-20", false, 3, 1],
    ]);
    // The input is not changed.
    expect(groups[1].children).toHaveLength(2);
  });

  it("opens a period of its own for days of a month with no booking yet, before the anchor's", () => {
    const groups = [g("2026-11", 0, [1], [g("2026-11-29", 0, [1])])];
    const { groups: out } = withHeadGroups(
      groups,
      [
        ["2026-12", "2026-12-02"],
        ["2026-12", "2026-12-01"],
        ["2026-11", "2026-11-30"],
        ["2026-11", "2026-11-29"],
      ],
      2,
    );
    expect(out.map((x) => [x.key, x.rows.length, x.children!.map((c) => c.key)])).toEqual([
      ["2026-12", 0, ["2026-12-02", "2026-12-01"]],
      ["2026-11", 1, ["2026-11-30", "2026-11-29"]],
    ]);
    expect(out[0].children!.every((c) => c.empty)).toBe(true);
  });

  it("without an anchor, puts them before the first row; paths after the anchor are not drawn", () => {
    const groups = [g("2026-11", 0, [1], [g("2026-11-20", 0, [1])])];
    expect(withHeadGroups(groups, [["2026-11", "2026-11-25"]], 2).groups[0].children!.map((c) => c.key)).toEqual([
      "2026-11-25",
      "2026-11-20",
    ]);
    const { groups: out, ignored } = withHeadGroups(
      groups,
      [
        ["2026-11", "2026-11-25"],
        ["2026-11", "2026-11-20"],
        ["2026-11", "2026-11-19"],
      ],
      2,
    );
    expect(out[0].children!.map((c) => c.key)).toEqual(["2026-11-25", "2026-11-20"]);
    expect(ignored).toEqual(["2026-11/2026-11-19"]);
  });

  it("with one level, empty groups before the anchor group", () => {
    const groups = [g("b", 0, [1]), g("c", 1, [2])];
    const { groups: out } = withHeadGroups(groups, [["x"], ["a"], ["b"]], 1);
    expect(out.map((x) => [x.key, x.empty ?? false, x.start])).toEqual([
      ["x", true, 0],
      ["a", true, 0],
      ["b", false, 0],
      ["c", false, 1],
    ]);
  });
});

describe('withHeadGroups — empty days between booked ones (0.66.2, Marcel: "Last 7 days, always")', () => {
  it("draws a path when a later path has rows: the days between two booked ones, in their period", () => {
    // Today 25 is booked, nothing from 24 to 12, then 11: the week back from today, ended
    // by the next booked day below it.
    const groups = [g("2026-11", 0, [1, 2, 3], [g("2026-11-25", 0, [1]), g("2026-11-11", 1, [2, 3])])];
    const days = ["25", "24", "23", "22", "21", "20", "19"].map((d) => ["2026-11", `2026-11-${d}`] as const);
    const { groups: out, ignored } = withHeadGroups(groups, [...days, ["2026-11", "2026-11-11"]], 2);
    expect(ignored).toEqual([]);
    expect(out[0].children!.map((c) => [c.key, c.empty ?? false, c.start])).toEqual([
      ["2026-11-25", false, 0],
      ...["24", "23", "22", "21", "20", "19"].map((d) => [`2026-11-${d}`, true, 1]),
      ["2026-11-11", false, 1],
    ]);
  });

  it("across a month: the old month's days after its booked day, the new month's before its own", () => {
    const groups = [g("2026-12", 0, [1], [g("2026-12-02", 0, [1])]), g("2026-10", 1, [2], [g("2026-10-30", 1, [2])])];
    const { groups: out } = withHeadGroups(
      groups,
      [
        ["2026-12", "2026-12-02"],
        ["2026-12", "2026-12-01"],
        ["2026-11", "2026-11-30"],
        ["2026-10", "2026-10-31"],
        ["2026-10", "2026-10-30"],
      ],
      2,
    );
    expect(out.map((x) => [x.key, x.rows.length, x.children!.map((c) => [c.key, c.empty ?? false])])).toEqual([
      [
        "2026-12",
        1,
        [
          ["2026-12-02", false],
          ["2026-12-01", true],
        ],
      ],
      ["2026-11", 0, [["2026-11-30", true]]],
      [
        "2026-10",
        1,
        [
          ["2026-10-31", true],
          ["2026-10-30", false],
        ],
      ],
    ]);
  });

  it("still draws none after the last path with rows: below it, the rows may not be loaded yet", () => {
    const groups = [g("2026-11", 0, [1], [g("2026-11-25", 0, [1])])];
    const { groups: out, ignored } = withHeadGroups(
      groups,
      [
        ["2026-11", "2026-11-25"],
        ["2026-11", "2026-11-24"],
      ],
      2,
    );
    expect(out[0].children!.map((c) => c.key)).toEqual(["2026-11-25"]);
    expect(ignored).toEqual(["2026-11/2026-11-24"]);
  });

  it("with one level, between two groups with rows", () => {
    const groups = [g("c", 0, [1]), g("f", 1, [2])];
    const { groups: out } = withHeadGroups(groups, [["c"], ["d"], ["e"], ["f"]], 1);
    expect(out.map((x) => [x.key, x.empty ?? false, x.start])).toEqual([
      ["c", false, 0],
      ["d", true, 1],
      ["e", true, 1],
      ["f", false, 1],
    ]);
  });

  it("on a later page (`head: false`), none before the page's first path with rows", () => {
    const groups = [g("2026-11", 0, [1], [g("2026-11-20", 0, [1]), g("2026-11-18", 1, [2])])];
    const { groups: out } = withHeadGroups(
      groups,
      [
        ["2026-11", "2026-11-21"],
        ["2026-11", "2026-11-20"],
        ["2026-11", "2026-11-19"],
        ["2026-11", "2026-11-18"],
      ],
      2,
      { head: false },
    );
    expect(out[0].children!.map((c) => c.key)).toEqual(["2026-11-20", "2026-11-19", "2026-11-18"]);
  });
});

describe("planBodies — an empty group under the window", () => {
  it("draws every group with no rows when the row after it is drawn, not only the period's first", () => {
    // One period: two empty days (bands only, 20px each), then a day of two 40px rows.
    const tops = new Float64Array([60, 100, 140]);
    const h = new Float64Array([40, 40]);
    const gTop = new Float64Array([0, 40, 60, 140]);
    const groups = [
      { start: 0, end: 0, bands: [1, 2] as const, first: 0 },
      { start: 0, end: 0, bands: [2] as const, first: 0 },
      { start: 0, end: 2, bands: [2] as const, first: 0 },
    ];
    const bodies = planBodies({ n: 2, tops, h, gTop }, groups, 0, 2, []);
    expect(bodies.map((b) => (b.kind === "group" ? b.group : "spacer"))).toEqual([0, 1, 2]);
  });

  it("leaves an empty group far from the window to a spacer", () => {
    const tops = new Float64Array([20, 60, 100, 140, 180]);
    const h = new Float64Array([40, 40, 40, 40]);
    const gTop = new Float64Array([0, 20, 20, 180]);
    const groups = [
      { start: 0, end: 0, bands: [1, 2] as const, first: 0 },
      { start: 0, end: 0, bands: [2] as const, first: 0 },
      { start: 0, end: 4, bands: [2] as const, first: 0 },
    ];
    // The window starts at row 3: the period's first band stays, its empty sibling goes.
    const bodies = planBodies({ n: 4, tops, h, gTop }, groups, 3, 4, []);
    expect(bodies.map((b) => (b.kind === "group" ? b.group : "spacer"))).toEqual([0, "spacer", 2]);
  });
});

function Register({
  virtualize = false,
  filtered = false,
  onAdd,
  heads = HEAD,
}: {
  virtualize?: boolean;
  filtered?: boolean;
  onAdd?: (day: string) => void;
  heads?: readonly (readonly string[])[];
}) {
  const groupBy = useMemo(() => levels(onAdd), [onAdd]);
  return (
    <MemoryRouter>
      <DataTable
        rows={TXS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        paginated={false}
        groupBy={groupBy}
        headGroups={heads}
        loadMore={{ hasMore: true, onLoadMore: () => {} }}
        virtualize={virtualize ? { estimateRowHeight: 40, overscan: 5 } : false}
        filters={filtered ? { payee: { type: "text", q: "Coop" } } : undefined}
      />
    </MemoryRouter>
  );
}

describe("DataTable headGroups (0.66, keksdose live #536)", () => {
  it("draws the empty days as bands with their +, inside the period, with more to load", () => {
    const onAdd = vi.fn();
    const { container } = render(<Register onAdd={onAdd} />);
    expect(bands(container)).toEqual([
      `Period ${UPCOMING}`,
      "Day 2026-11-28",
      "Period 2026-11",
      "Day 2026-11-25",
      "Day 2026-11-24",
      "Day 2026-11-23",
      "Day 2026-11-22",
      "Day 2026-11-20",
    ]);
    // The period's band once; no empty line (`empty: () => null`); no row.
    expect(container.querySelectorAll("tr[data-row-index]")).toHaveLength(4);
    expect(container.querySelectorAll("tr[data-group-empty]")).toHaveLength(0);
    const day = screen.getByText("Day 2026-11-24").closest("tbody")!;
    fireEvent.click(within(day).getByRole("button", { name: "Add on 2026-11-24" }));
    expect(onAdd).toHaveBeenCalledWith("2026-11-24");
  });

  it("draws none under a column filter: an empty day there would be untrue", () => {
    const { container } = render(<Register filtered />);
    expect(bands(container)).not.toContain("Day 2026-11-24");
  });

  it("draws them on the phone's sections, at the level mobileGroupBy names", () => {
    stubPhone();
    const day = levels()[1];
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          paginated={false}
          groupBy={levels()}
          mobileGroupBy={day}
          headGroups={HEAD}
          loadMore={{ hasMore: true, onLoadMore: () => {} }}
        />
      </MemoryRouter>,
    );
    const sections = Array.from(container.querySelectorAll("li.sticky span.min-w-0")).map((el) => el.textContent);
    expect(sections).toEqual([
      "Day 2026-11-28",
      "Day 2026-11-25",
      "Day 2026-11-24",
      "Day 2026-11-23",
      "Day 2026-11-22",
      "Day 2026-11-20",
    ]);
  });
});

describe("DataTable headGroups between booked days (0.66.2)", () => {
  // Today 2026-11-22 is booked, 21 is not, 20 is: the week's empty day between the two.
  const GAP = [
    ["2026-11", "2026-11-22"],
    ["2026-11", "2026-11-21"],
    ["2026-11", "2026-11-20"],
  ] as const;
  it("draws the day between as a band with its +, before the older booked day", () => {
    const onAdd = vi.fn();
    const groupBy = levels(onAdd);
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          paginated={false}
          groupBy={groupBy}
          headGroups={GAP}
          loadMore={{ hasMore: true, onLoadMore: () => {} }}
        />
      </MemoryRouter>,
    );
    expect(bands(container)).toEqual([
      `Period ${UPCOMING}`,
      "Day 2026-11-28",
      "Period 2026-11",
      "Day 2026-11-22",
      "Day 2026-11-21",
      "Day 2026-11-20",
    ]);
    expect(container.querySelectorAll("tr[data-row-index]")).toHaveLength(4);
    const day = screen.getByText("Day 2026-11-21").closest("tbody")!;
    expect(
      within(day)
        .queryAllByRole("row")
        .filter((r) => r.hasAttribute("data-row-index")),
    ).toHaveLength(0);
    fireEvent.click(within(day).getByRole("button", { name: "Add on 2026-11-21" }));
    expect(onAdd).toHaveBeenCalledWith("2026-11-21");
  });
});

describe("DataTable headGroups under virtualize", () => {
  const rect = (top: number, height: number) =>
    ({
      top,
      bottom: top + height,
      height,
      left: 0,
      right: 800,
      width: 800,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this instanceof HTMLElement && this.querySelector(":scope > table[data-virtualized]")) return rect(0, 400);
      if (this.matches("tbody[data-vt-body]")) return rect(40, 0);
      return rect(0, 0);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("draws the empty days in the window, each band once", () => {
    const { container } = render(<Register virtualize />);
    expect(container.querySelector("tbody[data-vt-body]")).not.toBeNull();
    const labels = bands(container);
    for (const day of ["Day 2026-11-25", "Day 2026-11-24", "Day 2026-11-23"])
      expect(labels.filter((l) => l === day)).toHaveLength(1);
    expect(labels.filter((l) => l === "Period 2026-11")).toHaveLength(1);
  });

  it("draws a day between two booked ones in the window, once (0.66.2)", () => {
    const heads = [
      ["2026-11", "2026-11-22"],
      ["2026-11", "2026-11-21"],
      ["2026-11", "2026-11-20"],
    ] as const;
    const { container } = render(<Register virtualize heads={heads} />);
    const labels = bands(container);
    expect(labels.filter((l) => l === "Day 2026-11-21")).toHaveLength(1);
    expect(labels.indexOf("Day 2026-11-21")).toBe(labels.indexOf("Day 2026-11-22") + 1);
    expect(labels.indexOf("Day 2026-11-20")).toBe(labels.indexOf("Day 2026-11-21") + 1);
  });
});
