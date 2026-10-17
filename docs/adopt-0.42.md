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
- **`GrantWarningConfirm`** (`open`, `onOpenChange`, `onConfirm`, `labels`): `PlanPicker`'s
  own warning confirm, exported for the path the picker cannot see. An app that sends a
  pick to the switch, learns there is no subscription to switch and falls back to a
  checkout shows it before that checkout, so a permanent-grant holder is still warned.

### Labels

New keys in `billing`, in all seven languages:

- `buyerHolds(buyer?)` and `paymentFailedAskBuyer(buyer?)`;
- `cancelConfirmTitle`, `cancelConfirmBody(date)`, `cancelConfirmAction`;
- `keepSubscription`;
- `grantWarningTitle`, `grantWarningBody`, `grantWarningAction`.

An app with its own full `billing` catalogue gets a compile error until it adds them.

### Public surface

The barrel has three more names (`isPermanentGrant`, `CancelSubscriptionConfirm`,
`GrantWarningConfirm`), plus the types `BillingPortalAccess`,
`CancelSubscriptionConfirmProps` and `GrantWarningConfirmProps`.

## 2. Billing: per app (ui-kit part)

| App | Change |
|---|---|
| kastlan | `SubscriptionActions`: pass `portal={overview.portal}`, `buyerName={overview.buyer_name}`, `onCancelInApp` (opens `CancelSubscriptionConfirm` → `POST /billing/cancel`), `cancelAtPeriodEnd={overview.cancel_at_period_end}` and `onResume` (`POST /billing/resume`); `pending` covers cancel and resume too, and `onManage` is no longer passed always (`subscription-section.tsx:135`). After the cancel's 204, keep a local "cancel requested" state (Keep subscription shown, Cancel hidden) until `subscription.updated` lands on the row, so a second press doesn't ask Paddle again. Pass `portal` and `buyerName` to both payment-failed banners: `billing-banners.tsx:31-35` (from `GET /billing/status`) and `subscription-section.tsx:108-115`. The permanent-grant warning, as keksdose: operators grant without an end (`platform_router.py:108-123`), so `PlanPicker permanentGrant={isPermanentGrant(overview)} switching={overview.switching}` (`subscription-section.tsx:165`) and `PlanSwitchConfirm permanentGrant` (`:194`). Types: `features/billing/types.ts:54-56` `portal_overview` → `portal?` / `buyer_name?`, and `CompanyStanding` (`:18-23`) gains both; the cancel and resume api calls; `billing.test.tsx:123`, `:163`. |
| keksdose | `PlanPicker permanentGrant={isPermanentGrant(overview)} switching={overview.switching}`; `PlanSwitchConfirm permanentGrant={isPermanentGrant(overview)}`. The checkout fallback (`features/billing/subscription-cards.tsx:207-211`: `/billing/plan/preview` → 409 `billing_not_subscribed` → `checkout.mutate`) skipped the picker's warning, because the pick went to the switch: when `isPermanentGrant(overview)`, open `GrantWarningConfirm` there and call `checkout.mutate` from its `onConfirm`. The portal stays `open`; the in-app cancel is optional. |
| Kurvenschmiede | as keksdose (without the fallback, if it has none). |

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

**`SyncStatusIndicator`** takes `storage="none"` for an online-only app that keeps nothing
on the device: offline reads "Offline — changes can't be saved until you reconnect", a
round reads "Saving…", and `pending`, `blocked` and `waitingForPlan` are ignored. Default
`"device"`. **`SyncStatusIndicator`** and **`TourMenu`** forward `data-*` attributes to
their trigger, so a tour's `data-tour` anchor needs no wrapper (`TopBarActionMenu` takes
them as `triggerAttributes`). **`AccountMenuLanguage`**'s options take `country` (the
flag-icons flag, as `LanguageMenu`'s `LanguageOption`) as well as `flag`, so one language
list feeds both. **`TopBarActionMenu`** takes `leading={(close) => …}`: rows before
`entries`, under the header — `AccountMenuLanguage` first in a menu whose rows are all
entries. **`TourMenu`** takes `list="all"`: every tour, with `href` too, for tours that
carry no `route` or `isNew`.

