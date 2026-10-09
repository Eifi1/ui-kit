# Adopting `@eifi1/ui-kit` 0.33 and `eifi1-server-kit` 0.7

Three contracts, settled after all three apps reviewed them (Marcel, 2026-10-09):
- **colour roles:** `docs/colour-roles-harmonization.md`, settled in §12 (per repo: §9);
- **billing:** `docs/billing-harmonization.md` §12.36, §12.37 and §14, settled in §14.16
  (per repo: §14.14);
- **text size:** `docs/text-size-harmonization.md` §10.16–§10.22.

The contracts' per-repo sections are the checklists. This note is the kits' side: what is
new, what every app must change, each app's list in order, and the manual steps. Where the
build differs from a contract, the build wins (last section).

**Nothing has to be switched on to adopt 0.33.** Billing stays off in production. The pay
host, the notice jobs and their manual steps (§4) are for the release that turns billing
on. Until then the pay page says there is nothing to pay, and a notice route answers 200
with nothing sent.

## 1. What's new

**Colour roles.** Every fill names its foreground: `-contrast` tokens for warning, the
four money fills and the five hues, `--neutral` (the muted colour) with
`--neutral-contrast`, and `--warning-border-strong`. In light, `--bg-surface-2` is the
page colour in every preset, so a well on a card reads as one (1.02 → 1.09). Light
`--warning`, `--success`, `--hue-orange` and `--hue-teal` are darker and clear AA as
text; light `--danger-border-strong` is louder (rose-600) and `--status-edited` darker.
`tokens.css` gains role-scoped utilities from one `@theme inline` block: `text-muted`,
`bg-surface-2`, `border-subtle`, `ring-brand`, `stroke-subtle`, … Each name exists only
for its own property (there is no `bg-muted` and no `text-surface`), and variants and
opacity work (`hover:bg-hover`, `md:text-secondary`, `text-muted/60`). The hovers: the
ordinary row hover `--bg-hover` is lighter (5.5 % ink instead of 7 %), so every text role
clears 4.5:1 on it. Button `secondary`/`ghost` and IconButton muted hover with a
translucent ink that reads on the page, the card and the well. Button `primary` hovers
onto `--bg-active`, and Table zebra rows hover to the card. `SwipeAction` takes `tone` (a
soft wash idle, the solid fill and its foreground armed) or, for an app's documented
exception, `paint: { fill, foreground }`. `className`/`armedClassName` are deprecated.
New entry point **`@eifi1/ui-kit/testing`**: `undeclaredCssVariables(sources, options)` and
`KIT_CSS_VARIABLES`. It is the guard that every `var(--x)` your source reads without a
fallback is declared somewhere, the check that would have caught Kurvenschmiede's black
boxes (F79).

**A write lock says its source.** `WriteLockKind` is `"demo"`, `"billing"` or a kind the
app names. `combineWriteLocks` sources carry a `kind`, and the provider holds every locked
source, in order, as `holds`. `commit` takes a `CommitScope`: `true` (every lock), or
`{ except: [kinds] }` (every lock but those). `COMMIT_EXCEPT_BILLING` is the common case.
`useWriteLock(scope?)` answers the lock as a control with that scope sees it,
`writeLockFor(lock, scope)` is the same thing as a pure function, and
`useBillingWriteLock(locked, options)` is billing's source in one hook. Under billing,
the kit's parts that §3.3 and §12.13 allow are exempt, built in:
- ShareCard: remove a grantee, revoke a pending one, and lower a role (`roles` are read
  narrowest first);
- InvitationsPanel: revoke;
- SessionsSetting: revoke one, and sign out everywhere;
- DeleteAccountSetting;
- EmailChangeSetting: resend, cancel and submit;
- ProfileSetting Save and CompleteNameDialog Save;
- the TranslationReview verdicts;
- PlanChangeConfirm.

These stay locked under billing: ShareCard Add (and Enter-to-add), raising a role, and
InvitationsPanel invite and resend. A source without a kind is never exempt, a demo lock
still refuses everything, and an inner `locked={false}` still reopens everything.

**A row action carries its state.** `RowAction` gains:
- `pressed`: `aria-pressed`, with IconButton's "on" look;
- `expanded` + `controls`: `aria-expanded` and `aria-controls`, for something the action
  opens in the page;
- the tones `muted`, `info` and `warning`, beside `default` and `danger`;
- `dataTour`: inline, on the action's own control. Collapsed, it sits on an aria-hidden
  overlay `<span>` in the "⋯"'s `data-slot="row-actions"` box, never on the menu entry.

