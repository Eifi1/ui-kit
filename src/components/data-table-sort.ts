/** Multi-column sort state for DataTable: ordered by priority (index 0 is the
 *  primary sort). Encoded as `sort=date.desc,amount` in URLs and the server's
 *  transactions `sort` param — the pre-multi-sort single-value format
 *  (`sort=date.desc`) decodes as a one-element list. */

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

/** Coerce any persisted/URL-derived shape into a `SortState[]`. The
 *  pre-multi-sort localStorage format stored one `{key, dir}` object (or
 *  null); arrays pass through with junk entries dropped. */
export function normalizeSorts(raw: unknown): SortState[] {
  const one = (v: unknown): SortState | null => {
    if (!v || typeof v !== "object") return null;
    const { key, dir } = v as { key?: unknown; dir?: unknown };
    if (typeof key !== "string" || !key) return null;
    return { key, dir: dir === "desc" ? "desc" : "asc" };
  };
  if (Array.isArray(raw)) {
    const out: SortState[] = [];
    for (const entry of raw) {
      const s = one(entry);
      if (s && !out.some((e) => e.key === s.key)) out.push(s);
    }
    return out;
  }
  const single = one(raw);
  return single ? [single] : [];
}

export function encodeSorts(sorts: SortState[]): string | null {
  if (!sorts.length) return null;
  return sorts.map((s) => (s.dir === "desc" ? `${s.key}.desc` : s.key)).join(",");
}

/** Decode a `sort` URL param, dropping unknown and duplicated keys. */
export function decodeSorts(raw: string | null, validKeys: ReadonlySet<string>): SortState[] {
  if (!raw) return [];
  const out: SortState[] = [];
  for (const part of raw.split(",")) {
    const desc = part.endsWith(".desc");
    const asc = part.endsWith(".asc");
    const key = desc ? part.slice(0, -".desc".length) : asc ? part.slice(0, -".asc".length) : part;
    if (!validKeys.has(key) || out.some((s) => s.key === key)) continue;
    out.push({ key, dir: desc ? "desc" : "asc" });
  }
  return out;
}

/** Header-click semantics. Plain click: make `key` the only sort — cycling
 *  asc → desc → none when it already is the sole criterion. Shift-click
 *  (`additive`): append `key` as the next-priority sort, or cycle an existing
 *  entry's direction in place (asc → desc → removed). */
export function nextSorts(prev: SortState[], key: string, additive: boolean): SortState[] {
  const idx = prev.findIndex((s) => s.key === key);
  if (!additive) {
    if (prev.length === 1 && idx === 0) {
      return prev[0].dir === "asc" ? [{ key, dir: "desc" }] : [];
    }
    return [{ key, dir: "asc" }];
  }
  if (idx === -1) return [...prev, { key, dir: "asc" }];
  if (prev[idx].dir === "asc") {
    return prev.map((s, i) => (i === idx ? { key, dir: "desc" as SortDir } : s));
  }
  return prev.filter((_, i) => i !== idx);
}
