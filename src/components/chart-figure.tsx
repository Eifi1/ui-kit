// A chart's accessible description — internal, not exported from the barrel.
//
// A chart is a `role="figure"` named by its `aria-label` and described by a sentence of
// what it shows (0.52, refactor audit 2026-10-30, DSP-5). SeriesChart and Treemap each
// built the `hidden` sentence and the `aria-describedby` that points at it, and already
// differed: Treemap kept a caller's own ids, SeriesChart had none to keep. Both put the
// sentence AFTER the figure, as its sibling, so the chart stopped being its parent's last
// child and a stack's `space-y-*` or `divide-y` gave it a margin or a rule underneath (0.52
// code review, deep, charts, findings 7 and 14). One copy now, rendered inside the root.
import { useId, type ReactNode } from "react";

export interface FigureDescription {
  /** The root's `aria-describedby`: the caller's own ids, then the description's. */
  describedBy: string | undefined;
  /** The description, to render INSIDE the root; `null` when there is none. */
  node: ReactNode;
}

/**
 * The description of a figure, and the `aria-describedby` that reads it — after the
 * caller's own ids (`describedBy`), which it keeps. The sentence is `hidden`: it is read
 * through the reference, never a second time in browse mode, and takes no room.
 */
export function useFigureDescription(description: string | undefined, describedBy?: string): FigureDescription {
  const id = useId();
  if (!description) return { describedBy, node: null };
  return {
    describedBy: describedBy ? `${describedBy} ${id}` : id,
    node: (
      <span id={id} hidden>
        {description}
      </span>
    ),
  };
}
