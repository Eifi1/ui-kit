import { describe, expect, it } from "vitest";

import { authErrorCode, isAuthError, isBillingError } from "../../auth/auth-errors";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { DEFAULT_BILLING_LABELS } from "../billing-labels";
import { isPlanLimit } from "../plan-limit";

const CATALOGUES = {
  "de-CH": UI_KIT_LABELS_DE_CH,
  en: uiKitLabelsEn(),
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  it: UI_KIT_LABELS_IT,
  hu: UI_KIT_LABELS_HU,
  zh: UI_KIT_LABELS_ZH,
} as const;

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
      // 0.39 (server-kit 0.12, §15.2.10): the plan switch's two.
      "billing_not_subscribed",
      "billing_plan_unchanged",
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
    expect(isBillingError(axios({ code: "billing_not_subscribed" }, 409), "billing_not_subscribed")).toBe(true);
    expect(isBillingError(axios({ detail: { code: "billing_plan_unchanged" } }, 409), "billing_plan_unchanged")).toBe(true);
    expect(isBillingError(axios({ code: "billing_plan_unchanged" }, 409), "billing_not_subscribed")).toBe(false);
    // The audits' drafts were never the wire's names (decision 22).
    expect(isBillingError(axios({ code: "not_at_provider" }, 409))).toBe(false);
    expect(isBillingError(axios({ code: "demo_read_only" }, 403))).toBe(false);
    expect(isBillingError(axios({ code: "plan_budget_limit" }))).toBe(false);
    expect(isBillingError(new Error("network"))).toBe(false);
    expect(isBillingError(undefined)).toBe(false);
  });
});

describe("the words of the plan switch's refusals (0.39, §15.2.10)", () => {
  it("say what to do instead, and no longer send a plan change to the portal", () => {
    expect(DEFAULT_BILLING_LABELS.notSubscribed).toBe("There’s no running subscription to change. Choose a plan to subscribe.");
    expect(DEFAULT_BILLING_LABELS.planUnchanged).toBe("That’s already your plan. Pick another plan or billing period.");
    expect(DEFAULT_BILLING_LABELS.alreadySubscribed).toBe("You already have a subscription. Change your plan above.");
    for (const [code, labels] of Object.entries(CATALOGUES)) {
      expect(labels.billing.alreadySubscribed, code).not.toContain(labels.billing.manage);
      expect(labels.billing.notSubscribed, code).toMatch(/\S/);
      expect(labels.billing.planUnchanged, code).toMatch(/\S/);
      if (code !== "en") expect(labels.billing.planUnchanged, code).not.toBe(DEFAULT_BILLING_LABELS.planUnchanged);
    }
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