`RowActions` and `rowActionsColumn` take `glyphSize` (IconButton's 12–28) and
`tooltipSide`. There are no new strings.

**At Large the label stands above the field.** At Large and Extra large, every
floating-label field (FloatingField, the selects and comboboxes, the date and month
pickers, the label strips) shows a static label above the field that wraps like any text,
and the field no longer reserves its top strip. Normal keeps the floating label. The new
**`truncate-until-large`** utility truncates at Normal and wraps
(`overflow-wrap: anywhere`) at Large. The kit's five copies use it, and ShareCard,
UserRoster, InvitationsPanel, FileButton and the feedback attachments now wrap at Large
instead of cutting.

**The size sweep sees what is cut.** At Large and Extra large,
`scripts/screenshot-sizes.mjs` reports `TRUNCATED` (a one-line ellipsis or a line clamp
that cuts its text) and `PINNED` (a `fixed` or vertically `sticky` box taller than half
the viewport). Both are report-only in 0.33. `--gate-truncation` exits 3 on a finding,
and the kit's release run passes it from 0.34. A deliberate case carries
`data-truncate-ok` or `data-pinned-ok`, with the reason in a code comment; never put one
on a name or an email. `--url` points the script at your own preview, and
`--no-screens` / `--pages all` work as before. The script is not in the npm package: run
it from a ui-kit checkout.

**Billing, ui-kit:**
- **The way back** (§14.4):
  - `CHECKOUT_RETURN_PARAM` / `_VALUE`, `isCheckoutReturn`, `withoutCheckoutReturn` and
    `checkoutReturnUrl`;
  - `noteCheckoutStarted(payer, overview?, { storageKey })` before leaving;
  - `useCheckoutProcessing({ payer, returned, onConsumed, overview, refetch, onLanded?,
    timeoutMs?, pollMs?, storageKey? })` → `{ processing, checkAgain }`, keksdose's logic:
    - "landed" means changed against the overview at departure, not "is active";
    - it is bounded to 10 minutes and polls through your query's `refetch` every 4 s;
    - every mounted instance shares one module-level store per `storageKey`.

    Show it with `BillingBanner kind="processing" onAction={checkAgain}`.
- **Before the provider** (§14.5): `SubscriptionActions atProvider`. With `false`, a
  caption (`billing.notAtProvider`) stands in place of both actions; with `true`, both
  show, whatever the status or source. `onPortal(target)` takes `"overview"` (Payment
  and invoices) or `"cancel"` (Cancel subscription). The payment-failed banner's action
  is yours, with `target: "payment_method"`. The types `PortalTarget`, `PortalRequest`
  and `BillingOverview` (server-kit's wire shape) are exported for hand-written clients.
- **Codes:** `billing_provider_unavailable`, `billing_not_at_provider`,
  `billing_already_subscribed` and `billing_plan_not_sold` are in `BillingErrorCode`, with
  their words in seven languages.
- **The plan limit as a toast** (§14.11): `usePlanLimitToast({ mode, onChoosePlan?,
  email?, dimensionLabels?, formatValue? })` → `(hit?) => ToastId`. There is one toast
  per dimension (`plan-limit:<dimension>`), with the figure line `billing.limitUsageLine`.
- **The operator's plan parts** (§14.12):
  - `planColumn` / `usePlanColumn`: the plan's name, the standing chip and a usage line,
    with `filterPlans` and `sortBy`;
  - `PlanChangeConfirm`: a plan Select and, with `grantEnd`, "Free until". `comped_until`
    is the end of the picked day in the operator's time zone, and the confirm is exempt
    from billing;
  - `usePlanChangeResult()` → lines with tones: success; info for a kept beta; warning
    over the limit, with one figure per dimension;
  - the `planChange` labels in seven languages.
- **The pay page** (§14.4, decision 19 as amended). A standalone static page in the
  package, `dist/pay/` (`index.html`, `pay.js`, `pay.css` and Paddle's Apple Pay file):
  - no React, no sign-in, no storage, and no request to your server;
  - it loads Paddle.js from Paddle's CDN and opens the `_ptxn` transaction as an overlay,
    with the locale, `successUrl` (`?checkout=done`) and the theme;
  - it shows its own four lines in seven languages, and a footer with the app's name and
    its Terms and Privacy links.

  Each app serves it on its own subdomain `pay.<app domain>`, a separate origin approved
  in Paddle. It is configured by a `pay-config.json` that the package's bin writes at the
  web image's build:
  `eifi1-pay-page --out <dir> --token … --environment … --return-url … --app-name …
  --terms-url … --privacy-url …`. The bin refuses a token whose prefix disagrees with the
  environment (`test_` sandbox, `live_` live), and any URL that isn't `https://`
  (`http://` for localhost only). Without a token it writes `"token": null`, and the page
  says there is nothing to pay. `payPageUrl(url, locale)` adds `lang=<kit locale>` to a pay
  page link (one that carries `_ptxn`) and leaves any other URL alone. `paddleLocale` maps
  `de-CH` → `de`, `zh` → `zh-Hans` and `hu` → `en` (Paddle has no Hungarian).

**server-kit 0.7, `eifi1_server_kit.billing`:**
- **The provider:**
  - one provider-neutral port, `BillingProviderClient`: `checkout_url`, `portal_url(…,
    target=)`, `cancel`, `remove_scheduled_cancel`;
  - `PaddleClient`, lifted from kastlan, behind the new **`billing` extra** (httpx,
    imported lazily);
  - `NoProviderClient` (every call 503 `billing_not_configured`);
  - `billing_provider_client(settings, *, client=None)`, which never raises for the
    settings. Pass one `httpx.AsyncClient` from your lifespan; without one, each call
    opens its own.
- **The checkout:** `sold_plan` (422 `billing_plan_not_sold`), `require_new_checkout`
  (409 `billing_already_subscribed`, a payer who bought under a grant included) and
  `checkout_return_url`.
- **Settings:** `billing_app`, `billing_environment` (unset: read from the key's prefix),
  `billing_checkout_page_url` and `billing_hosted_checkout_url`;
  `billing_api_environment()`; and `verify_billing_webhook`, which checks the signature
  with this deployment's secret and its tolerance.
- **The app tag** (one Paddle account for three apps): `checkout_custom_data(payer_ref, *,
  app=)`, and `PaddleClient` adds the tag itself. `parse_webhook_event(provider, raw_body,
  *, app=)` drops another app's events and untagged ones (`None`: answer 200, nothing
  recorded), and never matches them by customer id.
- **Codes:** `billing_provider_unavailable` 502, `billing_not_at_provider` 409,
  `billing_already_subscribed` 409 and `billing_plan_not_sold` 422. A 401/403 from Paddle
  is `billing_not_configured` 503. `BillingOverview.at_provider` and the portal's
  optional body `PortalRequest {target}` come with them.
- **Notices** (§14.7):
  - `billing_notice_due(row, now, *, launch, sent)` → `BillingNotice(kind, ends_at,
    days_left)` with `.key`;
  - `billing_notices_owed(candidates, now, *, settings)` over
    `NoticeCandidate(payer, row, sent, deactivated, deletion_requested)` → `OwedNotice`s.
    It sends nothing while billing is off and skips deactivated and deletion-requested
    accounts;
  - a notice goes 7 days ahead, and an "ended" one up to 3 days late. A beta row ends at
    launch + 12 months. The `billing_notice_sent` marker makes the job idempotent.
- **Deletion** (§14.8):
  - `cancel_for_deletion(row, client)` cancels at the period's end, and a paused
    (`expired`) subscription at once. It never raises, and answers `"cancelled"`,
    `"failed"` or `None`;
  - `resume_after_withdrawal(row, client)` undoes that cancellation: Paddle's
    `PATCH {"scheduled_change": null}`. A subscription that was cancelled or has ended is
    not resumed.
- **`PlanChangeResponse`** gains `usage`, `kept_beta` and `comped_until`, and
  `previous_plan` may be `None`.
- **`billing.testing`** (§14.9) is in the wheel, not re-exported: `paddle_event`,
  `sign_paddle`, `signed_paddle_event`, `post_signed` (localhost only),
  `FakeBillingProvider`, `PaddleApiFake` and `PADDLE_API_EXAMPLES`.
- **Lemon Squeezy is deprecated** (no runtime warning) and is removed in 0.8.

## 2. Breaking and must-change, every app

**You will see, without touching anything:**
- **The well:** in light, surface-2 is now the page colour. A well on a card reads, but
  anything resting on surface-2 *on the page* merges with it. `Card variant="inset"`
  and DataTable `frame={false}` belong inside a card (`data-table.tsx:519-524`,
  `ui.tsx:3000-3001`).
- **Light status colours:** status text and lines are slightly deeper, the danger strong
  line is louder, and `--status-edited` is darker.
- **The hovers** described in §1.
- **The swipe panels** (every app's feedback inbox and translation review, and DataTable
  row swipes) take the tone look. The icon disc is in the label's colour.
- **Fills:** Chip `solid` `warning` and `orange` and the FloatingAction badge use the new
  `-contrast` foregrounds.
- **At Large:** every floating-label field has its label above it.
- **Under a billing lock:** the kit's parts listed in §1 are live where they were locked.

**Types:**
- **`commit?: boolean` → `commit?: CommitScope`** on every kit commit prop: Button,
  IconButton, FormActions, the fields, `RowAction`, `ConfirmOptions.commit`, the
  comboboxes' `createCommit` and `StepperNav.finishCommit`. Passing `true`/`false` still
  compiles. What breaks:
  - a wrapper of yours that forwards a kit `commit` into a `boolean` prop;
  - `commit={commit && !pending}`, which compiles but turns `{ except }` into `true`, so
    the exemption is lost. Write `commit={pending ? false : commit}`;
  - a `commit && lock.locked` test, which ignores the scope. Ask
    `useWriteLock(commit).locked`.
- **`WriteLock` gains `kind` and `holds`.** A value you build by hand needs both.
- **`BillingErrorCode` gains four members**, and **`RowActionTone`** three. An exhaustive
  `switch` or a `Record<…>` keyed by either needs them.

**The `[var(--…)]` → utility migration** (colour roles §9, §12.7):
1. **Rewrite your own markup only.** The kit keeps its own `[var(--…)]` classes
   (decision 5). An assertion on a kit component's classes keeps the kit's form, for
   example keksdose `shared/components/__tests__/ui.test.tsx:304-331` (the kit Input's
   `[&[readonly]]:bg-[var(--bg-surface-2)]`).
2. **Rewrite the source, then let the tests tell you.** Run the table over your non-test
   source, then run the suite:
   - a positive assertion on your own markup now fails: rewrite exactly that one;
   - one that still passes and names `[var(--…)]` asserts kit markup: leave it;
   - a kit assertion that fails is a kit class that changed in 0.33 (the hovers, the field
     label, the swipe panel, see Tests below). Take the kit's new class, not the table's.
3. **Beware `.not.toContain`, `.not.toMatch` and `.not.toHaveClass`.** They pass
   vacuously after the rewrite. Find them
   (`grep -rnE "not\.(toContain|toMatch|toHaveClass)\(.*var\(--" src`; check multi-line
   ones by hand), rewrite each to the new form, then check that it fails against the old
   code or pair it with a positive assertion.
4. **Variants and `/opacity` carry over** (`hover:`, `md:`, `dark:`, `[&_svg]:`, `/60`).
5. **The table leaves these alone**, and they stay, or are done by hand:
   - a `var()` with a fallback, an arbitrary property (`[color:var(--…)]`) and style
     props;
   - the money colours as text: `text-[var(--money-income)]` becomes the static
     `text-money-pos` only without a variant. With one, it keeps the `[var()]` form
     (decision 13);
   - kastlan's `bg-[var(--text-primary)]`, which becomes `bg-inverse`;
   - Kurvenschmiede's `text-[var(--border…)]`, which only fed `stroke="currentColor"`. It
     becomes `stroke-strong` / `stroke-subtle`, and the attribute goes. There is no
     `text-*` for the border roles.
6. **Update your lint message** to name the utilities (keksdose `eslint.config.js:47`).

The table (GNU `sed -E`). Run over each app's non-test source it leaves exactly the
contract's by-hand cases: keksdose 855 → the 2 money lines, kastlan 33 → the one
`bg-inverse`, Kurvenschmiede 271 → the 4 plan-view lines.

```sh
# roles.sed: ui-kit 0.33 role utilities (colour roles §7.2, §9, §12.4)
# text
s/\btext-\[var\(--text-(primary|secondary|muted|placeholder|inverse)\)\]/text-\1/g
s/\btext-\[var\(--(danger|warning|success|info|brand|brand-muted|media-ink)\)\]/text-\1/g
s/\btext-\[var\(--(hue-(blue|indigo|purple|teal|orange))\)\]/text-\1/g
s/\btext-\[var\(--((brand|danger|warning|success|info|neutral|money-(income|expense|net|neutral)|hue-(blue|indigo|purple|teal|orange))-contrast)\)\]/text-\1/g
# bg
s/\bbg-\[var\(--bg-(page|surface|surface-2|hover|active|inverse)\)\]/bg-\1/g
s/\bbg-\[var\(--(brand|brand-hover|danger|danger-hover|warning|success|info|neutral|media-scrim|media-scrim-hover)\)\]/bg-\1/g
s/\bbg-\[var\(--brand-bg(-hover)?\)\]/bg-brand-soft\1/g
s/\bbg-\[var\(--(danger|warning|success|info|hue-(blue|indigo|purple|teal|orange))-bg\)\]/bg-\1-soft/g
s/\bbg-\[var\(--(hue-(blue|indigo|purple|teal|orange))\)\]/bg-\1/g
# border and divide, sides included
s/\b(border(-[xytrblse])?|divide)-\[var\(--border\)\]/\1-subtle/g
s/\b(border(-[xytrblse])?|divide)-\[var\(--border-strong\)\]/\1-strong/g
s/\b(border(-[xytrblse])?|divide)-\[var\(--(brand|media-ink)\)\]/\1-\3/g
s/\b(border(-[xytrblse])?|divide)-\[var\(--(danger|warning|success|info|hue-(blue|indigo|purple|teal|orange))-border\)\]/\1-\3/g
s/\b(border(-[xytrblse])?|divide)-\[var\(--(danger|warning)-border-strong\)\]/\1-\3-strong/g
# ring and outline
s/\b(ring|outline)-\[var\(--border\)\]/\1-subtle/g
s/\b(ring|outline)-\[var\(--border-strong\)\]/\1-strong/g
s/\b(ring|outline)-\[var\(--brand\)\]/\1-brand/g
s/\b(ring|outline)-\[var\(--(danger|warning)-border-strong\)\]/\1-\2-strong/g
s/\bring-\[var\(--media-ink\)\]/ring-media-ink/g
# fill and stroke (SVG)
s/\b(fill|stroke)-\[var\(--text-(primary|secondary|muted)\)\]/\1-\2/g
s/\b(fill|stroke)-\[var\(--bg-surface\)\]/\1-surface/g
s/\b(fill|stroke)-\[var\(--border\)\]/\1-subtle/g
s/\b(fill|stroke)-\[var\(--border-strong\)\]/\1-strong/g
```

```sh
# in the frontend directory: non-test source only
git ls-files 'src/*.ts' 'src/*.tsx' | grep -v -e '__tests__/' -e '\.test\.' | xargs sed -E -i -f roles.sed
```

**The hover rule** (§12.2; the kit cannot see your rest colours). A hover differs from its
rest by at least 1.08:1, and keeps every text role at 4.5:1:
- a row on a card hovers with `hover:bg-hover`;
- a row that rests on surface-2 hovers to the card: `hover:bg-surface`;
- a row whose surface-2 marks a state (a selected row) keeps its fill and draws an
  outline: `hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong`.

**The guard** (§8.4), one test file such as `src/app/css-variables.test.ts`:

```ts
import { expect, it } from "vitest";
import { undeclaredCssVariables } from "@eifi1/ui-kit/testing";

const sources = import.meta.glob<string>(
  ["/src/**/*.{ts,tsx,css}", "!/src/**/*.test.{ts,tsx}", "!/src/**/__tests__/**"],
  { query: "?raw", import: "default", eager: true },
);

it("reads no CSS variable that nothing declares", () => {
  expect(undeclaredCssVariables(sources)).toEqual([]);
});
```

- **Opt your stylesheets out of Vitest's CSS stub:** `test: { css: { include:
  [/src\/app\.css/] } }`. Vitest stubs every stylesheet with `""`, `?raw` included. The
  guard throws on an empty `.css` entry, and on fewer than ten files, rather than pass
  over nothing.
- **Options:**
  - `runtime`: a library's own variables (kastlan's
    `--radix-collapsible-content-height`). Your own runtime writes are found in your
    source;
  - `checkFallbacks: true` also checks `var(--x, …)`;
  - `refusePalette: true` reports Tailwind palette variables (`--color-red-500`).
- **`--app-nav-h` is not declared:** AppShell sets it only while it is mounted. Read it
  as `var(--app-nav-h,0px)`.
- `node:fs` works too, in a test project with node types (Kurvenschmiede's).

**server-kit 0.7** (the changelog's ⚠ BREAKING CHANGES):
- **Switching on with Paddle needs more.** `billing_provider = paddle` with billing
  enabled also needs `billing_app` (set in code: `billing_app: str | None = "keksdose"`,
  matching `^[a-z][a-z0-9_-]{0,63}$`). It also needs an API environment that resolves and
  agrees with the key's prefix (`pdl_sdbx_apikey_` / `pdl_live_apikey_`). A key without a
  prefix needs `billing_environment`, and a mismatch fails at start.
- **The `SubscriptionRow` protocol reads `provider_customer_id`** (for `at_provider`).
  All three apps' rows have the column; a hand-made fake without it breaks.
- **`PlanChangeResponse.usage` is required.** `of(previous_plan, plan, usage, *,
  kept_beta=False, comped_until=None)` takes it third, and `previous_plan` may be `None`.
- **The `billing` extra:** the install line names it. Use kastlan `[billing,images,mail]`,
  keksdose `[billing,images]` and Kurvenschmiede `[billing,mail]`.
- **`.env.example`** lists `<APP>_BILLING_APP` ("set in code"),
  `<APP>_BILLING_ENVIRONMENT`, `<APP>_BILLING_CHECKOUT_PAGE_URL` and
  `<APP>_BILLING_HOSTED_CHECKOUT_URL`, plus kastlan's `KASTLAN_JOBS_TOKEN` and
  `KASTLAN_SCHEDULER_ENABLED` and Kurvenschmiede's `KURVENSCHMIEDE_JOBS_TOKEN`.

**Your tests:**
- **Kit markup changed in places**, so an assertion on these follows the kit, not the
  table:
  - a field label's `truncate` is now `truncate-until-large`, with `large:` placement
    classes;
  - Button `secondary`/`ghost` and IconButton muted hover with
    `hover:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)]`, and Button
    `primary` with `hover:bg-active`;
  - the swipe panels carry the tone classes, and the disc is `bg-current/20` / `/10`;
  - the collapsed "⋯" sits in a `data-slot="row-actions"` box, and `[data-tour=x]`
    resolves to the overlay beside the button, not to an ancestor of it.
- **A pinned token literal moves:** light `--bg-surface-2`, `--warning` (#a34800),
  `--success` (#007152), `--hue-orange`, `--hue-teal`, `--danger-border-strong` and
  `--status-edited`.
- **`useCheckoutProcessing`'s store is module-level per `storageKey`** and lives as long
  as the module does. Clearing `localStorage` between tests doesn't reset it: use a fresh
  `storageKey` per test, as the kit's own tests do, or `vi.resetModules()`.
- **Backend:**
  - test settings that switch Paddle on add `billing_app`. A test key without a prefix
    needs `billing_environment="sandbox"`, and `PaddleClient(key, environment=…)` takes
    the environment as a required argument;
  - once the webhook passes `app=settings.billing_app`, an event built without the tag is
    dropped (200, nothing recorded). Build events with
    `billing.testing.paddle_event(…, app=settings.billing_app)`;
  - replace the provider through your module-level seam with `FakeBillingProvider`. A
    FastAPI override can't reach `cancel_for_deletion`, which runs in the service layer.

## 3. Per app

Each list is in order. A line marked **defect** is a bug in the app the round found; the
fix belongs in this adoption. The contracts hold the reasoning behind each line.

### keksdose (read at `feat/kit-0.32` 6a746d5f)

**Frontend**
1. Bump. Run the suite and fix the kit-markup assertions (§2 Tests).
2. **Classes (k25):** run the table over 855 classes, including `--media-ink`
   (`camera-capture.tsx:206,235`; `image-cropper.tsx:155,188`; `scan-file-preview.tsx:136`
   at `/80`). By hand: `text-[var(--money-income)]` in `tour-menu.tsx:62` and
   `tours-page.tsx:307` → `text-money-pos` (or `text-success` if the check means "done";
   your call). Update the lint message (`eslint.config.js:47`).
3. **Tests (§12.7):**
   - 22 files name a `[var(--…)]` class. Leave the kit-markup ones
     (`shared/components/__tests__/ui.test.tsx:304-331`), and recheck the 7 vacuous `.not.`
     ones;
   - `cleared-status-toggle.test.tsx:274-289`: the `dark:` exemption also accepts the
     utility form,
     `/(?:^|\s)text-(?:\[var\(--[a-z-]+-contrast\)\]|[a-z-]+-contrast)(?=\s|$)/`.
4. **The pills (k22):**
   - `cleared-status-toggle.tsx:184` CLEARED → `bg-money-pos text-money-income-contrast`;
   - `:516` FUTURE → `bg-money-neutral text-money-neutral-contrast`.

   The `:515` exception goes, and the `:146` block shrinks to the two hue pills.
   NOT_ACCEPTED (`:153`) and UNCLEARED (`:161`) stay documented exceptions (k23).
5. **The swipes (k24): `tone`, and the curtains through `paint`:**

   | plan | tones |
   |---|---|
   | `transaction-swipe-plan.ts:22-25` | DELETE → `paint` rose-600 + white; RULE_DELETE → `paint` rose-700 + white; RUN → `info`; STEP_BACK → `neutral` |
   | `budget-swipe-plan.ts:22-24` | FUND → `success` (or `income`); UNASSIGN → `neutral`; GOAL → `purple` |
   | `accounts-page.tsx:780-804` | `success`, `info`, `neutral` |
   | `STATUS_TONE` curtains `cleared-status-toggle.tsx:158,173,188` | NOT_ACCEPTED → `neutral`; UNCLEARED → `paint` amber-600 + slate-900 (the pill's own fill); CLEARED → `income`; RECONCILED → `brand` |

   - Declare the three paint pairs once, as your own variables in `app.css`, and pass the
     `var()`s; the guard counts them.
   - Three `eslint-disable` blocks go: `accounts-page.tsx:772`, `budget-swipe-plan.ts:19`
     and `transaction-swipe-plan.ts:19`.
   - Your tests pin the paint (`cleared-status-toggle.test.tsx:156,292-307`,
     `transaction-swipe-plan.test.ts:104-106`).
6. **The hovers (k26, §12.2):** after the table, `accounts-page.tsx:700` and
   `transactions-page.tsx:867` change `hover:bg-hover` → `hover:bg-surface`. Add
   `hover:bg-surface` to `admin/support-panel.tsx:389` while the thread is open. B′ already
   keeps the on-page ghost buttons' hover (`budget-page.tsx:341-375`).
7. **Loud warning frames (k27):** `statement-review.tsx:501` and `categories-step.tsx:233`
   → `border-warning-strong`.
8. **The guard:** replace `shared/components/__tests__/design-tokens.test.ts` with
   `undeclaredCssVariables(sources, { checkFallbacks: true })`, or keep both. Leave
   `refusePalette` off: the sync chip's 500/400 shades are deliberate
   (`sync-status-indicator.tsx:53-55`), and moving them is optional.
9. **Write locks: `useWriteLockKind` → the kit:**
   - drop `LockKindContext` and `useWriteLockKind` (`features/budgets/write-lock.tsx:68`,
     :111-113);
   - name the kinds in `BudgetWriteLock` (:94-97): `kind: "demo"` and
     `useBillingWriteLock(…)`;
   - `budgets-page.tsx:570` and `invoice-review.tsx:646` → `commit={COMMIT_EXCEPT_BILLING}`.
     Where code asked `useWriteLockKind() !== "billing"`,
     `useWriteLock(COMMIT_EXCEPT_BILLING).locked` answers;
   - `PasswordDangerCard.commit` (`shared/components/password-danger-card.tsx:87`) →
     `CommitScope`;
   - the `locked={false}` account-card wrappers stay: they also undo the demo budget's
     lock.
10. **RowActions at every size** (text size §10.16), and drop the Normal-size exception:
    - **accounts row** (`features/accounts/accounts-page.tsx:931-1040`, and the Large
      list `accountActions` :479-518):
      - open and add as muted links;
      - reconcile as `info` with `dataTour="account-reconcile"`;
      - hide as muted with `commit`, and delete as danger with `commit`;
      - `tooltipSide="start"` for the row;
      - the `<span data-tour>` round the "⋯" (:939) and the
        `CompactControls`/`stopPropagation` div go;
    - **budgets row** (`features/budgets/budgets-page.tsx:380-486`):
      - share becomes `expanded` + `controls` on its share card (today `pressed`,
        :437-445);
      - rename as muted with `commit`;
      - delete as danger with its `disabledReason`;
      - the in-row confirm (:466) stays yours;
    - **category group header** (`features/budget/group-admin-actions.tsx:61-120`):
      `size="sm" glyphSize={14}`, with add category as `expanded`;
    - **tests:**
      - the tour guard's `FORWARDED` list
        (`features/tour/__tests__/tour-anchors.test.ts:103-127`) gains
        `/dataTour:\s*"[^"]+"/g`;
      - `accounts-page.test.tsx:735` asserts that the anchor's
        `closest('[data-slot="row-actions"]')` holds the "⋯" (`toContainElement(menu)`).
