# Billing, plans and payment — harmonisation plan

Status: **2026-10-07, draft for review.** Led from ui-kit at Marcel's request. It runs in
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

Still open for Marcel (they don't block the contract):
- **The provider** among the Merchants of Record (compared in §9 for the decision);
- **the plans, limits and prices** per app;
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
| Fee (published, to be checked at signing) | about 5 % + 0.50 per transaction | about 5 % + 0.50 per transaction |
| Switzerland and CHF | to be confirmed at signing | to be confirmed at signing |

The kit stays provider-agnostic (§5), so the choice changes a mapper and settings, not
the contract. The fees and CHF support must be checked with the providers at signing;
this table is not a quote.

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

## 12. Questions for the reviews

1. Which writes must stay allowed while read-only in your app, beyond billing, the
   account's settings and signing out (feedback? support?)?
2. kastlan: which of the current Stripe parts would you keep app-side when the provider
   hosts checkout and the portal?
3. Your plan dimensions: what does a limit count in your app?
4. Where do you create the payer, so the subscription row is created with it?
