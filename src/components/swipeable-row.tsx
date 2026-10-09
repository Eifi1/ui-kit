import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../lib/cn";
import { FOCUS_RING } from "./focus-ring";
import type { StatusDotTone } from "./status-dot";
import { useRowSwipe, type SwipeStage } from "../hooks/use-row-swipe";
import { DEFAULT_SWIPEABLE_ROW_LABELS, useKitLabels } from "../i18n/kit-labels";

/**
 * What a swipe action's panel means — the vocabulary Chip, ProgressBar and StatusDot
 * already share, so a curtain can be "the colour of the status it produces" by name:
 * brand, neutral, success, warning, danger, info, income, expense, and the categorical
 * hues blue, indigo, purple, teal and orange.
 */
export type SwipeTone = StatusDotTone;

/**
 * An app's own fill for a documented exception (0.33, docs/colour-roles-harmonization.md
 * §12.6) — a curtain that must be exactly its status pill's palette fill, or two
 * strengths of one tone. CSS colours or `var()`s, the same in both themes unless the app
 * passes a variable it declares per theme in its own stylesheet. The kit cannot measure
 * these, so the app's tests pin the pair.
 */
export interface SwipePaint {
  /** The armed panel's fill; idle shows a 14 % wash of it on the card. */
  fill: string;
  /** The text and icon colour ON `fill`, armed. Idle text is the body ink. */
  foreground: string;
}

interface SwipeActionBase {
  onCommit: () => void;
  label: string;
  /** Rendered inside the panel. Icons stay the consumer's choice — this package
   *  ships no opinion about which icon set an app uses. */
  icon?: ReactNode;
}

/**
 * One armed swipe action: what it does, and how the reveal panel presents it.
 *
 * The panel has two states. Before the first threshold is crossed it previews the
 * nearest action IDLE, so the user can see what a little more drag will do; crossing
 * the threshold ARMS it — "let go and this fires".
 *
 * **`tone`** (0.33) is how the kit paints it: idle, the tone's soft wash under the
 * tone's own text colour (`bg-danger-soft text-danger`, Chip's soft look, ≥ 4.5:1);
 * armed, the tone's solid fill under its `-contrast` foreground (≥ 5:1). The soft→solid
 * step is the signal. It replaces a panel dimmed to 60 % at idle, whose label sat at
 * 2.4–4.5:1 on the kit's own swipes, and a white label that was unreadable on every
 * dark-mode pastel.
 *
 * **`paint`** follows the same rule for an app's documented exception (see
 * {@link SwipePaint}). **`className` / `armedClassName`** is the old path, kept so
 * existing call sites compile; there the label is white unless the classes set a
 * colour, and the idle panel is still dimmed.
 */
export type SwipeAction = SwipeActionBase &
  (
    | {
        /** The kit paints the panel: the tone's wash idle, its fill and `-contrast` armed. */
        tone: SwipeTone;
        paint?: never;
        className?: never;
        armedClassName?: never;
      }
    | {
        /** A documented app exception: idle a 14 % wash of `fill` under the body ink,
         *  armed `fill` under `foreground`. */
        paint: SwipePaint;
        tone?: never;
        className?: never;
        armedClassName?: never;
      }
    | {
        tone?: never;
        paint?: never;
        /** @deprecated 0.33 — pass `tone`, or `paint` for an exception. Background
         *  utility class while the action is previewed but not yet armed; the panel is
         *  dimmed then, and its text is white unless this sets a text colour. */
        className: string;
        /** @deprecated 0.33 — pass `tone`, or `paint`. Background utility class once
         *  the drag has passed this action's threshold. */
        armedClassName: string;
      }
  );

/**
 * Each tone's panel, idle and armed. Literal class strings, because Tailwind finds a
 * class by reading the source. Idle is Chip's soft recipe for the tone (the money pair
 * takes Chip's soft money look, the well under the money colour; neutral the active
 * fill under the secondary ink); armed is the plain fill, not `-hover`, under the
 * fill's own foreground. Measured in every shipped preset by
 * theme/__tests__/tokens-css-audit.test.ts.
 */
