import type { DataTableColumn } from "./data-table";

/** How a column is filtered. `text`/`select`/`date`/`number` each read a value
 *  off the row and compare it against the user's {@link FilterValue}. */
export type ColumnFilter<T> =
  | { type: "text"; getValue: (row: T) => string }
  | { type: "select"; getValue: (row: T) => string; options?: { value: string; label?: string }[] }
  | { type: "date"; getValue: (row: T) => string | null | undefined }
  | { type: "number"; getValue: (row: T) => number | null | undefined };

/** The current state of a column's filter (what the user has entered). */
export type FilterValue =
  | { type: "text"; q: string }
  | { type: "select"; values: string[] }
  | { type: "date"; from: string; to: string }
  | { type: "number"; min: string; max: string; abs: boolean };

/** A column's filter config, falling back to a plain text filter over `filterBy`. */
export function resolveFilter<T>(col: DataTableColumn<T>): ColumnFilter<T> | null {
  if (col.filter) return col.filter;
  if (col.filterBy) return { type: "text", getValue: col.filterBy };
  return null;
}

/** Whether a filter value is actually narrowing anything (vs its empty default). */
export function isFilterActive(v: FilterValue | undefined): boolean {
  if (!v) return false;
  switch (v.type) {
    case "text":
      return v.q.trim().length > 0;
    case "select":
      return v.values.length > 0;
    case "date":
      return !!v.from || !!v.to;
    case "number":
      return v.min !== "" || v.max !== "" || v.abs;
  }
}

/**
 * Whether `row` passes column `col`'s filter given the user's `state`.
 *
 * `locale` is for the text filter's case folding. Plain `toLowerCase` folds by the
 * root rules, under which a Turkish user typing "istanbul" does not find "İSTANBUL";
 * `toLocaleLowerCase(locale)` does. Optional, and `undefined` is the runtime's default.
 */
export function rowMatches<T>(
  col: DataTableColumn<T>,
  row: T,
  state: FilterValue,
  locale?: string,
): boolean {
  const filter = resolveFilter(col);
  if (!filter) return true;
  switch (filter.type) {
    case "text": {
      if (state.type !== "text" || !state.q.trim()) return true;
      return filter
        .getValue(row)
        .toLocaleLowerCase(locale)
        .includes(state.q.trim().toLocaleLowerCase(locale));
    }
    case "select": {
      if (state.type !== "select" || state.values.length === 0) return true;
      return state.values.includes(filter.getValue(row));
    }
    case "date": {
      if (state.type !== "date") return true;
      const raw = filter.getValue(row);
      if (!raw) return !state.from && !state.to;
      const v = raw.slice(0, 10);
      if (state.from && v < state.from) return false;
      if (state.to && v > state.to) return false;
      return true;
    }
    case "number": {
      if (state.type !== "number") return true;
      const raw = filter.getValue(row);
      if (raw == null || Number.isNaN(raw)) return !state.min && !state.max;
      const x = state.abs ? Math.abs(raw) : raw;
      if (state.min !== "" && x < Number(state.min)) return false;
      if (state.max !== "" && x > Number(state.max)) return false;
      return true;
    }
  }
}

/** The empty filter state for a column's filter type. */
export function defaultFilterState<T>(filter: ColumnFilter<T>): FilterValue {
  switch (filter.type) {
    case "text":
      return { type: "text", q: "" };
    case "select":
      return { type: "select", values: [] };
    case "date":
      return { type: "date", from: "", to: "" };
    case "number":
      return { type: "number", min: "", max: "", abs: false };
  }
}

/**
 * Escape the ONE character the select codec uses as its separator, plus the escape
 * marker itself so the transform is reversible.
 *
 * A minimal escape rather than `encodeURIComponent`, deliberately: these strings sit
 * inside a query-parameter value that `URLSearchParams` already encodes, so a full
 * percent-encode would double-encode every space into `%2520` and make shared links
 * unreadable for no gain. Only `,` can be misread here.
 *
 * Backwards compatible with every link written before this existed: a value with
 * neither `,` nor `%` passes through both directions untouched, and `%` on its own
 * never matched `%25` either.
 */
function escapeSelectValue(v: string): string {
  return v.replace(/%/g, "%25").replace(/,/g, "%2C");
}

/** Inverse of {@link escapeSelectValue}. The order matters and is the reverse of the
 *  escape: undoing `%2C` first cannot see the `2C` inside an escaped `%252C`. */
function unescapeSelectValue(v: string): string {
  return v.replace(/%2C/g, ",").replace(/%25/g, "%");
}

