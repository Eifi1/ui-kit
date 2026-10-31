import { useState } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation } from "react-router";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Landmark,
  PiggyBank,
  Store,
  Tags,
  Building2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MessageSquarePlus,
  PieChart,
  Receipt,
  Scale,
  Server,
  Sparkles,
  Upload,
  Wallet,
  Compass,
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
  Chip,
  UserAvatar,
} from "@eifi1/ui-kit";
import type {
  AppShellNavItem,
  AppShellSidebarFooterItem,
  LanguageMenuTrigger,
  LanguageOption,
  OptionSwitcherOption,
  TopBarMenuEntry,
} from "@eifi1/ui-kit";
import { PageContents, PageContentsLayout, Switch, ToggleGroup, useScrollSpy } from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable, Row, NO_ROUTER, code, READOUT } from "../lib/section";
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

/** Three languages under one flag: the code tells them apart. */
const SWISS_LANGUAGES: LanguageOption[] = [
  { code: "de-CH", label: "Deutsch", country: "ch" },
  { code: "fr-CH", label: "Français", country: "ch" },
  { code: "it-CH", label: "Italiano", country: "ch" },
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
 * stops compiling. "Import & Export" is the entry whose label wrapped to two lines in the mobile bar and
 * pushed its cell taller than the rest, which is what `shortLabel` was added for.
 */
const NAV_REFERENCE: AppShellNavItem[] = [
  { to: "/budget", label: "Budget", icon: Wallet, dataTour: "nav-budget" },
  { to: "/transactions", label: "Transactions", shortLabel: "Trans.", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: PieChart, end: false },
  {
    to: "/data",
    label: "Import & Export",
    shortLabel: "Data",
    shortLabelIsAlias: true,
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
const MINI_BUTTON = "rounded-md border border-subtle bg-surface-2 px-2 py-1 text-xs text-primary hover:border-brand";

const READOUT_STRONG = "font-mono text-xs text-primary";

const PROSE = "font-sans font-normal text-secondary";

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
        hint="The trigger is the active flag and its code, not an icon; an unknown code falls back to a globe."
      >
        <Languages />
      </Example>

      <Example
        label="OptionSwitcherMenu"
        hint="Generic check-marked value switcher — the glue RoleSwitcher is built from."
      >
        <Environments />
      </Example>

      <Example
        label="RoleSwitcher"
        hint="Deprecated in 0.52, removed in 0.53: every app switches the role in `DevMenu`'s Account section."
      >
        <Roles />
      </Example>

      <Example label="TopBarActionMenu" hint="Rows as data: actions, react-router links and dividers. Needs a Router.">
        <ActionMenu />
      </Example>

      <Example
        label="TopBarActionMenu href — the icon is a link too"
        hint="hover opens the list; a click goes where the menu's last row goes"
      >
        <div className="space-y-3">
          <Row>
            <TopBarActionMenu
              icon={<Compass className="size-5" />}
              aria-label="Guided tours"
              heading="Tours"
              href="/shell"
              entries={[
                { key: "budget", label: "Budget tour", onSelect: () => {} },
                { key: "reports", label: "Reports tour", onSelect: () => {} },
                { kind: "divider", key: "sep" },
                { kind: "link", key: "all", label: "All tours", to: "/shell" },
              ]}
              panelClassName="w-56"
            />
          </Row>
          <Note>
            With <code className="font-mono">href</code> the trigger is the router&apos;s link, with{" "}
            <code className="font-mono">aria-haspopup=&quot;menu&quot;</code>: a click or Enter follows it and shuts the
            panel, hover still opens the list, and ↓/↑ on the focused icon open it onto the first or last row. A tap on
            a phone follows the link, so point it where everything in the menu is reachable (here the page itself, so
            the demo stays put).
          </Note>
        </div>
      </Example>

      <Example label="Top-bar class constants" hint="Exported so an app's own menus line up with the shared ones.">
        <ConstList
          items={[
            ["TOPBAR_TRIGGER_CLASS", TOPBAR_TRIGGER_CLASS],
            ["TOPBAR_MENU_ITEM_CLASS", TOPBAR_MENU_ITEM_CLASS],
          ]}
        />
        <div className="mt-3">
          <Note>
            Both paint in <code className="font-mono">var(--…)</code> tokens, so an app-owned trigger built from them
            follows the palette switch exactly as the kit&apos;s own do — the bell in the TopBar specimen above is one.
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
            [
              "to",
              <span className={PROSE}>
                Route path, the NavLink target — and the React key in both navs, so two items may not share one.
              </span>,
            ],
            ["label", <span className={PROSE}>Sidebar text, the tooltip when collapsed, and the flyout header.</span>],
            [
              "shortLabel?",
              <span className={PROSE}>
                Mobile bottom bar only. The bar divides the viewport into equal cells, so every entry added shrinks the
                room a label has. It shortens the label: a development build warns when it does not start with the
                label&apos;s first word (or an abbreviation of it).
              </span>,
            ],
            [
              "shortLabelFrom?",
              <span className={PROSE}>
                The text size from which the bar uses shortLabel — &quot;large&quot; keeps the full label at Normal.
                Default &quot;normal&quot;.
              </span>,
            ],
            [
              "shortLabelIsAlias?",
              <span className={PROSE}>
                shortLabel is another word for the page on purpose (&quot;Data&quot; for &quot;Import &amp;
                Export&quot;): no warning.
              </span>,
            ],
            [
              "mobilePriority?",
              <span className={PROSE}>
                Which entries sit in the phone bar when they do not all fit: lower first, then the list&apos;s order.
                The bar still shows them in the list&apos;s order.
              </span>,
            ],
            [
              "icon",
              <span className={PROSE}>
                A LucideIcon — the component itself (Wallet), never an element (&lt;Wallet /&gt;). AppShell renders it
                as &lt;item.icon /&gt; at size-4 in the sidebar and size-5 in the bar.
              </span>,
            ],
            [
              "end?",
              <span className={PROSE}>
                NavLink exact match. Defaults to TRUE, which is the opposite of react-router's own default: pass end:
                false for a section whose children are routes.
              </span>,
            ],
            [
              "dataTour?",
              <span className={PROSE}>
                data-tour on this item's link in BOTH navs, so a tour can spotlight one entry instead of matching by
                href.
              </span>,
            ],
            [
              "items?",
              <span className={PROSE}>
                AppShellSubItem[] (to/label/icon/end). Opens a portalled flyout beside the sidebar on hover or focus,
                collapsed or expanded. On the phone the bar&apos;s cell opens a sheet of these pages (its own page
                first, as &quot;Overview&quot;) instead of linking to `to`.
              </span>,
            ],
          ]}
        />
      </Example>

      <Example
        label="AppShell — every prop on a switch"
        hint="A second shell, nested in this page's — so embedded — with its own router. Below 768px it shows the phone bar, docked on the box."
      >
        <AppShellPlayground />
      </Example>

      <Example
        label="AppShell on the phone — eight entries"
        hint="Below 768px: four entries and More in the bar; Books opens a sheet of its pages"
      >
        <PhoneNavExample />
      </Example>

      <Example label="AppShell — the contracts" hint="The shell around this page, read live.">
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
            <Wallet className="size-5 shrink-0 text-brand" aria-hidden />
            {/* Wraps from Large up rather than reading "Acme Bo…" (text size §10.17). */}
            <span className="truncate-until-large font-semibold text-primary">Acme Books</span>
            <span className="hidden truncate text-xs text-muted sm:inline">/ Q3 2026</span>
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
                <span className="absolute end-1 top-1 min-w-4 rounded-full bg-brand px-1 text-micro font-semibold leading-4 text-brand-contrast">
                  {unread}
                </span>
              )}
            </button>
            <ThemeToggle
              mode={mode}
              onToggle={toggle}
              aria-label="Toggle theme"
              title={mode === "dark" ? "Dark" : "Light"}
            />
          </>
        }
      />
      <div className="space-y-2 px-4 py-3">
        <p className="text-xs text-secondary">
          The bell is app-owned markup wearing <code className="font-mono">TOPBAR_TRIGGER_CLASS</code>; the sun/moon is
          the kit's <code className="font-mono">ThemeToggle</code>. Same box, same hover, same rhythm.
        </p>
        <Note>
          <code className="font-mono">z-40</code> in the real thing, above sticky page content (
          <code className="font-mono">z-30</code>) but below modals and the tour (
          <code className="font-mono">z-50</code>/<code className="font-mono">z-60</code>). The bar is{" "}
          <code className="font-mono">h-12</code>, which is also what <code className="font-mono">AppShell</code>'s
          sidebar offsets itself by — change one and the sidebar hangs.
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
          aria-label="Toggle theme (specimen)"
          title={mode === "dark" ? "Dark" : "Light"}
        />
        <PaletteMenu
          palettes={PALETTES}
          activeId={paletteId}
          mode={mode}
          onSelect={setPaletteId}
          aria-label="Appearance preset (specimen)"
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
      <p className={READOUT_STRONG}>
        mode: {mode} · preference: {preference} · palette: {paletteId} ({activeName})
      </p>
      <Note>
        <code className="font-mono">mode</code> is the RESOLVED light/dark and{" "}
        <code className="font-mono">preference</code> is what the user chose — only the preference is persisted, and{" "}
        <code className="font-mono">mode</code> is derived again on every load. Read{" "}
        <code className="font-mono">mode</code> for anything that needs a concrete theme (token selection, the toaster);
        read <code className="font-mono">preference</code> only to show the choice back.
      </Note>
      <Note>
        <code className="font-mono">PaletteMenu</code> indexes each preset by <code className="font-mono">mode</code> to
        draw its swatches, so the menu's own colours change when you flip the theme.{" "}
        <code className="font-mono">PALETTES</code> is {PALETTES.length} presets, and passing it is a choice about which
        presets an app offers: a list of its own works the same.
      </Note>
    </div>
  );
}

