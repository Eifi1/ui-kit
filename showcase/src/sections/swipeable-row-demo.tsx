import { useState } from "react";
import { Archive, BellOff, Trash2, Undo2 } from "lucide-react";
import { Button, PHONE_QUERY, SwipeableRow, cn, useMediaQuery, useRowSwipe } from "@eifi1/ui-kit";
import type { SwipeAction } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * SWIPEABLE ROW — `SwipeableRow`, and `useRowSwipe` underneath it.
 *
 * The row listens to raw Pointer Events and measures its own width, so every specimen
 * here can be dragged with a mouse as well as a finger — and reached by keyboard, where
 * the actions surface as real buttons.
 */

// Live readouts share one class so a reader can tell "this is state" from "this is
// chrome" at a glance.
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

export function SwipeableRowDemo() {
  return (
    <>
      <Example
        label="SwipeableRow"
        hint="Drag the row sideways with a mouse or a finger. Further left picks a later action."
      >
        <SwipeDemo />
      </Example>

      <Example
        label="SwipeableRow — stages, one-sided rows, actionsLabel and right-to-left"
        hint="Tab into a row: its actions surface as real buttons at the row's edge."
      >
        <SwipeVariants />
      </Example>

      <Example
        label="useRowSwipe — the hook underneath, read live"
        hint="What SwipeableRow is built from: a dx, an axis lock, and one armed index per side."
      >
        <RawSwipe />
      </Example>
    </>
  );
}

/* ── swipeable row ─────────────────────────────────────────────────────────── */

function SwipeDemo() {
  const [log, setLog] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const belowPhone = useMediaQuery(PHONE_QUERY, false);

  const record = (what: string) => setLog((l) => [what, ...l].slice(0, 4));

  // Nearest threshold first. Thresholds are NOT the pixel values below — the
  // component spreads them evenly across the row width less a 40px peek, so the same
  // two actions sit further apart on a wide row than on a phone.
  const left: SwipeAction[] = [
    {
      label: "Archive",
      onCommit: () => record("left, stage 1 → Archive"),
      icon: <Archive className="size-4" />,
      className: "bg-[var(--money-neutral)]",
      armedClassName: "bg-[var(--money-net)]",
    },
    {
      label: "Delete",
      onCommit: () => record("left, stage 2 → Delete"),
      icon: <Trash2 className="size-4" />,
      className: "bg-[var(--money-neutral)]",
      armedClassName: "bg-[var(--money-expense)]",
    },
  ];

  const right: SwipeAction[] = [
    {
      label: "Restore",
      onCommit: () => record("right, stage 1 → Restore"),
      icon: <Undo2 className="size-4" />,
      className: "bg-[var(--money-neutral)]",
      armedClassName: "bg-[var(--money-income)]",
    },
  ];

  return (
    <div className="space-y-3">
      <SwipeableRow
        left={left}
        right={right}
        enabled={enabled}
        className="rounded-md border border-[var(--border)]"
      >
        {/* The row content carries its own click handler on purpose: a drag past 24px
            has its trailing click swallowed in the capture phase, so committing an
            action does not ALSO open whatever the row opens. A short, clumsy drag is
            still treated as a click. */}
        <button
          type="button"
          onClick={() => record("row clicked (not a swipe)")}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm text-[var(--text-primary)]">
              Monthly groceries
            </span>
            <span className="block truncate text-xs text-[var(--text-muted)]">
              22 Sep · Rewe
            </span>
          </span>
          <span className="shrink-0 font-mono text-sm text-[var(--money-expense)]">−48.20 €</span>
        </button>
      </SwipeableRow>

      <Row>
        <Button variant="secondary" onClick={() => setEnabled((v) => !v)}>
          {enabled ? "Disable gesture" : "Enable gesture"}
        </Button>
        <Button variant="ghost" disabled={log.length === 0} onClick={() => setLog([])}>
          Clear log
        </Button>
        <span className={READOUT}>
          below {PHONE_QUERY}: {String(belowPhone)}
        </span>
      </Row>

      <ul className="space-y-1">
        {log.length === 0 && <li className={READOUT}>nothing committed yet</li>}
        {log.map((entry, i) => (
          <li key={`${entry}-${i}`} className={READOUT}>
            {entry}
          </li>
        ))}
      </ul>

      <Note>
        Narrow the window to see this the way the kit actually ships it: the only place
        the package mounts a <code className="font-mono">SwipeableRow</code> is{" "}
        <code className="font-mono">DataTable</code>&apos;s card list, which is{" "}
        <code className="font-mono">md:hidden</code>. The component itself is not gated on
        width, though — that is the table&apos;s decision, not the row&apos;s, and a mouse
        drag works here at any size. Narrowing does change the feel: thresholds are
        proportional to row width, so the stages sit closer together.
      </Note>
      <Note>
        The keyboard path is buttons, not a typed gesture: every action is also a real button,
        visually hidden until it takes focus. Tab past the row&apos;s own button and
        &ldquo;Restore&rdquo;, &ldquo;Archive&rdquo; and &ldquo;Delete&rdquo; surface at its edge
        in turn, firing the same <code className="font-mono">onCommit</code>. Disabling the
        gesture withdraws them too.
      </Note>
      <Note>
        The reveal panel hardcodes <code className="font-mono">text-white</code>, so a
        background token that is light in dark mode would put white on near-white. The two
        classes are the idle and armed states; passing the same value for both simply
        removes the preview step.
      </Note>
    </div>
  );
}

