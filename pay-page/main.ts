import { PAY_CONFIG_FILE } from "../src/billing/pay-page";
import type { PayPageLanguage, PayPageStrings } from "../src/billing/pay-page";
import { startPayPage } from "./pay";
import type { PaddleJs } from "./pay";

/**
 * `pay.js`'s entry: {@link startPayPage} in the browser. Kept apart from `pay.ts` so a
 * test drives the page with its own document, configuration and Paddle.
 */

/** The page's words in the kit's seven languages, put in by the build
 *  (`scripts/build-pay-page.mjs`, from the built catalogues). */
declare const __PAY_STRINGS__: Readonly<Record<PayPageLanguage, PayPageStrings>>;

void startPayPage({
  document,
  search: window.location.search,
  languages: navigator.languages?.length ? navigator.languages : [navigator.language],
  paddle: () => (window as Window & { Paddle?: PaddleJs }).Paddle,
  fetchConfig: async () => {
    // From the page's own origin; nothing is sent with it.
    const response = await fetch(PAY_CONFIG_FILE, { cache: "no-cache", credentials: "omit" });
    if (!response.ok) throw new Error(`${PAY_CONFIG_FILE}: ${response.status}`);
    return response.json();
  },
  dark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
  strings: __PAY_STRINGS__,
});
