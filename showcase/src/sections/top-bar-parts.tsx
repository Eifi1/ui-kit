import { useId, useState } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation } from "react-router";
import { LogOut, MessageSquare, Search, Settings, Sprout } from "lucide-react";
import {
  AccountMenuLanguage,
  AccountMenuTextSize,
  Button,
  DevMenu,
  Input,
  LanguageMenu,
  MenuItem,
  Modal,
  SyncStatusIndicator,
  ThemeToggle,
  ToggleGroup,
  TopBar,
  TopBarActionMenu,
  TopBarActions,
  TourMenu,
  UserAvatar,
  TOPBAR_TRIGGER_CLASS,
} from "@eifi1/ui-kit";
import type {
  AccountMenuLanguageOption,
  DevMenuSection,
  SyncStatus,
  TextSize,
  ThemeMode,
  TourMenuTour,
} from "@eifi1/ui-kit";
import { Example, Note, NO_ROUTER, READOUT, Row, code } from "../lib/section";

/**
 * THE TOP BAR'S SHARED PARTS (0.42, docs/top-bar-harmonization.md §3.1), for a made-up
 * app, "Ada's Garden Planner": the slots in the one order, the language inside the account
 * menu, the tours compass, the sync status and the local-dev menu. Nothing is sent.
 * Each bar has its own router, so its links move the frame and not this page.
 */

function Frame({ initial = "/beds", children }: { initial?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-subtle bg-page">
      <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
      </UNSAFE_LocationContext.Provider>
    </div>
  );
}

function Where() {
  const { pathname } = useLocation();
  return <p className={`px-3 py-2 ${READOUT}`}>frame at {pathname}</p>;
}

/** The app draws its own flags: flag-icons here. */
const flag = (country: string) => (
  <span aria-hidden className={`fi fi-${country} inline-block h-[0.9375rem] w-5 shrink-0 rounded-sm`} />
);

const LANGUAGES: AccountMenuLanguageOption[] = [
  { code: "de-CH", label: "Deutsch", flag: flag("ch") },
  { code: "en", label: "English", flag: flag("gb") },
  { code: "fr", label: "Français", flag: flag("fr") },
  { code: "it", label: "Italiano", flag: flag("it") },
];

const COUNTRY: Record<string, string> = { "de-CH": "ch", en: "gb", fr: "fr", it: "it" };

const TOURS: TourMenuTour[] = [
  { id: "beds", title: "Plan your beds", route: "/beds", completed: true },
  { id: "rotation", title: "Crop rotation", route: "/beds/rotation" },
  { id: "harvest", title: "Harvest log", route: "/harvest", isNew: true, since: "2026-10-01" },
  { id: "seeds", title: "Seed stock", route: "/seeds", isNew: true, since: "2026-09-12" },
];

const SYNC_STATES: Record<string, SyncStatus> = {
  synced: { phase: "idle", online: true, pending: 0, lastSyncedAt: Date.UTC(2026, 9, 17, 12, 5) },
  pending: { phase: "idle", online: true, pending: 3 },
  syncing: { phase: "syncing", online: true, pending: 3 },
  offline: { phase: "offline", online: false, pending: 2 },
  error: { phase: "error", online: true, pending: 0 },
  waitingForPlan: { phase: "idle", online: true, pending: 0, waitingForPlan: 2 },
  blocked: { phase: "idle", online: true, pending: 0, blocked: 1 },
};

const ROLES = ["ADMIN", "MEMBER", "REVIEWER"] as const;
const PLANS = ["free", "pro", "unlimited"] as const;

/* ── The whole bar ─────────────────────────────────────────────────────── */

