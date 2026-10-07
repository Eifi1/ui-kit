# Adopting `@eifi1/ui-kit` 0.31 and `eifi1-server-kit` 0.5

The settings page, the public landing page and the demo (Marcel, 2026-10-07), plus two
feedback changes and the server-kit documentation in the showcase.

The contracts, reviewed by all three apps:
- `docs/settings-harmonization.md`
- `docs/landing-demo-harmonization.md`
- `docs/feedback-harmonization.md` §8 (new)

Each contract's §8 is the per-app checklist, and §10 records what the reviews settled.
This note is the kits' side.

Each app adopts 0.31 after its 0.30 adoption. kastlan ships its demo backend together
with its landing page.

## 0.31.1

A patch from keksdose's 0.30 bump. Nothing to change unless you want to drop a
workaround.

- **`AdminPerson` reads server-kit's `PersonRef` as it serialises** (`first_name` /
  `last_name`, beside the kit's `first` / `last`). Hand the server's `invited_by` or an
  action's actor over as it came, and drop the mapping.
- **`ResetPasswordForm`** shows the dead-link state for a coded `token_expired` on save
  too, not only `token_invalid`.
- **The verification resend** (`EmailVerificationBanner`, `VerifyEmailStatus`) says "Too
  many attempts. Try again in N s / N min." for a 429 when your `describeError` has no
  words of its own (`verifyEmail.rateLimited`).
- **Auth contract §10.15:** expose `Retry-After` in your CORS headers, or the forms can't
  read the wait from a cross-origin API.
- **Invitations keep expiring** (§10.14): the 14 days are the unused link's, and the
  account is permanent. No migration.

## Everyone, on the bump

1. Bump the kit to `^0.31.0` by hand (a caret below 1.0 locks the minor version). Take
   server-kit 0.5.0: the release wheel's URL in the install line, with the sha256 pinned
   in `uv.lock`.
