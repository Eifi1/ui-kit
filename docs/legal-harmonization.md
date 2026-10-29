# The legal pages across the kit and the three apps — harmonisation plan

Led from ui-kit at Marcel's request (2026-10-05), built from a read-only audit of the
three apps. Marcel's decisions are in §2. It follows the pattern of the feedback round
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

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the reviews
and later rounds that amended a section are folded into it, and the table names them. The
snapshot of the three apps, the per-repo to-dos and the reviews' list as written are in
[archive/legal-history.md](archive/legal-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | §7.8; decision 9 (0.28.1); decision 7 by billing §8, §9 (Paddle); decisions 10 (0.51.3) and 11 (0.51.4) |
| 3 | The page contract | ui-kit 0.28.0 | §7.3, §7.6, §7.9; 0.28.1 (translation note, `AuthLayout` footer); landing-demo §4.3 (robots, sitemap); 0.51.3 (as-of line, keksdose's stored version); 0.51.4 (summary, footer's optional pages) |
| 4 | The content contract | ui-kit 0.28.0 | §7.1–§7.4; 0.28.1 (`language` section); 0.32.0 (commercial disclaimer); 0.51.3 (`changes` wording, `updated` label); 0.51.4 (`summary`, `links.security`/`accessibility` labels) |
| 5 | What the kit adds, what stays app-side | ui-kit 0.28.0, server-kit 0.2.1 | §7.5; 0.28.1; 0.32.0 |
| 6 | Per repo | — (archived) | |
| 7 | Settled after the reviews | — | index; folded items point to their § |

## 1. Where each one stands

Moved to [archive/legal-history.md](archive/legal-history.md): the three apps' legal pages
before the 0.28 round, and how far their wording differed.

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
   Amended for keksdose by decision 10: it stores the accepted version.
5. **The shared wording lives in the kit**, in all 7 languages, filled in with each
   app's values. Apps keep only their app-specific sections, and there is one text to
   change after the lawyer's review.
6. Kit **0.28.0** carries the rest: the link labels (7 languages), keksdose's separator
   style, the page frame, `useNoIndex`, legal links on every auth page and in the account
   menu's footer, and the shared section skeleton and key naming.
7. **"Non-commercial" stays** in the disclaimer while an app's billing is off, which it
   is in all three. Whichever app turns billing on updates its legal texts **in that same
   release** (billing §8): **Paddle**, the provider chosen on 2026-10-09 (billing §9), is
   the Merchant of Record, which sells in its own name, so its terms of sale apply to the
   purchase and the privacy policy names it as a recipient and independent controller of
   the buyer's data (billing §12.25); the prices go into the app's terms; and the imprint
   takes the kit's **commercial disclaimer**, `<LegalKitSection section="disclaimer"
   variant="commercial" />` (ui-kit 0.32.0, §4.3). (Marcel, after the reviews; amended
   by the billing round.)
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
10. **Dated pages and a notice period for changes** (Marcel, 2026-10-29, from keksdose's
    legal benchmark, gaps 7 and 8; ui-kit 0.51.3):
    - Every legal page carries an as-of date under its title (`LegalPage`'s `updated`,
      §3.2).
    - The terms' `changes` section gives at least 30 days' notice, a right to object or
      leave, and time to export, instead of consent by continued use (§4.3; lawyer
      question 4: continued use alone may not bind German consumers). Since 0.51.4 it says
      what an objection leads to: the operator may end the account on the effective date,
      with a pro-rata refund of a paid period; changes that only benefit the user or that
      the law requires apply without notice or objection (Marcel, 2026-10-29).
    - keksdose stores the accepted terms version (the terms page's `updated` date) and the
      time at registration, in a users column of its own. This reverses decision 4's "no
      stored version" for keksdose only; the kit's checkbox still sends nothing (§3.4).
    - **A page's date moves with the kit's words too** (Marcel, 2026-10-29). The kit's
      sections are printed word for word on every app's pages, so a kit release can change
      a page whose date the app typed. A ui-kit release that changes any kit-owned wording
      a legal page prints says so in its adoption note, under a "Legal wording" line naming
      the pages. Each app moves those pages' `updated` to the day it ships that release.
      Without it, keksdose's stored version would no longer say which text someone
      accepted.
11. **The benchmark's optional rows** (Marcel, 2026-10-29: "you can already add the
    optional points"; ui-kit 0.51.4):
    - A plain-language summary at the top of the terms and the privacy policy, the full
      text binding (`LegalPage`'s `summary`, §3.2).
    - A security page and an accessibility statement are an app's own public pages
      (`PublicPage`, its own words), not legal pages. The footer links them after the
      three, in the kit's words, where the app has them (§3.3).

## 3. The page contract

### 3.1 Routes

`/impressum`, `/privacy`, `/terms`. The routes are public, outside any redirect for
signed-in users, and use one route per page with the language from i18n. Each section's
`id` is its key (`/privacy#rights`), which keeps Kurvenschmiede's deep links working; the
kit sets it.

### 3.2 Frame (keksdose's)

From top to bottom:

1. **The app's public header** (`LegalPage`'s `header`): the one a signed-out visitor
   already sees on the app's public pages (brand, language switcher, theme, sign-in).
   keksdose and kastlan draw it with the kit's `PublicHeader` (landing-demo §4.1);
   Kurvenschmiede passes its `AppTopBar`, rendered without the shell.
