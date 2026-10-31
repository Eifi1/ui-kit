# DOC — styling, i18n, documentation, showcase (refactor audit 2026-10)

**Summary.** 12 findings: sev 3 ×1, sev 2 ×9, sev 1 ×2. Audited at ui-kit-034 `c013290` (feat/0.34.0, moving: e88f3d4 + c013290 landed during the audit).
**Top 3:** DOC-1, the contracts' amendments live in appendices and adopt docs, so the bodies apps implement from are behind the code. DOC-2, five contract sections contradict src today (user-admin §4 audit vocabulary, feedback READY, settings signatures, legal/Stripe, i18n). DOC-3, README/ADOPTING/CONTRIBUTING/showcase say false things to consumers (wrong peer table, "ships no catalogue" in 7 places, RTL "130 physical utilities", "one page").
**Clean (checked, nothing to report):** all 6 catalogues have exactly the 1,127 English leaves, none missing, none extra, none throwing, and every identical-to-English string is a cognate. There is no hard-coded English in any of 188 component files (TS AST scan). Repeated words are translated consistently. No palette colour or px value bypasses tokens outside comments and the 2 budgeted sites. `dark:` appears 6 times, all deliberate.
**Already fixed or planned, not re-reported:**
- Colour roles decision 5 / §7.4 and billing ~1707/1721: fixed in e88f3d4.
- The CONTRIBUTING sweep and label-module rule: e88f3d4.
- The README PHONE_QUERY line and the regeneration of 14 exports (adopt-notes main-session).
- Q5 versionrc and Q6 app lint rule (0.35).

---

### DOC-1 · sev 3 · structure · M · CONFIRMED · touches: `docs/*-harmonization.md`, `docs/archive/adopt/adopt-0.33.md`, `docs/archive/adopt/adopt-0.34.md`, `CONTRIBUTING.md`
- **What:** a contract is amended in three places and never in its own body.
  - Three contracts say an appended review log "wins over the sections above": billing:3-4/:393, colour-roles:5/:1148, text-size:3-4/:255.
  - Each adopt doc has a "Where the build differs from the contracts — the build wins" list, and nobody folds it back.
  - So the normative text apps and agents implement from is stale wherever a later round touched it. The cost recurs every round: 491 code comments in src/showcase cite these contracts by § (text-size 133, billing 91, auth 48, user-admin 43 …).
- **Evidence:**
  - Every deviation in docs/archive/adopt/adopt-0.33.md:1067-1094 is missing from its contract, for example `SubscriptionActions onPortal` (src/billing/subscription-actions.tsx:29) and `usePlanColumn` (src/admin/plan-change.tsx:252).
    - Billing never mentions `onPortal`, `usePlanColumn` or `billing_notices_owed` (0 hits); its §14.5 sketch at :1379-1383 shows only `atProvider`.
    - `declaredCustomProperties` (src/testing/css-variables.ts:91) has 0 hits in colour-roles.
  - docs/archive/adopt/adopt-0.34.md:270-271 records the deviation `AdminOtherTarget.id`, but user-admin:673 still has no `id` (src: admin-action-log.tsx:140-147).
  - text-size §5 at :164 says "the derived tokens are redefined per attribute in tokens.css". The build steps them in JS (contrast-tokens.ts:5-9; tokens.css:44-47, :75-77 hold only `--focus-ring-width`). Only §10.5 (:282-288) corrects it.
  - Per-app steps are written twice: billing §14.14 (:1804-2066, 263 lines) against adopt-0.33 §3, and auth §11.5 (:849-947) against docs/archive/adopt/adopt-0.34.md:125-140. The guard snippet appears verbatim in colour-roles:899-914 and docs/archive/adopt/adopt-0.33.md:410-425.
  - Of the 9,061 contract lines, about 40% is not normative: 1,102 lines per-app to-do, 1,687 review logs, 803 snapshots and method. That rises to text-size 70% and colour-roles 59%.
  - Of the 27 `file:line` refs that also name a symbol, 20 no longer point at it (±5 lines). text-size:473 cites `file-button.tsx:631` in a 620-line file.
  - CONTRIBUTING.md:388 still describes `docs/` as "Audits and refactor plans — dated, and kept as written rather than edited later".
