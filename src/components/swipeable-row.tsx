import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useRowSwipe, type SwipeStage } from "../hooks/use-row-swipe";

/**
 * One armed swipe action: what it does, and how the reveal panel presents it.
 *
 * The two background classes are the idle and armed states. Before the first
 * threshold is crossed the panel previews the nearest action in its IDLE colour, so
 * the user can see what a little more drag will do; crossing the threshold flips it to
 * `armedClassName`. Passing the same value for both simply removes that feedback.
 */
export interface SwipeAction {
  onCommit: () => void;
  label: string;
  /** Rendered inside the panel. Icons stay the consumer's choice — this package
   *  ships no opinion about which icon set an app uses. */
  icon?: ReactNode;
  /** Background utility class while the action is previewed but not yet armed. */
  className: string;
  /** Background utility class once the drag has passed this action's threshold. */
  armedClassName: string;
}

export interface SwipeableRowProps {
  /** Actions committed by dragging RIGHT, nearest threshold first. */
  right?: SwipeAction[];
  /** Actions committed by dragging LEFT, nearest threshold first. */
  left?: SwipeAction[];
  /** Turn the gesture off — an open editor, a pending mutation, a locked row. */
  enabled?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * A row whose horizontal drag reveals actions underneath it.
 *
 * Both reveal panels are always mounted, each a half-width block behind the content;
 * the content slides over them like a curtain drawing aside, so an action looks like it
 * was there all along rather than popping into existence.
 *
 * Thresholds are not fixed pixel values. They are spread evenly across half the
 * measured row width, so every action stays reachable on a narrow phone — a fixed
 * 72/150/228px ladder overshoots the available half-width there. Half, specifically,
 * so a drag can never pull the row far enough to expose the opposite side's panel.
 *
 * Clicks that follow a drag are swallowed in the capture phase: without that, a swipe
 * would also fire whatever click handler the row content carries (expanding it, opening
 * a dialog) on top of the action it just committed.
 */
export function SwipeableRow({
  right,
  left,
  enabled = true,
  className,
  children,
}: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    setRowWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setRowWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rightActions = right ?? [];
  const leftActions = left ?? [];
  const active = enabled && (rightActions.length > 0 || leftActions.length > 0);
  const maxDrag = rowWidth > 0 ? Math.round(rowWidth / 2) : 200;
  const spread = (actions: SwipeAction[]): SwipeStage[] =>
    actions.map((a, i) => ({
      threshold: Math.round((maxDrag * (i + 1)) / (actions.length + 1)),
      onCommit: a.onCommit,
    }));

  const swipe = useRowSwipe({
    enabled: active,
    rightStages: spread(rightActions),
    leftStages: spread(leftActions),
    maxDrag,
  });

  // A haptic tick per newly armed threshold, so each stage is felt and not only seen.
  const armedNow = swipe.dx >= 0 ? swipe.armedRightIndex : swipe.armedLeftIndex;
  const prevArmed = useRef(-1);
  useEffect(() => {
    if (armedNow > prevArmed.current && armedNow >= 0) navigator.vibrate?.(12);
    prevArmed.current = armedNow;
  }, [armedNow]);

  // Index -1 (nothing armed yet) still previews the nearest action, idle-coloured.
  const rightShown = rightActions[Math.max(0, swipe.armedRightIndex)];
  const leftShown = leftActions[Math.max(0, swipe.armedLeftIndex)];
  const rightArmed = swipe.armedRightIndex >= 0;
  const leftArmed = swipe.armedLeftIndex >= 0;
  const dx = swipe.dx;

  return (
    <div ref={rowRef} className={cn("relative overflow-hidden", className)}>
      {active && (
        <div className="pointer-events-none absolute inset-0 flex">
          <div
            className={cn(
              "flex w-1/2 items-center gap-1.5 px-4 text-xs font-medium text-white transition-colors",
              rightShown ? (rightArmed ? rightShown.armedClassName : rightShown.className) : "",
            )}
          >
            {rightShown && (
              <>
                {rightShown.icon && (
                  <span className={cn("shrink-0 transition-transform", rightArmed && "scale-125")}>
                    {rightShown.icon}
                  </span>
                )}
                <span className="truncate">{rightShown.label}</span>
              </>
            )}
          </div>
          <div
            className={cn(
              "flex w-1/2 items-center justify-end gap-1.5 px-4 text-xs font-medium text-white transition-colors",
              leftShown ? (leftArmed ? leftShown.armedClassName : leftShown.className) : "",
            )}
          >
            {leftShown && (
              <>
                <span className="truncate">{leftShown.label}</span>
                {leftShown.icon && (
                  <span className={cn("shrink-0 transition-transform", leftArmed && "scale-125")}>
                    {leftShown.icon}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div
        // Capture phase: the row's own click handler lives on a DESCENDANT, so a
        // bubble-phase listener here would run after it — too late to suppress.
        onClickCapture={(e) => {
          if (!swipe.consumeClick()) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        className={cn(
          "relative bg-[var(--bg-surface)]",
          // A mouse drag is a supported way to swipe (use-row-swipe gates only on
          // the button, not the pointer type), and a horizontal mouse drag over
          // text also SELECTS that text — so committing an action left the row
          // highlighted blue. Suppressed only while dragging, so text in a row at
          // rest stays selectable.
          swipe.dragging ? "select-none" : "transition-transform duration-150",
        )}
        style={{
          transform: dx !== 0 ? `translate3d(${dx}px,0,0)` : undefined,
          touchAction: active ? "pan-y" : undefined,
        }}
        {...(active ? swipe.handlers : {})}
      >
        {children}
      </div>
    </div>
  );
}
