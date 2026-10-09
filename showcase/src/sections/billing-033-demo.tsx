import { useRef, useState } from "react";
import type { ContextType, ReactNode } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation, useNavigate } from "react-router";
import { LogOut, NotebookPen, Plus } from "lucide-react";
import {
  BillingBanner,
  Button,
  COMMIT_EXCEPT_BILLING,
  IconButton,
  ShareCard,
  SubscriptionActions,
  Switch,
  WriteLockProvider,
  checkoutFingerprint,
  checkoutReturnUrl,
  combineWriteLocks,
  formatFileSize,
  isCheckoutReturn,
  noteCheckoutStarted,
  paddleLocale,
  payPageUrl,
  useBillingLabels,
  useBillingWriteLock,
  useCheckoutProcessing,
  useDemoLabels,
  usePlanLimitToast,
  useWriteLock,
  withoutCheckoutReturn,
} from "@eifi1/ui-kit";
import type {
  CheckoutOverview,
  PortalTarget,
  ShareAddRequest,
  ShareGrantee,
  SharePendingGrant,
  ShareRole,
  WriteLock,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * SUBSCRIPTION, 0.33 (docs/billing-harmonization.md §12.36, §14): the way back from the
 * checkout and its "processing", "nothing yet" before the payer reached the provider and
 * the portal's three targets, the plan limit as a toast, the static pay page each app
 * serves on `pay.<app>`, and the write lock that names its source — with ShareCard
 * keeping removal live under a lapsed plan. Belongs on the "Subscription" page, after
 * billing-032-demo.
 *
 * "Ada's Garden Planner", its payer and its people are SYNTHETIC. Every request is the
 * app's part, played by a timer; nothing loads Paddle.js.
 */

// `anywhere`: identifiers have no space to break at, and at Extra large on a phone they
// are wider than the note.
const code = (s: string) => <code className="font-mono [overflow-wrap:anywhere]">{s}</code>;
const beat = (ms = 900) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const READOUT = "font-mono text-xs text-secondary [overflow-wrap:anywhere]";
const PRE = "overflow-x-auto rounded-md border border-subtle bg-surface-2 p-3 font-mono text-xs text-secondary";

/** React Router refuses a router inside a router; resetting the location context is its
 *  documented escape hatch (billing-032-demo does the same). */
const NO_ROUTER = null as unknown as ContextType<typeof UNSAFE_LocationContext>;

function Sandbox({ children, start }: { children: ReactNode; start: string }) {
  return (
    <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
      <MemoryRouter initialEntries={[start]}>{children}</MemoryRouter>
    </UNSAFE_LocationContext.Provider>
  );
}

const DIMENSIONS = { beds: "Beds", helpers: "Helpers", photos: "Photo storage" };
const formatLimit = (dimension: string, value: number) =>
  dimension === "photos" ? formatFileSize(value) : String(value);

/* ── The way back from the checkout (§14.4) ──────────────────────────────── */

/** The payer — the user's or the company's id; a mark never speaks for another. */
const PAYER = "ada";
/** The showcase's own browser entry, so it never meets an app's on this origin. */
const CHECKOUT_KEY = "uikit-showcase-checkout";

type Overview = CheckoutOverview & { at_provider: boolean };

const ON_TRIAL: Overview = {
  plan: "seedling",
  status: "trialing",
  source: "trial",
  in_good_standing: true,
  current_period_end: null,
  at_provider: false,
};

const PAID: Overview = {
  plan: "gardener",
  status: "active",
  source: "provider",
  in_good_standing: true,
  current_period_end: "2027-10-09T00:00:00Z",
  at_provider: true,
};

/** The app's subscription page, inside the sandbox's router: it reads the return from
 *  the URL and drops the marker with replace — the kit has no router. */
function SubscriptionPage({
  overview,
  refetch,
  onLanded,
}: {
  overview: Overview;
  refetch: () => void;
  onLanded: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { processing, checkAgain } = useCheckoutProcessing({
    payer: PAYER,
    returned: isCheckoutReturn(location.search),
    onConsumed: () =>
      navigate({ search: withoutCheckoutReturn(new URLSearchParams(location.search)).toString() }, { replace: true }),
    overview,
    refetch,
    onLanded,
    // Shorter than the kit's 4 s and 10 minutes, so the specimen moves while you watch.
    pollMs: 2_000,
    timeoutMs: 120_000,
    storageKey: CHECKOUT_KEY,
  });
  const buy = () => {
    // The departure, noted before leaving: the return is judged against THIS overview.
    noteCheckoutStarted(PAYER, overview, { storageKey: CHECKOUT_KEY });
    // In an app: window.location.assign(payPageUrl(url, locale)) — and the pay page's
    // successUrl brings the buyer back here with ?checkout=done.
    navigate(`${location.pathname}?checkout=done`);
  };
  return (
    <div className="space-y-3">
      {processing && <BillingBanner kind="processing" onAction={checkAgain} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={buy} disabled={processing}>
          Buy Gardener — and come back
        </Button>
      </div>
      <OutTable
        rows={[
          ["route", `${location.pathname}${location.search}`],
          ["processing", String(processing)],
          ["overview (as the page last fetched it)", `${overview.status} · ${overview.plan} · ${overview.source}`],
          ["checkoutFingerprint(overview)", checkoutFingerprint(overview)],
        ]}
      />
    </div>
  );
}

export function CheckoutReturn033Demo() {
  // `server` is what GET /billing/overview answers now; `data` what the page last fetched.
  const [server, setServer] = useState<Overview>(ON_TRIAL);
  const [data, setData] = useState<Overview>(ON_TRIAL);
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 5));
  const refetch = () => {
    setData(server);
    note(`GET /billing/overview → ${server.status} · ${server.plan}`);
  };
  return (
    <Example
      label="The way back from the checkout — useCheckoutProcessing"
      hint="?checkout=done, the departure noted, and processing until the overview has moved"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setServer(PAID)} disabled={server === PAID}>
            The provider&apos;s webhook lands
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setServer(ON_TRIAL);
              setData(ON_TRIAL);
              setLog([]);
            }}
          >
            Start again on the trial
          </Button>
        </div>
        <Sandbox start="/settings/subscription">
          <SubscriptionPage
            overview={data}
            refetch={refetch}
            onLanded={() => note("onLanded() — refresh the plans and the locked items")}
          />
        </Sandbox>
        <ul aria-label="Requests" className={`space-y-0.5 ${READOUT}`}>
          {log.length === 0 ? <li>No request yet.</li> : log.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </div>
      <Note>
        The webhook may land after the buyer is back — a cold start can outlast the provider&apos;s redirect — so
        the page says &ldquo;processing&rdquo; and asks the overview again (here every 2 s) until it has MOVED
        since the departure: a payer who buys under a grant keeps `comped`, and only the period&apos;s end
        changes, so &ldquo;is it active yet&rdquo; would wait for ever. With no departure on record (another
        device) it waits for `active`. Bounded (10 minutes by default), remembered across the whole-page return
        per payer in the kit&apos;s safe storage, and one state for every mounted instance — the banner app-wide
        and the subscription page share one poll and one `onLanded`. Press &ldquo;Buy&rdquo;, let it poll, then
        let the webhook land.
      </Note>
    </Example>
  );
}