function SwipeVariants() {
  const [log, setLog] = useState<string[]>([]);
  const record = (what: string) => setLog((l) => [what, ...l].slice(0, 4));

  // Three stages on one side: thresholds at 1/4, 2/4 and 3/4 of the drag.
  const three: SwipeAction[] = [
    {
      label: "Snooze",
      onCommit: () => record("Rent → Snooze"),
      icon: <BellOff className="size-4" />,
      className: "bg-[var(--money-neutral)]",
      armedClassName: "bg-[var(--money-net)]",
    },
    {
      label: "Archive",
      onCommit: () => record("Rent → Archive"),
      icon: <Archive className="size-4" />,
      className: "bg-[var(--money-neutral)]",
      armedClassName: "bg-[var(--money-income)]",
    },
    {
      label: "Delete",
      onCommit: () => record("Rent → Delete"),
      icon: <Trash2 className="size-4" />,
      className: "bg-[var(--money-neutral)]",
      armedClassName: "bg-[var(--money-expense)]",
    },
  ];

  // Same class idle and armed: no preview step, and no icon either.
  const pinOnly: SwipeAction[] = [
    {
      label: "Pin",
      onCommit: () => record("Salary → Pin"),
      className: "bg-[var(--money-income)]",
      armedClassName: "bg-[var(--money-income)]",
    },
  ];

  const rowContent = (title: string, sub: string, amount: string) => (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="block truncate text-sm text-[var(--text-primary)]">{title}</span>
        <span className="block truncate text-xs text-[var(--text-muted)]">{sub}</span>
      </span>
      {/* An amount is a left-to-right token even inside an RTL row. */}
      <span dir="ltr" className="shrink-0 font-mono text-sm text-[var(--text-secondary)]">
        {amount}
      </span>
    </div>
  );

  return (
    <div className="space-y-3">
      <SwipeableRow
        left={three}
        actionsLabel="Actions for Rent"
        className="rounded-md border border-[var(--border)]"
      >
        {rowContent("Rent", "left only · three stages · actionsLabel", "−950.00 €")}
      </SwipeableRow>
      <SwipeableRow right={pinOnly} className="rounded-md border border-[var(--border)]">
        {rowContent("Salary", "right only · className = armedClassName", "+3,100.00 €")}
      </SwipeableRow>
      <div dir="rtl">
        <SwipeableRow left={three} right={pinOnly} className="rounded-md border border-[var(--border)]">
          {rowContent("إيجار", 'dir="rtl" · both sides', "−950.00 €")}
        </SwipeableRow>
      </div>
      <ul className="space-y-1">
        {log.length === 0 && <li className={READOUT}>nothing committed yet</li>}
        {log.map((entry, i) => (
          <li key={`${entry}-${i}`} className={READOUT}>
            {entry}
          </li>
        ))}
      </ul>
      <Note>
        Drag the Rent row RIGHT, or the Salary row LEFT: a side with no actions still moves a
        resisted ~28px and snaps back, with nothing painted behind it — not even on the way
        back. <code className="font-mono">actionsLabel</code> names the group of keyboard
        buttons (default: the provider&apos;s <code className="font-mono">swipeableRow.actions</code>).
      </Note>
      <Note>
        Right-to-left: <code className="font-mono">left</code> and{" "}
        <code className="font-mono">right</code> stay physical drag directions on purpose — a
        swipe is a movement across the glass, and which way is destructive is the app&apos;s
        call (swap the arrays for a mirrored RTL layout). What the row lays out does mirror
        since 0.7.0: the revealed label hugs the edge being uncovered in either direction, and
        the keyboard buttons (Tab into the Arabic row) surface at the row&apos;s logical END —
        the left here — instead of over its title.
      </Note>
    </div>
  );
}