**Dev switchers only when the server gate is open.** `POST /dev/switch` answers 404 while
the flag is off, so `enabled={import.meta.env.DEV}` alone draws flasks with nothing behind
them on every `npm run dev` without the flag. Every app adds the dev probe
`GET /dev/switch` (server-kit's recipe: behind the same gate, it answers
`DevSwitchAnswer {role, plan}`), reads it once in dev, and passes
`enabled={import.meta.env.DEV && probe.ok}`: a 404 means the gate is shut, and no flask
is drawn. The answer is also `currentRole` and `currentPlan`, which matters where the
overview is a 404 while billing is off. `DevSwitchers` draws the plan menu without a
`currentPlan` too, with no row checked.

**`ThemeToggle`** gains `onChange(next)`, and `onToggle` becomes optional. Wire
`onChange` to the theme store's `setPreference`. Settings keeps "system".

### Labels

There is a new namespace, `topBarParts` (`tours`, `sync`, `dev`), in all seven languages.
`sync.offlineUnsaved` and `sync.saving` are the online-only words (`storage="none"`).
An app with its own full catalogue gets a compile error until it adds the namespace.
keksdose's own sync words (the budget key, the demo budget) go in as
`labels={{ topBarParts: { sync: … } }}` overrides.

### Public surface

The barrel has ten more names and `/shell` ten more (55).

### Per app (ui-kit part)

