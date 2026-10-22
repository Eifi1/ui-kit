import { useId, useState, useEffect, useRef } from "react";
import {
  Info,
  Keyboard,
  ArrowLeftRight,
  Terminal,
  CircleHelp,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";
import {
  IconButton,
  Tooltip,
  buttonClasses,
  placeTooltip,
  CLIPS_ATTRIBUTE,
  Button,
  CompactControls,
} from "@eifi1/ui-kit";
import type { AnchorRect, TooltipPlacement, TooltipSize, TooltipViewport } from "@eifi1/ui-kit";
import { Example, OutTable, Row, Note, code, READOUT } from "../lib/section";

/**
 * Tooltip in one module, rendered as one section of the "Popovers, menus & tooltips" page:
 * its sides, portal, rich labels and the pure `placeTooltip` (from overlays.tsx), then what
 * the releases added — the auto-portal, `data-clips`, `lazy`, the viewport clamp and the
 * tap. Those were filed by release (tooltip-auto-portal-demo, props-011, tooltip-013,
 * tooltip-014, tooltip-025); each keeps its label, so its anchor and its search entry
 * hold, and says since which release in a Note (refactor audit 2026-10, DOC-8).
 */

const TOOLTIP_SIDES = ["top", "right", "bottom", "left", "start", "end"] as const;

/** The Tooltip specimens of this page — moved to tooltip.tsx with the rest of the family. */
function TooltipSpecimens() {
  return (
    <>
      <Example label="Tooltip — side" hint="The CSS-only variant. `side` is absolute here: it never flips.">
        <TooltipSides />
      </Example>

      <Example
        label="Tooltip — portal, redact and the empty label"
        hint="`portal` forces the portalled bubble; left out, a tooltip inside a scroll container portals on its own (see the auto-portal example below)."
      >
        <TooltipPortal />
      </Example>

      <Example
        label="Tooltip — rich labels, className and the portal flip"
        hint="Focus a trigger with Tab and press Escape: the bubble goes (WCAG 1.4.13) and comes back on the next focus."
      >
        <TooltipMore />
      </Example>

      <Example
        label="placeTooltip"
        hint="Pure, viewport pixels in and out — which is why it can be shown as a table at all."
      >
        <OutTable rows={PLACEMENT_ROWS} />
      </Example>
    </>
  );
}

function TooltipSides() {
  const [pressed, setPressed] = useState("—");

  return (
    <Row>
      {TOOLTIP_SIDES.map((side) => (
        <Tooltip key={side} side={side} label={`side="${side}"`}>
          <button
            type="button"
            onClick={() => setPressed(side)}
            className={buttonClasses("secondary")}
          >
            {side}
          </button>
        </Tooltip>
      ))}
      <span className="text-xs text-muted">Last pressed: {pressed}</span>
    </Row>
  );
}

function TooltipPortal() {
  const [redact, setRedact] = useState(true);
  const [pressed, setPressed] = useState("—");

  return (
    <Row>
      <Tooltip
        portal
        side="right"
        redact={redact}
        label={redact ? "Ada Lovelace — the user's own data" : "Just a UI string"}
      >
        <IconButton aria-label="Toggle the redact prop" onClick={() => setRedact((v) => !v)}>
          <Info />
        </IconButton>
      </Tooltip>
      <span className="text-xs text-secondary">
        <code className="font-mono">redact={String(redact)}</code> — the bubble carries{" "}
        <code className="font-mono">data-private</code>. The blur rule itself lives in the
        consuming app (a <code className="font-mono">demo-mode</code> class on{" "}
        <code className="font-mono">&lt;html&gt;</code>), so here it only tags; inspect the
        element to see it.
      </span>
      <Tooltip label="">
        <button
          type="button"
          onClick={() => setPressed("empty label")}
          className={buttonClasses("ghost")}
        >
          label=&quot;&quot; — no bubble and no wrapper
        </button>
      </Tooltip>
      <span className="text-xs text-muted">Last pressed: {pressed}</span>
    </Row>
  );
}

function TooltipMore() {
  const helpId = useId();

  return (
    <div className="space-y-3">
      <Row>
        {/* A ReactNode label, not only a string. */}
        <Tooltip
          label={
            <span className="inline-flex items-center gap-1">
              Open the palette: <kbd className="font-mono">Ctrl</kbd>+<kbd className="font-mono">K</kbd>
            </span>
          }
        >
          <IconButton aria-label="Keyboard shortcut">
            <Keyboard />
          </IconButton>
        </Tooltip>

        {/* `0` is a real label; only "", null, undefined and false count as empty. */}
        <Tooltip label={0} side="bottom">
          <button type="button" className={buttonClasses("secondary")}>
            label={"{0}"}
          </button>
        </Tooltip>

        {/* The caller's own description is APPENDED to, never replaced: the button ends
            up described by the hint text below AND the bubble. `className` and any other
            span attribute land on the wrapper. */}
        <Tooltip
          label="…and the bubble, appended"
          className="rounded-md ring-1 ring-brand"
          data-testid="showcase-tooltip-wrapper"
        >
          <button type="button" aria-describedby={helpId} className={buttonClasses("secondary")}>
            Own aria-describedby
          </button>
        </Tooltip>
        <span id={helpId} className="text-xs text-muted">
          Described by this text…
        </span>
      </Row>
      <Row>
        <Tooltip
          portal
          side="left"
          label="side='left' is a preference for the portal variant: with no room on the left, this bubble turns round to the right and is clamped into the window."
        >
          <button type="button" className={buttonClasses("secondary")}>
            portal, side=&quot;left&quot;
          </button>
        </Tooltip>
        <span className="text-xs text-muted">
          Needs the window&apos;s left edge within ~20rem to flip — the phone preview shows it.
        </span>
      </Row>
    </div>
  );
}

// Fixed rects rather than measured ones: the helper is pure, so the table is the same
// on every screen, and a reader can check the arithmetic against the source.
const NEAR_TOP: AnchorRect = { top: 8, left: 120, right: 160, bottom: 28, width: 40, height: 20 };

const NEAR_LEFT: AnchorRect = { top: 200, left: 4, right: 44, bottom: 220, width: 40, height: 20 };

const BUBBLE: TooltipSize = { width: 160, height: 32 };

const SCREEN: TooltipViewport = { width: 400, height: 600 };

const NARROW: TooltipViewport = { width: 180, height: 600 };

function show(p: TooltipPlacement): string {
  return `{ left: ${p.left}, top: ${p.top}, side: "${p.side}" }`;
}

// Computed at module scope by calling the real export, so the table cannot go stale the
// way a transcribed one would.
const PLACEMENT_ROWS: Array<[string, string]> = [
  [
    'placeTooltip(nearTop, "top", bubble, screen)',
    show(placeTooltip(NEAR_TOP, "top", BUBBLE, SCREEN)),
  ],
  [
    'placeTooltip(nearLeft, "top", bubble, screen)',
    show(placeTooltip(NEAR_LEFT, "top", BUBBLE, SCREEN)),
  ],
  [
    'placeTooltip(nearLeft, "left", bubble, screen)',
    show(placeTooltip(NEAR_LEFT, "left", BUBBLE, SCREEN)),
  ],
  [
    'placeTooltip(nearLeft, "left", bubble, narrow)',
    show(placeTooltip(NEAR_LEFT, "left", BUBBLE, NARROW)),
  ],
];

/* ── since 0.10 ─────────────────────────────────────────────────────────── */

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
      <p className="mb-1 font-mono text-xs text-secondary">
        {portal === false ? "portal={false}" : "no portal prop (the default)"} · sideways scroll:{" "}
        {extra === null ? "…" : `${extra}px`}
      </p>
      <div ref={ref} className="h-40 w-full max-w-56 overflow-auto rounded-md border border-subtle">
        <ul className="divide-y divide-subtle">
          {ROWS.map((row) => (
            <li key={row} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-primary">
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

function TooltipAutoPortal() {
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
          one is cut off by the edge. That is the phantom scroll, and no tooltip in a table needs{" "}
          <code className="font-mono">portal</code> to avoid it. Outside any such box the cheaper
          in-place bubble is still used.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.11 ─────────────────────────────────────────────────────────── */

const ACCOUNTS = ["Checking", "Savings", "Credit card", "Brokerage", "Cash"];

function ClipsMarkerDemo() {
  const ref = useRef<HTMLUListElement>(null);
  const [text, setText] = useState("…");
  useEffect(() => {
    // After the tooltips' mount-time check has settled.
    const frame = requestAnimationFrame(() => setText(ref.current?.querySelector("li")?.textContent ?? ""));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Example
      label="Tooltip — data-clips marks an app's own scroller"
      hint="CLIPS_ATTRIBUTE: counts as clipping whatever its computed overflow, so jsdom portals like the browser"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* space-y-2, not 1: at 4px the readout under the box read as touching it. */}
        <div className="min-w-0 space-y-2">
          <p className={READOUT}>
            &lt;div {CLIPS_ATTRIBUTE} className=&quot;overflow-auto&quot;&gt;
          </p>
          <div
            {...{ [CLIPS_ATTRIBUTE]: "" }}
            className="h-40 w-full max-w-64 overflow-auto rounded-md border border-subtle"
          >
            <ul ref={ref} className="divide-y divide-subtle">
              {ACCOUNTS.map((name) => (
                <li key={name} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-primary">
                  <span className="truncate">{name}</span>
                  <Tooltip label={`${name}: booked daily`} side="end">
                    <IconButton size="xs" aria-label={`About ${name}`}>
                      <Info />
                    </IconButton>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
          <p className={READOUT}>first row&apos;s textContent: &ldquo;{text}&rdquo;</p>
        </div>
        <pre className="min-w-0 whitespace-pre-wrap break-words rounded-md bg-surface-2 p-3 font-mono text-xs text-secondary">
          {`// in the app\n<div {...{ [CLIPS_ATTRIBUTE]: "" }}\n     className="overflow-auto">\n\n// in its jsdom test — no\n// "CheckingChecking: booked daily"\nexpect(row).toHaveTextContent(/^Checking$/);`}
        </pre>
      </div>
      <div className="mt-3">
        <Note>
          The auto-portal looks for an ancestor whose computed {code("overflow")} clips, and jsdom computes no
          Tailwind: under test every scroller reads {code("visible")}, the bubble stays in place, and its text
          joins the row&apos;s. Marked with {code("data-clips")} (or {code("{ [CLIPS_ATTRIBUTE]: \"\" }")}), the
          scroller counts as clipping in both, so the tooltip portals in the browser (hover a row: the bubble
          is not cut by the box&apos;s edge) and in the test alike, and the row reads &ldquo;Checking&rdquo; in both.
          DataTable&apos;s body and Table&apos;s wrapper carry it already.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.13 ─────────────────────────────────────────────────────────── */

/**
 * TOOLTIP — `lazy`: the in-place bubble, mounted only while it is up. Shown
 * as a button with an icon, beside the same button with the default
 * always-mounted bubble, with each button's live `textContent` read out underneath.
 */

function Readout({ lazy }: { lazy?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState<string | null>(null);
  const read = () => setText(ref.current?.textContent ?? "");
  return (
    <div className="min-w-0 space-y-2">
      <p className="font-mono text-xs text-secondary">{lazy ? "lazy" : "no lazy (the default)"}</p>
      <button
        ref={ref}
        type="button"
        onClick={read}
        className="inline-flex items-center gap-2 rounded-md border border-subtle px-3 py-1.5 text-sm text-primary"
      >
        Undo booking
        <Tooltip label="Reverts the last booking on this account" lazy={lazy}>
          <Info className="size-4" aria-hidden />
        </Tooltip>
      </button>
      <p className="break-words font-mono text-xs text-secondary">
        textContent: {text === null ? "(click the button)" : JSON.stringify(text)}
      </p>
    </div>
  );
}

function TooltipLazyDemo() {
  return (
    <Example
      label="Tooltip — lazy: in place, mounted only while up"
      hint="keeps the bubble next to its trigger, and out of the DOM until hover or focus"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Readout lazy />
        <Readout />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Tooltip label="Switch between incoming and outgoing" lazy>
          <IconButton size="sm" aria-label="Direction">
            <ArrowLeftRight />
          </IconButton>
        </Tooltip>
        <span className="text-sm text-secondary">
          Tab to it: focus mounts the bubble and describes the button; Escape unmounts it.
        </span>
      </div>
      <div className="mt-3">
        <Note>
          Both buttons look and behave the same under the pointer. Click each to read its{" "}
          <code className="font-mono">textContent</code> while the bubble is closed: the default one carries
          the bubble&apos;s sentence (it is always mounted, so it is in the button&apos;s accessible name and in
          every <code className="font-mono">getAllByRole(&quot;tooltip&quot;)</code> too); the{" "}
          <code className="font-mono">lazy</code> one reads only its own label. Rather than pin{" "}
          <code className="font-mono">portal</code> on header tooltips, toggles, rows, badges and toasts for that
          alone, <code className="font-mono">lazy</code> keeps the cheaper in-place bubble. It is opt-in because existing tests find the default bubble
          without a hover.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.14 ─────────────────────────────────────────────────────────── */

/**
 * TOOLTIP — the in-place bubble's viewport clamp. A long label on a trigger
 * at a row's start edge, as in a jobs panel: on a phone the centred bubble used
 * to hang off the screen; now it measures itself on open and slides back in.
 */

const COMMAND = "gcloud run jobs execute nightly-import --region europe-west3 --wait --format=json";

function TooltipClampDemo() {
  return (
    <Example
      label="Tooltip — in-place bubble clamped to the viewport"
      hint="a long label at the start edge slides back onto the screen instead of hanging off it"
    >
      <div className="flex items-center justify-between gap-2 rounded-md border border-subtle px-2 py-1.5">
        <Tooltip label={COMMAND} lazy>
          <IconButton size="sm" aria-label="Show command">
            <Terminal />
          </IconButton>
        </Tooltip>
        <span className="min-w-0 truncate-until-large text-sm text-secondary">nightly-import</span>
        <Tooltip label={COMMAND}>
          <IconButton size="sm" aria-label="Show command (default)">
            <Terminal />
          </IconButton>
        </Tooltip>
      </div>
      <div className="mt-3">
        <Note>
          Narrow the window and hover either button: the bubble is still in place (no{" "}
          <code className="font-mono">portal</code>), still capped at 20rem or the viewport less a margin so
          the command wraps, and slid along its cross axis only as far as it takes to stay on the screen. A
          bubble that already fits is not touched. Works the same in RTL.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.25 ─────────────────────────────────────────────────────────── */

/**
 * TOOLTIP — taps and the page edge. A top-bar row as
 * an app has it: three IconButtons at the end edge, the sync chip with a sentence-long
 * label opening `bottom`. On a phone a tap used to leave each label up until the next tap
 * elsewhere, and the sync bubble, centred under an icon near the edge, widened the page.
 * Below it, the taps that DO show a bubble: on a control that does nothing when tapped.
 */

const SYNC_LABEL = "Synced at 03:05 PM — Tap to sync now and refresh this page";

function TooltipTapDemo() {
  return (
    <Example
      label="Tooltip — a tap leaves no bubble behind; the page edge holds"
      hint="tap on a phone: the action, no label; Tab: the label; hover: as ever"
    >
      {/* A top bar, so the kit's top-bar rule: CompactControls keeps the icons alone at
          every size, as AppShell's own bar does (§4). Without it, at Large each IconButton
          showed its label and the sentence-long sync label ran 66 px past a 360 px phone
          at Extra large (0.32.1). */}
      <CompactControls>
        <div className="flex h-12 items-center justify-end gap-1 rounded-md border border-subtle px-2">
          <span className="me-auto truncate-until-large text-sm font-medium text-primary">Example Ltd</span>
          <IconButton label={SYNC_LABEL} tooltipSide="bottom" size="sm" shape="round" onClick={() => {}}>
            <RefreshCw />
          </IconButton>
          <IconButton label="Search" tooltipSide="bottom" size="sm" onClick={() => {}}>
            <Search />
          </IconButton>
          <IconButton label="Settings" tooltipSide="bottom" size="sm" onClick={() => {}}>
            <Settings />
          </IconButton>
        </div>
      </CompactControls>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button disabledReason="Read-only demo — saving is disabled." size="sm">
          Save
        </Button>
        <Tooltip label="Example Ltd, 000 Sample Street, Sampletown" lazy>
          {/* `data-truncate-ok` (text size §10.17): the cut IS the example — a truncated
              address whose full text the tap shows — and an address, not a name. */}
          <span data-truncate-ok="" className="max-w-[9rem] truncate text-sm text-secondary">
            Example Ltd, 000 Sample Street, Sampletown
          </span>
        </Tooltip>
        <Tooltip label="Booked on the day the money left the account, not the day it was entered." tap="toggle" lazy>
          <button type="button" aria-label="What is the booking date?" className="flex text-placeholder">
            <CircleHelp className="size-4" />
          </button>
        </Tooltip>
      </div>

      <div className="mt-3 space-y-2">
        <Note>
          On a phone, tap the three icons: each does its job and leaves no label behind over whatever the tap
          opened. With a keyboard, Tab onto them: the label shows, as it does on a
          desktop hover. A desktop click lets the label go once the pointer leaves.
        </Note>
        <Note>
          The sync label is a sentence under an icon near the end edge: it slides back onto the screen, and
          the page never gets wider than the screen — measured against the screen itself now, not against a
          window that had already grown with it.
        </Note>
        <Note>
          A tap that activates nothing shows the bubble as its answer, until the next tap anywhere: the locked
          Save gives its reason, the truncated address its full text. The &quot;?&quot; explains only, so it
          says <code className="font-mono">tap=&quot;toggle&quot;</code>.
        </Note>
      </div>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Every Tooltip specimen */
export function TooltipDemo() {
  return (
    <>
      <TooltipSpecimens />
      <TooltipAutoPortal />
      <ClipsMarkerDemo />
      <TooltipLazyDemo />
      <TooltipClampDemo />
      <TooltipTapDemo />
    </>
  );
}
