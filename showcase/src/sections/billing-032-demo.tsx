import { useState } from "react";
import type { ContextType, ReactNode } from "react";
import { MemoryRouter, UNSAFE_LocationContext, useLocation } from "react-router";
import {
  BillingBanner,
  Button,
  DEFAULT_DEMO_LABELS,
  LegalKitSection,
  PlanLimitNotice,
  PlanPicker,
  SUBSCRIPTION_STATUSES,
  SubscriptionActions,
  SubscriptionStatusChip,
  Switch,
  ToggleGroup,
  WriteLockProvider,
  combineWriteLocks,
  formatFileSize,
  formatPlanPrice,
  useBillingLockReason,
} from "@eifi1/ui-kit";
import type { BillingPlan, LegalOperator, PlanChoice } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * SUBSCRIPTION (0.32, docs/billing-harmonization.md §3.3, §3.4, §7, §8, §12): the plan
 * picker of a made-up app in CHF and EUR, monthly and yearly; the status chips; every
 * billing banner, the guest's and "payment processing" included; the plan-limit notice in
 * both modes; the read-only lock combined with the demo's; the portal's two actions; and
 * the imprint's commercial disclaimer. Belongs on a new "Subscription" page.
 *
 * "Ada's Garden Planner", its plans and prices are SYNTHETIC, like every person here.
 * Every callback is the app's part, played by a timer: the kit sends no request.
 */

