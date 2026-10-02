# Language handling across the kit and the three apps — harmonisation plan

Status: **proposal, 2026-10-02**, led from ui-kit at Marcel's request. Built from a
read-only survey of each app's working tree (kastlan `feat/translation-review`,
keksdose `chore/local-first`, Kurvenschmiede `feat/curves` = `feat/languages` + 1).
Nothing here is decided until Marcel picks the open points in §3; the decided points
are marked **decided**.

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

**H1 — One translation-review contract (urgent).** kastlan and keksdose are building the
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

**H2 — One language registry (kit).** Every app hand-rolls its list, its region
mapping and its kit bridge, and they disagree (zh-TW → de in kastlan, → zh in
Kurvenschmiede; keksdose's English gets the raw-count defaults). Kit:
`@eifi1/ui-kit/i18n/languages` with the seven codes, native names and flag country;
`resolveLanguage(candidates, offered, fallback)` (exact → base language → every German
to de-CH → zh-* to zh → fallback), and `loadUiKitLabels(code, formatLocale)` that
lazy-loads the right subpath and calls its factory. Apps keep their own subset.

**H3 — German is `de-CH` everywhere.** kastlan's code is still `de` (its text is
already Swiss). Rename the code (files, `supportedLngs`, backend `DocLang`, the
Contact enum, stored values with a migration) so all four repos use the same codes.

**H4 — Register (decided: formal) applied to the apps.** kastlan: Italian UI tu → Lei,
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

**H6 — Formatting locale: one rule (decision needed, §3.1).** Today three rules: kastlan
formats everything Swiss (`fr-CH`, `it-CH`, `en-CH`), Kurvenschmiede formats per
language (`fr-FR`, `en-US`), keksdose pins money to `en-US` ("CHF 1,234.56") while its
push texts write "1’234.50".

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

**Not proposed:** renaming keys across apps (camelCase in kastlan, snake_case
elsewhere) — costly, invisible to users. Translating API error `detail`s — real, but a
separate round (error codes + frontend catalogues).

## 3. Open decisions (Marcel)

1. **Formatting locale (H6):** (a) Swiss formats in every language (`fr-CH`, `en-CH`:
   1’234.50, CHF first) — the apps serve Swiss users and money is CHF; (b) per language
   (`fr-FR`, `en-US`), as Kurvenschmiede does today; (c) per app. Recommended: (a) for
   kastlan and keksdose (CHF money), and Kurvenschmiede decides for itself only if its
   users are not Swiss.
2. **English spelling:** British — kastlan writes "organise" and the kit already writes
   "colour" — or American. Recommended: British everywhere, matching the kit and the GB
   flag the apps show; Kurvenschmiede's `en-US` formatting tag is a separate question
   (§3.1).
3. **Review page in the kit (H1):** build the presentational parts in the kit now
   (from keksdose's page) so kastlan does not write a second one. Recommended: yes.
4. **Order:** H1 first (two apps are about to commit diverging schemas), then H2 + H3,
   then H4–H9 per app as each finds time.
