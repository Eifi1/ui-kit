# Adopting `@eifi1/ui-kit` 0.40 and `eifi1-server-kit` 0.13

<!-- PLACEHOLDER (main session): the round's intro — Marcel's "Done with Keksdose tests. Run
all the open points for 0.40.0." (2026-10-16), the packages, and what waits for settle (the
feedback contract's §10). -->

## 1. What's new

### Billing (ui-kit 0.40, server-kit 0.13)

From keksdose's Paddle sandbox run of 2026-10-16 (`docs/billing-harmonization.md` §15.6).
- **`BillingOverview.switching`** (server-kit 0.13, `bool`, default false; optional in the
  TS type so an older server still type-checks, absent = false): a provider subscription
  runs, by the server's own rule — the one behind 409 `billing_already_subscribed` and 409
  `billing_not_subscribed`. True: a `PlanPicker` pick opens `PlanSwitchConfirm` (preview,
  then `POST /billing/plan`); false: the checkout. It replaces each app's client mirror of
  the rule (§15.2.10). `PlanPicker` takes no new prop: the app's `onChoose` still chooses.
- **The pay host's CSP (§14.4):** `style-src` gains `https://cdn.paddle.com
  https://sandbox-cdn.paddle.com`. Paddle.js loads its overlay stylesheet
  (`/paddle/v2/assets/css/paddle.css`) into the pay page itself — from `sandbox-cdn` in the
  sandbox, while the script comes from `cdn.paddle.com` — and §14.4's block refused it on
  every load (the only violation; the overlay's backdrop and close button lost their
  styles). In `style-src`, not `style-src-elem`, so browsers without `style-src-elem` load
  it too. Everything else Paddle loads sits inside its own frame.
- **server-kit 0.13:** Paddle's 4xx configuration codes
  (`transaction_checkout_url_domain_is_not_approved` and kin) answer 503
  `billing_not_configured`, the code in the log, no longer 502
  `billing_provider_unavailable`.
- **§15.6's sandbox notes**, for every app's sandbox and deploy notes:
  - in the sandbox use the **default payment link**: leave `<APP>_BILLING_CHECKOUT_PAGE_URL`
    unset. An explicit `checkout.url` needs an approved domain, and the sandbox has no
    approval UI (it refuses `localhost` too; tunnel the pay page);
  - **Google Pay is off by default:** Checkout → Checkout configuration, switch it on (no
    domain approval needed);
  - **a declined plan switch can't be arranged in the sandbox** (Paddle won't save the
    decline card as the method); the kits' tests cover it;
  - **Paddle's portal lists a plan switch as "Renewal"**;
  - **checkout step 1 is the e-mail and the country only**, the card after "Continue";
  - **domain approval and Apple Pay are live only.**

<!-- PLACEHOLDER (main session): DataTable (UD), overlays / pickers / Tabs /
FeedbackReplyComposer (UO), the feedback contract (FB), server-kit 0.13's other items. -->

## 2. Must-change, every app

### Billing

- **The pay block's CSP:** `style-src 'self' 'unsafe-inline' https://cdn.paddle.com
  https://sandbox-cdn.paddle.com` in every pay site block (Cloud Run and local Caddy), and
  any test pinning the header. Nothing else in the header changes.
- **Read `overview.switching`** where a plan pick chooses between the switch and the
  checkout, and drop the client's own reading of the rule. Keep the 409 fallbacks (a stale
  overview): `billing_not_subscribed` from the preview → the checkout,
  `billing_already_subscribed` from the checkout → the switch or a reload.
- **Sandbox `.env` and deploy notes:** `<APP>_BILLING_CHECKOUT_PAGE_URL` unset in the
  sandbox; set live only once Paddle approved the pay host. The README's "the sandbox
  approves at once" is wrong: the sandbox has no website approval.
- **The refusal map:** none new. A misconfigured checkout URL now reads as
  `billing_not_configured` ("not set up"), which the map already has.
- **Help text** (where the app has one): a plan switch shows as "Renewal" in Paddle's
  portal; the checkout's first step asks only for the e-mail and the country.

<!-- PLACEHOLDER (main session): the other packages' must-change items. -->

## 3. Per app

### keksdose

Billing:
- The pay blocks' `style-src`: `deploy/gcp/Caddyfile.cloudrun:260`, `deploy/Caddyfile:159`.
- `subscription-cards.tsx:202`: `subscribed` becomes `overview?.switching ?? false`; regenerate
  `openapi-schema.d.ts` for the field.
- Sandbox notes: `deploy/Caddyfile:150-155` (the local pay host goes behind a tunnel, the
  checkout page URL stays unset in the sandbox), `backend/.env.example:176`;
  `deploy/gcp/README.md:435` ("the sandbox approves at once") and `:446` (set only once
  approved). keksdose's page stays the default payment link.

<!-- PLACEHOLDER (main session): keksdose's other items. -->

### kastlan

Billing:
- The pay block's `style-src`: `deploy/gcp/Caddyfile.cloudrun:136`.
- `subscription-section.tsx:50-58`: drop `switching()`, read `data.switching`; add
  `switching?: boolean` to `features/billing/types.ts` (beside `paid`, `:50`).
- `deploy/gcp/README.md:355-362`: the sandbox has no website approval; step 6 only once
  approved; `.env.example:57`, `deploy/gcp/.env.gcp.example:32`: unset in the sandbox.

<!-- PLACEHOLDER (main session): kastlan's other items. -->

### Kurvenschmiede

Billing:
- The pay blocks' `style-src`: `deploy/gcp/Caddyfile.cloudrun:124`, `deploy/Caddyfile:78`;
  `backend/tests/unit/test_deploy_files.py:97-98` pins the new `style-src` beside
  `frame-src`.
- `subscription-settings.tsx:148-151`: `subscribed` becomes `now.switching ?? false` (the type
  comes from the kit, `shared/types/billing.ts:16`).
- `deploy/Caddyfile:70-74` and `.env.example:109`: unset in the sandbox;
  `deploy/gcp/README.md:384-385` ("the sandbox approves at once"); `cloudbuild.yaml:47-50`
  keeps the live URL.

<!-- PLACEHOLDER (main session): Kurvenschmiede's other items. -->

## 4. Versions

<!-- PLACEHOLDER (main session): `@eifi1/ui-kit` `^0.40.0`; `eifi1-server-kit` 0.13.0 wheel
URLs per app and the sha256. -->
