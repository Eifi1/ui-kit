import { useMemo, useState } from "react";
import type { ContextType, ReactNode } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation, useNavigate } from "react-router";
import {
  Activity,
  BarChart3,
  Bell,
  CreditCard,
  Database,
  Palette,
  ShieldCheck,
  Upload,
  User,
  Users,
} from "lucide-react";
import {
  Button,
  List,
  ListItem,
  PasskeysSetting,
  PasswordSetting,
  ProfileSetting,
  Switch,
  ToggleGroup,
  TwoFactorSetting,
} from "@eifi1/ui-kit";
import type { PasskeyItem } from "@eifi1/ui-kit";
import { LanguageSetting, ThemeSetting } from "../../../src/components/settings-fields";
import type { ThemePreference } from "../../../src/theme/theme-store";
import { EmailChangeSetting } from "../../../src/account/email-change-setting";
import { SessionsSetting } from "../../../src/account/sessions-setting";
import type { SessionItem } from "../../../src/account/sessions-setting";
import { DataExportSetting } from "../../../src/account/data-export-setting";
import { DeleteAccountSetting } from "../../../src/account/delete-account-setting";
import { SettingsLayout } from "../../../src/settings/settings-layout";
import { SettingsSection } from "../../../src/settings/settings-section";
import { settingsSearchEntries } from "../../../src/settings/settings-catalogue";
import type { SettingsEntry, SettingsGroup } from "../../../src/settings/settings-catalogue";
import { DEFAULT_SETTINGS_LABELS } from "../../../src/settings/settings-labels";
import { useAccountLanguage } from "../../../src/settings/use-account-language";
import { Example, Note, OutTable } from "../lib/section";

/**
 * THE SETTINGS PAGE (0.31, docs/settings-harmonization.md §3–§5): one settings page for
 * every app — the sidebar on a desktop, the drill-down list on a phone, the catalogue's
 * search, `?focus=` and the legacy hash — built here for a made-up app, "Ada's Garden
 * Planner", out of the kit's real setting cards. Nothing sends a request: a pretend server
 * answers, with synthetic people only. Each frame has its own router, so its links move
 * the frame and not this page.
 *
 * On the App chrome group's "Settings" page (`settings`), above the setting rows it lays
 * out. Components: SettingsLayout, SettingsSection, useSettingsRoute, useSettingsFocus,
 * useSettingsLayout, SettingsHeadingLevel, settingsSearchEntries, useAccountLanguage,
 * ThemeSetting.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));
const PASSWORD = "correct horse";

/** `null` is what a `LocationContext` holds outside any router — the escape hatch the
 *  shell demo uses for a widget with its own history inside the showcase's router. */
const NO_ROUTER = null as unknown as ContextType<typeof UNSAFE_LocationContext>;

/* ── The catalogue ──────────────────────────────────────────────────────── */

type Group = "appearance" | "account" | "security" | "notifications" | "data";

const CORE = DEFAULT_SETTINGS_LABELS.groups;

/** The core groups, in the kit's order, with the kit's words. Notifications has no card
 *  in this app, so the rule of §4.1 hides it — no row, no hits, its path acts as unknown. */
const GROUPS: SettingsGroup<Group>[] = [
  { id: "appearance", icon: <Palette />, ...CORE.appearance },
  { id: "account", icon: <User />, ...CORE.account },
  { id: "security", icon: <ShieldCheck />, ...CORE.security },
  { id: "notifications", icon: <Bell />, ...CORE.notifications },
  { id: "data", icon: <Database />, ...CORE.data },
];

/** One entry per setting; the look card holds two. `demo: true` marks what a demo
 *  session is refused (§4.1). */
