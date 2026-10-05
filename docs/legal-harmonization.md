# The legal pages across the kit and the three apps — harmonisation plan

Status: **2026-10-05**, led from ui-kit at Marcel's request. Built from a read-only audit
of the three apps' working trees (keksdose `chore/vscode-workspace`, kastlan
`feat/feedback-harmonization`, Kurvenschmiede `chore/workspace-server-kit`). Marcel's
decisions are in §2. It follows the pattern of the feedback round
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

## 3. The page contract

### 3.1 Routes

`/impressum`, `/privacy`, `/terms`. The routes are public, outside any redirect for
signed-in users, and use one route per page with the language from i18n. Each section's
`id` is its key (`/privacy#rights`), which keeps Kurvenschmiede's deep links working; the
kit sets it.

### 3.2 Frame (keksdose's)

From top to bottom:

1. **The app's public header**: the one its signed-out pages already show (brand,
   language switcher, theme, sign-in).
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
- The imprint and the terms carry the kit's **beta notice** (keksdose's
  `placeholder_banner`).
- The privacy page carries the kit's **privacy notice**. It is keksdose's
  `privacy_banner`, with the keksdose-only phrase "what leaves your household" replaced by
  Kurvenschmiede's "what is stored, where, and who can read it" (§4.3).

An app may still pass its own notice.

