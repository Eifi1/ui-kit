# The top bar — harmonisation plan

**Settled 2026-10-17** (Marcel, in the ui-kit session: "As proposed", after the three app reviews in
audits/round-043/topbar-reviews.md; §6 wins over §2–§4). It
ships in the same release as billing §16 and the admin area: **ui-kit 0.42, server-kit
0.14**.

Marcel, in the ui-kit session, 2026-10-17:
- "The top bar lacks harmonization. The ordering Search, light/dark mode, feedback and
  tours shall be there in that order. The language select shall come inside the user menu
  like in keksdose. The tour icons are not harmonized, take the one from keksdose. The plan
  and role switcher shall both be there for all apps in local dev mode."
- "Since kastlan is also supposed to be local first there shall be a similar sync
  indication like in the keksdose top bar. All of the above also applies for
  kurvenschmiede."
- His answers to the open points (§2) are quoted there.

The inventories, with file:line, are in audits/round-043/topbar-{keksdose,kastlan,
kurvenschmiede}.md. **kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

## 1. Where each one stands (2026-10-17)

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| **Bar, start → end** | brand + env badge · Search · Sync · dev role · dev plan · Tours · Feedback · account | brand · company · Search · Theme · Language · Feedback · Assistant (off) · Tours · Platform · dev role · account | brand · Language · Theme · Feedback · account |
| **Theme** | none in the bar (Settings → Appearance since `87ea0489`) | `ThemeToggle` | `ThemeToggle` |
| **Language** | inside the account menu, a `Disclosure` sub-list with flags | `LanguageMenu` in the bar | `LanguageMenu` in the bar, also signed out on the public pages (F100) |
| **Tours** | `TopBarActionMenu`, lucide `Compass`, a link to `/tours` and a hover list | `TopBarActionMenu`, `LifeBuoy` | none |
| **Search** | `GlobalSearch` | `GlobalSearch` (the trigger hidden on a phone) | none |
| **Sync** | `SyncStatusIndicator`, 7 states, always shown | a floating pill (bottom-start) for the handover copy, hidden while idle | none; online only, no content on the device by design |
| **Dev switchers** | role + plan (kit `RoleSwitcher`), screen only | role, server too (`POST /auth/switch-role`) | none |

## 2. Decisions (Marcel)