/* ── Nothing yet, and the portal's targets (§14.5) ───────────────────────── */

export function PortalTargets033Demo() {
  const [atProvider, setAtProvider] = useState(false);
  const [pending, setPending] = useState<PortalTarget | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const open = async (target: PortalTarget) => {
    setPending(target);
    setLast(`POST /billing/portal {"target":"${target}"}`);
    await beat();
    setPending(null);
    setLast(`POST /billing/portal {"target":"${target}"} → {url}: followed, never stored`);
  };
  return (
    <Example
      label="SubscriptionActions — nothing yet, then the portal's three targets"
      hint="atProvider from the overview's at_provider; onPortal(target)"
    >
      <div className="space-y-3">
        <Switch
          label="The payer has reached the provider (at_provider)"
          checked={atProvider}
          onCheckedChange={setAtProvider}
        />
        <SubscriptionActions
          atProvider={atProvider}
          onPortal={(target) => void open(target)}
          pending={pending === "overview" ? "manage" : pending === "cancel" ? "cancel" : null}
        />
        <BillingBanner
          kind="payment-failed"
          onAction={() => void open("payment_method")}
          actionPending={pending === "payment_method"}
        />
        <p className={READOUT} aria-live="polite">
          {last ?? "No request yet."}
        </p>
      </div>
      <Note>
        Before a provider customer exists — a trial without a card, a beta, an operator&apos;s grant — there is
        no portal to open, and the two buttons could only end in `409 billing_not_at_provider`: the part says
        &ldquo;nothing yet&rdquo; instead. Once it exists, both show whatever the status or source, so a payer
        who bought under a grant keeps the way to the invoices and to &ldquo;Cancel&rdquo;. One call says where
        to: &ldquo;Payment and invoices&rdquo; is `overview`, &ldquo;Cancel subscription&rdquo; `cancel` (the
        portal&apos;s cancel link, never the overview), and the payment-failed banner&apos;s action
        `payment_method`.
      </Note>
    </Example>
  );
}

