import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setSharedComputer } from "../../offline/shared-computer";
import { fakeFetch, fakeHttp, tokens } from "../../test/fake-axios";
import type { Cfg } from "../../test/fake-axios";
import { createAccountsClient } from "../accounts-client";
import { creationOptionsFromJson, credentialToJson, requestOptionsFromJson } from "../passkey-ceremony";

/**
 * server-kit 0.29's account routes, typed once (docs/auth-harmonization.md §12.9; the route
 * table is server-kit's README, "Account layer"): each call's method, path and body, on the
 * app's own instance, so the bearer and the refresh apply as to any request.
 */

const KEY = "app.session";
const ada = { id: 1, email: "ada@example.com" };
const clients: Array<{ detach(): void }> = [];

function setup(answer: (config: Cfg) => unknown = () => ({ ok: true })) {
  const http = fakeHttp((config) => ({ status: 200, data: answer(config) }));
  const client = createAccountsClient<typeof ada>({
    http,
    storagePrefix: "app.",
    publicPaths: ["/"],
    fetch: fakeFetch(() => ({ status: 401 })),
    navigate: vi.fn(),
  });
  clients.push(client);
  return { client, http };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(KEY, JSON.stringify({ token: "a1", refreshToken: "r1", user: ada }));
});
afterEach(() => {
  for (const client of clients.splice(0)) client.detach();
  vi.unstubAllGlobals();
});

describe("client.api", () => {
  const ROUTES: Array<
    [string, (api: ReturnType<typeof setup>["client"]["api"]) => Promise<unknown>, string, string, unknown?]
  > = [
    ["me", (api) => api.me(), "get", "/auth/me"],
    ["updateMe", (api) => api.updateMe({ first_name: "Ada" }), "patch", "/auth/me", { first_name: "Ada" }],
    [
      "changePassword",
      (api) => api.changePassword({ current_password: "old", new_password: "new-secret" }),
      "post",
      "/auth/me/password",
      { current_password: "old", new_password: "new-secret" },
    ],
    ["emailChange", (api) => api.emailChange(), "get", "/auth/me/email"],
    [
      "requestEmailChange",
      (api) => api.requestEmailChange({ new_email: "a@new", password: "pw" }),
      "post",
      "/auth/me/email",
      { new_email: "a@new", password: "pw" },
    ],
    ["resendEmailChange", (api) => api.resendEmailChange(), "post", "/auth/me/email/resend"],
    ["cancelEmailChange", (api) => api.cancelEmailChange(), "delete", "/auth/me/email"],
    ["confirmEmailChange", (api) => api.confirmEmailChange("t1"), "post", "/auth/me/email/confirm", { token: "t1" }],
    ["verifyEmail", (api) => api.verifyEmail("t2"), "post", "/auth/verify-email", { token: "t2" }],
    ["resendVerification", (api) => api.resendVerification(), "post", "/auth/resend-verification"],
    [
      "requestPasswordReset",
      (api) => api.requestPasswordReset("a@x"),
      "post",
      "/auth/password-reset/request",
      { email: "a@x" },
    ],
    [
      "checkPasswordReset",
      (api) => api.checkPasswordReset("t3"),
      "post",
      "/auth/password-reset/check",
      { token: "t3" },
    ],
    [
      "confirmPasswordReset",
      (api) => api.confirmPasswordReset({ token: "t3", new_password: "new-secret" }),
      "post",
      "/auth/password-reset/confirm",
      { token: "t3", new_password: "new-secret" },
    ],
    ["checkInvitation", (api) => api.checkInvitation("i1"), "post", "/auth/invitations/check", { token: "i1" }],
    ["acceptInvitation", (api) => api.acceptInvitation("i1"), "post", "/auth/invitations/accept", { token: "i1" }],
    ["sessions", (api) => api.sessions(), "get", "/auth/sessions"],
    ["endSession", (api) => api.endSession("s/1"), "delete", "/auth/sessions/s%2F1"],
    ["logoutEverywhere", (api) => api.logoutEverywhere(), "post", "/auth/logout"],
    ["deletionTerms", (api) => api.deletionTerms(), "get", "/auth/me/deletion"],
    [
      "requestDeletion",
      (api) => api.requestDeletion({ password: "pw", confirm_email: "ada@example.com" }),
      "post",
      "/auth/me/deletion",
      { password: "pw", confirm_email: "ada@example.com" },
    ],
    ["passkeys", (api) => api.passkeys(), "get", "/auth/passkeys"],
    ["renamePasskey", (api) => api.renamePasskey(7, "Laptop"), "patch", "/auth/passkeys/7", { name: "Laptop" }],
    ["deletePasskey", (api) => api.deletePasskey(7), "delete", "/auth/passkeys/7"],
    [
      "passkeyRegisterBegin",
      (api) => api.passkeyRegisterBegin("pw"),
      "post",
      "/auth/passkey/register/begin",
      { current_password: "pw" },
    ],
    [
      "passkeyRegisterFinish",
      (api) => api.passkeyRegisterFinish({ challenge_token: "c", credential: { id: "x" }, name: "" }),
      "post",
      "/auth/passkey/register/finish",
      { challenge_token: "c", credential: { id: "x" }, name: "" },
    ],
    ["passkeyLoginBegin", (api) => api.passkeyLoginBegin(), "post", "/auth/passkey/login/begin"],
    ["invitations", (api) => api.invitations(), "get", "/admin/invitations"],
    [
      "invite",
      (api) => api.invite({ email: "b@x", role: "MEMBER", locale: "de-CH" }),
      "post",
      "/admin/invitations",
      { email: "b@x", role: "MEMBER", locale: "de-CH" },
    ],
    ["resendInvitation", (api) => api.resendInvitation(3), "post", "/admin/invitations/3/resend"],
    ["revokeInvitation", (api) => api.revokeInvitation(3), "delete", "/admin/invitations/3"],
  ];

  it.each(ROUTES)(
    "%s goes to its route with its body, on the app's instance with the bearer",
    async (_, call, method, url, data) => {
      const { client, http } = setup();
      await call(client.api);
      expect(http.sent).toHaveLength(1);
      expect(http.sent[0]).toMatchObject({ method, url, bearer: "Bearer a1" });
      expect(http.sent[0]!.data).toEqual(data);
    },
  );

  it("answers the route's body", async () => {
    const { client } = setup(() => ({ email: "ada@example.com", pending_email: "a@new", sent: true }));
    await expect(client.api.requestEmailChange({ new_email: "a@new", password: "pw" })).resolves.toEqual({
      email: "ada@example.com",
      pending_email: "a@new",
      sent: true,
    });
  });

  it("asks for the export as a Blob", async () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    const { client, http } = setup(() => blob);
    await expect(client.api.exportData()).resolves.toBe(blob);
    expect(http.sent[0]).toMatchObject({ method: "get", url: "/auth/me/export", responseType: "blob" });
  });
});

