# Adopting `@eifi1/ui-kit` 0.28

The legal harmonization (Marcel, 2026-10-05): the Imprint, Privacy Policy and Terms look
and read the same in keksdose, kastlan and Kurvenschmiede. The contract is
`docs/legal-harmonization.md`: the page frame, where the links go, the section
skeleton, every shared sentence, and each app's checklist (§6). This note is the kit
side. `CHANGELOG.md` → `0.28.0` has the release notes.

**keksdose is the reference; the shared wording is the kit's.** Since 0.19 each app
wrote all of its legal text and the kit drew only the shell. From 0.28 the sections that
are the same in all three apps live in the kit, in all 7 languages, filled in with your
operator's values. These are operator, contact, disclaimer, controller, legal basis,
browser storage, rights, privacy contact, warranty, liability, changes and governing
law, plus the notices, the link labels and the sign-up checkbox. Your app keeps only
what describes what it alone does.

## 0.28.1

A patch from the three apps' adoption, plus Marcel's binding language.

- **German is the binding language** (Marcel, 2026-10-05). The lawyer reviews the German
  texts; the other languages are translations for convenience.
  - Give your `LegalOperator` the field `bindingLanguage: "de-CH"`.
  - Every legal page read in another language shows a note under the title: "This is a
    translation for your convenience. The German version is binding."
  - Pass `onShowBindingLanguage={() => switchLanguage("de-CH")}` to `LegalPage` to add a
    "Show the German version" button.
  - **Add `<LegalKitSection section="language" />` to your terms, between `changes` and
    `law`** (`LEGAL_SKELETON` has it). A test that pins your pages to the skeleton fails
    until you do.
  - Translations of the privacy policy must still be accurate: it is an information
    duty, not a contract. The note does not cure a wrong translation; it saves a lawyer
    reading every language.

- **Footers on `AuthLayout` pages:** `AuthLayout` already wraps its `footer` slot in a
  `<footer>`, and HTML forbids a footer inside a footer. There:
  - use `footer={<LegalLinks nav={false} />}`;
  - set `footerLabel` to the kit's `navLabel`, via `useLegalLabels().navLabel`. This is
    the pattern kastlan adopted.
  - `LegalFooter landmark={false}` draws a `<div>`, for any other host that is a footer
    already.
- **`LegalLinks onLinkClick`:** called on a click on any of the links, so an account menu
  can close itself. keksdose had to catch the click on a wrapping `<div>`.
- **New exports:**
  - `useLegalLabels()`: the kit's `legal` words in the provider's language, for a
    `footerLabel`;
  - `LEGAL_HREFS`: the three routes;
  - `legalOperatorText(operator, locale)`: the operator with its country named.
