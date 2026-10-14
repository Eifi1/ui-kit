# Language handling across the kit and the three apps — harmonisation plan

Led from ui-kit at Marcel's request (2026-10-02), from a read-only survey of each app's
working tree. Marcel's decisions are in §3; H3 and H4 follow from earlier ones (one
German = de-CH, every language formal). The code cites the rules by their H-number.

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0: each rule
says what the kits ship for it and what an app does. The 2026-10-02 snapshot, the
proposals as written (each app's state and to-dos inside them) and the per-repo to-dos
are in [archive/i18n-history.md](archive/i18n-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Proposals, now the rules: | | |
| | H1 translation review | ui-kit 0.19 (the parts, `kitLabelStrings`); server-kit 0.1 (`translation_review`) | the area scope (2026-10-02); ui-kit 0.28 (an area holds the kit's words of it); [server-services §6](server-services-harmonization.md) (round 0.37, settled 2026-10-14, built for server-kit 0.10.0 / ui-kit 0.37.0): the service behind a store port and its router; the four area arms in both kits; `reviewer_first_name` / `reviewer_last_name`, `reviewer_name` in the reader's order; one export shape; a body with an unknown field refused |
| | H2 language registry | ui-kit 0.19 (`KIT_LANGUAGES`, `resolveLanguage`, `loadUiKitLabels`, `formatLocaleOf`, `languageOptions`); 0.20 (`useUiKitLabels`, `peekUiKitLabels`) | refactor audit DOC-2 (the barrel, not an `i18n/languages` subpath) |
| | H3 German is `de-CH` | app-side; the kit reads every German as `de-CH` (0.19, `resolveLanguage`) | |
| | H4 register | ui-kit 0.18 (de-CH formal), 0.18.1 (es, it); the rest app-side | |
| | H5 detection and persistence | ui-kit 0.19 (`resolveLanguage`'s order), 0.31 (`useAccountLanguage`); server-kit 0.5 (`canonical_locale`) | settings §6.2 (detection never writes the device's choice) |
| | H6 formatting locale | ui-kit 0.19 (`formatLocaleOf`) | |
| | H7 server text | server-kit 0.3 (`mail.pick`); ui-kit 0.22 (`LanguageSelect`), 0.29 (`InvitationsPanel`'s `locale`) | |
| | H8 catalogue checks | ui-kit 0.5 (`missingKitLabels`), 0.19 (`kitLabelStrings`), 0.20 (`withAllPlurals`) | |
| | H9 switcher | ui-kit 0.19 (`languageOptions`) | |
| | H10 legal pages | ui-kit 0.19 (`LegalLayout`, `LegalSection`, `LegalLinks`) | the legal round (ui-kit 0.28, `docs/legal-harmonization.md`) |
| 3 | Decisions | — | |
| 4 | Per repo | — (archived) | |

## 1. Where each one stands

Moved to [archive/i18n-history.md](archive/i18n-history.md): the three apps' and the
kit's language handling on 2026-10-02.

## 2. Proposals

The rules, by the number the code cites them with, ordered by value. "Kit" means a
ui-kit or server-kit part; the rest is each app's.

**H1 — One translation-review contract (decided, §3).** One table shape, one API shape
and one grant shape in every app that reviews its wording, and the review page as kit
parts, so no app writes the page itself. An app without a review page adopts the same
contract when it wants one.

The contract is keksdose's, which kastlan's matches field for field:
`translation_reviews` unique on (`locale`, `key`) with `text`, `reference_text`,
`verdict` (`APPROVED` | `NEEDS_CHANGE`), `note`, `suggestion`, `reviewer_id` (SET NULL),
`reviewed_at`; `GET /translations/reviews` → `{ locales, reviews[] }` (each review with
`reviewer_name`); `PUT /translations/reviews` with `{ items[] }`; `POST
/translations/reviews/clear` with `{ items: [{ locale, key }] }` → `{ cleared }`; the
`REVIEWER` role scoped by `users.translation_review_locales`, admins review every
locale. The id type may differ per app (it never leaves the server). Keys: the app's own
as they are (`ns:key` in kastlan, dotted in keksdose), the kit's under `kit.`
(`kit.combobox.resultCount(3)`), kastlan's server texts under `doc_text.<module>:` via
its extra `GET /translations/documents` — an optional extension of the contract.

The reviewer role has an **area scope** (keksdose, at Marcel's request):
`users.translation_review_areas` (JSON, NULL = every area; `legal` is the one area so
far). A key is inside an area when it equals it or starts with `area.` (`area:` for
kastlan's `ns:key`); the kit's own words of the area (`kit.<area>.…`) are inside it too.
Both kits apply all four arms: ui-kit's `keyInArea`, and server-kit's `in_areas` and
`area_like_patterns` since 0.10 (server-services §6.2.4).
`GET` also returns `areas` and lists only verdicts inside them; `PUT` and `clear` refuse
a key outside with 403. The assignment endpoint takes `{ locales, areas }` and answers
`{ user_id, role, locales, areas }`; its path is app-specific
(`/admin/users/{id}/reviewer` in keksdose, `/platform/users/{id}/reviewer` in kastlan).
For a lawyer who reviews the Imprint, Privacy Policy and Terms and nothing else.

Since server-kit 0.10 (server-services §6, settled 2026-10-14):
- each review also carries the name's two parts, `reviewer_first_name` and
  `reviewer_last_name`, and `reviewer_name` is the name in the reader's order; all three
  are NULL once the account is erased;
- a `PUT` or `clear` body with an unknown field is refused, 422;
- an account export holds the reviewer's verdicts in one shape, keksdose's:
  `data.translation_verdicts`, each `{ locale, string, text, verdict, suggestion, note,
  reviewed_at }`, oldest first. The message key goes in `string`, because the export
  check reads a bare `key` as a secret.

**server-kit** `translation_review` carries the wire shapes (`TranslationReviewOut`,
`TranslationReviewsResponse`, `TranslationReviewBatch`, `TranslationReviewClear`, …), who
may review what (`ReviewGrant`, `assert_allowed`, `in_areas`, `normalize_areas`, the
`kit.` scope) and the review tokens' format (a per-app prefix, only the SHA-256 digest
stored). Its refusals carry their status: `TranslationLocaleError` and
`TranslationAreaError` 422, `TranslationAccessError` 403. Since 0.10 it also holds the
service behind a store port, the router and their test support (server-services §6).

**The kit's parts**, presentational like ShareCard: `TranslationReviewPanel` and its
pieces (`TranslationReviewEditor`, `ReviewStatusChip`, `TranslationProgress`,
`TranslationLocaleTabs`, `TranslationExportButton`; `src/components/translation-review.tsx`)
and the pure half (`translationRows`, `reviewStatus`, `placeholderMismatch`,
`fromApiReview` / `toApiWrite`, …; `src/lib/translation-review.ts`). `kitLabelStrings`
adds the kit's own words to every app's review as a `kit.` namespace.

What the kit parts take from the app, never derive: the reference locale (keksdose reads
everything against en, en against de-CH); the locales the viewer may review, and the area
scope — never from a role name; a row **source** (kastlan: screen | documents) beside the
namespace. Five statuses: **missing** (the locale lacks the string and has no verdict; a
suggestion for it is stored as NEEDS_CHANGE on the empty text), unreviewed, changed (the
string or its reference changed since the verdict), needs_change, approved. The
placeholder check reads `{{x}}`, `<tag>`, `$t(…)` and Python `{field}`.

**H2 — One language registry (kit).** One list of languages, one region mapping and
one bridge to the kit's catalogues, instead of one per app that disagree (zh-TW was
German in kastlan and Chinese in Kurvenschmiede). It is in the main entry,
`@eifi1/ui-kit` (`src/i18n/languages.ts`; there is no `i18n/languages` subpath:
`@eifi1/ui-kit/i18n/*` names the seven catalogues only):
- `KIT_LANGUAGES`: the seven codes (`KitLanguageCode`), each with its native name, its
  English name, its formatting locale (H6) and its flag country;
- `resolveLanguage(candidates, offered, fallback?)`: the first candidate that answers an
  offered code — exact (any case, `_` read as `-`), then by language, which takes every
  German to `de-CH`, every Chinese to `zh` and a regional form to its base — else the
  fallback (`de-CH` when offered, else the first offered code);
- `loadUiKitLabels(code, formatLocale?)` lazy-loads the right catalogue subpath and calls
  its factory; `useUiKitLabels(code)` and `peekUiKitLabels(code)` for a provider's render;
- `formatLocaleOf(code)` (H6) and `languageOptions(codes)` (H9).

Apps keep their own subset and pass it as `offered`.

**H3 — German is `de-CH` everywhere (follows from "one German").** Every repo uses the
same codes; an app with another German code renames it (files, `supportedLngs`, backend
enums, stored values with a migration). The kit reads every German a browser or a stored
value hands over (`de`, `de-DE`, `de-AT`, `de-informal`) as `de-CH`.

**H4 — Register (decided: formal) applied to the apps.** Every language formal (de-CH
Sie, Italian Lei, French vous); English is British (decided): "colour", "organise". The
kit's catalogues follow it, and its test checks that de-CH has no ß
(`src/i18n/__tests__/locales.test.ts`); each app runs a check like it on its catalogue
and its mails.

**H5 — Detection and persistence.** Same order everywhere: the choice stored on this
device → the account's language (read back on sign-in) → the browser → the app's default
(de-CH). The order is `resolveLanguage`'s candidate list; settings §6.2 adds the writes
(`useAccountLanguage`: detection never writes the device's choice, nothing writes the
account on its own). The account keeps `locale`, every request still sends
`Accept-Language`, and a signed-out visitor can switch (`AuthLayout` has a
`LanguageMenu` slot). `<html lang>` follows the language (`formatLocaleOf`). Storage key
`<app>-lang`.

**H6 — Formatting locale: per language (decided).** Each language formats like its
home: `de-CH`, `en-GB` (British, like the spelling), `es-ES`, `fr-FR`, `it-IT`,
`hu-HU`, `zh-CN` — the tag `formatLocaleOf(code)` gives each code, for
`<UiKitProvider locale>`, `<html lang>` and the app's own `Intl` calls. A tag of a
language the kit does not ship formats as itself (keksdose's ISO date order, `sv-SE`).
Formats fixed by a standard stay as the standard says (kastlan's QR-bill fields, per the
SIX spec).

**H7 — Server text.** Same small helper shape in the three backends: server-kit's
`mail.pick(locale, texts)` (and `pick_entry`), the exact tag → its language → `de-CH` →
`de` → `en`, so an unknown locale reads German; a test that the backend's language list
equals the frontend's. An invitation mail goes out in the **invitee's** language when it
is known, otherwise in a language the admin picks in the invite dialog — not silently the
admin's own (`InvitationsPanel` sends `locale`, picked with `LanguageSelect`).

**H8 — Catalogue checks, same set in every app.** Parity against one reference, no
orphan keys, `_one`/`_other` for every `{{count}}` with `withAllPlurals` for CLDR `many`,
placeholder parity, every `t()` literal resolves, `missingKitLabels` per language. A
shrink-only allowlist for known gaps (kastlan's) is the model for a catalogue that lags.

**H9 — Switcher.** The kit's `LanguageMenu` (the top bar) and `LanguageSetting` (the
settings row) everywhere, with the rows `languageOptions(codes)` builds from the
registry: the native name and the flag (`fi fi-<flag>`; the app loads the flag
stylesheet). No hand-built account-menu disclosures. A language that belongs to something
else (an invitation, a mail template) is a form field, `LanguageSelect`.

**H10 — Legal pages (decided).** Imprint, Privacy Policy and Terms in every app, on the
kit's shell: `LegalLayout` (a content column: back link, title, notice, sections — each
app keeps its own page chrome around it), `LegalSection`, `LegalLinks` (the three pages,
the current one marked). The legal round (`docs/legal-harmonization.md`) builds the
shared wording, the page frame and the kit's sections on it. The legal texts stay in
each app, under the `legal` review area.

**Not proposed:** renaming keys across apps (camelCase in kastlan, snake_case
elsewhere) — costly, invisible to users. Translating API error `detail`s — real, but a
separate round (error codes + frontend catalogues).

## 3. Decisions (Marcel, 2026-10-02)

1. **Formatting locale (H6): per language** — `de-CH`, `en-GB`, `es-ES`, `fr-FR`,
   `it-IT`, `hu-HU`, `zh-CN`.
2. **English spelling: British.**
3. **Translation review (H1): one contract + kit parts.** The kit builds the review
   page's presentational parts from keksdose's page; kastlan uses them instead of a
   second page; both include the kit's words via `kitLabelStrings`.

The round's order is in the archive.

## 4. Per repo

Moved to [archive/i18n-history.md](archive/i18n-history.md): the 2026-10-02 to-dos per
repo, H by H. The kit's side shipped as the status table says; each app's state is in
its own repo.
