import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * The desktop table's `leadingRow`: one full-width cell above the data rows. With
 * `sticky` (0.48, keksdose dev #603) the cell is pinned under the sticky header while the
 * rows scroll — `top` is the header's height, measured and followed (a header that wraps
 * at Large text grows). On the cell, not the `<tr>`: position:sticky on a table row is not
 * reliable across browsers, the reason the header's sticky sits on each `<th>`. Opaque
 * (`bg-surface`), so the rows pass beneath it; `z-[5]`, under the header's `z-10` and over
 * the rows' own sticky cells. The line over it is the cell's own `::before`, drawn over
 * the content (a full-width disclosure header paints its own fill) and moving with the
 * cell; a collapsed table's row border would stay behind at the row's place.
 */
export function DataTableLeadingRow({
  colSpan,
  sticky = false,
  ariaRowIndex,
  children,
}: {
  colSpan: number;
  sticky?: boolean;
  /** Under `virtualize` (0.48.2). */
  ariaRowIndex?: number;
  children: ReactNode;
}) {
  const cellRef = useRef<HTMLTableCellElement>(null);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    if (!sticky) return;
    const head = cellRef.current?.closest("table")?.tHead;
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(head);
    return () => observer.disconnect();
  }, [sticky]);
  return (
    <tr aria-rowindex={ariaRowIndex} className={cn(!sticky && "border-t border-subtle")}>
      <td
        ref={cellRef}
        colSpan={colSpan}
        data-leading-row={sticky ? "sticky" : ""}
        className={cn(
          "p-0",
          sticky &&
            "sticky z-[5] bg-surface before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-px before:bg-[var(--border)] before:content-['']",
        )}
        style={sticky ? { top } : undefined}
      >
        {children}
      </td>
    </tr>
  );
}
