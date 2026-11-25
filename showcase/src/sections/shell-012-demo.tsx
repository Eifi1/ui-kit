import { useState } from "react";
import { Bell, CloudOff, MessageSquarePlus, RefreshCw } from "lucide-react";
import {
  LanguageMenu,
  Switch,
  ThemeToggle,
  ToggleGroup,
  TopBar,
  TopBarActionMenu,
  TopBarBrand,
  TopBarNav,
} from "@eifi1/ui-kit";
import type { KitLinkComponent, NavPillLinkProps, StatusDotTone, TopBarMenuEntry, TopBarNavItem } from "@eifi1/ui-kit";
import { Example, Note, Row, code, READOUT } from "../lib/section";

/**
 * The 0.12 top-bar parts: the brand link that collapses to its logo on a phone, and the
 * unread dot on a menu's icon trigger.
 */

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
        <span className="text-xs text-muted">collapseBelow</span>
        <ToggleGroup<Collapse>
          aria-label="collapseBelow"
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
      <div className="mt-4 overflow-hidden rounded-md border border-subtle">
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
      <p className={`mt-3 ${READOUT}`}>
        {own ? `last click: ${log}` : "links through the provider's linkComponent (this page's router) to /shell"}
      </p>
      <div className="mt-3">
        <Note>
          Below the breakpoint the name is {code("sr-only")}, not removed: the logo is the whole visible link and the
          link is still called &ldquo;Acme Books&rdquo; — narrow the window (or open the phone preview) to see it go.
          The logo is {code("aria-hidden")} and sized {code("h-6 w-auto")}. Without {code("renderLink")} it uses the
          provider&apos;s {code("linkComponent")}, else react-router&apos;s {code("Link")}.
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
    <Example label="TopBarActionMenu — iconBadge" hint="a dot on the icon trigger, with words for a screen reader">
      <Row>
        <TopBarActionMenu
          icon={<Bell className="size-5" />}
          iconBadge={unread ? { label: `${unread} unread`, tone } : null}
          aria-label="Feedback"
          heading="Feedback"
          entries={feedbackEntries}
          panelClassName="w-56"
        />
        <TopBarActionMenu
          icon={<CloudOff className="size-5" />}
          iconBadge={offline ? { label: "sync failed", tone: "warning" } : undefined}
          aria-label="Sync status"
          heading="Sync"
          entries={syncEntries}
          panelClassName="w-56"
        />
        <ToggleGroup<StatusDotTone>
          aria-label="tone"
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
          className="rounded-md border border-subtle px-2 py-1 text-xs"
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
          With a badge the trigger is named by its content — {code("aria-label")} and the badge&apos;s {code("label")}{" "}
          as {code("sr-only")} text — so it is read &ldquo;Feedback 2 unread&rdquo;; an {code("aria-label")} would have
          hidden the count. {code("tone")} defaults to {code("danger")}. {code("null")} or {code("undefined")} draws the
          plain trigger. Choose the menu&apos;s row to clear each dot.
        </Note>
      </div>
    </Example>
  );
}

type NavWidth = "full" | "640" | "360";
type NavSet = "three" | "four" | "long";

const NAV_SETS: Record<NavSet, TopBarNavItem[]> = {
  three: [
    { href: "/plots", label: "Plots" },
    { href: "/libraries", label: "Libraries" },
    { href: "/about", label: "About" },
  ],
  four: [
    { href: "/plots", label: "Plots" },
    { href: "/libraries", label: "Libraries" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
  ],
  // Hungarian, as a long translation arrives: the same three pages.
  long: [
    { href: "/plots", label: "Diagramtípusok" },
    { href: "/libraries", label: "Programkönyvtárak" },
    { href: "/about", label: "Rólunk" },
  ],
};

function TopBarNavSpecimen() {
  const [width, setWidth] = useState<NavWidth>("full");
  const [set, setSet] = useState<NavSet>("three");
  const [page, setPage] = useState("/plots");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("en");
  // Stays on this page: a click marks the link as the open one instead of navigating.
  const renderLink = ({ href, children, onClick, ...p }: NavPillLinkProps) => (
    <a
      {...p}
      href={`#${href}`}
      onClick={(e) => {
        onClick(e);
        e.preventDefault();
        setPage(href);
      }}
    >
      {children}
    </a>
  );
  return (
    <Example
      label="TopBarNav — the page links between the brand and the actions"
      hint="plain words; all of them fold into one menu when they do not fit"
    >
      <Row>
        <ToggleGroup<NavSet>
          aria-label="links"
          value={set}
          onChange={setSet}
          options={[
            { value: "three", label: "3 links" },
            { value: "four", label: "4 links" },
            { value: "long", label: "long labels" },
          ]}
        />
        <ToggleGroup<NavWidth>
          aria-label="bar width"
          value={width}
          onChange={setWidth}
          options={[
            { value: "full", label: "full" },
            { value: "640", label: "640 px" },
            { value: "360", label: "360 px" },
          ]}
        />
      </Row>
      <div
        className="mt-4 max-w-full overflow-hidden rounded-md border border-subtle"
        style={{ width: width === "full" ? undefined : `${width}px` }}
      >
        <TopBar
          className="static"
          brand={<TopBarBrand logo={<AcmeMark />} name="Acme Plots" to="/shell" />}
          nav={<TopBarNav items={NAV_SETS[set]} isActive={(href) => href === page} renderLink={renderLink} />}
          actions={
            <>
              <LanguageMenu
                options={[
                  { code: "en", label: "English", country: "gb" },
                  { code: "hu", label: "Magyar", country: "hu" },
                ]}
                current={language}
                onChange={setLanguage}
              />
              <ThemeToggle mode={mode} onChange={setMode} />
            </>
          }
        />
      </div>
      <p className={`mt-3 ${READOUT}`}>open page: {page}</p>
      <div className="mt-3">
        <Note>
          The open page is in the brand colour, underlined 2 px below the words, and {code('aria-current="page"')} — by
          path prefix (the router&apos;s path), or by the caller&apos;s {code("isActive(href)")} as here. When the row
          is wider than the room between the brand and the actions — always below {code("md")}, and whenever a fourth
          link or a long translation does not fit — every link moves into the menu button&apos;s dropdown, never only
          some. The room is measured, so a larger text size folds it sooner. {code("renderLink")} takes the props
          NavPills hands its router.
        </Note>
      </div>
    </Example>
  );
}

export function ShellBrandDemo() {
  return (
    <>
      <TopBarBrandSpecimen />
      <TopBarNavSpecimen />
      <IconBadgeSpecimen />
    </>
  );
}