1. **The order, in every app** (Marcel: "Status at the end"):

   brand (kk's env badge in it) · kastlan's company switcher · **Search** · **Theme** ·
   **Feedback** · **Tours** (kastlan's Assistant beside it, while on) · **Sync** ·
   dev role · dev plan · kastlan's platform button · **account menu**.

   The bar is the same on a phone; an item the app has no part for is left out, never a
   gap.
2. **Theme in the bar** in every app: keksdose gets the kit's `ThemeToggle` back.
   Settings → Appearance keeps the three-way choice (light, dark, system).
3. **The language select is inside the account menu when signed in**, as keksdose has it:
   a sub-list, one row per offered language with its flag, the active one checked. It is
   first after the app's context rows (keksdose's budgets).
   - **Signed out, the language button stays in the bar** (the public pages, sign-in,
     sign-up, the landing), because there is no account menu there (KS F100).
   - **Where the choice is kept** (Marcel: "Can it as fallback be stored in the local
     storage of the browser if not persisted to database?"): yes, that's how it works
     already (settings §6.2). A pick is stored in the browser under `<app>-lang`, signed
     in or not. Signed in, it is also saved to the account (`PATCH /auth/me {locale}`).
     A signed-out visitor's pick stays in the browser, and it carries over at sign-in:
     the device's own choice wins over the account's. A demo never writes the account.
4. **Tours: keksdose's trigger**, lucide `Compass`. The kit's `TourMenu` is a
   `TopBarActionMenu` that is also a link to the app's tours page, with a NEW dot. Its
   list: "This page", up to three "New", a divider, and "All tours…". kastlan swaps
   `LifeBuoy`.
   - KS has no tours yet: KS adds the kit's tour engine and a first tour (the review
     names which), and the trigger comes with it.
5. **Search** in every app (the kit's `GlobalSearch`, ⌘K). In KS it finds pages,
   settings sections and admin sections; content stays out, because it is sealed. The
   trigger shows on a phone too (keksdose's choice; kastlan drops `hideTriggerOnPhone`).
6. **Sync, "Show what's real"** (Marcel):
   - **The kit's `SyncStatusIndicator`** takes over keksdose's state table and ranking:
     blocked, waiting for a plan, offline, error, syncing, pending, synced. It is a status
     that is also a "sync now" button, with a ✓ badge when synced and a spin while
     syncing.
   - It is fed by a small contract, `SyncStatus {phase, online, pending, blocked?,
     waitingForPlan?, lastSyncedAt?}`, plus `onSync`. It has `hideWhenIdle`, and optional
     `scope` words.
   - **keksdose:** unchanged in behaviour, now on the kit part.
   - **kastlan:** the handover copy's state, from its sync controller and the legacy
     photo outbox. It uses `hideWhenIdle`, so it shows only while offline, syncing or with
     changes waiting, held or refused. The words name handovers, because only they work
     offline. The floating pill goes. A "last synced at" needs kastlan to store a time
     after a good round (`sync.ts:122`).
   - **Kurvenschmiede:** offline and saving only, from the online state and
     `useIsMutating`, with `hideWhenIdle`. There is no pending count, since KS keeps
     nothing on the device.
   - Making more of kastlan, or any of KS, work offline is a round of its own, later.
7. **Dev switchers, role and plan, "Server too"** (Marcel): in every app, in local dev
   only, both switchers change what the server enforces, so the app behaves as that role
   and plan.
   - **The kit's `DevSwitchers`**: role and plan, both on `RoleSwitcher` with the flask
     icon. They render only when the app says it is local dev (`import.meta.env.DEV`).
   - **server-kit's dev-only route** `POST /dev/switch {role?, plan?}`. It is gated as
     §6.1 says (an explicit flag plus the app's proof of a local run, never an
     environment name), and otherwise `404`, never mounted in a deployment. The app applies it its own way: kastlan mints tokens with
     the picked role (as `/auth/switch-role` does, but any role); a plan switch writes
     the row's plan as an operator grant would. Then the client re-reads `/auth/me` and
     the overview.
   - keksdose's screen-only switchers become server-backed. kastlan's real
     `/auth/switch-role` (a held role, a feature) stays as it is.

## 3. What the kits add

### 3.1 ui-kit 0.42

- `TopBarActions`: draws the items in §2.1's order from named slots (`companySwitcher`,
  `search`, `theme`, `feedback`, `tours`, `assistant`, `sync`, `dev`, `platform`,
  `account`), so the order can't drift. An app may still compose by hand in that order.
- `AccountMenuLanguage`: the account-menu sub-list (§2.3), on `Disclosure` and
  `MenuItem`, with flags. `LanguageMenu` stays the signed-out bar button.
- `TourMenu` (§2.4), with lucide `Compass`.
- `SyncStatusIndicator` and the `SyncStatus` type (§2.6), labels in seven languages.
- `DevSwitchers` (§2.7).

### 3.2 server-kit 0.14

- `dev_switch_router` or a recipe, the `DevSwitchRequest` schema, and the
  `local_development` check it is gated by (§2.7).

## 4. Per app (the reviews refine it)

- **keksdose:**
  - the order: Feedback before Tours, Sync after Tours, and the dev switchers after Sync;
  - `ThemeToggle` back in the bar;
  - the kit's `AccountMenuLanguage`, `TourMenu`, `SyncStatusIndicator` and `DevSwitchers`;
  - the dev route.
- **kastlan:**
  - the language moves into the account menu (and stays in the bar when signed out);
  - Tours → Compass;
  - the sync pill → the bar indicator, `hideWhenIdle`;
  - the dev plan switcher and the dev route;
  - the order: dev switchers before the platform button.
- **Kurvenschmiede:**
  - Search, a first tour and the `TourMenu`;
  - the sync indicator (offline and saving);
  - the dev switchers and the dev route;
  - the language in the account menu when signed in, in the bar when signed out;
  - the order: Theme before Feedback.

## 5. Questions for the reviews

1. Where exactly the language sub-list sits in your account menu, and whether your menu's
   rows need a shared order beyond it.
2. kastlan, KS: how the dev role and plan switch is applied on your server (tokens, the
   plan row), and what "local development" is in your settings.
3. KS: which first tour, and what Search should find.
4. kastlan: the sync words: "handovers" in every state, or only in the tooltip?
5. Anything in your bar this order leaves without a place.

## 6. The reviews and what they change (2026-10-17)

All three are in audits/round-043/topbar-reviews.md. The proposals below win over §2–§4
where they differ.

1. **The dev switch's gate, a safety rule** (kk K-1, ka F3, KS 5). All three apps
   default to "development" or have a hosted dev deployment, so an environment name is
   never the gate. server-kit's gate is a predicate that needs **both**:
   - an explicit setting that is off by default and set only in the local `.env`
     (`<APP>_DEV_SWITCH_ENABLED`);
   - the app's own proof of a local run (KS: the local-database / shipped-keys test,
     `feedback_loop.py:266`; kastlan: `environment != "production"`).

   The app refuses to start when the flag is set in production. The route is mounted only
   when the predicate holds; otherwise it is absent (404).
2. **What the switch writes** (kk K-2, ka F1, KS Q2). In all three apps the server reads
   the role from the database on every request, so the dev switch **writes the role in
   the local database**: keksdose `users.role`, kastlan the acting company's
   `user_role_assignments` and then `issue_session`, KS `users.role` (it skips
   `set_role`'s self and last-admin refusals, and still refuses CUSTOMER for an account
   that owns work).
   - The route needs only a signed-in user, so a lesser role can switch back.
   - `DevSwitchers` offers "Back to {original role}", which the kit keeps in session
     storage.
   - A switch never writes the admin action log, or tags itself `dev_switch` there
     (kk K-3).
3. **The plan switch** goes through the operator's grant, permanent (keksdose `set_plan`,
   kastlan `BillingService.set_plan(…, comped_until=None)`, KS `change_plan` on the
   caller's own row). While billing is off nothing is enforced, so the plan menu says
   "Billing is off locally: plans change nothing" and stays usable (ka F2, KS Q2).
4. **`ThemeToggle` writes the app's theme preference** through its `onChange`, never a
   key of its own. From "system", a tap goes to the opposite of what is shown. Settings
   keeps "system" (kk K-4).
5. **One account-menu order** (kk Q1, ka Q1): the app's context rows (keksdose's budgets)
   · Language · the account's own pages (Notifications, Settings) · the role tools
   (Administration, Translations) · What's new · toggles (keksdose's presentation mode) ·
   divider · Log out; the `LegalLinks` footer.
6. **`TopBarActions` has signed-out slots** (KS 1): `language` and `signIn`. They are used
   when no account is set, as on KS's public pages.
7. **`TourMenu` works without a tours page** (KS 2): its `href` is optional. KS's first
   tour is "Your first curve" on `/curves`.
8. **Search filters by role** (KS 3): admin sections for admins only, public pages when
   signed out, and never content.
9. **`SyncStatusIndicator`'s `onSync` is optional** (KS 4): without it the indicator is a
   status, not a button.
10. **kastlan's sync** (ka F7, Q4):
    - the short labels are "Offline", "Syncing…", "3 waiting";
    - "handovers" goes in the tooltip ("Handovers on this device: 3 changes waiting to
      sync"; "Offline: handovers keep working on this device; everything else needs a
      connection");
    - the pill (`offline-indicator.tsx`) goes, and `HandoverSyncBanner` stays above the
      handover pages for the refusals.
11. **Search on a phone**: kastlan drops `hideTriggerOnPhone` (ka F5).
