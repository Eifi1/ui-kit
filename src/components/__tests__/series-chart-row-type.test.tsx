import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cloneElement } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  SeriesChart,
  StaticSeriesChart,
  seriesLegendEntries,
  visibleSeries,
  type SeriesChartHit,
  type SeriesChartPoint,
  type SeriesChartProps,
  type SeriesChartRow,
  type SeriesChartSeries,
} from "../series-chart";

/**
 * The caller's own row type, handed back (0.53, keksdose after 0.52): `rows={months}`
 * types `hit.row` in `onPointClick` and `point.row` in a series' `dot` as the element
 * type of `months`, so a drilldown reads its `rawPeriod` without a cast. And every way an
 * app wrote the chart's types before keeps its meaning: the names without a type argument,
 * a wrapper typed by them or by `ComponentProps<typeof SeriesChart>` (Kurvenschmiede's,
 * over 41 sites), a handler or a `dot` annotated with them. A type error here fails
 * `npm run typecheck`; the `it`s below run the same code, so the row really is the caller's.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

/** An INTERFACE, which has no index signature: not a `SeriesChartRow` (API-2). */
interface Month {
  period: string;
  rawPeriod: string;
  income: number;
  expense?: number;
}

const MONTHS: Month[] = [
  { period: "Jan", rawPeriod: "2026-01", income: 900, expense: 300 },
  { period: "Feb", rawPeriod: "2026-02", income: 1200 },
  { period: "Mar", rawPeriod: "2026-03", income: 800, expense: 900 },
];

/** Typed the way keksdose and kastlan type theirs: without a type argument. */
const BARS: SeriesChartSeries[] = [
  { key: "income", label: "Income", type: "bar" },
  { key: "expense", label: "Expense", type: "bar" },
];

/** The first chart's keyboard stops — the clickable one, where a test draws several. */
const stops = () => within(screen.getAllByRole("group", { name: "Chart values" })[0]).getAllByRole("button");
/** Presses ↵ on the `at`-th keyboard stop: the click a pointer would make on that bar. */
function press(at: number) {
  const stop = stops()[at];
  act(() => stop.focus());
  fireEvent.keyDown(stop, { key: "Enter" });
}

describe("SeriesChart hands the caller's own row type back (0.53)", () => {
  it("types hit.row as the rows' element type, and hands back the very object", () => {
    const picked: Month[] = [];
    render(
      <SeriesChart
        rows={MONTHS}
        series={BARS}
        x={{ type: "category", key: "period" }}
        onPointClick={(hit) => {
          expectTypeOf(hit.row).toEqualTypeOf<Month>();
          expectTypeOf(hit).toEqualTypeOf<SeriesChartHit<Month>>();
          picked.push(hit.row);
        }}
      />,
    );
    press(4);
    expect(picked).toHaveLength(1);
    expect(picked[0]).toBe(MONTHS[2]);
    expect(picked[0].rawPeriod).toBe("2026-03");
  });

  it("types a dot's point.row the same, and still refuses a key the row does not have", () => {
    const seen: Month[] = [];
    render(
      <StaticSeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        series={[
          {
            key: "income",
            label: "Income",
            dot: (point) => {
              expectTypeOf(point.row).toEqualTypeOf<Month>();
              expectTypeOf(point).toEqualTypeOf<SeriesChartPoint<Month>>();
              seen.push(point.row);
              return true;
            },
          },
        ]}
        // @ts-expect-error a key `Month` does not have: the row is typed, not a bag of unknowns
        onPointClick={(hit) => void hit.row.rawPeriode}
      />,
    );
    expect(seen).toEqual(MONTHS);
    expect(seen[1]).toBe(MONTHS[1]);
  });

  it("carries the type through a generic wrapper, visibleSeries and seriesLegendEntries", () => {
    // keksdose's LegendedSeriesChart, made generic: the series with their legend.
    function Legended<TRow extends object>({
      series,
      ...chart
    }: Omit<SeriesChartProps<TRow>, "series"> & { series: SeriesChartSeries<TRow>[] }) {
      return (
        <>
          <SeriesChart {...chart} series={visibleSeries(series, new Set(["expense"]))} />
          <p>{seriesLegendEntries(series).length}</p>
        </>
      );
    }
    const typed: SeriesChartSeries<Month>[] = [
      { key: "income", label: "Income", dot: (point) => (point.row.rawPeriod ? true : null) },
    ];
    expectTypeOf(visibleSeries(typed, new Set())).toEqualTypeOf<SeriesChartSeries<Month>[]>();
    const picked: string[] = [];
    render(
      <Legended
        rows={MONTHS}
        series={[...typed, BARS[1]]}
        x={{ type: "category", key: "period" }}
        onPointClick={(hit) => {
          expectTypeOf(hit.row).toEqualTypeOf<Month>();
          picked.push(hit.row.rawPeriod);
        }}
      />,
    );
    press(1);
    expect(picked).toEqual(["2026-02"]);
    // An explicit argument says the same.
    const explicit = <SeriesChart<Month> rows={MONTHS} series={typed} />;
    expect(explicit.props.rows).toBe(MONTHS);
  });
});