function Bar({ signedIn }: { signedIn: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [lang, setLang] = useState("en");
  // The demo's own size, so a step here does not resize the showcase around it.
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [role, setRole] = useState<(typeof ROLES)[number]>("ADMIN");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("free");
  const [log, setLog] = useState("—");
  const icon = (label: string, glyph: ReactNode) => (
    <button type="button" aria-label={label} className={TOPBAR_TRIGGER_CLASS} onClick={() => setLog(label)}>
      {glyph}
    </button>
  );
  return (
    <>
      <TopBar
        className="static"
        aria-label="Ada's Garden Planner"
        brand={
          <>
            <Sprout aria-hidden className="size-5 shrink-0 text-brand" />
            <span className="truncate font-semibold text-primary">Garden</span>
          </>
        }
        actions={
          <TopBarActions
            search={icon("Search", <Search className="size-5" />)}
            theme={<ThemeToggle mode={theme} onChange={setTheme} />}
            feedback={signedIn ? icon("Send feedback", <MessageSquare className="size-5" />) : undefined}
            tours={<TourMenu tours={TOURS} href="/tours" onLaunch={(id) => setLog(`launch → ${id}`)} />}
            sync={signedIn ? <SyncStatusIndicator status={SYNC_STATES.pending} onSync={() => setLog("sync now")} /> : null}
            dev={
              signedIn ? (
                <DevMenu
                  enabled
                  roles={ROLES}
                  currentRole={role}
                  onRole={setRole}
                  plans={PLANS}
                  currentPlan={plan}
                  onPlan={setPlan}
                  billingOff
                  storageKey="showcase:dev-original-role"
                />
              ) : null
            }
            account={
              signedIn ? (
                <TopBarActionMenu
                  aria-label="Ada Lovelace, account menu"
                  trigger={() => <UserAvatar name="Ada Lovelace" size="sm" />}
                  triggerClassName="rounded-full"
                  header={{ title: "Ada Lovelace", subtitle: "ada@example.org" }}
                  entries={[]}
                >
                  {(close) => (
                    <>
                      <AccountMenuLanguage languages={LANGUAGES} value={lang} onPick={setLang} close={close} />
                      <AccountMenuTextSize value={textSize} onPick={setTextSize} />
                      <li>
                        <MenuItem icon={Settings} onClick={close}>
                          Settings
                        </MenuItem>
                      </li>
                      <li className="my-1 border-t border-subtle" />
                      <li>
                        <MenuItem icon={LogOut} tone="danger" onClick={close}>
                          Log out
                        </MenuItem>
                      </li>
                    </>
                  )}
                </TopBarActionMenu>
              ) : undefined
            }
            language={
              <LanguageMenu
                options={LANGUAGES.map((l) => ({ code: l.code, label: String(l.label), country: COUNTRY[l.code] }))}
                current={lang}
                onChange={setLang}
              />
            }
            signIn={
              <Button size="sm" variant="secondary" onClick={() => setLog("sign in")}>
                Sign in
              </Button>
            }
          />
        }
      />
      <p className={`px-3 py-2 ${READOUT}`}>
        theme {theme} · language {lang} · text size {textSize} · role {role} · plan {plan} · last: {log}
      </p>
    </>
  );
}

export function TopBar042Demo() {
  const [signedIn, setSignedIn] = useState(true);
  return (
    <>
      <Example
        label="TopBarActions — the one order"
        hint="Search · Theme · Feedback · Tours · Sync · dev · account; signed out, Language · Sign in"
      >
        <div className="flex flex-col gap-3">
          <ToggleGroup
            aria-label="Session"
            value={signedIn ? "in" : "out"}
            onChange={(v) => setSignedIn(v === "in")}
            options={[
              { value: "in", label: "Signed in" },
              { value: "out", label: "Signed out" },
            ]}
          />
          <Frame>
            <Bar key={String(signedIn)} signedIn={signedIn} />
          </Frame>
          <Note>
            The slots are named, so the order cannot drift between apps (§2.1). A slot left
            empty draws nothing, so it leaves no gap. Without {code("account")} the bar
            draws {code("language")} and {code("signIn")} where the account menu would be
            (§6.6). Signed in, the language is the first row of the account menu, and
            {" "}{code("AccountMenuTextSize")}'s A− / A+ beside it step the text size without
            closing the menu (here the demo's own, an app passes its
            {" "}{code("pickTextSize")}).
            {" "}{code("ThemeToggle")}'s {code("onChange")} hands over the opposite of the
            mode on screen, for the app to store as its preference.
          </Note>
        </div>
      </Example>
      <DevTools />
      <SyncStates />
      <Tours />
    </>
  );
}

/* ── The dev menu ──────────────────────────────────────────────────────── */

const GARDEN_ROLES = ["Owner", "Editor", "Guest", "Viewer"] as const;
const TODAY_PRESETS: readonly string[] = ["Real today", "Last day of this month", "First of next month", "+1 month"];

function DevTools() {
  const [role, setRole] = useState<(typeof ROLES)[number]>("ADMIN");
  const [plan, setPlan] = useState<(typeof PLANS)[number]>("pro");
  const [gardenRole, setGardenRole] = useState<string>("Owner");
  // A preset's name, or the custom day the dialog picked.
  const [today, setToday] = useState("Real today");
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("2026-12-24");
  const [log, setLog] = useState("—");
  const titleId = useId();
  const custom = !TODAY_PRESETS.includes(today);
  // In an app these definitions live in a module only a dev build imports.
  const sections: DevMenuSection[] = [
    {
      key: "garden",
      title: "Garden",
      entries: GARDEN_ROLES.map((r) => ({
        key: r,
        label: r,
        checked: r === gardenRole,
        onSelect: () => setGardenRole(r),
      })),
    },
    {
      key: "time",
      title: "Time",
      entries: [
        ...TODAY_PRESETS.map((t) => ({ key: t, label: t, checked: t === today, onSelect: () => setToday(t) })),
        // A free day is a row that opens the app's own dialog: a menu holds no fields.
        { key: "custom", label: custom ? `Custom… (${today})` : "Custom…", checked: custom, onSelect: () => setPicking(true) },
      ],
    },
    {
      key: "resets",
      title: "Resets",
      entries: [
        { key: "tours", label: "Reset guided tours", onSelect: () => setLog("reset → tours") },
        { key: "hints", label: "Show dismissed hints again", onSelect: () => setLog("reset → hints") },
        { key: "beds", label: "Seed sample beds", onSelect: () => setLog("reset → sample beds") },
      ],
    },
  ];
  return (
    <Example
      label="DevMenu — one flask: the Account section, then the app's"
      hint="role · plan · Garden · Time · Resets; a dot while the day is not today"
    >
      <div className="flex flex-col gap-3">
        <Frame>
          <div className="flex items-center justify-end gap-2 p-2">
            <DevMenu
              enabled
              roles={ROLES}
              currentRole={role}
              onRole={setRole}
              plans={PLANS}
              currentPlan={plan}
              onPlan={setPlan}
              billingOff
              storageKey="showcase:dev-menu-original-role"
              sections={sections}
              active={today !== "Real today"}
            />
          </div>
        </Frame>
        <p className={READOUT}>
          role {role} · plan {plan} · garden {gardenRole} · today {today} · last: {log}
        </p>
        <Modal open={picking} labelledBy={titleId} className="space-y-3" onClose={() => setPicking(false)}>
          <h4 id={titleId} className="text-sm font-semibold text-primary">
            Pretend today is
          </h4>
          <Input label="Day" type="date" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Row className="justify-end">
            <Button variant="secondary" onClick={() => setPicking(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={!draft}
              onClick={() => {
                setToday(draft);
                setPicking(false);
              }}
            >
              Use this day
            </Button>
          </Row>
        </Modal>
        <Note>
          One flask. First the kit's Account section: the role, with "Back to …" once it
          differs from the session's first, and the plan, which says so while billing is off
          ({code("billingOff")}). Then the app's {code("sections")}, each a group under its
          title, in the order given. Their rows are the menu's own: a choice is radio rows, a
          toggle a {code('checkable: "checkbox"')} row, an action a plain row. A free day is
          the "Custom…" row, which opens the app's dialog — a menu holds no fields. Pick a day
          other than "Real today" and {code("active")} puts a dot on the flask; its words,
          "Overrides on", join the trigger's name. The panel scrolls when its rows outgrow
          the screen. In an app it renders only in a dev build whose server answers the dev
          route, and the sections are defined in a module only a dev build imports.
        </Note>
      </div>
    </Example>
  );
}

/* ── The sync status ───────────────────────────────────────────────────── */

function SyncStates() {
  const [taps, setTaps] = useState(0);
  return (
    <Example label="SyncStatusIndicator — the seven states" hint="ranked: blocked, plan, offline, error, syncing, pending, synced">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(SYNC_STATES).map(([name, status]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <SyncStatusIndicator status={status} onSync={() => setTaps((n) => n + 1)} locale="en-GB" />
              <span className={READOUT}>{name}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SyncStatusIndicator
            status={SYNC_STATES.pending}
            showLabel
            hideWhenIdle
            scope={{
              name: "Handovers on this device",
              offline: "Offline: handovers keep working on this device; everything else needs a connection",
            }}
          />
          <SyncStatusIndicator status={SYNC_STATES.offline} showLabel hideWhenIdle />
          <SyncStatusIndicator status={SYNC_STATES.synced} hideWhenIdle />
          <span className={READOUT}>taps: {taps}</span>
        </div>
        <Note>
          With {code("onSync")} it is a "sync now" button, disabled offline and mid-round but
          keeping its colour; without it, a status (§6.9). The second row is a
          status only, {code("hideWhenIdle")} (the third one, in sync, draws nothing), the
          short words beside the cloud, and the {code("scope")} words in the tooltip
          (§6.10).
        </Note>
      </div>
    </Example>
  );
}

/* ── Tours ─────────────────────────────────────────────────────────────── */

function Tours() {
  const [log, setLog] = useState("—");
  return (
    <Example label="TourMenu — with and without a tours page" hint="href: the compass is a link plus a hover menu">
      <div className="flex flex-col gap-3">
        <Frame initial="/beds">
          <div className="flex items-center justify-end gap-2 p-2">
            <TourMenu tours={TOURS} href="/tours" onLaunch={(id) => setLog(`launch → ${id}`)} />
            <TourMenu
              tours={TOURS.slice(0, 2)}
              onLaunch={(id) => setLog(`launch → ${id}`)}
              labels={{ menu: "Guided tours (no tours page)" }}
            />
          </div>
          <Where />
        </Frame>
        <p className={READOUT}>{log}</p>
        <Note>
          The tours are data — id, title, route, new, taken — and {code("onLaunch")} starts
          one with the kit's {code("TourProvider")}, so the menu needs no registry. The list:
          the tours that start on this page, up to three new ones, a rule and "All tours…".
          Without {code("href")} (§6.7) the compass opens the menu and the
          remaining tours follow the rule.
        </Note>
      </div>
    </Example>
  );
}