export const SWIPE_TONE: Record<SwipeTone, { idle: string; armed: string }> = {
  brand: { idle: "bg-brand-soft text-brand-muted", armed: "bg-brand text-brand-contrast" },
  neutral: { idle: "bg-active text-secondary", armed: "bg-neutral text-neutral-contrast" },
  success: { idle: "bg-success-soft text-success", armed: "bg-success text-success-contrast" },
  warning: { idle: "bg-warning-soft text-warning", armed: "bg-warning text-warning-contrast" },
  danger: { idle: "bg-danger-soft text-danger", armed: "bg-danger text-danger-contrast" },
  info: { idle: "bg-info-soft text-info", armed: "bg-info text-info-contrast" },
  income: { idle: "bg-surface-2 text-money-pos", armed: "bg-money-pos text-money-income-contrast" },
  expense: { idle: "bg-surface-2 text-money-neg", armed: "bg-money-neg text-money-expense-contrast" },
  blue: { idle: "bg-hue-blue-soft text-hue-blue", armed: "bg-hue-blue text-hue-blue-contrast" },
  indigo: { idle: "bg-hue-indigo-soft text-hue-indigo", armed: "bg-hue-indigo text-hue-indigo-contrast" },
  purple: { idle: "bg-hue-purple-soft text-hue-purple", armed: "bg-hue-purple text-hue-purple-contrast" },
  teal: { idle: "bg-hue-teal-soft text-hue-teal", armed: "bg-hue-teal text-hue-teal-contrast" },
  orange: { idle: "bg-hue-orange-soft text-hue-orange", armed: "bg-hue-orange text-hue-orange-contrast" },
};

/** `paint`'s two looks, from the two custom properties the panel carries inline. The
 *  idle wash is `--brand-bg`'s recipe (14 % of the fill into the card). */
const PAINT_IDLE = "bg-[color-mix(in_oklab,var(--swipe-paint-fill)_14%,var(--bg-surface))] text-primary";
const PAINT_ARMED = "bg-[var(--swipe-paint-fill)] text-[var(--swipe-paint-fg)]";

/** The panel's colour classes, inline style and dimming for one action and state. */
function panelLook(action: SwipeAction, armed: boolean): { className: string; style?: CSSProperties; dim: boolean } {
  if (action.tone) return { className: SWIPE_TONE[action.tone][armed ? "armed" : "idle"], dim: false };
  if (action.paint) {
    return {
      className: armed ? PAINT_ARMED : PAINT_IDLE,
      style: {
        "--swipe-paint-fill": action.paint.fill,
        "--swipe-paint-fg": action.paint.foreground,
      } as CSSProperties,
      dim: false,
    };
  }
  // The deprecated path, as it was: white text under the caller's fill, dimmed idle.
  return { className: cn("text-white", armed ? action.armedClassName : action.className), dim: !armed };
}

/**
 * `right`/`left` are PHYSICAL drag directions in every writing direction, and stay so on
 * purpose: a swipe is a movement of the finger across the glass, the gesture hook
 * measures it in screen pixels, and "which way is destructive" is an app decision that
 * RTL guidelines do not agree on. An app that wants mirrored actions in RTL swaps the
 * two arrays itself. What the component does mirror is everything it lays out: the
 * reveal panel's contents hug the physical edge being uncovered, and the keyboard
 * buttons sit at the row's logical END.
 */
