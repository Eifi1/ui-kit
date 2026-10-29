# Contributing to `@eifi1/ui-kit`

Three applications build against this package, so a change here is a change in three
products at once. That is the whole reason for the rules below: none of them is taste, and
each one exists because something already went wrong without it.

Nothing here is a code-review preference you can argue with in a PR — every rule has a
gate, and the gate is what actually enforces it. If a rule has no gate yet, that is a bug
in this document.

## Getting set up

```bash
nvm use            # 24.19.0 — see .nvmrc
npm ci
npm run check      # everything CI runs — see "The gates"
```

**Local first.** `npm run check` is the whole of CI in one command, and it runs on your
machine BEFORE anything leaves it: the husky `pre-push` hook calls it, and a failure blocks
the push. CI calls the same script and only confirms. Work stays local until it is done and
goes out in one batch — every push, PR update and tag starts paid GitHub Actions minutes.

**Node 24, not 20**, and not by preference. jsdom 30 pulls undici, which calls
`webidl.util.markAsUncloneable` — added to Node in 20.18. On plain 20 every test file dies
before it runs with "Failed to start forks worker" and a `TypeError` from inside
`CacheStorage`, naming neither jsdom nor the Node version. It is also what all three apps
build with (their `.nvmrc` pins the same 24.19.0).

## Repo layout

```
src/
  index.ts            the main barrel — everything public passes through here
  chart.ts  shell.ts  data-table.ts  wizard.ts  tour.ts  feedback.ts  search.ts
  table-text.ts  rhf.ts
                      subpath barrels: a re-slicing of index.ts, never a second API
  lib/                pure TypeScript. No React, no DOM. calc, dates, cn, logger
  hooks/              React hooks with no markup of their own
  theme/              tokens, palette presets, colour maths, the appearance stores
                      (theme, palette, text size, contrast)
  components/         domain-free rendering components
  shell/              app frame: TopBar, AppShell, the topbar controls
  feedback/ wizard/ tour/ search/    feature areas with their own subpath
  i18n/               UiKitProvider, the label tree, the language registry; locales/ holds
                      the seven catalogues (one subpath each: @eifi1/ui-kit/i18n/<code>)
  auth/ account/ admin/ settings/ billing/ landing/ demo/
                      the harmonised app areas, one per contract in docs/: sign-in,
                      the account's own settings, user admin, the settings page, plans,
                      the public landing page, the demo
  rhf/                the react-hook-form adapter (@eifi1/ui-kit/rhf, optional peer)
  testing/            helpers for the apps' own tests (@eifi1/ui-kit/testing)
  test/               the vitest harness (setup only)
  __tests__/          cross-cutting tests; every other directory has its own
showcase/             a routed Vite site rendering the whole kit, page by page
scripts/              the gates, plus the README generators (exports, styling)
tokens.css            the design tokens and role utilities, shipped to npm as-is
docs/                 the contracts, the adoption notes, audits and plans (index: docs/README.md)
```

The `exports` map: the main barrel; eleven subpaths — `/chart`, `/shell`, `/data-table`,
`/wizard`, `/tour`, `/feedback`, `/search`, `/dates` (`lib/dates.ts`), `/table-text`,
`/testing`, `/rhf`; `/i18n/<code>` for each of the seven catalogues; and `/tokens.css`.

**Where a new module goes** follows from what it needs, in this order:

| It is… | It goes in | And it must not |
|---|---|---|
| arithmetic, parsing, formatting, dates | `lib/` | import React |
| stateful behaviour with no markup | `hooks/` | render anything |
| a colour, a token, a preset, a store | `theme/` | know about a component |
| something that renders and has no domain knowledge | `components/` | mention leases, invoices, tenants, or any consumer's vocabulary |
| part of an existing feature area | that area | grow a second public surface |

A new **feature area** (its own directory *and* its own subpath barrel) has to earn it.
The bar is the one `src/chart.ts` records: `import("@eifi1/ui-kit/chart")` is a 31 KB
chunk where the same lazy import through the main barrel pulls 221 KB, because a dynamic
import of the barrel cannot be tree-shaken down to one of its members. If your area does
not have a number like that behind it, put it in `components/` and export it from the main
barrel.

**Domain-free is the hard line.** If a component needs to know what a lease is, it belongs
in the app, not here. The honest test: could all three consumers use it without explaining
their business to each other?

## The barrel, and the test that pins it

Everything public is exported from `src/index.ts`. A module that is not reachable from the
barrel is not part of the package, whatever it exports.

