# Adopting `@eifi1/ui-kit` 0.32 and `eifi1-server-kit` 0.6

Two rounds that ran in parallel (Marcel, 2026-10-07/08), reviewed by all three apps:
- **text size and contrast:** `docs/text-size-harmonization.md`, settled in §10;
- **billing:** `docs/billing-harmonization.md`, settled in §12.

Each contract's per-app section is the checklist. This note is the kits' side.

## Everyone, on the bump

1. Bump the kit to `^0.32.0` by hand (a caret below 1.0 locks the minor version). Take
   server-kit 0.6.0: the release wheel's URL in the install line, with the sha256 pinned
   in `uv.lock`.
2. **Changes you will see without touching a setting** (Normal size):
   - **Fields are at least 16 px on touch** (`pointer: coarse`), so iOS no longer zooms
     the page when a field takes focus. Desktop is unchanged.
   - **Focus frames:**
     - Button and IconButton show a frame on keyboard focus only (`focus-visible`), so a
       tap or a click leaves none;
     - every frame takes its width from `--focus-ring-width` (2 px, 3 px with More
       contrast);
     - the shared class is `FOCUS_RING`.
   - **Facts that lived only in a tooltip show in the layout on touch:**
     - `disabledReason` as a line under the control (Button, IconButton, Chip, Switch,
       Checkbox, ToggleGroup; `disabledReasonDisplay` overrides);
     - a field's hint as its caption;
     - `DateMark`'s exact date beside the relative one.
   - **Charts:**
     - a chart with an axis on each side drops its right axis when the plot would be
       too narrow (below about 288 px at Normal); the unit moves to the tooltip,
       readout and legend;
     - `SeriesChart` `height` takes a CSS length (`"min(20rem, 60dvh)"`). A number stays
       px and does **not** follow the text size.
   - **InvitationsPanel's** resend and revoke are `RowActions`: two icons at Normal, one
     "⋯" menu at Large.
   - **`PHONE_QUERY` is deprecated:** use `usePhoneLayout()`, which follows the text
     size. Every px `useMediaQuery` of yours should become `useBreakpoint(…)` for the
     same reason.
3. **server-kit 0.6, changed:**
   - `PROFILE_NOT_NULLABLE` gains `text_size` and `contrast`, so an explicit null for
     them is a 422;
   - `"plan"` reads as `AdminAction.PLAN`;
   - `admin_action_record` keeps any other app action as written (keksdose's 0.31.1
     finding).
4. **Lint (optional, recommended):** the kit refuses `text-[Npx]` and `min-[Npx]:` /
   `max-[Npx]:` in class strings (see its `eslint.config.js`). Copy the two rules once
   your own sites are converted.

## Text size and contrast

**Wiring** (contract §3, §6, §10.3, §10.6):
1. **In `main.tsx`,** beside `applyPersistedTheme`:
   ```ts
   const textSize = createTextSizeStore("<app>-text-size");
   const contrast = createContrastStore("<app>-contrast");
   applyPersistedTextSize("<app>-text-size", { account: () => persistedUser()?.text_size ?? null });
   applyPersistedContrast("<app>-contrast", { account: () => persistedUser()?.contrast ?? null });
   ```
   The `account` fallback paints the account's last known choice before React renders,
   offline too. A boot splash painted from `index.html` uses `TEXT_SIZE_INLINE_SCRIPT` in
   `<head>`, with the root rules inline beside it (see 0.32.1 below); the stored format is
   frozen.
2. **In the appearance group,** `TextSizeSetting` and `ContrastSetting` beside
   `ThemeSetting`, with catalogue entries. `useAccountAppearance({account, device,
   setDevice, save, isDemo})` applies the language's order (the device's own choice → the
   account → the default) and never writes the account on its own. A demo writes only
   the device.
3. **The server:** columns `text_size` and `contrast` on the user (nullable: null means
   never chosen), with server-kit's `TEXT_SIZES` / `CONTRAST_MODES` and the optional
   fields on `UserResponse` and `ProfileUpdate`.

**What follows by itself once a person picks Large** (kit parts only):
- the root grows to 125 % / 150 %, and with it everything in rem;
- `md:` and the other breakpoints move to 60 / 72 rem, so the phone layout comes
  earlier;
