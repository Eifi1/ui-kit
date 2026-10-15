import type { UiKitLabels } from "../i18n/kit-labels";

/**
 * The kit's pay page (docs/billing-harmonization.md §14.4, decision 19 as amended by
 * §15.2): a standalone static page that ui-kit ships as `dist/pay/`, and that each app
 * serves on its own pay host, `pay.<app domain>` — a separate origin, approved in Paddle,
 * where Paddle.js shares the origin with nothing: no sign-in, no app code, no storage.
 * Since 0.39 every pay page serves ANY app's transaction: it names the app from the
 * transaction's custom data, from the kit's map {@link PAY_PAGE_APPS}, not from its
 * domain — Paddle's single default payment link reaches one host for all three apps.
 *
 * Paddle's create-transaction answers `checkout.url`: the pay page's URL plus
 * `?_ptxn=<txn>`, and Paddle.js on that page opens the transaction by itself. The app
 * sends the buyer there with {@link payPageUrl}, which adds the buyer's language; the
 * page maps it to Paddle's checkout locale ({@link paddleLocale}). Everything else the
 * page needs — the client-side token, sandbox or live, the host's app and the map of
 * apps with their ways back — is the host's `pay-config.json`, written at its web build
 * by the `eifi1-pay-page` script.
 *
 * Pure, and React-free: the page's own script (`pay-page/pay.ts`) and that build script
 * bundle this module. The barrel exports the link's parts and the app map ({@link PAY_PAGE_APPS},
 * {@link PayPageApp}); the exports marked @internal are theirs.
 */

/** Paddle's two environments: the sandbox's client-side tokens start `test_`, live
 *  ones `live_`. */
export type PaddleEnvironment = "sandbox" | "live";

/** The pay page's language parameter: `?lang=<kit locale>`. */
export const PAY_PAGE_LANG_PARAM = "lang";

/** The kit's seven languages (`KitLanguageCode`), as the page reads them. */
const PAY_PAGE_LANGUAGES = ["de-CH", "en", "es", "fr", "it", "hu", "zh"] as const;

/** One of the kit's languages, as the page speaks it. */
export type PayPageLanguage = (typeof PAY_PAGE_LANGUAGES)[number];

/**
 * The kit's language → Paddle's checkout locale (`Paddle.Checkout.open`,
 * `settings.locale`, read 2026-10-09: ar, zh-Hans, zh-TW, da, nl, en, fr, de, it, ja, ko,
 * no, pl, pt, pt-BR, tr, ru, es, sv). Paddle has no Hungarian: a Hungarian buyer gets
 * English always, not Paddle's guess from the browser. The page's own lines stay in the
 * kit's language, Hungarian included.
 */
const PADDLE_LOCALES: Readonly<Record<PayPageLanguage, string>> = {
  en: "en",
  "de-CH": "de",
  fr: "fr",
  it: "it",
  es: "es",
  zh: "zh-Hans",
  hu: "en",
};

/** Paddle's transaction parameter on a pay page link. @internal */
export const PAY_PAGE_TRANSACTION_PARAM = "_ptxn";

/**
 * The kit language one tag names, or undefined — `resolveLanguage`'s rule
 * (src/i18n/languages.ts), restated here because that module loads the seven catalogues
 * and the page must stay a few kilobytes: exact first, ignoring case and reading `_` as
 * `-`; then by language, so every German is `de-CH`, every Chinese `zh` (Simplified),
 * and any regional form its base (`fr-CA` → `fr`).
 */
function kitLanguageOf(tag: unknown): PayPageLanguage | undefined {
  if (typeof tag !== "string") return undefined;
  const clean = tag.trim().replace(/_/g, "-");
  if (!clean) return undefined;
  const lower = clean.toLowerCase();
  const exact = PAY_PAGE_LANGUAGES.find((code) => code.toLowerCase() === lower);
  if (exact) return exact;
  const language = lower.split("-")[0];
  return PAY_PAGE_LANGUAGES.find((code) => code.split("-")[0].toLowerCase() === language);
}

/**
 * The kit's locale → Paddle's checkout locale: `de-CH` → `de`, `zh` → `zh-Hans`, `hu` →
 * `en` (Paddle has no Hungarian), the others as they are. Any tag is read as the kit
 * reads it (`de-AT` is the one German, `zh-TW` the one Chinese); one the kit doesn't
 * ship is English, and so is `undefined` (0.33.1) — `useKitLocale()` with no provider
 * locale.
 */
export function paddleLocale(kitLocale: string | undefined): string {
  return PADDLE_LOCALES[kitLanguageOf(kitLocale) ?? "en"];
}

/**
 * The checkout's `{url}` with the buyer's language: `lang=<kit locale>` on a pay page
 * link (one that carries `_ptxn`); any other URL — a hosted checkout's, which takes its
 * own `locale` — unchanged, as is a locale the kit doesn't ship.
 *
 *     const { url } = await api.checkout({ plan, interval, currency });
 *     noteCheckoutStarted(user.id, overview);
 *     window.location.assign(payPageUrl(url, locale));   // locale = useKitLocale()
 *
 * `locale` may be `undefined` (0.33.1, keksdose): `useKitLocale()` answers that with no
 * provider locale, the runtime's language. The link then goes without `lang`, and the
 * page speaks the browser's language, else English — what a missing or wrong `lang`
 * already did: it costs nothing but the language.
 */
