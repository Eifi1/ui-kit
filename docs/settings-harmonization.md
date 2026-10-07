# Settings — harmonisation plan

Status: **2026-10-07, draft for review.** Led from ui-kit at Marcel's request: "The whole
settings layout shall be the next one to harmonize. With the sidebar inside like keksdose
has … also with differences in desktop and mobile appearance. Also ui and server, not
only appearance but also similar backend functionality." It ships in ui-kit **0.31** and
server-kit **0.5**, together with the landing and demo round
(`docs/landing-demo-harmonization.md`).

It builds on the user-admin round (`docs/user-admin-harmonization.md`, ui-kit 0.30.0 /
server-kit 0.4.0). That round made the account's own settings cards (email change,
sessions, deletion, export); this one gives every app **one settings page to put them
on**, and one admin page built the same way.

It is built from a read-only audit of the three apps (2026-10-07; kept outside the repo).
**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede. keksdose is the reference
for the desktop layout and the catalogue; the phone pattern and the URL are new for all
three (Marcel's decisions, §2).

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Route | `/settings#group[/sub]`, `?focus=anchor` | `/profile`; company settings on `/users` (admin) | `/account` |
| Desktop | inner sidebar (kit vertical `Tabs`, 14rem, not sticky), one group shown | no navigation; 2-column card grid from lg | no navigation; 2 hand-assigned columns from lg |
| Phone | the sidebar becomes a wrapped chip strip above the content | one column of cards | one column of cards |
| Catalogue and search | `settings-index.ts`: groups + one entry per setting, localized keywords; the same catalogue feeds ⌘K | none | none |
| Groups | appearance, account, security, privacy, assistant, interaction, notifications, data | none | none |
| Profile | kit `ProfileSetting`, one name | kit `ProfileSetting`, one name split on save | own card, first and last |
| Password | kit | kit (+ strength, 72 bytes) | kit |
| 2FA | kit + "replace authenticator" | kit + backup codes (app) | none yet |
| Passkeys | kit | kit | kit |
| Sessions | none | app "sign out everywhere"; `/auth/sessions` unused | app "sign out everywhere" |
| Theme | light/dark toggle, no "system" | kit `ThemeSetting` system/light/dark | top-bar toggle only |
| Language | kit `LanguageSetting`; device → account only | kit; device → account → browser | kit; device → account → browser |
| Notifications | full push, inbox, per type, quiet hours, digest, devices | two switches stored, **read by nothing** | none |
| Admin page | `/admin#section`, the **same** sidebar shell | `/users` (admin nav group with `/billing`, `/import`) | `/admin` stacks users, teams, invitations |
| PATCH and `null` | `display_name: null` ignored; `reporting_currency: null` clears | company settings: null skipped on required fields, clears elsewhere | server-kit `ProfileUpdate`: null refused (422) |

What is already the same: the kit's `PasswordSetting`, `PasskeysSetting` and
`LanguageSetting`, the theme kept on the device (`createThemeStore`),
`PATCH /auth/me {locale}` mirroring the UI language, and settings reached from the
top-bar account menu.

The kit has the vertical `Tabs` (which become keksdose's chip strip on a phone),
`PageContents` with scroll-spy (no app uses it for settings), `createSearchIndex` /
`matchEntries`, and the setting cards. It has **no** settings layout, catalogue type,
group selection, focus ring, phone drill-down or settings labels.

## 2. Decisions (Marcel, 2026-10-07)

1. **Desktop: the inner sidebar, as keksdose has it.** One group at a time, the group
   list on the left of the content, inside the app's own shell.
2. **Phone: a drill-down list.** `/settings` is a list of the groups (icon, name, one
   help line, chevron). Tapping one opens that group's page with a back control. This
   replaces keksdose's chip strip.
3. **Path segments, not the hash:** `/settings/<group>`, with real history entries.
   kastlan's `/profile` and KS's `/account` redirect.
4. **Only the language follows the account.** A new device adopts the account's
   language unless it has a choice of its own. Everything else (theme, palette, date
   format, density, gestures) stays per device.
5. **Admin and company settings live on a separate admin page with the same shell**
   (`/admin/<section>`), never as a group inside `/settings`.

Settled by the kit in this draft; the reviews may object:

6. **The core groups and their order:** appearance, account, security, *the app's own
   groups*, notifications, data. "Data" stays last because it holds the destructive
   cards (§4).
7. **The group is called "Account"** in every app ("Konto"), not "Profile" or "My
   Profile". The profile card inside it is titled "Profile".
8. **Theme: system, light and dark in every app,** as a segmented control. keksdose
   gains "system"; it stays the default for a new device.
9. **One PATCH rule** for every settings endpoint (§6.1).
10. **Notifications keep their place in the order, but their parts wait for the
    notifications round.** No app changes its notification backend in this round
    (§6.4).

## 3. The page

### 3.1 Routes

| Path | Desktop (md and up) | Phone (below md) |
|---|---|---|
| `/settings` | replaced by `/settings/<default group>` | the group list (§3.3) |
| `/settings/<group>` | sidebar + that group | the group's page with a back control |
| `/settings/<group>/<sub>` | as above; a card owns `<sub>` (kk's swipe surface) | as above |
| `?focus=<anchor>` | on any of the above: scroll to the card and ring it once (§3.5) | same |

- **An unknown group** is replaced by the default group (desktop) or the list (phone).
  It is never a 404, so an old bookmark keeps working.
- **Hidden groups** (§4.2) behave like unknown ones.
- **History:**
  - On a phone, opening a group **pushes**, so the OS back gesture returns to the list.
  - On a desktop, switching groups in the sidebar **replaces**. This is keksdose's rule:
    back leaves settings instead of walking back through every group looked at.
  - **The back control** goes to the list: `navigate(-1)` when the list is the previous
    entry (the kit marks it in `location.state`), otherwise a replace to `/settings`.
    A deep link from a mail or a push therefore never sends "back" out of the app.
- **Redirects, kept for good** (they cost nothing; mails, push payloads, tours and
  bookmarks hold the old links):
  - kk `/settings#<group>[/<sub>]` → `/settings/<group>[/<sub>]`, and
    `/settings?focus=x#g` → `/settings/g?focus=x`. The kit's hook reads a legacy hash
    once on mount.
  - ka `/profile` → `/settings/account`.
  - KS `/account` → `/settings/account`.
- **Breadcrumb and title:** `document.title` is "<group> · Settings · <app>". kastlan's
  breadcrumb shows Settings › <group>.

### 3.2 Desktop

Lifted from keksdose (`settings-page.tsx`), with one addition:

- The page: `max-w-6xl`, the kit `PageHeader` "Settings" (h1), then the search field
  (§3.4) above the grid.
- The grid: `md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6`.
- **The sidebar** is the kit's vertical `Tabs`: an icon per group, the active row filled,
  arrow keys, `aria-orientation="vertical"`. Each row is a link to `/settings/<group>`.
  - **New: it is sticky** (`md:sticky md:top-6 md:self-start`), so a long group
    (keksdose's notifications) keeps the list in view.
- **The content column:** the group heading (`h2`, `text-lg font-semibold`) and its help
  line, then the group's cards in **one column**, never a masonry or a two-column grid.
  kastlan's and KS's two-column card grids go.

### 3.3 Phone (below md, the kit's `PHONE_QUERY`)

**The list (`/settings`):**
- The `PageHeader` "Settings", the search field, then one `List` of the visible groups:
  icon, name, the help line (one line, truncated), a chevron. Each row is a link.
- An app may add a row **below** the groups that leaves settings, such as kastlan's
  "Administration" for an admin (§5). It is styled as a link row, never as a group.

**The group page (`/settings/<group>`):**
- A back control in the header: "‹ Settings" (a link, `aria-label` "Back to settings").
- The group's name as the page's `h1` and the help line under it, then the cards, as
  on the desktop.
- No sidebar and no chip strip. The kit's vertical `Tabs` keep their chip mode for other
  pages; `SettingsLayout` no longer uses it.

The bottom bar keeps no settings entry; settings stay in the account menu (§3.6).

### 3.4 Search

- **One catalogue** (§4) feeds the in-page search, the phone list's search and ⌘K.
- **Matching** uses the kit's `matchEntries`: accents folded, ranked, over the entry's
  title, its group's name and its keywords. keksdose's plain substring test goes.
- **While searching (desktop):** the sidebar dims groups without hits and shows a count
  badge on the others (keksdose). The content column shows the hits as a `List`: the
  card's title, its group's name as trailing text. A hit is a link to
  `/settings/<group>?focus=<anchor>`.
- **While searching (phone):** the group list is replaced by the same hit list.
- **No hits:** "No settings match “…”." with a clear button.
- **When it shows:** the search field shows once the catalogue has **more than 8
  entries**. Below that it is noise (KS starts with about seven). ⌘K always gets the
  entries.
- **⌘K:** `settingsSearchEntries(catalogue, t)` builds the `GlobalSearch` entries with
  the `/settings/<group>?focus=<anchor>` href and the group as their section.

### 3.5 Focus

`?focus=<anchor>` scrolls the card into view once its group has rendered and draws the
focus ring round it for 1.8 s (keksdose's `HIGHLIGHT`). Then the parameter is removed
with a replace, so a reload doesn't ring it again. Focus moves to the card's heading for
a screen reader. A search hit, ⌘K, a tour and a mail link all use it.

### 3.6 Where settings are reached

- **The account menu** in the top bar: "Settings" → `/settings` (all three apps already
  do this; ka and KS change the target).
- An entry may deep-link a group: keksdose's notification count goes to
  `/settings/notifications`.
- ⌘K (keksdose; any app with `GlobalSearch`).
- **Not** the main navigation and not the bottom bar.

### 3.7 Cards inside a group

- Every card is a kit `Card`, at the settings type scale: the title `text-sm
  font-medium`, the description `text-xs` muted (`CARD_TITLE_CLASS` /
  `CARD_DESCRIPTION_CLASS`, as the 0.30 account parts already do).
- **Inside `SettingsLayout` the kit cards' titles are `h3`** under the group's `h2`
  (desktop) or the page's `h1` (phone, then `h2`). A context sets the level, so the same
  card outside settings keeps its plain title. App cards use `SettingsSection` (§7.1),
  which gives them the same title, anchor and focus ring.
- `TwoFactorSetting` gets a title ("Two-factor authentication"); it had only a status
  line.
- Destructive cards (`DeleteAccountSetting`, keksdose's "erase all data") go last in
  the "data" group, in the `danger` tone.

## 4. The catalogue

### 4.1 The shape (lifted from keksdose's `settings-index.ts`)

```ts
interface SettingsGroup<G extends string = string> {
  id: G;                     // the path segment: lowercase, a-z and "-"
  icon: ReactNode;
  title: string;             // resolved by the app, or a kit core label (§4.3)
  help: string;              // one line, shown under the heading and in the phone list
  visible?: boolean;         // false hides the group: no row, no hits, its path acts as unknown
}

interface SettingsEntry<G extends string = string> {
  id: string;
  group: G;
  anchor: string;            // the card's DOM id, unique on the page
  title: string;
  keywords?: string;         // localized, space-separated; never shown
}
```

- **Every card has an entry, and one entry per setting**, not per card: a search for
  "quiet hours" finds the notifications card's field. Several entries may share an
  anchor.
- **A card without an entry throws in development** (keksdose's `section()` guard):
  `SettingsSection` looks its anchor up.
- **The first visible group is the default**, unless the app says otherwise
  (`defaultGroup`). keksdose keeps "appearance".
- A group with no visible entries is hidden. KS's notifications group is therefore
  hidden until it has a card.

### 4.2 The groups

| Group | Holds | kk | ka | KS |
|---|---|---|---|---|
| `appearance` | language, theme, palette, date format, density | language, theme (+ system), simple/enhanced, palette, date format | language, theme | language, theme (moves in from the top bar; the toggle stays there too) |
| `account` | profile, email change, the app's memberships | profile, email change | profile, email change, **companies** (leave) | profile, email change, **pending shares** |
| `security` | password, 2FA, passkeys, sessions, API tokens | password, 2FA (+ replace), passkeys, sessions, API tokens | password, 2FA, backup codes, passkeys, sessions (with the device list) | password, passkeys, sessions; 2FA when it arrives |
| *app groups* | | privacy, assistant, interaction | — | — |
| `notifications` | the app's notification cards | inbox, push, checkup, devices (unchanged) | the two switches (until the notifications round, §6.4) | hidden |
| `data` | export, imports and exports of the app's data, then the destructive cards | price pool, exchange rates, export, demo data, erase all data, delete account | export, delete account | export, delete account |

- **Apps add groups between security and notifications**, in their own order.
- **Not in settings:** anything about the company (§5), keksdose's reporting currency
  (set in Reports) and display currency (per budget).
- Language stays in the top bar or account menu as well. That is the quick switch; the
  card is the place to find it.

### 4.3 Labels

A new kit namespace `settings`, in seven languages:
- the page: "Settings", "Search settings…", "No settings match “{query}”.", "Back to
  settings", "Settings sections";
- the **core groups**' names and help lines (appearance, account, security,
  notifications, data);
- "{count} matches" for the badge's accessible name.

An app may override any core label and supplies its own groups' words.

## 5. The admin page, same shell (§2.5)

- `/admin/<section>` uses the same `SettingsLayout` with its own catalogue: the sidebar
  on desktop, the drill-down list on a phone, search when it has more than 8 entries,
  `?focus=`. The heading is "Administration" ("Verwaltung").
- **Who sees it:** the app's admin check. The account menu's "Administration" entry
  shows only to an admin, and the route answers the app's 403 page to anyone else.
- **Per app:**
  - **keksdose:** its `/admin#section` (metrics, health, scheduler, users, access,
    messaging, system) moves to path segments. Its section heading becomes the group
    `h2` (today a `PageHeader`, the one drift).
  - **kastlan:** `/admin/users` (the roster and invitations, today `/users`) and a new
    `/admin/company` (document language, QR-bill account, today on `/users`). `/billing`
    and `/import` may become sections or stay pages of the admin nav group; that is
    kastlan's call. `/users` redirects.
  - **KS:** `/admin/users`, `/admin/teams`, `/admin/invitations` (today stacked on one
    page). Whether `/teams` (team managers, not only admins) stays its own page is KS's
    call.
- The admin page is **company-scoped** in kastlan: it shows the active company and
  follows the `CompanySwitcher`.

## 6. The backend

### 6.1 One PATCH rule

Every settings write (`PATCH /auth/me`, kastlan's company settings, keksdose's
`/push/settings`, any later one) follows one rule:

1. **An omitted field keeps its value.**
2. **An explicit `null` clears a nullable field** (back to "not set" or the default).
3. **An explicit `null` on a field that can't be empty is a 422**, never a silent skip.
4. **Unknown fields are a 422** (`extra="forbid"`), so a typo is not a silent no-op.
5. **The answer is the whole resource after the change**, so the client replaces its
   copy instead of merging.

server-kit 0.5 adds `apply_patch(obj, update, *, not_nullable=…)`, which applies a
pydantic model's `model_fields_set` under rules 1–3. server-kit's `ProfileUpdate` already
follows them. **What changes:**
- keksdose: `display_name: null` becomes a 422 instead of being ignored;
  `/push/preferences` lets `null` reset a type to its default (today it is dropped).
- kastlan: `null` on `default_language` or `default_account_country` becomes a 422
  instead of being skipped.

### 6.2 The language (§2.4)

- **The account holds one `locale`**, canonical, from the app's offered languages:
  `canonical_locale(tag, offered)` (server-kit 0.5):
  - case and `_` normalised (`de_ch` → `de-CH`);
  - an offered tag matches exactly; otherwise the language's offered tag (`de`, `de-DE`
    → `de-CH`);
  - anything else → `None`, which `PATCH /auth/me` answers with a 422.
  It replaces keksdose's `canonical_locale`, kastlan's `normalize_lang` and KS's
  `LanguageIn`. `parse_accept_language(header, offered)` comes with it, for mails to
  someone without an account.
- **The order on a device:** the device's own choice → the account's locale → the
  browser's language → the app's default.
  - "The device's own choice" is a choice made **on this device**. It is stored under
    `<app>-lang` only when the user picks a language. Detecting the browser never writes
    it.
  - **At sign-in**, the account's locale applies unless the device has its own choice.
    That is kastlan's and KS's rule today. **keksdose changes:** a new device now follows
    the account.
  - **Picking a language** writes the device's choice and `PATCH /auth/me {locale}`
    (all three already do).
- The kit's `useAccountLanguage({account, device, setDevice, save})` implements the
  order and the sign-in rule, so the three copies go.
- Mails and pushes use the account's locale; the server never guesses from the request.

### 6.3 Everything else stays on the device

- Theme, palette, date format, density, keksdose's gestures and blur mode: one
  localStorage key each, `<app>-<name>`, through the kit's stores.
- They are **not** sent to the server and not in `/auth/me`. The export (0.30) does not
  list them.
- "Reset this device's settings" is not in this round.

### 6.4 Notifications (the notifications round)

The notification shapes (types with defaults, quiet hours, the IANA timezone, digest
cadence, push devices) come with **the notifications round**, from keksdose's
`schemas/push.py`. Until then:
- keksdose's notifications group is unchanged, apart from the PATCH rule (§6.1).
- **kastlan's** `email_notifications` and `browser_notifications` switches stay, but the
  browser poller **respects** `browser_notifications` from this round on. Today it polls
  regardless, which the card's words contradict. `email_notifications` stays as it is:
  no mail reads it yet, and the notifications round decides what it gates.
- KS has no notifications group.

### 6.5 Endpoints, the same names everywhere

What the cards call. Most exist already (0.29 / 0.30); this table is the list to
check against.

| Card | Endpoint |
|---|---|
| Profile, language | `PATCH /auth/me` |
| Password | `POST /auth/me/password` |
| Email change | `POST /auth/me/email`, `POST /auth/me/email/confirm` |
| Sessions | `POST /auth/logout` (all); `GET /auth/sessions`, `DELETE /auth/sessions/{id}` (ka) |
| 2FA, passkeys | each app's existing routes (not renamed in this round) |
| Export | `GET /auth/me/export` |
| Deletion | `POST /auth/me/deletion` |
| Company settings (ka) | `GET/PATCH /company/settings` |

kastlan's `/auth/user` aliases and its `PATCH /auth/me {current_password,
new_password}` may stay for one release while the client moves to
`/auth/me/password`.

## 7. What the kits add, what stays app-side

### 7.1 ui-kit 0.31

**Layout** (router-aware, so in the main entry and the `./shell` slice):
- `SettingsLayout({title, groups, entries, basePath, defaultGroup?, search?, renderGroup,
  phoneFooter?, labels})`: the page, the sticky sidebar, the phone list and group page,
  the search and the hit list, the focus handling.
  - `basePath` is `/settings` or `/admin`.
  - `renderGroup(group, sub)` returns that group's cards.
  - `phoneFooter` holds the extra link rows (§3.3).
- `SettingsSection({anchor, title, description?, tone?, action?, children})`: a card at the
  settings type scale with the anchor, the `h3` and the focus ring. It throws in
  development when the anchor has no catalogue entry.
- `useSettingsRoute({groups, basePath, defaultGroup})`: `{group, sub, focus, select,
  back}`. It reads the legacy hash once (§3.1) and owns the push/replace rule.
- `useSettingsFocus(anchor)`: the scroll, the ring and the parameter's removal (used
  inside the layout; exported for an app's own pages).
- `settingsSearchEntries(groups, entries)` → `GlobalSearch` entries.
- `SettingsHeadingLevel` (context): the kit's setting cards read it (§3.7).
- `TwoFactorSetting` gains its title. `ThemeSetting variant="toggle"`: the segmented
  system / light / dark control.
- `useAccountLanguage(…)` (§6.2).
- The `settings` label namespace in seven languages.
- A showcase page **Settings** (App chrome group): the desktop layout, the phone list and
  group page, search, focus, and the admin variant.

**Not in this round:** notification parts (the notifications round), a `DateFormatSetting`
(keksdose's stays app-side until a second app needs one).

### 7.2 server-kit 0.5

- `settings.apply_patch(obj, update, *, not_nullable=…)` (§6.1), with
  `PatchNullError` → 422.
- `settings.canonical_locale(tag, offered)` and `parse_accept_language(header, offered)`
  (§6.2).
- `ProfileUpdate` takes the app's `offered` locales through a small factory, so KS's
  subclass and kastlan's check go.

### 7.3 App-side

- The catalogue: groups, entries, keywords, icons and the app's words.
- Every app card (keksdose's privacy, assistant, gestures, price pool, FX, demo data,
  wipe, API tokens, notifications; kastlan's companies, backup codes, company
  settings; KS's pending shares).
- The redirects of §3.1 and the admin check of §5.
- The backend endpoints, under the rule of §6.1.

## 8. Per repo (summary; the reviews refine it)

- **keksdose:**
  - `settings-page.tsx` onto `SettingsLayout`; `settings-index.ts` into the catalogue
    shape; `/settings#…` links (account menu, tours, ⌘K, mails, pushes) to paths, the
    legacy hash kept;
  - the phone chip strip becomes the drill-down;
  - the admin page onto the same layout at `/admin/<section>`;
  - theme gains "system";
  - a new device follows the account's language;
  - the PATCH rule on `PATCH /auth/me` and `/push/preferences`;
  - `canonical_locale` from server-kit.
- **kastlan:**
  - `/profile` → `/settings/<group>`; its two-column grid becomes the groups of §4.2;
  - `/users` → `/admin/users`, and the company settings to `/admin/company`;
  - the poller respects `browser_notifications`;
  - the PATCH rule on `/company/settings`; `normalize_lang` → `canonical_locale` (the
    document language keeps its own list);
  - the password on `/auth/me/password`.
- **Kurvenschmiede:**
  - `/account` → `/settings/<group>`; its own profile card → the kit's (0.30);
  - `/admin` → `/admin/users|teams|invitations` on the same layout;
  - the theme card joins appearance;
  - `LanguageIn` → `canonical_locale`.

## 9. Questions for the reviews

1. keksdose: does any push payload, mail or stored tour state hold a `/settings#…` link
   that the legacy-hash reading in §3.1 would not cover?
2. Is "more than 8 entries" the right threshold for the search field?
3. kastlan: should `/billing` and `/import` become admin sections, or stay pages?
4. Does any app keep a setting that should follow the account after all (keksdose's
   date format?) — §2.4 says only the language does.
5. Anything in §6.5 that your client calls differently and can't move this round?
