# @eifi1/ui-kit refactor plan — 2026-10-12

## Status — ALL WAVES DONE in 0.34 (2026-10-13)

Every finding below is built and committed on `feat/0.34.0`; the apps' side is in
`docs/adopt-0.34.md`. Left on purpose: items each wave named as open (e.g. MOD-10's alias
entries kept, 0.35's removals of what 0.34 deprecates).

### History

Marcel, after Wave 0: "Wire all waves also into 0.34." So every wave ships in 0.34, and the
dates below shift by one minor: what this plan deprecates "in 0.35" is deprecated in 0.34 and
removed in 0.35. Execution order: phase A (Wave 1 + the docs, i18n and theme items of Wave 5),
B (Wave 2), C (Wave 3 + Wave 4), D (the rest of Wave 5).

**Decisions taken (Marcel, 2026-10-12):** 1 yes, Wave 0 into 0.34; 2 yes, the sweep runs in CI on
the release PR (local-first otherwise); 3–5 as recommended.

Six read-only auditors went over the kit at `feat/0.34.0` (round 0.34 committed, not yet
released), one area each, on Marcel's request of 2026-10-12. Together they filed **69
findings**: 1 at sev 4, 10 at sev 3, 47 at sev 2 and 11 at sev 1. 24 are PROVEN, meaning
they were shown by running the kit's own modules or measuring its build; the rest are
traced in the code. Some findings overlap; merged, they come to **about 63 pieces of
work**.

The full reports, with every file:line, the measurements and the per-app call-site counts,
are in [`docs/refactor-audit-2026-10/`](refactor-audit-2026-10/): `BUG.md`, `DUP.md`,
`MOD.md`, `API.md`, `TST.md`, `DOC.md`, plus `brief.md`, the rules the auditors followed.
This plan orders the work; the reports hold the evidence. IDs are the reports'.

**One live defect (sev 4), and three more sev-3 bugs reachable in all three apps.** All
four are S or XS, need no API change, and can still go into 0.34 before it is cut.
Decision 1 below asks whether they should.

## How this was produced

- **Target:** `/home/marcel/ui-kit-034`, branch `feat/0.34.0`, commits `d6212d6`…`c013290`.
  The three apps were read only for usage counts and live reach.
- **Six areas:**
  - `BUG`: latent defects in hooks, lib, overlays, DataTable, the pickers, and the
    0.33 / 0.34 code;
  - `DUP`: logic written more than once, and where the copies drifted;
  - `MOD`: module structure, file size, bundle;
  - `API`: the public API and its types;
  - `TST`: tests, tooling, build, CI;
  - `DOC`: styling, i18n, docs, showcase.
- **Rules** (`brief.md`):
  - read-only: no suite, build or check run, because other sessions ran heavy checks on the
    16 GB machine;
  - evidence or it isn't filed;
  - nothing re-reported that round 0.34 already planned or deferred
    (`round-034-candidates.md`);
  - the two earlier audits checked for regressions and open items: `refactor-plan-2026-08-24.md`,
    `module-audit-2026-09-22.md`.
- **Earlier audits:**
  - **2026-08-24:** every U-1…U-14 fix still holds. U-2's exponent class survives in two
    helpers that audit never touched (BUG-11).
  - **2026-09-22:** most items are fixed. Still open:
    - "only Modal manages focus" has one remnant, DataTable's phone filter sheet (BUG-7b = DUP-6);
    - the tree-shaking assertion (MOD-6);
    - axe in the showcase (DOC-10);
    - `ALTERNATIVE_PRESETS` (API-6c);
    - the `@eifi1/ui-kit/testing` stubs (TST-10);
    - `#64748b` in chart.tsx, and kastlan's redefined `dark` variant (DOC, "earlier audits").
- **Checked and clean** (details in each report's last section):
  - no runtime import cycles, and no dead modules beyond `floating-stack`'s pair;
  - no `any` written in public types, and no declared prop leaks onto the DOM;
  - all seven catalogues have the same 1,127 keys, and no component hard-codes English;
  - none of the 0.34 code has a defect: session refresh, saveBlob, the window title,
    HelpPopover, groups in the audit log, the chart thinning;
  - CI's reuse path, release staging, Pages and Dependabot all work.

## Decisions for Marcel

1. **Fold Wave 0 into 0.34 before it is cut?** *Recommend: yes.*
   - What it is: the sev-4 and sev-3 bugs, plus a handful of XS/S items that otherwise
     cost the apps a second migration or block the 0.34 release itself.
   - Cost: everything is S or XS, with no breaking change.
   - Why now: 0.34 isn't released, and the apps adopt it next, so they would take the fixes
     in the same pass.
2. **The truncation sweep in CI on the release PR?** *Recommend: yes, for the sweep only.*
   - The local-first rule (2026-09-25) has two reasons: Actions cost, and failing pipelines.
   - The cost reason doesn't apply here. Eifi1/ui-kit is public, and GitHub billed 0 ms for
     its runs (TST-6).
   - The sweep takes 25 minutes and a Chromium on the shared machine, which is where the
     memory kills happened.
   - "Stop failing pipelines" still argues for keeping everything else local.
   - Coverage-only-in-CI (TST-4) is the same question. *Recommend: keep coverage local,
     but raise its floors so it means something.*
3. **React 19 ref-as-prop across the kit (MOD-4 with API-2 / API-3)?** *Recommend: yes, in
   0.35, together with the ui.tsx split.*
   - It changes public types from `ForwardRefExoticComponent` to function components. That
     is source-compatible, with a CHANGELOG line.
   - It gives ~80 components a `ref`, and cuts the cost of importing `{Spinner}` by 85 %.
4. **The contract consolidation pass (DOC-1)?** *Recommend: one docs-only pass in 0.35.*
   - Fold every review log and adopt-doc deviation into the section it amends.
   - Archive the history.
   - Keep every § number: the code cites them 491 times.
5. **Prune the public surface (API-6 = MOD-10)?** *Recommend: deprecate in 0.35, remove in
   0.36.*
   - About 28 names; each removal costs each app 0–3 call sites.
   - Only for names that are unused and not in the showcase.

## Wave 0 — into 0.34, before the release — DONE 2026-10-12

Built and committed on `feat/0.34.0`, each bug with a regression test seen failing first.
The commits: `4a096a8` (BUG-1, BUG-4, BUG-7b, BUG-2, BUG-14), `2d37551` (DUP-3, API-1,
BUG-6, BUG-11), `82db9b3` (BUG-3, BUG-13, TST-5, TST-6, decision 2's CI sweep), `566bbff`
(TST-7), `987a1ab` (DOC-2's user-admin part), `fc761ce` (DOC-3's Lemon Squeezy part).

Each item is independent, internal, S or XS, and gets its regression test written
failing-first.

### Bugs

- **BUG-1 (sev 4).** Pressing Escape in an open picker list inside a Modal, DialogFrame or
  FullBleedDialog closes the whole dialog and loses the form. PROVEN twice, by BUG and by
  DUP.
  - Live: kastlan's lease dialog (EntityCombobox ×15 files), keksdose's product-merge
    modal, and AmountInput's currency chip.
  - Fix: the panel key handlers (ComboboxPanel, DropdownSearchHeader, Combobox,
    InlineEntityCombobox) take Escape themselves, with `preventDefault` + `stopPropagation`,
    as Autocomplete does.
  - DUP-1's single Escape stack is the structural follow-up in Wave 2.
- **BUG-2 (sev 3).** DataTable's date filter compares the UTC day while the cells show the
  local day. All three apps' feedback inboxes misfile rows from 00:00 to 02:00. Fix:
  `toLocalIso` in `rowMatches` and `dateColumn`.
- **BUG-3 (sev 3).** `useAuthedSrc` returns a revoked object URL as "ready". Reopening a
  photo in Lightbox shows the error state: kastlan's offline handover photos, keksdose's
  invoice pages.
- **BUG-4 (sev 3).** The focus trap counts `tabindex="-1"` buttons as tab stops, so Tab
  escapes the DatePicker and MonthPicker popovers and the phone picker sheet. Fix: filter
  `tabIndex >= 0`.
- **BUG-7b = DUP-6 (sev 3).** DataTable's phone filter sheet is the last hand-rolled modal:
  `aria-modal`, but no focus move, no Escape and no name. Fix: render it on `Modal` +
  `DialogFrame`.
- **BUG-6 (sev 2, XS).** In German, "0.500" reads as five hundred in every number and amount
  field (keksdose). Fix: the thousands rule needs a leading digit 1–9.
- **BUG-11 (sev 2, XS).** `roundToCurrency(0.1+0.2−0.3)` gives NaN, and AmountInput blanks
  "0.0000001" or a 22-digit amount on blur. keksdose's FX row can show "NaN". Fix: one
  `roundHalfAway`, and never −0.
- **BUG-14 (sev 1, XS).** An empty, paged table says "1–0 / 0".
- **BUG-13 (sev 1, XS).** Five modules use `useEffectEvent`, which needs React 19.2, but the
  peers say `>=19`. Fix: peers `>=19.2`.

### Avoiding a second migration for the apps

- **DUP-3 (sev 2).** Fields locked through `commit` (0.34's C2) show their reason only as a
  tooltip on phones and at Large; Button shows it as a line, as text-size §4 asks.
  - Fix: one lock-reason frame (`LockedReason` asking `useDisabledReasonLine`), with
    `ReasonFrame` and `ChipReasonFrame` deleted.
  - Do it before the apps roll out C2, so they see one behaviour.
- **API-1 (sev 2).** Sixteen components still take only camelCase `ariaLabel`: AmountInput,
  MoneyField, NumberInput, NumberField, IntegerField, the Rhf number twins, WizardStepper
  and the top-bar menus.
  - Fix: accept `aria-label` on all sixteen and deprecate `ariaLabel` (removed in 0.35).
  - Then 0.34's adoption note has one rule for all twenty components (kk 24, ka 23, KS 1
    sites), not four now and sixteen later.

### The release itself

- **TST-5.** `npm run release` now runs the sweep, which borrows keksdose's playwright-core
  1.63; that expects Chromium 1243, and 1234 is installed.
  - Add `playwright-core` `~1.63.0` as a devDependency.
  - Document the browser install.
  - Run the sweep's own fixture test first.
- **TST-7 = DOC-5.** Regenerate the README export inventory (14 exports missing), and put its
  `--check` into `check:build`.
- **DOC-2, user-admin part.** §4's action list and column table lack the six 0.34 words and
  the group columns that kastlan and Kurvenschmiede implement from this round. That is
  about 5 lines.
- **DOC-3, Lemon Squeezy part.** The showcase's billing blurb names Lemon Squeezy (15
  places); fix it at the server-kit 0.8 sync.

Then the round's full check, the sweep, and the release as planned.

## Wave 1 — guards and tooling first (0.35)

These make every later wave cheaper and safer. Do them in this order.

- **TST-1 (sev 3, PROVEN).** `npm run check` should default to serial and stop at the first
  failing group.
  - The parallel default failed today: 30 minutes, an OOM kill, 25 timeouts.
  - Serial passed three times in 355–576 s.
  - Document `CHECK_PARALLEL`.
- **TST-2 (sev 3, PROVEN).** The pre-push hook should skip tag-only pushes (355 s each).
  - Optional: skip a tree already checked green.
  - Warn about uncommitted changes, which the hook checks today instead of the commit.
- **TST-3 (sev 3).** Declarations should come from `tsc --emitDeclarationOnly`, not
  rollup-plugin-dts.
  - The DTS worker peaks at 5.2 GB: it is the process the OOM killer took, and `npm run dev`
    can't run it.
  - The published `.d.ts` changes shape (one file per module), so verify a packed tarball
    against one app's `tsc`.
- **MOD-6.** Make the graph check guard the regression it was written for:
  - only `/chart` modules may import recharts;
  - the module-count floor matches the source count;
  - a cycle check;
  - pin `/dates`;
  - a byte budget for `{Button}`, `{Spinner}` and the shell set.

  It measures MOD-1, MOD-2 and MOD-4, so it comes before them.
- **TST-4 + TST-12.** Write tests for `theme-store` (`applyPersistedTheme` runs first in every
  app and is untested) and the DataTable filter popover. Then raise the coverage floors from
  76/73/67/66 to the real figure minus ~1 pp.
- **DOC-11 = API-8.** Make the deprecation policy enforceable:
  - a test that every `@deprecated` names its version and fails two minors later;
  - the docs say where deprecations are listed, since the generated CHANGELOG has no place
    for them;
  - replace the 15 bogus issue links once.
- **DOC-9.** A test that every exported component is on a showcase page, and every listed
  name is a real export. Today 46 rendered components are on no page and QrCode can't be
  found by search.
- **DOC-3, guard part.** A test that parses the README peer table against `peerDependencies`.

## Wave 2 — one implementation for shared behaviour (0.35)

These are internal, apart from visible fixes. They are ordered by dependency, and each
removes a class of drift.

- **DUP-1 (sev 3).** One Escape stack in `use-dismiss.ts`, LIFO like `use-overlay-history`,
  with one claim rule (`claimEscape(e)`), registered by every overlay and picker.
  - Five different "who owns Escape" rules exist today, and Modal and FullBleedDialog
    disagree with each other.
  - Add a sweep test: every picker inside both dialogs.
- **BUG-5 + BUG-9.** The phone picker sheet ignores the keyboard: arrows, Enter and
  active-descendant all fail. An IME composition's Enter picks an option.
  - Fix: route the sheet's search keys into ComboboxPanel, and add one `isImeEnter` guard.
- **DUP-2 (sev 3, PROVEN).** The "FieldHint becomes the caption" rule is restated in 7
  fields and missing in 7 more.
  - Missing in: CountrySelect, CurrencySelect, OneTimeCodeInput, Slider, SwatchPicker,
    IconPicker and every Rhf twin.
  - Live in Kurvenschmiede's controller panel (6 sites).
  - Fix: every field resolves `hint` through `useFieldHint` / `useFieldMessages`, and the
    034 test becomes a real sweep.
- **DUP-8.** One exported `useFieldError` and `FIELD_ERROR_CLASS`; `useComboboxFieldError`
  and about 10 inline copies are deleted.
  - Fixes Autocomplete not painting `aria-invalid`.
  - Fixes MultiSelect leaving `id` / `aria-*` on its wrapper.
- **DUP-11.** Shared small helpers:
  - `hasContent`, written 14 times;
  - `assignRef` / `mergeRefs`, written 5 times; API-2 needs it too;
  - `httpStatusOf` for session refresh;
  - `removeStored`;
  - one `prefersReducedMotion`; the two copies disagree when `matchMedia` is missing;
  - `decimalMark`, with `formatIsoDate` taking an undefined locale.

  Do each inside the PR that touches the file anyway.
- **DUP-7.** One `anchoredInline` for horizontal placement, using Tooltip's `clientWidth`
  lesson. Popover, Dropdown, HoverMenu and the AppShell flyout still clamp against
  `innerWidth`.
- **DUP-4 + DUP-5.** One picker foundation:
  - CurrencySelect, MultiSelect and GroupedPicker move onto `ComboboxPanel`, which gives them
    the phone sheet, anchoring (dev#548) and announcements;
  - AmountInput's currency chip renders the extracted `CurrencyOptionList`, ending a
    drifted copy;
  - one `foldForSearch` / `rankMatch`, so "zurich" finds Zürich in every list.
- **BUG-12.** CurrencySelect and GroupedPicker announce roles they don't implement. This is
  fixed by DUP-4, plus `aria-current`.
- **BUG-10.** DataTable's number filter reads through `readTyped`, as the number fields do,
  with `Number.isFinite` guards.
- **DUP-9.** Every Rhf twin's props become `Omit<FieldProps, Bound>`; `Pick` lists drop new
  props silently.
  - RhfSelect and RhfCheckbox drop the lock today.
  - RhfMoneyField and MoneyField share one `useMoneyDraft`.
  - Add a type test.
- **K5 follow-up (keksdose run 78).** 0.34 fixed the half-strength focus line at fractional
  device-pixel ratios (125 %) on DatePicker's stepper only. Every single field's focus has the
  same problem: `FIELD_BASE` draws a 1 px `focus:border-brand` with a ring colour but no ring
  width, and `FIELD_DISPLAY`'s bottom line does the same. `FIELD_INVALID` already pairs the
  border with `ring-1` for this reason (live #295). Fix: an inset 1 px focus ring in
  `FIELD_BASE` and `FIELD_DISPLAY`, with the apps' class assertions in the adopt doc.
- **BUG-11 follow-up.** NumberField's own `roundTo` (`toFixed`, so 1.005 → 1.00 and −0.004 →
  −0) is a third rounding copy; it should use 0.34's `lib/round.ts` `roundHalfAway`.
- **DUP-10.** One `useNumericField` engine for NumberInput and AmountInput, done last in this
  wave, once DUP-2, DUP-3 and DUP-8 have shrunk what moves. AmountInput also gains `locale`.

## Wave 3 — structure and refs (0.35, with decision 3)

- **MOD-2 + MOD-4 + API-2 + API-3.** Split `ui.tsx` (4,295 lines, ten components, 101
  importers, 43 commits in 30 days) along the DAG it already has, then convert to
  ref-as-prop.
  - New modules: `button-look.ts` (it breaks the Button ⇄ IconButton knot), `button`,
    `icon-button`, `field-base`, `input`, `select`, `textarea`, `card`, `spinner`,
    `empty-state`, `tabs`.
  - `ui.tsx` stays as a re-export shim.
  - In the same lines, convert the 25 `forwardRef` sites to ref-as-prop, and give a `ref` to
    the 79 components that spread props but take none (67 by type only; 12 with
    `mergeRefs`) and to the 10 focusable fields without one.
  - The six `useFocusHandle` id lookups in /rhf become `ref={field.ref}`.
- **MOD-3.** Bring DataTable from one 1,740-line function to under ~1,200 lines, in five green
  steps:
  1. row actions;
  2. `useColumnResize`;
  3. `useRangeSelection`;
  4. the mobile module (with DUP-6 done);
  5. `DataTableHead` and `ColumnSettingsPanel`.
- **MOD-5.** `index.ts` stops re-typing every subpath list: `export * from "./chart"`, etc.
  It regroups by folder, and `/data-table` gains its two missing types.
- **MOD-1.** Lazy-load the feedback dialog inside `useFeedbackSubmit`, and move the feedback
  vocabulary out of `feedback-inbox`.
  - That is 11 KB gzip off every app's entry chunk: 3 % of keksdose's and kastlan's first
    load, 6 % of Kurvenschmiede's.
  - Optionally the command palette too (5.5 KB).
  - App tests move to `findBy` after opening.
- **MOD-8.** Move four modules into their layer: account cards to `account/`, `useFilePicker`
  to `hooks/`, and the card title classes to `settings/`.
- **MOD-9.** Seams in the other large files (series-chart axes, date-field and range picker,
  inline-entity-combobox, chip edge-snap). Do them opportunistically, when a round touches
  the file anyway.

## Wave 4 — API conventions (0.35 deprecations → 0.36 removals)

- **API-4.** MultiSelect becomes generic `<V>`, takes `value` (with `values` deprecated) and
  `labels`, and optionally `disabledReason` / `commit`. All 5 app call sites cast today.
- **API-5.** Write the prop conventions into CONTRIBUTING as the checklist for a new
  component, with the outliers table. Rename only additively, when a component is touched.
- **API-6 = MOD-10.** Deprecate the ~28 runtime names no app or showcase uses (decision 5):
  - superseded label resolvers;
  - the chart-zoom maths;
  - `ALTERNATIVE_PRESETS`;
  - `FeedbackComposer` as the second name of `ChatComposer`;
  - the physical `align`;
  - /rhf's unused shadcn scaffold.

  Also deprecate the alias entries no app imports.
- **API-7.** `LanguageSetting` should be built on `LanguageSelect`, which gives every app's
  language picker its per-option `lang`.
- **API-9.** Types that say less than the code:
  - `labels` typed as `LabelOverride<X>` (deep), dropping three casts;
  - export `AmountInputProps` and `NumberInputProps`;
  - `ThemeSettingProps` as the union;
  - `label: ReactNode` on Combobox and ChipInput.

## Wave 5 — styling, i18n, docs, showcase, test hygiene (0.35+)

- **DOC-6 (PROVEN).** Thousands formatting differs between the catalogues: 5 counts print
  raw in all six translations, and 11 in English. Kurvenschmiede shows "1234 Punkte".
  - Fix: `n(…)` on those 41 lines, plus a parity test over all seven catalogues.
- **BUG-8 (PROVEN).** The colour deriver solves contrast before rounding to hex, so shipped
  presets hold sub-AA pairs, including the Contrast preset's 2.998 : 1.
  - Fix: measure the hex, and regenerate `DERIVED_PRESETS`.
  - A grey brand tints surfaces pink: scale the chroma.
- **DOC-7.** Four utility groups would replace about 61 of the 131 remaining `[var()]`
  classes: focus width (`ring-focus`), ring offset, ring on brand, money.
  - The tokens.css header that ships to npm is stale.
  - Pair it with Q6, the app lint rule, so the apps' class assertions move once.
- **DOC-1 (decision 4) + DOC-2.** Fold the contracts' amendments into their bodies, keeping
  the § numbers.
  - Fix the stale sections: feedback READY, the settings signatures, legal/Stripe, the i18n
    snapshot.
  - Status table per contract.
  - History goes to `docs/archive/`.
- **DOC-3 + DOC-4.** README and ADOPTING:
  - the corrected peer table;
  - "ships catalogues" in place of "ships no strings" (seven places);
  - the current RTL state;
  - the showcase as it is;
  - a generated "Styling" section (role utilities, `large:` / `contrast:`, the pre-paint
    script);
  - ADOPTING's provider and catalogue steps.
- **DOC-12.** Archive adopt-0.5…0.31 and MIGRATING.md, and add a `docs/README.md` index.
- **DOC-8 + DOC-10.** The showcase:
  - shared helpers move to `lib/section.tsx`;
  - version-named demo files (88) merge into one module per family, with a ratchet so the
    count only falls;
  - then axe on every page mount, deferred since 2026-09-22.
- **TST-8.** Showcase tests preload only the sections their pages render; today one shard is
  1.45 GB.
- **TST-9 + TST-10 + TST-11 + TST-13.** Test hygiene:
  - `toHaveClass` in place of the hand-rolled regexes;
  - `data-tone` for tone tests;
  - shared viewport and `refusal` fixtures (and in `@eifi1/ui-kit/testing` for the apps);
  - component-named test files;
  - fake timers in place of real sleeps that make negative assertions vacuous;
  - `user.paste` in the slow form tests.
- **TST-6.** The sweep's four variants run concurrently (≈25 → 7–8 min), whether locally or
  in CI (decision 2).

## Findings index

| ID | sev | kind | size | conf | wave | one line |
|---|---|---|---|---|---|---|
| BUG-1 | 4 | bug | S | PROVEN | 0 | Escape in a picker closes the surrounding dialog |
| BUG-2 | 3 | bug | S | PROVEN | 0 | DataTable date filter on the UTC day |
| BUG-3 | 3 | bug | S | PROVEN | 0 | `useAuthedSrc` revoked URL as ready |
| BUG-4 | 3 | bug | XS | PROVEN | 0 | focus trap counts tabindex −1 |
| BUG-5 | 2 | bug | S | PROVEN | 2 | phone picker sheet ignores the keyboard |
| BUG-6 | 2 | bug | XS | PROVEN | 0 | "0.500" = 500 in German |
| BUG-7 | 2 | bug | S | CONFIRMED | 0 (b) / 2 (a, c) | DataTable chrome: drawer tabbable, filter sheet, filter names |
| BUG-8 | 2 | bug | S | PROVEN | 5 | deriver rounds after solving contrast |
| BUG-9 | 2 | bug | S | PROVEN | 2 | IME Enter picks an option |
| BUG-10 | 2 | risk | S | PLAUSIBLE | 2 | number filter bypasses decimal marks |
| BUG-11 | 2 | bug | XS | PROVEN | 0 | rounding helpers give NaN / −0 |
| BUG-12 | 2 | consistency | S | CONFIRMED | 2 | CurrencySelect, GroupedPicker roles |
| BUG-13 | 1 | risk | XS | CONFIRMED | 0 | React peer `>=19.2` |
| BUG-14 | 1 | bug | XS | PROVEN | 0 | "1–0 / 0" |
| DUP-1 | 3 | bug | M | PROVEN | 2 | one Escape stack (BUG-1 is its hotfix) |
| DUP-2 | 3 | bug | S | PROVEN | 2 | FieldHint caption rule missing in 7 fields |
| DUP-3 | 2 | consistency | S | PROVEN | 0 | three lock-reason frames |
| DUP-4 | 2 | duplication | M | CONFIRMED | 2 | three picker foundations |
| DUP-5 | 2 | consistency | S | CONFIRMED | 2 | six text-matching rules |
| DUP-6 | 3 | bug | S | CONFIRMED | 0 | = BUG-7b |
| DUP-7 | 2 | bug | S | CONFIRMED | 2 | horizontal placement ×5 |
| DUP-8 | 2 | bug | S | CONFIRMED | 2 | field error wiring ×14 |
| DUP-9 | 2 | bug | S | CONFIRMED | 2 | Rhf twins' `Pick` lists drop props |
| DUP-10 | 2 | structure | M | CONFIRMED | 2 | two numeric-field engines |
| DUP-11 | 1 | duplication | S | CONFIRMED | 2 | small helpers restated |
| MOD-1 | 2 | efficiency | M | PROVEN | 3 | feedback dialog in every entry chunk |
| MOD-2 | 2 | structure | L | CONFIRMED | 3 | split ui.tsx |
| MOD-3 | 2 | structure | L | CONFIRMED | 3 | split DataTable |
| MOD-4 | 2 | efficiency | M | PROVEN | 3 | forwardRef + displayName block tree-shaking |
| MOD-5 | 2 | consistency | S | CONFIRMED | 3 | index.ts re-types subpaths, drifted |
| MOD-6 | 2 | tests | S | CONFIRMED | 1 | graph check misses its regression |
| MOD-7 | 2 | docs | XS | CONFIRMED | 5 | → DOC-3 |
| MOD-8 | 1 | structure | S | CONFIRMED | 3 | four modules in the wrong layer |
| MOD-9 | 1 | structure | M | CONFIRMED | 3 | seams in the other large files |
| MOD-10 | 1 | structure | S | CONFIRMED | 4 | = API-6 |
| API-1 | 2 | consistency | S | CONFIRMED | 0 | `ariaLabel` on 16 more components |
| API-2 | 2 | consistency | M | CONFIRMED | 3 | 79 components without a ref |
| API-3 | 2 | risk | S | CONFIRMED | 3 | 10 focusable fields without a ref |
| API-4 | 2 | consistency | S | CONFIRMED | 4 | MultiSelect not generic |
| API-5 | 1 | consistency | S | CONFIRMED | 4 | conventions unwritten |
| API-6 | 2 | structure | S | CONFIRMED | 4 | ~28 unused names to deprecate |
| API-7 | 2 | duplication | XS | CONFIRMED | 4 | LanguageSetting vs LanguageSelect |
| API-8 | 2 | docs | XS | CONFIRMED | 1 | = DOC-11 |
| API-9 | 1 | types | S | CONFIRMED | 4 | label types shallow, private props |
| TST-1 | 3 | efficiency | S | PROVEN | 1 | check parallel by default |
| TST-2 | 3 | efficiency | XS | PROVEN | 1 | pre-push re-checks tag pushes |
| TST-3 | 3 | efficiency | M | CONFIRMED | 1 | DTS build at 5.2 GB |
| TST-4 | 2 | tests | XS | PROVEN | 1 | coverage floors 20 pp low |
| TST-5 | 2 | risk | S | PROVEN | 0 | sweep borrows keksdose's playwright |
| TST-6 | 2 | efficiency | S | PLAUSIBLE | 5 | sweep serial; CI is free |
| TST-7 | 2 | docs | XS | PROVEN | 0 | = DOC-5 |
| TST-8 | 2 | efficiency | S | PROVEN | 5 | showcase tests preload all sections |
| TST-9 | 2 | tests | M | CONFIRMED | 5 | class-string assertions |
| TST-10 | 2 | structure | S | CONFIRMED | 5 | version-named tests, copied fixtures |
| TST-11 | 2 | tests | S | CONFIRMED | 5 | real sleeps, vacuous negatives |
| TST-12 | 2 | tests | S | CONFIRMED | 1 | theme-store untested |
| TST-13 | 1 | efficiency | S | PROVEN | 5 | slow form tests |
| DOC-1 | 3 | structure | M | CONFIRMED | 5 | contracts amended outside their bodies |
| DOC-2 | 2 | docs | S | CONFIRMED | 0 (user-admin) / 5 | contract sections contradict src |
| DOC-3 | 2 | docs | S | CONFIRMED | 0 (LS) / 1 (guard) / 5 | README/ADOPTING/showcase prose wrong |
| DOC-4 | 2 | docs | M | CONFIRMED | 5 | no consumer doc teaches styling |
| DOC-5 | 2 | tests | XS | PROVEN | 0 | export inventory unguarded |
| DOC-6 | 2 | consistency | S | PROVEN | 5 | number formatting across catalogues |
| DOC-7 | 2 | structure | S | CONFIRMED | 5 | four more utility groups |
| DOC-8 | 2 | structure | L | CONFIRMED | 5 | showcase filed by version |
| DOC-9 | 2 | tests | S | CONFIRMED | 1 | component ↔ page index unchecked |
| DOC-10 | 2 | tests | M | CONFIRMED | 5 | axe per page (deferred since 09-22) |
| DOC-11 | 1 | consistency | S | CONFIRMED | 1 | deprecation policy vs practice |
| DOC-12 | 1 | structure | S | CONFIRMED | 5 | docs/ has no index; archive old adopts |

## What was not covered

- **server-kit** was not in scope. Its own `scripts/check.sh` holds it at 100 % coverage
  with mypy --strict.
- **Visual layout** was not measured in a browser. The bugs above are logic, ARIA and focus;
  the truncation sweep covers cut text.
- **Performance at runtime** (render counts, long lists) was looked at only where a finding
  touched it: `useAnchoredPanel`'s viewport update has no equality guard. That is noted in
  BUG.md, not filed.

## Commit ids

On 2026-10-12, before the branch was first pushed, two commit headers over 100 characters
were reworded (`git filter-branch --msg-filter`; no tree changed). That gave every
`feat/0.34.0` commit after `origin/main` a new id. The audit reports quote the old ids:

| before | after | commit |
|---|---|---|
| `05309f6` | `05309f6` | docs(contracts): session refresh and groups in the audit, drafts for r… |
| `b636b92` | `b636b92` | feat: HelpPopover for long help, write locks on text and money fields,… |
| `cddebdd` | `56eb4f2` | feat: Modal 2xl, one table storage prefix, saveBlob, settings window t… |
| `c1aff8d` | `82fce48` | docs(contracts): session refresh and groups in the audit, settled afte… |
| `7cd486c` | `0bf08ee` | feat: SeriesChart maxRows, the truncation sweep gates releases, wrap-a… |
| `c8b553c` | `435992a` | fix: the last five texts the truncation sweep cut at Large |
| `7dade18` | `f6b8521` | feat(admin)!: groups in the audit log — five words, group targets, the… |
| `116d2b6` | `7ee9fb5` | feat(auth): attachSessionRefresh — one refresh per tab, a definitive e… |
| `9037748` | `843762d` | feat!: the English catalogue in one chunk; aliases deprecated in 0.32 … |
| `e553d7e` | `3f8806e` | docs(billing): a manual grant clears trial_ends_at (§14.17) |
| `67c1bfa` | `f7f37ea` | feat(admin): PlanChangeConfirm's usage takes planColumn's shape, so it… |
| `d6212d6` | `0b34633` | refactor: the kit's own markup on the role utilities; the role-class b… |
| `e88f3d4` | `91c64c4` | docs: what round 0.34 changed in the contracts and in CONTRIBUTING |
| `c013290` | `eebdb30` | docs: adopt-0.34.md, the apps' list for ui-kit 0.34 and server-kit 0.8 |
| `efbd207` | `6eb9da4` | docs: the 2026-10 refactor plan, from a six-area audit of feat/0.34.0 |
| `557bce2` | `a200e06` | fix: a strip's label clears its group's border; the stepper's focus li… |
| `a580384` | `56e1256` | docs(refactor-plan): Marcel's decisions; the K5 follow-up for every fi… |
| `e00cceb` | `987a1ab` | docs(user-admin): §4 names the 0.33/0.34 audit words and group columns… |
| `64c914b` | `fc761ce` | docs(showcase): the billing page names Paddle's webhooks alone; server… |
| `080e173` | `82db9b3` | fix: a reopened photo shows no revoked URL; React >=19.2; the release'… |
| `6574ed9` | `4a096a8` | fix: Escape closes only a picker's list in a dialog; tabbable traps; t… |
| `5e5ea3f` | `2d37551` | fix: one lock-reason frame with its line on phones; aria-label on 16 m… |
| `12071e8` | `566bbff` | build: check:build fails on a stale README export inventory; the barre… |
| `79c6c3a` | `bfe6297` | docs: adopt-0.34 gains Wave 0 and keksdose's run 78; the refactor plan… |
| `c26deaa` | `4426662` | fix(showcase): the series-chart and user-admin page blurbs in all seve… |