11. **Text size:**
    - the holdings Skeleton (`features/accounts/holdings-panel.tsx:462-467`, at `top-5`
      from the floating strip) re-anchors on the input's own line, since the label sits
      above at Large;
    - optional: move the JS switches to `truncate-until-large`
      (`features/budget/budget-mobile-list.tsx:146,151,158`;
      `features/transactions/mobile-transaction-list.tsx:477`).
12. **Billing UI:**
    - **the plan-limit toast:** your `usePlanLimitToast` (`features/billing/plan-limit.tsx:32-43`)
      → the kit's;
    - **the way back:** `checkout-return.ts` shrinks to the kit's helpers and
      `useCheckoutProcessing`:
      - its two mounts (`billing-banner.tsx:68`, `subscription-cards.tsx:119`) share the
        kit's store with one `storageKey`, so the zustand store (:73-95) goes;
      - the overview query (:132) hands the hook `overview` and `refetch`;
      - `noteCheckoutStarted` and `payPageUrl(url, locale)` on the way out;
    - **`atProvider`:** `subscription-cards.tsx:44-62` drops the status sniff and
      `billing.no_provider_subscription` for `atProvider={overview.at_provider}`;
    - **the portal targets:** "Cancel subscription" asks for `target: "cancel"`, and the
      payment-failed banner (`billing-banner.tsx:89-90`) for `"payment_method"`;
    - **the operator's parts:**
      - `PlanConfirm` (`features/admin/user-admin-confirm.tsx:125-194`), the plan column
        (`users-panel.tsx:706-745`) and `USER_PLANS` (`user-filter-params.ts`) give way to
        `PlanChangeConfirm`, `planColumn` with `sortBy` (:739) and `GET /admin/plans`. The
        summary chips by plan stay;
      - the change's toast comes from `usePlanChangeResult`'s lines and tones, and
        `budgets_owned` / `budget_limit` (:533-549) become `usage.budgets` /
        `limits.budgets`.

