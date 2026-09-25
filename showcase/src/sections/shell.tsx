import { useEffect, useRef, useState } from "react";
import type { ContextType, RefObject } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation } from "react-router";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Building2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquarePlus,
  PieChart,
  Receipt,
  Server,
  Upload,
  Wallet,
} from "lucide-react";
import {
  AppShell,
  LanguageMenu,
  OptionSwitcherMenu,
  PALETTES,
  PaletteMenu,
  RoleSwitcher,
  TOPBAR_MENU_ITEM_CLASS,
  TOPBAR_TRIGGER_CLASS,
  ThemeToggle,
  TopBar,
  TopBarActionMenu,
  cn,
} from "@eifi1/ui-kit";
import type {
  AppShellNavItem,
  LanguageOption,
  OptionSwitcherOption,
  TopBarMenuEntry,
} from "@eifi1/ui-kit";
import {
  PageContents,
  PageContentsLayout,
  Switch,
  ToggleGroup,
  useScrollSpy,
} from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable, Row } from "../lib/section";
import { usePalette, useTheme } from "../stores";

/**
 * SHELL.
 *
 * The page frame around you is the first demo: `main.tsx` mounts one `AppShell`. The
 * second is a small `AppShell` in a card further down, with every prop on a switch —
 * boxed in so it cannot fight the real one (see `AppShellPlayground` for how). The
 * rest of the specimens are the parts: the bar, the controls that go in it, the class
 * constants an app matches its own menus to, and the nav-item shape both navs read.
 *
 * The theme and palette controls below are wired to the REAL stores from
 * `../stores` — the same ones the page header uses. That is the point: operate one
 * and its twin in the header follows, because "controlled" in this kit means the
 * app owns the value and the component owns nothing.
 */

// A country code is NOT a language code, and the flag is keyed off the country:
// en → gb, pt → br. That is the one thing about `LanguageOption` worth showing, so
// this list is chosen to contain two of them rather than three tidy pairs.
const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", country: "gb" },
  { code: "de", label: "Deutsch", country: "de" },
  { code: "fr", label: "Français", country: "fr" },
  { code: "pt", label: "Português", country: "br" },
];

type Env = "dev" | "staging" | "prod";

const ENVIRONMENTS: OptionSwitcherOption<Env>[] = [
  { value: "dev", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "prod", label: "Production" },
];

// `readonly R[]` in the prop, so `as const` is what makes R the three literals
// instead of `string` — and therefore what makes a typo in `value` a compile error.
const ROLES = ["admin", "accountant", "viewer"] as const;

/**
 * A real `AppShellNavItem[]`, typed against the exported interface so this block
 * cannot drift from the shape it documents: rename a field in the kit and this file
 * stops compiling. "Import & Export" is the entry from the source's own war story
 * (keksdose live #210) — the label that wrapped to two lines in the mobile bar and
 * pushed its cell taller than the rest, which is what `shortLabel` was added for.
 */
const NAV_REFERENCE: AppShellNavItem[] = [
  { to: "/budget", label: "Budget", icon: Wallet, dataTour: "nav-budget" },
  { to: "/transactions", label: "Transactions", shortLabel: "Txns", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: PieChart, end: false },
  {
    to: "/data",
    label: "Import & Export",
    shortLabel: "Data",
    icon: Upload,
    items: [
      { to: "/data/import", label: "Import a statement", icon: Upload },
      { to: "/data/accounts", label: "Accounts", icon: Building2 },
      { to: "/data/receipts", label: "Receipts", icon: Receipt, end: false },
    ],
  },
];

// Anything this page draws for itself is painted in tokens — a control panel in
// `slate-*` would keep looking right while the palette switch beside it did nothing.
const MINI_BUTTON =
  "rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--brand)]";

const READOUT = "font-mono text-xs text-[var(--text-primary)]";

const PROSE = "font-sans font-normal text-[var(--text-secondary)]";

