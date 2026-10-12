# BUG — latent defects and risks (refactor audit 2026-10, auditor 4 of 6)

Summary: 14 findings: sev 4 ×1, sev 3 ×3, sev 2 ×8, sev 1 ×2. 10 PROVEN (run against the real modules), 3 CONFIRMED, 1 PLAUSIBLE.
Top 1: BUG-1. Pressing Escape on an open picker list inside a Modal, DialogFrame or FullBleedDialog closes the whole dialog and throws away the form draft. Live in kastlan's lease dialog.
Top 2: BUG-2. The DataTable date filter compares the UTC date of a timestamp, while the cells and the date picker use the local day. All three apps' feedback inboxes filter rows created between 00:00 and 02:00 under the wrong day.
Top 3: BUG-3. `useAuthedSrc` hands a revoked object URL back as "ready". Reopening the same photo in Lightbox shows the error state until a refetch lands, which hits kastlan's handover photos used offline.
Scope: hooks, lib, the overlays, DataTable, the combobox family, the 0.34 code and 0.33's palette/billing/pay code. Three slices were read by forks, and each of their findings was re-checked here before filing. No repo was changed.

---

### BUG-1 · sev 4 · bug · S · PROVEN · touches: `src/components/combobox-core.tsx`, `src/components/combobox.tsx`, `src/components/multi-select.tsx`, `src/components/grouped-picker.tsx`, `src/components/dropdown.tsx`
- **What:** a picker list can be open inside a Modal, DialogFrame or FullBleedDialog. When you press Escape there, the dialog closes and the list stays open. The pickers listen for Escape on the document. The dialogs handle Escape in their own React `onKeyDown` and call `stopPropagation()`. That stops the native event at the portal container, so the picker's document listener never runs. Only Autocomplete and Popover handle Escape themselves.
- **Evidence:**
  - Picker Escape listeners:
    - combobox-core.tsx:369 (`useEscapeKey(closeToTrigger, open)`, on the document);
    - the panel key handler at :619-660 has no Escape case, and the comment at :617-618 says so;
    - dropdown.tsx:100 (CurrencySelect, AmountInput's currency chip at amount-input.tsx:698);
    - multi-select.tsx:147;
    - grouped-picker.tsx:54;
    - combobox.tsx:587 and :1267 handle Escape without stopping it.
  - Dialog handlers: modal.tsx:354-360 (`if (e.key === "Escape") { e.stopPropagation(); requestClose() }`) and full-bleed-dialog.tsx:165-180.
  - Run by the combobox fork (scratch vitest, `scratchpad/combo-proof/src/escape-in-modal.test.tsx`; my re-run was cancelled while it waited behind keksdose's running check), Modal with an `onClose` spy and the list open, then Escape:
    - EntityCombobox, Combobox and MultiSelect: `onClose` called once, and the listbox still mounted.
    - Autocomplete: dialog untouched.
  - Live: kastlan lease-detail-page.tsx:103 (DialogFrame) → lease-form.tsx:79 → shared/components/form/entity-fields.tsx:146 (EntityCombobox). `<EntityCombobox>` is rendered in 15 kastlan files (16 with MultiEntityCombobox).
  - The same path covers keksdose's AmountInput currency chip inside its transaction dialogs, and KS's EntityCombobox ×2, Combobox and MultiSelect ×3.
- **Fix:** when Escape arrives while the list is open, call `preventDefault()` and `stopPropagation()` and run `closeToTrigger`, as Autocomplete does (autocomplete.tsx:395-399). Put it in:
  - ComboboxPanel's key handler;
  - DropdownSearchHeader's `onKeyDown`, which covers everything on `useDropdownSearch`;
  - Combobox and InlineEntityCombobox.

  The document listener stays as the fallback for when focus is elsewhere. No API change. Add one regression test per family member inside a Modal.
- **Order:** first. Do it with BUG-5 and BUG-9, since all three edit the same key handlers.

### BUG-2 · sev 3 · bug · S · PROVEN · touches: `src/components/data-table-filters.ts`, `src/components/account-chips.tsx`
- **What:** the DataTable date filter takes `raw.slice(0, 10)`, which for a server timestamp (`…Z` / `+00:00`) is the UTC calendar day. Everything else uses the local day: the cell, the DatePicker and the presets. The kit moved everything else to the local calendar after dev#471.
  - In Berlin a report filed at 00:30 shows as "12 Oct" but is filtered as 11 Oct.
  - "Today" drops everything filed between 00:00 and 02:00 in summer, and picks up yesterday's late reports.
- **Evidence:**
  - data-table-filters.ts:67-75.
  - The kit's own feedback columns put this filter on `created_at` and `resolved_at` (feedback-table.tsx:451, :552). The cell renders the local day (`useFeedbackRenderDate`, feedback-table.tsx:225-238, through `toLocalIso`).
  - `dateColumn` makes it worse: it turns a Date or epoch value into `toISOString()` (account-chips.tsx:383-387).
  - Used by all three apps: keksdose feedback-page.tsx:145 and admin/users-panel.tsx:829 (created / last login); kastlan feedback-page.tsx:97; KS feedback-page.tsx:112. The fixtures carry `Z` timestamps.
  - Ran the real `rowMatches` with TZ=Europe/Berlin and the filter 2026-10-12..2026-10-12:
    - `2026-10-11T22:30:00Z` → the cell shows 2026-10-12, but the row does not match;
    - `2026-10-12T22:30:00Z` → the cell shows 2026-10-13, but the row matches.
- **Fix:** in `rowMatches`, keep the slice for a bare `YYYY-MM-DD`. For a value with a time part, compare `toLocalIso(toDate(raw))`. In `dateColumn`, hand a Date or epoch value over as `toLocalIso(date)` rather than `toISOString()`. Not breaking: filtered results become what the cells say.
- **Order:** none. The DataTable fork filed the same thing; this is the single entry.

### BUG-3 · sev 3 · bug · S · PROVEN · touches: `src/hooks/use-authed-src.ts`, `src/components/lightbox.tsx`
- **What:** `useAuthedSrc` revokes its object URL in the effect cleanup but keeps it in state. When `enabled` goes false and back to true for the same URL and attempt, the key repeats. The first render then returns the revoked `blob:` URL with `status: "ready"`.
  - Lightbox passes `enabled: open` (lightbox.tsx:174), so reopening the same photo puts a dead URL in the `<img>`.
  - `onError` then shows the error state (`ImageStates`, authed-image.tsx:139-156) until the refetch lands.
  - The header's download link points at the dead URL meanwhile.
  - If the refetch fails, the error state stays, for a picture that was on screen a moment ago.
- **Evidence:**
  - use-authed-src.ts:56-94: the cleanup revokes at :79; :91-94 returns `state.src` whenever `state.key === key`.
  - Ran the real hook (jsdom, React 19) through open → close → reopen of `/photos/7`. The reopen's first render was `status=ready src=blob:…/1 (REVOKED)`, then `blob:…/2`.
  - Reach: ImageGrid opens its own Lightbox with the grid's fetcher (image-grid.tsx:184-191). That covers kastlan unit-rooms-tab.tsx:70, unit-document-gallery.tsx:71 and room-inspector.tsx:254/:303. The room inspector uses the offline handover photo fetcher, where a refetch may fail outright. It also covers keksdose invoice-review.tsx:520.
- **Fix:** forget the URL when it is revoked. Either reset the state in the cleanup, or keep a `liveKey` ref that the effect sets and the cleanup clears, and return "loading" unless `state.key === liveKey`. A per-mount cache that keeps the blob while the hook lives would also save the refetch. No API change.
- **Order:** none.

### BUG-4 · sev 3 · bug · XS · PROVEN · touches: `src/hooks/use-focus-trap.ts`
- **What:** the trap's tabbable list treats `button`, `input`, `a[href]` and similar elements as tab stops even when they have `tabindex="-1"`. Only the bare `[tabindex]` clause excludes -1. Roving-tabindex panels end in such an element, so:
  - `last` is not the last real tab stop. Tab from the real last stop is not wrapped, and focus leaves the panel for the end of the document while the panel stays open.
  - Shift+Tab from the first stop "wraps" onto a non-stop.
- **Evidence:**
  - use-focus-trap.ts:46-47 (`button:not([disabled])` etc.) and :168-177.
  - Ran the real hook (jsdom) on header buttons plus a day grid with one stop (tabIndex 0) and a last cell at -1:
    - Tab on the active day: `defaultPrevented = false`;
    - Shift+Tab on the first button: focus went to `d31 (tabIndex -1)`.
  - Reach:
    - the single DatePicker's popover is a bare MiniCalendar, whose grid ends in -1 day cells (mini-calendar.tsx:621, :711; date-picker.tsx:543, :1145). Used in 8 app files.
    - MonthPicker's popover (month-picker.tsx:550, :744; used in 4 app files).
    - the phone picker sheet, whose options are `tabIndex={-1}` buttons (combobox-core.tsx:750, :813). The fork's run shows Tab leaving the sheet with the sheet still open.
- **Fix:** filter the list with `el.tabIndex >= 0` (and skip `[hidden]` / `inert`), or append `:not([tabindex="-1"])` to every clause. Blast radius: every trap (Modal, FullBleedDialog, PickerSheet, Popover, Tour, CommandPalette). The change only removes elements a native Tab never reaches, so no correct tab order changes.
- **Order:** before BUG-5. This is the hooks half of the sheet's Tab leak.

### BUG-5 · sev 2 · bug · S · PROVEN · touches: `src/components/combobox-core.tsx`, `src/components/picker-sheet.tsx`
- **What:** in the phone layout, the picker sheet ignores the keyboard:
  - arrows and Enter do nothing;
  - no row shows as active;
  - the search box carries no `aria-controls` or `aria-activedescendant`.

  ComboboxPanel's key handler sits on a div that wraps only the list (combobox-core.tsx:872). The sheet's search box is in PickerSheet's header (picker-sheet.tsx:236), outside it; the comment at :869-871 says the keys reach it, and they don't. The active-row style is also gated on `!isPhone` (:764). The phone layout also applies to desktops at Large below 960 px and at Extra large below 1152 px, and to tablets with a keyboard.
- **Evidence:** a run on EntityCombobox with the phone layout stubbed (fork, `sheet-keys.test.tsx`):
  - after ArrowDown ×2 and Enter, nothing was chosen, `aria-activedescendant` was empty, and 0 rows were active;
  - after Tab, focus was on BODY with the sheet still open (that is BUG-4).
- **Fix:** PickerSheet takes `onSearchKeyDown`, `listboxId` and `activeId`, and passes them to DropdownSearchHeader, which already takes `onKeyDown`. ComboboxPanel passes its handler and shows the active row on phones too. Not breaking.
- **Order:** after BUG-4, with BUG-1.

### BUG-6 · sev 2 · bug · XS · PROVEN · touches: `src/lib/decimal-marks.ts`
- **What:** in a comma-decimal locale (de), the thousands-shape rule `/^\d{1,3}(\.\d{3})+$/` reads "0.500" as five hundred. A group that starts with 0 can never be thousands grouping, and a dot-habit typist writing 0.5 or 0.125 gets a value 1000× too large, in AmountInput, NumberInput, NumberField and MoneyField alike.
- **Evidence:** decimal-marks.ts:57-59. Ran the real `readTyped` with `decimalMark("de-DE")`:
  - "0.500" → `0500`;
  - "0.250" → `0250`;
  - "1.5" → `1.5`;
  - "0,500" → `0.500`.

  Reach: keksdose's provider locale is German, with 30 amount and number field sites. KS and kastlan run de-CH, which uses a "." decimal, so they are unaffected.
- **Fix:** `/^[1-9]\d{0,2}(\.\d{3})+$/`, plus a test row for "0.500". Not breaking.
- **Order:** none.

### BUG-7 · sev 2 · bug · S · CONFIRMED · touches: `src/components/data-table.tsx`, `src/components/data-table-labels.ts`
- **What:** three keyboard and screen-reader defects in DataTable's own chrome, all reachable on default tables.
  - **(a) The closed "Columns" drawer is only `w-0 overflow-hidden`.** Its Close and Auto-size buttons and one checkbox per column stay in the tab order and the accessibility tree. Tab after the last cell walks into invisible controls, and closing the drawer with its X leaves focus on the now-invisible X.
  - **(b) The phone filter sheet (`MobileFilters`) is a modal with no name and no trap.** It puts `role="dialog" aria-modal="true"` on the backdrop. The "Filters" title is not linked, focus is neither moved nor trapped, and Escape does nothing. This is the one dialog left over from the 2026-09-22 a11y finding "Only Modal manages focus", which was otherwise fixed.
  - **(c) Every column's filter button and panel is named just "Filter".** "Filtered" is shown by colour alone, and the button has no `aria-expanded`.
- **Evidence:**
  - (a) data-table.tsx:2756-2800: the rail button gets `tabIndex -1` only while the drawer is open, the drawer has no `inert` or `hidden`, and the X is at :2792-2798. Column settings are on by default (`columnSettings ?? !minimal`, :1163). The apps have 14 (kk), 32 (ka) and 7 (KS) DataTable sites, and only 2 are `minimal`.
  - (b) data-table.tsx:2911-2975: scroll lock and history are present, but there is no `useFocusTrap`, no Escape handler and no `aria-labelledby`.
  - (c) data-table.tsx:2409, :2415 and :2418-2419; data-table-labels.ts:101.
- **Fix:**
  - (a) `inert={!showSettings}` on the drawer, and focus the rail button when the X closes it.
  - (b) move the role and `aria-modal` onto the panel, link the title, and add `useFocusTrap` and Escape, as in FullBleedDialog.
  - (c) a `filterColumn(name, active)` label with `filter` kept as the fallback (7 catalogues), plus `aria-expanded` and `aria-haspopup="dialog"`.

  Not breaking. App tests that count tabbables may shift.
- **Order:** (b) after BUG-4.

### BUG-8 · sev 2 · bug · S · PROVEN · touches: `src/theme/color.ts`, `src/theme/palette-derive.ts`, `src/theme/palette-presets.ts`
- **What:** the colour-role deriver solves contrast on the float colour and then rounds to hex. The hex lands just under the target, and `auditPalette`'s 0.05 slack still reports it as passing. Shipped, selectable DERIVED_PRESETS hold sub-AA pairs, and the "Contrast" preset's dark brand fill on surface-2 is 2.998 against WCAG 1.4.11's 3:1.
- **Evidence:**
  - `solveLightness` measures float RGB (color.ts:199-210). The rounding happens in `oklchToHex` (palette-derive.ts:225-229, :397-412), and the slack is at :566.
  - Brand #000000, light: moneyIncome solves to 4.5000 as a float, but the shipped `#00725e` on `#eddde1` measures 4.4922, with `passes: true`.
  - Across 4,096 brands × 2 modes, 33,821 checks fell below their real threshold.
  - The shipped presets measured exactly:
    - ink: 1 pair light, 1 dark;
    - moss: 2 + 2 (moneyIncome on bgHover 4.470);
    - plum: 3 + 2;
    - contrast: 2 + 2.
  - keksdose lists every preset in its picker (features/auth/appearance-card.tsx:168).
  - Side defect, sev 1: a grey brand tints every surface pink, because `rgbToOklch` gives hue 0 for chroma 0 (color.ts:94) and `surfaceSet` applies full chroma (palette-derive.ts:186-191). `#808080` → page `#eddde1`. No app derives from a grey brand.
- **Fix:**
  - Measure the hex-rounded colour in `solveLightness`, or step once more after rounding.
  - Keep the slack only for the `color-mix` roles, where the browser's float mix really differs from the hex.
  - Regenerate DERIVED_PRESETS; derived-presets.test pins them.
  - Scale surface and text chroma by `min(1, brand.c / 0.06)`.

  Preset hex values move about one step. No API change.
- **Order:** none. Colour-roles doc :645 knowingly accepts one 4.47. The slack is a decision, but its reason ("rounding") does not hold for hex-to-hex pairs, and the solver defect itself is decided nowhere.

### BUG-9 · sev 2 · bug · S · PROVEN · touches: `src/components/combobox-core.tsx`, `src/components/combobox.tsx`, `src/components/multi-select.tsx`, `src/components/chip.tsx`
- **What:** in the combobox family, the Enter that confirms an IME composition (Chinese, Japanese) picks an option or submits. No Enter branch in the family checks `isComposing`. The kit guards this elsewhere: feedback-thread.tsx:814-820 (with its Safari note), inline-edit-field.tsx:396 and form-actions.tsx:438.
- **Evidence:**
  - Enter branches: combobox-core.tsx:635, multi-select.tsx:147, chip.tsx:1267, and combobox.tsx's Enter branches.
  - A run with a composing Enter (fork, `ime.test.tsx`, simulated in jsdom rather than typed through a real IME): EntityCombobox chose option 1, and Combobox called `onSubmit`. In keksdose that `onSubmit` creates a category (budget-cells.tsx).
  - KS offers zh (shared/i18n/languages.ts:35).
- **Fix:** one `isImeEnter(e)` helper (`nativeEvent.isComposing || keyCode === 229`) and an early return in each Enter branch. No API change.
- **Order:** with BUG-1.

### BUG-10 · sev 2 · risk · S · PLAUSIBLE · touches: `src/components/data-table-filter-popover.tsx`, `src/components/data-table-filters.ts`
- **What:** the DataTable number filter is a native `type="number"` input, the only numeric entry in the kit that bypasses decimal-marks.
  - Where the browser refuses a comma, "12,50" reads as empty: the filter silently stays off while the box shows the text.
  - Separately, a URL value such as `f.amount=abc..` decodes to NaN bounds. Every comparison with NaN is false, so the filter matches everything while showing as active.
- **Evidence:** data-table-filter-popover.tsx:236-253; data-table-filters.ts:81-82 (`Number(state.min)` with no finite check). keksdose uses it on amounts (use-transaction-columns.tsx:402, accounts-page.tsx:902, :926), German users. The comma behaviour was not tried on a device.
- **Fix:** a text input read through `readTyped`, as NumberInput does, and `Number.isFinite` guards in `rowMatches` and the decoder. Not breaking.
- **Order:** after BUG-6, which touches the same reader.

### BUG-11 · sev 2 · bug · XS · PROVEN · touches: `src/lib/format.ts`, `src/components/amount-input.tsx`
- **What:** both decimal-rounding helpers build `` `${n}e${d}` `` from `String(n)`. `String(n)` is itself in exponent form below 1e-6 and at or above 1e21, so the string becomes "5.55e-17e2", which is NaN. This is U-2's class (2026-08-24), left in the two helpers that audit did not touch.
  - `roundToCurrency(0.1 + 0.2 - 0.3, "EUR")` returns NaN, and the module's own docstring promises it handles "0.1 + 0.2".
  - AmountInput's `settleAmount` turns a typed "0.0000001" or a 22-digit figure into "": the field is blanked on blur.
  - `roundToCurrency(-0.004)` returns -0, which `formatMoney` prints as "-0,00 €".
- **Evidence:** format.ts:399; amount-input.tsx:294. Ran the real `roundToCurrency`:
  - 5.55e-17 → NaN (formatted "—");
  - 4e-7 → NaN;
  - 1e21 → NaN;
  - -0.004 → -0, formatted "-0,00 €".

  Ran `settleAmount` (lines 288-302, compiled as-is): "0.0000001" → "" and "1000000000000000000000" → "".

  Reach: public export, called by keksdose at transaction-editor.tsx:224, :245 and fx-estimate-row.tsx:97. The products there are float, so a tiny product (leg 0.01 × partner 0.01 / base 1000) shows "NaN" in the partner field.
- **Fix:** one `roundHalfAway(n, digits)` in lib that both helpers call:
  - keep the string trick only while `String(Math.abs(n))` has no "e" — that is what makes 1.005 → 1.01 work;
  - in exponent form, return 0 below 1 (anything under 1e-6 is under half of any minor unit up to 6 digits), and n itself at or above 1e21;
  - normalise the signed result with `|| 0`, so -0 never leaves (the sign is re-applied after rounding today, so `magnitude || 0` alone would not do it).

  The property test is `Number.isFinite(roundToCurrency(x)) && !Object.is(roundToCurrency(x), -0)` for every finite x. Not breaking.
- **Order:** none.

### BUG-12 · sev 2 · consistency · S · CONFIRMED · touches: `src/components/currency-select.tsx`, `src/components/grouped-picker.tsx`
- **What:** two pickers whose roles lie to a screen reader.
  - **CurrencySelect.** Its trigger announces a combobox with a listbox popup (currency-select.tsx:241-243). The list at :302 has no listbox role, its rows are plain buttons rather than options, the chosen currency is not marked selected (colour only), and it has no arrow keys.
  - **GroupedPicker.** Its trigger says `aria-haspopup="dialog"` (grouped-picker.tsx:86), but the panel is not a dialog. The selection is shown by colour only, and the search box has no name beyond its placeholder.
- **Evidence:** keksdose uses CurrencySelect in 5 files and GroupedPicker in 2 (incl. shared/components/category-select). The 2026-09-22 audit filed the same defect on MultiSelect, which is now fixed (multi-select.tsx:311). These two were not in it.
- **Fix:**
  - CurrencySelect: move it onto ComboboxPanel as CountrySelect did, or add listbox/option/selected markup and arrow keys.
  - GroupedPicker: a named dialog panel, and `aria-current` on the selected item.

  Not breaking.
- **Order:** after BUG-1, if CurrencySelect moves onto ComboboxPanel.

### BUG-13 · sev 1 · risk · XS · CONFIRMED · touches: `package.json`
- **What:** five modules import `useEffectEvent` from "react", which is stable only from React 19.2: sign-in-form.tsx:1, checkout-processing.ts:1, command-palette.tsx:1, column-mapper.tsx:1 and demo-countdown.ts:1. The peer ranges say `"react": ">=19"` and `"react-dom": ">=19"` (package.json:109-110).
- **Evidence:** on React 19.0 or 19.1, either the build refuses the import or the sign-in page throws "useEffectEvent is not a function". Not live: kk ^19.2.4, ka ^19.2.7, KS ^19.3.0. Next in line is property-management, the adopter named in ADOPTING.md.
- **Fix:** peers `>=19.2`. Non-breaking for the three apps.
- **Order:** none.

### BUG-14 · sev 1 · bug · XS · PROVEN · touches: `src/components/data-table-pagination.tsx`
- **What:** a paged table filtered down to no rows shows "1–0 / 0" in its pager.
- **Evidence:** data-table-pagination.tsx:115 always builds `pageRange(page*pageSize+1, …, total)`. Running the real labels with page 0, size 25 and total 0 gave "1–0 / 0".
- **Fix:** use `labels.rowCount(0)` when `total === 0`. Not breaking.
- **Order:** none.

---

## The earlier audits: still fixed, or regressed?
- **2026-08-24, U-1 … U-14:** all still in place. Scroll lock is refcounted, the history "debt" handling is in, `useAnchoredRect` keeps its `sameRect`, `parseIsoDate` round-trips, and the dismiss refs are written in effects. U-2's exponent class survives in two helpers it never touched (BUG-11).
- **2026-09-22, checked:**
  - Fixed:
    - DataTable resize no longer leaks listeners or poisons the body style (pointer capture, unmount mid-drag restores; data-table.tsx:1593-1653);
    - controlled filters + urlSync no longer loop, and persistence compares by value (use-table-state.ts:330-380);
    - shift-range selection anchors on the row key (:1765-1821);
    - urlSync still drops the overlay history marker, but `useOverlayHistory` re-tags it;
    - ComboboxPanel's listbox ARIA and live status line;
    - MultiSelect's selected state;
    - the O(n²) phone-sheet scan;
    - Popover's role and focus;
    - Tooltip is associated and dismissible;
    - dropdown Escape.
  - Still open: "Only Modal manages focus" has one remnant, DataTable's MobileFilters (BUG-7b). The listbox ARIA was fixed for desktop but not for the phone sheet (BUG-5).

## Checked and sound (not filed)
- **Session refresh (0.34):**
  - one flight per tab;
  - definitive vs transient classification;
  - retry counts and backoff;
  - stale-stamp replay bounded by the RESTAMPED/REFRESHED marks;
  - `onEnded` once per token;
  - the timeout aborts the signal;
  - interplay with `attachServerWake`.
- **`saveBlob` / `filenameFromDisposition`:** RFC 8187 decode, the quoted-string parse, path stripping, never throws.
- **SettingsLayout `document.title`:** StrictMode-safe, a group switch restores before writing, and unmount runs before the next page's mount effect.
- **HelpPopover:** names, `aria-controls` only while open, `type="button"`, Escape stopped at the panel inside a Modal; the "?" sits beside the `<label>`, not in it, so the field's name is not polluted.
- **Write locks:** a lock flip remounts the field (Tooltip wrapper), but no app drives `disabledReason` from a pending save, so this is not filed.
- **Groups in the audit log:** null and erased targets, `groupNoun` fallback.
- **SeriesChart `maxRows` thinning:** stays within budget, a window between samples, holes, a category axis excluded.
- **Hooks:**
  - useBodyScrollLock (refcount, root overflow);
  - useCloseTransition;
  - useMediaQuery / useBreakpoint (complementary range queries);
  - useCopyToClipboard (mounted guard);
  - useAnnounce;
  - useHotkey;
  - useDebouncedCallback (cancel on unmount is documented; no users);
  - useFileDrop depth counting;
  - useRowSwipe click swallow (reset on pointerdown);
  - useNoIndex;
  - `useOncePerKey` (verify-email is StrictMode-safe).
- **Lib:** dates.ts presets and DST; server-wake counting and the replay.
- **0.33 billing UI and pay page** (fork):
  - prices with 0, missing, negative or JPY/BHD values;
  - `billingDaysLeft` reads a date-only string as local;
  - checkout-processing's StrictMode claim and cleanup;
  - pay-page script order, bad config, `isPageUrl`, locale mapping.
- **Combobox async search:** stale results are dropped, closing invalidates the request in flight, and the debounce is cleared.
- **Noted, not filed:**
  - `useAnchoredPanel`'s viewport update has no equality guard (a re-render per visualViewport scroll); efficiency, not a defect;
  - `formatMoney` prints -5.55e-17 as "-0,00 €", and SignedAmount colours it as a loss unless `flatWithin` is set; it is documented as the caller's job;
  - the translation export's file name uses the UTC date (translation-review-parts.tsx:256).