/* ── The plan limit as a toast (§14.11) ──────────────────────────────────── */

export function PlanLimitToast033Demo() {
  const [last, setLast] = useState("No toast yet.");
  const upgrade = usePlanLimitToast({
    mode: "upgrade",
    onChoosePlan: () => setLast("onChoosePlan() — the app navigates to /settings/subscription"),
    dimensionLabels: DIMENSIONS,
    formatValue: formatLimit,
  });
  const contact = usePlanLimitToast({
    mode: "contact",
    email: "support@example.com",
    dimensionLabels: DIMENSIONS,
    formatValue: formatLimit,
  });
  return (
    <Example label="usePlanLimitToast — the limit where a notice has no room" hint="402 plan_limit from a row's button; one toast per dimension">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => setLast(`toast id: ${String(upgrade({ dimension: "beds", plan: "seedling", limit: 3, used: 3 }))}`)}
        >
          <Plus aria-hidden className="size-4" />
          Add a bed (3 of 3)
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            setLast(
              `toast id: ${String(
                contact({ dimension: "photos", plan: "gardener", limit: 5 * 1024 ** 3, used: 5.2 * 1024 ** 3 }),
              )}`,
            )
          }
        >
          Upload a photo (contact mode)
        </Button>
        <Button variant="ghost" onClick={() => setLast(`toast id: ${String(upgrade())}`)}>
          A refusal without a figure
        </Button>
      </div>
      <p className={`mt-3 ${READOUT}`} aria-live="polite">
        {last}
      </p>
      <Note>
        {code("const hit = isPlanLimit(err); if (hit) showLimit(hit);")} — PlanLimitNotice&apos;s words where a
        refused create has no room for the notice (a row&apos;s button, a share target): &ldquo;Plan limit
        reached&rdquo;, what to do, the figure when the refusal has one (`billing.limitUsageLine`, a key because
        French puts a space before the colon), and the mode&apos;s action — `upgrade` calls the app&apos;s
        navigation, `contact` opens the mail to support. Its id is {code("plan-limit:<dimension>")}, so pressing
        &ldquo;Add a bed&rdquo; again replaces the toast instead of stacking a second.
      </Note>
    </Example>
  );
}

/* ── The pay page (§14.4) ────────────────────────────────────────────────── */

const APP_CALL = `// The app's "Choose" — POST /billing/checkout answers {url}: the pay page's URL + ?_ptxn=…
const { url } = await api.post("/billing/checkout", { plan, interval, currency });
noteCheckoutStarted(user.id, overview.data);   // the departure, for the way back
window.location.assign(payPageUrl(url, i18n.language));`;

const BUILD = `# The web image's build stage — the kit's static page, configured once:
RUN npx eifi1-pay-page --out /srv-pay \\
      --token "$PADDLE_CLIENT_TOKEN" --environment "$PADDLE_ENVIRONMENT" \\
      --return-url https://keksdose.app/settings/subscription \\
      --app-name Keksdose \\
      --terms-url https://keksdose.app/terms --privacy-url https://keksdose.app/privacy`;

