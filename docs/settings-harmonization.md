# Settings — harmonisation plan

Led from ui-kit at Marcel's request: "The whole settings layout shall be the next one to
harmonize. With the sidebar inside like keksdose has … also with differences in desktop
and mobile appearance. Also ui and server, not only appearance but also similar backend
functionality." It came with the landing and demo round
(`docs/landing-demo-harmonization.md`).

It builds on the user-admin round (`docs/user-admin-harmonization.md`, ui-kit 0.30.0 /
server-kit 0.4.0). That round made the account's own settings cards (email change,
sessions, deletion, export); this one gives every app **one settings page to put them
on**, and one admin page built the same way.

It is built from a read-only audit of the three apps (2026-10-07; kept outside the repo).
**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede. keksdose is the reference
for the desktop layout and the catalogue; the phone pattern and the URL are new for all
three (Marcel's decisions, §2).

## Status

The body says what the build does as of ui-kit 0.34.0 and server-kit 0.8.0; the reviews
and later rounds that amended a section are folded into it, and the table names them. The
snapshot of the three apps, the per-repo to-dos and the review list as written are in
[archive/settings-history.md](archive/settings-history.md).

| § | Section | Shipped in | Amended by |
|---|---|---|---|
| 1 | Where each one stands | — (archived) | |
| 2 | Decisions | — | the text-size round (decision 4: the text size and the contrast follow the account too) |
| 3 | The page | ui-kit 0.31 | §10.1–§10.4; round 0.34 (the window title, KS U7; `PHONE_QUERY` removed) |
| 4 | The catalogue | ui-kit 0.31; `useSettingsLabels` 0.31.1 | §10.5; the text-size round (§4.2's appearance group) |
| 5 | The admin page, same shell | ui-kit 0.31 | §10.6 |
| 6 | The backend | server-kit 0.5; ui-kit 0.31 (`useAccountLanguage`); §6.4 waits for the notifications round | §10.7–§10.10 |
| 7 | What the kits add | ui-kit 0.31, server-kit 0.5 | round 0.34 (`appName`, `documentTitle`); refactor audit DOC-2 (the signatures as shipped) |
| 8 | Per repo | — (archived) | |
| 9 | Order | — (archived) | |
| 10 | Settled after the reviews | — | an index: each item points to its § |
| 11 | Reset this device's settings | — (round 0.36: settled 2026-10-13, built for ui-kit 0.36.0) | §11.7 (the reviews; round decisions 10, 11) |
| 12 | The role chip is the way into the role's tool | **DRAFT, superseded**: moved to the admin round 0.43 (Marcel: the chip alone is too hidden) | amends §5's "Who sees it" |

## 1. Where each one stands

Moved to [archive/settings-history.md](archive/settings-history.md): the three apps'
settings pages on 2026-10-07, before the round.

## 2. Decisions (Marcel, 2026-10-07)

1. **Desktop: the inner sidebar, as keksdose has it.** One group at a time, the group
   list on the left of the content, inside the app's own shell.
2. **Phone: a drill-down list.** `/settings` is a list of the groups (icon, name, one
   help line, chevron). Tapping one opens that group's page with a back control. This
   replaces keksdose's chip strip.
3. **Path segments, not the hash:** `/settings/<group>`, with real history entries.
   kastlan's `/profile` and KS's `/account` redirect.
4. **Only the language follows the account** — and, since the text-size round, the text
   size and the contrast (text-size §6). A new device adopts the account's value unless
   it has a choice of its own. Everything else (theme, palette, date format, density,
   gestures) stays per device.
5. **Admin and company settings live on a separate admin page with the same shell**
   (`/admin/<section>`), never as a group inside `/settings`.

Settled by the kit, and kept by the reviews (§10):

6. **The core groups and their order:** appearance, account, security, *the app's own
   groups*, notifications, data. "Data" stays last because it holds the destructive
   cards (§4).
7. **The group is called "Account"** in every app ("Konto"), not "Profile" or "My
   Profile". The profile card inside it is titled "Profile".
8. **Theme: system, light and dark in every app,** as a segmented control. "System" is
   the default for a new device.
9. **One PATCH rule** for every settings endpoint (§6.1).
10. **Notifications keep their place in the order, but their parts wait for the
    notifications round** (§6.4).

## 3. The page

### 3.1 Routes

| Path | Desktop (md and up) | Phone (below md) |
|---|---|---|
| `/settings` | replaced by `/settings/<default group>` | the group list (§3.3) |
| `/settings/<group>` | sidebar + that group | the group's page with a back control |
| `/settings/<group>/<sub>` | as above; a card owns `<sub>` (kk's swipe surface) | as above |
| `?focus=<anchor>` | on any of the above: scroll to the card and ring it once (§3.5) | same |

- **An unknown group** is replaced by the default group (desktop) or the list (phone),
  with the query kept. It is never a 404, so an old bookmark keeps working.
- **Hidden groups** (§4.1) behave like unknown ones.
- **`/settings?focus=<anchor>` with no group** goes to the anchor's group, where it can
  ring (`resolveSettingsLocation` in `src/settings/use-settings-route.ts`).
- **Aliases:** `aliases: {overview: "metrics"}` maps a retired group id to its successor
  (keksdose's admin), with a replace.
- **The sub-segment belongs to a card.** The card selects it with `selectSub(sub)` (a
  replace) from the layout's context, and never builds the path itself.
- **History:**
  - On a phone, opening a group **pushes**, so the OS back gesture returns to the list.
  - On a desktop, switching groups in the sidebar **replaces**. This is keksdose's rule:
    back leaves settings instead of walking back through every group looked at.
  - **The back control** goes to the list: `navigate(-1)` when the list is the previous
    entry (the kit marks it in `location.state`), otherwise a replace to `/settings`.
    A deep link from a mail or a push therefore never sends "back" out of the app.
- **Redirects, kept for good** (they cost nothing; mails, push payloads, tours and
  bookmarks hold the old links):
  - kk `/settings?<query>#<group>[/<sub>]` → `/settings/<group>[/<sub>]?<query>`, with
    **the whole query carried** (a tour's `?tour=…&tourStep=…` as well as `focus`).
  - **The conversion runs on every navigation, not once on mount**: whenever the
    pathname is the base path and a hash is present, keyed on `location.key`. The router
    keeps the layout mounted across links followed inside the app (keksdose's inbox
    renders admin-typed URLs; a push click routes an open window without a reload).
  - The app's sign-in redirect must keep the hash in `?next=`, so an old link opened
    while signed out still lands.
  - ka `/profile` → `/settings/account`.
  - KS `/account` → `/settings/account`.
- **Breadcrumb and title:** `document.title` is "<group> · Settings · <app>", and
  "<page> · <app>" on the phone's group list. `SettingsLayout` writes it from `appName`
  (left out, the title ends at the page) and puts back the title it found on unmount.
  `documentTitle={false}` leaves the title to the app; a function writes another order
  from the same parts (`SettingsDocumentTitleParts`). kastlan's breadcrumb shows
  Settings › <group>.

### 3.2 Desktop

Lifted from keksdose (`settings-page.tsx`), with one addition:

- The page: `max-w-6xl` by default, the kit `PageHeader` "Settings" (h1), then the
  search field (§3.4) above the grid. A `width` prop widens it: keksdose's admin stays
  `max-w-7xl`, because its user table scrolled sideways at 6xl (dev#488).
- The grid: `md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6`.
- **The sidebar** is the kit's vertical `Tabs`: an icon per group, the active row filled,
  arrow keys, `aria-orientation="vertical"`. Each row is a link to `/settings/<group>`.
  - **The addition: it is sticky** (`md:sticky md:top-6 md:self-start`), so a long
    group (keksdose's notifications) keeps the list in view.
- **The content column:** the group heading (`h2`, `text-lg font-semibold`) and its help
  line, then the group's cards in **one column**, never a masonry or a two-column grid.

### 3.3 Phone (below md, `usePhoneLayout()`)

"Phone" is the kit's one answer, `usePhoneLayout()`: below `md` at the text size in force
(text-size §3.3). `SettingsLayout`'s `layout="desktop"` or `"phone"` pins one for a
preview of both side by side (§7.1).

**The list (`/settings`):**
- The `PageHeader` "Settings", the search field, then one `List` of the visible groups:
  icon, name, the help line (one line, truncated at Normal; it wraps at Large, text-size
  §4), a chevron. Each row is a link.
- An app may add a row **below** the groups that leaves settings, such as kastlan's
  "Administration" for an admin (§5). It is styled as a link row, never as a group.

**The group page (`/settings/<group>`):**
- A back control in the header: "‹ Settings" (a link, `aria-label` "Back to settings").
- The group's name as the page's `h1` and the help line under it, then the cards, as
  on the desktop.
- No sidebar, no chip strip and no search field. The kit's vertical `Tabs` keep their
  chip mode for other pages; `SettingsLayout` does not use it.

The bottom bar keeps no settings entry; settings stay in the account menu (§3.6).

### 3.4 Search

- **One catalogue** (§4) feeds the in-page search, the phone list's search and ⌘K.
- **Matching** uses the kit's search index (`createSearchIndex`): accents folded, ranked,
  over the entry's title, its group's name and its keywords, every hit listed.
- **While searching (desktop):** the sidebar dims groups without hits and shows a count
  badge on the others (keksdose). The content column shows the hits as a `List`: the
  card's title, its group's name as trailing text. A hit is a link to
  `/settings/<group>?focus=<anchor>`.
- **While searching (phone):** the group list is replaced by the same hit list.
- **No hits:** "No settings match “…”." with a clear button.
- **When it shows:** by default once the catalogue has **more than 8 visible entries**
  (`SETTINGS_SEARCH_THRESHOLD`; KS has about twelve, keksdose 26). An explicit
  `search={false}` or `search` wins over the count: keksdose's admin keeps no search
  field. ⌘K always gets the entries.
- **⌘K:** `settingsSearchEntries(groups, entries, { basePath })` builds the
  `GlobalSearch` entries: each visible setting with the
  `<basePath>/<group>?focus=<anchor>` href, its group's name as their section and as a
  keyword, and an id prefixed with the base path (`settings:theme`, `admin:users`), so a
  palette that also holds pages and actions keeps them unique.

### 3.5 Focus

`?focus=<anchor>` scrolls the card into view once its group has rendered and draws the
focus ring round it for 1.8 s (`useSettingsFocus`, `SETTINGS_FOCUS_MS`; keksdose's
`HIGHLIGHT`). A card that mounts later (lazy, or behind its data) is waited for a few
seconds. Then **only `focus`** is removed, with a replace, so a reload doesn't ring it
again. Every other parameter stays, and so do the hash and `location.state`: a tour's
`tour` / `tourStep` and the admin roster's filters (dropping URL parts broke the tours
once, keksdose dev#495). Focus moves to the card's heading for a screen reader. A search
hit, ⌘K, a tour and a mail link all use it.

### 3.6 Where settings are reached

- **The account menu** in the top bar: "Settings" → `/settings`.
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
- **A card alone in a group named after it** keeps its title for screen readers only
  (`titleVisible={false}`), so the page doesn't print the same heading twice (keksdose's
  admin, dev#490, #493, #494).
- `TwoFactorSetting` has a title ("Two-factor authentication") with an On/Off chip.
- Destructive cards (`DeleteAccountSetting`, keksdose's "erase all data") go last in
  the "data" group, in the `danger` tone.
- `DeviceResetSetting` ("Reset this device", 0.36, §11.4) goes last in the "appearance"
  group, in the default tone, with its catalogue entry (`DEVICE_RESET_ANCHOR`) last there
  too.

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
  visible?: boolean;         // false drops the entry from the page and from search
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
- **A demo session** (`docs/landing-demo-harmonization.md`) marks every card that is
  refused for a demo `visible: false`: passkeys, 2FA, API tokens, sessions, email and
  password change, push, E2EE, export, deletion. A group left with no visible entry is
  hidden by the rule above, so a demo sees no page of cards that each answer 403.
- An app may keep its catalogue in another form and map it to this shape at render time
  (keksdose keeps key-based data, because its help assistant's corpus builder parses
  `settings-index.ts`).

### 4.2 The groups

| Group | Holds |
|---|---|
| `appearance` | language, theme, text size and contrast (text-size §6), palette, date format, density; last, the device reset (§11) |
| `account` | profile, email change, the app's memberships (kastlan's companies, KS's pending shares) |
| `security` | password, 2FA, passkeys, sessions, API tokens |
| *app groups* | the app's own (keksdose: privacy, assistant, interaction) |
| `notifications` | the app's notification cards (§6.4); hidden while it has none |
| `data` | export, imports and exports of the app's data, then the destructive cards |

- **Apps add groups between security and notifications**, in their own order. Each
  app's plan of 2026-10-07 per group is in the archive.
- **Not in settings:** anything about the company (§5), keksdose's reporting currency
  (set in Reports) and display currency (per budget).
- Language stays in the top bar or account menu as well. That is the quick switch; the
  card is the place to find it.

### 4.3 Labels

The kit namespace `settings` (`SettingsLabels`, `DEFAULT_SETTINGS_LABELS` in
`src/settings/settings-labels.ts`), in seven languages:
- the page: "Settings" (also the phone's back link), "Search settings" (the field's name)
  and its placeholder "Search settings…", "Matching settings" (the hit list's name),
  "No settings match “{query}”.", "Clear search", "Back to settings", "Settings
  sections";
- the **core groups**' names and help lines (appearance, account, security,
  notifications, data);
- "1 match" / "{count} matches" for the badge's accessible name.

An app may override any core label (prop > `<UiKitProvider labels={{ settings }}>` >
English) and supplies its own groups' words. `useSettingsLabels(labels?)` resolves the
namespace, for an app's catalogue (the core groups' titles and help lines) and its own
window titles.

## 5. The admin page, same shell (§2.5)

- `/admin/<section>` uses the same `SettingsLayout` with its own catalogue: the sidebar
  on desktop, the drill-down list on a phone, `?focus=`. Search follows §3.4, and an app
  may switch it off. The heading is "Administration" ("Verwaltung").
- **Who sees it:** the app's admin check. The account menu's "Administration" entry
  shows only to an admin, and the route answers the app's 403 page to anyone else.
- **The `AdminActionLog` has a section of its own, `activity`**, in every app that
  shows it.
- **A section for a feature that is off is hidden**, `visible: false`, so its path acts
  as unknown (kastlan's `/admin/billing` with `visible: billing_enabled`).
- **Link-only entries are not catalogue entries.** A page that is a task rather than a
  setting (kastlan's import wizard) stays a page: a `phoneFooter` link row on a phone,
  and its own entry in the app's admin nav group on a desktop.
- **The sections per app** (keksdose's metrics … system with `aliases`, `width="7xl"` and
  `search={false}`; kastlan's users, company, billing, activity; KS's users, teams,
  invitations, activity) are the apps' own; the plan of 2026-10-07 is in the archive.
- In kastlan the admin page is **company-scoped**: it shows the active company and
  follows the `CompanySwitcher`.

## 6. The backend

### 6.1 One PATCH rule

Every settings write body (`PATCH /auth/me`, kastlan's company settings, keksdose's
`PUT /push/settings` and `/push/preferences`, any later one) follows one rule. It is
about the body, not the verb: keksdose's push writes are PUT.

1. **An omitted field keeps its value.**
2. **An explicit `null` clears a nullable field** (back to "not set" or the default).
3. **An explicit `null` on a field that can't be empty is a 422**, never a silent skip.
4. **Unknown fields are a 422** (`extra="forbid"`), so a typo is not a silent no-op.
5. **The answer is the whole resource after the change**, so the client replaces its
   copy instead of merging.

server-kit's `settings.apply_patch(obj, update, *, not_nullable, defaults=None)` applies
a pydantic model's `model_fields_set` under rules 1–3 and answers the fields it wrote:
- `not_nullable` is required (an empty one says "every field may be cleared" out loud);
  a null on one of them is a `PatchNullError` (422, code `not_nullable`, every refused
  field named), raised before anything is written;
- `defaults` maps a field whose "not set" is a value: its null writes the default
  (keksdose's push preferences: `null` resets a type to its default);
- a model without `extra="forbid"` (rule 4) is a `TypeError` on the first call.

server-kit's `ProfileUpdate` follows the rule.

### 6.2 The language (§2.4)

- **The account holds one `locale`**, canonical, from the app's offered languages:
  `canonical_locale(tag, offered)` (server-kit 0.5):
  - case and `_` normalised (`de_ch` → `de-CH`);
  - an offered tag matches exactly; otherwise the language's offered tag (`de`, `de-DE`
    → `de-CH`);
  - anything else → `None`, which `PATCH /auth/me` answers with a 422.
  `parse_accept_language(header, offered)` comes with it, for mails to someone without
  an account.
- **The order on a device:** the device's own choice → the account's locale → the
  browser's language → the app's default, each taken only when it names a language the
  app offers.
  - "The device's own choice" is a choice made **on this device**. It is stored under
    `<app>-lang` only when the user picks a language. **Detecting the browser never
    writes it**: i18next's detector must not cache (`caches: []`).
  - **At sign-in**, the account's locale applies unless the device has its own choice:
    a new device follows the account.
  - **Picking a language** writes the device's choice and `PATCH /auth/me {locale}`.
  - **Nothing writes the account's locale on its own**: no PATCH on a session start, or
    a new device would overwrite the account before adopting it.
  - **A demo session never writes the account**: the pick stays on the device (a
    throwaway account needs no language, and model R refuses the write).
- The kit's `useAccountLanguage({account, device, setDevice, save, isDemo, offered,
  fallback, browser?})` implements the order, the sign-in rule and the demo rule, and
  answers `{language, source, pick}`; `resolveAccountLanguage` is the order alone, and
  `matchOfferedLanguage(tag, offered)` the client's half of `canonical_locale`.
- The text size and the contrast follow the account the same way (`useAccountAppearance`,
  text-size §6).
- Mails and pushes use the account's locale; the server never guesses from the request.

### 6.3 Everything else stays on the device

- Theme, palette, date format, density, keksdose's gestures and blur mode are
  **device-local and never on the server**: not sent, not in `/auth/me`, not in the
  export (0.30). Their storage keys stay as each app has them.
- The date format in particular stays on the device: its "auto" follows the language,
  so a new device that adopts the account's language gets the matching format anyway.
  It would move to the account only once the server renders a date as text.
- Putting this device's settings back to their defaults, in one action, is §11
  (round 0.36: settled 2026-10-13, built for ui-kit 0.36.0).

### 6.4 Notifications (the notifications round)

The notification shapes (types with defaults, quiet hours, the IANA timezone, digest
cadence, push devices) come with **the notifications round**, from keksdose's
`schemas/push.py`; the kit ships no notification parts yet. Until then each app's
notifications group is its own, under the PATCH rule (§6.1), and **a switch an app
stores is respected by what it names**: kastlan's browser poller follows
`browser_notifications` (§10.10). A switch nothing reads yet (kastlan's
`email_notifications`) waits for the notifications round to say what it gates.

### 6.5 Endpoints, the same names everywhere

What the cards call, under the same names in every app. The routes are each app's
own; server-kit ships no router for them.

| Card | Endpoint |
|---|---|
| Profile, language | `PATCH /auth/me` |
| Password | `POST /auth/me/password` |
| Email change | `POST /auth/me/email`, `POST /auth/me/email/confirm` |
| Sessions | `POST /auth/logout` (all); `GET /auth/sessions`, `DELETE /auth/sessions/{id}` (ka) |
| 2FA, passkeys | each app's own routes (not harmonised) |
| Export | `GET /auth/me/export` |
| Deletion | `POST /auth/me/deletion` |
| Company settings (ka) | `GET/PATCH /company/settings` |

## 7. What the kits add, what stays app-side

### 7.1 ui-kit 0.31

**Layout** (router-aware, so in the main entry and the `./shell` slice; source in
`src/settings/`):
- `SettingsLayout({title?, groups, entries, basePath, defaultGroup?, aliases?, search?,
  width?, renderGroup, phoneFooter?, labels?, layout?, appName?, documentTitle?,
  className?})`: the page, the sticky sidebar, the phone list and group page, the search
  and the hit list, the focus handling, the window title.
  - `title`: the page's `h1`; default `labels.title` ("Settings"; "Administration" for
    the admin page).
  - `basePath` is `/settings` or `/admin`.
  - `renderGroup(group, sub)` returns that group's cards.
  - `search`: `undefined` follows the count (§3.4, `SETTINGS_SEARCH_THRESHOLD`); `true`
    or `false` wins.
  - `width`: `"6xl"` (default) or `"7xl"`.
  - `phoneFooter` holds the extra link rows (§3.3, §5); not shown on a desktop.
  - `layout`: `"auto"` (default, `usePhoneLayout()`), `"desktop"` or `"phone"` to pin
    one (§3.3).
  - `appName`, `documentTitle`: the window title (§3.1).
- `SettingsSection({anchor, title, titleVisible?, description?, tone?, action?,
  children})`: a card at the settings type scale with the anchor, the heading at the
  layout's level (screen readers only when `titleVisible={false}`) and the focus ring. It
  throws in development when the anchor has no catalogue entry.
- `useSettingsRoute({groups, entries?, basePath, defaultGroup?, aliases?, layout?})`:
  `{group, sub, focus, select, selectSub, back, groups, phone, redirecting, fromList}`.
  It converts a legacy hash on every navigation (§3.1) and owns the push/replace rule;
  `resolveSettingsLocation(location, rules)` is its pure half.
  `settingsFromListState()` (`SETTINGS_FROM_LIST_STATE`) marks an app's own link from a
  list, so the group page's back is a real back.
- `useSettingsLayout()`: the layout's context for the cards (`basePath`, `group`, `sub`,
  `selectSub`, `headingLevel`, `hasAnchor`).
- `useSettingsFocus(anchor?)`, `SETTINGS_FOCUS_RING`, `SETTINGS_FOCUS_MS`: the scroll, the
  ring and the removal of `focus` alone (used inside the layout; exported for an app's
  own pages).
- `settingsSearchEntries(groups, entries, { basePath })` → `GlobalSearch` entries (§3.4);
  `visibleSettingsGroups`, `visibleSettingsEntries`, `settingsHref` for an app's own use
  of the catalogue.
- `SettingsHeadingLevel` / `useSettingsHeadingLevel` (context): the kit's setting cards
  read it (§3.7).
- `TwoFactorSetting`'s title. `ThemeSetting variant="toggle"`: the segmented system /
  light / dark control.
- `useAccountLanguage(…)`, `resolveAccountLanguage`, `matchOfferedLanguage` (§6.2).
- The `settings` label namespace in seven languages, and `useSettingsLabels` (§4.3).
- A showcase page **Settings** (App chrome group): the desktop layout, the phone list and
  group page, search, focus, and the admin variant.

**Not in the kit:** notification parts (the notifications round), a `DateFormatSetting`
(keksdose's stays app-side until a second app needs one).

### 7.2 server-kit 0.5

- `settings.apply_patch(obj, update, *, not_nullable, defaults=None)` (§6.1), with
  `PatchNullError` → 422, for PATCH and PUT bodies alike.
- `settings.canonical_locale(tag, offered)` and `parse_accept_language(header, offered)`
  (§6.2).
- `settings.profile_update_model(offered)`: `ProfileUpdate` for the app's languages
  (`offered_locales`) in one call.

### 7.3 App-side

- The catalogue: groups, entries, keywords, icons and the app's words.
- Every app card (keksdose's privacy, assistant, gestures, price pool, FX, demo data,
  wipe, API tokens, notifications; kastlan's companies, backup codes, company
  settings; KS's pending shares).
- The redirects of §3.1 and the admin check of §5.
- The backend endpoints, under the rule of §6.1.

## 8. Per repo

Moved to [archive/settings-history.md](archive/settings-history.md): the round's per-repo
to-dos for keksdose, kastlan and Kurvenschmiede, all adopted.

## 9. Order

Moved to [archive/settings-history.md](archive/settings-history.md): the order the apps
adopted in (after their 0.30 adoptions).

## 10. Settled after the reviews (2026-10-07)

The reviews' items keep their numbers, which the code cites. Each one amended a section
above, is folded into it and points there. The reviews' wording is in
[archive/settings-history.md](archive/settings-history.md).

1. **The legacy hash is converted on every navigation** → §3.1.
2. **`aliases`, `selectSub` through the layout's context, `focus` removed alone** → §3.1,
   §3.5.
3. **`width` and `search`; the threshold of 8** → §3.2, §3.4.
4. **`titleVisible={false}`** → §3.7.
5. **`visible` per entry; a demo hides its refused cards** → §4.1.
6. **The admin page's sections** → §5.
7. **The PATCH rule is about bodies** → §6.1.
8. **The language: detection, the account, the demo** → §6.2.
9. **Device-local settings keep their keys; the date format stays on the device** → §6.3.
10. **A stored notification switch is respected** → §6.4.

## 11. Reset this device's settings (round 0.36; settled 2026-10-13)

**Settled 2026-10-13, built for ui-kit 0.36.0.** §6.3 keeps the theme, the palette, the
date format and keksdose's gestures on the device, and nothing puts them back. Someone who
hid a table's column, picked a palette or a text size on a shared device undoes each by
hand, or clears the site's data, which also signs them out and drops the offline copy with
its unsent changes. This adds one action on the settings page that puts this device's
appearance and views back to their defaults, and never touches the account, the session
or anything waiting to be sent (brief 0.36 R). The three reviews (2026-10-13) are folded
in; §11.7 says where each went.

### 11.1 Where each one stands

Read at kk `79b2949c` (checked again at `c90d068e`), ka `f2b9574`, KS `c687637` and the kit
at 0.35.0. No kit part resets the device, and no app has a reset on its settings page.
keksdose has a partial one, for a change of person: `forgetPreviousAccount`
(`frontend/src/shared/state/auth-store.ts:47-60`) runs at logout and when a different user
signs in, and clears the last page, the saved page filters with the reports view
(`clearPersistedPageParams`, `shared/hooks/use-persisted-search-params.ts:21-32`), a
receipt's last answers and the offline copy. The nearest to an appearance reset is one
card's own: keksdose's gestures ("Reset to defaults", "Restore the shipped defaults",
`features/auth/swipe-settings-card.tsx:137-148`). DataTable has no reset of its view.

**The kit** stores, each under a key the app passes unless a default is named:

| What | Key | Where |
|---|---|---|
| theme | the app's | `createThemeStore`, `src/theme/theme-store.ts:86-101`; pre-paint `:65` |
| palette | the app's | `createPaletteStore`, `src/theme/palette-store.ts:43-54`; pre-paint `:17` |
| text size, contrast (this device's choice) | the app's | `src/theme/text-size.ts:246-255`, `src/theme/contrast.ts:179-188` |
| table views (sort, filters, page size, widths, hidden columns) | `tableStorageKeyPrefix` (provider) or `hbui-table:`, then the table's `storageKey` | `src/components/use-table-state.ts:29`, `:370-374` |
| the sidebar folded | `collapseStorageKey` or `appLayout.sidebarCollapsed` | `src/shell/app-shell.tsx:368-369`, `:395` |
| the demo banner folded | `kit.demoBanner.collapsed`, `sessionStorage` | `src/demo/demo-banner.tsx:22`, `:98-103` |
| the last page | the app's | `src/landing/routing.tsx:126` |
| a checkout on its way | `eifi1-billing-checkout` or the app's | `src/billing/checkout-processing.ts:53`, `:158` |
| unsent crash reports | the app's | `src/feedback/feedback-crash.ts:387-402` |

The language picked on a device is under the app's own key: `useAccountLanguage` takes
`device` and `setDevice` (`src/settings/use-account-language.ts:83-85`).

**The apps** (paths under each app's `frontend/src/`):
- **keksdose:**
  - appearance: `keksdose-theme`, `keksdose-palette`, `keksdose-text-size`,
    `keksdose-contrast` (`shared/state/theme-store.ts:8`, `palette-store.ts:8`,
    `text-size-store.ts:10`, `contrast-store.ts:9`), all four the kit's factories; the
    language, `keksdose-lang`, in a store (`shared/i18n/account-language.tsx:35`,
    `:58-68`), which i18next never writes (`shared/i18n/index.ts:116`, `caches: []`); the
    date format (`shared/state/date-format-store.ts:74`); the feature set, simple or
    enhanced (`appearance-store.ts:28`); gestures, the map and "my defaults" in one key,
    `keksdose-swipe-prefs` (`swipe-prefs-store.ts:105-123`, `:190`);
  - views: tables under `keksdose-table:` (`shared/i18n/kit-labels.tsx:115`); the sidebar
    on the kit's default key (`app/layout.tsx:117` passes no `collapseStorageKey`); saved
    page filters `keksdose.pageParams.*` and `keksdose.reportsView`
    (`shared/hooks/use-persisted-search-params.ts:4`, `:11`); folded budget groups,
    `budget.collapsedGroups`, read at mount (`features/budget/use-budget-prefs.ts:3`); the
    display currency per budget, `budget.displayCurrency.<id>`, a plain accessor
    (`shared/state/display-currency-store.ts:23-31`; the legacy global
    `budget.displayCurrency`, `:27`, is not under the prefix, and
    `clearLegacyDisplayCurrency` already removes it);
  - presentation mode (blurred figures), the last version shown and the what's-new switch,
    in one blob, `keksdose-ui-prefs` (`shared/state/ui-prefs-store.ts:25-70`);
  - usage: recent categories, tours done, a receipt's last answers per budget, the last
    page (`recent-categories-store.ts:47`, `tour-progress-store.ts:34`,
    `features/invoices/receipt-confirm-prefs.ts:82`, `shared/hooks/use-last-visited-page.ts:20`);
  - dismissed notices (`features/billing/billing-banner.tsx:16`,
    `app/beta-perf-banner.tsx:6`); the home position, `keksdose-home-position`
    (`shared/state/home-position-store.ts:92`);
  - sign-in: `keksdose-auth`, `auth_token`, `refresh_token`, `mirror_user_id`,
    `plausible_ignore` (`shared/state/auth-store.ts:17`, `:27`, `:146`);
  - waiting to be sent, in localStorage: crash reports, `keksdose.pendingCrashReports`
    (`shared/lib/crash-report.ts:87`), and a checkout, `keksdose-billing-checkout`
    (`features/billing/checkout-return.ts:40`);
  - IndexedDB, exactly three stores: the offline copy with its outbox, `keksdose-mirror`
    (`shared/offline/db.ts:106`); unlocked keys, `keksdose-keys`
    (`shared/crypto/key-store.ts:43`); the query cache, `keksdose-query-cache`
    (`shared/state/query-client.ts:67`). None holds view state;
  - developer overrides: `api_log` (`shared/api/client.ts:32`), `pending_key_file_persist`
    (`shared/crypto/pending-key-file.ts:68`) and, in development only, sessionStorage
    `keksdose.pending-key-file` (`:64`, `:119`).
- **kastlan:**
  - appearance: `kastlan-theme`, `-palette`, `-text-size`, `-contrast`
    (`shared/theme/storage-keys.ts:7-13`); the language, `kastlan-lang`, read when needed
    (`shared/i18n/language-storage.ts:11`, `:20-31`; the old `i18nextLng` moves over once,
    `:14`);
  - **the account's values, cached for the first paint and the start language**:
    `kastlan-account-lang` (`language-storage.ts:17`) and `kastlan-account-appearance`
    (`shared/theme/account-appearance.ts:10`), read at `main.tsx:25-26` and
    `shared/i18n/config.ts:19`;
  - views: tables on the kit's default prefix (`app/providers.tsx:55-59` passes none), the
    sidebar `kastlan.sidebarCollapsed` (`app/app-layout.tsx:117`);
  - usage: tours done (`features/tours/use-tours.tsx:19`), the last page
    (`features/landing/access.ts:19`);
  - sign-in `kastlan_rt`, a demo's `kastlan.demoSession` (`shared/api/client.ts:37`, `:41`);
    crash reports, `kastlan.pendingCrashReports` (`shared/feedback/crash-reporter.ts:21`);
    a checkout under the kit's `eifi1-billing-checkout`
    (`features/billing/components/subscription-section.tsx:20`); the demo banner's
    `kit.demoBanner.collapsed` (sessionStorage);
  - IndexedDB: the photo outbox, `kastlan-offline` (`shared/offline/db.ts:31`), and one
    handover copy per person and company, `kastlan-handover-<userId>-<companyId>`
    (`features/handover/offline/db.ts:79`). The old `kastlan-query-cache` is removed at
    every boot (`app/providers.tsx:32`).
- **Kurvenschmiede** keeps one list, `STORAGE`, with the privacy line of each key in
  `ENTRY_OF` (`shared/lib/storage-keys.ts:36-96`), and a test fails on a key outside it:
  - appearance: `steering-theme`, `steering-palette` (pinned to Default, `main.tsx:64`),
    `kurvenschmiede-text-size`, `-contrast`; the language, `kurvenschmiede-lang`, read
    when needed (`shared/i18n/index.ts:134-146`);
  - views: tables `steering-table:`, the sidebar `kurvenschmiede.sidebarCollapsed`, the
    curve plot's channels `steering-curve-channels` (`storage-keys.ts:53-58`), a persisted
    zustand store (`shared/state/curve-channels-store.ts`);
  - the last page, crash reports, a checkout, the tokens, the session store and the demo
    banner's `kit.demoBanner.collapsed`.

No app stores a density: §6.3's word names none.

### 11.2 Decisions

All settled (Marcel, 2026-10-13: "As recommended"; round decisions 10 and 11), with the
reviews' corrections:

1. **It clears how this device shows the app**, in two kinds:
   - **appearance**: the theme, the palette, this device's own language, text size and
     contrast, and the app's own appearance choices (keksdose's date format, feature set
     and gestures);
   - **views**: table views, the sidebar, folded groups, saved page filters, KS's curve
     channels, keksdose's display currency per budget.

   Each goes back to what a new device gets: the theme "System" (§2.8), the Default
   palette, and for the language, the text size and the contrast **the account's
   value**, because the device's own choice is what goes (§6.2; text-size §6). Without an
   account value: the browser's language, else the app's own default (kastlan de-CH);
   Normal; "system".
2. **It never clears** the sign-in and the session; the account's values cached for the
   first paint and the start language (kastlan's two `kastlan-account-*` keys); anything
   waiting to be sent or kept for offline use (crash reports, a checkout, the offline copy
   and its outbox, kastlan's handover copies, the query cache, unlocked keys); usage
   (recent categories, tours done, the last page, a receipt's last answers); dismissed
   notices; developer overrides (keksdose's `api_log`, `pending_key_file_persist`,
   `keksdose.pending-key-file`); and the demo banner (`sessionStorage`, gone with the
   tab). None of them is a setting: some are the account's, some would lose work, and the
   rest are answers someone gave once.
3. **The account is never written.** No PATCH: the account keeps its language, text size
   and contrast, and this device follows them again. A demo session and a lapsed plan
   reset the same way: nothing is written, so no write lock applies.
4. **The kit learns the keys from a registry** its own parts join and an app adds to
   (§11.4). The precedent is Kurvenschmiede's `STORAGE`: it is the one app that keeps such
   a list. keksdose's `forgetPreviousAccount` is a reset for a change of person, not of
   look, and stays as it is; where the two clear the same keys, the registry calls
   keksdose's own function (§11.5), so no sweep is written twice.
5. **Table views go too** (round decision 10). DataTable has no reset of its own, and a
   hidden column or a forgotten filter is the commonest "where did my rows go" a reset
   answers. A per-table "Reset view" is a separate item, not this round.
6. **keksdose's presentation mode and what's new stay, and `keksdose-ui-prefs` stays
   whole** (round decision 11). Presentation mode is a mask, not a look: a reset that
   unblurs figures during a shared screen is what #286 prevents, and it has its own
   switch. The last version shown back at `null` counts as a first run, which shows
   nothing (`ui-prefs-store.ts:37-38`), and the what's-new switch back on would bring back
   a notice someone turned off from inside it. Splitting the blob would need a
   `partialize` or a new key, for nothing.
7. **keksdose's home position stays** (round decision 11). It is data that is costly to
   get back, not a look: only standing at home and pressing "use where I am now" sets it
   (`home-position-store.ts:26-30`). On a shared device it is guarded by its owner check
   and its own clear button (`features/reports/price-shop-picker.tsx:449-456`).
8. **Where: the last card of the appearance group.** Most of what it clears is set there.
   Not "data": that group holds the account's data and the destructive cards (§3.7), and
   this is neither.
9. **A confirm, not an undo.** The kit's `useConfirm` (each app mounts a
   `ConfirmProvider`: kk `shared/i18n/kit-labels.tsx`, ka `app/providers.tsx`, KS
   `main.tsx`), in the neutral tone, then a toast. An undo would need every registered
   store to restore itself live, and a table reads its view only when it mounts. For a
   rare action that is cheap to repeat, a confirm that says what goes is enough.
10. **Live, no reload.** Everything held in memory is put back through its entry's
    `reset`, at once: the theme flips, the palette re-applies, the text size and the
    contrast re-resolve, the sidebar unfolds, the language switches. Removing the key of
    a live store is not enough: a persisted zustand store keeps its value in memory and
    writes it back on its next change (KS 3.1), so **every persisted store's entry carries
    a `reset`**. Only what is read where it is next used (a table at its next mount, a
    plain accessor) is removed without one. Other open tabs keep what they hold until
    they reload, as with every device setting today.

### 11.3 The words

A kit namespace of its own, `deviceReset` (`DeviceResetLabels`,
`DEFAULT_DEVICE_RESET_LABELS`), as each kit card has one (`dataExport`, `deleteAccount`,
`sessions`); English here, the seven languages with the build. An app may override any
(prop > `<UiKitProvider labels={{ deviceReset }}>` > English). Its own choices go in the
card's `description` prop, a sentence after the kit's (§11.4), not in an override.

| Key | English |
|---|---|
| `title` | Reset this device |
| `description` | Puts this device's appearance, and the way its tables and panels were left, back to the defaults. Your account, your data and your sign-in are not touched. |
| `action` | Reset this device's settings |
| `confirmTitle` | Reset this device's settings? |
| `confirmBody` | Theme, colours, text size, contrast and language go back to their defaults here, and tables and panels open as they first did. Where your account has a language, a text size or a contrast, this device follows it again. Your account and your other devices stay as they are. |
| `confirmAction` | Reset |
| `done` | This device's settings are back to their defaults. |
| `keywords` | reset defaults device restore appearance tables layout |

`title` and `keywords` are also what the app's catalogue entry takes (§11.4); the card
never reads `keywords`.

### 11.4 The registry and the card

**The registry**, `src/lib/device-settings.ts` (no React, no router), exported from the
main entry. It sits in `src/lib` beside `safe-storage.ts`, which the stores and the shell
already import, so `src/theme` and `src/shell` do not import `src/settings`. One module
instance (`bundle: false`), one module-level list.

```ts
/** What a reset of this device's settings clears (§11.2 decision 1). An app's own list
 *  may add a third kind of its own for what never goes (KS's "never"). */
export type DeviceSettingKind = "appearance" | "view";

export interface DeviceSetting {
  /** The storage key; with `prefix`, every key that starts with it. */
  key: string;
  /** `true`: `key` is a prefix (a table's views, keksdose's display currency per budget). */
  prefix?: boolean;
  /** Default `"local"`. */
  storage?: "local" | "session";
  kind: DeviceSettingKind;
  /**
   * Puts the live value back to its default through the store's own setter, the one its
   * control calls, so whatever that setter also does still happens. REQUIRED for
   * anything held in memory: every persisted zustand store, a mounted component's state.
   * With `reset` the key is left to it (a persisted store writes its default itself);
   * without, the key, or every key under the prefix, is removed.
   */
  reset?: () => void;
}

/** Joins the registry; answers the leave function. A store joins once, at creation, and
 *  never leaves; a component joins while mounted. */
export function registerDeviceSetting(entry: DeviceSetting): () => void;
/** Every entry, in join order: for an app's own test (KS's list) or its privacy page. */
export function deviceSettings(): readonly DeviceSetting[];
/** Resets every entry; answers the keys it reset or removed, prefixes expanded. */
export function resetDeviceSettings(): string[];
```

- **One entry per key** (and storage): joining a key again replaces its entry and adds a
  holder; a leave function drops its holder, and the entry goes with its last holder. A
  module evaluated twice (a test, a hot reload) does not reset twice; two nested
  providers with one prefix keep their entry until the outer one unmounts.
- **`resetDeviceSettings`**, synchronous: first every `reset`, in join order; then the
  keys of the entries without one. A `reset` that throws is caught (`console.error` in
  development), its key is removed instead, and the rest still run. It never reloads,
  navigates or sends a request.
- **Storage through the kit's guard** (`src/lib/safe-storage.ts`): `removeStored`,
  `writeSessionStored(key, null)`, and a new package-private `storedKeys(prefix, area)`
  that lists the keys under a prefix and answers `[]` where storage refuses. Where the
  browser refuses storage, the live values still reset and nothing throws.
- **A prefix matches by `startsWith`**: `budget.displayCurrency.` does not take the legacy
  `budget.displayCurrency`.

**The kit's parts join on their own** (kind; reset):
- `createThemeStore(key)`, at creation: appearance;
  `useTheme.getState().setPreference("system")`. `useApplyTheme` puts the class back.
- `createPaletteStore(key, useTheme)`, at creation: appearance;
  `usePalette.getState().setId(DEFAULT_PRESET.id)`. **State only, never `applyTokenSet`**
  (KS 3.3): an imperative write would remember a token set on `<html>`, and an app without
  a palette layer (KS) would then take the palette branch, where a theme switch no longer
  re-writes the stepped tokens. `useApplyPalette`, where an app mounts it, re-applies
  through its effect.
- `createTextSizeStore(key)`, `createContrastStore(key)`, at creation: appearance;
  `setSize(null)`, `setContrast(null)` (no choice on this device). `useApplyTextSize` and
  `useApplyContrast` re-resolve against the account's value they are given, else Normal
  and "system", and the contrast re-steps the tokens.
- `UiKitProvider`, while mounted: view, `prefix: true`, the prefix its tables use
  (`tableStorageKeyPrefix`, else the outer provider's, else `hbui-table:`,
  `DEFAULT_PERSIST_PREFIX`); no `reset`, since a table reads its view at mount. A table
  with a `storageKeyPrefix` prop of its own is the app's to register. *Built:* it joins a
  microtask after it mounts, through a literal `import()` of the registry, because every
  catalogue reaches `kit-labels` and a catalogue may reach nothing outside `i18n/`
  (`scripts/check-module-graph.mjs`); a test that reads `deviceSettings()` right after a
  render waits for it (`await waitFor(…)`).
- `AppShell`, while mounted and only with a collapse key: view; `setCollapsed(false)`,
  whose effect writes `"0"`. An embedded shell without a key stores nothing and joins
  nothing.
- **Not joined:** the demo banner (`kit.demoBanner.collapsed`), the last page, a
  checkout, crash reports, `store_log` (decision 2).

**What comes back when:**
- **At once**: the `.dark` class, the palette's inline tokens (where `useApplyPalette` is
  mounted), `data-text-size`, `data-contrast` with its stepped tokens, the sidebar, and
  each app entry with a `reset` (the language).
- **At the next mount**: table views and every entry without a `reset`. The card sits on
  the appearance group's page, which holds no stored table in any of the three apps, so
  nothing it removes is on screen.
- **At the next load**: the pre-paint calls (`applyPersistedTheme`,
  `applyPersistedPalette`, `applyPersistedTextSize`, `applyPersistedContrast`) read what
  the stores wrote and paint the defaults, with no step of their own.
- **Other open tabs** keep what they hold until they reload.

**The card**, `src/settings/device-reset-setting.tsx`, in the main entry beside
`SettingsSection`:

```ts
export const DEVICE_RESET_ANCHOR = "settings-device-reset";

export interface DeviceResetSettingProps
  extends Omit<SettingsSectionProps, "anchor" | "title" | "description" | "children"> {
  /** The app's sentence after the kit's description: what of its own goes back, and
   *  what stays (keksdose: the date format, the feature set and the gestures go;
   *  presentation mode and the home position stay). */
  description?: ReactNode;
  labels?: LabelOverride<DeviceResetLabels>;
  /** Runs after the reset and before the toast, with the keys reset or removed. */
  onReset?: (keys: string[]) => void;
}

export function DeviceResetSetting(props: DeviceResetSettingProps): JSX.Element;
```

- A `SettingsSection` with `DEVICE_RESET_ANCHOR`, `title`, and `description` (the kit's
  sentence, then the app's), holding one `Button variant="secondary"` (`action`).
- The button asks `useConfirm()` with `confirmTitle`, `confirmBody`, `confirmAction`, the
  neutral tone and **no `commit`**: nothing is written, so a demo or a locked write lock
  does not disable it (decision 3). Cancel changes nothing.
- Confirmed: `resetDeviceSettings()`, then `onReset?.(keys)`, then `toast.success(done)`.
  The card stays where it is; no reload.
- The app adds the catalogue entry, `{ id, group: "appearance", anchor: DEVICE_RESET_ANCHOR,
  title, keywords }` with the id in its own catalogue's style (`device_reset`, kastlan's
  `deviceReset`), last in its appearance group; `SettingsSection` throws in development
  without it.

### 11.5 Per app

Each app registers at module scope, beside the store or accessor it names, so the entries
exist before the card can be pressed. Module scope runs only once the module is imported:
a store that only a lazy page imports registers only after that page has loaded, and a
reset before then would leave its key. So the settings page imports such a module for its
side effect (Kurvenschmiede's `steering-curve-channels`), or the app registers every key
from one module the card imports (keksdose's `shared/state/device-settings.ts`); both
found adopting 0.36. A reset goes through the store's own setter, never
`setState(getInitialState())` where the setter does more than set: that skips the setter's
side effect (keksdose's `setPrivacyMode` → `applyDemoModeClass`, `ui-prefs-store.ts:59`,
would have left the blur on while the store said off).

- **keksdose:**
  - registers, as appearance: `keksdose-lang` (reset: the device-language store's
    setter with `null`, `account-language.tsx:58-68`, so `AccountLanguageProvider` adopts
    the account's language, else the browser's); `keksdose-date-format` (reset:
    `setPref` with the store's default); `keksdose-appearance` (reset: `setMode` with the
    store's default); `keksdose-swipe-prefs` (reset: `resetToShipped()`,
    `swipe-prefs-store.ts:187`, which clears the map and "my defaults" together);
  - registers, as views: `keksdose.pageParams.` (a prefix; reset:
    `clearPersistedPageParams`, which also clears `keksdose.reportsView`: the sweep
    `forgetPreviousAccount` already uses, not written twice); `budget.collapsedGroups`
    (no reset: read at mount); `budget.displayCurrency.` (a prefix, no reset: a plain
    accessor read at mount);
  - the kit covers the four appearance stores, `keksdose-table:` and the sidebar's
    default key;
  - leaves `keksdose-ui-prefs` whole, `keksdose-home-position`, usage, notices, the
    sign-in, crash reports, the checkout, the three IndexedDB stores and the developer
    overrides alone (decisions 2, 6, 7);
  - the card last in appearance, its catalogue entry, and a `description` in its four
    languages that names the date format, the feature set and the gestures, and says
    presentation mode and the home position stay.
- **kastlan:**
  - registers `kastlan-lang`, appearance, with a new `resetDeviceLanguage()` in
    `shared/i18n/switch-language.ts`: remove `kastlan-lang` (and a leftover
    `i18nextLng`), then `show(resolveLanguage([accountLanguage(), ...navigator.languages],
    OFFERED_LANGUAGES))`, the order of `shared/i18n/config.ts:18-21` without the device:
    the account's language, else the browser's, else de-CH, live, no reload. Not
    `applyAccountLanguage`: with no locale it returns at `:54` and leaves the old
    language on screen, and `rememberAccountLanguage(null)` would clear the account's
    cached language;
  - the kit covers the rest: the four stores, `hbui-table:`, `kastlan.sidebarCollapsed`;
  - the two `kastlan-account-*` keys, crash reports, the checkout, the photo outbox, the
    handover copies and the demo banner's key stay (decision 2);
  - the card and its entry.
- **Kurvenschmiede:**
  - registers `kurvenschmiede-lang`, appearance; reset: remove the key, then
    `changeLanguage(i18n, readerLanguage(user?.locale))` (`shared/i18n/index.ts:303`,
    `:183`), live, no reload. Not `followAccountLanguage` (`:325`): it changes nothing when the
    account has no language;
  - registers `steering-curve-channels`, view; reset:
    `useCurveChannels.setState({ flipped: [] })`. A persisted zustand store, so removing
    the key alone would be written back (KS 3.1);
  - the kit covers the rest; its palette stays pinned (`main.tsx:64`), and the palette's
    state-only reset changes nothing it shows;
  - `storage-keys.ts` gains `KIND_OF: Record<keyof typeof STORAGE, "appearance" | "view" |
    "never">` beside `ENTRY_OF`. `storage-keys.test.ts` renders the app's providers and
    shell (so the kit's parts join; the provider's a microtask later, §11.4), then holds
    `deviceSettings()` to exactly the keys
    `KIND_OF` marks appearance or view, kinds equal; its `SITES` (the calls that hand a key
    to storage) gains `registerDeviceSetting`;
  - the card and its entry.

### 11.6 Build

**ui-kit 0.36 (M):**
1. `src/lib/device-settings.ts`: `DeviceSettingKind`, `DeviceSetting`,
   `registerDeviceSetting`, `deviceSettings`, `resetDeviceSettings` (§11.4), exported from
   the main entry; `storedKeys(prefix, area)` package-private in `src/lib/safe-storage.ts`.
2. Joins, each with the kind and the `reset` of §11.4: `createThemeStore`,
   `createPaletteStore` (state only), `createTextSizeStore`, `createContrastStore` at
   creation; `UiKitProvider` (`src/i18n/kit-labels.tsx`) and `AppShell`
   (`src/shell/app-shell.tsx`) in an effect, left on unmount.
3. `src/settings/device-reset-setting.tsx`: `DeviceResetSetting`,
   `DeviceResetSettingProps`, `DEVICE_RESET_ANCHOR`; the `deviceReset` namespace
   (`DeviceResetLabels`, `DEFAULT_DEVICE_RESET_LABELS`, the `KitLabels` key) in English
   and the six locales (`src/i18n/locales/`), all exported from the main entry.
4. Tests:
   - the registry (`src/lib/__tests__/device-settings.test.ts`): a key is removed, a
     prefix removes every key under it and nothing else (the legacy
     `budget.displayCurrency` survives `budget.displayCurrency.`), `storage: "session"`
     removes from sessionStorage; an entry with `reset` keeps its key and runs once; every
     `reset` runs before any removal, in join order; a throwing `reset` is caught, its key
     removed, the rest still run; joining a key twice resets once; holders: the entry
     stays until its last leave; keys nobody registered (a sign-in's) survive; a storage
     that throws on access still runs every `reset`, throws nothing, and answers what it
     reset; the answer lists the keys reset and removed, prefixes expanded;
   - the kit's parts (`src/theme/__tests__/`, `src/shell/__tests__/app-shell.test.tsx`,
     `src/i18n/`): each joins with its key and kind; a reset puts each value back live
     (the `.dark` class follows the system, the palette id is Default and, with
     `useApplyPalette` mounted, its inline tokens are re-written, `data-text-size` and
     `data-contrast` re-resolve to the account's value passed in, the sidebar unfolds)
     and each persisted blob then holds the default the pre-paint call reads;
   - **without a palette layer** (`useApplyPalette` never mounted, as in KS): the palette
     reset writes nothing inline, `rememberedTokenSet(document.documentElement)` stays
     undefined, and a theme switch afterwards still re-writes the stepped tokens (KS 3.3);
   - `UiKitProvider`: its own prefix, an inherited one, the default `hbui-table:`; left on
     unmount; two nested providers with one prefix keep one entry until the outer goes.
     `AppShell`: joins with its key, an embedded shell without a key joins nothing;
   - the card (`src/settings/__tests__/device-reset-setting.test.tsx`): renders under
     `SettingsLayout` with its catalogue entry; cancel changes nothing; confirm runs the
     reset, then `onReset(keys)`, then the toast; the button and the confirm stay enabled
     under a locked `WriteLockProvider`; the app's `description` follows the kit's;
     `labels` override.
5. The showcase's Settings page gains the card; the README's settings lines and
   `ADOPTING.md` name the registry and the card.

**server-kit:** nothing; the reset never reaches the server.

**The apps** (their 0.36 adoption): §11.5.

### 11.7 Settled after the reviews (2026-10-13)

The three reviews (kk at `c90d068e`, ka at `f2b9574`, KS) and the round's decisions 10 and
11 are folded into §11.1–§11.6; the reviews are kept outside the repo. Where each went:
- **Table views go** (round decision 10) → §11.2, decision 5.
- **keksdose's presentation mode, what's new (the blob whole) and home position stay**
  (round decision 11; kk's reasons, and why `setState(getInitialState())` is wrong) →
  §11.2, decisions 6 and 7; §11.5.
- **keksdose already has a partial reset, `forgetPreviousAccount`** (kk) → §11.1;
  decision 4; the pageParams entry's `reset` is its `clearPersistedPageParams` → §11.5.
- **keksdose's keys**: crash reports and the checkout in localStorage, IndexedDB's three
  stores, the developer overrides named, the gestures one key, the legacy display
  currency, `keksdose-lang` never written by i18next, the `frontend/src/` paths (kk) →
  §11.1, decision 2.
- **kastlan's keys**: the handover copies and the photo outbox told apart, crash
  reports, the kit's checkout key, the demo banner, the query cache removed at boot; the
  account caches stay (ka) → §11.1, decision 2.
- **kastlan's language: account, then browser, then de-CH, without a reload** (ka Q5) →
  §11.5.
- **KS's key list holds**; the demo banner's key added (KS) → §11.1.
- **Every persisted zustand store's entry carries a `reset`** (KS 3.1) → §11.2,
  decision 10; §11.4; `steering-curve-channels` → §11.5.
- **KS's language: `changeLanguage(readerLanguage(…))`, not `followAccountLanguage`**
  (KS 3.2) → §11.5.
- **The palette's reset is state only; tested without a palette layer** (KS 3.3) →
  §11.4, §11.6.
- **`KIND_OF` beside `ENTRY_OF`, the test by render, `SITES` gains
  `registerDeviceSetting`** (KS 3.4) → §11.5.
- **Where, a confirm, live** (decisions 8–10, as recommended) → §11.2.

## 12. The role chip is the way into the role's tool (round 0.42)

**SUPERSEDED, 2026-10-17: moved to the admin round 0.43.** Marcel, after the reviews: the chip as the only way
in is "a bit too hidden", and the admin view as a whole is to be harmonized. Kept as the reviews' input until
that round's contract replaces it.

**DRAFT, 2026-10-17, for the three app reviews** (audits/round-042/reviews.md). Marcel,
in the keksdose session, relayed by keksdose-cb: "The admin section as in keksdose
clicking on the admin chip shall be used in the other apps as well. Forward to the ui kit
to harmonize. Kastlan has an additional sidebar entry, which is not intentional by now."
keksdose is the source. This amends §5's "Who sees it": the way in is the role chip, not a
menu row and not a sidebar entry.

### 12.1 Where each one stands (2026-10-17)

- **keksdose** (canon): the account menu's header (`TopBarActionMenu` `header.extra`,
  `frontend/src/app/account-menu.tsx:385-408`) carries the role chip
  (`<Chip href="/admin" onClick={close} variant="solid" size="sm" shape="square" caps
  icon={ShieldCheck}>`, "Admin"). A reviewer's chip links to `/translations` (icon
  `Languages`), and a member's chip is plain, not a link. The menu closes on the way. No
  sidebar entry. The page is §5's `SettingsLayout` (`features/admin/admin-page.tsx`).
- **kastlan**: a sidebar item `administration` → `/admin` for `ADMIN`
  (`app/nav.ts:149`), which Marcel says is not intended. Separately, a superuser-only
  `ShieldCheck` icon button → `/platform/companies` in the top bar
  (`top-bar.tsx:134-142`), kastlan's platform console.
- **Kurvenschmiede**: to be filled in by its review.

### 12.2 Decisions (DRAFT)

1. **The role chip in the account menu's header is the way into that role's tool**, in
   every app: an admin's chip → `/admin`, and any other role with a tool (keksdose's
   reviewer → `/translations`) → that tool. A role without a tool gets a plain chip, not
   a link. The menu closes on the way.
2. **No sidebar, bottom-bar or menu-row entry for the admin page.** kastlan drops
   `administration` from `app/nav.ts`. A link-only admin task (§5's import wizard) keeps
   its own entry in the app's admin nav group on a desktop, unchanged.
3. **The route's guard is unchanged**: the app's admin check, and the app's 403 page for
   anyone else (§5).
4. **The look is keksdose's**: `solid`, `sm`, `square`, `caps`, the role's icon. The tone
   is the role's own from the app's `RoleVocabulary`.

### 12.3 ui-kit 0.42

- **`RoleDefinition.href?: string`**: the role's tool. A vocabulary entry with it makes
  the chip a link.
- **`AccountRoleChip`**: `RoleChip` with §12.2.4's look as its defaults, made for
  `header.extra`. Usage: `extra: (close) => <AccountRoleChip value={me.role} roles={ROLES}
  onNavigate={close} />`. With an `href` it renders a link through the app's
  `renderLink`/router link, as `Chip` does, and calls `onNavigate` on click. Without one
  it renders a plain chip. No new labels: the role's words are the app's (§RoleChip).
- **Docs**: §5's "The account menu's 'Administration' entry" is reworded to point here;
  the showcase's account-menu example shows the chip as a link.

### 12.4 Per app

- **keksdose**: optional swap of its hand-built chip for `AccountRoleChip`, which gives
  the same look and behaviour.
- **kastlan**: drop `nav.ts:149`'s `administration` item and add the chip to the account
  menu header for the company role.
- **Kurvenschmiede**: add the chip, and drop any admin nav entry it has.

### 12.5 Questions for the reviews

1. **kastlan's platform console** (`/platform/companies`, superuser): should it move
   into the chip as well (a superuser's chip → the console)? Or should it stay a top-bar
   button, since a superuser is also a company admin and one chip can only link one
   place?
2. **kastlan's role is per company**: should the chip show the role in the active
   company and follow the `CompanySwitcher`?
3. **Kurvenschmiede's customer role**: is it a plain chip, or does it have a tool of its own?
4. Is a chip as the only way in discoverable enough on a phone? keksdose: does live use
   show anyone missing it?
