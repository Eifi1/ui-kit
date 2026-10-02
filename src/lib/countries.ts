/**
 * Countries as ISO 3166-1 alpha-2 codes, named by the runtime — for {@link CountrySelect}
 * and for an app that shows the code it stored ("CH") as a name somewhere else (a
 * table cell, an address line).
 *
 * The kit ships CODES, not names. Every runtime the kit supports has
 * `Intl.DisplayNames({ type: "region" })`, which names all of these in every locale
 * the browser knows — so a table of 249 names per language would be a large file
 * that is out of date the day a country is renamed (Türkiye, Czechia, Eswatini) and
 * still covers fewer languages than the browser does. What is left to ship is the
 * list of which codes ARE countries, and that is one string.
 */

/**
 * Every officially assigned ISO 3166-1 alpha-2 code — the 249 countries, territories
 * and areas of the standard, upper-case, in code order.
 *
 * User-assigned codes are deliberately not in it: `XK` (Kosovo) is a widespread
 * convention, not ISO, and whether to offer it is the app's decision. An app that
 * wants it passes its own list to `CountrySelect`'s `countries` — the runtime names
 * `XK` as well.
 */
export const COUNTRY_CODES: readonly string[] = Object.freeze(
  (
    "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ " +
    "BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM " +
    "DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS " +
    "GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN " +
    "KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ " +
    "MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM " +
    "PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV " +
    "SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI " +
    "VN VU WF WS YE YT ZA ZM ZW"
  ).split(" "),
);

/** Two ASCII letters — the shape of an alpha-2 code, whatever the case. */
const ALPHA_2 = /^[A-Za-z]{2}$/;

/** `code` upper-cased when it has the shape of an alpha-2 code, else `undefined`. Does
 *  not check that ISO assigned it — see {@link COUNTRY_CODES} for why `XK` must pass. */
export function normalizeCountryCode(code: string | null | undefined): string | undefined {
  return code && ALPHA_2.test(code) ? code.toUpperCase() : undefined;
}

// One `DisplayNames` per locale, built on first use. `null` records a locale the
// runtime refused (a malformed tag) or a runtime without the API, so neither is
// retried for every row of a 249-row list.
const namers = new Map<string, Intl.DisplayNames | null>();

function namer(locale: string): Intl.DisplayNames | null {
  let n = namers.get(locale);
  if (n === undefined) {
    try {
      n = new Intl.DisplayNames([locale], { type: "region", fallback: "code" });
    } catch {
      n = null;
    }
    namers.set(locale, n);
  }
  return n;
}

/**
 * The name of the country `code` stands for, in `locale` — `countryName("CH", "de-CH")`
 * is "Schweiz". Falls back to the upper-cased code itself when the runtime has no name
 * for it, rejects the locale, or has no `Intl.DisplayNames`: a code is still the right
 * answer, where an empty cell would not be.
 *
 * `locale` defaults to English rather than to the runtime's language, the rule the
 * kit's currency names follow (`currencyName`): an app that never set a locale reads
 * the kit's English everywhere else, and a country list in the browser's language
 * beside English labels — or in the test runner's — is two languages on one form.
 *
 * The code is upper-cased first. `DisplayNames` is case-sensitive about it in some
 * runtimes (Node answers "ch" with "ch"), and the codes reach this from forms,
 * URLs and databases in either case.
 */
export function countryName(code: string, locale: string = "en"): string {
  const upper = code.toUpperCase();
  const n = namer(locale);
  if (n) {
    try {
      const name = n.of(upper);
      if (name) return name;
    } catch {
      // Not a well-formed region subtag ("C1", "") — the code is all there is.
    }
  }
  return upper;
}