export function payPageUrl(checkoutUrl: string, locale: string | undefined): string {
  const language = kitLanguageOf(locale);
  if (!language) return checkoutUrl;
  let url: URL;
  try {
    url = new URL(checkoutUrl);
  } catch {
    return checkoutUrl;
  }
  if (!url.searchParams.has(PAY_PAGE_TRANSACTION_PARAM)) return checkoutUrl;
  url.searchParams.set(PAY_PAGE_LANG_PARAM, language);
  return url.toString();
}

/**
 * The language the page speaks: its `lang` parameter, else the browser's languages in
 * their order, each matched to the kit's; else English. @internal
 */
export function payPageLanguage(
  lang: string | null | undefined,
  browserLanguages: readonly string[] = [],
): PayPageLanguage {
  for (const candidate of [lang, ...browserLanguages]) {
    const found = kitLanguageOf(candidate);
    if (found) return found;
  }
  return "en";
}

/* ── The page's words ──────────────────────────────────────────────────────── */

/**
 * The page's words in one language — built into `pay.js` at the kit's build from the
 * seven catalogues, since the page has no React and no provider. @internal
 */
export interface PayPageStrings {
  /** `billing.payOpening`, while the checkout opens. */
  opening: string;
  /** `billing.payNothing`: no `_ptxn`, or no token (billing off). */
  nothing: string;
  /** `billing.payFailed`: Paddle.js didn't load, or the configuration is wrong. */
  failed: string;
  /** `billing.payBack`: the buyer closed the checkout. */
  closed: string;
  /** `billing.payDone` (0.39): paid, for a transaction that names no app the page
   *  knows — there is no way back to offer. */
  done: string;
  /** `common.back`: the link to the app's subscription page. */
  back: string;
  /** `legal.links.terms` and `legal.links.privacy`: the footer's links. */
  terms: string;
  privacy: string;
  /** `legal.navLabel`: the footer's `<nav>`. */
  legal: string;
}

/** The page's words, read from one of the kit's catalogues. @internal */
export function payPageStrings(labels: UiKitLabels): PayPageStrings {
  return {
    opening: labels.billing.payOpening,
    nothing: labels.billing.payNothing,
    failed: labels.billing.payFailed,
    closed: labels.billing.payBack,
    done: labels.billing.payDone,
    back: labels.common.back,
    terms: labels.legal.links.terms,
    privacy: labels.legal.links.privacy,
    legal: labels.legal.navLabel,
  };
}

/* ── pay-config.json ───────────────────────────────────────────────────────── */

/** The configuration file beside the page, written at each app's web build. @internal */
export const PAY_CONFIG_FILE = "pay-config.json";

/**
 * One app a pay page serves (docs/billing-harmonization.md §15.2.6): its name, the way
 * back and its Terms and Privacy. Every pay page knows every app, because Paddle's links
 * — its single default payment link, a payment-method update from its e-mails — reach
 * whichever page the account names, whatever app the transaction is for.
 */
export interface PayPageApp {
  /** The app's display name: the footer's line and the page's title. */
  name: string;
  /** The app's subscription page. Once paid, the page goes to
   *  `checkoutReturnUrl(returnUrl)`; "Back" goes here. */
  returnUrl: string;
  termsUrl: string;
  privacyUrl: string;
}

/** An app's tag: server-kit's `billing_app` pattern, the key of {@link PAY_PAGE_APPS}
 *  and the `app` of a transaction's custom data (§14.3). */
const APP_TAG = /^[a-z][a-z0-9_-]{0,63}$/;

/** An app on its site: the name, the Terms and Privacy at `/terms` and `/privacy`, and
 *  its subscription page. */
function appAt(name: string, site: string, returnPath: string): PayPageApp {
  return { name, returnUrl: `${site}${returnPath}`, termsUrl: `${site}/terms`, privacyUrl: `${site}/privacy` };
}

/**
 * The apps the kit's pay pages serve, by their `billing_app` tag (§15.2.6) — one source,
 * so the three pay hosts can't drift. A new app, or a page that moves, is a kit release.
 * The bin writes it into `pay-config.json`; `--app-url` moves the host's own app to
 * another site (a local stack, a dev deploy) and `--apps <file>` merges a map over it.
 */
export const PAY_PAGE_APPS: Readonly<Record<string, Readonly<PayPageApp>>> = Object.freeze({
  keksdose: Object.freeze(appAt("Keksdose", "https://keksdose.app", "/settings/subscription")),
  kastlan: Object.freeze(appAt("Kastlan", "https://kastlan.app", "/admin/billing")),
  kurvenschmiede: Object.freeze(appAt("Kurvenschmiede", "https://kurvenschmiede.app", "/settings/subscription")),
});