- **Fix:** a one-time pass per contract.
  1. Fold every settled item and every adopt-doc deviation into the section it amends, and delete the "this list wins" sentence.
  2. Add a status table at the top: § → shipped in → amended by.
  3. Move snapshots, per-repo lists, review logs and method to `docs/archive/<topic>-history.md`. Keep every § number, because the code cites them: renumbering breaks 491 references.
  4. In normative text, cite `file` + symbol, not a line number.
  5. Add one rule to CONTRIBUTING: a round's last commit folds its adopt doc's deviations into the contracts. Optionally add a docs check that each cited `src/…:N` exists and N ≤ the file's length.

  Docs only. No API change and no app change; apps' agents read the result.
- **Order:** do DOC-2's line fixes first if the pass is not scheduled this round.

### DOC-2 · sev 2 · docs · S · CONFIRMED · touches: `docs/user-admin-harmonization.md`, `docs/feedback-harmonization.md`, `docs/settings-harmonization.md`, `docs/legal-harmonization.md`, `docs/i18n-harmonization.md`
- **What:** sections the apps implement from contradict the code today. These are the concrete instances of DOC-1. User-admin ranks first because kastlan and Kurvenschmiede are writing audit and group rows from it in 0.34.
- **Evidence:**
  - **User-admin.** The `action` vocabulary at :181 ends at `erase`, while `AdminActionKind` (src/admin/admin-action-log.tsx:48-75) adds `plan`, `group_create/rename/delete` and `membership_add/role`. The column table at :177-186 lacks `target_group_id/_name`, which §11 defines at :593/:623. The `acknowledge` row at :159-161 lacks `plan` and `group_delete`. The header (:5-6) says only §11 is corrected in place.
  - **Feedback.** :79 says "the 7 of §2.1" and :553 says `feedbackStatus` (7), but the code has 8 with READY (src/feedback/feedback-inbox.tsx:66-74). :195-200 says author edits only in OPEN/IN_PROGRESS and that a rework sets OPEN, while §8.2 (:776-780) and src/feedback/feedback-record.ts:165-169 say OPEN/READY/IN_PROGRESS and READY. §5 at :578 still names `useFeedbackDialog`/`FeedbackSubmitDialog`; the shipped name is `useFeedbackSubmit` (feedback-submit.tsx:127).
  - **Settings.** The doc gives `settingsSearchEntries(catalogue, t)` at :170 and `(groups, entries)` at :431. The real signature takes a required third argument, `{ basePath }` (src/settings/settings-catalogue.ts:113-117), which kastlan passes (app-global-search.tsx:35-36). The §3.3 heading at :139 names `PHONE_QUERY`, which 0.34 removed. The §7.1 props at :413-414 lack `layout`, `appName` and `documentTitle` (settings-layout.tsx:75/80/92).
  - **Legal.** Decision 7 at :73-77 plans billing on "Stripe as a processor … a commercial disclaimer (a kit variant, built then)". Billing §8/§9 (:293-332) chose Paddle as Merchant of Record, and `variant="commercial"` shipped (src/components/legal.tsx:137-143, legal-labels.ts:45-46). §4.2/§4.3 at :207/:249 list only the non-commercial text.
  - **i18n.** The contract is a 2026-10-02 snapshot. H1 and H10 are listed open at :156-160 but have shipped. H2 at :83 names `@eifi1/ui-kit/i18n/languages`, which does not resolve, because `./i18n/*` maps to locales only. The registry is in the barrel (src/index.ts:415).
- **Fix:** about 15 line edits across the five files. Docs only.
- **Order:** none; also the first slice of DOC-1.

