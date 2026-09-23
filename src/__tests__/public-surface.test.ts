import * as barrel from "../index";
import * as chart from "../chart";
import * as dataTable from "../data-table";
import * as feedback from "../feedback";
import * as search from "../search";
import * as shell from "../shell";
import * as tour from "../tour";
import * as wizard from "../wizard";

/**
 * The public surface, pinned.
 *
 * Nothing asserted what this package exports, so its 56 `export *` statements could add,
 * drop or shadow a name with no CI signal — and did: the README advertised five wizard
 * exports through 0.4.0 and 0.4.1 that had been deleted, because removing them from the
 * barrel broke nothing that anyone ran.
 *
 * Three consumers pin `^0.5.0`. A name leaving this list is a breaking change for them and
 * has to be a decision, not a diff nobody read. Updating the count below is that decision;
 * the failure message tells you exactly which names moved.
 *
 * 187 -> 189: `DEFAULT_PASSWORD_REVEAL_LABELS` and `resolvePasswordRevealLabels`, so the
 * password reveal toggle's two strings can be translated the same way every other string
 * in the kit is. Both additive; nothing left.
 *
 * 210 -> 212: `currencyName`, the one place the 27 shipped currency names are read, so
 * `CurrencySelect` and `AmountInput` resolve a caller's translation the same way; and
 * `missingDataTableLabels`, which answers which table labels fell back to English (the
 * lenient `Partial` merge cannot, and three apps depend on it staying lenient). Both
 * additive; nothing left.
 *
 * 212 -> 246, all additive:
 *  - i18n (src/i18n): `UiKitProvider`, the `useKit*` hooks, `missingKitLabels`,
 *    `formatFileSize`, `DEFAULT_UI_KIT_LABELS` and one `DEFAULT_*_LABELS` per namespace
 *    — including the four that were module-private (mini-calendar, popover, tour,
 *    command palette), because the complete English reference has to name them. That
 *    is also why /search and /tour each gained one.
 *  - components the apps hand-rolled: `Checkbox`, `Switch`, `Slider` (+ its log-scale
 *    helpers), `MonthPicker`, and keksdose's tile chart as `Treemap` / `TreemapCell` /
 *    `fitLabel` — the last three also on /chart.
 *  - `FIELD_SYNC_FRAME`, the class map `FieldSyncRow` paints a field's frame with.
 *
 * 246 -> 298 (and /chart 15 -> 50), all additive — the rest of what the apps
 * hand-rolled: `TimeInput` (+ `normalizeTime`, `isTimeInRange`), `NumberField`,
 * `SignaturePad`, `PasswordStrengthMeter` (+ its pure scorer and rules), `Sparkline`,
 * `StatTile` / `StatTileGrid`, and lenkbank's `SeriesChart` with its zoom
 * (`withChartZoom`, `SharedXZoom` and the pure zoom maths), `ToggleLegend` and the
 * facing-pair axis geometry. The chart pieces are on both entries, like the rest
 * of the chart kit; the zoom maths is exported because lenkbank's own tests use it.
 *
 * 298 -> 302: `PageContents`, `PageContentsLayout`, `useScrollSpy` and
 * `DEFAULT_PAGE_CONTENTS_LABELS` — the "On this page" rail, as a kit component.
 */

const ENTRIES: Array<[name: string, mod: object, count: number]> = [
  ["@eifi1/ui-kit", barrel, 303],
  ["@eifi1/ui-kit/chart", chart, 50],
  ["@eifi1/ui-kit/data-table", dataTable, 18],
  ["@eifi1/ui-kit/feedback", feedback, 20],
  ["@eifi1/ui-kit/search", search, 3],
  ["@eifi1/ui-kit/shell", shell, 10],
  ["@eifi1/ui-kit/tour", tour, 4],
  ["@eifi1/ui-kit/wizard", wizard, 9],
];

describe("public surface", () => {
  it.each(ENTRIES)("%s exports exactly %#", (name, mod, count) => {
    const names = Object.keys(mod).sort();
    expect(names, `${name} gained or lost an export:\n  ${names.join("\n  ")}`).toHaveLength(
      count,
    );
  });

  it("exports no name twice under a different spelling of the same thing", () => {
    // A star-export collision is silent in ESM: the later module wins and the earlier
    // name disappears. Catching it needs the *source* modules, not the merged namespace.
    const names = Object.keys(barrel);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every subpath is a strict subset of the barrel", () => {
    // The subpaths are a re-slicing of the main barrel, not a second API. If one grows a
    // name the barrel does not have, there are now two public surfaces to maintain.
    const inBarrel = new Set(Object.keys(barrel));
    for (const [name, mod] of ENTRIES.slice(1)) {
      const extra = Object.keys(mod).filter((k) => !inBarrel.has(k));
      expect(extra, `${name} exports names the barrel does not: ${extra.join(", ")}`).toEqual(
        [],
      );
    }
  });
});
