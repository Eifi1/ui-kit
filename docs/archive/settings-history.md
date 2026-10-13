# Settings — history

What [the settings contract](../settings-harmonization.md) moved out of its body in
ui-kit 0.34 (refactor audit DOC-1): its snapshot of the three apps, the per-app plans in
§4.2, §5, §6.1, §6.2 and §6.4, the per-repo to-dos, the order of the round and the
review list. Kept as written: "today", line numbers and each app's state are as of the
day each part was written, and an item may since have been folded into the contract,
which wins. Section numbers are the contract's.

## Status as written

Status: **2026-10-07, reviewed.** All three apps answered the same day; §10 records
what they settled, and the sections above already follow it. Led from ui-kit at Marcel's request: "The whole
settings layout shall be the next one to harmonize. With the sidebar inside like keksdose
has … also with differences in desktop and mobile appearance. Also ui and server, not
only appearance but also similar backend functionality." It ships in ui-kit **0.31** and
server-kit **0.5**, together with the landing and demo round
(`docs/landing-demo-harmonization.md`).

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Route | `/settings#group[/sub]`, `?focus=anchor` | `/profile`; company settings on `/users` (admin) | `/account` |
| Desktop | inner sidebar (kit vertical `Tabs`, 14rem, not sticky), one group shown | no navigation; 2-column card grid from lg | no navigation; 2 hand-assigned columns from lg |
| Phone | the sidebar becomes a wrapped chip strip above the content | one column of cards | one column of cards |
| Catalogue and search | `settings-index.ts`: groups + one entry per setting, localized keywords; the same catalogue feeds ⌘K | none | none |
| Groups | appearance, account, security, privacy, assistant, interaction, notifications, data | none | none |
| Profile | kit `ProfileSetting`, one name (first and last on its sign-in branch) | kit `ProfileSetting`, one name split on save | own card, first and last (the kit's on its 0.30 branch) |
| Password | kit | kit (+ strength, 72 bytes) | kit |
| 2FA | kit + "replace authenticator" | kit + backup codes (app) | none yet |
| Passkeys | kit | kit | kit |
| Sessions | none | app "sign out everywhere"; `/auth/sessions` unused | app "sign out everywhere" |
| Theme | the store knows "system"; the control offers light/dark only | kit `ThemeSetting` system/light/dark | top-bar toggle only |
| Language | kit `LanguageSetting`; device → account only | kit; device → account → browser | kit; device → account → browser |
| Notifications | full push, inbox, per type, quiet hours, digest, devices | two switches stored, **read by nothing** | none |
| Admin page | `/admin#section`, the **same** sidebar shell | `/users` (admin nav group with `/billing`, `/import`) | `/admin` stacks users, teams, invitations |
| PATCH and `null` | `PATCH /auth/me` on server-kit's `ProfileUpdate` (sign-in branch); the push bodies (PUT) drop or keep nulls | company settings: null skipped on required fields, clears elsewhere | server-kit `ProfileUpdate`: null refused (422) |

What is already the same: the kit's `PasswordSetting`, `PasskeysSetting` and
`LanguageSetting`, the theme kept on the device (`createThemeStore`),
`PATCH /auth/me {locale}` mirroring the UI language, and settings reached from the
top-bar account menu.

The kit has the vertical `Tabs` (which become keksdose's chip strip on a phone),
`PageContents` with scroll-spy (no app uses it for settings), `createSearchIndex` /
`matchEntries`, and the setting cards. It has **no** settings layout, catalogue type,
group selection, focus ring, phone drill-down or settings labels.

### 4.2 The groups — the plan per app, as written

| Group | Holds | kk | ka | KS |
|---|---|---|---|---|
| `appearance` | language, theme, palette, date format, density | language, theme (+ system), simple/enhanced, palette, date format | language, theme | language, theme (moves in from the top bar; the toggle stays there too) |
| `account` | profile, email change, the app's memberships | profile, email change | profile, email change, **companies** (leave) | profile (first and last name), email change, **pending shares** |
| `security` | password, 2FA, passkeys, sessions, API tokens | password (moves in from account), 2FA (+ replace), passkeys, sessions, API tokens | password, 2FA, backup codes, passkeys, sessions (with the device list) | password, passkeys, sessions; 2FA when it arrives |
| *app groups* | | privacy, assistant, interaction | — | — |
| `notifications` | the app's notification cards | inbox, push, checkup, devices (unchanged) | the two switches (until the notifications round, §6.4) | hidden |
| `data` | export, imports and exports of the app's data, then the destructive cards | price pool, exchange rates, export, demo data, erase all data, delete account | export, delete account | export, delete account |

- **Apps add groups between security and notifications**, in their own order.
- **Not in settings:** anything about the company (§5), keksdose's reporting currency
  (set in Reports) and display currency (per budget).
- Language stays in the top bar or account menu as well. That is the quick switch; the
  card is the place to find it.
- The email change, sessions, export and deletion cards arrive with each app's 0.30
  adoption.

## 5. The admin page, same shell (§2.5) — as written

- `/admin/<section>` uses the same `SettingsLayout` with its own catalogue: the sidebar
  on desktop, the drill-down list on a phone, `?focus=`. Search follows §3.4, and an app
  may switch it off. The heading is "Administration" ("Verwaltung").
- **Who sees it:** the app's admin check. The account menu's "Administration" entry
  shows only to an admin, and the route answers the app's 403 page to anyone else.
  keksdose adds both (today each card meets a 403 from the API).
- **The 0.30 `AdminActionLog` gets a section of its own, `activity`**, in every app that
  shows it (KS asked; it was going to sit under the roster).
- **Link-only entries are not catalogue entries.** A page that is a task rather than a
  setting (kastlan's import wizard) stays a page: a `phoneFooter` link row on a phone,
  and its own entry in the app's admin nav group on a desktop.
- **Per app:**
  - **keksdose:** its `/admin#section` (metrics, health, scheduler, users, access,
    messaging, system) moves to path segments, with `aliases` for retired ids
    (`overview` → `metrics`), `width="7xl"` and `search={false}`. Its heading is
    already an `h2`; only the look differs.
  - **kastlan:** `/admin/users` (the roster and invitations, today `/users`),
    `/admin/company` (document language, QR-bill account, today on `/users`),
    `/admin/billing` with `visible: billing_enabled` (hidden, so it acts as unknown,
    while billing is off; its routes answer 503 since 0.10.13), and `/admin/activity`.
    `/import` stays its own page. The nav's admin group holds "Administration" and
    "Import". `/users` and `/billing` redirect.
  - **KS:** `/admin/users`, `/admin/teams`, `/admin/invitations`, `/admin/activity`
    (today stacked on one page). `/teams` stays its own page as well, because team
    managers and members use it.
- The admin page is **company-scoped** in kastlan: it shows the active company and
  follows the `CompanySwitcher`.

### 6.1 One PATCH rule — as written

Every settings write body (`PATCH /auth/me`, kastlan's company settings, keksdose's
`PUT /push/settings` and `/push/preferences`, any later one) follows one rule. It is
about the body, not the verb: keksdose's push writes stay PUT in this round.

1. **An omitted field keeps its value.**
2. **An explicit `null` clears a nullable field** (back to "not set" or the default).
3. **An explicit `null` on a field that can't be empty is a 422**, never a silent skip.
4. **Unknown fields are a 422** (`extra="forbid"`), so a typo is not a silent no-op.
5. **The answer is the whole resource after the change**, so the client replaces its
   copy instead of merging.

server-kit 0.5 adds `apply_patch(obj, update, *, not_nullable=…)`, which applies a
pydantic model's `model_fields_set` under rules 1–3. server-kit's `ProfileUpdate` already
follows them. **What changes:**
- keksdose (`PATCH /auth/me` already follows the rule on its sign-in branch):
  - `/push/preferences`: `null` resets a type to its default (today it is dropped);
  - `/push/settings`: `digest_cadence: null` becomes a 422 (today it is silently kept);
  - both push bodies forbid unknown fields.
- kastlan: `null` on `default_language` or `default_account_country` becomes a 422
  instead of being skipped.

### 6.2 The language (§2.4) — as written

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
    `<app>-lang` only when the user picks a language. **Detecting the browser never
    writes it**: i18next's detector must not cache (`caches: []`). keksdose's does
    today, so its detection is indistinguishable from a pick; devices that already hold
    a value keep it.
  - **At sign-in**, the account's locale applies unless the device has its own choice.
    That is kastlan's and KS's rule today. **keksdose changes:** a new device now follows
    the account.
  - **Picking a language** writes the device's choice and `PATCH /auth/me {locale}`
    (all three already do).
  - **Nothing writes the account's locale on its own.** keksdose's
    `useSyncLanguageToAccount` (a PATCH on every session start) goes, or a new device
    would overwrite the account before adopting it. It was keksdose's only `de` →
    `de-CH` migration, so a one-off data migration through `canonical_locale` replaces
    it.
  - **A demo session never writes the account**: the pick stays on the device (a
    throwaway account needs no language, and model R refuses the write).
- The kit's `useAccountLanguage({account, device, setDevice, save, isDemo})` implements
  the order, the sign-in rule and the demo rule, so the three copies go.
- Mails and pushes use the account's locale; the server never guesses from the request.

### 6.4 Notifications (the notifications round) — as written

The notification shapes (types with defaults, quiet hours, the IANA timezone, digest
cadence, push devices) come with **the notifications round**, from keksdose's
`schemas/push.py`. Until then:
- keksdose's notifications group is unchanged, apart from the PATCH rule (§6.1).
- **kastlan's** `email_notifications` and `browser_notifications` switches stay, but the
  browser poller **respects** `browser_notifications` from this round on. Today it polls
  regardless, which the card's words contradict. `email_notifications` stays as it is:
  no mail reads it yet, and the notifications round decides what it gates.
- KS has no notifications group.

### 6.5 Endpoints — the note on kastlan's aliases, as written

kastlan's `/auth/user` aliases and its `PATCH /auth/me {current_password,
new_password}` may stay for one release while the client moves to
`/auth/me/password`.

## 8. Per repo

- **keksdose** (the most work: the reference's own pattern changes):
  - `settings-page.tsx` onto `SettingsLayout`; `settings-index.ts` stays key-based data,
    mapped to the catalogue shape at render (the help corpus builder keeps parsing it);
  - the phone chip strip becomes the drill-down;
  - `/settings#…` links to paths: the routes, the account menu (its `current` becomes a
    prefix match), ⌘K, 13 tour sites, the swipe card (`selectSub`), the help corpus (29
    links), its builder and `help_corpus_service`, then a corpus rebuild;
  - `ProtectedRoute` keeps the hash in `?next=`;
  - the admin page onto the same layout at `/admin/<section>`, with `aliases`, `width`,
    `search={false}`, `titleVisible={false}` on about 15 cards, a client admin guard and
    a 403 page;
  - the password card moves to security; the profile card is titled "Profile";
  - theme gains "system" (the store has it; the control binds the choice, not the
    resolved mode);
  - the language: `caches: []`, `useSyncLanguageToAccount` removed, a locale data
    migration, a new device follows the account;
  - the push bodies under §6.1;
  - `canonical_locale` from server-kit.
- **kastlan:**
  - `/profile` → `/settings/<group>`; its two-column grid becomes the groups of §4.2;
  - `/users` → `/admin/users`, the company settings to `/admin/company`, `/billing` →
    `/admin/billing` (`visible: billing_enabled`), `/admin/activity`; `/import` stays a
    page;
  - `useNotificationPoller(user?.browser_notifications ?? false)`;
  - the PATCH rule on `/company/settings`; `normalize_lang` → `canonical_locale` (the
    document language keeps its own list for documents and tenant mails);
  - the password on `/auth/me/password` at the 0.30 adoption; the PATCH alias stays one
    release.
- **Kurvenschmiede:**
  - `/account` → `/settings/<group>` with about twelve entries (§4.2);
  - `/admin` → `/admin/users|teams|invitations|activity` on the same layout; `/teams`
    stays;
  - the theme card joins appearance;
  - `LanguageIn` → `canonical_locale` with its seven codes; `extra="forbid"` confirmed on
    its `ProfileUpdate` subclass.

## 9. Order

The layout needs ui-kit 0.31; the PATCH rule and `canonical_locale` need server-kit 0.5.
Each app adopts after its 0.30 adoption: keksdose after its sign-in round and 0.30;
kastlan after its single 0.30 release; Kurvenschmiede after its 0.30 adoption, which is
in progress.

## 10. Settled after the reviews (2026-10-07) — as written

All three apps reviewed the draft (4a2940f) the same day. The sections above follow
what they settled; this is the list.

1. **The legacy hash is converted on every navigation**, not once on mount, and the
   whole query is carried (keksdose; §3.1).
2. **`aliases`**, **`selectSub`** through the layout's context, and **`focus` removed
   alone** (keksdose; §3.1, §3.5).
3. **`width`** and **`search`** props; an explicit `search` wins over the count
   (keksdose; §3.2, §3.4). The threshold of 8 stands (KS, keksdose).
4. **`titleVisible={false}`** for a card alone in a section named after it (keksdose;
   §3.7).
5. **`visible` per entry**; a demo hides its refused cards, and a group left empty
   disappears (keksdose, KS; §4.1).
6. **The admin page:** an `activity` section for the 0.30 log (KS); kastlan's billing as
   a hidden-while-off section and its import as a page; no link-only catalogue entries
   (§5).
7. **The PATCH rule is about bodies**; keksdose's push writes stay PUT and gain the
   null and unknown-field rules (keksdose; §6.1).
8. **The language:** detection never writes the device's choice; nothing writes the
   account's locale on its own; a demo never writes it (keksdose, KS; §6.2).
9. **Device-local settings keep their keys** (no renaming rule); the date format stays
   on the device (keksdose; §6.3).
10. kastlan's poller follows `browser_notifications` with a one-line change (§6.4).