### DOC-3 · sev 2 · docs · S · CONFIRMED · touches: `README.md`, `ADOPTING.md`, `MIGRATING.md`, `CONTRIBUTING.md`, `src/i18n/kit-labels.tsx`, `showcase/src/i18n/types.ts`, `showcase/src/sections/overview.tsx`, `showcase/src/sections/feedback-inbox.tsx`, `showcase/src/routes.tsx`
- **What:** the consumer and contributor docs, and prose the showcase renders, say things the code contradicts. The README is the npm landing page and the copy in every app's `node_modules`.
- **Evidence (consumer):**
  - **The peer table is wrong in the place CONTRIBUTING.md:392-394 calls "load-bearing".** README:63 gives recharts `>=3`, but package.json has `>=3.8`. The optional peer `modern-screenshot` (used for feedback capture, src/feedback/feedback-capture.ts:264-266) is in neither the README nor ADOPTING. README:64 says lucide is used "in 33 modules"; it is 94.
  - **ADOPTING.md:21 calls `react-router` "only for DataTable URL-sync / AppShell".** It is a required peer, imported unconditionally (README:62). ADOPTING.md:38-41 says "two of the three existing consumers" still point `@source` at `packages/ui`, but all three are correct (keksdose app.css:12, kastlan :12, KS :15). Step 5 teaches per-prop labels (`allLabel={t("all")}`) instead of `UiKitProvider` + `loadUiKitLabels`.
  - **"The kit resolves no strings. It carries no translation catalogue" (README:831).** Sixty lines later the README documents its 7 shipped catalogues (README:891ff). The same claim is in CONTRIBUTING.md:98-100 ("there is not going to be one"), src/i18n/kit-labels.tsx:104, showcase/src/i18n/types.ts:4-5 and field-sync.tsx:69,180,266. The rendered page feedback-inbox.tsx:37-39 says "ships no strings, not even English ones, because both apps translate".
  - **README:962-970, "Right-to-left is partial … roughly 130 physical-direction utilities".** RTL shipped across the kit in 0.7.0 (CHANGELOG:678). src now has 286 logical utilities, 40 `rtl:` and 39 physical class tokens left, several of them deliberate.
  - **README:290-347 describes the showcase as "rendered on one page" with a "SECTIONS registry", and says "`npm test` mounts the whole page".** In fact routes.tsx:427/:1650 hold GROUPS/PAGES (71 pages, 173 section files), and the tests are 4 page shards.
  - **MIGRATING.md:28-35 still lists keksdose and lenkbank as unmigrated.** All three apps pin `^0.33.1`.
- **Evidence (contributor and showcase):**
  - CONTRIBUTING.md:36-42 omits 10 src areas (account, admin, auth, billing, demo, i18n, landing, rhf, settings, testing) and lists 7 of the 12 subpaths.
  - CONTRIBUTING.md:77 says "three consumers pin `^0.5.0`".
  - CONTRIBUTING.md:245-260 repeats "one page", "every section in one tree" and "~60 components … 113 source files"; the kit now has 311 component exports.
  - Rendered prose says "keksdose, lenkbank and kastlan" (overview.tsx:91).
  - The billing blurb "Paddle's and Lemon Squeezy's webhooks" appears 15 times: routes.tsx:1566 and 2 per dictionary. It turns false at this round's server-kit 0.8 sync, which removes Lemon Squeezy.
- **Fix:**
  - Rewrite the i18n intro as "the kit renders only labels; it ships catalogues; the app decides the language". Replace the RTL section with the current state. Correct the peer rows and the showcase paragraphs. Bring ADOPTING up to provider + catalogues + text-size (see DOC-4). Move MIGRATING.md to `docs/archive/`.
  - Guard: extend `src/__tests__/packaging-contract.test.ts` to parse the README peer table and compare it with `peerDependencies` and `peerDependenciesMeta`, the class of defect CONTRIBUTING says broke two consumers.
  - Add the Lemon Squeezy blurb to the 0.8 sync step.
  - Docs only, except the test.
- **Order:** the LS blurb goes with the server-kit 0.8 sync; the rest any time.

