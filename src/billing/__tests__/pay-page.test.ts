import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import {
  PAY_PAGE_LANG_PARAM,
  paddleLocale,
  payPageConfigProblems,
  payPageLanguage,
  payPageStrings,
  payPageUrl,
} from "../pay-page";
import type { PayPageConfig, PayPageLanguage, PayPageStrings } from "../pay-page";
import { startPayPage } from "../../../pay-page/pay";
import type { PaddleInitializeOptions, PaddleJs, PayPageEnvironment } from "../../../pay-page/pay";

/**
 * The pay page (docs/billing-harmonization.md §14.4, decision 19 as amended): the app's
 * link to it, Paddle's locale, its configuration's rules, and the page itself — driven
 * through the shipped index.html with a fake Paddle.js.
 */

const ROOT = resolve(__dirname, "../../..");

describe("paddleLocale — the kit's locale to Paddle's (§14.4, §14.16 item 20)", () => {
  it("maps the seven languages as the table says, Hungarian to English", () => {
    expect(
      Object.fromEntries(["en", "de-CH", "fr", "it", "es", "zh", "hu"].map((code) => [code, paddleLocale(code)])),
    ).toEqual({ en: "en", "de-CH": "de", fr: "fr", it: "it", es: "es", zh: "zh-Hans", hu: "en" });
  });

  it("reads any tag as the kit does, and gives English for a language it doesn't ship", () => {
    expect(paddleLocale("de-AT")).toBe("de");
    expect(paddleLocale("de_CH")).toBe("de");
    expect(paddleLocale("zh-TW")).toBe("zh-Hans");
    expect(paddleLocale("fr-CA")).toBe("fr");
    expect(paddleLocale("sv-SE")).toBe("en");
    expect(paddleLocale("")).toBe("en");
  });
});

describe("payPageUrl — the buyer's language on the way to the pay page", () => {
  it("adds lang=<kit locale> to a pay page link, keeping _ptxn", () => {
    const url = payPageUrl("https://pay.keksdose.app/?_ptxn=txn_01abc", "de-CH");
    expect(new URL(url).searchParams.get("_ptxn")).toBe("txn_01abc");
    expect(new URL(url).searchParams.get(PAY_PAGE_LANG_PARAM)).toBe("de-CH");
    expect(new URL(payPageUrl(url, "fr")).searchParams.getAll("lang")).toEqual(["fr"]);
  });

  it("writes the kit's own code for a regional tag", () => {
    expect(new URL(payPageUrl("https://pay.example/?_ptxn=txn_1", "de-DE")).searchParams.get("lang")).toBe("de-CH");
    expect(new URL(payPageUrl("https://pay.example/?_ptxn=txn_1", "zh-CN")).searchParams.get("lang")).toBe("zh");
  });

  it("leaves a hosted checkout, a language the kit doesn't ship and an unreadable URL as they are", () => {
    const hosted = "https://sandbox-pay.paddle.io/hsc_01abc?transaction_id=txn_1&locale=de";
    expect(payPageUrl(hosted, "de-CH")).toBe(hosted);
    expect(payPageUrl("https://pay.example/?_ptxn=txn_1", "sv")).toBe("https://pay.example/?_ptxn=txn_1");
    expect(payPageUrl("not a url ?_ptxn=1", "fr")).toBe("not a url ?_ptxn=1");
  });
});

describe("payPageLanguage — lang, then the browser, then English", () => {
  it("prefers the link's lang, then the browser's languages in order", () => {
    expect(payPageLanguage("it", ["fr-FR"])).toBe("it");
    expect(payPageLanguage(null, ["sv-SE", "es-MX", "en"])).toBe("es");
    expect(payPageLanguage("xx", ["de-AT"])).toBe("de-CH");
    expect(payPageLanguage(undefined, ["sv"])).toBe("en");
    expect(payPageLanguage(null)).toBe("en");
  });
});

