# Adopting `@eifi1/ui-kit` 0.40 and `eifi1-server-kit` 0.13

Round 0.40 took every open point (Marcel, 2026-10-16: "Done with Keksdose tests. Run all the
open points for 0.40.0"): the Paddle sandbox run's results (billing §14.4, §15.6), keksdose's
runs 78 and 79 (phone tables, pickers, tabs), and two contracts settled after the three apps'
reviews:
- **feedback §10:** a rework is the author's entry in the conversation, with its own status
  "Rework requested"; the menu reads Feedback discussion, My feedback (for everyone) and
  Feedback inbox (admins);
- **page layout §1** (a new contract): a list page whose table is the page fills the window,
  the same in every app, through the kit's `FillHeight`; a 12rem floor; phones scroll the page.

Both kits are breaking (server-kit: the reply rows' `kind` / `attachment_url`, REWORK;
ui-kit: nothing is removed, `Tabs` `wrap` and two FeedbackMenu labels are deprecated).

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

### Phone tables, pickers, tabs (ui-kit 0.40)

- **DataTable phone cards:** a long press selects a card and enters selection mode (the
  owner's BulkActionBar as on desktop; "Select rows" for keyboards and screen readers); an
  open card keeps its swipe on the header row; below md, `fillHeight` stays in the page's
  flow, so the page scrolls from a card again.
- **Overlays:** closing a PickerSheet or MultiSelect keeps the URL replaces made while it was
  open (`useOverlayHistory`). Multi-select phone sheets get one sticky Done (`PickerSheet`
  `footer` / `done`). Group headings stay at the top and `ComboOption.group` is no longer
  searched (put a searchable group name in `sublabel`).
- **Tabs:** `overflowCue` (› / ‹ below md); `wrap` is deprecated, removed in 0.41.
- **FeedbackReplyComposer:** the status picker is the kit's Select, aligned with Reply.

### Feedback §10 (ui-kit 0.40, server-kit 0.13)

- server-kit: `FeedbackStatus.REWORK`, `QUEUE_STATUSES`, `FeedbackEntryKind`, `plan_rework`,
  `FeedbackService.rework`, `POST /{feedback_id}/rework` (the author, behind the demo guard),
  `split_rework_blocks` for the migration (`body` only); reply entries carry `kind` and
  `attachment_url`; a rework fires no `feedback_answered`; a legacy PATCH append becomes an
  entry for one release.
- ui-kit: REWORK's chip (red, `RotateCcw`), rework entries in the timeline and thread,
  `FeedbackRowDetail.onRework`, the Rework button only for an author without the composer,
  the FeedbackMenu by role.

### Page layout §1 (ui-kit 0.40)

- `FillHeight` / `FILL_HEIGHT_CLASS` (`@eifi1/ui-kit/shell`); DataTable's `data-fill-height`;
  AppShell's main a flex column from md while a filling table is inside (banners no longer
  push it over); a 12rem floor. Don't add `min-h-0` between main and the table; a centred
  `FillHeight` root needs `w-full`.

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

### Feedback and layout

- **The reply rows gain `kind` (NOT NULL, default 'reply') and `attachment_url`;** the store
  writes them and fires `feedback_answered` for `reply` only; `urls_named_except` includes
  entry files; the router takes `rework_model=` with the app's policy.
- **REWORK in the status enum**, its label in its own migration step before any step writes it;
  a downgrade moves REWORK rows to READY and keeps the label.
- **The migration splits `body` with `split_rework_blocks`** — never `outcome`.
- **FeedbackRowDetail:** pass `onRework={(note, url) => api.rework(row.id, { body: note,
  attachment_url: url })}`. Headings reading `feedbackPage.title` / `feedbackPublic.title` now
  say "Feedback inbox" / "Feedback discussion".
- **Filling pages:** follow page-layout §1.4's checklist; the app's own fill classes go.

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

- Feedback: `feedback_public_stores.py:62-81`; migrate the 151 rows / 286 blocks with
  `split_rework_blocks` (the step stops and lists ids if a row with blocks has no author); keep
  the PATCH conversion for the installed PWA; the loop's read script shows entry kinds.
- Pages: feedback, accounts, payees and transactions roots become `<FillHeight
  className="py-4 md:p-6">`; `fillsPage` goes; check the row reveal lands in the table body.
- Phone: drop `fillHeight={useBreakpoint("md")}` and, if no longer wanted, the toast's Merge
  shortcut (long-press selection + the bulk bar now reach merge). Delete
  `features/reports/tab-strip-more.tsx` for `<Tabs overflowCue>`, and the push-on-first-change
  workaround for the payee report and Accounts filter.

### kastlan

Billing:
- The pay block's `style-src`: `deploy/gcp/Caddyfile.cloudrun:136`.
- `subscription-section.tsx:50-58`: drop `switching()`, read `data.switching`; add
  `switching?: boolean` to `features/billing/types.ts` (beside `paid`, `:50`).
- `deploy/gcp/README.md:355-362`: the sandbox has no website approval; step 6 only once
  approved; `.env.example:57`, `deploy/gcp/.env.gcp.example:32`: unset in the sandbox.

- Feedback: `feedback_reply_store.py:49-68` (no mail for a rework); REWORK's label in its own
  step; the menu is admin 2 rows, others 1 (fix `top-bar.tsx:120-121`'s comment).
- Pages: the shell column (`app-layout.tsx:141`) becomes `cn("p-4 md:p-6", FILL_HEIGHT_CLASS)`,
  its comment `:136-140` goes; 23 roots become `<FillHeight>`, plus handover and sign-up
  invitations; platform users stays capped.

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

- Feedback: `feedback_stores.py:76` and `notification_service.py:280` skip reworks;
  `feedback_loop.py:99` becomes `QUEUE_STATUSES | {OPEN}`; existing rework attachments become
  the entries' `attachment_url`; `kind` with a server default dropped in the same step;
  `created_at` written explicitly; the seed's rework through `FeedbackService.rework`.
- Pages: feedback (`:166`) and sessions (`:168`) roots become `<FillHeight
  className={PAGE_SHELL}>`; `SteeringLayout` (`:44`) a `FillHeight`, its strip (`:45`) and
  PageHeader / PlanLimitNotice `shrink-0`.

## 4. Versions

- **`@eifi1/ui-kit` `^0.40.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.13.0**, the release wheel by URL, extras as for 0.12, the sha256
  pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,fastapi,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.13.0/eifi1_server_kit-0.13.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,fastapi,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.13.0/eifi1_server_kit-0.13.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,fastapi,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.13.0/eifi1_server_kit-0.13.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `bb6e561e9c935ad2261b22306d2e805d68d9d7a155343e93de5d0ca65cda7cce`

## 5. 0.40.1 and server-kit 0.13.1 (the apps' 0.40 findings)

One batch, once all three apps had reported (Marcel's rule for patches). Nothing is removed.

- **`FeedbackPublicList` takes `fillHeight`** (page layout §1): the public feedback page passes
  §1.2's rule, so `/all-feedback` fills like the inbox (keksdose).
- **A staff-gate route test** (kastlan's `test_staff_only_routes`, Kurvenschmiede's demo walk)
  classifies the new `POST /feedback/{id}/rework`: an author's route, not staff only.
- **A billing-gate test that pins every write route** (keksdose's
  `test_every_write_route_is_classified`) classifies `POST /feedback/{id}/rework` as always
  allowed, like the reply route.
- **An app whose files belong to a report** (Kurvenschmiede) claims a rework's file inside its
  reply store's `add`: `FeedbackService.rework` hands the file only to the store.
- **keksdose's migration** leaves an erased author's blocks in `body` rather than stopping
  (feedback §10, amended).
- **server-kit 0.13.1:** `check_reply_store` writes its rework file under the app's own
  attachment policy (`policy=`), so a store that resolves the file accepts it.
- **CI:** both kits' Dependabot no longer rebases open PRs on every push to main
  (`rebase-strategy: disabled`; keksdose's measurement). Whether kastlan and Kurvenschmiede
  take keksdose's two CI changes is Marcel's call in their sessions.
- The wheel: `v0.13.1`, sha256 `<at the release>`.
