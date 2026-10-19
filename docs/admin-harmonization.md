# The admin area — harmonisation plan

**Settled 2026-10-17** (Marcel, in the ui-kit session, after the three app reviews; §6, §7).
Planned as round 0.43; built in the same release as billing §16: **ui-kit 0.42, server-kit 0.14**.
§6 wins over §2–§4 where they differ.
**§9 (round 0.45) settled 2026-10-19** (Marcel: "As reviewed", after the three app reviews in
audits/round-046/reviews.md; §9.7), for ui-kit 0.45 / server-kit 0.15.

Led from ui-kit at Marcel's request, 2026-10-17: "Not only a billing harmonization but also
an admin view harmonization. The admins generally (I guess) want to see similar admin
things that do not differ that much across apps. At least a similar template shall be
used." It takes over settings §12 (the role chip as the way in, superseded) and amends
settings §5 (the admin page, same shell). It builds on user-admin (the roster, the
actions, invitations, the audit log), feedback (the inbox) and billing (the operator's
grant).

**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede. The inventories, with
file:line, are in audits/round-043/inventory-{keksdose,kastlan,kurvenschmiede}.md; the
reviews of settings §12 are in audits/round-043/way-in-reviews.md.

## 1. Where each one stands (2026-10-17)

All three use the kit's `SettingsLayout` at `/admin/<section>`, with `?focus=` and the
phone drill-down (settings §5). Beyond that, they differ:

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| **Way in** | the role chip in the account-menu header only | a sidebar group "Admin" (behind "More" on a phone), ⌘K over the admin catalogue, the /settings phone footer; no menu row | an "Administration" account-menu row; the chip is plain |
| **Client gate / 403** | `AdminForbidden` page | inline EmptyState "Access denied. (403)" | none: a page of refused panels |
| **Width / search** | 7xl, off | 6xl (default), off | 7xl, off |
| **Sections** | metrics, health, scheduler, users (+ cost per user), activity, access (invitations), messaging (support, assistant, push test, broadcast), system (demo, network) | users (+ invitations), company, billing (while on), activity | users ("Accounts"), teams, invitations, activity |
| **Card idiom** | `Card density="compact"` and `SettingsSection` mixed | `SettingsSection`, but the Users card is a bare `Card` with no title | `SettingsSection`, titles hidden |
| **Start / overview** | metrics (the default) | users | users |
| **Admin tools outside /admin** | /feedback, /translations | /feedback, /translations, /import, /platform/* (superuser) | /feedback, /translations |
| **Waiting work shown** | nothing counts it | feedback tiles on /overview/admin (not links) | a deletion-requests banner app-wide |

What all three admins do most is the **feedback inbox**. In every app it is reached
from the top bar's feedback menu ("Feedback inbox", the kit's `FeedbackMenu`), not from
the admin area. Every inventory asks for a start page that counts what is waiting, and for one
403 page.

## 2. Decisions

### 2.1 The way in (confirmed by Marcel, §7)

1. **Every app has an "Administration" row in the account menu** for an admin (icon
   `ShieldCheck`). It is the way in that everyone finds. keksdose proposed it, from
   Marcel's "the admin role chip is a bit too hidden"; KS has it already.
2. **The role chip is a shortcut, not the only way in.** In the account menu's header it
   links to the role's main tool: an admin's to `/admin`, a reviewer's to
   `/translations`. A role without a tool has a plain chip. The menu closes on the way.
   The look is keksdose's (`solid`, `sm`, `square`, `caps`, the role's icon and tone).
   It replaces kastlan's raw role code in the header.
3. **A second tool keeps its own row.** An admin who also reviews translations reaches
   `/translations` through its "Translations" row (KS's §12 review, ka F4). One chip links one
   place.
4. **⌘K finds the admin sections**, where an app has a command palette, from the admin
   catalogue (kastlan's `settingsSearchEntries(…, {basePath: "/admin"})`). Search is a
   finder, not a menu entry.
5. **kastlan also has a sidebar entry, in the sidebar's footer**, apart from the work
   pages. Its admins are customers' company admins who manage people routinely, and
   Marcel wants it "visible for other admins". keksdose and KS have one admin, the
   operator, and no sidebar entry. kastlan's `nav.ts` "Admin" group keeps Data Import
   (review question 4).
6. **Platform tools stay their own**: kastlan's superuser button to `/platform/*` stays
   a top-bar button. It is a different scope, and the company-role chip keeps its
   `/admin` link.

### 2.2 The shell

7. **`SettingsLayout`, width `7xl`, the heading "Administration"**, in every app. The
   roster table needs the width (kk dev#488, KS). Search follows settings §3.4: on from
   eight entries, which today keeps it off in all three.
8. **One 403 page, the kit's `AdminForbidden`**, behind a client-side role gate in every
   app; the server's gate stays the rule. It reads "Only for administrators" / "This is
   where administrators run {app}. Your account cannot open this page." with a button
   back to the app's start. A reviewer gets a link to `/translations` as well.
9. **One card idiom:** each card is a `SettingsSection`. A card alone in its section
   hides its title (`titleVisible={false}`, the sidebar names it); a section with several
   shows each title (kastlan's untitled Users card gets one).

### 2.3 The sections: one order, shared names

10. **The template's order**, the shared sections first and last, each app's own in
    between:

    | # | Section | id | Who has it | Notes |
    |---|---|---|---|---|
    | 1 | **Overview** | `overview` | every app (new) | the default section (§2.4) |
    | 2 | **Users** | `users` | every app | the kit's roster (user-admin §3); KS renames "Accounts" to "Users" |
    | 3 | **Invitations** | `invitations` | every app | the kit's `InvitationsPanel`; keksdose's `access` and kastlan's card inside users move here (old paths kept as aliases) |
    | 4… | the app's own | — | kk metrics, messaging; ka company; KS teams | in the app's order |
    | … | **Billing** | `billing` | kastlan (the payer); kk and KS when an operator view comes | visible while billing is on |
    | … | the app's operations | — | kk health, scheduler, system | |
    | last | **Activity** | `activity` | every app | the kit's `AdminActionLog` (settings §5) |

11. **Shared section names in the kit**, in seven languages: Overview, Users, Invitations,
    Billing, Activity, with their icons (`LayoutDashboard`, `Users`, `Mail`, `Receipt`,
    `History`) and help lines. An app's own sections keep their words.
12. **Help lines say what is there now**: keksdose's `messaging` and `access` lines are
    stale (kk 5.2.4).

### 2.4 The overview: what is waiting

13. **The overview is the admin's start page**: a grid of tiles, each a count and a link
    to where the work is. The shared tiles, each shown only when the app has it:
    - **Feedback waiting**: open reports not yet triaged → `/feedback`.
    - **Deletion requests** → `/admin/users?state=deletion_requested`.
    - **Pending invitations** → `/admin/invitations`.
    - **Users**: the total, and new in the last 7 days → `/admin/users`.

    An app adds its own, such as keksdose's "Support waiting" → `/admin/messaging`.
    keksdose's metrics stays its own section after the overview (review question 2).
14. **One server answer for it**: `GET /admin/attention` → `{feedback_waiting,
    deletion_requests, invitations_pending, users_total, users_new_7d, extra: {key:
    count}}`, each count `null` where the app has no such thing. server-kit ships the
    schema and the shared counts it can make (feedback through its feedback store,
    invitations through the invitations service); the app adds the rest.
15. **The account menu's "Administration" row carries the waiting count** as a badge
    (feedback + deletion requests + the app's waiting extras; not invitations or users).
    KS's deletion-requests banner stays: it is the one with a deadline.

### 2.5 Links to the admin tools outside /admin

16. **The feedback inbox, the translations review and an app's task pages stay pages of
    their own** (the inbox is the kit's full-height page, feedback §10). The admin area
    links to the ones the top bar doesn't already reach in one place: a **"Tools" list** at
    the foot of the section sidebar on a desktop and in the phone footer
    (`SettingsLayout`'s `phoneFooter`): Translations, and the app's own (kastlan: Data
    import). The feedback inbox keeps its way in through the top bar's feedback menu, so
    it is not listed (kastlan's correction). The overview's tiles link to the inbox too.

## 3. What the kits add

### 3.1 ui-kit 0.42

- `AccountRoleChip` and `RoleDefinition.href` (as settings §12.3 drafted).
- `adminMenuEntry({href?, badge?})`: the "Administration" `TopBarMenuEntry` with the
  kit's words, icon and badge.
- `AdminForbidden` (decision 8), with `homeHref`, `appName` and an optional
  `reviewerHref`.
- `ADMIN_SECTIONS`: the shared sections' ids, icons, words and order (decision 11), and
  `adminSections(t, own)`, which builds an app's catalogue in the template's order.
- `AdminOverview` and `AttentionTile` (on `StatTile`, a link), fed by
  `AdminAttention` (decision 14).
- `AdminToolLinks` for the sidebar foot and the phone footer (decision 16).
- `SettingsLayout` gains a `sidebarFooter` slot, if it has none.
- Labels in seven languages.

### 3.2 server-kit

- `AdminAttention` (the schema) and the shared counts (decision 14).

## 4. Per app (the reviews refine it)

- **keksdose**: an "Administration" row in the account menu; the overview section first
  (metrics second); `access` → `invitations` (alias kept); `AdminForbidden` from the
  kit; one card idiom; stale help lines fixed; Tools links; the admin push for a support
  message opens `/admin/messaging?support=<id>` (kk 5.2.3).
- **kastlan**:
  - the account-menu row and the chip, replacing the raw role code;
  - the sidebar footer entry, in place of `nav.ts:149`;
  - the /settings phone-footer link goes, since the account menu reaches /admin on a
    phone;
  - width 7xl;
  - the invitations card becomes its own section;
  - `AdminForbidden` in place of the inline 403;
  - the overview's feedback tiles move from /overview/admin and become links;
  - the Users card gets its title.
- **Kurvenschmiede**:
  - the chip as a link;
  - "Accounts" → "Users";
  - the overview;
  - a client gate with `AdminForbidden`;
  - Tools links.

## 5. Questions for the reviews

1. **Invitations as its own section** (decision 10): kastlan, is it fine to move the card
   out of Users?
2. **keksdose's metrics**: a section after the overview (the draft), or the overview's
   own content?
3. **The waiting count on the menu row** (decision 15): which counts belong in it, in
   your app?
4. **kastlan's "Admin" nav group**: with Administration in the sidebar footer, should
   Data import stay in a group of one, move into the footer next to it, or live only in
   the Tools list?
5. **The member's chip**: keksdose shows a plain MEMBER chip, KS shows none. Which?
6. Anything your admin does often that the template leaves no place for.

## 6. The reviews and what they change (2026-10-17)

All three are in audits/round-043/reviews.md (keksdose at `77e9bdfd`, kastlan at
feat/kit-0.40, KS at `3a0f2ba`). The proposals below win over §2–§4 where they differ.

1. **The feedback count** (kk K-2, ka F3, KS 8). The shared tile is **"To triage"**: `OPEN`,
   crash reports included, demo accounts never counted, within the company in kastlan. It
   links to `/feedback` filtered to OPEN. The developer's lanes (READY, REWORK,
   IN_PROGRESS) are not the admin's. An app adds its own feedback tiles: keksdose's
   "Awaiting your verdict" (IN_EVALUATION + NEEDS_LIVE_TEST), and KS's "Released for work"
   (the loop's queue), so the overview and the CLI agree.
2. **The deletion-requests tile** only where the viewer can act on them (ka F2; kk K-3:
   keksdose's run on their own). KS has it. In keksdose and in kastlan's `/admin` it is
   `null`; kastlan's platform console can count them later.
3. **The badge's counts are each app's** (kk K-3, Q3; ka Q3; KS Q3):
   - keksdose: To triage, verdicts and support waiting (its server counts it already,
     `admin_router.py:1295-1316`);
   - kastlan: To triage;
   - KS: To triage and deletion requests.

   The rule: only work that waits on this admin.
4. **`GET /admin/attention`** (KS 8, ka F6):
   - the builder takes every count as an argument, and the kit's helpers stay optional
     (KS's invitations are its own service);
   - it answers `null` counts in a demo (kastlan's demo user is a company admin);
   - **demo accounts never count**;
   - `extra` holds the app's own tiles: kk support waiting and jobs failing → health,
     KS released for work and demo accounts live.
5. **The overview vs keksdose's metrics** (kk K-1, Q2): metrics stays its own section after
   the overview, and the overview links to it with at most two tiles. keksdose's
   `overview → metrics` alias goes, because `overview` is now a section.
6. **`adminMenuEntry`** (KS 1) comes as both an entry object for `TopBarActionMenu` and an
   `AdminMenuRow` component for a menu built from `HoverMenu` children (KS).
7. **The client gate** (ka F4, KS 4) is a rendering choice on the same admin check the menu
   uses, inside the lazy route, with no redirect, so a bookmark keeps its address.
   kastlan shows `AdminForbidden` on its admin tools (`/admin`, `/import`, `/feedback`);
   its work pages keep the generic 403. The wording doesn't imply that the person can't
   administer anything: a kastlan superuser who isn't ADMIN in the acting company gets it.
8. **`adminSections(t, own)`** places an app's own section at a position it names, so
   KS's Teams sits between Invitations and Activity (KS 7).
9. **The kastlan sidebar footer** is AppShell's `sidebarFooterItems`, which gains `badge?`
   on its link kind (ka F1). The app filters by role. The footer is desktop-only, so the
   account-menu row ships in the same release.
10. **kastlan's nav group** (ka Q4): the "Admin" group and `/overview/admin` go.
    Administration and Data import move to the sidebar footer, and Data import is in the
    Tools list too.
11. **The Tools list** has no Feedback inbox link (kastlan's correction, from Marcel in its
    session: "The feedback inbox is in the top bar."). It holds Translations, with a
    per-link visibility (ka F7), and the app's task pages. KS asks for Feedback
    discussion (`/all-feedback`) as well. Proposed: no, because the feedback menu reaches
    it the same way as the inbox.
12. **Invitations as its own section** (ka Q1): yes. kastlan keeps
    `/admin/users?focus=invitations` as an alias, and the invitations endpoint answers
    `mail_backend` itself (ka F8).
13. **Icons:** KS swaps Invitations `Ticket` → `Mail` and Activity `ScrollText` →
    `History` (KS 7). The menu row's icon becomes `ShieldCheck`.
14. **Left for later** (Q6):
    - kastlan's platform console Activity (`GET /platform/actions`, the same
      `AdminActionLog`);
    - KS's test mail;
    - a superuser badge (deletion requests, new sign-ups).

## 7. Settled (Marcel, 2026-10-17)

- **The way in, "As proposed"**: an "Administration" row in the account menu in every
  app, with the waiting count as its badge. The role chip is a shortcut. kastlan also has
  the sidebar footer entry, next to Data import (§2.1, §6.3, §6.9, §6.10).
- **The member's chip, "Always a badge"**: every account shows its role in the
  account-menu header. It is plain unless the role links to a tool, and in the role's tone
  from the app's `RoleVocabulary`. KS shows "Member" from now on. kastlan shows the
  highest of the active company's roles, in place of the raw code.
- §6's other proposals, which the three reviews agreed on, stand as written.

## 8. What shipped (ui-kit 0.42)

From `@eifi1/ui-kit` (the menu row also from `@eifi1/ui-kit/shell`). The words are the new
`adminArea` namespace, in all seven catalogues (`DEFAULT_ADMIN_AREA_LABELS`,
`useAdminAreaLabels`, types `AdminAreaLabels`, `AdminTileLabels`, `AdminSharedSection`).

- **The way in** (§2.1, §6.6, §7):
  - `RoleDefinition.href?`: the role's tool. `AccountRoleChip` (`AccountRoleChipProps`)
    is `RoleChip` with keksdose's look as defaults (`solid`, `sm`, `square`, `caps`); a
    role with an `href` is a link (`renderLink`, else the provider's link, as `Chip`) that
    calls `onNavigate` (the menu's `close`); any other role is a plain chip. `RoleChip`
    ignores `href`.
  - `adminMenuEntry({ href = "/admin", badge?, labels?, key?, current? })` →
    `TopBarMenuEntry` ("Administration", `ShieldCheck`), and `AdminMenuRow` (`href`,
    `badge`, `onNavigate`, `current`, `labels`) for a `HoverMenu`-children menu, the same
    `MenuItem` link row. The badge is a solid warning count pill, none for `0`/`null`,
    "99+" past 99, read as "Administration, 3 waiting".
  - `adminWaitingCount(attention, keys)`: the badge's sum over the shared counts and
    `extra` keys an app names (§6.3); `null` before an answer.
  - AppShell's `sidebarFooterItems` link kind: `badge?` and `badgeLabel?` (§6.9), a pill
    after the text expanded and a corner count collapsed.
- **The shell** (§2.2, §2.3, §6.8): `ADMIN_SECTIONS` (overview, users, invitations,
  billing, activity with `LayoutDashboard`, `Users`, `Mail`, `Receipt`, `History`) and
  `adminSections(labels, own, { leaveOut?, visible? })` → `SettingsGroup[]` in the
  template's order. An own section (`AdminOwnSection`) goes after Invitations, or `after`
  the section it names (shared or own); a left-out section's followers keep its place. It
  throws for a shared id, a duplicate, an unknown `after` or a circle. Types
  `AdminSectionDefinition`, `AdminSectionsOptions`.
- **The 403 page** (§2.2 decision 8, §6.7): `AdminForbidden` (`appName`, `homeHref`,
  `homeLabel?`, `reviewerHref?`, `headingAs?` default `h1`, `labels?`). It renders, never
  redirects. `EmptyState`'s `headingAs` takes `h1`.
- **The overview** (§2.4, §6.1–§6.5): `AdminAttention` (server-kit's schema, as the API
  sends it), `AttentionTile` (a `StatTile` that is a link, `count` + `href`) and
  `AdminOverview` (`attention`, `hrefs?`, `extraTiles?` of `AdminExtraTile`, `tileProps?`)
  — the shared tiles in order (To triage, Deletion requests, Pending invitations, Users
  with "n new in 7 days"), then the app's, every `null` left out; skeletons while
  `attention` is `undefined`. `DEFAULT_ADMIN_ATTENTION_HREFS` are the §2.4 targets; an
  app passes the inbox's OPEN filter in `hrefs`.
- **The Tools list** (§2.5, §6.11): `AdminToolLinks` (`links` of `AdminToolLink` with
  `visible?`, `variant` `sidebar` | `list`), and `SettingsLayout`'s new `sidebarFooter`
  slot, under the section list in the same sticky column, desktop only.
- The showcase's "User administration" page shows the way in, the area, a tile and the
  403 page.

## 9. The follow-ups (round 0.45) — SETTLED (round 0.45)

**Settled 2026-10-19** (Marcel: "As reviewed", after the three app reviews in
audits/round-046/reviews.md; §9.7 records where each answer went, and the review's
answers and corrections are folded into §9.1–§9.5). Built for **ui-kit 0.45 / server-kit
0.15**. It takes up what §6.14 left for later, kastlan's company details (inventory-kastlan
3.2, 5i) and server-kit 0.14's missing count helper (audits/round-042/adopt-lines-server.md:18).
Drafted at kk `feat/feedback-loop-80-424-434` e7480bec, ka `feat/kit-0.44` 6c2a0c4, KS
`main` b54c16e, server-kit 0.14.0; the reviews' corrections re-checked at kk deaf428d, ka
6c2a0c4, KS b54c16e.

| # | Item | Who | ui-kit | server-kit | Apps |
|---|---|---|---|---|---|
| 9.1 | The platform console's Activity, as one `SettingsLayout` | ka | XS (two log words) | XS (two actions) | ka S–M |
| 9.2 | "Send a test mail to me" | all three | S | S | S each |
| 9.3 | The operator's waiting count | ka | XS | none | ka S |
| 9.4 | kastlan's company details (name, address; the logo later) | ka | none | none | ka S |
| 9.5 | The feedback counts in server-kit | all three | none | S | XS each (KS: + a tile) |

### 9.1 The platform console's Activity (ka Q6, §6.14)

**Today.** kastlan logs the operator's actions with no company (`company_id=None`,
admin_user_service.py:8-10) and serves them at `GET /platform/actions?limit=&offset=&target=`
(platform_router.py:250-262, `list_actions(company_id=None)`, admin_user_service.py:407-430).
No page reads it: the console's routes are companies, a company, users and sign-ups
(frontend features/platform/routes.tsx:5-49, four pages of 648 lines in
features/platform/pages/), with no navigation of their own (inventory 5f). The company
admins' log is the kit's `AdminActionLog` with `groupNoun="company"`
(features/settings/components/admin-actions-card.tsx:40-55). Three operator actions on
`/platform/*` miss the platform log (ka review 1):
- the **plan changes** are logged with the company's id (platform_router.py:117-126);
- **`POST /platform/companies/{id}/admins`** (platform_service.py:327-341) logs its
  `INVITE` with the company's id (invitation_service.py:121-127);
- **`PATCH /platform/companies/{id}`** renames or (de)activates a company
  (platform_router.py:93-105, platform_service.py:176-188) and **logs nothing at all**.
  The (de)activation is the larger gap: it locks a whole company out.

kk and KS have no platform scope: their one admin is the operator, and `/admin/activity`
is already the operator's log.

**Settled.**
1. **The console is ONE `SettingsLayout` "Platform"** (width `7xl`, as `/admin`), sections
   **Overview** (§9.3), **Companies**, **Users**, **Sign-ups**, **Activity**;
   `/platform/companies/:id` stays a detail page under Companies. routes.tsx:5-49 becomes
   the section list as kastlan's `/admin` has it; each page drops its own header and page
   wrapper, its table and hook code stay (ka review 2: S–M, mostly mechanical).
2. **Activity** is the kit's `AdminActionLog` as it is (`groupNoun="company"`,
   server-paged, `?target=` as the filter), with the `logEntry` mapping of
   admin-actions-card.tsx:19-33.
3. **Every operator action is stamped `detail.via = "platform"`.** The platform routes
   pass it on what they log: the plan change, the company-admin invite, and the company
   PATCH, which gains its rows: `group_rename` (`{from, to}` as KS's team rename, shared
   with §9.4) and **`group_deactivate` / `group_reactivate`** for `is_active` (new kit
   actions, §9.7). The platform log reads `company_id IS NULL OR detail->>'via' =
   'platform'` (`list_actions(company_id=None)`); the company's log keeps its rows as now,
   so a company admin still sees who changed their plan. "A superuser actor" is not the
   filter: a superuser can also be a plain admin of their own company (ka review 1).

**Split.** server-kit XS: `AdminAction.GROUP_DEACTIVATE` / `GROUP_REACTIVATE`
(`ConfirmationLevel.NONE`, as `GROUP_RENAME`). ui-kit XS: `AdminActionLog` words them for
every `groupNoun` (seven languages). kastlan S–M: the shell, the Activity section, the
`via` stamp and filter, the PATCH's rows.

### 9.2 "Send a test mail to me" (KS inventory 5.7, §6.14)

**Today.** No app can send a test mail. Each reports its transport to the admin page as
`mail_backend` (kk infrastructure/email.py:53-59 `console`/`resend`; ka
infrastructure/email.py:40-47 adds `smtp`; KS infrastructure/email.py:109-115), and the
kit's `InvitationsPanel` shows the console notice (src/admin/invitations-panel.tsx:318);
KS shows its own (frontend features/admin/users-panel.tsx:486-490). keksdose has the push
equivalent: `POST /notifications/test` to the caller's devices
(adapters/api/notifications_router.py:205-229), in its messaging section's
`admin-push-test-card` (admin-index.ts:128, admin-page.tsx:1123). Each app sends through
its **own** `send_email`: kk's wraps server-kit's `ResendClient` with a `Reply-To`, one
retry and a metric (infrastructure/email.py:62-85); KS's `Mailer` is server-kit's
`ResendClient`/`ConsoleMailer` (mail.py:436-600), sent after the commit
(`email.send_after_commit`, infrastructure/email.py:216); kastlan has its own transport,
plain text from `(subject, text)`, Resend or SMTP (infrastructure/email.py:54-97, SMTP at
:132-156). All three answer only `bool` and never raise, and **every console path answers
`True`** (kk email.py:81-85, ka :87-97, server-kit `ConsoleMailer.send` mail.py:465), so
`sent` alone cannot tell "logged" from "delivered". kastlan's only workaround is
`POST /platform/users/{id}/mail` to one's own account (platform_router.py:224-234), which
sends a verification or reset mail and logs an admin action.

**Settled.**
1. **`POST /admin/mail/test`** (kastlan: **`POST /platform/mail/test`**,
   `require_superuser`, dependencies.py:382), no body: one mail **to the signed-in
   admin's own address**, never another, in the admin's language. Answers
   `{sent, mail_backend}`. Refused in a demo; 3 per 10 minutes per account. Not an
   `admin_actions` row (no one is acted on; kk admin_router.py:141-143 keeps that log for
   actions on a person).
2. **Through the app's own `send_email`, awaited inline.** The route calls what real mail
   goes through, so the test exercises it, and returns its bool; never the after-commit
   hook (the test writes nothing, and the answer must say whether the mail went; KS
   review 2). Per app:
   - **keksdose**: `send_email(…, kind="mail_test")` (email.py:62), so the `Reply-To`
     (`reply_to_address()`, :45-50), the one retry and the refusal on an empty Resend key
     (:73-77) all run; `record_email`'s `kind` docstring gains `mail_test`
     (infrastructure/metrics.py:799-812). The route's own log line never names the
     admin's address (email.py:15: the label and the log never carry the recipient).
   - **Kurvenschmiede**: `await mailer.send(message)` in the request, the one inline mail
     in KS; "mail never raises" (docs/account-rules.md) holds while `Mailer.send` stays
     `bool`.
   - **kastlan**: `send_email(to, subject, text, kind="mail_test")` (email.py:54; the
     kinds are listed at :65); `email_reply_to` applies on its own. A two-line adapter
     takes server-kit's `MailMessage` to `(subject, text)` (kastlan uses no `MailMessage`
     today).
3. **server-kit `mail`**: `test_mail_message(locale, *, app_name, backend, sent_at) →
   MailMessage` (subject "Test mail from {app}", a body naming the transport and the time,
   seven languages), `MAIL_TEST_KIND = "mail_test"` for the log line and the metric, and
   the answer's model `MailTestResult {sent: bool, mail_backend: str}`; `MAIL_TEST_LIMIT`
   (3 per 600 s) for the app's limiter. No router factory (as billing's recipes): each
   app's route is a few lines over its own transport, and the recipe says "await the
   send and return its bool".
4. **ui-kit**: `MailTestCard` (a `SettingsSection` with a sentence, the transport as a chip,
   a "Send a test mail to me" button and the result line: "Sent to a…@example.com. Check
   the inbox." / "The console transport only logs mail; nothing was sent." / "Could not
   send. The server log has the provider's answer."), labels in seven languages. **The
   result line reads `mail_backend` first**: with `console` it says "nothing was sent"
   whatever `sent` is.
5. **Where.**
   - **keksdose**: in `messaging`, beside the push test (admin-index.ts:128).
   - **Kurvenschmiede**: an own section **"System"**, `after: "teams"` in
     `useAdminSections` (frontend/src/features/admin/admin-catalogue.tsx:26-31), so it lands
     before Activity and the top bar's search finds it through the same catalogue. It will
     hold more later (the build, the jobs token's last run). The users panel's console
     notice (users-panel.tsx:486-490) stays where it is: it explains, at the moment of
     inviting, why a link is shown instead of mailed. Not on the overview: its tiles are
     counts that link somewhere.
   - **kastlan**: in the platform console (§9.1), **for the superuser only**: the
     transport is the installation's (`KASTLAN_EMAIL_BACKEND`), and a company admin can't
     change it.
6. **The limiter** goes beside each app's others: kk's server-kit limiter on the admin
   router, KS's `AuthLimiters` (infrastructure/security.py:278-296, created in
   main.py:200), kastlan's beside `mail_limiter` (platform_router.py:233). The demo
   refusal is declared in KS's `tests/api/test_demo.py`, although a demo never reaches
   `/admin`.
7. The answer says only sent / not sent; the provider's error stays in the server log
   (no secrets on the page).

**Split.** server-kit S (~60 code, ~80 test lines, seven texts). ui-kit S (card, labels,
showcase). Apps S each (route, card, a test).

### 9.3 The operator's waiting count (ka Q3, §6.14)

**Today.** kastlan's superuser reaches the console through a top-bar `IconButton`
(top-bar.tsx:178-183) with no count. A deletion request waits on the operator: the
account is deactivated and flagged (account_service.py:157-200, operator mode) and the
superuser erases on `/platform/users` (admin_user_service.py:370-391). Erasing needs the
request set and the account inactive (:370) and deletes the `users` row (:387), so a
person with `deletion_requested_at` is a person not yet erased. A one-person company is
flagged with its person (`ManagementCompany.deletion_requested_at`, models/property.py:90;
account_service.py:162-183), always with exactly one person's request. kastlan's
`/admin/attention` answers `deletion_requests=None` (admin_attention_service.py:68), as
§6.2 settled. Sign-up is invitation-only after the first account (auth_router.py:348-376);
a person with no company creates one (auth_router.py:287-295). kk has no superuser and
erases on its own (§6.2); KS's one admin already counts deletion requests in its badge
(attention_service.py:73).

**Settled.**
1. **`GET /platform/attention`** → server-kit's `AdminAttention` as it is, on the
   superuser session (`get_superuser_db_session`, dependencies.py:394), so it reads
   across companies:
   - `deletion_requests`: users with `deletion_requested_at IS NOT NULL` (persons only);
   - `users_total` / `users_new_7d`: `users.created_at`, `is_demo` false
     (models/auth.py:46: demo users are real rows, deleted when stale);
   - `invitations_pending`: the sign-up invitations, `Invitation.company_id IS NULL`, not
     accepted, not revoked, not expired (admin_attention_service.py:49-57's predicate with
     a NULL company);
   - `extra.companies_new_7d`: companies created in the last 7 days, **the demo company
     left out** (`settings.demo_company_slug`).

   It never uses the kit's `count_by_status()` (§9.5): on this bypass session that would
   count every company's feedback.
2. **The badge** on the platform button: **deletion requests only** (§6.3: only work that
   waits on this admin). New sign-ups are a tile on the console's overview: a count that
   no action brings to zero reads as noise.
3. **Persons only.** Flagged one-person companies are not counted apart: each has exactly
   one person with a request, so a second count would double it, and the company's fate is
   decided on that person's row.
4. **ui-kit (XS):** the waiting pill of `AdminMenuRow` (shell/admin-menu.tsx:17-38) exported
   as `AdminWaitingBadge` for `IconButton`'s `badge` slot (components/icon-button.tsx:301),
   and a `waiting` phrase for the button's accessible name ("Platform, 2 waiting").
5. The console's Overview section (§9.1.1) is `AdminOverview` with that answer and the
   platform's hrefs.

**Split.** ui-kit XS (an export, one label). server-kit none. kastlan S (the endpoint, the
badge, the overview section).

### 9.4 kastlan's company details (inventory-kastlan 3.2, 5i)

**Today.** `/admin/company` has two cards, the document language and the QR-bill account
(features/settings/admin-catalogue.ts:37-71). `PATCH /company/settings`
(company_router.py:30-41) takes the language and the account fields only
(schemas/property.py:32-45); the name is in the answer (:21) but **a company admin cannot
change it**. It was set at sign-up or by `POST /auth/companies`, and **the superuser can
already rename it**, through `PATCH /platform/companies/{id}` (platform_router.py:93-105,
platform_service.py:185-186), **unlogged** (ka review 5). There is no company address apart
from the QR account's (models/property.py:94-101) and no logo anywhere. Letters take the
QR account's holder and address as the sender block (letter_context.py:140-150,
`default_account_holder or company.name`); the financial report prints the name
(financial_report_pdf_service.py:31, :51). KS renames its teams with a logged
`group_rename` (team_service.py:224); kastlan logs none.

**Settled.** **App-only.** A company's name, address and logo are kastlan's domain (its
letters, its PDFs); kk's budgets and KS's teams have no address or logo. A "Company
details" card first in `/admin/company`, on kit parts already there (`SettingsSection`,
`Form`):
- **name**: editable by an ADMIN, through the same PATCH, **logged as `group_rename`**
  (kit vocabulary, `AdminActionLog` already words it for `company`), **on both paths**:
  this PATCH and the superuser's (§9.1.3, stamped `via: "platform"`). The slug stays.
- **address**: its own fields (street, ZIP, city, country), **apart from the QR
  account's**. On a QR bill the creditor must be the account holder, and with a
  Treuhandkonto that holder is not the Verwaltung, so one address can't serve both. Rule:
  the letterhead and the sender block use the company address, the QR creditor uses the
  account's, and each falls back to the other when empty (today's behaviour for existing
  companies).
- **logo: later**, when letters need it. Where it will show: every LaTeX document with a
  sender block (invoice, dunning, lease, rent increase and service-charge PDFs:
  invoice_pdf_service, dunning_pdf_service, lease_pdf_service, rent_increase_service,
  service_charge_pdf_service) and the financial report (financial_report_pdf_service.py:31,
  :51). The plumbing exists (`render_latex_pdf(…, extra_files=…)`, latex_renderer.py:59-62,
  ships binaries to pdflatex); the templates are the work. Checked then with server-kit's
  `check_upload` and `ensure_decodable_image` (uploads.py:260, :308), shown in the card
  with `FileDropzone` and `AuthedImage`.

**Split.** ui-kit none. server-kit none. kastlan S (name, address, the rename's log rows);
the logo a later round (M).

### 9.5 The feedback counts in server-kit (adopt-lines-server.md:18)

**Today.** Every app counts feedback for `/admin/attention` in its own SQL, by the same
rule (§6.1, §6.4: crash reports in, demo authors out, an erased author's report in):
- kk: two queries with an outer join to `users` (`_feedback_count`,
  admin_attention_service.py:56-68, called at :95-96), OPEN and
  `VERDICT_STATUSES = AWAITING_STATUSES - {OPEN}` (:35). kk's `feedback` table is global,
  not RLS-scoped, and only ADMIN reaches `/admin/attention`;
- ka: one `GROUP BY status` in the company's RLS scope, no demo filter (admin_attention_service.py:45-46,
  :67, :72): a demo can file only crashes (`DEMO_WRITES`, dependencies.py:294), and the
  demo company's admin gets `AdminAttention.for_demo` before any count (:42-43);
- KS: **two** counts, OPEN (attention_service.py:70-72) and `QUEUE_STATUSES` (:84), both
  with the demo filter `_not_by_a_demo()` (:53-56). KS shows no awaiting-verdict tile.

Each counts a **set** of statuses: OPEN; IN_EVALUATION + NEEDS_LIVE_TEST (kk, ka);
`QUEUE_STATUSES` (KS). The kit's `FeedbackRepository.inbox(status)` takes no viewer; the
scope is the request's session (feedback/ports.py:126-142).

**Settled.** One mapping, not the brief's per-status call, and the Protocol change:
1. **`FeedbackRepository.count_by_status() → Mapping[FeedbackStatus, int]`**: every status's
   count in one `GROUP BY status`, in **the request's scope** (as `inbox`), crash reports
   in, demo authors out, an erased author's report (`user_id IS NULL`) in. No `viewer`, as
   `inbox` has none. The docstring says "the request's scope", not "the company": on a
   superuser/bypass session (kastlan's `app.bypass_rls`) it counts every company, so
   `/platform/attention` (§9.3) must not use it.
   - kastlan: the request's session (`get_db_session`) sets `app.current_company`;
     `feedback` has forced RLS and the ORM company filter applies on top, so the count
     sees exactly what `inbox` sees (feedback_repository.py:72-81).
   - keksdose: the whole table, as today (adapters/persistence/feedback_repository.py,
     `inbox` at :56).
   - Kurvenschmiede: `FeedbackRepository.inbox` (feedback_service.py:343) already asks
     nothing about the caller; `_not_by_a_demo()` moves into the repository from
     attention_service.py:53-56.
2. **`feedback_attention(counts) → FeedbackAttention(to_triage, awaiting_verdict,
   released_for_work)`**, from the kit's `OPEN`, **`AWAITING_STATUSES - {OPEN}`** (kk's
   `VERDICT_STATUSES` exactly) and `QUEUE_STATUSES` (feedback/enums.py:81-98), so a status
   the kit adds joins every app's tile. The app passes them to `AdminAttention.of`.
   - kk: the two `_feedback_count` calls become one; `released_for_work` is new and read
     by no tile yet.
   - ka: drops about 4 lines; keeps its `AWAITING_VERDICT` key (:33-34), filled from
     `awaiting_verdict`.
   - KS: `released_for_work` is exactly today's queue tile (:68, :84). The feedback loop's
     queue (feedback_loop.py:103) is `to_triage ∪ released_for_work` on purpose and keeps
     its own tuple. **KS adds the awaiting-verdict tile** (Marcel): IN_EVALUATION and
     NEEDS_LIVE_TEST wait on KS's one admin (DONE is the admin's, KS CLAUDE.md "The
     feedback loop"), XS.
3. `InMemoryFeedbackRepository` gains it (feedback/testing.py:158).

Adding a method to the Protocol makes each app's repository fail its type check until
it is added: a 0.15 adopt line, about ten lines per app, and the attention services
lose 4–25 lines each.

**Split.** server-kit S (~30 code, ~60 test lines). ui-kit none. Apps XS each (KS's
repository is `feedback_service.py:343`'s class, kk/ka `adapters/persistence/feedback_repository.py`),
KS's third tile XS.

### 9.6 For the reviews

Answered in audits/round-046/reviews.md; §9.7 says where each answer went.

- **kastlan:** §9.1 (a), (b); §9.2 (a): who sends the test mail; §9.3 (a), (b); §9.4 (b),
  (c): the address and the logo, and where the logo shows; §9.5: your repository's scope
  (RLS) holds for a count with no viewer?
- **keksdose:** §9.2: the card in `messaging` beside the push test, and the route under
  `/admin`; §9.5: your awaiting-verdict set is `AWAITING_STATUSES - {OPEN}`, so the helper
  fits?
- **Kurvenschmiede:** §9.2 (b): a "System" section, or elsewhere; §9.5: does `released_for_work`
  from `QUEUE_STATUSES` match the loop's queue (feedback_loop.py:103 adds OPEN)?

### 9.7 The reviews (2026-10-19) and Marcel's settle

The draft (ui-kit `870b916`) was reviewed on 2026-10-19 by kastlan (at `feat/kit-0.44`
6c2a0c4), keksdose (keksdose-83, at `feat/feedback-loop-80-424-434`) and Kurvenschmiede
(at `main` b54c16e). Marcel settled it the same day in the ui-kit session ("As
reviewed"). Every correction was checked against the app's code before it went in. Where
each point went:
- **Marcel:** the console as one `SettingsLayout` → §9.1.1; operator actions stamped
  `via: "platform"` and the platform log filtered on it → §9.1.3; the test mail through
  each app's own `send_email` → §9.2.2; the badge deletion requests only, persons only,
  the demo company out of `companies_new_7d` → §9.3; the name edit logged, the address
  apart, the logo later → §9.4; one mapping and the Protocol change, KS adds the
  awaiting-verdict tile → §9.5.
- **kastlan:** `/platform/actions` is the source; the plan rows, the company-admin
  invite and the unlogged company PATCH join it by `via`, not by a superuser actor →
  §9.1 Today, §9.1.3; the (de)activation logged as `group_deactivate` /
  `group_reactivate` (the kit has no group-activation action yet; added here, rather
  than reusing the person's `deactivate`, so the log words it for the company) → §9.1
  Split; the shell S–M → §9.1.1; the superuser only, the transport reports enough, the
  console answers `True`, the `MailMessage` adapter, the limiter beside `mail_limiter`,
  the `/platform/users/{id}/mail` workaround → §9.2; the SMTP send at :132-156 → §9.2
  Today; the counts' predicates, the demo company out → §9.3.1; persons only → §9.3.3;
  "Today" wrong: the superuser renames, unlogged → §9.4 Today, `group_rename` on both
  paths → §9.4; the Treuhandkonto reason and the fallback rule → §9.4; where the logo
  will show → §9.4; the RLS scope holds, the bypass caveat → §9.5.1.
- **keksdose:** `messaging` beside the push test, `POST /admin/mail/test` → §9.2.5; through
  its own `send_email` (Reply-To, the retry, the empty-key refusal, `record_email` kind
  `mail_test`, no recipient in the log) → §9.2.2; the push card's line now :1123 → §9.2
  Today; the helper fits with no change in the tiles, the table is global → §9.5; nothing
  wanted from §9.1/§9.3 (a job run by hand stays an operational log line). "Today"
  otherwise right.
- **Kurvenschmiede:** "System" with `after: "teams"`, the console notice stays → §9.2.5;
  the test mail awaited inline, not after the commit; the card reads `mail_backend` →
  §9.2.2, §9.2.4; the limiter in `AuthLimiters`, the demo declaration → §9.2.6;
  "Today" wrong: two counts, not three → §9.5 Today; `released_for_work` is today's tile,
  the loop keeps its tuple, `_not_by_a_demo()` moves into the repository → §9.5.
