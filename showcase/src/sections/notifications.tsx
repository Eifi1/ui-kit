import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import {
  MoneyField,
  NotificationBell,
  NotificationInbox,
  NotificationTypesSetting,
  PushDeviceSetting,
  PushDevicesSetting,
  QuietHoursSetting,
  Switch,
  ToggleGroup,
  UnsubscribePanel,
  unsubscribeTokenType,
} from "@eifi1/ui-kit";
import type {
  DigestCadence,
  NotificationInboxItem,
  NotificationSettingsPatch,
  NotificationTypeEntry,
  NotificationTypeGroup,
  NotificationTypesValue,
  PushDevice,
  PushDeviceItem,
} from "@eifi1/ui-kit";
import { CalendarClock, ScanLine, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Example, Note, code, beat } from "../lib/section";

/**
 * THE NOTIFICATION CARDS (0.36, docs/notifications-harmonization.md §4.2): the types the
 * server answers with their switches, quiet hours in the account's zone, this device's
 * push, the device list, and the signed-out unsubscribe page. Every part takes the app's
 * request functions; here a pretend server answers. keksdose's nine types and its three
 * headings, kastlan's two and Kurvenschmiede's three are their words as the contract
 * names them; the people and devices are synthetic. The "Notifications" page
 * (`notifications`) in App chrome.
 */

function useLog() {
  const [lines, setLines] = useState<string[]>([]);
  const log = useCallback((line: string) => setLines((l) => [...l.slice(-4), line]), []);
  return { lines, log };
}

function Readout({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-2 font-mono text-xs text-secondary">
      {lines.length ? lines.join("\n") : "—"}
    </pre>
  );
}

/** The width of a settings column. */
function Column({ children }: { children: ReactNode }) {
  return <div className="max-w-md space-y-3">{children}</div>;
}

/** §3.2's PATCH rules for `types`, as a pretend server applies them: a switch named is
 *  set; a type's `null` would reset it to its default (here: off). */
function applyTypes(value: NotificationTypesValue, patch: NotificationSettingsPatch): NotificationTypesValue {
  const next: Record<string, { app: boolean | null; push?: boolean | null; email: boolean | null }> = { ...value };
  const reset = (on: boolean | null | undefined) => (on === null || on === undefined ? on : false);
  for (const [id, change] of Object.entries(patch.types ?? {})) {
    const current = next[id];
    if (!current) continue;
    next[id] =
      change === null
        ? { app: reset(current.app) ?? null, push: reset(current.push), email: reset(current.email) ?? null }
        : {
            app: change?.app ?? current.app,
            push: change?.push ?? current.push,
            email: change?.email ?? current.email,
          };
  }
  return next;
}

/* ── keksdose: nine types, three headings, the threshold and the digest ─── */

type KeksdoseType =
  | "recurring_posted"
  | "scheduled_due"
  | "overspend"
  | "low_balance"
  | "scan_done"
  | "share_events"
  | "digest"
  | "announcements"
  | "support_chat"
  | "feedback_received";

const KEKSDOSE_TYPES: readonly NotificationTypeEntry<KeksdoseType>[] = [
  { id: "recurring_posted", label: "Recurring transactions", description: "A rule booked a transaction." },
  { id: "scheduled_due", label: "Scheduled transactions", description: "A transaction you dated forward is due." },
  { id: "overspend", label: "Overspent categories", description: "A category went over its budget." },
  { id: "low_balance", label: "Low balance", description: "A cash account fell below your threshold." },
  { id: "scan_done", label: "Finished scans", description: "A receipt scan is ready to review." },
  { id: "share_events", label: "Shared budgets", description: "Someone joined or left a budget you share." },
  { id: "digest", label: "Budget digest", description: "A summary of your budgets." },
  { id: "announcements", label: "Product news", description: "New features and changes." },
  { id: "support_chat", label: "Support replies", description: "An answer to your message." },
  // 0.46 (feedback §11): the kit's words, `useFeedbackNotificationTypes()` in an app.
  {
    id: "feedback_received",
    label: "New feedback and reworks",
    description: "When someone files a report or sends one back.",
  },
];

