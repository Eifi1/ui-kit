import { useState } from "react";
import type { ReactNode } from "react";
import { Archive, BellOff, CircleSlash, Trash2, Undo2 } from "lucide-react";
import { Button, PHONE_QUERY, Select, SwipeableRow, cn, useMediaQuery, useRowSwipe } from "@eifi1/ui-kit";
import type { SwipeAction, SwipePaint, SwipeTone } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * SWIPEABLE ROW — `SwipeableRow`, and `useRowSwipe` underneath it.
 *
 * The row listens to raw Pointer Events and measures its own width, so every specimen
 * here can be dragged with a mouse as well as a finger — and reached by keyboard, where
 * the actions surface as real buttons.
 *
 * 0.33 (docs/colour-roles-harmonization.md §6, §12.6): a panel is painted by its `tone` —
 * the tone's wash under its text while the action is previewed, the tone's fill under its
 * `-contrast` once armed — or, for an app's documented exception, by `paint`. The
 * specimens moved off the deprecated `className` / `armedClassName` pair.
 */

// Live readouts share one class so a reader can tell "this is state" from "this is
// chrome" at a glance.
const READOUT = "font-mono text-xs text-secondary";

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
        label="SwipeAction tone — every tone, idle and armed"
        hint="idle: the tone's wash under its text; armed: its fill under its -contrast. Drag the row to see the step"
      >
        <SwipeTones />
      </Example>

      <Example
        label="SwipeAction paint — an app's documented exception"
        hint="the app's own fill and its foreground: a 14 % wash idle, the fill armed"
      >
        <SwipePaints />
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
      tone: "neutral",
    },
    {
      label: "Delete",
      onCommit: () => record("left, stage 2 → Delete"),
      icon: <Trash2 className="size-4" />,
      tone: "danger",
    },
  ];

  const right: SwipeAction[] = [
    {
      label: "Restore",
      onCommit: () => record("right, stage 1 → Restore"),
      icon: <Undo2 className="size-4" />,
      tone: "success",
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
            <span className="block truncate-until-large text-sm text-[var(--text-primary)]">
              Monthly groceries
            </span>
            <span className="block truncate-until-large text-xs text-[var(--text-muted)]">
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
        Each action names its <code className="font-mono">tone</code> — here neutral, danger
        and success — and the kit paints both states from it, with a foreground measured
        against every shipped preset in both modes. The panel used to be the caller&apos;s
        class under a hard-coded <code className="font-mono">text-white</code>, dimmed to 60 %
        until armed: 2.4–4.5:1 on the kit&apos;s own swipes, and white on near-white on every
        dark pastel. That path (<code className="font-mono">className</code> /{" "}
        <code className="font-mono">armedClassName</code>) still compiles, deprecated.
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
      tone: "warning",
    },
    {
      label: "Archive",
      onCommit: () => record("Rent → Archive"),
      icon: <Archive className="size-4" />,
      tone: "neutral",
    },
    {
      label: "Delete",
      onCommit: () => record("Rent → Delete"),
      icon: <Trash2 className="size-4" />,
      tone: "danger",
    },
  ];

  // One stage, and no icon: the panel is the label alone.
  const pinOnly: SwipeAction[] = [
    {
      label: "Pin",
      onCommit: () => record("Salary → Pin"),
      tone: "brand",
    },
  ];

  const rowContent = (title: string, sub: string, amount: string) => (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="block truncate-until-large text-sm text-[var(--text-primary)]">{title}</span>
        <span className="block truncate-until-large text-xs text-[var(--text-muted)]">{sub}</span>
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
        {rowContent("Salary", "right only · one stage, no icon", "+3,100.00 €")}
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

/* ── tone and paint (0.33) ─────────────────────────────────────────────────── */

/**
 * The thirteen tones' two looks, as the kit paints a panel (`SWIPE_TONE` in
 * swipeable-row.tsx; docs/colour-roles-harmonization.md §6) — written out so a reader
 * sees both states side by side without dragging, and so the classes are on the page
 * for every tone at once. showcase/src/__tests__/swipe-tones-033.test.ts holds this
 * copy equal to the kit's.
 */
export const SWIPE_TONE_LOOKS: Record<SwipeTone, { idle: string; armed: string }> = {
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

const TONE_NAMES = Object.keys(SWIPE_TONE_LOOKS) as SwipeTone[];

/** One panel as the row shows it: the icon on its disc (`bg-current/20`, the label's own
 *  colour, so it reads on every pair), the label beside it. */
function PanelLook({ className, label }: { className: string; label: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold", className)}>
      <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-current/20">
        <Trash2 className="size-3" />
      </span>
      {label}
    </div>
  );
}

function SwipeTones() {
  const [tone, setTone] = useState<SwipeTone>("danger");
  const [log, setLog] = useState<string | null>(null);
  const actions: SwipeAction[] = [
    { label: `Swipe (${tone})`, icon: <Trash2 className="size-4" />, tone, onCommit: () => setLog(`committed: ${tone}`) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {TONE_NAMES.map((name) => (
          <div key={name} className="space-y-1">
            <p className="font-mono text-xs text-secondary">tone: &quot;{name}&quot;</p>
            <div className="grid grid-cols-2 gap-1.5">
              <PanelLook className={SWIPE_TONE_LOOKS[name].idle} label="idle" />
              <PanelLook className={SWIPE_TONE_LOOKS[name].armed} label="armed" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-end">
        <Select label="Tone of the row below" value={tone} onChange={(e) => setTone(e.target.value as SwipeTone)}>
          {TONE_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <SwipeableRow left={actions} right={actions} className="rounded-md border border-subtle">
          <div className="px-4 py-3 text-sm text-primary">Drag either way: the wash, then the fill</div>
        </SwipeableRow>
      </div>
      <p className={READOUT}>{log ?? "nothing committed yet"}</p>
      <Note>
        The tones are StatusDot&apos;s, Chip&apos;s and ProgressBar&apos;s, so a curtain can be &ldquo;the
        colour of the status it produces&rdquo; by name. Idle is the tone&apos;s soft wash under its own text
        (≥ 4.5:1; brand&apos;s 4.43 in a few derived dark presets is the Chip brand soft pair&apos;s own edge),
        armed the plain fill — not `-hover` — under its `-contrast` (≥ 5:1): the soft→solid step is the
        &ldquo;let go and it fires&rdquo; signal. The money pair washes in the well, as Chip&apos;s soft money
        look does. DataTable&apos;s row swipes, the feedback inbox&apos;s plan and TranslationReviewPanel&apos;s
        swipes take tones, so every app gets the look without an edit.
      </Note>
    </div>
  );
}

/** keksdose's three curtains (§12.6): UNCLEARED is exactly its status pill's fill, and
 *  the two deletes keep their two strengths. Palette hex, the same in both themes. */
const PAINTS: Array<{ label: string; paint: SwipePaint; icon: ReactNode }> = [
  { label: "Uncleared", paint: { fill: "#d97706", foreground: "#0f172a" }, icon: <CircleSlash className="size-4" /> },
  { label: "Delete", paint: { fill: "#e11d48", foreground: "#ffffff" }, icon: <Trash2 className="size-4" /> },
  { label: "Delete the rule", paint: { fill: "#be123c", foreground: "#ffffff" }, icon: <Trash2 className="size-4" /> },
];

function SwipePaints() {
  const [log, setLog] = useState<string | null>(null);
  const left: SwipeAction[] = PAINTS.map(({ label, paint, icon }) => ({
    label,
    paint,
    icon,
    onCommit: () => setLog(`committed: ${label}`),
  }));
  return (
    <div className="space-y-3">
      <SwipeableRow left={left} className="rounded-md border border-subtle">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 text-sm text-primary">Card payment · Migros</span>
          <span className="shrink-0 font-mono text-sm text-money-neg">−23.40</span>
        </div>
      </SwipeableRow>
      <p className={READOUT}>{log ?? "nothing committed yet"}</p>
      <pre className="overflow-x-auto rounded-md border border-subtle bg-surface-2 p-3 font-mono text-xs text-secondary">
        {`{ label: "Uncleared", paint: { fill: "#d97706", foreground: "#0f172a" }, onCommit }`}
      </pre>
      <Note>
        `paint` is for the case a tone cannot say: keksdose&apos;s UNCLEARED curtain must be its pill&apos;s own
        amber, and its two deletes are two strengths of one red on purpose. The kit lays the fill on the panel as
        a custom property: idle is `color-mix(in oklab, fill 14%, var(--bg-surface))` under the body ink — a
        mid-tone as text on its own wash would be 2.4:1 — armed is the fill under the foreground. Values are CSS
        colours or `var()`s, the same in both themes unless the app declares the variable per theme. The kit
        cannot measure an app&apos;s paint, so the app&apos;s tests pin the pair. Not deprecated, unlike
        `className` / `armedClassName`.
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