**Backend** (`eifi1-server-kit[billing,images]`)

13. `billing_app: str | None = "keksdose"`, and `.env.example` lists the four settings.
14. **The provider:**
    - in `adapters/external/billing_provider.py`, the port and `NoProviderClient` go;
    - the seam (:64-75) answers `billing_provider_client(get_settings())`;
    - tests swap the seam for `FakeBillingProvider`.
15. **Checkout and portal:**
    - the checkout drops `email` and adds `sold_plan(…, sold=SOLD)` and
      `require_new_checkout`;
    - the portal's uncoded 404 (`billing_router.py:125-126`) becomes 409
      `billing_not_at_provider`, and it takes `PortalRequest`.
16. **The webhook:** `parse_webhook_event(…, app=settings.billing_app)`. It already
    passes the tolerance (:155); `settings.verify_billing_webhook` does the same in one
    call.
17. **Deletion:**
    - `billing_service.cancel_for_deletion` (:492-516) → the kit's. **Behaviour change:**
      the kit cancels a paused (`expired`) subscription at once, where keksdose skipped it
      (:504). The `provider_cancellation` audit detail stays;
    - **defect:** a reactivation doesn't undo the cancellation
      (`account_deletion_service.py:271-277`). Call `resume_after_withdrawal` there, only
      when the request recorded `"cancelled"`, and audit it as `provider_resume`.
