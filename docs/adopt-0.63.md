# Adopting `@eifi1/ui-kit` 0.63

ui-kit 0.63 makes the apps' outgoing credits count: an `external` link can keep the referrer
(`referrer`), and the imprint's credits for the kit's chart palette are the kit's own section,
in seven languages (Marcel, 2026-11-13: "Links sind wichtig für Bekanntheit").

**From 0.62, nothing else first.**

**Legal wording:** Impressum (only apps that add the credits section). An app that replaces its
own `credits` section with `<LegalKitSection section="credits" />` moves its /impressum
`updated` date to the day it ships that. An app that keeps its own section changes nothing.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the four apps. `LegalKitSectionKey` gains `"credits"`: code that
handles every key of it exhaustively (a `switch` with a `never` default, a `Record` over it) adds
the case. No app names the type.

**New words** (all seven catalogues, from Staunlabor's reviewed `legal.impressum.credits`, "and
drawings" dropped): `legal.sections.impressum.credits.title` and `.body`. The body is a template
with `{palette}` and `{site}`; the translation review flags a translation that drops one.

## External links that count for the site they name (`referrer`)

**What changed.** Every kit part with `external` takes an opt-in `referrer`:

- `TextLink`;
- `Button` and `IconButton` with `href`;
- `ListItem`'s link rows;
- `AppShell`'s `sidebarFooterItems`: a single link, and each link of a `links` group.

With it, the link is `rel="noopener"` alone, so the target site sees where its visitors came
from. There is no `nofollow` either way. `noopener` stays: the new tab cannot reach back into
the app. The external-link mark and "opens in a new tab" stay too.

Without `referrer` nothing changes: `rel="noopener noreferrer"`. Button's and IconButton's own
`rel` still wins over the kit's. TextLink's and ListItem's `external` still set the `rel`
themselves, which is why `referrer` exists. `referrer` without `external` does nothing.

Use it for a link the app vouches for: a credit, a recommendation. Not for a URL a user wrote.
The kit's own user-written links (feedback attachments, the lightbox's "open") keep
`noreferrer`.

**Why.** Kurvenschmiede and Staunlabor wanted their imprint's anyplot.ai links to count for
anyplot.ai, so they left `external` for `target="_blank" rel="noopener"` by hand. That lost the
mark and the screen reader's "opens in a new tab".

**What apps do.** Every app's `credits.tsx` draws its links as `<TextLink target="_blank"
rel="noopener">`:

- keksdose `frontend/src/features/legal/credits.tsx:17`;
- kastlan `frontend/src/features/legal/credits.tsx:16`;
- Kurvenschmiede `frontend/src/features/legal/credits.tsx:17`;
- Staunlabor `frontend/src/features/site/credits.tsx:17`.

The simplest step is the next section: the kit's `credits` section replaces the whole file. An
app that keeps its own credits writes `<TextLink href={href} external referrer>` instead. Its
links then get the mark and the announcement, and the rel stays `noopener`.

**Tests:** `src/components/__tests__/external-referrer.test.tsx`: each of the five parts with
and without `referrer`, Button's own `rel`, the footer links expanded and collapsed. An app test
that reads a credit link's `rel` keeps `"noopener"`. One that reads its accessible name now hears
"(opens in a new tab)" after it.

## Credits on the imprint (`<LegalKitSection section="credits" />`)

**What changed.** The kit's default chart palette is anyplot.ai's categorical palette "Imprint".
Every app credited it in an imprint section of its own, with its own words and two hand-made
links. The kit now writes that section.

- `<LegalKitSection section="credits" />`, on the imprint. English:

  > The colours in the charts come from “Imprint”, the categorical palette of anyplot.ai. Its
  > eight hues were validated by anyplot.ai against deuteranopia, protanopia and tritanopia and
  > tuned for warm paper.

  "Imprint" links to https://anyplot.ai/palette and "anyplot.ai" to https://anyplot.ai. Both
  are `external` TextLinks with `referrer`. Each language places the links where its grammar
  wants them (Hungarian and Chinese name the site first).
- The wording is Staunlabor's reviewed `legal.impressum.credits`, in all seven languages, with
  "and drawings" dropped: not every app draws. keksdose's own text says "the data series in
  the charts", so its sentence changes slightly.
- **Optional.** An app that does not colour its charts from the kit's palette leaves the section
  out. `LEGAL_SKELETON.impressum` ends with `{ key: "credits", owner: "kit", optional: true }`,
  after the app's own sections (`"*"`). That is where all four apps have it today.
- The labels: `legal.sections.impressum.credits` (`title`, `body`), an optional key of
  `LegalLabels`. An app's own full `legal` tree without it gets the kit's English.

**What apps do** (each optional, and each moves its /impressum `updated` date when it ships):

- **keksdose:** in `frontend/src/features/legal/impressum-page.tsx:16` replace
  `<LegalSection key="credits" …><CreditsText /></LegalSection>` with
  `<LegalKitSection section="credits" />`. Then delete `features/legal/credits.tsx` and the
  `legal.impressum.credits` keys in the four catalogues. The id stays `credits`.
- **kastlan:** the same in `frontend/src/features/legal/impressum-page.tsx:25`, then
  `features/legal/credits.tsx` and the `impressum.credits` keys of the `legal` namespace go. The
  test "credits the chart palette with two links that count for anyplot.ai"
  (`legal-pages.test.tsx`) reads `#credits`, still there; its link names gain "(opens in a new
  tab)".
