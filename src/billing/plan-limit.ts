import { errorBodyWithCode } from "../auth/auth-errors";

/** What {@link isPlanLimit} reads off a `plan_limit` refusal (docs/billing-harmonization.md
 *  §3.4): `402 {detail, code: "plan_limit", dimension, plan, limit, used}`. */
export interface PlanLimitRefusal {
  /** The limited dimension, as the app's catalogue names it: `"budgets"`, `"seats"`. */
  dimension: string;
  /** The payer's plan code, lowercased (§12.16: reads compare without case, and
   *  keksdose's legacy body still says `"FREE"`). `undefined` when the body has none. */
  plan: string | undefined;
  /** The plan's limit for the dimension. `undefined` when the body has none. */
  limit: number | undefined;
  /** How many there are. `undefined` when the body has none — keksdose's legacy
   *  `plan_budget_limit` body never had it. */
  used: number | undefined;
}

/** keksdose's code before §3.4: `402 {detail, code: "plan_budget_limit", plan, limit}`. */
const LEGACY_BUDGET_LIMIT = "plan_budget_limit";

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined;
const count = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * The plan-limit refusal `err` carries — `{dimension, plan, limit, used}` — or
 * `undefined` when it is not one (docs/billing-harmonization.md §3.4):
 *
 *     catch (err) {
 *       const hit = isPlanLimit(err);
 *       if (hit) return setLimit(hit); // → <PlanLimitNotice {...hit} mode="upgrade" href="/settings/subscription" />
 *     }
 *
 * The body is found where `authErrorCode` finds a code — axios' `err.response.data`,
 * ofetch's `err.data`, a generated client's `err.body`, or `err` itself — and FastAPI's
 * nested `{detail: {code, …}}` too; the extra fields are read beside the code.
 *
 * keksdose's old code, `plan_budget_limit`, is read as `dimension: "budgets"` (§12.16):
 * its frontend accepts both codes for a release, because installed PWAs run the previous
 * bundle while the server switches.
 */
export function isPlanLimit(err: unknown): PlanLimitRefusal | undefined {
  const body = errorBodyWithCode(err, (code) => code === "plan_limit" || code === LEGACY_BUDGET_LIMIT);
  if (!body) return undefined;
  const legacy = body.code === LEGACY_BUDGET_LIMIT;
  return {
    dimension: text(body.dimension) ?? (legacy ? "budgets" : ""),
    plan: text(body.plan)?.toLowerCase(),
    limit: count(body.limit),
    used: count(body.used),
  };
}
