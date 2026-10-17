import { useState } from "react";
import {
  BillingBanner,
  Button,
  CancelSubscriptionConfirm,
  PAY_PAGE_APPS,
  PlanPicker,
  PlanSwitchConfirm,
  SubscriptionActions,
  Switch,
  WriteLockProvider,
  checkoutFingerprint,
  combineWriteLocks,
  isPermanentGrant,
  openProviderPage,
  useBillingLabels,
  useBillingWriteLock,
  useCancelRequest,
} from "@eifi1/ui-kit";
import type { BillingPlan, PlanChoice, PlanSwitchPreview, PlanSwitchSide } from "@eifi1/ui-kit";
import { Example, Note, OutTable, READOUT_WRAP, beat, code } from "../lib/section";

/**
 * SUBSCRIPTION — billing's family file (the showcase's rule: a release adds to the
 * family, not a `*-0NN-demo.tsx`). Since 0.39 (docs/billing-harmonization.md §15): the
 * payer's plan switch — Paddle's preview as a figure the payer agrees to, under a lapsed
 * plan too — the refusals' words, and the app map every pay page serves. On the
 * "Subscription" page, after billing-033-demo; the older billing specimens move here when
 * next touched.
 *
 * "Ada's Garden Planner" and its payer are SYNTHETIC. Every request is the app's part,
 * played by a timer.
 */

const NAMES: Record<string, string> = { seedling: "Seedling", pro: "Pro", grove: "Grove" };
const planName = (code: string) => NAMES[code] ?? code;

/** The payer pays Pro monthly, in francs, and owns 7 beds and 4 helpers. */
const PAID: PlanSwitchSide = { plan: "pro", interval: "month" };
const USAGE = { beds: 7, helpers: 4 };

/** What the pretend `POST /billing/plan/preview` answers, per pick. */
function previewFor(to: PlanSwitchSide): PlanSwitchPreview {
  if (to.plan === "grove") {
    return {
      currency: "CHF",
      now_minor: 11_640,
      next_minor: 19_900,
      next_billed_at: "2027-10-09T08:00:00Z",
      ...to,
      over_limit: [],
      limits: { beds: null, helpers: 20 },
      usage: USAGE,
    };
  }
  return {
    currency: "CHF",
    now_minor: -620,
    next_minor: 490,
    next_billed_at: "2026-11-09T08:00:00Z",
    ...to,
    over_limit: ["beds", "helpers"],
    limits: { beds: 1, helpers: 2 },
    usage: USAGE,
  };
}

const PICKS: Array<{ label: string; to: PlanSwitchSide }> = [
  { label: "Upgrade to Grove, yearly", to: { plan: "grove", interval: "year" } },
  { label: "Switch to Seedling", to: { plan: "seedling", interval: "month" } },
];

export function PlanSwitch039Demo() {
  const [lapsed, setLapsed] = useState(true);
  const [paid, setPaid] = useState<PlanSwitchSide>(PAID);
  const [pick, setPick] = useState<PlanSwitchSide | null>(null);
  const [preview, setPreview] = useState<PlanSwitchPreview | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const billingLock = useBillingWriteLock(lapsed);
  const lock = combineWriteLocks([billingLock]);
  const overview = { plan: paid.plan, status: "active" as const, source: "provider", in_good_standing: !lapsed, paid };

  const open = async (to: PlanSwitchSide) => {
    setPick(to);
    setPreview(undefined);
    await beat(700);
    setPreview(previewFor(to));
  };
  const confirm = async () => {
    if (!pick) return;
    setPending(true);
    await beat(800);
    setPending(false);
    setPaid(pick);
    setPick(null);
  };

  return (
    <Example
      label="The payer's plan switch — PlanSwitchConfirm"
      hint="a pick while a subscription runs: Paddle's preview, prorated at once; no billing lock holds it"
    >
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <Switch size="sm" label="The plan has lapsed (billing lock)" checked={lapsed} onCheckedChange={setLapsed} />
      </div>
      <WriteLockProvider {...lock}>
        <div className="flex flex-wrap gap-2">
          {PICKS.map(({ label, to }) => (
            <Button key={label} variant="secondary" onClick={() => void open(to)}>
              {label}
            </Button>
          ))}
        </div>
        {pick && (
          <PlanSwitchConfirm
            open
            onOpenChange={(next) => !next && !pending && setPick(null)}
            from={paid}
            to={pick}
            preview={preview}
            pending={pending}
            planName={planName}
            dimensionLabels={{ beds: { one: "bed", other: "beds" }, helpers: "Helpers" }}
            onConfirm={() => void confirm()}
          />
        )}
      </WriteLockProvider>
      <OutTable
        rows={[
          ["overview.paid", JSON.stringify(paid)],
          ["checkoutFingerprint(overview)", checkoutFingerprint(overview)],
        ]}
      />
      <Note>
        Since 0.39. While a provider subscription runs, the app sends a PlanPicker pick to {code("POST /billing/plan/preview")}{" "}
        and opens the confirm with the answer; Confirm is {code("POST /billing/plan")}. The switch is immediate and
        prorated: an upgrade charges the difference now, a downgrade credits the unused part towards the next
        charges, and the dimensions over the new limit are said before the payer agrees (a limit gates creation
        only). The confirm is `COMMIT_EXCEPT_BILLING`: a lapsed payer may change plan, as they may pay. The row
        follows by webhook; {code("checkoutFingerprint")} reads `paid`, so the "processing" wait after a switch
        lands even under a grant, under the checkout&apos;s own storage key.
      </Note>
    </Example>
  );
}