export function ShellSection() {
  return (
    <>
      <PageContentsExample />
      <Example
        label="TopBar"
        hint="Shared frame, app-composed contents: a brand slot and an actions slot, nothing else."
        className="overflow-hidden p-0"
      >
        <TopBarSpecimen />
      </Example>

      <Example
        label="ThemeToggle and PaletteMenu"
        hint="Wired to the showcase's own stores — operate these and the header follows."
      >
        <ThemeAndPalette />
      </Example>

      <Example
        label="LanguageMenu"
        hint="The trigger is the active flag, not an icon; an unknown code falls back to a globe."
      >
        <Languages />
      </Example>

      <Example
        label="OptionSwitcherMenu"
        hint="Generic check-marked value switcher — the glue RoleSwitcher is built from."
      >
        <Environments />
      </Example>

      <Example label="RoleSwitcher" hint="OptionSwitcherMenu plus the standard flask icon.">
        <Roles />
      </Example>

      <Example
        label="TopBarActionMenu"
        hint="Rows as data: actions, react-router links and dividers. Needs a Router."
      >
        <ActionMenu />
      </Example>

      <Example
        label="Top-bar class constants"
        hint="Exported so an app's own menus line up with the shared ones."
      >
        <ConstList
          items={[
            ["TOPBAR_TRIGGER_CLASS", TOPBAR_TRIGGER_CLASS],
            ["TOPBAR_MENU_ITEM_CLASS", TOPBAR_MENU_ITEM_CLASS],
          ]}
        />
        <div className="mt-3">
          <Note>
            Both paint in <code className="font-mono">var(--…)</code> tokens, so an app-owned
            trigger built from them follows the palette switch exactly as the kit&apos;s own do —
            the bell in the TopBar specimen above is one.
          </Note>
        </div>
      </Example>

      <Example
        label="AppShellNavItem — a real list"
        hint="One list feeds both navs; the desktop sidebar and the mobile bar read it differently."
      >
        <NavItemReference />
      </Example>

      <Example label="AppShellNavItem — field by field" hint="Defaults are the kit's, not react-router's.">
        <OutTable
          rows={[
            ["to", <span className={PROSE}>Route path, the NavLink target — and the React key in both navs, so two items may not share one.</span>],
            ["label", <span className={PROSE}>Sidebar text, the tooltip when collapsed, and the flyout header.</span>],
            ["shortLabel?", <span className={PROSE}>Mobile bottom bar only. The bar divides the viewport into nav.length equal cells, so every entry added shrinks the room a label has.</span>],
            ["icon", <span className={PROSE}>A LucideIcon — the component itself (Wallet), never an element (&lt;Wallet /&gt;). AppShell renders it as &lt;item.icon /&gt; at size-4 in the sidebar and size-5 in the bar.</span>],
            ["end?", <span className={PROSE}>NavLink exact match. Defaults to TRUE, which is the opposite of react-router's own default: pass end: false for a section whose children are routes.</span>],
            ["dataTour?", <span className={PROSE}>data-tour on this item's link in BOTH navs, so a tour can spotlight one entry instead of matching by href.</span>],
            ["items?", <span className={PROSE}>AppShellSubItem[] (to/label/icon/end). Opens a portalled flyout beside the sidebar on hover or focus, collapsed or expanded. The mobile bar ignores sub-items and links to `to`.</span>],
          ]}
        />
      </Example>

      <Example
        label="AppShell — every prop on a switch"
        hint="A second, boxed shell with its own router. Below 768px it shows the phone bar instead of the sidebar."
      >
        <AppShellPlayground />
      </Example>

      <Example
        label="AppShell — the contracts"
        hint="The shell around this page, read live."
      >
        <AppShellNotes />
      </Example>
    </>
  );
}

/**
 * The bar, with one shared control and one the "app" owns. Both are built from
 * TOPBAR_TRIGGER_CLASS, which is the whole reason that constant is exported: the
 * bell below is not a kit component, and it still lines up with the toggle beside
 * it to the pixel.
 */
function TopBarSpecimen() {
  const mode = useTheme((s) => s.mode);
  const toggle = useTheme((s) => s.toggle);
  const [unread, setUnread] = useState(3);

  return (
    <>
      {/* `static` rather than the default `sticky top-0 z-40`: TopBar is designed to
          pin itself to the viewport, and a second pinned header would ride over the
          page as you scroll past this card. twMerge resolves the conflict, so the
          override is one class rather than a copy of the component. */}
      <TopBar
        className="static"
        brand={
          <>
            <Wallet className="size-5 shrink-0 text-[var(--brand)]" aria-hidden />
            <span className="truncate font-semibold text-[var(--text-primary)]">Acme Books</span>
            <span className="hidden truncate text-xs text-[var(--text-muted)] sm:inline">
              / Q3 2026
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setUnread((n) => (n === 0 ? 3 : 0))}
              aria-label={unread === 0 ? "No notifications" : `${unread} notifications`}
              className={cn(TOPBAR_TRIGGER_CLASS, "relative")}
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 min-w-4 rounded-full bg-[var(--brand)] px-1 text-[10px] font-semibold leading-4 text-[var(--brand-contrast)]">
                  {unread}
                </span>
              )}
            </button>
            <ThemeToggle
              mode={mode}
              onToggle={toggle}
              ariaLabel="Toggle theme"
              title={mode === "dark" ? "Dark" : "Light"}
            />
          </>
        }
      />
      <div className="space-y-2 px-4 py-3">
        <p className="text-xs text-[var(--text-secondary)]">
          The bell is app-owned markup wearing{" "}
          <code className="font-mono">TOPBAR_TRIGGER_CLASS</code>; the sun/moon is the kit's{" "}
          <code className="font-mono">ThemeToggle</code>. Same box, same hover, same rhythm.
        </p>
        <Note>
          <code className="font-mono">z-40</code> in the real thing, above sticky page content
          (<code className="font-mono">z-30</code>) but below modals and the tour
          (<code className="font-mono">z-50</code>/<code className="font-mono">z-60</code>).
          The bar is <code className="font-mono">h-12</code>, which is also what{" "}
          <code className="font-mono">AppShell</code>'s sidebar offsets itself by — change one
          and the sidebar hangs.
        </Note>
      </div>
    </>
  );
}