function Languages() {
  // `current` is `string | undefined`, and an unmatched code is a real state: an app
  // restoring a locale it no longer ships lands here. Hence the reset button — the
  // menu itself can only ever produce a valid code.
  const [lang, setLang] = useState<string | undefined>("de");
  const [withHeading, setWithHeading] = useState(true);
  const [trigger, setTrigger] = useState<LanguageMenuTrigger>("flag+code");

  return (
    <div className="space-y-3">
      <Row>
        <LanguageMenu
          options={LANGUAGES}
          current={lang}
          onChange={setLang}
          trigger={trigger}
          heading={withHeading ? "Language" : undefined}
        />
        <Switch label="heading" checked={withHeading} onCheckedChange={setWithHeading} />
        <button type="button" className={MINI_BUTTON} onClick={() => setLang(undefined)}>
          Clear the selection
        </button>
        <span className={READOUT_STRONG}>current: {lang ?? "undefined"}</span>
      </Row>
      <Row>
        <ToggleGroup<LanguageMenuTrigger>
          aria-label="trigger"
          size="sm"
          value={trigger}
          onChange={setTrigger}
          options={[
            { value: "flag+code", label: "flag+code" },
            { value: "code", label: "code" },
            { value: "flag", label: "flag" },
          ]}
        />
      </Row>
      <Row>
        {SWISS_LANGUAGES.map((o) => (
          <LanguageMenu key={o.code} options={SWISS_LANGUAGES} current={o.code} onChange={() => {}} />
        ))}
        <span className={READOUT_STRONG}>de-CH · fr-CH · it-CH, closed</span>
      </Row>
      <Note>
        The flags are <code className="font-mono">flag-icons</code> spans (<code className="font-mono">fi fi-gb</code>),
        keyed off <code className="font-mono">country</code> — which is deliberately not the language code: English is{" "}
        <code className="font-mono">gb</code> and Portuguese here is <code className="font-mono">br</code>.{" "}
        <code className="font-mono">flag-icons</code> is a dependency of the package that nothing inside the package
        imports, so a consumer that never imports the stylesheet gets empty boxes and no error.
      </Note>
      <Note>
        The trigger shows the active flag and the language code in capitals (
        <code className="font-mono">trigger=&quot;flag+code&quot;</code>, the default;{" "}
        <code className="font-mono">&quot;code&quot;</code> or <code className="font-mono">&quot;flag&quot;</code>{" "}
        alone): the three Swiss languages share one flag, and only the code tells them apart without opening the menu.
        Its name is <code className="font-mono">topBar.languageCurrent</code>, &ldquo;Choose language, current:
        Deutsch&rdquo; in seven languages; an <code className="font-mono">aria-label</code> of the app&apos;s own names
        it as given.
      </Note>
      <Note>
        <code className="font-mono">heading</code> is the same small uppercase row{" "}
        <code className="font-mono">PaletteMenu</code>, <code className="font-mono">OptionSwitcherMenu</code> and{" "}
        <code className="font-mono">TopBarActionMenu</code> draw, so a row of top-bar menus reads alike. Like every
        top-bar menu this one is a <code className="font-mono">HoverMenu</code>: focus the flag and press ↓ or Enter to
        open it onto the first language, ↑/↓ to move, Escape to close back onto the flag.
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
          aria-label="Environment"
          title={`Environment: ${env}`}
          heading="Environment"
          options={ENVIRONMENTS}
          value={env}
          onSelect={setEnv}
        />
        <span className={READOUT_STRONG}>value: {env}</span>
      </Row>
      <Note>
        Generic in the option type, so <code className="font-mono">onSelect</code> hands back the union rather than{" "}
        <code className="font-mono">string</code> — a switch over it is exhaustive.{" "}
        <code className="font-mono">label</code> is a <code className="font-mono">ReactNode</code>, so a row can carry a
        badge or a muted subtitle; <code className="font-mono">value</code> must be a string, because it is also the
        list key.
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
        <span className={READOUT_STRONG}>value: {role}</span>
      </Row>
      <Note>
        A thin wrapper: the flask icon, and a default <code className="font-mono">title</code> of{" "}
        <code className="font-mono">Role: {role}</code> when none is passed. Typically a dev or UI-only affordance — the
        kit has no opinion about whether the server honours the switch, so nothing here should be mistaken for
        authorisation.
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
      trailing: <span className="text-micro text-muted">24h</span>,
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
          aria-label="Help and feedback"
          heading="Help"
          entries={entries}
          panelClassName="w-64"
        />
        <span className={READOUT_STRONG}>last chosen: {chosen}</span>
      </Row>
      <Note>
        The <code className="font-mono">link</code> row renders a react-router{" "}
        <code className="font-mono">&lt;Link&gt;</code>, so this component throws outside a Router — one is mounted
        above this page. Choosing it navigates the showcase to <code className="font-mono">/docs</code>, which has no
        route of its own here; that is the link working, not failing. Non-divider rows close the menu for you, so a
        handler that also closes it is a handler doing the component's job twice.
      </Note>
      <Note>
        Only one <code className="font-mono">HoverMenu</code> panel is open at a time across the whole document —
        opening this one shuts the palette or language menu above. That is module-level coordination inside the kit, not
        something a call site arranges.
      </Note>
    </div>
  );
}