export function PayPageApps039Demo() {
  const labels = useBillingLabels();
  return (
    <Example
      label="Every pay page serves any app — PAY_PAGE_APPS"
      hint="the page names the app from the transaction's custom data, not from its domain"
    >
      <OutTable
        rows={Object.entries(PAY_PAGE_APPS).map(([tag, app]) => [
          `PAY_PAGE_APPS.${tag}`,
          `${app.name} · ${app.returnUrl} · ${app.termsUrl} · ${app.privacyUrl}`,
        ])}
      />
      <p className="mt-3 text-sm text-secondary">The words the switch and the pay page add, in this page&apos;s language:</p>
      <OutTable
        rows={[
          ["billing.payDone — paid, for a transaction that names no app", labels.payDone],
          ["billing.alreadySubscribed — 409 billing_already_subscribed", labels.alreadySubscribed],
          ["billing.notSubscribed — 409 billing_not_subscribed", labels.notSubscribed],
          ["billing.planUnchanged — 409 billing_plan_unchanged", labels.planUnchanged],
          ["billing.planNotSold — 422 billing_plan_not_sold", labels.planNotSold],
        ]}
      />
      <Note>
        Since 0.39. Paddle has one default payment link per account ({code("pay.keksdose.app")}), and its e-mails send every
        app&apos;s payment-method update there. So each pay page reads {code("custom_data.app")} on{" "}
        {code("checkout.loaded")}, frames that app from the map in its {code("pay-config.json")}, and on{" "}
        {code("checkout.completed")} goes to that app&apos;s {code("checkoutReturnUrl(returnUrl)")}. A tag the map
        doesn&apos;t know gets no name and no Back, keeps the host&apos;s Terms and Privacy, and says `payDone` once
        paid. The bin writes the map: {code("eifi1-pay-page --out /srv-pay --app keksdose --app-url \"$PAY_APP_URL\"")}.
      </Note>
    </Example>
  );
}

/* ── 0.42 (§16): the portal for the buyer only, the in-app cancel and its undo ── */

/** The company's buyer, SYNTHETIC. */
const BUYER = "Ada Gardener";
const PERIOD_END = "2026-11-09T08:00:00Z";