### DOC-4 · sev 2 · docs · M · CONFIRMED · touches: `README.md`, `ADOPTING.md`, `scripts/gen-export-inventory.mjs` (or a sibling generator), `tokens.css`
- **What:** the README and ADOPTING never teach the styling systems apps must use since 0.32–0.34. These exist only in the 1,500–2,200-line contracts and the adopt docs.
- **Evidence:**
  - README has 0 hits for `@theme inline`, "role utilit", `data-text-size`, `large:`, `truncate-until-large` and "More contrast". `text-muted`, `applyPersistedTextSize`, `TEXT_SIZE_INLINE_SCRIPT` and `@eifi1/ui-kit/testing` appear only inside the generated inventory (README:463, :402). ADOPTING has 0 for all of them.
  - The README Tokens table (README:164-171) lists three layers. It omits `--success*`, `--hue-*`, `--neutral`, the `-contrast` family and `--media-*`.
  - The only usage guidance in that section is "check:tokens fails if a component reaches for a raw palette colour" (README:186-188). It says nothing on writing `text-muted` instead of `text-[var(--text-muted)]`, which is the rule apps are asked to follow (Q6) and which tokens.css:638-668 explains.
- **Fix:**
  - Add a README "Styling" section with three parts:
    - The role utilities, generated from tokens.css's `@theme inline` block (the same marker-block pattern as the export inventory), so a new role appears without hand edits.
    - The `large:`, `xlarge:` and `contrast:` variants, the text-size-aware breakpoints and `truncate-until-large(-words)`.
    - The pre-paint script.
  - ADOPTING gains steps for the text-size and contrast stores, `UiKitProvider` + `loadUiKitLabels`, and the `undeclaredCssVariables` guard (docs/archive/adopt/adopt-0.33.md:410-425 has the snippet).
  - Docs plus one generator; no API change. This helps the next consumer and the apps' agents, which read `node_modules/@eifi1/ui-kit/README.md`.
- **Order:** after DOC-7 if new utilities are added; the generator's `--check` goes into DOC-5's guard.

### DOC-5 · sev 2 · tests · XS · PROVEN · touches: `package.json`, `scripts/gen-export-inventory.mjs`, `README.md`
- **What:** of the three generated artefacts, only the README export inventory has no guard. The showcase search index (search.test.tsx:28-31) and the server-kit API copy (server-kit-sync.test.ts:218) are checked.
- **Evidence:**
  - `node scripts/gen-export-inventory.mjs --check` exits 1 and names 14 exports: HelpPopover(+Props), saveBlob, filenameFromDisposition, useKitTableStorageKeyPrefix, attachSessionRefresh, createSessionRefresh, isSignedOutStep, isTransientRefreshFailure, SettingsDocumentTitleParts and the 4 Session* types.
  - Nothing in `check:*`, scripts/check.mjs:26 or .github/workflows/ci.yml runs `--check`. Refreshing it is a manual release step (CONTRIBUTING.md:346).
- **Fix:** `"check:build": "npm run build && node scripts/gen-export-inventory.mjs --check && …"`. No app impact; the README is the npm page.
- **Order:** after this round's planned regeneration.

### DOC-6 · sev 2 · consistency · S · PROVEN · touches: `src/i18n/locales/{es,fr,hu,it,zh}.ts`, `src/i18n/german.ts`, `src/i18n/locales/en.ts`, `src/i18n/__tests__/locales.test.ts`
- **What:** catalogues disagree on which counts get thousands formatting. Calling every function label with 12345 and comparing it with `uiKitLabelsEn("en-US")` shows two gaps:
  - All six translated catalogues print 5 counts raw that English formats.
  - English prints 11 counts raw that all six translations format.
- **Evidence:**
  - Raw in every translated catalogue: `measuredGrid.points` (e.g. fr.ts:244 `${count} points`; de "12345 Punkte"), `measuredGrid.problems`, `filePicker.rejectedPick`, `passwordStrength.ruleLength` and `tooLong` (fr.ts:245/499/612/620; same keys in es, it, hu, zh and german.ts:250-621).
  - Raw in English: `signIn.recoveryCodeHint`, `verifyEmail.resendIn`, `deleteAccount.afterDays`/`handOver`, `settings.matchCount`, `demo.rateLimited`/`hoursLeft`/`minutesLeft`, `billing.trialEnding`/`grantEnding`/`waitingChanges`. The cause is that en.ts restates namespaces only up to `columnMapper` (en.ts:27-163), so every namespace added since 0.29 prints the defaults' raw number, despite the claim at en.ts:14-17.
  - Kurvenschmiede renders MeasuredGrid in 5 files under a kit catalogue: "1234 Punkte" where German formats "1’234".
