# Adopting `@eifi1/ui-kit` 0.42 and `eifi1-server-kit` 0.14

Three contracts, settled by Marcel on 2026-10-17 after the three app reviews, ship together
so each app adopts once:

- **Billing §16** (docs/billing-harmonization.md): the provider's portal for the buyer
  only, an in-app cancel and its undo for the company's other admins, and a warning before
  paying under a free grant without an end. Parts 1–2.
- **The admin area** (docs/admin-harmonization.md): one way in (an "Administration" row,
  the role chip as a shortcut), one shell, one section order, an Overview of what waits on
  the admin. Part 4.
- **The top bar** (docs/top-bar-harmonization.md): one order, the language in the account
  menu, keksdose's tours menu and sync indicator, and server-backed dev switchers. Part 3.

server-kit 0.14 is part 5. Everything new is optional or has a default: an app keeps
building and behaves as before until it takes the new parts. The one exception is an app
with its own full label catalogue, which must add the new keys.

## 1. Billing: ui-kit

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

## 2. Billing: per app (ui-kit part)

| App | Change |
|---|---|
| kastlan | `SubscriptionActions`: pass `portal={overview.portal}`, `buyerName={overview.buyer_name}`, `onCancelInApp` (opens `CancelSubscriptionConfirm` → `POST /billing/cancel`), `cancelAtPeriodEnd={overview.cancel_at_period_end}` and `onResume` (`POST /billing/resume`). Pass `portal` and `buyerName` to both payment-failed banners: `billing-banners.tsx:31-35` (from `GET /billing/status`) and `subscription-section.tsx:108-115`. |
| keksdose | `PlanPicker permanentGrant={isPermanentGrant(overview)} switching={overview.switching}`; `PlanSwitchConfirm permanentGrant={isPermanentGrant(overview)}`. The portal stays `open`; the in-app cancel is optional. |
| Kurvenschmiede | as keksdose. |

## 3. Top bar

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

## 4. The admin area

(docs/admin-harmonization.md §2, §6, §7, §8.)

### New names

- `AccountRoleChip`, plus `RoleDefinition.href`: every account shows its role in the
  account-menu header. It is a link when the role has a tool (§7: "always a badge").
- `adminMenuEntry({href?, badge?})` for a `TopBarActionMenu`, and `AdminMenuRow` for a
  menu built from `HoverMenu` children: the "Administration" row (`ShieldCheck`).
  `adminWaitingCount(attention, keys)` sums its badge.
- `AdminForbidden`: the 403 page. It renders and never redirects.
- `ADMIN_SECTIONS`, `adminSections(labels, own, {leaveOut?, visible?})`: Overview · Users ·
  Invitations · the app's own (`after:` any section) · Billing · Activity.
