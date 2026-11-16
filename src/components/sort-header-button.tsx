import type { MouseEvent, ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "../lib/cn";
import type { SortDir } from "./data-table-sort";

/** What a sorted header's `aria-sort` says: ARIA allows one sorted column, so a secondary
 *  criterion and an unsorted sortable column both read "none". */
export function ariaSortOf(dir: SortDir | null, primary = true): "ascending" | "descending" | "none" {
  if (!primary || dir === null) return "none";
  return dir === "asc" ? "ascending" : "descending";
}

/**
 * A sortable header's button: the header, then its arrow — both ways at 40 % while the
 * column is not sorted, up or down at full strength while it is — and, with two or more
 * sort keys, the column's place among them. DataTable's header and `TableHeaderCell sort`
 * draw this one (keksdose's budget page copied it, dev #679).
 */
export function SortHeaderButton({
  dir,
  priority,
  onClick,
  className,
  children,
}: {
  dir: SortDir | null;
  /** The column's 1-based place among several sort keys; left out, no badge. */
  priority?: number;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("items-center gap-1 text-start hover:text-primary", className)}
    >
      <span>{children}</span>
      <Icon className={cn("size-3", dir ? "opacity-100" : "opacity-40")} />
      {priority !== undefined && <span className="text-micro font-semibold leading-none text-brand">{priority}</span>}
    </button>
  );
}