function ThemeAndPalette() {
  const mode = useTheme((s) => s.mode);
  const preference = useTheme((s) => s.preference);
  const toggle = useTheme((s) => s.toggle);
  const setPreference = useTheme((s) => s.setPreference);
  const paletteId = usePalette((s) => s.id);
  const setPaletteId = usePalette((s) => s.setId);
  const activeName = PALETTES.find((p) => p.id === paletteId)?.name ?? paletteId;

  return (
    <div className="space-y-3">
      <Row>
        <ThemeToggle
          mode={mode}
          onToggle={toggle}
          ariaLabel="Toggle theme (specimen)"
          title={mode === "dark" ? "Dark" : "Light"}
        />
        <PaletteMenu
          palettes={PALETTES}
          activeId={paletteId}
          mode={mode}
          onSelect={setPaletteId}
          ariaLabel="Appearance preset (specimen)"
          heading="Palette"
        />
        {/* `toggle` only ever produces an explicit light or dark, so nothing in the
            top bar can hand the user back to "system" once they have left it. The
            escape hatch is `setPreference`, which is why it is a separate action
            here rather than a third state on the toggle. */}
        <button type="button" className={MINI_BUTTON} onClick={() => setPreference("system")}>
          Follow the system
        </button>
      </Row>
      <p className={READOUT}>
        mode: {mode} · preference: {preference} · palette: {paletteId} ({activeName})
      </p>
      <Note>
        <code className="font-mono">mode</code> is the RESOLVED light/dark and{" "}
        <code className="font-mono">preference</code> is what the user chose — only the
        preference is persisted, and <code className="font-mono">mode</code> is derived again on
        every load. Read <code className="font-mono">mode</code> for anything that needs a
        concrete theme (token selection, the toaster); read{" "}
        <code className="font-mono">preference</code> only to show the choice back.
      </Note>
      <Note>
        <code className="font-mono">PaletteMenu</code> indexes each preset by{" "}
        <code className="font-mono">mode</code> to draw its swatches, so the menu's own colours
        change when you flip the theme.{" "}
        <code className="font-mono">PALETTES</code> is {PALETTES.length} presets;{" "}
        <code className="font-mono">ALTERNATIVE_PRESETS</code> is exported separately and is not
        in it, so passing <code className="font-mono">PALETTES</code> is a choice about which
        presets an app offers, not the whole catalogue.
      </Note>
    </div>
  );
}