- **Fix:**
  - `n(...)` in the 30 translated lines, plus the 11 restatements in en.ts.
  - Add a test to locales.test.ts: for every catalogue, any function label whose output for 12345 contains a formatted number in any other catalogue must not print "12345" raw (the script that found this is ~30 lines). This keeps the 7 catalogues in step without a hand-kept list.
  - No API change; the visible change is digits in 7 languages.
- **Order:** none.
- **Also, sev 1:** the label-module rule CONTRIBUTING just gained ("the `DEFAULT_*` constant lives in a `<component>-labels.ts` beside the component") has 12 exceptions. Eleven defaults are still in the provider (src/i18n/kit-labels.tsx:450-540) and one in src/wizard/types.ts:257, both allow-listed in english-catalogue-graph.test.ts. Either name the exceptions in the rule or move them.

### DOC-7 · sev 2 · structure · S · CONFIRMED · touches: `tokens.css`, `src/components/focus-ring.ts`, 25 component files
- **What:** of the 131 `[var(--…)]` classes left, about 61 fall in four groups where a utility would remove a hand-spelled pattern. Tailwind 4.3.3 resolves all four namespaces, traced in node_modules/tailwindcss/dist/lib.js: `--ring-width`, `--outline-width`, `--ring-offset-color` and the colour keys. The remaining ~70 should stay `[var()]`, see the last point.
  1. **Focus frame width: 19 sites in 15 files.** These spell `ring-[length:var(--focus-ring-width)]` / `outline-[length:…]` by hand, because `FOCUS_RING` (focus-ring.ts:7-12) fixes both the variant and the colour.
     - Sites: stat-tile:363, slider:96/103, image-grid:140, data-table:2528, text-link:291, nav-pills:58, disclosure:349, scroll-area:124, calculator:74, choice-card:99/352, alert-banner:388, table:357, tree-view:549, auth-layout:70, topbar-action-menu:329.
     - Two of them draw the "one focus frame" (text-size §5) in `ring-strong`, not brand: calculator:74 (also `focus:`, not `focus-visible:`) and nav-pills:58.
     - Fix: `--ring-width-focus` and `--outline-width-focus: var(--focus-ring-width)` in `@theme inline` give `ring-focus` / `outline-focus`, which compose with any variant (`after:`, `has-[…]`, `[&_a:focus-visible]:`).
  2. **Ring offset on the card: 12 sites.** `ring-offset-[var(--bg-surface)]` ×10 (checkbox:43, chip:223/511, field-sync:320/472, slider:97/104, switch:54, tile-radio:139, alert-banner:302), plus `--bg-page` (use-settings-focus.ts:11) and `--media-scrim-hover` (ui.tsx:850). Fix: `--ring-offset-color-surface/-page` give `ring-offset-surface`.
  3. **A ring on a filled brand control: 5 sites.** `ring-[var(--brand-contrast)]` at date-picker:981, mini-calendar:746, month-picker:568/759 and numpad-sheet:274. Fix: `--ring-color-brand-contrast`.
  4. **Money: 25 sites, none with a variant.** These are chip:105-191, signed-amount:38-40, stat-tile:65-67, sparkline:59-61, line-items:201-202, progress-bar:52-53, status-dot:27-28 and numpad-sheet:222/228.
     - The kit cannot use the static `.text-money-pos` here: it is unlayered (tokens.css:783-797), so it is not an exact equivalent, and it takes no variants.
     - Decision 13 / colour-roles §12.4 (:1300-1304) deferred money theme names "this round", and nothing has scheduled them since.
     - Fix: `--text-color-money-income/-expense/-net/-neutral` and `--background-color-money-*`, with the statics kept as aliases. That also gives keksdose (39 `[var(--…)]` in its app) a variant-capable name.
  - **Stay `[var()]`:** `--status-*` (20, all in field-sync.tsx), `--chart-N` (11, as lookup tables in progress-bar, sparkline and topbar-controls) and the deliberate cross-property one-offs (`bg-[var(--border)]` dividers, `ring-[var(--text-primary)]`). A utility there would undo the property-scoping §7.1 chose.
  - **Same pass:** tokens.css:661-664 still says "The kit's own ~1,750 `[var(--…)]` classes stay where they are … lets the number only fall". That is false since d6212d6 (ROLE_BUDGET 0), and the file ships to npm.
