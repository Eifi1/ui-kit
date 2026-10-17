# The admin area — harmonisation plan

**Settled 2026-10-17** (Marcel, in the ui-kit session, after the three app reviews; §6, §7).
Planned as round 0.43; built in the same release as billing §16: **ui-kit 0.42, server-kit 0.14**.
§6 wins over §2–§4 where they differ.

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
