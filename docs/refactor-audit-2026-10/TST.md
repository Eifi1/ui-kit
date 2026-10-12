# TST — tests, tooling, build and CI (refactor audit 2026-10)

**Summary.** 13 findings: sev 3 × 3, sev 2 × 9, sev 1 × 1. No live app defect (no sev 4); the costs land on the shared 16 GB machine and on every release.
**Top 3:** TST-1 `npm run check` defaults to the parallel mode, the one mode that failed today (30 min, OOM kill, 25 timeouts), while the three serial runs passed in 6–10 min · TST-2 the pre-push hook re-runs the whole 6-minute check on a **tag** push (v0.33.1: 355 s) · TST-3 the declaration build is rollup-plugin-dts over ~400 entries at 5.2 GB. That is the process the OOM killer took, and `npm run dev` cannot run it at all.
Next in value: TST-4 the coverage "ratchet" sits ~20 pp under the real figure, and coverage doubles test CPU (measured) · TST-5 the release gate runs on keksdose's playwright-core with a Chromium revision that client does not support.
Measured here (one file at a time, after `wait-mem.sh 3000`, cache redirected to the scratchpad, nothing written to the repo): register-form 13.0 s → 26.6 s with coverage; with `user.paste` instead of `user.type` 8.2 s against 12.2/14.9 s; showcase shard 1 alone 16 s at 1.45 GB RSS; translation-review-0251 alone 14 s (TST-13).

Sources used throughout: today's check logs in the session scratchpad
(`/tmp/claude-1000/-home-marcel-ui-kit/82854fec-…/scratchpad/{push-0331,push-0331b,check-0331,tag-0331}.log`),
the vitest results cache (`node_modules/.vite/vitest/da39a3…/results.json`, 473 files, the last
ui-kit-034 run), the 0.33.1 coverage report (`/home/marcel/ui-kit/coverage/lcov.info`, 2026-10-12 15:46),
and the GitHub API (runs, jobs, timing, Dependabot). All file:line refs are in `/home/marcel/ui-kit-034`.

---

### TST-1 · sev 3 · efficiency · S · PROVEN · touches: `scripts/check.mjs`, `.husky/pre-push`, `CONTRIBUTING.md`
- What: `npm run check` runs its three groups side by side unless `CHECK_SERIAL` is set. On this machine that mode freezes in swap. Today the only parallel run failed after 30 minutes, and the three serial runs all passed. The safe mode is opt-in and appears in no contributor doc. Since 2026-10-06 the sessions have used it by habit (memory note), and the one push that forgot it is the failure below.
- Evidence: `scripts/check.mjs:61-64` (parallel unless `CHECK_SERIAL`). `push-0331.log`, 14:58, parallel (total 1806 s = the longest group):
  - `check:build` ran 1496 s and was `Killed` right after `ESM ⚡️ Build success in 1266ms`, i.e. in the DTS stage, see TST-3.
  - `check:test` ran 1806 s: 31 failed of 5,753, 25 of them `Test timed out`. Single tests "took" 690 s (`fields-023 … 691293ms`, `toast … 689813ms`), so the event loop sat frozen in swap. These are not slow tests.
  - Same day, serial, all green (total = sum of the groups): `check-0331.log` 576 s (116+361+99), `push-0331b.log` 372 s (17+281+74), `tag-0331.log` 355 s (17+230+108).
  - Peaks: the test group is ~5 GB (`vitest.config.ts:59-67`) and the DTS build 5.2 GB (`scripts/tsup-quiet.mjs:38-42`). That is ≥10 GB together, against ~6.1 GB available with the other sessions (`free -m` during this audit).
  - `CHECK_SERIAL` appears only in `check.mjs:13-18`, not in CONTRIBUTING.md. Memory `pending-0-6-2.md:286` records "Swap full (4G) on this machine → use CHECK_SERIAL=1".
  - Serial mode has no fail-fast either (`check.mjs:63`): a type or lint error in static (17 s) still runs ~4 min of tests and ~1.5 min of build.
