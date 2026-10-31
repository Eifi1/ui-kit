# Adopting `@eifi1/ui-kit` 0.39 and `eifi1-server-kit` 0.12

Round 0.39 is the Paddle billing amendment, `docs/billing-harmonization.md` §15, settled by
Marcel on 2026-10-14 after the three apps' reviews:
- **each app keeps its own pay host** (`pay.keksdose.app`, `pay.kastlan.app`,
  `pay.kurvenschmiede.app`), and every pay page reads the app from the transaction, so the
  account's one default payment link (`pay.keksdose.app`) serves any app's checkout;
- **plan changes through the kits**: a preview, then the switch, immediate and prorated, a
  credit on a downgrade (Paddle can't schedule one);
- **one Paddle customer per e-mail address** across the apps; the portal listing all of a
  person's subscriptions is accepted; no app touches another app's subscription;
- kastlan's portal overview for the buying admin only.

It also ships two small items from round 0.37's adoptions: ui-kit's
`ApiTranslationReviewsResponse`, and server-kit's `can_review_kit` refusing every
area-limited grant (as `scope()` does).

Billing stays off until Marcel's Paddle sandbox run (§15.6's checklist). The steps below
can be adopted now; nothing charges anyone.

## 1. What's new

### ui-kit 0.39

- **The pay page serves any app:** it reads `custom_data.app` on `checkout.loaded`, shows
  that app's name, Terms and Privacy from `PAY_PAGE_APPS`, and returns to the app on
  `checkout.completed`. An unknown tag gets a neutral page.
- **`PlanSwitchConfirm`**: the prorated preview (the charge now or the credit, the next
  charge where Paddle names one, the dimensions over the new plan's limits), then the switch.
  It takes no write lock (`COMMIT_EXCEPT_BILLING`).
- `PaidPrice`, `PlanSwitchRequest`, `PlanSwitchPreview`, `BillingOverview.paid`; the codes
  `billing_not_subscribed`, `billing_plan_unchanged` and their words; `switch*` labels in seven
  languages; `alreadySubscribed` no longer points at the portal; `checkoutFingerprint` covers
  the paid plan and interval, so one storage key serves checkout and switch.
- `ApiTranslationReviewsResponse`, and the reviewer name's two parts on `ApiTranslationReview`.

### server-kit 0.12

- The port gains `preview_plan_change`, `change_plan` and `customer_for`; `checkout_url` takes
  `customer_email`. `require_plan_switch`, `switch_price` (422 `billing_plan_not_sold`, 409
  `billing_plan_unchanged`), `plan_switch_preview`, `PlanSwitchRequest`, `PlanSwitchPreview`,
  `PaidPrice`, `BillingOverview.paid`, `BUYER_KEY`, `NormalisedEvent.buyer`.
- `row_changes` writes `provider_price_id` from every snapshot.
- `can_review_kit` refuses every area-limited grant.

## 2. Breaking and must-change, every app

- **The pay page's bin:** `eifi1-pay-page --app <tag> [--app-url …]`; `--return-url`,
  `--app-name`, `--terms-url` and `--privacy-url` are refused (exit 2).
- **`provider_price_id`** on the subscription row: a migration adding `provider_price_id
  VARCHAR(200) NULL`; the webhook's `apply` writes it; pass `price_ref=settings.billing_price_ref`
  to `BillingOverview.from_row`.
- **`BillingOverview.paid`** is required in fixtures typed as `BillingOverview`.
- **The webhook's payer lookup drops its customer-id fallback**: with one customer per person
  it would land one app's or company's event on another.
- **Two routes:** `POST /billing/plan/preview` and `POST /billing/plan`
  (`require_plan_switch` → `switch_price(…, sold=SOLD)` → `preview_plan_change` /
  `change_plan` → `plan_switch_preview`), behind the app's demo guard and `billing_disabled`
  while off. While a provider subscription runs, a plan pick opens `PlanSwitchConfirm`
  instead of the checkout; `noteCheckoutStarted` before the switch, `?checkout=done` after.
- The checkout passes `customer_email=<sign-in e-mail>`; the API key gains customer read and
  write.
- The refusal map gains `notSubscribed` and `planUnchanged`.
- **No switch to a plan no longer sold**; a payer on one keeps it until switching away, and
  the picker never offers it.
- **The privacy text** about Paddle is written before billing goes live (keksdose's wording,
  billing §15).

## 3. Per app

### keksdose

- Both `Dockerfile.web`s: `eifi1-pay-page --app keksdose --app-url "$PAY_APP_URL"`. The pay
  block stays; `pay.keksdose.app` becomes the account's default payment link.
- The 409's docstring (`billing_router.py:107-110`) and `deploy/gcp/README.md`'s pay section
  follow §15; `subscription-cards.tsx:211-218` routes picks to the switch while subscribed.
- The payer lookup: drop `billing_service.py:432-438`.

### kastlan

- **Build its pay host** (`pay.kastlan.app`), as §14.4: `eifi1-pay-page --app kastlan`.
- `checkout_custom_data(…, buyer=f"user:{admin.id}")`; the webhook stores `event.buyer` as
  `provider_payer_user_id` (a new column); the portal's overview only for that user, the other
  admins the subscription's cancel and payment-method links.
- Any company ADMIN switches (`billing_router.py:35`). Drop `billing_service.py:313-330`'s
  customer-id fallback; `deploy/gcp/.env.gcp.example:32-33` and `.env.example:57-58` name the
  pay host.

### Kurvenschmiede

- Both `Dockerfile.web`s: `eifi1-pay-page --app kurvenschmiede --app-url …`;
  `test_deploy_files.py:123-142` pins the new flags. The pay block stays.
- The routes behind `not_in_the_demo` (classify them in `test_demo.py`'s walk);
  `KIT_BILLING_WORDS` (`client.ts:250-257`) gains the two codes; the switch reuses
  `kurvenschmiede.billingCheckout`; `subscription-settings.tsx:151-158` routes picks to the
  switch. Drop `billing_service.py:429-450`'s fallback.
- The translation review: `ApiTranslationReviewsResponse` replaces the local three-field type.

## 4. Versions

- **`@eifi1/ui-kit` `^0.39.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.12.0**, the release wheel by URL, extras as for 0.11, and the
  sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,fastapi,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.12.0/eifi1_server_kit-0.12.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,fastapi,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.12.0/eifi1_server_kit-0.12.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,fastapi,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.12.0/eifi1_server_kit-0.12.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `f7f410352deed79c96d09cc3adf7af013a67cbb71acbc6ab97673eea7e01f32b`

## 5. 0.39.1 (the apps' 0.39 findings)

Released on Marcel's word (2026-10-15) before every report was in. Nothing is removed.

- `PlanSwitchPreview`'s `next_minor` / `next_billed_at` are optional, as server-kit's
  defaults make them in an app's generated types (keksdose).
- `PAY_PAGE_APPS` spells kastlan "Kastlan", as its mails and pages do (kastlan).
- **The pay page's headers:** the kit ships no Caddy snippet; inline §14.4's header set in the
  pay block, as keksdose's Caddyfile does (kastlan).
- **Every image build runs the bin, billing on or off:** with empty `--token`, `--environment`
  and `--app-url` it exits 0 and writes `token: null` — the page then says it can't take a
  payment (kastlan).
- **Queued for the next round:** a server-computed `switching` flag on `BillingOverview`, so
  no app mirrors server-kit's "a provider subscription runs" rule to choose switch or
  checkout (kastlan mirrors it from `paid` today).
