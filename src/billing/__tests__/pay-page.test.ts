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
import type { useKitLocale } from "../../i18n/kit-labels";
import {
  PAY_PAGE_APPS,
  PAY_PAGE_LANG_PARAM,
  paddleLocale,
  payPageAppFor,
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

  it("takes no locale at all as English (0.33.1)", () => {
    expect(paddleLocale(undefined)).toBe("en");
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

  it("takes `useKitLocale()`'s undefined: no lang, so the page reads the browser's, else English (0.33.1, keksdose)", () => {
    // What `useKitLocale()` answers with no provider locale, typed as it is: the call
    // compiles without a `?? "en"` at every call site.
    const locale: ReturnType<typeof useKitLocale> = undefined;
    const link = "https://pay.keksdose.app/?_ptxn=txn_01abc";
    expect(payPageUrl(link, locale)).toBe(link);
    expect(payPageLanguage(new URL(payPageUrl(link, locale)).searchParams.get(PAY_PAGE_LANG_PARAM), [])).toBe("en");
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
  app: "keksdose",
  apps: { ...PAY_PAGE_APPS },
};
const KEKSDOSE = PAY_PAGE_APPS.keksdose;

describe("PAY_PAGE_APPS — the apps every pay page serves (§15.2.6)", () => {
  it("names the three apps by their billing_app tag, each with its Terms, Privacy and way back", () => {
    expect(PAY_PAGE_APPS).toEqual({
      keksdose: {
        name: "Keksdose",
        returnUrl: "https://keksdose.app/settings/subscription",
        termsUrl: "https://keksdose.app/terms",
        privacyUrl: "https://keksdose.app/privacy",
      },
      kastlan: {
        name: "Kastlan", // 0.39.1 (kastlan): the product's own spelling
        returnUrl: "https://kastlan.app/admin/billing",
        termsUrl: "https://kastlan.app/terms",
        privacyUrl: "https://kastlan.app/privacy",
      },
      kurvenschmiede: {
        name: "Kurvenschmiede",
        returnUrl: "https://kurvenschmiede.app/settings/subscription",
        termsUrl: "https://kurvenschmiede.app/terms",
        privacyUrl: "https://kurvenschmiede.app/privacy",
      },
    });
    expect(Object.isFrozen(PAY_PAGE_APPS)).toBe(true);
    expect(payPageConfigProblems(CONFIG)).toEqual([]);
  });

  it("finds a transaction's app by its own tag only", () => {
    expect(payPageAppFor(CONFIG, "kastlan")).toBe(PAY_PAGE_APPS.kastlan);
    for (const tag of [undefined, null, "", "lenkbank", "__proto__", "constructor", "toString", 7, "KASTLAN"]) {
      expect(payPageAppFor(CONFIG, tag), String(tag)).toBeUndefined();
    }
  });
});

describe("pay-config.json's rules (§14.4, §15.2.6)", () => {
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

  it("wants https:// URLs, http:// for localhost only, and each app's name", () => {
    const keksdose = (app: Partial<typeof KEKSDOSE>) => ({ ...CONFIG, apps: { ...CONFIG.apps, keksdose: { ...KEKSDOSE, ...app } } });
    expect(payPageConfigProblems(keksdose({ returnUrl: "http://keksdose.app/settings/subscription" }))).toEqual([
      "apps.keksdose.returnUrl must be an https:// URL (http:// for localhost only)",
    ]);
    expect(payPageConfigProblems(keksdose({ returnUrl: "http://localhost:5173/settings/subscription" }))).toEqual([]);
    expect(payPageConfigProblems(keksdose({ termsUrl: "javascript:alert(1)", privacyUrl: "/privacy" }))).toHaveLength(2);
    expect(payPageConfigProblems(keksdose({ name: " " }))).toEqual(["apps.keksdose.name is missing"]);
    expect(payPageConfigProblems(null)).toEqual(["the configuration is not an object"]);
  });

  it("wants the host's app in the map, and app tags as billing_app writes them", () => {
    expect(payPageConfigProblems({ ...CONFIG, app: "lenkbank" })).toEqual([
      'app "lenkbank" is not in apps (keksdose, kastlan, kurvenschmiede)',
    ]);
    expect(payPageConfigProblems({ ...CONFIG, app: "" })).toEqual(["app is missing: the host's own app tag"]);
    expect(payPageConfigProblems({ ...CONFIG, apps: { ...CONFIG.apps, "Pay Me": KEKSDOSE } })).toEqual([
      'apps: "Pay Me" is not an app tag (a-z, 0-9, _ and -)',
    ]);
    expect(payPageConfigProblems({ ...CONFIG, apps: { ...CONFIG.apps, lenkbank: "x" } })).toEqual([
      "apps.lenkbank is not an object",
    ]);
    expect(payPageConfigProblems({ ...CONFIG, apps: {} })).toEqual([
      "apps must map each app's tag to its name and URLs",
      'app "keksdose" is not in apps',
    ]);
    // The 0.33 shape, one app's fields at the top: refused, not half-read.
    expect(
      payPageConfigProblems({ token: null, environment: null, returnUrl: KEKSDOSE.returnUrl, appName: "Keksdose" }),
    ).toEqual(["apps must map each app's tag to its name and URLs", "app is missing: the host's own app tag"]);
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
      done: "Payment complete. You can close this page.",
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
    navigate: () => {},
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
    // No successUrl: the way back is the transaction's app's (§15.2.5).
    expect(calls.init[0].checkout.settings).toEqual({ displayMode: "overlay", locale: "fr", theme: "dark" });
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
    expect(back.href).toBe(KEKSDOSE.returnUrl);
    expect(document.getElementById("pay-footer")!.hidden).toBe(false);
    expect(document.getElementById("pay-app")).toHaveTextContent("Keksdose");
    expect(document.getElementById("pay-legal")).toHaveAttribute("aria-label", STRINGS.fr.legal);
    expect(document.getElementById("pay-terms")).toHaveAttribute("href", KEKSDOSE.termsUrl);
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
          fetchConfig: async () => ({
            ...CONFIG,
            apps: { ...CONFIG.apps, keksdose: { ...KEKSDOSE, returnUrl: "javascript:alert(1)" } },
            token: "test_x",
          }),
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

  it("frames the app the transaction names once it loads, and returns there once paid (§15.2.5)", async () => {
    const { paddle, calls } = fakePaddle();
    const navigate = vi.fn();
    await startPayPage(env({ paddle: () => paddle, navigate }));
    // The host's own app until the checkout says.
    expect(document.getElementById("pay-app")).toHaveTextContent("Keksdose");
    const loaded = { name: "checkout.loaded", data: { custom_data: { app: "kastlan", payer: "company:9" } } };
    calls.init[0].eventCallback?.(loaded);
    expect(document.getElementById("pay-app")).toHaveTextContent("Kastlan");
    expect(document.title).toBe("Kastlan");
    expect(document.getElementById("pay-back")).toHaveAttribute("href", "https://kastlan.app/admin/billing");
    expect(document.getElementById("pay-terms")).toHaveAttribute("href", "https://kastlan.app/terms");
    expect(document.getElementById("pay-privacy")).toHaveAttribute("href", "https://kastlan.app/privacy");
    calls.init[0].eventCallback?.({ name: "checkout.completed", data: { custom_data: { app: "kastlan" } } });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("https://kastlan.app/admin/billing?checkout=done");
    // Paddle's overlay closing after the payment changes nothing.
    calls.init[0].eventCallback?.({ name: "checkout.closed" });
    expect(state()).toBe("opening");
  });

  it("returns to the app checkout.loaded named when checkout.completed carries no data", async () => {
    const { paddle, calls } = fakePaddle();
    const navigate = vi.fn();
    await startPayPage(env({ paddle: () => paddle, navigate }));
    calls.init[0].eventCallback?.({ name: "checkout.loaded", data: { custom_data: { app: "kurvenschmiede" } } });
    calls.init[0].eventCallback?.({ name: "checkout.completed" });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("https://kurvenschmiede.app/settings/subscription?checkout=done");
  });

  it("names no app and offers no way back for an unknown tag or none, keeps the host's Terms, and says payDone", async () => {
    for (const data of [{ custom_data: { app: "lenkbank" } }, { custom_data: null }, {}, { custom_data: { app: "__proto__" } }]) {
      mountPage();
      document.title = "Checkout";
      const { paddle, calls } = fakePaddle();
      const navigate = vi.fn();
      await startPayPage(env({ paddle: () => paddle, navigate }));
      calls.init[0].eventCallback?.({ name: "checkout.loaded", data });
      const back = document.getElementById("pay-back") as HTMLAnchorElement;
      expect(back.hidden, JSON.stringify(data)).toBe(true);
      expect(back.hasAttribute("href")).toBe(false);
      expect(document.getElementById("pay-app")!.textContent).toBe("");
      expect(document.title).toBe("Checkout");
      expect(document.getElementById("pay-terms")).toHaveAttribute("href", KEKSDOSE.termsUrl);
      expect(document.getElementById("pay-footer")!.hidden).toBe(false);
      calls.init[0].eventCallback?.({ name: "checkout.completed", data });
      expect(navigate).not.toHaveBeenCalled();
      expect(state()).toBe("done");
      expect(message()).toBe(STRINGS.fr.done);
      calls.init[0].eventCallback?.({ name: "checkout.closed" });
      expect(state()).toBe("done");
    }
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
      env({
        paddle: () => paddle,
        fetchConfig: async () => ({
          ...CONFIG,
          apps: { ...CONFIG.apps, keksdose: { ...KEKSDOSE, name: "<img src=x onerror=alert(1)>" } },
        }),
      }),
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
