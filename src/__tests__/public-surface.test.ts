import * as barrel from "../index";
import * as chart from "../chart";
import * as dataTable from "../data-table";
import * as feedback from "../feedback";
import * as search from "../search";
import * as shell from "../shell";
import * as tour from "../tour";
import * as wizard from "../wizard";
import * as rhf from "../rhf";
import * as tableText from "../table-text";
import * as testing from "../testing";
import * as i18nDeCh from "../i18n/locales/de-CH";
import * as i18nEn from "../i18n/locales/en";
import * as i18nEs from "../i18n/locales/es";
import * as i18nFr from "../i18n/locales/fr";
import * as i18nHu from "../i18n/locales/hu";
import * as i18nIt from "../i18n/locales/it";
import * as i18nZh from "../i18n/locales/zh";

/**
 * The public surface, pinned.
 *
 * Nothing asserted what this package exports, so its 56 `export *` statements could add,
 * drop or shadow a name with no CI signal — and did: the README advertised five wizard
 * exports through 0.4.0 and 0.4.1 that had been deleted, because removing them from the
 * barrel broke nothing that anyone ran.
 *
 * Three consumers pin `^0.5.0`. A name leaving this list is a breaking change for them and
 * has to be a decision, not a diff nobody read. Updating the count below is that decision;
 * the failure message tells you exactly which names moved.
 *
 * 187 -> 189: `DEFAULT_PASSWORD_REVEAL_LABELS` and `resolvePasswordRevealLabels`, so the
 * password reveal toggle's two strings can be translated the same way every other string
 * in the kit is. Both additive; nothing left.
 *
 * 210 -> 212: `currencyName`, the one place the 27 shipped currency names are read, so
 * `CurrencySelect` and `AmountInput` resolve a caller's translation the same way; and
 * `missingDataTableLabels`, which answers which table labels fell back to English (the
 * lenient `Partial` merge cannot, and three apps depend on it staying lenient). Both
 * additive; nothing left.
 *
 * 212 -> 246, all additive:
 *  - i18n (src/i18n): `UiKitProvider`, the `useKit*` hooks, `missingKitLabels`,
 *    `formatFileSize`, `DEFAULT_UI_KIT_LABELS` and one `DEFAULT_*_LABELS` per namespace
 *    — including the four that were module-private (mini-calendar, popover, tour,
 *    command palette), because the complete English reference has to name them. That
 *    is also why /search and /tour each gained one.
 *  - components the apps hand-rolled: `Checkbox`, `Switch`, `Slider` (+ its log-scale
 *    helpers), `MonthPicker`, and keksdose's tile chart as `Treemap` / `TreemapCell` /
 *    `fitLabel` — the last three also on /chart.
 *  - `FIELD_SYNC_FRAME`, the class map `FieldSyncRow` paints a field's frame with.
 *
 * 246 -> 298 (and /chart 15 -> 50), all additive — the rest of what the apps
 * hand-rolled: `TimeInput` (+ `normalizeTime`, `isTimeInRange`), `NumberField`,
 * `SignaturePad`, `PasswordStrengthMeter` (+ its pure scorer and rules), `Sparkline`,
 * `StatTile` / `StatTileGrid`, and lenkbank's `SeriesChart` with its zoom
 * (`withChartZoom`, `SharedXZoom` and the pure zoom maths), `ToggleLegend` and the
 * facing-pair axis geometry. The chart pieces are on both entries, like the rest
 * of the chart kit; the zoom maths is exported because Kurvenschmiede's (then lenkbank's) own tests use it.
 *
 * 298 -> 302: `PageContents`, `PageContentsLayout`, `useScrollSpy` and
 * `DEFAULT_PAGE_CONTENTS_LABELS` — the "On this page" rail, as a kit component.
 *
 * 303 -> 326 (0.6.0), all additive — the inputs the three apps still hand-rolled after
 * adopting 0.5: `FileButton` / `useFilePicker` / `matchesAccept`, `Autocomplete`,
 * `Label`, `SwatchPicker`, `IconPicker`, `ChoiceCard` / `ChoiceCardGroup`,
 * `DangerConfirm`, `SignatureView`, `Disclosure` / `Collapse` / `DialogFrame`,
 * `stepNumber`, `useKitWeekStart`, and a `DEFAULT_*_LABELS` per new namespace. Two new
 * entries: `/rhf` (the optional react-hook-form adapter — the only module that may
 * import it, see packaging-contract) and `/table-text` (pure, imports nothing).
 *
 * 326 -> 330 (0.7.0): `MeasuredGrid`, `useMeasuredRows`, `DEFAULT_MEASURED_GRID_LABELS`
 * and `useWindowedRows` — lenkbank's measured grid, stages 2–3 of its proposal.
 * 330 -> 331: `DEFAULT_FEEDBACK_ATTACHMENT_LABELS` (also in /feedback, 20 -> 21) — the
 * attachment field reads the provider's new `feedbackAttachment` namespace.
 * New pattern entry `/i18n/<code>`: the kit's translations, one standalone module per
 * language (`UI_KIT_LABELS_XX` + its `uiKitLabelsXx(numberLocale)` factory; de-CH is
 * derived and has only the constant).
 * 331 -> 368 (0.8.0), all additive — the three apps' 0.7 proposals: `ConfirmProvider` /
 * `useConfirm`, `FloatingPanel` / `FloatingActionButton`, `DescriptionList`, `ProgressBar`,
 * `Skeleton`, `CopyButton` / `useCopyToClipboard` / `copyToClipboard`, `useDebounce` /
 * `useDebouncedCallback`, `ButtonGroup`, the static `Table` parts, `Separator`,
 * `ScrollArea`, `TreeView` / `TreeRow`, `useFileDrop` / `dragHasFiles`, the series-chart
 * helpers, and a `DEFAULT_*_LABELS` per new namespace.
 * 374 -> 389 (0.10.0), all additive — the apps' 0.9 audits: `List` / `ListItem`,
 * `MenuItem`, `SectionLabel` / `Caption` (+ their class constants), `StatusDot`,
 * `PageHeader`, `Breadcrumbs`, `BulkActionBar`, `TableEmpty`, and a `DEFAULT_*_LABELS`
 * per new namespace.
 * 389 -> 393 (0.10.0), all additive: `toast`, `Toaster`, `DEFAULT_TOAST_LABELS` and
 * `TOAST_ACTION_DURATION` — the toast layer over sonner both apps wired by hand
 * (keksdose C26, kastlan). sonner stays an optional peer: the module loads it lazily.
 * 393 -> 403 (0.11.0), all additive: `FloatingActionGroup` / `FloatingAction`,
 * `ButtonGroupLink`, `CalendarHeatmap` / `heatmapLevel` / `DEFAULT_CALENDAR_HEATMAP_LABELS`,
 * `Field`, `useOptionalWizardContext`, `ActionCard`, `NavPills`; 403 -> 404: `CLIPS_ATTRIBUTE`.
 * 405 -> 471 (0.12.0), all additive — kastlan's final audit and keksdose's 0.11 notes:
 * TextLink; FormActions, LineItems; SignedAmount / Delta / Tone, LoadingState,
 * ErrorBoundary; formatNumber / formatMoney / formatPercent / formatDate /
 * formatRelativeTime / useKitFormat; useHotkey; readStored / writeStored; PieChart,
 * StaticLegend; ImageGrid, Lightbox, AuthedImage / useAuthedSrc; QrCode / encodeQr,
 * PasskeysSetting; FeedbackThread / FeedbackComposer; AuthLayout, TopBarBrand;
 * BooleanMark / booleanColumn, filter builders, useTableUrlState, useSearchParamState /
 * useTabParam / useDialogParam; the wizard gate hooks; and their DEFAULT_*_LABELS.
 * /chart 55 -> 58 (PieChart, its labels, StaticLegend), /data-table 18 -> 27, /shell 10 -> 12.
 * 0.8.0: `/i18n/de-informal` (the "du" German: `UI_KIT_LABELS_DE_INFORMAL` +
 * `uiKitLabelsDeInformal`) and its Swiss derivative `/i18n/de-CH-informal` (constant only).
 * 0.18.0 (breaking): the kit has ONE German — Swiss, formal. `/i18n/de`,
 * `/i18n/de-informal` and `/i18n/de-CH-informal` are gone; `/i18n/de-CH` gains the
 * factory `uiKitLabelsDeCh(numberLocale)` (1 -> 2), like every other catalogue.
 * 368 -> 374 (and /search 3 -> 9), all additive: `GlobalSearch` and
 * `DEFAULT_GLOBAL_SEARCH_LABELS` (the ⌘K search kastlan and keksdose each hand-built on
 * `CommandPalette`), and its pure matcher `createSearchIndex`, `matchEntries`,
 * `normalizeSearchText` and `SEARCH_TIER_POINTS`.
 */