const CONFIG: PayPageConfig = {
  token: "live_7d1f0c",
  environment: "live",
  returnUrl: "https://keksdose.app/settings/subscription",
  appName: "Keksdose",
  termsUrl: "https://keksdose.app/terms",
  privacyUrl: "https://keksdose.app/privacy",
};

describe("pay-config.json's rules (§14.4)", () => {
  it("accepts a token that matches its environment, and no token at all", () => {
    expect(payPageConfigProblems(CONFIG)).toEqual([]);
    expect(payPageConfigProblems({ ...CONFIG, token: "test_9a", environment: "sandbox" })).toEqual([]);
    expect(payPageConfigProblems({ ...CONFIG, token: null, environment: null })).toEqual([]);
  });

  it("refuses a token whose prefix disagrees with the environment, or that has none", () => {
    expect(payPageConfigProblems({ ...CONFIG, token: "test_9a" })).toEqual([
      "the token is a sandbox token (test_…), but the environment is live",
    ]);
    expect(payPageConfigProblems({ ...CONFIG, environment: "sandbox" })).toEqual([
      "the token is a live token (live_…), but the environment is sandbox",
    ]);
    expect(payPageConfigProblems({ ...CONFIG, token: "pdl_live_apikey_x" })).toEqual([
      "a live token starts with live_",
    ]);
    expect(payPageConfigProblems({ ...CONFIG, token: "live_" })).toEqual(["a live token starts with live_"]);
    expect(payPageConfigProblems({ ...CONFIG, environment: null })).toEqual([
      "a token needs its environment: sandbox or live",
    ]);
    expect(payPageConfigProblems({ ...CONFIG, environment: "production" })).toHaveLength(2);
  });

  it("wants https:// URLs, http:// for localhost only, and the app's name", () => {
    expect(payPageConfigProblems({ ...CONFIG, returnUrl: "http://keksdose.app/settings/subscription" })).toEqual([
      "returnUrl must be an https:// URL (http:// for localhost only)",
    ]);
    expect(payPageConfigProblems({ ...CONFIG, returnUrl: "http://localhost:5173/settings/subscription" })).toEqual([]);
    expect(payPageConfigProblems({ ...CONFIG, termsUrl: "javascript:alert(1)", privacyUrl: "/privacy" })).toHaveLength(2);
    expect(payPageConfigProblems({ ...CONFIG, appName: " " })).toEqual(["appName is missing"]);
    expect(payPageConfigProblems(null)).toEqual(["the configuration is not an object"]);
  });
});

const CATALOGUES = {
  "de-CH": UI_KIT_LABELS_DE_CH,
  en: uiKitLabelsEn(),
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  it: UI_KIT_LABELS_IT,
  hu: UI_KIT_LABELS_HU,
  zh: UI_KIT_LABELS_ZH,
} as const;

/** The table the build puts into pay.js, made here from the same catalogues. */
const STRINGS = Object.fromEntries(
  Object.entries(CATALOGUES).map(([code, labels]) => [code, payPageStrings(labels)]),
) as Record<PayPageLanguage, PayPageStrings>;

describe("the page's words", () => {
  it("come from billing.pay* and the legal links, in every one of the seven languages", () => {
    expect(STRINGS.en).toEqual({
      opening: DEFAULT_UI_KIT_LABELS.billing.payOpening,
      nothing: DEFAULT_UI_KIT_LABELS.billing.payNothing,
      failed: DEFAULT_UI_KIT_LABELS.billing.payFailed,
      closed: DEFAULT_UI_KIT_LABELS.billing.payBack,
      back: "Back",
      terms: DEFAULT_UI_KIT_LABELS.legal.links.terms,
      privacy: DEFAULT_UI_KIT_LABELS.legal.links.privacy,
      legal: DEFAULT_UI_KIT_LABELS.legal.navLabel,
    });
    for (const [code, words] of Object.entries(STRINGS)) {
      for (const text of Object.values(words)) expect(text, code).toMatch(/\S/);
      if (code !== "en") expect(words.opening, code).not.toBe(STRINGS.en.opening);
    }
    expect(STRINGS["de-CH"].failed).not.toMatch(/ß/);
  });
});