- Button and IconButton reach 48 px, and IconButton shows its label;
- DataTable phone cards put labels above values without truncation;
- ListItem wraps;
- FormActions stack on a phone;
- charts get larger labels and three ticks, with legends under the chart;
- StatTile shows one big number;
- the AppShell bar shows 4 entries plus "More" (3 at Extra large).

**What you decide per site:**
- **Dense row actions:** `RowActions` (or `rowActionsColumn<T>()` for a DataTable), so
  several icons fold into a "⋯" menu at Large.
- **An icon on content** (an overlay, a map, a viewfinder): `labelVisible={false}`.
- **The bar's order:** `mobileBarMax` takes your nav array's order, so put the four most
  used first (per role, if you like). The More cell carries the hidden entries' links
  for your tours.
- **A DataTable's hidden phone columns:** `mobileDetailsInRow` shows them in the opened
  row.
- **Your own fixed px:**
  - text → `text-micro` (10 px) / `text-caption` (11 px) / Tailwind sizes;
  - chart heights → CSS lengths;
  - windowed rows → `useWindowedRows`' measured heights (`offsetOf`, `estimate`,
    `measureRef`);
  - a mirrored axis band → `facingHeadingPad(side, width, scale)`.
- **Your hard-coded colours** (`text-slate-*` and the like) don't follow More contrast.
  Move them to the tokens.

**Checking it:** look at your main screens at 360 px / 150 %. The kit's
`scripts/screenshot-sizes.mjs` shows how: Playwright, `?text-size=`, and an overflow
report.

## Billing

Read the contract's §12 first. The kit parts never send a request.

