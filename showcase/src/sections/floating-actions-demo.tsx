import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Bot,
  CalendarClock,
  CloudCheck,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import {
  Button,
  FloatingAction,
  FloatingActionButton,
  FloatingActionGroup,
  FloatingPanel,
  ToggleGroup,
} from "@eifi1/ui-kit";
import type { FloatingCorner, TooltipSide } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * FLOATING ACTIONS — the 0.11 additions to the corner controls: the extended FAB that
 * reports a status (`extended`, `live`, `variant="surface"`, `hidden`), the kit tooltip
 * on a FAB (`tooltip`, `tooltipSide`, `FloatingPanel fabTooltip`), and the pill of
 * corner toggles (`FloatingActionGroup` / `FloatingAction`).
 *
 * Everything here is `position: fixed` and portalled to <body>, so nothing floats until
 * a specimen's box is ticked — and only ONE specimen floats at a time (ticking one
 * unticks the others), because all three would otherwise stack in the same corners.
 * Leaving the page unmounts them.
 */

type Which = "status" | "tooltip" | "group" | null;

function ShowBox({
  id,
  active,
  setActive,
}: {
  id: Exclude<Which, null>;
  active: Which;
  setActive: (w: Which) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      <input type="checkbox" checked={active === id} onChange={(e) => setActive(e.target.checked ? id : null)} />
      Float this specimen&apos;s controls over the page
    </label>
  );
}

/* ── extended + live + surface ─────────────────────────────────────────── */

type Sync = "idle" | "offline" | "syncing" | "synced";

const SYNC_TEXT = (status: Sync, queued: number): string => {
  switch (status) {
    case "offline":
      return queued ? `Offline — ${queued} photo${queued === 1 ? "" : "s"} queued` : "Offline";
    case "syncing":
      return `Syncing ${queued} photo${queued === 1 ? "" : "s"}…`;
    case "synced":
      return "All changes synced";
    default:
      return "Online";
  }
};

const SYNC_ICON: Record<Sync, ReactNode> = {
  idle: <CloudCheck />,
  offline: <WifiOff />,
  syncing: <RefreshCw className="motion-safe:animate-spin" />,
  synced: <CloudCheck />,
};

function StatusFab({ active, setActive }: { active: Which; setActive: (w: Which) => void }) {
  const [status, setStatus] = useState<Sync>("idle");
  const [queued, setQueued] = useState(0);
  const [variant, setVariant] = useState<"surface" | "primary">("surface");
  const [extended, setExtended] = useState(true);
  const label = SYNC_TEXT(status, queued);
  const hidden = status === "idle";
  const shown = active === "status";
  return (
    <Example
      label="FloatingActionButton — extended, live, surface and hidden"
      hint="an offline pill in the bottom-start corner; stays mounted while hidden so the live region is heard"
    >
      <Row>
        <ShowBox id="status" active={active} setActive={setActive} />
      </Row>
      <Row className="mt-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setStatus("offline");
          }}
        >
          Go offline
        </Button>
        <Button size="sm" variant="secondary" disabled={status !== "offline"} onClick={() => setQueued((n) => n + 1)}>
          Queue a photo
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={status !== "offline"}
          onClick={() => {
            setStatus("syncing");
            setTimeout(() => {
              setStatus("synced");
              setQueued(0);
            }, 1500);
          }}
        >
          Back online (sync)
        </Button>
        <Button size="sm" variant="secondary" disabled={status === "idle"} onClick={() => setStatus("idle")}>
          Nothing to report (hide)
        </Button>
      </Row>
      <Row className="mt-3">
        <span className="text-xs text-[var(--text-muted)]">variant</span>
        <ToggleGroup<"surface" | "primary">
          aria-label="Variant"
          size="sm"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "surface", label: "surface" },
            { value: "primary", label: "primary" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={extended} onChange={(e) => setExtended(e.target.checked)} />
          <code className="font-mono">extended</code>
        </label>
      </Row>
      <OutTable
        rows={[
          ["label (and the live region's text)", label],
          ["hidden", String(hidden)],
          ["variant", variant],
          ["extended", String(extended)],
        ]}
      />
      {shown && (
        <FloatingActionButton
          label={label}
          icon={SYNC_ICON[status]}
          corner="bottom-start"
          extended={extended}
          live
          variant={variant}
          hidden={hidden}
          onClick={() => status === "offline" && setQueued((n) => n + 1)}
        />
      )}
      <div className="mt-3">
        <Note>
          <code className="font-mono">extended</code> shows the <code className="font-mono">label</code> beside the icon
          (a 3rem pill, the disc&apos;s height); untick it and the same button is the round disc.{" "}
          <code className="font-mono">variant=&quot;surface&quot;</code> is the page surface with a hairline — a status,
          not a call to action; switch to <code className="font-mono">primary</code> to see why a brand pill is wrong
          for &ldquo;you are offline&rdquo;. <code className="font-mono">live</code> mirrors the label into a polite{" "}
          <code className="font-mono">role=&quot;status&quot;</code> region, so each change — offline, queued, syncing,
          synced — is announced. The button is mounted from the start and passed{" "}
          <code className="font-mono">hidden</code> while there is nothing to report: a live region that mounted
          already saying &ldquo;Offline&rdquo; would say it to nobody.
        </Note>
      </div>
    </Example>
  );
}