18. **Test helpers:**
    - in `billing_fixtures.py`, `STEPS` (:56-62), `_PERIOD` (:65-70), `paddle_event`
      (:73-111) and `sign_paddle` (:114-119) give way to `billing.testing`. The CLI
      (:143-176) stays;
    - the fakes `Client` (`tests/api/test_billing_webhook.py:373-384`) and `_Provider`
      (`test_billing_leaving.py:27`) go.
19. **The plan change:** `PlanChangeResponse.of(previous_plan, plan, usage, …)`, with
    `previous_plan` nullable (`domain/schemas/admin.py:672`). Add `GET /admin/plans`
    (admins and the operator; codes, limits and sort, no prices; whatever the switch).
20. **The `billing_notices` Job** (§14.7):
    - a migration for `billing_notice_sent`;
    - a `JobSpec` next to `notifications` (`infrastructure/job_registry.py:199-207`),
      with the import-time asserts (`jobs.py:164`, `scheduler.py`);
    - the deploy README's job table row, which `tests/api/test_admin_health.py` pins;
    - its cloudbuild step carries the mail settings (`KEKSDOSE_EMAIL_BACKEND`,
      `KEKSDOSE_EMAIL_FROM`, the `KEKSDOSE_RESEND_API_KEY` secret,
      `KEKSDOSE_APP_BASE_URL`) and `KEKSDOSE_BILLING_ENABLED` and
      `KEKSDOSE_BILLING_LAUNCH_AT`. The `notifications` Job carries none of these
      (`cloudbuild.yaml:495-514`);
    - it skips deactivated and deletion-requested accounts (`billing_notices_owed` does,
      as `push_notifications.py:770` does for pushes), and sends nothing while billing is
      off;
    - mails in your four locales;
    - the manual steps are in §4.
21. **The pay host** (§4):
    - the site block in `deploy/gcp/Caddyfile.cloudrun` and `deploy/Caddyfile`;
    - the CSP tests (`frontend/src/app/__tests__/plausible-wiring.test.ts:30-38`,
      `csp-inline-script.test.ts`) read the app's block;
    - the app's CSP and `payment=()` stay, and `KEKSDOSE_CORS_EXTRA_ORIGINS` never names
      the pay host;
    - the web build writes `pay-config.json`, with return URL
      `https://keksdose.app/settings/subscription`.
22. **Keep:** `payer_ref` (`user:<id>`, so the app tag needs no data migration),
    `payer_row_for`, `EventTable`, `currency_of`, the `SOLD` filter, `refused_for_demo`
    and the webhook's provider check.
23. **When you next touch it:** `deploy/gcp/Caddyfile.cloudrun:68-70` repeats "Tailwind
    strips a bare `:root`", which is wrong; the `'unsafe-inline'` reason stands.

### kastlan (read at `feat/paddle` b3adb8f)

**Frontend**
1. Bump.
2. **Defect: the app-wide lock blocks what a lapsed plan allows.** Name the kinds on its
   sources (`app/app-layout.tsx:74-77`, the provider round `<Outlet/>` at :182-184):
   `kind: "demo"` and `useBillingWriteLock(…)`. The kit's parts then reopen by
   themselves:
   - SessionsSetting (`sessions-card.tsx:20`);
   - DeleteAccountSetting (`delete-account-card.tsx:18`);
   - EmailChangeSetting (`email-change-card.tsx:24`);
   - ProfileSetting (`settings-page.tsx:180`);
   - InvitationsPanel's revoke (`invitations-card.tsx:46`).
3. **Your own controls of that sort** take `commit={COMMIT_EXCEPT_BILLING}`:
   - leaving a company (`features/settings/components/companies-card.tsx:26`);
   - new backup codes (`backup-codes-card.tsx:21`);
   - the operator's pages, admin routes of §12.13
     (`features/platform/pages/platform-company-detail-page.tsx:186`,
     `platform-signup-invitations-page.tsx:72`, :119, :126).

   The help assistant takes `{ except: ["demo"] }`, since its backend answers 402 under
   billing. The roles in `users-panel.tsx:487` stay locked.
4. **Defect: invoices and "Cancel" are hidden under a grant**
   (`features/billing/components/subscription-section.tsx:134`, `source === "provider"`).
   - use `atProvider={data.at_provider}`;
   - `onCancel` (:137) opens the overview; ask for `target: "cancel"` (or `onPortal`);
   - the payment-failed banner asks for `"payment_method"`.
5. **The checkout poll misses a payer who buys under a grant**
   (`subscription-section.tsx:25-75`, `paidPlan`). Replace it with
   `noteCheckoutStarted`, `payPageUrl`, `useCheckoutProcessing` and the processing
   banner.
6. **Types and codes:** `features/billing/types.ts:33-45` gains `at_provider`, or imports
   the kit's `BillingOverview`. Handle the four new codes.
