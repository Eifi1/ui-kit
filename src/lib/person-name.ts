/**
 * A person's name as the reader's language writes it — the one rule of
 * docs/auth-harmonization.md §3.2 for every place a name is shown: the top bar, the
 * account menu, user lists, avatars, feedback, the greeting in a mail.
 *
 * WHY A FUNCTION AND NOT `${first} ${last}`. The three apps move from one free-text
 * `display_name` to `first_name` + `last_name` (§2.3), and the moment a name has two
 * parts, their ORDER is a language rule, not a data rule:
 *
 *  - "First Last" in de-CH, en, fr, it and es — "Ada Example";
 *  - **"Last First" in hu** — Hungarian puts the family name first: "Example Ada";
 *  - **"LastFirst" with no space in zh** — a Chinese name is written family name first
 *    and run together: 李 + 小龙 → "李小龙". Only a name written in CJK characters,
 *    though: BOTH parts must hold Han (or kana, or hangul) characters. A Latin name read
 *    in Chinese stays as it is written — "Ada Lovelace", not "LovelaceAda" (the
 *    coordinator's refinement of §3.2, 2026-10-06).
 *
 * WHOSE language (§3.2, §10.6): on screen the READER's, so this takes the locale of the
 * UI, never the locale stored with the person. A mail uses the recipient's and a frozen
 * stamp the author's — that is server-kit's `full_name(first, last, locale)`, which
 * follows exactly these rules so a name reads the same in the app and in its mails.
 *
 * NOTHING IS GUESSED. Both parts are trimmed, and an empty part simply drops out: a
 * migrated keksdose or Kurvenschmiede user keeps the whole old display name as the
 * first name and an empty last name until they complete it (§3.3), and "Ada Example"
 * with no last name must still read "Ada Example" — not "Ada Example " and not a split
 * at the space. Inner spaces are the person's own and stay as typed.
 *
 * Only the language subtag counts ("de-CH" → "de", "zh-Hant-TW" → "zh"), and a language
 * this does not know reads "First Last", the order of the kit's five other languages.
 */

/** The two parts of a person's name. Either may be missing or blank: a migrated row
 *  has an empty `last` until it is completed (§3.3), and APIs send `null` for "none". */
export interface PersonName {
  /** The given name — `first_name`. */
  first?: string | null;
  /** The family name — `last_name`. */
  last?: string | null;
}

type NameOrder = "given-first" | "family-first" | "family-first-joined";

/** A part written in CJK characters: Han, and kana or hangul where they occur (a
 *  Japanese or Korean name in a Chinese UI). One such character is enough. */
const CJK = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

function language(locale: string | undefined): string {
  return (locale ?? "").split(/[-_]/)[0]!.toLowerCase();
}

/**
 * The order the reader's language writes THIS name in. See the module note: hu puts the
 * family name first for every name; zh runs a CJK name together family-first and leaves
 * any other name as it is written; the rest write the given name first. A part that is
 * empty passes the CJK test, so a one-part name orders by the part it has. Called with
 * at least one part filled in.
 */
function nameOrder(locale: string | undefined, first: string, last: string): NameOrder {
  const lang = language(locale);
  if (lang === "hu") return "family-first";
  if (lang === "zh" && (!first || CJK.test(first)) && (!last || CJK.test(last))) {
    return "family-first-joined";
  }
  return "given-first";
}

function clean(part: string | null | undefined): string {
  return (part ?? "").trim();
}

/**
 * The full name in the reader's order: "Ada Example" (en, de, fr, it, es), "Example Ada"
 * (hu), "李小龙" (zh, for a name in CJK characters — "Ada Lovelace" stays so). Trimmed;
 * with one part empty, the other alone; with both empty, `""` — so a caller can fall
 * back with `||` (`formatPersonName(p, l) || email`).
 *
 * `locale` is the READER's — the UI language, `useKitLocale()` in a component. Left out,
 * the given-name-first order.
 */
export function formatPersonName(name: PersonName, locale?: string): string {
  const first = clean(name.first);
  const last = clean(name.last);
  if (!last) return first;
  if (!first) return last;
  switch (nameOrder(locale, first, last)) {
    case "family-first":
      return `${last} ${first}`;
    case "family-first-joined":
      return `${last}${first}`;
    default:
      return `${first} ${last}`;
  }
}

/** One segmenter for every avatar on the page, made on first use. `null`: the runtime
 *  has none, and code points have to do. */
let graphemes: Intl.Segmenter | null | undefined;

/** The first user-perceived character — "É" whether it was typed as one code point or
 *  as E + a combining accent, a whole emoji rather than half a surrogate pair. */
function firstGrapheme(text: string): string {
  graphemes ??=
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  if (graphemes) {
    const segment = graphemes.segment(text)[Symbol.iterator]().next();
    if (!segment.done) return segment.value.segment;
  }
  return [...text][0] ?? "";
}

/** Upper case under the reader's rules (Turkish "i" → "İ"), and plain upper case for a
 *  locale tag the runtime refuses rather than a thrown RangeError in a render. */
function upper(text: string, locale: string | undefined): string {
  try {
    return text.toLocaleUpperCase(locale);
  } catch {
    return text.toUpperCase();
  }
}

/**
 * The initials for an avatar, in the same order as {@link formatPersonName}:
 *
 *  - "AE" for Ada Example in en, de, fr, it and es;
 *  - "EA" in hu, family name first;
 *  - **one character in zh for a name in CJK characters, the family name's first** —
 *    "李" for 李小龙. Two Chinese characters are not initials, they are most of a name.
 *    A Latin name in zh is "AE", as it is written.
 *
 * With only one part (a migrated user's whole old display name in `first`, §3.3), the
 * initials are what {@link avatarInitials} has always made of a display name: the first
 * letters of its first two words ("Ada Example" → "AE"), or the first two letters of a
 * single word ("Ada" → "AD") — so nobody's avatar changes when their account migrates.
 * In zh, a part in CJK characters gives its first character.
 *
 * `""` when both parts are blank; {@link UserAvatar} then falls back to the email.
 */
export function personInitials(name: PersonName, locale?: string): string {
  const first = clean(name.first);
  const last = clean(name.last);
  if (!first && !last) return "";
  const order = nameOrder(locale, first, last);
  if (order === "family-first-joined") return upper(firstGrapheme(last || first), locale);
  if (!first || !last) {
    const words = (first || last).split(/\s+/);
    const initials =
      words.length >= 2
        ? firstGrapheme(words[0]!) + firstGrapheme(words[1]!)
        : [...words[0]!].slice(0, 2).join("");
    return upper(initials, locale);
  }
  const pair = order === "family-first" ? [last, first] : [first, last];
  return upper(firstGrapheme(pair[0]!) + firstGrapheme(pair[1]!), locale);
}