/* ── tooltip + tooltipSide + fabTooltip ─────────────────────────────────── */

const SIDES: { value: TooltipSide; label: string }[] = [
  { value: "top", label: "top" },
  { value: "start", label: "start" },
  { value: "end", label: "end" },
  { value: "left", label: "left" },
];

function TooltipFab({ active, setActive }: { active: Which; setActive: (w: Which) => void }) {
  const [side, setSide] = useState<TooltipSide>("start");
  const [custom, setCustom] = useState(false);
  const [presses, setPresses] = useState(0);
  const shown = active === "tooltip";
  return (
    <Example
      label="FloatingActionButton tooltip and tooltipSide, FloatingPanel fabTooltip"
      hint="the kit Tooltip on a fixed, portalled button — no native title"
    >
      <Row>
        <ShowBox id="tooltip" active={active} setActive={setActive} />
      </Row>
      <Row className="mt-3">
        <span className="text-xs text-[var(--text-muted)]">tooltipSide</span>
        <ToggleGroup<TooltipSide> aria-label="Tooltip side" size="sm" value={side} onChange={setSide} options={SIDES} />
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
          tooltip content of its own (not <code className="font-mono">true</code>)
        </label>
      </Row>
      <OutTable
        rows={[
          ["FAB tooltip", custom ? "“New transaction — or press N”" : "true → the label"],
          ["tooltipSide", side],
          ["FAB presses", String(presses)],
          ["panel fabTooltip", "“Ask the assistant — answers stay on this device”"],
        ]}
      />
      {shown && (
        <>
          <FloatingActionButton
            label="New transaction"
            icon={<Plus />}
            tooltip={custom ? "New transaction — or press N" : true}
            tooltipSide={side}
            onClick={() => setPresses((n) => n + 1)}
          />
          <FloatingPanel
            title="Assistant"
            fabLabel="Open the assistant"
            fabIcon={<Bot />}
            offset="calc(1rem + 4rem)"
            fabTooltip="Ask the assistant — answers stay on this device"
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Hover or focus the button that opened this: the kit tooltip, not the browser&apos;s.
            </p>
          </FloatingPanel>
        </>
      )}
      <div className="mt-3">
        <Note>
          Hover or Tab to the two buttons in the bottom-end corner. <code className="font-mono">tooltip</code> puts
          the FAB in the kit <code className="font-mono">Tooltip</code> (a fixed wrapper carries the corner and the
          offset), and the native <code className="font-mono">title</code> goes — one hover hint, not two.{" "}
          <code className="font-mono">true</code> shows the label, and the bubble then does not describe the button
          with its own name again; other content is a real description. <code className="font-mono">tooltipSide</code>{" "}
          defaults to <code className="font-mono">top</code>; the bubble is portalled and kept on screen, so{" "}
          <code className="font-mono">end</code> here is flipped back inside the window. The assistant above it is a{" "}
          <code className="font-mono">FloatingPanel</code> whose <code className="font-mono">fabTooltip</code> passes
          the same through to its trigger.
        </Note>
      </div>
    </Example>
  );
}

/* ── FloatingActionGroup ────────────────────────────────────────────────── */

const BADGES = [0, 3, 120] as const;
type BadgeTone = "warning" | "danger" | "brand";

