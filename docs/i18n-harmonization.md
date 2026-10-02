# Language handling across the kit and the three apps — harmonisation plan

Status: **2026-10-02**, led from ui-kit at Marcel's request. Built from a read-only
survey of each app's working tree (kastlan `feat/translation-review`, keksdose
`chore/local-first`, Kurvenschmiede `feat/curves` = `feat/languages` + 1). Marcel's
decisions are in §3; H3 and H4 follow from earlier ones (one German = de-CH, every
language formal). The rest is proposed, scheduled per app.

## 1. Where each one stands

| | kastlan | keksdose | Kurvenschmiede | ui-kit |
|---|---|---|---|---|
| Library | i18next 25 + http-backend, 28 namespaces, JSON in `public/locales`, all fetched at boot | i18next 25, one namespace, JSON in `src`, lazy `import()` per locale | i18next 25, one namespace, JSON in `src`, de-CH bundled + lazy rest | typed label tree, one subpath per language |
| Languages | `de`, en, fr, it | de-CH, en, fr, it | de-CH, en, es, fr, it, hu, zh | de-CH, en, es, fr, it, hu, zh |
| German code | **`de`** (Swiss text) | de-CH | de-CH | de-CH |
| Fallback | de | de-CH | de-CH | en (defaults) |
| Reference for parity | de | en (comments also say de-CH) | en | en |
| Detection | detector defaults: `?lng`, cookie, `i18nextLng`, … | `keksdose-lang`, navigator, html | `kurvenschmiede-lang`, navigator, html | — |
| Region mapping | `load: languageOnly`; zh-TW → de | `languageCodeFor()` | `asOffered()` + best match; zh-TW → zh | — |
| Server knows it via | `Accept-Language` per request; no user column | `User.locale`, mirrored by PATCH | `users.locale`, set at register + PATCH | — |
| Account language read back on sign-in | — | no | no | — |
| Register | de Sie, **legal du**; fr vous; **it tu** (UI) but Lei (documents) | de-CH Sie; fr vous; **it tu** (UI + mail) | all formal | **decided:** all formal (0.18.0 de-CH, 0.18.1 es/it) |
| Formatting locale | `xx-CH` for everything (`swissLocaleFor`) | money pinned **en-US**; date-format preference; else UI language | per language: de-CH, en-US, es-ES, fr-FR, … (`tagOf`) | provider `locale` |
| Kit bridge | de → constant, en/fr/it → factory(`xx-CH`); 2 overrides copied by hand | de-CH → constant, fr/it → factory, **en → raw defaults** | every language → factory(`tagOf`), lazy | — |
| Plurals | none (`{{count}}` without `_one`) | `_one`/`_other` (~125) | `_one`/`_other` + `withAllPlurals` | functions |
| Placeholder parity test | no | no (review page only) | **yes** | yes (0.19, `kitLabelStrings`) |
| Unused-key check | yes (`--fix`) | yes | yes | — |
| Translation review | **being built** (backend, uncommitted) | **being built** (backend + page, uncommitted) | `docs/translations.md` table | `kitLabelStrings` (0.19) |
| Switcher | kit LanguageMenu + LanguageSetting, flags | own account-menu + kit ×3, flags | own account-menu + kit LanguageSetting; **none signed out** | LanguageMenu, LanguageSetting |
| `<html lang>` | fixed `de` | synced | synced (index.html `de`) | — |
| API error texts | English, some shown raw | English | English, shown raw | — |
| Invite mail language | — | **admin's** | **admin's** | — |

## 2. Proposals

Ordered by value. "Kit" means a ui-kit change; the rest is per app.

**H1 — One translation-review contract (urgent; decided).** kastlan and keksdose are building the
same feature independently, both uncommitted: a `translation_reviews` table (locale,
key, shown text, reference text, verdict APPROVED / NEEDS_CHANGE, note, suggestion,
reviewer, time), a per-locale reviewer grant, `GET`/`PUT /translations/reviews` and
`POST …/clear`. Align them before either commits: one table shape, one API shape, one
grant shape (`translation_review_locales` JSON on the user). Kit: the review page's
parts (status vocabulary + chip, progress per locale, the row editor with the
"changed since review" diff and placeholder check), presentational like ShareCard, so
the second and third app get the page without writing it. `kitLabelStrings` (0.19)
adds the kit's own words to every app's review as a `kit.` namespace. Kurvenschmiede
adopts the same backend contract when it wants the page.

The contract is keksdose's, which kastlan's already matches field for field:
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