- **Fix blast radius:** the API is additive (new utility names). Emitted classes change in the kit's markup, and apps' tests that assert `ring-[length:…]` or `ring-offset-[var(--bg-surface)]` on kit markup would need the new names: list them in the adopt doc, as Q1 did. `check-token-discipline` reads `@theme inline`, so once the utilities exist the role ratchet counts the money sites. It needs a `ring-offset` entry in NAMESPACE (check-token-discipline.mjs:147-155) to count the offsets.
- **Order:** with or after 0.34's Q1 adoption by the apps, so their class assertions move once. This is the 0.35 candidate next to Q6.

### DOC-8 · sev 2 · structure · L · CONFIRMED · touches: `showcase/src/routes.tsx`, `showcase/src/sections/*`, `showcase/src/lib/section.tsx`
- **What:** showcase demos are filed by the release that added them. Each round appends a `*-0NN-demo.tsx` and a block on some page, so a component's demos are scattered and pages read like a changelog.
  - Of 173 section files, 88 are version-named. They hold 19,322 lines and supply 161 of the 251 lazily loaded sections (routes.tsx:78-347).
  - 27 files feed more than one page, for example props-011 (7 pages), harmonise-016 (6) and misc-022 (5).
- **Evidence:**
  - Forms renders 19 sections from 16 files (routes.tsx:572-590). Its FormActions examples sit at index 5/16/17/18/21/25 in examples.generated.ts, and come from harmonise-016, signals-017, misc-022 and confirm-023 (routes.tsx:203,205,283,294).
  - Passkeys016Demo lives in feedback-016-demo (:233). The Feedback inbox pulls 11 sections from 11 files.
  - routes.tsx:373 sets "about a dozen specimens, not thirty", but 11 of 70 pages exceed 20 (buttons 38, chips-toggles 32, feedback 32), and nothing checks it. The only size test caps pages per group (showcase.test.tsx:100), which pushes growth into existing pages.
  - Helpers are duplicated: `const code = (s) => <code className="font-mono">…` is defined in 81 files, `READOUT` in 47, `beat`/`wait` in 21 (9 variants), `StateLine` in 10 and `NO_ROUTER` in 6. lib/section.tsx already exports the shared ones.
  - Dead wrappers: Admin030Demo (admin-030-demo.tsx:536) and Landing031Demo (landing-031-demo.tsx:441).
- **Fix:**
  1. Move the helpers to lib/section.tsx with a codemod and delete the 2 wrappers.
  2. Merge into one module per family, keeping "since 0.NN" as a Note. The worst cases:
     - FormActions → form-actions.tsx
     - LineItems (016/017/misc-022) → line-items.tsx
     - Confirm family (numbers-more, confirm-018/023/024) → confirm.tsx, one page
     - Tooltip (overlays, 013/014/025) → tooltip.tsx
     - DataTable (012/017/misc-022/table-fade-025) → data-table.tsx
     - Combobox (comboboxes, autocomplete, clips-012, 023/024) → combobox.tsx
     - Feedback inbox (013/014/022/023/024/027×4) → feedback-inbox/{table,detail,record,composer}.tsx
     - ColumnMapper → column-mapper.tsx
     - Passkeys/Legal → passkeys.tsx and legal.tsx
     - Dissolve props-011, harmonise-016, misc-022, polish-025, fields-022 and pickers-022.
  3. Keep the example labels unchanged, so anchors, the search index and the page-shard tests hold.
  4. Add a ratchet test so the count of `-0NN-demo` files only falls. CONTRIBUTING gains: "a release adds to the component's family file, not a new version file".
  - Blast radius is the showcase only. No app impact; no doc links to showcase anchors.