function NavItemReference() {
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-subtle">
        {NAV_REFERENCE.map((item) => (
          <li key={item.to} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <item.icon className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="text-sm text-primary">{item.label}</span>
            <span className="font-mono text-caption text-muted">{item.to}</span>
            <span className="ms-auto flex flex-wrap items-center gap-2 text-caption text-secondary">
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
        <code className="font-mono">shortLabel</code>, and it truncates to one line whether or not one was supplied,
        because an ellipsis in one cell is a smaller problem than a bar whose cells are different heights. The sidebar,
        its collapsed tooltips and anything else built on this list keep the full{" "}
        <code className="font-mono">label</code>.
      </Note>
      <Note>
        Sub-items reach the desktop sidebar only. Hover or keyboard focus opens a flyout beside the item — portalled,
        because the sidebar is <code className="font-mono">overflow-hidden</code> and would otherwise clip it — with a
        140ms grace period so the cursor can travel onto the panel. The mobile bar drops them and links to{" "}
        <code className="font-mono">to</code>, so a parent route that renders nothing on its own is a dead end on a
        phone.
      </Note>
    </div>
  );
}

function AppShellNotes() {
  const [navHeight, setNavHeight] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Row>
        {/* The inline style, not getComputedStyle: the outermost AppShell publishes the
            variable with `style.setProperty` on `<html>` (and on its own root), so this
            reads exactly what it wrote —
            and jsdom does not resolve custom properties through computed style, so the
            mount test would see an empty string. Read on click rather than in an effect
            because AppShell is our PARENT: its effect runs after ours, so a mount-time
            read would be one frame early and permanently stale. */}
        <button
          type="button"
          className={MINI_BUTTON}
          onClick={() => setNavHeight(document.documentElement.style.getPropertyValue("--app-nav-h") || "unset")}
        >
          Read --app-nav-h
        </button>
        <span className={READOUT_STRONG}>{navHeight ?? "press to read"}</span>
      </Row>
      <Note>
        <code className="font-mono">--app-nav-h</code> is the mobile bar's MEASURED height, republished on resize and
        floored to a whole pixel, so anything that has to sit on the bar can write{" "}
        <code className="font-mono">bottom-[var(--app-nav-h,0px)]</code> once and be right at both widths. Above 768px
        the bar is <code className="font-mono">display:none</code>, which measures as zero — so read this on a wide
        window and expect <code className="font-mono">0px</code>, then narrow the window past 768px and read it again.
      </Note>
      <Note>
        The mobile bar is <code className="font-mono">fixed bottom-0</code>, which on a notched phone means the home
        indicator sits over it unless the document opts in with{" "}
        <code className="font-mono">&lt;meta name="viewport" content="…, viewport-fit=cover"&gt;</code>. This showcase's{" "}
        <code className="font-mono">index.html</code> carries it. Note that the tag only unlocks the{" "}
        <code className="font-mono">safe-area-inset-*</code> values: the bar itself does not currently pad by them, so
        until it does, an app also has to leave that room.
      </Note>
      <Note>
        The sidebar's collapsed state persists under <code className="font-mono">collapseStorageKey</code>, read through
        the kit's guarded storage helpers rather than <code className="font-mono">localStorage</code> directly — that
        read happens during render, and <code className="font-mono">localStorage</code> throws where site data is
        blocked, which would take the whole application down rather than lose a preference. The default key is a shared
        literal, so two apps on one origin in development want their own. An embedded (or nested) shell has no default
        key: it would otherwise overwrite the outer app&apos;s preference with its own.
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
    shortLabelIsAlias: true,
    icon: Upload,
    items: [
      { to: "/data/import", label: "Import", icon: Upload },
      { to: "/data/accounts", label: "Accounts", icon: Building2 },
    ],
  },
];

/** Eight entries — more than fit — for the phone bar's five cells. */
const PHONE_NAV: AppShellNavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    to: "/books",
    label: "Books",
    icon: BookOpen,
    items: [
      { to: "/books/ledger", label: "Ledger", icon: Wallet },
      { to: "/books/receipts", label: "Receipts", icon: Receipt },
      { to: "/books/invoices", label: "Invoices", icon: ArrowLeftRight },
    ],
  },
  { to: "/reports", label: "Reports", icon: PieChart },
  { to: "/banking", label: "Banking", icon: Landmark },
  { to: "/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/payees", label: "Payees", icon: Store },
  { to: "/rules", label: "Rules", icon: Tags },
  { to: "/data", label: "Import & Export", shortLabel: "Import", icon: Upload },
];

