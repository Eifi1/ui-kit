import { useMemo, useState } from "react";
import {
  DEFAULT_APP_SHELL_LABELS,
  DEFAULT_CALCULATOR_LABELS,
  DEFAULT_CHIP_INPUT_LABELS,
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMAND_PALETTE_LABELS,
  DEFAULT_COMMON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  DEFAULT_DANGER_CONFIRM_LABELS,
  DEFAULT_DATA_TABLE_LABELS,
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_DIALOG_FRAME_LABELS,
  DEFAULT_FIELD_SYNC_LABELS,
  DEFAULT_FILE_LABELS,
  DEFAULT_FILE_PICKER_LABELS,
  DEFAULT_ICON_PICKER_LABELS,
  DEFAULT_MEASURED_GRID_LABELS,
  DEFAULT_MINI_CALENDAR_LABELS,
  DEFAULT_MONTH_PICKER_LABELS,
  DEFAULT_MULTI_SELECT_LABELS,
  DEFAULT_PAGE_CONTENTS_LABELS,
  DEFAULT_PASSWORD_REVEAL_LABELS,
  DEFAULT_PASSWORD_STRENGTH_LABELS,
  DEFAULT_PICKER_SHEET_LABELS,
  DEFAULT_POPOVER_LABELS,
  DEFAULT_SERIES_CHART_LABELS,
  DEFAULT_SIGNATURE_PAD_LABELS,
  DEFAULT_SPARKLINE_LABELS,
  DEFAULT_STAT_TILE_LABELS,
  DEFAULT_SWATCH_PICKER_LABELS,
  DEFAULT_SWIPEABLE_ROW_LABELS,
  DEFAULT_TABS_LABELS,
  DEFAULT_TOP_BAR_LABELS,
  DEFAULT_TOUR_LABELS,
  DEFAULT_UI_KIT_LABELS,
  DEFAULT_WIZARD_LABELS,
  MiniCalendar,
  ToggleGroup,
  UiKitProvider,
  formatFileSize,
  missingDataTableLabels,
  missingKitLabels,
  resolveChipInputLabels,
  resolveDataTableLabels,
  resolveFieldSyncLabels,
  resolvePasswordRevealLabels,
  useKitFileLabels,
  useKitLabelOverrides,
  useKitLabels,
  useKitLocale,
  useKitWeekStart,
} from "@eifi1/ui-kit";
import type { UiKitLabels } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";
import { LOCALES, useLocale, useT } from "../i18n";

/**
 * The i18n contract, shown rather than described: the provider, the key tree, and —
 * computed live — how complete each of the showcase's translations is against it.
 */
export function Localisation() {
  return (
    <>
      <ProviderExample />
      <NestingExample />
      <FileSizeExample />
      <CompletenessExample />
      <NamespaceConstantsExample />
      <TreeExample />
    </>
  );
}

function ProviderExample() {
  return (
    <Example label="One provider, once" hint="prop > provider > English default">
      <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-xs text-[var(--text-secondary)]">
        {`import { UiKitProvider } from "@eifi1/ui-kit";
import { de } from "./i18n/kit-de"; // a UiKitLabels (or any part of one)

<UiKitProvider labels={de} locale="de-DE">
  <App />
</UiKitProvider>`}
      </pre>
      <Note>
        Before the provider, every component took its strings through a prop of its own —{" "}
        <code className="font-mono">labels</code>, <code className="font-mono">calendarLabels</code>,{" "}
        <code className="font-mono">clearLabel</code>, <code className="font-mono">ariaLabel</code> — at
        every call site. One forgotten prop was one English word in a German UI, and a component
        nested inside another (the calendar inside the data table&rsquo;s date filter) could not be
        reached at all. The showcase itself is the proof it now works: it mounts one provider with
        the active dictionary, and switching the language in the top bar re-labels every kit
        component on every page.
      </Note>
    </Example>
  );
}