const ENTRIES: Array<[name: string, mod: object, count: number]> = [
  // 0.13.0: the crash screen's report helpers — `isChunkLoadError`, `formatCrashReport`,
  // `crashFingerprint` (+3).
  // 0.15.4: `currencyMinorDigits`, `roundToCurrency` (keksdose M5);
  // `resolveTooltipPlacement`, `useKitChartTooltipPlacement` (keksdose M1) (+4).
  // 0.15.5: `DEFAULT_MAX_ATTACHMENTS`, the default `max` of
  // `<FeedbackAttachmentField multiple>` (keksdose N3) (+1 here and in /feedback).
  // 0.16.0: `statusDotColor` (+1).
  // 0.18.0 (+25): `WriteLockProvider`, `useWriteLock`, `DEFAULT_WRITE_LOCK_LABELS`;
  // `RoleChip`, `AccountStateChip`, `DateMark`, `dateColumn`, `DEFAULT_ACCOUNT_STATE_LABELS`,
  // `ACCOUNT_STATE_TONES`; `ShareCard`, `ShareDialog`, `SharePanel`,
  // `DEFAULT_SHARE_CARD_LABELS`; `ReauthDialog`, `DEFAULT_REAUTH_DIALOG_LABELS`,
  // `typedMatches`; `refreshChipEdges`; `createServerWake`, `serverWake`, `watchReadsAnd`,
  // `attachServerWake`, `wrapFetch`, `ServerWakeNotice`, `useServerWakeStage`,
  // `DEFAULT_SERVER_WAKE_LABELS` (keksdose's cold-start notice for every app).
  // 0.19.0: `kitLabelStrings`, the kit's words as review rows (keksdose) (+1); the
  // language registry `KIT_LANGUAGES`, `resolveLanguage`, `formatLocaleOf`,
  // `loadUiKitLabels`, `languageOptions` (+5); translation review — 18 pure helpers
  // (`translationRows`, `placeholderMismatch`, `keyInArea`, `fromApiReview`, …) and
  // `TranslationReviewPanel`, `TranslationReviewEditor`, `ReviewStatusChip`,
  // `TranslationProgress`, `TranslationLocaleTabs`, `TranslationExportButton`,
  // `REVIEW_STATUS_TONES`, `DEFAULT_TRANSLATION_REVIEW_LABELS` (+26); the legal pages'
  // shell `LegalLayout`, `LegalSection`, `LegalLinks`, `DEFAULT_LEGAL_LABELS` (+4).
  // 0.20.0: `peekUiKitLabels`, `useUiKitLabels`, `withAllPlurals` (kastlan) (+3).
  // 0.22.0, the inputs round (+39): CheckboxGroup, DEFAULT_CHARACTER_COUNT_LABELS;
  // OneTimeCodeInput, LanguageSelect, TileRadioGroup, TILE_SIZE; InlineEditField,
  // DEFAULT_INLINE_EDIT_LABELS; TypedConfirmField, CurrentPasswordInput; SignChip,
  // DEFAULT_SIGN_CHIP_LABELS; CountrySelect, DEFAULT_COUNTRY_SELECT_LABELS, COUNTRY_CODES,
  // countryName; IbanInput, DEFAULT_IBAN_INPUT_LABELS + 7 IBAN and 3 ISIN helpers;
  // PhoneInput, DEFAULT_PHONE_INPUT_LABELS + 6 phone helpers; DEFAULT_DATA_TABLE_SORT_LABELS;
  // useKitDateFormatter; ChatComposer (FeedbackComposer's neutral name).
  // 0.23.0, the apps' 0.22 adoption round (+10): FieldStrip (keksdose G8); ColumnMapper,
  // ColumnRoleTable, DEFAULT_COLUMN_MAPPER_LABELS and the six column-mapping helpers
  // (assignColumnRole, guessMapping, missingRoles, readMappedTable, readTextFile,
  // roleOfColumn) — Kurvenschmiede's columns input, keksdose's import map step.
  // 0.25.0 (+4): useSearchParamsState (keksdose #378); groupTranslationRows,
  // unreviewedRows, reviewUndo — the review panel's groups and Undo (keksdose #377).
  // 0.26.0 (+3): TRANSLATION_REVIEW_SWIPE_ACTIONS, DEFAULT_TRANSLATION_REVIEW_SWIPE,
  // translationReviewSwipePlan — the review panel's swipe bindings (keksdose #377).
  // 0.27.0, the feedback harmonization (+55, docs/feedback-harmonization.md §5): the
  // shared record's constants and body helpers; label hooks and defaults for statuses,
  // categories, toasts, menu, context, page and detail; useFeedbackStatusUndo and the
  // inbox swipe plan; FeedbackMenu, useFeedbackSubmit, FeedbackContextBox,
  // captureAppScreenshot; the table parts; FeedbackRowDetail, FeedbackReworkSection and
  // the page-URL helpers; createCrashReporter.
  // 0.28.0, the legal harmonization (+7, docs/legal-harmonization.md §5): LegalPage,
  // LegalKitSection, LegalFooter, LegalAcceptCheckbox, LEGAL_SKELETON, useNoIndex, and
  // reviewAreaOf (the review area of a `kit.legal.*` key).
  // 0.28.1 (+3, the apps' adoption): LEGAL_HREFS, legalOperatorText and useLegalLabels —
  // an app's own footer label and links need the kit's words and routes.
  // 0.29.0 (+24, docs/auth-harmonization.md §8): SignInForm, RegisterForm,
  // CompleteNameDialog, ForgotPasswordForm, ResetPasswordForm, VerifyEmailStatus,
  // EmailVerificationBanner, NotFoundPage, AcceptInvitation, CompanySwitcher and their
  // nine DEFAULT_*_LABELS; taggedEmail, isAuthError, authErrorCode, formatPersonName and
  // personInitials.
  // 0.30.0 (+32, docs/user-admin-harmonization.md §7): EmailChangeSetting,
  // SessionsSetting, DeleteAccountSetting, DataExportSetting; the user list
  // (userRosterColumns, useUserRosterColumns, UserIdentityCell, UserRowActions,
  // adminUserStates, userRosterSort, USER_ROSTER_SORT_KEYS); RoleSelect, RolesEditor,
  // ReviewerScopeEditor, AdminActionConfirm, AdminActionLog, ADMIN_ACTION_KINDS,
  // TransferOwnershipDialog, InvitationsPanel; their eleven DEFAULT_*_LABELS;
  // isRateLimited and retryAfterSeconds.
  // 0.31.0 (+54): the settings shell (docs/settings-harmonization.md §7.1) —
  // SettingsLayout, SettingsSection, useSettingsRoute, useSettingsFocus,
  // useSettingsLayout, SettingsHeadingLevel, the catalogue helpers, useAccountLanguage
  // and their constants; the landing and demo (docs/landing-demo-harmonization.md
  // §7.1) — PublicHeader, Hero, FeatureRows, FeatureRow, TrustStrip, CtaBand,
  // PublicFooter, LandingActions, accessAction, usePageSeo, seoCopyProblems,
  // metaContent, RootEntry, RedirectIfAuthed, the last-visited page, DemoStart,
  // DemoBanner, DemoEnded, the countdown, isDemoSession; three DEFAULT_*_LABELS.
  // 0.31.1 (+1): useSettingsLabels.
  // 0.32.0 (+62): text size and contrast (docs/text-size-harmonization.md §8) — the
  // stores, pre-paint, scales and inline snippet, useBreakpoint / usePhoneLayout,
  // useAccountAppearance, TextSizeSetting / ContrastSetting, FOCUS_RING,
  // FIELD_TOUCH_TEXT, DIALOG_GUTTER, readKeyboardInset, the Toaster offsets; billing
  // (docs/billing-harmonization.md §7) — PlanPicker / PlanCard, SubscriptionStatusChip,
  // BillingBanner, PlanLimitNotice, SubscriptionActions, the price and standing
  // helpers, combineWriteLocks, isPlanLimit, isBillingError; two DEFAULT_*_LABELS.
  // 0.32.0 (+15): the behaviours at Large — RowActions, rowActionsColumn,
  // CompactControls, DisabledReasonLine, useDisabledReasonLine, TOUCH_TARGET_LARGE,
  // useLargeText, useCoarsePointer, useInlineFacts, WINDOWED_ROW_INDEX, the "More"
  // cell's labels and splitMobileBar, DEFAULT_MOBILE_BAR_MAX; two DEFAULT_*_LABELS.
  // 0.32.1: `remPx` and `useRemPx`, for the few lengths an app's JS does arithmetic with
  // (keksdose's 0.32 report) (+2).
  // 0.33.0 (+2): `writeLockFor` and `COMMIT_EXCEPT_BILLING`, the write lock's sources
  // (docs/billing-harmonization.md §12.36).
  // 0.33.0, billing's round (+19, docs/billing-harmonization.md §12.36, §14):
  // `useBillingWriteLock`; the way back from a checkout, `CHECKOUT_RETURN_PARAM`,
  // `CHECKOUT_RETURN_VALUE`, `isCheckoutReturn`, `withoutCheckoutReturn`,
  // `checkoutReturnUrl`, and its "processing", `checkoutFingerprint`, `checkoutLanded`,
  // `noteCheckoutStarted`, `useCheckoutProcessing`; the pay page's link,
  // `PAY_PAGE_LANG_PARAM`, `paddleLocale`, `payPageUrl`; `usePlanLimitToast`; and the
  // operator's plan parts, `planColumn`, `usePlanColumn`, `PlanChangeConfirm`,
  // `usePlanChangeResult`, `DEFAULT_PLAN_CHANGE_LABELS`.
  ["@eifi1/ui-kit", barrel, 879],
  // 0.8.0 series-chart marks (+5 here and in the barrel): `anchoredBand`,
  // `visibleSeries`, `seriesLegendEntries`, `axisExtent`, `defaultZoomAxes`.
  // 0.15.4: `resolveTooltipPlacement` (+1 here and in the barrel).
  ["@eifi1/ui-kit/chart", chart, 59],
  // 0.22.0: DEFAULT_DATA_TABLE_SORT_LABELS, the phone sort control's words (+1).
  ["@eifi1/ui-kit/data-table", dataTable, 28],
  // 0.12.0: `FeedbackThread`, `FeedbackComposer` and the `DEFAULT_*_LABELS` of their two
  // namespaces and of `feedbackDialog` (+5 here and in the barrel).
  // 0.15.5: `DEFAULT_MAX_ATTACHMENTS` (+1 here and in the barrel).
  // 0.22.0: ChatComposer, FeedbackComposer under a neutral name (keksdose K17) (+1).
  // 0.27.0: the feedback harmonization's 55 (see the barrel's note above).
  ["@eifi1/ui-kit/feedback", feedback, 83],
  ["@eifi1/ui-kit/search", search, 9],
  // 0.31.0 (+26): the settings shell and its route, focus, context, heading and
  // catalogue helpers; PublicHeader, RootEntry, RedirectIfAuthed and the
  // last-visited page — the router-aware parts and their companions.
  // 0.32.0 (+3): the phone bar's "More" — AppShellMoreLabels' defaults,
  // DEFAULT_MOBILE_BAR_MAX, splitMobileBar.
  ["@eifi1/ui-kit/shell", shell, 41],
  ["@eifi1/ui-kit/tour", tour, 4],
  // 0.11.0: `useOptionalWizardContext` (+1 here and in the barrel), the non-throwing
  // read `useRhfWizardStep` registers through.
  // kastlan 51/52: `IntegerField` and `MoneyField` (+2). Showcase audit: `splitFileName` (+1).
  // 0.12.0: `useWizardStepValidate` and `useWizardNextGate` (+2 here and in the barrel),
  // the non-form step hooks kastlan kept in shared/components/wizard.
  ["@eifi1/ui-kit/wizard", wizard, 12],
  // 0.11.0: `useRhfWizardStep`, the react-hook-form bridge to the wizard's Next gate.
  // 0.12.0: the bound fields — `RhfField`, `RhfTextField`, `RhfTextarea`,
  // `RhfNumberField`, `RhfMoneyField`, `RhfDateField`, `RhfSelect`, `RhfCheckbox`,
  // `RhfCombobox`, `RhfTextCombobox` — and `RhfLineItems` (+11).
  // 0.13.0: `RhfIntegerField`, the digits={0} calculator={false} emptyValue="" preset
  // (kastlan 41) (+1).
  // 0.22.0: RhfTimeInput, RhfDateRangePicker, RhfToggleGroup (kastlan 4), RhfIbanInput,
  // RhfPhoneInput (+5).
  // 0.23.0: RhfCountrySelect, RhfMonthPicker (kastlan) (+2).
  // 0.24.0: RhfInlineEntityCombobox (kastlan's AccountPicker, focus-on-error) (+1).
  ["@eifi1/ui-kit/rhf", rhf, 29],
  // 0.23.0: `parseTextTable`, `tableNumber` — the text door ColumnMapper reads through (+2).
  ["@eifi1/ui-kit/table-text", tableText, 7],
  // 0.33.0: the guard an app runs from its own suite — `undeclaredCssVariables`,
  // `KIT_CSS_VARIABLES` and the stylesheet rule they share, `declaredCustomProperties`
  // (docs/colour-roles-harmonization.md §8.3).
  ["@eifi1/ui-kit/testing", testing, 3],
  // 0.18.0: the only German left (see the history above); `uiKitLabelsDeCh` (+1).
  ["@eifi1/ui-kit/i18n/de-CH", i18nDeCh, 2],
  // 0.17.0: `uiKitLabelsEn(numberLocale)`, the English defaults with grouped counts
  // (kastlan 58). Runtime only: a constant would read as the raw-count defaults.
  ["@eifi1/ui-kit/i18n/en", i18nEn, 1],
  ["@eifi1/ui-kit/i18n/es", i18nEs, 2],
  ["@eifi1/ui-kit/i18n/fr", i18nFr, 2],
  ["@eifi1/ui-kit/i18n/hu", i18nHu, 2],
  ["@eifi1/ui-kit/i18n/it", i18nIt, 2],
  ["@eifi1/ui-kit/i18n/zh", i18nZh, 2],
];

