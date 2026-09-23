import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useRowSwipe, type SwipeStage } from "../hooks/use-row-swipe";
import { DEFAULT_SWIPEABLE_ROW_LABELS, useKitLabels } from "../i18n/kit-labels";

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
  /** Turn the gesture off — an open editor, a pending mutation, a locked row. This
   *  also withdraws the keyboard buttons below: a row that must not be acted on must
   *  not be actionable by ANY input. */
  enabled?: boolean;
  /** Names the revealed action buttons as a set ("Row actions"), for a reader that
   *  reaches the group before it reaches any one button. Default:
   *  `swipeableRow.actions` from the {@link UiKitProvider}, else English. */
  actionsLabel?: string;
  className?: string;
  children: ReactNode;
}

/** How much of the row stays on screen at full drag. A row that can be pulled
 *  entirely off its own track reads as already deleted, and there is nothing left to
 *  drag back; a sliver keeps the gesture reversible and the row identifiable. */
const PEEK_PX = 40;

/**
 * A row whose horizontal drag reveals actions underneath it.
 *
 * The reveal panel spans the FULL row width (Keksdose feedback #174). It used to be
 * two half-width blocks side by side, which capped the drag at half the row so the
 * opposite panel could never be exposed — and on a row bound to three actions that
 * left ~55px between stages on a phone, close enough that the wrong one committed.
 * Only the side being dragged toward is painted now, so full width costs nothing:
 * at rest the content covers both anyway, and a drag only ever reveals one side.
 *
 * Thresholds are still not fixed pixel values — they are spread evenly across the
 * available drag, which is now the row width less a {@link PEEK_PX} sliver. A fixed
 * 72/150/228px ladder overshoots a narrow phone; a proportional one keeps every
 * action reachable and roughly doubles the room between them.
 *
 * **Whether the action will fire is stated three ways, not one** (feedback #174): the
 * panel goes from dimmed to solid, the icon grows and gains a filled disc, and the
 * label turns bold — plus the existing haptic tick per newly armed stage. A colour
 * shift alone is easy to miss mid-gesture, and it is invisible to anyone who cannot
 * distinguish the two tones.
 *
 * Clicks that follow a drag are swallowed in the capture phase: without that, a swipe
 * would also fire whatever click handler the row content carries (expanding it, opening
 * a dialog) on top of the action it just committed.
 *
 * ## The keyboard path is buttons, and deliberately not a typed gesture
 *
 * Every action here used to live exclusively inside a pointer drag — `onCommit` had no
 * other caller — so with a keyboard, with a screen reader, or on any input that cannot
 * express 120px of horizontal travel, the row's actions did not exist at all. That is
 * not a rough edge on a phone control: {@link DataTable} mounts this for every row of
 * its mobile layout, and the actions an app puts here are its destructive ones.
 *
 * The rejected fix was to map the gesture onto keys — arrows nudging `dx`, a chord that
 * "swipes". That invents a private idiom with nothing to discover it by, and it makes
 * the keyboard imitate a touchscreen instead of doing the job the touchscreen is doing.
 * So each action is ALSO a real button, `sr-only` until it takes focus and then shown at
 * the row's trailing edge, firing the identical `onCommit`: one definition of what an
 * action is, two ways to reach it, and nothing to drift apart. `sr-only` hides from
 * the eye and not from the accessibility tree, so the row also ANNOUNCES what can be
 * done to it rather than keeping it behind a gesture nobody can hear.
 */
