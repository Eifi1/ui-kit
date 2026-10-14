import { checkoutReturnUrl } from "../src/billing/checkout-return";
import {
  PAY_PAGE_LANG_PARAM,
  PAY_PAGE_TRANSACTION_PARAM,
  paddleLocale,
  payPageAppFor,
  payPageConfigProblems,
  payPageLanguage,
} from "../src/billing/pay-page";
import type { PayPageApp, PayPageConfig, PayPageLanguage, PayPageStrings } from "../src/billing/pay-page";

/**
 * The pay page's one script (docs/billing-harmonization.md §14.4): `dist/pay/pay.js`,
 * served by each app on `pay.<app domain>` beside Paddle.js and nothing else.
 *
 * It reads `pay-config.json` from its own origin, then hands Paddle.js the token, the
 * environment and the checkout's settings — the overlay, the buyer's locale and the
 * theme — and Paddle.js opens the transaction that `_ptxn` names by itself.
 *
 * Any app's transaction (§15.2.5, 0.39): the page shows the host's own app until the
 * checkout loads; `checkout.loaded` carries the transaction's `custom_data.app`, and the
 * page frames THAT app from the configuration's map — its name, Terms, Privacy and way
 * back. `checkout.completed` goes to its `checkoutReturnUrl(returnUrl)` (Paddle.js gets
 * no `successUrl`, which would be the host's). A transaction that names no app the map
 * knows — a payment-method update from Paddle's e-mail — gets no name and no Back, keeps
 * the host's Terms and Privacy, and once paid says `payDone`. A return URL only ever
 * comes from the map.
 *
 * Its own five lines say what is happening around that, in the kit's seven languages:
 * opening, nothing to pay, failed, closed, done. It writes nothing to storage and sends
 * nothing to the app's server: the only requests are the configuration file and
 * Paddle's.
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

/** One of Paddle.js's events: `checkout.loaded`, `checkout.closed`, `checkout.completed`…
 *  — with the checkout's data, whose `custom_data` is the transaction's (§14.3: `app`). */
export interface PaddleEvent {
  name?: string;
  data?: { custom_data?: Record<string, unknown> | null } | null;
}

export interface PaddleInitializeOptions {
  token: string;
  eventCallback?: (event: PaddleEvent) => void;
  checkout: {
    settings: {
      displayMode: "overlay";
      locale: string;
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
  /** Leaves for the app once paid — `window.location.assign`. */
  navigate: (url: string) => void;
}

/** Where the page is: the checkout opening (or open), nothing to pay, a failure, the
 *  checkout closed by the buyer, or paid for a transaction that names no app (0.39).
 *  Carried as `data-state` on `<main>`. */
export type PayPageState = "opening" | "nothing" | "failed" | "closed" | "done";

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
function frame(view: View, words: PayPageStrings, app: PayPageApp, doc: Document): void {
  link(view.back, words.back, app.returnUrl);
  if (view.app) view.app.textContent = app.name;
  view.legal?.setAttribute("aria-label", words.legal);
  link(view.terms, words.terms, app.termsUrl);
  link(view.privacy, words.privacy, app.privacyUrl);
  if (view.footer) view.footer.hidden = false;
  doc.title = app.name;
}

/** A transaction that names no app the page knows: no name and no way back; the host's
 *  Terms and Privacy stay. */
function unframe(view: View, doc: Document, title: string): void {
  if (view.back) {
    view.back.hidden = true;
    view.back.removeAttribute("href");
  }
  if (view.app) view.app.textContent = "";
  doc.title = title;
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
  const untitled = doc.title;
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
  const host = config.apps[config.app];
  frame(view, words, host, doc);

  const transaction = params.get(PAY_PAGE_TRANSACTION_PARAM);
  if (!config.token || !transaction) return show(view, words, "nothing");

  const paddle = env.paddle();
  if (!paddle) return show(view, words, "failed");
  try {
    if (config.environment === "sandbox") paddle.Environment.set("sandbox");
    // The app the transaction is for: the host's until the checkout says (§15.2.5).
    let app: PayPageApp | undefined = host;
    let paid = false;
    /** The event's app, when it carries the transaction's data; else the one known. */
    const appOf = (event: PaddleEvent): PayPageApp | undefined =>
      event.data && typeof event.data === "object" ? payPageAppFor(config, event.data.custom_data?.app) : app;
    paddle.Initialize({
      token: config.token,
      eventCallback: (event) => {
        if (paid) return;
        if (event?.name === "checkout.loaded") {
          app = appOf(event);
          if (app) frame(view, words, app, doc);
          else unframe(view, doc, untitled);
        } else if (event?.name === "checkout.completed") {
          paid = true;
          app = appOf(event);
          if (app) env.navigate(checkoutReturnUrl(app.returnUrl));
          else {
            unframe(view, doc, untitled);
            show(view, words, "done");
          }
        } else if (event?.name === "checkout.closed") {
          show(view, words, "closed");
        }
      },
      // Paddle.js opens the transaction `_ptxn` names with these settings by itself. No
      // `successUrl`: the way back is the transaction's app's, known once it loads.
      checkout: {
        settings: {
          displayMode: "overlay",
          locale: paddleLocale(language),
          theme: env.dark ? "dark" : "light",
        },
      },
    });
  } catch {
    return show(view, words, "failed");
  }
  return "opening";
}
