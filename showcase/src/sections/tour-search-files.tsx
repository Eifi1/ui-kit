import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { Archive, Command, FileText, Layers, Palette, Table2, Trash2, Undo2 } from "lucide-react";
import {
  Button,
  CommandPalette,
  FileDropzone,
  PHONE_QUERY,
  SwipeableRow,
  cn,
  useCommandKey,
  useMediaQuery,
  useRowSwipe,
  useTour,
  useTourOptional,
} from "@eifi1/ui-kit";
import type { CommandItem, SwipeAction, TourStep } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * TOUR, PALETTE & FILES.
 *
 * Four exports that all reach outside their own subtree, which is the one thing they
 * have in common and the reason they are awkward to demonstrate anywhere else:
 *
 *  - `TourProvider` spotlights elements by CSS SELECTOR, so its steps point at markup
 *    that lives in some other component entirely. The targets below are planted in
 *    this section on purpose, so the tour has something real to find on this page.
 *  - `CommandPalette` portals to `document.body` and owns a global ⌘K listener.
 *  - `FileDropzone` reaches for `sonner` at the moment a file is rejected.
 *  - `SwipeableRow` listens to raw Pointer Events and measures its own width.
 *
 * The tour card and the palette panel are still painted with literal
 * `bg-white`/`slate-*` inside the kit, so unlike everything this page draws itself
 * they do NOT follow the palette switch. That is a kit issue, not a showcase one —
 * see the note under the palette specimen.
 */

// Live readouts share one class so a reader can tell "this is state" from "this is
// chrome" at a glance.
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

