import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { useAnchoredRect, type AnchorRect } from "../hooks/use-anchored-rect";

type TooltipSide = "top" | "bottom" | "left" | "right";

const sidePositionClass: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1",
  left: "right-full top-1/2 -translate-y-1/2 mr-1",
  right: "left-full top-1/2 -translate-y-1/2 ml-1",
};

export function Tooltip({
  label,
  side = "top",
  className,
  portal = false,
  children,
}: {
  label: ReactNode;
  side?: TooltipSide;
  className?: string;
  portal?: boolean;
  children: ReactNode;
}) {
  if (portal) {
    return (
      <PortalTooltip label={label} side={side} className={className}>
        {children}
      </PortalTooltip>
    );
  }
  return (
    <span className={cn("relative inline-flex group/tooltip", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-white opacity-0 shadow-md group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 dark:bg-slate-100 dark:text-slate-900",
          sidePositionClass[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}

const TOOLTIP_GAP = 4;

const portalTransformBySide: Record<TooltipSide, string> = {
  right: "translate(0, -50%)",
  left: "translate(-100%, -50%)",
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
};

/** Anchor point (viewport px) for the tooltip on the given side of `r`. Paired
 *  with {@link portalTransformBySide}, which shifts the box onto that point. */
function tooltipAnchor(r: AnchorRect, side: TooltipSide): { left: number; top: number } {
  switch (side) {
    case "right":
      return { left: r.right + TOOLTIP_GAP, top: r.top + r.height / 2 };
    case "left":
      return { left: r.left - TOOLTIP_GAP, top: r.top + r.height / 2 };
    case "top":
      return { left: r.left + r.width / 2, top: r.top - TOOLTIP_GAP };
    case "bottom":
      return { left: r.left + r.width / 2, top: r.bottom + TOOLTIP_GAP };
  }
}

function PortalTooltip({
  label,
  side,
  className,
  children,
}: {
  label: ReactNode;
  side: TooltipSide;
  className?: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  // The measure + scroll/resize-tracking lifecycle is owned by useAnchoredRect;
  // here we only map the rect to a side-specific anchor point.
  const rect = useAnchoredRect(triggerRef, visible);
  const pos = rect ? tooltipAnchor(rect, side) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={cn("relative inline-flex", className)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {children}
      </span>
      {visible &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              transform: portalTransformBySide[side],
            }}
            className="pointer-events-none z-50 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-white shadow-md dark:bg-slate-100 dark:text-slate-900"
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
