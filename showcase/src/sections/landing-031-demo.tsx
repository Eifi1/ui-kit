import { useCallback, useState } from "react";
import type { ContextType, ReactNode } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation } from "react-router";
import { CalendarDays, Droplets, Leaf, Server, ShieldCheck, Sprout, Users } from "lucide-react";
import { AuthLayout, Button, ProgressBar, ToggleGroup } from "@eifi1/ui-kit";
import { PublicHeader } from "../../../src/landing/public-header";
import { CtaBand, FeatureRow, FeatureRows, Hero, PublicFooter, TrustStrip } from "../../../src/landing/landing-sections";
import type { LandingSession } from "../../../src/landing/landing-actions";
import type { AccessChoice } from "../../../src/landing/access";
import { DemoStart } from "../../../src/demo/demo-start";
import { DemoBanner } from "../../../src/demo/demo-banner";
import { DemoEnded } from "../../../src/demo/demo-ended";
import type { DemoModel } from "../../../src/demo/demo-session";
import { Example, Note } from "../lib/section";

/**
 * THE PUBLIC LANDING PAGE AND THE DEMO (0.31, docs/landing-demo-harmonization.md §4, §5):
 * a sample landing for a made-up app, the header in its three states, the demo's start
 * with each refusal, its banner at three moments, and its end page. Belongs on the new
 * "Landing & demo" page of the App chrome group.
 *
 * "Ada's Garden Planner" is SYNTHETIC, like every person and address here. Every callback
 * is the app's part, played by a timer: the kit sends no request.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 900) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const APP = "Ada's Garden Planner";
const ACCESS_REQUEST: AccessChoice = { kind: "request", email: "support@example.com", app: APP };
const ACCESS_REGISTER: AccessChoice = { kind: "register", href: "/register" };

/** React Router refuses a router inside a router; resetting the location context is its
 *  documented escape hatch (see the shell page's nested AppShell). Each specimen gets a
 *  router of its own, so its links move IT, not this page. */
const NO_ROUTER = null as unknown as ContextType<typeof UNSAFE_LocationContext>;

function Sandbox({ children, start = "/" }: { children: ReactNode; start?: string }) {
  return (
    <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
      <MemoryRouter initialEntries={[start]}>
        {children}
        <Where />
      </MemoryRouter>
    </UNSAFE_LocationContext.Provider>
  );
}

/** Where the specimen's own router is — what a click on one of its links did. */
function Where() {
  const { pathname, search } = useLocation();
  return (
    <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
      route: {pathname}
      {search}
    </p>
  );
}

const Logo = () => <Sprout className="text-[var(--brand)]" />;
const BRAND = { logo: <Logo />, name: APP };

/* ── The mock visuals (decorative, kit tokens only) ──────────────────────── */

const BEDS = [
  { name: "Tomatoes", hue: "var(--hue-orange)", bg: "var(--hue-orange-bg)" },
  { name: "Beans", hue: "var(--hue-teal)", bg: "var(--hue-teal-bg)" },
  { name: "Lettuce", hue: "var(--success)", bg: "var(--success-bg)" },
  { name: "Carrots", hue: "var(--hue-orange)", bg: "var(--hue-orange-bg)" },
  { name: "Herbs", hue: "var(--hue-purple)", bg: "var(--hue-purple-bg)" },
  { name: "Fallow", hue: "var(--text-muted)", bg: "var(--bg-surface-2)" },
];

