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
import * as i18nDeCh from "../i18n/locales/de-CH";
import * as i18nEn from "../i18n/locales/en";
import * as i18nEs from "../i18n/locales/es";
import * as i18nFr from "../i18n/locales/fr";
import * as i18nHu from "../i18n/locales/hu";
import * as i18nIt from "../i18n/locales/it";
import * as i18nZh from "../i18n/locales/zh";

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
 * of the chart kit; the zoom maths is exported because Kurvenschmiede's (then lenkbank's) own tests use it.
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
 * 330 -> 331: `DEFAULT_FEEDBACK_ATTACHMENT_LABELS` (also in /feedback, 20 -> 21) — the
 * attachment field reads the provider's new `feedbackAttachment` namespace.
 * New pattern entry `/i18n/<code>`: the kit's translations, one standalone module per
 * language (`UI_KIT_LABELS_XX` + its `uiKitLabelsXx(numberLocale)` factory; de-CH is
 * derived and has only the constant).
 * 331 -> 368 (0.8.0), all additive — the three apps' 0.7 proposals: `ConfirmProvider` /
 * `useConfirm`, `FloatingPanel` / `FloatingActionButton`, `DescriptionList`, `ProgressBar`,
 * `Skeleton`, `CopyButton` / `useCopyToClipboard` / `copyToClipboard`, `useDebounce` /
 * `useDebouncedCallback`, `ButtonGroup`, the static `Table` parts, `Separator`,
 * `ScrollArea`, `TreeView` / `TreeRow`, `useFileDrop` / `dragHasFiles`, the series-chart
 * helpers, and a `DEFAULT_*_LABELS` per new namespace.
 * 374 -> 389 (0.10.0), all additive — the apps' 0.9 audits: `List` / `ListItem`,
 * `MenuItem`, `SectionLabel` / `Caption` (+ their class constants), `StatusDot`,
 * `PageHeader`, `Breadcrumbs`, `BulkActionBar`, `TableEmpty`, and a `DEFAULT_*_LABELS`
 * per new namespace.
 * 389 -> 393 (0.10.0), all additive: `toast`, `Toaster`, `DEFAULT_TOAST_LABELS` and
 * `TOAST_ACTION_DURATION` — the toast layer over sonner both apps wired by hand
 * (keksdose C26, kastlan). sonner stays an optional peer: the module loads it lazily.
 * 393 -> 403 (0.11.0), all additive: `FloatingActionGroup` / `FloatingAction`,
 * `ButtonGroupLink`, `CalendarHeatmap` / `heatmapLevel` / `DEFAULT_CALENDAR_HEATMAP_LABELS`,
 * `Field`, `useOptionalWizardContext`, `ActionCard`, `NavPills`; 403 -> 404: `CLIPS_ATTRIBUTE`.
 * 405 -> 471 (0.12.0), all additive — kastlan's final audit and keksdose's 0.11 notes:
 * TextLink; FormActions, LineItems; SignedAmount / Delta / Tone, LoadingState,
 * ErrorBoundary; formatNumber / formatMoney / formatPercent / formatDate /
 * formatRelativeTime / useKitFormat; useHotkey; readStored / writeStored; PieChart,
 * StaticLegend; ImageGrid, Lightbox, AuthedImage / useAuthedSrc; QrCode / encodeQr,
 * PasskeysSetting; FeedbackThread / FeedbackComposer; AuthLayout, TopBarBrand;
 * BooleanMark / booleanColumn, filter builders, useTableUrlState, useSearchParamState /
 * useTabParam / useDialogParam; the wizard gate hooks; and their DEFAULT_*_LABELS.
 * /chart 55 -> 58 (PieChart, its labels, StaticLegend), /data-table 18 -> 27, /shell 10 -> 12.
 * 0.8.0: `/i18n/de-informal` (the "du" German: `UI_KIT_LABELS_DE_INFORMAL` +
 * `uiKitLabelsDeInformal`) and its Swiss derivative `/i18n/de-CH-informal` (constant only).
 * 0.18.0 (breaking): the kit has ONE German — Swiss, formal. `/i18n/de`,
 * `/i18n/de-informal` and `/i18n/de-CH-informal` are gone; `/i18n/de-CH` gains the
 * factory `uiKitLabelsDeCh(numberLocale)` (1 -> 2), like every other catalogue.
 * 368 -> 374 (and /search 3 -> 9), all additive: `GlobalSearch` and
 * `DEFAULT_GLOBAL_SEARCH_LABELS` (the ⌘K search kastlan and keksdose each hand-built on
 * `CommandPalette`), and its pure matcher `createSearchIndex`, `matchEntries`,
 * `normalizeSearchText` and `SEARCH_TIER_POINTS`.
 */

