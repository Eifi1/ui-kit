import { useLocation } from "react-router";
import { Button, ToggleGroup, useSearchParamState, useSearchParamsState } from "@eifi1/ui-kit";
// Until the barrel exports `useSearchParamsState` (0.25), straight from the module — the
// same file the barrel re-exports, so both hooks share one queue of writes.
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * 0.25 — URL writes that compose (keksdose live #378), for the "State in the URL" page
 * (`url-state`). keksdose wired TranslationReviewPanel's `onFilterChange` to four
 * `useSearchParamState` setters; react-router hands each setter's updater the RENDER's
 * params, so the last one wrote the other three's old values back and no filter had
 * any effect. Now the setters build on each other, one handler adds one history entry,
 * and `useSearchParamsState` keeps a whole filter object in the URL with one setter.
 *
 * Keys `status`, `area`, `sort`, `from` and `to` — none of the page's other demos use
 * them, so they share its query string without stepping on each other.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

export function SearchParams025Demo() {
  return (
    <>
      <FilterObjectDemo />
      <ChainedSettersDemo />
    </>
  );
}

/** The router's query (under the HashRouter, after the `#`). */
function QueryReadout({ extra = [] }: { extra?: Array<[string, React.ReactNode]> }) {
  const { search } = useLocation();
  return <OutTable rows={[["location.search", search || "— (clean URL)"], ...extra]} />;
}

/* ── useSearchParamsState ────────────────────────────────────────────────── */

type Status = "all" | "open" | "done";
type Area = "all" | "legal" | "app";
type Sort = "key" | "status";
const STATUSES: readonly Status[] = ["all", "open", "done"];
const AREAS: readonly Area[] = ["all", "legal", "app"];
const SORTS: readonly Sort[] = ["key", "status"];
const oneOf =
  <T extends string>(allowed: readonly T[]) =>
  (raw: string): T | undefined =>
    (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;

const KEYS: ReadonlyArray<{ key: string; area: Exclude<Area, "all">; status: Exclude<Status, "all"> }> = [
  { key: "legal.imprint.title", area: "legal", status: "open" },
  { key: "legal.privacy.intro", area: "legal", status: "done" },
  { key: "app.nav.settings", area: "app", status: "open" },
  { key: "app.empty.title", area: "app", status: "done" },
  { key: "app.errors.offline", area: "app", status: "open" },
];

function FilterObjectDemo() {
  const [filter, setFilter] = useSearchParamsState({
    status: { default: "all" as Status, parse: oneOf(STATUSES) },
    area: { default: "all" as Area, parse: oneOf(AREAS) },
    // A sort is a view of the list, not a step: it rewrites the entry.
    sort: { default: "key" as Sort, parse: oneOf(SORTS), history: "replace" },
  });
  const rows = KEYS.filter(
    (r) => (filter.status === "all" || r.status === filter.status) && (filter.area === "all" || r.area === filter.area),
  ).sort((a, b) => (filter.sort === "key" ? a.key.localeCompare(b.key) : a.status.localeCompare(b.status)));

  return (
    <Example
      label="useSearchParamsState — a filter object in the URL"
      hint="one setter writes every field in one URL update; each field keeps its own parse, default and history"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <ToggleGroup<Status>
            label="Status"
            value={filter.status}
            onChange={(status) => setFilter({ status })}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "done", label: "Done" },
            ]}
          />
          <ToggleGroup<Area>
            label="Area"
            value={filter.area}
            onChange={(area) => setFilter({ area })}
            options={[
              { value: "all", label: "All" },
              { value: "legal", label: "Legal" },
              { value: "app", label: "App" },
            ]}
          />
          <ToggleGroup<Sort>
            label="Sort"
            value={filter.sort}
            onChange={(sort) => setFilter({ sort })}
            options={[
              { value: "key", label: "Key" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
        <Row>
          <Button variant="secondary" size="sm" onClick={() => setFilter({ status: "open", area: "legal" })}>
            Open legal strings
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFilter({ status: "all", area: "all", sort: "key" })}>
            Clear filters
          </Button>
        </Row>
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] text-xs">
          {rows.length === 0 ? (
            <li className="px-3 py-2 text-[var(--text-secondary)]">No key matches.</li>
          ) : (
            rows.map((r) => (
              <li key={r.key} className="flex flex-wrap justify-between gap-x-3 px-3 py-2">
                <span className="font-mono break-all">{r.key}</span>
                <span className="text-[var(--text-secondary)]">{r.status}</span>
              </li>
            ))
          )}
        </ul>
        <QueryReadout extra={[["filter", `${filter.status} · ${filter.area} · ${filter.sort}`]]} />
        <Note>
          {code('useSearchParamsState({ status: { default: "all", parse }, area: { … }, sort: { …, history: "replace" } })')}{" "}
          returns the object and one setter that takes a partial — or a whole filter object, as{" "}
          {code("TranslationReviewPanel")}&apos;s {code("onFilterChange")} reports it ({code("filter={filter} onFilterChange={setFilter}")}).{" "}
          <em>Open legal strings</em> sets two fields in one entry, so Back undoes both; a sort rewrites the entry,
          and a sort changed together with a filter rides on the filter&apos;s entry. A field at its default leaves the URL.
        </Note>
      </div>
    </Example>
  );
}

/* ── Single setters in a row ─────────────────────────────────────────────── */

const PRESETS = [
  { label: "January", from: "2026-01-01", to: "2026-01-31" },
  { label: "Q1", from: "2026-01-01", to: "2026-03-31" },
  { label: "Year", from: "2026-01-01", to: "2026-12-31" },
] as const;

function ChainedSettersDemo() {
  const [from, setFrom] = useSearchParamState("from", "");
  const [to, setTo] = useSearchParamState("to", "");
  return (
    <Example
      label="useSearchParamState — setters called in a row compose"
      hint="each setter builds on the one before it in the same handler; the handler adds one history entry"
    >
      <div className="space-y-3">
        <Row>
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant={from === p.from && to === p.to ? "brand" : "secondary"}
              size="sm"
              onClick={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Any date
          </Button>
        </Row>
        <QueryReadout extra={[["from → to", from || to ? `${from || "…"} → ${to || "…"}` : "any date"]]} />
        <Note>
          A preset calls {code('setFrom("2026-01-01")')} and then {code('setTo("2026-03-31")')}. Before 0.25 the
          second started from the URL as it was rendered and wrote the old {code("from")} back, so only{" "}
          {code("to")} landed (keksdose live #378). Now the second builds on the first, and one Back undoes the
          preset. Writing what the URL already says navigates nowhere — no dead history entry.
        </Note>
      </div>
    </Example>
  );
}