function Languages() {
  // `current` is `string | undefined`, and an unmatched code is a real state: an app
  // restoring a locale it no longer ships lands here. Hence the reset button — the
  // menu itself can only ever produce a valid code.
  const [lang, setLang] = useState<string | undefined>("de");

  return (
    <div className="space-y-3">
      <Row>
        <LanguageMenu options={LANGUAGES} current={lang} onChange={setLang} ariaLabel="Language" />
        <button type="button" className={MINI_BUTTON} onClick={() => setLang(undefined)}>
          Clear the selection
        </button>
        <span className={READOUT}>current: {lang ?? "undefined"}</span>
      </Row>
      <Note>
        The flags are <code className="font-mono">flag-icons</code> spans (
        <code className="font-mono">fi fi-gb</code>), keyed off{" "}
        <code className="font-mono">country</code> — which is deliberately not the language
        code: English is <code className="font-mono">gb</code> and Portuguese here is{" "}
        <code className="font-mono">br</code>. <code className="font-mono">flag-icons</code> is a
        dependency of the package that nothing inside the package imports, so a consumer that
        never imports the stylesheet gets empty boxes and no error.
      </Note>
    </div>
  );
}

function Environments() {
  const [env, setEnv] = useState<Env>("staging");

  return (
    <div className="space-y-3">
      <Row>
        <OptionSwitcherMenu<Env>
          icon={<Server className="size-5" />}
          ariaLabel="Environment"
          title={`Environment: ${env}`}
          heading="Environment"
          options={ENVIRONMENTS}
          value={env}
          onSelect={setEnv}
        />
        <span className={READOUT}>value: {env}</span>
      </Row>
      <Note>
        Generic in the option type, so <code className="font-mono">onSelect</code> hands back the
        union rather than <code className="font-mono">string</code> — a switch over it is
        exhaustive. <code className="font-mono">label</code> is a{" "}
        <code className="font-mono">ReactNode</code>, so a row can carry a badge or a muted
        subtitle; <code className="font-mono">value</code> must be a string, because it is also
        the list key.
      </Note>
    </div>
  );
}

function Roles() {
  const [role, setRole] = useState<(typeof ROLES)[number]>("viewer");

  return (
    <div className="space-y-3">
      <Row>
        <RoleSwitcher roles={ROLES} value={role} onChange={setRole} heading="Act as" />
        <span className={READOUT}>value: {role}</span>
      </Row>
      <Note>
        A thin wrapper: the flask icon, and a default{" "}
        <code className="font-mono">title</code> of{" "}
        <code className="font-mono">Role: {role}</code> when none is passed. Typically a dev or
        UI-only affordance — the kit has no opinion about whether the server honours the
        switch, so nothing here should be mistaken for authorisation.
      </Note>
    </div>
  );
}

function ActionMenu() {
  const [chosen, setChosen] = useState("nothing yet");

  // `kind` may be omitted for actions, which is why the first two rows look terser
  // than the link and the divider. Built inside the component because the handlers
  // close over state — a module-level array could not.
  const entries: TopBarMenuEntry[] = [
    {
      key: "report",
      icon: <MessageSquarePlus className="size-4" />,
      label: "Report a problem",
      onSelect: () => setChosen("Report a problem"),
    },
    {
      key: "support",
      icon: <LifeBuoy className="size-4" />,
      label: "Contact support",
      trailing: <span className="text-[10px] text-[var(--text-muted)]">24h</span>,
      onSelect: () => setChosen("Contact support"),
    },
    { kind: "divider", key: "sep" },
    {
      kind: "link",
      key: "docs",
      icon: <BookOpen className="size-4" />,
      label: "Documentation",
      to: "/docs",
    },
    {
      kind: "action",
      key: "signout",
      icon: <LogOut className="size-4" />,
      label: "Sign out",
      onSelect: () => setChosen("Sign out"),
    },
  ];

  return (
    <div className="space-y-3">
      <Row>
        <TopBarActionMenu
          icon={<LifeBuoy className="size-5" />}
          ariaLabel="Help and feedback"
          heading="Help"
          entries={entries}
          panelClassName="w-64"
        />
        <span className={READOUT}>last chosen: {chosen}</span>
      </Row>
      <Note>
        The <code className="font-mono">link</code> row renders a react-router{" "}
        <code className="font-mono">&lt;Link&gt;</code>, so this component throws outside a
        Router — one is mounted above this page. Choosing it navigates the showcase to{" "}
        <code className="font-mono">/docs</code>, which has no route of its own here; that is
        the link working, not failing. Non-divider rows close the menu for you, so a handler
        that also closes it is a handler doing the component's job twice.
      </Note>
      <Note>
        Only one <code className="font-mono">HoverMenu</code> panel is open at a time across the
        whole document — opening this one shuts the palette or language menu above. That is
        module-level coordination inside the kit, not something a call site arranges.
      </Note>
    </div>
  );
}