- **Translations** (Kurvenschmiede's review):
  - the operator "resides" in Switzerland instead of having a company seat: hu
    "lakóhelye", es "reside", it "risiede";
  - the hu checkbox no longer depends on the titles' case endings;
  - the zh checkbox reads "我已阅读并同意";
  - es "rastrearle" and "en cuanto sea posible";
  - hu formal "Ön" in the browser section.

## Everyone

1. Bump to `^0.28.0` by hand; a caret below 1.0 locks the minor version.
2. **Changes you may see on the bump:**
   - **`LegalLinks` shows `·` separators** between the links (`aria-hidden`), wherever
     you use it, the account menu included (§3.3). `links` is now optional: leave it
     out and you get `/impressum`, `/privacy`, `/terms` with the kit's short labels
     ("Imprint · Privacy Policy · Terms" / "Impressum · Datenschutz ·
     Nutzungsbedingungen").
   - **`keyInArea` also matches `kit.<area>.`**, so a reviewer with a `legal` grant sees
     `kit.legal.*` on your translation page. If you pass your own `inArea`, it is unchanged.
   - **`placeholderTokens` keeps a `{ref:key}`'s target**, so a translation that points
     to another section is flagged as a placeholder mismatch.
   - `LegalLayout`, `LegalSection` and `LegalLinks` take partial `labels` at any depth.
     `LegalSection` and `LegalLayout` stay backwards compatible.

## New

- **`LegalPage`**: the whole page (§3.2).
  - It renders your `header`, then the column (← "Back to home" to `homeHref`, default
    `/`; the title; the page's notice; the sections), then `<LegalFooter />` with the
    current page marked.
  - It calls `useNoIndex()`.
  - Privacy and terms sections are numbered in render order. A `{ref:key}` in a body
    becomes the target's number, linked to `#key`, and may point forward.
  - Sections must be **direct children** of the page (fragments and arrays are fine). The
    page reads them before it renders, to number them. A section wrapped in a component
    of your own renders unnumbered.
  - A `LegalSection`'s id is its `id`, or else its React `key`: give each app section
    its contract key (`key="data"`).
- **`LegalKitSection section="…"`**: one of the kit's sections, filled from the page's
  `operator`. Only three take your words:
  - `legal_basis`: `children` after the kit's paragraph, for consent where you rely on
    it. The kit's paragraph names contract and legitimate interest only.
  - `rights`: `children` between the list of rights and the supervisory authorities
    (how to export, how to delete).
  - `browser`: `entries`, your list of what the app keeps, as `string[]` in your
    language; `children` after it, for what sign-out removes beyond the tokens.
- **`LegalOperator`**: `{ name, postalCode, city, region, country, email }`. `country` is
  an ISO code, which the kit names in the page's language. Define it **once** in your app;
  the kit holds no personal data.
- **`LegalFooter`**: keksdose's site footer. A centred `<nav>` with the three links,
  `children` underneath (a tagline).
- **`LegalAcceptCheckbox`**: the register page's required checkbox, "I accept the [Terms
  of Service] and the [Privacy Policy]". One template per language. Keep submit disabled
  while it is unticked; nothing goes to the server.
- **`useNoIndex(active = true)`**: `<meta name="robots" content="noindex">` while mounted.
  Use it on every auth page too, and keep or add your web server's
  `X-Robots-Tag: noindex` for the three legal routes.
- **`LEGAL_SKELETON`**: the section order per page (§4.2) as data, for a test that pins
  your pages to it.
- **`reviewAreaOf(key, areas)`**: the area a key belongs to under the same rule as
  `keyInArea`; `kit.legal.*` → `legal`.
- **`kitLabelStrings(labels, { operator })`**: with your operator, the review rows show
  the real sentences instead of samples.

A privacy page, sketched:

```tsx
const OPERATOR: LegalOperator = { name: "…", postalCode: "…", city: "…", region: "…", country: "CH", email: "…" };

<LegalPage page="privacy" operator={OPERATOR} header={<PublicHeader />}>
  <LegalKitSection section="controller" />
  <LegalSection key="data" heading={t("legal.privacy.data.title")} body={t("legal.privacy.data.body")} />
  <LegalKitSection section="legal_basis">{t("legal.privacy.legal_basis.app")}</LegalKitSection>
  <LegalSection key="third_parties" heading={…} body={…} />
  {/* your own sections */}
  <LegalKitSection section="browser" entries={t("legal.privacy.browser.entries", { returnObjects: true })}>
    {t("legal.privacy.browser.app")}
  </LegalKitSection>
  <LegalSection key="transfers" heading={…} body={…} />
  <LegalSection key="retention" heading={…} body={…} />
  <LegalKitSection section="rights">{t("legal.privacy.rights.app")}</LegalKitSection>
  <LegalKitSection section="contact" />
</LegalPage>
```

Section titles in your catalogues lose their numbers ("1. Controller" → "Controller").
Numbered references in running text become tokens: "see section {ref:retention}" /
"siehe Abschnitt {ref:retention}". The words around the token stay in your language.

## Review areas (all three apps)

`kit.legal.*` reached no `legal` area anywhere: not on the server (a prefix test) and
not on the page (a kit key's area was `kit.<namespace>`). A lawyer with a `["legal"]`
grant would neither see nor be allowed to correct the text all three apps share. To fix
it:

- **Server:** `in_areas` matches `kit.<area>.` as well.
  - keksdose: take the server-kit patch.
  - kastlan and Kurvenschmiede: the same one-line change in your own
    `translation_review_service.in_areas`.
- **Page:**
  - your translation page gives a kit key its area with `reviewAreaOf`;
  - grouping (Kurvenschmiede's `groupOf`, keksdose's `namespaceOf`) puts `kit.legal.*`
    under `legal`;
  - pass your operator to `kitLabelStrings`.

## Per app

The checklists are §6 of the contract. In short:

- **keksdose:**
  - `legal-layout.tsx` → `LegalPage` with `header={<LandingHeader />}`;
  - `SiteFooter` → `LegalFooter` (tagline as children);
  - your `useNoIndex` → the kit's;
  - `/verify-email` gains header, footer and noindex; Caddy `@noindex` gains forgot,
    reset and verify-email;
  - account menu and sidebar → `LegalLinks`;
  - the checkbox → `LegalAcceptCheckbox`;
  - remove the keys the kit now owns;
  - the 12 numbered references per language → `{ref:…}`;
  - consent → the `legal_basis` paragraph;
  - the new browser list. The Plausible paragraph stays in `third_parties`.
- **kastlan:**
  - your own frame → `LegalPage` (back to `/`);
  - `LegalFooter` on `/login`, `/register`, `/verify-email` (and `/2fa`, or remove it);
  - account menu `Link`s → `LegalLinks`;
  - noindex (hook + Caddy);
  - the checkbox;
  - kit sections replace yours; the street address goes;
  - the browser list + IndexedDB/offline-cache paragraph;
  - **`third_parties` (Cloudflare is DNS only) is fixed in the same change**;
  - the email/log sentence.
- **Kurvenschmiede:**
  - the pages leave the app shell → `LegalPage` with `header` = your `AppTopBar`
    without the shell;
  - `LegalFooter` on `/`, the four auth pages, the legal pages and the 404, and the
    links reachable from `/control` and `/steering` for signed-out visitors;
  - noindex (both Caddyfiles);
  - the checkbox;
  - keys `imprint` → `impressum`, `processors` → `third_parties`, `results` →
    `no_advice`;
  - `{ref:contact}` in `retention`;
  - the browser list from your 7-language drafts;
  - crash reports in `data`.

kastlan's billing module stays off. The day it goes on, its legal texts change in the
same release (contract §2.7).