const KEKSDOSE_GROUPS: readonly NotificationTypeGroup<KeksdoseType>[] = [
  { id: "budget", label: "Budget", types: ["recurring_posted", "scheduled_due", "overspend", "low_balance"] },
  { id: "activity", label: "Scans & sharing", types: ["scan_done", "share_events"] },
  { id: "updates", label: "Summaries & news", types: ["digest", "announcements", "support_chat"] },
  // The kit's "Admin" heading (`feedbackNotificationTypes.adminGroup`); an admin only is answered it.
  { id: "admin", label: "Admin", types: ["feedback_received"] },
];

// 0.46 (§10.2): in the app and push, each its own switch; `feedback_received` mails too.
const KEKSDOSE_VALUE: NotificationTypesValue = {
  recurring_posted: { app: true, push: true, email: null },
  overspend: { app: true, push: false, email: null },
  scan_done: { app: false, push: true, email: null },
  share_events: { app: false, push: false, email: null },
  low_balance: { app: true, push: true, email: null },
  digest: { app: true, push: true, email: null },
  announcements: { app: false, push: false, email: null },
  support_chat: { app: true, push: true, email: null },
  scheduled_due: { app: true, push: true, email: null },
  feedback_received: { app: true, push: true, email: true },
};

export function NotificationTypesKeksdoseDemo() {
  const [value, setValue] = useState(KEKSDOSE_VALUE);
  const [cadence, setCadence] = useState<DigestCadence>("weekly");
  const [threshold, setThreshold] = useState<number | null>(150);
  const { lines, log } = useLog();
  return (
    <Example
      label="NotificationTypesSetting — ten types under four headings, a column per channel"
      hint="In the app · Push · E-mail (0.46); groups, digest, renderExtra; one PATCH per switch"
    >
      <Column>
        <NotificationTypesSetting<KeksdoseType>
          id="settings-notifications-card"
          types={KEKSDOSE_TYPES}
          groups={KEKSDOSE_GROUPS}
          value={value}
          digest={{ type: "digest", cadence }}
          renderExtra={(id) =>
            id === "low_balance" ? (
              <MoneyField
                label="Threshold"
                value={threshold}
                onCommit={setThreshold}
                digits={4}
                min={0}
                calculator={false}
                className="max-w-44"
              />
            ) : null
          }
          onChange={async (patch) => {
            log(`PATCH ${JSON.stringify(patch)}`);
            await beat(500);
            if (patch.digest_cadence) setCadence(patch.digest_cadence);
            setValue((current) => applyTypes(current, patch));
          }}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        The server&apos;s {code("types")} is the only list: the card draws what it answered, in the order of the
        app&apos;s {code("groups")}, with the app&apos;s words and headings. A type the server answers that is in no
        group throws in development — keksdose&apos;s compile-time guard, at run time. The cadence shows under
        the digest while it is on, the threshold under Low balance ({code("renderExtra")}). Since 0.46 each
        channel is a column — &quot;In the app&quot;, &quot;Push&quot;, &quot;E-mail&quot; — stacked under the label on a
        phone; a channel the server answers {code("null")} is not drawn, so the e-mail column holds the admin&apos;s{" "}
        {code("feedback_received")} alone.
      </Note>
    </Example>
  );
}

/* ── kastlan: in the app and by e-mail ─────────────────────────────────── */

type KastlanType = "invoices_overdue" | "dunnings_pending";

const KASTLAN_TYPES: readonly NotificationTypeEntry<KastlanType>[] = [
  { id: "invoices_overdue", label: "Overdue invoices", description: "Once a day, per company." },
  { id: "dunnings_pending", label: "Dunnings to send", description: "Reminders waiting for you to send them." },
];