function NavItemReference() {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-[var(--border)]">
        {NAV_REFERENCE.map((item) => (
          <li key={item.to} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <item.icon className="size-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
            <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{item.to}</span>
            <span className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <span>
                bar: <span className="font-mono">{item.shortLabel ?? item.label}</span>
              </span>
              {item.end === false && <span className="font-mono">end: false</span>}
              {item.dataTour && <span className="font-mono">data-tour: {item.dataTour}</span>}
              {item.items && <span>{item.items.length} sub-items</span>}
            </span>
          </li>
        ))}
      </ul>
      <Note>
        The right-hand column is what the MOBILE bar would print — it is the only consumer of{" "}
        <code className="font-mono">shortLabel</code>, and it truncates to one line whether or
        not one was supplied, because an ellipsis in one cell is a smaller problem than a bar
        whose cells are different heights. The sidebar, its collapsed tooltips and anything else
        built on this list keep the full <code className="font-mono">label</code>.
      </Note>
      <Note>
        Sub-items reach the desktop sidebar only. Hover or keyboard focus opens a flyout beside
        the item — portalled, because the sidebar is{" "}
        <code className="font-mono">overflow-hidden</code> and would otherwise clip it — with a
        140ms grace period so the cursor can travel onto the panel. The mobile bar drops them
        and links to <code className="font-mono">to</code>, so a parent route that renders
        nothing on its own is a dead end on a phone.
      </Note>
    </div>
  );
}

function AppShellNotes() {
  const [navHeight, setNavHeight] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Row>
        {/* The inline style, not getComputedStyle: AppShell publishes the variable with
            `documentElement.style.setProperty`, so this reads exactly what it wrote —
            and jsdom does not resolve custom properties through computed style, so the
            mount test would see an empty string. Read on click rather than in an effect
            because AppShell is our PARENT: its effect runs after ours, so a mount-time
            read would be one frame early and permanently stale. */}
        <button
          type="button"
          className={MINI_BUTTON}
          onClick={() =>
            setNavHeight(document.documentElement.style.getPropertyValue("--app-nav-h") || "unset")
          }
        >
          Read --app-nav-h
        </button>
        <span className={READOUT}>{navHeight ?? "press to read"}</span>
      </Row>
      <Note>
        <code className="font-mono">--app-nav-h</code> is the mobile bar's MEASURED height,
        republished on resize and floored to a whole pixel, so anything that has to sit on the
        bar can write <code className="font-mono">bottom-[var(--app-nav-h,0px)]</code> once and
        be right at both widths. Above 768px the bar is{" "}
        <code className="font-mono">display:none</code>, which measures as zero — so read this
        on a wide window and expect <code className="font-mono">0px</code>, then narrow the
        window past 768px and read it again.
      </Note>
      <Note>
        The mobile bar is <code className="font-mono">fixed bottom-0</code>, which on a
        notched phone means the home indicator sits over it unless the document opts in with{" "}
        <code className="font-mono">
          &lt;meta name="viewport" content="…, viewport-fit=cover"&gt;
        </code>
        . This showcase's <code className="font-mono">index.html</code> carries it. Note that
        the tag only unlocks the <code className="font-mono">safe-area-inset-*</code> values:
        the bar itself does not currently pad by them, so until it does, an app also has to
        leave that room.
      </Note>
      <Note>
        The sidebar's collapsed state persists under{" "}
        <code className="font-mono">collapseStorageKey</code>, read through the kit's guarded
        storage helpers rather than <code className="font-mono">localStorage</code> directly —
        that read happens during render, and <code className="font-mono">localStorage</code>{" "}
        throws where site data is blocked, which would take the whole application down rather
        than lose a preference. The default key is a shared literal, so two apps on one origin
        in development want their own.
      </Note>
    </div>
  );
}

