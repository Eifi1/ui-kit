# Adopting `@eifi1/ui-kit` 0.20

Built from the three apps' 0.19 adoption: the two helpers kastlan wrote for itself (and
the others were about to write), keksdose's `formatLocaleOf` finding, and showcase
polish. Everything is additive except one behaviour change, listed first.
`CHANGELOG.md` → `0.20.0` has the release notes.

## Everyone

1. Bump to `^0.20.0` by hand; a caret below 1.0 locks the minor version.
2. **`formatLocaleOf` keeps a tag of a language the kit does not ship (keksdose):** 0.19.0
   turned every tag into one of the seven languages, so `formatLocaleOf("sv-SE")` (ISO
   dates) gave `de-CH` — a German weekday. Now a shipped language still formats in its
   home (`en-US` → `en-GB`, `de-AT` → `de-CH`), and any other valid tag formats as
   itself, canonicalised; an unreadable one as `de-CH`. Words are unchanged:
   `resolveLanguage` and `loadUiKitLabels` still fall back to `de-CH`, and the loaders'
   default format follows the resolved language. If you passed an unshipped tag on
   purpose to get `de-CH`, pass `"de-CH"`.

## New, opt-in

| Area | API |
|---|---|
| The kit's catalogue during render (kastlan) | `useUiKitLabels(code, formatLocale?)` loads on first use and keeps the PREVIOUS language's catalogue through a switch until the next one has arrived (`undefined` only before the first): `<UiKitProvider labels={useUiKitLabels(language)} locale={formatLocaleOf(language)}>`. `peekUiKitLabels(code, formatLocale?)` reads an arrived catalogue synchronously (the same object `loadUiKitLabels` resolved to). |
| Plurals (kastlan, Kurvenschmiede) | `withAllPlurals(catalogue, lng)` fills every CLDR category a language has from the key family's `_other` — French, Italian and Spanish `many` (1 000 000), which i18next asks for and otherwise takes from the fallback language. Ordinal families (`key_ordinal_*`) use the ordinal rules; a category already written stays; a new tree comes back. `i18n.addResourceBundle(lng, ns, withAllPlurals(catalogue, lng))`, or i18next-http-backend's `parse`. |
| Showcase | Auth page: `LegalLayout` live. Localisation page: the key tree renders function labels with the review samples (`{{name}}`, 3 for a count). |

## keksdose

- `withAllPlurals` on your fr/it bundles where they are loaded — that closes the `_many`
  gap (German in a French sentence for a million).
- `formatTagFor` can go: `formatLocaleOf` keeps `sv-SE` as it is now.
- Optional: `useUiKitLabels(language)` instead of awaiting `loadUiKitLabels` into state.
- Your register guard uses `\b`. Kurvenschmiede found that `\b` treats accented letters
  as non-letters ("êtes" matched "tes"). Prefer Unicode-aware boundaries,
  `(?<!\p{L})(tu|tuo|…)(?!\p{L})` with the `u` flag.

## kastlan

- Your own cache (`loadKitLabels` / `hasKitLabels` / `kitLabelsFor`) → `useUiKitLabels`
  (or `peekUiKitLabels` where you read it outside React); your own `withAllPlurals` →
  the kit's (same contract: fill from `_other`, keep what is written).
- Your register guard: the same Unicode-boundary note as keksdose's.

## Kurvenschmiede

- Your `withAllPlurals` → the kit's (yours was its model; the kit's also fills ordinal
  families from the ordinal rules).
- Optional: `useUiKitLabels` in the provider instead of your own state around
  `loadUiKitLabels`.

## 0.20.1

Picked up by `^0.20.0`.

- **`withAllPlurals` with a locale `Intl` cannot read (kastlan):** `""` or `"x"` (a
  backend `parse` called without a language) threw a `RangeError` and failed the whole
  namespace load; now the catalogue comes back unchanged. kastlan's `String(lng ||
  "de-CH")` guard can go.