describe("signOut({ everywhere: true })", () => {
  it("ends every session on the server in the sign-out's place, then the tokens", async () => {
    const { client, http } = setup();
    await client.signOut({ everywhere: true });
    expect(http.sent.map((c) => `${c.method} ${c.url} ${c.bearer}`)).toEqual(["post /auth/logout Bearer a1"]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

/** A `PublicKeyCredential` as a browser answers it: buffers where the JSON has base64url. */
function fakeAssertion(bytes: Record<string, number[]>) {
  const buf = (values: number[]) => new Uint8Array(values).buffer;
  return {
    id: "cred-1",
    rawId: buf(bytes.rawId!),
    type: "public-key",
    authenticatorAttachment: "platform",
    getClientExtensionResults: () => ({}),
    response: {
      clientDataJSON: buf(bytes.clientDataJSON!),
      authenticatorData: buf(bytes.authenticatorData!),
      signature: buf(bytes.signature!),
      userHandle: buf(bytes.userHandle!),
    },
  };
}

describe("the passkey ceremony", () => {
  it("decodes the server's base64url options into the buffers the browser takes", () => {
    const request = requestOptionsFromJson({
      challenge: "AQID",
      rpId: "example.com",
      allowCredentials: [{ id: "_-8", type: "public-key" }],
      userVerification: "required",
    });
    expect([...new Uint8Array(request.challenge as ArrayBuffer)]).toEqual([1, 2, 3]);
    expect([...new Uint8Array(request.allowCredentials![0]!.id as ArrayBuffer)]).toEqual([255, 239]);
    expect(request.userVerification).toBe("required");
    const creation = creationOptionsFromJson({
      challenge: "AQID",
      rp: { id: "example.com", name: "Example" },
      user: { id: "BAU", name: "ada@example.com", displayName: "Ada" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      excludeCredentials: [{ id: "AQ", type: "public-key" }],
    });
    expect([...new Uint8Array(creation.user.id as ArrayBuffer)]).toEqual([4, 5]);
    expect(creation.user.name).toBe("ada@example.com");
    expect([...new Uint8Array(creation.excludeCredentials![0]!.id as ArrayBuffer)]).toEqual([1]);
  });

  it("encodes the authenticator's answer as base64url JSON, the shape server-kit's finish parses", () => {
    const json = credentialToJson(
      fakeAssertion({
        rawId: [1, 2],
        clientDataJSON: [123, 125],
        authenticatorData: [9],
        signature: [255, 254],
        userHandle: [7],
      }) as unknown as PublicKeyCredential,
    );
    expect(json).toEqual({
      id: "cred-1",
      rawId: "AQI",
      type: "public-key",
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      response: { clientDataJSON: "e30", authenticatorData: "CQ", signature: "__4", userHandle: "Bw" },
    });
  });

  it("signs in with a passkey: begin, the browser, then the finish with shared_device", async () => {
    setSharedComputer(true);
    localStorage.clear();
    const get = vi.fn(async () =>
      fakeAssertion({ rawId: [1], clientDataJSON: [2], authenticatorData: [3], signature: [4], userHandle: [5] }),
    );
    vi.stubGlobal("navigator", { ...navigator, credentials: { get } });
    const { client, http } = setup((config) =>
      config.url === "/auth/passkey/login/begin"
        ? { options: { challenge: "AQID", rpId: "localhost" }, challenge_token: "c9" }
        : tokens("a1", "r1", ada),
    );
    await expect(client.signInWithPasskey()).resolves.toEqual({ kind: "signed-in" });
    expect(http.sent.map((c) => c.url)).toEqual(["/auth/passkey/login/begin", "/auth/passkey/login/finish"]);
    expect(http.sent[1]!.data).toMatchObject({
      challenge_token: "c9",
      credential: { id: "cred-1", rawId: "AQ", response: { signature: "BA" } },
      shared_device: true,
    });
    expect(sessionStorage.getItem(KEY)).not.toBeNull();
  });

  it("is quiet when the person closes the browser's prompt: an AbortError, nothing kept", async () => {
    localStorage.clear();
    vi.stubGlobal("navigator", {
      ...navigator,
      credentials: { get: vi.fn(async () => Promise.reject(new DOMException("closed", "NotAllowedError"))) },
    });
    const { client, http } = setup(() => ({ options: { challenge: "AQID" }, challenge_token: "c9" }));
    const error = await client.signInWithPasskey().catch((e: unknown) => e);
    expect((error as Error).name).toBe("AbortError");
    expect(http.sent.map((c) => c.url)).toEqual(["/auth/passkey/login/begin"]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