**ui-kit:**
- **Picking and showing the plan:**
  - `PlanPicker` / `PlanCard`: gross prices in CHF and EUR, yearly first,
    `pricePreview` for the provider's localised price;
  - `SubscriptionStatusChip`;
  - `SubscriptionActions`: "Payment and invoices" (the provider's portal) and a visible
    "Cancel subscription".
- **Telling the person:**
  - `BillingBanner`: trial ending, grant ending, payment failed, plan ended, the
    **guest** variant (never the owner's status), and "processing" after checkout;
  - `PlanLimitNotice`: upgrade, or contact by mail.
- **The read-only state:**
  - `combineWriteLocks([demo, billing])` → one `WriteLockProvider`. A nested unlocked
    provider would reopen an outer lock;
  - `billingLockAt` / `isBillingReadOnly` let a device lock in advance from the known
    dates.
- **Codes:** `isPlanLimit(err)` (also reads keksdose's legacy `plan_budget_limit`) and
  `isBillingError` / `authErrorCode` for `billing_disabled`, `billing_read_only`,
  `billing_not_configured` and `plan_limit`.
- **Legal:** `LegalKitSection section="disclaimer" variant="commercial"`, for the
  release that turns billing on (the Merchant of Record sells in its own name).
- The `billing` labels in seven languages. The English group label is "Subscription".

**server-kit 0.6, `eifi1_server_kit.billing`:**
- **Settings:** the `BillingSettings` mixin (off by default; the provider and both
  secrets required to switch on; price ids per plan, currency and interval, retired ids
  kept findable; the launch date).
- **Plans:** `PlanSpec`, `plan_catalogue`, `normalize_plan`, `check_limit` → 402
  `plan_limit`, `minor_to_decimal`.
- **Standing:** `in_good_standing`, `grant_holds`, `trial_ends_at` (30 days),
  `beta_comped_until` (12 months), `is_beta(invitation_created_at, launch)`.
- **The gate**, two equal shapes:
  - `billing_write_allowed(method, path, *, standing, allow=…)` at the auth dependency;
  - `refuse_billing_read_only(in_good_standing, what)` at your own write choke points.
- **Webhooks:**
  - `verify_webhook_signature` for Paddle and Lemon Squeezy, written with `hmac` and
    checked against their docs;
  - `parse_webhook_event` → `NormalisedEvent` (five kinds);
  - the `EventStore` protocol and `dispatch(…)` with the ordering guard and the rule that
    a holding grant isn't overwritten;
  - `webhook_answer`;
  - `checkout_custom_data(payer_ref)`.
  - Lemon Squeezy documents no event id; the kit uses the body's SHA-256. Confirm with
    the provider before launch.
- **Shapes:** `BillingStatus`, `BillingOverview`, `CheckoutRequest` / `CheckoutAnswer`,
  `PlanChangeRequest` / `PlanChangeResponse`, `SyncRefusal`.
- **Errors:** `BillingError` (404 / 402 / 503 / 400) and `PlanLimitError`, in
  `CONTRACT_ERRORS`.
- **The operator:** `AdminAction.PLAN`.

**Still open for Marcel** (nothing in the kits waits for them): the provider, the plans,
limits and prices, and the launch date per app. Billing stays off by default until then.

## Per app

The contracts' per-app sections hold the lists: text size §7 and §10.13–10.14, billing
§11 and §12.28–12.29.

## 0.32.1 and server-kit 0.6.1

From the apps' 0.32 reports and a sweep of every showcase page at 360 px / Extra
large. Bump to `^0.32.1` and take the server-kit 0.6.1
wheel.

**Changes you will see:**
- **ToggleGroup wraps at Large and Extra large** for every option count and placement but
  the strip, where 0.32.0 wrapped only a field of four or more. A row breaks only where its
  labels don't fit, so a wrap only replaces a truncation. `ThemeSetting variant="toggle"`
  now defaults to `overflow="wrap"`, like `TextSizeSetting` and `ContrastSetting`, so an
  `overflow="wrap"` you pass is no longer needed.
- **One column below the breakpoint:** `Hero`, `FeatureRow`, `TrustStrip`, `PlanPicker`,
  `ChoiceCardGroup` and the translation review editor get `grid-cols-1`. An untemplated
  column grew to its widest unbreakable line (Kurvenschmiede's landing ran 80 px past a
  360 px phone). A `contain: inline-size` workaround can go.
- **A ToggleGroup's text `hint` is a caption under the group** at every size, as on
  Select; the label line keeps a `FieldHint` "?" only. This reaches `TextSizeSetting`,
  `ContrastSetting` and `ThemeSetting`'s toggle (keksdose: with `labelPlacement="above"`
  the hint sat beside the label, a one-word column at Extra large).
- **RowActions' "⋯" menu keeps its clicks:** an entry's click (and Enter / Space) no
  longer reaches a clickable row or a DataTable's `onRowClick` through the portal. A
  wrapper that stops propagation around `RowActions` can go.
- **AlertBanner's actions wrap** on a line of their own (the demo strip's "Request access"
  and "Sign in" at Extra large).
- **Nothing runs past a 360 px phone at Extra large**, from a sweep of every showcase page:
  - `Pagination`: the page numbers wrap between the arrows; ±1 pages around the current
    one on a phone at Large (±2 elsewhere);
  - `DatePicker` / `DateRangePicker`: the value wraps at Large instead of losing its end;
    with `step`, the ‹ date › row stacks on a phone at Large, the field on its own line;
  - `MonthPicker`'s stepper and `WizardStepper` wrap;
  - `PhoneInput`: the number takes its own line under the country on a phone at Large;
  - `CardHeader`: with `stackAction` unset, the action stacks below `sm` at Large, where
    an IconButton shows its label. Pass `stackAction={false}` for an action you keep an
    icon (`labelVisible={false}`);
  - a joined horizontal `ButtonGroup` wraps at Large, each member drawing its frame;
  - `ShareCard`'s row controls wrap inside the row. Under a write lock with the form
    present, a row's reason stays in its tooltip (on touch at Normal too), since the
    form already says it.
  Re-check your main screens at 360 px / 150 %: a sweep only finds what runs past the
  screen, not what is cut inside a card.

**New:**
- **`RowAction.href`** (+ `external`): an action that navigates is a real link, inline
  and in the "⋯" menu, so open in a new tab and a middle click work. `onSelect` becomes
  optional beside it and still runs. A refused or pending action stays a button. Replace
  `onSelect: () => navigate(…)` with `href`.
- **`name` accepts `null`** on `RowActions` and `rowActionsColumn`: drop the `?? undefined`.
- **`billing.notConfigured` and `billing.disabled`:** the words for `billing_not_configured`
  and `billing_disabled` in seven languages (`useBillingLabels()`). Your own can go.

- **`max-*` breakpoint queries are range syntax:** `useBreakpoint("max-md")` and
  `usePhoneLayout()` now ask `(width < 768px)` (scaled with the text size), the exact
  complement of `(min-width: 768px)`. DataTable and TranslationReviewPanel ask
  `usePhoneLayout()`. At a fractional viewport width the old pair left a gap where
  DataTable said phone and `usePhoneLayout` didn't. **Your tests:** a `matchMedia` stub
  that matches the string `"max-width: 767px"`, or fakes a wide screen by answering every
  query `true`, now flips. Answer `wide !== query.includes("width <")` instead. The
  deprecated `PHONE_QUERY` keeps its old string.
- **Labels wrap at Large:** StatusDot, Chip and InlineEditField's display, instead of
  truncating. SwipeableRow's hidden keyboard buttons no longer widen the page. The dark
  scrollbar follows the palette and More contrast.
- **New labels and exports:** `appearance.saveFailed` (the words for a pick the account
  couldn't keep, which `useAccountAppearance` leaves to you); the admin log's `plan`
  action (server-kit's `AdminAction.PLAN`) in seven languages; `remPx` / `useRemPx` and
  the `ChartHeight` / `RemLength` types.

**Corrections and notes to the 0.32 adoption** (keksdose's report):
- **Axis widths are scaled by the chart.** `SeriesChart` multiplies an `axes[].width` by
  the text size itself. Pass your Normal width (`MONEY_AXIS_WIDTH`) and don't multiply
  it: contract §10.10 said otherwise and is corrected.
- **The boot splash needs the root rules inline** whenever your CSS is a separate request,
  which is every app:
  `<style>html[data-text-size=large]{font-size:125%}html[data-text-size=xlarge]{font-size:150%}</style>`.
- **Under a hash-based CSP**, `TEXT_SIZE_INLINE_SCRIPT` is a second inline script with its
  own hash. Add it, and recompute it when the key or the account function changes.
- **`applyPersistedContrast` and `applyPersistedPalette` go in either order.**
- **A stored text size needs `"version":1`.** A hand-written seed with another version
  is dropped by the store, while the inline snippet still reads it.
- **`max-*` and the breakpoint variants never match `<html>` itself**: they are scoped
  to descendants of `[data-text-size]`. Style `html` or its scrollbar with a hand-written
  media query.
- **A server that doesn't store `text_size` / `contrast` yet** accepts them on `PATCH`
  (they are on server-kit's `ProfileUpdate`), ignores them and answers `null`. The device
  keeps the pick, and the account silently doesn't. Store them, or don't offer the account
  write yet.
- **Dense rows of icon actions on touch:** since 0.32 a `disabledReason` is a line under
  its control on touch, at Normal too, so a row of locked icons grows a line each. Use
  `RowActions`, or wrap the icons in `CompactControls`, which keeps the reason in the
  tooltip.
- **The top bar's name at Extra large:** `TopBarBrand` shows the logo alone below `sm`,
  which moves with the text size, and keeps the name as the link's accessible name. A
  hand-made brand link with `truncate` shrinks the name to nothing.

**server-kit 0.6.1:**
- **`PlanOut`** (`PlanOut.from_spec(plan)`, `plans_out(catalogue)`): a plan's wire shape for
  `GET /billing/plans`, with `prices` nested currency → interval → minor units, the shape
  of ui-kit's `BillingPlan.prices`. Names, descriptions and feature lines stay in your
  i18n. A plan no longer sold: hide it or mark it `disabled` (empty `prices` reads as
  free).
- **A beta row without an end** (`source = beta`, `comped_until = null`, written before the
  launch date was known) now ends at launch + 12 months: `grant_holds`,
  `in_good_standing`, `dispatch` and `BillingOverview.from_row` take `launch=`, and
  `effective_comped_until(row, launch)` gives the date. Without a launch date set, such a
  row still never ends: set `billing_launch_at` before billing goes on in production.
- **README:** a test that monkeypatches `billing_price_ids` must assign the parsed shape
  (lists); a plain assignment is never validated.

**Billing plans for local review:** see `docs/billing-harmonization.md` §13.

## 0.32.2

From kastlan's and keksdose's 0.32.1 reports. Bump to `^0.32.2`; server-kit stays 0.6.1.

- **Button** keeps an icon's size when its label wraps at Large (`[&_svg]:shrink-0`).
- **PageHeader** (`stacked`, the default) stacks its actions full width on a phone at
  Large, as FormActions do. `inline` is unchanged.
- **AppShell's `mobileSubNavLayout`** unset is `"wrap"` at Normal and `"scroll"` at Large
  and Extra large, where a wrapped group of eight pages covered the page. An explicit
  value still wins.
- **RowActions' "⋯" menu** stops clicks on its panel itself, padding and border
  included; 0.32.1 stopped them one box in. `Popover` now runs a caller's `onKeyDown`
  before its own Escape handler, where it used to drop it.

