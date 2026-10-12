# The legal pages across the kit and the three apps — history

What [the legal contract](../legal-harmonization.md) moved out of its body in ui-kit 0.34
(refactor audit DOC-1): its snapshot of the three apps, the 0.28 round's per-repo to-dos
and the reviews' list. Kept as written: "today", line numbers and each app's state are as
of the day each part was written, and an item may since have been folded into the
contract, which wins. Section numbers are the contract's.

## Status as written

Status: **2026-10-05**, led from ui-kit at Marcel's request. Built from a read-only audit
of the three apps' working trees (keksdose `chore/vscode-workspace`, kastlan
`feat/feedback-harmonization`, Kurvenschmiede `chore/workspace-server-kit`). Marcel's
decisions are in §2, the three apps' reviews and what they settled in §7 (all
answered the same day). It follows the pattern of the feedback round
([feedback-harmonization.md](../feedback-harmonization.md)): **one contract + kit parts**.
**keksdose is the reference**; the kit owns every word that is the same in all three apps
and every part that three apps were building separately; each app keeps the sections
that describe what only it does.

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

## 6. Per repo

**ui-kit** (first, one minor release, 0.28.0):
1. Labels and all 7 catalogues (§4.3, §4.4). es, hu and zh are seeded from
   Kurvenschmiede's texts and go back to it for review.
2. `LegalOperator`, `LegalPage`, `LegalKitSection`, numbering, ids, `{ref:key}`,
   `LEGAL_SKELETON`.
3. `LegalLinks` default links and separators, `LegalFooter`, `LegalAcceptCheckbox`,
   `useNoIndex`.
4. `keyInArea` + `reviewAreaOf`, `kitLabelStrings` with an operator, the showcase,
   `docs/archive/adopt/adopt-0.28.md`.

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

## 7. Settled after the reviews (2026-10-05) — as written

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
