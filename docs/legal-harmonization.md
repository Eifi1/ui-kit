# The legal pages across the kit and the three apps — harmonisation plan

Status: **2026-10-05**, led from ui-kit at Marcel's request. Built from a read-only audit
of the three apps' working trees (keksdose `chore/vscode-workspace`, kastlan
`feat/feedback-harmonization`, Kurvenschmiede `chore/workspace-server-kit`). Marcel's
decisions are in §2, the three apps' reviews and what they settled in §7 (all
answered the same day). It follows the pattern of the feedback round
([feedback-harmonization.md](feedback-harmonization.md)): **one contract + kit parts**.
**keksdose is the reference**; the kit owns every word that is the same in all three apps
and every part that three apps were building separately; each app keeps the sections
that describe what only it does.

This reverses one line of the language round (H10 in
[i18n-harmonization.md](i18n-harmonization.md)): in 0.19 the legal *words* stayed in each
app and only the shell moved into the kit. From 0.28 the shared wording is the kit's too
(§2, decision 5).

Paths below are relative to each repo: **kk** = keksdose, **ka** = kastlan,
**KS** = Kurvenschmiede.

## 1. Where each one stands

All three already serve the same three public pages at `/impressum`, `/privacy` and
`/terms`: one route per page, with the language switched through i18n. There are no
per-language URLs, no table of contents, no "last updated" line, no cookie banner, and no
legal links in emails. Everything around those pages differs:

| | keksdose (reference) | kastlan | Kurvenschmiede |
|---|---|---|---|
| Page frame | public header + kit `LegalLayout` + public footer (kk `features/legal/legal-layout.tsx`) | its own frame: `AuthLayout width="wide" card={false}` with a hand-placed banner, **no kit `LegalLayout`** | inside the signed-in app shell (`<Page>`), kit `LegalLayout` |
| Back link | ← "Back to home", `/` | ← "Back to sign in", `/login` | "Back to home", no arrow |
| Notice | per page; the privacy page has its own | one for every page | one draft banner for every page |
| noindex | `useNoIndex()` + Caddy `X-Robots-Tag` | none | none |
| Link labels | short: Imprint · Privacy Policy · Terms (`landing.footer.*`), `·` separators | the page titles, no separators | the page titles, no separators |
| Public footer | `SiteFooter`: landing, every auth page, the legal pages, 404 | sign-in page only (`AuthLayout` footer) | home page + the four auth pages (`AuthShell`) |
| Account menu | `TopBarActionMenu` `footer`, kit `TextLink`s | `TopBarActionMenu` `footer`, plain router `Link`s | hand-built `HoverMenu` `<li>` (run together until kit 0.27.1) |
| Sidebar | own footer, 11 px, expanded only | kit `sidebarFooterItems` `kind: "links"` | — |
| Sections (imprint / privacy / terms) | 4 / 11 / 6 | 3 / 8 / 6 | 3 / 9 / 8 |
| Browser storage | one Plausible line ("sets no cookie") | nothing | a section, "What your browser stores" |
| Terms checkbox at sign-up | yes, client-side only | no | no |
| Imprint key | `legal.impressum` | `legal:impressum` (i18next namespace) | `legal.imprint` |
| Section ids (deep links) | no | no | yes |
| Languages | 4 | 4 | 7 |
| Review area `legal` | yes | yes (+ `doc_text`) | yes |

The sections that say the same thing are already nearly word for word the same. Warranty,
liability, changes and governing law are identical in all three. Operator, contact,
disclaimer, controller, legal basis, rights and the privacy contact differ only in small
ways:
- kastlan prints the street address, where keksdose and Kurvenschmiede say it is supplied
  on request;
- kastlan calls itself "a private project", not "a private, non-commercial project";
- Kurvenschmiede avoids the word "beta".

## 2. Decisions (Marcel, 2026-10-05)

1. **Kit 0.27.1 first**: `LegalLinks nav={false}` keeps its spaced row and `className`
   (shipped 2026-10-05).