function BedPlanMock() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-xl">
      <p className="text-xs font-semibold text-[var(--text-secondary)]">Spring plan · plot A</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {BEDS.map((bed) => (
          <div
            key={bed.name}
            className="flex h-16 items-end rounded-md p-2 text-xs font-medium"
            style={{ background: bed.bg, color: bed.hue }}
          >
            {bed.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function WateringMock() {
  return (
    <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-sm shadow-lg">
      {[
        ["Mon", "Tomatoes", "2 l"],
        ["Tue", "Lettuce", "1 l"],
        ["Thu", "Beans", "1.5 l"],
      ].map(([day, bed, amount]) => (
        <li key={day} className="flex items-center gap-3 px-4 py-2.5">
          <Droplets className="size-4 text-[var(--info)]" />
          <span className="w-10 text-[var(--text-muted)]">{day}</span>
          <span className="flex-1 text-[var(--text-primary)]">{bed}</span>
          <span className="tabular-nums text-[var(--text-secondary)]">{amount}</span>
        </li>
      ))}
    </ul>
  );
}

function HarvestMock() {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-lg">
      {[
        ["Tomatoes", 72],
        ["Beans", 45],
        ["Carrots", 18],
      ].map(([name, value]) => (
        <ProgressBar key={name} label={name} value={value as number} max={100} showValue tone="success" />
      ))}
    </div>
  );
}

/* ── The sample landing ──────────────────────────────────────────────────── */

const SESSIONS: { value: LandingSession; label: string }[] = [
  { value: "none", label: "No session" },
  { value: "demo", label: "Demo session" },
  { value: "user", label: "Signed in" },
];

export function SampleLanding031Demo() {
  const [session, setSession] = useState<LandingSession>("none");
  const [kind, setKind] = useState<AccessChoice["kind"]>("request");
  const access = kind === "request" ? ACCESS_REQUEST : ACCESS_REGISTER;
  return (
    <Example
      label="A sample landing — Ada's Garden Planner"
      hint="PublicHeader · Hero · FeatureRows / FeatureRow · TrustStrip · CtaBand · PublicFooter"
    >
      <div className="mb-3 flex flex-wrap gap-3">
        <ToggleGroup<LandingSession> ariaLabel="session" value={session} onChange={setSession} options={SESSIONS} />
        <ToggleGroup<AccessChoice["kind"]>
          ariaLabel="access"
          value={kind}
          onChange={setKind}
          options={[
            { value: "request", label: "Invitation-only" },
            { value: "register", label: "Open registration" },
          ]}
        />
      </div>
      <Sandbox>
        <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-page)]">
          <PublicHeader brand={BRAND} session={session} access={access} openAppHref="/beds" className="static" />
          <Hero
            beta
            headingAs="h4"
            title="Every bed planned, every harvest on time."
            subtitle="Draw your plot once. The planner tells you what to sow, when to water and what is ready to pick."
            trust="Free while in beta. No tracking, no ads."
            visual={<BedPlanMock />}
            session={session}
            access={access}
            openAppHref="/beds"
          />
          <FeatureRows>
            <FeatureRow
              headingAs="h5"
              icon={<CalendarDays />}
              eyebrow="Plan"
              title="A season on one page"
              description="Beds on a grid, crops in rotation, and the sowing dates that follow from them."
              bullets={["Rotation warnings before you plant", "Sowing dates per crop", "Shared with the whole household"]}
              visual={<BedPlanMock />}
            />
            <FeatureRow
              headingAs="h5"
              icon={<Droplets />}
              eyebrow="Water"
              title="Reminders that follow the weather"
              description="Skip a day after rain; water twice in a heatwave."
              bullets={["One list for the week", "Litres per bed"]}
              visual={<WateringMock />}
            />
            <FeatureRow
              headingAs="h5"
              icon={<Leaf />}
              eyebrow="Harvest"
              title="Know what is ready"
              description="Ripeness per bed, from the sowing date and the season so far."
              bullets={["Ripeness at a glance", "A harvest log to compare years", "Export to a spreadsheet"]}
              visual={<HarvestMock />}
            />
          </FeatureRows>
          <TrustStrip
            headingAs="h6"
            items={[
              { icon: <Server />, title: "Hosted in Switzerland", description: "One server, one country, no third parties." },
              { icon: <ShieldCheck />, title: "Passkeys", description: "Sign in without a password to leak." },
              { icon: <Sprout />, title: "Your data", description: "Export everything, any time." },
              { icon: <Users />, title: "Shared plots", description: "Invite the household to the same garden." },
            ]}
          />
          <CtaBand
            headingAs="h5"
            title="Ready for the season?"
            subtitle="Ask for an invitation, or look around the sample garden first."
            session={session}
            access={access}
            openAppHref="/beds"
          />
          <PublicFooter tagline="Garden planning for small plots." landmark={false} />
        </div>
      </Sandbox>
      <Note>
        The visuals are slots: {code("aria-hidden")} and {code("inert")}, drawn with kit tokens. Without a session the
        pair is &ldquo;Request access&rdquo; and &ldquo;Try the demo&rdquo;; a demo gets &ldquo;Continue the demo&rdquo;,
        a signed-in visitor one &ldquo;Open app&rdquo;. &ldquo;Request access&rdquo; is a {code("mailto:")} with the
        subject and body in the page&apos;s language; with {code('{kind: "register"}')} it becomes &ldquo;Get
        started&rdquo; → {code("/register")}. The feature rows alternate by position, from {code("lg")} up.
      </Note>
    </Example>
  );
}

/* ── The header's three states ───────────────────────────────────────────── */

export function PublicHeaderStates031Demo() {
  return (
    <Example label="PublicHeader — no session, a demo, signed in" hint="§4.1; Sign in hides below sm">
      <div className="space-y-3">
        {SESSIONS.map(({ value, label }) => (
          <div key={value}>
            <p className="mb-1 text-xs text-[var(--text-muted)]">
              {code(`session="${value}"`)} — {label}
            </p>
            <Sandbox>
              <div className="overflow-hidden rounded-md border border-[var(--border)]">
                <PublicHeader brand={BRAND} session={value} access={ACCESS_REQUEST} openAppHref="/beds" className="static" />
              </div>
            </Sandbox>
          </div>
        ))}
      </div>
      <Note>
        The brand links to {code("/")} without a session and to {code("/welcome")} with one ({code("/")} would resume
        into the app). &ldquo;Continue the demo&rdquo; goes to {code("/demo")}, which continues a live demo. On a phone
        the actions take the kit&apos;s {code("sm")} size, so two of them fit beside the controls at 390px.
      </Note>
    </Example>
  );
}

/* ── DemoStart ───────────────────────────────────────────────────────────── */

type StartAnswer = "created" | "rateLimited" | "capacity" | "disabled" | "notReady" | "network";

/** The server's answers to `POST /auth/demo-session`, axios-shaped. */
const ANSWERS: Record<Exclude<StartAnswer, "created">, unknown> = {
  rateLimited: { response: { status: 429, headers: { "retry-after": "1200" }, data: { code: "demo_rate_limited" } } },
  capacity: { response: { status: 429, headers: {}, data: { code: "demo_capacity" } } },
  disabled: { response: { status: 404, data: { code: "demo_disabled" } } },
  notReady: { response: { status: 503, data: { code: "demo_not_ready" } } },
  network: new Error("Network Error"),
};

export function DemoStart031Demo() {
  const [answer, setAnswer] = useState<StartAnswer>("rateLimited");
  const [run, setRun] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const note = useCallback((line: string) => setLog((l) => [...l.slice(-3), line]), []);
  return (
    <Example label="DemoStart — starting, and each refusal" hint="start() once, StrictMode included; §5.2">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ToggleGroup<StartAnswer>
          ariaLabel="server answer"
          value={answer}
          onChange={(value) => {
            setAnswer(value);
            setRun((n) => n + 1);
          }}
          options={[
            { value: "created", label: "201" },
            { value: "rateLimited", label: "Rate limited" },
            { value: "capacity", label: "Full" },
            { value: "disabled", label: "Disabled" },
            { value: "notReady", label: "Not ready" },
            { value: "network", label: "Network" },
          ]}
        />
        <Button size="sm" variant="secondary" onClick={() => setRun((n) => n + 1)}>
          Run again
        </Button>
      </div>
      <Sandbox start="/demo">
        <div className="max-w-sm">
          <DemoStart
            key={run}
            noIndex={false}
            access={ACCESS_REQUEST}
            start={async () => {
              note(`start() → POST /auth/demo-session`);
              await beat();
              if (answer === "created") return { access_token: "…", refresh_token: null, expires_at: "…" };
              throw ANSWERS[answer];
            }}
            onStarted={() => note("onStarted(session) → the app stores it and replaces to /beds")}
          />
        </div>
      </Sandbox>
      <pre className="mt-3 overflow-x-auto rounded-md bg-[var(--bg-surface-2)] p-2 font-mono text-xs text-[var(--text-secondary)]">
        {log.length ? log.join("\n") : "—"}
      </pre>
      <Note>
        {code("demo_rate_limited")} reads its wait from {code("Retry-After")} (here 1200 s: &ldquo;20 min&rdquo;);{" "}
        {code("demo_capacity")} has none. {code("demo_disabled")} and {code("demo_not_ready")} say the same thing.
        Every refusal offers &ldquo;Request access&rdquo; and &ldquo;Back to the start page&rdquo; — no fallback to{" "}
        {code("/register")}: registration is invitation-only.
      </Note>
    </Example>
  );
}

/* ── DemoBanner ──────────────────────────────────────────────────────────── */

/** A frozen clock, so each banner shows one moment. */
const NOW = Date.parse("2026-10-07T12:00:00Z");
const frozen = () => NOW;
const MIN = 60_000;

const MOMENTS = [
  { key: "23h", left: (23 * 60 + 12) * MIN, label: "23 h 12 min left" },
  { key: "50m", left: 50 * MIN, label: "50 min left — minutes only in the last hour" },
  { key: "4m", left: 4 * MIN, label: "4 min left — the warning tone in the last ten" },
];

export function DemoBanner031Demo() {
  const [model, setModel] = useState<DemoModel>("read-only");
  const [liveEnd, setLiveEnd] = useState(() => Date.now() + 90_000);
  const [ended, setEnded] = useState(false);
  return (
    <Example label="DemoBanner — at 23 h, 50 min and 4 min" hint="AlertBanner strip; useDemoCountdown; §5.4">
      <div className="mb-3">
        <ToggleGroup<DemoModel>
          ariaLabel="model"
          value={model}
          onChange={setModel}
          options={[
            { value: "read-only", label: "Model R (read-only)" },
            { value: "sandbox", label: "Model S (sandbox)" },
          ]}
        />
      </div>
      <Sandbox start="/beds">
        <div className="space-y-3">
          {MOMENTS.map((moment) => (
            <div key={moment.key}>
              <p className="mb-1 text-xs text-[var(--text-muted)]">{moment.label}</p>
              <DemoBanner
                expiresAt={NOW + moment.left}
                now={frozen}
                model={model}
                access={ACCESS_REQUEST}
                collapseKey={`showcase.demoBanner.${moment.key}`}
              />
            </div>
          ))}
          <div>
            <p className="mb-1 text-xs text-[var(--text-muted)]">
              Live, on the real clock: ends 90 s after this page opened {ended && "— onEnded() was called"}
            </p>
            <DemoBanner
              key={liveEnd}
              expiresAt={liveEnd}
              model={model}
              access={ACCESS_REQUEST}
              collapseKey="showcase.demoBanner.live"
              onEnded={() => setEnded(true)}
            />
            <Button
              className="mt-2"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEnded(false);
                setLiveEnd(Date.now() + 90_000);
              }}
            >
              Restart the live one
            </Button>
          </div>
        </div>
      </Sandbox>
      <Note>
        The chevron collapses a banner to its countdown for the tab&apos;s session ({code("sessionStorage")}) — never
        hidden for good. At zero it calls {code("onEnded")}: the app clears the session and replaces to{" "}
        {code("/demo/ended")}. Model R pairs it with {code('<WriteLockProvider locked reason={demo.writeLocked}>')} —
        &ldquo;Not possible in the demo.&rdquo;
      </Note>
    </Example>
  );
}