const CONFIG = `// /srv-pay/pay-config.json, as the script writes it
{
  "token": "live_…",
  "environment": "live",
  "returnUrl": "https://keksdose.app/settings/subscription",
  "appName": "Keksdose",
  "termsUrl": "https://keksdose.app/terms",
  "privacyUrl": "https://keksdose.app/privacy"
}`;

const CADDY = `# The same web container answers the second host name, with headers of its own
http://{$PAY_HOST:pay.invalid}:{$PORT} {
	root * /srv-pay
	header Content-Security-Policy "default-src 'none'; script-src 'self' https://cdn.paddle.com; frame-src https://buy.paddle.com https://sandbox-buy.paddle.com; connect-src 'self' https://*.paddle.com; …"
	header X-Robots-Tag "noindex"
	@served path / /index.html /pay.js /pay.css /pay-config.json /.well-known/apple-developer-merchantid-domain-association
	handle @served {
		file_server
	}
	handle {
		respond 404
	}
}`;

export function PayPage033Demo() {
  const labels = useBillingLabels();
  const link = "https://pay.keksdose.app/?_ptxn=txn_01j9example";
  const hosted = "https://sandbox-checkout.paddle.com/checkout/custom/abc";
  return (
    <Example label="The pay page — dist/pay on pay.<app>" hint="a static page the kit ships; each app serves it on its own pay host. Paddle.js runs only there">
      <div className="space-y-3">
        <pre className={PRE}>{APP_CALL}</pre>
        <OutTable
          rows={[
            [`payPageUrl("${link}", "de-CH")`, payPageUrl(link, "de-CH")],
            [`payPageUrl("${hosted}", "fr")`, payPageUrl(hosted, "fr")],
            ['paddleLocale("de-CH")', paddleLocale("de-CH")],
            ['paddleLocale("zh")', paddleLocale("zh")],
            ['paddleLocale("hu")', paddleLocale("hu")],
            ['checkoutReturnUrl("https://keksdose.app/settings/subscription")', checkoutReturnUrl("https://keksdose.app/settings/subscription")],
            ['checkoutReturnUrl("https://kastlan.app/admin/billing?tab=plans#invoices")', checkoutReturnUrl("https://kastlan.app/admin/billing?tab=plans#invoices")],
          ]}
        />
        <pre className={PRE}>{BUILD}</pre>
        <pre className={PRE}>{CONFIG}</pre>
        <pre className={PRE}>{CADDY}</pre>
        <p className="text-sm text-secondary">What the page itself says, in this page&apos;s language:</p>
        <OutTable
          rows={[
            ["billing.payOpening — while the checkout opens", labels.payOpening],
            ["billing.payNothing — no _ptxn, or billing off", labels.payNothing],
            ["billing.payFailed — Paddle.js did not load", labels.payFailed],
            ["billing.payBack — the buyer closed the checkout", labels.payBack],
          ]}
        />
      </div>
      <Note>
        Paddle.js is a third-party script, always the latest from Paddle&apos;s CDN. On an app&apos;s own origin it
        would run beside what one injected script could take — session tokens in localStorage, keksdose&apos;s data
        key in IndexedDB — and a CSP relaxed for a `/pay` route cannot help: storage is per origin, not per path.
        So the kit ships `dist/pay/` (an `index.html` with no inline script or style, `pay.js`, `pay.css`, and
        Paddle&apos;s Apple Pay file), with no React, no sign-in, no storage and no request to the app, and each
        app serves it at {code("pay.<app domain>")} from its web container. The `eifi1-pay-page` bin copies it and writes
        `pay-config.json` at the web build; it refuses a token whose prefix disagrees with the environment
        (`test_` sandbox, `live_` live) and a return URL that is not https, so a wrong pairing fails the build,
        not a buyer. Without a token it writes `null` and the page says there is nothing to pay. The language is
        the one thing per visit (`?lang=`, mapped to Paddle&apos;s locale; Hungarian gets English). The
        page&apos;s `successUrl` is {code("checkoutReturnUrl(returnUrl)")}, which brings the buyer back to the
        way-back specimen above. This showcase loads no Paddle.js.
      </Note>
    </Example>
  );
}

