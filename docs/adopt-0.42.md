# Adopting `@eifi1/ui-kit` 0.42

Round 0.42 (docs/billing-harmonization.md §16) gives the provider's portal to the buyer
only, adds an in-app cancel and its undo for the company's other admins, and warns before a
purchase under a free grant without an end. Everything new is optional: an app on
server-kit 0.13 keeps building and behaves as before until it passes the new props.

## 1. ui-kit

### New names

- **`isPermanentGrant(overview)`**: `status === "comped" && source === "manual" &&
  comped_until == null`. `source` is checked explicitly, because Kurvenschmiede's
  pre-launch beta rows have `comped_until` null too.
- **`CancelSubscriptionConfirm`** (`open`, `onOpenChange`, `periodEnd`, `onConfirm`,
  `pending`, `locale`, `labels`): the in-app cancel's dialog. It reads "Your subscription
  ends on {date}. Until then everything works as before." and its button reads "Cancel
  subscription now" (de-CH "Jetzt kündigen"). Confirm is the app's `POST /billing/cancel`.
  It takes no billing lock, but a demo lock still holds it.
- **`BillingPortalAccess`** (type): `"open" | "buyer_only"`.

### New fields and props

- **`BillingOverview.portal?`, `BillingOverview.buyer_name?`**, and the same two on
  **`BillingStanding`** (`GET /billing/status`). Both are optional; absent means `"open"`.
