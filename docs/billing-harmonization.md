# Billing, plans and payment — harmonisation plan

Status: **2026-10-07, reviewed.** All three apps answered the same day; §12 records what
they settled and Marcel's decisions after the reviews, and it wins over the sections above
where they differ. Led from ui-kit at Marcel's request. It runs in
parallel with the text-size round (`docs/text-size-harmonization.md`), and ships as
server-kit 0.6 and ui-kit 0.32 or the next minor after the reviews.

**2026-10-09:** §14 adds round 0.33 (server-kit 0.7, ui-kit 0.33): the shared Paddle
client, the checkout page and the way back, and what the 0.32 adoption left open. Marcel's
decisions for it are §2.18–27. **Reviewed by the three apps 2026-10-09:** Marcel amended
decisions 19 and 26, §14.16 records what the reviews settled, and §12.36, §12.37 and §14
are corrected in place.

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

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Plans | `users.plan` (FREE / PRO / UNLIMITED), a hard limit on owned budgets, `402 {code: "plan_budget_limit", plan, limit}` | Starter / Pro / Enterprise at placeholder CHF 49/149/399, per company; seats, units and storage counted | none ("nothing to sell") |
| Payment | none; its design doc recommends a Merchant of Record | Stripe direct with Elements (card fields in the app); **off** in production since v0.10.13 (every `/billing/*` route answers 503, the nav is hidden) | none |
| Admin | set-plan as a 0.30 admin action (`acknowledge`, logged in `admin_actions`) | operator's companies list shows a plan column | — |
| State of the code | — | pinned to Stripe API `2024-11-20.acacia`; the overage poster calls an API the locked SDK no longer has; billing tests cover only the off state (12 % coverage on the service) | — |
| Legal | "free of charge, closed beta"; JSON-LD `price: "0", CHF` | "free of charge, closed beta"; no payment provider named | "free of charge, closed beta" |

Neither kit has a billing module. The parts billing builds on exist:
- `ProgressBar` (usage, unlimited, over limit) and `AlertBanner` strips;
- `formatMoney`, `ChoiceCard`, `StatTile`, DataTable presets;
- the settings layout's hidden groups (`visible`);
- the roster's `extra` column, `AdminActionLog` for app actions, coded errors with extra
  fields;
- the `DemoSettings` mixin and `demo_write_allowed` as models.

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

Settled by the kit in this draft; the reviews may object:

8. **Hosted checkout and a hosted customer portal only.** No card field, payment-method
   page or invoice copy in any app. The Merchant of Record hosts them.
9. **A switched-off billing answers 404** with the code `billing_disabled`, as a switched-
   off demo does (`demo_disabled`). kastlan's 503 moves to 404.
