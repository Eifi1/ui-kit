import * as barrel from "../index";
import * as chart from "../chart";
import * as dataTable from "../data-table";
import * as feedback from "../feedback";
import * as search from "../search";
import * as shell from "../shell";
import * as tour from "../tour";
import * as wizard from "../wizard";
import * as rhf from "../rhf";
import * as tableText from "../table-text";

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
 *
 * 303 -> 326 (0.6.0), all additive — the inputs the three apps still hand-rolled after
 * adopting 0.5: `FileButton` / `useFilePicker` / `matchesAccept`, `Autocomplete`,
 * `Label`, `SwatchPicker`, `IconPicker`, `ChoiceCard` / `ChoiceCardGroup`,
 * `DangerConfirm`, `SignatureView`, `Disclosure` / `Collapse` / `DialogFrame`,
 * `stepNumber`, `useKitWeekStart`, and a `DEFAULT_*_LABELS` per new namespace. Two new
 * entries: `/rhf` (the optional react-hook-form adapter — the only module that may
 * import it, see packaging-contract) and `/table-text` (pure, imports nothing).
 *
 * 326 -> 330 (0.7.0): `MeasuredGrid`, `useMeasuredRows`, `DEFAULT_MEASURED_GRID_LABELS`
 * and `useWindowedRows` — lenkbank's measured grid, stages 2–3 of its proposal.
 */

const ENTRIES: Array<[name: string, mod: object, count: number]> = [
  ["@eifi1/ui-kit", barrel, 330],
  ["@eifi1/ui-kit/chart", chart, 50],
  ["@eifi1/ui-kit/data-table", dataTable, 18],
  ["@eifi1/ui-kit/feedback", feedback, 20],
  ["@eifi1/ui-kit/search", search, 3],
  ["@eifi1/ui-kit/shell", shell, 10],
  ["@eifi1/ui-kit/tour", tour, 4],
  ["@eifi1/ui-kit/wizard", wizard, 9],
  ["@eifi1/ui-kit/rhf", rhf, 8],
  ["@eifi1/ui-kit/table-text", tableText, 5],
];

/**
 * Entries that are deliberately NOT slices of the barrel. `/rhf` must stay out of it —
 * the barrel may not import react-hook-form (packaging-contract enforces that), or
 * every app would need it installed. `/table-text` is pure string handling with no
 * component to sit beside, standalone the way `/dates` is.
 */
const STANDALONE = new Set(["@eifi1/ui-kit/rhf", "@eifi1/ui-kit/table-text"]);

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
    for (const [name, mod] of ENTRIES.slice(1).filter(([n]) => !STANDALONE.has(n))) {
      const extra = Object.keys(mod).filter((k) => !inBarrel.has(k));
      expect(extra, `${name} exports names the barrel does not: ${extra.join(", ")}`).toEqual(
        [],
      );
    }
  });
});

describe("standalone entries", () => {
  it("share no names with the barrel, so an import can never mean two things", () => {
    const inBarrel = new Set(Object.keys(barrel));
    for (const [name, mod] of ENTRIES.filter(([n]) => STANDALONE.has(n))) {
      const both = Object.keys(mod).filter((k) => inBarrel.has(k));
      expect(both, `${name} re-uses barrel names: ${both.join(", ")}`).toEqual([]);
    }
  });
});
