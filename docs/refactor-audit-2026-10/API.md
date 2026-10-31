# API — public API and its types (auditor 3 of 6), ui-kit-034 @ d6212d6

Summary: 9 findings — sev 4: 0, sev 3: 0, sev 2: 7, sev 1: 2. Nothing in the public types is a live defect.
Top 3: **API-1** 16 components still take camelCase `ariaLabel` after 0.34 removed it from 4 others. Ship the rest in the same 0.34 migration (kk 24, ka 23, KS 1 sites).
**API-2** 79 components spread `div`-style props onto the DOM but cannot take a `ref` (Skeleton's 0.33.1 fix, ×79). Card alone has 231 app sites.
**API-4** MultiSelect is not generic. All 5 of its app call sites cast `(string|number)[]`.
Method: dist import (886 runtime + 1,007 type names), TS-checker inventory of 310 components' props, JSX-attribute scan of the 3 apps (4,159 prod uses; keksdose re-exports followed).

### API-1 · sev 2 · consistency · S · CONFIRMED · touches: `src/components/amount-input.tsx`, `src/components/number-input.tsx`, `src/components/calculator.tsx`, `src/components/wizard-stepper.tsx`, `src/shell/topbar-controls.tsx`, `src/shell/option-switcher-menu.tsx`, `src/shell/role-switcher.tsx`, `src/shell/topbar-action-menu.tsx`, `src/rhf/fields.tsx`
- What: 0.34 (9037748, Q2) made `aria-label` the accessible-name prop and removed `ariaLabel` from ToggleGroup, ChipInput, GroupedPicker and HoverMenu. Sixteen components still take only camelCase `ariaLabel` and accept no `aria-label`. That flag was never deprecated anywhere: AmountInput, MoneyField, NumberInput, NumberField, IntegerField, CalculatorButton, RhfNumberField/RhfIntegerField/RhfMoneyField, WizardStepper, ThemeToggle, PaletteMenu, LanguageMenu, OptionSwitcherMenu (required), RoleSwitcher and TopBarActionMenu (required). In AmountInput's own props, `ariaLabel` sits beside `"aria-describedby"`, `"aria-invalid"` and `"aria-required"`. This is the rest of the 2026-09-22 audit's "three different prop names for the accessible name" (combobox.tsx:184 then). That item is now 4 of 20 done.
- Evidence: declarations at amount-input.tsx:88 (kebab aria props at :95-97), number-input.tsx:30 (kebab aria props at :105-107), calculator.tsx:38, wizard-stepper.tsx:12, topbar-controls.tsx:39/76/179, option-switcher-menu.tsx:28, role-switcher.tsx:10, topbar-action-menu.tsx:251, rhf/fields.tsx:569. App `ariaLabel=` sites on these components:
  - keksdose: 24 prod (AmountInput ×15, e.g. transaction-fields.tsx:753, budget-cells.tsx:501; TopBarActionMenu account-menu.tsx:365 and tour-menu.tsx:80; RoleSwitcher top-bar.tsx:94/117; WizardStepper file-import-panel.tsx:72) plus 15 in tests.
  - kastlan: 23 (NumberField ×4, RhfNumberField ×3, AmountInput ×5, top-bar.tsx:112/114/149, …).
  - Kurvenschmiede: 1 (chrome-controls.tsx:31).
- Fix: accept `aria-label` on all 16 (additive) and mark `ariaLabel` `@deprecated 0.34`, with removal in 0.35. Then 0.34's adoption note covers all twenty components with one rule ("`ariaLabel` → `aria-label` everywhere"), not 4 now and 16 later. Not breaking in 0.34. 0.35 is breaking for the counts above, as a mechanical rename.
- Order: before 0.34 is cut, alongside docs/archive/adopt/adopt-0.34.md's Q2 lines. API-8's CHANGELOG line should name it.

### API-2 · sev 2 · consistency · M · CONFIRMED · touches: `src/components/ui.tsx`, `src/components/loading-state.tsx`, `src/components/description-list.tsx`, `src/components/page-header.tsx`, `src/components/disclosure.tsx`, `src/components/choice-parts.ts`, +~40 component files
- What: 0.33.1 gave Skeleton a ref by switching its props to `ComponentPropsWithRef` (skeleton.tsx:17-25), as the Table parts did in 0.16 (table.tsx:155). Under React ≥19 (peer, package.json:109) `ref` is an ordinary prop, so `{...rest}` already forwards it. Only the type blocks it. **79 more components** spread rest onto a DOM node, take no `ref` in their type and are not `forwardRef`.
  - 67 need the type change alone, as Skeleton did.
  - 12 need care: 11 put their own ref on the same element (Tabs, DropdownPanel, Popover, CurrencySelect, PickerSheet, MultiSelect, HoverMenu, FullBleedDialog, GroupedPicker, FormActions, AppShell), and AlertBanner's element is a `div`, `a` or `button` by branch (alert-banner.tsx:360/398/406/418).
- Evidence: CardProps `extends ComponentPropsWithoutRef<"div">` (ui.tsx:3112) with `{...rest}` on the root `div` (ui.tsx:3301). The same holds for CardHeader/Description/Action/Content/Footer (ui.tsx:3343, 3371-3374), Spinner :3483, EmptyState :3559, Label :1867, FloatingField :1783, LoadingState loading-state.tsx:11, DescriptionList/Item description-list.tsx:76/212, PageHeader page-header.tsx:67, Disclosure disclosure.tsx:116, StatTileGrid stat-tile.tsx:647, Separator separator.tsx:4, ButtonGroup button-group.tsx:92, StatusDot status-dot.tsx:91 and Breadcrumbs breadcrumbs.tsx:37. The rest are auth/landing/demo pages and pickers. App weight (kk/ka/KS prod JSX sites):

  | Component | kk | ka | KS |
  |---|---|---|---|
  | Card | 113 | 87 | 31 |
  | CardHeader | 32 | 72 | 11 |
  | CardContent | 0 | 77 | 1 |
  | EmptyState | 74 | 28 | 8 |
  | LoadingState | 32 | 28 | 26 |
  | DescriptionItem | 20 | 27 | 15 |
  | PageHeader | 17 | 10 | 12 |
  | Disclosure | 21 | 0 | 12 |

  Live workaround: keksdose admin-actions-panel.tsx:129 wraps its Card in `<div ref={card}>` only to `scrollIntoView` it (:79, :89). That is Skeleton's stated reason ("to measure it, or scroll it into view"). `assignRef` exists three times: chip.tsx:501, form-actions.tsx:325, and the choice-parts export used by floating-panel.tsx:21 and iban-input.tsx:7.
- Fix: switch the 67 to `ComponentPropsWithRef<…>` (the Skeleton diff). For the 12, add one exported-internal `mergeRefs`/`assignRef` in choice-parts, merge the caller's ref with the kit's, and drop the two private copies. Type `AlertBanner`'s ref as `Ref<HTMLElement>`. Additive, no app change required. kk can delete one wrapper div.
- Order: none. Do the Card family plus the 12 highest-traffic components first. The 12 that need a merge want mergeRefs first.

### API-3 · sev 2 · risk · S · CONFIRMED · touches: `src/components/number-input.tsx`, `src/components/number-field.tsx`, `src/components/date-picker.tsx`, `src/components/month-picker.tsx`, `src/components/toggle-group.tsx`, `src/components/multi-select.tsx`, `src/components/currency-select.tsx`, `src/components/chip.tsx`, `src/rhf/fields.tsx`
- What: 10 focusable fields take no ref at all, so neither an app nor the kit's own adapter can focus them: NumberInput, NumberField, IntegerField, DatePicker, DateRangePicker, MonthPicker, ToggleGroup, MultiSelect, CurrencySelect and ChipInput. Their siblings do take one: AmountInput (`forwardRef`, amount-input.tsx:351), MoneyField (`ref` prop, money-field.tsx:18), and Combobox, InlineEntityCombobox, EntityCombobox and CountrySelect (ref props). The kit's /rhf works around this six times with `useFocusHandle(field.ref, () => document.getElementById(id))` (helper rhf/fields.tsx:259-273, "for a control that forwards no ref"):
  - NumberField: :493
  - DatePicker: :756
  - DateRangePicker: :969-970
  - MonthPicker: :1391
  - ToggleGroup: :1719
- Evidence: NumberInput `function NumberInput(props: NumberInputProps)` (number-input.tsx:292) keeps its input ref private (:378, :463). NumberField is at number-field.tsx:157 and IntegerField at :313. App reach (kk/ka/KS):

  | Component | kk | ka | KS |
  |---|---|---|---|
  | ToggleGroup | 17 | 5 | 17 |
  | NumberField | 0 | 6 | 3 |
  | IntegerField | 4 | 2 | 1 |
  | DatePicker | 1 | 8 | 0 |
  | NumberInput | 5 | 0 | 0 |
  | CurrencySelect | 6 | 0 | 0 |
  | MultiSelect | 2 | 0 | 3 |

  kastlan's 49 Rhf number/date sites go through the id-lookup workaround.
- Fix: a `ref` prop (React 19 style, as MoneyField) on each, to the element that takes focus: the `<input>`, or the trigger button for pickers. ToggleGroup's ref goes to the group, and the rhf `find` rule moves into the kit as `focus()`. Then the six `useFocusHandle` calls become `ref={field.ref}`. Additive, no app change.
- Order: shares mergeRefs with API-2 (CurrencySelect and MultiSelect are in its "needs merge" group).

### API-4 · sev 2 · consistency · S · CONFIRMED · touches: `src/components/multi-select.tsx`, `src/i18n/kit-labels.tsx`
- What: MultiSelect breaks the select family's rules on four counts:
  - `values` where every other field has `value`.
  - Not generic: `(string|number)[]` in and out.
  - Per-string label props (`searchLabel`, `selectAllLabel`, `clearLabel`, `allLabel`) where 146 components take `labels`.
  - No `disabledReason`/`commit` where Select, Combobox and the entity comboboxes have them.

  The non-generic type costs every caller a cast.
- Evidence: multi-select.tsx:19-30 (option `value: string | number`, `values`, `onChange(next: (string|number)[])`), :41-45, :98-100. **All 5 prod call sites cast:**
  - keksdose price-shop-picker.tsx:403 (`next.map(String)`) and reports-filters.tsx:216 (`as string[]`).
  - Kurvenschmiede hysteresis-compare.tsx:112, kinematics-compare.tsx:109 and transmission-compare.tsx:250 (`as number[]`). KS also passes all three label strings at each site.
- Fix: `MultiSelect<V extends string | number = string | number>` with `MultiSelectOption<V>` and `onChange(next: V[])` — non-breaking thanks to the default. Add `value` (deprecating `values`) and `labels?: Partial<MultiSelectLabels>` (deprecating the three chrome-string props). Optionally add `disabledReason`/`commit` like Combobox. App cost: kk 2 and KS 3 casts can go; the later rename touches the same 5 sites.
- Order: independent. Fold in API-3's ref if MultiSelect is touched.

### API-5 · sev 1 · consistency · S · CONFIRMED · touches: `CONTRIBUTING.md`, `src/components/ui.tsx`, `src/components/nav-pills.tsx`, `src/components/tile-radio.tsx`, `src/components/search-field.tsx`
- What: the conventions hold for the most part, but nothing writes them down, so each new component re-decides them. Majority and outliers:

  | Convention | Majority | Outliers |
  |---|---|---|
  | Selected value | `value` + `onChange(value)`: 40 components | Tabs `active` (ui.tsx:3752); NavPills `current`/`onSelect` (nav-pills.tsx:34/37); TileRadioGroup `checked`/`onSelect` (tile-radio.tsx:106/107); MultiSelect `values` (API-4); GroupedPicker `selected`/`onSelect(group, item)` (grouped-picker.tsx:29/30) |
  | Change callback | A component extending an `<input>`'s attributes keeps the DOM `onChange` and adds `onValueChange`: TimeInput time-input.tsx:49, IbanInput iban-input.tsx:101, PhoneInput phone-input.tsx:92, TypedConfirmField danger-confirm.tsx:177 | SearchField extends `InputHTMLAttributes` but re-types `onChange` to a string (search-field.tsx:10-17). NumberField/IntegerField (number-field.tsx:38), PlanPicker (plan-card.tsx:247, Radix-style value/defaultValue) and Feedback/ChatComposer (feedback-thread.tsx:619) use `onValueChange` with no DOM `onChange` to keep |
  | Kit strings | `labels={Partial<…>}`: 146 components | ~30 components take single-string chrome props: `closeLabel` (Combobox, DialogFrame, FullBleedDialog, PickerSheet, FloatingPanel, entity comboboxes), `clearLabel`, `todayLabel`, `dismissLabel`, `collapseLabel`/`expandLabel` (AppShell), `removeLabel` (Chip), `toggleLabel` (TreeRow) |
  | `label` | The visible label (ReactNode) | `label` is the accessible name only on ScrollArea (scroll-area.tsx:67) and QrCode (qr-code.tsx:12), the case 0.34 moved Tabs/SearchField to `aria-label` for. `label` is typed `string` (not ReactNode) on Combobox :175, InlineEntityCombobox combobox.tsx:803 and ChipInput chip.tsx:1124 |
  | Controlled vs uncontrolled | Field values are controlled-only (40/40); open/expanded state is dual (`open`/`defaultOpen`/`onOpenChange`: Disclosure, FloatingPanel, TreeView, ListItem) | None that matter |
  | Slot classNames | `className` on the wrapper + `inputClassName` (32) / `selectClassName` (6) on the element | Rhf* `comboClassName`, a minor oddity |

- Evidence: app sites that would move under aliases (kk/ka/KS):
  - Tabs `active`: 4 (+2 tests)/8/1
  - NavPills: 1/0/1
  - GroupedPicker: 2/0/0
  - SearchField: 4/4/1
  - NumberField/IntegerField `onValueChange`: kk 3 (support-panel.tsx:575, goal-form.tsx:330, rule-editor.tsx:439), ka 1 (rent-number-field.tsx:22)
  - Chrome-string `*Label` props: about kk 20 (`closeLabel` ×14), ka 4, KS 16
- Fix: write the six rules into CONTRIBUTING §4 ("Additive API only") as the checklist for a new component. Rename only additively, when a component is touched anyway: a `value` alias on Tabs/NavPills/TileRadioGroup, and `labels` beside the chrome strings. Big-bang renames cost more than they return.
- Order: after API-1 and API-4 (they are the first instances of the rule).

### API-6 · sev 2 · structure · S · CONFIRMED · touches: `src/index.ts`, `src/chart.ts`, `src/rhf.ts`, `src/components/chart-zoom.tsx`, `src/theme/palette-presets.ts`, `src/__tests__/public-surface.test.ts`
- What: of the barrel's 886 runtime names, **458 are imported by no app's production code**:
  - 98 are `DEFAULT_*_LABELS`.
  - 8 are new in 0.34.
  - 44 are used only in app tests (kk tests kit internals: Pagination, nextSorts, resolveFilter…).

  Most of the rest are deliberate building blocks. The `DEFAULT_*_LABELS` are not a cut candidate: `useKitLabels(ns, DEFAULT_X)` needs them, and they keep English tree-shakable (C9).

  The cheap 0.35 deprecations, each verified against all three apps (prod and tests):
  - (a) Superseded label helpers from before the provider, called by no kit component and no app: `resolveChipInputLabels` chip.tsx:1108, `resolveFieldSyncLabels` field-sync.tsx:41, `resolveWizardLabels` wizard/types.ts:278, `resolvePasswordRevealLabels` ui.tsx:2040. Also `missingDataTableLabels` data-table-labels.ts:212, superseded by `missingKitLabels`, which all three apps' tests use. `resolveDataTableLabels` can leave the barrel too; it is internal to DataTable, with 1 kk test (data-table-pagination.test.tsx:14).
  - (b) The chart-zoom maths, ×13 on the barrel and /chart: `DEFAULT_Y_AXIS NO_ZOOM ZOOM_MIN_DRAG ZOOM_SQUARE_ENOUGH axisExtent defaultZoomAxes fitXToY fitYToX selectionFromDrag zoomAfter zoomAxesFor zoomDomains withChartZoom`. Their stated reason, "exported because Kurvenschmiede's own tests use it" (public-surface.test.ts:59), no longer holds: no file in any app names one.
  - (c) `ALTERNATIVE_PRESETS` (palette-presets.ts:131). Still unreachable through `presetById` (:730, "a reference bank only", :470). This was **deferred from the 2026-09-22 audit, unchanged**.
  - (d) `FeedbackComposer`, the second name of `ChatComposer` (feedback-thread.tsx:894 `ChatComposer = FeedbackComposer`). kk 1 site: support-thread.tsx:222.
  - (e) The physical `align: "left" | "right"` on DropdownPanel, HoverMenu, TopBarActionMenu and FeedbackMenu ("kept for existing callers", hover-menu.tsx:20-25, dropdown.tsx:236-242). Sites: ka top-bar.tsx:150, KS account-menu.tsx:138.
  - (f) /rhf's shadcn scaffold ×7 (`FormField FormItem FormLabel FormControl FormDescription FormMessage useFormField`). It has 0 app sites: kastlan, the only /rhf consumer, uses `Form` plus the bound `Rhf*` fields and `RhfField` (5 sites) as the escape hatch.
  - (g) Already scheduled: SwipeAction `className`/`armedClassName` (kk 1 test: swipeable-row.test.tsx:52) and ServerWakeNotice `navOffset` (0 sites).

  Roughly 28 runtime names plus 2 props, all at a cost of 0 to 3 sites per app.
- Evidence: export list from `dist/index.js` (built 17:34; no runtime export changed after 9037748). The per-name import scan covers `{…} from "@eifi1/ui-kit*"` plus keksdose's re-export modules (shared/components/ui.tsx, amount-input.tsx, currency-select.tsx, shared/lib/dates.ts, shared/state/logger.ts, reports/charts/palette.ts). A second tier of ~20 tuning constants has no reader outside its own module and no app reader, e.g. `DEMO_MINUTES_ONLY`, `FEEDBACK_UNDO_DURATION`, `SETTINGS_FOCUS_MS`, `SEARCH_TIER_POINTS`, `TOAST_ACTION_DURATION`, `ZOOM_MIN_DRAG`. Low value; leave them unless a module is being reshaped.
- Fix: in 0.35, tag (a)–(f) `@deprecated` with the replacement named, list them (API-8), and remove them in 0.36. Each removal is a breaking line with the counts above. The surface test's count drops by about 28.
- Order: API-8's listing mechanism first.

### API-7 · sev 2 · duplication · XS · CONFIRMED · touches: `src/components/settings-fields.tsx`, `src/components/language-select.tsx`
- What: `LanguageSetting` (settings-fields.tsx:111-129) is a ten-line Select over `{code, label}` rows. `LanguageSelect` (language-select.tsx:60) is the same Select over codes, with three additions:
  - names from the kit's registry,
  - `lang` on each option, so a reader says "Français" in French,
  - `resolveLanguage` on the value.

  Every app call site of LanguageSetting feeds it rows that are, or could be, the registry's (kastlan and KS through `languageOptions(...)`), so the three apps' language pickers lack the `lang` marking for no reason.
- Evidence:
  - kk: register-page.tsx:158 and appearance-card.tsx:81 (`options={LANGUAGES}`, hand-written names, shared/i18n/languages.ts:32).
  - ka: document-language-card.tsx:37 and settings-page.tsx:141 (`languageOptions(OFFERED_LANGUAGES)`, shared/i18n/languages.ts:23).
  - KS: account-cards.tsx:131 (`LANGUAGES.map(({code,label}) => …)` from `languageOptions`, shared/i18n/languages.ts:57).
- Fix: deprecate LanguageSetting in 0.35 in favour of `<LanguageSelect codes={…}>` (`optionLabel` covers keksdose's "Deutsch (Schweiz)"). Alternatively, implement LanguageSetting on LanguageSelect now, so the 5 sites get `lang` without a change. Cost: kk 2, ka 2, KS 1.
- Order: independent.

### API-8 · sev 2 · docs · XS · CONFIRMED · touches: `CONTRIBUTING.md`, `.versionrc.cjs`, `src/__tests__/public-surface.test.ts`
- What: the rule says a deprecation is "marked `@deprecated` … **listed in the changelog**, then removed in the next minor" (CONTRIBUTING.md:169-170; the CHANGELOG header from .versionrc.cjs repeats it). Since the CHANGELOG became generated (0.7), nothing puts a deprecation there. The generator has no "Deprecated" section, and a deprecation written in a commit body is dropped.

  The `@deprecated` tag half holds, and the adoption docs carry the deprecations (docs/archive/adopt/adopt-0.33.md:143, docs/archive/adopt/adopt-0.34.md:66-67). The changelog half fails for 3 of the last 4 batches:
  - ToggleGroup/ChipInput/GroupedPicker/HoverMenu `ariaLabel` and Tabs/SearchField `label`: deprecated in 0.5.0 (bf8a311), never listed, removed in 0.34.
  - SwipeAction `className`/`armedClassName`: `@deprecated 0.33` (swipeable-row.tsx:78/82, 5c2b64f), absent from the 0.33.0 section (CHANGELOG.md:31-69).
  - ServerWakeNotice `navOffset`: `@deprecated` 0.34 (server-wake.tsx:73), only in cddebdd's body.

  Only `PHONE_QUERY` was listed, in 0.32's hand-written intro (CHANGELOG.md:114). Timing is fine: 0.34 removes nothing deprecated less than one minor earlier, and 0.33's SwipeAction props and 0.34's navOffset are due in 0.35.
- Evidence: as cited. A grep of `@deprecated` in src/ returns only swipeable-row.tsx:78, :82 and server-wake.tsx:73.
- Fix: there are two XS options; pick one.
  - (1) Change the rule's wording to what is practised: "listed in docs/adopt-0.x.md and in the release's hand-written intro under **Deprecated**". Add a "Deprecated" bullet block to the 0.34 intro (navOffset, plus API-1 if taken).
  - (2) Add a test: every `@deprecated` in src names a version (`@deprecated 0.x`), and docs/adopt-0.x.md mentions the prop.

  Either way, write the 0.35 removal list into adopt-0.35 now: SwipeAction className/armedClassName, navOffset, and API-1's `ariaLabel`.
- Order: before API-1 and API-6's deprecations.

### API-9 · sev 1 · types · S · CONFIRMED · touches: `src/i18n/kit-labels.tsx`, `src/components/amount-input.tsx`, `src/components/number-input.tsx`, `src/components/settings-fields.tsx`
- What: in four places the types say less than, or something other than, what the code does.
  - (a) `useKitLabels(ns, defaults, prop?: Partial<…>)` (kit-labels.tsx:794-806) and `useKitLabelOverrides` (:784) are typed as a *shallow* Partial, while the merge is deep (`mergeNamespace`, :757, matching `LabelOverride`, :435). Three kit modules cast around it: legal.tsx:248, billing-labels.ts:284, admin-action-log.tsx:301. The 122 components with `labels: Partial<X>` reject a nested partial that works at runtime, e.g. `labels={{ groups: { security: "…" } }}` on SettingsLayout, where `groups` requires 5 keys. The same holds for InvitationsPanel `status` (4 keys) and TextSizeSetting/ContrastSetting `textSizes`/`contrastModes` (3 each), all found by checker.
  - (b) `AmountInputProps` and `NumberInputProps` are module-private (amount-input.tsx:33, number-input.tsx:16). These are the two most-used number fields. The kit itself falls back to `ComponentProps<typeof AmountInput>` (money-field.tsx:4). About 40 components have no `<Name>Props` export, down from 71 of 85 in the 2026-09-22 audit.
  - (c) `ThemeSettingProps` names only the Select half of `ThemeSetting(props: ThemeSettingProps | ThemeSettingToggleProps)` (settings-fields.tsx:31/75). `ProfileSettingProps` is the model to follow: it is the union.
  - (d) Combobox, InlineEntityCombobox and ChipInput type `label` as `string`, where every other field takes ReactNode (API-5).
- Evidence: the TS-checker comparison of each exported `XProps` with the component's parameter found ThemeSetting as the only non-ref mismatch. All other differences are `forwardRef` components whose Props omit `ref`, which is normal.
- Fix: type `prop` and the `labels` props as `LabelOverride<X>` (widening, non-breaking), and drop the three casts. Export `AmountInputProps`/`NumberInputProps`, and export `ThemeSettingProps` as the union (rename the Select half to `ThemeSettingSelectProps`). Widen (d) to ReactNode where the label renders visibly. App cost 0.
- Order: none.

## Checked, nothing to report
- **No `any` written in the kit's public types.** All 55 `any` hits in exported signatures come from libraries: React's `JSXElementConstructor<any>` inside `ReactElement`, and react-hook-form's `Control<…, any, …>` default (rhf/fields.tsx:102). `unknown` appears only where it belongs (error handlers, `describeThrown`, `ZoomRow`).
- **Generics are kept** on DataTable, the entity comboboxes, ToggleGroup, ChoiceCardGroup, CheckboxGroup, Swatch/IconPicker, Tabs, NavPills, TileRadioGroup, TreeView, RoleSelect, ColumnMapper, the `*Column` helpers and the Rhf fields. Autocomplete keeps its generic through `forwardRef` via a cast. MultiSelect is the one loss (API-4).
- **No kit-declared prop leaks onto the DOM through `...rest`.** Every own prop is destructured before the spread, by AST check over all 310 components. **No declared prop is ignored** except the deprecated no-op `navOffset`.
- **The literal-union arrays match their types** (ADMIN_ACTION_KINDS 22/22, SUBSCRIPTION_STATUSES, BILLING_INTERVALS, REVIEW_STATUSES…). The FEEDBACK_* status arrays are intended subsets.
- **Size, tone and variant sets** are consistent within families. The odd words (`ProgressBarSize` "slim", `PageHeaderSize` "compact", `TextLinkTone` "primary"/"secondary") are documented choices (progress-bar.tsx:37, page-header.tsx:14, text-link.tsx:132). Select's `size: "sm"|"md"|number` deliberately keeps the native list-box rows (ui.tsx:2551).
- **Earlier audit, 2026-09-22, still open with no app demand found:** Popover/HoverMenu cannot be opened from outside (popover.tsx:35-52, hover-menu.tsx:14-28: render-prop `toggle`/`close` only), and the headless combobox cores remain unexported. Textarea still lacks the `disabledReason`/`commit` that Input and Select have (ui.tsx:3012-3025), but no app saves a Textarea on blur, so it is not worth a change yet.
- **Surface count, for the main session:** the barrel has **886** runtime names, against 879 at 0.33.1:
  - added: HelpPopover, saveBlob, filenameFromDisposition, useKitTableStorageKeyPrefix, createSessionRefresh, attachSessionRefresh, isTransientRefreshFailure, isSignedOutStep;
  - removed: PHONE_QUERY.

  public-surface.test.ts:209 still pins 879. adopt-notes' "879 → 883" predates session refresh and the PHONE_QUERY removal.