export function BuyerOnly042Demo() {
  const [viewerIsBuyer, setViewerIsBuyer] = useState(false);
  const [buyerLeft, setBuyerLeft] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState<"cancel" | "resume" | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const portal = viewerIsBuyer ? "open" : "buyer_only";
  const buyerName = buyerLeft ? null : BUYER;

  const cancel = async () => {
    setPending("cancel");
    setLast("POST /billing/cancel");
    await beat(900);
    setPending(null);
    setAsking(false);
    setScheduled(true);
    setLast("POST /billing/cancel → 204; the webhook sets cancel_at_period_end");
  };
  const resume = async () => {
    setPending("resume");
    setLast("POST /billing/resume");
    await beat(900);
    setPending(null);
    setScheduled(false);
    setLast("POST /billing/resume → 204; the scheduled cancel is gone");
  };
  const toPortal = (target: string) => setLast(`POST /billing/portal {"target":"${target}"} → {url}`);

  return (
    <Example
      label="The portal for the buyer only — SubscriptionActions, CancelSubscriptionConfirm"
      hint="portal and buyer_name from the overview; another admin cancels in the app, any admin keeps it"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Switch size="sm" label="The viewer is the buyer" checked={viewerIsBuyer} onCheckedChange={setViewerIsBuyer} />
          <Switch size="sm" label="The buyer has left the company" checked={buyerLeft} onCheckedChange={setBuyerLeft} />
        </div>
        <SubscriptionActions
          portal={portal}
          buyerName={buyerName}
          onPortal={toPortal}
          onCancelInApp={() => setAsking(true)}
          cancelAtPeriodEnd={scheduled}
          onResume={() => void resume()}
          pending={pending === "resume" ? "resume" : null}
        />
        <BillingBanner
          kind="payment-failed"
          variant="box"
          portal={portal}
          buyerName={buyerName}
          onAction={() => toPortal("payment_method")}
        />
        <p className={READOUT_WRAP} aria-live="polite">
          {last ?? "No request yet."}
        </p>
        <CancelSubscriptionConfirm
          open={asking}
          onOpenChange={(open) => !open && pending === null && setAsking(false)}
          periodEnd={PERIOD_END}
          pending={pending === "cancel"}
          onConfirm={() => void cancel()}
        />
      </div>
      <Note>
        Since 0.42. Where the company stores a buyer ({code("provider_payer_user_id")}), the provider&apos;s portal
        opens for that admin only: for any other admin {code("portal")} is {code('"buyer_only"')}, &ldquo;Payment
        and invoices&rdquo; becomes a caption that names the buyer, and &ldquo;Cancel subscription&rdquo; opens the
        in-app confirm, whose button is {code("POST /billing/cancel")}. The subscription ends at its period&apos;s
        end; while that is scheduled, &ldquo;Keep subscription&rdquo; ({code("POST /billing/resume")}) stands in the
        cancel&apos;s place, for the buyer too. The payment-failed banner says who can change the card, with no
        button. Neither confirm takes the billing lock.
      </Note>
    </Example>
  );
}

/* ── 0.42 (§16.2 decision 5, §16.8 B): the permanent-grant warning ── */

const GRANT_PLANS: BillingPlan[] = [
  { code: "seedling", name: "Seedling" },
  { code: "pro", name: "Pro", prices: { CHF: { year: 4900, month: 490 } } },
  { code: "grove", name: "Grove", prices: { CHF: { year: 19900 } } },
];

export function GrantWarning042Demo() {
  const [permanent, setPermanent] = useState(true);
  const [bought, setBought] = useState(false);
  const [pick, setPick] = useState<PlanSwitchSide | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const overview = {
    status: "comped" as const,
    source: "manual" as const,
    comped_until: permanent ? null : "2027-03-31T00:00:00Z",
    switching: bought,
  };
  const grant = isPermanentGrant(overview);

  const choose = (choice: PlanChoice) => {
    if (overview.switching) setPick({ plan: choice.plan, interval: choice.interval });
    else {
      setLast(`POST /billing/checkout ${JSON.stringify(choice)}`);
      setBought(true);
    }
  };

  return (
    <Example
      label="The permanent-grant warning — PlanPicker, PlanSwitchConfirm"
      hint="permanentGrant={isPermanentGrant(overview)}; the warning once, before the checkout or in the switch"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Switch size="sm" label="The grant has no end" checked={permanent} onCheckedChange={setPermanent} />
          <Switch size="sm" label="A subscription runs (switching)" checked={bought} onCheckedChange={setBought} />
        </div>
        <PlanPicker
          plans={GRANT_PLANS}
          defaultCurrency="CHF"
          defaultValue="grove"
          current={bought ? "pro" : undefined}
          permanentGrant={grant}
          switching={overview.switching}
          onChoose={choose}
        />
        <OutTable
          rows={[
            ["isPermanentGrant(overview)", String(grant)],
            ["last request", last ?? "none yet"],
          ]}
        />
        {pick && (
          <PlanSwitchConfirm
            open
            onOpenChange={(next) => !next && setPick(null)}
            from={{ plan: "pro", interval: "year" }}
            to={pick}
            preview={previewFor(pick)}
            planName={planName}
            permanentGrant={grant}
            onConfirm={() => {
              setLast(`POST /billing/plan ${JSON.stringify(pick)}`);
              setPick(null);
            }}
          />
        )}
      </div>
      <Note>
        Since 0.42. Under an operator&apos;s grant without an end ({code("status: comped")},{" "}
        {code("source: manual")}, {code("comped_until: null")}) a purchase leaves the plan on the grant&apos;s: the
        payer would pay for a plan that never applies. The kit warns, it doesn&apos;t refuse. On the way to the
        checkout PlanPicker asks first (&ldquo;Buy anyway&rdquo;, &ldquo;Back&rdquo;); told {code("switching")}, it
        hands the pick on and PlanSwitchConfirm shows the same words above its figures, so the payer reads them
        once. {code("source")} is checked explicitly: a pre-launch beta row has no end date either.
      </Note>
    </Example>
  );
}