- Fix:
  - Make serial the default. Run parallel only with `CHECK_PARALLEL=1`, or automatically when `/proc/meminfo` MemAvailable is ≥ 12 GB. CI is unaffected, since it runs the groups as separate jobs (`ci.yml:79-100`).
  - In serial mode stop at the first failing group, in the order static → build → test (17 s, ~90 s, ~4 min).
  - Optionally cap the test group's `maxWorkers` (keksdose's own check runs `vitest run --maxWorkers=3`; the kit uses the default 7 on 8 cores). The table in `vitest.config.ts:63-67` shows 6 workers cost 169 s against 160 s with 7, at 4.7 GB against 5.1 GB.
  - Document the switch in CONTRIBUTING "The gates".
  - Blast radius: none. No API, no app.
- Saves: the failure mode (30 min, then a re-run). With fail-fast, ~5.5 min on every static failure.
- Order: independent. TST-3 may later make parallel fit again; re-measure then.

### TST-2 · sev 3 · efficiency · XS · PROVEN · touches: `.husky/pre-push`
- What: the pre-push hook is the single line `npm run check` (`.husky/pre-push:1`). It runs the full check for **any** push. That includes `git push origin vX.Y.Z` (release step 5) and re-pushes of an identical tree, such as an amended commit message.
- Evidence:
  - `tag-0331.log`: pushing the tag v0.33.1 ran the whole check, 355 s, before ` * [new tag] v0.33.1`.
  - That tag sits on the merge commit. Its tree is the PR branch's tree, which the branch push already checked (`push-0331b.log`, 372 s) and CI tested: the main run 38257467158 took 25 s because `reuse` matched the tree (`ci.yml:43-77`).
  - `release.yml:51-73` refuses to stage a commit whose CI run on main is not green, so the local re-check adds nothing.
  - The hook also checks the **working tree**, not the pushed commit, so uncommitted edits are what gets tested.
- Fix:
  - Read the refs git hands the hook on stdin. Exit 0 when every pushed ref is `refs/tags/*` or a delete (all-zero local sha), with one line saying why.
  - Optionally stamp the tree. After a green check on a clean tree, write `node_modules/.cache/check/<HEAD^{tree}>`. When the pushed tip's tree has a stamp, run only `check:commits`: messages are not part of the tree, and it takes ~1 s.
  - Warn, or refuse, when `git status --porcelain --untracked-files=no` is non-empty.
  - Blast radius: none.
- Saves: ~6 min (355 s) per release tag, plus one full check per message-only amend that is pushed again.
- Order: none.

### TST-3 · sev 3 · efficiency · M · CONFIRMED · touches: `tsup.config.ts`, `scripts/tsup-quiet.mjs`, `package.json`, `scripts/gen-export-inventory.mjs`
- What: declarations come from tsup's DTS worker. That is rollup-plugin-dts bundling ~400 unbundled entries; it needs a 6 GB heap and peaks at 5.2 GB resident. With `bundle: false` the roll-up step buys nothing: the JS graph is per module anyway, and the d.ts graph only gains hashed chunks. This is the process that was OOM-killed today, and `npm run dev` cannot run it at all.
- Evidence:
  - `tsup.config.ts:35-36` (`bundle: false`, `dts: true`); `scripts/tsup-quiet.mjs:38-42` (the comment records the peak and the 0.32 OOM; heap ceiling 6144 MB).
  - `push-0331.log`: `ESM … Build success in 1266ms` then `Killed`. The JS took 1.3 s; the DTS stage is what died.
  - The output carries roll-up chunks such as `dist/data-table-labels-JB3QDdVB.d.ts`, `dist/column-mapper-CuPcHUHm.d.ts` and `dist/delete-account-setting-labels-BFI8JSHO.d.ts`.
  - `package.json` `"dev": "tsup --watch"` bypasses `tsup-quiet.mjs`, so it runs at Node 24's default heap: `heap_size_limit` = 4,288 MB here, below the 5.2 GB peak. It is documented nowhere (CONTRIBUTING lists only `dev:showcase`).
- Fix:
  - Set `dts: false`, and add a declaration step: `tsc -p tsconfig.build.json --emitDeclarationOnly --declaration --outDir dist`, incremental, with its own tsbuildinfo.
  - `scripts/fix-esm-extensions.mjs` already rewrites `.d.ts` specifiers (`:10`, `:22-36`), so the d.ts output stays valid ESM.
  - `dev` becomes `tsup --watch` plus `tsc -w --emitDeclarationOnly`, or is deleted.
  - Blast radius:
    - The published d.ts shape changes: one file per module, no hashed chunks, the same exported names. `public-surface.test.ts` pins the runtime surface.
    - `gen-export-inventory.mjs` traces the hashed chunks (`:14-20`) and must be simplified (TST-7 runs it).
    - Run `check:package` and one app's `tsc` against a packed tarball before release.
  - No app code change.
