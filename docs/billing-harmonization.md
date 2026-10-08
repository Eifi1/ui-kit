# Billing, plans and payment — harmonisation plan

Status: **2026-10-07, reviewed.** All three apps answered the same day; §12 records what
they settled and Marcel's decisions after the reviews, and it wins over the sections above
where they differ. Led from ui-kit at Marcel's request. It runs in
parallel with the text-size round (`docs/text-size-harmonization.md`), and ships as
server-kit 0.6 and ui-kit 0.32 or the next minor after the reviews.

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

Still open for Marcel (they don't block the contract):
- **The provider** among the Merchants of Record (compared in §9 for the decision; Paddle
  recommended);
- **the plans, limits and prices** per app (proposed in §13, for local review);
- **the launch date** per app, which starts the beta users' 12 months.

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
  `source = beta`, `comped_until = launch + 12 months` (§2.4).
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
| `GET /billing/overview` | the payer (kastlan: a company admin) | `{plan, status, source, in_good_standing, trial_ends_at, comped_until, current_period_end, cancel_at_period_end, limits, usage, currency}` |
| `GET /billing/plans` | the payer | the catalogue with this payer's currency and the prices |
| `POST /billing/checkout {plan, interval, currency}` | the payer | `{url}`: the provider's hosted checkout |
| `POST /billing/portal` | the payer | `{url}`: the provider's hosted customer portal (payment method, invoices, cancel) |
| `POST /webhooks/<provider>` | the provider | signed events (§5) |
| `POST /admin/…/{id}/plan {plan, comped_until?, acknowledged}` | an admin or the operator | a manual plan or grant (§6) |

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

## 9. The provider (for Marcel's choice)

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
the contract. The fees and CHF support must be checked with the providers at signing;
this table is not a quote.

**Recommendation (2026-10-08):** Paddle. Decision 6 (prices in CHF and EUR) needs a
fixed price per currency, which Lemon Squeezy does not offer: a Swiss customer would be
charged a converted USD amount.

## 10. What the kits add

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

- **kastlan** (the most work):
  - the direct Stripe code (Elements, SetupIntent, invoice mirror, the overage poster) is
    replaced by the provider's hosted checkout and portal plus the webhook;
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
   (keksdose: recurring, bank sync, the two extract jobs, which also bill Gemini).

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
    the webhook may land after the person is back (Cloud Run scales to zero).
22. **Trial and grant end notices** (7 days before, and at the end) are an app's daily job:
    a cardless trial never reaches the provider.
23. **Deletion** (user-admin §6.4): cancel at the provider when the deletion is
    REQUESTED, or the provider keeps charging a deactivated account; the subscription
    row goes at erasure. Guests' notices say the shared item works until the paid period
    ends.

**Labels and legal**
24. **The settings group is "Subscription" in English** ("plan" already means keksdose's
    monthly budget plan); German "Tarif" for the plan, "Abonnement" for the subscription.
25. **The Merchant of Record is an independent controller** of the buyer's data, not our
    processor:
    - the privacy text names it as a recipient, links its notice, legal basis Art. 6(1)(b);
    - confirm against its DPA at signing.
26. **Consumer law in the provider's portal:** the EU withdrawal function (Directive (EU)
    2023/2673, from 19 June 2026) and Germany's cancellation button (§312k BGB), plus a
    visible "Cancel" link on the app's subscription page.
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

## 13. Proposed plans (Marcel, 2026-10-08)

Marcel: "Propose like that." Starting points, not market research. Billing stays off in
production; the apps wire these catalogues now so the whole path can be reviewed
locally (§13.4). Prices are gross (§12.17), the same figure in CHF and EUR, and yearly is
ten months.

### 13.1 kastlan: per company, by units

Every unit counts, parking, storage and cellars included (decision 13), so a building of
12 flats already holds about 36 units. Seats count staff only (decision 15).

| Code | `units` | `seats` | `storage_gb` | Month | Year |
|---|---|---|---|---|---|
| `starter` | 40 | 2 | 5 | 29 | 290 |
| `standard` | 150 | 5 | 25 | 79 | 790 |
| `professional` | 500 | 15 | 100 | 199 | 1,990 |

Above 500 units: an operator's grant at a quoted price (§3.4 "Ask for more"). This
replaces the placeholders CHF 49 / 149 / 399 for 50 / 250 / 1,000 units. Comparable:
ImmoSync (Switzerland) CHF 30 / 99 / 299; immocloud €39.99 up to 50 units.
Open: kastlan sells to businesses, which usually quote before VAT; §12.17 says gross.

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
  payment failed, cancelled. With a Paddle sandbox account (Marcel's), the hosted
  checkout and portal can be tried end to end.
- The price ids in the settings stay placeholders until the provider is chosen.