/** URL-safe encoding of a filter value (`f.<column>` param), null when empty. */
export function encodeFilterValue(v: FilterValue): string | null {
  switch (v.type) {
    case "text":
      return v.q.trim() ? v.q : null;
    case "select":
      // Escaped before joining: an option value may legitimately contain the
      // separator (a free-text title, a payee or category name), and without this it
      // came back as two values and the filter silently matched nothing.
      return v.values.length ? v.values.map(escapeSelectValue).join(",") : null;
    case "date":
      return v.from || v.to ? `${v.from}..${v.to}` : null;
    case "number": {
      const hasRange = v.min !== "" || v.max !== "";
      if (!hasRange && !v.abs) return null;
      return `${v.min}..${v.max}${v.abs ? "!" : ""}`;
    }
  }
}

/** Inverse of {@link encodeFilterValue} given just the filter type — for
 *  callers that know a column's type without holding its full config. */
export function decodeFilterValueOfType(type: FilterValue["type"], raw: string): FilterValue {
  switch (type) {
    case "text":
      return { type: "text", q: raw };
    case "select":
      return {
        type: "select",
        values: raw
          .split(",")
          .filter((v) => v.length > 0)
          .map(unescapeSelectValue),
      };
    case "date": {
      const [from = "", to = ""] = raw.split("..");
      return { type: "date", from, to };
    }
    case "number": {
      let body = raw;
      const abs = body.endsWith("!");
      if (abs) body = body.slice(0, -1);
      const [min = "", max = ""] = body.split("..");
      return { type: "number", min, max, abs };
    }
  }
}

/** Inverse of {@link encodeFilterValue}, typed by the column's filter config. */
export function decodeFilterValue<T>(filter: ColumnFilter<T>, raw: string): FilterValue {
  return decodeFilterValueOfType(filter.type, raw);
}

// ---------- Filter builders ----------
//
// Terse builders for `DataTableColumn.filter`, lifted from kastlan's column-filters.ts,
// which every converted list page imports. The one that earns its keep is `selectFilter`:
// in `serverPagination` mode a select filter MUST declare its options (the table would
// otherwise derive them from the rows of the page on screen), and the options an app has
// to hand are usually a translated `{ value: label }` map.

/** A free-text filter over `getValue`. */
export function textFilter<T>(getValue: (row: T) => string): ColumnFilter<T> {
  return { type: "text", getValue };
}

/**
 * A multi-select filter. `options` is an options array, or a `{ value: label }` record
 * (a translated status map) — kept in its key order. Left out, the table derives the
 * options from the rows it holds.
 */
export function selectFilter<T>(
  getValue: (row: T) => string,
  options?: { value: string; label?: string }[] | Record<string, string>,
): ColumnFilter<T> {
  const opts = Array.isArray(options)
    ? options
    : options
      ? Object.entries(options).map(([value, label]) => ({ value, label }))
      : undefined;
  return { type: "select", getValue, options: opts };
}

/** A from/to date filter over an ISO date (or date-time) string. */
export function dateFilter<T>(getValue: (row: T) => string | null | undefined): ColumnFilter<T> {
  return { type: "date", getValue };
}

/** A min/max (and absolute-value) filter over a number. */
export function numberFilter<T>(getValue: (row: T) => number | null | undefined): ColumnFilter<T> {
  return { type: "number", getValue };
}

/**
 * A link to a list page with one column filter already applied — in the table's own URL
 * scheme (`f.<column>=<encoded>`), which a table with `urlSync` (or
 * {@link useTableUrlState}) reads on mount. kastlan's `buildListUrl`, which had to
 * restate the `f.` prefix to do it.
 *
 * `value` is a string for a text filter, an array for a select filter, or any
 * {@link FilterValue}. A filter that narrows nothing returns `path` unchanged. A `path`
 * that already carries a query keeps it; a `#fragment` stays at the end.
 *
 *     filterHref("/units", "status", ["vacant"]) // "/units?f.status=vacant"
 */
export function filterHref(
  path: string,
  column: string,
  value: string | string[] | FilterValue,
  /** The target table's `urlSync` prefix, if it has one (`{ prefix: "inv." }` →
   *  `inv.f.<column>`). */
  options?: { prefix?: string },
): string {
  const state: FilterValue =
    typeof value === "string"
      ? { type: "text", q: value }
      : Array.isArray(value)
        ? { type: "select", values: value }
        : value;
  const encoded = encodeFilterValue(state);
  if (encoded == null) return path;
  const hashAt = path.indexOf("#");
  const base = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const hash = hashAt >= 0 ? path.slice(hashAt) : "";
  const queryAt = base.indexOf("?");
  const params = new URLSearchParams(queryAt >= 0 ? base.slice(queryAt + 1) : "");
  params.set(`${options?.prefix ?? ""}f.${column}`, encoded);
  return `${queryAt >= 0 ? base.slice(0, queryAt) : base}?${params.toString()}${hash}`;
}