- Saves: PLAUSIBLE ~4 GB of peak memory (a tsc program for this size is ~1 GB; `typecheck` already builds one) and the DTS roll-up time of `check:build` (74–108 s today). It probably also lets TST-1's parallel mode fit again.
- Order: before TST-7's script change; re-measure TST-1 after.

### TST-4 · sev 2 · tests · XS · PROVEN · touches: `vitest.config.ts`
- What: the coverage gate is described as a ratchet (`vitest.config.ts:96-112`, "raise these … in the same commit that earns it"), but the floors have not moved since 0.5.0. They sit ~20 pp under the real figures, so the suite can lose a fifth of its coverage and stay green. Meanwhile instrumentation roughly doubles test execution time (measured on one file).
- Evidence:
  - The floors are lines 76, statements 73, functions 67, branches 66 (`vitest.config.ts:113`), set in bf8a311 (2026-09-23). `git log -S"thresholds: {"` shows no change since.
  - Actual on 0.33.1 (`/home/marcel/ui-kit/coverage/lcov.info`, 320 files): lines 96.7 %, functions 95.7 %, branches 91.5 %.
  - Cost, PROVEN: the same file (register-form.test) took 13.0 s → 26.6 s, with RSS 540 → 661 MB, without and with `--coverage`. The run reports "tests 92 %", i.e. the slowdown is in execution, not in the report.
- Fix:
  - Set the floors to the measured figure minus ~1 pp: lines 95, functions 94, branches 90, and statements from the next run's text-summary. That makes the gate mean something. XS, no blast radius.
  - Decision for Marcel: coverage buys only this gate. Running the coverage leg only in CI's `check:test` job, with a plain `vitest run` locally, would roughly halve local `check:test` (230–281 s today) and its memory. It is a departure from local-first for one check. If local-first stays, raising the floors is still the minimum.
- Order: none.