2. **The column**: the kit's `LegalLayout` with:
   - the back link `← Back to home`, pointing to `/`;
   - the title;
   - the as-of line, "Last updated: 29 October 2026" (decision 10);
   - the translation note, on a page read in another language than the binding one
     (decision 9);
   - the notice;
   - the app's summary, if it has one (decision 11);
   - the sections.
3. **The public footer**: the three links with `·` separators.

Signed-in users see the same frame: the legal pages are never drawn inside the app shell.
The back link's `/` is the landing for a signed-out visitor and takes a signed-in user
back into the app (landing-demo §3.1).

**Notice** (a warning `AlertBanner` with `role="note"`):
- The imprint and the terms carry the kit's **beta notice** (§4.3), Kurvenschmiede's "not
  reviewed by a lawyer yet". keksdose's "provided in good faith and is not legal advice"
  is not used: it fits a page of information, and the terms are the agreement itself.
- The privacy page carries the kit's **privacy notice**. It is keksdose's
  `privacy_banner`, with the keksdose-only phrase "what leaves your household" replaced by
  Kurvenschmiede's "what is stored, where, and who can read it" (§4.3).

An app may still pass its own notice (`LegalPage`'s `notice`; `null` for none).

**As-of line** (decision 10): `LegalPage`'s `updated`, the day the page's text last
changed as `"YYYY-MM-DD"`, shown as `legal.updated` with the date written out in the
page's locale (`dateStyle: "long"`): "Last updated: 29 October 2026", "Stand: 29. Oktober
2026". It follows the language like every other kit word, so the switch to the binding
version shows the binding version's date line. One date per page; left out, no line. A
malformed date shows no line rather than a rolled-over one.

**Summary** (decision 11): `LegalPage`'s `summary`, the app's three to six points, drawn
before the first section as a list under `legal.summary.title` ("In short", "Das
Wichtigste in Kürze"), with `legal.summary.note` under it: "This summary is for
orientation; only the full text is binding." The note says "the full text", not "the
text below": on a translated page the text below is a translation, and the binding one is
the version in the binding language. A string point resolves `{ref:key}` like a section's
text. The summary is unnumbered (id `summary`) and the sections' numbers do not count it.

**Translation note** (decision 9): when the operator names a `bindingLanguage` and the
page is read in another language, a line under the title says the binding version
prevails (`legal.translation.note`). With `onShowBindingLanguage`, `LegalPage` adds a
button after it that switches to the binding version (`legal.translation.show`). Only
the language subtag counts: `de-CH` and `de` are the same language.

**noindex**: the kit's `useNoIndex()` on the legal pages and on every auth page, as
keksdose does (feedback #97, #129). Each app's web server also sends
`X-Robots-Tag: noindex` for the three legal routes, as keksdose's Caddy does.

**robots.txt and sitemap.xml** (keksdose's practice, from Kurvenschmiede; the landing
and demo round amends both, landing-demo §4.3): every app serves real files, never the
SPA shell as `text/html`.

- **`robots.txt`** disallows only token links (reset, verification, invitation),
  `/api/`, and the demo's start (`Disallow: /demo$` and `Disallow: /demo?`, because
  rendering `/demo` creates a user). It never disallows the noindex legal pages: a
  `Disallow` keeps a crawler from ever reading their `X-Robots-Tag`. It never disallows
  signed-in routes either; their noindex and sign-in redirect do that job.
- **`sitemap.xml`** lists only the public, indexable pages, with no `lastmod`. Every app
  has an indexable landing at `/` since the landing round (kastlan's included), so every
  app lists at least `/`. An app with **no** indexable page would serve none:
  `/sitemap.xml` a plain 404, never the SPA shell. A sitemap listing noindex pages would
  contradict their header.

Each app writes its own, since they name its domain, its public pages and its token
routes. The kit ships nothing for it.

### 3.3 Where the links appear

| Place | Who sees it | Part |
|---|---|---|
| Public footer: landing/home, **every** signed-out page the app has, the legal pages and the 404. Every app has the full set (§7.9): sign-in, register, forgot password, reset password, verify email (Kurvenschmiede's scope settled in its own session) and a 404 | signed out (and signed in on those pages) | `LegalFooter` |
| Account menu footer | signed in, every viewport | `LegalLinks nav={false}` in `TopBarActionMenu`'s `footer` (with its `footerLabel`), or in a plain container (KS's `HoverMenu`) |
| Sidebar footer | optional; keksdose and kastlan keep theirs | kit labels, no own words |

On a page drawn with the kit's `AuthLayout`, the footer slot is a `<footer>` already, so
the links go there as `<LegalLinks nav={false} />` with `footerLabel` set to the kit's
`navLabel`, not as a `LegalFooter` (kastlan's adoption; 0.28.1). A `LegalFooter` inside
another footer takes `landmark={false}` and draws a `<div>`.

The rule behind the table: **from every page a signed-out visitor can reach, the three
links are one click away.** That includes Kurvenschmiede's public `/control` and
`/steering`.

The labels are always the kit's short link labels (`legal.links.*`, §4.4), in the order
Imprint · Privacy Policy · Terms, with `·` separators (`aria-hidden`). An app with a
security page or an accessibility statement (decision 11) passes their routes,
`securityHref` and `accessibilityHref`, to `LegalLinks` / `LegalFooter` / `PublicFooter`.
The row then goes on with Security · Accessibility, in the kit's words, each only where
its route is given. This applies in the
account menu too, so keksdose's menu gains the dots. The current page is marked
`aria-current="page"` wherever the router's path is known.

### 3.4 Terms acceptance

The register page shows a **required checkbox** labelled "I accept the [Terms of Service]
and the [Privacy Policy]", with the page titles as links. Submit stays disabled while it
is unticked; it is never an error message. Nothing is sent to the backend. This is
keksdose's `register-page.tsx` behaviour, now the kit's `LegalAcceptCheckbox`.

keksdose (decision 10) also records which terms were accepted: with the registration it
sends the terms page's `updated` date, which its backend stores with the time. That is
the app's own request and column; the checkbox itself still sends nothing.

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
| `disclaimer` | kit | two texts under one title: by default "private, non-commercial project … closed beta, without warranty"; `variant="commercial"`, for an app that bills (decision 7), "a commercial service … the Merchant of Record" |
| *app sections* | app | keksdose's `credits` |

**Privacy Policy** (numbered):

| Key | Owner | Note |
|---|---|---|
| `controller` | kit | |
| `data` | app | |
| `legal_basis` | kit + app | the kit's FADP/GDPR paragraph names contract and legitimate interest only. **Consent is the app's**: an app that relies on it says so in its paragraph (keksdose's consent list); claiming it for every app would imply a withdrawal right with nothing behind it. Kurvenschmiede's paragraph: "no tracking, no analytics, no advertising" |
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
| `language` | kit | which language's version prevails: the operator's `bindingLanguage` (decision 9) |
| `law` | kit | the place of jurisdiction comes from the operator |

The same order is `LEGAL_SKELETON` (`src/components/legal-page.tsx`), where `"*"` marks the
app sections' slot.

### 4.3 The kit's wording (English canon)

The texts are keksdose's unless marked otherwise.
- de-CH, fr and it come from keksdose's catalogues.
- es, hu and zh come from Kurvenschmiede's, brought into line with the canon.
- `{…}` is filled in from the app's values: the operator (§5) or the browser list.
  `{country}` and `{bindingLanguage}` are named in the page's language ("Schweiz",
  "German").

- **Imprint**
  - **operator**, "Operator": `{name}\n{postalCode} {city}\n{country}\n\nThe full postal
    address is supplied on request to anyone with a legitimate legal interest; write to the
    contact address below.`
  - **contact**, "Contact": `Email: {email}`
  - **disclaimer**, "Liability for content and links": This is a private,
    non-commercial project offered during a closed beta, without warranty. External sites
    we link to are the responsibility of their respective operators; we have no control
    over their content.
    - **commercial** (`variant="commercial"`, the same title; decision 7): This is a
      commercial service. Paid plans are sold by our reseller, which acts as the Merchant
      of Record: it sells the subscription in its own name, takes the payment, issues the
      invoice and handles VAT, and its terms of sale apply to the purchase. We take care
      that the content of this service is accurate, but cannot guarantee that it is
      complete or up to date. External sites we link to are the responsibility of their
      respective operators; we have no control over their content.
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
  - **browser**, "What your browser stores" (Kurvenschmiede's section; every app keeps
    more than local storage — IndexedDB, Cache Storage, the crash reporter's buffer — so
    the text says "your browser's storage" and takes the app's entries as a list):
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
  - **changes**, "Changes to these terms" (decision 10): We may update these terms as the
    service evolves. We announce a material change at least 30 days before it takes effect,
    by email and in the app, together with the new text. If you do not agree, you can
    object or delete your account before that date, and you can export your data until
    then. If you keep using the service after that date, the changed terms apply. Changes
    that only benefit you, or that the law requires, apply without this notice and cannot
    be objected to. If you object to a change, we may end your account on the date it
    takes effect. If you have paid for a period that runs beyond that date, we refund the
    unused part. (The last three sentences: ui-kit 0.51.4, Marcel 2026-10-29.)
  - **language**, "Language" (decision 9): These terms are written in
    `{bindingLanguage}`. Translations into other languages are provided for convenience
    only; where a translation differs, the `{bindingLanguage}` version prevails.
  - **law**, "Governing law": These terms are governed by Swiss law, excluding its
    conflict-of-laws rules. As far as legally permissible, the place of jurisdiction is
    `{city} ({region})`, `{country}`.

**Notices:**
- **beta**: Closed beta. These texts have not been reviewed by a lawyer yet and will be
  before a public launch. (Kurvenschmiede's wording, §3.2.)
- **privacy**: Closed beta. The legal wording below has not been reviewed by a lawyer yet
  and will be before a public launch. The technical descriptions — what is stored, where,
  and who can read it — describe what the software actually does today, and are meant to
  be checked against it.

**Translation note** (decision 9; §3.2):
- **note**: This is a translation for your convenience. The `{bindingLanguage}` version
  is binding.
- **show**: Show the `{bindingLanguage}` version

### 4.4 The kit's labels

| Key | en | de-CH |
|---|---|---|
| `navLabel` | Legal | Rechtliches |
| `links.impressum` / `privacy` / `terms` | Imprint / Privacy Policy / Terms | Impressum / Datenschutz / Nutzungsbedingungen |
| `titles.impressum` / `privacy` / `terms` | Imprint / Privacy Policy / Terms of Service | Impressum / Datenschutzerklärung / Nutzungsbedingungen |
| `backHome` | Back to home | Zurück zur Startseite |
| `accept` | I accept the {terms} and the {privacy} | Ich akzeptiere die {terms} und die {privacy} |
| `updated` | Last updated: {date} | Stand: {date} |
| `summary.title` / `note` | In short / This summary is for orientation; only the full text is binding. | Das Wichtigste in Kürze / Diese Zusammenfassung dient der Orientierung; verbindlich ist allein der vollständige Text. |
| `links.security` / `accessibility` | Security / Accessibility | Sicherheit / Barrierefreiheit |
| `translation.note` / `show` | This is a translation for your convenience. The {bindingLanguage} version is binding. / Show the {bindingLanguage} version | Dies ist eine Übersetzung zu Ihrer Information. Massgebend ist die Fassung auf {bindingLanguage}. / Fassung auf {bindingLanguage} anzeigen |

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

**Kit 0.28.0** (main barrel, beside the 0.19 parts; 0.28.1 and 0.32.0 where marked):

- **The `legal` label namespace, extended, in all 7 languages**:
  - `links`, `titles`, `backHome`, `accept`;
  - `notice.beta`, `notice.privacy`;
  - `translation.note`, `translation.show` (0.28.1);
  - `sections.*`, the §4.3 texts as functions of the operator, with
    `sections.impressum.disclaimer.commercial` (0.32.0).
- **`LegalOperator`**: `{ name, postalCode, city, region, country, email,
  bindingLanguage? }`. `country` is an ISO code and `bindingLanguage` (0.28.1) a BCP 47
  code; the kit names both in the page's language (`legalOperatorText`). The kit holds
  **no personal data**: each app passes the same values once (kk, ka and KS: Marcel
  Eifert, 9470 Buchs, SG, CH, marcel.eifert@outlook.com).
- **`LegalPage`**: the §3.2 frame.
  - Props: `page` (`"impressum" | "privacy" | "terms"`), `operator`, `header`, `footer`
    (default `<LegalFooter />` with the page marked; `null` for none), `homeHref`
    (default `/`), `notice` (default per page; `null` for none), and from 0.28.1
    `onShowBindingLanguage`, `locale`, `headingAs` (`h2` for a preview), `landmark`,
    `noIndex`.
  - It sets the title from `titles`, numbers the sections where §4.1 says so, resolves
    `{ref:key}` tokens in the bodies (§4.1), shows the translation note (§3.2), and calls
    `useNoIndex()`.
- **Kit sections**: `LegalKitSection` renders a §4.3 section by key, with its id and
  number (`<LegalKitSection section="warranty" />`). It takes `children` for the app
  paragraph where §4.2 says kit + app, and only there (the type holds an app to it). For
  the browser section it takes `entries` as a list of strings, rendered as a `<ul>`. The
  disclaimer takes `variant`: `"non-commercial"` (default) or `"commercial"` (0.32.0).
- **`LegalSection`** gains automatic numbering inside a `LegalPage`, its key as id, and
  `{ref:key}` resolution. Its API stays the same otherwise.
- **`LegalLinks`**:
  - `links` is optional; the default is the three routes (`LEGAL_HREFS`) with the kit's
    link labels.
  - `·` separators.
  - `nav={false}` keeps the row (0.27.1).
  - `onLinkClick`, called before a link navigates, so an account menu can close (0.28.1).
- **`LegalFooter`**: keksdose's `SiteFooter`, a centred `<nav aria-label>` with the three
  links and their separators. `children` sit under the links, for a tagline.
  `landmark={false}` draws a `<div>` instead of a `<footer>` (0.28.1).
- **`LegalAcceptCheckbox`**: the §3.4 checkbox, with `checked`, `onCheckedChange` and
  optional hrefs.
- **`useNoIndex()`**: keksdose's hook, which removes its `<meta>` on unmount.
- **`LEGAL_SKELETON`**: the §4.2 order as data, so an app test can assert that its pages
  follow it.
- **Review** (§7.5): `kit.legal.*` is in the `legal` area everywhere, so a reviewer
  granted `["legal"]` sees and may judge the kit's legal text too.
  - The default `keyInArea` also matches `kit.<area>.`, since all three apps flatten
    the kit's labels under `kit.`.
  - `reviewAreaOf(key, areas, inArea?)` gives the app's translation page the same rule
    for its grouping: `kit.legal.*` → `legal`.
  - `kitLabelStrings` covers the new keys and takes an optional operator, so a
    reviewer reads the real sentence.
- **Docs**: a showcase page (all three pages, phone and desktop) and `docs/archive/adopt/adopt-0.28.md`.
  The adopt guide includes the review-area lines for each app's server and page.

**server-kit 0.2.1** (a patch):
- `translation_review.in_areas` matches `kit.<area>.` as well, the same rule as the
  kit's `keyInArea`, for reading and for verdicts. An app with its own copy of
  `in_areas` makes the same one-line change.
- From 0.3.0, `area_like_patterns(areas)` gives the same rule as SQL `LIKE` patterns, for
  a listing that filters by area in the query.

**App-side**:
- the routes;
- the public header;
- the app sections and the app paragraphs;
- the browser list (what this app really keeps), in every language it serves;
- the operator values, `bindingLanguage` included;
- the web server's `X-Robots-Tag`, `robots.txt` and `sitemap.xml` (§3.2);
- the review-area mapping on its server and translation page;
- in the release that turns its billing on: the commercial disclaimer, and the Merchant
  of Record in its terms and privacy policy (decision 7).

## 6. Per repo

Moved to [archive/legal-history.md](archive/legal-history.md): the 0.28 round's per-repo
to-dos for the kit and the three apps, all adopted.

## 7. Settled after the reviews (2026-10-05)

The reviews' items keep their numbers, which the code cites. An item that amended a
section above is folded into it and points there; an item that is a rule of its own
stands here. The reviews' wording is in [archive/legal-history.md](archive/legal-history.md).

1. **No cookies** → §4.3 (`browser`).
2. **Browser storage is more than local storage** → §4.2, §4.3 (`browser` is kit + app,
   the app's entries a list).
3. **Consent and the beta notice** → §3.2 (the notice), §4.2 (`legal_basis`), §4.3.
4. **Cross-references** (`{ref:key}`) → §4.1.
5. **Review areas** (`kit.legal.*` in `legal`) → §5, Review and server-kit.
6. **Signed-out pages** → §3.3.
7. **Facts the reviews corrected** → archive.
8. **"Non-commercial" until an app bills; Kurvenschmiede a closed beta** → §2, decisions 7
   and 8.
9. **Every app gets the full set of signed-out pages** → §3.3; the shared pages and the
   reset-token rules are the sign-in round's (auth §7).