export interface SwipeableRowProps {
  /** Actions committed by dragging (physically) RIGHT, nearest threshold first. */
  right?: SwipeAction[];
  /** Actions committed by dragging (physically) LEFT, nearest threshold first. */
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
 * panel goes from the tone's soft wash to its solid fill, the icon grows and gains a
 * filled disc, and the label turns bold — plus the existing haptic tick per newly armed
 * stage. A colour
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
  // Adjusted during render rather than in an effect: an effect would repaint a frame
  // later (visibly, at 150ms). State set while rendering re-renders this component
  // before anything is committed, so the released frame already has the right side.
  const [lastSide, setLastSide] = useState<"left" | "right">("right");
  const side = dx === 0 ? null : dx < 0 ? "left" : "right";
  if (side && side !== lastSide) setLastSide(side);
  const draggingLeft = side ? side === "left" : lastSide === "left";
  const shown = draggingLeft
    ? leftActions[Math.max(0, swipe.armedLeftIndex)]
    : rightActions[Math.max(0, swipe.armedRightIndex)];
  const armed = draggingLeft ? swipe.armedLeftIndex >= 0 : swipe.armedRightIndex >= 0;
  const look = shown ? panelLook(shown, armed) : null;

  return (
    <div ref={rowRef} className={cn("relative overflow-hidden", className)}>
      {/* The card under the panel. A dark theme's washes are translucent, and a tone's
          idle pair is measured as that wash ON the card — so the card is there, whatever
          the row happens to sit in. */}
      {active && shown && <div aria-hidden className="pointer-events-none absolute inset-0 bg-surface" />}
      {active && shown && look && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center gap-2 px-4",
            "text-xs font-medium transition-all",
            look.className,
            // The old path only: dimmed until the drag has passed a threshold. A tone
            // or a paint says it with the soft→solid step instead, which keeps its
            // label readable at both ends.
            look.dim && "opacity-60",
            // The panel is anchored to the edge the row is uncovering, so the label
            // sits where the eye already is rather than across the screen. That edge is
            // physical, while a flex row starts at the INLINE start — so in RTL the two
            // directions swap, or the label sat under the row on the covered side.
            draggingLeft ? "flex-row-reverse rtl:flex-row" : "rtl:flex-row-reverse",
          )}
          style={look.style}
        >
          {shown.icon && (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full transition-all",
                // Armed, the icon gets a disc of its own and grows — a second,
                // non-colour signal, and the one that stays readable at a glance. In
                // the label's own colour (0.33): a white disc vanished on a dark
                // theme's pastel fill, and the label's colour works on every pair.
                armed ? "size-8 scale-110 bg-current/20" : "size-7 bg-current/10",
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
          swipe.dragging ? "select-none" : "transition-transform duration-150 motion-reduce:transition-none",
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
          // strip sits at the row's trailing edge — exactly where a drag toward the
          // start begins.
          //
          // `end-0`/`pe-2`, not `right-0`/`pr-2`: in RTL the right edge is where the
          // row's title starts, and a focused button there covered it.
          // A gesture that silently failed to start because it landed on an invisible
          // button is not a bug anyone would find by looking at the screen.
          className="pointer-events-none absolute inset-y-0 end-0 z-10 flex items-center gap-1 pe-2"
        >
          {/* Both sides, each still nearest-threshold first, so the tab order reads in
              the order the gesture arms them. */}
          {[...rightActions, ...leftActions].map((action, i) => (
            <button
              key={`${action.label}-${i}`}
              type="button"
              onClick={action.onCommit}
              className={cn(
                "sr-only whitespace-nowrap rounded-md border-[var(--border)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] shadow-sm",
                "focus:not-sr-only focus:pointer-events-auto focus:inline-flex focus:items-center focus:gap-1.5",
                // The box's padding and border only once it shows (0.32.1, keksdose's
                // 0.32 report). Unconditional, `px-2` and `border` beat `sr-only`'s
                // `padding: 0` and `border-width: 0`, so the hidden button was a 1 px
                // box with 2 × 0.5rem of padding round it: 26 px at Extra large, running
                // past the row's end from the strip's start — invisible under its clip,
                // but counted in the page's scroll width (§4: nothing overflows).
                "focus:border focus:px-2 focus:py-1",
                FOCUS_RING,
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