/* ── A lock says its source (§12.36) ─────────────────────────────────────── */

function holdText(lock: WriteLock): string {
  if (!lock.locked) return "unlocked";
  const reason = typeof lock.reason === "string" ? `“${lock.reason}”` : "(a reason node)";
  return `locked · kind ${lock.kind ?? "(none)"} · ${reason}`;
}

/** What two controls with different scopes see, under the same provider. */
function LockReadout() {
  const every = useWriteLock();
  const exceptBilling = useWriteLock(COMMIT_EXCEPT_BILLING);
  return (
    <OutTable
      rows={[
        ["useWriteLock()", holdText(every)],
        ["useWriteLock(COMMIT_EXCEPT_BILLING)", holdText(exceptBilling)],
        ["useWriteLock().holds", JSON.stringify(every.holds.map((hold) => hold.kind ?? null))],
      ]}
    />
  );
}

export function WriteLockKinds033Demo() {
  const demoLabels = useDemoLabels();
  const [demo, setDemo] = useState(false);
  const [billing, setBilling] = useState(true);
  const [access, setAccess] = useState(false);
  const billingLock = useBillingWriteLock(billing);
  const lock = combineWriteLocks([
    { locked: demo, reason: demoLabels.writeLocked, kind: "demo" },
    billingLock,
    // An app's own kind, Kurvenschmiede's "access": a curve shared to view.
    { locked: access, reason: "Shared with you to read.", kind: "access" },
  ]);
  return (
    <Example label="A lock says its source — kinds, holds and commit scopes" hint="commit, or commit={{ except: [kinds] }}; the parts a lapsed plan allows stay live">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <Switch size="sm" label="Demo (kind: demo)" checked={demo} onCheckedChange={setDemo} />
        <Switch size="sm" label="Billing lapsed (useBillingWriteLock)" checked={billing} onCheckedChange={setBilling} />
        <Switch size="sm" label="Shared to read (kind: access)" checked={access} onCheckedChange={setAccess} />
      </div>
      <WriteLockProvider {...lock}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button commit>
              <Plus aria-hidden className="size-4" />
              Add a bed
            </Button>
            <Button commit={{ except: ["billing"] }} variant="secondary">
              Remove a helper
            </Button>
            <Button commit={COMMIT_EXCEPT_BILLING} variant="secondary">
              <LogOut aria-hidden className="size-4" />
              Sign out everywhere
            </Button>
            {/* An inner provider reopens EVERY source at once: a viewer's own notes. */}
            <WriteLockProvider locked={false}>
              <IconButton commit label="Save my own note">
                <NotebookPen />
              </IconButton>
            </WriteLockProvider>
          </div>
          <LockReadout />
        </div>
      </WriteLockProvider>
      <Note>
        Every source has a kind — {code('"demo"')} and {code('"billing"')} are the kit&apos;s, an app names its own —
        and the provider holds every locked one in the server&apos;s refusal order ({code("holds")}, from{" "}
        {code("combineWriteLocks")}). {code("commit")} takes a scope: {code("true")} sees every lock,{" "}
        {code('{ except: ["billing"] }')} ({code("COMMIT_EXCEPT_BILLING")}) every lock but billing&apos;s. So under
        billing alone &ldquo;Remove a helper&rdquo; and &ldquo;Sign out everywhere&rdquo; stay live — a lapsed plan
        locks creating and changing, never removing access or the account&apos;s own settings — and under the demo
        and billing together they are refused with the demo&apos;s reason. A source without a kind is never
        exempted. The kit&apos;s parts follow by themselves: ShareCard&apos;s remove, withdraw and lowering,
        InvitationsPanel&apos;s revoke, Sessions, DeleteAccount, EmailChange, Profile, CompleteNameDialog, the
        translation verdicts and PlanChangeConfirm. {code("useWriteLock(scope)")} answers a hand-rolled toggle;{" "}
        {code("writeLockFor(lock, scope)")} is the same answer, pure, for {code("confirm({ commit })")}.
      </Note>
    </Example>
  );
}

