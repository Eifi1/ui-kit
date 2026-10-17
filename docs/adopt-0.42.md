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