function Group({ active, setActive }: { active: Which; setActive: (w: Which) => void }) {
  const [upcoming, setUpcoming] = useState(false);
  const [pending, setPending] = useState(true);
  const [badge, setBadge] = useState<(typeof BADGES)[number]>(3);
  const [tone, setTone] = useState<BadgeTone>("warning");
  const [ownWords, setOwnWords] = useState(false);
  const [corner, setCorner] = useState<FloatingCorner>("bottom-end");
  const [raised, setRaised] = useState(false);
  const [adds, setAdds] = useState(0);
  const [linkClicks, setLinkClicks] = useState(0);
  const shown = active === "group";
  const badgeLabel = ownWords ? `${badge} to review` : undefined;
  return (
    <Example
      label="FloatingActionGroup and FloatingAction"
      hint="a pill of corner toggles, a link with a count and the brand “+”"
    >
      <Row>
        <ShowBox id="group" active={active} setActive={setActive} />
      </Row>
      <Row className="mt-3">
        <span className="text-xs text-[var(--text-muted)]">badge</span>
        <ToggleGroup<string>
          aria-label="Badge count"
          size="sm"
          value={String(badge)}
          onChange={(v) => setBadge(Number(v) as (typeof BADGES)[number])}
          options={BADGES.map((b) => ({ value: String(b), label: String(b) }))}
        />
        <span className="text-xs text-[var(--text-muted)]">badgeTone</span>
        <ToggleGroup<BadgeTone>
          aria-label="Badge tone"
          size="sm"
          value={tone}
          onChange={setTone}
          options={[
            { value: "warning", label: "warning" },
            { value: "danger", label: "danger" },
            { value: "brand", label: "brand" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={ownWords} onChange={(e) => setOwnWords(e.target.checked)} />
          <code className="font-mono">badgeLabel</code>
        </label>
      </Row>
      <Row className="mt-3">
        <span className="text-xs text-[var(--text-muted)]">corner</span>
        <ToggleGroup<FloatingCorner>
          aria-label="Corner"
          size="sm"
          value={corner}
          onChange={setCorner}
          options={[
            { value: "bottom-end", label: "bottom-end" },
            { value: "bottom-start", label: "bottom-start" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={raised} onChange={(e) => setRaised(e.target.checked)} />
          <code className="font-mono">offset=&quot;4rem&quot;</code>
        </label>
      </Row>
      <OutTable
        rows={[
          ["Upcoming only (pressed)", String(upcoming)],
          ["Pending only (pressed)", String(pending)],
          [
            "Invoices link name",
            badge > 0 ? `Invoices, ${badgeLabel ?? `${badge} new`}` : "Invoices (no badge at 0)",
          ],
          ["Invoices dot", badge > 99 ? "99+" : badge > 0 ? String(badge) : "—"],
          ["“+” presses (tooltip={false})", String(adds)],
          ["link clicks", String(linkClicks)],
        ]}
      />
      {shown && (
        <FloatingActionGroup aria-label="Register actions" corner={corner} offset={raised ? "4rem" : undefined}>
          <FloatingAction
            label="Upcoming only"
            icon={<CalendarClock />}
            pressed={upcoming}
            onClick={() => setUpcoming((v) => !v)}
          />
          <FloatingAction
            label="Pending only"
            icon={<Clock />}
            pressed={pending}
            onClick={() => setPending((v) => !v)}
          />
          <FloatingAction
            label="Invoices"
            icon={<FileText />}
            href="/data-table"
            renderLink={({ href, ...p }) => <Link to={href} {...p} />}
            onClick={() => setLinkClicks((n) => n + 1)}
            badge={badge}
            badgeLabel={badgeLabel}
            badgeTone={tone}
          />
          <FloatingAction
            label="New transaction"
            icon={<Plus />}
            variant="primary"
            tooltip={false}
            onClick={() => setAdds((n) => n + 1)}
          />
        </FloatingActionGroup>
      )}
      <div className="mt-3">
        <Note>
          <code className="font-mono">role=&quot;group&quot;</code> named by its <code className="font-mono">aria-label</code>,
          every member its own tab stop. The first two are toggles (<code className="font-mono">pressed</code>: brand
          glyph on the brand wash when on). &ldquo;Invoices&rdquo; is a LINK through{" "}
          <code className="font-mono">renderLink</code> (react-router&apos;s <code className="font-mono">Link</code>, so
          following it goes to the data table page without a reload); its <code className="font-mono">badge</code>{" "}
          draws nothing at 0, the count at 3 and <code className="font-mono">99+</code> at 120, and the count joins the
          name — <code className="font-mono">floatingPanel.badge</code> (&ldquo;3 new&rdquo;, translated by the
          language menu) or <code className="font-mono">badgeLabel</code>. The brand &ldquo;+&rdquo; is{" "}
          <code className="font-mono">variant=&quot;primary&quot;</code> with{" "}
          <code className="font-mono">tooltip=&#123;false&#125;</code>: hover it, no bubble — the others show their label
          in the kit tooltip. <code className="font-mono">corner</code> is logical and{" "}
          <code className="font-mono">offset</code> lifts the pill above the nav by that much more.
        </Note>
      </div>
    </Example>
  );
}

export function FloatingActions() {
  const [active, setActive] = useState<Which>(null);
  return (
    <>
      <StatusFab active={active} setActive={setActive} />
      <TooltipFab active={active} setActive={setActive} />
      <Group active={active} setActive={setActive} />
    </>
  );
}