function PhoneNavExample() {
  const [rulesFirst, setRulesFirst] = useState(false);
  const nav = rulesFirst
    ? PHONE_NAV.map((item) => (item.to === "/rules" ? { ...item, mobilePriority: 1 } : item))
    : PHONE_NAV;
  return (
    <div className="space-y-3">
      <Switch
        label="mobilePriority: 1 on Rules"
        description="Rules takes a cell in the bar; the bar keeps the list's order"
        checked={rulesFirst}
        onCheckedChange={setRulesFirst}
      />
      <div className="h-[24rem] max-w-sm overflow-hidden rounded-md border border-subtle bg-page">
        <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
          <MemoryRouter initialEntries={["/books/ledger"]}>
            <AppShell
              nav={nav}
              embedded
              topBar={<div className="flex h-12 items-center px-3 text-sm font-semibold text-primary">Acme Books</div>}
            >
              <DemoShellPage />
            </AppShell>
          </MemoryRouter>
        </UNSAFE_LocationContext.Provider>
      </div>
      <Note>
        {code("mobileMaxItems")} (default 5 cells, More included; 4 at Extra large): eight entries are four and
        &ldquo;More&rdquo;, whose sheet lists the other four. {code("mobilePriority")} picks which entries keep a cell;
        without it the list&apos;s order does. Books has pages, so on the phone its cell opens a sheet of them —
        Overview, Ledger, Receipts, Invoices — instead of linking to /books, and while one of them is open the row above
        the bar lists them too. The bar is the phone layout&apos;s: narrow the window (or open the device preview) to
        see it.
      </Note>
    </div>
  );
}

