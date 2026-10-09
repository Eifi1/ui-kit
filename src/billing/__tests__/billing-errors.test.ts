import { describe, expect, it } from "vitest";

import { authErrorCode, isAuthError, isBillingError } from "../../auth/auth-errors";
import { isPlanLimit } from "../plan-limit";

/**
 * Billing's coded refusals (docs/billing-harmonization.md §3.3, §3.4, §4, §12.16) in the
 * shapes the apps' clients throw: axios (`err.response.data`), ofetch (`err.data`), a
 * generated client (`err.body`), a body thrown as it came, and FastAPI's nested `detail`.
 */

const axios = (data: unknown, status = 402) => ({ isAxiosError: true, code: "ERR_BAD_REQUEST", response: { status, data } });
const ofetch = (data: unknown) => ({ name: "FetchError", status: 402, data });
const generated = (body: unknown) => ({ name: "ApiError", status: 402, body });

const LIMIT = { detail: "Plan limit reached", code: "plan_limit", dimension: "budgets", plan: "free", limit: 1, used: 1 };

describe("BillingErrorCode — read by authErrorCode and isAuthError", () => {
  it("knows the codes in every shape, server-kit 0.7's four new ones included (§14.2)", () => {
    for (const code of [
      "billing_disabled",
      "billing_read_only",
      "plan_limit",
      "billing_not_configured",
      "billing_provider_unavailable",
      "billing_not_at_provider",
      "billing_already_subscribed",
      "billing_plan_not_sold",
    ] as const) {
      const body = { detail: "…", code };
      expect(authErrorCode(axios(body))).toBe(code);
      expect(authErrorCode(ofetch(body))).toBe(code);
      expect(authErrorCode(generated(body))).toBe(code);
      expect(authErrorCode(body)).toBe(code);
      expect(authErrorCode(axios({ detail: { code } }))).toBe(code);
      expect(isAuthError(axios(body), code)).toBe(true);
    }
  });

  it("tells billing's codes from the others", () => {
    expect(isBillingError(axios({ code: "billing_read_only" }))).toBe(true);
    expect(isBillingError(axios({ code: "billing_read_only" }), "billing_read_only")).toBe(true);
    expect(isBillingError(axios({ code: "billing_read_only" }), "plan_limit")).toBe(false);
    expect(isBillingError(axios({ code: "billing_already_subscribed" }, 409))).toBe(true);
    expect(isBillingError(axios({ code: "billing_not_at_provider" }, 409), "billing_not_at_provider")).toBe(true);
    // The audits' drafts were never the wire's names (decision 22).
    expect(isBillingError(axios({ code: "not_at_provider" }, 409))).toBe(false);
    expect(isBillingError(axios({ code: "demo_read_only" }, 403))).toBe(false);
    expect(isBillingError(axios({ code: "plan_budget_limit" }))).toBe(false);
    expect(isBillingError(new Error("network"))).toBe(false);
    expect(isBillingError(undefined)).toBe(false);
  });
});

describe("isPlanLimit — {dimension, plan, limit, used} off the refusal (§3.4)", () => {
  it("reads the extra fields in every shape", () => {
    const want = { dimension: "budgets", plan: "free", limit: 1, used: 1 };
    expect(isPlanLimit(axios(LIMIT))).toEqual(want);
    expect(isPlanLimit(ofetch(LIMIT))).toEqual(want);
    expect(isPlanLimit(generated(LIMIT))).toEqual(want);
    expect(isPlanLimit(LIMIT)).toEqual(want);
    // FastAPI's HTTPException(detail={…}): the fields sit beside the nested code.
    const { detail: _sentence, ...fields } = LIMIT;
    expect(isPlanLimit(axios({ detail: fields }))).toEqual(want);
  });

  it("lowercases the plan code (§12.16) and leaves a missing field undefined", () => {
    expect(isPlanLimit(axios({ code: "plan_limit", dimension: "seats", plan: "PRO", limit: 5 }))).toEqual({
      dimension: "seats",
      plan: "pro",
      limit: 5,
      used: undefined,
    });
    expect(isPlanLimit(axios({ code: "plan_limit", dimension: "units", limit: "lots", used: null }))).toEqual({
      dimension: "units",
      plan: undefined,
      limit: undefined,
      used: undefined,
    });
  });

  it("reads keksdose's legacy plan_budget_limit as budgets for the release in between (§12.16)", () => {
    expect(isPlanLimit(axios({ detail: "Your FREE plan allows 1 budget(s).", code: "plan_budget_limit", plan: "FREE", limit: 1 }))).toEqual({
      dimension: "budgets",
      plan: "free",
      limit: 1,
      used: undefined,
    });
  });

  it("answers undefined for anything else", () => {
    expect(isPlanLimit(axios({ code: "billing_read_only" }))).toBeUndefined();
    expect(isPlanLimit(axios({ detail: "Payment required" }))).toBeUndefined();
    expect(isPlanLimit({ code: "ERR_NETWORK" })).toBeUndefined();
    expect(isPlanLimit(null)).toBeUndefined();
    expect(isPlanLimit("plan_limit")).toBeUndefined();
  });
});
