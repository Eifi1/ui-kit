import {
  PAY_PAGE_LANG_PARAM,
  PAY_PAGE_TRANSACTION_PARAM,
  paddleLocale,
  payPageConfigProblems,
  payPageLanguage,
  paySuccessUrl,
} from "../src/billing/pay-page";
import type { PayPageConfig, PayPageLanguage, PayPageStrings } from "../src/billing/pay-page";

/**
 * The pay page's one script (docs/billing-harmonization.md §14.4): `dist/pay/pay.js`,
 * served by each app on `pay.<app domain>` beside Paddle.js and nothing else.
 *
 * It reads `pay-config.json` from its own origin, then hands Paddle.js the token, the
 * environment and the checkout's settings — the overlay, the buyer's locale, the way
 * back (`?checkout=done` on the app's subscription page) and the theme — and Paddle.js
 * opens the transaction that `_ptxn` names by itself. Its own four lines say what is
 * happening around that, in the kit's seven languages: opening, nothing to pay, failed,
 * closed. It writes nothing to storage and sends nothing to the app's server: the only
 * requests are the configuration file and Paddle's.
 *
 * No React and no app code: this file, `src/billing/pay-page.ts` and
 * `src/billing/checkout-return.ts` are the whole bundle; the words are built in from the
 * kit's catalogues at the kit's build (`scripts/build-pay-page.mjs`).
 */

/** The part of Paddle.js (Paddle Billing, v2) the page calls. */
export interface PaddleJs {
  Environment: { set(environment: "sandbox"): void };
  Initialize(options: PaddleInitializeOptions): void;
}

/** One of Paddle.js's events: `checkout.loaded`, `checkout.closed`, `checkout.completed`… */
export interface PaddleEvent {
  name?: string;
}

export interface PaddleInitializeOptions {
  token: string;
  eventCallback?: (event: PaddleEvent) => void;
  checkout: {
    settings: {
      displayMode: "overlay";
      locale: string;
      successUrl: string;
      theme: "light" | "dark";
    };
  };
}

/** What the page runs against — the browser's, in `main.ts`; a test's own. */
export interface PayPageEnvironment {
  document: Document;
  /** The page's query: `_ptxn`, and `lang` from `payPageUrl`. */
  search: string;
  /** The browser's languages, in its order: the fallback for a missing `lang`. */
  languages: readonly string[];
  /** Paddle.js's global, read once the configuration is in; undefined when its script
   *  didn't load (blocked, offline, a CSP that disagrees). */
  paddle: () => PaddleJs | undefined;
  /** `pay-config.json`, parsed; a rejection is a missing or unreadable file. */
  fetchConfig: () => Promise<unknown>;
  /** `prefers-color-scheme: dark`: Paddle's checkout follows it. */
  dark: boolean;
  /** The page's words, per language. */
  strings: Readonly<Record<PayPageLanguage, PayPageStrings>>;
}

/** Where the page is: the checkout opening (or open), nothing to pay, a failure, or the
 *  checkout closed by the buyer. Carried as `data-state` on `<main>`. */
export type PayPageState = "opening" | "nothing" | "failed" | "closed";

/** The page's elements (index.html's ids). */
interface View {
  main: HTMLElement | null;
  message: HTMLElement | null;
  back: HTMLAnchorElement | null;
  footer: HTMLElement | null;
  app: HTMLElement | null;
  legal: HTMLElement | null;
  terms: HTMLAnchorElement | null;
  privacy: HTMLAnchorElement | null;
}

function viewOf(doc: Document): View {
  const get = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T | null;
  return {
    main: get("pay"),
    message: get("pay-message"),
    back: get<HTMLAnchorElement>("pay-back"),
    footer: get("pay-footer"),
    app: get("pay-app"),
    legal: get("pay-legal"),
    terms: get<HTMLAnchorElement>("pay-terms"),
    privacy: get<HTMLAnchorElement>("pay-privacy"),
  };
}

/** Each state's line is the word of the same name. */
function show(view: View, words: PayPageStrings, state: PayPageState): PayPageState {
  if (view.main) view.main.dataset.state = state;
  if (view.message) view.message.textContent = words[state];
  return state;
}

/** A link, by its text and its address. textContent and href only: nothing from the
 *  configuration becomes markup. */
function link(anchor: HTMLAnchorElement | null, text: string, href: string): void {
  if (!anchor) return;
  anchor.textContent = text;
  anchor.href = href;
  anchor.hidden = false;
}

/** The way back and the footer — the app's name and its Terms and Privacy, which
 *  Paddle's domain review wants easy to find. */
function frame(view: View, words: PayPageStrings, config: PayPageConfig, doc: Document): void {
  link(view.back, words.back, config.returnUrl);
  if (view.app) view.app.textContent = config.appName;
  view.legal?.setAttribute("aria-label", words.legal);
  link(view.terms, words.terms, config.termsUrl);
  link(view.privacy, words.privacy, config.privacyUrl);
  if (view.footer) view.footer.hidden = false;
  doc.title = config.appName;
}

/**
 * Runs the page: the language, the configuration, then Paddle.js. Answers the state it
 * left the page in — `opening` once Paddle.js has the transaction; the buyer closing the
 * checkout later turns it to `closed`.
 */
export async function startPayPage(env: PayPageEnvironment): Promise<PayPageState> {
  const params = new URLSearchParams(env.search);
  const language = payPageLanguage(params.get(PAY_PAGE_LANG_PARAM), env.languages);
  const words = env.strings[language] ?? env.strings.en;
  const doc = env.document;
  doc.documentElement.lang = language;
  const view = viewOf(doc);
  show(view, words, "opening");

  let raw: unknown;
  try {
    raw = await env.fetchConfig();
  } catch {
    return show(view, words, "failed");
  }
  if (payPageConfigProblems(raw).length > 0) {
    // A configuration the build script would have refused: someone wrote it by hand.
    // Its return URL is not trusted either, so there is no way back to offer.
    return show(view, words, "failed");
  }
  const config = raw as PayPageConfig;
  frame(view, words, config, doc);

  const transaction = params.get(PAY_PAGE_TRANSACTION_PARAM);
  if (!config.token || !transaction) return show(view, words, "nothing");

  const paddle = env.paddle();
  if (!paddle) return show(view, words, "failed");
  try {
    if (config.environment === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({
      token: config.token,
      eventCallback: (event) => {
        if (event?.name === "checkout.closed") show(view, words, "closed");
      },
      // Paddle.js opens the transaction `_ptxn` names with these settings by itself.
      checkout: {
        settings: {
          displayMode: "overlay",
          locale: paddleLocale(language),
          successUrl: paySuccessUrl(config),
          theme: env.dark ? "dark" : "light",
        },
      },
    });
  } catch {
    return show(view, words, "failed");
  }
  return "opening";
}