/**
 * `pay-config.json`: what the page needs that differs per deployment (§15.2.6). Read by
 * the page from its own origin — never from the query, where Paddle's own links (it
 * puts only `_ptxn` there) would lack it and a return URL would be an open redirect on
 * an approved payment domain. @internal
 */
export interface PayPageConfig {
  /** Paddle's client-side token (`test_…` for the sandbox, `live_…` for live); null
   *  while billing is off, and the page says `payNothing`. */
  token: string | null;
  environment: PaddleEnvironment | null;
  /** The host's own app, a key of `apps`: the page shows it until the checkout loads,
   *  and its Terms and Privacy stay for a transaction that names no app. */
  app: string;
  /** Every app the page serves, by tag. The transaction's `custom_data.app` picks one;
   *  a return URL only ever comes from here. */
  apps: Record<string, PayPageApp>;
}

/** Paddle's client-side token prefixes, per environment. */
const TOKEN_PREFIX: Readonly<Record<PaddleEnvironment, string>> = { sandbox: "test_", live: "live_" };

/** `https://`, or `http://` on this machine only (`localhost`, `127.0.0.1`, `[::1]`). @internal */
export function isPayPageUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

/** Whether `tag` is a tag of `apps`, its own key — never `__proto__` or `constructor`. */
function hasApp(apps: unknown, tag: unknown): tag is string {
  return (
    typeof tag === "string" &&
    APP_TAG.test(tag) &&
    typeof apps === "object" &&
    apps !== null &&
    Object.prototype.hasOwnProperty.call(apps, tag)
  );
}

/**
 * The app a transaction's custom data names (`custom_data.app`, §14.3), from the page's
 * map — or undefined for none, or a tag the map doesn't know. @internal
 */
export function payPageAppFor(config: Pick<PayPageConfig, "apps">, tag: unknown): PayPageApp | undefined {
  return hasApp(config.apps, tag) ? config.apps[tag] : undefined;
}

/** The problems of one app of the map. */
function appProblems(tag: string, app: unknown): string[] {
  if (typeof app !== "object" || app === null) return [`apps.${tag} is not an object`];
  const a = app as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof a.name !== "string" || a.name.trim() === "") problems.push(`apps.${tag}.name is missing`);
  for (const key of ["returnUrl", "termsUrl", "privacyUrl"] as const) {
    if (!isPayPageUrl(a[key])) problems.push(`apps.${tag}.${key} must be an https:// URL (http:// for localhost only)`);
  }
  return problems;
}

/**
 * What is wrong with a `pay-config.json`, one line each — `[]` when nothing is. The
 * build script refuses to write a file with any (so a wrong pairing fails the build,
 * not a buyer), and the page says `payFailed` for one it reads:
 *
 * - a token whose prefix disagrees with the environment (`test_` ↔ sandbox, `live_` ↔
 *   live), or a token without an environment;
 * - an app tag that isn't a `billing_app` tag (`^[a-z][a-z0-9_-]{0,63}$`), an app
 *   without a name, or a return, terms or privacy URL that isn't `https://` (`http://`
 *   for localhost only);
 * - no `app`, or one that isn't in `apps`. @internal
 */
export function payPageConfigProblems(config: unknown): string[] {
  if (typeof config !== "object" || config === null) return ["the configuration is not an object"];
  const c = config as Record<string, unknown>;
  const problems: string[] = [];
  const { token, environment } = c;
  if (environment !== null && environment !== undefined && environment !== "sandbox" && environment !== "live") {
    problems.push(`environment must be "sandbox" or "live", not ${JSON.stringify(environment)}`);
  }
  if (token !== null && token !== undefined) {
    if (typeof token !== "string" || token === "") {
      problems.push("token must be Paddle's client-side token, or null while billing is off");
    } else if (environment !== "sandbox" && environment !== "live") {
      problems.push("a token needs its environment: sandbox or live");
    } else if (!token.startsWith(TOKEN_PREFIX[environment]) || token.length === TOKEN_PREFIX[environment].length) {
      const other = environment === "sandbox" ? "live" : "sandbox";
      problems.push(
        token.startsWith(TOKEN_PREFIX[other])
          ? `the token is a ${other} token (${TOKEN_PREFIX[other]}…), but the environment is ${environment}`
          : `a ${environment} token starts with ${TOKEN_PREFIX[environment]}`,
      );
    }
  }
  const { apps, app } = c;
  if (typeof apps !== "object" || apps === null || Array.isArray(apps) || Object.keys(apps).length === 0) {
    problems.push("apps must map each app's tag to its name and URLs");
  } else {
    for (const [tag, entry] of Object.entries(apps)) {
      if (!APP_TAG.test(tag)) problems.push(`apps: ${JSON.stringify(tag)} is not an app tag (a-z, 0-9, _ and -)`);
      else problems.push(...appProblems(tag, entry));
    }
  }
  if (typeof app !== "string" || app === "") problems.push("app is missing: the host's own app tag");
  else if (!hasApp(apps, app)) {
    const known = typeof apps === "object" && apps !== null ? Object.keys(apps).join(", ") : "";
    problems.push(`app ${JSON.stringify(app)} is not in apps${known ? ` (${known})` : ""}`);
  }
  return problems;
}