10. **One provider account for the operator**, with a product and a webhook endpoint per
    app, unless the provider requires one account per seller brand.

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
19. **The checkout opens on each app's own pay page** with Paddle.js, a ui-kit 0.33 part
    (§14.4). Each app mounts it, allows Paddle in its CSP and sets its client-side token.
    The card fields stay in Paddle's frame, so decision 8 holds. kastlan's hosted-checkout
    setting stays for the sandbox review, and for live if Paddle approves it.
    **Amended (Marcel, 2026-10-09, after keksdose's review):** the pay page is a
    standalone static page that ui-kit ships, and every app serves it on its own subdomain
    `pay.<app domain>`, a separate origin approved as a domain in Paddle (§14.4). No app
    mounts it as a route, and no app's own CSP changes. Paddle.js on an app's origin would
    run beside keksdose's extractable data key and every app's session tokens, and a CSP
    relaxed on one route can't help, since storage is per origin. The rest stands.
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
26. **Under a billing lock, the kit's parts follow §3.3 and §12.13 by themselves.** Add,
    invite, resend and role grants stay locked; ShareCard's role toggle stays locked,
    lowering a role included. A lock says its kind, and `commit` takes
    `{ except: kinds }` (§12.36).
    **Amended (Marcel, 2026-10-09, after Kurvenschmiede's review):** lowering a role is
    allowed under a billing lock, since it removes access (§12.13); Kurvenschmiede's server
    already allows editor → viewer while lapsed (`shares_router.py:229-234`). Raising a
    role stays locked. ShareCard's role toggle follows by itself (§12.36).
27. **The operator's plan parts ship in ui-kit 0.33:** `planColumn` and
    `PlanChangeConfirm` (§14.12).

Settled with them, not decisions: httpx comes in as server-kit's `billing` extra;
`billing.testing` ships in the wheel (§14.9); a deletion request cancels at the period's
end, a paused subscription at once, and a reactivation removes the cancellation the
request scheduled (§12.37).

After the reviews of round 0.33 (Marcel, 2026-10-09): decisions 19 and 26 are amended as
marked above, and a Kurvenschmiede team manager adding or re-inviting a member follows the
manager's own standing. The reviews' other points were settled as the reviewers proposed
(§14.16).

Still open for Marcel (they don't block the contract):
- **the plans, limits and prices** per app (proposed in §13, for local review);
- **the launch date** per app, which starts the beta users' 12 months.

The checks with Paddle and in the sandbox are listed in §14.15; they need no decision.

## 3. The model

### 3.1 The plan catalogue lives in code

- Each app declares its plans in code (keksdose's rule: the dict that sets the limits is
  the only list), as server-kit `PlanSpec`:
  - `code`: lowercase, stable on the wire;
  - `limits`: a map of dimension to number, `None` for unlimited (kastlan: seats, units,
    storage; keksdose: budgets; Kurvenschmiede: its own);
  - `prices`: a map of currency to amount in minor units, per interval (month, year);
  - `sort`.
- The provider's price ids live in settings, keyed by plan, currency and interval.
- Display names and feature lines come from the app's i18n, never from the provider.

### 3.2 One subscription row per payer

The payer (§2.5) has exactly one row, **created with the payer**: at registration, at a
company's creation, and by a migration for those that exist. "No row" never happens
(kastlan's companies created after its billing migration have none today).

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
  (§2.7).
- **A beta user or company** (one that exists when billing goes on) gets `comped`,
  `source = beta`, `comped_until = launch + 12 months` (§2.4). A row written before the
  launch date is known (the beta migration, a registration before launch) stores
  `comped_until = null`; the kit reads `source = beta` with a null end as launch + 12
  months, from the settings' launch date, at read time (server-kit 0.6.1
  `effective_comped_until`, the `launch` argument of `in_good_standing` and `grant_holds`;
  Kurvenschmiede's 0.32 report). A moved launch date then needs no data change.
- **An operator's grant** is `comped`, `source = manual`, with or without an end date.

### 3.3 Good standing and read-only (§2.3, §2.7)

- **In good standing:** `active`; `trialing` before `trial_ends_at`; `comped` before
  `comped_until` (or without one); `past_due` within the provider's retry period.
- **Otherwise the payer's data is read-only.**
  - **Reading, exporting and signing in** always work.
  - **Billing itself, the account's own settings** (password, email, sessions, deletion,
    export) and signing out always work: a person must be able to pay, leave or take their
    data.
  - **Every other write** answers **`402 billing_read_only`**. The gate is the same shape
    as the demo's (landing §6.3): one dependency, an app-supplied allow-list.
  - **Nothing is deleted, hidden or locked.** A later plan opens it all again.
- **The UI** wraps the app in the kit's `WriteLockProvider` with the reason "Your plan has
  ended. Choose a plan to make changes again." and shows a `BillingBanner`.
- **Warnings:** a banner from 7 days before a trial or a free grant ends, and from the
  first failed payment.

### 3.4 Plan limits

- **A limit gates creation only** (keksdose's rule). A downgrade never deletes or hides
  anything over the new limit; it only stops creating more.
- **The refusal:** `402 {detail, code: "plan_limit", dimension, plan, limit, used}`.
  keksdose's `plan_budget_limit` becomes `plan_limit` with `dimension: "budgets"`, and
  the old code is sent alongside for one release.
- **The page** offers "Choose a plan" (to the billing page) or, where the operator grants
  plans by hand, "Ask for more" (a mailto to support@, keksdose's today).

## 4. The API

**The switch:** `<APP>_BILLING_ENABLED`, off by default (server-kit `BillingSettings`).
While off:
- `GET /billing/status → {billing_enabled: false}` answers; it is the only billing
  route that does;
- every other `/billing/*` route and the webhook answer `404 billing_disabled` (§2.9);
- the UI hides the billing page, nav entry, banners and search entries;
- the read-only gate is off: everyone is in good standing.

kastlan's `test_billing_off.py` route sweep becomes the contract test in every app.

**The routes:**

| Route | Who | What |
|---|---|---|
| `GET /billing/status` | signed in (kastlan: staff) | `{billing_enabled}` |
| `GET /billing/overview` | the payer (kastlan: a company admin) | `{plan, status, source, in_good_standing, trial_ends_at, comped_until, current_period_end, cancel_at_period_end, limits, usage, currency, at_provider}` (`at_provider`: §14.5) |
| `GET /billing/plans` | the payer | the catalogue with this payer's currency and the prices |
| `POST /billing/checkout {plan, interval, currency}` | the payer | `{url}`: the provider's checkout, on the kit's pay page at the app's pay host (§14.4) |
| `POST /billing/portal {target?}` | the payer | `{url}`: the provider's hosted customer portal (payment method, invoices, cancel; §14.5) |
| `POST /webhooks/<provider>` | the provider | signed events (§5) |
| `POST /admin/…/{id}/plan {plan, comped_until?, acknowledged}` | an admin or the operator | a manual plan or grant (§6) |
| `GET /admin/plans` (kastlan `/platform/plans`) | an admin or the operator | the catalogue's codes, limits and sort, whatever the switch (§14.12) |

**The currency:** the payer's currency is picked at checkout from the plan's prices (CHF
or EUR, §2.6), defaulting from the account's locale or country. Money crosses the wire
as integer minor units plus an ISO currency, never as a float. Pages format it with the
kit's `formatMoney`.

**The demo:** every billing route answers `403 demo_refused` to a demo user (landing
§6.4).

## 5. Webhooks

- **One endpoint per provider:** `POST /webhooks/<provider>`. A bad signature answers
  400.
- **An event store:** `billing_events(provider, event_id UNIQUE, type, occurred_at,
  received_at, processed_at)`. The event is recorded and applied in one transaction.
- **Answers:** a duplicate or an unknown type answers 2xx; a poison event answers 2xx and
  is logged (keksdose's Pub/Sub rule); a transient failure answers 5xx so the provider
  retries.
- **The ordering guard:** an event older than `updated_from_event_at` does not overwrite
  the row.
- **Normalised events:** server-kit maps each provider's events to one vocabulary:
  `subscription_started`, `subscription_updated`, `payment_failed`,
  `subscription_canceled`, `subscription_expired`. The app applies those. Supporting a
  second provider is a new mapper, not new app code.

## 6. The operator

- **A plan change is a user-admin action** (`AdminAction.PLAN`, level `acknowledge`),
  written to `admin_actions` with `detail {from, to, comped_until, counts}`. It is the
  kastlan company's action when the payer is a company.
- **The roster** shows the plan and the standing in its `extra` column (keksdose's today)
  with the kit's `SubscriptionStatusChip`.
- **The operator can grant** `comped` with or without an end (a friend, a school, a
  support case), and end a grant.

## 7. The pages

- **kastlan:** the admin section `/admin/billing` (hidden while billing is off, settings
  §5), with the plan, the usage, "Change plan" and "Payment and invoices" (the portal).
- **keksdose and Kurvenschmiede:** a settings group `plan` ("Plan & billing") before
  `data`, hidden while billing is off, with the same parts.
- **The kit parts:**
  - `PlanCard` / `PlanPicker` on `ChoiceCard`: the price through `formatMoney`, the
    limits, current / upgrade / downgrade;
  - `SubscriptionStatusChip`;
  - `BillingBanner` presets on the AlertBanner strip: trial ending, payment failed, plan
    ended (read-only), free grant ending;
  - `PlanLimitNotice` (mode `upgrade` or `contact`);
  - `UsageMeter`, which is `ProgressBar`'s meter variant; no new part.
  None sends a request.

## 8. Legal, in the release that turns billing on (legal decision 7)

The **Merchant of Record is the seller**:
- its terms of sale, right of withdrawal and invoices apply to the purchase;
- the app's terms say so and link them;
- the privacy text names it as the processor of payment data;
- the app never sees a card.

Also:
- **The prices** go into each app's terms and the landing's JSON-LD `offers` (keksdose's
  `price: "0"` changes).
- **The disclaimer:** the kit's "private, non-commercial" disclaimer gets a **commercial
  variant**, chosen per app.
- **The beta's wording** ("free of charge, closed beta") changes in the same release.
- **keksdose's legal brief question Q13** is answered first (its own condition).

## 9. The provider (Paddle, decided 2026-10-09)

The comparison Marcel chose from (decision 16), kept as the record.

| | Paddle | Lemon Squeezy |
|---|---|---|
| Model | Merchant of Record, B2B and B2C | Merchant of Record, aimed at software and indie sellers |
| Tax | VAT/MWST, US sales tax, invoices | the same |
| Hosted checkout and portal | yes | yes |
| Fee (published, to be checked at signing) | about 5 % + 0.50 per transaction | about 5 % + 0.50 per transaction, plus about 1.5 % outside the US and further add-ons (third-party comparison, 2026) |
| Switzerland and CHF | to be confirmed at signing | to be confirmed at signing |
| Prices per currency (checked 2026-10-08) | fixed amounts per currency or country (`unit_price_overrides`); CHF is a payment currency; balances and payouts in USD, EUR, GBP, AUD or CAD, not CHF | **one store currency**, displayed converted; every customer is **charged in USD** at the mid-market rate; payouts in USD or converted |
| Webhook | an event id and a timestamped signature | a body signature only, no event id (the kit dedupes on the body's SHA-256) |
| Owner | independent | Stripe (since 2024) |

The kit stays provider-agnostic (§5), so the choice changes a mapper and settings, not
the contract. The fees and CHF support must be checked with Paddle at signing; this table
is not a quote.

**Decided (Marcel, 2026-10-09): Paddle**, as recommended on 2026-10-08. Decision 6
(prices in CHF and EUR) needs a fixed price per currency, which Lemon Squeezy does not
offer: a Swiss customer would be charged a converted USD amount. server-kit 0.7 adds the
Paddle client behind a provider-neutral port (§14.2) and deprecates Lemon Squeezy
(§14.13).

## 10. What the kits add

What server-kit 0.6 and ui-kit 0.32 shipped. server-kit 0.7 and ui-kit 0.33 add §14.

**server-kit 0.6**, `eifi1_server_kit.billing` (Layer 1: no tables, no routes):
- `BillingSettings` (a mixin, off by default; switching on requires the secrets);
- `PlanSpec`, `normalize_plan`, `check_limit()` raising `PlanLimitError` (402
  `plan_limit`), and `BillingError` (`billing_disabled`, `billing_read_only`), all in
  `CONTRACT_ERRORS`;
- `SubscriptionStatus`, `in_good_standing(row, now)`, `trial_ends_at(now)`,
  `beta_comped_until(launch)`;
- `billing_write_allowed(method, path, allow=…)`, the read-only gate's decision (the
  demo's shape);
- webhooks:
  - a signature check per provider, written with `hmac` (no SDK);
  - the normalised event vocabulary and a mapper per provider;
  - an event-store port and a pure dispatcher, with the ordering guard;
- `minor_to_decimal` and the currency exponents;
- the shapes: `BillingStatus`, `BillingOverview`, `PlanChange` request and response;
- `AdminAction.PLAN`.

**ui-kit 0.32:**
- the parts of §7;
- `isBillingError` codes in `KitErrorCode`;
- `billing.*` labels in seven languages (German: "Tarif" for plan, "Abonnement" for
  subscription);
- the legal commercial disclaimer variant.

## 11. Per repo (summary; the reviews refine it)

Round 0.33's changes per repo, with the defects found on the way: §14.14.

- **kastlan** (the most work):
  - the direct Stripe code (Elements, SetupIntent, invoice mirror, the overage poster) is
    replaced by the provider's checkout and portal plus the webhook (server-kit 0.7's
    Paddle client and the kit's pay page on `pay.kastlan.app`, §14);
  - usage and overage stay app-side;
  - a subscription row for every company: a migration for the existing ones as beta,
    and on company creation and in the demo company;
  - `billing_disabled` as a coded 404;
  - the read-only gate with its allow-list;
  - tests on the live path, not only the off state.
- **keksdose:**
  - the payer is the user; the subscription row replaces `users.plan` as the source of
    the plan;
  - `plan_budget_limit` → `plan_limit`;
  - the GCP route `/billing/pubsub` moves off `/billing` (to `/ops/gcp-billing/pubsub`)
    before customer billing exists;
  - the settings group;
  - `docs/payment-options.md` is updated.
- **Kurvenschmiede:**
  - a plan catalogue and limits of its own (Marcel's plans);
  - the subscription row per user;
  - the read-only gate;
  - the settings group.

## 12. Settled after the reviews (2026-10-07/08)

All three apps reviewed the draft (dbc957e). Where this list and the sections above
differ, this list wins.

**Whose standing, and where the gate sits**
1. **The payer's standing, not the caller's** (Marcel's decision 11):
   - keksdose: a write into a budget follows the budget OWNER's standing (a paying guest
     in a lapsed owner's budget is refused; a lapsed guest in a paying owner's budget
     may write);
   - Kurvenschmiede: the row owner's for an edit, the creator's for a create;
   - kastlan: the acting company's (the token's `company_id`). Someone in two companies
     can be read-only in one and not the other. Account routes aren't company-scoped and
     always pass.
2. **The gate is the app's choice of two equal shapes:**
   - server-kit's `billing_write_allowed(method, path, allow, *, standing)` at the auth
     dependency, the demo's shape, with the standing as an input; or
   - the app's own write choke points, which already resolve the owner (keksdose
     `require_write_access`, Kurvenschmiede `get_owner` and `access.claim`).
   Either way, a compute-only POST (Kurvenschmiede's five previews) isn't a write.
3. **Order of refusals:** the demo's 403 first, then billing's 402; a lapsed payer creating
   gets `billing_read_only`, never `plan_limit`.
4. **Scheduled jobs are outside the HTTP gate** and must skip a lapsed payer's data
   (keksdose: recurring, bank sync, the two extract jobs, which also bill Gemini;
   kastlan: recurring rent, which is off by default — its lease-status sweep only follows
   the dates and keeps running).

**Offline, sync and privacy**
5. **A 402 is not a refusal of one change.**
   - Sync endpoints stay on the allow-list: inside them, a lapsed payer's changes are
     refused as `billing_read_only` and not applied, and the reply still sends updates
     and carries the refused changes (keksdose's E2EE gate is the precedent; its 409 path
     gets the same fix).
   - A client keeps refused changes queued as "N changes waiting for a plan" and sends
     them after payment. Its sign-out guard offers "discard waiting changes".
   - **A device locks in advance from the known dates** (`trial_ends_at`, `comped_until`)
     by mirroring a per-item lock into its offline write gate, so nothing looks saved
     that will be refused. Only `past_due` → `expired` waits for the next sync.
6. **A guest never learns the owner's payment status.** The item carries
   `locked: "billing" | null`, never the owner's status, and the guest's banner says
   "This budget is read-only for now; its owner can lift that." One `WriteLockProvider`
   combines the demo's and billing's reasons.

**Rows, exceptions and grants**
7. **No row, always in good standing:** demo users, the demo's system account, ownerless
   items (keksdose's preview budget). They are never gated and never counted.
8. **Not payers:**
   - Kurvenschmiede's customers (they read) and reviewers;
   - kastlan's tenants (decision 15);
   - the operator's admin accounts: `comped`, `manual`, no end. keksdose's first user's
     UNLIMITED becomes this.
9. **A pure guest's trial starts at their first owned item**, not at registration
   (keksdose: an invited guest owns nothing; after day 30 their first own budget would be
   refused). The row is created at registration with `trial_ends_at` empty.
10. **Beta by invitation date:** an invitation created before launch counts as beta even if
    accepted after, so the last week's invitees don't get 30 days instead of 12 months.
11. **An operator's grant beats provider events:** while `comped_until` is in the future, a
    provider event doesn't overwrite the row; provider state applies from then on.
12. **Every payer gets its row where it is created**, plus a migration for the existing
    ones and a test that each payer has exactly one row:
    - keksdose `register_user`;
    - kastlan `_new_company`, `create_company_for`, the demo company (comped), the seed;
    - Kurvenschmiede `auth_service.register`, the seed.
    kastlan's GRANDFATHERED maps to `comped`/`beta`.

**Allowed while read-only** (beyond billing, the account's settings and signing out)
13. **In every app:**
    - **feedback** with attachments and crash reports ("I paid and it's still read-only"
      must be reportable);
    - **removing access** (revoking a share, leaving a shared item, offboarding a member,
      revoking sessions, API tokens, passkeys and 2FA);
    - **taking the data and leaving** (decision 14);
    - admin routes;
    - receiving sync.
    **Adding seats or guests stays blocked** (invitations, role grants).
14. **Per app:**
    - **keksdose:**
      - allowed: support chat; finishing a running re-seal sweep; one's own key wraps
        and sending a guest the household key; push and notification preferences;
        withdrawing price-pool consent; accepting an invitation into someone else's
        budget; switching the active budget; deleting whole budgets and erase-all;
      - refused: E2EE enrolment and mode changes (they start a sweep); the help assistant
        (billed AI).
    - **kastlan:** offboarding; `POST /sync` (refusing only when changes are present).
    - **Kurvenschmiede:**
      - allowed: the five compute POSTs; deleting own rows; a team manager removing a
        member; translation verdicts;
      - refused: "Copy to my account", which is a create.

**Plans, prices and money**
15. **Dimensions:**
    - keksdose: owned, non-deleted budgets (shared-in budgets and the preview never
      count);
    - Kurvenschmiede: curves (setpoint sessions owned), optionally collaborators later;
    - kastlan: units (every unit, decision 13), seats (staff only, decision 15), storage
      (all company files at plaintext size).
    A copy counts; an admin transfer or an erasure hand-over never checks a limit.
16. **Codes:** plan codes become lowercase by a data migration; reads compare case-
    insensitively (the audit history keeps uppercase).
    - `plan_budget_limit` → `plan_limit` over two releases: release N's frontend accepts
      both (installed PWAs run the previous bundle), release N+1's server switches.
    - The roster's `plan_budget_limit` field becomes `limits.budgets` in the same
      release.
17. **Prices are gross**, MWST/VAT included, as Swiss consumer law (PBV) wants. The
    catalogue holds gross prices, or `PlanCard` shows the provider's localised price
    preview. Lead with yearly prices: about 5 % + 0.50 per transaction makes a small
    monthly price expensive.
18. **Default currency:** the account's stored currency where the app keeps one (keksdose
    `reporting_currency`), else the locale.

**API and webhooks**
19. `GET /billing/status` answers a demo user too, so the shell can hide the page; every
    other billing route refuses the demo.
20. **The webhook writes rows for any payer:** its tables sit outside tenant RLS, or the
    handler uses the bypass explicitly. kastlan's `billing_stripe_events` becomes
    `billing_events`.
21. **After checkout** the page shows "payment processing" and re-polls the overview, since
    the webhook may land after the person is back (Cloud Run scales to zero). ui-kit 0.33's
    hook does it (§14.4).
22. **Trial and grant end notices** (7 days before, and at the end) are an app's daily job:
    a cardless trial never reaches the provider. The decision, the marker and the
    triggers: §14.7.
23. **Deletion** (user-admin §6.4): cancel at the provider when the deletion is
    REQUESTED, or the provider keeps charging a deactivated account; the subscription
    row goes at erasure. Guests' notices say the shared item works until the paid period
    ends. When and how: §12.37.

**Labels and legal**
24. **The settings group is "Subscription" in English** ("plan" already means keksdose's
    monthly budget plan); German "Tarif" for the plan, "Abonnement" for the subscription.
25. **The Merchant of Record is an independent controller** of the buyer's data, not our
    processor:
    - the privacy text names it as a recipient, links its notice, legal basis Art. 6(1)(b);
    - confirm against its DPA at signing.
26. **Consumer law in the provider's portal:** the EU withdrawal function (Directive (EU)
    2023/2673, from 19 June 2026) and Germany's cancellation button (§312k BGB), plus a
    visible "Cancel" link on the app's subscription page. It shows whenever the payer has
    reached the provider, whatever the status or source (§14.5).
27. keksdose's legal keys to change in that release are listed in its review: terms scope
    and new sale sections, privacy data, third parties, transfers, legal basis, retention,
    rights, the Impressum disclaimer, the JSON-LD offer and the beta notices. Its legal
    brief question Q13 (terms without liability or governing-law clauses) comes first.

**App-side notes**
28. **kastlan:**
    - **keeps** usage counting (EntitlementService) and the trial mail on its own job;
    - **drops** the Stripe adapter and dependency, Elements, SetupIntent,
      `billing_payment_methods`, the invoice mirror, `billing_plans` and the `stripe_*`
      columns, and the overage poster with its usage snapshots;
    - `qrbill_service` (tenants' QR bills) stays.
29. **keksdose** moves the GCP receiver off `/billing` in three steps:
    1. deploy with both paths;
    2. repoint the Pub/Sub push subscription;
    3. drop the old path the next release.
    A 404 first would make Pub/Sub redeliver for ever. The modules are renamed with the
    route.
30. **Kit additions from the reviews:**
    - `in_good_standing` exemptions (decision 7 above);
    - the standing as an input to the gate;
    - a "changes refused" shape for sync replies;
    - the guest `BillingBanner` variant;
    - the "payment processing" state.

**After the 0.32 / 0.6 adoption** (the three apps' reports, 2026-10-08/09)
31. **Installed old clients and sync refusals (§12.5).** A client from before this round
    reads a 2xx sync reply as "delivered" and drops what was refused. So the
    refusals-in-the-reply shape is **opt-in per request**: the client sends
    `refusals: true` on its sync request (keksdose's flag); without it, a lapsed payer's
    push is refused whole (402 `billing_read_only`, or the app's existing 409), as before.
    The same exposure exists in kastlan and Kurvenschmiede.
32. **`SyncRefusal.change_ids` are row ids.** Two queued changes to one row can't be told
    apart, which holds while a push is refused whole per row (keksdose's server does). An
    app that ever applies part of a row's changes needs per-change ids first.
33. **No row is not good standing by accident.** `in_good_standing(None)` is True ("not
    billing's business"). An app with row-level security on its subscription table reads
    the payer's row with the RLS bypass: a guest reading the owner's row would otherwise
    get nothing back, and the gate would fail open (keksdose pins it with a Postgres
    test).
34. **An operator's plan change before launch keeps the beta** (keksdose's `kept_beta`):
    a running beta grant given no new end keeps `source = beta` and its end; only the
    plan changes. Otherwise every pre-launch move would become a lifetime grant.
35. **Removing access under a billing lock (§12.13).** ShareCard's remove-grantee and
    revoke-invitation are `commit` controls, so a billing lock blocks them, though
    §12.13 allows them. Kit fix in the next round: a lock says its source (demo, billing)
    and a control can be exempt from one (§12.36, ui-kit 0.33). Until then an app keeps
    its own share card or passes the actions unlocked. keksdose has its own;
    Kurvenschmiede uses the kit's.

**Round 0.33** (Marcel, 2026-10-09; for the apps' review with §14)
36. **A lock says its source; a control can be exempt** (decision 26; ui-kit 0.33). It
    fixes §12.35, which is wider than ShareCard: kit parts hard-code `commit` on actions
    that §3.3 and §12.13 allow under billing.
    1. **Every lock source has a kind.** `"demo"` and `"billing"` are the kit's; an app
       names its own (Kurvenschmiede's `"access"` and `"customer"`). A source without a
       kind is never exempted.
    2. **The provider holds every locked source, in refusal order** (§12.3), as `holds`,
       beside the first one's reason and kind. Nesting still follows "nearest wins": an
       inner `locked={false}` reopens everything.
    3. **`commit` takes a scope.** `true`: every lock refuses the control.
       `{ except: [kinds] }`: every lock but those kinds. A control under a demo lock and a
       billing lock together, exempt from billing, shows the demo's reason.
    4. **The kit's parts follow §3.3 and §12.13 by themselves**, with no per-part prop.
       These take `{ except: ["billing"] }` built in (ui-kit `src/`):
       - ShareCard remove grantee (`share-card.tsx:492-516`, `commit` :496) and revoke
         pending (:552-577, `commit` :556);
       - InvitationsPanel revoke (`invitations-panel.tsx:507-515`, `commit: true` :512);
       - SessionsSetting revoke one and sign out everywhere (`sessions-setting.tsx:255`,
         :271);
       - DeleteAccountSetting (`delete-account-setting.tsx:321`);
       - EmailChangeSetting resend, cancel and submit (`email-change-setting.tsx:286`,
         :299, :448);
       - ProfileSetting Save (`account-settings.tsx:274`);
       - CompleteNameDialog Save (`complete-name-dialog.tsx:248`);
       - TranslationReview verdicts (`translation-review.tsx:745,946,977,1093,1105`,
         `translation-review-editor.tsx:237,247,257`; §12.13 admin routes, §12.14);
       - PlanChangeConfirm (§14.12): an operator's action, an admin route of §12.13
         (kastlan's review);
       - ShareCard's role toggle (:480-490) for a lowering (decision 26 as amended):
         `roles` is read narrowest first, as Kurvenschmiede lists them (viewer, editor;
         `share-dialog.tsx:62-65`), so the options before the grantee's role take
         `COMMIT_EXCEPT_BILLING`. The doc of `SharePanelProps.roles`, "in display order"
         today, adds "narrowest first".

       These stay locked under billing (§12.13: no new seats, guests or roles):
       - ShareCard add (`share-card.tsx:423-425`, and the Enter guard :317);
       - ShareCard's role toggle for a raise: the options after the grantee's role, with
         the billing reason. Kurvenschmiede's server refuses only a widening
         (`shares_router.py:229-234`), so the toggle now matches it;
       - InvitationsPanel invite (`invitations-panel.tsx:397`) and resend (:498).
    5. **`useWriteLock(scope?)` answers the lock as a control with that scope sees it.**
       Code that must know (a toast, a swipe plan, a hand-rolled toggle) reads it. It
       replaces keksdose's `useWriteLockKind`.

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

    - **One prop, widened:** the 37 `commit?: boolean` declarations in `src/`,
      `ConfirmOptions.commit`, the comboboxes' `createCommit` and `StepperNav.finishCommit`
      become `CommitScope`; the internal `useCommitReason` takes a scope. Spreading
      `<WriteLockProvider {...combineWriteLocks([...])}>` keeps working and now carries
      `holds`. A demo source is `kind: "demo"`.
    - **Two traps:** `form-actions.tsx:539` passes `commit={commit && !pending}`, which
      turns an object scope into a boolean; `useConfirm` reads the caller's lock
      (`confirm-dialog.tsx:111-116`), hence the pure `writeLockFor`.
    - **No new labels:** the reasons stay `writeLock.reason`, `demo.writeLocked`,
      `billing.lockReason` and `billing.guestReadOnly`.
    - **Tests:** `holds` keeps its order; `{ except: ["billing"] }` under billing alone is
      unlocked, under demo and billing locked with the demo's reason; an unknown kind is
      never exempted; an inner `locked={false}` still reopens; FormActions keeps the scope
      while not pending; each part above under a billing lock and under a demo lock
      (ShareCard: remove, revoke and a lowering live, Add, Enter-to-add and a raise locked
      with the billing reason, everything locked under a demo lock; InvitationsPanel:
      revoke live, invite and resend locked; PlanChangeConfirm live under billing);
      `confirm({ commit: COMMIT_EXCEPT_BILLING })`; the new exports in the public-surface
      test.
    - **The apps** (§14.14): kastlan names the kinds on its app-wide lock, and the parts
      above reopen by themselves; its own controls of the same sort take
      `COMMIT_EXCEPT_BILLING`; keksdose drops `useWriteLockKind`; Kurvenschmiede names its
      kinds and replaces the `locked={false}` round `ShareDialog` with the owner's billing
      lock.
37. **Cancelling at a deletion request** (refines §12.23). At the period's end, so a
    guest's shared item works until then; a paused subscription at once, since Paddle
    cancels a paused subscription only immediately (the kit maps paused to `expired`).
    Nothing is sent without a `provider_subscription_id`, for `canceled`, or with
    `cancel_at_period_end` already set. It never blocks the deletion (decision 14): a
    failure is logged at ERROR ("cancel it by hand") and kept in the app's audit detail.
    The helper is server-kit's `cancel_for_deletion` (§14.8), lifted from keksdose, the only
    app that cancels today.
    **After the reviews** (kastlan's and keksdose's, §14.16):
    - **The cancellation is undone when the account comes back.** An operator's
      reactivation, or a withdrawn request where an app has one, removes the cancellation
      the request scheduled, through server-kit's `resume_after_withdrawal`: Paddle's
      `PATCH /subscriptions/{id} {"scheduled_change": null}`. A subscription that was
      cancelled at once (it was paused) or whose period has ended is not resumed: Paddle
      can't reinstate a cancelled subscription, and the payer subscribes again.
    - **Each outcome goes into the audit:** the request's (`cancelled` or `failed`; in
      kastlan per flagged company) and the reactivation's.
    - **A change for keksdose:** it skips an `expired` (paused) subscription today
      (`billing_service.py:504`); the kit cancels it at once.

## 13. Proposed plans (Marcel, 2026-10-08)

Marcel: "Propose like that." Starting points, not market research. Billing stays off in
production; the apps wire these catalogues now so the whole path can be reviewed
locally (§13.4). Prices are gross (§12.17), the same figure in CHF and EUR, and yearly is
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
Gross, as §12.17 says (Marcel, 2026-10-09, decision 17), though kastlan sells to
businesses.

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

**Status: reviewed by the three apps 2026-10-09.** Built from two read-only audits of
round 033 (server-kit's Paddle client; the kit's billing UI and write locks), kept outside
the repo, and Marcel's decisions 18–27, of which 19 and 26 were amended after the
reviews. §14.16 records what the reviews settled; the sections below are corrected in
place. Paths are repo-relative: the backends are under `kastlan/`, `backend/keksdose/`
and `backend/kurvenschmiede/`, the frontends under each repo's `frontend/src/`,
server-kit's under `src/eifi1_server_kit/` and ui-kit's under `src/`. Line numbers are
those the audits read (kastlan `feat/paddle` 8b36197, keksdose `feat/kit-0.32`,
Kurvenschmiede `main`, server-kit 93ccae1), or the reviews' (kastlan b3adb8f, keksdose
6a746d5f, Kurvenschmiede `main`, or its `refactor/plan-2026-10` where marked).

### 14.1 Scope

**server-kit 0.7:**
- one shared Paddle client, lifted from kastlan c0b1a24, behind a provider-neutral port
  (§14.2); keksdose and Kurvenschmiede have none and wait for it;
- the `app` tag, for one account and three apps (§14.3);
- the checkout return convention (§14.4), `at_provider` (§14.5) and the double-checkout
  refusal (§14.6);
- the notice decision (§14.7), the deletion's cancellation and its undoing (§14.8) and
  the test helpers (§14.9);
- `PlanChangeResponse` widened for the operator's result lines (§14.12);
- Lemon Squeezy deprecated (§14.13).

**ui-kit 0.33:**
- the pay page: a static bundle in the package with its build script, and `payPageUrl`
  and `paddleLocale` (§14.4);
- the checkout-return helpers and hook (§14.4);
- `SubscriptionActions.atProvider` (§14.5);
- the lock kinds and `commit` scopes (§12.36);
- `usePlanLimitToast` (§14.11), `planColumn` and `PlanChangeConfirm` (§14.12);
- the four new codes in `BillingErrorCode` (§14.2).

**The package:**
- The billing package's docstring says "no request to a provider"
  (`billing/__init__.py:4-10`). It becomes "one request each for checkout, portal, cancel
  and undoing a cancel, through `billing.paddle`, only with the `billing` extra".
  Everything else stays
  Layer 1: no tables, no routes.
- httpx is the `billing` extra, `billing = ["httpx>=0.28.0"]` (the apps' floor, no
  ceiling). It is imported lazily, as `mail.ResendClient` does (`mail.py:43-44`,
  :256-262, :352), so `import eifi1_server_kit.billing` never needs it. The apps install
  `eifi1-server-kit[billing,…]` from the release wheel's URL; extras work with a URL
  source.

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
    """PaddleClient for provider paddle with a key; NoProviderClient otherwise."""

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
    row: SubscriptionRow, client: BillingProviderClient
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

**Behaviour**, kastlan's (`adapters/billing/paddle_client.py`) except where marked new:
- **`checkout_url`:** `POST /transactions` with `{items: [{price_id, quantity: 1}],
  custom_data: {**custom_data, "app": app}, customer_id?, checkout: {url:
  checkout_page_url}?}`.
  - With `hosted_checkout_url`, the answer is `<hosted>?transaction_id=<txn>&locale=<locale>`
    (the locale only when given). Otherwise it is the transaction's `checkout.url`: the
    pay page plus `?_ptxn=<txn>`.
  - New: a 2xx without the id or the URL raises `PaddleError` 502. kastlan read the
    answer raw (:71, :82, :94), so a missing field was a `ValueError` or `KeyError`, a
    500. The same holds for the portal's link.
- **`portal_url`:** `POST /customers/{ctm}/portal-sessions {subscription_ids: [sub]?}`.
  - `overview` answers `urls.general.overview`.
  - New: `cancel` and `payment_method` answer the subscription's
    `cancel_subscription` or `update_subscription_payment_method` link, or the overview
    when Paddle gives none (a paused or cancelled subscription).
- **`cancel`:** `POST /subscriptions/{sub}/cancel {effective_from: "next_billing_period"
  | "immediately"}`. New on the port: kastlan's client had it, and nothing called it.
- **`remove_scheduled_cancel`** (new): `PATCH /subscriptions/{sub} {"scheduled_change":
  null}`. Paddle's docs (build/subscriptions/cancel-subscriptions, read 2026-10-09): the
  subscription comes back with `scheduled_change` null and stays `active`; a cancelled
  subscription "can't be reinstated".
- **Every call:**
  - sends `Authorization: Bearer <key>` and `Paddle-Version: 1`;
  - new: uses one injected or shared `httpx.AsyncClient` (as `ResendClient`,
    `mail.py:300-318`); kastlan opened a client per call;
  - has no retry, because creating a transaction is not idempotent;
  - logs one WARNING per failure: method, path, status, Paddle's code and request id;
    never the body or the key.
- **The key's minimum permissions** (Paddle's 2025 keys) go in the docstring: transaction
  write, customer-portal-session write, subscription write.
- **Dropped:**
  - `return_url` on the port: it was never sent; the way back is configuration (§14.4);
  - `PaddleError(200, "no_checkout_url")`: Paddle refuses to create a transaction without
    a default payment link, so that case arrives as a 4xx from the create;
  - keksdose's `email` argument: the prefill `user_email` is a hosted-checkout parameter
    and can't be combined with a transaction's customer.

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
  `billing_read_only` and `billing_not_configured` (decision 22). The audits' drafts
  (`not_at_provider`, `already_subscribed`, `provider_unavailable`, `plan_not_sold`,
  `billing_no_provider_account`) are not used.
- ui-kit's `BillingErrorCode` (`src/auth/auth-errors.ts:106`) adds the same four, and
  `isBillingError` reads them.

**Settings:** new `BillingSettings` fields.

```python
class PaddleEnvironment(enum.StrEnum):
    SANDBOX = "sandbox"
    LIVE = "live"

class BillingSettings(BaseModel):
    ...
    #: The app's name in every checkout's custom data (§14.3). Set as the default in the
    #: app's Settings subclass (billing_app: str | None = "keksdose"), not per deployment.
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
  "set in code" (§14.16, item 16).
- **The URL fields** accept `https://`, or `http://` for localhost only.
- **Switching on** with `billing_provider = paddle` also requires `billing_app` and an
  environment that resolves and agrees with the key's prefix. Sandbox keys work only
  against `sandbox-api.paddle.com` and live keys only against `api.paddle.com`, so a
  sandbox key on live fails at start, not at the first checkout.
- **The base URL is the kit's constant.** kastlan's free `billing_api_base_url`
  (`infrastructure/config.py:130`, `KASTLAN_BILLING_API_BASE_URL`) goes (decision 24): a
  typo or another host can't be configured.
- **`verify_billing_webhook`** makes the right call the easy one. kastlan and
  Kurvenschmiede call `verify_webhook_signature` without `tolerance=` (§14.14), so the
  kit's 5-second default applies whatever `<APP>_BILLING_SIGNATURE_TOLERANCE` says.

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
   from `app`: 200, not recorded, not dispatched. **Once `app` is given, an untagged
   event is dropped too**, and logged at WARNING; it is never matched by
   `provider_customer_id` (Kurvenschmiede's review: its `payer_row_for` falls back to the
   customer id, and one person may be one Paddle customer across the apps, so a foreign
   untagged event would land on its row). With `app` None, today's path. No data needs
   migrating: billing has never been on, the payer references stay `user:<id>` and
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
answers every navigation from its precached shell with the strict headers anyway
(`frontend/src/sw.ts:64-78`). On `pay.<app domain>` Paddle.js shares its origin with
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
  sandbox, `live_` for live: Paddle's client-side token prefixes) and a return URL that
  isn't `https://` (`http://` for localhost only), so a wrong pairing fails the build,
  not a buyer. Without a token (billing off) it writes `"token": null`, and the page says
  `payNothing`.
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
export function paddleLocale(kitLocale: string): string;
/** The checkout's {url} with the buyer's language: lang=<kit locale> on a pay page link
 *  (it carries _ptxn); any other URL unchanged. */
export function payPageUrl(checkoutUrl: string, locale: string): string;
```

`PaddlePayPage`, its props and `paddleTransactionId` (the draft's React part) are gone. The
four `billing.pay*` labels stay, built into the bundle.

**How it is served.** Each app's web container (Caddy on Cloud Run, the same image)
answers the second host name with a site block of its own, so the app's headers never
apply to it:

```caddy
http://{$PAY_HOST:pay.invalid}:{$PORT} {
	root * /srv-pay
	header {
		Content-Security-Policy "default-src 'none'; script-src 'self' https://cdn.paddle.com; frame-src https://buy.paddle.com https://sandbox-buy.paddle.com; connect-src 'self' https://*.paddle.com; img-src 'self' data: https://*.paddle.com; style-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'"
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
- **`Permissions-Policy` allows `payment` for Paddle's frame**, so Apple Pay and Google Pay
  work in it. The app's own origin keeps what it has (keksdose's `payment=()`).
- **No `Cross-Origin-Opener-Policy: same-origin`:** on a domain not verified for Apple Pay,
  Paddle opens Apple Pay in a popup from a Paddle domain.
- **The Apple Pay file** answers 200 without a redirect, as Paddle's verification requires.
- **noindex** on every answer; no `robots.txt` Disallow, which would hide the header from
  the crawler (keksdose's rule).
- **Nothing else is served:** no `/api` proxy, no service worker, no cookie. None of the
  three backends sets a cookie today (no `set_cookie`); a future one stays host-only (no
  `Domain=`), and no CORS allow-list names the pay host.
- **`PAY_HOST`** is set on the web service. Unset, the block answers `pay.invalid`, which
  never matches. Caddy picks the block by host name, so the app's `:{$PORT}` block stays
  the catch-all.
- **Locally**, the same files on a second localhost port, which is a separate origin too:
  Compose's Caddy (`deploy/Caddyfile` in keksdose and Kurvenschmiede) gets a second site
  block. Paddle's sandbox approves domains at once.

**One-time manual steps per app** (its deploy README):
1. DNS: `pay` as a CNAME to `ghs.googlehosted.com`, DNS-only in Cloudflare, like the apex.
2. `gcloud run domain-mappings create --service=<app>-web --domain=pay.<app domain>
   --region=europe-west4` (all three run there); a subdomain inherits the domain's
   verification. Then `PAY_HOST=pay.<app domain>` on `<app>-web`.
3. Paddle → Checkout → Website approval: add `pay.<app domain>`. Paddle reviews every
   domain or subdomain a checkout opens from; the sandbox approves at once. The review
   wants the product, the prices, the terms, the refund policy and the privacy policy easy
   to find; they may sit on the main domain, and the page's footer links them.
4. Paddle → Website approval → Apple Pay verification: "Verify" the pay host. It is
   optional; without it Paddle opens Apple Pay in a popup.
5. A client-side token per app (Paddle → Developer tools → Authentication), so one can be
   revoked alone. It goes to the web build with the environment.
6. `<APP>_BILLING_CHECKOUT_PAGE_URL=https://pay.<app domain>/` on the backend.

**Per app** (kastlan's and Kurvenschmiede's reviews):
- **kastlan** sends no CSP (no header in `deploy/gcp/Caddyfile.cloudrun`, no meta), so its
  review's "allow Paddle in the CSP" was a no-op; it stays one, since the app never loads
  Paddle.js. There is no `/pay` route inside `AppLayout`'s lock (`app/routes.tsx:46-82`).
- **keksdose** keeps its app CSP and `payment=()` as they are. The tests that read the CSP
  from its two Caddyfiles (`frontend/src/app/__tests__/plausible-wiring.test.ts:30-38`,
  `csp-inline-script.test.ts`) read the app's block, not the pay host's.
- **Kurvenschmiede** needs none of its review's `/pay` route items: no `PUBLIC_PATHS` entry
  (`client.ts:55`), no `useLastVisitedPage` exclusion (`layout.tsx:36`), no `@noindex`
  matcher (`Caddyfile.cloudrun:48`, `deploy/Caddyfile:19`). The token and the environment
  are the web image's build arguments for the pay page, not `VITE_` settings. It sends no
  app CSP either.

#### The way back

**ui-kit 0.33** (`src/billing/checkout-return.ts`): keksdose's `checkout-return.ts`, made
router-agnostic.

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
 *  poll, one landing. */
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
3. **One state for every instance** (keksdose's review): keksdose mounts the hook twice,
   app-wide in its banner (`billing-banner.tsx:68`) and on the subscription page
   (`subscription-cards.tsx:119`), sharing one zustand store today
   (`checkout-return.ts:73-95`). The kit's store is module-level: the first instance that
   sees the marker consumes it, one timer polls with the latest mounted `refetch`, and
   `onLanded` runs once.
4. **The hook polls through the app's `refetch`.** The draft's "take `overview`, return
   `pollEvery` for that query's `refetchInterval`" was circular; keksdose owns its query
   (`checkout-return.ts:132`). The app shows `BillingBanner kind="processing"
   onAction={checkAgain}`; the labels `processing` and `checkAgain` exist. This is §12.21.
   An app's `refetchOnWindowFocus` doesn't matter (Kurvenschmiede has it off,
   `query-client.ts:7`).
5. **The kit has no router:** the app says whether the URL returned and how to drop the
   marker.
6. **The mark is a browser entry** on the app's origin, so an app whose privacy text lists
   its entries names it (Kurvenschmiede passes its own `storageKey`, §14.14).

kastlan's own poll (`features/billing/components/subscription-section.tsx:25-75`) waits
60 seconds for `paidPlan`, which is `source === "provider"` and active or past_due
(:36-41). A grant or beta payer who buys never matches it, and "processing" stays until a
reload. The hook replaces it.

**Open (sandbox):** the pay host end to end, and the CSP it needs (§14.15).

### 14.5 Whether the payer reached the provider (decision 22)

1. **`GET /billing/overview` carries `at_provider: bool`:** a provider customer exists for
   this payer. It doesn't depend on the status or the source.
   - server-kit: `BillingOverview.at_provider: bool = False`, set by `from_row` from
     `row.provider_customer_id is not None`.
   - The `SubscriptionRow` Protocol gains `provider_customer_id: str | None`. All three
     apps' rows have the column (kastlan `domain/models/billing.py:51`, keksdose
     `domain/models/subscription.py:59`, Kurvenschmiede `domain/models/billing.py:63`), as
     has the kit's test `Row`; only hand-made fakes without it break.
2. **Without one**, the subscription page shows a caption in place of "Payment and
   invoices" and "Cancel subscription". **With one, both show, whatever the status or
   source** (§12.26): a payer who bought under a grant keeps the way to the invoices and
   to "Cancel".
3. **A portal request without one answers `409 billing_not_at_provider`**, for a stale
   page. It replaces kastlan's uncoded 409 (`adapters/billing/paddle_provider.py:42`),
   keksdose's uncoded 404 (`adapters/api/billing_router.py:125-126`) and Kurvenschmiede's
   503 (`adapters/api/billing_router.py:107`).
4. **`POST /billing/portal` takes an optional body** `PortalRequest {target: "overview" |
   "cancel" | "payment_method" = "overview"}` (`extra="forbid"`). The link is never
   stored. The targets (kastlan's and keksdose's reviews):
   - "Payment and invoices": `overview`;
   - "Cancel subscription": `cancel`, the portal's cancel link for the subscription
     (§12.26). kastlan's `onCancel` opens the overview today
     (`features/billing/components/subscription-section.tsx:137`);
   - the payment-failed banner's action: `payment_method`. keksdose's opens the overview
     today (`features/billing/billing-banner.tsx:89-90`).

**ui-kit 0.33:**

```ts
export type BillingErrorCode = … | "billing_not_at_provider";     // with the other three, §14.2
export interface SubscriptionActionsProps {
  /** The overview's at_provider. False: a caption in place of both actions.
   *  Default true (0.32's behaviour). */
  atProvider?: boolean;
}
export interface BillingLabels {
  /** "Nothing to manage yet. Payments and invoices appear here once you have a paid plan." */
  notAtProvider: string;
}
```

`billing.notAtProvider` comes in all seven languages, and in `src/i18n/review.ts` if it
lists the key. The apps' `BillingOverview` types gain `at_provider`. Two are
hand-written, so no mirror test catches a missing field: kastlan's
`features/billing/types.ts:33-45` and Kurvenschmiede's `shared/types/billing.ts:15-27`,
which its `mirror.test.ts` exempts.

### 14.6 A second checkout while subscribed (decision 21)

- **Today** a second checkout creates a second Paddle subscription, and the payer is
  charged twice; `dispatch` just moves the row's link. No app stops it.
- **server-kit:** `require_new_checkout(row, now)` raises `409
  billing_already_subscribed` while a provider subscription runs. Each app calls it in
  `POST /billing/checkout` before creating the transaction. A subscription already set to
  cancel at the period's end doesn't block a new checkout.
- **"Runs" must include a payer who bought under a grant.** While a grant holds, the
  webhook writes the subscription's link, period end and `cancel_at_period_end` but keeps
  the grant's status and source (`row_changes`, §12.11). The audit's draft test
  (`provider_subscription_id` set, `source = provider`, status `active`, `trialing` or
  `past_due`, not `cancel_at_period_end`) misses that payer. server-kit settles the test
  with a case for it.
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
address and no words (kastlan's review). The app turns (payer, kind, ends_at, days_left)
into its own mail.

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
```

- **The trial** is the cardless one: `trialing`, `source` not `provider`, `trial_ends_at`
  set.
- **The grant's end** is `effective_comped_until`, so a beta row without an end counts as
  launch + 12 months (§3.2). kastlan's `due_notices` reads the stored end only, which
  is wrong for keksdose's and Kurvenschmiede's beta rows.
- **No grant notice while the provider's paid period runs past the grant's end:** that
  payer already pays.
- **ENDING** from `ahead` before the end; **ENDED** from the end until `late_limit` after
  it. A missed ENDING is skipped, never sent after the end, and a first run doesn't mail
  every long-ended trial.
- **`None` when `sent` is this notice's key.** The marker makes the job idempotent across
  missed runs, Cloud Scheduler's retries and double runs.

**The app's job**, wherever it runs:
1. **nothing while billing is off:** it returns at once, and a token route answers 200
   with nothing sent, so the Scheduler job doesn't fail every day;
2. select the rows with `status IN NOTICE_STATUSES`, with the RLS bypass (few rows;
   filter in Python);
3. **skip a payer whose account is deactivated or has a deletion request**
   (Kurvenschmiede's and keksdose's reviews). A deletion-requested account keeps its
   subscription row until the erasure (Kurvenschmiede `erasure_service.py:305`), and "a
   deactivated account is sent nothing" is already each app's rule (keksdose
   `push_notifications.py:770`, Kurvenschmiede's CLAUDE.md). kastlan skips a company
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

**The marker:** a new column on each app's subscription row, `billing_notice_sent
VARCHAR(64) NULL`.

**The trigger:**
- **The token goes in a header, never in the query string** (Kurvenschmiede's review):
  Cloud Run's request logs record the URL with its query. The route reads `X-Jobs-Token`
  and compares it in constant time with the app's `<APP>_JOBS_TOKEN` secret; a missing or
  wrong token answers 401. Cloud Scheduler's HTTP jobs send it with `--headers`.
  keksdose's Pub/Sub receiver keeps its `?token=`, since a push subscription can't send a
  header.
- **Kurvenschmiede:** `POST /api/v1/ops/billing-notices`, one daily Cloud Scheduler HTTP
  job, the Cloud Scheduler API enabled in its project; no Cloud Run Job. Compose has no
  scheduler, and gets none: a local run calls the job through the app's billing CLI, or
  POSTs the route with the header.
- **kastlan:** every daily job moves to a token route (kastlan's review), not only the
  notices. Its in-process APScheduler runs `recurring_rent_daily`, `lease_status_daily`,
  `invoices_overdue_daily` and `assistant_retention_daily` beside the notices
  (`infrastructure/billing_scheduler.py:7-18`), and `main.py:150-153` starts it only
  when billing or recurring rent is on. So:
  - each job gets `POST /api/v1/ops/jobs/<name>` behind `X-Jobs-Token`
    (`KASTLAN_JOBS_TOKEN`), and one daily Cloud Scheduler HTTP job;
  - APScheduler runs only with `KASTLAN_SCHEDULER_ENABLED`, for local runs; production
    leaves it off (its hosting plan: off on autoscaled, scale-to-zero Cloud Run);
  - `lease_status_daily` never runs in production today, a kastlan defect (§14.14).
- **keksdose:** a `billing_notices` `JobSpec` in `infrastructure/job_registry.py` next to
  `notifications` (06:00 daily, :199-207), a Cloud Run Job that Cloud Scheduler starts
  through the Run API with its service account, so no token. Its deploy step and manual
  steps are in §14.14.
- **Cost:** Cloud Scheduler is free for three jobs per billing account and charged per job
  and month after that; keksdose is past the free three already.
- The kit offers no trigger helper in 0.7.

### 14.8 Cancelling at a deletion request, and undoing it (§12.23, §12.37)

```python
async def cancel_for_deletion(
    row: SubscriptionRow, client: BillingProviderClient
) -> CancelOutcome | None:
async def resume_after_withdrawal(
    row: SubscriptionRow, client: BillingProviderClient
) -> ResumeOutcome | None:
```

**`cancel_for_deletion`:**
- Lifted from keksdose (`billing_service.cancel_for_deletion`, :492-516, called from
  `account_deletion_service.py:229-233`).
- `None`: nothing to cancel (no `provider_subscription_id`, `canceled`, or already
  `cancel_at_period_end`).
- `expired` (Paddle's paused) cancels immediately; anything else at the period's end.
  **A change for keksdose** (its review): it skips `expired` today
  (`billing_service.py:504`). The kit cancels it, so nothing is left at Paddle for an
  account on its way to erasure.
- It never raises (decision 14): a failure is logged at ERROR ("cancel it by hand") and
  answered `"failed"`.
- The app calls it when the deletion is requested, not at erasure.
- **Each outcome goes into the request's audit detail** (kastlan's review): keksdose's
  `provider_cancellation`; kastlan's per flagged company, beside `companies_flagged`
  (`account_service.py:183`); Kurvenschmiede's in `erasure_service.request`'s entry.
- Paddle's side: a `past_due` subscription can be cancelled (it stays `past_due` to the
  period's end); a paused one only immediately; a cancellation at the period's end leaves
  it `active` with `scheduled_change.action = cancel`.

**`resume_after_withdrawal`** (new; kastlan's and keksdose's reviews). Nothing undid the
cancellation when an account came back: keksdose's reactivation clears the deletion
(`account_deletion_service.cancel`, :271-277), kastlan's too
(`admin_user_service.py:172-175`), and Kurvenschmiede's (`admin_service.py:310-313`), but
the subscription stayed set to end.
- **When:** an operator's reactivation that cancels a pending deletion, or a person's own
  withdrawal where an app offers one.
- **What:** the port's `remove_scheduled_cancel`, Paddle's `PATCH /subscriptions/{sub}
  {"scheduled_change": null}` (§14.2). The subscription stays `active`, and the row
  follows through the `subscription.updated` event it sends.
- **Only the cancellation the deletion made:** the app calls it only when the request's
  audit detail recorded `"cancelled"` for that row. A payer who had cancelled in the
  portal before asking to leave (the request then answered `None`) isn't re-subscribed.
- `None`: nothing to undo (no `provider_subscription_id`, `cancel_at_period_end` not
  set, or the subscription `canceled` or `expired`). **A subscription that was cancelled
  at once (it was paused) or whose period has ended is not resumed:** Paddle can't
  reinstate a cancelled subscription, and the payer subscribes again through a new
  checkout.
- It never raises: a failure is logged at ERROR ("remove the scheduled cancellation by
  hand") and answered `"failed"`, which goes into the reactivation's audit detail
  (`provider_resume`).

**The seam is module-level, not a FastAPI override** (keksdose's review). Both helpers run
in the service layer (keksdose's `cancel_for_deletion` at
`account_deletion_service.py:233`), where a request's dependency overrides don't reach.
Each app keeps one module-level function that answers
`billing_provider_client(get_settings())` (keksdose's seam,
`adapters/external/billing_provider.py:64-75`), and its tests replace it with the kit's
`FakeBillingProvider`.

### 14.9 Test helpers: `eifi1_server_kit.billing.testing`

- **In the wheel**, because the apps' local CLIs import it at runtime; not re-exported from
  `billing/__init__`; stdlib only, the API fake imports httpx lazily.
- **It replaces four copies of one recipe:** keksdose's and Kurvenschmiede's
  `billing_fixtures.py`, kastlan's hand signing in `tests/api/test_billing.py`
  (:361-395), and server-kit's own test helpers.

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

PADDLE_API_EXAMPLES: Mapping[str, dict[str, Any]]   # kastlan's test_paddle_client.py:22-69, trimmed
```

- **New:** a `cancel_scheduled` step, which the kit promotes to `subscription_canceled` and
  §12.26's "Cancel" produces; and a fake of the provider's API, which each app
  hand-wrote (kastlan `FakeProvider`, keksdose `Client` and `_Provider`).
- **The cancelled step** sends `current_billing_period: None` and `canceled_at`, as Paddle
  does; kastlan's kept the period.
- **`PADDLE_API_EXAMPLES`** are Paddle's documented examples. They are swapped for recorded
  sandbox answers once Marcel's sandbox account exists.
- **Each app keeps only its CLI** (argparse, the payer lookup, the local-only guard,
  `--end-grant`), about 50 lines.

### 14.10 Write locks

The lock kinds and `commit` scopes are §12.36 (decision 26). The apps' changes are in
§14.14.

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
- keksdose's own `usePlanLimitToast()` (`features/billing/plan-limit.tsx:32-43`) has no
  figure, no contact mode and no id, so it stacks on repeats. kastlan and Kurvenschmiede
  opt in where they toast a `plan_limit`, which neither does yet.

### 14.12 The operator's plan parts (decision 27)

All three apps have the route and server-kit's `PlanChangeRequest`/`Response`; only
keksdose has a UI:
- keksdose: the column (`features/admin/users-panel.tsx:706-745`) and `PlanConfirm`
  (`features/admin/user-admin-confirm.tsx:125-194`) on the kit's `AdminActionConfirm`;
- kastlan: the platform companies page (`features/platform/pages/platform-companies-page.tsx:52-61`)
  shows the raw plan code with no chip, and there is no grant dialog, though `POST
  /platform/companies/{id}/plan` exists (`adapters/api/platform_router.py:105-122`);
- Kurvenschmiede: nothing; `adminApi.changePlan` (`shared/api/endpoints.ts:237-239`) has
  no caller. Its roster rows carry no plan or status (`schemas/admin.py:30-76`;
  `admin_router.py:115` sends only `extra.owned`), and `GET /billing/plans` answers 404
  while billing is off (`billing_router.py:75`), though its `change_plan` works with
  billing off (its review).

```ts
/** The roster or list column: the plan's display name, the standing chip, and a usage line under it. */
export function planColumn<T>(options: {
  key?: string;                                         // "plan"
  plan: (row: T) => string | null;                      // the code, read case-insensitively (§12.16)
  planName: (code: string) => string;                   // the app's i18n (§3.1)
  status?: (row: T) => SubscriptionStatus | undefined;  // left out or undefined: no chip (billing off)
  usage?: (row: T) => { used: number; limit: number | null; label: string } | undefined;  // "1/5", tooltip "1 of 5 budgets"
  filterPlans?: readonly string[];                      // a select filter over these codes
  /** Default: by the plan code. A function: by its value (the catalogue's sort for rank
   *  order). false: not sortable. keksdose sorts by code (users-panel.tsx:739). */
  sortBy?: false | ((row: T) => string | number | null | undefined);
  headerText?: string;                                  // default labels.planChange.column
}): DataTableColumn<T>;

/** The grant: AdminActionConfirm at `acknowledge`, a plan Select, and the end of a free
 *  grant. Its confirm is COMMIT_EXCEPT_BILLING, built in (§12.36). */
export interface PlanChangeConfirmProps {
  target: AdminActionTarget;
  plans: readonly { code: string; name: string }[];
  current: string | null;
  usage?: ReactNode;                     // "3 of 5 budgets", the app's sentence
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
  limits?: Readonly<Record<string, number | null>>;
  usage?: Readonly<Record<string, number>>;         // the figures for the over-limit lines
  kept_beta?: boolean;
  comped_until?: string | null;
}
export type PlanChangeTone = "success" | "info" | "warning";
export interface PlanChangeLine { tone: PlanChangeTone; text: string }
/** The lines for a PlanChangeResponse, each with its tone, for the app's toast. */
export function usePlanChangeResult(): (
  res: PlanChangeOutcome,
  planName: (code: string) => string,
  options?: {
    dimensionLabels?: Readonly<Record<string, string>>;
    formatValue?: (dimension: string, value: number) => string;
  },
) => PlanChangeLine[];
```

- **The confirm** is held while nothing changes; "Free until" shows only with `grantEnd`;
  `comped_until` is sent only when given, as the **end** of the picked day in the
  operator's time zone (keksdose's `endOfDay`, `user-admin-confirm.tsx:44-46`, :160): a
  grant "until 31 January" lasts through it. A running beta keeps its end (§12.34,
  `kept_beta`). A `null` limit gives no usage line.
- **Built in `COMMIT_EXCEPT_BILLING`** (kastlan's review): an operator's plan change is an
  admin route (§12.13), and the operator's own account or company may be lapsed.
- **The lines and their tones** (keksdose's review): `changed(from, to)`, or `set(to)` with
  no previous plan: success; `keptBeta`: info; `untilDone(date)`: success; `overLimit`,
  then one `limitUsageLine` (§14.11) per dimension over the new limit, from `usage` and
  `limits`: warning. keksdose's figures (`budgets_owned`, `budget_limit`;
  `users-panel.tsx:533-549`) become `usage.budgets` and `limits.budgets`.
- **server-kit 0.7's `PlanChangeResponse`** gains what the lines read:
  `previous_plan: PlanCode | None` (keksdose's is nullable, `domain/schemas/admin.py:672`),
  `usage: dict[str, int]`, `kept_beta: bool = False` and `comped_until: datetime | None =
  None`. `of(…)` takes them.
- **Kurvenschmiede's `change_plan` overwrites a running beta**, a defect (§14.14): every
  app answers `kept_beta` as §12.34 says.
- **The server half** (Kurvenschmiede's review, for all three apps):
  - the roster's rows carry the plan and the status. keksdose's do (`plan`, `limits`,
    `subscription`; `domain/schemas/admin.py:413-426`); Kurvenschmiede's `GET /admin/users`
    gains both; kastlan's companies list carries the plan (`platform_router.py:81`) and
    gains the status;
  - the admin reads the plan codes whatever the switch: **`GET /admin/plans`** (kastlan
    `GET /platform/plans`), admins and the operator only, the catalogue's codes with their
    limits and sort and no prices. The dialog's plan list and the column's filter come
    from it; keksdose's hard-coded `USER_PLANS` (`features/admin/user-filter-params.ts`)
    gives way to it. `GET /billing/plans` stays the payer's and answers 404 while billing
    is off.
- **i18n:** a new `planChange` namespace in the seven languages: `column` "Plan", `title`
  and `confirm` "Change plan", `plan` "Plan", `current(plan)` "Current plan: {plan}",
  `keepsItems` "A smaller plan only blocks creating more; nothing is deleted.", `until`
  "Free until", `untilHint` "Leave empty for no end. A running beta keeps its own end.",
  `needsChange` "Pick another plan or an end date.", `changed(from, to)`, `set(to)` "Plan
  set to {to}.", `keptBeta` "The beta keeps its end; only the plan changed.",
  `untilDone(date)`, `overLimit` "Above the new plan's limit: nothing is removed, new
  items are blocked.", `usageOf(used, limit, dimension)`.

### 14.13 Lemon Squeezy (decision 25)

- **Deprecated in server-kit 0.7** (the docstrings and the changelog), **removed in 0.8:**
  `BillingProvider.LEMONSQUEEZY`, its mapper, statuses and signature check, `_price_ids`'
  int coercion for its variant ids (`settings.py:72-78`), and their tests.
- kastlan's ports say "Paddle or Lemon Squeezy"; that wording goes with the ports.
- Kurvenschmiede's `tests/api/test_billing.py:497` (on `refactor/plan-2026-10`; :458 on
  `main`) posts to `/webhooks/lemonsqueezy` for
  its "not this deployment's provider" 404. The path is a `BillingProvider` parameter
  (`billing_router.py:112`), so in 0.8 it answers 422, and the test changes then.
- §9's table stays as the record of the choice.

### 14.14 What each app changes

**All three:**
- install `eifi1-server-kit[billing,…]` and set `billing_app` in code; `.env.example` lists
  the new settings (§14.16, item 16);
- the provider through `billing_provider_client(settings)`, behind a module-level seam
  (§14.8); the checkout through `sold_plan` (422 `billing_plan_not_sold`) and
  `require_new_checkout`;
- the portal: 409 `billing_not_at_provider` before the provider; the page reads
  `at_provider`; "Cancel subscription" asks for `target: "cancel"` and the payment-failed
  banner for `target: "payment_method"` (§14.5);
- the webhook through `settings.verify_billing_webhook(…)` and `parse_webhook_event(…,
  app=settings.billing_app)`, which drops untagged events (§14.3);
- `cancel_for_deletion` at the deletion request and `resume_after_withdrawal` at a
  reactivation, each outcome in the audit (§12.37, §14.8);
- the notice column, job and trigger, skipping deactivated and deletion-requested
  accounts (§14.7);
- the tests through `billing.testing`;
- the roster's plan and status, and `GET /admin/plans` (§14.12);
- the pay host (§14.4): the second site block in the web container's Caddyfile, the build
  step that writes `pay-config.json`, `PAY_HOST`, the one-time DNS, domain-mapping and
  Paddle steps, and `<APP>_BILLING_CHECKOUT_PAGE_URL`;
- the frontend (ui-kit 0.33): `payPageUrl` on the way to the checkout;
  `noteCheckoutStarted`, `useCheckoutProcessing` and the processing banner;
  `SubscriptionActions atProvider`; the four new codes; the lock kinds (§12.36);
  `planColumn`, `PlanChangeConfirm` and `usePlanChangeResult`.

**kastlan** (`[billing,images,mail]`)
- **Defects found:**
  - **Its app-wide lock blocks what §3.3 and §12.13 allow.** One combined lock wraps the
    whole app (`frontend/src/app/app-layout.tsx:74-77`, the provider round `<Outlet/>` at
    :182-184), its sources carry no kind, and there is no `locked={false}` anywhere. So
    under a lapsed company these are locked: SessionsSetting
    (`features/settings/components/sessions-card.tsx:20`), DeleteAccountSetting
    (`delete-account-card.tsx:18`), EmailChangeSetting (`email-change-card.tsx:24`),
    ProfileSetting (`settings-page.tsx:180`) and InvitationsPanel's revoke
    (`invitations-card.tsx:46`). Fix: `kind: "demo"` and `kind: "billing"` on its sources
    at :74-77; the kit's parts then reopen by themselves.
  - **Its own controls of the same sort are locked too** (its review):
    - leaving a company (`features/settings/components/companies-card.tsx:26`), new 2FA
      backup codes (`backup-codes-card.tsx:21`), and the operator's pages, admin routes of
      §12.13 (`features/platform/pages/platform-company-detail-page.tsx:186`,
      `platform-signup-invitations-page.tsx:72`, :119, :126). Fix: `commit=
      {COMMIT_EXCEPT_BILLING}`;
    - the help assistant isn't locked under billing, though its backend answers 402. Fix:
      `{ except: ["demo"] }`;
    - right as they are: the roles in `users-panel.tsx:487` stay locked; PlanCard and
      SubscriptionActions don't commit.
  - **The webhook ignores the signature tolerance** (`adapters/api/billing_webhook_router.py:47`):
    a Cloud Run cold start answers 400 until Paddle's retry lands warm. Fix:
    `verify_billing_webhook`, and `app=` for `parse_webhook_event` (:49).
  - **No cancellation at the deletion request, and nothing undoes one.**
    `account_service.py:154-195` flags one-person companies (:171-173) and cancels
    nothing; a reactivation clears the deletion (`admin_user_service.py:172-175`) and
    resumes nothing. Fix: `cancel_for_deletion` for each flagged company's row, the
    outcome per company in the audit detail beside `companies_flagged` (:183), and
    `resume_after_withdrawal` at the reactivation.
  - **A reactivation left the company's deletion flag** (`company.deletion_requested_at`).
    kastlan's local `fix/deletion-and-scheduler` clears it (54fb6cb).
  - **`lease_status_daily` never runs in production:** the in-process scheduler starts only
    with billing or recurring rent on (`main.py:150-153`), so a lease stays active past
    its end. kastlan's local `fix/deletion-and-scheduler` runs the sweep at every start
    meanwhile (5960504); the token routes replace both (§14.7).
  - **An unsold plan answers 503** `billing_not_configured`
    (`domain/services/billing_service.py:213-214`); keksdose and Kurvenschmiede answer
    422. Fix: `sold_plan`, 422 `billing_plan_not_sold`.
  - **Invoices and "Cancel" are hidden under a grant:** the actions show only when
    `source === "provider"` (`features/billing/components/subscription-section.tsx:134`),
    against §12.26, and `onCancel` (:137) opens the portal's overview. Fix:
    `atProvider={data.at_provider}` and `target: "cancel"`.
  - **The checkout poll misses a payer who buys under a grant** (§14.4). Fix: the kit's
    hook in place of `subscription-section.tsx:25-75` and `paidPlan`.
  - **The notice job logs instead of mailing** (`infrastructure/billing_scheduler.py:38-51`,
    `BillingService.due_notices`, `billing_service.py:250-275`). It has no sent marker, so
    the same company is "noticed" daily for about 8 days, and it sits in the in-process
    scheduler its hosting plan rules out for Cloud Run.
- **Delete:** `kastlan/adapters/billing/` (`paddle_client.py`, `paddle_provider.py`,
  `__init__.py`); `domain/ports/billing_provider.py`; `tests/unit/test_paddle_client.py`;
  in `tests/api/test_billing.py`, `FakeProvider` (:60-68), `_paddle` (:232-235),
  `_paddle_event` (:361-389) and `_signed` (:392-395); `billing_api_base_url`
  (`infrastructure/config.py:130`, for `KASTLAN_BILLING_ENVIRONMENT`). The hosted-checkout
  field (:134) becomes the kit's, under the same env name.
- **Change:**
  - `get_billing_provider()` (`adapters/api/billing_router.py:42-53`) returns
    `billing_provider_client(settings)`;
  - `BillingService.checkout` drops `return_url`, and with it `CHECKOUT_RETURN_PATH`
    (`billing_router.py:39`), which was never sent; the pay page's `returnUrl` is
    `https://kastlan.app/admin/billing`;
  - `due_notices` becomes `billing_notice_due`, the `billing_notice_sent` column and the
    mail. It answered `(company_id, kind, ends_at)`; the recipients (the company's active
    admins, each in their own locale) and the texts in its four languages are kastlan's;
  - **every daily job on a token route** (§14.7): `recurring_rent_daily`,
    `lease_status_daily`, `invoices_overdue_daily`, `assistant_retention_daily` and the
    notices, each `POST /api/v1/ops/jobs/<name>` behind `X-Jobs-Token`, with a daily
    Cloud Scheduler HTTP job; APScheduler only with `KASTLAN_SCHEDULER_ENABLED`, for
    local runs. `docs/gcp-hosting-plan.md:149-160` still names `_snapshot_job` and
    `_overage_job`, which are gone;
  - the platform companies page gains `planColumn` and `PlanChangeConfirm` (the company
    is the target: `AdminActionTarget` without an email), its list the status, and
    `GET /platform/plans` (§14.12);
  - `features/billing/types.ts:33-45` gains `at_provider`;
  - **deploy** (its review): `deploy/gcp/.env.gcp.example:29`
    `KASTLAN_BILLING_API_BASE_URL` becomes `KASTLAN_BILLING_ENVIRONMENT`;
    `cloudbuild.yaml` gains `KASTLAN_BILLING_CHECKOUT_PAGE_URL`, the `KASTLAN_JOBS_TOKEN`
    secret, and the Paddle client-side token and environment as the web image's build
    arguments for the pay page; `PAY_HOST=pay.kastlan.app` on `kastlan-web`;
  - **tests:** `_paddle` builds `PaddleClient("pdl_test")`, a key without a prefix, so the
    kit's client needs `environment="sandbox"` there (or the test uses `PaddleApiFake`).
- **Keep:** the company payer (`PAYER_PREFIX = "company:"`, `find_payer_row`, `apply_event`
  with naive datetimes, the RLS-bypass session in the webhook), `billing_admin`,
  `KastlanBillingStatus`, `KastlanPlanOut.current`, the `/admin/billing` path,
  `DEFAULT_CURRENCY = CHF`, `EntitlementService`, `_date_beta_grants`, and `due_notices`'
  recipients and channel. It sends no CSP, and its app needs none for Paddle (§14.4).

**keksdose** (`[billing,images]`)
- **Already right:** it passes the tolerance (`adapters/api/billing_router.py:155`, with
  `billing_signature_tolerance = 60`) and cancels at the deletion request. Its payer
  reference is `user:<id>` (`billing_service.py:363-366`), so the app tag needs no data
  migration.
- **Found by its review:**
  - Paddle.js can't run on its origin: the reason for the pay host (decision 19 as
    amended, §14.4);
  - a reactivation doesn't undo the deletion's cancellation
    (`account_deletion_service.py:271-277`). Fix: `resume_after_withdrawal`.
- **Delete:**
  - in `adapters/external/billing_provider.py`, the port and `NoProviderClient`; the seam
    (:64-75) stays and answers the kit's client (§14.8);
  - in `billing_fixtures.py`, `STEPS` (:56-62), `_PERIOD` (:65-70), `paddle_event`
    (:73-111) and `sign_paddle` (:114-119); the CLI (:143-176) stays, shorter;
  - `billing_service.cancel_for_deletion` (:492-516), for the kit's, which also cancels an
    `expired` (paused) subscription (§14.8); the audit's `provider_cancellation` detail
    stays;
  - the test fakes `Client` (`tests/api/test_billing_webhook.py:373-384`) and `_Provider`
    (`test_billing_leaving.py:27`);
  - `LockKindContext` and `useWriteLockKind` (`features/budgets/write-lock.tsx:68`,
    :111-113);
  - its own `usePlanLimitToast` (`features/billing/plan-limit.tsx:32-43`);
  - `PlanConfirm`, the plan column and `USER_PLANS`, for the kit's parts and
    `GET /admin/plans` (the summary chips by plan stay).
- **Change:**
  - `billing_client()` becomes `billing_provider_client(get_settings())` behind the
    module-level seam; tests replace it with the kit's `FakeBillingProvider` (a FastAPI
    override can't reach `cancel_for_deletion`, which runs in the service layer);
  - the checkout drops `email` and uses `sold_plan(…, sold=SOLD)`;
  - the portal's uncoded 404 (`billing_router.py:125-126`) becomes 409
    `billing_not_at_provider`; the frontend drops its status sniff and
    `billing.no_provider_subscription` (`features/billing/subscription-cards.tsx:44-62`)
    for `atProvider`; the payment-failed banner (`billing-banner.tsx:89-90`) asks for
    `target: "payment_method"`;
  - **the `billing_notices` Job** (§14.7; its review):
    - a `JobSpec` next to `notifications` (`job_registry.py:199-207`), the import-time
      asserts (`jobs.py:164`, `scheduler.py`) and the deploy README's job table row,
      which `tests/api/test_admin_health.py` pins;
    - its cloudbuild step carries the mail settings (`KEKSDOSE_EMAIL_BACKEND`,
      `KEKSDOSE_EMAIL_FROM`, the `KEKSDOSE_RESEND_API_KEY` secret,
      `KEKSDOSE_APP_BASE_URL`) and `KEKSDOSE_BILLING_ENABLED` and
      `KEKSDOSE_BILLING_LAUNCH_AT`, none of which the `notifications` Job carries
      (`cloudbuild.yaml:495-514`);
    - by hand, once: the `run.invoker` binding on the Job (without it Cloud Scheduler gets
      PERMISSION_DENIED and nothing says so, `deploy/gcp/README.md:238-250`) and
      `gcloud scheduler jobs create http`;
    - mails in its four locales;
  - `checkout-return.ts` shrinks to calls into the kit. Its two mounts
    (`billing-banner.tsx:68`, `subscription-cards.tsx:119`) share the kit's store, and the
    overview query (:132) hands the hook its `refetch`;
  - kinds in `BudgetWriteLock` (`write-lock.tsx:94-97`); `budgets-page.tsx:570` and
    `invoice-review.tsx:646` become `commit={COMMIT_EXCEPT_BILLING}`;
    `PasswordDangerCard.commit` (`shared/components/password-danger-card.tsx:87`) widens
    to `CommitScope`. The `locked={false}` account-card wrappers stay: they also undo the
    demo budget's lock, which is budget-scoped, not account-scoped;
  - the pay host's site block in `deploy/gcp/Caddyfile.cloudrun` and `deploy/Caddyfile`;
    the CSP tests read the app's block (§14.4); `KEKSDOSE_CORS_EXTRA_ORIGINS` never names
    the pay host;
  - the plan change's toast from `usePlanChangeResult`'s lines and tones; `planColumn`
    with `sortBy` (`users-panel.tsx:739`).
- **Keep:** `payer_ref`, `payer_row_for`, `EventTable`, `currency_of`, the `SOLD` filter,
  `refused_for_demo`, the webhook's provider check, and the app's CSP and
  `Permissions-Policy`.

**Kurvenschmiede** (`[billing,mail]`: it sends through `mail.ResendClient`,
`infrastructure/email.py:36`, :89, and gets httpx today only through its own dependency)
- **Defects found:**
  - **The webhook ignores the signature tolerance** (`adapters/api/billing_router.py:129`),
    and `.env.example` says the tolerance of 60 takes effect, which it doesn't until :129
    passes it. Fix: `verify_billing_webhook`, and the note corrected.
  - **No cancellation at the deletion request** (`erasure_service.py:285-320`), and nothing
    undoes one at a reactivation (`admin_service.py:310-313`). Fix: `cancel_for_deletion`
    in `erasure_service.request`, `resume_after_withdrawal` at the reactivation.
  - **No provider client:** the checkout and the portal end in 503
    (`billing_router.py:79-95`, :107; `billing_service.no_provider_client`, :263-266).
  - **No way back after checkout** (`features/billing/subscription-settings.tsx:42-44`,
    :66-71).
  - **No trigger for §12.22:** it has no scheduler at all, so a cardless trial gets no mail.
  - **The kit's `ShareDialog` is wrapped in `locked={false}`**
    (`share-dialog.tsx:92-99`, :152): a lapsed owner sees Add and the role toggle live and
    learns only from the 402 in the error line. Dropping the wrapper alone leaves share
    dialogs with no lock at all (its review): `session-page.tsx:365` mounts `ShareButton`
    before its provider opens at :366, `projects-page.tsx:135` has none, and
    `SharedBanner`'s "Copy to my account" (`sharing-bar.tsx`) sits outside any lock. Fix:
    `ShareDialog` wraps its card in the owner's billing lock (`useBillingWriteLock`, kind
    `"billing"`) in place of `locked={false}`; "Copy to my account", a create (§12.14),
    gets the copier's.
  - **Its lock hooks drop the kind:** `Lock` (`write-lock.tsx:26-31`) is `{locked,
    reason}`, `useRowLock` and `useOwnerLock` return that (:54, :69, the reason
    stringified), and `useBillingLock` (`use-billing.ts:78-82`) has no kind. Fix:
    `useBillingLock` becomes the kit's `useBillingWriteLock`, and both hooks return the
    combined lock with its `holds`.
  - **F37: adding and re-inviting team members pass no billing gate**
    (`teams_router.py:103-123`, add, which may invite; :126-146, resend), and
    `team-card.tsx` has no lock. Fix (Marcel: the manager's own standing counts):
    `refuse_create(session, user, …)` in both, and a billing lock on add and resend.
  - **`change_plan` overwrites a running beta** (`billing_service.change_plan`, main
    :213-259, the overwrite :243-244): a pre-launch change with no end turns a beta into
    a lifetime grant, against §12.34 and server-kit's `PlanChangeRequest` docstring
    (`schemas.py:272-282`), and with no `kept_beta` PlanChangeConfirm's "a running beta
    keeps its own end" is false here. Fix: keep a running beta and answer `kept_beta`;
    `shared/types/billing.ts:44-49` gains it.
  - **F36's duplicate half:** `EventTable.record` (main :290-300) lets a raced duplicate's
    `IntegrityError` escape (a 500, then Paddle's retry) instead of raising
    `DuplicateEventError`. Fix: insert inside `session.begin_nested()`, catch the
    `IntegrityError` and raise `DuplicateEventError`.
  - **An untagged foreign event could match its row:** `payer_row_for` (main :311-329)
    falls back to `provider_customer_id`. Fixed in the kit: once `billing_app` is set,
    untagged events are dropped at parse (§14.3).
- **Delete:** `billing_service.no_provider_client` (main :263-266) and the module
  docstring's note that the client is missing (:28-32); in `billing_fixtures.py`, `STEPS`
  (:59-65), `_PERIOD` (:68-73), `paddle_event` (:76-114) and `sign_paddle` (:117-122);
  the CLI (:147-186) stays.
- **Change:**
  - the checkout and the portal call the kit's client (`billing_router.py:95`, :107);
    `billing_app = "kurvenschmiede"` (`settings.py:124`); `parse_webhook_event(…,
    app=settings.billing_app)` at `billing_router.py:130`; checkouts carry
    `checkout_custom_data_for` (main :262-265);
  - `noteCheckoutStarted` before `goTo(payPageUrl(url, locale))`, the hook and the banner
    in `SubscriptionSettings`, and the return to `/settings/subscription?checkout=done`.
    `useBillingOverview` (`use-billing.ts:57-66`) hands the hook its `refetch`; its
    comment "read again on focus" (:54-56) goes, since `refetchOnWindowFocus` is off
    (`query-client.ts:7`). The hook's mark is a new browser entry, so Kurvenschmiede
    passes its own `storageKey` and its privacy text lists it (`legal-pages.tsx:9-18`);
  - kinds `"access"`, `"customer"` and `"billing"` in `useRowLock` and `useOwnerLock`
    (`features/sharing/write-lock.tsx:44-70`), returning the combined lock; the owner's
    lock in `ShareDialog`; the teams gate (above);
  - **the notices** (§14.7; its review): migration 0049 and the model's
    `billing_notice_sent`; `POST /api/v1/ops/billing-notices` behind `X-Jobs-Token`, with
    `KURVENSCHMIEDE_JOBS_TOKEN` a secret in `cloudbuild.yaml:131`;
    `cloudscheduler.googleapis.com` in the deploy README's §1; its §7 and §8 (:216-232)
    and CLAUDE.md's "nothing runs on a schedule" rewritten; a local run through the
    billing CLI, since Compose has no trigger;
  - `planColumn` and `PlanChangeConfirm` on the user roster, calling
    `adminApi.changePlan`; `GET /admin/users` rows gain `plan` and `status`;
    `GET /admin/plans` (§14.12);
  - its hand-written `BillingOverview` (`shared/types/billing.ts:15-27`) gains
    `at_provider`; `mirror.test.ts` exempts the file, so nothing fails if it is forgotten;
  - **the pay host** (§14.4): `KURVENSCHMIEDE_BILLING_CHECKOUT_PAGE_URL` in
    `cloudbuild.yaml:129`; the client-side token and the environment as the web image's
    build arguments for the pay page (`deploy/gcp/Dockerfile.web`, cloudbuild); the
    second site block in both Caddyfiles. Its review's `/pay` route items fall away;
  - `.env.example` lists the new settings, or `tests/unit/test_docs.py:63-65` (on
    `refactor/plan-2026-10`) fails the bump (§14.16, item 16);
  - `tests/api/test_billing.py:497` (on `refactor/plan-2026-10`) before 0.8 (§14.13).
- **Keep:** `payer_ref`, `payer_row_for`, `PAYER_ROLES`, `currency_of`, `not_in_the_demo`,
  `GRANTED_PLAN`, `ensure_row`.

### 14.15 Open checks

None blocks the implementation; all come before billing goes on.
- **At signing, with Paddle:** one account may sell three brands on three approved
  domains (decision 18); CHF and the fees (§9); its DPA (§12.25).
- **With Paddle, in parallel:** hosted checkout on live (sellers@paddle.com), if it is
  still wanted.
- **In the sandbox:**
  - the portal's plan switch (§14.6);
  - the pay host end to end: Paddle.js opening the `_ptxn` transaction with the settings
    given to `Paddle.Initialize` (`successUrl`, `locale`), and the hosts its CSP needs;
    Paddle publishes no list (§14.4);
  - Apple Pay and Google Pay in Paddle's frame under the pay host's
    `Permissions-Policy`, and Apple Pay verification of each pay host;
  - what Paddle.js keeps on the pay host (cookies, storage), for the privacy texts
    (§12.25);
  - which link Paddle's own emails and payment-method updates carry: Paddle uses the
    account's default payment link for them, which is one app's pay host (§14.3);
  - removing a scheduled cancellation and the `subscription.updated` it sends (§14.8);
  - whether one person is one Paddle customer across the apps, and what the portal then
    lists (§14.3);
  - recorded answers in place of `PADDLE_API_EXAMPLES` (§14.9).

### 14.16 Settled after the reviews (2026-10-09)

The three apps reviewed §12.36, §12.37 and §14 on 2026-10-09: kastlan at b3adb8f
(`feat/paddle`), keksdose at 6a746d5f (`feat/kit-0.32`), Kurvenschmiede at `main` and
`refactor/plan-2026-10`. Marcel amended decisions 19 and 26; the rest was settled as the
reviewers proposed. The sections above are corrected in place, and this list is the
record. **ka**, **kk** and **KS** n are the reviews' items.

**The two amended decisions**
1. **The pay page is a static page on each app's pay host** (kk 1; decision 19 amended).
   The kit ships `dist/pay/` and a build script; each app writes `pay-config.json` at its
   web image's build and serves the page at `pay.<app domain>` from its web container,
   with headers of its own (§14.4).
2. **Lowering a role is allowed under a billing lock** (KS 9; decision 26 amended). Raising
   stays locked; ShareCard's toggle reads `roles` narrowest first (§12.36).

**Locks**
3. **PlanChangeConfirm is exempt from billing, built in** (ka 1), and kastlan's own
   controls of that sort take `COMMIT_EXCEPT_BILLING`: leaving a company, new backup
   codes, the operator's pages. Its assistant takes `{ except: ["demo"] }` (§14.14).
4. **Kurvenschmiede's locks** (KS 10, 11, 12): `ShareDialog` gets the owner's billing lock
   in place of `locked={false}`, "Copy to my account" the copier's; its hooks return the
   combined lock with `holds`, through `useBillingWriteLock`; adding and re-inviting team
   members follow the manager's own standing (F37; Marcel), with a lock on both (§14.14).

**The portal and the deletion**
5. **The portal's targets** (ka 4, kk 11): "Payment and invoices" `overview`, "Cancel
   subscription" `cancel`, the payment-failed banner `payment_method` (§14.5).
6. **A reactivation undoes the deletion's cancellation** (ka 5, kk 12):
   `resume_after_withdrawal`, through Paddle's `PATCH /subscriptions/{id}
   {"scheduled_change": null}`, verified in Paddle's docs. A subscription cancelled at
   once or past its period isn't resumed; the payer subscribes again (§12.37, §14.8).
7. **Each cancellation's outcome is audited** (ka 5), per company in kastlan, and the
   reactivation's too (§14.8). kastlan's reactivation also left the company's deletion
   flag, a defect its local branch fixes (§14.14).
8. **keksdose's paused subscriptions** (kk 12): the kit cancels an `expired` (paused)
   subscription at once, where keksdose skipped it. A behaviour change, noted (§14.8).
9. **The provider seam is module-level, not a FastAPI override** (kk 12):
   `cancel_for_deletion` runs in the service layer (§14.8).

**Notices** (§14.7)
10. **The kit answers per row** (ka 6): the kind, the end and the days left. Recipients,
    addresses and texts in every app locale are the app's.
11. **Who is skipped** (KS 17, kk 7): deactivated and deletion-requested accounts; nothing
    runs while billing is off.
12. **The trigger token goes in a header** (KS 17), `X-Jobs-Token`, never the query
    string, which Cloud Run's request logs record.
13. **kastlan moves every daily job to a token route** (ka 6), with
    `KASTLAN_SCHEDULER_ENABLED` for local runs. Its `lease_status_daily` never runs in
    production today, a kastlan defect (§14.14).
14. **keksdose's Job** (kk 7) needs the mail settings, the billing switch and launch date,
    the `run.invoker` binding and its Cloud Scheduler job (§14.14).
15. **Kurvenschmiede's notices** (KS 17): migration, column, token secret, the Cloud
    Scheduler API, its README and CLAUDE.md rewritten; a local run goes through the CLI
    (§14.14).

**Webhooks and settings**
16. **Untagged events are dropped once `billing_app` is set** (KS 15), and logged; they are
    never matched by `provider_customer_id`. No live data exists, so nothing migrates
    (keksdose confirms, §14.3). **The new settings**, each in the app's `.env.example`
    (Kurvenschmiede's `tests/unit/test_docs.py:63-65` requires every Settings field
    there):
    - all three: `<APP>_BILLING_APP` (set in code; listed as such),
      `<APP>_BILLING_ENVIRONMENT`, `<APP>_BILLING_CHECKOUT_PAGE_URL`,
      `<APP>_BILLING_HOSTED_CHECKOUT_URL`;
    - kastlan: `KASTLAN_JOBS_TOKEN` and `KASTLAN_SCHEDULER_ENABLED`;
      `KASTLAN_BILLING_API_BASE_URL` goes;
    - Kurvenschmiede: `KURVENSCHMIEDE_JOBS_TOKEN`;
    - keksdose: nothing more (its Job needs no token);
    - not backend settings: the web build's Paddle client-side token and environment, and
      the web service's `PAY_HOST` (§14.4).
17. **Duplicate events** (KS 18): Kurvenschmiede's `EventTable.record` raises
    `DuplicateEventError` for a raced duplicate (§14.14).
18. **Extras** (KS 19): Kurvenschmiede installs `[billing,mail]`; keksdose
    `[billing,images]` and kastlan `[billing,images,mail]` stand.

**The frontend parts**
19. **`useCheckoutProcessing`** (kk 8) shares one module-level store across instances and
    takes the overview query's `refetch`; it answers `{processing, checkAgain}` (§14.4).
20. **The pay page's locale** (kk 10): the page maps the kit's locales to Paddle's:
    `de-CH` → `de`, `zh` → `zh-Hans`, `hu` → `en` (Paddle has no Hungarian), checked
    against Paddle's list (§14.4).
21. **The plan change's result** (kk 9): `previous_plan` may be null; each line carries a
    tone (success; info for a kept beta; warning over the limit, with the figures);
    `comped_until` is the end of the picked day; `planColumn` takes `sortBy`. server-kit's
    `PlanChangeResponse` gains `usage`, `kept_beta` and `comped_until` (§14.12).
22. **Kurvenschmiede's `change_plan` keeps a running beta** (KS 13) and answers
    `kept_beta`; overwriting it is a defect (§14.14).
23. **The roster's server half** (KS 14): rows carry the plan and the status, and
    `GET /admin/plans` (kastlan `/platform/plans`) gives the admin the codes while billing
    is off (§14.12).
24. **Hand-written `BillingOverview` types** (ka 4, KS 20): kastlan's
    `features/billing/types.ts:33-45` and Kurvenschmiede's `shared/types/billing.ts:15-27`
    gain `at_provider` by hand (§14.5).

**Per app, re-stated**
25. **kastlan's deploy and tests** (ka 7): the environment setting in place of the base
    URL, the checkout page URL, the jobs token, the pay page's build arguments, and the
    test client's explicit environment (§14.14).
26. **The CSP notes** (ka 8, KS 16): no app CSP changes. kastlan's and Kurvenschmiede's
    send none; keksdose's stays. The pay host brings its own headers. Kurvenschmiede's
    `/pay` route items (`PUBLIC_PATHS`, `useLastVisitedPage`, `@noindex`) fall away;
    its checkout page URL, build arguments, the overview's `refetch`, the
    `refetchOnWindowFocus` comment and its own `storageKey` stay (§14.4, §14.14).
27. **Line references corrected** (ka 4, KS 21): kastlan's
    `features/billing/types.ts:33-45`; Kurvenschmiede's `no_provider_client` at main
    :263-266 and `tests/api/test_billing.py:497` on `refactor/plan-2026-10`; kastlan's
    flagged companies at `account_service.py:171-173`.
28. **Confirmed as written:** ka 2, 3, the rest of 4 and 5, and the delete list of 7;
    kk's checks (the write-lock kinds and `COMMIT_EXCEPT_BILLING` callers, the
    fingerprint and its bounds, `usePlanLimitToast`, the fixtures and seam lines, the
    portal's 404, the 60-second tolerance, `provider_customer_id`, the `notifications`
    `JobSpec`, the extras); KS's checks (no tolerance at :129, erasure cancels nothing,
    checkout and portal 503, `share-dialog.tsx:99` and :152, the fixtures, the
    write-lock hooks, `adminApi.changePlan` unused, the admin plan route, the share
    gates, `/settings/subscription`).