- **`SubscriptionActions`**: `portal`, `buyerName`, `onCancelInApp`, `cancelAtPeriodEnd`,
  `onResume`, and `pending: "resume"`.
  - Under `portal="buyer_only"`, "Payment and invoices" turns into the caption `buyerHolds`
    ("…are with {buyer}, who bought the subscription"; with no name, "…with the admin who
    bought the subscription"), and "Cancel subscription" calls `onCancelInApp`. No portal
    callback or link is used.
  - While `cancelAtPeriodEnd` is true and `onResume` is given, "Keep subscription"
    (`POST /billing/resume`) takes the cancel's place, for the buyer too.
  - Under `"open"`, `onCancelInApp` is used only when no portal cancel (`cancelHref`,
    `onCancel`, `onPortal`) is given.
- **`BillingBanner kind="payment-failed"`**: `portal` and `buyerName`. Under
  `"buyer_only"` it shows `paymentFailedAskBuyer` ("The payment failed. {buyer} can update
  the payment method.") and no button, whatever `onAction` or `actionHref` say.
- **`PlanPicker`**: `permanentGrant` and `switching`.
  - With `permanentGrant` and without `switching`, the button first opens a confirm with
    `grantWarningTitle` and `grantWarningBody`, plus "Buy anyway" and "Back". `onChoose`
    runs only on "Buy anyway".
  - With `switching` (the overview's), the pick goes straight to `onChoose`, and
    `PlanSwitchConfirm` shows the warning instead. So the payer reads it once, on either
    path.
- **`PlanSwitchConfirm`**: `permanentGrant`. It shows the same warning above its figures.
  Confirm is unchanged.

### Labels

New keys in `billing`, in all seven languages:

- `buyerHolds(buyer?)` and `paymentFailedAskBuyer(buyer?)`;
- `cancelConfirmTitle`, `cancelConfirmBody(date)`, `cancelConfirmAction`;
- `keepSubscription`;
- `grantWarningTitle`, `grantWarningBody`, `grantWarningAction`.

An app with its own full `billing` catalogue gets a compile error until it adds them.

### Public surface

The barrel has two more names (`isPermanentGrant`, `CancelSubscriptionConfirm`), 918 in
all, plus the types `BillingPortalAccess` and `CancelSubscriptionConfirmProps`.

## 2. Per app (ui-kit part)

| App | Change |
|---|---|
| kastlan | `SubscriptionActions`: pass `portal={overview.portal}`, `buyerName={overview.buyer_name}`, `onCancelInApp` (opens `CancelSubscriptionConfirm` → `POST /billing/cancel`), `cancelAtPeriodEnd={overview.cancel_at_period_end}` and `onResume` (`POST /billing/resume`). Pass `portal` and `buyerName` to both payment-failed banners: `billing-banners.tsx:31-35` (from `GET /billing/status`) and `subscription-section.tsx:108-115`. |
| keksdose | `PlanPicker permanentGrant={isPermanentGrant(overview)} switching={overview.switching}`; `PlanSwitchConfirm permanentGrant={isPermanentGrant(overview)}`. The portal stays `open`; the in-app cancel is optional. |
| Kurvenschmiede | as keksdose. |

## Top bar

(docs/top-bar-harmonization.md §2–§7.)

### New names

All are in `@eifi1/ui-kit/shell` and the barrel:

- `TopBarActions`, `TOP_BAR_ACTION_ORDER`;
- `AccountMenuLanguage`;
- `TourMenu`;
- `SyncStatusIndicator`, `syncState`;
- `DevSwitchers`, `DEV_ORIGINAL_ROLE_KEY`;
- `DEFAULT_TOP_BAR_PARTS_LABELS`, `useTopBarPartsLabels`.

The types are `TopBarActionsProps`, `AccountMenuLanguageProps`,
`AccountMenuLanguageOption`, `TourMenuProps`, `TourMenuTour`, `SyncStatus`, `SyncState`,
`SyncStatusScope`, `SyncStatusIndicatorProps`, `DevSwitchersProps`, `TopBarPartsLabels`,
`TourMenuLabels`, `SyncStatusLabels` and `DevSwitchersLabels`.

**`ThemeToggle`** gains `onChange(next)`, and `onToggle` becomes optional. Wire
`onChange` to the theme store's `setPreference`. Settings keeps "system".

### Labels

There is a new namespace, `topBarParts` (`tours`, `sync`, `dev`), in all seven languages.
An app with its own full catalogue gets a compile error until it adds the namespace.
keksdose's own sync words (the budget key, the demo budget) go in as
`labels={{ topBarParts: { sync: … } }}` overrides.

### Public surface

The barrel has ten more names and `/shell` ten more (55).

### Per app (ui-kit part)

| App | Change |
|---|---|
| keksdose | Build `app/top-bar.tsx:87-182` on `TopBarActions`. The new order is Search · Theme · Feedback · Tours · Sync · dev · account (today Feedback comes after Tours and Sync before the dev switchers). Bring `ThemeToggle` back with `onChange` → the theme preference (it is now only in `features/landing/landing-header.tsx:49` and `features/auth/appearance-card.tsx:107`). Replace `app/sync-status-indicator.tsx:33` with `SyncStatusIndicator status={…useSyncStatus} onSync={runSync + invalidateQueries}`, and pass its blocked and refused words as `labels`. Replace `features/tour/tour-menu.tsx:39` with `TourMenu href="/tours"`, fed from `useTours`, `useIsNewTour` and the progress store. Replace the language block at `app/account-menu.tsx:130-164` with `AccountMenuLanguage` (flags as `flag={<LanguageFlag …/>}`). Replace the dev switchers at `app/top-bar.tsx:93-125` with `DevSwitchers enabled={import.meta.env.DEV}` on `POST /dev/switch`. |
| kastlan | Build `app/top-bar.tsx:94-200` on `TopBarActions`. Move the dev role switcher (`:144`) before the platform button (`:134-142`). Signed in, take `LanguageMenu` (`:113-118`) out of the bar and put `AccountMenuLanguage` first in the account menu (`:158-195`). Signed out, it goes in the `language` slot. Replace `TourTrigger` (`features/tours/components/tour-trigger.tsx:7-35`, `LifeBuoy`) with `TourMenu href="/help/tours"`. Drop `hideTriggerOnPhone` (`:57`). Replace `OfflineIndicator` (`shared/offline/offline-indicator.tsx:16-40`, mounted at `app/providers.tsx:92`) with `SyncStatusIndicator hideWhenIdle showLabel scope={{ name: "Handovers on this device", offline: "Offline: handovers keep working on this device; everything else needs a connection" }}` in the `sync` slot, fed from `useHandoverSyncState` and the outbox counts. For "Synced at", store a time after a good round (`features/handover/offline/sync.ts:122`). `HandoverSyncBanner` stays. Replace `shared/components/dev/dev-role-switcher.tsx:20-45` with `DevSwitchers`, plus the plan, on `POST /dev/switch`. |
| Kurvenschmiede | Build `app/top-bar.tsx:31-81` on `TopBarActions`. Theme now comes before Feedback (today Language `:53` and Theme `:54` come first). Signed in, take `AppLanguageMenu` out of the bar and put `AccountMenuLanguage` first in `app/account-menu.tsx:23-118`. Signed out, it goes in the `language` slot, with "Sign in" (`:71-73`) in `signIn`. Add `GlobalSearch` in `search`. Add the first tour, "Your first curve" on `/curves`, as `TourMenu` with no `href`. Add `SyncStatusIndicator hideWhenIdle` with no `onSync`, fed `{ phase: useIsMutating() ? "syncing" : "idle", online: navigator.onLine, pending: 0 }`. Add `DevSwitchers enabled={import.meta.env.DEV}` on `POST /dev/switch`, with `billingOff` while `BILLING_ENABLED` is off. |