const ENTRIES: (SettingsEntry<Group> & { demo?: boolean })[] = [
  { id: "theme", group: "appearance", anchor: "look-card", title: "Theme", keywords: "dark light night colour scheme" },
  { id: "language", group: "appearance", anchor: "look-card", title: "Language", keywords: "locale translation" },
  { id: "profile", group: "account", anchor: "profile-card", title: "Profile", keywords: "name first last" },
  { id: "email", group: "account", anchor: "email-card", title: "Email address", keywords: "mail address change", demo: true },
  { id: "password", group: "security", anchor: "password-card", title: "Password", keywords: "passphrase", demo: true },
  { id: "twofactor", group: "security", anchor: "twofactor-card", title: "Two-factor authentication", keywords: "2fa totp authenticator code", demo: true },
  { id: "passkeys", group: "security", anchor: "passkeys-card", title: "Passkeys", keywords: "fingerprint face webauthn", demo: true },
  { id: "sessions", group: "security", anchor: "sessions-card", title: "Signed-in devices", keywords: "sessions sign out everywhere", demo: true },
  { id: "export", group: "data", anchor: "export-card", title: "Export your data", keywords: "download json copy", demo: true },
  { id: "delete", group: "data", anchor: "delete-card", title: "Delete account", keywords: "close remove erase", demo: true },
];

const OFFERED = [
  { code: "en", label: "English" },
  { code: "de-CH", label: "Deutsch (Schweiz)" },
  { code: "fr", label: "Français" },
];

/* ── The frame: a router of its own, and its address ────────────────────── */

function AddressBar({ links }: { links: [label: string, to: string][] }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2 text-xs">
      <Button size="sm" variant="ghost" onClick={() => void navigate(-1)}>
        ‹ Back
      </Button>
      <code className="min-w-0 flex-1 truncate font-mono text-[var(--text-secondary)]" data-private>
        {location.pathname}
        {location.search}
        {location.hash}
      </code>
      {links.map(([label, to]) => (
        <Button key={to} size="sm" variant="secondary" onClick={() => void navigate(to)}>
          {label}
        </Button>
      ))}
    </div>
  );
}