- `AdminOverview`, `AttentionTile`, `DEFAULT_ADMIN_ATTENTION_HREFS`, plus the type
  `AdminAttention` (server-kit's `GET /admin/attention`).
- `AdminToolLinks` (Translations and the app's task pages; the feedback inbox stays in the
  top bar's feedback menu).
- `SettingsLayout.sidebarFooter`, and `badge` on AppShell's `sidebarFooterItems` links.
- Labels: the new `adminArea` namespace, in all seven languages.

### Per app

| App | Change |
|---|---|
| keksdose | `app/account-menu.tsx:389-406`: the chip → `AccountRoleChip` (hrefs in the role vocabulary); add `adminMenuEntry({badge: adminWaitingCount(att, ["feedback_waiting","awaiting_verdict","support_waiting"])})` to the rows. `features/admin/admin-page.tsx:1086-1109` → the kit's `AdminForbidden`. `admin-index.ts:62-109` → `adminSections` with the new Overview first and metrics `after: "overview"`; drop the `overview → metrics` alias; `access` becomes `invitations` (alias kept); fix the stale help lines. The Tools links (Translations) in `sidebarFooter` and `phoneFooter`. |
| kastlan | `app/top-bar.tsx:158-169`: the raw role code → `AccountRoleChip` (the highest role in the active company); add `adminMenuEntry`. `app/nav.ts:144-152`: the Admin group and `/overview/admin` go; Administration (with `badge`) and Data import move to `sidebarFooterItems`. `settings-page.tsx:98-105`: the phone-footer link goes. `admin-page.tsx:29-56`: `width="7xl"`, Tools links (Translations, `visible` for reviewers and the superuser; Data import). `admin-catalogue.tsx`: `adminSections`, Invitations as its own section (alias `/admin/users?focus=invitations`). `role-route.tsx:19-36`: `AdminForbidden` on `/admin`, `/import`, `/feedback`. The feedback tiles of `group-overview-page.tsx:201-223` → `AdminOverview`. |
| Kurvenschmiede | `app/account-menu.tsx:40-45` → `AccountRoleChip` (MEMBER is shown now); `:82-91` → `AdminMenuRow badge={adminWaitingCount(att, ["feedback_waiting","deletion_requests"])}`. `features/admin/admin-page.tsx:40-63` → `adminSections` (Teams `after: "invitations"`; "Accounts" → Users; the icons `Mail` and `History`) with the Overview and the Tools links. `app/routes.tsx:539-547`: `AdminForbidden` on the same admin check, inside the lazy route. |

## 5. server-kit 0.14

Install the wheel by URL, pinned by hash:

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.14.0/eifi1_server_kit-0.14.0-py3-none-any.whl
sha256: SHA256_AT_RELEASE
```

- **billing:**
  - `require_portal_access(row, *, viewer_ref)` (403 `billing_portal_buyer_only`);
  - `BillingOverview.from_row(…, viewer_is_buyer=, buyer_name=)` → `portal`, `buyer_name`;
  - a kit `BillingStanding.from_row(…)` with the same two fields;
  - `cancel_at_period_end` and `resume_scheduled_cancel` (`POST /billing/cancel`,
    `POST /billing/resume`, 204, no write lock).

  The kit ships no routers: the recipes are in the docstrings and the README.
- **user_admin:** `AdminAttention.of(…, extra=, demo=)` and `for_demo()`. The app passes
  every count. There is no kit helper for the feedback count yet, because the feedback
  store can't count by status or tell a demo author.
- **dev_switch:** `POST /dev/switch`, gated by `dev_switch_enabled(flag=, local_run=,
  production=)`:
  - an explicit flag that is off by default, set in the local `.env` only;
  - the app's own proof of a local run;
  - never an environment name.

  `assert_dev_switch_safe` runs at startup, and `require_dev_switch` answers 404 when the
  gate is shut. `validate_dev_switch` gives a 422 for an unknown role or plan.

### Per app

| App | Change |
|---|---|
| keksdose | Billing (optional): write `/billing/cancel` and `/billing/resume` in its own `billing_router.py`, and classify them as always allowed in `test_billing_gate.py::test_every_write_route_is_classified`. `require_portal_access` is an optional no-op there. Attention: `of(feedback_waiting=<OPEN incl. crashes, no demo authors>, deletion_requests=None, users_total, users_new_7d, extra={support_waiting (admin_router.py:1295-1316), awaiting_verdict, jobs_failing}, demo=user.is_demo)`. Dev switch: settings inherit `DevSwitchSettings` (`KEKSDOSE_DEV_SWITCH_ENABLED`, local `.env` only); `local_run` = its own local check, never `metrics_environment`; the route writes `users.role`; the plan goes through `set_plan(…, comped_until=None)` with no `AdminAction.PLAN` entry. |
| kastlan | Billing: `billing_service.portal` (:301) → `require_portal_access(row, viewer_ref=str(viewer_id))`; the overview's `from_row(viewer_is_buyer=…, buyer_name=<first + last name, None when gone or no longer a member>)`, dropping its own `portal_overview`; its own `BillingStanding` → the kit's; `POST /billing/cancel` and `/billing/resume` in `BILLING_WRITES` (`dependencies.py:203-210`), behind `refuse_demo` (`billing_router.py:37-41`), and in `test_staff_only_routes.py`. Attention: OPEN in the acting company, `deletion_requests=None`, demo → `for_demo()`. Dev switch: `KASTLAN_DEV_SWITCH_ENABLED`, `local_run = environment != "production"`, `assert_dev_switch_safe` in `main.py`; the route replaces the acting company's `user_role_assignments`, then `issue_session`; the plan goes through `BillingService.set_plan(…, comped_until=None)`. |
| Kurvenschmiede | Billing: the routes are optional; if added, behind `not_in_the_demo("billing")` and in `DEMO_REFUSED`. Attention: OPEN + deletion requests; `extra={released_for_work, demo_accounts_live}`. Dev switch: `KURVENSCHMIEDE_DEV_SWITCH_ENABLED`, `local_run = is_development and is_local_database` (`feedback_loop.py:266`); the route writes `users.role` (409 `dev_switch_refused` for CUSTOMER on an account that owns work); the plan goes through `change_plan(…, comped_until=None, acknowledged=True)`; `test_demo.py`: `not_in_the_demo`, and a test that production settings don't mount it. |

