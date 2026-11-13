import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";
import { ACCOUNT_FAILURE_CODES, describeAccountFailure, useDescribeAccountFailure } from "../account-failure";
import { DEFAULT_ACCOUNT_FAILURE_LABELS as EN } from "../account-failure-labels";

/**
 * Every refusal the account routes answer, in the reader's language (docs/auth-harmonization.md
 * §12.9 "Refusals"; server-kit 0.29 codes every one, §12.5 item 3). Kurvenschmiede's
 * `apiErrorMessage` and `describeAuthFailure`, for every app: the code first, never the
 * server's English sentence; then what the connection or the status says.
 */

const axiosError = (status: number, data?: unknown, headers?: Record<string, string>) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data, headers: headers ?? {} },
  });

describe("describeAccountFailure", () => {
  it.each(ACCOUNT_FAILURE_CODES)("words %s by its code, never the server's sentence", (code) => {
    const words = describeAccountFailure(axiosError(400, { detail: "English for the logs", code }), EN);
    expect(words).toBe(EN.codes[code]);
    expect(words).not.toContain("English for the logs");
  });

  it("reads FastAPI's nested detail.code too", () => {
    expect(describeAccountFailure(axiosError(409, { detail: { code: "email_taken" } }), EN)).toBe(EN.codes.email_taken);
  });

  it("says offline for a request that got no answer, and for a refresh that could not get through", () => {
    const noAnswer = Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK" });
    expect(describeAccountFailure(noAnswer, EN)).toBe(EN.offline);
    expect(describeAccountFailure(new TypeError("Failed to fetch"), EN)).toBe(EN.offline);
    const marked = axiosError(401, { code: "not_signed_in" });
    (marked as unknown as Record<symbol, unknown>)[Symbol.for("@eifi1/ui-kit:session-refresh.transient")] = true;
    expect(describeAccountFailure(marked, EN)).toBe(EN.offline);
  });

  it("says the server took too long for a timeout", () => {
    const timedOut = Object.assign(new Error("timeout of 30000ms exceeded"), {
      isAxiosError: true,
      code: "ECONNABORTED",
    });
    expect(describeAccountFailure(timedOut, EN)).toBe(EN.timeout);
  });

  it("names the wait of a throttled request", () => {
    expect(describeAccountFailure(axiosError(429, undefined, { "retry-after": "30" }), EN)).toBe(EN.rateLimited(30));
    expect(describeAccountFailure(axiosError(429), EN)).toBe(EN.rateLimited(undefined));
  });

  it("reads an uncoded 401 as the session's end, a 5xx as the server's fault, anything else as a failure", () => {
    expect(describeAccountFailure(axiosError(401), EN)).toBe(EN.codes.session_ended);
    expect(describeAccountFailure(axiosError(502, "<html>"), EN)).toBe(EN.server);
    expect(describeAccountFailure(axiosError(400, { detail: "x" }), EN)).toBe(EN.failed);
    expect(describeAccountFailure("boom", EN)).toBe(EN.failed);
  });

  it("asks the app for its own codes, and goes on when it has no words", () => {
    const own = axiosError(409, { code: "team_full", team: "Rig 3" });
    const appCode = (code: string, body: Record<string, unknown>) =>
      code === "team_full" ? `${String(body.team)} is full.` : undefined;
    expect(describeAccountFailure(own, EN, { appCode })).toBe("Rig 3 is full.");
    expect(describeAccountFailure(axiosError(409, { code: "other" }), EN, { appCode })).toBe(EN.failed);
    // The kit's own codes are the kit's: the app is not asked for them.
    expect(describeAccountFailure(axiosError(409, { code: "email_taken" }), EN, { appCode: () => "app" })).toBe(
      EN.codes.email_taken,
    );
  });
});

describe("the accountFailure words", () => {
  const CATALOGUES = {
    en: uiKitLabelsEn(),
    "de-CH": uiKitLabelsDeCh(),
    fr: uiKitLabelsFr(),
    it: uiKitLabelsIt(),
    es: uiKitLabelsEs(),
    hu: uiKitLabelsHu(),
    zh: uiKitLabelsZh(),
  };

  it.each(Object.entries(CATALOGUES))("%s has a sentence for every code", (_, labels) => {
    const words = labels.accountFailure!;
    for (const code of ACCOUNT_FAILURE_CODES) expect(words.codes![code], code).toMatch(/\S/);
    expect(words.offline).toMatch(/\S/);
    expect(words.rateLimited!(30)).toContain("30");
  });

  it("de-CH writes ss, never ß", () => {
    const words = CATALOGUES["de-CH"].accountFailure!;
    expect(JSON.stringify({ ...words, rateLimited: words.rateLimited!(30) })).not.toContain("ß");
  });

  it("are read from the provider by the hook", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiKitProvider labels={CATALOGUES["de-CH"]}>{children}</UiKitProvider>
    );
    const { result } = renderHook(() => useDescribeAccountFailure(), { wrapper });
    expect(result.current(axiosError(400, { code: "password_unchanged" }))).toBe(
      CATALOGUES["de-CH"].accountFailure!.codes!.password_unchanged,
    );
  });
});
