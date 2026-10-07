import { describe, expect, it } from "vitest";

import { authErrorCode, englishRateLimited, isAuthError, isRateLimited, retryAfterSeconds } from "../auth-errors";

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

describe("isRateLimited (0.30.0)", () => {
  it("reads a 429 wherever the apps' clients put the status", () => {
    // axios
    expect(isRateLimited({ response: { status: 429, data: { detail: "Too many requests" } } })).toBe(true);
    // ofetch's FetchError, a generated client's ApiError, a Response thrown as it came
    expect(isRateLimited({ status: 429, data: {} })).toBe(true);
    expect(isRateLimited(Object.assign(new Error("429"), { statusCode: 429 }))).toBe(true);
  });

  it("is false for any other status, a coded refusal and anything without one", () => {
    expect(isRateLimited({ response: { status: 401, data: { code: "invalid_credentials" } } })).toBe(false);
    expect(isRateLimited({ status: 500 })).toBe(false);
    expect(isRateLimited({ status: "429" })).toBe(false);
    for (const value of [undefined, null, 429, "429", new Error("Too many requests")]) {
      expect(isRateLimited(value)).toBe(false);
    }
  });

  it("prefers the response's status, as axios sets both", () => {
    expect(isRateLimited({ status: 400, response: { status: 429 } })).toBe(true);
    expect(isRateLimited({ status: 429, response: { status: 400 } })).toBe(false);
  });
});

describe("authErrorCode — the account codes (0.30.0, server-kit 0.4.0's AccountErrorCode)", () => {
  it.each([
    "last_admin",
    "self_action",
    "other_companies",
    "household_has_members",
    "confirmation_required",
    "confirmation_mismatch",
    "password_incorrect",
  ] as const)("knows %s, in every shape", (code) => {
    expect(authErrorCode({ response: { status: 409, data: { detail: "x", code } } })).toBe(code);
    expect(authErrorCode({ data: { detail: { code } } })).toBe(code);
    expect(isAuthError({ body: { code } }, code)).toBe(true);
  });

  it("reads kastlan's last_admin with its companies, and isAuthError tells the codes apart", () => {
    const err = { response: { status: 409, data: { detail: "x", code: "last_admin", companies: ["Example AG"] } } };
    expect(authErrorCode(err)).toBe("last_admin");
    expect(isAuthError(err, "last_admin")).toBe(true);
    expect(isAuthError(err, "self_action")).toBe(false);
    expect(isAuthError({ response: { status: 400, data: { code: "password_incorrect" } } }, "invalid_credentials")).toBe(
      false,
    );
  });
});

describe("retryAfterSeconds (0.30.0)", () => {
  const NOW = Date.UTC(2026, 9, 7, 10, 0, 0);

  it("reads delta-seconds from axios' headers, a plain record in any case or AxiosHeaders' get", () => {
    expect(retryAfterSeconds({ response: { status: 429, headers: { "retry-after": "30" } } })).toBe(30);
    expect(retryAfterSeconds({ response: { headers: { "Retry-After": "7" } } })).toBe(7);
    const axiosHeaders = { get: (name: string) => (name === "retry-after" ? "12" : undefined) };
    expect(retryAfterSeconds({ response: { headers: axiosHeaders } })).toBe(12);
    expect(retryAfterSeconds({ response: { headers: { "retry-after": 45 } } })).toBe(45);
  });

  it("reads a fetch Headers — ofetch's response, or a Response thrown as it came", () => {
    expect(retryAfterSeconds({ response: { headers: new Headers({ "Retry-After": "90" }) } })).toBe(90);
    expect(retryAfterSeconds({ status: 429, headers: new Headers({ "retry-after": "3" }) })).toBe(3);
  });

  it("turns an HTTP date into seconds from now, never below 0", () => {
    const at = new Date(NOW + 125_000).toUTCString();
    expect(retryAfterSeconds({ response: { headers: { "retry-after": at } } }, NOW)).toBe(125);
    const past = new Date(NOW - 60_000).toUTCString();
    expect(retryAfterSeconds({ response: { headers: { "retry-after": past } } }, new Date(NOW))).toBe(0);
  });

  it("is undefined without a header, or with one that does not parse", () => {
    expect(retryAfterSeconds({ response: { status: 429, headers: {} } })).toBeUndefined();
    expect(retryAfterSeconds({ response: { status: 429 } })).toBeUndefined();
    expect(retryAfterSeconds({ response: { headers: { "retry-after": "soon" } } })).toBeUndefined();
    expect(retryAfterSeconds({ response: { headers: { "retry-after": "-5" } } })).toBeUndefined();
    for (const value of [undefined, null, 30, "30", new Error("429")]) {
      expect(retryAfterSeconds(value)).toBeUndefined();
    }
  });
});

describe("englishRateLimited", () => {
  it("names the wait in seconds under a minute, in minutes from one up, and none without one", () => {
    expect(englishRateLimited()).toBe("Too many attempts. Wait a moment and try again.");
    expect(englishRateLimited(0)).toBe("Too many attempts. Wait a moment and try again.");
    expect(englishRateLimited(30)).toBe("Too many attempts. Try again in 30 s.");
    expect(englishRateLimited(60)).toBe("Too many attempts. Try again in 1 min.");
    expect(englishRateLimited(61)).toBe("Too many attempts. Try again in 2 min.");
    expect(englishRateLimited(3600)).toBe("Too many attempts. Try again in 60 min.");
  });
});
