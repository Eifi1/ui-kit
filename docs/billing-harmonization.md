# Billing, plans and payment — harmonisation plan

Led from ui-kit at Marcel's request, in parallel with the text-size round
(`docs/text-size-harmonization.md`). §2–§10 shipped as server-kit 0.6 and ui-kit 0.32;
§14 (the shared Paddle client, the checkout page and the way back) as server-kit 0.7 and
ui-kit 0.33. Billing stays off in production until each app's launch.

It is built from two read-only audits (the first during ui-kit 0.27, refreshed on
2026-10-07; kept outside the repo) and Marcel's decisions in §2. It builds on:
- the user-admin round (`docs/user-admin-harmonization.md`): admin actions, confirmation
  levels, the audit table;
- the settings round (`docs/settings-harmonization.md`): the settings and admin pages,
  hidden groups;
- the landing and demo round (`docs/landing-demo-harmonization.md`): demo refusals, the
  read-only pattern;
- the legal round (`docs/legal-harmonization.md` decision 7): the release that turns
  billing on updates the legal texts.

**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the reviews
and adoptions that amended a section are folded into it, and the table names them.
Snapshots, per-repo to-dos and the review logs are in
[archive/billing-history.md](archive/billing-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | 16–17 (2026-10-09); round 0.33's 18–27, with 19 and 26 as amended after its reviews (§14.16.1–2) |
| 3 | The model | server-kit 0.6, ui-kit 0.32 | §12.1–§12.17, §12.22, §12.31–§12.33; server-kit 0.6.1 (`effective_comped_until`); §14.16.4; §14.17 (round 0.34) |
| 4 | The API | server-kit 0.6; `at_provider`, the portal's `target` and `GET /admin/plans` in 0.7 | §12.17–§12.19; §14.5, §14.12; §15.2.10 (`paid` 0.12, `switching` 0.13) |
| 5 | Webhooks | server-kit 0.6 | §12.11, §12.20; §14.3 (the app tag, 0.7); §14.16.17 |
| 6 | The operator | server-kit 0.6; the operator's parts in ui-kit 0.33 | §12.34; §14.12; §14.17 |
| 7 | The pages | ui-kit 0.32 | §12.6, §12.21, §12.24, §12.26; §14.4, §14.5; adopt-0.33 (`onPortal`) |
| 8 | Legal | ui-kit 0.32 (the commercial disclaimer); the apps' texts when billing goes on | §12.25–§12.27 |
| 9 | The provider | server-kit 0.7 (Paddle) | decision 16; Lemon Squeezy removed in server-kit 0.8 (§14.13) |
| 10 | What the kits add | server-kit 0.6, ui-kit 0.32 | §12.30 |
| 11 | Per repo | — (archived) | |
| 12 | Settled after the reviews | — | an index: folded items point to their §; 12.36 stands as a rule |
| 13 | Proposed plans | app-side | decision 17 |
| 14.1–14.3 | Scope, the Paddle client, one account | server-kit 0.7, ui-kit 0.33 | §14.16.16, §14.16.18, §14.16.29; server-kit 0.7.1 (the `billing_app` validator, values compared as enums); adopt-0.33 (`PaddleClient`'s own connections); server-kit 0.8 (Paddle only) |
| 14.4 | The checkout page and the way back | ui-kit 0.33, server-kit 0.7 | §14.16.1, §14.16.19–20, §14.16.26, §14.16.30–31; ui-kit 0.33.1 (an undefined locale); server-kit 0.7.1 (`paddle_locale`); adopt-0.33 (the pay page's URL checks); ui-kit 0.40 (`style-src` names both Paddle CDNs, the sandbox's notes) |
| 14.5 | `at_provider` | server-kit 0.7, ui-kit 0.33 | §14.16.5, §14.16.24; adopt-0.33 (`onPortal`, the overview types) |
| 14.6 | A second checkout | server-kit 0.7 | |
| 14.7 | Notices | server-kit 0.7; the jobs token in 0.8 | §14.16.10–15; server-kit 0.7.1 (`OwedNotice.row`); adopt-0.33 (`billing_notices_owed`) |
| 14.8 | Deletion's cancellation | server-kit 0.7 | §12.23, §12.37; §14.16.6–9; server-kit 0.7.1 (`resume_after_withdrawal` without the webhook) |
| 14.9 | Test helpers | server-kit 0.7 | |
| 14.10 | Write locks | ui-kit 0.33 (§12.36) | §14.16.2–4 |
| 14.11 | The plan limit as a toast | ui-kit 0.33 | |
| 14.12 | The operator's plan parts | ui-kit 0.33, server-kit 0.7 | §14.16.3, §14.16.21–23; ui-kit 0.33.1 (plural label, `sortBy`, de/hu word order); server-kit 0.7.1 (`AdminPlan`, `comped_until` required); ui-kit 0.34 (`PlanChangeConfirm`'s `usage`); adopt-0.33 (`usePlanColumn`, `PlanChangeResponse.of`) |
| 14.13 | Lemon Squeezy | deprecated in server-kit 0.7, removed in 0.8 | adopt-0.33 (no runtime warning) |
| 14.14 | What each app changes | — (archived) | |
| 14.15 | Open checks | not built: the Paddle and sandbox checks are pending | |
| 14.16 | Settled after the reviews | — | an index: every item points to its § |
| 14.17 | A grant clears the trial's end | app-side (round 0.34) | |
| 15 | Round 0.39: pay pages that serve any app, a shared plan switch and customer | §15 settled 2026-10-14 (round 0.39); built in server-kit 0.12, ui-kit 0.39 | round 0.40: `BillingOverview.switching` (server-kit 0.13, ui-kit 0.40, §15.2.10); the sandbox run, §15.6 (2026-10-16) |

## 1. Where each one stands

Moved to [archive/billing-history.md](archive/billing-history.md): the three apps and the
kits before billing (2026-10-07).

## 2. Decisions (Marcel, 2026-10-07)

1. **All three apps charge.**
2. **A Merchant of Record** (such as Paddle or Lemon Squeezy) sells in its own name and
   handles VAT/MWST, invoices and tax registration. kastlan's direct Stripe integration
   is replaced.
3. **A lapsed or failed subscription makes the account read-only, never locked.** People
   keep signing in, seeing and exporting everything; only creating and changing is
   blocked until they pay.
4. **Today's beta users stay free for 12 months** from the day billing goes on, then move
   to a normal plan.
5. **Who pays:** kastlan the company; keksdose the user (the person who owns budgets;
   guests never pay); Kurvenschmiede the user.
6. **Prices in CHF and EUR.**
7. **New users get a 30-day trial without a card.** After it, an account without a plan
   is read-only (decision 3).

Settled by the kit, and kept by the reviews:

8. **Hosted checkout and a hosted customer portal only.** No card field, payment-method
   page or invoice copy in any app. The Merchant of Record hosts them.
9. **A switched-off billing answers 404** with the code `billing_disabled`, as a switched-
   off demo does (`demo_disabled`).
10. **One provider account for the operator**, with a product and a webhook endpoint per
    app (decision 18 makes it safe).

After the reviews (Marcel, 2026-10-07/08):

11. **The owner's standing decides an edit** to an existing item that someone else owns (a
    keksdose guest in a budget, a Kurvenschmiede colleague on a curve). A create follows
    the creator's standing.
12. **No metered overage at launch.** Plans limit what can be created (§3.4), nothing more.
13. **kastlan counts every unit**, parking, storage and cellars included.
14. **Leaving never depends on paying.** Before billing goes on, kastlan has a whole-company
    export, and keksdose lets a read-only owner delete whole budgets or erase all.
15. **kastlan gets a tenant portal, and tenants stay free.** Seats count staff only
    (admin, manager, accountant).

16. **The provider is Paddle** (Marcel, 2026-10-09; compared in §9).
17. **kastlan quotes gross prices too**, VAT included, as §12.17 says for every app
    (Marcel, 2026-10-09). §13.1's open point is closed.

Round 0.33 (Marcel, 2026-10-09, all as the round-033 audits recommended; §14):

18. **One Paddle account for all three apps**, made safe in the kit: an `app` tag in every
    checkout's custom data, other apps' events dropped at parse, and a checkout page per
    app (§14.3). Confirm with Paddle at signing that one account may sell three brands on
    three domains. This settles decision 10.
19. **The checkout opens on each app's pay page** with Paddle.js (as amended after
    keksdose's review, 2026-10-09): a standalone static page that ui-kit 0.33 ships, which
    every app serves on its own subdomain `pay.<app domain>`, a separate origin approved
    as a domain in Paddle (§14.4). No app mounts it as a route, and no app's own CSP
    changes: Paddle.js on an app's origin would run beside keksdose's extractable data key
    and every app's session tokens, and a CSP relaxed on one route can't help, since
    storage is per origin. The card fields stay in Paddle's frame, so decision 8 holds.
    kastlan's hosted-checkout setting stays for the sandbox review, and for live if Paddle
    approves it. Round 0.39 (2026-10-14): every pay page serves any app's transaction,
    named by its custom data and the kit's app map; `pay.keksdose.app` is the account's
    default payment link (§15.2.1).
20. **No success URL on the checkout request.** The way back is `?checkout=done` on the
    subscription page (`isCheckoutReturn()`, `checkoutReturnUrl()`), and ui-kit ships the
    processing hook: keksdose's fingerprint-based, bounded logic, router-agnostic (§14.4).
21. **A second checkout while subscribed is refused** (409 `billing_already_subscribed`).
    Plan changes go through Paddle's customer portal, once the sandbox shows that the
    portal's plan switch works; Paddle's docs disagree (§14.6).
22. **One name for "reached the provider":** the overview's `at_provider`, and a portal
    request before it answers 409 `billing_not_at_provider` (§14.5). New codes carry the
    `billing_` prefix of the existing ones.
23. **Trial and grant end notices (§12.22)** keep a "notice sent" marker on each payer's
    row. In production one Cloud Scheduler HTTP job calls a token-protected endpoint in
    Kurvenschmiede and kastlan; keksdose adds a job next to its `notifications` job. The
    kit only decides which payers are owed a notice and gives the kind, the date and the
    days left; the mail's words are each app's (§14.7).
24. **Sandbox or live is `billing_environment`**, read from the API key's prefix. It
    replaces kastlan's free `billing_api_base_url` (§14.2).
25. **Lemon Squeezy is deprecated** in server-kit 0.7 and removed in 0.8 (§14.13).
26. **Under a billing lock, the kit's parts follow §3.3 and §12.13 by themselves** (as
    amended after Kurvenschmiede's review, 2026-10-09). Add, invite, resend and raising a
    role stay locked; lowering a role is allowed, since it removes access (§12.13), and
    ShareCard's role toggle follows by itself. A lock says its kind, and `commit` takes
    `{ except: kinds }` (§12.36).
27. **The operator's plan parts ship in ui-kit 0.33:** `planColumn` and
    `PlanChangeConfirm` (§14.12).

Settled with them, not decisions: httpx comes in as server-kit's `billing` extra;
`billing.testing` ships in the wheel (§14.9); a deletion request cancels at the period's
end, a paused subscription at once, and a reactivation removes the cancellation the
request scheduled (§14.8); a team manager adding or re-inviting a member follows the
manager's own standing (§3.3).

