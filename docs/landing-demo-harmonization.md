# The public landing page and the demo — harmonisation plan

Status: **2026-10-07, reviewed.** All three apps answered the same day; §10 records
what they settled, and the sections above already follow it. Led from ui-kit at Marcel's request. It ships in
ui-kit **0.31** and server-kit **0.5**, together with the settings round
(`docs/settings-harmonization.md`).

It is built from a read-only audit of the three apps (2026-10-07; kept outside the repo),
Kurvenschmiede's and kastlan's proposals, and kastlan's demo backend (local,
`feat/demo-backend`). **kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.
keksdose is the reference for the landing page and the demo. kastlan's backend settles
the gate's order and the read-only recipe.

It amends the legal round (`docs/legal-harmonization.md`) on robots and the sitemap
(§4.3), and builds on the sign-in round (`docs/auth-harmonization.md`): `is_demo`,
`name_incomplete` never for a demo, the nullable `refresh_token`.

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| `/` signed out | the landing (`RootEntry`) | `/login` | the public dashboard in the app shell |
| `/` signed in | resumes the last page, else the landing | `/dashboard` | the same dashboard |
| Landing | hero, three job rows with mock visuals, trust strip, CTA band, footer; hard-coded teal | none | none |
| SEO | `usePageSeo` (canonical, title, description, JSON-LD), a length test for de and en | none | none; a stale index.html description |
| robots / sitemap | Disallow `/demo`; sitemap `/` | branch `fix/robots-txt`, no sitemap | commit 853e22b (not merged), sitemap `/`, `/control`, `/steering` |
| Demo | `/demo` → throwaway user, viewer share on a system budget (editor while an admin has the demo open), 60-min token, no refresh, nightly reap; a disabled demo answers 403 | backend done locally: ADMIN of a shared demo company, read-only in two layers, reap on create | none |
| Demo → account | none; `RedirectIfAuthed` sends a demo back into the app | none | — |
| Demo end | the first 401 after 60 min lands on `/login`, unexplained | — | — |
| Registration | invitation-only with the sign-in round (its step 5, in progress; `main` still has the allow-list) | invitation-only | invitation-only |

The kit has `LegalFooter`, `useNoIndex`, `ThemeToggle` / `LanguageMenu`, `TopBar` /
`TopBarBrand`, `AuthLayout`, `WriteLockProvider`, `AlertBanner`, `ServerWakeNotice` and
the crash reporter's `suppress`. It has **no** landing sections, `usePageSeo`, SEO test
helper, `RootEntry`, demo parts or demo labels. server-kit has the nullable
`refresh_token`, `access_claims(lifetime=)` and the limiter, and **no** demo module.

## 2. Decisions (Marcel, 2026-10-07)

1. **Every app gets a public landing page at `/`**, keksdose's way.
   - kastlan gets one (it had none).
   - Kurvenschmiede's `/` becomes the landing, and its dashboard moves (§3.1).
2. **"Request access" is a mail to `support@<domain>`**, answered with an invitation.
   There is no request form or table. All three apps are invitation-only, so this is the
   primary call to action everywhere.
3. **Two demo models:**
   - **R, read-only shared:** keksdose and kastlan. One pre-filled shared dataset that a
     throwaway demo user can look at but not change.
   - **S, read plus own sandbox:** Kurvenschmiede. The demo user reads system-owned worked
     examples and may create or copy work of its own, which is deleted with the demo
     account.
4. **A demo user who is later invited starts fresh.** Nothing carries over from the demo.
5. **The countdown runs to the demo account's end: 24 hours.** The demo session
   therefore lives as long as the account (§5.3), not 60 minutes.

Settled by the kit in this draft; the reviews may object:

6. **A disabled demo answers 404** (`demo_disabled`), as kastlan has it: it is "not
   there", not "forbidden". **The switch is off by default** in server-kit; keksdose sets
   it on in its environment.
7. **A new demo may start after one ends**, within the per-IP limit.
8. **Seeding never runs on the request path.** A deploy step or a one-off job fills the
   demo data. Until it has run, the mint answers 503 `demo_not_ready`.