describe("every way an app wrote the chart's types before 0.53 keeps its meaning", () => {
  // 1. The names without a type argument mean what they meant: any object is a row, and
  //    what comes back is a SeriesChartRow, whose every key is `unknown`.
  it("leaves SeriesChartProps, SeriesChartHit and SeriesChartPoint as they were", () => {
    expectTypeOf<SeriesChartProps["rows"]>().toEqualTypeOf<readonly object[]>();
    expectTypeOf<SeriesChartHit["row"]>().toEqualTypeOf<SeriesChartRow>();
    expectTypeOf<SeriesChartPoint["row"]>().toEqualTypeOf<SeriesChartRow>();
    const props: SeriesChartProps = { rows: MONTHS, series: BARS };
    const hit: SeriesChartHit = { index: 0, row: { period: "Jan" }, x: "Jan" };
    expectTypeOf(hit.row.rawPeriod).toBeUnknown();
    // A typed hit is still a SeriesChartHit, an interface row and all.
    const typed: SeriesChartHit<Month> = { index: 0, row: MONTHS[0], x: "Jan" };
    const loose: SeriesChartHit = typed;
    expect(loose.row).toBe(props.rows[0]);
  });

  // 2. A wrapper typed by SeriesChartProps; 6. one typed by ComponentProps<typeof
  //    SeriesChart> or Parameters<…> (Kurvenschmiede's), which read the same type.
  it("keeps wrappers typed by SeriesChartProps, ComponentProps<> and Parameters<>", () => {
    expectTypeOf<ComponentProps<typeof SeriesChart>>().toEqualTypeOf<SeriesChartProps>();
    expectTypeOf<Parameters<typeof SeriesChart>[0]>().toEqualTypeOf<SeriesChartProps>();
    expectTypeOf<ComponentProps<typeof StaticSeriesChart>>().toEqualTypeOf<SeriesChartProps>();
    const Plain = (props: SeriesChartProps) => <SeriesChart {...props} />;
    function Ks({ className, ...props }: ComponentProps<typeof SeriesChart>) {
      return <SeriesChart {...props} className={className ?? "ks"} />;
    }
    const Params = (props: Parameters<typeof SeriesChart>[0]) => <StaticSeriesChart {...props} />;
    const shared: SeriesChartProps = { rows: MONTHS, series: BARS, x: { type: "category", key: "period" } };
    const picked: unknown[] = [];
    render(
      <>
        <Plain {...shared} onPointClick={(hit) => picked.push(hit.row.rawPeriod)} />
        <Ks {...shared} />
        <Params {...shared} />
      </>,
    );
    expect(document.querySelectorAll(".recharts-wrapper")).toHaveLength(3);
  });

  // 3. A handler annotated with SeriesChartHit, on interface rows; 5. a dot annotated
  //    with SeriesChartPoint; and series typed SeriesChartSeries, all handed typed rows.
  it("takes handlers and dots annotated without a type argument", () => {
    const picked: unknown[] = [];
    const onHit = (hit: SeriesChartHit) => picked.push(hit.row.rawPeriod);
    const ring = (point: SeriesChartPoint): ReactNode => (point.row.expense === undefined ? null : true);
    const ringed: SeriesChartSeries[] = [{ key: "expense", label: "Expense", dot: ring }];
    render(
      <>
        <SeriesChart rows={MONTHS} series={BARS} x={{ type: "category", key: "period" }} onPointClick={onHit} />
        <StaticSeriesChart rows={MONTHS} series={[{ key: "income", label: "Income", dot: ring }]} />
        <StaticSeriesChart rows={MONTHS} series={ringed} />
      </>,
    );
    press(0);
    expect(picked).toEqual(["2026-01"]);
  });

  // 4. Rows typed `object[]`, an empty literal, or `any[]`: nothing to read a type off,
  //    so a hit's row is a SeriesChartRow, as before.
  it("hands back a SeriesChartRow when the rows' type names no keys", () => {
    const loose: object[] = MONTHS;
    const anyRows: any[] = MONTHS;
    const picked: unknown[] = [];
    render(
      <>
        <SeriesChart
          rows={loose}
          series={BARS}
          x={{ type: "category", key: "period" }}
          onPointClick={(hit) => {
            expectTypeOf(hit.row).toEqualTypeOf<SeriesChartRow>();
            picked.push(hit.row.rawPeriod);
          }}
        />
        <StaticSeriesChart
          rows={[]}
          series={BARS}
          onPointClick={(hit) => expectTypeOf(hit.row).toEqualTypeOf<SeriesChartRow>()}
        />
        <StaticSeriesChart
          rows={anyRows}
          series={BARS}
          onPointClick={(hit) => expectTypeOf(hit.row).toEqualTypeOf<SeriesChartRow>()}
        />
      </>,
    );
    press(0);
    expect(picked).toEqual(["2026-01"]);
  });
});
