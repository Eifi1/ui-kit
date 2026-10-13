# Billing, plans and payment — history

What [the billing contract](../billing-harmonization.md) moved out of its body in ui-kit
0.34 (refactor audit DOC-1): its status notes, the snapshot of where each app stood, the
provider comparison, the per-repo to-dos of rounds 0.32 and 0.33, the two review logs (§12
and §14.16) as written, and the passages of §2 and §14 that the fold replaced. Kept as
written: "today", line numbers and each app's state are as of the day each part was
written, and an item may since have been folded into the contract, which wins. Section
numbers are the contract's.

## Status as written

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

## 2. Decisions — the wording the fold replaced

Settled by the kit in this draft; the reviews may object:

8. **Hosted checkout and a hosted customer portal only.** No card field, payment-method
   page or invoice copy in any app. The Merchant of Record hosts them.
9. **A switched-off billing answers 404** with the code `billing_disabled`, as a switched-
   off demo does (`demo_disabled`). kastlan's 503 moves to 404.
10. **One provider account for the operator**, with a product and a webhook endpoint per
    app, unless the provider requires one account per seller brand.

…

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

…

26. **Under a billing lock, the kit's parts follow §3.3 and §12.13 by themselves.** Add,
    invite, resend and role grants stay locked; ShareCard's role toggle stays locked,
    lowering a role included. A lock says its kind, and `commit` takes
    `{ except: kinds }` (§12.36).
    **Amended (Marcel, 2026-10-09, after Kurvenschmiede's review):** lowering a role is
    allowed under a billing lock, since it removes access (§12.13); Kurvenschmiede's server
    already allows editor → viewer while lapsed (`shares_router.py:229-234`). Raising a
    role stays locked. ShareCard's role toggle follows by itself (§12.36).

…

Settled with them, not decisions: httpx comes in as server-kit's `billing` extra;
`billing.testing` ships in the wheel (§14.9); a deletion request cancels at the period's
end, a paused subscription at once, and a reactivation removes the cancellation the
request scheduled (§12.37).

After the reviews of round 0.33 (Marcel, 2026-10-09): decisions 19 and 26 are amended as
marked above, and a Kurvenschmiede team manager adding or re-inviting a member follows the
manager's own standing. The reviews' other points were settled as the reviewers proposed
(§14.16).

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

## 12. Settled after the reviews (2026-10-07/08) — as written

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

## 14. Round 0.33 / server-kit 0.7 (2026-10-09) — the passages the fold replaced

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

### 14.1 Scope — the package, as written

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

### 14.2 The Paddle client — as reviewed

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


…

- **Naming:** every new code carries the `billing_` prefix of `billing_disabled`,
  `billing_read_only` and `billing_not_configured` (decision 22). The audits' drafts
  (`not_at_provider`, `already_subscribed`, `provider_unavailable`, `plan_not_sold`,
  `billing_no_provider_account`) are not used.
- ui-kit's `BillingErrorCode` (`src/auth/auth-errors.ts:106`) adds the same four, and
  `isBillingError` reads them.

…

```python
    #: The app's name in every checkout's custom data (§14.3). Set as the default in the
    #: app's Settings subclass, not per deployment, with the pattern:
    #:   billing_app: str | None = Field(default="keksdose", pattern=r"^[a-z][a-z0-9_-]{0,63}$")
    #: A plain `= "keksdose"` redeclares the field and drops this one's pattern (§14.16,
    #: item 29); server-kit 0.7.1 checks it in a mixin validator as well.
    billing_app: str | None = None
```

…

- **The base URL is the kit's constant.** kastlan's free `billing_api_base_url`
  (`infrastructure/config.py:130`, `KASTLAN_BILLING_API_BASE_URL`) goes (decision 24): a
  typo or another host can't be configured.
- **`verify_billing_webhook`** makes the right call the easy one. kastlan and
  Kurvenschmiede call `verify_webhook_signature` without `tolerance=` (§14.14), so the
  kit's 5-second default applies whatever `<APP>_BILLING_SIGNATURE_TOLERANCE` says.

### 14.4 The checkout page and the way back — as reviewed

`PaddlePayPage`, its props and `paddleTransactionId` (the draft's React part) are gone. The
four `billing.pay*` labels stay, built into the bundle.

…

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

…

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

### 14.5 Whether the payer reached the provider — as reviewed

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

### 14.6 A second checkout while subscribed — as reviewed

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

### 14.7 Trial and grant end notices — as reviewed

- **The trial** is the cardless one: `trialing`, `source` not `provider`, `trial_ends_at`
  set.
- **The grant's end** is `effective_comped_until`, so a beta row without an end counts as
  launch + 12 months (§3.2). kastlan's `due_notices` reads the stored end only, which
  is wrong for keksdose's and Kurvenschmiede's beta rows.

…

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

### 14.8 Cancelling at a deletion request, and undoing it — as reviewed

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

### 14.9 Test helpers — as reviewed

- **In the wheel**, because the apps' local CLIs import it at runtime; not re-exported from
  `billing/__init__`; stdlib only, the API fake imports httpx lazily.
- **It replaces four copies of one recipe:** keksdose's and Kurvenschmiede's
  `billing_fixtures.py`, kastlan's hand signing in `tests/api/test_billing.py`
  (:361-395), and server-kit's own test helpers.

…

```python
PADDLE_API_EXAMPLES: Mapping[str, dict[str, Any]]   # kastlan's test_paddle_client.py:22-69, trimmed
```

…

- **New:** a `cancel_scheduled` step, which the kit promotes to `subscription_canceled` and
  §12.26's "Cancel" produces; and a fake of the provider's API, which each app
  hand-wrote (kastlan `FakeProvider`, keksdose `Client` and `_Provider`).
- **The cancelled step** sends `current_billing_period: None` and `canceled_at`, as Paddle
  does; kastlan's kept the period.

### 14.10 Write locks, and 14.11 The plan limit as a toast — as reviewed

The lock kinds and `commit` scopes are §12.36 (decision 26). The apps' changes are in
§14.14.

…

- keksdose's own `usePlanLimitToast()` (`features/billing/plan-limit.tsx:32-43`) has no
  figure, no contact mode and no id, so it stacks on repeats. kastlan and Kurvenschmiede
  opt in where they toast a `plan_limit`, which neither does yet.

### 14.12 The operator's plan parts — as reviewed

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

…

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

### 14.13 Lemon Squeezy — as written

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

### 14.16 Settled after the reviews (2026-10-09) — as written

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

**Corrected after the adoptions** (ui-kit 0.33.1, server-kit 0.7.1, 2026-10-10; kastlan's
and keksdose's 0.33 reports, **ka** and **kk** n):
29. **`billing_app` keeps its pattern in the app's subclass** (kk 1). §14.2's
    `billing_app: str | None = "keksdose"` redeclared the field and dropped the mixin's
    pattern, so `"Not Valid!"` passed. The subclass writes `Field(default="keksdose",
    pattern=r"^[a-z][a-z0-9_-]{0,63}$")`, and server-kit 0.7.1 checks the tag in a mixin
    validator that a redeclared field can't shadow (§14.2).
30. **The pay host's `PAY_HOST`** (kk 3, kk 4): Caddy's `{$PAY_HOST:pay.invalid}` default
    holds only while the variable is unset. Set but empty, it is a second catch-all, so
    the deploy passes it only with a value, keeps the pay block after the app's, and sets
    it where a deploy keeps it (not by hand under `--set-env-vars` deploys). A Caddy with
    automatic HTTPS (Compose, a VPS) defaults to `http://pay.invalid` instead (§14.4).
31. **`payPageUrl` and `paddleLocale` take an undefined locale** (kk 15), what
    `useKitLocale()` answers without a provider locale: no `lang`, so the page reads the
    browser's language, else English (§14.4).

### 14.17 A grant clears the trial's end (round 0.34, 2026-10-12) — as written

Kurvenschmiede's 0.33.1 report asked which rule holds: keksdose's `change_plan` clears
`trial_ends_at` on a manual grant, Kurvenschmiede's keeps it. **A manual grant clears it.**
Good standing reads `comped_until` for a `comped` row (§3.3), so the old trial date decides
nothing there; left behind, it only feeds what reads it without the status: a "trial ends
in 7 days" banner, a trial-end notice (§14.7). A beta grant kept by `change_plan` (decision
22) is not a manual grant and keeps its own dates. keksdose already clears it; Kurvenschmiede
(`change_plan`) and kastlan (`billing_service.set_plan`, :243, which sets status, source and
`comped_until` and leaves the trial's end) add the one line.
