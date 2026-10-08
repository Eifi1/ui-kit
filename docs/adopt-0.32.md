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
   `<head>`; the stored format is frozen.
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
