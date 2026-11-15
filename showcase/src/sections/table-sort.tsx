import { useMemo, useState } from "react";
import { SortStrip, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@eifi1/ui-kit";
import { Example, Note, code } from "../lib/section";
import { numberFormat } from "../lib/number-format";

/**
 * The Description list & table page's sorting: `TableHeaderCell sort` and `SortStrip` —
 * keksdose's budget page (dev #679) sorts every category by Available on a hand-built
 * Table. Figures are formatted once with en-GB, so the specimens do not move with the
 * language.
 */

const chf = (n: number) => numberFormat("en-GB", { style: "currency", currency: "CHF" }).format(n);

type Line = { category: string; planned: number; available: number };
const LINES: Line[] = [
  { category: "Groceries", planned: 600, available: 142.5 },
  { category: "Rent", planned: 1_850, available: 0 },
  { category: "Transport", planned: 220, available: 87.2 },
  { category: "Holidays", planned: 300, available: 1_140 },
];

type SortDir = "asc" | "desc";
type Key = "category" | "planned" | "available";
const OPTIONS: { value: Key; label: string }[] = [
  { value: "category", label: "Category" },
  { value: "planned", label: "Planned" },
  { value: "available", label: "Available" },
];

export function TableSortDemo() {
  const [key, setKey] = useState<Key>("available");
  const [dir, setDir] = useState<SortDir>("desc");
  const rows = useMemo(() => {
    const sign = dir === "asc" ? 1 : -1;
    return [...LINES].sort((a, b) =>
      key === "category" ? sign * a.category.localeCompare(b.category) : sign * (a[key] - b[key]),
    );
  }, [key, dir]);
  // A header press: a new column starts descending for figures, ascending for words;
  // the sorted column turns round.
  const toggle = (next: Key) => () => {
    if (next === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(next);
      setDir(next === "category" ? "asc" : "desc");
    }
  };
  const sortOf = (col: Key) => ({ dir: col === key ? dir : null, onToggle: toggle(col) });
  return (
    <Example
      label="TableHeaderCell sort and SortStrip"
      hint="a static table sorted by its header, and the same sort as a strip where there is no header row"
    >
      <SortStrip
        className="mb-3 max-w-md"
        options={OPTIONS}
        value={key}
        dir={dir}
        onPick={(value) => value && toggle(value as Key)()}
        onFlip={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
      />
      <Table framed>
        <TableHead>
          <TableRow>
            <TableHeaderCell sort={sortOf("category")}>Category</TableHeaderCell>
            <TableHeaderCell numeric sort={sortOf("planned")}>
              Planned
            </TableHeaderCell>
            <TableHeaderCell numeric sort={sortOf("available")}>
              Available
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((l) => (
            <TableRow key={l.category}>
              <TableCell>{l.category}</TableCell>
              <TableCell numeric>{chf(l.planned)}</TableCell>
              <TableCell numeric>{chf(l.available)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-3">
        <Note>
          {code("sort={{ dir, onToggle }}")} draws DataTable&apos;s sort button in the header — its arrow both ways at
          40&nbsp;% while {code("dir")} is {code("null")} — and sets {code("aria-sort")}. The caller holds the sort and
          orders the rows. {code("SortStrip")} is DataTable&apos;s phone sort row for any list: a labelled select and a
          direction button, each reporting its own change; {code("offerDefault")} adds &ldquo;Default order&rdquo;.
        </Note>
      </div>
    </Example>
  );
}