`src/__tests__/public-surface.test.ts` pins the exported **names** and their **count**, per
entry point. The three apps pin a `^0.x` range, so a name leaving that list is a breaking
change for all of them and has to be a decision rather than a diff nobody read.

**If you add a barrel export, update the count in the same change.** The failure message
prints the full sorted list, so the diff tells you exactly which names moved. The same test
also asserts that no two star-exports collide (silent in ESM: the later module wins and the
earlier name disappears) and that every subpath is a strict *subset* of the main barrel.

Then regenerate the README's export inventory, which is generated from the build and not
maintained by hand:

```bash
npm run build && node scripts/gen-export-inventory.mjs
```

`--check` exits non-zero and names every export the README does not mention; `check:build`
runs it, so a stale inventory fails `npm run check` and CI (since 0.34). The
hand-maintained version it replaced named 93 of 263 exports and had been advertising five
deleted wizard exports since 0.4.0, on the npm landing page.

## House rules

### 1. The kit renders only labels

**The kit renders only labels; it ships seven catalogues; the app decides the language.**
Every user-facing string is a key of `UiKitLabels` with an English default, read through
`useKitLabels(namespace, DEFAULT_*, labels)`: the English default, overridden by the app's
`<UiKitProvider labels>` (a shipped catalogue or its own tree), overridden in turn by the
component's own `labels` prop. The kit never picks the language, detects a locale or
translates the app's own words.

**A new key goes into all seven catalogues in the same change** (`src/i18n/locales/*`;
German is written once, in `german.ts`, and respelled for `de-CH`). `locales.test.ts`
fails on a catalogue that misses a key or prints a count another one formats.

A component with more than a string or two takes one `labels` object with **every key
optional** (a `LabelOverride`, partial at every depth), merged over a `DEFAULT_*` constant
by `useKitLabels` — see `ChipInput` and `DEFAULT_CHIP_INPUT_LABELS` for the shape to copy.
No public `resolve*` helper beside it: the five there were removed in 0.35 (round 0.35 R1).
Optional keys matter: a caller passing three of eleven must get English for the other
eight, not `undefined` rendered into the DOM.

The `DEFAULT_*` constant lives in a `<component>-labels.ts` beside the component, with no
component code (type imports only); the component imports and re-exports it. That keeps
the English catalogue one chunk like the other languages (0.34);
`english-catalogue-graph.test.ts` and `check:graph` enforce it. The provider's own
namespaces live in `src/i18n/shared-labels.ts`.

**A label that interpolates a value is a function of that value, never a template
literal.** Word order, pluralisation and where the number lands are the translator's
business, and a string with a hole in it decides all three on their behalf:

```ts
atLimit: (max: number) => string;     // yes
atLimit: string;                      // no — you have just fixed the word order
```

This applies to `aria-label`, `title` and every other attribute a screen reader speaks. The
audit found six leaks, including a password-reveal toggle with a hardcoded `aria-label`.
`showcase/src/i18n/` runs the whole kit in seven locales and is the worked example.

### 2. Tokens, not palette colours

```bash
npm run check:tokens
```

Use the role utilities: `text-muted`, `bg-hover`, `text-danger`, `border-subtle`
(`tokens.css`'s `@theme inline` block lists them; colour roles §7). Not `text-slate-500`, not
`bg-indigo-600`, and not `text-[var(--text-muted)]` where a utility exists: since 0.34 the
ratchet in `check:tokens` allows none (`ROLE_BUDGET` 0). `[var(--…)]` stays only for a role
with no utility (money and chart colours, `--status-*`, ring offsets).

A consuming app re-skins this kit by changing token values. Every raw palette class is a
place where that fails and the app has to fork the component instead. The audit counted
815 hardcoded colour utilities against 85 token references; `--text-muted` and
`--text-secondary` had been added specifically to replace `text-slate-500` and had **zero**
component usages, while `text-slate-500` had 68.

The check is a **ratchet**: it fails when the count goes up. When you legitimately remove
some, lower `BUDGET` in `scripts/check-token-discipline.mjs` in the same commit — that is
what makes it a ratchet rather than a ceiling. The two survivors are both deliberate and
both carry a comment saying why.

### 3. `sr-only` needs a positioned ancestor — prefer `.sr-only-fixed`

Tailwind builds `sr-only` out of `position: absolute`. With no positioned ancestor the
element escapes to the initial containing block, and while it stays invisible,
`documentElement.scrollHeight` grows to reach it. Measured on the showcase: body 900px,
document **47,919px**, with a second whole-document scrollbar scrolling past the end of the
content into nothing.

`.sr-only-fixed` (in `tokens.css`) is `position: fixed`, so it is out of flow *and* out of
the document's scroll height and can be dropped anywhere. **Use it for anything the kit
renders inside consumer markup**, where there is no wrapper you can make `relative`.
`src/components/__tests__/sr-only-containment.test.tsx` enforces this.

### 4. Additive API only

Adding an optional prop is fine. Renaming or removing one is not, and neither is changing
what an existing prop means.

**A new component follows the kit's prop conventions**, so the next one does not decide
them again (refactor audit 2026-10, API-5). The checklist:

- [ ] **The value is `value` + `onChange(value)`** — the value itself, not an event. A
      component that extends an `<input>`'s attributes keeps the DOM `onChange` (the
      event) and adds `onValueChange(value)` beside it (TimeInput, IbanInput, PhoneInput).
