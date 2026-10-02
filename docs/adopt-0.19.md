# Adopting `@eifi1/ui-kit` 0.19

One release for everything since 0.18.0 (Marcel, 2026-10-02): the fixes that were
queued as 0.18.1 — from kastlan's and Kurvenschmiede's 0.18 adoption — and the first
round of the language harmonisation (`docs/i18n-harmonization.md`): the translation
review parts, the language registry, the kit's words for review, and the legal pages'
shell. Everything new is opt-in; the changes listed under "Everyone" apply on the bump.
`CHANGELOG.md` → `0.19.0` has the release notes, and the showcase (⌘K) has it live —
the review panel on the Localisation page.

## Everyone

1. Bump to `^0.19.0` by hand; a caret below 1.0 locks the minor version.
2. **Spanish and Italian are formal (Kurvenschmiede):** `es` says "usted" and `it` says
   "Lei", like `de-CH`, `fr` and `hu` — every kit language is formal now. 33 Spanish and
   40 Italian strings change; standard Italian command labels ("Salva", "Riprova",
   "Scegli una data") stay. An app whose own Italian or Spanish says "tu"/"tú" moves to
   "Lei"/"usted" (decided for all three apps) or, until then, overrides the addressing
   keys. keksdose's and kastlan's Italian UI say "tu" today.
3. **Cold-start notice ignores downloads (kastlan):** axios answers only once the whole
   body is in, so a generated PDF or a large photo — a GET — said "the server is waking"
   on a warm server and kept the notice up for every read beside it. `watchReadsAnd` (the
   default filter) now skips `responseType` `"blob"`, `"arraybuffer"` and `"stream"`. A
   custom `shouldWatch` gets the request (for axios, the config itself) as a third
   argument. kastlan's URL list (`/pdf`, `/download`, `/qr-bill`, `/file`,
   `/attachments/`) can go — its downloads set `responseType: "blob"`; Kurvenschmiede's
   blob curve exports are covered as they are.
4. **Cold-start notice stacks above a FloatingActionButton (kastlan):** while showing, it
   sits above any visible FAB under it — kastlan's `bottom-start` offline pill, or a FAB
   in either corner on a phone, where the notice spans the width. A `hidden` FAB does not
   lift it. Nothing to pass.
5. **New label namespaces** `translationReview` and `legal`, in every catalogue.

## New, opt-in

| Area | API |
|---|---|
| Translation review (H1) | The page parts for the shared review contract (keksdose's shape, kastlan's matches): `TranslationReviewPanel` (one locale's rows: status/namespace/source/area filters, search, placeholder-problem filter, bulk approve and reset, an expandable row editor with the changed-since-review diff), `TranslationLocaleTabs` (one tab per locale with approved/total), `TranslationProgress`, `ReviewStatusChip`, `TranslationExportButton` (the NEEDS_CHANGE rows with suggestions as JSON). The pure half: `translationRows({ locale, strings, reference, reviews, namespaceOf?, sourceOf?, areas?, inArea? })` → rows with status `unreviewed` / `changed` / `missing` / `needs_change` / `approved`; `fromApiReview` / `toApiWrite` map the API's snake_case; `mergeReviews` / `dropReviews` apply a save or a clear to the loaded list; `placeholderMismatch` knows `{{x}}`, `<tag>`, `$t(…)` and Python `{field}`; `keyInArea` matches `area`, `area.…` and `area:…`. The app decides the reference locale, the reviewable locales (`readOnly` for the rest), the area scope and its labels, and the row source |
| The kit's words for review | `kitLabelStrings(labels)` → `key → text` rows (function labels with samples: `{{name}}` placeholders, counts 1 and 3; keys never depend on the locale). Add them to the review as a `kit.` namespace: `kitLabelStrings(UI_KIT_LABELS_DE_CH)` beside the reference `kitLabelStrings(DEFAULT_UI_KIT_LABELS)` |
| Language registry (H2) | `KIT_LANGUAGES` (code, native and English name, format tag, flag-icons country), `resolveLanguage([stored, account, ...navigator.languages], offered)` (every German → de-CH, every Chinese → zh, else base language), `formatLocaleOf(code)` (per language: de-CH, en-GB, es-ES, fr-FR, it-IT, hu-HU, zh-CN — Marcel's decision), `loadUiKitLabels(code)` (lazy, one catalogue per language, English with grouped counts), `languageOptions(codes)` for `LanguageMenu` / `LanguageSetting`. README → "Language registry" has the ten-line wiring |
| Legal pages (H10) | `LegalLayout` (a content column: `back`, `title`, `notice` as a `role="note"` banner, sections, optional `links`), `LegalSection` (`heading`, `body` with line breaks kept, or children; `id` for links to it), `LegalLinks` (the three pages, the current one `aria-current="page"`; `nav={false}` inside `AuthLayout`'s footer). The legal texts stay in the app |

## keksdose

- **Translation review:** your page becomes data loading + the kit parts:
  `const rows = translationRows({ locale, strings: flattenStrings(bundle), reference: flattenStrings(referenceBundle), reviews: data.reviews.map(fromApiReview), areas: data.areas })`,
  then `<TranslationLocaleTabs>`, `<TranslationExportButton>` and
  `<TranslationReviewPanel rows localeLabel referenceLabel areas={data.areas} areaLabels={{ legal: t("…") }} onSave={(w) => save(w.map(toApiWrite))} onClear={…} />`,
  applying the answers with `mergeReviews` / `dropReviews`. Add the kit's words as a
  `kit.` namespace with `kitLabelStrings`.
- **Legal pages:** `features/legal/legal-layout.tsx` → `LegalLayout` inside your
  landing header and footer (`back`, `notice` per page — the privacy page keeps its own
  notice), `LegalSection` as it is.
- **Languages (when Marcel schedules H2–H9):** `resolveLanguage` instead of
  `languageCodeFor`, `loadUiKitLabels` instead of `kitLabelsFor` (English then gets
  grouped counts), `formatLocaleOf` instead of the `en-US` money pin; Italian tu → Lei.

## kastlan

- **Translation review:** your stopgap page becomes the kit parts, as above, with
  `reference` = the de strings (de itself against en), `namespaceOf` for `ns:key`,
  `sourceOf` → `"screen"` / `"documents"` with `sourceLabels`, `areas` and
  `areaLabels={{ legal: …, doc_text: … }}`. Missing keys arrive as status `missing`.
- **Cold-start notice:** the URL filter for downloads can go (point 3 above).
- **Legal pages:** your `AuthLayout` stays the chrome; `legal-footer.tsx` → `<LegalLinks
  links currentHref={pathname} nav={false} />` in its `footer`, `LegalSection` from the
  kit.
- **Languages (when scheduled):** `formatLocaleOf` per language instead of
  `swissLocaleFor`, the code `de` → `de-CH`, `resolveLanguage` + `loadUiKitLabels`;
  Italian tu → Lei, `de/legal.json` du → Sie.

## Kurvenschmiede

- **Legal pages (new):** Imprint, Privacy Policy and Terms on `LegalLayout` /
  `LegalSection` / `LegalLinks`, the texts in your catalogues (they are reviewed under
  the `legal` area once you adopt the review contract).
- **Languages:** `loadUiKitLabels(code)` replaces the `LOADERS` map, `resolveLanguage`
  replaces `asOffered` + `bestLanguage`, `formatLocaleOf("en")` is `en-GB` (British,
  decided) instead of `en-US`.
- **Translation review (when you want it):** the backend contract in
  `docs/i18n-harmonization.md` H1, then the kit parts as above.