function Frame({
  initial,
  links,
  className,
  children,
}: {
  initial: string;
  links: [string, string][];
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-page)] ${className ?? ""}`}>
      <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
        {/* `/elsewhere` behind the page, so back past settings is visible. */}
        <MemoryRouter initialEntries={["/elsewhere", initial]} initialIndex={1}>
          <AddressBar links={links} />
          <div className="h-[40rem] overflow-y-auto">{children}</div>
        </MemoryRouter>
      </UNSAFE_LocationContext.Provider>
    </div>
  );
}

/* ── The garden planner's settings ──────────────────────────────────────── */

/** What the pretend server holds, kept above the frames so a card's state survives its
 *  group being switched away from. */
function useGardenAccount() {
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [deviceLang, setDeviceLang] = useState<string | null>(null);
  const [accountLang, setAccountLang] = useState<string | null>("de-CH");
  const [names, setNames] = useState<{ first: string; last: string | null }>({ first: "Ada", last: "Example" });
  const [twoFactor, setTwoFactor] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyItem<string>[]>([
    { id: "pk1", name: "Garden shed laptop", createdAt: "2026-09-12", lastUsedAt: "2026-10-06" },
  ]);
  const [sessions, setSessions] = useState<SessionItem<string>[]>([
    { id: "s1", device: "Firefox on Linux", ip: "192.0.2.10", lastActiveAt: new Date().toISOString(), current: true },
    { id: "s2", device: "Safari on iPhone", ip: "198.51.100.7", lastActiveAt: "2026-10-04T08:00:00Z" },
  ]);
  return {
    theme, setTheme,
    deviceLang, setDeviceLang,
    accountLang, setAccountLang,
    names, setNames,
    twoFactor, setTwoFactor,
    passkeys, setPasskeys,
    sessions, setSessions,
  };
}

type GardenAccount = ReturnType<typeof useGardenAccount>;

/** Appearance: the theme (this device) and the language (the account's, §6.2). */
function LookCard({ account, demo }: { account: GardenAccount; demo: boolean }) {
  const language = useAccountLanguage({
    account: account.accountLang,
    device: account.deviceLang,
    setDevice: account.setDeviceLang,
    save: async (lang) => {
      await beat(300);
      account.setAccountLang(lang);
    },
    isDemo: demo,
    offered: OFFERED.map((o) => o.code),
    fallback: "en",
  });
  return (
    <SettingsSection
      anchor="look-card"
      title="Look and language"
      description="The theme stays on this device; the language follows your account."
    >
      <ThemeSetting
        variant="toggle"
        label="Theme"
        labelPlacement="above"
        value={account.theme}
        onChange={account.setTheme}
        optionLabels={{ system: "System", light: "Light", dark: "Dark" }}
      />
      <LanguageSetting
        label="Language"
        value={language.language}
        onChange={(lang) => void language.pick(lang)}
        options={OFFERED}
      />
      <p className="text-xs text-[var(--text-muted)]">
        From the {language.source} · device {code(account.deviceLang ?? "—")} · account{" "}
        {code(account.accountLang ?? "—")}
        {demo && " · a demo never writes the account"}
      </p>
    </SettingsSection>
  );
}

function GardenGroup({ group, account, demo }: { group: Group; account: GardenAccount; demo: boolean }) {
  switch (group) {
    case "appearance":
      return <LookCard account={account} demo={demo} />;
    case "account":
      return (
        <>
          <ProfileSetting
            id="profile-card"
            email="ada@example.com"
            memberSince="12 Sep 2026"
            firstName={account.names.first}
            lastName={account.names.last}
            onSave={async (values) => {
              await beat();
              account.setNames({ first: values.firstName, last: values.lastName });
            }}
          />
          {!demo && (
            <EmailChangeSetting
              id="email-card"
              currentEmail="ada@example.com"
              onRequest={async ({ password }) => {
                await beat();
                if (password !== PASSWORD) throw new Error("password_incorrect");
              }}
            />
          )}
        </>
      );
    case "security":
      return (
        <>
          <PasswordSetting id="password-card" onSubmit={() => beat()} />
          <TwoFactorSetting
            id="twofactor-card"
            enabled={account.twoFactor}
            setup={null}
            onStartSetup={() => account.setTwoFactor(true)}
            onEnable={() => account.setTwoFactor(true)}
            onDisable={() => account.setTwoFactor(false)}
          />
          <PasskeysSetting
            id="passkeys-card"
            passkeys={account.passkeys}
            onAdd={async (name) => {
              await beat(900);
              account.setPasskeys((rows) => [
                ...rows,
                { id: `pk${rows.length + 1}`, name: name || "New passkey", createdAt: new Date().toISOString() },
              ]);
            }}
            onDelete={async (id) => {
              await beat();
              account.setPasskeys((rows) => rows.filter((row) => row.id !== id));
            }}
          />
          <SessionsSetting
            id="sessions-card"
            sessions={account.sessions}
            onRevoke={async (id) => {
              await beat();
              account.setSessions((rows) => rows.filter((row) => row.id !== id));
            }}
            onSignOutEverywhere={() => beat()}
          />
        </>
      );
    case "data":
      return (
        <>
          <DataExportSetting
            id="export-card"
            onExport={async () => {
              await beat();
              return new Blob([JSON.stringify({ format: "eifi1-account-export", app: "garden-planner" }, null, 2)], {
                type: "application/json",
              });
            }}
          />
          <DeleteAccountSetting
            id="delete-card"
            email="ada@example.com"
            mode="after_days"
            consequences={["Your 3 garden beds and their planting plans are deleted."]}
            onRequest={async ({ password }) => {
              await beat();
              if (password !== PASSWORD) throw new Error("password_incorrect");
            }}
          />
        </>
      );
    case "notifications":
      return null;
  }
}

const SETTINGS_LINKS: [string, string][] = [
  ["Legacy link", "/settings?tour=garden&tourStep=2#security"],
  ["Mail link", "/settings/security?focus=passkeys-card&tour=garden"],
  ["Unknown group", "/settings/compost"],
];

function GardenSettings({ layout, demo, account }: { layout: "desktop" | "phone"; demo: boolean; account: GardenAccount }) {
  const entries = useMemo(() => ENTRIES.map((e) => (demo && e.demo ? { ...e, visible: false } : e)), [demo]);
  return (
    <SettingsLayout<Group>
      layout={layout}
      groups={GROUPS}
      entries={entries}
      basePath="/settings"
      renderGroup={(group) => <GardenGroup group={group} account={account} demo={demo} />}
      phoneFooter={<ListItem href="/admin" title="Administration" subtitle="Leaves settings" leading={<Users className="size-4 text-[var(--text-muted)]" aria-hidden />} />}
    />
  );
}

export function SettingsDesktop031Demo() {
  const account = useGardenAccount();
  const [demo, setDemo] = useState(false);
  return (
    <Example
      label="SettingsLayout — desktop"
      hint="groups / entries / basePath / renderGroup; the sidebar is the kit's vertical Tabs"
    >
      <Switch
        label="A demo session"
        description="Every card a demo is refused is marked visible: false; security and data are left empty and disappear"
        checked={demo}
        onCheckedChange={setDemo}
      />
      <Frame initial="/settings" links={SETTINGS_LINKS} className="mt-3">
        <GardenSettings layout="desktop" demo={demo} account={account} />
      </Frame>
      <Note>
        {code("/settings")} is replaced by the first group. Switching groups in the sidebar REPLACES, so back leaves
        settings. Ten entries are over the threshold of eight, so the search shows: try “dark”, “2fa” or “sécurité”
        — accents fold, and a group&rsquo;s name finds its settings. “Legacy link” is keksdose&rsquo;s old
        {code("#security")} URL, converted with the whole query while the page stays mounted. “Mail link” rings the
        passkeys card, focuses its heading and removes only {code("focus")}.
      </Note>
    </Example>
  );
}

export function SettingsPhone031Demo() {
  const account = useGardenAccount();
  return (
    <Example label="SettingsLayout — phone" hint={`layout="phone" pins it here; "auto" follows PHONE_QUERY`}>
      <Frame initial="/settings" links={SETTINGS_LINKS.slice(1)} className="mx-auto max-w-[390px]">
        <GardenSettings layout="phone" demo={false} account={account} />
      </Frame>
      <Note>
        The list of groups, then a page per group. Opening a group PUSHES and marks the list as the entry before it,
        so “‹ Settings” is a real back; after a deep link (“Mail link”) it replaces with the list instead of leaving
        the app. The cards&rsquo; titles are {code("h2")} under the group&rsquo;s {code("h1")} here, {code("h3")} on a
        desktop. The “Administration” row is {code("phoneFooter")}: it leaves settings and is never a group.
      </Note>
    </Example>
  );
}

/* ── The admin page, same shell (§5) ────────────────────────────────────── */

type Section = "metrics" | "users" | "activity" | "billing";

const PEOPLE = [
  { name: "Ada Example", email: "ada@example.com", role: "Owner" },
  { name: "Grace Example", email: "grace@example.com", role: "Gardener" },
  { name: "Alan Example", email: "alan@example.com", role: "Gardener" },
];

export function SettingsAdmin031Demo() {
  const [billing, setBilling] = useState(false);
  const [layout, setLayout] = useState<"desktop" | "phone">("desktop");
  const groups: SettingsGroup<Section>[] = [
    { id: "metrics", icon: <BarChart3 />, title: "Metrics", help: "How the garden planner is used." },
    { id: "users", icon: <Users />, title: "Users", help: "Who can sign in, and as what." },
    { id: "activity", icon: <Activity />, title: "Activity", help: "What admins changed, and when." },
    { id: "billing", icon: <CreditCard />, title: "Billing", help: "The plan and its invoices.", visible: billing },
  ];
  const entries: SettingsEntry<Section>[] = [
    { id: "metrics", group: "metrics", anchor: "metrics-card", title: "Metrics" },
    { id: "users", group: "users", anchor: "users-card", title: "Users" },
    { id: "activity", group: "activity", anchor: "activity-card", title: "Activity" },
    { id: "billing", group: "billing", anchor: "billing-card", title: "Billing" },
  ];
  return (
    <Example
      label="SettingsLayout — the admin page"
      hint={`basePath="/admin" · width="7xl" · search={false} · aliases · titleVisible={false}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <ToggleGroup<"desktop" | "phone">
          aria-label="Layout"
          value={layout}
          onChange={setLayout}
          options={[
            { value: "desktop", label: "Desktop" },
            { value: "phone", label: "Phone" },
          ]}
        />
        <Switch label="billing_enabled" checked={billing} onCheckedChange={setBilling} />
      </div>
      <Frame
        key={layout}
        initial="/admin"
        links={[
          ["Retired id", "/admin/overview"],
          ["Hidden section", "/admin/billing"],
          ["Legacy hash", "/admin#activity"],
        ]}
        className={layout === "phone" ? "mx-auto mt-3 max-w-[390px]" : "mt-3"}
      >
        <SettingsLayout<Section>
          layout={layout}
          title="Administration"
          labels={{ back: "Back to administration", sections: "Administration sections" }}
          groups={groups}
          entries={entries}
          basePath="/admin"
          width="7xl"
          search={false}
          aliases={{ overview: "metrics" }}
          phoneFooter={<ListItem href="/import" title="Import" leading={<Upload className="size-4 text-[var(--text-muted)]" aria-hidden />} />}
          renderGroup={(section) => {
            switch (section) {
              case "metrics":
                return (
                  <SettingsSection anchor="metrics-card" title="Metrics" titleVisible={false}>
                    <p className="text-sm">3 gardeners · 14 beds · 212 plantings this season.</p>
                  </SettingsSection>
                );
              case "users":
                return (
                  <SettingsSection anchor="users-card" title="Users" titleVisible={false}>
                    <List separator="divider">
                      {PEOPLE.map((p) => (
                        <ListItem key={p.email} title={p.name} subtitle={p.email} trailing={p.role} />
                      ))}
                    </List>
                  </SettingsSection>
                );
              case "activity":
                return (
                  <SettingsSection anchor="activity-card" title="Activity" titleVisible={false}>
                    <p className="text-sm">Ada Example made Grace Example a gardener · 2 days ago</p>
                  </SettingsSection>
                );
              case "billing":
                return (
                  <SettingsSection anchor="billing-card" title="Billing" titleVisible={false}>
                    <p className="text-sm">The allotment plan, renewed each spring.</p>
                  </SettingsSection>
                );
            }
          }}
        />
      </Frame>
      <Note>
        The same layout at {code("/admin/<section>")}: a section alone with a card named after it keeps that title for
        screen readers only. “Retired id” goes through {code("aliases")}; billing is hidden until{" "}
        {code("billing_enabled")}, so its path acts as unknown. The import page is a {code("phoneFooter")} row, not a
        catalogue entry.
      </Note>
    </Example>
  );
}

/* ── ⌘K ─────────────────────────────────────────────────────────────────── */

export function SettingsSearchEntries031Demo() {
  const entries = settingsSearchEntries(GROUPS, ENTRIES, { basePath: "/settings" });
  const pick = (id: string) => entries.find((e) => e.id === id)!;
  return (
    <Example label="settingsSearchEntries — the catalogue for ⌘K" hint="the GlobalSearch entries, from the same catalogue">
      <OutTable
        rows={[
          ["entries.length", String(entries.length)],
          ["pick(\"settings:passkeys\").href", pick("settings:passkeys").href ?? ""],
          ["pick(\"settings:passkeys\").group", pick("settings:passkeys").group ?? ""],
          ["pick(\"settings:theme\").keywords", (pick("settings:theme").keywords ?? []).join(", ")],
        ]}
      />
    </Example>
  );
}