const ENTRIES: Array<[name: string, mod: object, count: number]> = [
  // 0.13.0: the crash screen's report helpers — `isChunkLoadError`, `formatCrashReport`,
  // `crashFingerprint` (+3).
  // 0.15.4: `currencyMinorDigits`, `roundToCurrency` (keksdose M5);
  // `resolveTooltipPlacement`, `useKitChartTooltipPlacement` (keksdose M1) (+4).
  // 0.15.5: `DEFAULT_MAX_ATTACHMENTS`, the default `max` of
  // `<FeedbackAttachmentField multiple>` (keksdose N3) (+1 here and in /feedback).
  // 0.16.0: `statusDotColor` (+1).
  // 0.18.0 (+25): `WriteLockProvider`, `useWriteLock`, `DEFAULT_WRITE_LOCK_LABELS`;
  // `RoleChip`, `AccountStateChip`, `DateMark`, `dateColumn`, `DEFAULT_ACCOUNT_STATE_LABELS`,
  // `ACCOUNT_STATE_TONES`; `ShareCard`, `ShareDialog`, `SharePanel`,
  // `DEFAULT_SHARE_CARD_LABELS`; `ReauthDialog`, `DEFAULT_REAUTH_DIALOG_LABELS`,
  // `typedMatches`; `refreshChipEdges`; `createServerWake`, `serverWake`, `watchReadsAnd`,
  // `attachServerWake`, `wrapFetch`, `ServerWakeNotice`, `useServerWakeStage`,
  // `DEFAULT_SERVER_WAKE_LABELS` (keksdose's cold-start notice for every app).
  // 0.19.0: `kitLabelStrings`, the kit's words as review rows (keksdose) (+1); the
  // language registry `KIT_LANGUAGES`, `resolveLanguage`, `formatLocaleOf`,
  // `loadUiKitLabels`, `languageOptions` (+5).
  ["@eifi1/ui-kit", barrel, 514],
  // 0.8.0 series-chart marks (+5 here and in the barrel): `anchoredBand`,
  // `visibleSeries`, `seriesLegendEntries`, `axisExtent`, `defaultZoomAxes`.
  // 0.15.4: `resolveTooltipPlacement` (+1 here and in the barrel).
  ["@eifi1/ui-kit/chart", chart, 59],
  ["@eifi1/ui-kit/data-table", dataTable, 27],
  // 0.12.0: `FeedbackThread`, `FeedbackComposer` and the `DEFAULT_*_LABELS` of their two
  // namespaces and of `feedbackDialog` (+5 here and in the barrel).
  // 0.15.5: `DEFAULT_MAX_ATTACHMENTS` (+1 here and in the barrel).
  ["@eifi1/ui-kit/feedback", feedback, 27],
  ["@eifi1/ui-kit/search", search, 9],
  ["@eifi1/ui-kit/shell", shell, 12],
  ["@eifi1/ui-kit/tour", tour, 4],
  // 0.11.0: `useOptionalWizardContext` (+1 here and in the barrel), the non-throwing
  // read `useRhfWizardStep` registers through.
  // kastlan 51/52: `IntegerField` and `MoneyField` (+2). Showcase audit: `splitFileName` (+1).
  // 0.12.0: `useWizardStepValidate` and `useWizardNextGate` (+2 here and in the barrel),
  // the non-form step hooks kastlan kept in shared/components/wizard.
  ["@eifi1/ui-kit/wizard", wizard, 12],
  // 0.11.0: `useRhfWizardStep`, the react-hook-form bridge to the wizard's Next gate.
  // 0.12.0: the bound fields — `RhfField`, `RhfTextField`, `RhfTextarea`,
  // `RhfNumberField`, `RhfMoneyField`, `RhfDateField`, `RhfSelect`, `RhfCheckbox`,
  // `RhfCombobox`, `RhfTextCombobox` — and `RhfLineItems` (+11).
  // 0.13.0: `RhfIntegerField`, the digits={0} calculator={false} emptyValue="" preset
  // (kastlan 41) (+1).
  ["@eifi1/ui-kit/rhf", rhf, 21],
  ["@eifi1/ui-kit/table-text", tableText, 5],
  // 0.18.0: the only German left (see the history above); `uiKitLabelsDeCh` (+1).
  ["@eifi1/ui-kit/i18n/de-CH", i18nDeCh, 2],
  // 0.17.0: `uiKitLabelsEn(numberLocale)`, the English defaults with grouped counts
  // (kastlan 58). Runtime only: a constant would read as the raw-count defaults.
  ["@eifi1/ui-kit/i18n/en", i18nEn, 1],
  ["@eifi1/ui-kit/i18n/es", i18nEs, 2],
  ["@eifi1/ui-kit/i18n/fr", i18nFr, 2],
  ["@eifi1/ui-kit/i18n/hu", i18nHu, 2],
  ["@eifi1/ui-kit/i18n/it", i18nIt, 2],
  ["@eifi1/ui-kit/i18n/zh", i18nZh, 2],
];

/**
 * Entries that are deliberately NOT slices of the barrel. `/rhf` must stay out of it —
 * the barrel may not import react-hook-form (packaging-contract enforces that), or
 * every app would need it installed. `/table-text` is pure string handling with no
 * component to sit beside, standalone the way `/dates` is. The `/i18n/<code>`
 * translations are data an app opts into per language, never part of the barrel.
 */
const STANDALONE = new Set([
  "@eifi1/ui-kit/rhf",
  "@eifi1/ui-kit/table-text",
  ...ENTRIES.map(([name]) => name).filter((name) => name.startsWith("@eifi1/ui-kit/i18n/")),
]);

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