export function NotificationTypesKastlanDemo() {
  const [value, setValue] = useState<NotificationTypesValue>({
    invoices_overdue: { app: true, email: false },
    dunnings_pending: { app: false, email: null },
  });
  const [failing, setFailing] = useState(false);
  const { lines, log } = useLog();
  return (
    <Example label="NotificationTypesSetting — in the app, and by e-mail" hint="push: null — no push column">
      <div className="mb-3">
        <Switch checked={failing} onCheckedChange={setFailing} label="The server refuses" />
      </div>
      <Column>
        <NotificationTypesSetting<KastlanType>
          types={KASTLAN_TYPES}
          value={value}
          onChange={async (patch) => {
            log(`PATCH ${JSON.stringify(patch)}`);
            await beat(600);
            if (failing) throw new Error("503");
            setValue((current) => applyTypes(current, patch));
          }}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        kastlan has no push ({code("NotificationTypes(..., push_channel=False)")} answers {code("push: null")}), so
        two columns; {code("dunnings_pending")} offers no mail and keeps one switch named by its type. A flip shows
        at once and goes back if the PATCH fails, said under the card.
      </Note>
    </Example>
  );
}

/* ── Kurvenschmiede: e-mail only, address unverified ──────────────────── */

type KurvenschmiedeType = "feedback_answered" | "share_granted" | "team_added" | "work_transferred";

const KURVENSCHMIEDE_TYPES: readonly NotificationTypeEntry<KurvenschmiedeType>[] = [
  { id: "feedback_answered", label: "Answers to your reports", description: "Your report has an answer." },
  { id: "share_granted", label: "Work shared with you", description: "A project or a gear, or with your team." },
  { id: "team_added", label: "Added to a team", description: "Someone added you to a team." },
  {
    id: "work_transferred",
    label: "Work handed on to you",
    description: "When an administrator hands someone's work on to you.",
  },
];

export function NotificationTypesKurvenschmiedeDemo() {
  const [value, setValue] = useState<NotificationTypesValue>({
    feedback_answered: { app: null, email: true },
    share_granted: { app: null, email: false },
    team_added: { app: null, email: false },
    work_transferred: { app: null, email: false },
  });
  const [unverified, setUnverified] = useState(true);
  return (
    <Example label="NotificationTypesSetting — e-mail only, address unverified" hint="app: null; emailUnverified">
      <div className="mb-3">
        <Switch checked={unverified} onCheckedChange={setUnverified} label="Address unverified" />
      </div>
      <Column>
        <NotificationTypesSetting<KurvenschmiedeType>
          types={KURVENSCHMIEDE_TYPES}
          value={value}
          emailUnverified={unverified}
          onChange={async (patch) => {
            await beat(400);
            setValue((current) => applyTypes(current, patch));
          }}
        />
      </Column>
      <Note>
        An app with no &quot;in the app&quot; channel answers {code("app: null")}: the e-mail switch is the row&apos;s
        own. While the address is unverified no notification mail goes, and every e-mail switch says so.
      </Note>
    </Example>
  );
}

/* ── Quiet hours ─────────────────────────────────────────────────────────── */

export function QuietHoursDemo() {
  const [settings, setSettings] = useState<{ start: string | null; end: string | null }>({
    start: "22:00",
    end: "07:00",
  });
  const [reported, setReported] = useState(true);
  const { lines, log } = useLog();
  return (
    <Example label="QuietHoursSetting — the account's zone, and a held push" hint="zone, held (0.46)">
      <div className="mb-3">
        <Switch checked={reported} onCheckedChange={setReported} label="A device has reported its zone" />
      </div>
      <Column>
        <QuietHoursSetting
          start={settings.start}
          end={settings.end}
          zone={reported ? "Pacific/Auckland" : null}
          held
          inbox
          onChange={async (patch) => {
            log(`PATCH ${JSON.stringify(patch)}`);
            await beat(400);
            setSettings((current) => ({
              start: patch.quiet_hours_start !== undefined ? patch.quiet_hours_start : current.start,
              end: patch.quiet_hours_end !== undefined ? patch.quiet_hours_end : current.end,
            }));
          }}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        Since 0.46 the zone is the account&apos;s, and automatic only (amended 2026-10-20): the zone of the device
        last used ({code("/auth/me")}&apos;s {code("device_timezone")}, reported by {code("useDeviceZoneReport")} when
        it differs, never for a demo), else Zurich. The card names it read-only and a time sends no zone; screens
        keep showing device time. {code("held")} says a held push arrives when the window ends — an app that runs
        the notifications tick (keksdose). Switch the report off for the fallback.
      </Note>
    </Example>
  );
}