/* ── The page itself ───────────────────────────────────────────────────────── */

/** The shipped index.html's body, so the ids the script reads are the ones it ships. */
function mountPage(): void {
  const html = readFileSync(join(ROOT, "pay-page/index.html"), "utf8");
  document.body.innerHTML = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
}

function fakePaddle() {
  const calls: { environment: string[]; init: PaddleInitializeOptions[] } = { environment: [], init: [] };
  const paddle: PaddleJs = {
    Environment: { set: (env) => void calls.environment.push(env) },
    Initialize: (options) => void calls.init.push(options),
  };
  return { paddle, calls };
}

function env(overrides: Partial<PayPageEnvironment> = {}): PayPageEnvironment {
  return {
    document,
    search: "?_ptxn=txn_01abc&lang=fr",
    languages: ["de-CH"],
    paddle: () => undefined,
    fetchConfig: async () => CONFIG,
    dark: false,
    strings: STRINGS,
    ...overrides,
  };
}

const message = () => document.getElementById("pay-message")!.textContent;
const state = () => document.getElementById("pay")!.dataset.state;

describe("the pay page (dist/pay/)", () => {
  beforeEach(() => {
    mountPage();
    document.title = "Checkout";
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("hands Paddle.js the token and the checkout's settings, in the buyer's language", async () => {
    const { paddle, calls } = fakePaddle();
    await expect(startPayPage(env({ paddle: () => paddle, dark: true }))).resolves.toBe("opening");
    expect(calls.environment).toEqual([]);
    expect(calls.init).toHaveLength(1);
    expect(calls.init[0].token).toBe("live_7d1f0c");
    expect(calls.init[0].checkout.settings).toEqual({
      displayMode: "overlay",
      locale: "fr",
      successUrl: "https://keksdose.app/settings/subscription?checkout=done",
      theme: "dark",
    });
    expect(document.documentElement.lang).toBe("fr");
    expect(message()).toBe(STRINGS.fr.opening);
    expect(document.title).toBe("Keksdose");
  });

  it("shows the way back and the footer's Terms and Privacy, from the configuration", async () => {
    const { paddle } = fakePaddle();
    await startPayPage(env({ paddle: () => paddle }));
    const back = document.getElementById("pay-back") as HTMLAnchorElement;
    expect(back.hidden).toBe(false);
    expect(back.textContent).toBe(STRINGS.fr.back);
    expect(back.href).toBe(CONFIG.returnUrl);
    expect(document.getElementById("pay-footer")!.hidden).toBe(false);
    expect(document.getElementById("pay-app")).toHaveTextContent("Keksdose");
    expect(document.getElementById("pay-legal")).toHaveAttribute("aria-label", STRINGS.fr.legal);
    expect(document.getElementById("pay-terms")).toHaveAttribute("href", CONFIG.termsUrl);
    expect(document.getElementById("pay-privacy")).toHaveTextContent(STRINGS.fr.privacy);
  });

  it("sets the sandbox before Initialize, and says payBack once the buyer closes the checkout", async () => {
    const { paddle, calls } = fakePaddle();
    const config = { ...CONFIG, token: "test_1b2c", environment: "sandbox" };
    await startPayPage(env({ paddle: () => paddle, fetchConfig: async () => config, search: "?_ptxn=txn_1&lang=hu" }));
    expect(calls.environment).toEqual(["sandbox"]);
    // Paddle has no Hungarian: its checkout is English, the page's own lines Hungarian.
    expect(calls.init[0].checkout.settings.locale).toBe("en");
    calls.init[0].eventCallback?.({ name: "checkout.loaded" });
    expect(state()).toBe("opening");
    calls.init[0].eventCallback?.({ name: "checkout.closed" });
    expect(state()).toBe("closed");
    expect(message()).toBe(STRINGS.hu.closed);
  });

  it("says there is nothing to pay without _ptxn or without a token, and never calls Paddle", async () => {
    const { paddle, calls } = fakePaddle();
    await expect(startPayPage(env({ paddle: () => paddle, search: "?lang=it" }))).resolves.toBe("nothing");
    expect(message()).toBe(STRINGS.it.nothing);
    mountPage();
    await expect(
      startPayPage(
        env({ paddle: () => paddle, fetchConfig: async () => ({ ...CONFIG, token: null, environment: null }) }),
      ),
    ).resolves.toBe("nothing");
    expect(calls.init).toEqual([]);
    // The way back is still offered.
    expect((document.getElementById("pay-back") as HTMLAnchorElement).hidden).toBe(false);
  });

  it("says payFailed when Paddle.js didn't load, the file is missing, or it is wrong", async () => {
    await expect(startPayPage(env({ paddle: () => undefined }))).resolves.toBe("failed");
    expect(message()).toBe(STRINGS.fr.failed);

    mountPage();
    await expect(startPayPage(env({ fetchConfig: () => Promise.reject(new Error("404")) }))).resolves.toBe("failed");
    expect(document.getElementById("pay-footer")!.hidden).toBe(true);

    // A configuration the build script would have refused: not even its way back is used.
    mountPage();
    const { paddle, calls } = fakePaddle();
    await expect(
      startPayPage(
        env({
          paddle: () => paddle,
          fetchConfig: async () => ({ ...CONFIG, returnUrl: "https://evil.example/", token: "test_x" }),
        }),
      ),
    ).resolves.toBe("failed");
    expect(calls.init).toEqual([]);
    expect((document.getElementById("pay-back") as HTMLAnchorElement).hidden).toBe(true);

    mountPage();
    const throwing: PaddleJs = {
      Environment: { set: () => {} },
      Initialize: () => {
        throw new Error("Invalid token");
      },
    };
    await expect(startPayPage(env({ paddle: () => throwing }))).resolves.toBe("failed");
  });

  it("falls back to the browser's language, then English", async () => {
    const { paddle, calls } = fakePaddle();
    await startPayPage(env({ paddle: () => paddle, search: "?_ptxn=txn_1", languages: ["zh-TW", "en"] }));
    expect(document.documentElement.lang).toBe("zh");
    expect(calls.init[0].checkout.settings.locale).toBe("zh-Hans");
    mountPage();
    await startPayPage(env({ paddle: () => paddle, search: "?_ptxn=txn_1&lang=xx", languages: ["sv"] }));
    expect(message()).toBe(STRINGS.en.opening);
  });

  it("writes nothing to storage and puts nothing of the configuration into markup", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const { paddle } = fakePaddle();
    await startPayPage(
      env({ paddle: () => paddle, fetchConfig: async () => ({ ...CONFIG, appName: "<img src=x onerror=alert(1)>" }) }),
    );
    expect(setItem).not.toHaveBeenCalled();
    expect(document.querySelector("img")).toBeNull();
    expect(document.getElementById("pay-app")).toHaveTextContent("<img src=x onerror=alert(1)>");
  });

  it("ships an index.html with no inline script or style, Paddle.js from Paddle's CDN first", () => {
    const html = readFileSync(join(ROOT, "pay-page/index.html"), "utf8");
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.map(([, attrs]) => /src="([^"]+)"/.exec(attrs)?.[1])).toEqual([
      "https://cdn.paddle.com/paddle/v2/paddle.js",
      "pay.js",
    ]);
    for (const [, , body] of scripts) expect(body.trim()).toBe("");
    expect(html).not.toMatch(/<style\b|\sstyle=|\son[a-z]+=/i);
  });
});