/* ── DemoEnded ───────────────────────────────────────────────────────────── */

export function DemoEnded031Demo() {
  const [model, setModel] = useState<DemoModel>("read-only");
  return (
    <Example label="DemoEnded — on AuthLayout" hint="/demo/ended, noindex; §5.5">
      <div className="mb-3">
        <ToggleGroup<DemoModel>
          ariaLabel="model"
          value={model}
          onChange={setModel}
          options={[
            { value: "read-only", label: "Model R" },
            { value: "sandbox", label: "Model S" },
          ]}
        />
      </div>
      <Sandbox start="/demo/ended">
        <div className="overflow-hidden rounded-md border border-[var(--border)]">
          <AuthLayout logo={<Sprout />} title={APP} landmark={false} headingAs="h4" className="min-h-0">
            <DemoEnded model={model} access={ACCESS_REQUEST} headingAs="h5" noIndex={false} />
          </AuthLayout>
        </div>
      </Sandbox>
      <Note>
        Where a demo lands at {code("expires_at")}, or on any 401 while the session is a demo — never on{" "}
        {code("/login")}. robots.txt disallows {code("/demo$")} and {code("/demo?")} but not this page, so a crawler can
        read its {code("noindex")}.
      </Note>
    </Example>
  );
}

/** The whole "Landing & demo" page. */
export function Landing031Demo() {
  return (
    <>
      <SampleLanding031Demo />
      <PublicHeaderStates031Demo />
      <DemoStart031Demo />
      <DemoBanner031Demo />
      <DemoEnded031Demo />
    </>
  );
}