2. **Changes you will see:**
   - **`TwoFactorSetting` has a title**, "Two-factor authentication", with an On/Off chip
     beside it. This replaces the line "Two-factor authentication: Off", which would
     otherwise print the name twice. An app that translated only `status` keeps its own
     word, because the title falls back to it.
   - **The DataTable phone card** draws its keyboard frame inside the card and drops the
     browser's tap highlight (keksdose live #394).
   - **`FeedbackRowDetail` opens with a "Subject" section**: the category badge and the
     title (keksdose live #395). `showSubject={false}` leaves it out.
3. **Feedback has an eighth status, `READY`** ("Ready to implement"), between OPEN and
   IN_PROGRESS (feedback contract §8.2, keksdose live #396):
   - **The type:** `FeedbackStatus` gains `"READY"`, so a `Record<FeedbackStatus, …>` of
     your own fails to compile until it has the entry. That is on purpose.
   - **The database:** a status enum needs the value, in Postgres
     `ALTER TYPE feedbackstatus ADD VALUE 'READY' AFTER 'OPEN'`. Existing OPEN rows stay
     OPEN, and Marcel triages them once.
   - **The server** (server-kit `feedback`):
     - `initial_status(author_is_admin=…, crash=…)` creates an admin's own report as
       READY and a crash as OPEN;
     - `rework_status(actor_is_admin=…)` sends an admin's rework to READY and anyone
       else's to OPEN. `plan_update` already applies it. **Changed:** an admin's rework
       used to reopen to OPEN.
   - **The UI:**
     - the chain, the picker and the swipe go OPEN → READY → IN_PROGRESS;
     - the author may edit a READY row;
     - "Waiting for you" now holds OPEN, IN_EVALUATION and NEEDS_LIVE_TEST.
   - **keksdose's feedback-loop scripts** pick READY and IN_PROGRESS.
4. **A new option, nothing required:** `AppShellNavItem.mobileHidden` leaves an entry out
   of the phone's bottom bar (the sidebar keeps it). Use it for an entry the phone
   reaches another way, when one cell fewer keeps the others' labels whole. The bar
   divides its width evenly.
5. **From the 0.30 adoptions:**
   - `InvitationsPanel` also revokes an **expired** invitation, so an app that keeps its
     rows can remove it;
   - `listTitle={null}` leaves the panel's own heading out under a card headed
     "Invitations";
   - ADOPTING.md step 7 covers testing the confirm dialogs (`fireEvent.submit`).
6. **server-kit 0.5 has no breaking change.** `ProfileUpdate` behaves as before until
   you set `offered_locales`.

## New in the kit: settings

From `@eifi1/ui-kit` and, for the router-aware parts, `@eifi1/ui-kit/shell`.

**The catalogue:**
- `SettingsGroup` `{id, icon, title, help, visible?}` and `SettingsEntry` `{id, group,
  anchor, title, keywords?, visible?}`: one entry per setting.
- A group with no visible entry is hidden. A demo marks its refused cards
  `visible: false`.

**`SettingsLayout`:**
- Props: `{title?, groups, entries, basePath, defaultGroup?, aliases?, search?, width?,
  layout?, renderGroup(group, sub), phoneFooter?, labels?}`.
- **Desktop:** a sticky sidebar.
- **Phone:** the group list, then the group's page with "‹ Settings".
- **Search** shows above 8 entries (`SETTINGS_SEARCH_THRESHOLD`); an explicit `search`
  wins.
- `width="7xl"` is for keksdose's admin page.
- `layout` pins `"desktop"` or `"phone"`; the default is `"auto"`.

**The routes**, via `useSettingsRoute`:
- `/base/<group>[/<sub>]`.
- **The legacy hash**, `/base?<query>#g[/s]`, is converted with the whole query on
  every navigation.
- **History:** a phone pushes and a desktop replaces.
- `/base?focus=<anchor>` with no group opens the anchor's group.
- A path outside `basePath` is left alone.

**Inside a group:**
- **Focus:** `?focus=<anchor>` rings the card for 1.8 s, then removes only `focus`.
- **`SettingsSection`** `{anchor, title, titleVisible?, description?, tone?, action?}`
  is your own card, at the settings type scale. In development it throws when its anchor
  has no entry.
- **The kit's own cards** take `id` as their anchor.
- **The heading level:** inside the layout the kit's setting cards title themselves as
  headings (`SettingsHeadingLevel`). Outside it, nothing changes.
- **`useSettingsLayout()`** gives a card `selectSub(sub)`, for keksdose's swipe surface.

**Search, theme and language:**
- **⌘K:** `settingsSearchEntries(groups, entries, {basePath})`.
- **`ThemeSetting variant="toggle"`:** the segmented system / light / dark control.
- **`useAccountLanguage({account, device, setDevice, save, isDemo, offered, fallback,
  browser?})`** follows settings §6.2:
  - the device's own pick → the account → the browser → the default;
  - at sign-in the account applies unless the device has its own pick;
  - a pick writes the device and calls `save`, except in a demo;
  - nothing writes the account on its own.
  The pure resolver is `resolveAccountLanguage`.
- **The page title** ("<group> · Settings · <app>") is yours to set; the kit doesn't
  know the app's name.

The `settings` label namespace is in seven languages.

## New in the kit: landing page and demo

**The landing:**
- `PublicHeader` `{brand, homeHref, session: "none" | "demo" | "user", access,
  signInHref, openAppHref, demoHref}`.
  - It renders `TopBarBrand`, so it needs a router or the provider's `linkComponent`.
- The sections: `Hero`, `FeatureRows` / `FeatureRow` (up to three bullets),
  `TrustStrip`, `CtaBand`, `PublicFooter` (`LegalFooter` with a tagline), and
  `LandingActions`.
- **The access choice:** `access: {kind: "request", email, app?, askCompany?}` (a
  mailto with the subject and body in the reader's language) or `{kind: "register",
  href}`. `accessAction()` builds the link.
  - **`SignInForm access`** turns "Create account" into "Request access".

**SEO:**
- `usePageSeo({canonicalPath, title?, description?, jsonLd?})` is keksdose's, verbatim.
- For your SEO test: `seoCopyProblems({title, description, brand}, {maxTitle: 60,
  maxDescription: 155})`, and `metaContent(html, selector)` for the parity with
  index.html.

**Routing** (also in `./shell`):
- `RootEntry({session, resumePath, landing, home})`.
- `RedirectIfAuthed({session, allowDemo?, fallback, children?})`: with no children it
  renders an `<Outlet/>`.
  - **A live demo at `/demo`** is continued by wrapping `/demo` in `RedirectIfAuthed`
    without `allowDemo`.
  - **`/login`, `/register` and your invitation pages** take `allowDemo`.
- The last visited page: `useLastVisitedPage({key, exclude})`, `readLastVisitedPage`,
  `clearLastVisitedPage`, `safeNextPath` and `DEFAULT_LAST_VISITED_EXCLUDES`. Add your
  own excludes.

**The demo:**
- **`DemoStart({start, onStarted, access, backHref})`:**
  - it starts once under StrictMode;
  - it maps `demo_rate_limited` (with Retry-After), `demo_capacity`, `demo_disabled` /
    `demo_not_ready` and other errors to messages;
  - it is page content for **your** `AuthLayout`, like `NotFoundPage`.
  - Count its POST in your `ServerWakeNotice`:
    `watchReadsAnd(/\/auth\/demo-session\b/)`.
- **`DemoBanner({expiresAt, model: "read-only" | "sandbox", access, signInHref,
  onEnded})`:**
  - "Demo · 23 h 12 min left", minutes only in the last hour, the warning tone from
    10 minutes;
  - it can be collapsed for the session;
  - `onEnded` fires at zero, so send the user to `/demo/ended`;
  - `useDemoCountdown` / `demoCountdown` is the logic.
- **`DemoEnded({restartHref, access, signInHref, model})`**, on your `AuthLayout`,
  noindex.
- **Model R's lock:** `<WriteLockProvider locked reason={useDemoLabels().writeLocked}>`.
- **The codes:** `DemoErrorCode` is known to `authErrorCode` / `isAuthError`.
  `isDemoSession(me)`.

The `landing` and `demo` label namespaces are in seven languages: the kit's words only.
Your marketing copy stays yours.

## New in the server kit (0.5.0)

**`eifi1_server_kit.settings`:**
- **`apply_patch(obj, update, *, not_nullable, defaults=None)`** applies the PATCH rule
  (settings §6.1) to PATCH and PUT bodies alike.
  - `not_nullable` is required; pass `()` when every field may be cleared.
  - `defaults` lets a `null` reset a field to a value, as keksdose's push preferences
    need.
  - It checks every null before writing, and refuses a model without `extra="forbid"`.
  - The refusal is `PatchNullError`: 422, `code: "not_nullable"`, `fields`.
- **`canonical_locale(tag, offered)`**: `de` / `de-DE` → `de-CH`, an exact offered
  match, or `None`.
- **`parse_accept_language(header, offered)`**.
- **`profile_update_model(offered)`**, or set `ProfileUpdate.offered_locales` on your
  own subclass. mypy won't take a factory's result as a base class.

**`eifi1_server_kit.user_admin`** (from kastlan's 0.30 adoption): `UserListResponse.levels`
maps an action to the `ConfirmationLevel` the server will demand, so a roster renders
the right confirmation before its first request. `SUMMARY_ACTIVE_ADMINS` names the
`summary` key the last-admin lock reads.

**`eifi1_server_kit.demo`:**
- **`DemoSettings`:** a pydantic mixin with the five settings; `enabled` is False by
  default, so keksdose turns it on in its own settings.
- **`DemoGate(settings)`**, then `await gate.admit(ip, reap=…, count_live=…,
  is_ready=…)`, in the order of landing §5.1. It is async only.
  - `reap(cutoff=, limit=20)` must commit **per user**, so a later refusal doesn't roll
    the reap back.
  - `count_live(cutoff=)` gets the same cutoff, so nobody is counted as both stale and
    live.
  - It raises `DemoError` (`code`, status, `Retry-After` in `.headers`).
- **`demo_write_allowed(method, path, allow=…)`:** GET, HEAD and OPTIONS always pass.
  `allow` holds `"METHOD /path"` entries, where `{name}` matches one segment; there is
  no default.
- **`refuse_demo(user_is_demo, what)`** → 403 `demo_refused`.
- **The throwaway user and its dates:** `demo_address(domain)`, `is_demo_address`,
  `demo_password()`, `demo_expires_at(created_at, settings)`,
  `stale_cutoff(now, settings)`.

**The rest:**
- **`limiter.client_ip(headers, peer, *, trusted_hops)`** counts from the right of
  `X-Forwarded-For`. A header shorter than `trusted_hops` falls back to the peer, never
  to the left-most entry.
- **`auth`:** `TokenResponse.expires_at` and `UserResponse.demo_expires_at`, serialised
  in UTC with `Z`.
- **`feedback`:** `READY`, `initial_status`, `rework_status`. See "Everyone" above.
- **Errors:** `install_contract_error_handlers` answers `PatchNullError` and
  `DemoError`, with `Retry-After` on the response.

**The rules that ship together** (landing §5.3, §6.4):
- **The 24-hour demo token** ships only in the same release as the refusals of §6.4.
- **Every app passes `is_demo` to `name_incomplete`.**
- **A GET route on the never-list** calls `refuse_demo` itself.
- **Expensive reads** get a per-demo budget.

## The server kit in the showcase

The showcase at eifi1.github.io/ui-kit has a **Server kit** group: every public module,
its signatures and docstrings, the contract section it implements, and previews of the
mail layout. Each server-kit release attaches `server-kit-api.json` beside the wheel,
and the showcase pins it. Kit pages and server modules link to each other.

## Per app

The contracts' §8 hold each app's list. In short:

- **keksdose:**
  - **Settings:**
    - its settings page and admin page onto `SettingsLayout`;
    - the drill-down on phones;
    - `/settings#…` links to paths: the routes, the account menu, ⌘K, the tours, the
      swipe card, the help corpus and its rebuild;
    - `ProtectedRoute` keeps the hash;
    - theme with "system";
    - the language rules (`caches: []`, no session-start write, a locale migration);
    - the push bodies under the PATCH rule.
  - **Landing and demo:**
    - the landing onto the kit parts, "Request access";
    - the demo parts and the 401 → `/demo/ended` rule;
    - backend: the token to the account's end, together with the missing refusals;
      `DemoGate`; `client_ip` from the right; the reap on start; the seeder in
      `demo_cleanup`; demo users pinned to viewer; layer 1 with its assistant
      allow-list; `plausible_ignore`; the blur renamed "Presentation mode".
  - **Feedback:** READY in the enum and the loop scripts.
- **kastlan:**
  - **Settings:** `/profile` → `/settings/<group>`; `/users` → `/admin/users`, plus
    `/admin/company`, `/admin/billing` (hidden while billing is off) and
    `/admin/activity`; `/import` stays a page; the poller follows
    `browser_notifications`; the PATCH rule on `/company/settings`.
  - **Landing:** a landing at `/`; robots and sitemap with `/` indexed and
    `Disallow: /demo$` and `/demo?`.
  - **Demo:**
    - `kastlan.demoSession` with the refresh path skipping a demo;
    - `DemoGate` and `demo_write_allowed` (`POST /auth/logout`);
    - `name_incomplete(…, is_demo=…)`;
    - `refuse_demo` on the GET routes;
    - 20 PDFs an hour per demo user;
    - the crash reporter's `suppress`.
  - **Feedback:** READY in the enum.
- **Kurvenschmiede:**
  - **Settings:** `/account` → `/settings/<group>`; `/admin/users|teams|invitations|
    activity`; the theme card; `LanguageIn` → `canonical_locale`.
  - **Landing:** a landing at `/`, the dashboard to `/dashboard`, the public tools
    linked from the feature rows; robots and the sitemap.
  - **Demo, model S:**
    - the system account and the hidden "Demo" team, converged in the migrate job;
    - the sandbox; app data exports allowed;
    - the refusals;
    - the reap on start and in the erasure job.
  - **Feedback:** READY in the enum.
