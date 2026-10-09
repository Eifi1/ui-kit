import { useCallback, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import {
  DataTable,
  PlanChangeConfirm,
  Switch,
  WriteLockProvider,
  combineWriteLocks,
  rowActionsColumn,
  toast,
  useBillingWriteLock,
  usePlanChangeResult,
  usePlanColumn,
} from "@eifi1/ui-kit";
import type { DataTableColumn, PlanChange, PlanChangeLine, PlanChangeOutcome, SubscriptionStatus } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * THE OPERATOR'S PLAN PARTS (0.33, docs/billing-harmonization.md §14.12, decision 27):
 * `planColumn` in the roster, `PlanChangeConfirm` for the grant, and `usePlanChangeResult`
 * for what the server's answer says — keksdose's column and dialog, lifted for all three
 * apps. Belongs on the "User administration" page, after the roster.
 *
 * The accounts, the plans and the pretend server are SYNTHETIC; nothing is sent.
 */

const beat = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const READOUT = "font-mono text-xs text-secondary [overflow-wrap:anywhere]";

/** `GET /admin/plans`: the codes with their limits and sort, no prices — whatever the
 *  billing switch says. The display names are the app's (§3.1). */
const PLANS = [
  { code: "seedling", name: "Seedling", limits: { beds: 3 } },
  { code: "gardener", name: "Gardener", limits: { beds: 30 } },
  { code: "estate", name: "Estate", limits: { beds: null } },
] as const;

const planName = (code: string) => PLANS.find((p) => p.code === code)?.name ?? code;
const PLAN_CODES = PLANS.map((p) => p.code);
const limitOf = (code: string | null) => (code ? (PLANS.find((p) => p.code === code)?.limits.beds ?? null) : 3);

interface Account {
  id: number;
  name: string;
  email: string;
  /** null: no subscription row. */
  plan: string | null;
  status?: SubscriptionStatus;
  beds: number;
  /** A beta's twelve months, still running. */
  beta?: boolean;
}

const ACCOUNTS: Account[] = [
  { id: 1, name: "Ada Example", email: "ada@example.com", plan: "gardener", status: "active", beds: 12 },
  { id: 2, name: "Ben Sample", email: "ben@example.com", plan: "seedling", status: "trialing", beds: 2 },
  { id: 3, name: "Cleo Muster", email: "cleo@example.com", plan: "gardener", status: "comped", beds: 7, beta: true },
  // keksdose's legacy upper case: the column reads a code without case (§12.16).
  { id: 4, name: "Dan Beispiel", email: "dan@example.com", plan: "SEEDLING", status: "expired", beds: 5 },
  { id: 5, name: "Eva Exemple", email: "eva@example.com", plan: null, beds: 0 },
];

const nameColumn: DataTableColumn<Account> = {
  key: "name",
  header: "Account",
  cell: (a) => (
    <span className="block min-w-0">
      <span className="block font-medium text-primary">{a.name}</span>
      <span className="block text-xs text-muted">{a.email}</span>
    </span>
  ),
  sortBy: (a) => a.name,
  mobilePrimary: true,
};

export function PlanChange033Demo() {
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS);
  const [billingOn, setBillingOn] = useState(true);
  const [ownLapsed, setOwnLapsed] = useState(true);
  const [changing, setChanging] = useState<Account | null>(null);
  const [lines, setLines] = useState<PlanChangeLine[]>([]);
  const resultLines = usePlanChangeResult();

  // Stable callbacks: usePlanColumn memoises the column on them.
  const plan = useCallback((a: Account) => a.plan, []);
  const status = useCallback((a: Account) => a.status, []);
  const usage = useCallback((a: Account) => ({ used: a.beds, limit: limitOf(a.plan?.toLowerCase() ?? null), label: "beds" }), []);
  const planColumn = usePlanColumn<Account>({
    plan,
    planName,
    status: billingOn ? status : undefined,
    usage,
    filterPlans: PLAN_CODES,
  });
  const columns = useMemo<DataTableColumn<Account>[]>(
    () => [
      nameColumn,
      planColumn,
      rowActionsColumn<Account>({
        name: (a) => a.name,
        tooltipSide: "start",
        actions: (a) => [{ label: "Change plan…", icon: CreditCard, onSelect: () => setChanging(a) }],
      }),
    ],
    [planColumn],
  );

  // The operator's own account may have lapsed: the grant is an admin route (§12.13), so
  // the dialog's confirm is exempt from billing's lock, built in.
  const ownLock = useBillingWriteLock(ownLapsed);
  const lock = combineWriteLocks([ownLock]);

  /** The pretend `POST /admin/users/{id}/plan` — server-kit 0.7's PlanChangeResponse. */
  const send = async (account: Account, change: PlanChange): Promise<PlanChangeOutcome> => {
    await beat();
    const previous = account.plan?.toLowerCase() ?? null;
    const limit = limitOf(change.plan);
    const res: PlanChangeOutcome = {
      previous_plan: previous,
      plan: change.plan,
      over_limit: limit !== null && account.beds > limit,
      limits: { beds: limit },
      usage: { beds: account.beds },
      // A running beta keeps its own end; only the plan moves (§12.34).
      kept_beta: account.beta === true,
      comped_until: account.beta ? null : (change.comped_until ?? null),
    };
    setAccounts((all) =>
      all.map((a) =>
        a.id === account.id
          ? { ...a, plan: change.plan, status: account.beta || change.comped_until ? "comped" : (a.status ?? "active") }
          : a,
      ),
    );
    return res;
  };

  return (
    <Example label="The plan column and the operator's plan change — planColumn, PlanChangeConfirm" hint="the roster's plan with its standing and usage; the grant at acknowledge; the answer as toasts">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
        <Switch size="sm" label="Billing is on" checked={billingOn} onCheckedChange={setBillingOn} />
        <Switch size="sm" label="Your own plan has lapsed" checked={ownLapsed} onCheckedChange={setOwnLapsed} />
      </div>
      <WriteLockProvider {...lock}>
        <DataTable rows={accounts} columns={columns} rowKey={(a) => a.id} rowName={(a) => a.name} paginated={false} />
        {changing && (
          <PlanChangeConfirm
            target={{ id: changing.id, first: changing.name.split(" ")[0], last: changing.name.split(" ")[1], email: changing.email }}
            plans={PLANS}
            current={changing.plan}
            usage={`${changing.beds} of ${limitOf(changing.plan?.toLowerCase() ?? null) ?? "unlimited"} beds`}
            grantEnd={billingOn}
            onConfirm={async (change) => {
              const res = await send(changing, change);
              const out = resultLines(res, planName, { dimensionLabels: { beds: "Beds" } });
              for (const line of out) toast[line.tone](line.text);
              setLines(out);
            }}
            onClose={() => setChanging(null)}
          />
        )}
      </WriteLockProvider>
      <ul aria-label="The answer's lines" className={`mt-3 space-y-0.5 ${READOUT}`}>
        {lines.length === 0 ? (
          <li>No change yet — try Ada to Seedling (over the limit), or Cleo (a running beta).</li>
        ) : (
          lines.map((line, i) => (
            <li key={i}>
              {line.tone}: {line.text}
            </li>
          ))
        )}
      </ul>
      <Note>
        `planColumn` is the plan&apos;s display name, the standing chip beside it while billing is on (left out, no
        chip) and the usage under it — &ldquo;12/30&rdquo;, with &ldquo;12 of 30 beds&rdquo; in its tooltip. It
        reads the code without case (Dan&apos;s legacy `SEEDLING`), sorts by code unless `sortBy` says otherwise,
        and filters over `filterPlans`. `PlanChangeConfirm` is `AdminActionConfirm` at `acknowledge`: the current
        plan and the app&apos;s usage sentence, a plan select, and — with `grantEnd`, only while billing is on —
        &ldquo;Free until&rdquo;, sent as the END of the picked day in the operator&apos;s time zone. The confirm
        is held while nothing would change, and it stays live under your own lapsed plan (`COMMIT_EXCEPT_BILLING`,
        built in); a demo lock still holds it. `usePlanChangeResult` turns the answer into lines with a tone each —
        the change (success), a kept beta (info), and over the new limit the warning with one figure line per
        dimension — echoing the server&apos;s before and after, not what was picked.
      </Note>
    </Example>
  );
}