/** The sidebar's bottom area as data (0.12): a version link with a hint, a link that
 *  leaves the app, and the legal links as one group — one icon when collapsed. */
const DEMO_FOOTER_ITEMS: AppShellSidebarFooterItem[] = [
  {
    key: "version",
    to: "/whats-new",
    icon: Sparkles,
    label: "What's new · v2.4.1",
    text: "Acme Books v2.4.1",
    hint: "What's new",
  },
  { key: "help", to: "https://example.com/help", icon: LifeBuoy, label: "Help centre", external: true },
  {
    kind: "links",
    key: "legal",
    icon: Scale,
    label: "Legal",
    links: [
      { to: "/legal/imprint", label: "Imprint" },
      { to: "/legal/privacy", label: "Privacy" },
      { to: "/legal/terms", label: "Terms" },
    ],
  },
];

/**
 * A second `AppShell`, in a box.
 *
 * Two things keep it from fighting the real one:
 *
 *  - Its own `MemoryRouter`, so clicking its nav moves IT and not the page. React
 *    Router refuses a router inside a router; resetting `LocationContext` to its
 *    outside-any-router value is the documented escape hatch for exactly this (a
 *    widget with its own history). Nothing inside reads the outer route.
 *  - Being INSIDE the real AppShell. A shell below another shell knows it is nested
 *    (the same as passing `embedded`): it fills its parent's box instead of the
 *    viewport, docks its phone bar on itself (`contain: layout` on its root), publishes
 *    `--app-nav-h` on its own root instead of `<html>`, and persists its collapse state
 *    only under a key it is given. Until 0.7.0 this card needed a `transform` on the
 *    frame and a hook that re-published the outer shell's nav height behind it.
 */