7. **The operator:** the platform companies page
   (`features/platform/pages/platform-companies-page.tsx:52-61`) gains `planColumn` and
   `PlanChangeConfirm`. The company is the target, without an email.
8. **Classes (k25):**
   - run the table over the 33 classes. By hand,
     `bg-[var(--text-primary)]` → `bg-inverse` (`landing-visuals.tsx:67`);
   - the shadcn names `text-muted-foreground` (108) → `text-muted`, `text-foreground` (6)
     → `text-primary`, `bg-muted` (6) → `bg-surface-2`, and `border-border` (5) →
     `border-subtle` (or kept):

     ```sh
     s/(^|[^-a-z0-9])text-muted-foreground([^-a-z0-9]|$)/\1text-muted\2/g
     s/(^|[^-a-z0-9])text-foreground([^-a-z0-9]|$)/\1text-primary\2/g
     s/(^|[^-a-z0-9])bg-muted([^-a-z0-9]|$)/\1bg-surface-2\2/g
     s/(^|[^-a-z0-9])border-border([^-a-z0-9]|$)/\1border-subtle\2/g
     ```

   - keep the shadcn `@theme` for the Radix pieces. Note that **`text-primary` now means
     ink**, not brand, and `text-secondary`/`text-muted` are text roles: the kit's
     property-scoped names win for their property (you use none of the three today).
9. **Palette status text** → `text-success` / `text-warning` / `text-info` /
   `text-danger` / `text-hue-purple`: `changelog-page.tsx:34-42` (6 pairs) and
   `import-page.tsx:250`.
10. **The Gantt today marker:** `gantt-chart.tsx:129,202` `bg-red-500` → `bg-danger`, and
    `:128` `var(--color-red-500)` → `var(--danger)`.
11. **The well on the page (k26, B′):**
    - the user chat bubbles `assistant-page.tsx:114,149` → `bg-surface`;
    - `Card variant="inset"` at `lease-unit-step.tsx:76` and
      `payment-allocate-step.tsx:143` → `variant="outline"`;
    - `lease-picker-step.tsx:126` keeps its border.
12. **Side findings:**
    - `app.css:39` `--border: var(--border);` refers to itself: drop it;
    - alias `--destructive` to `--danger` (dark `#ef4444` under white is 3.76:1).
13. **The guard:** pass `runtime: ["--radix-collapsible-content-height"]`, and
    `refusePalette: true` once step 10 is done. Use the `import.meta.glob` wiring (the app
    tsconfig has only `vite/client` types).
14. **Text size:** nothing more. Labels sit above fields at Large.

**Backend** (`eifi1-server-kit[billing,images,mail]`)

15. `billing_app = "kastlan"`; `.env.example` lists the new settings and drops
    `KASTLAN_BILLING_API_BASE_URL`.
16. **Delete:**
    - `kastlan/adapters/billing/` and `domain/ports/billing_provider.py`;
    - `tests/unit/test_paddle_client.py`;
    - in `tests/api/test_billing.py`: `FakeProvider` (:60-68), `_paddle` (:232-235),
      `_paddle_event` (:361-389) and `_signed` (:392-395);
    - `billing_api_base_url` (`infrastructure/config.py:130`).

    The hosted-checkout field (:134) becomes the kit's, under the same env name.
17. **Provider and checkout:**
    - `get_billing_provider()` (`adapters/api/billing_router.py:42-53`) →
      `billing_provider_client(settings)`, behind a module-level seam;
    - the checkout drops `return_url` and `CHECKOUT_RETURN_PATH` (:39), which was never
      sent;
    - **defect:** an unsold plan answers 503 (`domain/services/billing_service.py:213-214`).
      Use `sold_plan` → 422 `billing_plan_not_sold`, and `require_new_checkout`;
    - the portal's uncoded 409 → `billing_not_at_provider`, and it takes
      `PortalRequest`.
18. **Defect: the webhook ignores the tolerance**
    (`adapters/api/billing_webhook_router.py:47`), so a cold start answers 400. Use
    `settings.verify_billing_webhook(…)`, and `parse_webhook_event(…, app=…)` at :49.
19. **Defect: nothing cancels at the deletion request, and nothing undoes it.**
    - In `account_service.py:154-195`, call `cancel_for_deletion` for each flagged
      company's row (:171-173), with the outcome per company beside `companies_flagged`
      (:183).
    - At the reactivation (`admin_user_service.py:172-175`), call
      `resume_after_withdrawal` and audit it.
    - Also clear `company.deletion_requested_at` there: 54fb6cb on your
      `fix/deletion-and-scheduler`.
20. **Defect: the notice job logs instead of mailing.** `infrastructure/billing_scheduler.py:38-51`
    and `due_notices` (`billing_service.py:250-275`) keep no marker, so a company is
    "noticed" daily for about 8 days. Change it to:
    - the `billing_notice_sent` column;
    - `billing_notice_due` (or `billing_notices_owed`);
    - mails to the company's active admins, each in their own locale, in your four
      languages;
    - skip a company flagged for deletion, and one without an active admin.
21. **Every daily job on a token route.** **Defect:** `lease_status_daily` never runs in
    production, because `main.py:150-153` starts the in-process scheduler only with
    billing or recurring rent on. 5960504 runs the sweep at start meanwhile. Then:
    - `recurring_rent_daily`, `lease_status_daily`, `invoices_overdue_daily`,
      `assistant_retention_daily` and the notices each get
      `POST /api/v1/ops/jobs/<name>`, behind `X-Jobs-Token` (`KASTLAN_JOBS_TOKEN`);
    - APScheduler runs only with `KASTLAN_SCHEDULER_ENABLED`, for local runs;
    - `docs/gcp-hosting-plan.md:149-160` still names `_snapshot_job` and `_overage_job`,
      which are gone.
22. **The operator:** the companies list gains the status, and add
    `GET /platform/plans`.
23. **Deploy:**
    - `deploy/gcp/.env.gcp.example:29` `KASTLAN_BILLING_API_BASE_URL` →
      `KASTLAN_BILLING_ENVIRONMENT`;
    - `cloudbuild.yaml` gains `KASTLAN_BILLING_CHECKOUT_PAGE_URL`, the
      `KASTLAN_JOBS_TOKEN` secret, and the Paddle client-side token and environment as the
      web image's build arguments;
    - the pay host's site block, with the return URL `https://kastlan.app/admin/billing`;
    - kastlan sends no CSP, and needs none for Paddle. Don't add a `/pay` route inside
      `AppLayout`.
24. **Tests:** `_paddle` built `PaddleClient("pdl_test")`, a key without a prefix. Give it
    `environment="sandbox"`, or use `PaddleApiFake`.
25. **Keep:**
    - the company payer: `PAYER_PREFIX = "company:"`, `find_payer_row`, and `apply_event`
      with naive datetimes;
    - the RLS-bypass session in the webhook;
    - `billing_admin`, `KastlanBillingStatus` and `KastlanPlanOut.current`;
    - the `/admin/billing` path and `DEFAULT_CURRENCY = CHF`;
    - `EntitlementService` and `_date_beta_grants`;
    - `due_notices`' recipients and channel.

### Kurvenschmiede (read at `main`; `refactor/plan-2026-10` where marked)

**Frontend**
1. Bump.
2. **Classes (k25):** run the table over 271 classes. By hand: `plan-view.tsx:194,202`
   (`text-[var(--border-strong)]`) → `stroke-strong`, and `:211,219`
   (`text-[var(--border)]`) → `stroke-subtle`, with the `stroke="currentColor"` attribute
   dropped.
3. **GRID_INK** (`shared/charts/series-chart.tsx:4-5`) →
   `[&_.recharts-cartesian-grid_line]:!stroke-subtle`, one class for both modes. It keeps
   today's weight and follows More contrast.