| App | Change |
|---|---|
| keksdose | Build `app/top-bar.tsx:87-182` on `TopBarActions`. The new order is Search · Theme · Feedback · Tours · Sync · dev · account (today Feedback comes after Tours and Sync before the dev switchers). Bring `ThemeToggle` back with `onChange` → the theme preference (it is now only in `features/landing/landing-header.tsx:49` and `features/auth/appearance-card.tsx:107`). Replace `app/sync-status-indicator.tsx:33` with `SyncStatusIndicator status={…useSyncStatus} onSync={runSync + invalidateQueries}`, and pass its blocked and refused words as `labels`. Pass `data-tour="sync-status"` straight to it (the tour's anchor, `features/tour/feature-tours.tsx:591`). Replace `features/tour/tour-menu.tsx:39` with `TourMenu href="/tours"`, fed from `useTours`, `useIsNewTour` and the progress store. Replace the language block at `app/account-menu.tsx:130-164` with `AccountMenuLanguage` (flags as `flag={<LanguageFlag …/>}`). Replace the dev switchers at `app/top-bar.tsx:93-125` with `DevSwitchers enabled={import.meta.env.DEV && probe.ok}` on `POST /dev/switch` (the `GET /dev/switch` probe; it also gives `currentRole` and `currentPlan`). On a BETA row (every account before launch, migration 0122) the dev plan switch moves `plan_code` only: `set_plan(…, comped_until=None)` keeps beta, so it never makes a permanent grant and the grant warning does not show there. That is accepted: the switch is for previewing limits. |
| kastlan | Build `app/top-bar.tsx:94-200` on `TopBarActions` (kastlan's TopBar renders only under `ProtectedRoute`, `app/routes.tsx:48-50`, so there is no signed-out slot; the auth pages keep `shared/components/language-switcher.tsx`). Move the dev role switcher (`:144`) before the platform button (`:134-142`). Take `LanguageMenu` (`:113-118`) out of the bar and put `AccountMenuLanguage` first in the account menu (`:158-195`) through `TopBarActionMenu`'s `leading={(close) => <AccountMenuLanguage … close={close} />}`: the menu is all `entries`, and `children` would land below Log out. Its options take `LANGUAGES`' `country` directly. Replace `TourTrigger` (`features/tours/components/tour-trigger.tsx:7-35`, `LifeBuoy`) with `TourMenu href="/help/tours" list="all"`: kastlan's tours carry no `route`, `isNew` or `since`, so the short list would be empty off `/dashboard`. Drop `hideTriggerOnPhone` (`shared/components/search/app-global-search.tsx:57`). Replace `OfflineIndicator` (`shared/offline/offline-indicator.tsx:16-40`, mounted at `app/providers.tsx:92`) with `SyncStatusIndicator hideWhenIdle showLabel scope={{ name: t(…), offline: t(…) }}` in the `sync` slot (the scope words are kastlan's own `t()` keys in its four languages, "Handovers on this device" and "Offline: handovers keep working on this device; everything else needs a connection" in English), fed from `useHandoverSyncState` and the outbox counts, with `pending` = the outbox's pending + `legacy.pending`. But keep `useOfflineSync()` mounted in `app/providers.tsx`: `OfflineIndicator` alone mounts it today (`offline-indicator.tsx:18`), and the legacy photo queue stops without it. `onSync = async () => { await syncNow(); await legacy.flushNow(); }` (`sync-controller.ts:101-103`). The handover outbox's `rejected` writes have no `SyncStatus` slot: pass them as `blocked` (they can't be sent as they are), or leave them to `HandoverSyncBanner`, which stays. No "Synced at": under `hideWhenIdle` the settled state draws nothing. Replace `shared/components/dev/dev-role-switcher.tsx:20-45` with `DevSwitchers` on `POST /dev/switch`, plus the plan with `billingOff` while billing is off, `enabled={import.meta.env.DEV && probe.ok}` and `currentRole`/`currentPlan` from the `GET /dev/switch` probe (the overview and `/plans` are 404 while billing is off). A user may hold several roles: give `storageKey` a per-company key, and keep the original roles in the app (pass `originalRole`), since the kit keeps one per browser. |
| Kurvenschmiede | Build `app/top-bar.tsx:31-81` on `TopBarActions`. Theme now comes before Feedback (today Language `:53` and Theme `:54` come first). Signed in, take `AppLanguageMenu` out of the bar and put `AccountMenuLanguage` first in `app/account-menu.tsx:23-118`. Signed out, it goes in the `language` slot, with "Sign in" (`:71-73`) in `signIn`. Add `GlobalSearch` in `search`. Add the first tour, "Your first curve" on `/curves`, as `TourMenu` with no `href`. Add `SyncStatusIndicator storage="none" hideWhenIdle` with no `onSync`, fed `{ phase: useIsMutating() ? "syncing" : "idle", online: navigator.onLine, pending: 0 }`: KS keeps nothing on the device, so offline reads "changes can't be saved until you reconnect" and a save reads "Saving…". Add `DevSwitchers enabled={import.meta.env.DEV && probe.ok}` (the `GET /dev/switch` probe) on `POST /dev/switch`, with `billingOff` while `BILLING_ENABLED` is off, and `storageKey` from `shared/lib/storage-keys.ts` (the default `"ui-kit:dev-original-role"` is a key KS doesn't spell). |

## 4. The admin area

(docs/admin-harmonization.md §2, §6, §7, §8.)

### New names

- `AccountRoleChip`, plus `RoleDefinition.href`: every account shows its role in the
  account-menu header. It is a link when the role has a tool (§7: "always a badge").
  `RoleDefinition.variant` sets a role's look there (the chip's `variant` prop wins);
  the default stays `solid`, the header's tag. keksdose, whose ADMIN alone is solid,
  gives REVIEWER and MEMBER `variant: "soft"`. `RoleChip` ignores it.
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
| keksdose | `app/account-menu.tsx:389-406`: the chip → `AccountRoleChip` (hrefs in the role vocabulary, which moves from `features/admin/users-panel.tsx:609-616` to `shared/`; REVIEWER and MEMBER `variant: "soft"`). The menu is `children` with `entries={[]}` (`:412`), so the Administration row is `AdminMenuRow badge={adminWaitingCount(att, ["feedback_waiting","support_waiting","awaiting_verdict"])} onNavigate={close}`, not `adminMenuEntry`; read `GET /admin/attention` at the `AccountMenu` level (as `useInboxUnreadCount`, `:363`), so the badge doesn't pop in after the menu opens. `features/admin/admin-page.tsx:1086-1109` → the kit's `AdminForbidden`. `admin-index.ts:62-109` → `adminSections(labels, own, { leaveOut: ["billing"] })`, every own section placed: `metrics after: "overview"`, `messaging after: "invitations"`, `health after: "messaging"`, `scheduler after: "health"`, `system after: "scheduler"`. That gives overview · metrics · users · invitations · messaging · health · scheduler · system · activity: the ops sections after the app's own, as the template orders them. Drop the `overview → metrics` alias; `access` becomes `invitations` (alias kept), so `ADMIN_CARD_SECTION["admin-invitations-card"]` (`:127`) says `"invitations"`, `DEFAULT_ADMIN_SECTION` (`:91`) is `"overview"`, and the `AdminSectionId` union changes; fix the stale help lines. The Tools links (Translations) in `sidebarFooter` and `phoneFooter`. |
| kastlan | `app/top-bar.tsx:158-169`: the raw role code → `AccountRoleChip` (the highest role in the active company; the reviewer badge at `:162-165` stays kastlan's); add `adminMenuEntry({badge: adminWaitingCount(att, ["feedback_waiting", "awaiting_verdict"])})`. `app/nav.ts:144-152`: the Admin group and `/overview/admin` go (and `app/nav.test.ts:10`, `:23`, `:47`, `:49`, `:60` with them); Administration (with `badge`) and Data import move to `sidebarFooterItems`, added only when `isAdmin` (the items have no role filter). `settings-page.tsx:98-105`: the phone-footer link goes. `admin-page.tsx:29-56`: `width="7xl"`, Tools links (Translations, `visible` for reviewers and the superuser; Data import). `admin-catalogue.tsx`: `adminSections`, Invitations as its own section (alias `/admin/users?focus=invitations`). `AdminForbidden` on `/admin`, `/import`, `/feedback`: the gates are `rolePage(…)` (`app/guarded-page.tsx:10-15`, used at `settings/routes.tsx:16`, `:28`, `feedback/routes.tsx:12`) with no fallback parameter, so the change is in `guarded-page.tsx`; mind the doubled padding (`AdminForbidden`'s `p-4 md:p-6` inside the column's, `app-layout.tsx:140`). The feedback tiles of `group-overview-page.tsx:201-223` → `AdminOverview`, and the `admin` renderer (`:225-230`) goes dead. The Overview's feedback tile counts OPEN only, where today's tiles count OPEN + READY + REWORK + IN_PROGRESS + evaluating (`:207-220`): the rest go in `extra={awaiting_verdict}`, and the tile links to the whole inbox (no `?status=` filter there). |
| Kurvenschmiede | `app/account-menu.tsx:40-45` → `AccountRoleChip` (MEMBER is shown now); `:82-91` → `AdminMenuRow badge={adminWaitingCount(att, ["feedback_waiting","deletion_requests"])}`. `features/admin/admin-page.tsx:40-63` → `adminSections` (Teams with no `after`: an own section's default place, after Invitations; "Accounts" → Users; the icons `Mail` and `History`) with the Overview and the Tools links. `app/routes.tsx:539-547`: `AdminForbidden` on the same admin check, inside the lazy route. |

## 5. server-kit 0.14

Install the wheel by URL, pinned by hash:

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.14.0/eifi1_server_kit-0.14.0-py3-none-any.whl
sha256: aeafb19dac4f0095f7f583b698615c4185ae3193fa413445ea667b3454a4e8f3
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
  gate is shut. `validate_dev_switch` gives a 422 for an unknown role or plan. The recipe
  adds a `GET /dev/switch` probe behind the same gate, answering `DevSwitchAnswer
  {role, plan}`: the frontend's gate (404 = no switchers) and its current role and plan.
  On a row under a running beta grant, the dev plan switch keeps beta and moves only the
  plan, so it makes no permanent grant there; that is accepted for previewing limits.

### Per app

| App | Change |
|---|---|
| keksdose | Billing (optional): write `/billing/cancel` and `/billing/resume` in its own `billing_router.py`, and classify them as always allowed in `test_billing_gate.py::test_every_write_route_is_classified`. `require_portal_access` is an optional no-op there. Attention: `of(feedback_waiting=<OPEN incl. crashes, no demo authors>, deletion_requests=None, users_total, users_new_7d, extra={support_waiting, awaiting_verdict, jobs_failing}, demo=user.is_demo)`. All three extras are new backend code: `support_waiting` counts the THREADS waiting on the admin (`waiting_on == "operator"`), demo authors left out, as a new SQL count — not `support_chat_service.unread_total` (`admin_router.py:1295-1316`), which counts unread messages and has no demo filter; `awaiting_verdict` and `jobs_failing` don't exist yet. Dev switch: settings inherit `DevSwitchSettings` (`KEKSDOSE_DEV_SWITCH_ENABLED`, local `.env` only). `production = bool(settings.db_socket_dir) or settings.metrics_environment == "prod"`: both Cloud Run deploys set `KEKSDOSE_DB_SOCKET_DIR` (`deploy/gcp/cloudbuild.yaml:438`, `cloudbuild.dev.yaml:267`), so keksdose-dev counts as deployed and `assert_dev_switch_safe` fires there. `local_run` = the host in `database_url` is `localhost`, `127.0.0.1`, `::1` or a local unix socket, and `db_socket_dir` is empty. Add a guard test (or `scripts/check-deploy-env-parity.cjs`) that fails when `DEV_SWITCH_ENABLED` appears in any `deploy/gcp/cloudbuild*.yaml` or `.github/workflows/*`. The route refuses a demo account first, with a 409 `dev_switch_refused` (`set_plan` raises `ValueError` on one, `admin_user_actions_service.py:298`); it writes `users.role`; the plan goes through `set_plan(…, comped_until=None)` with no `AdminAction.PLAN` entry. On a beta row that moves the plan only (the grant keeps beta), which is accepted for previewing limits. Add the `GET /dev/switch` probe for the frontend's `enabled`. |
| kastlan | Billing: `billing_service.portal` (:301) → `require_portal_access(row, viewer_ref=str(viewer_id))`. This changes behaviour: today a non-buyer may open cancel and payment_method (`billing_service.py:300-302`); `require_portal_access` refuses every target to a non-buyer (403 before the client's 409), so `tests/api/test_billing.py:270-293`, which asserts 200, is rewritten. The overview's `from_row(viewer_is_buyer=…, buyer_name=<first + last name, None when gone or no longer a member>)`, dropping its own `portal_overview`; its own `BillingStanding` → the kit's, but `GET /billing/status` is polled by all staff (`billing_router.py:44-64`), so pass `viewer_is_buyer` and `buyer_name` there for admins only. `POST /billing/cancel` and `/billing/resume` in `BILLING_WRITES` (`dependencies.py:203-210`), behind `refuse_demo` (`billing_router.py:37-41`); `billing_admin`'s `require_role` already classifies them for the staff-route sweep. Attention (the route on `admin_router.py:14`): OPEN in the acting company, `deletion_requests=None`, `invitations_pending` from `InvitationService.list_pending` (`invitation_router.py:75`; check that expired ones are left out), `users_total`, `users_new_7d`, `extra={awaiting_verdict}`; every count is the app's; demo → `for_demo()`. Dev switch: `KASTLAN_DEV_SWITCH_ENABLED`; `production = environment == "production"`; `local_run` = a loopback database host (`database_url`'s default is 127.0.0.1, `config.py:18`; production's comes from a secret, `cloudbuild.yaml:213`) AND no `K_SERVICE` (Cloud Run sets it), lower-cased as `main.py:82` does — NOT `environment != "production"`, whose default is "development" (`config.py:25-27`); `assert_dev_switch_safe` in `main.py`. Tests force the flag off (they read `.env`, `config.py:168`; with the flag on, the route sweep mounts `/dev/switch` and `test_staff_only_routes.py:126-132` fails). Add `POST /api/v1/dev/switch` to `BILLING_WRITES`, or a lapsed company gets a 402 (`dependencies.py:190-191`, `:266-278`). Add the `GET /dev/switch` probe. The route replaces the acting company's `user_role_assignments`, sets `users.role`, refreshes `user.role_assignments` and only then calls `issue_session` (`auth_helpers.py:98-106`); the plan goes through `BillingService.set_plan(…, comped_until=None)`, which only flushes (`billing_service.py:334`), so the route commits; a running beta keeps beta (`:322-331`), as in keksdose. |
| Kurvenschmiede | Billing: the routes are optional; if added, behind `not_in_the_demo("billing")` and in `DEMO_REFUSED`. Attention: OPEN + deletion requests; `extra={released_for_work, demo_accounts_live}`. Dev switch: `KURVENSCHMIEDE_DEV_SWITCH_ENABLED`, `local_run = is_development and is_local_database` (`feedback_loop.py:266`); the `GET /dev/switch` probe; the route writes `users.role` (409 `dev_switch_refused` for CUSTOMER on an account that owns work); the plan goes through `change_plan(…, comped_until=None, acknowledged=True)`; `test_demo.py`: `not_in_the_demo`, and a test that production settings don't mount it. |