// `anywhere`: `billingDaysLeft(trial_ends_at)` has no space to break at, and at Extra large
// on a phone it is wider than the note.
const code = (s: string) => <code className="font-mono [overflow-wrap:anywhere]">{s}</code>;
const beat = (ms = 1200) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** React Router refuses a router inside a router; resetting the location context is its
 *  documented escape hatch (the landing page's specimens do the same). The banners'
 *  links move THIS router, not the showcase's. */
const NO_ROUTER = null as unknown as ContextType<typeof UNSAFE_LocationContext>;

function Sandbox({ children, start = "/beds" }: { children: ReactNode; start?: string }) {
  return (
    <UNSAFE_LocationContext.Provider value={NO_ROUTER}>
      <MemoryRouter initialEntries={[start]}>
        {children}
        <Where />
      </MemoryRouter>
    </UNSAFE_LocationContext.Provider>
  );
}

function Where() {
  const { pathname } = useLocation();
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">route: {pathname}</p>;
}

/* ── The catalogue (server-kit PlanSpec, §3.1) ───────────────────────────── */

const PLANS: BillingPlan[] = [
  {
    code: "seedling",
    name: "Seedling",
    description: "For one plot and a first season.",
    limits: { beds: 3, helpers: 0, photos: 200 * 1024 ** 2 },
    features: ["Planting calendar", "Watering reminders"],
  },
  {
    code: "gardener",
    name: "Gardener",
    description: "For a whole allotment, with help.",
    prices: { CHF: { year: 4900, month: 490 }, EUR: { year: 4500, month: 450 } },
    limits: { beds: 30, helpers: 3, photos: 5 * 1024 ** 3 },
    features: ["Planting calendar", "Watering reminders", "Harvest log", "Shared beds"],
  },
  {
    code: "estate",
    name: "Estate",
    description: "For a community garden. Yearly only.",
    prices: { CHF: { year: 14900 }, EUR: { year: 13900 } },
    limits: { beds: null, helpers: null, photos: null },
    features: ["Everything in Gardener", "Plot map for every member"],
  },
];

const DIMENSIONS = { beds: "Beds", helpers: "Helpers", photos: "Photo storage" };
const formatLimit = (dimension: string, value: number) =>
  dimension === "photos" ? formatFileSize(value) : String(value);

/* ── PlanPicker ──────────────────────────────────────────────────────────── */

export function PlanPicker032Demo() {
  const [current, setCurrent] = useState<"none" | "gardener">("none");
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [chosen, setChosen] = useState<PlanChoice | null>(null);
  const choose = async (choice: PlanChoice) => {
    setPending(true);
    await beat();
    setPending(false);
    setChosen(choice);
  };
  return (
    <Example
      label="PlanPicker — Ada's Garden Planner, CHF and EUR, yearly and monthly"
      hint="PlanCard on ChoiceCard; gross prices through formatMoney; §7, §12.17"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <ToggleGroup
          aria-label="Current plan"
          value={current}
          onChange={(v) => setCurrent(v)}
          options={[
            { value: "none", label: "On a trial" },
            { value: "gardener", label: "Paying for Gardener" },
          ]}
        />
        <Switch
          size="sm"
          label="The provider's price preview"
          checked={preview}
          onChange={(e) => setPreview(e.target.checked)}
        />
      </div>
      <PlanPicker
        key={current}
        plans={PLANS}
        current={current === "none" ? null : current}
        legend="Choose a plan for Ada's Garden Planner"
        dimensionLabels={DIMENSIONS}
        formatLimit={formatLimit}
        onChoose={(choice) => void choose(choice)}
        pending={pending}
        pricePreview={
          preview
            ? (plan, { interval, currency }) => {
                const minor = plan.prices?.[currency]?.[interval];
                // A made-up preview: the provider's own figure, localised for the buyer.
                return minor ? (
                  <span>
                    {formatPlanPrice(minor, currency)}
                    <span className="ms-1 text-xs font-normal text-[var(--text-muted)]">(provider)</span>
                  </span>
                ) : undefined;
              }
            : undefined
        }
      />
      <p className="mt-2 text-xs text-[var(--text-muted)]" aria-live="polite">
        {chosen
          ? `onChoose(${JSON.stringify(chosen)}) — the app now calls POST /billing/checkout and follows its url.`
          : "Pick a plan and press the button."}
      </p>
      <Note>
        Yearly comes first (§12.17: about 5 % + 0.50 per transaction makes a small monthly price expensive). The
        catalogue holds GROSS prices in minor units per currency and period; a whole amount drops its decimals
        (&ldquo;CHF 49&rdquo;), any other keeps both (&ldquo;CHF 4.90&rdquo;). Estate has no monthly price, so it is
        &ldquo;not offered&rdquo; in that period and cannot be picked. With {code("current")} the button says{" "}
        &ldquo;Upgrade to …&rdquo; or &ldquo;Switch to …&rdquo;, and is off on the current plan; without one
        (a trial, an ended plan) every plan is &ldquo;Choose …&rdquo;. Limits read {code("null")} as
        &ldquo;Unlimited&rdquo;; {code("formatLimit")} writes the storage in bytes.
      </Note>
    </Example>
  );
}

/* ── SubscriptionStatusChip ──────────────────────────────────────────────── */

export function SubscriptionStatus032Demo() {
  return (
    <Example label="SubscriptionStatusChip — the status vocabulary" hint="a word, never colour alone; §3.2, §6">
      <div className="flex flex-wrap gap-2">
        {SUBSCRIPTION_STATUSES.map((status) => (
          <SubscriptionStatusChip key={status} status={status} />
        ))}
      </div>
      <Note>
        {code("trialing")} Trial, {code("active")} Active, {code("past_due")} Payment overdue (still in good standing
        while the provider retries), {code("canceled")} Cancelled, {code("expired")} Expired (read-only),{" "}
        {code("comped")} Complimentary (a beta user&apos;s 12 months, an operator&apos;s grant). The roster&apos;s{" "}
        {code("extra")} column shows it beside the plan.
      </Note>
    </Example>
  );
}

/* ── BillingBanner ───────────────────────────────────────────────────────── */

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs text-[var(--text-muted)]">{label}</p>
      {children}
    </div>
  );
}

