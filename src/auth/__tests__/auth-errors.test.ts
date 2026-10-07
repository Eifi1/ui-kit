import { describe, expect, it } from "vitest";

import { authErrorCode, isAuthError } from "../auth-errors";

/**
 * §5.2: every auth refusal carries a `code`; the kit reads it wherever the apps' HTTP
 * clients put the parsed body, with no dependency on any of them.
 */
describe("authErrorCode", () => {
  it("reads axios' err.response.data.code (keksdose's isPlanBudgetLimitRefusal path)", () => {
    const err = Object.assign(new Error("Request failed with status code 401"), {
      code: "ERR_BAD_REQUEST",
      response: { status: 401, data: { detail: "Invalid credentials", code: "invalid_credentials" } },
    });
    expect(authErrorCode(err)).toBe("invalid_credentials");
  });

  it("reads FastAPI's nested detail.code — HTTPException(detail={code: …})", () => {
    expect(authErrorCode({ response: { status: 409, data: { detail: { code: "email_taken", message: "x" } } } })).toBe(
      "email_taken",
    );
  });

  it("reads err.data.code (ofetch) and err.body.code (generated clients)", () => {
    expect(authErrorCode({ data: { code: "registration_closed" } })).toBe("registration_closed");
    expect(authErrorCode({ body: { code: "token_invalid" } })).toBe("token_invalid");
    expect(authErrorCode({ body: { detail: { code: "invitation_invalid" } } })).toBe("invitation_invalid");
  });

  it("reads a body thrown as it came, and err.code when it is one of the codes", () => {
    expect(authErrorCode({ code: "invitation_expired", detail: "Expired" })).toBe("invitation_expired");
    expect(authErrorCode({ detail: { code: "account_inactive" } })).toBe("account_inactive");
  });

  it("never reads axios' or Node's own err.code as a refusal", () => {
    expect(authErrorCode({ code: "ERR_NETWORK", message: "Network Error" })).toBeUndefined();
    expect(authErrorCode({ code: "ECONNABORTED", response: { data: { detail: "timeout" } } })).toBeUndefined();
  });

  it("ignores codes outside the auth set, and anything that is not an object", () => {
    expect(authErrorCode({ response: { status: 402, data: { code: "plan_budget_limit" } } })).toBeUndefined();
    for (const value of [undefined, null, "invalid_credentials", 401, new Error("boom")]) {
      expect(authErrorCode(value)).toBeUndefined();
    }
  });

  it("prefers the response body over everything else", () => {
    expect(authErrorCode({ code: "token_invalid", response: { data: { code: "email_taken" } } })).toBe("email_taken");
  });
});

describe("authErrorCode — token_expired (0.29.1)", () => {
  it("is a known code", () => {
    expect(authErrorCode({ response: { data: { code: "token_expired" } } })).toBe("token_expired");
  });
});

describe("isAuthError", () => {
  const taken = { response: { status: 409, data: { code: "email_taken" } } };

  it("matches any auth code, or exactly the one named", () => {
    expect(isAuthError(taken)).toBe(true);
    expect(isAuthError(taken, "email_taken")).toBe(true);
    expect(isAuthError(taken, "registration_closed")).toBe(false);
  });

  it("is false for an uncoded error", () => {
    expect(isAuthError(new Error("Network Error"))).toBe(false);
    expect(isAuthError({ response: { status: 500, data: "Internal Server Error" } }, "invalid_credentials")).toBe(false);
  });
});