- **Order:** step 1 first. Then DOC-9's index test before the merge, so the move keeps the index honest. Then one family per commit.

### DOC-9 · sev 2 · tests · S · CONFIRMED · touches: `showcase/src/routes.tsx`, `showcase/src/__tests__/showcase.test.tsx`, `CONTRIBUTING.md`
- **What:** the component → page index is maintained by hand and never checked against the exports. This index is each page's `components[]`, which feeds the group overviews and the search's Component results. CONTRIBUTING.md:250 says "adding a component means adding it to a section", and nothing enforces it.
- **Evidence:**
  - routes.tsx:1418 lists `FeedbackInbox` and `FEEDBACK_STATUSES`, neither of which is exported (0 hits in src/index.ts and src/feedback.ts).
  - 46 rendered components are on no page's list, for example MoneyField, IntegerField, PasswordSetting, GlobalSearch, QrCode, WizardStepper, FeedbackDetail and RoleSwitcher. QrCode is unfindable by search.
  - 5 components have no specimen at all: DisabledReasonLine, FeedbackSubject, SharePanel, TranslationProgress and TranslationReviewEditor.
  - 15 hooks have none either, including 0.34's `useKitTableStorageKeyPrefix`, `useInlineFacts`, `useRemPx` and `useUiKitLabels`.
  - search.test.tsx:33-47 only checks that listed names produce entries.
- **Fix:** a test in two parts:
  - Every PascalCase runtime export of the barrels is in some `components[]`, or on an allowlist of parts (CardHeader, TableRow …).
  - Every `components[]` name is a real export.

  Alternatively, derive `components[]` from each page's imports in gen-showcase-search-index.mjs, which already parses TS. Blast radius is the showcase only.
- **Order:** before DOC-8's merge.

### DOC-10 · sev 2 · tests · M · CONFIRMED (deferred since the 2026-09-22 audit) · touches: `showcase/src/__tests__/page-shard.tsx`, `package.json`
- **What:** the module audit's "`axe-core` in the showcase render test" (docs/module-audit-2026-09-22.md:113-115, §8 "Ongoing") was never done.
  - The shards already mount every page once (page-shard.tsx:31-46), but check only the title, crashes and anchors. package.json has no axe.
  - This is the cheapest way to catch a11y regressions in kit components before they multiply across three apps.
- **Fix:** run axe on each page mount, with jsdom-safe rules only (aria-*, label, button-name, duplicate-id; colour-contrast off).
  - It adds one devDependency. Expect a first triage pass, and allow-list known items with a reason.
  - Findings are kit a11y bugs, which is direct value to all three apps.
- **Order:** independent; best after DOC-8 step 1 (fewer files to touch for allow-lists).

### DOC-11 · sev 1 · consistency · S · CONFIRMED · touches: `CHANGELOG.md`, `.versionrc.cjs`, `CONTRIBUTING.md`, `src/__tests__/` (new)
- **What:** the deprecation policy does not match practice.
  - The policy (CHANGELOG.md:16-17, CONTRIBUTING rule 4) says an export is deprecated for one minor, "listed in the changelog", then removed in the next minor.
  - In practice only 1 of at least 7 deprecations was ever listed (`PHONE_QUERY`, CHANGELOG.md:114). Aliases deprecated in 0.16 (`feedbackDialog.attachments`) lived until 0.34.
  - Today `@deprecated` marks remain on SwipeAction `className`/`armedClassName` since 0.33 (swipeable-row.tsx:78/82) and `ServerWakeNotice.navOffset` since 0.34 (server-wake.tsx:73).
  - Separately, the 15 wrong ui-kit issue links Q5 described are still in released entries: CHANGELOG.md:27,28,248,268,276,277,294,355,415,464,468. `issuePrefixes` (.versionrc.cjs) fixes only future entries.
