// @vitest-environment node
import { describe, expect, it } from "vitest";
import * as accountParts from "../../account/account-parts";
import * as adminPlanChange from "../../admin/plan-change";
import * as adminPlanChangeLabels from "../../admin/plan-change-labels";
import * as authErrors from "../../auth/auth-errors";
import * as billingPlanChangeLabels from "../../billing/plan-change-labels";
import * as notificationParts from "../../notifications/notification-parts";
import * as useMountedModule from "../../hooks/use-mounted";
import * as describeFailureModule from "../describe-failure";
import { httpStatusOf } from "../http-status";

/**
 * Generic helpers out of the feature folders they were imported sideways from (refactor
 * audit 2026-10-30, MOD-6, DUP-14). Each old module re-exports the SAME function, so
 * nothing that imported it there moved.
 */
describe("the moved helpers", () => {
  it("are re-exported from where they were", () => {
    expect(accountParts.useMounted).toBe(useMountedModule.useMounted);
    expect(accountParts.settle).toBe(useMountedModule.settle);
    expect(authErrors.httpStatusOf).toBe(httpStatusOf);
    expect(adminPlanChangeLabels.DEFAULT_PLAN_CHANGE_LABELS).toBe(billingPlanChangeLabels.DEFAULT_PLAN_CHANGE_LABELS);
    expect(adminPlanChange.DEFAULT_PLAN_CHANGE_LABELS).toBe(billingPlanChangeLabels.DEFAULT_PLAN_CHANGE_LABELS);
    expect(notificationParts.describeFailure).toBe(describeFailureModule.describeFailure);
  });

  it("httpStatusOf reads axios, then status, then statusCode", () => {
    expect(httpStatusOf({ response: { status: 409 }, status: 500 })).toBe(409);
    expect(httpStatusOf({ status: 402, statusCode: 500 })).toBe(402);
    expect(httpStatusOf({ statusCode: 429 })).toBe(429);
    expect(httpStatusOf({ status: "429" })).toBeUndefined();
    expect(httpStatusOf(null)).toBeUndefined();
  });

  it("describeFailure takes the app's words only when they say something", () => {
    const { describeFailure } = describeFailureModule;
    expect(describeFailure("Offline.", "Failed.")).toBe("Offline.");
    for (const nothing of [undefined, null, false, ""]) expect(describeFailure(nothing, "Failed.")).toBe("Failed.");
    expect(describeFailure(0, "Failed.")).toBe(0);
  });
});
