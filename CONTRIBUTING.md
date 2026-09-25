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
npm run check      # typecheck · lint · tokens · tests · build · package · showcase
```

`npm run check` is the whole of CI in one command. Run it before you push and you will not
be surprised.

**Node 24, not 20**, and not by preference. jsdom 30 pulls undici, which calls
`webidl.util.markAsUncloneable` — added to Node in 20.18. On plain 20 every test file dies
before it runs with "Failed to start forks worker" and a `TypeError` from inside
`CacheStorage`, naming neither jsdom nor the Node version. It is also what all four
consumers build this package with.

## Repo layout

```
src/
  index.ts            the main barrel — everything public passes through here
  chart.ts  shell.ts  data-table.ts  wizard.ts  tour.ts  feedback.ts  search.ts
                      subpath barrels: a re-slicing of index.ts, never a second API
  lib/                pure TypeScript. No React, no DOM. calc, dates, cn, logger
  hooks/              React hooks with no markup of their own
  theme/              tokens, palette presets, colour maths, the theme/palette stores
  components/         domain-free rendering components
  shell/              app frame: TopBar, AppShell, the topbar controls
  feedback/ wizard/ tour/ search/    feature areas with their own subpath
  test/               the vitest harness (setup only)
  __tests__/          cross-cutting tests; every other directory has its own
