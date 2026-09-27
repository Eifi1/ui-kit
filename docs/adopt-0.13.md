# Adopting `@eifi1/ui-kit` 0.13 — per repository

Built from the three apps' notes on adopting 0.12: keksdose F0–F9, kastlan 40–50 plus
its two bug reports, and lenkbank P7–P9. Almost everything is additive. The visible
changes are marked. `CHANGELOG.md` → `0.13.0` has the release notes, and the showcase (⌘K)
has every prop live.

## Everyone

1. Bump to `^0.13.0` by hand; a caret below 1.0 locks the minor version.
2. **Visible changes:**
   - **Money settles to the currency's minor unit.** `AmountInput` / `RhfMoneyField` with a
     `currency` round the figure to its minor unit on blur, Enter and each calculator
     result: 2 decimals for CHF/EUR, 0 for JPY, rounding half away from zero. "12.345"
     becomes 12.35, and `100/3` becomes 33.33. `digits` overrides the rounding and
     `min` / `max` clamp the value. A field without `currency` is not rounded.
   - **The decimal mark follows the locale** in `AmountInput`, on its numpad key too. Only
     locales whose `Intl` mark is "," (fr-CH, de-DE, …) change; de-CH and it-CH keep ".".
     `value` / `onChange` stay dot-form.
   - **`Rhf*` `disabled` keeps the value.** It disables the control only; the value is
     still submitted and `rules` still run. `excludeWhenDisabled` restores react-hook-form's
     drop-the-value semantics. A form-wide `useForm({ disabled })` is unchanged.
   - **`Delta` and `StatTile` show the figure at zero** ("– 0 %"), where they showed only a
     dash. A missing value still renders nothing.
   - **`ErrorBoundary` is the one crash screen** (lenkbank P7). Every default screen shows
     the quoted `name: message`, Reload and Try again, and a copy-report button, and
     `showDetails` is now **on** by default. In tests, the CopyButton's empty
     `role="alert"` region means `getByRole("alert")` needs scoping; call
     `ErrorBoundary.forgetReports()` in `beforeEach` in any test that files reports.
3. **New label keys** (only if you type a complete `UiKitLabels`): `errorBoundary.reload`,
   `updateTitle`, `updateMessage`, `offlineTitle`, `offlineMessage`, `copyReport`,
   `reported`, `reportedAs`. Every `@eifi1/ui-kit/i18n/<code>` catalogue has them.
4. **The crash screen's rule:** the fallback, and any `fallback` or `actions` you pass, must
   not use the router, a query client or auth. A crash is when those may be broken. A
   boundary outside `UiKitProvider` shows English.

---

## keksdose

| Gap | Use | Notes |
|---|---|---|
| F0 FeedbackThread `<time title>` | drop the guard entry | the full date is in the kit Tooltip |
| F1 join-page, share-target-page `navigate(…, { replace: true })`; forced-password-change full reload | `Button href replace` / `TextLink replace`; `reloadDocument` | map `replace` in your provider `linkComponent`: `({ href, replace, ...p }) => <Link to={href} replace={replace} {...p} />` |
| F2 accounts-page row icons calling navigate() | `IconButton href` | same routing rule as `Button href` |
| F3 login / register / forgot-password text links | `TextLink tone="primary" \| "secondary"` | |
| sync chip `--icon-button-tone` class | `IconButton toneColor={{ light, dark }}` | |
| F4 transactions, payees, accounts, banks headers | `PageHeader size="compact"`, `mobileLayout="inline"` | `compact` is the `text-xl` title at every width |
| F5 mobile-transaction-list day-group header | `SectionLabel variant="band"` | sticky is yours (`sticky top-0`) |
| F6 ~7 `portal` pins that only kept bubbles out of jsdom queries | `Tooltip lazy` | in place in the browser, absent until hover or focus |
| F7 account menu admin Chip | `TopBarActionMenu header={{ extra: (close) => … }}` | |
| F8 payees-selection-bar "View report" | `Button href` inside `BulkActionBar` | links rove with the arrow keys like buttons |
| F9 support-thread canned replies | `FeedbackComposer ref` → `insertText(text)`, `placeholder`, optional `value` / `onValueChange` | |
| app error-boundary.tsx + crash-report.ts | `<ErrorBoundary resetKeys={[pathname]} appVersion={__APP_VERSION__} onReport={fileCrash} actions={…clear cached data and reload…} />` | `fileCrash(report: CrashReport)` keeps `safeUrl`'s allow-list (or move it to `redact`), the demo/HMR checks and offline buffering (each returns `{ filed: false }`), and returns `{ reference }`. `isChunkLoadError`, per-load dedupe and the cap are in the kit now. The `error.offline_*`, `error.reported*`, `error.retry` and `error.reload` keys can go |

## kastlan

| Replace | With | Notes |
|---|---|---|
| RhfField + visually disabled control for locked presets | `Rhf* disabled` | the value is submitted now |
| `RhfNumberField digits={2}` money fields | `RhfMoneyField` (`digits`, `min`, `max`) | deposit-release: `max={balance}` |
| 40 decimal mark | nothing to do | follows `Intl`; de-CH / it-CH keep "." |
| 41 `digits={0} calculator={false} emptyValue=""` | `RhfIntegerField` | each default overridable |
| 42 RhfTextField input classes | `inputClassName` | |
| 43 building-step "Add building" | `WizardStep actions` | |
| 44 room-inspector, handover-detail defect rows | `ListItem titleLines={2 \| "all"}` | pair with `align="start"` |
| 45 invoice-list, service-charges icon links | `IconButton href` | |
| 46 invoice-columns `tone="inherit"` inside Tone | `TextLink tone="warning"` | |
| 47 international-rent-calculator onChange workaround | `ToggleGroup semantics="pressed"` | aria-pressed buttons, one always selected |
| 48 Delta at zero | nothing to do | shows "0.00 %" now |
| 49 gantt `[&>li:last-child]:ms-auto` | legend entry `align: "end"` | |
| 50 FeedbackThread relative time | nothing to do | the kit's `formatRelativeTime` |
| error boundary | `<ErrorBoundary resetKeys={[pathname]} appVersion={…} />` | |

## lenkbank

| Replace | With | Notes |
|---|---|---|
| P7 app/error-boundary.tsx | `<ErrorBoundary resetKeys={[pathname]} appVersion={__VERSION__} />` | your report layout is built in; the `error.title`, `error.hint`, `error.copy`, `error.copied` and `error.details` keys can go |
| P8 `formatQuantity(value, digits, unit)` | `formatNumber(value, { digits, unit })` / `useKitFormat` | narrow no-break space before the unit; "—" without it |
| P9 11px chart headings | `SectionLabel size="md"` | it is the 11px step (since 0.11) |
| 3 hand-drawn badges | `Chip size="xs" shape="square" caps` | non-interactive without `onClick` / `href` |
