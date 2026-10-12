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
| `appearance` | language, theme, text size and contrast (text-size §6), palette, date format, density |
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
- There is no "reset this device's settings".

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