- **Fix:**
  - Add a test that collects every `@deprecated` tag. It requires a "since 0.NN" in the tag, and fails when 0.NN is two or more minors below package.json's version. That enforces the policy, and the test's list becomes the changelog listing.
  - Change the docs' "listed in the changelog" to "carried in the commit body as `Deprecated: …`".
  - Replace the 15 links with plain "live #NNN" text once.
  - No API change.
- **Order:** none.

### DOC-12 · sev 1 · structure · S · CONFIRMED · touches: `docs/adopt-0.5.md`…`docs/adopt-0.31.md`, `docs/` (new index), `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- **What:** `docs/` is 42 files and 14,141 lines with no index.
  - 30 adopt docs: 24 of them (0.5–0.31, 2,692 lines) are finished history, because all three apps pin `^0.33.1`.
  - 10 contracts, plus 2 dated audits.
  - README and CONTRIBUTING carry the same Tests and Showcase prose twice (README:290-370 against CONTRIBUTING.md:196-260), so they went stale together (DOC-3).
- **Evidence:**
  - Only CHANGELOG cites the old adopt docs: 7 refs at CHANGELOG.md:99,150,396,657,711,801,812 (and legal:367,396 cite adopt-0.28).
  - CONTRIBUTING.md:388 still calls `docs/` "audits … kept as written".
- **Fix:**
  - `git mv` adopt-0.5…0.31 into `docs/archive/adopt/` and update the 9 refs.
  - Add `docs/README.md`: for each contract, its status line (from DOC-1); for each adopt doc, its version, one line, and "all apps adopted".
  - Move MIGRATING.md to the archive.
  - Make the README's Tests and Showcase sections three lines each that point at CONTRIBUTING (the README is for consumers).
  - Docs only.
- **Order:** after DOC-1, so the index carries the status lines.

---

## Earlier audits: deferred items in this area, still open
- **The module audit's "chart.tsx … two `#64748b` literals" (§7) is still present** at src/components/chart.tsx:370 and :507, as an untokenized fallback colour. One line each: `var(--text-muted)`. Sev 1.
- **The module audit's "dark variant redefinable; kastlan has silently overridden it" (§9 theming, tokens.css:25) is still open.** kastlan/frontend/src/app.css:14 has `@custom-variant dark (&:is(.dark *))` over the kit's `(&:where(.dark, .dark *))` (tokens.css:34). The kit uses `dark:` in only 6 places, so the impact is small. A line in adopt-0.35 for kastlan would suffice.
- **The module audit's axe-core item is DOC-10.** Its §10 RTL item was done in 0.7.0, but the README still cites the old numbers (DOC-3).
- The `contrast:` and `xlarge:` variants (tokens.css:175-176) have 0 uses in src, the showcase or the three apps. They are frozen names, so keep them, but the showcase's text-size page could demonstrate them.

## Proposed consolidation, at a glance

| Action | What |
|---|---|
| Merge | Contract bodies ← their review logs and adopt-doc deviations (DOC-1/2); showcase version files → per-family modules (DOC-8); 81 copies of `code`, 47 of `READOUT` etc. → lib/section.tsx |
| Archive | adopt-0.5…0.31, MIGRATING.md, contracts' snapshots, per-repo lists and review logs → `docs/archive/` with a `docs/README.md` index (DOC-1, DOC-12) |
| Regenerate | README export inventory (planned); a README "Styling" block from tokens.css `@theme inline` (DOC-4); showcase `components[]` from page imports (DOC-9, option) |
| Guard | `gen-export-inventory --check` in check:build (DOC-5); README peer table = package.json (DOC-3); catalogue number-format parity (DOC-6); components[] ↔ exports (DOC-9); axe per page (DOC-10); `@deprecated` age (DOC-11); version-named demo files only fall (DOC-8); optional docs `file:line` existence (DOC-1) |