**noindex**: the kit's `useNoIndex()` on the legal pages and on every auth page, as
keksdose does (feedback #97, #129). Each app's web server also sends
`X-Robots-Tag: noindex` for the three legal routes, as keksdose's Caddy does.

### 3.3 Where the links appear

| Place | Who sees it | Part |
|---|---|---|
| Public footer: landing/home, **every** auth page (sign-in, register, forgot/reset password, verify email, two-factor, invitation), the legal pages, 404 | signed out (and signed in on those pages) | `LegalFooter` |
| Account menu footer | signed in, every viewport | `LegalLinks nav={false}` in `TopBarActionMenu`'s `footer` (with its `footerLabel`), or in a plain container (KS's `HoverMenu`) |
| Sidebar footer | optional; keksdose and kastlan keep theirs | kit labels, no own words |

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
  render order; the imprint stays unnumbered, as in keksdose. A cross-reference is a link
  to the section's id, not a number in running text. This matters because the new browser
  section shifts keksdose's numbering, and keksdose's text says "section 7" and
  "section 9".

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
| `legal_basis` | kit + app | the FADP/GDPR paragraph is the kit's. An optional app paragraph follows: keksdose's consent list; Kurvenschmiede's "no tracking, no analytics, no advertising" |
| `third_parties` | app | hosting and processors |
| *app sections* | app | keksdose's `price_pool`, `location`, `documents_ai` |
| `browser` | kit + app | the kit's text around the app's list of what it keeps (§4.3) |
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
    contract to provide the service (Art. 6(1)(b) GDPR), your consent (Art. 6(1)(a) GDPR)
    and our legitimate interest in operating and securing the service (Art. 6(1)(f) GDPR).
    → *app paragraph*
  - **browser**, "What your browser stores" (Kurvenschmiede's wording): No cookies. The
    app keeps a few entries in your browser's local storage: `{entries}`. They stay on your
    device, are not used to track you and disappear when you clear the site's data;
    signing out removes the sign-in tokens.
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
- **beta**: Closed beta. This information is provided in good faith and is not legal
  advice; it will be reviewed before a public launch.
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

## 5. What the kit adds, what stays app-side

**Kit 0.28.0** (main barrel, beside the 0.19 parts):

- **The `legal` label namespace, extended, in all 7 languages**:
  - `links`, `titles`, `backHome`, `accept`;
  - `notice.beta`, `notice.privacy`;
  - `sections.*`, the §4.3 texts as functions of the operator and the browser list.
- **`LegalOperator`**: `{ name, postalCode, city, region, country, email }`. `country`
  is an ISO code; the kit names it in the page's language. The kit holds **no personal
  data**: each app passes the same values once (kk, ka and KS: Marcel Eifert,
  9470 Buchs, SG, CH, marcel.eifert@outlook.com).
- **`LegalPage`**: the §3.2 frame.
  - Props: `page` (`"impressum" | "privacy" | "terms"`), `operator`, `header`, `footer`
    (default `<LegalFooter />`), `homeHref` (default `/`), `notice` (default per page).
  - It sets the title from `titles`, numbers the sections where §4.1 says so, and calls
    `useNoIndex()`.
- **Kit sections**: one part renders a §4.3 section by key, with its id and number
  (`<LegalKitSection section="warranty" />`). It takes `children` for the app paragraph
  where §4.2 says kit + app, and `entries` for the browser list.
- **`LegalSection`** gains automatic numbering inside a `LegalPage` and its key as id.
  Its API stays the same otherwise.
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
- **Review**: `kitLabelStrings` covers the new keys. The sample values for the legal
  texts can be the app's own operator, so a reviewer reads the real sentence.
- **Docs**: a showcase page (all three pages, phone and desktop) and `docs/adopt-0.28.md`.

**App-side**:
- the routes;
- the public header;
- the app sections and the app paragraphs;
- the browser list (what this app really keeps);
- the operator values;
- the web server's `X-Robots-Tag`;
- mapping `kit.legal.*` into each app's `legal` review area.

## 6. Per repo

**ui-kit** (first, one minor release, 0.28.0):
1. Labels and all 7 catalogues (§4.3, §4.4).
2. `LegalOperator`, `LegalPage`, `LegalKitSection`, numbering and ids, `LEGAL_SKELETON`.
3. `LegalLinks` default links and separators, `LegalFooter`, `LegalAcceptCheckbox`,
   `useNoIndex`.
4. `kitLabelStrings` samples, the showcase, `adopt-0.28.md`.

**keksdose**:
1. Bump the kit.
2. `features/legal/legal-layout.tsx` → `LegalPage` with `header={<LandingHeader />}`.
   `SiteFooter` → `LegalFooter` with the tagline as children. `use-noindex.ts` →
   the kit's hook.
3. Account menu footer and sidebar footer → `LegalLinks`.
4. The register checkbox → `LegalAcceptCheckbox`.
5. Remove the keys the kit now owns:
   - `legal.back_home`, `nav_label`, `placeholder_banner`, `privacy_banner`;
   - the kit sections;
   - `landing.footer.impressum` / `privacy` / `terms`;
   - `auth.accept_prefix` / `accept_and`.
6. Section titles lose their numbers. "section 7" and "section 9" in `third_parties` and
   `rights` become links to `#documents_ai` and `#retention`.
7. `legal_basis` keeps its consent paragraph and `rights` its export paragraph, both as
   the app paragraph. `credits` stays.
8. **New**: the `browser` list. Check against the code that no cookie is set; the
   Plausible line moves here.

**kastlan**:
1. Bump the kit.
2. `features/legal/legal-layout.tsx` (own frame) → `LegalPage`, with the header its
   sign-in page shows. The back link goes to `/` ("Back to home").
3. `LegalFooter` on **every** auth page: today only `login-page.tsx` has it; register,
   verify email and two-factor gain it.
4. Account menu: plain `Link`s → `LegalLinks`. The sidebar entry takes the kit's labels.
5. noindex: `useNoIndex` on the legal and auth pages, `X-Robots-Tag` in Caddy for the
   three routes.
6. The register checkbox (new).
7. Content:
   - the kit sections replace yours;
   - the street address goes (canon: on request);
   - **new**: the `browser` list.
   - Check two facts against the running setup:
     - your privacy page names no email provider, yet the app has a verify-email page,
       so it sends mail;
     - it says Cloudflare carries traffic (DNS, TLS, CDN), where the other two apps run
       Cloudflare as DNS only.

**Kurvenschmiede**:
1. Bump the kit.
2. The legal pages leave the app shell → `LegalPage` with the header of its home and auth
   pages; the back link gains its arrow.
3. `LegalFooter` on the home page and in `AuthShell` (replacing `LegalLinks`). The
   account menu's `<li>` keeps `LegalLinks nav={false}`, now without `links`.
4. noindex as kastlan. The register checkbox (new).
5. Keys:
   - `imprint` → `impressum`, `processors` → `third_parties`, `results` → `no_advice`;
   - `draft_banner` → the kit's notices;
   - titles lose their numbers.
6. The `browser` section keeps its facts as the `{entries}` list. The kit's
   `legal_basis` + your "no tracking" sentence as the app paragraph. `accounts` and
   `content` stay, after `no_advice`.
7. Your es/hu/zh texts are the seed of the kit's for the shared sections. The kit will
   send the result for your review.

## 7. Open points for the reviews

Each app answers these from its code before the kit round starts:

1. **Cookies**: does the app set any cookie, its own or a third party's? The kit's
   browser text starts "No cookies." If one app sets one, the kit adds a variant.
2. **Sign-in tokens**: are they in local storage, and does signing out remove them, as
   the kit's sentence says?
3. **"Closed beta"** (Kurvenschmiede): the canon's disclaimer, warranty and notices say
   "closed beta". Kurvenschmiede's texts avoid the word: true or not?
4. **"Non-commercial"** (kastlan): the canon's disclaimer says "private,
   non-commercial". kastlan says only "private": true or not?
5. **Auth pages**: the full list of the app's signed-out pages (§3.3) that gain the
   footer.
6. **Review area**: where the app derives a key's area (frontend catalogue or backend),
   so that `kit.legal.*` lands in `legal`.

A kit-wording question that only Marcel can answer goes to him; anything else the kit
settles and records here.