function AppShellPlayground() {
  const [subNav, setSubNav] = useState<"flyout" | "inline">("inline");
  const [mobileSubNav, setMobileSubNav] = useState(true);
  const [withFooter, setWithFooter] = useState(true);
  const [withSidebarFooter, setWithSidebarFooter] = useState(true);
  const [withFooterItems, setWithFooterItems] = useState(true);
  const [customLabels, setCustomLabels] = useState(false);
  const [embedded, setEmbedded] = useState(true);
  const [persist, setPersist] = useState(true);
  const [navVars, setNavVars] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-muted">subNav</span>
          <ToggleGroup<"flyout" | "inline">
            aria-label="subNav"
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
          label="sidebarFooterItems"
          description="A version link, an external link and the legal links, as data — collapse the sidebar to see them as icons"
          checked={withFooterItems}
          onCheckedChange={setWithFooterItems}
        />
        <Switch
          label="collapseLabel · expandLabel · toggleGroupLabel"
          description="Off: the provider's words (this page's language)"
          checked={customLabels}
          onCheckedChange={setCustomLabels}
        />
        <Switch
          label="embedded"
          description="Implied here — the box is inside the page's own AppShell, so off changes nothing"
          checked={embedded}
          onCheckedChange={setEmbedded}
        />
        <Switch
          label="collapseStorageKey"
          description="Off: an embedded shell does not persist its collapse state at all"
          checked={persist}
          onCheckedChange={setPersist}
        />
      </div>

      {/* A plain box with a height: no transform, no class overrides reaching into the
          shell. The nested shell fills it and docks its phone bar on it by itself. */}
      <div className="h-[26rem] overflow-hidden rounded-md border border-subtle bg-page">
        <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
          <MemoryRouter initialEntries={["/books/ledger"]}>
            <AppShell
              nav={DEMO_NAV}
              subNav={subNav}
              mobileSubNav={mobileSubNav}
              embedded={embedded}
              // A key of its own: the default is shared by every app on the origin. An
              // embedded shell without one keeps its collapse state for this mount only.
              collapseStorageKey={persist ? "uikit-showcase-demo-shell.collapsed" : undefined}
              collapseLabel={customLabels ? "Fold the sidebar" : undefined}
              expandLabel={customLabels ? "Unfold the sidebar" : undefined}
              toggleGroupLabel={customLabels ? (group) => `Pages of ${group}` : undefined}
              // The rest of the props land on the root <div> — an id, a landmark
              // label, a tour anchor. There is nothing above the shell to put them on.
              id="demo-shell"
              data-demo="app-shell"
              topBar={
                <TopBar
                  brand={
                    <>
                      <Wallet className="size-5 shrink-0 text-brand" aria-hidden />
                      <span className="truncate-until-large font-semibold text-primary">Acme Books</span>
                    </>
                  }
                />
              }
              footer={
                withFooter ? (
                  <footer className="border-t border-subtle px-4 py-2 text-xs text-muted">
                    footer — v2.4.1 · © Acme
                  </footer>
                ) : undefined
              }
              sidebarFooterItems={withFooterItems ? DEMO_FOOTER_ITEMS : undefined}
              sidebarFooter={
                withSidebarFooter
                  ? (collapsed) => (
                      <div className="border-t border-subtle px-3 py-2 text-caption text-muted">
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

      <Row>
        <button
          type="button"
          className={MINI_BUTTON}
          onClick={() => {
            const inner = document.getElementById("demo-shell")?.style.getPropertyValue("--app-nav-h");
            const outer = document.documentElement.style.getPropertyValue("--app-nav-h");
            setNavVars(`#demo-shell: ${inner || "unset"} · <html>: ${outer || "unset"}`);
          }}
        >
          Read --app-nav-h on both
        </button>
        <span className={READOUT_STRONG}>{navVars ?? "press to read"}</span>
      </Row>
      <Note>
        Narrow the window below 768px and read again: the box&apos;s own bar is measured onto{" "}
        <code className="font-mono">#demo-shell</code>, while <code className="font-mono">&lt;html&gt;</code> keeps the
        page shell&apos;s value — the page&apos;s bottom bar does not move when this box mounts, and nothing is left
        behind when it unmounts. Inside the box, <code className="font-mono">var(--app-nav-h)</code> resolves to the
        nearest shell&apos;s bar.
      </Note>
      <Note>
        Try: hover or expand <strong>Books</strong> (flyout vs inline), collapse the sidebar with the button at its foot
        (the state persists under <code className="font-mono">collapseStorageKey</code>), and open the screen-size
        preview from the top bar to see the phone bar with its page row. The collapsed sidebar always uses the flyout,
        whatever <code className="font-mono">subNav</code> says.
      </Note>
      <Note>
        <code className="font-mono">sidebarFooterItems</code> sits above{" "}
        <code className="font-mono">sidebarFooter</code>. Expanded, the version link shows its{" "}
        <code className="font-mono">text</code> with <code className="font-mono">hint</code> as a tooltip, and the legal
        links are a <code className="font-mono">&lt;nav aria-label=&quot;Legal&quot;&gt;</code> of small links;
        collapsed, each item is one icon named and tooltipped by its <code className="font-mono">label</code> (Legal
        goes to its first link). Internal links use the provider&apos;s <code className="font-mono">linkComponent</code>{" "}
        (else react-router&apos;s <code className="font-mono">Link</code>) — follow one and the route above changes; the
        help link is a plain new-tab <code className="font-mono">&lt;a&gt;</code>.
      </Note>
    </div>
  );
}

/** What the playground's `<main>` shows: where its own router is. */
function DemoShellPage() {
  const { pathname } = useLocation();
  return (
    <div className="space-y-2 p-4">
      <p className="text-sm text-primary">
        children — the current route is <code className="font-mono text-brand">{pathname}</code>
      </p>
      <p className="text-xs text-secondary">
        A real app renders its <code className="font-mono">&lt;Outlet /&gt;</code> here. The group holding this page
        stays marked in the sidebar while one of its pages is open.
      </p>
    </div>
  );
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
          aria-label="position"
          value={position}
          onChange={setPosition}
          options={[
            { value: "start", label: 'position="start"' },
            { value: "end", label: 'position="end"' },
          ]}
        />
        <ToggleGroup<"rail" | "disclosure">
          aria-label="variant"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "rail", label: 'variant="rail"' },
            { value: "disclosure", label: 'variant="disclosure"' },
          ]}
        />
        <label className="flex items-center gap-2 text-xs text-secondary">
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
        className="rounded-md border border-dashed border-subtle bg-page p-4 [&_aside]:block"
        contents={variant === "rail" ? contents : null}
      >
        {variant === "disclosure" && <div className="mb-3">{contents}</div>}
        <div ref={setBox} className="relative h-48 overflow-y-auto rounded border border-subtle px-3">
          {/* The reading line, drawn where the spy puts it. */}
          <div
            aria-hidden
            className="pointer-events-none sticky z-10 h-0 border-t border-dashed border-brand"
            style={{ top: `${line * 12}rem` }}
          />
          {CONTENTS_SAMPLE.map((item) => (
            <section key={item.id} className="py-3">
              <h4 id={item.id} className="text-sm font-medium text-primary">
                {item.label}
              </h4>
              <p className="mt-1 h-24 text-xs text-muted">
                Scroll this box: the entry whose heading last crossed the dashed line is marked.
              </p>
            </section>
          ))}
        </div>
      </PageContentsLayout>
      <p className="mt-3 font-mono text-xs text-secondary">
        useScrollSpy(ids, {"{"} root: box, line: {line.toFixed(2)} {"}"}) → {JSON.stringify(activeId)}
      </p>
      <p className="mt-2 text-xs text-secondary">
        Below <code className="font-mono">xl</code> the page&apos;s rail has no room; the same entries go in{" "}
        <code className="font-mono">{'<PageContents variant="disclosure">'}</code> under the title, as on this page at a
        narrower window. <code className="font-mono">labels.title</code> overrides the provider&apos;s{" "}
        <code className="font-mono">pageContents.title</code> for one instance.
      </p>
    </Example>
  );
}