### TST-5 · sev 2 · risk · S · PROVEN · touches: `package.json`, `scripts/screenshot-sizes.mjs`, `CONTRIBUTING.md`
- What: the release gate `check:sweep`, which the round has already decided on, depends on keksdose's `node_modules`. It drives a Chromium revision the client it borrows does not pin. Its own fixture test runs nowhere.
- Evidence:
  - `screenshot-sizes.mjs:140-150` tries `$PLAYWRIGHT_CORE`, then `./node_modules/playwright-core` (absent: not in `package.json` or the lockfile), then `../keksdose/node_modules/playwright-core`.
  - That client is 1.63.0, whose `browsers.json` pins chromium-headless-shell **1243**. `~/.cache/ms-playwright` holds only `chromium_headless_shell-1234` (installed 2026-08-19). kastlan's 1.63.0 also expects 1243.
  - `findChromium` (`:152-166`) takes the lexicographically newest directory and forces it through `executablePath` (`:395`). So the gate runs a 1.63 client against a 1234 browser: it works today, but it is unsupported. Any keksdose bump or cleanup changes or breaks the kit's release. A clean clone has no instruction to install either; CONTRIBUTING never mentions playwright.
  - `scripts/screenshot-sizes-fixture.test.mjs` (the measures' own test) is wired into no script.
- Fix:
  - Add `playwright-core` as a pinned devDependency (`~1.63.0`). It has no postinstall and downloads no browser; Dependabot's `npm-minor-patch` group then tracks it.
  - Document `npx playwright-core install chromium-headless-shell` in CONTRIBUTING "Cutting a release".
  - Launch with playwright's own executable unless `CHROMIUM` is set.
  - Start `check:sweep` with the fixture test (one page, seconds), so the gate checks itself before the 25 minutes.
  - Blast radius: none for apps; ~8 MB in devDependencies.
- Order: before the 0.34 release that first uses the gate.

### TST-6 · sev 2 · efficiency · S · PLAUSIBLE · touches: `scripts/screenshot-sizes.mjs`
- What: the sweep (~25 min per CONTRIBUTING.md:350) is 324 page loads in series, each with ≥1.1 s of fixed waiting. The stated reason to keep it off CI is cost, and that premise does not hold for this repository.
- Evidence:
  - `screenshot-sizes.mjs:398-419`: one page, variants × pages in series. Each run does `goto about:blank`, then `goto … networkidle` (≥500 ms quiet; a page that never goes quiet costs the 15 s timeout plus a 1.5 s sleep), then `waitForTimeout(600)`.
  - `showcase/src/routes.tsx` has 81 slugs; × 4 variants = 324 runs, ≈4.6 s each over 25 min.
  - "Actions cost" is the reason given for keeping Chromium out of CI (`screenshot-sizes.mjs:33-35`, round-034 T1). But Eifi1/ui-kit is public (`gh api repos/Eifi1/ui-kit` → `visibility: public`), and GitHub bills **0 ms** for its runs (`gh api …/runs/38256898177/timing` → `total_ms: 0` over 5 jobs).
- Fix:
  - Run the four variants concurrently in four contexts of the one browser (`Promise.all` over `VARIANTS`), buffer each variant's lines, and print them in order. Estimate: ~25 → 7–8 min, for 3 more renderer processes (~0.5–1 GB).
  - Optionally have the showcase set a `data-sections-ready` flag once its lazy sections have mounted, and wait for that instead of networkidle + 600 ms.
  - Decision for Marcel (not re-proposing T1): since CI is free here, a CI job on the release PR (Chromium via `playwright-core install`) would take the 25 minutes off the shared machine. The other half of local-first, "stop failing pipelines", is the real trade-off.
  - Blast radius: none.
- Order: after TST-5 (same script).

### TST-7 · sev 2 · docs · XS · PROVEN · touches: `package.json`, `CONTRIBUTING.md`
- What: README's export inventory is stale on feat/0.34.0. Its staleness check exists, but no gate runs it; it is a manual release step that also rebuilds `dist`.
- Evidence:
  - `node scripts/gen-export-inventory.mjs --check` (read-only; dist built 17:34, after the last `src/index.ts` change at 16:29) exits 1. The 14 exports the README does not name: `saveBlob`, `filenameFromDisposition`, `useKitTableStorageKeyPrefix`, `HelpPopover`, `HelpPopoverProps`, `SessionRefresh`, `SessionRefreshOptions`, `SessionRefreshOutcome`, `SessionRenewal`, `attachSessionRefresh`, `createSessionRefresh`, `isSignedOutStep`, `isTransientRefreshFailure`, `SettingsDocumentTitleParts`.
  - The script is referenced only by CONTRIBUTING.md:89 and :346 (release step 2, `npm run build && node scripts/gen-export-inventory.mjs`) and README.md:376-387. The README is the npm landing page, and the apps' agents read it.
- Fix:
  - Append `&& node scripts/gen-export-inventory.mjs --check` to `check:build` after `check:package`. `dist` is fresh there and the check takes milliseconds.
  - Drop release step 2.
  - Regenerate the block once on feat/0.34.0.
  - Blast radius: none.
- Order: with TST-3 if the d.ts shape changes, because the script parses it.

### TST-8 · sev 2 · efficiency · S · PROVEN · touches: `showcase/src/__tests__/showcase-harness.tsx`, `showcase/src/__tests__/page-shard.tsx`, `showcase/src/__tests__/server-kit-pages.test.tsx`, `showcase/src/lib/lazy-section.ts`, `scripts/gen-showcase-search-index.mjs`
- What: every test file that mounts the real showcase preloads **all** 253 lazy sections. That includes each page shard (~20 pages each) and server-kit-pages, which renders only server pages backed by a single lazy section. These files are the suite's largest heaps, and they were the 60-s timeouts under load.
- Evidence:
  - `showcase-harness.tsx:48` `beforeAll(() => preloadAllSections(), 60_000)` → `lazy-section.ts:59-61`.
  - `routes.tsx` declares 253 `lazySection(…)` over 173 section files (2.6 MB).
  - `/server-*` pages render `ServerModules` (`routes.tsx:346`, `:423-425`): one section. Yet `server-kit-pages.test.tsx:14` preloads all of them; that file took 13.3 s in the last run.
  - PROVEN: `pages-shard-1.test.tsx` alone, without coverage, ran 16 s at **1.45 GB** max RSS, against 0.54 GB for a component test file.
  - Under load (`push-0331.log`): `/user-admin`, `/subscription`, `/shell`, `/data-table-parts` and `/feedback-inbox` timed out at 60 s.
- Fix:
  - Let `useShowcaseEnvironment({ pages })` preload only the sections the given pages render.
  - The slug → section-component mapping is exactly what `gen-showcase-search-index.mjs` already resolves from `routes.tsx` (header `:14-21`). Emit it into `examples.generated.ts` beside `PAGE_EXAMPLE_LABELS`.
  - server-kit-pages preloads `ServerModules` only.
  - Blast radius: tests only.
- Saves: PLAUSIBLE ~¾ of each shard's import time and heap (4 shards + server-kit-pages), i.e. ~1 GB less per concurrently running shard.
- Order: none.

### TST-9 · sev 2 · tests · M · CONFIRMED · touches: 198 test files, `src/test/`, the kit's toned components
- What: about a third of the test files assert class strings. A refactor that changes no behaviour therefore costs dozens of test edits, and half of those edits are a hand-rolled, looser copy of jest-dom's `toHaveClass`.
- Evidence:
  - d6212d6 (round 0.34 Q1, markup onto role utilities, no behaviour change) touched **83 test files, +316 −291 lines** (`git show --numstat`).
  - Across the suite there are 1,335 class assertions in 198 of 473 test files; 191 of them name a colour-role utility.
  - 121 regexes of the form `/text-warning(?![\w-])/` in 50 files (e.g. `action-card.test.tsx`, `alert-banner.test.tsx` in that diff) re-implement `toHaveClass`. Lacking a left boundary, they also match `hover:text-warning` and `md:text-warning`.
  - ≥8 private `const classes = (el) => el.className.split(/\s+/)` helpers (`tabs.test.tsx:34`, `layout-013.test.tsx:7`, `page-header-014.test.tsx:5`, `label-above-033.test.tsx:16`, …).
  - `data-tone` is emitted in only 4 places (`data-slot` in 68).
- Fix:
  - (a) Mechanical: `toHaveClass("text-warning")` where an exact token is meant.
  - (b) Where a tone or variant picks colours, emit `data-tone` / `data-variant`, pin the tone → class map once per component in a table test, and have every other test assert the attribute.
  - (c) Keep class assertions where the class *is* the subject: token discipline, truncate/text-size utilities (jsdom has no layout), the sweep markers.
  - Blast radius: tests, plus additive data attributes. Round 0.34 Q1 notes that kk's tests assert kit markup, so the attribute would give the apps a stable hook too.
- Order: after the 0.34 role-utility work lands; do (a) first.

### TST-10 · sev 2 · structure · S · CONFIRMED · touches: `src/**/__tests__/*`, `src/test/`, `src/testing/index.ts`
- What: one component's tests are spread over version- and report-named files, and each file carries its own copy of the same fixtures and environment stubs. The app-facing test harness the module audit asked for shipped without them.
- Evidence:
  - 82 of 473 test files carry a version suffix (`-023` …, `-0331`, `-034`). There are also report-named files mixing 2–12 components each: `keksdose-032-report-0321`, `kastlan-0321-report-0322`, `keksdose-m-0154`, `text-size-{behaviours,follow-ups,mechanism,sweep}-03x`, `px-cleanup-032`, `controls-0-12`, `surfaces-016`.
  - TranslationReviewPanel's tests are split over `translation-review`, `-025`, `-0251`, `-swipe-binding` and 3 more. Each defines its own `render` wrapper and catalogue fixture.
  - `stubPhone()` is defined 8 times. `matchMedia` is stubbed by hand in 25 files.
  - The axios-shaped `refusal()` fixture exists in 7 files with 5 different signatures (`register-form`, `sign-in-form`, `delete-account-setting`, `email-change-setting`, `admin-action-confirm`, `password-setting-errors-034`, `demo-start`).
  - The apps rebuild the same stubs: keksdose stubs `matchMedia` in 41 test files, KS in 4. keksdose wrote the correct helper, `frontend/src/test/viewport.ts:13-38` `stubViewportWidth`, which stays right at Large text where `md` is 960 px.
  - `src/testing/index.ts` exports only the CSS-variable guard. module-audit-2026-09-22.md:168 ("a test harness at `@eifi1/ui-kit/testing` … jsdom has no ResizeObserver") is still open.
- Fix:
  - Name files `<component>.<concern>.test.tsx`; the version stays in the describe or docblock, where it already is. Rename when a file is next touched, or in one `git mv` commit.
  - Add `src/test/viewport.ts` (`stubViewportWidth`, a ResizeObserver stub) and `src/test/fixtures.ts` (`refusal`).
  - Export the viewport and ResizeObserver stubs from `@eifi1/ui-kit/testing`. That is additive; apps adopt it at will.
- Order: before TST-11 (the shared stubs make fake-timer conversions shorter).

### TST-11 · sev 2 · tests · S · CONFIRMED · touches: `src/settings/__tests__/settings-layout.test.tsx`, `src/components/__tests__/toast.test.tsx`, `src/search/__tests__/{command-palette,command-palette-modes,global-search}.test.tsx`, `src/hooks/__tests__/use-overlay-history.test.tsx`
- What: these are the timing-sensitive tests. Several sleep in real time and then assert that something did **not** happen. Under load the deferred work simply has not run yet, so they pass whether or not the bug is there. One waits a real 1.8 s with 1.2 s of slack.
- Evidence:
  - Real sleep, then a negative assertion: `command-palette.test.tsx:68` (50 ms, then `search` not called again); `command-palette-modes.test.tsx:32` (200 ms, then not called with "bud"); `global-search.test.tsx:167` (100 ms, then still `/budget`); `use-overlay-history.test.tsx:429`, `:576` (50/30 ms).
  - `settings-layout.test.tsx:294` waits for the 1,800 ms ring (`use-settings-focus.ts:14`) under `{ timeout: 3000 }`.
  - `toast.test.tsx:20` sleeps 250 ms after each of its 16 tests (4 s), plus `:258`, `:272`.
  - The global settings absorb load rather than remove it: `asyncUtilTimeout: 5000` (`src/test/setup.ts:18`) and `testTimeout: 20_000` (`vitest.config.ts:36`).
  - The 25 timeouts of the parallel run (TST-1) do not identify timing-sensitive tests. Single tests there "took" 180–690 s (`toast.test` among them), which is a frozen machine. The patterns above are the ones that bend under ordinary load.
- Fix:
  - Fake timers plus `vi.advanceTimersByTime` / `vi.runOnlyPendingTimers()` (inside `act`) for every "after everything deferred has run" assertion.
  - settings-layout: fake timers, advance 1,800 ms.
  - toast: dismiss, then run the timers instead of sleeping.
  - Blast radius: tests only.
- Saves: ~6 s of wall time per run, and these tests regain the power to fail.
- Order: after TST-10.

### TST-12 · sev 2 · tests · S · CONFIRMED · touches: `src/theme/theme-store.ts` (new `src/theme/__tests__/theme-store.test.ts`), `src/components/data-table-filter-popover.tsx`
- What: the module every app runs first has the thinnest coverage in the kit. `applyPersistedTheme` (the no-flash bootstrap) and the pre-v2 storage migration are never executed by a test. The DataTable filter popover's handlers are mostly untested too.
- Evidence:
  - lcov 0.33.1: `theme-store.ts` lines 24/42, functions 13/20, branches 6/25 (the file is unchanged on feat/0.34.0).
  - Uncovered: `preferenceFromState` (`:42-46`), all of `applyPersistedTheme` (`:66-77`), migrate/onRehydrate (`:93-105`) and the system-follow listener (`:135-137`).
  - The only tests touching the module are incidental (`toast.test`, `contrast-032.test`).
  - Used by all three apps: keksdose `frontend/src/main.tsx:42` and `shared/state/theme-store.ts:8`; kastlan `frontend/src/shared/theme/theme-store.ts:8`; KS `frontend/src/main.tsx:38` and `shared/state/theme-store.ts:1`.
  - A regression shows as a theme flash or a wrong theme on load in every app, or as users' stored `mode` from pre-v2 blobs silently dropped.
  - Also `data-table-filter-popover.tsx`: functions 6/20, lines `115-118, 127, 134, 150, 184, 209, 218, 240-261` uncovered (0.34 changed only class strings there, line for line). That is the filter UI behind `filter:` columns, which kastlan uses in ~30 files.
- Fix:
  - A pure `theme-store.test.ts`, about 15 tests in milliseconds. Cases: v1 `{mode}`, v2 `{preference}`, malformed JSON and a throwing localStorage → the class on `<html>` and the return value; the store's `migrate`; the system listener with a matchMedia stub (TST-10).
  - One interaction test per filter type in the popover.
  - Then raise the floors (TST-4).
- Order: before TST-4's floor change.

### TST-13 · sev 1 · efficiency · S · PROVEN · touches: `src/components/__tests__/translation-review-0251.test.tsx`, `src/auth/__tests__/{register-form,sign-in-form,reset-password-form}.test.tsx`, `src/account/__tests__/{email-change-setting,delete-account-setting}.test.tsx`
- What: a few files are slow by construction. Splitting them would not shorten the run, which is ~230–280 s over 7 workers and set by total CPU, not by the longest file (37 s). Trimming them is worth something under load.
- Evidence (results cache, 473 files, 615 s summed):
  - The top 8 files are 156 s (25 %): translation-review-0251 36.9 s, register-form 35.1, translation-review-025 16.3, sign-in-form 16.1, reset-password-form 13.9, mini-calendar-grid 13.7, server-kit-pages 13.3 (TST-8), email-change-setting 10.6.
  - By size: 330 files take < 1 s; 25 take > 5 s and account for 270 s.
  - Auth and account forms type with `user.type`, one React render per keystroke over the whole form (register-form: 15 calls; sign-in-form: 30).
  - PROVEN, register-form alone, no coverage: 12.2 s and 14.9 s for two identical copies (machine noise) against **8.2 s** with `user.click` + `user.paste`, all 20 tests still green. `userEvent.setup({ delay: null })` and `configure({ defaultHidden: true })` gained nothing (11.4 s / 14.7 s).
  - translation-review-0251 alone (PROVEN, no coverage): 14.0 s; 0.7–1.75 s for each test that renders 100+ table rows or the 122-area catalogue (4,660 rows built by `areaRows()`, `:28`), against 50–420 ms for the phone and filter-warning tests. The cost follows the rows rendered, and those rows are what the tests bound (the 100-row fold budget). In the suite the file took 36.9 s, 2.6× its solo time, from contention plus coverage (TST-1, TST-4).
- Fix:
  - `user.paste` (or `fireEvent.change`) where the test is about the value, not the keystrokes. Keep `user.type` for the tests that are about typing: meters, masks, IME.
  - Leave translation-review-0251's sizes alone: they are the specification of the fold budget. Its cost is a symptom of TST-1 and TST-4, not of the file.
  - Blast radius: tests only.
- Order: none.

---

**Checked and fine (no finding):**
- CI correctness:
  - `reuse` works: main runs take 21–25 s when the PR tree matches, e.g. 38257467158.
  - release.yml stages exactly the CI tarball and refuses red CI.
  - Pages deploys the reused showcase. Its `vars.REVIEW_API_BASE` is present even in Dependabot PR builds: the showcase artifact of run 37792402378 carries `keksdose.app/api/v1`.
  - CI costs $0 (public repo) and takes ~4.3 min per PR. `check:test` is the critical path at 3 m 48 s; `npm ci` is 7–11 s per job.
- Dependabot: grouped monthly, majors ignored, security updates enabled (`automated-security-fixes: enabled`). Both alerts so far (source-map-js high, esbuild low; dev scope) were fixed the day they opened.
- Scripts: every file in `scripts/` is referenced. The other generators are guarded by tests (`token-vars-declared.test.ts` for gen-kit-css-variables; the page shards for gen-showcase-search-index); gen-export-inventory is not (TST-7).
- Earlier audits:
  - Module audit's "Tests & quality gates": done (tarball verification, optional peers, ESLint, DataTable tests, tokens mirror, coverage measurement, var-declared sweep).
  - Still open: coverage measurement exists but is not ratcheted (TST-4), and the `@eifi1/ui-kit/testing` harness lacks the environment stubs (TST-10).
- Minor, not filed:
  - `check:commit-rules` passes "offline" on any fetch error, in CI too (`check-commit-rules.mjs:28-31`), despite its comment that CI enforces it.
  - `prepublishOnly` never runs, because publishing is `npm stage publish <tgz>` from CI.