4. **The control diagram:** the fix (0ac3cb5 on `fix/control-diagram`, 1193651 on
   `refactor/plan-2026-10`) lands on `main` first. The table then makes it `fill-surface`.
5. **The guard:** `src/app/css-variables.test.ts` becomes a call to
   `undeclaredCssVariables` with `refusePalette: true` (you may keep `node:fs` in the
   DOM-free project). That closes its `@theme inline` hole
   (`css-variables.test.ts:36-37`).
6. **Palette status text and icons** → `text-success` / `text-warning` / `text-danger`:
   - `gear/common.tsx:148` and `checks-panel.tsx:32,34` (amber-500 is 1.84:1 on cream);
   - `account-menu.tsx:104` and `suggestions-table.tsx:65`;
   - `gear-wizard.tsx:296,339` and `assemblies-tab.tsx:136`.
7. **The selected rows (k26):** they sit on the table's card and become visible with no
   edit (1.02 → 1.09), and stay on surface-2. Their `rowClassName` adds
   `hover:bg-surface-2 hover:outline hover:-outline-offset-1 hover:outline-strong`:
   `transmissions-tab.tsx:179`, `hystereses-tab.tsx:221`, `kinematics-tab.tsx:180` and
   `assemblies-tab.tsx:211`.
8. **The lock hooks drop the kind.** `Lock` (`features/sharing/write-lock.tsx:26-31`) is
   `{locked, reason}`, and `useRowLock` / `useOwnerLock` (:44-70) return it with the
   reason stringified. Instead:
   - name the kinds `"access"`, `"customer"` and `"billing"`;
   - return the combined lock with its `holds`;
   - `useBillingLock` (`use-billing.ts:78-82`) becomes the kit's `useBillingWriteLock`.
9. **The share dialogs have no lock.** `ShareDialog` wraps its card in `locked={false}`
   (`share-dialog.tsx:92-99`, :152). Replace that with the owner's billing lock
   (`useBillingWriteLock`, kind `"billing"`). That also covers `session-page.tsx:365`,
   which mounts `ShareButton` before its provider opens at :366, and
   `projects-page.tsx:135`. SharedBanner's "Copy to my account" (`sharing-bar.tsx`), a
   create, gets the copier's lock. Lowering a role stays live and raising stays locked,
   matching your server (`shares_router.py:229-234`).
10. **F37, the UI half:** a billing lock on adding and re-inviting team members
    (`team-card.tsx`).
11. **Billing UI:**
    - `noteCheckoutStarted` before `goTo(payPageUrl(url, locale))`;
    - the hook and the processing banner in `SubscriptionSettings`
      (`subscription-settings.tsx:42-44`, :66-71). The return lands on
      `/settings/subscription?checkout=done`;
    - `useBillingOverview` (`use-billing.ts:57-66`) hands the hook `overview` and
      `refetch`. Its "read again on focus" comment (:54-56) goes, since
      `refetchOnWindowFocus` is off (`query-client.ts:7`);
    - pass your own `storageKey`, and list it in the privacy text
      (`legal-pages.tsx:9-18`);
    - `atProvider`, the `cancel` and `payment_method` targets, and the four codes.
12. **Types:** `shared/types/billing.ts:15-27` gains `at_provider`, or imports the kit's
    `BillingOverview`; `mirror.test.ts` exempts the file, so nothing fails if you forget.
    `:44-49` gains `kept_beta`.
13. **The operator:** `planColumn` and `PlanChangeConfirm` on the user roster, calling
    `adminApi.changePlan` (`shared/api/endpoints.ts:237-239`, unused today).
14. **The `/pay` route items are moot** with `pay.kurvenschmiede.app`: no `PUBLIC_PATHS`
    entry (`client.ts:55`), no `useLastVisitedPage` exclusion (`layout.tsx:36`), and no
    `@noindex` matcher. The Paddle token and environment are the web image's build
    arguments, not `VITE_` settings.