showcase/             a runnable Vite page rendering the whole kit
scripts/              the gates, plus the export-inventory generator
tokens.css            the design tokens, shipped to npm as-is
```

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
entry point. Three consumers pin `^0.5.0`, so a name leaving that list is a breaking change
for all of them and has to be a decision rather than a diff nobody read.

**If you add a barrel export, update the count in the same change.** The failure message
prints the full sorted list, so the diff tells you exactly which names moved. The same test
also asserts that no two star-exports collide (silent in ESM: the later module wins and the
earlier name disappears) and that every subpath is a strict *subset* of the main barrel.

Then regenerate the README's export inventory, which is generated from the build and not
maintained by hand:

```bash
npm run build && node scripts/gen-export-inventory.mjs
```

`--check` exits non-zero and names every export the README does not mention. The
hand-maintained version it replaced named 93 of 263 exports and had been advertising five
deleted wizard exports since 0.4.0, on the npm landing page.

## House rules

### 1. The kit resolves no strings

There is no translation catalogue here and there is not going to be one. Every user-facing
string is a **prop with an English default**, because the consuming app owns its wording.

A component with more than a string or two takes one `labels` object with **every key
optional**, merged over a `DEFAULT_*` constant by a `resolve*` helper — see
`DEFAULT_DATA_TABLE_LABELS`/`resolveDataTableLabels` and
`DEFAULT_CHIP_INPUT_LABELS`/`resolveChipInputLabels` for the shape to copy. Optional keys
matter: a caller passing three of eleven must get English for the other eight, not
`undefined` rendered into the DOM.

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

Use `text-[var(--text-muted)]`, `bg-[var(--bg-hover)]`, `text-[var(--danger)]`,
`border-[var(--border)]`. Not `text-slate-500`, not `bg-indigo-600`.

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

An export is **deprecated for one minor before removal**: marked `@deprecated` in TSDoc
with the replacement named, listed in the changelog, then removed in the next minor.

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
npm test            # vitest run
npm run test:watch
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

## Lint, and the ratchet policy

```bash
npm run lint
```

Two rule families are the reason `eslint.config.js` exists rather than taste:
`react-hooks/*`, because the audit found stale-closure and effect-cleanup defects `tsc`
cannot see, and `jsx-a11y/*`, because the kit ships ~20 interactive components to three
apps, where one accessibility regression multiplies by three.

**`warn` versus `error` is a ratchet, not an opinion:**

- A rule is **`error`** when `src/` is already clean under it, so it can never regress.
- A rule with a real backlog is **`warn`**, with the remaining count recorded in a comment
  beside it, so CI stays green while the backlog is worked down.
- **Every `warn` that reaches zero is promoted to `error` in the commit that empties it.**
  Not in a follow-up, not in a cleanup ticket. A rule left at `warn` after its count hits
  zero silently refills, and you have bought nothing.

If you empty one, move it out of the ratchet block and leave a comment saying what the last
instance was and how it was fixed — the two promoted rules in the config are written that
way and are the pattern to copy.

The `react-hooks` compiler rules (`refs`, `preserve-manual-memoization`,
`set-state-in-effect`, `immutability`) are **React Compiler readiness, not correctness**.
They flag patterns this package uses deliberately and documents, chiefly the latest-ref
pattern in `use-dismiss` / `use-close-transition` / `use-row-swipe`. Kept visible, not
enforced. The classic rules (`rules-of-hooks`, `exhaustive-deps`) stay errors: those are
the ones that catch stale closures.

There were once seven inert `eslint-disable` comments in `src/`, fossils of the origin
repository's config, suppressing rules nothing was running. Do not add a disable comment
without a sentence saying why the rule is wrong *here*.

## The showcase

```bash
npm run dev:showcase        # http://localhost:4170
```

Every component in the package on one page, with the theme, palette and language switchers
live. It renders **`src/`, not `dist/`** — no build step first, and an edit is on screen on
save. `strictPort` is on, so a collision fails loudly instead of printing a URL that is not
the one documented; `SHOWCASE_PORT=4199 npm run dev:showcase` for a throwaway instance.

**Adding a component to the kit means adding it to a section.** That is the only thing
keeping the page true, and it is also the broadest test the package has: `npm test` mounts
every section in one tree, so a component that throws on mount fails CI, and `tsc` covers
it, so an export renamed out of the barrel is a compile error rather than a demo that
quietly disappears.

Pure helpers get an input → output table rather than a rendered widget. They are a third of
the public surface, and a page that only rendered components would omit them entirely.

Storybook was considered and rejected for this repo: ~60 components would mean ~60 story
files against 113 source files, plus a second bundler in CI and an upgrade treadmill, for
one maintainer. Revisit it if a second maintainer appears.

## The gates

CI runs on every push to `main` and every pull request:

| Gate | What it is actually defending |
|---|---|
| `npm run typecheck` | — |
| `npm test` | — |
| `npm run build` | — |
| module-graph assertion | That the build stayed unbundled. A bundling build fuses the modules into one chunk and `sideEffects` can no longer let a consumer drop what it does not use — the regression that dragged ~433 KB of recharts into a consumer's entry chunk. It asserts the graph, not a string. |
| `scripts/verify-package.mjs` | The **publish artifact**, not the working tree. It packs the real tarball, installs it with only the declared required peers, and imports every entry point *by package name* — the only way the `exports` map is ever exercised. Both defects that reached consumers in 0.4.x were invisible to every other check, because every other check ran against `src/` or against `dist/` by relative path. |
| `npm run build:showcase` | The only place the kit is *rendered* in CI. |
| emitted-CSS grep | That the documented Tailwind `@source` step works. A wrong `@source` is **silent**: the app builds, runs, and renders unstyled. |

`npm run check:tokens` and `npm run lint` are in `npm run check` and should be added to the
CI job when the ratchets are stable.

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
2. `npm run build && node scripts/gen-export-inventory.mjs` — the README inventory is
   current.
3. `npm run release:dry` to read the version and the entry; then `npm run release`. It bumps
   `package.json` and the lockfile, writes `CHANGELOG.md` and commits
   `chore(release): X.Y.Z`. It does NOT tag (`skip.tag`). Force a version with
   `npm run release -- --release-as minor` when the commits under-state it.
4. Open the PR, and merge it once CI is green.
5. Tag the MERGE commit on main:
   `git tag -a vX.Y.Z -m "@eifi1/ui-kit X.Y.Z" <sha> && git push origin vX.Y.Z`.

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which STAGES the version on npm
through trusted publishing (OIDC, no token) with provenance. A maintainer approves it with
`npm stage approve <id>` (2FA). It refuses to publish a tag that disagrees with `package.json` — the easiest
way to ship 0.4.0 under the `v0.4.1` tag and never notice.

## Documentation

| File | For |
|---|---|
| `README.md` | Consumers. The npm landing page — wiring, tokens, colour, i18n, the generated export inventory. |
| `ADOPTING.md` | An app adopting the kit for the first time; written to be handed to that repo's agent. |
| `MIGRATING.md` | An app moving off the old `@hb/ui` submodule. |
| `CHANGELOG.md` | Every release and the semver contract. |
| `CONTRIBUTING.md` | This file. |
| `docs/` | Audits and refactor plans — dated, and kept as written rather than edited later. |

Two things to keep straight when you touch the README: the **export inventory is
generated** (edit the generator, never the block between the markers), and the
dependency/peer table is load-bearing for installation — a wrong entry there is the defect
class that broke two of three consumers silently.