export function BillingBanners032Demo() {
  const [portal, setPortal] = useState(false);
  const [processing, setProcessing] = useState(true);
  const [checking, setChecking] = useState(false);
  const openPortal = async () => {
    setPortal(true);
    await beat();
    setPortal(false);
  };
  const checkAgain = async () => {
    setChecking(true);
    await beat();
    setChecking(false);
    setProcessing(false);
  };
  const SUB = "/settings/subscription";
  return (
    <Example label="BillingBanner — every preset" hint="AlertBanner strip; the app's action, a link or a callback">
      <Sandbox>
        <div className="space-y-3">
          <Labelled label="trial-ending, 5 days — info until the last three">
            <BillingBanner kind="trial-ending" daysLeft={5} actionHref={SUB} />
          </Labelled>
          <Labelled label="trial-ending, 1 day — then a warning">
            <BillingBanner kind="trial-ending" daysLeft={1} actionHref={SUB} />
          </Labelled>
          <Labelled label="grant-ending, 6 days — a beta user's 12 months">
            <BillingBanner kind="grant-ending" daysLeft={6} actionHref={SUB} />
          </Labelled>
          <Labelled label="payment-failed — the action opens the provider's portal (a callback)">
            <BillingBanner kind="payment-failed" onAction={() => void openPortal()} actionPending={portal} />
          </Labelled>
          <Labelled label="plan-ended — read-only, never locked">
            <BillingBanner kind="plan-ended" actionHref={SUB} />
          </Labelled>
          <Labelled label="guest, with the item's name — never the owner's status (§12.6)">
            <BillingBanner kind="guest" item="Allotment 7" />
          </Labelled>
          <Labelled label="guest, without one">
            <BillingBanner kind="guest" />
          </Labelled>
          <Labelled label="processing — back from checkout before the webhook (§12.21)">
            {processing ? (
              <BillingBanner kind="processing" onAction={() => void checkAgain()} actionPending={checking} />
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setProcessing(true)}>
                Paid — show the processing banner again
              </Button>
            )}
          </Labelled>
          <Labelled label="variant box — the same message on the subscription page">
            <BillingBanner kind="processing" variant="box" />
          </Labelled>
        </div>
      </Sandbox>
      <Note>
        The app picks the banner from {code("GET /billing/overview")} and hides them all while billing is off; the
        trial and grant banners start 7 days before the end ({code("billingDaysLeft(trial_ends_at)")}). The guest
        banner takes no status at all — its type lets none in. {code("processing")} is a live region; the page
        re-polls the overview until the webhook landed, and the banner goes.
      </Note>
    </Example>
  );
}

/* ── PlanLimitNotice ─────────────────────────────────────────────────────── */

export function PlanLimitNotice032Demo() {
  return (
    <Example label="PlanLimitNotice — upgrade and contact" hint="402 plan_limit; isPlanLimit(err); §3.4">
      <Sandbox>
        <div className="space-y-3">
          <PlanLimitNotice
            mode="upgrade"
            href="/settings/subscription"
            dimension="beds"
            dimensionLabel="Beds"
            plan="seedling"
            used={3}
            limit={3}
          />
          <PlanLimitNotice
            mode="contact"
            email="support@example.com"
            dimension="photos"
            dimensionLabel="Photo storage"
            used={260 * 1024 ** 2}
            limit={200 * 1024 ** 2}
            formatValue={(bytes) => formatFileSize(bytes)}
          />
        </div>
      </Sandbox>
      <Note>
        {code("const hit = isPlanLimit(err); hit && <PlanLimitNotice {...hit} mode=\"upgrade\" href=… />")} — the
        refusal&apos;s {code("dimension")}, {code("plan")}, {code("limit")} and {code("used")} spread in whole.{" "}
        {code("upgrade")} links to the subscription page; {code("contact")} (the operator grants plans by hand) opens
        a mail to support. A downgrade never deletes what is over the new limit, so {code("used")} may pass it: the
        bar stays full and the figures say the rest.
      </Note>
    </Example>
  );
}

/* ── The read-only lock ──────────────────────────────────────────────────── */