- **Kurvenschmiede:** the same in `frontend/src/features/legal/legal-pages.tsx:112`; then
  `features/legal/credits.tsx` and `legal.impressum.credits` in its seven catalogues go.
- **Staunlabor:** the same in `frontend/src/features/site/legal-pages.tsx:39`; then
  `features/site/credits.tsx` and `legal.impressum.credits` go.
- **The skeleton tests** (`LEGAL_SKELETON[page].sections.map((s) => s.key).filter((k) => k !==
  "*")`, in keksdose, kastlan and Kurvenschmiede) still pass: every app has a `credits`
  section, its own or the kit's, last. An app that drops credits altogether filters
  `!s.optional` too.

**Tests:** `src/components/__tests__/legal-page.credits.test.tsx`: the skeleton entry, the links
and their `rel`, the English sentence, every catalogue's link order, a page without it, an app's
legal tree without the key. `legal-wording.test.ts` has the new `impressum` fingerprints in all
seven catalogues; `review.test.ts` has the sentence among the review rows.

## `@eifi1/ui-kit/offline` without `idb-keyval` and the persister

**What changed.** The `/offline` entry imported `idb-keyval` and
`@tanstack/query-async-storage-persister` when it loaded, through `createQueryPersistence`'s
module. The exports map allows no deep import, so an app that took only `SharedComputerChoice`,
`useSharedComputerIdleSignOut` or `useFeedbackCommentsQuery` from it still had to install both.

`createQueryPersistence` now imports them on first use: the persister on the first save,
restore or delete, `idb-keyval` on the first read or write of the default store (and
`removeStaleQueryCopies` on its first sweep). The entry loads with `@tanstack/react-query`
alone. The public API is unchanged:

- `persistOptions.persister` is still a `Persister`;
- it is still throttled by `throttleTime`;
- `clear`, `leave` and `removeStale` behave as before.

A failed load (a chunk that did not arrive) fails that one call, as a failed IndexedDB call did,
and the next call tries again. The kit's `toast` loads `sonner` the same way.

The peers stay optional peers, all four. Each is now needed only for what it serves:

- `@tanstack/react-query`: the entry itself;
- `@tanstack/react-query-persist-client`: the app's own `<PersistQueryClientProvider>`;
- `@tanstack/query-async-storage-persister`: the persisted cache;
- `idb-keyval`: the persisted cache's default store.

**What apps do.** Nothing. keksdose, kastlan and Kurvenschmiede persist their cache and keep all
four installed. In a production build, the persister and `idb-keyval` become chunks of their own,
fetched when the cache is first restored at start. An app that precaches its build's chunks in
its service worker (all three) has them offline too. Staunlabor does not use `/offline`.

**Tests:** `src/offline/__tests__/query-persistence-lazy.test.ts`:

- importing the entry and creating a persistence loads neither (each mock counts its own
  evaluation);
- a save, a restore and a `clear` through IndexedDB load each once;
- the sweep reads the same lazy store.

`packaging-contract.test.ts` "idb-keyval and the persister are imported on first use, not when the
entry loads" walks the entry's static imports. `scripts/verify-package.mjs` loads the installed
`/offline` with `@tanstack/react-query` alone, before it installs the other optional peers.

## `TranslationReviewPanel` takes `storage`

**What changed.** `TranslationReviewPanel` keeps one thing: its table view, under `storageKey`.
That is the sort, the page size and the single table's filters, widths and hidden columns, or
the groups' one view under `groupBy`. Since 0.62 it went to the provider's `tableStorage`, else
`localStorage`. The panel now takes `storage?: Storage` as `DataTable` does: where the view is
kept, for the single table and for the groups alike. The prop wins over the provider's. Left
out, nothing changes. Nothing else the panel holds is stored: the open editor and the folded
groups live as long as the panel.

**What apps do.** Nothing. An app that set `<UiKitProvider tableStorage>` for its shared-computer
session (0.62) already reaches the panel: keksdose
`frontend/src/features/translations/translations-page.tsx:271`. `storage` is for a panel that
should keep its view somewhere other than the app's other tables.

**Tests:** `src/components/__tests__/translation-review.groups.test.tsx` "storage (0.63)": the
groups read and write their view in the given `Storage`, over the provider's, and the ungrouped
table keeps its own there under the app's prefix. Neither writes to `localStorage`.
