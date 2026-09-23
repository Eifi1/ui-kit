# @eifi1/ui-kit module audit — 2026-09-22

## Status

**104 confirmed findings.** 12 fixed in this pass (§4); the rest are triaged below with a
staged plan in §8. This is the first audit of the package as a *published module* — the
2026-08-24 plan audited it as source, while it was still a submodule at
`keksdose/packages/ui`.

Three things are broken for consumers **today**:

1. **Two of the three consuming apps render the kit unstyled.** kastlan and keksdose both
   still carry `@source "../../packages/ui/src"` — the submodule path, dead since the npm
   migration. Tailwind emits no warning for an `@source` that matches nothing, so the apps
   build, run and are fully interactive with several hundred utility rules missing.
   Measured against lenkbank (the one app with a correct path): **kastlan's production CSS
   is short 403 rules, keksdose's 260**, including `.sr-only`, `.pointer-events-auto`,
   `.inset-0` and every `z-[60|61|70]`. Fixed in this repo's docs (§4); **the one-line fix
   in each app is still outstanding** (§5).
2. **The package cannot be installed as documented.** `recharts` and `react-router` are
   declared optional peers, but both are top-level value imports in modules the barrel
   re-exports. `import { Button }` fails to resolve without them — reproduced as
   `ERR_MODULE_NOT_FOUND`, and confirmed to fail a real `vite build`, because Rollup
   resolves the module graph before it shakes it. The three current consumers all happen
   to depend on both, which is why nobody has hit it. `property-management` — named in
   ADOPTING.md, and neither a chart nor a router consumer — is the one that will.
3. **There was no LICENSE file**, despite `"license": "MIT"` and vendored MIT code from
   shadcn/ui whose attribution the build strips. Fixed (§4).

## How this was produced

Eleven parallel audits over `src/`, `tokens.css`, the build and the three consuming
checkouts, each confined to one dimension. Every finding was then handed to a separate
adversarial verifier instructed to **refute** it — open the file, look for the wrapper,
test, config or deliberate trade-off the auditor missed, and default to *refuted* when
uncertain. **142 findings went in, 38 were refuted, 104 survived.** Three further surveys
inventoried every chart in keksdose, lenkbank and kastlan for §7.

Refuted findings are not in this document. Several were refuted on good grounds worth
knowing: the `bundle: false` + `sideEffects` tree-shaking claim **is** real (a measured
esbuild bundle of `import { Button }` from the published 0.4.1 keeps 37 KB raw / 11.7 KB
gzip, 13 modules of 75, with no recharts and no react-router); `scripts/fix-esm-extensions.mjs`
genuinely works under both `moduleResolution: bundler` and `node16`; and nothing in the
package touches a browser global at module scope.

## The numbers

| | |
|---|---|
| Source | 113 files, ~20,000 lines, 180 runtime exports |
| Consumers | kastlan, lenkbank, keksdose (all on `^0.4.1`); property-management prospective |
| Confirmed findings | 104 — 6 critical, 24 high, 50 medium, 24 low |
| Hardcoded colour utilities | **917** (866 palette-scale + 51 `white`/`black`) vs **85** `var(--token)` — an 11:1 ratio |
| `--text-secondary` / `--text-muted` usages in components | **0**, against 114 `text-slate-500` and 122 `text-slate-400` |
| Components with an exported Props type | **14 of 85** |
| Source modules never executed by a test | 29 of 75 (5,416 lines, 34% of `src`) |
| Runtime exports never named in a test | 111 of 180 |
| Components that trap and restore focus | **1** (`Modal`) |
| ESLint configs in the repo | 0 (with 7 inert `eslint-disable` comments left in `src`) |

## 4. Fixed in this pass

