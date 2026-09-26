import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { IconButton, Tooltip } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * TOOLTIP — 0.10.0's default placement: a tooltip with no `portal` prop looks for a
 * clipping ancestor at mount, and portals its bubble when it finds one. Shown with the
 * narrow scroll box it was built for, beside the same box forced in place.
 */

const ROWS = ["Rent", "Service charge", "Heating", "Insurance", "Electricity"];

/** How far a box scrolls sideways — the "phantom scroll" an invisible bubble causes. */
function useSideScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setExtra(el.scrollWidth - el.clientWidth);
    // After the tooltips' own mount-time check has settled.
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, []);
  return { ref, extra };
}

function ScrollBox({ portal }: { portal?: false }) {
  const { ref, extra } = useSideScroll();
  return (
    <div className="min-w-0">
      <p className="mb-1 font-mono text-xs text-[var(--text-secondary)]">
        {portal === false ? "portal={false}" : "no portal prop (the default)"} · sideways scroll:{" "}
        {extra === null ? "…" : `${extra}px`}
      </p>
      <div ref={ref} className="h-40 w-full max-w-56 overflow-auto rounded-md border border-[var(--border)]">
        <ul className="divide-y divide-[var(--border)]">
          {ROWS.map((row) => (
            <li key={row} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-[var(--text-primary)]">
              <span className="truncate">{row}</span>
              <Tooltip label={`${row}: booked monthly, split by floor area`} side="end" portal={portal}>
                <IconButton size="sm" aria-label={`About ${row}`}>
                  <Info />
                </IconButton>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TooltipAutoPortal() {
  return (
    <Example
      label="Tooltip — auto-portal inside a scroll container"
      hint="no prop needed: an overflow ancestor is detected at mount, and the bubble goes to <body>"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ScrollBox />
        <ScrollBox portal={false} />
      </div>
      <div className="mt-3">
        <Note>
          Both boxes are <code className="font-mono">overflow-auto</code> and each row ends in an info button
          whose bubble opens to the end side. Left, with <code className="font-mono">portal</code> left out: the
          tooltip found the scrolling box when it mounted, so the bubble exists only while it is up, as a{" "}
          <code className="font-mono">position: fixed</code> node on <code className="font-mono">&lt;body&gt;</code>{" "}
          — no sideways scroll, and hovering shows it whole over the box&apos;s edge. Right, forced in place: the
          invisible bubbles still count towards the box&apos;s scrollable width (the readout), and a hovered
          one is cut off by the edge. That phantom scroll is keksdose dev#488; before 0.10.0 every tooltip in
          a table had to remember <code className="font-mono">portal</code>. Outside any such box the cheaper
          in-place bubble is still used.
        </Note>
      </div>
    </Example>
  );
}