/* ── ShareCard under a billing lock (decision 26 as amended) ─────────────── */

/** Narrowest first — the order is what tells a lowering from a raise. */
const ROLES: ShareRole[] = [
  { key: "viewer", label: "Viewer", tone: "neutral", description: "Can open and read it." },
  { key: "editor", label: "Editor", tone: "info", description: "Can change it." },
  { key: "manager", label: "Manager", tone: "brand", description: "Can change it and share it." },
];

export function ShareCardBillingLock033Demo() {
  const demoLabels = useDemoLabels();
  const [billing, setBilling] = useState(true);
  const [demo, setDemo] = useState(false);
  const [grantees, setGrantees] = useState<ShareGrantee[]>([
    { id: 1, name: "Ben Sample", email: "ben@example.com", role: "viewer" },
    { id: 2, name: "Cleo Muster", email: "cleo@example.com", role: "editor" },
    { id: 3, name: "Dan Beispiel", email: "dan@example.com", role: "manager" },
  ]);
  const [pending, setPending] = useState<SharePendingGrant[]>([
    { id: 9, email: "new.helper@example.com", role: "viewer", link: "https://example.com/invite/9" },
  ]);
  const [last, setLast] = useState("—");
  const next = useRef(10);
  const billingLock = useBillingWriteLock(billing, { guest: false });
  const lock = combineWriteLocks([{ locked: demo, reason: demoLabels.writeLocked, kind: "demo" }, billingLock]);
  return (
    <Example label="ShareCard under a billing lock — removing stays, adding does not" hint="remove, withdraw and lowering a role live; add and raising locked, with the billing reason">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <Switch size="sm" label="Billing lapsed" checked={billing} onCheckedChange={setBilling} />
        <Switch size="sm" label="Demo as well" checked={demo} onCheckedChange={setDemo} />
      </div>
      <WriteLockProvider {...lock}>
        <ShareCard
          title="Share “Allotment 7”"
          roles={ROLES}
          grantees={grantees}
          pending={pending}
          onAdd={async (request: ShareAddRequest) => {
            setLast(`add ${request.email ?? "?"} as ${request.role}`);
            await beat(400);
            setPending((all) => [...all, { id: ++next.current, email: request.email, role: request.role }]);
          }}
          onRoleChange={async (grantee, role) => {
            setLast(`role ${grantee.name} → ${role}`);
            await beat(400);
            setGrantees((all) => all.map((g) => (g.id === grantee.id ? { ...g, role } : g)));
          }}
          onRemove={async (grantee) => {
            setLast(`remove ${grantee.name}`);
            await beat(400);
            setGrantees((all) => all.filter((g) => g.id !== grantee.id));
          }}
          onRevokePending={async (grant) => {
            setLast(`withdraw ${grant.email ?? "open link"}`);
            await beat(400);
            setPending((all) => all.filter((p) => p.id !== grant.id));
          }}
        />
      </WriteLockProvider>
      <p className={`mt-2 ${READOUT}`}>last callback: {last}</p>
      <Note>
        A lapsed plan allows what removes access and refuses what grants it (§12.13). So under billing: removing a
        grantee and withdrawing an invitation stay live; the add form is locked with the billing reason; and the
        role choice reads `roles` narrowest first — Ben, a viewer, has only raises (locked); Cleo, an editor, can be
        lowered to viewer while manager is dimmed and refused; Dan, a manager, can only be lowered (live). Under the
        demo&apos;s lock nothing moves. Kurvenschmiede&apos;s server refuses exactly that: a widening while lapsed,
        not a narrowing. Pass `roles` in that order — the doc of `SharePanelProps.roles` now says so.
      </Note>
    </Example>
  );
}

/** The page's 0.33 part, in reading order. */
export function Billing033Demo() {
  return (
    <>
      <CheckoutReturn033Demo />
      <PortalTargets033Demo />
      <PlanLimitToast033Demo />
      <PayPage033Demo />
      <WriteLockKinds033Demo />
      <ShareCardBillingLock033Demo />
    </>
  );
}