/* ── since 0.13 ─────────────────────────────────────────────────────────── */

/**
 * A header link that can close the account menu,
 * and a support composer that canned-reply chips can write into, with a hint of
 * the caller's own.
 */

/** The admin role chip in the account header links to the admin area. */
export function AccountHeaderLinkDemo() {
  const [log, setLog] = useState("—");
  return (
    <Example
      label="TopBarActionMenu — a link in the header that closes the menu"
      hint="header.extra takes (close) => ReactNode, like footer"
    >
      <div className="flex justify-end rounded-md border border-subtle bg-surface-2 p-2">
        <TopBarActionMenu
          aria-label="Account menu"
          triggerClassName="rounded-full"
          trigger={() => <UserAvatar name="Marcel Eifert" email="marcel@example.com" />}
          header={{
            title: "Marcel Eifert",
            subtitle: "marcel@example.com",
            extra: (close) => (
              <Chip
                size="xs"
                tone="info"
                href="/shell"
                renderLink={({ href, children, ...p }) => (
                  <a {...p} href={`#${href}`}>
                    {children}
                  </a>
                )}
                onClick={(event) => {
                  event.preventDefault();
                  setLog("admin chip → menu closed");
                  close();
                }}
              >
                Admin
              </Chip>
            ),
          }}
          entries={[{ key: "logout", label: "Log out", tone: "danger", onSelect: () => setLog("log out") }]}
          panelClassName="w-64"
        />
      </div>
      <Row className="mt-2">
        <span className={READOUT}>{log}</span>
      </Row>
      <Note>
        A router link does not unmount the menu, so a header link that is handed nothing leaves the panel open over the
        page it navigated to. The plain {code("ReactNode")} form still works for a chip that is only a label.
      </Note>
    </Example>
  );
}