/* ── AppShell, live ────────────────────────────────────────────────────── */

/** The playground's own nav: a plain entry, a group with pages, an entry with a tour
 *  anchor and one with a `shortLabel` — enough to exercise both navs. */
const DEMO_NAV: AppShellNavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/books",
    label: "Books",
    icon: BookOpen,
    items: [
      { to: "/books/ledger", label: "Ledger", icon: Wallet },
      { to: "/books/receipts", label: "Receipts", icon: Receipt },
    ],
  },
  { to: "/reports", label: "Reports", icon: PieChart, dataTour: "demo-reports" },
  {
    to: "/data",
    label: "Import & Export",
    shortLabel: "Data",
    icon: Upload,
    items: [
      { to: "/data/import", label: "Import", icon: Upload },
      { to: "/data/accounts", label: "Accounts", icon: Building2 },
    ],
  },
];

/** `null` is what a `LocationContext` holds outside any router. See the playground. */
const NO_ROUTER = null as unknown as ContextType<typeof UNSAFE_LocationContext>;

/**
 * A second `AppShell`, in a box.
 *
 * Three things keep it from fighting the real one:
 *
 *  - Its own `MemoryRouter`, so clicking its nav moves IT and not the page. React
 *    Router refuses a router inside a router; resetting `LocationContext` to its
 *    outside-any-router value is the documented escape hatch for exactly this (a
 *    widget with its own history). Nothing inside reads the outer route.
 *  - `transform` on the frame, which makes the frame the containing block for the
 *    shell's `position: fixed` phone bar — so below 768px the bar docks on the card,
 *    not on the window.
 *  - `useKeepOuterNavHeight`: the shell publishes `--app-nav-h` on `<html>` and
 *    removes it on unmount. Two shells means two writers of one variable.
 */