function CompletenessExample() {
  const { code } = useLocale();
  const total = useMemo(() => missingKitLabels(undefined, DEFAULT_UI_KIT_LABELS).length, []);
  return (
    <Example label="Completeness per language" hint="missingKitLabels(labels, DEFAULT_UI_KIT_LABELS)">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
            <th className="py-1.5 pe-4 text-start font-medium">Language</th>
            <th className="py-1.5 pe-4 text-start font-medium">Tag</th>
            <th className="py-1.5 text-end font-medium">Keys translated</th>
          </tr>
        </thead>
        <tbody>
          {LOCALES.map((dict) => {
            const missing = missingKitLabels(dict.kit, DEFAULT_UI_KIT_LABELS).length;
            const active = dict.tag.split("-")[0] === code;
            return (
              <tr
                key={dict.tag}
                className="border-b border-[var(--border)] last:border-b-0"
                aria-current={active ? "true" : undefined}
              >
                <td className={`py-1.5 pe-4 ${active ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                  {dict.name}
                </td>
                <td className="py-1.5 pe-4 font-mono text-xs text-[var(--text-muted)]">{dict.tag}</td>
                <td className="py-1.5 text-end font-mono text-xs tabular-nums text-[var(--text-primary)]">
                  {total - missing} / {total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Note>
        The dictionaries are typed as the full <code className="font-mono">UiKitLabels</code>, so{" "}
        <code className="font-mono">tsc</code> already refuses one with a key missing; this table is
        the same check an app should run in its own test —{" "}
        <code className="font-mono">expect(missingKitLabels(de, DEFAULT_UI_KIT_LABELS)).toEqual([])</code>{" "}
        — for a translation that is built at runtime or loaded from JSON.
      </Note>
    </Example>
  );
}

/** Renders a label value for the table: strings as-is, messages called with samples. */
function sample(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => string;
    const args = Array.from({ length: fn.length }, (_, i) => [3, 12, 137][i] ?? "x");
    try {
      return fn(...args);
    } catch {
      return "ƒ";
    }
  }
  if (value && typeof value === "object") return `{ ${Object.keys(value).length} keys }`;
  return String(value);
}

function TreeExample() {
  const t = useT();
  const namespaces = Object.keys(DEFAULT_UI_KIT_LABELS) as Array<keyof UiKitLabels>;
  return (
    <Example label="The key tree" hint="every string the kit renders, English beside the active language">
      <div className="space-y-6">
        {namespaces.map((ns) => {
          const en = DEFAULT_UI_KIT_LABELS[ns] as unknown as Record<string, unknown>;
          const here = t.kit[ns] as unknown as Record<string, unknown>;
          return (
            <section key={ns}>
              <h4 className="font-mono text-xs font-semibold text-[var(--text-primary)]">{ns}</h4>
              <table className="mt-1 w-full table-fixed text-xs">
                <tbody>
                  {Object.keys(en).map((key) => (
                    <tr key={key} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="w-1/4 truncate py-1 pe-3 align-top font-mono text-[var(--text-muted)]">{key}</td>
                      <td className="w-3/8 py-1 pe-3 align-top text-[var(--text-secondary)]">{sample(en[key])}</td>
                      <td className="w-3/8 py-1 align-top text-[var(--text-primary)]">{sample(here?.[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </Example>
  );
}

/* ── nesting, live ─────────────────────────────────────────────────────── */

const INNER_LOCALES = ["de-DE", "en-US", "ja-JP", "ar-EG"] as const;
type InnerLocale = (typeof INNER_LOCALES)[number];

/** What the hooks answer at the point they are called — the whole provider API. */
function HookProbe({ prop }: { prop?: string }) {
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS, prop ? { clear: prop } : undefined);
  const overrides = useKitLabelOverrides("common");
  const locale = useKitLocale();
  const weekStart = useKitWeekStart();
  const file = useKitFileLabels();
  return (
    <OutTable
      rows={[
        ["useKitLocale()", JSON.stringify(locale)],
        ["useKitWeekStart()", JSON.stringify(weekStart)],
        [
          `useKitLabels("common", DEFAULT_COMMON_LABELS${prop ? `, { clear: "${prop}" }` : ""}).clear`,
          common.clear,
        ],
        ['useKitLabelOverrides("common")?.clear', JSON.stringify(overrides?.clear)],
        ["useKitFileLabels().size(1_234_567)", file.size(1_234_567)],
        ['common.fieldValue("Status", "open")', common.fieldValue("Status", "open")],
      ]}
    />
  );
}

/**
 * A provider inside the showcase's own: it overrides only what it names. The probe
 * runs three times — under the page's provider, under the inner one, and under the
 * inner one with a component prop on top — so the precedence is read off, not told.
 */
function NestingExample() {
  const [locale, setLocale] = useState<InnerLocale>("de-DE");
  const [monday, setMonday] = useState<"0" | "1">("1");
  const [day, setDay] = useState("2026-09-24");
  return (
    <Example
      label="Nested providers — a merge, not a replacement"
      hint="prop > inner provider > outer provider > English; locale and weekStartsOn inherit the same way"
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <ToggleGroup<InnerLocale>
          ariaLabel="Inner locale"
          value={locale}
          onChange={setLocale}
          options={INNER_LOCALES.map((l) => ({ value: l, label: l }))}
        />
        <ToggleGroup<"0" | "1">
          ariaLabel="Inner weekStartsOn"
          value={monday}
          onChange={setMonday}
          options={[
            { value: "0", label: "weekStartsOn={0}" },
            { value: "1", label: "weekStartsOn={1}" },
          ]}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <h4 className="text-xs font-semibold text-[var(--text-primary)]">The page&apos;s provider</h4>
          <HookProbe />
        </div>
        <UiKitProvider
          locale={locale}
          weekStartsOn={Number(monday) as 0 | 1}
          labels={{ common: { clear: "Wipe (inner provider)" } }}
        >
          <div className="min-w-0 space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">
              Inside {`<UiKitProvider locale="${locale}" labels={{ common: { clear } }}>`}
            </h4>
            <HookProbe />
          </div>
          <div className="min-w-0 space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">
              …plus a component prop
            </h4>
            <HookProbe prop="Reset (prop)" />
          </div>
          <div className="lg:col-span-3">
            <div className="max-w-xs">
              <MiniCalendar
                from={day}
                to={day}
                onSelect={(from) => setDay(from)}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              A real component under the inner provider: month and weekday names follow its
              locale, the first column follows <code className="font-mono">weekStartsOn</code>,
              and every label the inner provider did not name still comes from the page&apos;s
              language.
            </p>
          </div>
        </UiKitProvider>
      </div>
    </Example>
  );
}

function FileSizeExample() {
  const sizes = [512, 12_345, 3_400_000, 7_800_000_000];
  const locales = [undefined, "de-DE", "fr-FR", "ja-JP"];
  return (
    <Example label="formatFileSize(bytes, locale)" hint="Intl unit formatting — digits, decimal mark and unit spelling follow the locale">
      <OutTable
        rows={sizes.flatMap((bytes) =>
          locales.map((locale): [string, string] => [
            `formatFileSize(${bytes}${locale ? `, "${locale}"` : ""})`,
            formatFileSize(bytes, locale),
          ]),
        )}
      />
      <Note>
        <code className="font-mono">DEFAULT_FILE_LABELS.size</code> calls it with no locale (the
        runtime&apos;s); <code className="font-mono">useKitFileLabels()</code> — what the file
        pickers and the attachment field use — passes the provider&apos;s.
      </Note>
    </Example>
  );
}

/** Each namespace's English default, exported under its own name, and the tree built
 *  from them. Identity, not equality: the tree holds the very same objects. */
const NAMESPACE_CONSTANTS: Array<[string, keyof UiKitLabels, unknown]> = [
  ["DEFAULT_COMMON_LABELS", "common", DEFAULT_COMMON_LABELS],
  ["DEFAULT_DATA_TABLE_LABELS", "dataTable", DEFAULT_DATA_TABLE_LABELS],
  ["DEFAULT_MINI_CALENDAR_LABELS", "miniCalendar", DEFAULT_MINI_CALENDAR_LABELS],
  ["DEFAULT_DATE_PICKER_LABELS", "datePicker", DEFAULT_DATE_PICKER_LABELS],
  ["DEFAULT_MONTH_PICKER_LABELS", "monthPicker", DEFAULT_MONTH_PICKER_LABELS],
  ["DEFAULT_POPOVER_LABELS", "popover", DEFAULT_POPOVER_LABELS],
  ["DEFAULT_COMBOBOX_LABELS", "combobox", DEFAULT_COMBOBOX_LABELS],
  ["DEFAULT_MULTI_SELECT_LABELS", "multiSelect", DEFAULT_MULTI_SELECT_LABELS],
  ["DEFAULT_CALCULATOR_LABELS", "calculator", DEFAULT_CALCULATOR_LABELS],
  ["DEFAULT_CURRENCY_LABELS", "currency", DEFAULT_CURRENCY_LABELS],
  ["DEFAULT_CHIP_INPUT_LABELS", "chipInput", DEFAULT_CHIP_INPUT_LABELS],
  ["DEFAULT_FIELD_SYNC_LABELS", "fieldSync", DEFAULT_FIELD_SYNC_LABELS],
  ["DEFAULT_PASSWORD_REVEAL_LABELS", "passwordReveal", DEFAULT_PASSWORD_REVEAL_LABELS],
  ["DEFAULT_TABS_LABELS", "tabs", DEFAULT_TABS_LABELS],
  ["DEFAULT_APP_SHELL_LABELS", "appShell", DEFAULT_APP_SHELL_LABELS],
  ["DEFAULT_PAGE_CONTENTS_LABELS", "pageContents", DEFAULT_PAGE_CONTENTS_LABELS],
  ["DEFAULT_TOP_BAR_LABELS", "topBar", DEFAULT_TOP_BAR_LABELS],
  ["DEFAULT_PICKER_SHEET_LABELS", "pickerSheet", DEFAULT_PICKER_SHEET_LABELS],
  ["DEFAULT_SWIPEABLE_ROW_LABELS", "swipeableRow", DEFAULT_SWIPEABLE_ROW_LABELS],
  ["DEFAULT_FILE_LABELS", "file", DEFAULT_FILE_LABELS],
  ["DEFAULT_WIZARD_LABELS", "wizard", DEFAULT_WIZARD_LABELS],
  ["DEFAULT_TOUR_LABELS", "tour", DEFAULT_TOUR_LABELS],
  ["DEFAULT_COMMAND_PALETTE_LABELS", "commandPalette", DEFAULT_COMMAND_PALETTE_LABELS],
  ["DEFAULT_SERIES_CHART_LABELS", "seriesChart", DEFAULT_SERIES_CHART_LABELS],
  ["DEFAULT_SPARKLINE_LABELS", "sparkline", DEFAULT_SPARKLINE_LABELS],
  ["DEFAULT_STAT_TILE_LABELS", "statTile", DEFAULT_STAT_TILE_LABELS],
  ["DEFAULT_SIGNATURE_PAD_LABELS", "signaturePad", DEFAULT_SIGNATURE_PAD_LABELS],
  ["DEFAULT_PASSWORD_STRENGTH_LABELS", "passwordStrength", DEFAULT_PASSWORD_STRENGTH_LABELS],
  ["DEFAULT_DANGER_CONFIRM_LABELS", "dangerConfirm", DEFAULT_DANGER_CONFIRM_LABELS],
  ["DEFAULT_SWATCH_PICKER_LABELS", "swatchPicker", DEFAULT_SWATCH_PICKER_LABELS],
  ["DEFAULT_ICON_PICKER_LABELS", "iconPicker", DEFAULT_ICON_PICKER_LABELS],
  ["DEFAULT_DIALOG_FRAME_LABELS", "dialogFrame", DEFAULT_DIALOG_FRAME_LABELS],
  ["DEFAULT_FILE_PICKER_LABELS", "filePicker", DEFAULT_FILE_PICKER_LABELS],
  ["DEFAULT_MEASURED_GRID_LABELS", "measuredGrid", DEFAULT_MEASURED_GRID_LABELS],
];

function NamespaceConstantsExample() {
  return (
    <Example
      label="One DEFAULT_*_LABELS per namespace, and the resolvers"
      hint="the English defaults under their own names — what a component-level fallback imports"
    >
      <OutTable
        rows={NAMESPACE_CONSTANTS.map(([name, ns, value]): [string, string] => [
          `${name} === DEFAULT_UI_KIT_LABELS.${ns}`,
          String(value === DEFAULT_UI_KIT_LABELS[ns]),
        ])}
      />
      <div className="mt-4">
        <OutTable
          rows={[
            ['resolveChipInputLabels({ remove: "Entfernen" }).remove', resolveChipInputLabels({ remove: "Entfernen" }).remove],
            ['resolveChipInputLabels().added("tax")', resolveChipInputLabels().added("tax")],
            ['resolveFieldSyncLabels({ pending: "Speichert…" }).pending', resolveFieldSyncLabels({ pending: "Speichert…" }).pending],
            ["resolveFieldSyncLabels().error", resolveFieldSyncLabels().error],
            ['resolvePasswordRevealLabels({ show: "Zeigen" }).hide', resolvePasswordRevealLabels({ show: "Zeigen" }).hide],
            ["resolveDataTableLabels() === DEFAULT_DATA_TABLE_LABELS", String(resolveDataTableLabels() === DEFAULT_DATA_TABLE_LABELS)],
            ["missingDataTableLabels({}).length", String(missingDataTableLabels({}).length)],
            ["missingDataTableLabels(DEFAULT_DATA_TABLE_LABELS)", JSON.stringify(missingDataTableLabels(DEFAULT_DATA_TABLE_LABELS))],
          ]}
        />
      </div>
      <Note>
        The resolvers are the per-component half of the precedence: a partial{" "}
        <code className="font-mono">labels</code> prop merged over the English default. Inside a
        provider the kit uses <code className="font-mono">useKitLabels</code> instead, which
        puts the provider between the two.
      </Note>
    </Example>
  );
}