/* ── useRowSwipe, raw ──────────────────────────────────────────────────────── */

function RawSwipe() {
  const [last, setLast] = useState<string | null>(null);
  const [taps, setTaps] = useState(0);

  const swipe = useRowSwipe({
    enabled: true,
    // Explicit pixel thresholds here, unlike SwipeableRow, which derives them from the
    // measured row width. Ascending order is a contract, not a preference: the arming
    // scan stops at the first threshold it has not reached.
    leftStages: [
      { threshold: 60, onCommit: () => setLast("left ≥ 60px") },
      { threshold: 140, onCommit: () => setLast("left ≥ 140px") },
    ],
    rightStages: [{ threshold: 70, onCommit: () => setLast("right ≥ 70px") }],
    maxDrag: 180,
  });

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border border-[var(--border)]">
        <div
          {...swipe.handlers}
          onClickCapture={(e) => {
            if (!swipe.consumeClick()) return;
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            transform: swipe.dx !== 0 ? `translate3d(${swipe.dx}px,0,0)` : undefined,
            // pan-y, not none: a vertical scroll started on this strip must still
            // scroll the page. The hook drops the gesture as soon as the axis lock
            // resolves to "y".
            touchAction: "pan-y",
          }}
          className={cn(
            "flex items-center justify-between gap-3 bg-[var(--bg-surface-2)] px-4 py-3",
            swipe.dragging ? "select-none" : "transition-transform duration-150",
          )}
        >
          <span className="text-sm text-[var(--text-primary)]">Drag me sideways</span>
          <Button variant="secondary" onClick={() => setTaps((n) => n + 1)}>
            Tap ({taps})
          </Button>
        </div>
      </div>

      <OutTable
        rows={[
          ["dx", swipe.dx.toFixed(0)],
          ["dragging", String(swipe.dragging)],
          ["armedLeftIndex", String(swipe.armedLeftIndex)],
          ["armedRightIndex", String(swipe.armedRightIndex)],
          ["last commit", last ?? "—"],
        ]}
      />

      <Note>
        Drag the strip more than 24px and release over the Tap button: the counter does not
        move, because <code className="font-mono">consumeClick()</code> swallowed the
        trailing click. Under 24px it counts as a clumsy click and the button fires — which
        is the whole point of the threshold, on rows whose content is itself interactive.
      </Note>
      <Note>
        Both sides here have stages. Drag one that does not (disable the row above, or read
        the source) and the row still moves a resisted ~28px and snaps back — inert would be
        indistinguishable from &ldquo;this row is not swipeable&rdquo;.
      </Note>
    </div>
  );
}