/**
 * Entries that are deliberately NOT slices of the barrel. `/rhf` must stay out of it —
 * the barrel may not import react-hook-form (packaging-contract enforces that), or
 * every app would need it installed. `/table-text` is pure string handling with no
 * component to sit beside, standalone the way `/dates` is. The `/i18n/<code>`
 * translations are data an app opts into per language, never part of the barrel.
 */
const STANDALONE = new Set([
  "@eifi1/ui-kit/rhf",
  "@eifi1/ui-kit/table-text",
  // Test helpers, never part of an app's bundle.
  "@eifi1/ui-kit/testing",
  ...ENTRIES.map(([name]) => name).filter((name) => name.startsWith("@eifi1/ui-kit/i18n/")),
]);

describe("public surface", () => {
  it.each(ENTRIES)("%s exports exactly %#", (name, mod, count) => {
    const names = Object.keys(mod).sort();
    expect(names, `${name} gained or lost an export:\n  ${names.join("\n  ")}`).toHaveLength(
      count,
    );
  });

  it("exports no name twice under a different spelling of the same thing", () => {
    // A star-export collision is silent in ESM: the later module wins and the earlier
    // name disappears. Catching it needs the *source* modules, not the merged namespace.
    const names = Object.keys(barrel);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every subpath is a strict subset of the barrel", () => {
    // The subpaths are a re-slicing of the main barrel, not a second API. If one grows a
    // name the barrel does not have, there are now two public surfaces to maintain.
    const inBarrel = new Set(Object.keys(barrel));
    for (const [name, mod] of ENTRIES.slice(1).filter(([n]) => !STANDALONE.has(n))) {
      const extra = Object.keys(mod).filter((k) => !inBarrel.has(k));
      expect(extra, `${name} exports names the barrel does not: ${extra.join(", ")}`).toEqual(
        [],
      );
    }
  });
});

describe("standalone entries", () => {
  it("share no names with the barrel, so an import can never mean two things", () => {
    const inBarrel = new Set(Object.keys(barrel));
    for (const [name, mod] of ENTRIES.filter(([n]) => STANDALONE.has(n))) {
      const both = Object.keys(mod).filter((k) => inBarrel.has(k));
      expect(both, `${name} re-uses barrel names: ${both.join(", ")}`).toEqual([]);
    }
  });
});