/* ── 0.43 (§17): the portal in a new tab; the in-app cancel shows at once ── */

/** A stand-in for `window`, so the specimen opens no real tab: the tab it "opens" logs
 *  where it was pointed. */
function pretendWindow(log: (line: string) => void, blocked: boolean): Window {
  const tab = {
    closed: false,
    opener: {} as unknown,
    location: {
      set href(url: string) {
        log(`the new tab goes to ${url}; this page stays`);
      },
    },
    close() {
      this.closed = true;
      log("the new tab is closed again");
    },
  };
  return {
    open: () => (blocked ? null : tab),
    location: { assign: (url: string) => log(`the pop-up was blocked: this page goes to ${url}`) },
  } as unknown as Window;
}

export function Portal043Demo() {
  const [blocked, setBlocked] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [rowScheduled, setRowScheduled] = useState(false);
  const [pending, setPending] = useState<"manage" | "cancel" | "resume" | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const request = useCancelRequest(rowScheduled);

  const toPortal = (target: string) => {
    setPending("manage");
    setLast(`POST /billing/portal {"target":"${target}"}`);
    openProviderPage(
      async () => {
        await beat(700);
        if (refuse) throw new Error("409 billing_not_at_provider");
        return `https://customer-portal.paddle.com/…/${target}`;
      },
      { window: pretendWindow(setLast, blocked) },
    )
      .catch((error: Error) => setLast(`${error.message}: the app shows its error`))
      .finally(() => setPending(null));
  };
  // The in-app cancel and its undo: 204 at once, the webhook three seconds later.
  const ask = async (what: "cancel" | "resume") => {
    setPending(what);
    setLast(`POST /billing/${what} → 204`);
    await beat(600);
    setPending(null);
    request.noteAsked();
    await beat(3000);
    setRowScheduled(what === "cancel");
    setLast(`subscription.updated landed: cancel_at_period_end = ${what === "cancel"}`);
  };

  return (
    <Example
      label="The portal in a new tab — openProviderPage, useCancelRequest"
      hint="the tab opens inside the click; the plan line shows a cancel at once"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Switch size="sm" label="The browser blocks pop-ups" checked={blocked} onCheckedChange={setBlocked} />
          <Switch size="sm" label="The server refuses the portal" checked={refuse} onCheckedChange={setRefuse} />
        </div>
        <p className="text-sm text-muted" data-plan-line="">
          Pro · {request.cancelScheduled ? "Cancels on 9 November 2026" : "Renews on 9 November 2026"}
        </p>
        <SubscriptionActions
          onManage={() => toPortal("overview")}
          onCancelInApp={() => void ask("cancel")}
          cancelAtPeriodEnd={rowScheduled}
          cancelRequested={request.requested}
          onResume={() => void ask("resume")}
          pending={pending}
          providerName="Paddle"
          appName="Ada’s Garden Planner"
        />
        <BillingBanner kind="payment-failed" variant="box" onAction={() => toPortal("payment_method")} />
        <p className={READOUT_WRAP} aria-live="polite">
          {last ?? "No request yet."}
        </p>
      </div>
      <Note>
        Since 0.43 (§17). The app&apos;s portal handler calls {code("openProviderPage(fetchUrl)")}: it opens{" "}
        {code("about:blank")} inside the click with {code("opener = null")}, awaits {code("POST /billing/portal")},
        and points the tab at the answer; a refusal closes the tab and rethrows, a blocked pop-up sends this page
        instead. The portal&apos;s actions carry the external-link mark and the note names the provider and the
        app; the checkout stays in the same tab. After the in-app cancel, {code("useCancelRequest")} shows
        &ldquo;Cancels on&rdquo; and &ldquo;Keep subscription&rdquo; at once, until the webhook moves the row.
      </Note>
    </Example>
  );
}

export function BillingSwitchDemo() {
  return (
    <>
      <PlanSwitch039Demo />
      <PayPageApps039Demo />
      <BuyerOnly042Demo />
      <GrantWarning042Demo />
      <Portal043Demo />
    </>
  );
}