function AppShellPlayground() {
  const [subNav, setSubNav] = useState<"flyout" | "inline">("inline");
  const [mobileSubNav, setMobileSubNav] = useState(true);
  const [withFooter, setWithFooter] = useState(true);
  const [withSidebarFooter, setWithSidebarFooter] = useState(true);
  const [customLabels, setCustomLabels] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  useKeepOuterNavHeight(frame);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-[var(--text-muted)]">subNav</span>
          <ToggleGroup<"flyout" | "inline">
            ariaLabel="subNav"
            value={subNav}
            onChange={setSubNav}
            options={[
              { value: "flyout", label: "flyout" },
              { value: "inline", label: "inline" },
            ]}
          />
        </div>
        <Switch
          label="mobileSubNav"
          description="The group's pages as a row above the phone bar"
          checked={mobileSubNav}
          onCheckedChange={setMobileSubNav}
        />
        <Switch
          label="footer"
          description="Desktop only, under the content"
          checked={withFooter}
          onCheckedChange={setWithFooter}
        />
        <Switch
          label="sidebarFooter"
          description="A function of `collapsed`"
          checked={withSidebarFooter}
          onCheckedChange={setWithSidebarFooter}
        />
        <Switch
          label="collapseLabel · expandLabel · toggleGroupLabel"
          description="Off: the provider's words (this page's language)"
          checked={customLabels}
          onCheckedChange={setCustomLabels}
        />
      </div>

      <div
        ref={frame}
        // `transform` is load-bearing — see the comment on the component.
        style={{ transform: "translateZ(0)" }}
        className="h-[26rem] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-page)] md:[&_aside]:h-auto md:[&_aside]:self-stretch [&_main]:overflow-y-auto"
      >
        <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
          <MemoryRouter initialEntries={["/books/ledger"]}>
            <AppShell
              nav={DEMO_NAV}
              subNav={subNav}
              mobileSubNav={mobileSubNav}
              // A key of its own: the default is shared by every app on the origin.
              collapseStorageKey="uikit-showcase-demo-shell.collapsed"
              collapseLabel={customLabels ? "Fold the sidebar" : undefined}
              expandLabel={customLabels ? "Unfold the sidebar" : undefined}
              toggleGroupLabel={customLabels ? (group) => `Pages of ${group}` : undefined}
              // The rest of the props land on the root <div> — an id, a landmark
              // label, a tour anchor. There is nothing above the shell to put them on.
              id="demo-shell"
              data-demo="app-shell"
              className="h-full min-h-0 md:h-full"
              topBar={
                <TopBar
                  brand={
                    <>
                      <Wallet className="size-5 shrink-0 text-[var(--brand)]" aria-hidden />
                      <span className="truncate font-semibold text-[var(--text-primary)]">
                        Acme Books
                      </span>
                    </>
                  }
                />
              }
              footer={
                withFooter ? (
                  <footer className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)]">
                    footer — v2.4.1 · © Acme
                  </footer>
                ) : undefined
              }
              sidebarFooter={
                withSidebarFooter
                  ? (collapsed) => (
                      <div className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                        {collapsed ? "v2" : "sidebarFooter(collapsed=false) · v2.4.1"}
                      </div>
                    )
                  : undefined
              }
            >
              <DemoShellPage />
            </AppShell>
          </MemoryRouter>
        </UNSAFE_LocationContext.Provider>
      </div>

      <Note>
        Try: hover or expand <strong>Books</strong> (flyout vs inline), collapse the sidebar with
        the button at its foot (the state persists under{" "}
        <code className="font-mono">collapseStorageKey</code>), and open the screen-size preview
        from the top bar to see the phone bar with its page row. The collapsed sidebar always
        uses the flyout, whatever <code className="font-mono">subNav</code> says.
      </Note>
    </div>
  );
}

/** What the playground's `<main>` shows: where its own router is. */
function DemoShellPage() {
  const { pathname } = useLocation();
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm text-[var(--text-primary)]">
        children — the current route is{" "}
        <code className="font-mono text-[var(--brand)]">{pathname}</code>
      </p>
      <p className="text-xs text-[var(--text-secondary)]">
        A real app renders its <code className="font-mono">&lt;Outlet /&gt;</code> here. The
        group holding this page stays marked in the sidebar while one of its pages is open.
      </p>
    </div>
  );
}

/**
 * Keep `--app-nav-h` equal to the REAL shell's phone bar while the playground is
 * mounted, and put it back after the playground's cleanup has removed it.
 *
 * Measured the way AppShell measures (floored bounding box of the bar's wrapper), so
 * when the real shell republishes on a resize the two writers agree and the observer
 * does nothing.
 */
function useKeepOuterNavHeight(frame: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    const fix = () => {
      const bar = [...document.querySelectorAll<HTMLElement>("nav[data-tour='nav']")].find(
        (nav) => !frame.current?.contains(nav),
      )?.parentElement;
      const want = `${bar ? Math.floor(bar.getBoundingClientRect().height) : 0}px`;
      if (root.style.getPropertyValue("--app-nav-h") !== want) {
        root.style.setProperty("--app-nav-h", want);
      }
    };
    // Runs after the playground's own effect (parents run after children), so the
    // first thing it corrects is the playground's first publish.
    fix();
    const observer = new MutationObserver(fix);
    observer.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      // The playground removes the variable in ITS cleanup, which runs after this one.
      setTimeout(fix, 0);
    };
  }, [frame]);
}

/* ── PageContents ──────────────────────────────────────────────────────── */

const CONTENTS_SAMPLE = [
  { id: "pc-demo-overview", label: "Overview" },
  { id: "pc-demo-install", label: "Install" },
  { id: "pc-demo-peers", label: "Peer dependencies", level: 2 as const },
  { id: "pc-demo-usage", label: "Usage" },
  { id: "pc-demo-faq", label: "Questions" },
];