2. **Content = shared skeleton + shared wording.** Every app gets keksdose's section list
   and keys. Where the content is the same (operator, contact, disclaimer, controller,
   legal basis, rights, privacy contact, warranty, liability, changes, law), the wording
   is **identical**. The sections that describe one app's own processing stay that app's
   (processors, data, retention, AI documents, price pool, accounts, …).
3. **"What your browser stores"** goes into all three privacy policies.
4. **keksdose's terms checkbox** on every app's register page: required, linking Terms
   and Privacy, client-side as keksdose does it (no stored version, no re-acceptance).
5. **The shared wording lives in the kit**, in all 7 languages, filled in with each
   app's values. Apps keep only their app-specific sections, and there is one text to
   change after the lawyer's review.
6. Kit **0.28.0** carries the rest: the link labels (7 languages), keksdose's separator
   style, the page frame, `useNoIndex`, legal links on every auth page and in the account
   menu's footer, and the shared section skeleton and key naming.
7. **"Non-commercial" stays** in the disclaimer; it is true of all three apps today.
   kastlan's Stripe billing module is switched off in production. Whichever app turns
   billing on updates its legal texts **in that same release**: Stripe as a processor
   and transfer, the prices in its terms, and a commercial version of the disclaimer
   (a kit variant, built then). (Marcel, after the reviews.)
8. **Kurvenschmiede is a closed beta** like the other two, so all three carry the same
   disclaimer, warranty and notices. (Marcel, after the reviews.)
9. **German is the binding language** (Marcel, after the adoption, 0.28.1). The lawyer
   reviews the German texts; every other language is a translation for convenience.
   - A legal page read in another language says so under its title, with a way to the
     German version.
   - The terms carry a `language` section (between `changes` and `law`) saying the
     German version prevails.
   - Privacy translations must still be accurate: an information duty is met by what the
     reader read, so native reviewers check them on /translations, and a lawyer only for
     the languages of markets an app actively targets.

## 3. The page contract

### 3.1 Routes

`/impressum`, `/privacy`, `/terms`. The routes are public, outside any redirect for
signed-in users, and use one route per page with the language from i18n. Each section's
`id` is its key (`/privacy#rights`), which keeps Kurvenschmiede's deep links working; the
kit sets it.

### 3.2 Frame (keksdose's)

From top to bottom:

1. **The app's public header**: the one a signed-out visitor already sees on the app's
   public pages (brand, language switcher, theme, sign-in). keksdose: `LandingHeader`.
   Kurvenschmiede: its `AppTopBar`, rendered without the shell. kastlan: the brand row
   its sign-in page shows.
2. **The column**: the kit's `LegalLayout` with:
   - the back link `← Back to home`, pointing to `/`;
   - the title;
   - the notice;
   - the sections.
3. **The public footer**: the three links with `·` separators.

Signed-in users see the same frame. The legal pages are no longer drawn inside the app
shell, so Kurvenschmiede moves them out of `<Page>`. `/` takes a signed-in user back into
the app. For kastlan, which has no landing page, `/` takes a signed-out visitor to the
sign-in page.

**Notice:**
- The imprint and the terms carry the kit's **beta notice** (§4.3). It is no longer
  keksdose's `placeholder_banner` ("provided in good faith and is not legal advice"),
  because the terms are the agreement itself, not information (§7.3).
- The privacy page carries the kit's **privacy notice**. It is keksdose's
  `privacy_banner`, with the keksdose-only phrase "what leaves your household" replaced by
  Kurvenschmiede's "what is stored, where, and who can read it" (§4.3).

An app may still pass its own notice.