15. **Text size (in your plan's order):**
    - the corner strip (`features/corner/corner-page.tsx:344`, `sticky top-2`;
      `h-64 sm:h-72`, capped only at `xl:` :367) needs the viewport cap at every width
      (F93). The sweep's `PINNED` check finds it;
    - DetailCard's actions (`features/gear/common.tsx:279`) wrap (F94);
    - optional: `truncate-until-large` for `features/setpoint/segment-cards.tsx:127`,
      `segment-list.tsx:173` and `features/landing/landing-visuals.tsx:163` (the last
      lacks the `overflow-wrap`);
    - the 6 RowActions sites need nothing.

**Backend** (`eifi1-server-kit[billing,mail]`: you send through `mail.ResendClient`)

16. `billing_app = "kurvenschmiede"` (`settings.py:124`). **`.env.example` lists the new
    settings, or `tests/unit/test_docs.py:63-65` (on `refactor/plan-2026-10`) fails the
    bump.**
17. **No provider client today**, so the checkout and the portal end in 503:
    - delete `billing_service.no_provider_client` (main :263-266) and the docstring's
      note (:28-32);
    - the checkout and the portal call the kit's client (`billing_router.py:95`, :107);
    - checkouts carry `checkout_custom_data_for` (main :262-265), with `sold_plan` and
      `require_new_checkout`;
    - the portal answers 409 `billing_not_at_provider`, not 503, and takes
      `PortalRequest`.
18. **Defect: the webhook ignores the tolerance** (`billing_router.py:129`). Use
    `verify_billing_webhook`, and correct `.env.example`'s claim that 60 takes effect.
    Add `parse_webhook_event(…, app=settings.billing_app)` at :130. Untagged events are
    then dropped, so your `payer_row_for` customer-id fallback (main :311-329) can't land
    on a foreign row.
19. **Defect (F36, the duplicate half):** `EventTable.record` (main :290-300) lets a raced
    duplicate's `IntegrityError` escape, a 500 and then Paddle's retry. Insert inside
    `session.begin_nested()`, catch the error, and raise `DuplicateEventError`.
20. **Defect: nothing cancels at the deletion request** (`erasure_service.py:285-320`).
    Call `cancel_for_deletion` in `erasure_service.request`, with the outcome in its
    audit entry, and `resume_after_withdrawal` at the reactivation
    (`admin_service.py:310-313`).
21. **Defect: `change_plan` overwrites a running beta** (`billing_service.change_plan`,
    main :213-259, the overwrite at :243-244). A pre-launch change with no end turns a
    beta into a lifetime grant. Keep a running beta and answer `kept_beta`.
22. **Defect (F37): adding and re-inviting team members pass no billing gate**
    (`teams_router.py:103-123`, :126-146). Add `refuse_create(session, user, …)` to both;
    the manager's own standing counts.
23. **The roster's server half:**
    - `GET /admin/users` rows gain `plan` and `status` (`schemas/admin.py:30-76`;
      `admin_router.py:115` sends only `extra.owned`);
    - add `GET /admin/plans`, since `GET /billing/plans` answers 404 while billing is off
      (`billing_router.py:75`).
24. **Test helpers:** in `billing_fixtures.py`, `STEPS` (:59-65), `_PERIOD` (:68-73),
    `paddle_event` (:76-114) and `sign_paddle` (:117-122) give way to `billing.testing`.
    The CLI (:147-186) stays.
25. **Notices** (no scheduler today, so a cardless trial gets no mail):
    - migration 0049 and the model's `billing_notice_sent`;
    - `POST /api/v1/ops/billing-notices` behind `X-Jobs-Token`, with
      `KURVENSCHMIEDE_JOBS_TOKEN` a secret in `cloudbuild.yaml:131`;
    - skip deactivated and deletion-requested accounts (a deletion-requested account
      keeps its row until erasure, `erasure_service.py:305`);
    - the deploy README's §1 gains `cloudscheduler.googleapis.com`, and its §7 and §8
      (:216-232) and CLAUDE.md's "nothing runs on a schedule" are rewritten;
    - a local run goes through the billing CLI, since Compose has no trigger.
26. **The pay host:**
    - `KURVENSCHMIEDE_BILLING_CHECKOUT_PAGE_URL` in `cloudbuild.yaml:129`;
    - the token and environment as build arguments (`deploy/gcp/Dockerfile.web`,
      cloudbuild);
    - the second site block in both Caddyfiles;
    - the return URL `https://kurvenschmiede.app/settings/subscription`.
27. **Before 0.8:** `tests/api/test_billing.py:497` (on `refactor/plan-2026-10`) posts to
    `/webhooks/lemonsqueezy`; it answers 422 then.
28. **Keep:** `payer_ref`, `payer_row_for`, `PAYER_ROLES`, `currency_of`,
    `not_in_the_demo`, `GRANTED_PLAN` and `ensure_row`.

## 4. When billing goes on: the one-time manual steps

None of this is needed to adopt 0.33. Do it in the release that turns billing on, or
earlier for the sandbox review.

**The pay host, per app** (billing §14.4):
1. **The web build** writes the page. In the build stage, after `npm ci`:

   ```dockerfile
   ARG PADDLE_CLIENT_TOKEN=""
   ARG PADDLE_ENVIRONMENT=""
   RUN npx eifi1-pay-page --out /pay \
         --token "$PADDLE_CLIENT_TOKEN" --environment "$PADDLE_ENVIRONMENT" \
         --return-url https://<app domain><subscription page> --app-name <App> \
         --terms-url <terms URL> --privacy-url <privacy URL>
   ```

   In the Caddy stage, `COPY --from=<build> /pay /srv-pay`. An empty token builds a page
   that says there is nothing to pay.
2. **Caddy:** a second site block, `http://{$PAY_HOST:pay.invalid}:{$PORT}`, with its own
   headers (§14.4 has it to copy). Unset, it answers `pay.invalid`, which never matches.
   Locally, it is a second port in Compose's Caddy.
3. **DNS:** `pay` as a CNAME to `ghs.googlehosted.com`, DNS-only in Cloudflare, like the
   apex.
4. **The domain mapping:** `gcloud run domain-mappings create --service=<app>-web
   --domain=pay.<app domain> --region=europe-west4`. Then set
   `PAY_HOST=pay.<app domain>` on `<app>-web`.
5. **Paddle → Checkout → Website approval:** add `pay.<app domain>`. The sandbox
   approves at once; live is reviewed, and wants the product, prices, terms, refund
   policy and privacy policy easy to find (the page's footer links them).
6. **Paddle → Website approval → Apple Pay verification:** "Verify" the pay host. The kit
   serves Paddle's file at
   `/.well-known/apple-developer-merchantid-domain-association`. This is optional;
   without it Paddle opens Apple Pay in a popup.
7. **A client-side token per app** (Paddle → Developer tools → Authentication), so each
   can be revoked alone. It goes to the web build with the environment.
8. **The backend:** `<APP>_BILLING_CHECKOUT_PAGE_URL=https://pay.<app domain>/`.

**The notices** (billing §14.7):
- **Kurvenschmiede and kastlan:**
  - one daily Cloud Scheduler HTTP job per route, POSTing with the header
    `X-Jobs-Token: <token>` (`--headers`). Never put the token in the query string,
    which Cloud Run's request logs record;
  - the token is the `<APP>_JOBS_TOKEN` secret;
  - Kurvenschmiede enables the Cloud Scheduler API (`cloudscheduler.googleapis.com`) in
    its project;
  - kastlan has one job per daily route (§3, kastlan 21).
- **keksdose:**
  - a Cloud Scheduler job that starts the `billing_notices` Cloud Run Job through the Run
    API, with its service account (no token), as the `notifications` Job is started;
  - the `run.invoker` binding on the new Job. Without it Cloud Scheduler gets
    PERMISSION_DENIED and nothing says so (`deploy/gcp/README.md:238-250`);
  - `gcloud scheduler jobs create http`.
- **Cost:** Cloud Scheduler is free for three jobs per billing account, then charged per
  job and month. keksdose is past the three already.

## 5. Still open, before billing goes on (billing §14.15)

None blocks adopting 0.33.
- **At signing, with Paddle:**
  - one account may sell three brands on three approved domains (decision 18);
  - CHF and the fees;
  - Paddle's DPA.
- **With Paddle, in parallel:** a hosted checkout on live (sellers@paddle.com), if it is
  still wanted.
- **In the sandbox:**
  - whether the portal switches plans (§14.6). If it can't, the fallback, a kit
    `change_plan`, is not decided;
  - the pay host end to end: Paddle.js opening the `_ptxn` transaction with `successUrl`
    and `locale`, and the exact hosts its CSP needs (Paddle publishes no list);
  - Apple Pay and Google Pay in Paddle's frame under the pay host's `Permissions-Policy`,
    and Apple Pay verification of each pay host;
  - what Paddle.js keeps on the pay host (cookies, storage), for the privacy texts;
  - which link Paddle's own emails and payment-method updates carry. Paddle uses the
    account's default payment link for them, which is one app's pay host;
  - removing a scheduled cancellation, and the `subscription.updated` it sends;
  - whether one person is one Paddle customer across the apps, and what the portal then
    lists;
  - recorded answers in place of `PADDLE_API_EXAMPLES`.

## 6. Versions

- **`@eifi1/ui-kit` `^0.33.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.7.0**, the release wheel by URL, with the extras each app needs
  and the sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.7.0/eifi1_server_kit-0.7.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.7.0/eifi1_server_kit-0.7.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.7.0/eifi1_server_kit-0.7.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `4b19684898401175a5fdd52a77fbdbb240c5969b6f00b1f20a3c2af4fdb4f47d`

## Where the build differs from the contracts

The build wins. None of these needs a decision.
- **`--bg-hover` is 5.5 % ink** (was 7 %). §12.10 left the value to the build ("lighten
  it until every role clears 4.5") and now records it: 1.09–1.13 from the card, the worst
  text role 4.47–4.89. The ordinary row hover is a little lighter in every app.
- **B′'s controls hover with a translucent ink**, `color-mix(in srgb, var(--text-primary)
  7%, transparent)`, not `--bg-hover`. §12.10 supersedes §12.1 and §10's "on
  `--bg-hover`".
- **`SubscriptionActions` also takes `onPortal(target)`**, beside the contract's
  `atProvider`. `onManage` / `onCancel` still win over it.
- **Extra exports:** `usePlanColumn` (`planColumn` with the provider's words, memoised),
  `declaredCustomProperties` from `@eifi1/ui-kit/testing`, and the `BillingOverview`,
  `PortalTarget`, `PortalRequest` and `SubscriptionSource` types.
- **`eifi1-pay-page` checks the terms and privacy URLs too**, not only the return URL
  (`https://`, or `http://` on localhost).
- **server-kit `billing_notices_owed`** (with `NoticeCandidate` and `OwedNotice`) does
  steps 1, 3 and 4 of §14.7's job: nothing while billing is off, skip deactivated and
  deletion-requested accounts, and `billing_notice_due` with the launch date and the
  marker. The contract left these to each app; `billing_notice_due` is still there.
- **`PlanChangeResponse.of` takes `usage` as its third positional argument**, and
  `kept_beta` / `comped_until` as keywords.
- **`PaddleClient` without an injected `httpx.AsyncClient` opens one per call.** Pass one
  from your lifespan for connection reuse.
- **`billing_app` is checked** against `^[a-z][a-z0-9_-]{0,63}$`.
- **The Lemon Squeezy deprecation has no runtime warning** (the apps run with
  `error::DeprecationWarning`); it is in the docstrings and the changelog.