/* ── The inbox and the bell ──────────────────────────────────────────────── */

const INBOX: NotificationInboxItem<number>[] = [
  {
    id: 5,
    notification_type: "scan_done",
    title: "Your receipt is ready",
    body: "Migros, 42.80 — check the lines and book it.",
    url: "#scan",
    created_at: "2026-10-19T08:30:00Z",
    read_at: null,
  },
  {
    id: 4,
    notification_type: "low_balance",
    title: "Low balance",
    body: "Cash fell below 150.00.",
    url: "#accounts",
    created_at: "2026-10-18T17:05:00Z",
    read_at: null,
    company: "Muster AG",
  },
  {
    id: 3,
    notification_type: "recurring_posted",
    title: "Rent was booked",
    body: "The monthly rule booked 1,850.00.",
    url: null,
    created_at: "2026-10-01T06:00:00Z",
    read_at: "2026-10-01T07:00:00Z",
  },
  {
    id: 2,
    notification_type: "retired_type",
    title: "A kind that is gone",
    body: "Its icon falls back to the bell.",
    url: null,
    created_at: "2026-09-20T06:00:00Z",
    read_at: "2026-09-20T07:00:00Z",
  },
];

const INBOX_ICONS: Record<string, LucideIcon> = { scan_done: ScanLine, low_balance: Wallet, recurring_posted: CalendarClock };

function useInbox() {
  const [items, setItems] = useState(INBOX);
  const { lines, log } = useLog();
  const unread = items.filter((item) => item.read_at === null).length;
  const markRead = async (ids: number[] | null) => {
    log(`POST /notifications/inbox/read ${JSON.stringify({ ids })}`);
    await beat(300);
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (ids === null || ids.includes(item.id) ? { ...item, read_at: item.read_at ?? now } : item)));
  };
  return { items, setItems, unread, markRead, lines, log };
}

export function NotificationInboxDemo() {
  const { items, setItems, unread, markRead, lines, log } = useInbox();
  return (
    <Example label="NotificationInbox — keksdose's list, lifted" hint="icon(type), company, mark read, clear behind a question">
      <Column>
        <NotificationInbox<number>
          items={items}
          unreadCount={unread}
          icon={(type) => INBOX_ICONS[type]}
          onMarkRead={markRead}
          onClear={async () => {
            log("DELETE /notifications/inbox");
            await beat(400);
            setItems([]);
          }}
          onOpen={(item) => {
            void markRead([item.id]);
            log(`open ${item.url ?? "(nothing to open)"}`);
          }}
          hasMore={items.length > 0}
          onLoadMore={() => log("GET /notifications/inbox?offset=4")}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        Props only: the app polls the count every {code("INBOX_BADGE_INTERVAL")} (60 s) and invalidates on its
        worker&apos;s push message. Unread rows are bold with a dot; a row naming a company is kastlan&apos;s (its
        inbox holds every company&apos;s rows). Without {code("onOpen")} a row with a {code("url")} is a real link
        that marks itself read on a click or a middle click.
      </Note>
    </Example>
  );
}

export function NotificationBellDemo() {
  const { items, unread, markRead, lines, log } = useInbox();
  return (
    <Example label="NotificationBell — the top bar's notifications slot" hint="badge (99+), the newest 20, All notifications">
      <div className="flex items-center gap-1 rounded-lg border border-subtle p-2">
        <span className="me-auto text-sm text-secondary">Top bar</span>
        <NotificationBell<number>
          items={items}
          unreadCount={unread}
          icon={(type) => INBOX_ICONS[type]}
          href="/app-chrome/notifications"
          onOpen={(item) => {
            void markRead([item.id]);
            log(`open ${item.url ?? "(nothing to open)"}`);
          }}
        />
      </div>
      <Readout lines={lines} />
      <Note>
        Optional per app, in {code("TopBarActions")}&apos; {code("notifications")} slot right before the account
        menu. One badge per signal: an app shows the bell or an unread dot on the avatar, never both — keksdose
        keeps its dot, kastlan&apos;s inbox lives here.
      </Note>
    </Example>
  );
}