9. **A demo user can't add a way in or out:** passkeys, API tokens, 2FA, E2EE
   enrolment, email or password change, deletion and export are all refused (§6.4).
10. **"Demo" means the demo session and the shared demo data it shows**, never the
    blur toggle: keksdose renames that (today "demo mode") to "Presentation mode".
    keksdose's "Load demo data" and "Preview demo" for signed-in users keep their
    names.
11. **Landing colours come from the kit's tokens** (`--brand` and so on). keksdose's
    teal may shift slightly where it was hard-coded.

## 3. Routes

### 3.1 The table

| Path | Who | What |
|---|---|---|
| `/` | no session | the landing (indexed, canonical `/`) |
| `/` | a session (real or demo) | **resume**: the last visited page if it isn't `/`, else the app's home |
| `/welcome` | anyone | always the landing, canonical `/`. The brand link points here when signed in |
| `/demo` | no session, or a demo session | start a demo, or continue the live one (§5.2). noindex, robots Disallow |
| `/demo` | a real session | back into the app (`RedirectIfAuthed`) |
| `/demo/ended` | anyone | the demo's end page (§5.5). noindex |
| `/login`, `/register`, the app's invitation pages | a demo session | **shown**, not redirected (§5.6). A real session is redirected as today |

**The app's home after the move:**
- keksdose: `/budget` (unchanged).
- kastlan: `/dashboard` (unchanged).
- **Kurvenschmiede:** the dashboard moves from `/` to **`/dashboard`**. Its public tools
  (`/control`, `/steering`) stay public and keep their nav entries. A signed-out
  visitor at `/` now sees the landing, and the landing links the public tools.

### 3.2 Resume (keksdose's `RootEntry` and last-visited page)

- The last visited page is kept on the device (`<app>.lastVisitedPage`). It is written
  on every route change except the excluded paths: `/`, `/welcome`, the auth pages,
  `/demo*`, legal pages, the 404, plus the app's own (keksdose `/banks/callback`,
  `/join`, `/share-target`).
- The invitation pages are each app's own: keksdose `/register?invite=<token>` and
  `/join?token=<token>`; kastlan and KS as built in the sign-in round.
- `?next=` is honoured only for a safe same-origin path (`safeNextPath`).
- The PWA's `start_url` is `/`, so opening the installed app resumes too.

## 4. The landing page

### 4.1 Structure