Extended the same day (keksdose, at Marcel's request): an **area scope** on the reviewer
role — `users.translation_review_areas` (JSON, NULL = every area; today only `legal`),
a key is inside an area when it equals it or starts with `area.` (`area:` for kastlan's
`ns:key`). `GET` also returns `areas` and lists only verdicts inside them; `PUT` and
`clear` refuse a key outside with 403. The assignment endpoint takes `{ locales, areas }`
and answers `{ user_id, role, locales, areas }`; its path is app-specific
(`/admin/users/{id}/reviewer` in keksdose, `/platform/users/{id}/reviewer` in kastlan).
For a lawyer who reviews the Imprint, Privacy Policy and Terms and nothing else.

What the kit parts take from the app (kastlan's and keksdose's needs together): the
reference locale (kastlan reads fr/it/en against de, de against en; keksdose reads
everything against en, en against de-CH); a fifth status **missing** (no text in the
locale; stored as NEEDS_CHANGE with text ""); the locales the viewer may review, and
the area scope, as input — never derived from a role name; a row **source**
(kastlan: screen | documents) beside the namespace; placeholders `{{x}}`, `<tag>`,
`$t(…)` and Python `{field}`. kastlan's own page (built before this was agreed) stays
as a stopgap until the kit parts ship (Marcel).

**H2 — One language registry (kit).** Every app hand-rolls its list, its region
mapping and its kit bridge, and they disagree (zh-TW → de in kastlan, → zh in
Kurvenschmiede; keksdose's English gets the raw-count defaults). Kit:
`@eifi1/ui-kit/i18n/languages` with the seven codes, native names and flag country;
`resolveLanguage(candidates, offered, fallback)` (exact → base language → every German
to de-CH → zh-* to zh → fallback), and `loadUiKitLabels(code, formatLocale)` that
lazy-loads the right subpath and calls its factory. Apps keep their own subset.

**H3 — German is `de-CH` everywhere (follows from "one German").** kastlan's code is still `de` (its text is
already Swiss). Rename the code (files, `supportedLngs`, backend `DocLang`, the
Contact enum, stored values with a migration) so all four repos use the same codes.

**H4 — Register (decided: formal) applied to the apps.** English is British
(decided): "colour", "organise", as the kit and kastlan already write. kastlan: Italian UI tu → Lei,
`de/legal.json` du → Sie. keksdose: Italian UI and mail tu → Lei. Kurvenschmiede: done.
Plus a check like the kit's: de-CH has no ß and no du-forms, in every app's catalogue
(Kurvenschmiede checks only its mails).

**H5 — Detection and persistence.** Same order everywhere: the choice stored on this
device → the account's language (read back on sign-in; today nobody does) → the
browser → de-CH. The account keeps `locale` (kastlan adds the column; today it only
sends `Accept-Language`), every request still sends `Accept-Language`, and a signed-out
visitor can switch (Kurvenschmiede cannot). `<html lang>` follows the language
(kastlan, Kurvenschmiede's index.html). Storage key `<app>-lang` (kastlan uses the
detector's default `i18nextLng`).

**H6 — Formatting locale: per language (decided).** Each language formats like its
home: `de-CH`, `en-GB` (British, like the spelling), `es-ES`, `fr-FR`, `it-IT`,
`hu-HU`, `zh-CN` — the tag H2's registry gives each code. kastlan replaces
`swissLocaleFor` (`fr-CH`, `en-CH` everywhere), keksdose drops the `en-US` money pin
("CHF 1,234.56") and its push texts' hand-rolled "1’234.50", Kurvenschmiede moves
English from `en-US` to `en-GB`. Formats fixed by a standard stay as the standard says
(kastlan's QR-bill fields, per the SIX spec).

**H7 — Server text.** Same small helper shape in the three backends: `pick(locale,
{…})`, `language_of()` with the same fallback (keksdose falls back to **en**, the others
to German), and a test that the backend's language list equals the frontend's
(Kurvenschmiede has it; kastlan repeats the list four times unchecked). Invitation mail
in the **invitee's** language when it is known, otherwise in a language the admin picks
in the invite dialog — not silently the admin's own.

**H8 — Catalogue checks, same set in every app.** Parity against one reference, no
orphan keys, `_one`/`_other` for every `{{count}}` (kastlan has none) with
`withAllPlurals` for CLDR `many`, placeholder parity (only Kurvenschmiede), every `t()`
literal resolves, `missingKitLabels` per language. kastlan's shrink-only allowlist for
known gaps is the model for a catalogue that lags.

**H9 — Switcher.** The kit's LanguageMenu / LanguageSetting everywhere, with the flags
from H2's registry; the two hand-built account-menu disclosures (keksdose,
Kurvenschmiede) become the kit's (an account-menu language section if LanguageMenu
does not fit).

**H10 — Legal pages (decided).** Marcel wants Imprint, Privacy Policy and Terms in every
app. keksdose and kastlan carry the same shell twice (`LegalLayout` + `LegalSection`,
kastlan's `LegalLinks` footer); Kurvenschmiede has none. Kit: `LegalLayout` (a content
column: back link, title, notice, sections — each app keeps its own page chrome around
it), `LegalSection`, `LegalLinks` (the three pages, the current one marked). The legal
texts stay in each app, under the `legal` review area.

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

Order: H1 first (two apps were about to commit the same feature twice), then the kit's
H2 registry with H3, then H4–H9 per app as each finds time.

## 4. Per repo

- **ui-kit:** `kitLabelStrings` (done, 0.19); review-page parts (H1); language registry
  with `resolveLanguage` / `loadUiKitLabels` / per-language format tags (H2, done);
  switcher options with flags from the registry (H9, `languageOptions`, done); legal
  shell (H10).
- **kastlan:** H1 backend on the contract, no own page (kit parts); H3 `de` → `de-CH`
  (files, `supportedLngs`, `DocLang`, Contact enum, stored values); H4 Italian UI tu →
  Lei, `de/legal.json` du → Sie; H5 `users.locale` + read back on sign-in, storage key
  `kastlan-lang`, `<html lang>`; H6 per-language tags instead of `swissLocaleFor`; H7 one
  language list with a drift test; H8 `_one`/`_other`, placeholder parity.
- **keksdose:** H1 contract base, page as the model for the kit parts; H4 Italian UI and
  mail tu → Lei; H5 read the account language back on sign-in; H6 drop the `en-US` money
  pin and the push texts' own grouping; H7 `language_of` falls back to de-CH (not en),
  invite mail in the invitee's language; H8 placeholder parity, plural test that loads
  fr/it; H9 account-menu disclosure → kit.
- **Kurvenschmiede:** H10 Imprint, Privacy Policy and Terms on the kit shell; H1 when
  it wants the page; H4 a Sie/ß check on `de-CH.json`; H5
  read the account language back, a switcher for signed-out visitors, `index.html` lang;
  H6 `en-US` → `en-GB`; H7 invite mail language; H9 account-menu disclosure → kit.