/* ── This device ─────────────────────────────────────────────────────────── */

type PushState = "unsupported" | "ios" | "not-configured" | "blocked" | "off" | "on" | "other-account";

const PUSH_STATES: { value: PushState; label: string }[] = [
  { value: "unsupported", label: "Unsupported" },
  { value: "ios", label: "iOS, not installed" },
  { value: "not-configured", label: "No keys" },
  { value: "blocked", label: "Blocked" },
  { value: "off", label: "Off" },
  { value: "on", label: "On" },
  { value: "other-account", label: "Another account" },
];

function fakePush(state: PushState, setState: (state: PushState) => void, log: (line: string) => void): PushDevice {
  return {
    supported: state !== "unsupported",
    configured: state !== "not-configured",
    installed: false,
    ios: state === "ios",
    permission: state === "blocked" ? "denied" : state === "on" ? "granted" : "default",
    subscribed: state === "on",
    foreignSubscription: state === "other-account",
    currentEndpoint: state === "on" ? "https://push.example/this-laptop" : null,
    busy: false,
    enable: async () => {
      log("enable()");
      await beat(700);
      setState("on");
      return true;
    },
    disable: async () => {
      log("disable()");
      await beat(500);
      setState("off");
    },
    sendTest: async () => {
      log("sendTest()");
      await beat(500);
      return { sent: 2 };
    },
  };
}

export function PushDeviceDemo() {
  const [state, setState] = useState<PushState>("off");
  const { lines, log } = useLog();
  return (
    <Example label="PushDeviceSetting — every state" hint="a switcher over a fake PushDevice">
      <div className="mb-3">
        <ToggleGroup<PushState> aria-label="State" value={state} onChange={setState} options={PUSH_STATES} overflow="wrap" />
      </div>
      <Column>
        <PushDeviceSetting push={fakePush(state, setState, log)} appName="Example" />
      </Column>
      <Readout lines={lines} />
      <Note>
        In an app {code("usePushDevice({pushKey, register, unregister, devices, test})")} answers this object. Turning
        on while the browser has not asked yet opens the explainer first; the browser&apos;s own prompt comes after
        Continue. A test that reached no device says so.
      </Note>
    </Example>
  );
}

/* ── The device list ─────────────────────────────────────────────────────── */

const DEVICES: PushDeviceItem<number>[] = [
  {
    id: 1,
    endpoint: "https://push.example/phone",
    user_agent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36",
    created_at: "2026-09-01T08:00:00Z",
    last_success_at: "2026-10-12T19:30:00Z",
    failure_count: 0,
  },
  {
    id: 2,
    endpoint: "https://push.example/this-laptop",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
    created_at: "2026-10-01T08:00:00Z",
    last_success_at: "2026-10-13T07:05:00Z",
    failure_count: 0,
  },
  {
    id: 3,
    endpoint: "https://push.example/old-tablet",
    user_agent: null,
    created_at: "2026-02-14T08:00:00Z",
    last_success_at: null,
    failure_count: 4,
  },
];