| | |
|---|---|
| `LICENSE` | MIT text + a third-party notice for the vendored shadcn/ui chart kit. Added to `files`. |
| `README.md` §2 | `@source` corrected to `dist`, with the failure mode spelled out and a ten-second grep to verify it |
| `ADOPTING.md` | `@source` corrected; the two references to `../keksdose/packages/ui/README.md` (deleted by the migration) replaced with paths a new consumer can actually reach |
| `MIGRATING.md` | **new step 2b** — repointing `@source`. The step-2 `sed` rewrites `@hb/ui` specifiers, but the `@source` line holds a *path* and contains no such string, so it survives the migration untouched. This is the exact mechanism that broke both migrated apps. |
| `README.md` "What's exported" | Removed five wizard exports deleted in `864594c` (`useRhfWizardStep`, `WizardField`, `WizardSelectField`, …) and the `react-hook-form` peer that is in no peer list — shipped wrong in 0.4.0 and 0.4.1, and it is the npm landing page |
| `README.md` no-flash bootstrap | Documented the real API (`applyPersistedTheme` → `applyPersistedPalette`) instead of pointing at a file in another repository |
| `tokens.css` header | Still said `@hb/ui` and gave the old `@source` path — it ships to npm |
| `tsconfig.json` | Dead `@hb/ui` path aliases replaced with `@eifi1/ui-kit`, which is what the showcase and consumers use |
| `package.json` `files` | Added `src`, so the published sourcemaps resolve to real source |
| **Showcase** | A runnable Vite page rendering all 16 sections of the kit (§6) |
| CI | Builds the showcase, and asserts the emitted CSS actually contains the kit's utilities — the first automated check that the documented `@source` step works |
| `.github/workflows/pages.yml` | Deploys the showcase to GitHub Pages (needs one manual repo setting, noted in the file) |

## 5. Outstanding in the consuming apps

Not fixable from this repository. One line each:

```diff
  # kastlan/frontend/src/app.css:12  and  keksdose/frontend/src/app.css:10
- @source "../../packages/ui/src";
+ @source "../../node_modules/@eifi1/ui-kit/dist";
```

`lenkbank/frontend/src/app.css:15` is already correct. Verify each with
`npm run build && grep -c 'pointer-events-auto' dist/assets/*.css`.

## 6. The showcase

`npm run dev:showcase` — the whole kit on one page, with the theme and palette switchers
live. It renders **`src/`, not `dist/`**, so no build step is needed and an edit is on
screen on save.

It exists because a design system three apps derive from had no way to see a component
short of reading 20,000 lines, and because it is the cheapest broad test the package has
ever had. `npm test` mounts every section in one tree (a component that throws on mount
fails CI), `tsc` covers it (an export renamed out of the barrel is a compile error, not a
demo that quietly disappears), and CI builds it and greps the emitted CSS.

Sixteen sections — foundations/tokens, primitives, fields, numbers & money, dropdowns &
pickers, overlays, dates, data table, charts, shell, settings, feedback (compose + inbox),
wizard, tour/palette/files, hooks & lib — covering the rendering exports and giving the
pure helpers (`calc`, `dates`, the filter/sort codecs, the palette maths) input → output
tables, since those are a third of the surface and a page that only rendered components
would omit them entirely.

**Storybook was considered and rejected** for this repo: ~60 components would mean ~60
story files against 113 source files total, plus a second bundler in CI and an upgrade
treadmill, for one maintainer. What that costs is real and worth knowing — no args/controls,
no autodocs from the (unusually good) TSDoc, and no `addon-a11y`. The last is the one worth
buying back: adding `axe-core` to the existing render test would get most of it for one
devDependency. Revisit Storybook if a second maintainer appears.

**Not verified visually.** This machine has no `libasound.so.2`, so no headless browser
could start. The page is proven by typecheck, by 237 passing tests including three that
mount every section, by a real production build, and by asserting the emitted CSS carries
`pointer-events-auto`, `sr-only` and `z-[60|61|70]` — but nobody has looked at it yet.

## 7. Should the kit own charts?

**It already does, barely** — `src/components/chart.tsx` is 227 lines: the shadcn/ui shell
(`ChartContainer`, `ChartTooltip(Content)`, `ChartLegend(Content)`, `useChart`) plus
`theme/chart-palette.ts`. Everything *above* that shell has been invented three times.

