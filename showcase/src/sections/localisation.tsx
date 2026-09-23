import { useMemo } from "react";
import { DEFAULT_UI_KIT_LABELS, missingKitLabels } from "@eifi1/ui-kit";
import type { UiKitLabels } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";
import { LOCALES, useLocale, useT } from "../i18n";

/**
 * The i18n contract, shown rather than described: the provider, the key tree, and —
 * computed live — how complete each of the showcase's translations is against it.
 */
export function Localisation() {
  return (
    <>
      <ProviderExample />
      <CompletenessExample />
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