- [ ] **Field values are controlled**: `value` and `onChange`, no `defaultValue`. Open or
      expanded state is dual: `open` / `defaultOpen` / `onOpenChange`.
- [ ] **Its words are one `labels` object**: `labels?: LabelOverride<XLabels>`, resolved
      with `useKitLabels("x", DEFAULT_X_LABELS, labels)` — a namespace in the provider,
      in all seven catalogues (rule 1). Not single chrome-string props (`closeLabel`,
      `clearLabel`, …).
- [ ] **`label` is the visible label, a `ReactNode`.** The accessible name of a control
      with no visible label is `aria-label`, a string — never a prop called `label`.
- [ ] **`className` goes on the root**, `inputClassName` (or `selectClassName`) on the
      control inside it.
- [ ] **Its props are exported** as `<Name>Props`, the type the component is called with
      (a union where it takes two shapes, like `ThemeSettingProps`).

Where the kit stands, so a reviewer knows which outliers are known (refactor audit
2026-10, API.md, API-5). They are renamed only additively — an alias beside the old
name, then rule 4's deprecation — when the component is touched anyway; a big-bang
rename costs the apps more than it returns.

| Convention | Majority | Known outliers |
|---|---|---|
| Selected value | `value` + `onChange(value)`: 40 components | Tabs `active`; NavPills `current` / `onSelect`; TileRadioGroup `checked` / `onSelect`; GroupedPicker `selected` / `onSelect(group, item)` (MultiSelect's `values` went in 0.35) |
| Change callback | Extends an `<input>`: DOM `onChange` kept, `onValueChange` added (TimeInput, IbanInput, PhoneInput, TypedConfirmField) | SearchField re-types `onChange` to a string; NumberField / IntegerField, PlanPicker and ChatComposer take `onValueChange` with no DOM `onChange` to keep |
| Kit strings | `labels`: 146 components | ~30 take single-string chrome props: `closeLabel` (Combobox, DialogFrame, FullBleedDialog, PickerSheet, FloatingPanel, the entity comboboxes), `clearLabel`, `todayLabel`, `dismissLabel`, `collapseLabel` / `expandLabel` (AppShell), `removeLabel` (Chip), `toggleLabel` (TreeRow) |
| `label` | The visible label, a `ReactNode` (Combobox, InlineEntityCombobox and ChipInput since 0.34) | `label` is the accessible name on ScrollArea and QrCode |
| Controlled vs uncontrolled | Field values controlled-only (40 / 40); open state dual (Disclosure, FloatingPanel, TreeView, ListItem) | — |
| Slot classNames | `className` on the root, `inputClassName` (32) / `selectClassName` (6) on the control | the `Rhf*` fields' `comboClassName` |

An export is **deprecated for one minor before removal**, then removed in the next minor:

- marked in TSDoc as `@deprecated 0.NN — <the replacement>; removed in 0.MM`;
- listed in the release's adopt doc (`docs/adopt-0.NN.md`);
- carried in the commit body as a `Deprecated: …` line. The generated changelog has no
  section for it, so the commit and the adopt doc are where it is listed.

`src/__tests__/deprecations.test.ts` reads the tags. It fails on a tag without that
schedule, and once package.json reaches the stated removal (or two minors past the
deprecation), so the release that should remove a name cannot ship with it. It also
prints the list, `Deprecated: …` lines ready for the adopt doc and the commit body
(refactor audit 2026-10, DOC-11).

### 5. Comment the *why*

In the voice of the surrounding code: the constraint, the trade-off, the incident, the
measurement. Never narrate what the next line obviously does.

```ts
// Hover moves AWAY from the page in both themes: darker on light, lighter on dark.
```

```ts
// Set l to the brand lightness minus 0.06.   ← no. The code already says this.
```

If a value is a number somebody measured, write the number down. Half the comments in this
package exist because the next reader would otherwise have re-derived them, or worse,
"simplified" them away.

## Tests

```bash
npm test                   # vitest run: the whole suite
npx vitest run <files>     # one area
npm run test:watch
npm run check              # every gate, as the pre-push hook and CI run it (see "The gates")
```

Vitest + jsdom, configured as a copy of the lead consumer's setup rather than a new
dialect, so a test can move between this package and an app unchanged. The suite pins
`TZ=Europe/Berlin`, which is load-bearing for `lib/dates.ts`: those helpers answer with the
LOCAL calendar day, and on a UTC runner a broken UTC implementation and a correct local one
agree — the regression test would pass against the bug.

Tests live in `__tests__/` beside the code they cover.

### Failing-first is the rule, not the ideal

**A regression test is run against the old code and observed to fail there.** A test
written after the fix proves only that the fix is self-consistent with itself; it does not
prove it would have caught the bug. Stash the fix, run the test, watch it fail, read the
failure message and check it describes the actual defect — then unstash.

Say so in the commit message: which test, and what it printed against the unfixed code.

Where a new test earns the most is still `lib/`, `theme/` and the data-table's pure
helpers: highest return per line, no DOM needed.

## Formatting: Prettier

```bash
npm run format        # prettier --write .
npm run format:check  # prettier --check . — first in check:static, so CI runs it too
```

`.prettierrc.json` sets `printWidth` 120 and leaves the rest at Prettier's defaults, the
same file as in keksdose, kastlan and Kurvenschmiede (Marcel, 2026-10-29). Markdown is
left alone (`.prettierignore`): the docs are prose wrapped by hand, and the README's
inventories and the changelog are generated. The one-time reformat is in
`.git-blame-ignore-revs`; `git config blame.ignoreRevsFile .git-blame-ignore-revs` makes
`git blame` skip it.

Two things to know. Prettier 3.9 does not always settle in one pass (a long member chain
can change again), so run `format:check` after `format`. And a `@ts-expect-error` goes
directly above the line TypeScript reports, which after a reformat is the JSX element's
opening line, inside its parentheses, not above the `const`.

## Lint: zero warnings

```bash
npm run lint   # eslint . --max-warnings 0
```

Two rule families are the reason `eslint.config.js` exists rather than taste:
`react-hooks/*`, because the audit found stale-closure and effect-cleanup defects `tsc`
cannot see, and `jsx-a11y/*`, because the kit ships its interactive components to three
apps, where one accessibility regression multiplies by three.

**Every rule is an error, and a warning fails the build.** Until 0.12 the config was a
ratchet: rules with a backlog were `warn` and carried a count. The last 85 warnings were
cleared before 0.13, so every rule is now `error`, including the React Compiler rules
(`refs`, `preserve-manual-memoization`, `set-state-in-effect`, `immutability`). If a
preset update brings a new rule with a backlog, it fails `--max-warnings 0` straight away.
Fix the backlog, or record it as `warn` with its count in the config and clear it before
the next release.

There were once seven inert `eslint-disable` comments in `src/`, fossils of the origin
repository's config, suppressing rules nothing was running. Do not add a disable comment
without a sentence saying why the rule is wrong *here*.

## The showcase

```bash
npm run dev:showcase        # http://localhost:4170
npm run build:showcase      # the static site Pages deploys; `preview:showcase` serves it on :4171
```

The kit rendered page by page: about seventy pages in ten sidebar groups (Getting started,
Foundations, Inputs … App chrome, API, Server kit), one component family per page, with the
theme, palette, text-size, contrast and language switchers live. It renders **`src/`, not
`dist/`** — no build step first, and an edit is on screen on save. It deploys to
<https://eifi1.github.io/ui-kit/> after every green CI run on `main`.

The ports are harmonised with the apps rather than left on Vite's default, so the showcase
runs next to whatever you are testing it against. `strictPort` is on: a collision fails
loudly instead of printing a URL that is not the one documented here;
`SHOWCASE_PORT=4199 npm run dev:showcase` for a throwaway instance.

| Port | What |
|---|---|
| **4170** | **this showcase** (`dev:showcase`) |
| **4171** | this showcase, built (`preview:showcase`) |
| 4173 | keksdose frontend (backend 8000) |
| 4175 | Kurvenschmiede frontend (backend 8001) |
| 5173 | kastlan frontend (Vite's default) |

```
showcase/
  index.html
  vite.config.ts        # root; aliases @eifi1/ui-kit → ../src
  alias.ts              # that alias, shared with the root vitest.config.ts
  src/
    main.tsx            # the pre-hydration no-flash boot, as a worked example
    app.css             # tailwind + tokens.css + the @source scan
    stores.ts           # the appearance stores, under showcase keys
    showcase.tsx        # the AppShell frame, the top-bar switchers, the page frame
    routes.tsx          # the registry: GROUPS, each with its pages → PAGES
    sections/*.tsx      # the sections the pages render, each loaded lazily
    i18n/               # seven dictionaries: the chrome, plus the shipped kit catalogues
    search/             # the ⌘K index, generated by scripts/gen-showcase-search-index.mjs
    server-kit/         # the Server kit group, rendered from server-kit's api.json
```

`routes.tsx` is the registry. Each page has a `slug`, a `title`, a `components[]` list (the
group overview and the search's component results read it) and a `Body` that renders its
sections, each a `lazySection` fetched as its own chunk. A page holds one component family,
about a dozen specimens, and a group about ten pages; the comment above `GROUPS` says why.
A split page leaves its old slug in `RETIRED_SLUGS`.
A release adds to the component's family file, not a new version file: no new `*-0NN-demo.tsx` (`demo-files.test.ts` lets their count only fall). A specimen and its notes describe current behaviour only — no "Since 0.NN.", no "before 0.x" or "went from": the history goes in the commit message, so in the CHANGELOG. The showcase names no app and no app's issue number either; only the Overview lists the consumers.

**Adding a component to the kit means adding it to a page:** a section on its family's page,
and its name in that page's `components[]`. That is the only thing keeping the showcase
true, and it is also the broadest test the package has:
- `showcase/src/__tests__/component-index.test.ts` fails when an exported component is on
  no page's `components[]` (or on `NOT_ON_A_PAGE` with a reason), or a listed name is not an
  export;
- `showcase/src/__tests__/pages-shard-1…4.test.tsx` mount every page once under jsdom
  (`page-shard.tsx`), so a section that throws on mount fails CI, and each page's rendered
  `h3` anchors must equal the search index;
- `tsc` covers the showcase, so an export renamed out of the barrel is a compile error
  rather than a demo that quietly disappears;
- `build:showcase` (in `check:build`) is the only place the kit is rendered outside jsdom,
  and `check:tailwind` asserts the built CSS contains the kit's utility classes — the only
  automated check that the documented Tailwind `@source` step works.

Pure helpers get an input → output table rather than a rendered widget. They are a third of
the public surface, and a page that only rendered components would omit them entirely.

Storybook was considered and rejected for this repo: some three hundred component exports
would mean hundreds of story files, plus a second bundler in CI and an upgrade treadmill,
for one maintainer. Revisit it if a second maintainer appears.

## The gates

`npm run check` runs these in three groups, one after another (`scripts/check.mjs`), and
every one blocks:

- `check:static`: typecheck · lint · check:tokens · check:security · check:commit-rules · check:commits
- `check:build`: build · check:graph · check:package · the export and styling inventories (`--check`) · build:showcase · check:tailwind
- `check:test`: test:coverage

**Serial, and it stops at the first failing group** (since 0.34, TST-1), naming the groups it
did not run: static takes ~20 s, build ~1 min, test ~4 min, so a type error is reported in
seconds. Side by side was the default until then, and on this 15 GB machine shared with three
apps' sessions it was the one mode that failed: the 0.33.1 push ran 30 minutes, lost its
build to the OOM killer and timed out 25 tests, while the serial runs that day passed in 6 to
10 minutes. `CHECK_PARALLEL=1 npm run check` runs the three side by side on a machine with the
memory for it; `CHECK_SERIAL`, the old opt-in, is still accepted and changes nothing. The
test group runs on at most 6 vitest workers here (169 s at 4.7 GB, against 160 s at 5.1 GB
with the default 7); set `VITEST_MAX_WORKERS` to choose.

The husky `pre-push` hook runs it, with two exceptions (TST-2). A push of **only tags or
deletes** checks nothing: a release tag sits on a merge commit whose tree the branch push
checked and CI tested, and `release.yml` will not stage a commit whose CI is red. And a green
`npm run check` on a clean tree (nothing modified, nothing untracked) stamps that tree in
`node_modules/.cache/check/`; pushing a tree that already passed (a reworded commit, a
re-push) checks only the messages of every commit the push sends, with the shared
`scripts/check-pushed-commits.cjs` (0.46, as server-kit's hook). The check runs on the **working
tree**, not the pushed commits, so the hook warns when tracked files are modified, or when a
pushed commit is not the checked-out one.

CI (`.github/workflows/ci.yml`) runs the SAME three scripts as three parallel jobs on every
pull request and push to `main`, with nothing inline and nothing `continue-on-error`, so the
two cannot drift. Lint, typecheck and the declaration build keep caches in
`node_modules/.cache`, so a repeat run only rechecks what changed; CI always starts cold.

**One gate runs in CI first: the truncation sweep** (`npm run check:sweep`; text-size
§10.17–§10.22). It drives Chromium over every showcase page at four text sizes and fails on a
TRUNCATED or PINNED finding (`--gate-truncation`) or an overflow. It gates a release, so CI's
`Truncation sweep (release)` job runs it only on a release PR: a PR into `main` that changes
`package.json`'s version. That keeps Chromium off the shared machine (refactor plan 2026-10,
decision 2). It is not in `npm run check`, the pre-push hook or `npm run release`. To run it
by hand:

1. Once per machine, and after a `playwright-core` bump:
   `npx playwright-core install chromium-headless-shell`. That is the browser the pinned
   `playwright-core` devDependency expects; the script names this command when it is missing.
   `CHROMIUM=<executable>` runs another browser, unsupported by that client.
2. `npm run check:sweep`. It runs its own fixture test first
   (`scripts/screenshot-sizes-fixture.test.mjs`, seconds), then builds the showcase and
   sweeps. The four sizes run at once in one browser; on a machine short of memory, run the
   script itself with `--serial` (its header lists the options).

| Script | What it is actually defending |
|---|---|
| `typecheck` | Two programs: `tsconfig.json` (the package, the showcase, the tests) and `tsconfig.node.json` (the vite, vitest and tsup configs, which Node loads natively and so import with a `.ts` extension — a flag the package tsconfig must not carry, since the declaration build's `tsconfig.build.json` extends it). |
| `lint` | Zero warnings (see above): every rule is an error. |
| `check:tokens` | Raw colours outside the token set (budget in `scripts/check-token-discipline.mjs`). |
| `test:coverage` | The suite, once, with the coverage floors in `vitest.config.ts`: a change that deletes a test's subject along with the test cannot come out even. Each file runs in its own VM context in a reused worker (`pool: "vmThreads"`), ~2.5× faster than a fresh jsdom per file; stub full-page navigation through `lib/document-navigation.ts`, since `window.location` cannot be redefined there. |
| `build` | tsup emits one `.js` per module; `tsc` then emits one `.d.ts` per module (`scripts/build-dts.mjs`, `tsconfig.build.json`, incremental in `node_modules/.cache/dts/`, type-checking as it goes). Until 0.34 tsup's own declaration build did that through rollup-plugin-dts: hashed chunks, 72 s and a 5.5 GB peak, the process the OOM killer took. Now ~27 s cold, ~9 s incremental, 0.8 GB (TST-3). `npm run dev` is the same build in watch mode. |
| `check:graph` | That the build stayed unbundled. A bundling build fuses the modules into one chunk and `sideEffects` can no longer let a consumer drop what it does not use — the regression that dragged ~433 KB of recharts into a consumer's entry chunk. It asserts the graph, not a string: every source module has its own `dist/` module, and no runtime import cycle. And what that regression would cost (MOD-6): Rollup bundles `{ Button }`, `{ Spinner }`, `{ cn }` and the apps' shell set from `dist/`, prints the minified size and fails above a ceiling (the `BUDGETS` in `scripts/check-module-graph.mjs`). When a change makes one smaller, lower its ceiling in the same commit. Which modules may import recharts at all is `packaging-contract.test.ts`'s rule. |
| `check:package` | The **publish artifact**, not the working tree. It packs the real tarball, installs it with only the declared required peers, and imports every entry point *by package name* — the only way the `exports` map is ever exercised. Both defects that reached consumers in 0.4.x were invisible to every other check, because every other check ran against `src/` or against `dist/` by relative path. It also checks that every module ships its own `.d.ts`. |
| export inventory | `node scripts/gen-export-inventory.mjs --check`: the README's export inventory is what `dist/index.d.ts` exports, read through TypeScript's checker. Stale, it names the exports the README misses; rewrite it with the same script without `--check`. |
| styling inventory | `node scripts/gen-styling-inventory.mjs --check`: the README's role-utility list is what `tokens.css`'s `@theme inline` block defines. Stale, it names what is missing; rewrite it without `--check`. |
| `build:showcase` | The only place the kit is *rendered* outside jsdom. |
| `check:tailwind` | That the documented Tailwind `@source` step works. A wrong `@source` is **silent**: the app builds, runs, and renders unstyled. |
| `check:security` | `npm audit --audit-level=high`. |
| `check:commits` | Conventional Commits over the range: locally every commit not yet on `origin/main`, in CI the pushed or PR range. The release tool derives the version and the changelog from these messages. |
| `check:commit-rules` | The commit rules are the apps' SHARED ones: every file in `scripts/shared-commit-rules.json`'s `files[]` (`scripts/check-commit-msg.cjs`, and the pre-push hook's `scripts/check-pushed-commits.cjs`) is a byte-for-byte copy of `Eifi1/shared-workflows`' commit check, pinned to one commit. It fails when a copy drifts from the pin; offline, or while the pin waits for its tag ("(pending tag)", no commit yet), it says so and passes (CI always verifies). `npm run sync:commit-rules -- --from ../shared-workflows` copies a local checkout and leaves the pin alone. A newer shared tag is reported; take it with `npm run sync:commit-rules -- <tag>`. A copy, not the shared action, because the husky hook and `npm run check` need the rules locally. |

A passing group prints one line with its time; a failing one prints its whole output.
Inside a group, a passing check prints a line, not an inventory: `build` drops tsup's per-file listing
(`scripts/tsup-quiet.mjs`; `npx tsup` shows it), `build:showcase` runs at `--logLevel warn`,
`check:package --quiet` holds its walk back unless a step fails. So anything more than that
in the output — a warning, an act() complaint, a jsdom "Not implemented" — is new and is
the thing to read.

No dead-code check: `ts-prune` reports every public export of a library as unused.

## Dependencies

Updated **locally first**, like everything else, and pushed once, proven. There is no
Dependabot version-update config: its PRs each cost a CI run, and every major it proposed
broke the build. GitHub's security alerts stay on for advisories published after the fact.

1. `npm update`: every dependency within its range (lockfile only), then `npm run check`.
2. `npm run deps:outdated` lists what is left: the majors. Take them one GROUP at a time
   (vitest + coverage-v8 + jest-dom; vite + plugin-react; eslint + @eslint/js) and run
   `npm run check` after each, so a failure names its cause. Commit per group
   (`build(deps): …`).
3. Blocked majors wait, with the reason recorded in the commit or in `_overrides`:
   TypeScript 7 (typescript-eslint supports < 6.1), and `@types/node` follows the Node
   in `.nvmrc`.
4. GitHub Actions versions (`uses: …@vN`) get the same pass by hand, in the same batch.

## Releasing

Consumers pin `^0.x`, which npm treats as minor-locked below 1.0, so a minor does not reach
an app until it asks for it. The contract until 1.0:

- **minor** (`0.x.0`) may remove or rename an export, change a prop's type, change an
  emitted class name, or change a token's value. Each one is a breaking commit and lands in
  `CHANGELOG.md` under **⚠ BREAKING CHANGES**; the per-app migration goes in
  `docs/adopt-0.x.md`.
- **patch** (`0.x.y`) fixes behaviour without changing the public surface.

### Commits are the changelog

Versioning follows kastlan and keksdose: **Conventional Commits** plus
`commit-and-tag-version` (config in `.versionrc.cjs`). The husky `commit-msg` hook and the
CI job reject a message that is not `<type>(<scope>)?!?: <subject>` with a type from
`.versionrc.cjs`. `feat` → **Added**, `fix` → **Fixed**, `perf`/`refactor` → **Changed**;
`docs`, `chore`, `test`, `style`, `ci` and `build` stay out of the changelog.

Write the changelog entry IN the commit. A breaking change is `feat!:` / `fix!:` with a
`BREAKING CHANGE: <what breaks, and the migration>` footer. Below 1.0 that bumps the
**minor**, and a `feat` bumps the patch. A defect's commit body names the *mechanism*, not
just the symptom, because a reader upgrading needs to know whether it could have hit them.

### Cutting a release

1. On the release branch: `npm run check` — clean.
2. The README's export and styling inventories are current: `check:build` fails when
   they are not; `npm run build && node scripts/gen-export-inventory.mjs` and
   `node scripts/gen-styling-inventory.mjs` regenerate them.
3. `npm run release:dry` to read the version and the entry; then `npm run release`. It bumps
   `package.json` and the lockfile, writes `CHANGELOG.md` and commits
   `chore(release): X.Y.Z`. It does NOT tag (`skip.tag`). Force a version with
   `npm run release -- --release-as minor` when the commits under-state it.
4. Push (the pre-push hook runs `npm run check`), open the PR, and merge it once CI
   confirms. Pushes wait until the work is done and go out in one batch. The version bump
   makes it a release PR, so CI also runs the truncation sweep (`Truncation sweep (release)`,
   see [The gates](#the-gates)); a TRUNCATED or PINNED finding fails it and stops the
   release. To know the verdict before you push, run `npm run check:sweep` yourself.
5. Tag the MERGE commit on main:
   `git tag -a vX.Y.Z -m "@eifi1/ui-kit X.Y.Z" <sha> && git push origin vX.Y.Z`.

**Build once, ship that.** CI is the only workflow that installs, tests and builds. Every
run uploads `npm-package` (the tarball packed from the dist `check:build` verified),
`showcase` (built for Pages) and `tested-tree` (the git tree hash they came from).

**Test once, too.** A merge commit is new, but when the PR branch was up to date with
`main` its tree is exactly the one the PR's green run tested. CI on `main` then skips the
checks and re-uploads that run's artifacts (its `reuse` job compares the recorded tree with
the merge commit's), so Release and Pages start within a minute. A branch behind `main`, a
direct push or a missing green run gets the full check. A release merge reuses the PR's run
only if its sweep passed; otherwise the full run on `main` sweeps too, so no release reaches
npm unswept. So: update the branch before merging
a release PR, and the release does not wait for a second full run. `pages.yml` deploys the showcase
only after that CI run is green, and `release.yml` stages exactly that tarball, so nothing is
rebuilt. Tag the MERGE commit: the release looks up the CI run of the tagged commit on
`main`, waits up to 45 minutes for it, and refuses a red one.

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which STAGES the version on npm
through trusted publishing (OIDC, no token) with provenance. A maintainer approves it with
`npm stage approve <id>` (2FA). It refuses to publish a tag that disagrees with `package.json` — the easiest
way to ship 0.4.0 under the `v0.4.1` tag and never notice.

## Documentation

| File | For |
|---|---|
| `README.md` | Consumers. The npm landing page — peers, wiring, tokens, styling, colour, i18n, the generated export inventory. Tests and the showcase are documented in this file instead. |
| `ADOPTING.md` | An app adopting the kit for the first time; written to be handed to that repo's agent. |
| `CHANGELOG.md` | Every release and the semver contract. |
| `CONTRIBUTING.md` | This file. |
| `docs/` | Indexed by `docs/README.md`. The contracts (`*-harmonization.md`) are living documents, kept in step with the build (below); the current adoption notes (`adopt-0.x.md`) are per release; audits and refactor plans are dated and kept as written. Finished history — the adoption notes every app has adopted, the contracts' review logs, the old `@hb/ui` migration — is in `docs/archive/`. |

Two things to keep straight when you touch the README: the **export inventory and the
styling inventory are generated** (edit `scripts/gen-export-inventory.mjs` or
`scripts/gen-styling-inventory.mjs`, never the block between the markers); and the
dependency/peer table is load-bearing for installation — a wrong entry there is the defect
class that broke two of three consumers silently. When a release's adoption notes are
adopted by all three apps, move them to `docs/archive/adopt/` and update `docs/README.md`.
Each adoption note's head repeats the bump's standing line: restart the Vite dev server after
the install (its `.vite/deps` pre-bundle keeps serving the old kit; ADOPTING.md → Every later bump).
A release that changes kit-owned wording a legal page prints (a `legal.*` text, a kit
section's body) says so in its adoption note, in a "Legal wording" line naming the pages:
each app moves those pages' `updated` date to the day it ships the bump
(docs/legal-harmonization.md decision 10).

**The contracts follow the build.** Apps implement from the bodies of
`docs/*-harmonization.md`, so a round's last commit folds its `docs/adopt-0.x.md` list
"Where the build differs from the contracts", and whatever the round settled after the
reviews, into the sections they amend, and updates each contract's status table. History
(snapshots, per-app to-dos, review logs) goes to `docs/archive/<topic>-history.md`. Never
renumber a §: the code cites them.
