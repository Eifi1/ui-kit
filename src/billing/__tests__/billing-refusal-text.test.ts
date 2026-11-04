import { describe, expect, it } from "vitest";

import { billingRefusalText, type BillingErrorCode } from "../../auth/auth-errors";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { DEFAULT_BILLING_LABELS } from "../billing-labels";

/**
 * billingRefusalText (0.54, kastlan reuse audit 2026-11-02, proposal 4): a billing
 * refusal's words in the `billing` labels, which kastlan (billing-refusal-dialog.tsx),
 * keksdose (subscription-cards.tsx) and Kurvenschmiede (api/client.ts) each mapped from the
 * code by hand — and `null` for anything that is not billing's.
 */

const L = DEFAULT_BILLING_LABELS;
const axios = (data: unknown, status = 402) => ({
  isAxiosError: true,
  code: "ERR_BAD_REQUEST",
  response: { status, data },
});

/** Every BillingErrorCode and its words: the eight all three apps mapped, and the two
 *  kastlan and Kurvenschmiede said in words of their own. */
const WORDS: Record<BillingErrorCode, string> = {
  billing_disabled: L.disabled,
  billing_read_only: L.lockReason,
  plan_limit: L.limitReached,
  billing_not_configured: L.notConfigured,
  billing_provider_unavailable: L.providerUnavailable,
  billing_not_at_provider: L.notAtProvider,
  billing_already_subscribed: L.alreadySubscribed,
  billing_plan_not_sold: L.planNotSold,
  billing_not_subscribed: L.notSubscribed,
  billing_plan_unchanged: L.planUnchanged,
};

describe("billingRefusalText", () => {
  it.each(Object.entries(WORDS))("says %s in its label", (code, words) => {
    expect(billingRefusalText(axios({ detail: "Server English", code }), L)).toBe(words);
  });

  it("reads the code in every shape authErrorCode reads", () => {
    const body = { detail: "…", code: "billing_plan_not_sold" };
    expect(billingRefusalText({ name: "FetchError", status: 422, data: body }, L)).toBe(L.planNotSold);
    expect(billingRefusalText({ name: "ApiError", status: 422, body }, L)).toBe(L.planNotSold);
    expect(billingRefusalText(body, L)).toBe(L.planNotSold);
    // FastAPI's HTTPException(detail={…}).
    expect(billingRefusalText(axios({ detail: { code: "billing_plan_not_sold" } }, 422), L)).toBe(L.planNotSold);
  });

  it("says a read-only refusal to a guest without saying why (§12.6)", () => {
    const readOnly = axios({ code: "billing_read_only" });
    expect(billingRefusalText(readOnly, L, { guest: true, item: "Household 2026" })).toBe(
      L.guestReadOnly("Household 2026"),
    );
    expect(billingRefusalText(readOnly, L, { guest: true })).toBe(L.guestReadOnly());
    // The payer's, by default and when told so; `item` is a guest's only.
    expect(billingRefusalText(readOnly, L, { guest: false, item: "Household 2026" })).toBe(L.lockReason);
  });

  it("speaks the labels it is given", () => {
    const de = UI_KIT_LABELS_DE_CH.billing;
    expect(billingRefusalText(axios({ code: "billing_plan_unchanged" }, 409), de)).toBe(de.planUnchanged);
    expect(de.planUnchanged).not.toBe(L.planUnchanged);
  });

  it("is null for anything that is not a billing refusal", () => {
    expect(billingRefusalText(new Error("Network Error"), L)).toBeNull();
    expect(billingRefusalText(axios({ detail: "Not found" }, 404), L)).toBeNull();
    // Another family's code, axios' own code, and a code nobody answers.
    expect(billingRefusalText(axios({ code: "demo_read_only" }, 403), L)).toBeNull();
    expect(billingRefusalText(axios({ code: "email_taken" }, 409), L)).toBeNull();
    expect(billingRefusalText({ code: "ERR_NETWORK" }, L)).toBeNull();
    expect(billingRefusalText(axios({ code: "not_at_provider" }, 409), L)).toBeNull();
    // keksdose's legacy limit code is isPlanLimit's to read, not a BillingErrorCode.
    expect(billingRefusalText(axios({ code: "plan_budget_limit" }), L)).toBeNull();
    expect(billingRefusalText(undefined, L)).toBeNull();
    expect(billingRefusalText("billing_disabled", L)).toBeNull();
  });
});