What the survey of all three apps found:

| | |
|---|---|
| keksdose | 14 chart components + 2 helper modules (`money-axis.ts`, `price-domain.ts`) |
| lenkbank | a parallel chart kit at `shared/charts/` — `series-chart.tsx` alone is 30 KB, plus `with-zoom.tsx`, `zoom-fit.ts`, `toggle-legend` and 4 test files |
| kastlan | bar/area/pie/stacked-bar hand-assembled inline in two files, bypassing the kit's shell entirely |
| all three | depend on `recharts ^3.8.1` directly |

Three independent answers exist to the same five problems: axis domain padding, empty/
loading/error states, chart height, tooltip nulls, and legend interaction. **Four separate
`paddedDomain` implementations with three different pad constants.** kastlan spells the
empty state five ways and the loading state three. `paletteFor()` — the kit's own
theme-aware colour helper — has **zero call sites in kastlan and zero in lenkbank**; both
rebuilt the palette threading by hand.

### Verdict: yes, but hoist the layer *under* the charts, never the charts

The three surveys converged on this independently, and two of them found the argument
written down *in the consumers' own code*. lenkbank's `series-chart.tsx:341-346` says it
must not move up because "the shape it encodes is domain-shaped"; it is right. The apps
also genuinely disagree about axes on principle — keksdose's rule is unit-on-every-tick in
a 96px box sized for `CHF 31,500.00`; lenkbank's is bare ticks with the unit said once in a
rotated title. A shared `<BarChart>` would fit none of them and would silently change
somebody's charts on every release.

**Hoist (high value, low risk):**

| | |
|---|---|
| `ChartFrame` | height + loading + empty + error + accessible name in one wrapper. The most duplicated thing in the estate and the one place a consumer silently gets nothing: `ChartContainer` renders `ResponsiveContainer height="100%"` inside a div with no height, so a forgotten height class paints 0px. |
| `paddedDomain` / `niceDomain` | Pure arithmetic, no React, no domain. Four implementations today. |
| Axis + value formatting | keksdose's `money-axis.ts`, generalised. It records that 70px clipped `CHF 31,500.00` to `HF …`; kastlan independently picked 56px. |
| Chart a11y | An accessible name, recharts 3's `accessibilityLayer`, and a table fallback. Across ~20 charts in three apps there is **not one** `role="img"`, chart-level `aria-label`, or `accessibilityLayer` prop. No app team will do this alone; a design system is exactly where it gets done once. |
| A test harness at `@eifi1/ui-kit/testing` | jsdom has no `ResizeObserver`, so every consumer rediscovers this. Seven keksdose files hand-roll the same recharts mock, and two apps' stubs disagree in a way that matters. This is why kastlan has zero chart tests. |
| `ToggleLegend` | The kit ships a highlight-and-dim legend whose `onItemClick` has **zero call sites in all three apps**, and lacks the on/off legend two of them needed. lenkbank wrote five legends. |

**Fix in what the kit already ships** (these are defects, not features):

- `ChartTooltipContent` coerces a missing value to `0` (`chart.tsx:158`), so any sparse
  series prints a fabricated zero. keksdose found this and wrapped around it.
- `ChartStyle` interpolates consumer-supplied config **keys** into a
  `dangerouslySetInnerHTML` stylesheet with no escaping — and kastlan feeds those keys from
  the database.
- `textOn` flips on Rec.601 luma > 0.6 and picks the worse ink on about a third of the
  categorical palette. keksdose measured this, forked it locally for the treemap, and left
  the other two call sites in the same app on the defective version.
- `chart.tsx` hardcodes 11 slate utilities and two `#64748b` literals — in the one module
  whose entire job is theming. A consumer who disagrees has only `!important`, which is
  what lenkbank did, with a comment warning it is fragile across upgrades.
- `HEATMAP_HEX` has drifted from `DEFAULT_PRESET`: five of six light stops differ, and the
  light `neutral` is slate-100, a cool grey on a warm cream page.

