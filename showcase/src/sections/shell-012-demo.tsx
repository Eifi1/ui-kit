import { useState } from "react";
import { Bell, CloudOff, MessageSquarePlus, RefreshCw } from "lucide-react";
import { Switch, ToggleGroup, TopBar, TopBarActionMenu, TopBarBrand } from "@eifi1/ui-kit";
import type { KitLinkComponent, StatusDotTone, TopBarMenuEntry } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * The 0.12 top-bar parts: the brand link that collapses to its logo on a phone, and the
 * unread dot on a menu's icon trigger.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

/** A made-up brand mark: an SVG with no size of its own, so TopBarBrand's `h-6` sizes it. */
function AcmeMark() {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <path d="M9 22 16 9l7 13h-4l-3-6-3 6z" fill="var(--brand-contrast)" />
    </svg>
  );
}

type Collapse = "sm" | "md" | "false";

function TopBarBrandSpecimen() {
  const [collapse, setCollapse] = useState<Collapse>("sm");
  const [own, setOwn] = useState(false);
  const [log, setLog] = useState("—");

  // A renderLink of this one link's own — wins over the provider's linkComponent.
  const logging: KitLinkComponent = ({ href, children, onClick, ...p }) => (
    <a
      {...p}
      href={`#${href}`}
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
        setLog(`renderLink → ${href}`);
      }}
    >
      {children}
    </a>
  );

  return (
    <Example
      label="TopBarBrand — logo and name, the name hidden on a phone"
      hint="pass it as TopBar's brand; it is a router link to `to`"
    >
      <Row>
        <span className="text-xs text-[var(--text-muted)]">collapseBelow</span>
        <ToggleGroup<Collapse>
          ariaLabel="collapseBelow"
          value={collapse}
          onChange={setCollapse}
          options={[
            { value: "sm", label: "sm" },
            { value: "md", label: "md" },
            { value: "false", label: "false" },
          ]}
        />
        <Switch label="renderLink of its own" checked={own} onCheckedChange={setOwn} />
      </Row>
      <div className="mt-4 overflow-hidden rounded-md border border-[var(--border)]">
        <TopBar
          className="static"
          brand={
            <TopBarBrand
              logo={<AcmeMark />}
              name="Acme Books"
              to="/shell"
              collapseBelow={collapse === "false" ? false : collapse}
              renderLink={own ? logging : undefined}
            />
          }
          actions={<span className={READOUT}>actions</span>}
        />
      </div>
      <p className={`mt-3 ${READOUT}`}>{own ? `last click: ${log}` : "links through the provider's linkComponent (this page's router) to /shell"}</p>
      <div className="mt-3">
        <Note>
          Below the breakpoint the name is {code("sr-only")}, not removed: the logo is the whole visible link and
          the link is still called &ldquo;Acme Books&rdquo; — narrow the window (or open the phone preview) to see it
          go. The logo is {code("aria-hidden")} and sized {code("h-6 w-auto")}. Without {code("renderLink")} it
          uses the provider&apos;s {code("linkComponent")}, else react-router&apos;s {code("Link")}.
        </Note>
      </div>
    </Example>
  );
}

function IconBadgeSpecimen() {
  const [unread, setUnread] = useState(2);
  const [offline, setOffline] = useState(true);
  const [tone, setTone] = useState<StatusDotTone>("danger");
  const [chosen, setChosen] = useState("—");

  const feedbackEntries: TopBarMenuEntry[] = [
    {
      key: "replies",
      icon: <MessageSquarePlus className="size-4" />,
      label: unread ? `${unread} new replies` : "No new replies",
      onSelect: () => {
        setUnread(0);
        setChosen("read the replies");
      },
    },
  ];
  const syncEntries: TopBarMenuEntry[] = [
    {
      key: "retry",
      icon: <RefreshCw className="size-4" />,
      label: offline ? "Retry sync" : "Synced",
      disabled: !offline,
      onSelect: () => {
        setOffline(false);
        setChosen("sync retried");
      },
    },
  ];

  return (
    <Example
      label="TopBarActionMenu — iconBadge"
      hint="a dot on the icon trigger, with words for a screen reader"
    >
      <Row>
        <TopBarActionMenu
          icon={<Bell className="size-5" />}
          iconBadge={unread ? { label: `${unread} unread`, tone } : null}
          ariaLabel="Feedback"
          heading="Feedback"
          entries={feedbackEntries}
          panelClassName="w-56"
        />
        <TopBarActionMenu
          icon={<CloudOff className="size-5" />}
          iconBadge={offline ? { label: "sync failed", tone: "warning" } : undefined}
          ariaLabel="Sync status"
          heading="Sync"
          entries={syncEntries}
          panelClassName="w-56"
        />
        <ToggleGroup<StatusDotTone>
          ariaLabel="tone"
          value={tone}
          onChange={setTone}
          options={[
            { value: "danger", label: "danger" },
            { value: "info", label: "info" },
            { value: "success", label: "success" },
          ]}
        />
      </Row>
      <Row className="mt-3">
        <button
          type="button"
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
          onClick={() => {
            setUnread((n) => n + 1);
            setOffline(true);
          }}
        >
          New reply, and fail the sync again
        </button>
        <span className={READOUT}>
          unread: {unread} · offline: {String(offline)} · last: {chosen}
        </span>
      </Row>
      <div className="mt-3">
        <Note>
          With a badge the trigger is named by its content — {code("ariaLabel")} and the badge&apos;s {code("label")}{" "}
          as {code("sr-only")} text — so it is read &ldquo;Feedback 2 unread&rdquo;; an {code("aria-label")} would
          have hidden the count. {code("tone")} defaults to {code("danger")}. {code("null")} or {code("undefined")}{" "}
          draws the plain trigger. Choose the menu&apos;s row to clear each dot.
        </Note>
      </div>
    </Example>
  );
}

export function ShellBrandDemo() {
  return (
    <>
      <TopBarBrandSpecimen />
      <IconBadgeSpecimen />
    </>
  );
}