export function PushDevicesDemo() {
  const [devices, setDevices] = useState(DEVICES);
  const { lines, log } = useLog();
  const typeSwitches = KEKSDOSE_VALUE;
  return (
    <Example label="PushDevicesSetting — this device marked, failures, remove" hint="the confirm sits in the row">
      <Column>
        <PushDevicesSetting<number>
          id="settings-devices-card"
          devices={devices}
          currentEndpoint="https://push.example/this-laptop"
          onRemove={async (id) => {
            log(`DELETE /notifications/devices/${id}`);
            await beat(500);
            setDevices((current) => current.filter((device) => device.id !== id));
          }}
          types={KEKSDOSE_TYPES}
          typeSwitches={typeSwitches}
          onMutedTypesChange={async (id, mutedTypes) => {
            log(`PATCH /notifications/devices/${id} ${JSON.stringify({ muted_types: mutedTypes })}`);
            await beat(400);
            setDevices((current) => current.map((device) => (device.id === id ? { ...device, muted_types: mutedTypes } : device)));
          }}
        />
      </Column>
      <Readout lines={lines} />
      <Note>
        Removing this device also unsubscribes the browser and fires {code("PUSH_SUBSCRIPTION_CHANGED")}, so the
        push card stops saying &quot;on&quot;. The browser and system come from the stored user agent
        ({code("describeUserAgent")}). &quot;Types on this device&quot; (0.46) lists the types with push on; a device
        can mute one, never add one, and each flip saves its whole {code("muted_types")} list.
      </Note>
    </Example>
  );
}

/* ── The unsubscribe page ───────────────────────────────────────────────── */

const b64url = (text: string) => btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
/** A token as server-kit writes it; the MAC is a stand-in (the page never reads it). */
const SAMPLE_TOKEN = `v1.${b64url("42:feedback_answered")}.${b64url("stand-in-mac")}`;

type PanelCase = "works" | "refused" | "fails" | "broken";

const PANEL_CASES: { value: PanelCase; label: string }[] = [
  { value: "works", label: "Works" },
  { value: "refused", label: "Server refuses" },
  { value: "fails", label: "Server down" },
  { value: "broken", label: "Broken link" },
];

const TYPE_WORDS: Record<string, string> = { feedback_answered: "Answers to your reports" };

export function UnsubscribePanelDemo() {
  const [panelCase, setPanelCase] = useState<PanelCase>("works");
  const { lines, log } = useLog();
  const token = panelCase === "broken" ? "v1.not-a-token" : SAMPLE_TOKEN;
  const type = unsubscribeTokenType(token);
  const answer = async (path: string) => {
    log(`POST ${path}`);
    await beat(600);
    if (panelCase === "refused") {
      throw Object.assign(new Error("400"), {
        response: { status: 400, data: { detail: "invalid", code: "unsubscribe_invalid" } },
      });
    }
    if (panelCase === "fails") throw new Error("503");
  };
  return (
    <Example label="UnsubscribePanel — the signed-out page" hint="asks first; a GET never unsubscribes">
      <div className="mb-3">
        <ToggleGroup<PanelCase> aria-label="Case" value={panelCase} onChange={setPanelCase} options={PANEL_CASES} overflow="wrap" />
      </div>
      <div className="max-w-sm rounded-lg border border-subtle p-4">
        <UnsubscribePanel
          key={panelCase}
          token={token}
          appName="Example"
          typeLabel={type ? TYPE_WORDS[type] : undefined}
          onStop={() => answer("/notifications/unsubscribe/{token}")}
          onStopAll={() => answer("/notifications/unsubscribe/{token}/all")}
          settingsHref="#notifications-settings"
          headingAs="h4"
        />
      </div>
      <Readout lines={lines} />
      <Note>
        The type&apos;s name comes from the token&apos;s claim ({code("unsubscribeTokenType(token)")} →{" "}
        {code("feedback_answered")}) and the app&apos;s words for it. A token that does not parse is a broken link at
        once, with no request; the server&apos;s {code("unsubscribe_invalid")} says the same.
      </Note>
    </Example>
  );
}

/** The page, in order. */
export function NotificationsPage() {
  return (
    <>
      <NotificationTypesKeksdoseDemo />
      <NotificationTypesKastlanDemo />
      <NotificationTypesKurvenschmiedeDemo />
      <QuietHoursDemo />
      <NotificationInboxDemo />
      <NotificationBellDemo />
      <PushDeviceDemo />
      <PushDevicesDemo />
      <UnsubscribePanelDemo />
    </>
  );
}