Still open for Marcel (they don't block the contract):
- **the plans, limits and prices** per app (proposed in §13, for local review);
- **the launch date** per app, which starts the beta users' 12 months.

The checks with Paddle and in the sandbox are listed in §14.15; they need no decision.

## 3. The model

### 3.1 The plan catalogue lives in code

- Each app declares its plans in code (keksdose's rule: the dict that sets the limits is
  the only list), as server-kit `PlanSpec`, gathered by `plan_catalogue` (which refuses
  two plans with one code, and plans that name different dimensions):
  - `code`: lowercase, stable on the wire (`normalize_plan`). Stored codes became
    lowercase by a data migration; reads compare without case, and the audit history
    keeps the old uppercase (§12.16);
  - `limits`: a map of dimension to number, `None` for unlimited (§3.4);
  - `prices`: `(currency, interval)` → the **gross** price in minor units, VAT/MWST
    included, as Swiss consumer law (PBV) wants (§12.17, decision 17); a combination left
    out is not sold;
  - `sort`: the page's order, cheapest first.
- The provider's price ids live in settings, keyed by plan, currency and interval
  (`BillingSettings.billing_price_ids`); an id is text (Paddle's `pri_…`).
- Display names and feature lines come from the app's i18n, never from the provider.
- **Lead with yearly prices:** about 5 % + 0.50 per transaction makes a small monthly
  price expensive. The page shows the catalogue's gross prices (`PlanCard`), or the
  provider's localised price preview.

### 3.2 One subscription row per payer

The payer (§2.5) has exactly one row, **created with the payer** wherever a payer is
created, plus a migration for the existing ones and a test that each payer has exactly
one row (§12.12): keksdose `register_user`; kastlan `_new_company`, `create_company_for`,
the demo company (comped) and the seed; Kurvenschmiede `auth_service.register` and the
seed. kastlan's GRANDFATHERED maps to `comped`/`beta`.

**Not payers** (§12.8): Kurvenschmiede's customers (they read) and reviewers; kastlan's
tenants (decision 15). The operator's admin accounts are `comped`, `manual`, with no end
(keksdose's first user's UNLIMITED became this).

**No row, always in good standing** (§12.7): demo users, the demo's system account,
ownerless items (keksdose's preview budget). They are never gated and never counted:
`in_good_standing(None, now)` is True. That fails open when a row exists but is hidden, so
**an app with row-level security on its subscription table reads the payer's row with the
RLS bypass** (§12.33): a guest reading the owner's row would otherwise get nothing back
(keksdose pins it with a Postgres test).

| Column | Meaning |
|---|---|
| `plan_code` | the current plan |
| `status` | `trialing`, `active`, `past_due`, `canceled`, `expired`, `comped` |
| `source` | `trial`, `provider`, `manual` (an operator's grant), `beta` |
| `trial_ends_at`, `comped_until` | when a trial or a free grant ends |
| `current_period_end`, `cancel_at_period_end` | from the provider |
| `provider`, `provider_customer_id`, `provider_subscription_id` | the link to the provider |
| `updated_from_event_at` | the provider event that last changed the row (ordering guard) |

- **A new payer** starts as `trialing`, `source = trial`, `trial_ends_at = now + 30 days`
  (§2.7; server-kit `trial_ends_at(now)`).
- **A pure guest's trial starts at their first owned item**, not at registration (§12.9):
  the row is created at registration with `trial_ends_at` empty, and an empty trial end is
  in good standing until then (keksdose: an invited guest owns nothing; after day 30 their
  first own budget would be refused).
- **A beta user or company** (one that exists when billing goes on) gets `comped`,
  `source = beta`, `comped_until = launch + 12 months` (§2.4). **Beta goes by the
  invitation's date** (§12.10): an invitation created before launch counts as beta even if
  accepted after, so the last week's invitees don't get 30 days instead of 12 months
  (server-kit `is_beta(invitation_created_at, launch)`). A row written before the
  launch date is known (the beta migration, a registration before launch) stores
  `comped_until = null`; the kit reads `source = beta` with a null end as launch + 12
  months, from the settings' launch date, at read time (server-kit 0.6.1
  `effective_comped_until`, the `launch` argument of `in_good_standing` and `grant_holds`;
  Kurvenschmiede's 0.32 report). A moved launch date then needs no data change.
- **An operator's grant** is `comped`, `source = manual`, with or without an end date.
  It clears `trial_ends_at` (§14.17): the row describes one state, and a trial date left
  behind on a grant feeds a trial banner or notice the payer is no longer owed.
- **A grant beats provider events** (§12.11): while it holds, a provider event writes the
  subscription's link, period end and `cancel_at_period_end` but keeps the grant's status
  and source (server-kit `row_changes`); provider state applies from the grant's end on.

### 3.3 Good standing and read-only (§2.3, §2.7)

- **In good standing** (server-kit `in_good_standing(row, now, *, retry_grace, launch)`;
  behind the switch, `BillingSettings.billing_standing`):
  - `active`, but one set to cancel at its period's end only until that end, even before
    the provider's last event arrives; a provider's own trial counts as `active`;
  - `trialing` (the cardless trial) before `trial_ends_at`, or while it is empty (§3.2);
  - `comped` before its end (`effective_comped_until`) or without one, and after it while
    the provider's paid period runs (a payer who subscribed during the grant);
  - `past_due` while the provider retries (it moves the subscription on when it gives
    up); with `retry_grace`, no later than `current_period_end` plus the grace, a backstop
    for an event that never arrived;
  - `canceled` and `expired` never.
- **Whose standing** (§12.1, decision 11): **the payer's, not the caller's.**
  - keksdose: a write into a budget follows the budget OWNER's standing (a paying guest in
    a lapsed owner's budget is refused; a lapsed guest in a paying owner's budget may
    write);
  - Kurvenschmiede: the row owner's for an edit, the creator's for a create; a team
    manager adding or re-inviting a member, the manager's own (§14.16.4);
  - kastlan: the acting company's (the token's `company_id`). Someone in two companies
    can be read-only in one and not the other. Account routes aren't company-scoped and
    always pass.
- **Otherwise the payer's data is read-only.**
  - **Reading, exporting and signing in** always work.
  - **Billing itself, the account's own settings** (password, email, sessions, deletion,
    export) and signing out always work: a person must be able to pay, leave or take their
    data.
  - **Also allowed, in every app** (§12.13): feedback with attachments and crash reports
    ("I paid and it's still read-only" must be reportable); **removing access** (revoking
    a share, leaving a shared item, offboarding a member, revoking sessions, API tokens,
    passkeys and 2FA); **taking the data and leaving** (decision 14); admin routes;
    receiving sync. **Adding seats or guests stays blocked** (invitations, role grants;
    lowering a role is removing access, decision 26).
  - **Per app** (§12.14):
    - keksdose allows support chat, finishing a running re-seal sweep, one's own key
      wraps and sending a guest the household key, push and notification preferences,
      withdrawing price-pool consent, accepting an invitation into someone else's budget,
      switching the active budget, deleting whole budgets and erase-all; it refuses E2EE
      enrolment and mode changes (they start a sweep) and the help assistant (billed AI);
    - kastlan allows offboarding and `POST /sync` (refusing only when changes are
      present);
    - Kurvenschmiede allows its five compute POSTs, deleting own rows, a team manager
      removing a member, and translation verdicts; it refuses "Copy to my account", which
      is a create.
  - **Every other write** answers **`402 billing_read_only`**.
  - **Nothing is deleted, hidden or locked.** A later plan opens it all again.
- **The gate is the app's choice of two equal shapes** (§12.2): server-kit's
  `billing_write_allowed(method, path, *, standing, allow=…)` at the auth dependency, the
  demo's shape (landing §6.3) with the standing as an input and an app-supplied
  allow-list; or the app's own write choke points, which already resolve the owner
  (keksdose `require_write_access`, Kurvenschmiede `get_owner` and `access.claim`), with
  `refuse_billing_read_only(in_good_standing, what)`. Either way, a compute-only POST
  (Kurvenschmiede's five previews) isn't a write.
- **The order of refusals** (§12.3): the demo's 403 first, then billing's 402; a lapsed
  payer creating gets `billing_read_only`, never `plan_limit`.
- **Scheduled jobs are outside the HTTP gate** and skip a lapsed payer's data (§12.4;
  keksdose: recurring, bank sync, the two extract jobs, which also bill Gemini; kastlan:
  recurring rent — its lease-status sweep only follows the dates and keeps running).
- **Sync: a 402 is not a refusal of one change** (§12.5, §12.31, §12.32).
  - Sync endpoints stay on the allow-list. Inside them, a lapsed payer's changes are
    refused as `billing_read_only` and not applied, and the reply still sends updates and
    carries the refused changes as server-kit `SyncRefusal {code, detail, change_ids}`
    (keksdose's E2EE gate is the precedent; its 409 path does the same).
  - **The refusals in the reply are opt-in per request:** the client sends
    `refusals: true` on its sync request (keksdose's flag). Without it, a lapsed payer's
    push is refused whole (402 `billing_read_only`, or the app's existing 409), since an
    installed client from before reads a 2xx reply as "delivered" and drops what was
    refused.
  - `change_ids` are the changes' `SyncChange.id`, which are row ids: two queued changes
    to one row can't be told apart, which holds while a push is refused whole per row. An
    app that ever applies part of a row's changes needs per-change ids first.
  - A client keeps refused changes queued as "N changes waiting for a plan" and sends
    them after payment. Its sign-out guard offers "discard waiting changes".
  - **A device locks in advance from the known dates** (`trial_ends_at`, `comped_until`)
    by mirroring a per-item lock into its offline write gate, so nothing looks saved that
    will be refused. Only `past_due` → `expired` waits for the next sync.
- **The UI** wraps the app in the kit's `WriteLockProvider` with the reason
  `billing.lockReason` ("Your plan has ended. Choose a plan to make changes again.") and
  shows a `BillingBanner`. One provider combines the demo's and billing's sources
  (`combineWriteLocks`, `useBillingWriteLock`), each with its kind (§12.36).
- **A guest never learns the owner's payment status** (§12.6). The item carries
  `locked: "billing" | null`, never the owner's status, and the guest's banner
  (`BillingBanner kind="guest"`, `billing.guestReadOnly`) says "This is read-only for now;
  its owner can lift that."
- **Warnings:** a banner from 7 days before a trial or a free grant ends, and from the
  first failed payment. The trial and grant notices by mail are each app's daily job,
  since a cardless trial never reaches the provider (§12.22, §14.7).

### 3.4 Plan limits

- **A limit gates creation only** (keksdose's rule). A downgrade never deletes or hides
  anything over the new limit; it only stops creating more. A copy counts; an admin
  transfer or an erasure hand-over never checks a limit (§12.15).
- **The dimensions** (§12.15; the plans are §13):
  - keksdose: owned, non-deleted budgets (shared-in budgets and the preview never count);
  - Kurvenschmiede: curves (setpoint sessions owned), optionally collaborators later;
  - kastlan: units (every unit, decision 13), seats (staff only, decision 15), storage
    (all company files at plaintext size, in bytes).
- **The refusal:** `402 {detail, code: "plan_limit", dimension, plan, limit, used}`
  (server-kit `check_limit` raising `PlanLimitError`; `used` is the count before the
  create). keksdose's `plan_budget_limit` became `plan_limit` with `dimension: "budgets"`
  over two releases (§12.16): release N's frontend accepts both (installed PWAs run the
  previous bundle), release N+1's server switches. The kit's `isPlanLimit` reads the old
  code as `budgets`. The roster's `plan_budget_limit` field became `limits.budgets` in the
  same release.
- **The page** offers "Choose a plan" (to the billing page) or, where the operator grants
  plans by hand, "Ask for more" (a mailto to support@): `PlanLimitNotice`, or the toast
  of §14.11.

## 4. The API

**The switch:** `<APP>_BILLING_ENABLED`, off by default (server-kit `BillingSettings`).
While off:
- `GET /billing/status → {billing_enabled: false}` answers; it is the only billing
  route that does;
- every other `/billing/*` route and the webhook answer `404 billing_disabled` (§2.9;
  `BillingSettings.require_billing_enabled`);
- the UI hides the billing page, nav entry, banners and search entries;
- the read-only gate is off: everyone is in good standing (`billing_standing`).

kastlan's `test_billing_off.py` route sweep is the contract test in every app.

**The routes:**

| Route | Who | What |
|---|---|---|
| `GET /billing/status` | signed in (kastlan: staff) | `{billing_enabled}` |
| `GET /billing/overview` | the payer (kastlan: a company admin) | `{plan, status, source, in_good_standing, trial_ends_at, comped_until, current_period_end, cancel_at_period_end, limits, usage, currency, at_provider, paid, switching}` (`at_provider`: §14.5; `paid`: §15.2.10, 0.12; `switching`: §15.2.10, 0.13) |
| `GET /billing/plans` | the payer | the catalogue with this payer's currency and the prices |
| `POST /billing/checkout {plan, interval, currency}` | the payer | `{url}`: the provider's checkout, on the kit's pay page at the app's pay host (§14.4) |
| `POST /billing/portal {target?}` | the payer | `{url}`: the provider's hosted customer portal (payment method, invoices, cancel; §14.5) |
| `POST /webhooks/<provider>` | the provider | signed events (§5) |
| `POST /admin/…/{id}/plan {plan, comped_until?, acknowledged}` | an admin or the operator | a manual plan or grant (§6) |
| `GET /admin/plans` (kastlan `/platform/plans`) | an admin or the operator | the catalogue's codes, limits and sort, whatever the switch (§14.12) |

The shapes are server-kit's `billing.schemas` (`BillingStatus`, `BillingOverview` with
`from_row`, `PlanOut`, `CheckoutRequest`, `PortalRequest`, `CheckoutAnswer`,
`PlanChangeRequest`, `PlanChangeResponse`, `AdminPlan`), and ui-kit mirrors the ones its
parts read for a hand-written client (`BillingOverview`, `SubscriptionSource`,
`PortalTarget`, `PortalRequest`; `src/billing/billing-overview.ts`).

**The currency:** the payer's currency is picked at checkout from the plan's prices (CHF
or EUR, §2.6). Its default is the subscription's, else the account's stored currency where
the app keeps one (keksdose `reporting_currency`), else the locale's (§12.18). Money
crosses the wire as integer minor units plus an ISO currency, never as a float. Pages
format it with the kit's `formatMoney`.

**The demo:** every billing route answers `403 demo_refused` to a demo user (landing
§6.4), except `GET /billing/status`, which answers a demo user too, so the shell can hide
the page (§12.19).

## 5. Webhooks

- **One endpoint per provider:** `POST /webhooks/<provider>`. A bad signature answers
  400 (`BillingSettings.verify_billing_webhook`, with the deployment's tolerance, §14.2).
- **An event store:** `billing_events(provider, event_id UNIQUE, type, occurred_at,
  received_at, processed_at)`, the app's table behind server-kit's `EventStore` port. The
  event is recorded and applied in one transaction (`dispatch`).
- **The webhook writes rows for any payer** (§12.20): its tables sit outside tenant RLS,
  or the handler uses the bypass explicitly.
- **Answers** (`webhook_answer`): a duplicate or an unknown type answers 2xx; a poison
  event answers 2xx and is logged (keksdose's Pub/Sub rule); a transient failure answers
  5xx so the provider retries.
- **A raced duplicate** (§14.16.17): two deliveries of one event both pass `seen`, and the
  loser's insert hits the unique key. The app's store undoes the insert and raises
  `DuplicateEventError`, which `dispatch` answers as `DUPLICATE`, a 200.
- **The ordering guard:** an event older than `updated_from_event_at` does not overwrite
  the row. **A grant beats provider events** while it holds (§3.2, §12.11).
- **Normalised events:** server-kit maps each provider's events to one vocabulary
  (`EventKind`): `subscription_started`, `subscription_updated`, `payment_failed`,
  `subscription_canceled`, `subscription_expired`. The app applies those. Supporting a
  second provider is a new mapper, not new app code.
- **Another app's event is dropped at parse** (`parse_webhook_event(…, app=)`, §14.3).

## 6. The operator

- **A plan change is a user-admin action** (`AdminAction.PLAN`, level `acknowledge`),
  written to `admin_actions` with `detail {from, to, comped_until, counts}`. It is the
  kastlan company's action when the payer is a company. The request and the answer are
  server-kit's `PlanChangeRequest` and `PlanChangeResponse` (§14.12).
- **The roster** shows the plan and the standing in its `extra` column with the kit's
  `planColumn` (its `SubscriptionStatusChip` beside the name), and the dialog is
  `PlanChangeConfirm` (§14.12).
- **The operator can grant** `comped` with or without an end (a friend, a school, a
  support case), and end a grant. A grant clears `trial_ends_at` (§14.17).
- **A change before launch keeps the beta** (§12.34, keksdose's `kept_beta`): a running
  beta grant given no new end keeps `source = beta` and its end; only the plan changes,
  and the answer says `kept_beta`. Otherwise every pre-launch move would become a
  lifetime grant.

## 7. The pages

- **kastlan:** the admin section `/admin/billing` (hidden while billing is off, settings
  §5), with the plan, the usage, "Change plan" and "Payment and invoices" (the portal).
- **keksdose and Kurvenschmiede:** a settings group `subscription` before `data`, hidden
  while billing is off, with the same parts, at `/settings/subscription` (§14.4). Its
  English name is **"Subscription"**, since "plan" already means keksdose's monthly budget
  plan; German says "Tarif" for the plan and "Abonnement" for the subscription (§12.24).
- **"Cancel subscription" is visible** on the subscription page (§12.26), beside "Payment
  and invoices": the EU withdrawal function (Directive (EU) 2023/2673, from 19 June 2026)
  and Germany's cancellation button (§312k BGB) live in the provider's portal, and the
  page must not hide the way there. Both show whenever the payer has reached the
  provider, whatever the status or source (§14.5).
- **After checkout** the page shows "payment processing" and re-polls the overview, since
  the webhook may land after the person is back (Cloud Run scales to zero; §12.21): the
  kit's `useCheckoutProcessing` and `BillingBanner kind="processing"` (§14.4).
- **The kit parts:**
  - `PlanCard` / `PlanPicker` on `ChoiceCard`: the price through `formatMoney`, the
    limits, current / upgrade / downgrade;
  - `SubscriptionStatusChip`;
  - `SubscriptionActions`: "Payment and invoices" and "Cancel subscription", as links,
    as `onManage` / `onCancel`, or as one `onPortal(target)` that says where to
    (`"overview"` or `"cancel"`; `onManage` and `onCancel` win over it); `atProvider`
    (§14.5). It never takes the write lock: a read-only payer must be able to pay, leave
    or cancel;
  - `BillingBanner` presets on the AlertBanner strip (`BillingBannerKind`): trial ending,
    grant ending, payment failed, plan ended (read-only), the guest's read-only item
    (§12.6) and processing (§12.21);
  - `PlanLimitNotice` (mode `upgrade` or `contact`) and `usePlanLimitToast` (§14.11);
  - `UsageMeter`, which is `ProgressBar`'s meter variant; no new part.
  None sends a request.

## 8. Legal, in the release that turns billing on (legal decision 7)

The **Merchant of Record is the seller**:
- its terms of sale, right of withdrawal and invoices apply to the purchase;
- the app's terms say so and link them;
- **it is an independent controller** of the buyer's data, not the app's processor
  (§12.25): the privacy text names it as a recipient, links its notice, and gives the
  legal basis Art. 6(1)(b); confirm against its DPA at signing (§14.15);
- the app never sees a card.

Also:
- **The prices** go into each app's terms and the landing's JSON-LD `offers` (keksdose's
  `price: "0"` changes).
- **The disclaimer:** the kit's "private, non-commercial" disclaimer has a **commercial
  variant**, chosen per app: `<LegalKitSection section="disclaimer" variant="commercial">`
  (`src/components/legal-page.tsx`; the words in `src/components/legal.tsx`), in seven
  languages (ui-kit 0.32).
- **The beta's wording** ("free of charge, closed beta") changes in the same release.
- **keksdose's legal brief question Q13** (terms without liability or governing-law
  clauses) is answered first (its own condition). The legal keys it changes in that
  release are listed in its review (§12.27).

## 9. The provider (Paddle, decided 2026-10-09)

**Paddle** (decision 16): a Merchant of Record for B2B and B2C, with fixed amounts per
currency or country (`unit_price_overrides`), which decision 6 (prices in CHF and EUR)
needs; Lemon Squeezy charges every customer a converted USD amount. Paddle's webhooks carry
an event id and a timestamped signature. CHF support, the fees and the DPA are checked
with Paddle at signing (§14.15).

server-kit speaks Paddle alone (`BillingProvider.PADDLE`), behind a provider-neutral port
(§14.2): a second provider would be a new member, a mapper and a signature check (§5), not
new app code. Lemon Squeezy was deprecated in 0.7 and removed in 0.8 (§14.13). The
comparison Marcel chose from is in the archive.

## 10. What the kits add

What server-kit 0.6 and ui-kit 0.32 shipped. server-kit 0.7 and ui-kit 0.33 add §14.1.

**server-kit 0.6**, `eifi1_server_kit.billing` (Layer 1: no tables, no routes):
- `BillingSettings` (a mixin, off by default; switching on requires the secrets), with
  `billing_standing`, `require_billing_enabled` and the price-id lookups;
- `PlanSpec`, `plan_catalogue`, `normalize_plan`, `check_limit()` raising
  `PlanLimitError` (402 `plan_limit`), `dimensions_over_limit`, and `BillingError`
  (`billing_disabled`, `billing_read_only`, `billing_not_configured`), all in
  `CONTRACT_ERRORS`;
- `SubscriptionStatus`, `SubscriptionSource`, the `SubscriptionRow` Protocol,
  `in_good_standing(row, now, …)` with the exemptions of §3.2 (no row), `trial_ends_at(now)`,
  `beta_comped_until(launch)`, `is_beta`; `effective_comped_until` and `grant_holds` from
  0.6.1;
- `billing_write_allowed(method, path, *, standing, allow=…)`, the read-only gate's
  decision (the demo's shape, the standing as an input), and `refuse_billing_read_only`
  for an app's own choke points (§3.3);
- `SyncRefusal`, the "changes refused" shape of a sync reply (§3.3);
- webhooks:
  - a signature check per provider, written with `hmac` (no SDK);
  - the normalised event vocabulary and a mapper per provider;
  - an event-store port (`EventStore`, `DuplicateEventError`) and a pure `dispatch`, with
    the ordering guard and the grant's precedence (`row_changes`), and `webhook_answer`;
- `minor_to_decimal` and the currency exponents;
- the shapes of §4 (`BillingStatus`, `BillingOverview`, `PlanOut`, `CheckoutRequest`,
  `CheckoutAnswer`, `PlanChangeRequest`, `PlanChangeResponse`);
- `AdminAction.PLAN`.

**ui-kit 0.32:**
- the parts of §7, with the guest banner and the "payment processing" state (§12.30);
- `isBillingError` codes in `KitErrorCode`, and `isPlanLimit`;
- `billing.*` labels in seven languages (German: "Tarif" for plan, "Abonnement" for
  subscription);
- the legal commercial disclaimer variant (§8).

## 11. Per repo (summary; the reviews refine it)

Moved to [archive/billing-history.md](archive/billing-history.md): the 0.32 round's
per-repo to-dos, with §12.28–29's app notes; round 0.33's are §14.14 there.

## 12. Settled after the reviews (2026-10-07/08)

The reviews' items keep their numbers, which the code cites. An item that amended a
section above is folded into it and points there; an item that is a rule of its own
stands here. The reviews' wording is in [archive/billing-history.md](archive/billing-history.md).

**Whose standing, and where the gate sits**
1. **The payer's standing, not the caller's** → §3.3.
2. **The gate: two equal shapes** → §3.3.
3. **The order of refusals** → §3.3.
4. **Scheduled jobs are outside the HTTP gate** → §3.3.

**Offline, sync and privacy**
5. **A 402 is not a refusal of one change** → §3.3 (sync).
6. **A guest never learns the owner's payment status** → §3.3.

**Rows, exceptions and grants**
7. **No row, always in good standing** → §3.2.
8. **Not payers** → §3.2.
9. **A pure guest's trial starts at their first owned item** → §3.2.
10. **Beta by invitation date** → §3.2.
11. **An operator's grant beats provider events** → §3.2, §5.
12. **Every payer gets its row where it is created** → §3.2.

**Allowed while read-only**
13. **In every app** → §3.3.
14. **Per app** → §3.3.

**Plans, prices and money**
15. **Dimensions** → §3.4.
16. **Codes** → §3.1, §3.4.
17. **Prices are gross** → §3.1.
18. **Default currency** → §4.

**API and webhooks**
19. **`GET /billing/status` answers a demo user** → §4.
20. **The webhook writes rows for any payer** → §5.
21. **After checkout, "payment processing"** → §7, §14.4.
22. **Trial and grant end notices** → §3.3, §14.7.
23. **Deletion cancels at the provider when it is requested** → §14.8.

**Labels and legal**
24. **The settings group is "Subscription"** → §7.
25. **The Merchant of Record is an independent controller** → §8.
26. **Consumer law in the provider's portal; a visible "Cancel"** → §7, §14.5.
27. **keksdose's legal keys** → §8; the list → archive.

**App-side notes**
28. **kastlan keeps and drops** → archive.
29. **keksdose moves the GCP receiver off `/billing`** → archive.
30. **Kit additions from the reviews** → §10.

**After the 0.32 / 0.6 adoption**
31. **Installed old clients and sync refusals** → §3.3 (sync).
32. **`SyncRefusal.change_ids` are row ids** → §3.3 (sync).
33. **No row is not good standing by accident** → §3.2.
34. **An operator's plan change before launch keeps the beta** → §6.
35. **Removing access under a billing lock** → §12.36.

**Round 0.33**
36. **A lock says its source; a control can be exempt** (decision 26 as amended; ui-kit
    0.33, `src/components/write-lock.tsx`, `src/billing/billing-lock.ts`).
    1. **Every lock source has a kind.** `"demo"` and `"billing"` are the kit's; an app
       names its own (Kurvenschmiede's `"access"` and `"customer"`). A source without a
       kind is never exempted.
    2. **The provider holds every locked source, in refusal order** (§3.3), as `holds`,
       beside the first one's reason and kind. Nesting still follows "nearest wins": an
       inner `locked={false}` reopens everything.
    3. **`commit` takes a scope.** `true`: every lock refuses the control.
       `{ except: [kinds] }`: every lock but those kinds. A control under a demo lock and a
       billing lock together, exempt from billing, shows the demo's reason.
    4. **The kit's parts follow §3.3 by themselves**, with no per-part prop. These take
       `COMMIT_EXCEPT_BILLING` built in:
       - ShareCard: remove a grantee, revoke a pending invitation, and a role toggle that
         lowers (`SharePanelProps.roles` is read narrowest first, as Kurvenschmiede lists
         them: viewer, editor; the options before the grantee's role are a lowering);
       - InvitationsPanel: revoke;
       - SessionsSetting: revoke one, and sign out everywhere;
       - DeleteAccountSetting;
       - EmailChangeSetting: resend, cancel and submit;
       - ProfileSetting: Save;
       - CompleteNameDialog: Save;
       - TranslationReview's verdicts (`TranslationReview`, `TranslationReviewEditor`):
         admin routes (§3.3);
       - PlanChangeConfirm (§14.12): an operator's action, an admin route.

       These stay locked under billing (§3.3: no new seats, guests or roles), with the
       billing reason: ShareCard's Add and its Enter-to-add, and a role toggle that raises
       (the options after the grantee's role); InvitationsPanel's invite and resend.
    5. **`useWriteLock(scope?)` answers the lock as a control with that scope sees it.**
       Code that must know (a toast, a swipe plan, a hand-rolled toggle) reads it.
       `writeLockFor(lock, scope)` is the pure form, which `useConfirm` applies to each
       call's own `commit`.

    ```ts
    // write-lock.tsx
    export type WriteLockKind = "demo" | "billing" | (string & {});
    /** One locked source, as the provider holds it. */
    export interface WriteLockHold { kind: WriteLockKind | undefined; reason: ReactNode }
    /** A control's opt-in: true = every lock; { except } = every lock but these kinds. */
    export type CommitScope = boolean | { readonly except: readonly WriteLockKind[] };
    export const COMMIT_EXCEPT_BILLING = { except: ["billing"] } as const;

    export interface WriteLock {
      locked: boolean;                       // as the scope asked for sees it
      reason: ReactNode | undefined;         // the first hold in scope: its reason
      kind: WriteLockKind | undefined;       // the first hold in scope: its kind
      holds: readonly WriteLockHold[];       // ALL locked sources, in order (unfiltered)
    }
    export interface WriteLockProviderProps {
      locked: boolean;
      reason?: ReactNode;
      kind?: WriteLockKind;                  // a one-source provider
      holds?: readonly WriteLockHold[];      // from combineWriteLocks; wins over kind/reason
      labels?: Partial<WriteLockLabels>;
      children?: ReactNode;
    }
    export function useWriteLock(scope?: CommitScope): WriteLock;  // default scope: true
    /** Pure, for useConfirm's call-time options. */
    export function writeLockFor(lock: WriteLock, scope: CommitScope | undefined): WriteLock;

    // billing-lock.ts
    export interface WriteLockSource { locked: boolean; reason?: ReactNode; kind?: WriteLockKind }
    export interface CombinedWriteLock { locked: boolean; reason: ReactNode | undefined; holds: WriteLockHold[] }
    export function combineWriteLocks(
      sources: ReadonlyArray<WriteLockSource | null | undefined | false>,
    ): CombinedWriteLock;
    /** { locked, reason: useBillingLockReason(options), kind: "billing" }. */
    export function useBillingWriteLock(locked: boolean, options?: BillingLockReasonOptions): WriteLockSource;
    ```

    - **One prop type:** every `commit` prop in the kit, `ConfirmOptions.commit`, the
      comboboxes' `createCommit` and `StepperNav.finishCommit` are `CommitScope`.
      Spreading `<WriteLockProvider {...combineWriteLocks([...])}>` carries `holds`. A
      demo source is `kind: "demo"`. `FormActions` keeps an object scope while not
      pending (`pending ? false : commit`, never `commit && !pending`).
    - **No new labels:** the reasons stay `writeLock.reason`, `demo.writeLocked`,
      `billing.lockReason` and `billing.guestReadOnly`.
    - **An app** names the kinds on its own lock sources, so the parts above reopen by
      themselves, and its own controls of the same sort (leaving a company, new backup
      codes, an operator's page) take `COMMIT_EXCEPT_BILLING`. A control that billing
      refuses but the demo allows takes `{ except: ["demo"] }` (kastlan's help assistant,
      whose backend answers 402 under billing).
37. **Cancelling at a deletion request** → §14.8.

## 13. Proposed plans (Marcel, 2026-10-08)

Marcel: "Propose like that." Starting points, not market research. Billing stays off in
production; the apps wire these catalogues now so the whole path can be reviewed
locally (§13.4). Prices are gross (§3.1), the same figure in CHF and EUR, and yearly is
ten months.

### 13.1 kastlan: per company, by units

Every unit counts, parking, storage and cellars included (decision 13), so a building of
12 flats already holds about 36 units. Seats count staff only (decision 15).

| Code | `units` | `seats` | `storage` | Month | Year |
|---|---|---|---|---|---|
| `starter` | 40 | 2 | 5 GB | 29 | 290 |
| `standard` | 150 | 5 | 25 GB | 79 | 790 |
| `professional` | 500 | 15 | 100 GB | 199 | 1,990 |

`storage` is in bytes, as server-kit's `PlanSpec` documents (5 GB = 5 × 1024³). Above
500 units: an operator's grant at a quoted price (§3.4 "Ask for more"). This
replaces the placeholders CHF 49 / 149 / 399 for 50 / 250 / 1,000 units. Comparable:
ImmoSync (Switzerland) CHF 30 / 99 / 299; immocloud €39.99 up to 50 units.
Gross, as §3.1 says (decision 17), though kastlan sells to businesses.

### 13.2 keksdose: per owner, by budgets and scans

Most people need one budget, so budgets alone separate only the heavy users. The scans
are what costs Marcel money (Gemini per receipt and statement; `user_cost_service` has
the real figures, to check before launch).

| Code | `budgets` | `scans` per calendar month | Month | Year |
|---|---|---|---|---|
| `standard` | 3 | 50 | 5 | 49 |
| `plus` | 10 | 300 | 9 | 89 |

- `scans` counts receipt and statement extractions the owner started this calendar
  month. A scan creates a row, so it is a creation limit (§3.4), not overage.
- FREE goes: after the trial an account without a plan is read-only (decision 7).
  Today's UNLIMITED becomes an operator grant (`comped`, `manual`).
- The help assistant stays outside the plans, under its rate limit.
- Comparable: YNAB $109, Monarch $99.99, Copilot $95 a year.

### 13.3 Kurvenschmiede: per user, by curves

Its running costs are close to nothing, so the price follows the value to an engineer.
The calculator stays open to anyone, without an account.

| Code | `curves` | Month | Year |
|---|---|---|---|
| `personal` | 10 | 9 | 90 |
| `professional` | unlimited (`None`) | 39 | 390 |

`curves` counts owned setpoint sessions (generic and steering); profiles, segments,
gears, parts, measured tables, exports and compute don't count (its review). A copy
counts; an admin transfer and the erasure hand-over never check a limit. Risk: firms
usually buy for a team, by invoice; a company payer may follow.

### 13.4 Local review

- Billing stays **off by default** everywhere, and nothing here goes to production.
- Each app declares the catalogue above as `PlanSpec`s and can switch billing on in a
  local `.env` only, to review the pages, the gate, the limits and the banners.
- Without a provider account, the tests and a local run feed **signed fixture events**
  to the app's own webhook with a local secret: trial, checkout completed, renewal,
  payment failed, cancelled (from server-kit 0.7: `billing.testing`, §14.9). With a
  Paddle sandbox account (Marcel's), the checkout and portal can be tried end to end:
  the kit's pay page on a second localhost port or the app's pay host, or a hosted
  checkout, which every sandbox allows (§14.4).
- The price ids in the settings stay placeholders until Marcel's Paddle sandbox account
  exists (the provider is Paddle, decision 16).


## 14. Round 0.33 / server-kit 0.7 (2026-10-09)

Marcel's decisions 18–27 (19 and 26 as amended after the three apps' reviews), shipped as
server-kit 0.7 and ui-kit 0.33, with the fixes of server-kit 0.7.1 and ui-kit 0.33.1 and
the jobs token of server-kit 0.8. Paths are repo-relative: server-kit's under
`src/eifi1_server_kit/`, ui-kit's under `src/`; an app's backend under `kastlan/`,
`backend/keksdose/` or `backend/kurvenschmiede/`, its frontend under `frontend/src/`.

### 14.1 Scope

**server-kit 0.7:**
- one shared Paddle client, lifted from kastlan, behind a provider-neutral port (§14.2);
- the `app` tag, for one account and three apps (§14.3);
- the checkout return convention (§14.4), `at_provider` (§14.5) and the double-checkout
  refusal (§14.6);
- the notice decision (§14.7), the deletion's cancellation and its undoing (§14.8) and
  the test helpers (§14.9);
- `PlanChangeResponse` widened for the operator's result lines, and `AdminPlan` for
  `GET /admin/plans` (0.7.1; §14.12);
- Lemon Squeezy deprecated, and removed in 0.8 (§14.13).

**ui-kit 0.33:**
- the pay page: a static bundle in the package with its build script, and `payPageUrl`
  and `paddleLocale` (§14.4);
- the checkout-return helpers and hook (§14.4);
- `SubscriptionActions`' `atProvider` and `onPortal`, and the overview's types (§14.5);
- the lock kinds and `commit` scopes (§12.36);
- `usePlanLimitToast` (§14.11), `planColumn`, `usePlanColumn` and `PlanChangeConfirm`
  (§14.12);
- the four new codes in `BillingErrorCode` (§14.2).

**The package:**
- server-kit's billing package (`eifi1_server_kit.billing`) makes one request each for
  checkout, portal, cancel and undoing a cancel, through `billing.paddle`, only with the
  `billing` extra. Everything else stays Layer 1: no tables, no routes.
- httpx is the `billing` extra, `billing = ["httpx>=0.28.0"]` (the apps' floor, no
  ceiling). It is imported lazily, as `mail.ResendClient` does, so
  `import eifi1_server_kit.billing` never needs it. The apps install
  `eifi1-server-kit[billing,…]` from the release wheel's URL; extras work with a URL
  source (kastlan `[billing,images,mail]`, keksdose `[billing,images]`, Kurvenschmiede
  `[billing,mail]`; §14.16.18).

### 14.2 The Paddle client (server-kit)

**`billing/provider.py`**, no httpx, re-exported from `eifi1_server_kit.billing`:

```python
PortalTarget = Literal["overview", "cancel", "payment_method"]

class BillingProviderClient(Protocol):
    async def checkout_url(
        self, *, price_id: str, custom_data: Mapping[str, str],
        customer_id: str | None = None, locale: str | None = None,
    ) -> str:
        """The provider's checkout for one price (quantity 1), carrying custom_data
        (checkout_custom_data; the client adds its app tag) and the payer's customer
        when known. locale reaches only a hosted checkout."""
    async def portal_url(
        self, *, customer_id: str | None, subscription_id: str | None = None,
        target: PortalTarget = "overview",
    ) -> str:
        """A fresh portal session's link, never stored. customer_id None → 409
        billing_not_at_provider."""
    async def cancel(self, *, subscription_id: str, immediately: bool = False) -> None:
        """At the period's end by default; immediately for a paused subscription."""
    async def remove_scheduled_cancel(self, *, subscription_id: str) -> None:
        """Undo a cancellation at the period's end (§14.8)."""

class NoProviderClient: ...          # every call: 503 billing_not_configured

def billing_provider_client(
    settings: BillingSettings, *, client: httpx.AsyncClient | None = None
) -> BillingProviderClient:
    """PaddleClient for provider paddle with a key; NoProviderClient otherwise (never
    raises for the settings). client: the app's own, opened in its lifespan."""

def sold_plan(
    catalogue: Mapping[str, PlanSpec], request: CheckoutRequest, *,
    sold: Collection[str] | None = None,
) -> PlanSpec:
    """The plan a checkout asks for, or 422 billing_plan_not_sold (keksdose's SOLD as sold)."""

def require_new_checkout(row: SubscriptionRow, now: datetime) -> None: ...      # §14.6

CancelOutcome = Literal["cancelled", "failed"]
async def cancel_for_deletion(
    row: SubscriptionRow, client: BillingProviderClient
) -> CancelOutcome | None: ...                                                   # §14.8
ResumeOutcome = Literal["resumed", "failed"]
async def resume_after_withdrawal(
    row: SubscriptionRow, client: BillingProviderClient, now: datetime | None = None
) -> ResumeOutcome | None: ...                                                   # §14.8

CHECKOUT_RETURN_PARAM = "checkout"
CHECKOUT_RETURN_VALUE = "done"
def checkout_return_url(app_base_url: str, path: str) -> str: ...               # §14.4
```

**`billing/paddle.py`**, httpx through the `billing` extra, imported lazily:

```python
PADDLE_API_BASES: Mapping[PaddleEnvironment, str]   # sandbox-api.paddle.com / api.paddle.com
PADDLE_API_VERSION = "1"                            # the Paddle-Version header
PADDLE_TIMEOUT_SECONDS = 15.0

def paddle_environment_of(api_key: str) -> PaddleEnvironment | None: ...
def paddle_locale(kit_locale: str) -> str: ...      # ui-kit's paddleLocale (§14.4), for a hosted checkout

class PaddleError(BillingError):
    """A Paddle call that failed: billing_provider_unavailable (502), or
    billing_not_configured (503) for a 401/403. The client-facing detail is the kit's;
    Paddle's own words stay on the exception, never the key or the body."""
    status: int                 # Paddle's HTTP status; 0 = no answer
    paddle_code: str | None     # error.code
    paddle_detail: str | None   # error.detail
    request_id: str | None      # meta.request_id, what Paddle support asks for

class PaddleClient:             # a BillingProviderClient
    def __init__(
        self, api_key: str, *, environment: PaddleEnvironment | str, app: str | None = None,
        checkout_page_url: str | None = None, hosted_checkout_url: str | None = None,
        timeout: float = PADDLE_TIMEOUT_SECONDS, client: httpx.AsyncClient | None = None,
    ) -> None: ...
```

**Behaviour** (lifted from kastlan's client):
- **`checkout_url`:** `POST /transactions` with `{items: [{price_id, quantity: 1}],
  custom_data: {**custom_data, "app": app}, customer_id?, checkout: {url:
  checkout_page_url}?}`.
  - With `hosted_checkout_url`, the answer is `<hosted>?transaction_id=<txn>&locale=<locale>`,
    the locale only when given and as Paddle names it (`paddle_locale`: `de-CH` → `de`,
    server-kit 0.7.1). Otherwise it is the transaction's `checkout.url`: the pay page plus
    `?_ptxn=<txn>`, and the pay page maps the language itself (§14.4).
  - A 2xx without the id or the URL raises `PaddleError` 502, never a `KeyError`'s 500.
    The same holds for the portal's link.
- **`portal_url`:** `POST /customers/{ctm}/portal-sessions {subscription_ids: [sub]?}`.
  - `overview` answers `urls.general.overview`.
  - `cancel` and `payment_method` answer the subscription's `cancel_subscription` or
    `update_subscription_payment_method` link, or the overview when Paddle gives none (a
    paused or cancelled subscription).
- **`cancel`:** `POST /subscriptions/{sub}/cancel {effective_from: "next_billing_period"
  | "immediately"}`.
- **`remove_scheduled_cancel`:** `PATCH /subscriptions/{sub} {"scheduled_change": null}`.
  Paddle's docs (build/subscriptions/cancel-subscriptions, read 2026-10-09): the
  subscription comes back with `scheduled_change` null and stays `active`; a cancelled
  subscription "can't be reinstated".
- **Every call:**
  - sends `Authorization: Bearer <key>` and `Paddle-Version: 1`;
  - uses the `httpx.AsyncClient` the app injected (`client=`, one for the process, opened
    in its lifespan, so calls reuse connections); without one, each call opens and closes
    its own, as `mail.ResendClient` does;
  - has no retry, because creating a transaction is not idempotent;
  - logs one WARNING per failure: method, path, status, Paddle's code and request id;
    never the body or the key.
- **The key's minimum permissions** (Paddle's 2025 keys) are in the docstring: transaction
  write, customer-portal-session write, subscription write.
- **Not on the port:** a `return_url` (the way back is configuration, §14.4); a
  "no checkout URL" error (Paddle refuses to create a transaction without a default
  payment link, so that case arrives as a 4xx from the create); a buyer's `email` (the
  prefill `user_email` is a hosted-checkout parameter and can't be combined with a
  transaction's customer).

**Errors:** new `BillingErrorCode` members. `BILLING_ERROR_DETAIL` gets an English detail
for each, and all are in `CONTRACT_ERRORS`, so `install_contract_error_handlers` answers
`{detail, code}` at the code's status.

| Code | Status | When |
|---|---|---|
| `billing_provider_unavailable` | 502 | Paddle didn't answer, answered 429 or 5xx, refused a request (a 4xx other than 401/403), or answered 2xx without the fields read. "Try again." |
| `billing_not_at_provider` | 409 | A portal request for a payer with no provider customer (§14.5). |
| `billing_already_subscribed` | 409 | A checkout while a provider subscription runs (§14.6). |
| `billing_plan_not_sold` | 422 | A checkout for a plan, currency or interval the catalogue doesn't sell. |

- A 401/403 from Paddle (a wrong key, or one without the permission) is
  `billing_not_configured` 503, logged at ERROR: the deployment's fault, not "try again".
- **Naming:** every new code carries the `billing_` prefix of `billing_disabled`,
  `billing_read_only` and `billing_not_configured` (decision 22).
- ui-kit's `BillingErrorCode` (`src/auth/auth-errors.ts`) has the same four, and
  `isBillingError` reads them.

**Settings:** new `BillingSettings` fields.

```python
class PaddleEnvironment(enum.StrEnum):
    SANDBOX = "sandbox"
    LIVE = "live"

class BillingSettings(BaseModel):
    ...
    #: The app's name in every checkout's custom data (§14.3). Set as the default in the
    #: app's Settings subclass, not per deployment (billing_app: str | None = "keksdose").
    #: Lowercase, a letter first, ^[a-z][a-z0-9_-]{0,63}$: the mixin's model validator
    #: checks it whatever annotation the subclass redeclares (server-kit 0.7.1, §14.16.29).
    billing_app: str | None = None
    #: sandbox or live. Unset → read from the API key's prefix (pdl_sdbx_apikey_ /
    #: pdl_live_apikey_); a legacy key (from before 2025-05-06) needs it set.
    billing_environment: PaddleEnvironment | None = None
    #: The kit's pay page on the app's pay host, https://pay.<app domain>/ (§14.4), sent
    #: as the transaction's checkout.url. Unset → the account's default payment link.
    billing_checkout_page_url: str | None = None
    #: A Paddle hosted checkout's launch URL (https://pay.paddle.io/checkout/hsc_…). Wins
    #: over billing_checkout_page_url. Every sandbox; live only with Paddle's approval.
    billing_hosted_checkout_url: str | None = None

    def billing_api_environment(self) -> PaddleEnvironment: ...   # 503 billing_not_configured if unknown
    def verify_billing_webhook(
        self, provider: BillingProvider | str, raw_body: bytes, headers: Mapping[str, str],
        *, now: float | None = None,
    ) -> None:
        """verify_webhook_signature with this deployment's secret AND its tolerance."""
```

- **Env names:** `<APP>_BILLING_APP` (set in code), `<APP>_BILLING_ENVIRONMENT`,
  `<APP>_BILLING_CHECKOUT_PAGE_URL`, `<APP>_BILLING_HOSTED_CHECKOUT_URL` (kastlan's
  existing name keeps working). Every app's `.env.example` lists all four, `_APP` with
  "set in code" (§14.16.16; Kurvenschmiede's docs test requires every Settings field
  there). Not backend settings: the web build's Paddle client-side token and environment,
  and the web service's `PAY_HOST` (§14.4).
- **The URL fields** accept `https://`, or `http://` for localhost only. A blank variable
  is unset.
- **Switching on** requires `billing_provider = paddle` (the one provider; any other
  value fails at start), `billing_app`, and an environment that resolves and agrees with
  the key's prefix. Sandbox keys work only against `sandbox-api.paddle.com` and live keys
  only against `api.paddle.com`, so a sandbox key on live fails at start, not at the
  first checkout.
- **Values compare as the enums do** (server-kit 0.7.1): settings holding the plain text
  `"paddle"` or `"sandbox"` (an app's `str` field, a test's `monkeypatch.setattr`)
  behave as `BillingProvider.PADDLE` and `PaddleEnvironment.SANDBOX`.
- **The base URL is the kit's constant** (`PADDLE_API_BASES`, decision 24): no app setting
  names a host, so a typo or another host can't be configured.
- **`verify_billing_webhook`** makes the right call the easy one: it passes the
  deployment's `billing_signature_tolerance`, where a bare `verify_webhook_signature`
  without `tolerance=` applies the kit's 5-second default whatever
  `<APP>_BILLING_SIGNATURE_TOLERANCE` says.

### 14.3 One Paddle account, three apps (decision 18)

**Why the kit must tell the apps apart**
- Paddle's notification destinations filter by event type and traffic source only, not by
  product, price or custom data. On one account every app's endpoint receives every app's
  subscription events. Each destination has its own secret, which proves only that the
  event came from Paddle.
- keksdose and Kurvenschmiede both tag payers `user:<id>`, so Kurvenschmiede's user 42
  matches keksdose's user 42. While a grant holds, `dispatch` writes the foreign
  subscription's link and dates onto that row (`row_changes`), and a beta user gets
  another app's portal.
- One account has one default payment link.

**The rules**
1. **Every checkout's custom data carries the app:** `{"app": <billing_app>, "payer_ref":
   …}`. `checkout_custom_data(payer_ref, *, app: str | None = None) -> dict[str, str]`
   adds `APP_KEY = "app"`, and `PaddleClient` adds its `app` itself, so an app can't
   forget it. Paddle copies custom data from the checkout's transaction to the
   subscription.
2. **Another app's event is dropped at parse.** `parse_webhook_event(provider, raw_body, *,
   app: str | None = None)` answers `None` for an event whose `custom_data.app` differs
   from `app` (logged at INFO): 200, not recorded, not dispatched. **Once `app` is given,
   an untagged event is dropped too**, and logged at WARNING; it is never matched by
   `provider_customer_id` (§14.16.16: an app's payer lookup may fall back to the customer
   id, and one person may be one Paddle customer across the apps, so a foreign untagged
   event would land on its row). With `app` None, every event, as before 0.7. No data
   needed migrating: billing had never been on, the payer references stay `user:<id>` and
   `company:<id>`, and every checkout from 0.7 carries the tag, which Paddle copies to
   the subscription and its later events. `NormalisedEvent.app` reads
   `custom_data["app"]`.
3. **Each app** passes `app=settings.billing_app`, keeps its own notification destination
   and secret, and sets its own pay host (`billing_checkout_page_url`), since the
   account's default payment link is a single page.
4. The tag costs nothing if the accounts are split later.

**Open:** at signing, Paddle confirms that one account may sell three brands on three
approved domains. In the sandbox: one person may be one Paddle customer across the apps,
and the portal's overview may then list all their subscriptions; and which pay host is
the account's default payment link, which Paddle uses for payment-method updates and in
its subscription emails (§14.15).

### 14.4 The checkout page and the way back (decisions 19, 20)

**Where the checkout opens.** Paddle's create-transaction answers a `checkout.url`: a pay
page's URL plus `?_ptxn=<txn>`. A pay page is a page on an approved website running
Paddle.js, which opens the checkout for that transaction by itself (Paddle's docs,
build/transactions/default-payment-link). `POST /billing/checkout` still answers `{url}`,
and it is one of two:
- **the kit's pay page on the app's pay host** (the baseline): a static page ui-kit ships,
  served by each app at `pay.<app domain>`. The server sends its URL as the transaction's
  `checkout.url` (`billing_checkout_page_url`);
- **a Paddle hosted checkout** (`billing_hosted_checkout_url`, kastlan's setting). Every
  sandbox has it, so kastlan's sandbox review works. On live it needs Paddle's approval
  (sellers@paddle.com) and is aimed at mobile apps; its redirect is set in Paddle's
  dashboard.

**No success URL on the request.** `CheckoutRequest {plan, interval, currency}` keeps
`extra="forbid"` and gets no URL field: a client-chosen redirect is an open redirect, and
Paddle's create-transaction takes none. The way back is configuration: Paddle.js
`successUrl` on the pay page, or the hosted checkout's redirect. The transaction has no
locale either; the pay page sets it in Paddle.js, and the hosted URL takes `locale`.

**The convention is `?checkout=done` on the app's subscription page:**
- kastlan `/admin/billing`;
- keksdose and Kurvenschmiede `/settings/subscription`.

server-kit exports `CHECKOUT_RETURN_PARAM`, `CHECKOUT_RETURN_VALUE` and
`checkout_return_url(app_base_url, path)` for the deploy notes and the tests. The page
drops the marker with `replace` once it has read it.

#### The pay host (decision 19 as amended)

**Why a separate origin** (keksdose's review). Paddle.js is a third-party script, always
the latest from Paddle's CDN. On an app's own origin it would run beside what one
injected script could take: keksdose's extractable data key in IndexedDB, and every
app's session tokens in localStorage. A CSP relaxed only on a `/pay` route can't help:
IndexedDB and localStorage are per origin, not per path, and keksdose's service worker
answers every navigation from its precached shell with the strict headers anyway. On
`pay.<app domain>` Paddle.js shares its origin with
nothing: no sign-in, no app code, no storage, no service worker, no API. The hosts are
`pay.kastlan.app`, `pay.keksdose.app` and `pay.kurvenschmiede.app`, and
`billing_checkout_page_url` is `https://pay.<app domain>/`.

**What the kit ships** (`dist/pay/`, in the npm package; no React, nothing from an app):
- `index.html`, with no inline script or style. It loads Paddle.js from
  `https://cdn.paddle.com/paddle/v2/paddle.js` (Paddle's rule: always from its CDN), then
  `pay.js`;
- `pay.js`, the one script:
  - reads `pay-config.json` (below) from its own origin;
  - calls `Paddle.Environment.set("sandbox")` for the sandbox, then `Paddle.Initialize({
    token, checkout: { settings: { displayMode: "overlay", locale, successUrl, theme } }
    })`, the theme from `prefers-color-scheme`. Paddle.js then opens the transaction that
    `_ptxn` names, with these settings;
  - shows its own four lines in the seven languages: `payOpening` while the checkout
    opens, `payNothing` without `_ptxn` (or without a token), `payFailed` when Paddle.js
    doesn't load or the configuration is wrong, and `payBack` once the buyer closes the
    checkout;
  - shows a footer with the app's name and its Terms and Privacy links, which Paddle's
    domain review wants easy to find (they may live on the main domain);
  - writes nothing to storage and sends nothing to the app's server;
- `pay.css`;
- `.well-known/apple-developer-merchantid-domain-association`: Paddle's file for Apple Pay
  verification, the same for every Paddle seller, taken from Paddle's docs at the kit's
  release;
- the build script, a `bin` of the package, `eifi1-pay-page --out <dir> --token …
  --environment … --return-url … --app-name … --terms-url … --privacy-url …`, which
  copies the bundle and writes `pay-config.json`.

**How an app configures it: `pay-config.json`, written at the web image's build.**

```json
{
  "token": "live_…",
  "environment": "live",
  "returnUrl": "https://keksdose.app/settings/subscription",
  "appName": "Keksdose",
  "termsUrl": "https://keksdose.app/terms",
  "privacyUrl": "https://keksdose.app/privacy"
}
```

- The web image's build stage runs the script with the deployment's build settings:
  Paddle's client-side token and the environment (which the app's own bundle no longer
  needs) and the app's base URL. The Caddy stage copies the result to `/srv-pay`. The kit
  is never rebuilt.
- The script refuses a token whose prefix disagrees with the environment (`test_` for
  sandbox, `live_` for live: Paddle's client-side token prefixes) or has none, a return,
  terms or privacy URL that isn't `https://` (`http://` for localhost only), and a missing
  app name (`payPageConfigProblems` in `src/billing/pay-page.ts`), so a wrong pairing
  fails the build, not a buyer; the page says `payFailed` for such a file. Without a token
  (billing off) it writes `"token": null`, and the page says `payNothing`.
- The page's `successUrl` is `checkoutReturnUrl(returnUrl)`, which adds
  `?checkout=done`; "Back" goes to `returnUrl`.
- **Why a file and not query parameters:**
  - Paddle's own links carry only `_ptxn`. Paddle uses the account's default payment link
    for payment-method updates and in its subscription emails, so configuration in the
    query would be missing exactly there;
  - a return URL in the query is an open redirect on an approved payment domain: anyone
    could send a link that hands the buyer to a look-alike page after paying;
  - the server's `checkout.url` would carry the token and the environment, and Paddle
    doesn't document how it appends `_ptxn` to a URL that already has a query.
- **Why not placeholders in `index.html`:** rewriting a shipped HTML file at deploy is
  fragile, and the page served would differ from the kit's.
- **The language is the one thing per visit.** The app sends the buyer to
  `payPageUrl(url, locale)`, which adds `lang=<kit locale>` to a pay page link (one that
  carries `_ptxn`) and leaves any other URL, a hosted checkout's, as it is. A missing or
  unknown `lang` falls back to the browser's languages matched to the kit's, then to
  English. A wrong `lang` costs nothing but the language.

**The locale map** (keksdose's review), inside the page and exported for tests. Paddle's
checkout locales (`Paddle.Checkout.open`, `settings.locale`, read 2026-10-09) are `ar`,
`zh-Hans`, `zh-TW`, `da`, `nl`, `en`, `fr`, `de`, `it`, `ja`, `ko`, `no`, `pl`, `pt`,
`pt-BR`, `tr`, `ru`, `es` and `sv`; left out, Paddle uses the browser's.

| Kit | Paddle |
|---|---|
| `en` | `en` |
| `de-CH` | `de` |
| `fr` | `fr` |
| `it` | `it` |
| `es` | `es` |
| `zh` | `zh-Hans` |
| `hu` | `en`: Paddle has no Hungarian; English always, not Paddle's browser guess |

The page's own lines stay in the kit's language, Hungarian included.

```ts
// src/billing/pay-page.ts (the main barrel)
export type PaddleEnvironment = "sandbox" | "live";
export const PAY_PAGE_LANG_PARAM = "lang";
/** The kit's locale → Paddle's checkout locale (the table above). */
export function paddleLocale(kitLocale: string | undefined): string;
/** The checkout's {url} with the buyer's language: lang=<kit locale> on a pay page link
 *  (it carries _ptxn); any other URL unchanged. An undefined locale (useKitLocale()
 *  without a provider locale) adds no lang, and the page reads the browser's language,
 *  else English (ui-kit 0.33.1, §14.16.31). */
export function payPageUrl(checkoutUrl: string, locale: string | undefined): string;
```

server-kit's `paddle_locale` is the same map, for a hosted checkout's `locale` (§14.2).
The four `billing.pay*` labels are built into the bundle.

**How it is served.** Each app's web container (Caddy on Cloud Run, the same image)
answers the second host name with a site block of its own, so the app's headers never
apply to it:

```caddy
http://{$PAY_HOST:pay.invalid}:{$PORT} {
	root * /srv-pay
	header {
		Content-Security-Policy "default-src 'none'; script-src 'self' https://cdn.paddle.com; frame-src https://buy.paddle.com https://sandbox-buy.paddle.com; connect-src 'self' https://*.paddle.com; img-src 'self' data: https://*.paddle.com; style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"
		Permissions-Policy `payment=(self "https://buy.paddle.com" "https://sandbox-buy.paddle.com"), camera=(), geolocation=(), microphone=(), usb=()`
		X-Robots-Tag "noindex"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		Strict-Transport-Security "max-age=31536000"
		Cache-Control "no-cache"
	}
	@served path / /index.html /pay.js /pay.css /pay-config.json /.well-known/apple-developer-merchantid-domain-association
	handle @served {
		file_server
	}
	handle {
		respond 404
	}
}
```

- **The CSP allows only Paddle's hosts.** Paddle publishes no CSP list, so the sandbox
  settles the exact one (§14.15). A wide Paddle entry costs little here: the origin holds
  nothing to take.
- **`style-src` names both Paddle CDNs** (ui-kit 0.40, settled in the sandbox): Paddle.js
  loads its overlay stylesheet (`/paddle/v2/assets/css/paddle.css`) into the pay page
  itself, from `sandbox-cdn.paddle.com` once `Paddle.Environment.set("sandbox")` ran and
  presumably from `cdn.paddle.com` live — while the script itself always comes from
  `cdn.paddle.com`, so `script-src` stays as it is. Evidence (keksdose, 2026-10-16: its
  pay page served with this block's two headers before the change, headless Chromium
  with a `securitypolicyviolation` listener, the whole flow): exactly one violation on
  every load, `style-src-elem` blocking
  `https://sandbox-cdn.paddle.com/paddle/v2/assets/css/paddle.css`; script, frame,
  connect and img were never refused. The checkout still rendered (its frame styles
  itself) but the overlay's own wrapper — backdrop, close button position — lost its
  styles. Sentry, Stripe, localizecdn and Google Fonts load inside Paddle's frame, under
  its own CSP, and need nothing here. The hosts go in **`style-src`, not
  `style-src-elem`**: `style-src-elem` falls back to `style-src` anyway, while a browser
  that predates `style-src-elem` (Safari before 15.4, Firefox before 108) ignores it and
  would still block the stylesheet; one directive also can't drift from a second.
- **`Permissions-Policy` allows `payment` for Paddle's frame**, so Apple Pay and Google Pay
  work in it. The app's own origin keeps what it has (keksdose's `payment=()`).
- **No `Cross-Origin-Opener-Policy: same-origin`:** on a domain not verified for Apple Pay,
  Paddle opens Apple Pay in a popup from a Paddle domain.
- **The Apple Pay file** answers 200 without a redirect, as Paddle's verification requires.
- **noindex** on every answer; no `robots.txt` Disallow, which would hide the header from
  the crawler (keksdose's rule).
- **Nothing else is served:** no `/api` proxy, no service worker, no cookie. An app's
  cookie, if one ever comes, stays host-only (no `Domain=`), and no CORS allow-list names
  the pay host.
- **`PAY_HOST`** is set on the web service. Unset, the block answers `pay.invalid`, which
  never matches. Caddy picks the block by host name, so the app's `:{$PORT}` block stays
  the catch-all. The default holds only while the variable is UNSET (§14.16.30):
  set but empty, the address is `http://:{$PORT}`, a second catch-all, and the order of
  the blocks decides which one answers the app's domain. So the deploy passes `PAY_HOST`
  only with a value, the pay block comes after the app's (a test pins the order), and
  the variable lives where a deploy keeps it: the deploy's own variables, or
  `--update-env-vars`. A deploy with `--set-env-vars` replaces every variable and drops
  one set by hand.
- **Locally**, the same files on a second localhost port, which is a separate origin too:
  Compose's Caddy (`deploy/Caddyfile` in keksdose and Kurvenschmiede) gets a second site
  block. The sandbox has no website approval (§15.6, 2026-10-16), and Paddle refuses
  `localhost` as its default payment link, so a local run leaves
  `<APP>_BILLING_CHECKOUT_PAGE_URL` unset and opens on the default payment link, which
  points at the pay page through a tunnel. That Caddy has automatic HTTPS on,
  so its block's default is `http://pay.invalid` — `{$PAY_HOST:http://pay.invalid}` —
  since a bare `pay.invalid` makes it ask for a certificate at every start (§14.16.30).
  The `pay.invalid` default fits only a Caddy without automatic HTTPS, as the Cloud Run
  block's `http://` address is.

**One-time manual steps per app** (its deploy README):
1. DNS: `pay` as a CNAME to `ghs.googlehosted.com`, DNS-only in Cloudflare, like the apex.
2. `gcloud run domain-mappings create --service=<app>-web --domain=pay.<app domain>
   --region=europe-west4` (all three run there); a subdomain inherits the domain's
   verification. Then `PAY_HOST=pay.<app domain>` on `<app>-web`, where the next deploy
   keeps it (the deploy's own variables, or `--update-env-vars`; see `PAY_HOST` above).
3. Paddle → Checkout → Website approval: add `pay.<app domain>`. Paddle reviews every
   domain or subdomain a checkout opens from — live only: the sandbox has no website
   approval (§15.6), so there the transaction opens on the default payment link. The review
   wants the product, the prices, the terms, the refund policy and the privacy policy easy
   to find; they may sit on the main domain, and the page's footer links them.
4. Paddle → Website approval → Apple Pay verification: "Verify" the pay host. It is
   optional; without it Paddle opens Apple Pay in a popup.
5. A client-side token per app (Paddle → Developer tools → Authentication), so one can be
   revoked alone. It goes to the web build with the environment.
6. `<APP>_BILLING_CHECKOUT_PAGE_URL=https://pay.<app domain>/` on the backend — once the
   domain is approved (step 3). An explicit `checkout.url` on an unapproved domain is
   refused: 400 `transaction_checkout_url_domain_is_not_approved`, which server-kit 0.13
   answers as 503 `billing_not_configured`. Unset, the transaction opens on the default
   payment link, as in the sandbox (§15.6).

**No app CSP changes** (§14.16.26): kastlan and Kurvenschmiede send none, keksdose keeps
its app CSP and `payment=()`, and an app's tests that read the CSP from its Caddyfiles
read the app's block, not the pay host's. No app has a `/pay` route, so nothing in an app
(public paths, last-visited page, noindex matchers) names one. The token and the
environment are the web image's build arguments for the pay page, not `VITE_` settings.

#### The way back

**ui-kit 0.33** (`src/billing/checkout-return.ts`, `src/billing/checkout-processing.ts`):
keksdose's `checkout-return.ts`, made router-agnostic.

```ts
export const CHECKOUT_RETURN_PARAM = "checkout";
export const CHECKOUT_RETURN_VALUE = "done";
export function isCheckoutReturn(where: string | URLSearchParams | { search: string }): boolean;
export function withoutCheckoutReturn(params: URLSearchParams): URLSearchParams;
/** "https://app.example/settings/subscription" → "…?checkout=done" (keeps query and hash). */
export function checkoutReturnUrl(page: string): string;

/** The overview fields a completed checkout changes (wire names). */
export type CheckoutOverview = Pick<BillingStanding, "status" | "in_good_standing"> & {
  plan: string; source: string; current_period_end?: DateInput;
};
export function checkoutFingerprint(o: CheckoutOverview): string;
export function checkoutLanded(before: string | null, now: CheckoutOverview): boolean;

/** Before leaving for the checkout. payer = the user's or the company's id: a mark never
 *  speaks for another payer. */
export function noteCheckoutStarted(
  payer: string | number, overview?: CheckoutOverview, opts?: { storageKey?: string },
): void;

/** Every mounted instance shares one module-level store per storageKey: one state, one
 *  poll, one landing. The options are CheckoutProcessingOptions. */
export function useCheckoutProcessing(options: {
  payer: string | number | null;
  returned: boolean;                 // isCheckoutReturn(location.search)
  onConsumed: () => void;            // setSearchParams(withoutCheckoutReturn(p), { replace: true })
  overview: CheckoutOverview | undefined;  // the overview query's data, judged here
  refetch: () => unknown;            // the overview query's refetch: the hook polls with it
  onLanded?: () => void;             // invalidate the plans, locked items; once per landing
  timeoutMs?: number;                // 600_000
  pollMs?: number;                   // 4_000
  storageKey?: string;               // "eifi1-billing-checkout"
}): { processing: boolean; checkAgain: () => void };
```

1. **"Landed" is judged against the overview at departure, not "is it active"**
   (keksdose's rule). A payer who buys under a running grant keeps `comped` (§12.11), and
   only `current_period_end` moves. With no departure on record, landed needs `active`.
2. **Processing is bounded** (10 minutes by default) and remembered across the
   whole-page return, per payer, through the kit's safe storage (a throwing storage
   doesn't break it).
3. **One state for every instance** (§14.16.19): an app may mount the hook twice
   (keksdose: app-wide in its banner and on the subscription page). The kit's store is
   module-level: the first instance that sees the marker consumes it, one timer polls
   with the latest mounted `refetch`, and `onLanded` runs once.
4. **The hook polls through the app's `refetch`**, since the app owns its overview query.
   The app shows `BillingBanner kind="processing" onAction={checkAgain}` (§7, §12.21). An
   app's `refetchOnWindowFocus` doesn't matter.
5. **The kit has no router:** the app says whether the URL returned and how to drop the
   marker.
6. **The mark is a browser entry** on the app's origin, so an app whose privacy text lists
   its entries names it (Kurvenschmiede passes its own `storageKey`).

**Settled in the sandbox** (keksdose, 2026-10-16): the pay host end to end, and the CSP
it needs (`style-src` above; §15.6).

### 14.5 Whether the payer reached the provider (decision 22)

1. **`GET /billing/overview` carries `at_provider: bool`:** a provider customer exists for
   this payer. It doesn't depend on the status or the source.
   - server-kit: `BillingOverview.at_provider: bool = False`, set by `from_row` from
     `row.provider_customer_id is not None`.
   - The `SubscriptionRow` Protocol has `provider_customer_id: str | None`, as all three
     apps' rows and the kit's test `Row` do.
2. **Without one**, the subscription page shows a caption in place of "Payment and
   invoices" and "Cancel subscription". **With one, both show, whatever the status or
   source** (§7, §12.26): a payer who bought under a grant keeps the way to the invoices
   and to "Cancel".
3. **A portal request without one answers `409 billing_not_at_provider`**, for a stale
   page, in every app (`portal_url` with `customer_id=None`).
4. **`POST /billing/portal` takes an optional body** `PortalRequest {target: "overview" |
   "cancel" | "payment_method" = "overview"}` (`extra="forbid"`). The link is never
   stored. The targets (§14.16.5):
   - "Payment and invoices": `overview`;
   - "Cancel subscription": `cancel`, the portal's cancel link for the subscription
     (§7), never the overview;
   - the payment-failed banner's action: `payment_method`.

**ui-kit 0.33** (`src/billing/subscription-actions.tsx`, `src/billing/billing-overview.ts`):

```ts
export type BillingErrorCode = … | "billing_not_at_provider";     // with the other three, §14.2
export type PortalTarget = "overview" | "cancel" | "payment_method";
export interface PortalRequest { target?: PortalTarget }           // POST /billing/portal's body
export interface SubscriptionActionsProps {
  manageHref?: string; onManage?: () => void;   // "Payment and invoices"
  cancelHref?: string; onCancel?: () => void;   // "Cancel subscription"
  /** Both as one call that says where to: "overview" or "cancel".
   *  onManage and onCancel win over it. */
  onPortal?: (target: PortalTarget) => void;
  /** The overview's at_provider. False: a caption in place of both actions.
   *  Default true (0.32's behaviour). */
  atProvider?: boolean;
  pending?: "manage" | "cancel" | null;
}
export interface BillingLabels {
  /** "Nothing to manage yet. Payments and invoices appear here once you have a paid plan." */
  notAtProvider: string;
}
```

`billing.notAtProvider` comes in all seven languages. **The overview's types:** the kit
exports `BillingOverview` (with `at_provider`), `SubscriptionSource`, `PortalTarget` and
`PortalRequest`, server-kit's shapes field for field under their wire names, for an app
whose client is hand-written (kastlan's, Kurvenschmiede's), where no mirror test catches a
missing field (§14.16.24).

### 14.6 A second checkout while subscribed (decision 21)

- **Why:** a second checkout would create a second Paddle subscription, and the payer
  would be charged twice; `dispatch` would just move the row's link.
- **server-kit:** `require_new_checkout(row, now)` raises `409
  billing_already_subscribed` while a provider subscription runs. Each app calls it in
  `POST /billing/checkout` before creating the transaction. A subscription already set to
  cancel at the period's end doesn't block a new checkout.
- **"Runs"** is: the row has the provider's subscription id and isn't set to cancel at
  its period's end, and either its `source` is `provider` and its status `active`,
  `trialing` or `past_due`, or — a payer who bought under a grant, whose row keeps the
  grant's status and source (§3.2, §12.11) — the provider's period runs past `now`.
- **Plan changes go through Paddle's customer portal**, configured in Paddle's dashboard.
  A page that gets the 409 points the payer to the portal.
- **Open (sandbox, before billing goes on):** whether the portal switches plans. Paddle's
  current docs (build/subscriptions/customer-portal-upgrades-downgrades) say it can once
  configured, upgrades prorated at once and downgrades at the next period; an older
  partner page says it can't. If it can't, the fallback is a kit `change_plan` (Paddle's
  subscription update with proration), which is not decided.

### 14.7 Trial and grant end notices (decision 23, §12.22)

**The kit** (`billing/notices.py`) only decides which payer is owed which notice. It
answers per row with the kind, the end and the days left, and knows no recipient, no
address and no words (§14.16.10). The app turns (payer, kind, ends_at, days_left) into
its own mail.

```python
NOTICE_AHEAD = timedelta(days=7)
NOTICE_LATE_LIMIT = timedelta(days=3)   # an "ended" notice no later than this after the end
NOTICE_STATUSES = frozenset({SubscriptionStatus.TRIALING, SubscriptionStatus.COMPED})

class BillingNoticeKind(enum.StrEnum):
    TRIAL_ENDING = "trial_ending"
    TRIAL_ENDED = "trial_ended"
    GRANT_ENDING = "grant_ending"
    GRANT_ENDED = "grant_ended"

class BillingNotice(NamedTuple):
    kind: BillingNoticeKind
    ends_at: datetime
    days_left: int                      # whole days to ends_at; 0 from the end on
    @property
    def key(self) -> str: ...                                   # "trial_ending:2026-11-07T09:00Z"

def billing_notice_due(
    row: SubscriptionRow, now: datetime, *, launch: datetime | None, sent: str | None,
    ahead: timedelta = NOTICE_AHEAD, late_limit: timedelta = NOTICE_LATE_LIMIT,
) -> BillingNotice | None: ...

class NoticeCandidate[PayerT, RowT: SubscriptionRow = SubscriptionRow](NamedTuple):
    payer: PayerT                       # the app's own: a user, a company
    row: RowT                           # the payer's subscription row, typed as the app's
    sent: str | None = None             # the row's billing_notice_sent
    deactivated: bool = False
    deletion_requested: bool = False

class OwedNotice[PayerT, RowT: SubscriptionRow = SubscriptionRow](NamedTuple):
    payer: PayerT
    kind: BillingNoticeKind
    ends_at: datetime
    days_left: int
    row: RowT                           # the candidate's row, for the marker (0.7.1)
    @property
    def key(self) -> str: ...

def billing_notices_owed(
    candidates: Iterable[NoticeCandidate[PayerT, RowT]], now: datetime, *,
    settings: BillingSettings, ahead: timedelta = NOTICE_AHEAD, late_limit: timedelta = NOTICE_LATE_LIMIT,
) -> list[OwedNotice[PayerT, RowT]]: ...
```

- **The trial** is the cardless one: `trialing`, `source` not `provider`, `trial_ends_at`
  set.
- **The grant's end** is `effective_comped_until`, so a beta row without an end counts as
  launch + 12 months (§3.2), and without a launch date it has no end yet, so no notice. A
  grant without an end is owed none.
- **No grant notice while the provider's paid period runs past the grant's end:** that
  payer already pays.
- **ENDING** from `ahead` before the end; **ENDED** from the end until `late_limit` after
  it. A missed ENDING is skipped, never sent after the end, and a first run doesn't mail
  every long-ended trial.
- **`None` when `sent` is this notice's key.** The marker makes the job idempotent across
  missed runs, Cloud Scheduler's retries and double runs.

**The app's job**, wherever it runs (§14.16.11):
1. **nothing while billing is off:** it returns at once, and a token route answers 200
   with nothing sent, so the Scheduler job doesn't fail every day;
2. select the rows with `status IN NOTICE_STATUSES`, with the RLS bypass (few rows;
   filter in Python);
3. **skip a payer whose account is deactivated or has a deletion request.** A
   deletion-requested account keeps its subscription row until the erasure, and "a
   deactivated account is sent nothing" is each app's rule. kastlan skips a company
   flagged for deletion, and a company without an active admin;
4. `billing_notice_due(row, now, launch=settings.billing_launch_at,
   sent=row.billing_notice_sent)`;
5. **the recipients and the words are the app's:** keksdose and Kurvenschmiede mail the
   user, kastlan the company's active admins, each in their own locale. Each app sends
   through its `Mailer` with `kind=str(notice.kind)` and its own `MailText` per kind, in
   every locale it has (kastlan and keksdose: four). The kit's docstring has an English
   reference text;
6. set `row.billing_notice_sent = notice.key` once the mail went out (`send` returned
   True; kastlan: for at least one admin);
7. commit per row.

**`billing_notices_owed` does steps 1, 3 and 4** over the app's candidates (adopt-0.33):
nothing while `settings.billing_enabled` is off, no deactivated or deletion-requested
candidate, and `billing_notice_due` with the settings' `billing_launch_at` and each
candidate's `sent`. Each `OwedNotice` hands the candidate's own row back (server-kit
0.7.1), so the app stores the marker without carrying the row in `payer`:
`owed.row.billing_notice_sent = owed.key`. `billing_notice_due` stays for an app that
walks its rows itself.

**The marker:** a column on each app's subscription row, `billing_notice_sent
VARCHAR(64) NULL`.

**The trigger:**
- **The token goes in a header, never in the query string** (§14.16.12): Cloud Run's
  request logs record the URL with its query. The route reads `X-Jobs-Token` and compares
  it in constant time with the app's `<APP>_JOBS_TOKEN` secret; a missing or wrong token,
  or none set, answers 401. Cloud Scheduler's HTTP jobs send it with `--headers`.
  keksdose's Pub/Sub receiver keeps its `?token=`, since a push subscription can't send a
  header.
- **server-kit 0.8 ships it** (`eifi1_server_kit.jobs`): `require_jobs_token(getter)`, the
  FastAPI dependency (`Depends(require_jobs_token(lambda: settings.jobs_token))`, the
  setting read at every call); `check_jobs_token(presented, expected)`, which compares
  bytes with `hmac.compare_digest`; `JobsTokenError` (401, in `CONTRACT_ERRORS`; no token
  set is also logged at WARNING); `JOBS_TOKEN_HEADER`; and the `JobsSettings` mixin's
  `jobs_token: SecretStr | None` (`<APP>_JOBS_TOKEN`; blank is unset).
- **Kurvenschmiede:** `POST /api/v1/ops/billing-notices`, one daily Cloud Scheduler HTTP
  job, the Cloud Scheduler API enabled in its project; no Cloud Run Job. Compose has no
  scheduler, and gets none: a local run calls the job through the app's billing CLI, or
  POSTs the route with the header.
- **kastlan:** every daily job is a token route, not only the notices (§14.16.13): each
  of `recurring_rent_daily`, `lease_status_daily`, `invoices_overdue_daily`,
  `assistant_retention_daily` and the notices gets `POST /api/v1/ops/jobs/<name>` behind
  `X-Jobs-Token` (`KASTLAN_JOBS_TOKEN`), and one daily Cloud Scheduler HTTP job. Its
  in-process APScheduler runs only with `KASTLAN_SCHEDULER_ENABLED`, for local runs;
  production leaves it off (its hosting plan: off on autoscaled, scale-to-zero Cloud Run).
- **keksdose:** a `billing_notices` `JobSpec` next to `notifications` (06:00 daily), a
  Cloud Run Job that Cloud Scheduler starts through the Run API with its service account,
  so no token (§14.16.14).
- **Cost:** Cloud Scheduler is free for three jobs per billing account and charged per job
  and month after that; keksdose is past the free three already.

### 14.8 Cancelling at a deletion request, and undoing it (§12.23, §12.37)

**Deletion cancels at the provider when it is REQUESTED** (user-admin §6.4; §12.23), or
the provider keeps charging a deactivated account. The cancellation takes effect at the
period's end, so a guest's shared item works until the paid period ends, and guests'
notices say so. The subscription row goes at erasure. Leaving never depends on paying
(decision 14).

```python
async def cancel_for_deletion(
    row: SubscriptionRow, client: BillingProviderClient
) -> CancelOutcome | None:
async def resume_after_withdrawal(
    row: SubscriptionRow, client: BillingProviderClient, now: datetime | None = None
) -> ResumeOutcome | None:
```

**`cancel_for_deletion`** (lifted from keksdose's `billing_service.cancel_for_deletion`):
- `None`: nothing to cancel (no `provider_subscription_id`, `canceled`, or already
  `cancel_at_period_end`: the payer cancelled before asking to leave).
- `expired` (Paddle's paused, which Paddle cancels only immediately) cancels at once, so
  nothing is left at Paddle for an account on its way to erasure (§14.16.8); anything else
  at the period's end.
- It never raises (decision 14): a failure is logged at ERROR ("cancel it by hand") and
  answered `"failed"`.
- The app calls it when the deletion is requested, not at erasure.
- **Each outcome goes into the request's audit detail** (§14.16.7): keksdose's
  `provider_cancellation`; kastlan's per flagged company, beside `companies_flagged`;
  Kurvenschmiede's in `erasure_service.request`'s entry.
- Paddle's side: a `past_due` subscription can be cancelled (it stays `past_due` to the
  period's end); a paused one only immediately; a cancellation at the period's end leaves
  it `active` with `scheduled_change.action = cancel`.

**`resume_after_withdrawal`** (§12.37, §14.16.6): the cancellation is undone when the
account comes back.
- **When:** an operator's reactivation that cancels a pending deletion, or a person's own
  withdrawal where an app offers one. Its outcome goes into the reactivation's audit
  detail (`provider_resume`).
- **What:** the port's `remove_scheduled_cancel`, Paddle's `PATCH /subscriptions/{sub}
  {"scheduled_change": null}` (§14.2). The subscription stays `active`, and the row
  follows through the `subscription.updated` event it sends.
- **Only the cancellation the deletion made:** the app calls it only when the request's
  audit detail recorded `"cancelled"` for that row. A payer who had cancelled in the
  portal before asking to leave (the request then answered `None`) isn't re-subscribed.
- **The audit is the check, not the row** (server-kit 0.7.1): `cancel_for_deletion`
  doesn't set `cancel_at_period_end`, only Paddle's `subscription.updated` does, which may
  not have arrived yet and never arrives with billing switched off (the webhook answers
  404). So the provider is asked whenever the subscription hasn't ended, before the
  webhook lands and with billing off too; removing nothing is harmless.
- `None`: nothing to undo — no `provider_subscription_id`, the subscription `canceled` or
  `expired`, its period over at `now` (default: the current time), or Paddle answering
  that it has ended (`subscription_update_when_canceled`,
  `subscription_scheduled_change_invalid_update`). **A subscription that was cancelled at
  once (it was paused) or whose period has ended is not resumed:** Paddle can't reinstate
  a cancelled subscription, and the payer subscribes again through a new checkout.
- It never raises: a failure is logged at ERROR ("remove the scheduled cancellation by
  hand") and answered `"failed"`.

**The seam is module-level, not a FastAPI override** (§14.16.9). Both helpers run in the
service layer, where a request's dependency overrides don't reach. Each app keeps one
module-level function that answers `billing_provider_client(get_settings())` (keksdose's
seam), and its tests replace it with the kit's `FakeBillingProvider`.

### 14.9 Test helpers: `eifi1_server_kit.billing.testing`

- **In the wheel**, because the apps' local CLIs import it at runtime; not re-exported from
  `billing/__init__`; stdlib only, the API fake imports httpx lazily.
- **It replaces four copies of one recipe:** keksdose's and Kurvenschmiede's
  `billing_fixtures.py`, kastlan's hand signing in its `tests/api/test_billing.py`, and
  server-kit's own test helpers.

```python
PaddleStep = Literal["trial", "checkout", "renewal", "cancel_scheduled", "payment_failed", "cancelled"]
PADDLE_STEPS: Mapping[PaddleStep, tuple[str, str]]       # event type, status
PADDLE_STEP_PERIODS: Mapping[PaddleStep, timedelta]      # keksdose's and Kurvenschmiede's _PERIOD

def paddle_event(
    step: PaddleStep, *, payer_ref: str, price_id: str, app: str | None = None,
    at: datetime | None = None, subscription_id: str = "sub_local", customer_id: str = "ctm_local",
    event_id: str | None = None, period_end: datetime | None = None,
) -> dict[str, Any]:
    """One Paddle notification as Paddle sends it: the envelope, the subscription with a
    recurring item and currency_code, custom_data from checkout_custom_data(payer_ref,
    app=app); cancelled → current_billing_period None + canceled_at; cancel_scheduled →
    subscription.updated, active, scheduled_change.action cancel."""

def sign_paddle(raw_body: bytes, secret: str, *, now: float | None = None) -> dict[str, str]:
    """{"Paddle-Signature": "ts=…;h1=…", "Content-Type": "application/json"}."""

def signed_paddle_event(
    step: PaddleStep, *, secret: str, now: float | None = None, **fields: Any
) -> tuple[bytes, dict[str, str]]: ...

def post_signed(
    url: str, raw_body: bytes, headers: Mapping[str, str], *, timeout: float = 30
) -> tuple[int, str]:
    """For the apps' local CLIs: refuses any host but localhost, 127.0.0.1 and ::1."""

class FakeBillingProvider:          # a BillingProviderClient without HTTP
    checkouts: list[dict[str, object]]
    portals: list[dict[str, object]]
    cancels: list[dict[str, object]]
    resumes: list[dict[str, object]]     # remove_scheduled_cancel calls
    def __init__(self, *, fail: bool = False, checkout_url: str = "https://checkout.example/txn_test",
                 portal_url: str = "https://portal.example/ctm_test") -> None: ...

class PaddleApiFake:                # an httpx MockTransport handler answering Paddle's examples
    requests: list[httpx.Request]
    @property
    def transport(self) -> httpx.MockTransport: ...
    @property
    def sent(self) -> dict[str, Any]: ...                 # the last request's JSON
    def fail_with(self, status: int, code: str | None = None) -> None: ...
    def unreachable(self) -> None: ...

PADDLE_API_EXAMPLES: Mapping[str, dict[str, Any]]   # Paddle's documented answers, trimmed
```

- **A `cancel_scheduled` step**, which the kit promotes to `subscription_canceled` and the
  page's "Cancel" (§7) produces; and a fake of the provider's API, in place of each app's
  hand-written one.
- **The cancelled step** sends `current_billing_period: None` and `canceled_at`, as Paddle
  does.
- **`PADDLE_API_EXAMPLES`** are Paddle's documented examples. They are swapped for recorded
  sandbox answers once Marcel's sandbox account exists.
- **Each app keeps only its CLI** (argparse, the payer lookup, the local-only guard,
  `--end-grant`), about 50 lines.

### 14.10 Write locks

The lock kinds and `commit` scopes are §12.36 (decision 26 as amended), with what an app
does about its own controls.

### 14.11 The plan limit as a toast (k46)

Where a refused create has no room for `PlanLimitNotice` (a row's button, a share
target), the same words go in a toast:
- the title "Plan limit reached";
- what to do;
- the figure, when the refusal has one;
- the mode's action: `upgrade` calls the app's navigation to its subscription page (the
  kit has no router); `contact` opens the mailto.

One toast per dimension: a repeat replaces it (the toast id `plan-limit:<dimension>`).

```ts
export interface PlanLimitToastOptions {
  mode: "upgrade" | "contact";
  /** upgrade: the app's navigation to its subscription page. */
  onChoosePlan?: () => void;
  /** contact: support@, opened as planLimitMailto(email, contactSubject(name)). */
  email?: string;
  /** The app's word per dimension: { budgets: "Budgets", scans: "Scans this month" }. */
  dimensionLabels?: Readonly<Record<string, string>>;
  formatValue?: (dimension: string, value: number) => string;
  labels?: LabelOverride<BillingLabels>;
}
/** Shows it and returns the toast id. No hit: the words without a figure. */
export function usePlanLimitToast(options: PlanLimitToastOptions): (hit?: PlanLimitRefusal) => ToastId;
// BillingLabels
/** The toast's figure line: "Budgets: 3 of 3". */
limitUsageLine: (dimension: string, used: string, limit: string) => string;
```

- `billing.limitUsageLine` in the seven languages. It is a key, not
  `${name}: ${usage}`, because French puts a space before the colon.
- No `limit` in the refusal: no figure line. The legacy `plan_budget_limit` reads as
  `budgets` (§12.16).
- An app opts in where it toasts a `plan_limit`.

### 14.12 The operator's plan parts (decision 27)

Every app has the route `POST /admin/…/{id}/plan` (kastlan `/platform/companies/{id}/plan`)
on server-kit's `PlanChangeRequest`/`Response`, and the kit gives the operator's page its
column, its dialog and its result lines (`src/admin/plan-change.tsx`):

```ts
/** The roster or list column: the plan's display name, the standing chip, and a usage line under it. */
export interface PlanColumnUsage {
  used: number;
  limit: number | null;                                 // null: no line
  label: string | PluralForms;                          // the word after a number: "budgets", or { one, other } (0.33.1)
}
export function planColumn<T>(options: PlanColumnOptions<T>): DataTableColumn<T>;     // pure: resolved words
export function usePlanColumn<T>(options: PlanColumnOptions<T>): DataTableColumn<T>;  // the provider's planChange words, memoised
export interface PlanColumnOptions<T> {
  key?: string;                                         // "plan"
  plan: (row: T) => string | null;                      // the code, read case-insensitively (§12.16)
  planName: (code: string) => string;                   // the app's i18n (§3.1)
  status?: (row: T) => SubscriptionStatus | undefined;  // left out or undefined: no chip (billing off)
  usage?: (row: T) => PlanColumnUsage | undefined;     // "1/5", tooltip "1 of 5 budgets"
  filterPlans?: readonly string[];                      // a select filter over these codes
  /** Default: by the plan code. A function: by its value (the catalogue's sort for rank
   *  order). false: not sortable. Client-side only, as every column's sortBy. */
  sortBy?: false | ((row: T) => string | number | null | undefined);
  headerText?: string;                                  // default labels.column
  labels?: Partial<PlanChangeLabels>;                   // resolved words; usePlanColumn reads the provider's
}

/** The grant: AdminActionConfirm at `acknowledge`, a plan Select, and the end of a free
 *  grant. Its confirm is COMMIT_EXCEPT_BILLING, built in (§12.36). */
export interface PlanChangeConfirmProps {
  target: AdminPerson & { email?: string | null };     // a user, or kastlan's company (no address)
  plans: readonly { code: string; name: string }[];
  current: string | null;
  usage?: PlanColumnUsage | ReactNode;   // planColumn's shape, said with its sentence and plural (0.34), or the app's own node
  /** Offer "Free until" (only meaningful while billing is on). */
  grantEnd?: boolean;
  /** comped_until: the END of the picked day in the operator's time zone, as ISO UTC. */
  onConfirm: (change: { plan: string; comped_until?: string }, values: AdminActionConfirmValues) => MaybePromise;
  onClose: (done: boolean) => void;
  describeError?: (error: unknown) => ReactNode | undefined;
  labels?: Partial<PlanChangeLabels>;
}

/** A PlanChangeResponse as the page reads it (server-kit 0.7's, below). */
export interface PlanChangeOutcome {
  previous_plan: string | null;                     // null: the account had no subscription
  plan: string;
  over_limit: boolean;
  limits: Readonly<Record<string, number | null>>;
  usage: Readonly<Record<string, number>>;          // the figures for the over-limit lines
  kept_beta?: boolean;
  comped_until?: string | null;
}
export type PlanChangeTone = "success" | "info" | "warning";
export interface PlanChangeLine { tone: PlanChangeTone; text: string }
/** The lines for a PlanChangeResponse, each with its tone, for the app's toast. */
export function usePlanChangeResult(): (
  res: PlanChangeOutcome,
  planName: (code: string) => string,
  options?: PlanChangeResultOptions,                // dimensionLabels, formatValue
) => PlanChangeLine[];
```

- **The column** shows the display name, the `SubscriptionStatusChip` while billing is on,
  and the usage under it: "1/5", and in the tooltip `planChange.usageOf` with the figures
  in the provider's locale and the label's plural form for the limit ("1 of 1 budget",
  "1 of 5 budgets"; §14.16.21). `usePlanColumn` is the column with the provider's words,
  memoised on its options (pass stable callbacks).
- **`sortBy` sorts on the client only**, as every column's: a `DataTable` with
  `serverPagination` sorts nothing itself; with `onSortsChange` it reports the column's
  `key` (`"plan"`), and the server orders the rows.
- **The confirm** is held while nothing changes; "Free until" shows only with `grantEnd`;
  `comped_until` is sent only when given, as the **end** of the picked day in the
  operator's time zone (keksdose's `endOfDay`): a grant "until 31 January" lasts through
  it. A running beta keeps its end (§6, §12.34, `kept_beta`).
- **The dialog's `usage`** (ui-kit 0.34) takes the column's shape and says it with the
  same sentence and plural rule as the column's tooltip, so the two can't disagree; a
  `null` limit gives no line. A string or node is shown as it is.
- **Built in `COMMIT_EXCEPT_BILLING`** (§14.16.3): an operator's plan change is an admin
  route (§3.3), and the operator's own account or company may be lapsed.
- **The lines and their tones** (§14.16.21): they echo the server's before and after, not
  what was picked. `changed(from, to)`, or `set(to)` with no previous plan: success;
  `keptBeta`: info; else a grant's end, `untilDone(date)`: success; `overLimit`, then one
  `limitUsageLine` (§14.11) per dimension over the new limit, from `usage` and `limits`:
  warning.
- **server-kit's `PlanChangeResponse`** carries what the lines read: `previous_plan:
  PlanCode | None`, `plan`, `limits`, `over_limit`, `usage: dict[str, int]`, `kept_beta:
  bool = False`, and `comped_until: datetime | None`, required though it may be `None`
  (server-kit 0.7.1), so the generated TypeScript marks it required. Build it with
  `PlanChangeResponse.of(previous_plan, plan, usage, *, kept_beta=False,
  comped_until=None)`; `over_limit` comes from `dimensions_over_limit`.
- **Every app answers `kept_beta`** as §6 and §12.34 say (§14.16.22).
- **The server half** (§14.16.23, for all three apps):
  - the roster's rows carry the plan and the status (Kurvenschmiede's `GET /admin/users`,
    kastlan's companies list);
  - the admin reads the plan codes whatever the switch: **`GET /admin/plans`** (kastlan
    `GET /platform/plans`), admins and the operator only, the catalogue's codes with their
    limits and sort and no prices: server-kit's `AdminPlan {code, limits, sort}` and
    `admin_plans_out(catalogue)` (0.7.1), every plan in `sort` order, the retired ones
    included. The dialog's plan list and the column's filter come from it.
    `GET /billing/plans` stays the payer's and answers 404 while billing is off.
- **i18n:** the `planChange` namespace in the seven languages: `column` "Plan", `title`
  and `confirm` "Change plan", `plan` "Plan", `current(plan)` "Current plan: {plan}",
  `keepsItems` "A smaller plan only blocks creating more; nothing is deleted.", `until`
  "Free until", `untilHint` "Leave empty for no end. A running beta keeps its own end.",
  `needsChange` "Pick another plan or an end date.", `changed(from, to)`, `set(to)` "Plan
  set to {to}.", `keptBeta` "The beta keeps its end; only the plan changed.",
  `untilDone(date)`, `overLimit` "Above the new plan's limit: nothing is removed, new
  items are blocked.", `usageOf(used, limit, dimension)`. `usageOf` places the word as
  each language wants it (ui-kit 0.33.1): German heads the line ("Budgets: 1 von 5"),
  since after "von" the word would want a dative plural no app's form carries; Hungarian
  puts it after the figures ("1 / 5 költségvetés"), as `dataTable.filterResults` does.

### 14.13 Lemon Squeezy (decision 25)

- **Deprecated in server-kit 0.7** in the docstrings and the changelog only, with no
  runtime warning: the apps run their tests with `error::DeprecationWarning`.
- **Removed in 0.8:** `BillingProvider.LEMONSQUEEZY`, its event mapper and statuses, its
  signature check and header, and the numeric variant ids `billing_price_ids` took.
  `BillingProvider` is `paddle` alone; a price id is text, and a JSON number is refused.
- **`"lemonsqueezy"` is no provider:** `<APP>_BILLING_PROVIDER=lemonsqueezy` fails at
  start, and a route that types its path parameter as `BillingProvider` answers 422 for
  `/webhooks/lemonsqueezy`; an app whose route checks the provider itself keeps its own
  answer.
- The comparison that chose Paddle (§9) is in the archive.

### 14.14 What each app changes

Moved to [archive/billing-history.md](archive/billing-history.md): round 0.33's per-app
changes and the defects found on the way (adopt-0.33's §3 carried them out). The rules
they implement are §12.36 and §14.2–§14.12.

### 14.15 Open checks

All come before billing goes on, after Marcel's sandbox run; none blocks the code.
- **At signing, with Paddle:** one account may sell three brands on three approved
  domains (decision 18); CHF and the fees (§9); its DPA (§8).
- **With Paddle, in parallel:** hosted checkout on live (sellers@paddle.com), if it is
  still wanted.
- **In the sandbox:**
  - the portal's plan switch (§14.6) — replaced by the kits' switch (§15.2.10), settled
    in the sandbox (§15.6);
  - the pay host end to end: Paddle.js opening the `_ptxn` transaction with the settings
    given to `Paddle.Initialize` (`successUrl`, `locale`), and the hosts its CSP needs;
    Paddle publishes no list (§14.4) — settled in the sandbox (§15.6): `style-src` gains
    both Paddle CDNs;
  - Apple Pay and Google Pay in Paddle's frame under the pay host's
    `Permissions-Policy`, and Apple Pay verification of each pay host — Google Pay
    settled in the sandbox (§15.6); Apple Pay and its verification are live only;
  - what Paddle.js keeps on the pay host (cookies, storage), for the privacy texts
    (§8) — settled in the sandbox (§15.6);
  - which link Paddle's own emails and payment-method updates carry: Paddle uses the
    account's default payment link for them, which is one app's pay host (§14.3) — the
    update link works (§15.6); whether it carries the app's tag is still open;
  - removing a scheduled cancellation and the `subscription.updated` it sends (§14.8) —
    settled in the sandbox (§15.6);
  - whether one person is one Paddle customer across the apps, and what the portal then
    lists (§14.3);
  - recorded answers in place of `PADDLE_API_EXAMPLES` (§14.9).

### 14.16 Settled after the reviews (2026-10-09)

The reviews' items keep their numbers, which the code cites; each points to the § it is
folded into. The reviews' wording is in [archive/billing-history.md](archive/billing-history.md).

**The two amended decisions**
1. **The pay page is a static page on each app's pay host** → decision 19, §14.4.
2. **Lowering a role is allowed under a billing lock** → decision 26, §12.36.

**Locks**
3. **PlanChangeConfirm is exempt from billing, built in** → §12.36, §14.12.
4. **Kurvenschmiede's locks** → §3.3 (a team manager's standing), §12.36; the app's
   changes → archive.

**The portal and the deletion**
5. **The portal's targets** → §14.5.
6. **A reactivation undoes the deletion's cancellation** → §14.8.
7. **Each cancellation's outcome is audited** → §14.8.
8. **keksdose's paused subscriptions** → §14.8.
9. **The provider seam is module-level** → §14.8.

**Notices**
10. **The kit answers per row** → §14.7.
11. **Who is skipped** → §14.7.
12. **The trigger token goes in a header** → §14.7.
13. **kastlan moves every daily job to a token route** → §14.7.
14. **keksdose's Job** → §14.7; its deploy steps → archive.
15. **Kurvenschmiede's notices** → §14.7; its deploy steps → archive.

**Webhooks and settings**
16. **Untagged events are dropped; the new settings in `.env.example`** → §14.2, §14.3.
17. **Duplicate events** → §5.
18. **Extras** → §14.1.

**The frontend parts**
19. **`useCheckoutProcessing`** → §14.4.
20. **The pay page's locale** → §14.4.
21. **The plan change's result** → §14.12.
22. **Kurvenschmiede's `change_plan` keeps a running beta** → §6, §14.12.
23. **The roster's server half** → §14.12.
24. **Hand-written `BillingOverview` types** → §14.5.

**Per app, re-stated**
25. **kastlan's deploy and tests** → archive.
26. **The CSP notes** → §14.4.
27. **Line references corrected** → archive.
28. **Confirmed as written** → archive.

**Corrected after the adoptions** (ui-kit 0.33.1, server-kit 0.7.1)
29. **`billing_app` keeps its pattern in the app's subclass** → §14.2.
30. **The pay host's `PAY_HOST`** → §14.4.
31. **`payPageUrl` and `paddleLocale` take an undefined locale** → §14.4.

### 14.17 A grant clears the trial's end (round 0.34, 2026-10-12)

**A manual grant clears `trial_ends_at`** (§3.2, §6). Good standing reads `comped_until`
for a `comped` row (§3.3), so a trial date left behind decides nothing there; it only feeds
what reads it without the status: a "trial ends in 7 days" banner, a trial-end notice
(§14.7). A beta kept by a plan change before launch (§6, §12.34) is not a manual grant and
keeps its own dates. The row is the app's, so the rule lives in each app's plan change
(keksdose's `change_plan`, Kurvenschmiede's `change_plan`, kastlan's
`billing_service.set_plan`).

## 15. Round 0.39: pay pages that serve any app, a shared plan switch and customer

Settled 2026-10-14 (Marcel, in the ui-kit session), after the three app reviews and a
Paddle explainer (§15.7). server-kit 0.12 and ui-kit 0.39 build it; P1 and P5 wait for
Marcel's sandbox run (§15.6). Paths as in §14. It amends decision 19 (any pay page serves
any app's transaction), settles §14.6's open point and replaces decision 21's "through
the portal", and closes §14.3's open point on the customer.

### 15.1 Where each one stands (2026-10-14)

**The pay host (§14.4).** No pay host is live: billing is off everywhere.
- **keksdose** builds the kit's page into its web image (`deploy/gcp/Dockerfile.web:38-44`,
  `--app-name Keksdose` and URLs from `PAY_APP_URL`; the same in
  `deploy/Dockerfile.web:28-34`) and serves it in a last site block
  (`deploy/gcp/Caddyfile.cloudrun:257`, `deploy/Caddyfile:156`) with §14.4's headers.
  `_PAY_HOST: ''` (`deploy/gcp/cloudbuild.yaml:145`), `PAY_APP_URL=${_APP_BASE_URL}`
  (`:336`); the dev build the same (`cloudbuild.dev.yaml:93-97`, `:182-184`, `:336-338`).
  The steps are in `deploy/gcp/README.md:407-437`. Its tests read the pay block
  (`csp-inline-script.test.ts:30`, `:82`; `plausible-wiring.test.ts:30-36` skips it).
- **Kurvenschmiede** the same: `deploy/gcp/Dockerfile.web:39-43`,
  `deploy/Dockerfile.web:31-35`, `deploy/gcp/Caddyfile.cloudrun:121`, `deploy/Caddyfile:75`,
  compose `deploy/docker-compose.yml:95-106`, `cloudbuild.yaml:40-46`, `:82`; a test pins
  the bin's flags (`backend/tests/unit/test_deploy_files.py:123-142`); the steps in
  `deploy/gcp/README.md:350-400` and `docs/configuration.md:124-127`.
- **kastlan has no pay host.** Its web image (`deploy/gcp/Dockerfile.web`), Caddyfile and
  `cloudbuild.yaml` name no pay block; `.env.example:57-58` and
  `deploy/gcp/.env.gcp.example:32-33` already name `https://pay.kastlan.app/` (commented)
  and the hosted checkout.
- **The kit:** the page reads one app's `pay-config.json` (`src/billing/pay-page.ts:175-187`:
  `returnUrl`, `appName`, `termsUrl`, `privacyUrl`) and hands Paddle.js a `successUrl`
  built from it (`pay-page/pay.ts:163-176`); the bin takes one app's flags
  (`pay-page/cli.ts:104-105`). A transaction of another app opened on this page would name
  the wrong app and return to it.

**Plan changes (§14.6).** All three pages send every pick in `PlanPicker` to
`POST /billing/checkout`, which answers 409 `billing_already_subscribed` while a
subscription runs: keksdose `frontend/src/features/billing/subscription-cards.tsx:211-218`
(the 409's words `:57`), kastlan `features/billing/components/subscription-section.tsx:143-160`
(`billing-refusals.ts:18`), Kurvenschmiede `features/billing/subscription-settings.tsx:151-158`
(`shared/api/client.ts:255`). The server refuses in each checkout (keksdose
`adapters/api/billing_router.py:123`, its docstring `:107-110` sends plan changes to the
portal; kastlan `domain/services/billing_service.py:226`; server-kit
`billing/provider.py:253`). Paddle's port has no plan change (`billing/provider.py:93-137`).
A `subscription.updated` snapshot sets `plan_code` from the price, unless a grant holds
(`billing/webhooks.py:121-169`, `:244-252`); no row keeps the price itself.

**The customer (§14.3).** No app looks a customer up. The checkout passes the row's
`provider_customer_id` once a webhook has set it (keksdose `billing_router.py:128`, kastlan
`billing_service.py:230`, Kurvenschmiede `adapters/api/billing_router.py:119`); before that,
Paddle's checkout asks for an e-mail. Each app's webhook lookup goes payer reference, then
subscription id, then **customer id**: keksdose `domain/services/billing_service.py:432-438`
(in `payer_row_for`, `:420-439`), Kurvenschmiede `domain/services/billing_service.py:429-450`,
kastlan `domain/services/billing_service.py:313-330`. The portal opens on the row's
customer (keksdose `billing_router.py:134-160`, the call `:151-155`; Kurvenschmiede
`billing_router.py:143-147`; kastlan `billing_service.py:234-241`).

### 15.2 Decisions

All settled 2026-10-14 (Marcel; §15.7). The numbers are the ones the reviews cite.

1. **P2: each app keeps its own pay page, and every pay page serves any app.** The hosts
   stay `pay.keksdose.app`, `pay.kastlan.app` and `pay.kurvenschmiede.app` (decision 19
   stands; "a neutral shared page" meant the kit's one page). Paddle's single default
   payment link is met by the page, not by one host: every pay page reads the app from
   the transaction's custom data, not from its domain, and takes that app's name, Terms,
   Privacy and return URL from an app map in its `pay-config.json` (6). **The account's
   default payment link is `pay.keksdose.app`** ("That is acceptable"). The neutral host
   and an `Eifi1/pay` repo are dropped.
2. **P3: the plan switch is built once in the kits** (server-kit's preview and switch
   routes' parts, ui-kit's `PlanSwitchConfirm`) and used by all three, not Paddle's portal.
3. **P4: one Paddle customer per e-mail address across the apps.** The portal's overview
   listing all of a person's subscriptions is accepted; no app reads or touches another
   app's subscription.
4. **Hosting: as today.** Each app deploys its own pay host from its own web image (Caddy
   on Cloud Run, §14.4's site block, `PAY_HOST`, the one-time steps), built from the kit's
   page. kastlan builds its pay host first, in its 0.39 adoption, as keksdose's and
   Kurvenschmiede's are (§14.4, adopt-0.33.md §4).
5. **How the page learns the app: from the transaction's custom data.** Paddle.js gets no
   `successUrl`. On `checkout.loaded` the page reads `data.custom_data.app` (§14.3's tag,
   on every transaction an app creates) and looks it up in the map; on
   `checkout.completed` it goes to that app's `checkoutReturnUrl(returnUrl)`. No query
   parameter names the app: Paddle's own links carry only `_ptxn`.
   - Until the checkout loads, the page shows the host's own app (the map's `app`), as
     today.
   - A missing or unknown tag (a payment-method update from a Paddle e-mail whose
     transaction carries none; §15.6 step 15): no app name and no Back; the host's Terms
     and Privacy stay; once paid, the new line `payDone` ("Payment complete. You can
     close this page.").
   - A return URL only ever comes from the map, so no link can redirect a buyer.
6. **The app map is the kit's, written into `pay-config.json` by the bin.**
   ```json
   {
     "token": "live_…",
     "environment": "live",
     "app": "keksdose",
     "apps": {
       "keksdose": { "name": "Keksdose",
                     "returnUrl": "https://keksdose.app/settings/subscription",
                     "termsUrl": "https://keksdose.app/terms",
                     "privacyUrl": "https://keksdose.app/privacy" },
       "kastlan": { "name": "kastlan", "returnUrl": "https://kastlan.app/admin/billing",
                    "…": "…" },
       "kurvenschmiede": { "name": "Kurvenschmiede",
                           "returnUrl": "https://kurvenschmiede.app/settings/subscription",
                           "…": "…" }
     }
   }
   ```
   - One source: ui-kit's `PAY_PAGE_APPS` (the three apps' names and base URLs, each
     with `/terms` and `/privacy`, the return path `/settings/subscription` or
     `/admin/billing`), so the three hosts can't drift. A new app or a moved page is a
     kit release.
   - `app` is the host's own app. `--app-url` replaces only its base URL (a local stack,
     a dev deploy: today's `PAY_APP_URL`); `--apps <file>` merges a map over the kit's
     (several apps run locally against one sandbox).
   - The keys are the apps' `billing_app` tags and match its pattern
     (`^[a-z][a-z0-9_-]{0,63}$`).
   - **No per-app theme:** Paddle's checkout has only `light` and `dark`; the page
     follows `prefers-color-scheme` as today. **One client-side token per host** (§14.4).
7. **Headers: §14.4's, unchanged, on each host.** Nothing an app ships changes: the pay
   blocks, their tests and the app CSPs stay. The sandbox settles the exact Paddle hosts
   (P1, §14.15).
8. **Apple Pay: set up, not device-verified.** Each host is verified in Paddle's dashboard
   (Website approval → Apple Pay verification → "Verify"), which needs no device; the
   page keeps serving Paddle's `.well-known` file. There is no Apple device to test on:
   a later one-off test on a borrowed iPhone, or the first real Apple Pay payment in
   Paddle's dashboard. A failure only hides the Apple Pay button; cards and Google Pay
   still work.
9. **Paddle's own e-mails** come from Paddle in the account's business name, list the
   product and price names, and link payment-method updates to the default payment link,
   `pay.keksdose.app`. Every Paddle product name starts with the app's brand ("Keksdose
   Plus"), so a receipt says which app it is for; the page names the app from the
   transaction (5). What the e-mails show is checked in the sandbox (§15.6).
10. **The plan switch** (server-kit §15.3, ui-kit §15.4).
    - **Immediate, prorated, with a credit on a downgrade:** `proration_billing_mode:
      "prorated_immediately"` both ways. An upgrade charges the difference now; a
      downgrade credits the unused part to the customer's balance, which Paddle takes off
      the next charges. `on_payment_failure: "prevent_change"`: a declined upgrade changes
      nothing. No switch "at the next period": Paddle's `scheduled_change` holds only
      pause, cancel and resume.
    - **Interval and currency.** Monthly ↔ yearly is a switch like any other (another
      price). The currency stays the subscription's; another currency is a new checkout
      after the old one ends.
    - **Who switches: whoever may check out.** keksdose the user; any kastlan company
      ADMIN (`billing_router.py:35`); a Kurvenschmiede MEMBER or ADMIN. A kastlan admin
      who isn't the buyer charges the buyer's card at once on an upgrade, as a renewal
      does; the confirm shows the figure. No buyer-only rule for the switch.
    - **Plans no longer sold.** No switch TO one: 422 `billing_plan_not_sold`. A payer ON
      one keeps it until switching away, to any sold plan. `PlanPicker` never offers it:
      `GET /billing/plans` lists sold plans only (keksdose `billing_router.py:92` already),
      so the 422 is a guard, not a path.
    - **A downgrade with usage over the new limit is allowed** (§3.4: a limit gates
      creation only). The confirm shows the over-limit lines before the payer agrees, as
      `PlanChangeConfirm` does for the operator (§14.12).
    - **The confirm shows Paddle's preview** (`PATCH /subscriptions/{id}/preview`): what
      is charged or credited now and the next charge, so the payer agrees to a figure.
    - **The routes:** `POST /billing/plan/preview {plan, interval}` and
      `POST /billing/plan {plan, interval}`, both answering `PlanSwitchPreview`. Like the
      checkout: the payer only, 404 `billing_disabled` while billing is off, behind the
      app's demo guard (in its route walk). Refusals: 409 `billing_not_subscribed` (no
      running provider subscription: the page offers the checkout), 422
      `billing_plan_not_sold`, 409 `billing_plan_unchanged` (the price it pays now), 502
      `billing_provider_unavailable`. The row follows through `subscription.updated`.
    - **The row keeps the price it pays** (`provider_price_id`, written by every snapshot
      that carries one, a grant's included), and the overview says it as `paid {plan,
      interval, currency}`. So the switch knows the current price and currency without
      asking Paddle, and a switch under a grant (whose row keeps the grant's plan, status
      and source, §12.11) still shows that it landed.
    - **The page polls as after a checkout, under the same storage key.**
      `checkoutFingerprint` includes `paid`'s plan and interval, so a switch (which keeps
      `active`, and under a grant the plan too) changes the fingerprint; one key serves
      checkout and switch (Kurvenschmiede keeps `kurvenschmiede.billingCheckout`).
    - **The UI:** `PlanPicker` stays. While a provider subscription runs, the app sends a
      pick to the preview and opens the kit's `PlanSwitchConfirm`; otherwise to the
      checkout. Since server-kit 0.13 / ui-kit 0.40 the overview says which:
      `switching: bool` (default false), computed by the server with the same rule as
      the two 409s (`billing_already_subscribed`, `billing_not_subscribed`) — a provider
      subscription id, not set to cancel, and a provider row `active`, `trialing` or
      `past_due`, or a purchase under a grant whose period still runs. True: the pick
      opens `PlanSwitchConfirm`; false: the checkout. Apps read it and drop their client
      mirrors of the rule (kastlan's and Kurvenschmiede's); the TS type has it optional
      for older servers (absent = false). A 409 either way still sends the payer to the
      other path, for an overview read before the state moved. `PlanPicker` takes no
      `switching` prop: the kit doesn't choose, the app's `onChoose` does. The confirm never takes the write lock (`COMMIT_EXCEPT_BILLING` built in:
      a read-only payer may change plan; keksdose's demo-budget lock never applies).
    - **The words.** `billing_already_subscribed`'s words stop pointing at the portal
      ("You already have a subscription. Change your plan above."), and so does keksdose's
      409 docstring (`billing_router.py:107-110`).
11. **The shared customer.**
    - **Finding or creating it:** the row's `provider_customer_id` when it has one; else
      `customer_for(email)` with the payer's sign-in e-mail (kastlan: the admin who checks
      out): `GET /customers?email=`, else `POST /customers {email}`; the transaction
      carries that `customer_id`. The id isn't written to the row at checkout:
      `at_provider` keeps meaning "the webhook linked this payer" (§14.5).
    - **Changes of address or e-mail.** Apps never write to the customer; name, e-mail
      and address are changed in Paddle's checkout or portal. An app's own e-mail change
      doesn't reach Paddle; a later first checkout under the new e-mail may find a second
      customer, which breaks nothing (rows go by payer reference and subscription id).
    - **An app reads only its own subscription**, by the id its own tagged events gave
      it. The port gains no list call for a customer's subscriptions or transactions.
    - **The webhook lookup drops the customer-id fallback** in all three apps (§15.1): with
      one customer per person it lands one payer's event on another's row (kastlan: one
      person paying for two companies). Payer reference, then subscription id. An event
      with neither (a payment-method update without the subscription id; §15.6 step 15)
      lands on no row: logged, nothing written, which is the right failure.
    - **Erasure.** An app never archives or changes the shared customer. It cancels its
      own subscription at the request (§14.8) and drops its row at erasure. Paddle is an
      independent controller (§8) and keeps its records under its own retention.
    - **kastlan's portal: only the buying admin opens the overview.** The checkout's
      custom data carries the buying admin's user id (`buyer: "user:<id>"`), and kastlan's
      webhook stores it on the row (`provider_payer_user_id`). The portal's `overview` (which
      lists that person's other subscriptions) opens only for that user id; every other
      company admin gets the subscription's `cancel` and `payment_method` targets, and
      sees "ask <buyer>" for the overview. If the sandbox shows that those links reach the
      overview (§15.6 step 14), only the buyer gets any portal link. When the buyer leaves
      the company or is erased, nobody opens the overview; cancel and payment method still
      work; Paddle can't move a subscription to another customer, so the company buys
      anew after the period ends.
    - **The privacy texts** are written before billing goes live (none names Paddle yet),
      from keksdose's draft: "Payments are handled by Paddle (Paddle.com Market Ltd), the
      merchant of record, on a payment page shared by the apps of the same seller. If you
      pay for more than one of them with the same e-mail address, Paddle keeps one customer
      record for you, and its customer portal lists all your subscriptions. <App> never
      sees your card; it receives your subscription's status and plan." Each app adds what
      Paddle.js stores on the pay host (§15.6 step 11) and that a person asks Paddle for
      Paddle's records.
12. **Nothing moves at Paddle:** none is live. keksdose and Kurvenschmiede keep their pay
    blocks and change only the bin's call; kastlan builds its pay host. Every app sets
    `<APP>_BILLING_CHECKOUT_PAGE_URL=https://pay.<app domain>/`, as today. kastlan's hosted
    checkout setting stays (config only, a sandbox fallback).
13. **P5.** `PADDLE_API_EXAMPLES` are replaced by recorded sandbox answers, and
    `billing.testing` pins removing a scheduled cancellation (§14.8) with the recorded
    `subscription.updated`.

### 15.3 server-kit 0.12

Beside the translation-review change already on `feat/0.12.0` (breaking). Size **M**
(~300 code, ~500 test lines).
- **Port** (`billing/provider.py`): `BillingProviderClient` gains
  `preview_plan_change(*, subscription_id, price_id) -> ProviderSwitchPreview`,
  `change_plan(*, subscription_id, price_id) -> ProviderSwitchPreview` and
  `customer_for(*, email) -> str`; `NoProviderClient` refuses all three (503).
  `checkout_url(…, customer_email: str | None = None)`: with no `customer_id`, the client
  resolves one through `customer_for`.
- **Paddle** (`billing/paddle.py`): `PATCH /subscriptions/{id}/preview` and
  `PATCH /subscriptions/{id}` with `{items: [{price_id, quantity: 1}],
  proration_billing_mode: "prorated_immediately", on_payment_failure: "prevent_change"}`;
  `GET /customers?email=` then `POST /customers`. The key's permissions gain customer read
  and write.
- **Rules** (`billing/provider.py`): `require_plan_switch(row, now)` (409
  `billing_not_subscribed`, the inverse of `require_new_checkout`);
  `switch_price(catalogue, row, request, settings, *, sold=None) -> str` (the price for the
  plan and interval in the paid currency; 422 `billing_plan_not_sold` for a plan outside
  `sold` or without that price, 409 `billing_plan_unchanged` for the row's
  `provider_price_id`).
- **The row:** `SubscriptionRow` gains `provider_price_id: str | None` (breaking: each
  app adds the column); `row_changes` sets it from `plan_price_id` on every snapshot,
  grant or not.
- **Custom data** (`billing/events.py`): `checkout_custom_data(payer_ref, *, app=None,
  buyer: str | None = None)`, `BUYER_KEY = "buyer"` (kastlan's buying admin).
- **Shapes** (`billing/schemas.py`): `PlanSwitchRequest {plan, interval}`
  (`extra="forbid"`); `ProviderSwitchPreview {currency, now_minor, next_minor,
  next_billed_at}` (`now_minor` negative for a credit); `PlanSwitchPreview` = that plus
  `{plan, interval, over_limit: list[str], limits, usage}`, built by
  `plan_switch_preview(answer, plan, usage)`; `PaidPrice {plan, interval, currency}` and
  `BillingOverview.paid: PaidPrice | None`, from `from_row(…, price_ref=
  settings.billing_price_ref)`.
- **Errors:** `billing_not_subscribed` (409), `billing_plan_unchanged` (409), in
  `CONTRACT_ERRORS`; `billing_already_subscribed`'s text drops the portal.
- **Testing** (`billing/testing.py`): `FakeBillingProvider.previews`, `.switches`,
  `.customers`; `PaddleApiFake` answers the four new calls; a step for a switch's
  `subscription.updated`; recorded sandbox answers in `PADDLE_API_EXAMPLES` and the
  scheduled-cancel removal pinned (P5, after the sandbox run).
- **Tests:** `tests/billing/test_provider.py` (the rules, both refusals, `sold`),
  `test_paddle.py` (bodies, the customer lookup and create, errors), `test_dispatch.py`
  (`provider_price_id` under a grant), `test_schemas.py` (`paid`, the preview),
  `test_events.py` (`buyer`), `test_testing.py` (the fakes).
- **Docs:** the module docstring's routes; README's billing section; the payer lookup
  without the customer id.

### 15.4 ui-kit 0.39

Beside what `feat/0.39.0` already has. Size **M**.
- **Pay page** (breaking for the bin):
  - `PayPageConfig {token, environment, app, apps: Record<string, PayPageApp>}`,
    `PayPageApp {name, returnUrl, termsUrl, privacyUrl}`; `PAY_PAGE_APPS` (§15.2.6);
    `payPageConfigProblems` checks the tags, each app's URLs and name, and that `app` is
    in `apps`. `paySuccessUrl` goes.
  - `pay.ts`: `PaddleEvent` gains `data?.custom_data`; Initialize without `successUrl`;
    `checkout.loaded` frames the tagged app; `checkout.completed` navigates to its
    return (`PayPageEnvironment.navigate`), or shows the new state `done` (`payDone`);
    the host's app until then.
  - The bin: `eifi1-pay-page --out <dir> [--token … --environment …] --app <tag>
    [--app-url <https://…>] [--apps <file>]`; the old `--return-url`, `--app-name`,
    `--terms-url`, `--privacy-url` are refused with a line naming the new flags.
  - The line `billing.payDone`, seven languages.
- **Plan switch** (`src/billing/plan-switch.tsx`): `PlanSwitchConfirm {open,
  onOpenChange, from: {plan, interval}, to: {plan, interval}, preview?: PlanSwitchPreview,
  pending?, planName?, dimensionLabels?, formatLimit?, onConfirm, locale?, labels?}`:
  from → to, the preview's figures through `formatMoney` ("Charged now" or "Credited",
  "Next charge on {date}"), the over-limit lines with `planChange.usageOf` and
  `limitUsageLine`, Confirm; a spinner while `preview` is undefined;
  `COMMIT_EXCEPT_BILLING` built in. The types `PlanSwitchRequest`, `PlanSwitchPreview`,
  `PaidPrice`, `BillingOverview.paid`. `BillingErrorCode` gains `billing_not_subscribed`
  and `billing_plan_unchanged`, with words (`notSubscribed`, `planUnchanged`);
  `billing.switch*` labels (title, charged now, credited, next charge, confirm) in seven
  languages; `alreadySubscribed` reworded (§15.2.10).
- **Processing:** `CheckoutOverview` gains `paid?`; `checkoutFingerprint` adds its plan
  and interval (§15.2.10). One storage key for both.
- **Tests:** `pay-page.test.ts` (another app's tag, an unknown tag, no tag, the return),
  `pay-page-cli.test.ts` (flags, the map, the refused old flags), `plan-switch.test.tsx`
  (figures, credit, over-limit, no write lock), `checkout-processing.test.tsx` (a switch
  under a grant lands), `billing-errors.test.ts` (the two codes); the i18n review keys.
- **Docs:** this section; adopt-0.39's billing part; §14.4's pay-config shape points here.

### 15.5 Per app

- **All three:** adopt both kits; the column `provider_price_id` (a migration); the plan
  routes (preview and switch) on the kit's shapes, behind the demo guard and the billing
  switch; `GET /billing/plans` lists sold plans only; `PlanPicker`'s pick goes to the
  switch while a provider subscription runs, else to the checkout; the checkout passes
  the payer's sign-in e-mail; drop the customer-id fallback from the payer lookup; the
  words `billing_not_subscribed` and `billing_plan_unchanged` in the app's refusal map;
  the privacy text (§15.2.11). **S–M each.**
- **keksdose:** the bin's call in both `Dockerfile.web`s (`--app keksdose --app-url
  "$PAY_APP_URL"`); `deploy/gcp/README.md:407-437` says the host serves every app and is
  the default payment link; the switch in `subscription-cards.tsx:211-218`; the 409
  docstring (`billing_router.py:107-110`, and `openapi-schema.d.ts`);
  `billing_service.py:432-438`. The pay block, its tests and `billing_router.py:103` stay.
- **Kurvenschmiede:** the bin's call in both `Dockerfile.web`s (`--app kurvenschmiede
  --app-url "$PAY_APP_URL"`) and the flags `test_deploy_files.py:123-142` pins; the docs'
  flags (`deploy/gcp/README.md:357`, `docs/configuration.md:124-127`); the switch in
  `subscription-settings.tsx`; `billing_service.py:429-450`. The pay block, compose and
  `cloudbuild.yaml` stay.
- **kastlan:** builds its pay host as §14.4 and adopt-0.33.md §4 say (the bin in
  `deploy/gcp/Dockerfile.web` with `--app kastlan`, the site block in
  `Caddyfile.cloudrun`, `_PAY_HOST`, the token and environment in `cloudbuild.yaml`, a
  test pinning the block's order, the README's steps); `.env.example:57` and
  `deploy/gcp/.env.gcp.example:32-33` stay; the switch in `subscription-section.tsx`
  (any company admin); `buyer` in the checkout's custom data and
  `provider_payer_user_id` (a migration); the portal by user id (§15.2.11);
  `billing_service.py:313-330`; the docstring at `billing_service.py:220`.

### 15.6 Marcel's sandbox run (P1, P5)

Before:
1. Create the Paddle sandbox account (sandbox-vendors.paddle.com) under the business name.
2. Catalog → Products: one product per app plan, named with the app's brand; prices in
   CHF and EUR, monthly and yearly (§13). Copy the price ids.
3. Developer tools → Authentication: one API key per app (`pdl_sdbx_apikey_…`) with
   transaction write, customer-portal-session write, subscription write and customer
   read/write; one client-side token (`test_…`) per pay host.
4. Developer tools → Notifications: one destination per app (subscription and
   transaction events) to the app's `/webhooks/paddle` through a tunnel to the local
   backend; copy each secret.
5. Each app's local `.env`: `<APP>_BILLING_ENABLED=true`, the API key, the webhook
   secret, the price ids. **In the sandbox leave `<APP>_BILLING_CHECKOUT_PAGE_URL`
   unset** (note 1 below): the transaction then opens on the default payment link.
6. Run the pay pages: each app's on a localhost port behind a tunnel for the first runs
   (Paddle refuses `localhost` as a URL), or its pay host once deployed. Checkout →
   Checkout configuration: make keksdose's page the default payment link, and switch on
   Google Pay (note 2). Website approval is live only (note 6).
7. Apple Pay verification of each host: live only (note 6).

Runs (note what you see; the kit's agent records the answers). keksdose ran them alone on
2026-10-16; a run marked **settled in the sandbox** is settled for every app, since the
pay page, the routes and the webhooks are the kits'. kastlan and Kurvenschmiede repeat 8
on their own setup when they reach it.
8. In each app, a checkout with Paddle's test card: the overlay opens; the webhook lands
   (`?checkout=done`, then active); the footer names the right app. — **Settled in the
   sandbox** (keksdose, 2026-10-16): the frame `sandbox-buy.paddle.com/checkout/che_…`
   (wide overlay, multi-page); step 1 asks for the e-mail and the country only, the card
   comes after "Continue" (note 5); back in the app "payment processing" showed and
   turned active by itself (`useCheckoutProcessing` and the webhook);
   `subscription.created` and `.activated` applied in the same second, no `transaction.*`
   recorded; the row got its subscription id, `provider_price_id` and period end, and
   under Marcel's admin grant the grant's plan, status and source stayed (§12.11). The
   pay page's footer named Keksdose; Paddle's names the seller ("Your data will be shared
   with <the account's name> for product fulfilment"). Declined card
   (4000 0000 0000 0002): Paddle's own words in the app's locale, nothing charged, the
   transaction stays unpaid.
9. Another app's transaction on keksdose's page (open a kastlan checkout's `_ptxn` on
   `pay.keksdose.app`): `checkout.loaded` carries the custom data; the page names kastlan
   and returns to it. — Open: waits for kastlan or Kurvenschmiede in the sandbox.
10. Headers, in any browser (DevTools → Network → the document): the CSP and
    `Permissions-Policy` arrive; the console shows no CSP violation; list the Paddle hosts
    the page loads from. — **Settled in the sandbox** (keksdose, 2026-10-16): one
    violation, Paddle.js's overlay stylesheet from `sandbox-cdn.paddle.com` → `style-src`
    gains both Paddle CDNs (§14.4, ui-kit 0.40). The hosts of the whole flow: the pay
    host, `cdn.paddle.com`, `sandbox-cdn.paddle.com`, `sandbox-buy.paddle.com`,
    `sandbox-checkout-service.paddle.com`, `sandbox-checkout-analytics.paddle.com`; inside
    Paddle's frame (its own CSP) `global.localizecdn.com`, `fonts.googleapis.com`,
    `fonts.gstatic.com`, `o522631.ingest.sentry.io`, `js.stripe.com`, `m.stripe.network`,
    `m.stripe.com`.
11. Application tab: what Paddle.js stores (for the privacy texts). — **Settled in the
    sandbox** (keksdose, 2026-10-16): the pay page's localStorage stays empty; cookies
    `__cf_bm` on `.paddle.com` (Cloudflare's bot management) and `m` on `m.stripe.com`
    (Stripe's fraud signal), both from Paddle's frame.
12. Google Pay in Chrome on Windows or Android: the button shows and a test payment goes
    through. Apple Pay: set up, not device-verified (§15.2.8). — **Settled in the
    sandbox** (keksdose, 2026-10-16) for Google Pay once switched on (note 2): the button
    shows on the tunnelled pay page without any domain approval. Apple Pay: live only
    (note 6).
13. The same e-mail in two apps: one `ctm_` (expected) or two? Open the portal from one
    app: does the overview list both subscriptions? — Open: waits for kastlan or
    Kurvenschmiede in the sandbox. (`customer_for` created keksdose's sandbox customer,
    and the portal opened from the app on the webhook-linked customer shows the right
    subscription and invoice.)
14. kastlan: the per-subscription `cancel` and `payment_method` links: can they navigate
    to the overview? (If yes, only the buyer gets any portal link, §15.2.11.) — Open:
    kastlan's run.
15. Paddle's e-mails (receipt, payment-method update): which name, which products, which
    link. Open the update link: does the page get the app's tag, and does the
    payment-method-update transaction carry the subscription id? — **Settled in the
    sandbox** (keksdose, 2026-10-16) for the cancellation mail and the update link:
    "[TEST]-Your subscription for <seller> will be canceled" from
    `Paddle <help@paddle.com>`, shown as "<seller> via paddle.com" (the seller's business
    name — live, the name Marcel registers); the line "Keksdose Plus · CHF 89.00 · Amount
    every year" (brand-first product names read well); dates in UTC only; Paddle.com
    Market Ltd in the footer; no pay-page link in this mail. The payment-method update
    link works and took a card. Still open: whether the update page gets the app's tag,
    and whether that transaction carries the subscription id.
16. The portal: "Cancel" at the period's end, then the app's reactivation removing it
    (§14.8): the `subscription.updated` arrives (P5). — **Settled in the sandbox**
    (keksdose, 2026-10-16), from the portal and from the app (`SubscriptionActions` →
    the portal's cancel target, then reactivate): "scheduled to be canceled on
    <period end>"; `subscription.updated` set `cancel_at_period_end`, and removing the
    cancellation sent `subscription.updated` back to false (P5 records them as
    `billing.testing` examples).
17. Plan switch (after server-kit 0.12): an upgrade and a downgrade, monthly to yearly,
    the preview's figures against the charge and the credit; a declined card on an
    upgrade changes nothing; under a grant, `paid` moves and the page stops processing.
    — **Settled in the sandbox** (keksdose, 2026-10-16), but for the declined switch
    (note 3): downgrade Plus CHF yearly (89.00) → Standard CHF monthly: a
    `subscription_update` transaction, completed, total −84.00, nothing charged, the
    credit on the customer; upgrade back to Plus yearly: total 84.01, 83.41 taken from
    the credit, 0.60 charged to the card. Prorated both ways, the credit used first. Each
    `subscription.updated` moved `provider_price_id` (so `paid`) and
    `current_period_end` in the same second. Paddle's portal lists the switches as
    "Renewal" (note 4).

Notes from the run (2026-10-16), for every app's sandbox and deploy notes:
1. **The default payment link in the sandbox.** A transaction that names its own
   checkout page (`checkout.url`, set by `<APP>_BILLING_CHECKOUT_PAGE_URL`) is refused,
   400 `transaction_checkout_url_domain_is_not_approved`, unless Paddle approved the
   domain — and the sandbox has no approval UI (Checkout configuration offers only the
   default payment link). So in the sandbox leave the setting unset: the transaction
   opens on the default payment link, which is a pay page (keksdose's) serving every
   app (§15.2). Live, set it once the pay host's domain passes Paddle's website review
   (§14.4, step 3). server-kit 0.13 answers the refusal as 503 `billing_not_configured`,
   the Paddle code in the log, no longer 502 `billing_provider_unavailable`.
2. **Google Pay is off by default:** Checkout → Checkout configuration, switch it on. It
   needs no domain approval.
3. **A declined plan switch can't be arranged in the sandbox:** Paddle won't save the
   decline card (4000 0000 0000 0002) as the subscription's payment method, so
   `on_payment_failure: prevent_change` is never reached there. The kits' tests cover it
   (server-kit's `PaddleApiFake`; the refusal's words in ui-kit).
4. **Paddle's portal lists a plan switch as "Renewal"** ("Renewal for Keksdose Standard/
   Plus + 1 more", CHF 0.00 or the charged difference), beside "Purchase of …" for the
   first checkout. An app's help text says so.
5. **Checkout step 1 is the e-mail and the country only;** the card fields come after
   "Continue". Marcel read the first step as "nothing to put in" — a line in an app's
   help or on its subscription page can say what follows.
6. **Domain approval and Apple Pay are live only:** the sandbox has neither the website
   approval nor the Apple Pay verification; both are done on the real pay host.

### 15.7 Reviews and decisions

- **Marcel, 2026-10-14, on the Paddle candidates** (round-034 candidates, "Billing"): P2
  "There shall be a neutral shared payment page."; P3 and P4 "Also shared for P3 and p4."
  P1 and P5 wait for his sandbox run. The DRAFT read P2 as one neutral host.
- **The reviews, 2026-10-14:**
  - **kastlan** (kastlan-d1, at origin/main `80eb418` = v0.13.6): the portal by the
    buyer's user id, not e-mail, and the sandbox question on per-subscription links;
    keep the hosted-checkout setting; any company admin switches, no buyer-only rule;
    the customer-id fallback is a bug with a shared customer; `.env.gcp.example:32-33`.
  - **keksdose** (keksdose-cb, at `a30ff0f8`, feat/kit-0.38; full text in its
    `.feedback-live/kit039-review.md`): more readers of the pay block (moot now: the block
    stays); no switch to an unsold plan, and a payer on one may switch away; the fallback
    is unused; a payment-method-update transaction must carry the subscription id; the
    409 docstring and `alreadySubscribed` stop pointing at the portal; the privacy text
    from scratch; `PlanSwitchConfirm` takes no write lock; two cites corrected.
  - **Kurvenschmiede** (kurvenschmiede-1b, at main `7366ed6` = v0.2.17): a removal list
    (moot now: the block stays); one storage key if the fingerprint sees the plan and
    interval; the fallback drop passes its 1,377 tests; the two new words; the routes
    behind the demo guard and `billing_disabled`; MEMBER and ADMIN pay; no write lock;
    the checkout passes the sign-in e-mail.
- **Marcel's decisions, 2026-10-14, after the reviews and a Paddle explainer:**
  - P2 changed: "I thought individual pages … That is acceptable." The pages stay per
    app; every page serves any app's transaction from the custom data and an app map;
    the default payment link is `pay.keksdose.app` (§15.2.1, 5, 6, 9).
  - Hosting as recommended: Cloud Run, in each app's web image (§15.2.4).
  - P3: the switch built once in the kits (§15.2.2, 10). P4: one customer per e-mail
    address, the overview listing all subscriptions accepted, no app touches another's
    (§15.2.3, 11).
  - The switch: immediate, prorated, a credit on a downgrade.
  - kastlan's portal: only the buyer by user id opens the overview (§15.2.11).
  - Every review point above adopted, and the sandbox steps added (§15.6 steps 9, 14,
    15); Apple Pay set up, not device-verified.
