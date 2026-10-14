import { useState } from "react";
import {
  Button,
  PAY_PAGE_APPS,
  PlanSwitchConfirm,
  Switch,
  WriteLockProvider,
  checkoutFingerprint,
  combineWriteLocks,
  useBillingLabels,
  useBillingWriteLock,
} from "@eifi1/ui-kit";
import type { PlanSwitchPreview, PlanSwitchSide } from "@eifi1/ui-kit";
import { Example, Note, OutTable, beat, code } from "../lib/section";

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

export function BillingSwitchDemo() {
  return (
    <>
      <PlanSwitch039Demo />
      <PayPageApps039Demo />
    </>
  );
}