One page, top to bottom (keksdose's):

1. **`PublicHeader`**: the brand (logo and name), `LanguageMenu`, `ThemeToggle`, and the
   actions for the visitor's state:

   | State | Actions |
   |---|---|
   | no session | "Sign in" (secondary; hidden below sm), **"Request access"** (primary) |
   | a demo session | "Continue the demo" (secondary), **"Request access"** (primary) |
   | a real session | **"Open app"** (primary) → the resume target |

   The same header serves the auth pages, the legal pages and the 404, as in keksdose.
2. **`Hero`**: an optional badge ("Beta"), the `h1`, a subtitle, the action pair
   (**"Request access"** and **"Try the demo"**; "Open app" for a session), a trust line,
   and a visual.
3. **`FeatureRows`**: two to four rows, alternating sides. Each has an icon eyebrow, an
   `h2`, a description, up to three bullets, and a visual.
4. **`TrustStrip`**: three or four items (icon, `h3`, one sentence): hosting, security,
   data ownership, sharing.
5. **`CtaBand`**: an `h2`, a subtitle, the same action pair.
6. **`PublicFooter`**: the kit's `LegalFooter` with the app's tagline.

- **Visuals are decorative** (`aria-hidden`): mock UI drawn with kit tokens, never
  screenshots with real data. **Amounts in a mock use the demo data's currency**, so the
  landing matches what "Try the demo" opens (keksdose: EUR). The JSON-LD's price is the
  product's (keksdose: CHF), and its `@type` is the app's choice (keksdose writes
  `WebApplication`).
- **Words:** the kit owns the generic ones (Sign in, Request access, Try the demo, Open
  app, Continue the demo, Beta). The marketing copy is the app's, in every language it
  ships.
- **No cookie banner, no tracking pixel.** Analytics stays as each app has it (§6.6).

### 4.2 "Request access" (§2.2)

- A `mailto:support@<domain>` link with a subject in the visitor's language ("Access to
  <App>") and a short body template ("Name:", "Company:" for kastlan, "What would you
  use it for:").
- Mail routing to Marcel is live on all three domains (0.30).
- **When an app opens registration later**, the same slot becomes "Get started" →
  `/register`. The kit's `PublicHeader` / `Hero` take `access: {kind: "request", email}`
  or `{kind: "register", href}`.
- **The same `access` reaches the sign-in page**: `SignInForm`'s "Create an account"
  link becomes "Request access" for an invitation-only app.

### 4.3 SEO, robots and the sitemap

- **The landing calls `usePageSeo`** (lifted from keksdose, same API):
  - `canonicalPath: "/"` on both `/` and `/welcome`;
  - the title, the description, and the JSON-LD (`SoftwareApplication`; the app writes
    it).
  It restores everything on unmount.
- **One URL for all languages** (`/`). The page renders in the visitor's language. There
  are no per-language URLs and no hreflang.
- **`index.html`'s static description and `og:` tags equal the default language's
  strings**, so a crawler that doesn't run scripts sees the same words.
- **The SEO test, in every app** (the kit's `seoCopyProblems`, §7.1):
  - for every shipped language: title ≤ 60 characters, description ≤ 155;
  - the description doesn't open with the title's tagline;
  - the parity with index.html above.
- **noindex** (`useNoIndex` plus `X-Robots-Tag` from Caddy): the auth pages, the legal
  pages, the 404, **`/demo` and `/demo/ended`**.
- **robots.txt (amends the legal contract):**
  - `Disallow: /demo$` and `Disallow: /demo?`, because rendering `/demo` creates a user.
    Not the plain prefix `/demo`: that would also block `/demo/ended`, whose noindex a
    crawler must be able to fetch (`$` and `?` are RFC 9309 patterns);
  - the token routes (`/verify-email`, `/reset-password`, the invitation links), and
    `/api/`;
  - never the noindex pages: a crawler must fetch them to see the noindex.
- **sitemap.xml** lists only the indexable public pages:
  - keksdose `/`;
  - kastlan `/`. This reverses the legal round's "no sitemap where no page is
    indexable", because `/` now is;
  - Kurvenschmiede `/`, `/control`, `/steering`.

## 5. The demo

### 5.1 Starting it

`POST /auth/demo-session {locale?}` → **201** `TokenResponse`, with `refresh_token: null`
and **`expires_at`**. The checks run in this order (kastlan's):

| # | Check | Answer |
|---|---|---|
| 1 | the switch is off | **404** `demo_disabled` |
| 2 | the per-IP window (5 per hour) | **429** `demo_rate_limited`, `Retry-After` |
| 3 | delete stale demo users (§5.7), **at most the 20 oldest** | — (runs on every start) |
| 4 | the live cap (500), counting only demo users **younger than the maximum age** | **429** `demo_capacity`, no `Retry-After` |
| 5 | the demo data is missing (§2.8) | **503** `demo_not_ready` |
| 6 | mint the user and the session | 201 |

- **The IP is counted from the right**: `client_ip(headers, peer, trusted_hops=N)`
  (server-kit), where N is the number of proxies the app runs behind. Never the
  left-most `X-Forwarded-For`, which the client writes: a random header would bypass the
  per-IP window, and 500 starts would close the demo for a day (keksdose's
  `client_ip` does this today).
- **The cap counts live users only**, so a user the reap can't delete doesn't hold a
  place for ever.
- **"Ready" means the demo data exists in any version**, not only the current one, so a
  deploy that changes the seed (or keksdose's monthly restatement) never answers 503
  in between.
- **The user:**
  - email `demo+<32 hex>@demo.<domain>`. The `demo.` subdomain has no MX and no routing
    rule, so nothing can ever reach it;
  - a random password nobody holds;
  - pre-verified, `is_demo = true` (indexed);
  - first name "Demo", no last name. **Every app MUST pass `is_demo` to
    `name_incomplete(first, last, is_demo=…)`** (server-kit 0.4), or every demo would
    get the complete-your-name prompt (kastlan's `MeResponse` doesn't yet);
  - the locale from the body (canonical, §6.2 of the settings contract).
- **Model R:** keksdose gives a viewer share on the system demo budget; kastlan makes
  the user an ADMIN of the shared demo company. **Model S:** KS makes a MEMBER with
  viewer grants on the worked examples (§5.4).

### 5.2 The page `/demo` (the kit's `DemoStart`)

- It starts the demo **once**, StrictMode included (keksdose's ref guard), and shows "Starting
  the demo…". The kit's `ServerWakeNotice` covers a cold start (watch
  `/auth/demo-session`).
- **On 201:** it stores the session and replaces to the app's home.
- **A live demo session:** it continues (to the resume target) instead of starting
  another.
- **Refusals:**
  - `demo_rate_limited`: "Too many demos from this network. Try again in N min." (from
    `Retry-After`);
  - `demo_capacity`: "The demo is full right now. Try again later.";
  - `demo_disabled` and `demo_not_ready`: "The demo isn't available right now.";
  - anything else: the kit's generic error.
  Each one offers "Request access" and "Back to the start page". keksdose's fallback to
  `/register` goes, because registration is invitation-only.

### 5.3 The session (§2.5)

- **The demo's access token lives until the demo account's end:** `created_at` plus the
  maximum age (24 h). There is no refresh token. `expires_at` in the `TokenResponse`, and
  `demo_expires_at` in `/auth/me`, say when.
  - This replaces the 60-minute token. A token that ended at 60 minutes while the
    countdown showed 23 h left would contradict the banner, and a refresh token would
    add a second credential to a throwaway account.
  - The risk stays small: a demo user can't write (model R) or can only write its own
    throwaway sandbox (model S), and can't add any way in (§6.4).
  - `demo_session_token_minutes` goes away.
- **The client keeps the demo session across a reload.** kastlan holds its access token
  in memory and rehydrates from the refresh token, so a demo would be lost on every
  reload. It stores the demo's access token (and only the demo's) under a key of its
  own (`kastlan.demoSession = {access_token, expires_at}`), read when there is no
  refresh token. Its 401 → refresh path skips a demo.
- **The 24-hour token ships only together with the refusals of §6.4**, in the same app
  release. Until those are in, a demo token can create API tokens, register passkeys,
  enable 2FA and subscribe to push (keksdose today), and a day-long token makes that
  worse.
- **The countdown and the end are the client's**, from `expires_at`. It never decodes the
  JWT.

### 5.4 Inside the app

- **`DemoBanner`**, a kit `AlertBanner` strip under the top bar on every page:
  - "Demo · 23 h 12 min left" (minutes only in the last hour; the warning tone in the
    last 10 minutes);
  - one line on the model: R "You're looking at sample data. Changes aren't possible.",
    S "Your own work is deleted when the demo ends.";
  - **"Request access"** (the mailto) and **"Sign in"**.
  It can be collapsed for the session, never hidden for good.
- **Model R:** the kit's `WriteLockProvider locked` with the reason "Not possible in
  the demo." Every control that writes already opts in with `commit`. A refused write
  (`demo_read_only`) shows no toast; the lock already explains it.
- **Model S (KS):**
  - the worked examples are owned by a **system account** and reach the demo user
    through viewer grants (a "Demo" team, KS's choice). They are filled by a deploy step
    or job, never per request;
  - the demo user creates and copies its own work ("Copy to my account" included). It
    owns those rows, which cascade when the user is deleted;
  - sharing, inviting, teams and feedback are refused (§6.4);
  - **the "Demo" team is a system team**: hidden from `/teams` and `/admin/teams`, and
    closed to demo users like every team, since its member list would show every live
    demo. One membership row per demo user (it cascades at the reap) and one viewer
    grant per worked example, made once by the convergence step. "Copy to my account"
    works through it, because it is a read grant;
  - "ready" means: the system account exists and the team holds its grants.
- **keksdose:** its `PreviewBanner` skips a demo user, who gets `DemoBanner` instead; it
  stays for a **real** user previewing the demo budget. A demo user is **pinned to
  viewer**, whatever `demo_editable` says: an editor's rows block the reap (§5.7).
  `enter_preview` grants demo users viewer, and the admin's "editable" switch skips
  them.

### 5.5 The end

- At `expires_at`, or on **any 401 while the session is a demo**, the client clears the
  session and replaces to **`/demo/ended`**, never to `/login`.
- **`DemoEnded`** (on `AuthLayout`, noindex): "The demo has ended.", one line ("Sample
  data is reset regularly; your own work from the demo is deleted." for model S), and
  three actions: **"Start a new demo"** (`/demo`), **"Request access"**, **"Sign in"**.
- The server deletes the user at the next reap (§5.7). Nothing is kept.

### 5.6 From the demo to an account (§2.4)

- `RedirectIfAuthed` lets a **demo** session through to `/login`, `/register` and the
  invitation page. A real session is still redirected.
- **A successful sign-in or registration replaces the demo session.** The client drops
  the demo token first and doesn't sign it out: the demo user is reaped anyway, and a
  logout POST would cost a request for nothing.
- **Nothing carries over** (§2.4). The demo's sandbox (model S) is not offered for
  import.
- An invitation sent to someone who once used the demo is an ordinary invitation. The
  demo user has no real address, so there is no link to make.

### 5.7 The reap

- **Who:** `is_demo AND created_at < now - max_age` (24 h), the same instant the token
  ends.
- **How:** first delete or detach every row that would block the user's deletion, then
  delete the users. Each app lists its rows:
  - keksdose: shares and comments today. Pinning demo users to viewer (§5.4) keeps the
    list short; the reap test must create every row a demo user still can;
  - kastlan: sessions and audit rows (a sign-out is logged), feedback and contact links
    set to null;
  - KS: one `DELETE` (the sandbox cascades).
- **When:** on every demo start (§5.1 step 3) in every app, and **also** in a scheduled
  job where the app has a job runner (keksdose's `demo_cleanup`; KS's erasure job from
  0.30 can run it as well). Reaping on start keeps the live cap honest when the job is
  late. **A start reaps at most the 20 oldest**; the job, or the next starts, take the
  rest.
- **One reap is one transaction per user** (a savepoint per user inside the start's
  request), so one bad row can't roll back the whole batch and close the demo at the
  cap. It is logged as a count, never per address.
- **A test in every app:** create a demo user, let it do everything the model allows,
  age it past the maximum, reap, and assert the user is gone.

## 6. The backend

### 6.1 Settings (server-kit `DemoSettings`; keksdose's names)

| Setting | Default |
|---|---|
| `demo_session_enabled` | **false** (§2.6) |
| `demo_user_max_age_hours` | 24: the account's life and the token's (§5.3) |
| `demo_session_max_live` | 500 |
| `demo_session_rate_max` | 5 (0 or less turns the per-IP window off) |
| `demo_session_rate_window_seconds` | 3600 |

plus the app's own (kastlan `demo_company_slug`). `demo_session_token_minutes` goes away.

### 6.2 The codes

All are answered as `{detail, code}` (auth §5, `install_contract_error_handlers`):

| Code | Status | When |
|---|---|---|
| `demo_disabled` | 404 | the switch is off |
| `demo_rate_limited` | 429 + `Retry-After` | the per-IP window |
| `demo_capacity` | 429 | the live cap |
| `demo_not_ready` | 503 | the demo data isn't there |
| `demo_read_only` | 403 | model R: any write |
| `demo_refused` | 403 | either model: an action a demo never may (§6.4) |

The kit knows them (`DemoErrorCode`, read by `authErrorCode` / `isAuthError`).

### 6.3 Model R: read-only in two layers (kastlan's recipe)

1. **At the auth dependency:** for a demo user, every method other than GET, HEAD and
   OPTIONS is a 403 `demo_read_only`, except **the app's allow-list**: kastlan
   `POST /auth/logout`; keksdose `POST /assistant/ask` and
   `DELETE /assistant/threads/{id}` (the per-demo assistant budget of §6.4; it has no
   logout route). server-kit's `demo_write_allowed(method, path, allow=…)` makes the
   decision, with an empty default; the app's `get_current_user` calls it.
2. **At the database:** the demo's requests run in a read-only transaction (Postgres
   `SET TRANSACTION READ ONLY`, kept for every later transaction of the request by an
   `after_begin` listener). A write hidden in a GET then fails at the database. This is
   a documented recipe, not server-kit code: the kit has no SQLAlchemy.

A test sends every plain GET route as a demo user and expects no 5xx.

keksdose's RLS and viewer share are its database layer. It adds layer 1, so a write the
role check misses is still refused.

### 6.4 Never for a demo user (both models)

Answered with 403 `demo_refused` (`refuse_demo(user, what)`), or silently skipped where
noted. **Layer 1 of §6.3 catches only writes**, so every route below that reads by GET
(the account export, for one) calls `refuse_demo` itself, and the app's demo test sends
each of them.

- **Mail of any kind:** reset, verification, notices (skipped silently: the reset
  answers as usual);
- **Ways in and out:** passkeys, API tokens, 2FA, E2EE enrolment, email or password
  change, account deletion, **the account export** (`GET /auth/me/export`). The app's
  own data exports stay allowed: they are reads of sample data and part of trying the
  product (KS's curve exports, keksdose's `/export/*`);
- **The account's language:** not refused, but never written. The client keeps a
  demo's pick on the device (settings §6.2);
- **Outside contact:** feedback and its attachments (a crash report answers 202
  `stored: false`), support and chat, push subscriptions;
- **Uploads** of any kind (model S included);
- **Billed AI:** refused, unless the app sets its own per-demo budget (keksdose's
  assistant, 5 a day, 200 a day across all demos);
- **Expensive reads** (rendering, large exports): a per-demo budget through the kit's
  limiter keyed by user id, or refused. kastlan renders its PDFs with LaTeX on GET
  (about a second of CPU each) and gives a demo 20 an hour;
- **Roles and money:** the reviewer role, billing, invitations, sharing and teams;
- **Model R:** creating top-level containers (a budget, a company);
- **Admin actions on a demo user** (keksdose's mail, plan, password change).

### 6.5 Hidden from lists and counts

- Demo users are left out of every user list, the admin roster included. An admin may
  show them with a filter (keksdose's `include_demo`, with a "Demo" chip).
- They are left out of user, login and product metrics, out of support recipients, and
  out of KS's transfer recipients. The 0.30 admin actions refuse a demo target.
- **The crash reporter suppresses a demo session** (`suppress: isDemoSession`). kastlan's
  would otherwise get a 403 on every crash POST.

### 6.6 Analytics

Where an app has page analytics (keksdose's Plausible proxy, on in production), a demo
session sends **no page views**: the client sets Plausible's `plausible_ignore` in
localStorage for the demo's lifetime. The backend sends one "Demo started" event at
the mint. Landing views before the demo count as usual.

## 7. What the kits add, what stays app-side

### 7.1 ui-kit 0.31

**Landing** (main entry):
- `PublicHeader({brand, homeHref, session: "none" | "demo" | "user", access, signInHref,
  openAppHref, demoHref, labels})`, built on `TopBar` and `TopBarBrand`, with the
  language menu and theme toggle;
- `Hero`, `FeatureRows` / `FeatureRow`, `TrustStrip`, `CtaBand`, `PublicFooter`;
- `accessAction(access)`: the mailto (subject and body in the language) or the register
  link;
- `LandingActions`: the action pair for the session state, used by `Hero` and `CtaBand`.
- `SignInForm access`: its "Create an account" link becomes "Request access" (§4.2).

**SEO:**
- `usePageSeo({canonicalPath, title?, description?, jsonLd?})`, keksdose's verbatim;
- `seoCopyProblems({title, description, brand}, {maxTitle: 60, maxDescription: 155})` and
  `metaContent(html, selector)`, for the app's test.

**Routing** (`./shell` slice):
- `RootEntry({session, resumePath, landing, home})`;
- `RedirectIfAuthed({session, allowDemo, fallback})`;
- `useLastVisitedPage({key, exclude})`, `readLastVisitedPage`, `safeNextPath`.

**Demo:**
- `DemoStart({start, onStarted, access, labels})`: §5.2;
- `DemoBanner({expiresAt, model: "read-only" | "sandbox", access, signInHref})`:
  §5.4, with `useDemoCountdown(expiresAt)`;
- `DemoEnded({restartHref, access, signInHref, model})`: §5.5;
- `DemoErrorCode`, and `isDemoSession(me)`.

**Labels:** new `landing` and `demo` namespaces in seven languages, kit words only.

**Showcase:** a **Landing & demo** page (App chrome group): a sample landing
("Ada's Garden Planner", synthetic), the three header states, `DemoStart`'s refusals,
the banner at 23 h / 50 min / 4 min, and `DemoEnded`.

### 7.2 server-kit 0.5

`eifi1_server_kit.demo`:
- `DemoSettings` (§6.1);
- `DemoGate`: the order of §5.1 around the app's three callbacks (`reap(limit=20)`,
  `count_live`, `is_ready`), using a per-IP `Budget(5, 3600)` from the settings; it
  raises `DemoError` with the code, status and `Retry-After`;
- `client_ip(headers, peer, *, trusted_hops)` (§5.1), for the demo window and every
  other per-IP limit;
- `demo_address(domain)`, `is_demo_address(email)`, `demo_password()`;
- `demo_expires_at(created_at, settings)` and `stale_cutoff(now, settings)`;
- `demo_write_allowed(method, path, allow=…)` (§6.3) and `refuse_demo(user, what)` →
  `DemoError("demo_refused")`;
- `DemoErrorCode`, handled by `install_contract_error_handlers`.

In `auth`:
- `TokenResponse.expires_at: datetime | None`;
- `UserResponse.demo_expires_at: datetime | None`.

### 7.3 App-side

- The demo data and its seeder, never on a request (§2.8): keksdose's demo budget (out
  of `enter_preview` **and** out of a signed-in user's `POST /budgets/preview`; its
  `demo_cleanup` job reaps, then converges, and Cloud Build runs it once after each
  deploy), kastlan's `demo_company`, KS's worked examples in its migrate job after
  `alembic upgrade head`.
- The access mechanics: keksdose's RLS and shares, kastlan's company ADMIN and read-only
  transaction, KS's grants and sandbox.
- The refusals at each route (§6.4), the reap's row list, the job wiring.
- The landing copy, the visuals, the JSON-LD, robots, the sitemap, Caddy headers.

## 8. Per repo

- **keksdose:**
  - the landing onto the kit parts (header, hero, rows, trust, CTA band, footer), with
    kit tokens for its about ten hard-coded teal sites;
  - "Get started → /register" becomes "Request access": the header, the hero, the CTA
    band, the demo start's fallback and the sign-in page's register link;
  - `usePageSeo` and the SEO test from the kit, for all shipped languages;
  - `DemoStart`, `DemoBanner` (with `PreviewBanner` skipping a demo), `DemoEnded`, the
    401 → `/demo/ended` rule (today a hard navigation to `/login`), and
    `RedirectIfAuthed` and the header treating a demo as a demo;
  - Plausible: `plausible_ignore` for a demo, plus "Demo started" from the backend;
  - backend:
    - the token to the account's end, with `expires_at` and `demo_expires_at`,
      **shipped together with the missing refusals of §6.4** (passkeys, API tokens, 2FA,
      E2EE, push, email and password change), now coded `demo_refused`;
    - the switch: ON in its own settings subclass; 404 when off;
    - the gate: readiness by any demo stamp, the cap counting live users, `client_ip`
      from the right;
    - the reap on start (20 oldest, a savepoint per user), its row list taken from the
      erasure's foreign-key plan;
    - the seeder off every request path: `demo_cleanup` reaps then converges (creating
      the budget when missing), Cloud Build runs it once after each deploy, both entry
      paths only grant the share, and the dev setup and test fixtures seed first;
    - demo users pinned to viewer (`enter_preview`, and the admin's editable switch
      skipping them);
    - layer 1 of §6.3 with its assistant allow-list (RLS is its database layer);
  - "demo mode" (blur) renamed "Presentation mode".
- **kastlan:**
  - a landing at `/` (signed out); `/` for a session resumes; `/welcome`;
  - robots and sitemap: `/` indexed, `Disallow: /demo$` and `/demo?` (the held
    `fix/robots-txt` branch, updated);
  - the client: a null refresh token, `kastlan.demoSession`, the refresh path skipping a
    demo;
  - `/demo`, the banner, the end, the 401 rule, and the crash reporter's `suppress`;
  - backend:
    - the token to the account's end, `expires_at`, the codes;
    - `DemoGate` and `demo_write_allowed` from server-kit in place of the local order;
    - `name_incomplete(…, is_demo=…)`, and "Demo" with an empty last name;
    - `refuse_demo` on the GET routes of §6.4 (the account export);
    - 20 PDFs an hour per demo user;
    - the reap with a savepoint per user;
  - the demo backend ships with the landing in 0.31 (Marcel).
- **Kurvenschmiede:**
  - the landing at `/`, the dashboard to `/dashboard` (the sidebar's Home follows),
    the brand link to `/welcome` when signed in, the resume;
  - the public tools linked from their feature rows ("Open — no account needed"), not
    the header;
  - `usePageSeo`, the SEO test, and a new index.html description;
  - robots (853e22b merged, plus `Disallow: /demo$` and `/demo?`) and the sitemap;
  - the demo, model S:
    - `is_demo`, the endpoint through `DemoGate`;
    - the system account, its worked examples and the hidden "Demo" team, converged in
      the migrate job;
    - the sandbox; app data exports allowed;
    - the refusals (sharing, inviting, teams, feedback, uploads, mail, the account
      export);
    - the reap on start and in the erasure job;
  - the frontend parts as above, and `FeedbackMenu` hidden for a demo.

## 9. Order

The parts need ui-kit 0.31 and server-kit 0.5. kastlan ships its demo backend together
with its landing page. keksdose adopts after its sign-in round and 0.30;
Kurvenschmiede after its 0.30 adoption.

## 10. Settled after the reviews (2026-10-07)

All three apps reviewed the draft (4a2940f) the same day. The sections above follow
what they settled; this is the list.

1. **24 hours for the account and the token** (all three). keksdose: only together with
   the §6.4 refusals, in the same release (§5.3).
2. **The gate** (keksdose):
   - readiness by any version of the demo data;
   - the cap counts live users only;
   - the IP counted from the right (`client_ip(trusted_hops)`), never the left-most
     header;
   - the start reaps at most 20 (§5.1, §5.7).
3. **Every app passes `is_demo` to `name_incomplete`** (kastlan; §5.1).
4. **The allow-list of layer 1 is the app's**, empty by default (keksdose: no logout
   route, but its assistant; §6.3).
5. **GET routes on the never-list refuse explicitly** (kastlan); **app data exports
   stay allowed**, only the account export is refused (KS, keksdose); **expensive reads
   get a per-demo budget** (kastlan; §6.4).
6. **A demo's language pick stays on the device** (KS; §6.4, settings §6.2).
7. **KS's "Demo" team is a hidden system team** (KS; §5.4).
8. **robots:** `Disallow: /demo$` and `/demo?`, so `/demo/ended`'s noindex stays
   fetchable (keksdose; §4.3).
9. **The seeder:** keksdose's existing cleanup job reaps and converges, run once after
   each deploy; KS converges in its migrate job (§7.3). keksdose's job runs at 04:30 UTC,
   so between midnight on the 1st and 04:30 the current month looks empty; moving the
   trigger to 00:05 UTC is one manual `gcloud scheduler jobs update`, Marcel's to run
   if wanted.
10. **Wording:** "demo" covers the demo session and its shared data; mock amounts use
    the demo data's currency; invitation pages are each app's own; the `access` choice
    reaches the sign-in page (§2.10, §3, §4.1, §4.2).
11. **Analytics:** `plausible_ignore` for a demo, "Demo started" from the backend
    (keksdose; §6.6).
12. **The public tools** are linked from the feature rows only (KS; §8).