**noindex**: the kit's `useNoIndex()` on the legal pages and on every auth page, as
keksdose does (feedback #97, #129). Each app's web server also sends
`X-Robots-Tag: noindex` for the three legal routes, as keksdose's Caddy does.

**robots.txt and sitemap.xml** (2026-10-07, keksdose's practice, from Kurvenschmiede):
every app serves real files, never the SPA shell as `text/html`.

- **`robots.txt`** disallows only token links (reset, verification, invitation) and
  `/api/`. It never disallows the noindex legal pages: a `Disallow` keeps a crawler from
  ever reading their `X-Robots-Tag`. It never disallows signed-in routes either; their
  noindex and sign-in redirect do that job.
- **`sitemap.xml`** lists only the public, indexable pages, with no `lastmod`.

Each app writes its own, since they name its domain, its public pages and its token
routes. The kit ships nothing for it.

### 3.3 Where the links appear

| Place | Who sees it | Part |
|---|---|---|
| Public footer: landing/home, **every** signed-out page the app has (sign-in, register, forgot/reset password, verify email, …), the legal pages, the 404 where there is one; §6 lists each app's pages | signed out (and signed in on those pages) | `LegalFooter` |
| Account menu footer | signed in, every viewport | `LegalLinks nav={false}` in `TopBarActionMenu`'s `footer` (with its `footerLabel`), or in a plain container (KS's `HoverMenu`) |
| Sidebar footer | optional; keksdose and kastlan keep theirs | kit labels, no own words |

On a page drawn with the kit's `AuthLayout`, the footer slot is a `<footer>` already, so
the links go there as `<LegalLinks nav={false} />` under the kit's `navLabel`, not as a
`LegalFooter` (kastlan's adoption; 0.28.1).

The rule behind the table: **from every page a signed-out visitor can reach, the three
links are one click away.** That includes Kurvenschmiede's public `/control` and
`/steering`.

The labels are always the kit's short link labels (`legal.links.*`, §4.4), in the order
Imprint · Privacy Policy · Terms, with `·` separators (`aria-hidden`). This applies in the
account menu too, so keksdose's menu gains the dots. The current page is marked
`aria-current="page"` wherever the router's path is known.

### 3.4 Terms acceptance

The register page shows a **required checkbox** labelled "I accept the [Terms of Service]
and the [Privacy Policy]", with the page titles as links. Submit stays disabled while it
is unticked; it is never an error message. Nothing is sent to the backend. This is
keksdose's `register-page.tsx` behaviour, now the kit's `LegalAcceptCheckbox`.

## 4. The content contract

### 4.1 Keys and numbering

- Namespace `legal`. kastlan keeps it as an i18next namespace (`legal:`); the keys
  inside are the same as everywhere else.
- Page keys: `impressum`, `privacy`, `terms`. Kurvenschmiede's `imprint` becomes
  `impressum`.
- Section keys are keksdose's. Kurvenschmiede renames `processors` → `third_parties` and
  `results` → `no_advice`.
- **Section titles carry no numbers.** The kit numbers the privacy and terms sections in
  render order; the imprint stays unnumbered, as in keksdose.
- **Cross-references use a token**: `{ref:retention}` in an app body renders as the
  section's computed number, linked to `#retention`. The words around it stay in the
  app's text ("see section {ref:retention}", "siehe Abschnitt {ref:retention}"), so
  each language keeps its own grammar. Hungarian puts its case ending on the noun after
  the number. keksdose has 12 such references per language and Kurvenschmiede has one;
  the new browser section shifts keksdose's numbers, and with the token they can't go
  stale again.

### 4.2 Skeleton

**kit** = the kit's wording; **app** = the app's own section;
**kit + app** = kit wording with an app paragraph in a fixed slot.

**Imprint** (unnumbered):

| Key | Owner | Note |
|---|---|---|
| `operator` | kit | name, place, country; the full postal address "on request" |
| `contact` | kit | email |
| `disclaimer` | kit | "private, non-commercial project … closed beta, without warranty" |
| *app sections* | app | keksdose's `credits` |

**Privacy Policy** (numbered):

| Key | Owner | Note |
|---|---|---|
| `controller` | kit | |
| `data` | app | |
| `legal_basis` | kit + app | the kit's FADP/GDPR paragraph names contract and legitimate interest only. **Consent is the app's**: an app that relies on it says so in its paragraph (keksdose's consent list), §7.3. Kurvenschmiede's paragraph: "no tracking, no analytics, no advertising" |
| `third_parties` | app | hosting and processors |
| *app sections* | app | keksdose's `price_pool`, `location`, `documents_ai` |
| `browser` | kit + app | the kit's text around the app's list of what it keeps (§4.3), then an optional app paragraph: what sign-out removes beyond the tokens, what stays |
| `transfers` | app | which providers, in which countries |
| `retention` | app | |
| `rights` | kit + app | the kit's list of rights, then the app's paragraph (how to export, how to delete), then the kit's sentence about the supervisory authorities |
| `contact` | kit | |

**Terms of Service** (numbered):

| Key | Owner | Note |
|---|---|---|
| `scope` | app | in the canon's pattern: "These terms govern the use of {App}, {what it is}, operated by Marcel Eifert. It is currently provided free of charge as a closed beta, by invitation only." It is app-owned because "{what it is}" cannot be slotted into a German or Hungarian sentence without the case agreeing. |
| `no_advice` | app | Kurvenschmiede's "Engineering results without guarantee" is this section |
| *app sections* | app | Kurvenschmiede's `accounts`, `content` |
| `warranty` | kit | |
| `liability` | kit | |
| `changes` | kit | |
| `law` | kit | the place of jurisdiction comes from the operator |

### 4.3 The kit's wording (English canon)

The texts are keksdose's unless marked otherwise.
- de-CH, fr and it come from keksdose's catalogues.
- es, hu and zh come from Kurvenschmiede's, brought into line with the canon.
- `{…}` is filled in from the app's values: the operator (§5) or the browser list.

- **Imprint**
  - **operator**, "Operator": `{name}\n{postalCode} {city}\n{country}\n\nThe full postal
    address is supplied on request to anyone with a legitimate legal interest; write to the
    contact address below.`
  - **contact**, "Contact": `Email: {email}`
  - **disclaimer**, "Liability for content and links": This is a private,
    non-commercial project offered during a closed beta, without warranty. External sites
    we link to are the responsibility of their respective operators; we have no control
    over their content.
- **Privacy Policy**
  - **controller**, "Controller": The party responsible for processing personal data in
    this service is:\n`{name}`\n`{postalCode} {city}, {country}`\nEmail: `{email}`\n\nThe
    full postal address is supplied on request to data subjects and supervisory
    authorities.
  - **legal_basis**, "Legal basis": As the operator is based in Switzerland, processing
    is governed by the Swiss Federal Act on Data Protection (FADP). Where the EU General
    Data Protection Regulation (GDPR) applies to you, we rely on the performance of a
    contract to provide the service (Art. 6(1)(b) GDPR) and our legitimate interest in
    operating and securing it (Art. 6(1)(f) GDPR). → *app paragraph* (keksdose:
    "… your consent (Art. 6(1)(a) GDPR) for what you switch on yourself: …")
  - **browser**, "What your browser stores" (Kurvenschmiede's section, reworded after the
    reviews, §7.2):
    - No cookies. The app keeps the following in your browser's storage:
    - `{entries}`, rendered as a list, one item per entry, from the app.
    - None of it is used to track you. Entries waiting to be sent are sent to us as soon
      as they can be; everything else stays on your device. All of it disappears when you
      clear the site's data, and signing out removes the sign-in tokens.
    - → *app paragraph*
  - **rights**, "Your rights":
    - lead: You have the right to access, rectification, erasure, restriction, data
      portability and objection.
    - → *app paragraph*
    - tail: If you are in Switzerland you may contact the Federal Data Protection and
      Information Commissioner (FDPIC); if you are in the EU you may lodge a complaint with
      your local supervisory authority.
  - **contact**, "Contact for data protection": For any privacy request, contact: `{email}`
- **Terms of Service**
  - **warranty**, "No warranty": The service is provided "as is" and "as available",
    without warranties of any kind to the extent permitted by law. As a beta it may contain
    errors, change, or be interrupted at any time — keep your own backups of important data.
  - **liability**, "Limitation of liability": To the extent permitted by applicable law,
    the operator is not liable for any indirect or consequential damage arising from the
    use of, or inability to use, the service. Nothing here limits liability that cannot be
    limited by law.
  - **changes**, "Changes to these terms": These terms may be updated as the service
    evolves. Material changes will be announced by email or in the app; continued use after
    a change means you accept it.
  - **law**, "Governing law": These terms are governed by Swiss law, excluding its
    conflict-of-laws rules. As far as legally permissible, the place of jurisdiction is
    `{city} ({region})`, `{country}`.

**Notices:**
- **beta**: Closed beta. These texts have not been reviewed by a lawyer yet and will be
  before a public launch. (This is Kurvenschmiede's wording, §7.3. It replaces keksdose's
  "provided in good faith and is not legal advice", which fits a page of information but
  not the terms.)
- **privacy**: Closed beta. The legal wording below has not been reviewed by a lawyer yet
  and will be before a public launch. The technical descriptions — what is stored, where,
  and who can read it — describe what the software actually does today, and are meant to
  be checked against it.

### 4.4 The kit's labels

| Key | en | de-CH |
|---|---|---|
| `navLabel` | Legal | Rechtliches |
| `links.impressum` / `privacy` / `terms` | Imprint / Privacy Policy / Terms | Impressum / Datenschutz / Nutzungsbedingungen |
| `titles.impressum` / `privacy` / `terms` | Imprint / Privacy Policy / Terms of Service | Impressum / Datenschutzerklärung / Nutzungsbedingungen |
| `backHome` | Back to home | Zurück zur Startseite |
| `accept` | I accept the {terms} and the {privacy} | Ich akzeptiere die {terms} und die {privacy} |

fr and it come from keksdose's `landing.footer.*`, `legal.*` and `auth.accept_*`. es, hu
and zh are new; they come from Kurvenschmiede's titles. `accept` is one template, not a
prefix plus a joiner, so a language can put the links where its grammar needs them.
The articles live in the template next to the placeholders. For example:
- fr "J’accepte les {terms} et la {privacy}";
- it "Accetto le {terms} e l’{privacy}". There is no space after the elided article, so
  interpolation must not add one.

The kit's fr `navLabel` stays "Informations légales". keksdose's own "Mentions légales"
would repeat the fr Imprint link's label, so a screen reader would read it twice.

## 5. What the kit adds, what stays app-side

**Kit 0.28.0** (main barrel, beside the 0.19 parts):

- **The `legal` label namespace, extended, in all 7 languages**:
  - `links`, `titles`, `backHome`, `accept`;
  - `notice.beta`, `notice.privacy`;
  - `sections.*`, the §4.3 texts as functions of the operator.
- **`LegalOperator`**: `{ name, postalCode, city, region, country, email }`. `country`
  is an ISO code; the kit names it in the page's language. The kit holds **no personal
  data**: each app passes the same values once (kk, ka and KS: Marcel Eifert,
  9470 Buchs, SG, CH, marcel.eifert@outlook.com).
- **`LegalPage`**: the §3.2 frame.
  - Props: `page` (`"impressum" | "privacy" | "terms"`), `operator`, `header`, `footer`
    (default `<LegalFooter />`), `homeHref` (default `/`), `notice` (default per page).
  - It sets the title from `titles`, numbers the sections where §4.1 says so, resolves
    `{ref:key}` tokens in the bodies (§4.1), and calls `useNoIndex()`.
- **Kit sections**: one part renders a §4.3 section by key, with its id and number
  (`<LegalKitSection section="warranty" />`). It takes `children` for the app paragraph
  where §4.2 says kit + app. For the browser section it takes `entries` as a list of
  strings, rendered as a `<ul>`.
- **`LegalSection`** gains automatic numbering inside a `LegalPage`, its key as id, and
  `{ref:key}` resolution. Its API stays the same otherwise.
- **`LegalLinks`**:
  - `links` becomes optional; the default is the three routes with the kit's link labels.
  - `·` separators.
  - `nav={false}` keeps the row (0.27.1).
- **`LegalFooter`**: keksdose's `SiteFooter`, a centred `<nav aria-label>` with the three
  links and their separators. `children` sit under the links, for a tagline.
- **`LegalAcceptCheckbox`**: the §3.4 checkbox, with `checked`, `onCheckedChange` and
  optional hrefs.
- **`useNoIndex()`**: keksdose's hook, which removes its `<meta>` on unmount.
- **`LEGAL_SKELETON`**: the §4.2 order as data, so an app test can assert that its pages
  follow it.
- **Review** (§7.5):
  - The default `keyInArea` also matches `kit.<area>.`, since all three apps flatten
    the kit's labels under `kit.`.
  - A new exported `reviewAreaOf(key)` gives the app's translation page the same rule:
    `kit.legal.*` → `legal`.
  - `kitLabelStrings` covers the new keys and takes an optional operator, so a
    reviewer reads the real sentence.
- **Docs**: a showcase page (all three pages, phone and desktop) and `docs/adopt-0.28.md`.
  The adopt guide includes the review-area lines for each app's server and page.

**server-kit** (a patch, on Marcel's go like every release):
- `in_areas` matches `kit.<area>.` as well, the same rule as the kit's `keyInArea`.
  keksdose uses it already. kastlan and Kurvenschmiede have their own copy of
  `in_areas` and make the same one-line change.
- While there: the CORS module's comment about "the SPA's refresh cookie" is stale (no
  app has one). keksdose's `main.py:152` has the same stale comment.

**App-side**:
- the routes;
- the public header;
- the app sections and the app paragraphs;
- the browser list (what this app really keeps), in every language it serves;
- the operator values;
- the web server's `X-Robots-Tag`;
- the review-area mapping on its server and translation page.

## 6. Per repo

**ui-kit** (first, one minor release, 0.28.0):
1. Labels and all 7 catalogues (§4.3, §4.4). es, hu and zh are seeded from
   Kurvenschmiede's texts and go back to it for review.
2. `LegalOperator`, `LegalPage`, `LegalKitSection`, numbering, ids, `{ref:key}`,
   `LEGAL_SKELETON`.
3. `LegalLinks` default links and separators, `LegalFooter`, `LegalAcceptCheckbox`,
   `useNoIndex`.
4. `keyInArea` + `reviewAreaOf`, `kitLabelStrings` with an operator, the showcase,
   `adopt-0.28.md`.

**keksdose**:
1. Bump the kit.
2. `features/legal/legal-layout.tsx` → `LegalPage` with `header={<LandingHeader />}`.
   `SiteFooter` → `LegalFooter` with the tagline as children. `use-noindex.ts` →
   the kit's hook.
3. **`/verify-email`** gains the header, the footer and `useNoIndex`. Caddy's `@noindex`
   gains `/forgot-password`, `/reset-password` and `/verify-email` (today it covers the
   legal pages, `/login` and `/register`).
4. Account menu footer and sidebar footer → `LegalLinks`.
5. The register checkbox → `LegalAcceptCheckbox`.
6. Remove the keys the kit now owns:
   - `legal.back_home`, `nav_label`, `placeholder_banner`, `privacy_banner`;
   - the kit sections;
   - `landing.footer.impressum` / `privacy` / `terms`;
   - `auth.accept_prefix` / `accept_and`.
7. Section titles lose their numbers. The 12 numbered references per language become
   `{ref:…}` tokens:
   - in `data`, `third_parties`, `price_pool`, `documents_ai`, `retention` and `rights`;
   - pointing to `price_pool`, `location`, `documents_ai`, `retention` and `contact`.
8. `legal_basis`: the app paragraph now carries the consent basis (Art. 6(1)(a)) along
   with the consent list. `rights` keeps its export paragraph as the app paragraph.
   `credits` stays.
9. **New**: the `browser` list, using your drafts (10 entries, 4 languages, through
   /translations). The app paragraph says what an explicit sign-out wipes (the offline
   copy, the cached data, the keys), that settings and the home position stay, and that
   an expired session keeps the offline copy and unsent changes. **The Plausible
   paragraph stays in `third_parties`**: it describes a processor, not browser storage,
   and `privacy-analytics-flag.test.ts` pins it there.
10. `translations-page.tsx`:
    - the area of a `kit.legal.*` key is `legal`, via `reviewAreaOf`;
    - `kitLabelStrings` gets the operator;
    - the note that "the legal pages hold no kit. key" (lines 247-249) stops being true.
    The server takes the server-kit patch.

**kastlan**:
1. Bump the kit.
2. `features/legal/legal-layout.tsx` (own frame) → `LegalPage`, with the brand row its
   sign-in page shows. The back link goes to `/` ("Back to home"), which takes a
   signed-out visitor to `/login`.
3. `LegalFooter` on `/login`, `/register`, `/verify-email`, and on the pages §7.9 adds:
   `/forgot-password`, `/reset-password` and a 404. `/2fa`, an orphan placeholder
   (the real challenge is a step of `/login`), goes.
4. Account menu: plain `Link`s (`top-bar.tsx:167`) → `LegalLinks`. The sidebar entry
   (`app-layout.tsx:108`) takes the kit's labels.
5. noindex: `useNoIndex` on the legal and auth pages, `X-Robots-Tag` in Caddy for the
   three routes.
6. The register checkbox (new).
7. Content:
   - the kit sections replace yours, and the street address goes (canon: on request);
   - **new**: the `browser` list from your drafts. The app paragraph names what is not
     in local storage: the IndexedDB `kastlan-offline` photos waiting to upload, which
     sign-out does not clear, and the service worker's offline cache;
   - `legal_basis`: the kit's lead no longer claims consent. Add a consent paragraph
     only if something in kastlan rests on it;
   - **`third_parties` is wrong today**: Cloudflare is DNS only (Cloud Run domain
     mapping, `server: Google Frontend`, no `cf-ray`). Fix it **in the same change** as
     the kit swap, because the privacy notice says the technical descriptions match the
     running software;
   - email: no provider is right while there is no SMTP. But the verification link is
     written to the backend log (Cloud Logging) together with the user's email address,
     so the privacy page says so. Name the provider when SMTP goes on.
8. Review area: `translation_review_service.in_areas` matches `kit.<area>.`.
   `translations-page.tsx:58` maps `kit.legal.*` to `legal` via `reviewAreaOf`.
9. Billing (decision 7): nothing changes now. The day `KASTLAN_BILLING_ENABLED` goes
   on, the legal texts change in the same release.

**Kurvenschmiede**:
1. Bump the kit.
2. The legal pages leave the app shell → `LegalPage` with `header` = your `AppTopBar`
   without the shell (mark, `LanguageMenu`, `ThemeToggle`, sign-in or account). The
   back link gains its arrow.
   - `AuthShell` has no header and no language switcher. Giving it `AppTopBar` too is
     your call; this round does not require it.
3. `LegalFooter`:
   - on `/`, the four auth pages (`/login`, `/register`, `/forgot-password`,
     `/reset-password`), the legal pages and the 404, replacing `LegalLinks`;
   - for signed-out visitors, also on the public `/control` and `/steering`, or anywhere
     else that puts the links one click away (§3.3).
   - The account menu's `<li>` keeps `LegalLinks nav={false}`, now without `links`.
4. noindex: `useNoIndex`, plus `X-Robots-Tag` for the three routes in
   `deploy/gcp/Caddyfile.cloudrun` and `deploy/Caddyfile`. The register checkbox (new).
5. Keys:
   - `imprint` → `impressum`, `processors` → `third_parties`, `results` → `no_advice`;
   - `draft_banner` → the kit's notices;
   - titles lose their numbers;
   - "section 9" in `retention` becomes `{ref:contact}`.
6. The `browser` list, from your corrected drafts in 7 languages (tokens and cached
   account, language, theme, layouts, error reports until sent). Your `data` section
   gains the automatic crash reports. The kit's `legal_basis` + your "no tracking"
   sentence as the app paragraph. `accounts` and `content` stay, after `no_advice`.
7. Review area: your `in_areas` matches `kit.<area>.`. `namespaceOf`/`groupOf` in
   `translations-page.tsx` map `kit.legal.*` to `legal` via `reviewAreaOf`.
8. Your es/hu/zh texts seed the kit's translations of the shared sections; the kit sends
   the result back for your review.

## 7. Settled after the reviews (2026-10-05)

The three apps answered from their code. What they found, and what follows:

1. **No cookies** in any app: none of their own, none from a third party. Each app
   checked its code and production. Plausible is cookieless and proxied first-party.
   Cloudflare is DNS only everywhere, and Cloud Run sets no session affinity. "No
   cookies." stays.
2. **Browser storage is more than "a few entries in local storage"**:
   - keksdose: IndexedDB (an offline budget copy and outbox, a query cache, private-mode
     keys for up to 12 h) and Cache Storage;
   - kastlan: IndexedDB (photos waiting to upload) and the service worker's cache;
   - all three: `createCrashReporter`'s buffer, which is sent to the operator after
     sign-in.
   So the kit's text now says "your browser's storage" and takes the entries as a list.
   Its old "they stay on your device" no longer covers everything: entries waiting to be
   sent are named as the exception. `browser` becomes kit + app, so an app can say what
   sign-out removes beyond the tokens (§4.3). The tokens sentence holds in all three:
   each app's every sign-out path clears them.
3. **Consent and the beta notice** (Kurvenschmiede):
   - The kit's `legal_basis` no longer claims consent. Kurvenschmiede relies on none, and
     claiming it would imply a withdrawal right with nothing behind it. Consent moves to
     the app paragraph of the apps that use it.
   - The beta notice is Kurvenschmiede's "not reviewed by a lawyer yet". keksdose's "not
     legal advice" fits information, not the terms themselves.
   - keksdose does not object to the privacy notice change or to the dots in the account
     menu.
4. **Cross-references**: keksdose has 12 per language, not 2, and Kurvenschmiede has 1.
   Rewording them all as links would be clumsy, so the kit resolves `{ref:key}` to the
   computed number (keksdose's proposal, §4.1).
5. **Review areas**: `kit.legal.*` reaches no `legal` area today in any app, on the
   server (`in_areas`, a prefix test) or on the page (`keyInArea`; `kit.<ns>` as the
   area). A lawyer with a `["legal"]` grant would not see the kit's legal text and would
   be refused writing to it. The fix is one rule in four places:
   - the kit's `keyInArea` and `reviewAreaOf`;
   - server-kit's `in_areas`;
   - kastlan's and Kurvenschmiede's own copies of `in_areas`;
   - plus each translation page's area and grouping.
6. **Signed-out pages** differ per app, so §3.3 states a rule (the links one click away
   from every signed-out page) and §6 lists each app's pages:
   - kastlan had no forgot/reset, landing or 404 page (it gains them, §7.9);
   - keksdose's `/verify-email` was the one page without footer and noindex;
   - Kurvenschmiede's public `/control` and `/steering` had no links for a signed-out
     visitor.
7. **Facts the reviews corrected**:
   - kastlan's `third_parties` (Cloudflare DNS only);
   - kastlan's email statement (no SMTP; the verification link in the server log);
   - keksdose's Plausible paragraph stays a processor disclosure;
   - Kurvenschmiede's renamed anchors (`#processors`, `#results`) have no inbound links.
8. **Marcel**: "non-commercial" stays until an app bills (§2.7), and Kurvenschmiede is a
   closed beta (§2.8). kastlan's billing module (off in production, but still in the
   admin sidebar) is the subject of the next round.

9. **Marcel, later the same day: every app gets the full set of signed-out pages**:
   sign-in, register, forgot password, reset password, verify email, a 404 and the
   legal pages.
   - kastlan builds its missing ones now, on keksdose's shape: password reset
     (request, check, confirm), a 404, invite links on the reset tokens instead of
     admin-chosen passwords, and mail through Resend. `/2fa` goes.
   - Kurvenschmiede lacks email verification altogether. Its scope is confirmed with
     Marcel in its own session.
   - Every new page gets `LegalFooter` and `useNoIndex` like the others.
   - The shared parts (forgot/reset/404/verify pages in the kit, the reset-token rules
     and the Resend client in server-kit) belong to the user-management round.

Nothing is open. The kit round runs on `feat/0.28.0`.
