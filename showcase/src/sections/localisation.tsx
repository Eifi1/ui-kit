import { useMemo, useState } from "react";
import {
  DEFAULT_APP_SHELL_LABELS,
  DEFAULT_CALCULATOR_LABELS,
  DEFAULT_CHIP_INPUT_LABELS,
  DEFAULT_COMBOBOX_LABELS,
  DEFAULT_COMMAND_PALETTE_LABELS,
  DEFAULT_COMMON_LABELS,
  DEFAULT_CONFIRM_DIALOG_LABELS,
  DEFAULT_COPY_BUTTON_LABELS,
  DEFAULT_CURRENCY_LABELS,
  DEFAULT_DANGER_CONFIRM_LABELS,
  DEFAULT_DATA_TABLE_LABELS,
  DEFAULT_DATE_PICKER_LABELS,
  DEFAULT_DIALOG_FRAME_LABELS,
  DEFAULT_FIELD_SYNC_LABELS,
  DEFAULT_FILE_LABELS,
  DEFAULT_FEEDBACK_ATTACHMENT_LABELS,
  DEFAULT_FILE_PICKER_LABELS,
  DEFAULT_FLOATING_PANEL_LABELS,
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
  DangerConfirm,
  MiniCalendar,
  Pagination,
  PasswordStrengthMeter,
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
import { UI_KIT_LABELS_DE, uiKitLabelsDe } from "@eifi1/ui-kit/i18n/de";
import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";
import { UI_KIT_LABELS_DE_INFORMAL } from "@eifi1/ui-kit/i18n/de-informal";
import { UI_KIT_LABELS_DE_CH_INFORMAL } from "@eifi1/ui-kit/i18n/de-CH-informal";
import { UI_KIT_LABELS_FR } from "@eifi1/ui-kit/i18n/fr";
import { UI_KIT_LABELS_IT } from "@eifi1/ui-kit/i18n/it";
import { UI_KIT_LABELS_ES } from "@eifi1/ui-kit/i18n/es";
import { UI_KIT_LABELS_HU } from "@eifi1/ui-kit/i18n/hu";
import { UI_KIT_LABELS_ZH } from "@eifi1/ui-kit/i18n/zh";
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
      <ShippedTranslationsExample />
      <InformalGermanExample />
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

/** The shipped dictionaries, each checked against the English tree live. */
const SHIPPED: [string, UiKitLabels][] = [
  ["UI_KIT_LABELS_DE", UI_KIT_LABELS_DE],
  ["UI_KIT_LABELS_DE_CH", UI_KIT_LABELS_DE_CH],
  ["UI_KIT_LABELS_DE_INFORMAL", UI_KIT_LABELS_DE_INFORMAL],
  ["UI_KIT_LABELS_DE_CH_INFORMAL", UI_KIT_LABELS_DE_CH_INFORMAL],
  ["UI_KIT_LABELS_FR", UI_KIT_LABELS_FR],
  ["UI_KIT_LABELS_IT", UI_KIT_LABELS_IT],
  ["UI_KIT_LABELS_ES", UI_KIT_LABELS_ES],
  ["UI_KIT_LABELS_HU", UI_KIT_LABELS_HU],
  ["UI_KIT_LABELS_ZH", UI_KIT_LABELS_ZH],
];

/** German with Swiss digits but German spelling: what `uiKitLabelsDe("de-CH")` alone gives. */
const DE_WITH_SWISS_DIGITS = uiKitLabelsDe("de-CH");

const PAGER_TOTAL = 12345;
const PAGER_SIZE = 25;

function ShippedTranslationsExample() {
  const [page, setPage] = useState(0);
  const variants: { title: string; code: string; labels: UiKitLabels; locale: string }[] = [
    { title: "de", code: "UI_KIT_LABELS_DE", labels: UI_KIT_LABELS_DE, locale: "de-DE" },
    { title: "de, Swiss digits", code: 'uiKitLabelsDe("de-CH")', labels: DE_WITH_SWISS_DIGITS, locale: "de-CH" },
    { title: "de-CH", code: "UI_KIT_LABELS_DE_CH", labels: UI_KIT_LABELS_DE_CH, locale: "de-CH" },
  ];
  return (
    <Example
      label="Shipped translations — de vs de-CH"
      hint="the same pager and password meter under three providers; page through one and all three follow"
    >
      <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-xs text-[var(--text-secondary)]">
        {`import { UI_KIT_LABELS_DE } from "@eifi1/ui-kit/i18n/de";
import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";
import { UI_KIT_LABELS_DE_INFORMAL } from "@eifi1/ui-kit/i18n/de-informal";
import { UI_KIT_LABELS_DE_CH_INFORMAL } from "@eifi1/ui-kit/i18n/de-CH-informal";
// also: /i18n/fr, /it, /es, /hu, /zh — UI_KIT_LABELS_FR … and uiKitLabelsFr(numberLocale) …

<UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
  <App />
</UiKitProvider>`}
      </pre>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {variants.map((v) => (
          <div key={v.title} className="min-w-0 rounded-md border border-[var(--border)] p-3">
            <p className="mb-2 font-mono text-[11px] text-[var(--text-muted)]">
              {v.code} · locale=&quot;{v.locale}&quot;
            </p>
            <UiKitProvider labels={v.labels} locale={v.locale}>
              <Pagination
                page={page}
                totalPages={Math.ceil(PAGER_TOTAL / PAGER_SIZE)}
                pageSize={PAGER_SIZE}
                total={PAGER_TOTAL}
                onPage={setPage}
              />
              <div className="mt-3">
                <PasswordStrengthMeter value="kurz" />
              </div>
              <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
                dialogFrame.close: {v.labels.dialogFrame.close}
                <br />
                file.size(1234567): {v.labels.file.size(1234567)}
              </p>
            </UiKitProvider>
          </div>
        ))}
      </div>
      <OutTable
        rows={SHIPPED.map(([name, labels]) => [
          `missingKitLabels(${name})`,
          `${missingKitLabels(labels, DEFAULT_UI_KIT_LABELS).length} missing`,
        ])}
      />
      <Note>
        The kit ships its own words in German, French, Italian, Spanish, Hungarian and Chinese, one
        subpath each, so an app bundles only the language it imports. Each is a full{" "}
        <code className="font-mono">UiKitLabels</code> (the table above is the live check), and each
        comes with a factory — <code className="font-mono">uiKitLabelsDe(numberLocale)</code>,{" "}
        <code className="font-mono">uiKitLabelsFr(…)</code> — that keeps the words and changes only
        how counts and sizes are written. That is the middle column: German spelling with Swiss
        digits, <code className="font-mono">12’345</code> instead of <code className="font-mono">12.345</code>.{" "}
        <code className="font-mono">UI_KIT_LABELS_DE_CH</code> goes one step further and respells every
        <code className="font-mono"> ß</code> as <code className="font-mono">ss</code> —{" "}
        &ldquo;Gross- und Kleinbuchstaben&rdquo;, &ldquo;Schliessen&rdquo; — including the result of
        every message function, so a name the app passes in is respelled too. The page-number strip
        is formatted with the provider&apos;s <code className="font-mono">locale</code>; the range
        summary by the labels themselves.
      </Note>
    </Example>
  );
}


/** The four German catalogues side by side: two registers × two spellings. */
const GERMAN_REGISTERS: { title: string; code: string; labels: UiKitLabels; locale: string }[] = [
  { title: "formal", code: "UI_KIT_LABELS_DE", labels: UI_KIT_LABELS_DE, locale: "de-DE" },
  { title: "informal", code: "UI_KIT_LABELS_DE_INFORMAL", labels: UI_KIT_LABELS_DE_INFORMAL, locale: "de-DE" },
  { title: "informal, Swiss", code: "UI_KIT_LABELS_DE_CH_INFORMAL", labels: UI_KIT_LABELS_DE_CH_INFORMAL, locale: "de-CH" },
];

/** `dangerConfirm.phrase` is a string or a function of the phrase — call it if it is one. */
const phraseOf = (labels: UiKitLabels) => {
  const phrase = labels.dangerConfirm.phrase;
  return typeof phrase === "function" ? phrase("löschen") : phrase;
};

function InformalGermanExample() {
  const [picked, setPicked] = useState<Record<string, { from: string; to: string }>>({});
  const sampleDate = "1. Oktober 2026";
  return (
    <Example
      label="Formal and informal German — Sie and du"
      hint="@eifi1/ui-kit/i18n/de-informal and de-CH-informal: only the sentences that address the user differ"
    >
      <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-xs text-[var(--text-secondary)]">
        {`import { UI_KIT_LABELS_DE_INFORMAL } from "@eifi1/ui-kit/i18n/de-informal";
import { UI_KIT_LABELS_DE_CH_INFORMAL } from "@eifi1/ui-kit/i18n/de-CH-informal";
// also: uiKitLabelsDeInformal(numberLocale) — "du" with Austrian digits, say`}
      </pre>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {GERMAN_REGISTERS.map((v) => {
          const range = picked[v.code];
          return (
            <div key={v.code} className="min-w-0 space-y-3 rounded-md border border-[var(--border)] p-3">
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                {v.code} · {v.title}
              </p>
              <UiKitProvider labels={v.labels} locale={v.locale}>
                <MiniCalendar
                  mode="range"
                  from={range?.from ?? ""}
                  to={range?.to ?? ""}
                  onSelect={(from, to) => setPicked((p) => ({ ...p, [v.code]: { from, to } }))}
                />
                <p className="text-xs text-[var(--text-secondary)]" aria-hidden>
                  <span className="text-[var(--text-muted)]">announced: </span>
                  {range?.from && !range.to
                    ? v.labels.miniCalendar.startSelected(range.from)
                    : v.labels.miniCalendar.startSelected(sampleDate)}
                </p>
                <DangerConfirm
                  armLabel="Konto löschen…"
                  confirmLabel="Endgültig löschen"
                  phrase="löschen"
                  onConfirm={() => undefined}
                />
              </UiKitProvider>
            </div>
          );
        })}
      </div>
      <OutTable
        rows={[
          ["wizard.missingRequired", `${UI_KIT_LABELS_DE.wizard.missingRequired}  →  ${UI_KIT_LABELS_DE_INFORMAL.wizard.missingRequired}`],
          ["wizard.confirmCancel", `${UI_KIT_LABELS_DE.wizard.confirmCancel}  →  ${UI_KIT_LABELS_DE_INFORMAL.wizard.confirmCancel}`],
          ["tour.awaitClickHint", `${UI_KIT_LABELS_DE.tour.awaitClickHint}  →  ${UI_KIT_LABELS_DE_INFORMAL.tour.awaitClickHint}`],
          ["signaturePad.typedFallbackHint", `${UI_KIT_LABELS_DE.signaturePad.typedFallbackHint}  →  ${UI_KIT_LABELS_DE_INFORMAL.signaturePad.typedFallbackHint}`],
          ['dangerConfirm.phrase("löschen")', `${phraseOf(UI_KIT_LABELS_DE)}  →  ${phraseOf(UI_KIT_LABELS_DE_INFORMAL)}`],
          ["common.save (unchanged)", `${UI_KIT_LABELS_DE.common.save}  →  ${UI_KIT_LABELS_DE_INFORMAL.common.save}`],
        ]}
      />
      <Note>
        Pick a first day in each calendar: the line under it is what a screen reader hears —
        &ldquo;Wählen Sie jetzt ein Enddatum&rdquo; against &ldquo;Wähle jetzt ein Enddatum&rdquo;. Arm
        the delete below it for the typed-phrase prompt in each register. Everything else is the same
        text in both, because a German UI labels actions with infinitives (&ldquo;Speichern&rdquo;)
        and never addressed anyone there; the informal catalogue is built on the formal one and
        overrides only the eight sentences that do. The Swiss one respells ß as ss on top. The
        showcase&apos;s own language menu keeps one German — its dictionaries are keyed by language,
        not by register — so the registers are compared here instead.
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
  ["DEFAULT_FEEDBACK_ATTACHMENT_LABELS", "feedbackAttachment", DEFAULT_FEEDBACK_ATTACHMENT_LABELS],
  ["DEFAULT_CONFIRM_DIALOG_LABELS", "confirmDialog", DEFAULT_CONFIRM_DIALOG_LABELS],
  ["DEFAULT_FLOATING_PANEL_LABELS", "floatingPanel", DEFAULT_FLOATING_PANEL_LABELS],
  ["DEFAULT_COPY_BUTTON_LABELS", "copyButton", DEFAULT_COPY_BUTTON_LABELS],
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