**Do not hoist:** `with-zoom.tsx` (excellent, and lenkbank's alone — it binds three
recharts-3-only hooks, which would turn the kit's loose `>=3` peer range into a promise it
cannot keep), the two heatmaps (layout tied to one app's breakpoints and shell), the
facing-pair layout, or any finished chart.

**Sequencing.** Do §8 stage 1 first. Growing the chart surface while `recharts` is a
statically-imported "optional" peer makes finding 2 worse, and the chart module has
**zero tests today** — moving more code into it before there is a test story multiplies the
blast radius across three apps at once.

## 8. Staged plan

**Stage 1 — make it installable and visible (do first).**
Split the heavy seams into subpath exports (`./chart`, `./shell`, `./data-table`,
`./wizard`, `./tour`) so the barrel's module graph touches neither recharts nor
react-router; then the optional-peer promise becomes true, lazy-loading becomes possible
(measured: 221 KB via the barrel vs 31 KB for the chart kit alone), and stage 3 has
somewhere to put charts. Breaking for the three consumers — a one-line import change each —
so ship it as `0.5.0` with a CHANGELOG. Add: CHANGELOG, a semver policy, `engines`, and a
packed-tarball CI job (`npm pack` → install into a fixture with only the *required* peers →
build → assert the classes survive) that would have caught findings 1 and 2 together.

**Stage 2 — stop the bleeding in the styling layer.**
917 hardcoded colour utilities against 85 token references is the reason a consumer cannot
rebrand without forking. Start with `FIELD_BASE`, which is half-tokenized in a way that is worse than either
extreme: its border and focus ring are `var(--border)` / `var(--brand)` and do follow the
palette, while its surface and text are `bg-white` / `text-slate-900` and never do — so a
rebranded app gets fields with the new accent on an unchanged white box. Then the overlay
panels, and `text-slate-500` as the de-facto muted colour — which fails WCAG AA on the kit's own light palette, while `--text-muted`, added
precisely to replace it, has zero component usages. Add a CI grep for palette-scale
utilities in `src/**/*.tsx`, or it re-drifts.

**Stage 3 — charts,** per §7, and only after 1 and 2.

**Ongoing, cheapest-first:** ESLint (there is none — no `react-hooks/exhaustive-deps`, no
`jsx-a11y`); `axe-core` in the showcase render test; coverage with a ratcheting threshold;
exported Props types for the other 71 components; `...rest` on the ~35 components that
accept no arbitrary attributes (the kit's own tour cannot anchor to them).

The accessibility findings (14 confirmed) are mostly one pattern: `Modal` is a correct
focus trap and `CommandPalette` has textbook combobox ARIA, and **neither pattern was ever
generalised**. Every other overlay declares `role="dialog" aria-modal="true"` and then
leaves focus on the page behind it — the worst of both worlds, since AT hides the page
while the user's focus is still in it.

## 10. RTL is unimplemented (found 2026-09-22, after the i18n wave)

Not "working with defects" — **unimplemented**. `src/` contains not one logical-property
utility: zero occurrences of `ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`,
`start-*`, `end-*`, the `rtl:` variant, or any read of `dir`, across every `.ts`, `.tsx`
and `.css` file. Against that, **~130 physical-direction utilities across 34 files**.

This surfaced because the showcase now runs in Arabic. It had never been rendered RTL.

**What a reader on Arabic meets first**

| Where | What is wrong |
|---|---|
| `shell/app-shell.tsx:169` | `border-r` on `<aside>` — the sidebar moves right, its divider stays on its right edge, i.e. against the window rather than the content. Needs `border-e`. |
| `shell/app-shell.tsx:349`, `:403` | Flyout anchored `{ left: rect.right }` with a `pl-1` gutter — every sub-menu opens *over* the page content. |
| `shell/app-shell.tsx:314`, `:5,196,206` | `ChevronRight` and `PanelLeftOpen/Close` point away from where the thing opens. |
| `shell/app-shell.tsx:189`, `:320` | `Tooltip side="right"` on the collapsed rail — draws over the content. |
| `components/hover-menu.tsx:136`, `dropdown.tsx:291` | `align === "right" ? "right-0" : "left-0"` — every top-bar menu overhangs, then the viewport correction yanks it back, which reads as a jump. |
| `components/ui.tsx:600`, `:639…` | Password reveal `right-0` with `pr-9` — in RTL the button sits at the *start* and covers the first characters typed. |
| `components/ui.tsx:232,251,269` | Floating label `absolute left-3` — floats over empty space at the far end. |
| `components/amount-input.tsx:307-310`, `:340` | The `pr-*` ladder reserving room for the currency chip lands it on top of the digits. |
| `data-table.tsx:621-623`, `:1121` | Column resize: grabber on the *leading* edge and `startWidth + (clientX - startX)` has the wrong sign. |
| `hooks/use-row-swipe.ts:142,164-166` | `rawDx` maps positive to `rightStages`; trailing actions belong on the left in RTL. |
| ~25 sites | `text-left`/`text-right` where `text-start`/`text-end` is meant. |
| ~12 sites | Directional glyphs meaning previous/next, including `mini-calendar.tsx:268-271` where `ArrowLeft` moves a day *back* — in RTL it should move forward. |

**Two more the source read could not find, caught by looking at the page**

- `@eifi1/ui-kit` rendered as `eifi1/ui-kit@`. The leading `@` is a bidi-NEUTRAL character; with no strong LTR character before it, it takes the paragraph's direction and is reordered to the far end. Fixed in the showcase with `dir="ltr"` on the identifier.
- Every English sentence in the untranslated prose rendered with its full stop on the left. Fixed by marking that block `dir="ltr"` — which is correct rather than a workaround: content declares the direction it is actually written in.

**Scope note.** Nothing in `src/` was changed for this. RTL support is a decision with a
real cost — ~130 call sites, plus the pointer-maths and glyph cases which are not a
find-and-replace — and it should be taken deliberately rather than as a side effect of a
translation demo. The showcase-side bidi fixes above were made because they are showcase
bugs.

## 9. All 104 confirmed findings

### Packaging & distribution

| sev | eff | finding | where |
|---|---|---|---|
| **crit** | S | src/ is not published but every doc tells consumers to Tailwind-@source it — kastlan ships unstyled | `package.json:22` |
| high | XS | ADOPTING.md sends the 4th consumer to a directory deleted by the migration | `ADOPTING.md:5` |
| high | M | recharts and react-router are marked optional peers but the barrel cannot load without them | `package.json:41` |
| med | S | CI never exercises the exports map, the subpath, or the publish artifact | `.github/workflows/ci.yml:54` |
| med | XS | flag-icons is a 5.6 MB hard dependency the package never imports | `package.json:54` |
| med | XS | No LICENSE file ships despite "license": "MIT" | `package.json:73` |
| med | S | No CHANGELOG, no semver policy, and 0.x ranges mean no consumer ever receives an update | `package.json:3` |
| low | S | No subpath exports: a consumer has no escape hatch from the barrel | `package.json:10` |
| low | XS | No engines field and no .nvmrc, while the build is Node-24-specific in practice | `package.json:26` |
| low | XS | Sourcemaps are 60% of the tarball while the source they point at is excluded | `tsup.config.ts:21` |

### Render contract

| sev | eff | finding | where |
|---|---|---|---|
| **crit** | S | Kastlan ships today with 403 kit utility rules missing, incl. .sr-only and .pointer-events-auto | `/home/marcel/kastlan/frontend/src/app.css:12` |
| **crit** | XS | Documented @source path points at src/, which is not published | `README.md:63` |
| med | S | ADOPTING.md's brief cannot be followed: it points at paths that no longer exist and names the wrong API | `ADOPTING.md:3` |
| med | XS | README's quickstart imports tokens.css from JS, which silently disables the .dark class contract | `README.md:15` |
| med | S | flag-icons is a hard dependency whose stylesheet nothing imports and nothing documents | `src/components/currency-select.tsx:50` |
| med | L | 771 hard-coded slate/white classes ignore the palette, and two of them fail WCAG AA on the kit's own default | `src/components/date-picker.tsx:90` |
| med | XS | Bottom nav has no safe-area padding, and viewport-fit=cover is an undocumented requirement | `src/shell/app-shell.tsx:249` |
| med | M | tokens.css :root/.dark are live, are documented as inert, and have drifted from DEFAULT_PRESET | `tokens.css:12` |
| med | XS | The dark variant is redefinable by consumers and Kastlan has silently overridden it | `tokens.css:25` |
| low | XS | Tailwind is not a peer dependency although tokens.css is Tailwind-v4-only | `package.json:34` |

### Accessibility

| sev | eff | finding | where |
|---|---|---|---|
| high | M | ComboboxPanel's listbox has none of the ARIA CommandPalette already proves it knows | `src/components/combobox-core.tsx:243` |
| high | S | No live regions: async results, sort, filter and pagination changes announce nothing | `src/components/combobox-core.tsx:248` |
| high | M | Only Modal manages focus; every other dialog strands it on the page behind | `src/components/full-bleed-dialog.tsx:96` |
| high | M | MiniCalendar is unusable with a keyboard or screen reader | `src/components/mini-calendar.tsx:140` |
| high | S | MultiSelect's checked state exists only as a decorative span | `src/components/multi-select.tsx:143` |
| high | S | Popover portals its panel out of the tab order with no role and no focus move | `src/components/popover.tsx:46` |
| med | XS | No dialog outside Modal closes on Escape; useDropdown has no Escape at all | `src/components/dropdown.tsx:65` |
| med | XS | Focus indicator removed with no replacement on numpad keys and every dropdown search box | `src/components/numpad-sheet.tsx:66` |
| med | M | SwipeableRow ships a pointer-only gesture with no keyboard path and no ARIA | `src/components/swipeable-row.tsx:144` |
| med | S | `invalid` sets aria-invalid but the package has no way to attach the error text | `src/components/ui.tsx:431` |
| med | XS | Select silently deletes a caller's own aria-invalid; Input does not | `src/components/ui.tsx:554` |
| med | S | Tabs declares role=tab but owns no panel and keeps every tab in the tab order | `src/components/ui.tsx:862` |
| med | S | Controls that are visually present but keyboard-unreachable, and one that is invisible but focusable | `src/components/ui.tsx:459` |
| low | S | Tooltip text is never associated with its trigger and cannot be dismissed | `src/components/tooltip.tsx:98` |

### Theming & token discipline

| sev | eff | finding | where |
|---|---|---|---|
| **crit** | XS | ADOPTING.md and README send new consumers to a @source path the published package does not contain | `ADOPTING.md:32` |
| high | M | text-slate-500 is the kit's muted-text colour and fails WCAG AA on the kit's own light palette; --text-muted exists and is unused | `src/components/data-table.tsx:710` |
| high | M | Every overlay panel is bg-white / dark:bg-slate-900, next to token-driven panels in the same kit | `src/components/dropdown.tsx:187` |
| high | S | FIELD_BASE hardcodes bg-white / text-slate-900, so no field in the kit ever re-skins | `src/components/ui.tsx:101` |
| med | S | chart.tsx hardcodes 11 slate utilities, bg-white and two #64748b literals — the one module theme/chart-palette.ts exists to serve | `src/components/chart.tsx:51` |
| med | M | No danger/warning/success/info tokens; the kit ships two different destructive hues and a consumer had to invent --destructive | `src/components/ui.tsx:27` |
| med | S | Four of the nine default light chart hues fail WCAG 1.4.11's 3:1 against the kit's own light surfaces | `src/theme/palette-presets.ts:84` |
| med | S | tokens.css has drifted from DEFAULT_PRESET in 10 of 23 tokens, on a premise about Tailwind that is false | `tokens.css:12` |
| low | M | Selection and active-state affordances hardcode indigo and sky, so switching --brand leaves an indigo/sky app | `src/components/data-table.tsx:915` |
| low | M | Money-domain tokens paint domain-free components, and a consumer aliased --muted-foreground to --money-neutral to cope | `src/components/ui.tsx:687` |
| low | XS | tokens.css redefines the global `dark` variant and silently overrides the consumer's dark-mode strategy | `tokens.css:25` |
| low | S | Global chrome and the kit's exported class constants are hardcoded slate, spreading untokenized colour into consumer code | `tokens.css:230` |

### Public API design

| sev | eff | finding | where |
|---|---|---|---|
| med | XS | README documents five wizard exports that were deleted and do not exist | `README.md:129` |
| med | S | Three different prop names for the accessible name | `src/components/combobox.tsx:184` |
| med | M | Popover and HoverMenu cannot be opened or closed by the consumer | `src/components/popover.tsx:20` |
| med | M | ~35 components accept no ...rest, so the package's own tour cannot anchor to them | `src/components/toggle-group.tsx:34` |
| med | XS | ALTERNATIVE_PRESETS is exported but presetById cannot resolve any of its ids | `src/theme/palette-presets.ts:470` |
| low | S | The headless cores that would let a consumer build a variant are not exported | `src/components/combobox-core.tsx:71` |
| low | S | Input, Select and Textarea have divergent prop sets, and Input's className means two different things | `src/components/ui.tsx:406` |
| low | M | 71 of 85 exported components ship no exported Props type | `src/index.ts:36` |
| low | S | No deprecation path, no CHANGELOG and no test pinning the public surface | `src/index.ts:1` |

### Tests & quality gates

| sev | eff | finding | where |
|---|---|---|---|
| **crit** | S | No gate checks the published tarball against the documented adoption steps | `ADOPTING.md:32` |
| high | M | The optional-peer promise is untestable by construction and is already false | `.github/workflows/ci.yml:54` |
| high | S | No ESLint at all, with seven inert suppressions left behind in src | `src/components/use-table-state.ts:216` |
| med | M | DataTable — 1,449 lines, 122 call sites, three apps — is never rendered by a test | `src/components/data-table.tsx:1` |
| med | M | Keyboard and focus behaviour is effectively untested across the whole kit | `src/search/command-palette.tsx:173` |
| med | S | Nothing asserts tokens.css mirrors DEFAULT_PRESET — 10 of 46 values have already drifted | `tokens.css:42` |
| med | S | No coverage measurement or threshold of any kind | `vitest.config.ts:19` |
| low | S | No unused-dependency or audit gate: flag-icons is a hard dependency nothing imports | `package.json:54` |
| low | XS | The "a field takes invalid" sweep only scans src/components/*.tsx | `src/components/__tests__/field-invalid.test.tsx:172` |
| low | M | No sweep that every var(--token) the kit emits is actually declared, and the inherited one is dead | `src/components/ui.tsx:100` |

### Documentation & contributor experience

| sev | eff | finding | where |
|---|---|---|---|
| **crit** | XS | MIGRATING.md omits the Tailwind @source line; two of three consumers are broken today | `MIGRATING.md:72` |
| high | XS | Documented Tailwind @source path points into a directory the package does not ship | `README.md:63` |
| high | S | README advertises five wizard exports that were deleted, plus a peer dependency that does not exist | `README.md:131` |
| high | M | The hand-maintained export inventory names 93 of 263 exports; 167 are never mentioned at all | `README.md:100` |
| med | XS | ADOPTING.md's only reference target no longer exists | `ADOPTING.md:64` |
| med | XS | The documented no-flash bootstrap describes the wrong API and points at an unreachable file | `README.md:79` |
| med | S | The optional-peer table is incomplete in both the README and ADOPTING.md | `README.md:40` |
| med | XS | No LICENSE file, and the vendored shadcn/ui MIT attribution is stripped from the published build | `package.json:73` |
| med | M | No CONTRIBUTING, no linter, and no written house style | `package.json:26` |
| med | XS | tokens.css ships to npm with the old package name and the old source path in its header | `tokens.css:8` |
| low | S | No CHANGELOG, release notes or semver policy for three consumers pinned at ^0.4.1 | `README.md:1` |
| low | XS | The README links to nothing, and the adoption and migration briefs never reach npm consumers | `README.md:1` |
| low | XS | tsconfig.json still declares dead @hb/ui path aliases that typecheck but do not build | `tsconfig.json:23` |

### React correctness & performance

| sev | eff | finding | where |
|---|---|---|---|
| high | S | ChartStyle injects unescaped consumer data into a <style> via dangerouslySetInnerHTML | `src/components/chart.tsx:78` |
| high | M | DataTable's urlSync destroys the history sentinel its own overlays rely on | `src/components/use-table-state.ts:213` |
| med | M | Column resize fires an unthrottled setState per mousemove that re-renders every row | `src/components/data-table.tsx:563` |
| med | S | Shift-range selection is O(n²) in the consumer and indexes into a slice that reorders | `src/components/data-table.tsx:633` |
| med | S | Controlled filters plus urlSync can loop, and persistence writes localStorage every render | `src/components/use-table-state.ts:209` |
| med | XS | FeedbackNoteEditor resets state in an effect, discarding an in-progress draft and attachment | `src/feedback/feedback-inbox.tsx:467` |
| low | XS | Combobox's phone sheet does an O(n²) indexOf scan the desktop branch avoids | `src/components/combobox.tsx:423` |
| low | M | DataTable re-filters and re-sorts the whole dataset on every unrelated parent render | `src/components/data-table.tsx:431` |

### Environment & runtime safety

| sev | eff | finding | where |
|---|---|---|---|
| high | S | `recharts` is declared an optional peer but is hard-required by the barrel | `src/components/chart.tsx:15` |
| high | S | Modal's panel drag adds window listeners from a handler with no unmount cleanup | `src/components/modal.tsx:23` |
| med | S | `flag-icons` is a runtime dependency that nothing in the package imports | `package.json:54` |
| med | S | DataTable column resize leaks window listeners and permanently poisons `document.body.style` | `src/components/data-table.tsx:555` |
| med | M | `react-router` is declared an optional peer but is hard-required by the barrel, and DataTable needs a Router even with `urlSync` off | `src/shell/app-shell.tsx:4` |
| low | M | Overlays throw `ReferenceError: document is not defined` during server render | `src/components/modal.tsx:267` |
| low | XS | No `"use client"` directive anywhere in src or dist | `tsup.config.ts:15` |

### i18n / string contract

| sev | eff | finding | where |
|---|---|---|---|
| high | S | No single documented way to pass a locale; the README never mentions the word | `README.md:150` |
| high | S | 27 English currency names and a double-duty placeholder in CurrencySelect / AmountInput | `src/components/currency-select.tsx:17` |
| high | XS | Password reveal toggle's aria-label is hardcoded English with no prop | `src/components/ui.tsx:461` |
| med | S | Partial<DataTableLabels> silently backfills English — lenkbank leaks 19 strings today | `src/components/data-table-labels.ts:75` |
| med | XS | Pagination range summary and column-count label are template literals, not labels | `src/components/data-table-pagination.tsx:51` |
| low | XS | Hardcoded alt="QR" in the two-factor setup card | `src/components/account-settings.tsx:191` |

### Bundle cost & dependency weight

| sev | eff | finding | where |
|---|---|---|---|
| high | XS | The documented Tailwind @source path does not exist in the published package, and kastlan is already broken by it | `README.md:63` |
| med | S | CI's tree-shaking assertion cannot detect the regression it exists to prevent | `.github/workflows/ci.yml:44` |
| med | S | lucide-react is a hard dep pinned to 0.511.x while the current release line is 1.47 | `package.json:55` |
| med | M | flag-icons: 5.6 MB hard dependency that no module imports and that renders nothing | `package.json:54` |
| med | M | react-router is declared an optional peer but four modules import it statically | `src/components/data-table.tsx:13` |