export function SwipeableRow({
  right,
  left,
  enabled = true,
  actionsLabel,
  className,
  children,
}: SwipeableRowProps) {
  const labels = useKitLabels("swipeableRow", DEFAULT_SWIPEABLE_ROW_LABELS, {
    actions: actionsLabel,
  });
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
  // The whole row less a sliver, not half of it (feedback #174). `Math.max` keeps a
  // very narrow row (or one measured before layout) from producing a zero or
  // negative drag, which would arm every stage at once.
  const maxDrag = rowWidth > 0 ? Math.max(96, Math.round(rowWidth - PEEK_PX)) : 200;
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
  const dx = swipe.dx;
  // Only the side being dragged toward is painted, which is what makes a full-width
  // panel safe.
  //
  // The side has to SURVIVE the release, though, and that is what this ref is for
  // (Keksdose feedback dev#467): *"Swiping a category to the left with no option — if
  // letting it go it gets, for the way back, the background color of the opposite
  // swipe direction where there should be no color change at all."* On release dx
  // snaps to 0 while the row itself slides back over 150ms, so a plain `dx < 0` read
  // "right" for exactly the frames where the left side was still uncovered — and
  // painted the RIGHT action's colour into the gap. With no left action at all that
  // colour was the only thing the gesture ever showed.
  //
  // Written during render rather than in an effect: an effect would repaint a frame
  // later (visibly, at 150ms) and `setState` in an effect body is an eslint error in
  // the consuming app. The value is derived from this render's own dx, so a
  // concurrent re-render recomputes it identically.
  const lastSide = useRef<"left" | "right">("right");
  if (dx !== 0) lastSide.current = dx < 0 ? "left" : "right";
  const draggingLeft = dx !== 0 ? dx < 0 : lastSide.current === "left";
  const shown = draggingLeft
    ? leftActions[Math.max(0, swipe.armedLeftIndex)]
    : rightActions[Math.max(0, swipe.armedRightIndex)];
  const armed = draggingLeft ? swipe.armedLeftIndex >= 0 : swipe.armedRightIndex >= 0;

  return (
    <div ref={rowRef} className={cn("relative overflow-hidden", className)}>
      {active && shown && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center gap-2 px-4",
            "text-xs font-medium text-white transition-all",
            // Dimmed until the drag has actually passed a threshold: "nothing will
            // happen yet" has to look different from "let go and this fires", and on
            // a moving row a one-step colour change was too quiet to notice.
            armed ? "opacity-100" : "opacity-60",
            armed ? shown.armedClassName : shown.className,
            // The panel is anchored to the edge the row is uncovering, so the label
            // sits where the eye already is rather than across the screen.
            draggingLeft && "flex-row-reverse",
          )}
        >
          {shown.icon && (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full transition-all",
                // Armed, the icon gets a disc of its own and grows — a second,
                // non-colour signal, and the one that stays readable at a glance.
                armed ? "size-8 scale-110 bg-white/25" : "size-7 bg-white/10",
              )}
            >
              {shown.icon}
            </span>
          )}
          <span className={cn("truncate transition-all", armed && "text-sm font-semibold")}>
            {shown.label}
          </span>
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
      {active && (
        <div
          role="group"
          aria-label={labels.actions}
          // OUTSIDE the sliding div on purpose: an action that travels with the row it
          // acts on is a moving target, and the drag transform would carry it off the
          // screen mid-gesture.
          //
          // `pointer-events-none` here, restored on a button only once it HAS focus: a
          // sr-only button is clipped to nothing but is still a hit target, and this
          // strip sits at the row's right edge — exactly where a leftward drag begins.
          // A gesture that silently failed to start because it landed on an invisible
          // button is not a bug anyone would find by looking at the screen.
          className="pointer-events-none absolute inset-y-0 right-0 z-10 flex items-center gap-1 pr-2"
        >
          {/* Both sides, each still nearest-threshold first, so the tab order reads in
              the order the gesture arms them. */}
          {[...rightActions, ...leftActions].map((action, i) => (
            <button
              key={`${action.label}-${i}`}
              type="button"
              onClick={action.onCommit}
              className={cn(
                "sr-only whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] shadow-sm",
                "focus:not-sr-only focus:pointer-events-auto focus:inline-flex focus:items-center focus:gap-1.5",
                "focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
              )}
            >
              {/* The label is the button's accessible name, so the caller's icon is
                  decoration on top of it rather than a second reading of it. */}
              {action.icon && (
                <span aria-hidden="true" className="[&_svg]:size-4">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