export function TourSearchFiles() {
  return (
    <>
      <Example
        label="Guided tour — useTour + TourProvider"
        hint="The provider is mounted above the whole page; the steps below target markup in this section."
      >
        <TourLauncher />
      </Example>

      <Example
        label="TourStep — the shape a step actually takes"
        hint="Only `title` and `body` are required; everything else changes how the step is found or placed."
      >
        <OutTable
          rows={[
            ["target?: string", "CSS selector. Omitted → the step centres on screen."],
            ["title: string", "Card heading."],
            ["body: ReactNode", "Card copy — a node, not a string."],
            ["action?: ReactNode", "Extra footer row, e.g. a shortcut button."],
            ["padding?: number", "Spotlight padding around the target, px (default 8)."],
            ["placement?", '"top" | "right" | "bottom" | "left" | "center"; omit for auto'],
            ["awaitClick?: boolean", "Advance only when the TARGET is clicked. Needs `target`."],
            ["beforeStep?", "Sync or async; awaited before the target is located."],
          ]}
        />
      </Example>

      <Example
        label="CommandPalette"
        hint={
          <>
            <code className="font-mono">useCommandKey</code> binds ⌘K on macOS and Ctrl-K
            elsewhere — the listener is on <code className="font-mono">document</code>, so it
            fires anywhere on this page.
          </>
        }
      >
        <PaletteDemo />
      </Example>

      <Example
        label="FileDropzone — default rejection"
        hint="A rejected file toasts. sonner is imported dynamically, on that path only."
      >
        <DropzoneDefault />
      </Example>

      <Example
        label="FileDropzone — onInvalid, the escape hatch"
        hint="Same component, rejection routed inline. This path never loads sonner at all."
      >
        <DropzoneInline />
      </Example>

      <Example
        label="SwipeableRow"
        hint="Drag the row sideways with a mouse or a finger. Further left picks a later action."
      >
        <SwipeDemo />
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

/* ── tour ──────────────────────────────────────────────────────────────────── */

type TourOutcome = "finished" | "skipped" | "stopped" | null;

function TourLauncher() {
  const { start, stop, active, activeId, index, total, goToStep } = useTour();
  const [outcome, setOutcome] = useState<TourOutcome>(null);
  const [pings, setPings] = useState(0);

  // `useTour` THROWS without a provider; `useTourOptional` answers null. The
  // difference matters for a launcher in app chrome: the throw's blast radius is
  // whatever error boundary is above it, which for a top bar is the whole app — so a
  // control that can honestly render nothing should degrade instead of exploding.
  // Here the provider is always present, so this only ever reports "yes".
  const optional = useTourOptional();

  // Built per render rather than hoisted: two of the steps close over state setters
  // and over `goToStep`, and `start()` snapshots the array anyway.
  const steps: TourStep[] = [
    {
      // No `target` at all — the welcome step centres itself. `placement: "center"`
      // would do the same thing even with a target, which is the difference between
      // "there is nothing to point at" and "do not point at it".
      title: "This is the guided tour",
      body: "Four steps over three targets planted in this section. Esc skips, → advances, ← goes back.",
      action: (
        <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => goToStep(3)}>
          Skip ahead to the dropzone
        </Button>
      ),
    },
    {
      target: '[data-tour="showcase-tour-start"]',
      title: "The launcher",
      body: "The button you just pressed. The spotlight follows it on scroll and resize — the overlay re-reads the rect on a 250ms interval as well as on events.",
      placement: "bottom",
    },
    {
      target: '[data-tour="showcase-ping"]',
      title: "awaitClick",
      body: "This step has no Next button: it advances only when the highlighted control itself is clicked. The control's own handler runs first, so the counter ticks and then the tour moves on.",
      placement: "bottom",
      awaitClick: true,
    },
    {
      target: '[data-tour="showcase-dropzone"]',
      title: "A target further down",
      body: "Scrolled into view before the spotlight is drawn. Steps whose target cannot be found after ~45 frames fall back to a centred card rather than hanging.",
      placement: "top",
      padding: 12,
    },
  ];

  return (
    <div className="space-y-3">
      <Row>
        <Button
          variant="brand"
          data-tour="showcase-tour-start"
          disabled={active}
          onClick={() => {
            setOutcome(null);
            start(steps, {
              id: "showcase-tour",
              onStart: () => setPings(0),
              onFinish: () => setOutcome("finished"),
              onSkip: () => setOutcome("skipped"),
            });
          }}
        >
          Start tour
        </Button>
        <Button
          variant="secondary"
          disabled={!active}
          onClick={() => {
            stop();
            // `stop()` deliberately fires NO callbacks — neither onFinish nor onSkip —
            // so an app that records completion has to record it here itself.
            setOutcome("stopped");
          }}
        >
          Stop
        </Button>
        <Button data-tour="showcase-ping" onClick={() => setPings((n) => n + 1)}>
          Ping ({pings})
        </Button>
      </Row>

      <OutTable
        rows={[
          ["active", String(active)],
          ["activeId", activeId === null ? "null" : `"${activeId}"`],
          // `index` is 0 while inactive, not -1; `total` is 0 too, so the counter the
          // card shows is meaningless until the tour is running.
          ["index / total", active ? `${index + 1} / ${total}` : "— (0 / 0 while inactive)"],
          ["last outcome", outcome ?? "—"],
          ["useTourOptional()", optional ? "a provider is above this component" : "null"],
        ]}
      />

      <Note>
        The three targets are marked with <code className="font-mono">data-tour</code>{" "}
        attributes, the same convention <code className="font-mono">AppShell</code> uses for
        its nav items. The step matches the first VISIBLE element for the selector, not the
        first in DOM order, so one selector can cover a desktop and a mobile copy of the same
        control.
      </Note>
    </div>
  );
}

/* ── command palette ───────────────────────────────────────────────────────── */

interface PaletteEntry {
  id: string;
  label: string;
  group: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
}

/**
 * Module-level so its identity is stable across renders, which is what makes it a
 * legitimate `revision`. The prop is compared by identity like an effect dependency —
 * a fixture rebuilt inline on every render would re-arm the debounce forever.
 */
const PALETTE_INDEX: PaletteEntry[] = [
  { id: "foundations", label: "Foundations & tokens", group: "Sections", icon: <Palette className="size-4" />, href: "#foundations" },
  { id: "data-table", label: "Data table", group: "Sections", icon: <Table2 className="size-4" />, href: "#data-table" },
  { id: "overlays", label: "Overlays", group: "Sections", icon: <Layers className="size-4" />, href: "#overlays" },
  { id: "toggle-theme", label: "Toggle theme", group: "Actions", hint: "top bar", icon: <Command className="size-4" /> },
  { id: "copy-import", label: "Copy the import line", group: "Actions", hint: '@eifi1/ui-kit' },
  { id: "readme", label: "README", group: "Docs", icon: <FileText className="size-4" /> },
  { id: "adopting", label: "ADOPTING.md", group: "Docs", icon: <FileText className="size-4" /> },
];

function PaletteDemo() {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  // Stable identity so the global listener is registered once rather than torn down
  // and re-added on every render of this section.
  const openPalette = useCallback(() => setOpen(true), []);
  useCommandKey(openPalette);

  // The provider's IDENTITY is not a re-run signal — the palette reads it through a
  // ref — so rebuilding it per render costs nothing. It is the DATA changing that
  // needs `revision`.
  const search = (query: string): CommandItem[] => {
    const needle = query.trim().toLowerCase();
    return PALETTE_INDEX.filter(
      (e) =>
        !needle ||
        e.label.toLowerCase().includes(needle) ||
        e.group.toLowerCase().includes(needle),
    ).map((e) => ({ ...e, onSelect: () => setChosen(e.label) }));
  };

  return (
    <div className="space-y-3">
      <Row>
        <Button variant="brand" onClick={openPalette}>
          Open palette
        </Button>
        <span className={READOUT}>last chosen: {chosen ?? "—"}</span>
      </Row>

      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        revision={PALETTE_INDEX}
        labels={{
          placeholder: "Search the showcase…",
          empty: "No matches",
          loading: "Searching…",
          hint: "↑↓ navigate · ↵ select · esc close · ⌘-click a Section row to open it in a tab",
        }}
      />

      <Note>
        An empty query is allowed and returns everything here, which is how an app
        surfaces recents or default pages. The debounce is 150ms while typing and zero
        for the empty query, so the first open is not artificially slow.
      </Note>
      <Note>
        The rows under <em>Sections</em> carry an <code className="font-mono">href</code>, so
        they render as real anchors and can be middle- or ⌘-clicked into a new tab; a plain
        click is intercepted and runs <code className="font-mono">onSelect</code> instead.
        The palette stays OPEN for a modified click, deliberately — ⌘-clicking three results
        in a row is the reason the prop exists.
      </Note>
      <Note>
        The panel is painted with literal <code className="font-mono">bg-white</code> /{" "}
        <code className="font-mono">slate-*</code> inside the kit rather than with tokens, so
        it is the one thing on this page that does not move when you change the palette. Same
        for the tour card above.
      </Note>
    </div>
  );
}

/* ── file dropzone ─────────────────────────────────────────────────────────── */

const MAX_CSV_BYTES = 64 * 1024;

function DropzoneDefault() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-3">
      {/* The tour marker sits on a wrapper so the spotlight takes in the readout below as
          well; FileDropzone itself passes `data-*` through to its root. The Files page
          (Inputs) has the full set: FileButton, multiple files, inline refusals. */}
      <div data-tour="showcase-dropzone">
        <FileDropzone
          file={file}
          onFileSelected={setFile}
          accept=".csv,text/csv"
          isValid={(f) => f.name.toLowerCase().endsWith(".csv") && f.size <= MAX_CSV_BYTES}
          invalidMessage="Only .csv files up to 64 KB are accepted here."
          dropLabel="Drop a CSV file"
          browseLabel="Browse…"
          emptyLabel="Drop a .csv file here"
          hint="Up to 64 KB — pick anything else to see the rejection toast."
        />
      </div>
      <Row>
        <span className={READOUT}>
          file: {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "null"}
        </span>
        {/* `file` is controlled, so the caller can always clear it; since 0.6 the zone can
            also offer its own remove button (`onClear`) — see the Files page. */}
        <Button variant="secondary" disabled={!file} onClick={() => setFile(null)}>
          Clear
        </Button>
      </Row>
      <Note>
        With no <code className="font-mono">onInvalid</code>, a rejection does{" "}
        <code className="font-mono">await import("sonner")</code> and toasts. The static
        import is avoided on purpose: sonner is an OPTIONAL peer, and the barrel re-exports
        this module — so importing it at the top would have broken{" "}
        <code className="font-mono">import {"{"} Button {"}"}</code> for any app that never
        installs it.
      </Note>
    </div>
  );
}

function DropzoneInline() {
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <FileDropzone
        file={file}
        onFileSelected={(f) => {
          setRejected(null);
          setFile(f);
        }}
        accept="image/*"
        isValid={(f) => f.type.startsWith("image/")}
        // Still required even when `onInvalid` replaces the default toast: the message
        // is the component's, the delivery is yours. A no-op handler silences it
        // entirely, which is the documented way to opt out.
        invalidMessage="That is not an image."
        onInvalid={(f) => setRejected(f.name)}
        dropLabel="Drop an image"
        browseLabel="Choose an image…"
        emptyLabel="Drop an image here"
        hint="Anything non-image is reported below instead of toasting."
      />
      {rejected && (
        <p className="text-xs text-[var(--money-expense)]">
          Rejected: <span className="font-mono">{rejected}</span> — not an image.
        </p>
      )}
      <span className={cn(READOUT, "block")}>file: {file ? file.name : "null"}</span>
    </div>
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
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
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
        There is no keyboard equivalent, honestly: the gesture is Pointer Events only, and
        nothing here is reachable by Tab or arrow keys. Any action offered by a swipe has to
        exist somewhere else as well — a menu, a button, a row action — or it does not exist
        for keyboard and screen-reader users at all.
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