/**
 * `PageContents` + `PageContentsLayout` + `useScrollSpy` on a small scrolling box of
 * their own. The live one is the "On this page" rail beside every page of this
 * showcase: fed from the page's headings, following `<main>`, moved from the top bar.
 */
function PageContentsExample() {
  const [position, setPosition] = useState<"start" | "end">("start");
  const [variant, setVariant] = useState<"rail" | "disclosure">("rail");
  const [line, setLine] = useState(0.15);
  // State, not a ref: `useScrollSpy` re-subscribes when its `root` changes, and a ref
  // filled after the first render would leave it listening to the window.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const activeId = useScrollSpy(
    CONTENTS_SAMPLE.map((item) => item.id),
    { root: box, line },
  );

  const contents = (
    <PageContents
      items={CONTENTS_SAMPLE}
      activeId={activeId}
      variant={variant}
      labels={{ title: "In this box" }}
      // Scroll the box rather than follow the href: under this page's hash router a
      // bare `#id` would be read as a route.
      onClick={(e) => {
        const id = (e.target as HTMLElement).closest("[data-entry]")?.getAttribute("data-entry");
        if (!id) return;
        e.preventDefault();
        // The box only: `scrollIntoView` would scroll the page along with it.
        const target = document.getElementById(id);
        if (box && target) box.scrollTo({ top: target.offsetTop - 8, behavior: "smooth" });
      }}
    />
  );

  return (
    <Example
      label="PageContents · PageContentsLayout · useScrollSpy"
      hint="the rail beside this page is one; here the box below is the scroller"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ToggleGroup<"start" | "end">
          ariaLabel="position"
          value={position}
          onChange={setPosition}
          options={[
            { value: "start", label: 'position="start"' },
            { value: "end", label: 'position="end"' },
          ]}
        />
        <ToggleGroup<"rail" | "disclosure">
          ariaLabel="variant"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "rail", label: 'variant="rail"' },
            { value: "disclosure", label: 'variant="disclosure"' },
          ]}
        />
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          line
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={line}
            onChange={(e) => setLine(Number(e.target.value))}
          />
          <span className="font-mono">{line.toFixed(2)}</span>
        </label>
      </div>
      {/* The layout only shows the rail from xl up; forced visible here, in a card. A
          disclosure is not a rail, so it goes above the page instead. */}
      <PageContentsLayout
        position={position}
        className="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-page)] p-4 [&_aside]:block"
        contents={variant === "rail" ? contents : null}
      >
        {variant === "disclosure" && <div className="mb-3">{contents}</div>}
        <div
          ref={setBox}
          className="relative h-48 overflow-y-auto rounded border border-[var(--border)] px-3"
        >
          {/* The reading line, drawn where the spy puts it. */}
          <div
            aria-hidden
            className="pointer-events-none sticky z-10 h-0 border-t border-dashed border-[var(--brand)]"
            style={{ top: `${line * 12}rem` }}
          />
          {CONTENTS_SAMPLE.map((item) => (
            <section key={item.id} className="py-3">
              <h4 id={item.id} className="text-sm font-medium text-[var(--text-primary)]">
                {item.label}
              </h4>
              <p className="mt-1 h-24 text-xs text-[var(--text-muted)]">
                Scroll this box: the entry whose heading last crossed the dashed line is marked.
              </p>
            </section>
          ))}
        </div>
      </PageContentsLayout>
      <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">
        useScrollSpy(ids, {"{"} root: box, line: {line.toFixed(2)} {"}"}) → {JSON.stringify(activeId)}
      </p>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        Below <code className="font-mono">xl</code> the page&apos;s rail has no room; the same
        entries go in <code className="font-mono">{'<PageContents variant="disclosure">'}</code>{" "}
        under the title, as on this page at a narrower window.{" "}
        <code className="font-mono">labels.title</code> overrides the provider&apos;s{" "}
        <code className="font-mono">pageContents.title</code> for one instance.
      </p>
    </Example>
  );
}