export function BillingLock032Demo() {
  const [demo, setDemo] = useState(false);
  const [billing, setBilling] = useState(true);
  const [guest, setGuest] = useState(false);
  const billingReason = useBillingLockReason({ guest, item: guest ? "Allotment 7" : undefined });
  const lock = combineWriteLocks([
    { locked: demo, reason: DEFAULT_DEMO_LABELS.writeLocked },
    { locked: billing, reason: billingReason },
  ]);
  return (
    <Example label="The read-only lock — the demo's and billing's in one provider" hint="combineWriteLocks; §3.3, §12.6">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <Switch size="sm" label="Demo (read-only data)" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
        <Switch size="sm" label="Billing lapsed" checked={billing} onChange={(e) => setBilling(e.target.checked)} />
        <Switch size="sm" label="Reader is a guest" checked={guest} onChange={(e) => setGuest(e.target.checked)} />
      </div>
      <WriteLockProvider {...lock}>
        <div className="flex flex-wrap items-center gap-2">
          <Button commit>Save the bed plan</Button>
          <Button commit variant="secondary">
            Add a bed
          </Button>
          <span className="text-xs text-[var(--text-muted)]">
            {lock.locked ? "Locked — hover or focus a button for the reason." : "Unlocked."}
          </span>
        </div>
      </WriteLockProvider>
      <Note>
        {code("<WriteLockProvider {...combineWriteLocks([demoLock, billingLock])}>")} — locked when either is, with
        the first locked reason in the server&apos;s order (the demo&apos;s 403 before billing&apos;s 402, §12.3). Two
        nested providers would not do: an inner {code("locked={false}")} reopens an outer lock on purpose. A guest
        reads &ldquo;for now; its owner can lift that&rdquo;, never the owner&apos;s status.
      </Note>
    </Example>
  );
}

/* ── SubscriptionActions ─────────────────────────────────────────────────── */

export function SubscriptionActions032Demo() {
  const [pending, setPending] = useState<"manage" | "cancel" | null>(null);
  const open = async (which: "manage" | "cancel") => {
    setPending(which);
    await beat();
    setPending(null);
  };
  return (
    <Example label="SubscriptionActions — the portal, and a visible cancel" hint="§2.8, §12.26">
      <SubscriptionActions
        onManage={() => void open("manage")}
        onCancel={() => void open("cancel")}
        pending={pending}
      />
      <Note>
        Payment method and invoices live in the provider&apos;s hosted portal, never in the app. The cancel link stays
        in plain sight: Germany&apos;s cancellation button (§312k BGB) and the EU withdrawal function are in the
        portal, and the app&apos;s page must not hide the way there.
      </Note>
    </Example>
  );
}

/* ── The commercial disclaimer ───────────────────────────────────────────── */

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
};

export function CommercialDisclaimer032Demo() {
  const [variant, setVariant] = useState<"non-commercial" | "commercial">("commercial");
  return (
    <Example label="The imprint's disclaimer — the commercial variant" hint="LegalKitSection variant; §8">
      <div className="mb-3">
        <ToggleGroup
          aria-label="Disclaimer"
          value={variant}
          onChange={(v) => setVariant(v)}
          options={[
            { value: "non-commercial", label: "Non-commercial (default)" },
            { value: "commercial", label: "Commercial" },
          ]}
        />
      </div>
      <div className="rounded-lg border border-[var(--border)] p-4">
        <LegalKitSection page="impressum" section="disclaimer" variant={variant} headingAs="h3" operator={OPERATOR} />
      </div>
      <Note>
        {code('<LegalKitSection section="disclaimer" variant="commercial" />')} — chosen per app, in the release that
        turns its billing on. The Merchant of Record sells in its own name, so the beta&apos;s &ldquo;private,
        non-commercial&rdquo; would be untrue; the title and the {code("#disclaimer")} id stay.
      </Note>
    </Example>
  );
}

/** The whole "Subscription" page. */
export function Billing032Demo() {
  return (
    <>
      <PlanPicker032Demo />
      <SubscriptionStatus032Demo />
      <BillingBanners032Demo />
      <PlanLimitNotice032Demo />
      <BillingLock032Demo />
      <SubscriptionActions032Demo />
      <CommercialDisclaimer032Demo />
    </>
  );
}
