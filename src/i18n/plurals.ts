/**
 * Every plural category a language has, filled from the key family's `_other` — for an
 * app's i18next catalogue, before i18next sees it.
 *
 * The apps write English's two forms, `key_one` and `key_other`, in every language: that
 * is the key set their parity tests hold each catalogue to, and no translator should have
 * to know which categories CLDR assigns. But CLDR gives French, Italian and Spanish a
 * third, `many` (1 000 000, « 1,5 million »), and i18next asks for `key_many` there and
 * nothing else — so without it the count fell down the fallback chain and printed German
 * in a French sentence. Kurvenschmiede found it and filled the gap in memory; kastlan
 * wrote the same function again (0.19 adoption). This is that function, once.
 *
 * `_other` is the right stand-in: CLDR's `many` shares its wording with `other` in all
 * three. An ordinal family (`key_ordinal_one`, `…_ordinal_other`) is filled from the
 * language's ORDINAL categories. A category the catalogue already has is left alone, and
 * the input is not changed: a new tree comes back. A locale `Intl` cannot read (`""`,
 * `"x"` — a backend `parse` called without a language) adds nothing rather than throwing,
 * so one odd call cannot fail a whole namespace load (kastlan, 0.20 adoption).
 *
 *     i18n.addResourceBundle(lng, "translation", withAllPlurals(catalogue, lng));
 *     // i18next-http-backend: { parse: (data, lng) => withAllPlurals(JSON.parse(data), lng) }
 */
export function withAllPlurals<T extends Record<string, unknown>>(catalogue: T, locale: string): T & Record<string, unknown> {
  const cardinal = pluralCategories(locale, "cardinal");
  const ordinal = pluralCategories(locale, "ordinal");
  const fill = (tree: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(tree)) {
      out[key] =
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? fill(value as Record<string, unknown>)
          : value;
    }
    for (const [key, value] of Object.entries(tree)) {
      if (!key.endsWith("_other") || typeof value !== "string") continue;
      const base = key.slice(0, -"_other".length);
      const categories = base.endsWith("_ordinal") ? ordinal : cardinal;
      for (const category of categories) {
        const name = `${base}_${category}`;
        if (!(name in out)) out[name] = value;
      }
    }
    return out;
  };
  return fill(catalogue) as T & Record<string, unknown>;
}

function pluralCategories(locale: string, type: Intl.PluralRuleType): readonly string[] {
  try {
    return new Intl.PluralRules(locale, { type }).resolvedOptions().pluralCategories;
  } catch {
    return [];
  }
}
