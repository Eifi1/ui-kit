# Notifications — harmonisation plan

The round that settings §6.4 defers to ("the notifications round", server-kit README
`mail`: "Not yet: `List-Unsubscribe` and the rest a notification needs"). Led from ui-kit
for round 0.36 at Marcel's request (2026-10-13: "The select hints and the queued rounds.
All of them."). It builds on the settings contract (`docs/settings-harmonization.md`: the
PATCH rule §6.1, the language §6.2, the endpoint names §6.5), user-admin §6.4–§6.5 (a
deactivated account is sent nothing; the export), billing §14.7 (the notices and their
marker) and auth §7 (signed-out pages).

The shapes are keksdose's (`backend/keksdose/domain/schemas/push.py`), which is canon for
everything it already ships: types with defaults, quiet hours, the IANA zone, the digest
cadence, push devices, the inbox. What it lacks is e-mail, which kastlan stores a switch
for and nothing reads. **kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede.

## Status

**Settled 2026-10-13, building in ui-kit 0.36 / server-kit 0.9.** The three apps
reviewed the draft on 2026-10-13; Marcel took its open decisions and the questions the
reviews raised the same day ("As recommended"). Everything is folded into the sections
below, and §8 says where each review point went. The build works from §4; each app's
steps are §5.

## 1. Where each one stands

Read at kk `79b2949c` (`feat/kit-0.34`), ka `f2b9574` (`feat/kit-0.35`), KS `c687637`
(`refactor/plan-2026-10`), and checked by the reviews: kk at `c90d068e` (nothing under
`backend/keksdose/` changed in between), ka at `f2b9574`, KS at `c687637`. The cites
below are as the reviews corrected them. kk paths are under `backend/keksdose/` and
`frontend/src/`, ka's under `kastlan/` and `frontend/src/`, KS's under
`backend/kurvenschmiede/` and `frontend/src/`.

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Types | 9, each with a missing-row default (`domain/models/push_subscription.py:30-56`) | none; the poller derives two cards | none |
| Switches | one per type, gating push **and** inbox together (`push_notifications.py:31-35`) | two on `users`: `email_notifications` (default on), `browser_notifications` (default off) (`domain/models/auth.py:72-73`) | none |
| Channels | Web Push + an in-app inbox; no notification mail | a browser poller while a tab is open, staff only; no push, no inbox | none |
| Quiet hours | push only, background types only; a half-set window fails open (`notification_preferences_service.py:154-181`) | none | none |
| Zone | IANA, on the notification settings row; null or a name that no longer resolves → UTC (`push_subscription.py:187-188`; `notification_preferences_service.py:169-174`) | none; notices written in `Europe/Zurich` (`domain/services/billing_notices.py:36`) | none, by Marcel's decision of 2026-10-12; notices in `Europe/Zurich` (`domain/services/billing_notice_service.py:20-24`, `:394`) |
| Digest | a type; `weekly` (Monday) or `monthly` (the 1st) in the user's zone, from a daily 06:00 UTC job (`infrastructure/scheduler.py:409`), no marker, tag `digest:<local date>` (`push_notifications.py:1094-1119`) | none | none |
| E-mail | 8 sends, all account or billing mail | 7 kinds, all account or billing; plain text, no extra headers (`infrastructure/email.py:52`) | 10 kinds (`MailKind`), all account or billing (`infrastructure/email.py:92`) |
| Endpoints | `/push/*`, PUT under §6.1 (`adapters/api/push_router.py`) | the switches through `PATCH /auth/me`; `GET /notifications/poll` | — |
| Settings | inbox, types + quiet hours, check-up, devices (`features/auth/settings-index.ts:168-174`) | one card, two switches (`features/settings/pages/settings-page.tsx:290-350`) | no notifications group (`features/settings/settings-page.tsx:36`) |

**keksdose:**
- **Types and defaults:** `NOTIFICATION_TYPE_DEFAULTS` (`push_subscription.py:30-56`): the
  two launch types on, every later type off ("a new trigger never surprises an existing
  user"), except `support_chat` and `scheduled_due`, which fire only in answer to what the
  person did. The client repeats the list (`features/auth/notifications-card.tsx:53`,
  `PREF_DEFAULTS`); the model's docstring still says "MISSING ROW = ENABLED"
  (`push_subscription.py:93`).
- **Delivery** (`push_notifications.py:366-407`): the type switch decides whether anything
  happens; then an inbox row; then push, unless quiet hours hold it. Quiet hours hold the
  machine-sent types (`respect_quiet_hours=True` at :488, :544, :642, :670, :921, :1067,
  :1118) and never the ones a person sends (share events :435; announcements pass none,
  :1175-1178 and :1210-1213, and the default is `False`, :375; support chat :1265). A held
  push is dropped; the inbox keeps the row. The author of a support message is never
  notified (:1224-1274). A deadline on a guest's budget (its owner asked to delete their
  account) is a **push and an inbox row** of type `share_events` that skips that type's
  switch (:752-786, called from `account_deletion_service.py:267`); it is not mail. The
  owner's own deletion notice is the mail (`account_deletion_service.py:279`).
- **Push** (`domain/services/push_service.py`): VAPID keys per deployment, unset = push off
  (:53-59; `infrastructure/settings.py:245-247`). The subject's default is
  `mailto:admin@…` (`settings.py:247`); production sets it in `deploy/gcp/cloudbuild.yaml:205`
  (`_VAPID_SUBJECT`) and passes it to the API and every job (:438, :505, :548, :904,
  :949); `backend/.env.example:139` documents it. One row per endpoint; another account's
  endpoint is a 409 and the client mints a fresh one (:74-153;
  `shared/push/use-push.ts:166-181`). TTL 24 h and a 10 s timeout, both explicit
  (:212-228). A 404/410 deletes the row; other failures count, and the daily job reaps a
  row at 10 in a row (:180-206, :252-262). A deactivated account gets nothing (:293-309).
  No `pushsubscriptionchange` handler in `sw.ts`.
- **The service worker** (`sw.ts:220-336`): payload `{title, body, tag, data: {url}}`; no
  OS notification while a window is focused (:252-254); a click focuses a window and
  routes it to `data.url`.
- **Inbox:** `notification_log`, 90 days (`notification_log_service.py:27`),
  `GET/POST/DELETE /push/inbox*`.
- **Zone:** the card fills the device's zone at the first quiet-hours entry
  (`notifications-card.tsx:288-292`); the picker lists every zone `Intl` knows, city under
  region, and keeps a stored zone the runtime doesn't list (:131, :530). The picker can't
  be cleared. For a null zone the card shows the device's zone (:299) while the server
  applies UTC, and a stored name that no longer resolves is UTC too
  (`notification_preferences_service.py:169-174`, `push_notifications.py:1097-1102`), though
  the docstring says "push now" (:159). The PUT checks a zone, so only a name tzdata
  later drops gets there.
- **The cards' couplings** (frontend, under `frontend/src/`): the inbox types its icon map
  on the card's `PrefKey` (`features/auth/notification-inbox.tsx:25`, :42, :137); the
  check-up card shares `usePush` and listens for the `PUSH_SUBSCRIPTION_CHANGED` window
  event (`push-checkup-card.tsx:18`, :174), which `use-push.ts` (:184, :205) and the devices
  card (`push-devices-card.tsx:96`) fire; the tours and the settings search target
  `#settings-notifications-card`, `#settings-devices-card` and
  `#settings-push-checkup-card` (`features/tour/feature-tours.tsx:466-500`;
  `settings-index.ts:168-174`); the types come in three groups whose headings are
  keksdose's words (`PREF_GROUPS`, `notifications-card.tsx:70-79`, drawn at :433-437).
- **Updates:** the PWA updates on a prompt (`frontend/vite.config.ts:171`,
  `registerType: "prompt"`), so an installed app keeps its old bundle until the person
  accepts the update.
- **Export:** `data.notifications = {settings, preferences, inbox, push_registrations}`,
  never an endpoint (`domain/services/account_export_service.py:234-274`).
- **Demo:** push registration and the test refused (`push_router.py:57`, :223); the two
  PUTs are not (:142, :172), and every notification card but the inbox is hidden
  (`settings-index.ts:236`).

**kastlan:**
- **The switches** are columns on `users` (migration `beab6d6e7c9b`), in `GET /auth/me`
  (`domain/schemas/auth.py:70-71`), the admin's `UserResponse` (:192-193) and
  `ProfileSettings` (:382-396, not nullable), written by `PATCH /auth/me`
  (`domain/services/user_service.py:330-359`), exported as
  `notifications: {email, browser}` (`domain/services/account_service.py:257`).
- **`browser_notifications`** starts a poller (`app/app-layout.tsx:59-61`;
  `shared/hooks/use-notifications.ts:47-84`): every 30 s while a tab is open,
  `GET /notifications/poll`, staff only (`adapters/api/notification_router.py:12-23`).
  The client sends `since` (`use-notifications.ts:61`); the route takes it (:17) and drops
  it (:22). The service derives two company-wide counts with no time filter, in English
  (`domain/services/notification_service.py:33-34`, :44-45), and the client sets no `tag`
  (`use-notifications.ts:64`). So the same two cards come back every 30 s while a count is
  above zero. A tenant sees the switch too (the catalogue gates it on the demo only,
  `features/settings/settings-catalogue.tsx:83`), and its poll is a 403 every 30 s,
  swallowed (`use-notifications.ts:75-77`).
- **`email_notifications`** gates nothing: no mail reads it. A code comment says so
  (`settings-page.tsx:290-291`); the card itself says only "Email Notifications". The
  billing notices go to the company's admins without it (`billing_notices.py:74-78`),
  rightly: they are service mail (§2.8).
- **Roles are per company** (`infrastructure/dependencies.py:369`): staff in one company
  may be a tenant in another.
- **No timezone** anywhere (`users`, `ManagementCompany`); no inbox; no push: the PWA
  plugin generates the service worker, which only caches (`frontend/vite.config.ts:28-67`),
  so push needs `injectManifest` and a worker of kastlan's own that redoes the offline
  caching.
- **The daily jobs** send nothing but the billing notices (`infrastructure/jobs.py:104-110`).
  `invoices-overdue` is one bulk UPDATE across companies
  (`domain/services/invoice_service.py:46-59`), and runs at every start too (`jobs.py:113`,
  idempotent).
- **Mail:** two transports, Resend's JSON (`infrastructure/email.py:81-87`) and SMTP's
  `EmailMessage` (:102-108); no `render_mail`, plain text only.
- Languages: de-CH, en, fr, it.

**Kurvenschmiede:**
- **Nothing yet**, and no group in its catalogue. Three events reach nobody today: work
  shared with a team (`domain/services/share_service.py:128`, `grant_team`) or with an
  existing account (:159, `grant`); an existing account added to a team
  (`team_service.py:338-348`, an audit row only); and an answer to a feedback report (no
  read state, no send; `domain/models/feedback.py:97-117`). A fourth is silent too: an
  admin's transfer of a person's work to another (`admin_service.py:435`).
- **A report's answer has two writers**, and both go through `feedback_service.save`
  (:381): the admin's PATCH (`update`, :322-368) and the loop's
  `npm run feedback -- --resolve` (`feedback_loop.py:176-222`). The loop runs against
  whatever database is configured, the deployed one included, with the mail backend of
  the machine it runs on.
- **Sealed content:** KS seals report titles, bodies and outcomes; team names are
  plaintext.
- **Verified addresses:** migration 0040 left `email_verified_at` null for every existing
  account (`backend/alembic/versions/0040_email_verification.py:7-10`).
- Mail goes through one `send(to, message, kind: MailKind)` that skips demo addresses
  (`infrastructure/email.py:182-189`); `MailKind` is ten kinds (:92).
- No service worker, no web manifest. Seven languages (`domain/languages.py:35`).

## 2. Decisions

**Decided (Marcel, 2026-10-13: "As recommended").** Each recommendation of the draft is
the rule below, with the reviews' corrections; Marcel's own calls on the open ones are
named where they fall. Settings §6.1 (the PATCH rule) and user-admin §6.4 (a deactivated
account is sent nothing) hold as they are.

1. **Types: each app declares its own; the kit has no list of types.** A type is an id
   (`^[a-z][a-z0-9_]{1,39}$`, it fits keksdose's `String(40)`), a default per channel it
   offers (§2.3), and whether quiet hours hold it. The server's registry is the one list:
   `GET` answers every type the account can receive, and the card draws what it answers,
   so the client keeps no defaults (keksdose's `PREF_DEFAULTS` goes). **The default rule
   is keksdose's:** off, unless the type can only fire in answer to something the person
   did (a reply to their message, a row they dated forward, an answer to their report);
   keksdose's two launch types stay on as shipped. So KS's `feedback_answered` is on and
   its `share_granted` and `team_added` are off (§5.3). A type's words move into the kit
   only when a second app declares the same type (the `DateFormatSetting` rule, settings
   §7.1). Today no two apps share one; KS's `feedback_answered` would be the first
   candidate. KS's admin transfer of work is not a type this round (Marcel; §7).
2. **Channels: three — inbox, push, e-mail. An app offers the ones it has.** Inbox and
   push are one channel to the person, **"in the app"** (`app`): the inbox is the record
   and push is how it reaches a device. That is keksdose's "consent governs push and
   inbox alike". Push has no account switch: **registering a device is the switch**.
   E-mail is the second channel. kastlan's browser poller is its `app` channel until it
   has push (decision 11), then it goes; KS has e-mail alone (no push, no worker, no
   manifest).
3. **Switches: two per type, `app` and `email`, no channel matrix** (Marcel). A type row
   has its switch and, where the type offers e-mail, "By e-mail" under it; where the app
   has no `app` channel (KS), the e-mail switch is the row's switch. Each has its own
   default. Push and inbox are not split: nobody has asked for an inbox row without the
   push. E-mail is split because it is the costly channel, and one click in a mail must
   turn off that mail and nothing else (§3.6). A matrix per device or per push type is
   left for later (§7).
4. **Quiet hours hold push only, and a held push is dropped, not delayed.** keksdose's
   rule: a window of local `HH:MM` times in the account's zone, which may cross midnight.
   Within it, the push of a type marked `quiet` is not sent; the inbox row is written and
   e-mail goes as usual. Machine-sent types are `quiet`; person-sent ones (a share, a
   support reply, an announcement) are not. **Announcements ignore quiet hours**
   (Marcel): an admin picks the moment, and since a held push is dropped, holding one
   would lose it for everyone inside the window. The window **fails open**: half set or
   start = end means no quiet hours. **A zone that no longer resolves counts as unset**,
   so the app's zone applies (decision 6, §3.4); keksdose's fallback to UTC goes. The
   test push ignores quiet hours. Delaying to the window's end needs a queue (§7).
5. **The digest is a type with one cadence for the account.** `weekly` (Monday) or
   `monthly` (the 1st) in the account's zone, default `weekly`, not nullable (keksdose).
   New: a **period marker** like billing's (`billing_notice_sent`, billing §14.7). The
   digest is due from the period's first local day until 3 days after it, and is sent
   once a period, so a missed run doesn't skip it (a Tuesday digest after a missed Monday
   is right: its content is the view as of the send day), and a doubled run doesn't
   repeat it. **The marker is set when the digest's inbox row is written**, not when a push
   succeeds: quiet hours drop the push and keep the row, and a marker on the push would
   write a new row every day for three days. **Its tag is the period key**
   (`digest:2026-W42`), so a late copy replaces the earlier OS notification. Only
   keksdose has a digest.
6. **The zone lives with the notification settings, not on the account** (Marcel).
   `timezone`, an IANA name, nullable. It is only for what the server does with no device
   asked: quiet hours and the digest day. **Null means the app's zone, `Europe/Zurich` in
   all three**, as both notice zones already are; keksdose's null is UTC today, and the
   change moves only rows with a null zone and quiet hours set (their window, 1–2 h
   earlier in UTC; the digest day doesn't move, since the 06:00 UTC run is the same date
   in Zurich). It also ends keksdose's mismatch of a card that shows the device's zone
   for a null while the server applies UTC. It is written by a person's pick, or at the
   first quiet-hours entry from the device's zone (keksdose). **Never on a session
   start**, the rule of settings §6.2. No device reads it to show a date. It stays off
   `/auth/me` and the account: Marcel decided on 2026-10-12 that an account keeps no zone
   (KS), and nothing else needs one (KS's mails print no date). The card says when this
   device is in another zone, and offers it (§4.2).
7. **Push devices: keksdose's rules, VAPID keys per app.** Register (an upsert by endpoint
   for the same account, a 409 for another's), list, remove by id, unregister by endpoint
   in a body. **The endpoint never goes in a URL**: it is a capability. TTL 24 h, timeout
   10 s. A 404/410 deletes the row at once; other failures count, and 10 in a row reaps
   the row. Each app has its own keypair (`<APP>_VAPID_PUBLIC_KEY`, `_PRIVATE_KEY`).
   **`_SUBJECT` is `mailto:` the app's support address**, not keksdose's `admin@`: its
   default comes from the app's reply-to (keksdose's `reply_to_address()`, which is
   server-kit `support_address`), and the deployment's own setting changes with it
   (keksdose's `cloudbuild.yaml:205`). A new subject leaves existing subscriptions
   working.
8. **Notification mail carries one-click unsubscribe; service notices carry none.**
   - A mail sent for a notification type carries RFC 8058's `List-Unsubscribe` and
     `List-Unsubscribe-Post` and a footer link (§3.6).
   - **The unsubscribe token is signed, not stored, and never expires; its key is derived
     from the app's existing signing secret** (Marcel). It can only turn e-mail off, so a
     copy in a request log costs little.
   - **It goes only to a verified address.** Where the address is not verified, the
     e-mail switches say "Confirm your address to receive these." (Marcel). KS's
     migration left every existing account unverified, so that line is what most of its
     people see first; kastlan's card says it too while an address is unverified.
   - **It never carries sealed content** (Marcel): no title, body or outcome. It names who
     did it, the kind of thing (a project, a gear, a report), the group's name, a count
     where there is one, and the link (§3.6). KS seals that content; mail is plaintext.
   - **Service notices are not notifications:** account mail, billing's notices (§14.7)
     and keksdose's deadline on a guest's budget, which goes on the app channel (a push
     and an inbox row) whatever the type's switch says. They have no switch and no
     unsubscribe, as today.
9. **Endpoints: `/notifications/*` in every app** (§3.8). One resource,
   `GET/PATCH /notifications/settings`, replaces keksdose's two PUTs (§6.1 is about
   bodies; a new endpoint takes PATCH); `/push/preferences` would read wrong once e-mail
   is in it. **keksdose's `/push/*` stays as aliases** (Marcel): the paths are renamed, not
   moved under a prefix, so the two GET/PUT pairs go through a **body shim** that turns
   the old bodies into the new resource and answers the old shape; the aliases are
   mounted with `include_in_schema=False`, so the OpenAPI schema lists each route once;
   and they are **dropped when the `http.route` metric shows no `/push/*` hits**, not
   after one release: the PWA updates on a prompt, so an installed app keeps its old
   bundle until the person accepts (§5.1).
10. **Nothing in `/auth/me`; the export holds the settings, the inbox and the devices**
    (§3.9). kastlan's two fields leave `/auth/me`, `PATCH /auth/me` and its admin row.
11. **ui-kit lifts keksdose's notification cards now; the inbox list waits** (Marcel).
    ui-kit takes the types card, quiet hours with the zone picker, "this device" with its
    hook, and the device list, with the four couplings keksdose's review found: a home
    for the inbox's type ids, the `PUSH_SUBSCRIPTION_CHANGED` event, keksdose's anchor
    ids, and group headings in the app's words (§4.2). The inbox list and bell stay
    keksdose's until a second app keeps an inbox (§7). **kastlan's push comes later, as a
    step of its own** (Marcel): its service worker is generated, so push needs a worker
    of kastlan's own that redoes the offline caching, which is more than wiring the
    kit's parts. Meanwhile kastlan fixes its poller (§5.2).

## 3. The shapes

### 3.1 A type

```python
@dataclass(frozen=True, slots=True)
class NotificationType:
    id: str                    # "support_chat"
    app: bool | None           # None: the app has no "in the app" channel (KS); else its default
    email: bool | None = None  # None: offers no e-mail; else the e-mail default
    quiet: bool = True         # quiet hours hold its push (§2.4); False for person-sent
```

An app builds its registry once (`NotificationTypes(...)`, which refuses a bad or doubled
id and a type with neither channel) and may narrow it per account. kastlan's two types are
received by an account that is staff in any of its companies (roles are per company), and
at delivery the role is checked again in the event's company; a tenant receives neither,
and a `PATCH` naming one is a 422. The card's words, groups and order are the app's
catalogue (§4.2).

### 3.2 The settings resource

`GET /notifications/settings`:

```json
{
  "types": {
    "recurring_posted": {"app": true,  "email": null},
    "share_events":     {"app": false, "email": null}
  },
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "timezone": "Europe/Zurich",
  "digest_cadence": "weekly"
}
```

- `types` in every app: every type the account can receive, in the registry's order.
  `email` is `null` where the type offers none, and `app` is `null` in an app with no
  `app` channel (KS: `{"feedback_answered": {"app": null, "email": true}}`). An unset
  switch reads as its default.
- `quiet_hours_start`, `quiet_hours_end` (`^([01]\d|2[0-3]):[0-5]\d$`) and `timezone`
  where the app has push; `digest_cadence` where it has a digest type. An app adds its own
  knobs beside them (keksdose's `low_balance_threshold`).

`PATCH /notifications/settings` under settings §6.1:

```json
{"types": {"digest": {"app": true}, "support_chat": {"app": null}, "scan_done": null},
 "digest_cadence": "monthly"}
```

1. **Omitted keeps:** a type left out of `types`, a switch left out of a type, a field
   left out.
2. **Null resets:** a type's `null` puts both its switches back to their defaults; a
   switch's `null`, that one (keksdose's `defaults=`, §6.1); `quiet_hours_*` and
   `timezone` `null` clear.
3. **Null refused (422 `not_nullable`):** `types` itself, `digest_cadence`.
4. **422:** an unknown field, an unknown type id or one this account doesn't receive
   (`code: "notification_type_not_received"`), `app` or `email` on a type that doesn't
   offer it, a zone `zoneinfo` doesn't know.
5. **The answer is the whole resource**, as `GET`.

A demo account is refused (403), as every notification card but the inbox is hidden for
it (settings §4.1). In keksdose that refusal is new: its two PUTs serve a demo today
(§5.1). The storage is the app's. keksdose's rows (one per touched type) fit: an unset
switch is a missing row or a null column.

### 3.3 Delivery

For one recipient of one type, in this order:

1. **Nobody inactive, nobody who acted:** a deactivated account (a deletion request
   deactivates at once, user-admin §2.1), a demo, the event's own author or actor
   (keksdose's live #342; KS: an admin who answers their own report, a granter in their
   own team): nothing. The writer passes the actor, so this holds for every writer (KS's
   loop passes its first admin, §5.3).
2. **`app` on:** an inbox row where the app keeps an inbox, then a push to each device,
   unless the type is `quiet` and the account is inside its quiet hours (§2.4).
3. **`email` on, and the address verified:** the mail (§3.6). Unverified: no mail, and
   the card says so (§2.8).
4. Both off: nothing, not even an inbox row.

**An event for a group** (KS's grant to a team) is one delivery per member, minus the
actor, each under the member's own switches. The words are in the recipient's locale
(settings §6.2), written by the server; an admin's announcement goes as written. A mail
never carries sealed content (§3.6). The test push skips 2's switches and quiet hours.
**Service notices** (§2.8) skip the type's switch and keep 1: keksdose's deadline on a
guest's budget is a push and an inbox row whatever `share_events` says.

### 3.4 Quiet hours, the zone, the digest

- `in_quiet_hours(start, end, zone, now)`: §2.4, failing open on a half-set window or
  start = end.
- **The zone:** `timezone` or the app's fallback (`Europe/Zurich`); a stored name that no
  longer resolves counts as unset, so it is the fallback too, never UTC and never "no
  quiet hours". All three images are `python:3.14-slim`, and kastlan and KS build
  `ZoneInfo("Europe/Zurich")` at import, so the zone database is there.
- **The digest** (§2.5): the period key is the ISO week (`2026-W42`, the ISO year) or the
  month (`2026-10`) of the local date. It is due while `sent` is not this key and the
  local date is no more than 3 days into the period. The app stores the key (`digest_sent
  VARCHAR(16)` on its settings row, as billing's marker) **in the transaction that writes
  the digest's inbox row**, whether or not quiet hours let the push go; an app with no
  inbox stores it when the mail is handed to the mailer. The push's tag is
  `digest:<period key>`.

### 3.5 Push devices and the payload

- `POST /notifications/devices` `{endpoint, keys: {p256dh, auth}, user_agent?}` → 204;
  **409 `push_endpoint_taken`** for another account's endpoint (the client unsubscribes
  and registers a fresh one); 403 for a demo.
- `GET /notifications/devices` → `[{id, endpoint, user_agent, created_at,
  last_success_at, failure_count}]`, oldest first. The owner gets the whole endpoint, to
  mark "this device".
- `DELETE /notifications/devices/{id}`; `POST /notifications/devices/unregister
  {endpoint}` (silent when there is none).
- `GET /notifications/push-key` → `{key}`, public, `""` when push is off.
  `POST /notifications/test` → `{sent}`; 503 when push is off.
- **The payload:** `{title, body, tag, data: {url, type}}`. `type` is new, so the page
  can refresh its inbox and pick an icon; every payload carries it, the test pushes and
  an admin's included (`"test"` for a test). It sits one level under the service
  worker's own message type (keksdose nests the payload as `{type: "PUSH_RECEIVED", data}`),
  so nothing collides. `url` is a path in the app (`/…`, never `//` or a scheme), opened
  by the service worker on the app's origin. A `tag` per event: a repeat of the same
  event replaces it (`digest:2026-W42`), and distinct events don't (`support:<uuid>`).
  The encoded payload stays under 3 KB (Web Push allows about 4 KB); the body is cut
  with "…" to fit.
- The service worker shows nothing while a window of the app is focused (keksdose
  `sw.ts:252-254`); the app's own worker, not the kit's.

### 3.6 Notification mail and one-click unsubscribe

**The headers** (RFC 8058), on every notification mail and no other:

```
List-Unsubscribe: <https://<app>/api/v1/notifications/unsubscribe/<token>>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Through Resend they are the request's `headers` object; over SMTP (kastlan) two headers on
the message. Nothing in either transport is in the way (kastlan `email.py:81-87`,
:102-108).

**The token:**

```
v1.<data>.<mac>
data = base64url("<user_id>:<type id>")                       # no padding
mac  = base64url(HMAC-SHA256(key, "v1." + data))
key  = HMAC-SHA256(<the app's signing secret>, "eifi1-notifications-unsubscribe")
```

- **Signed, not stored, and it never expires:** the link in a year-old mail still
  works. It is not a one-time token (server-kit `auth.OneTimeTokenKind`).
- **Derived from the secret each app already signs with**, so nothing new is provisioned.
  Rotating that secret ends old links; the page then says to use Settings. `v1` leaves
  room for another key.
- It names one account and one type, and can do one thing: turn that e-mail off.

**The route** answers no account, needs no cookie and is rate-limited like the other
public routes. It must answer a mail provider's POST on a cold start, with no page that
woke the server first:
- `POST /notifications/unsubscribe/{token}`: that type's `email` off. This is what a mail
  client's one-click POST sends (`List-Unsubscribe=One-Click` as a form body, which the
  route doesn't read).
- `POST /notifications/unsubscribe/{token}/all`: every e-mail switch off (the page's
  second button).
- A valid token answers **200**, also when the switch is already off or the account is
  gone, so the answer reveals nothing. A bad token answers **400
  `unsubscribe_invalid`**. **A GET never unsubscribes:** link scanners fetch every URL.

**The page:** the footer link goes to the app's signed-out page `/unsubscribe?token=…`
(auth §7: works signed in or out; it is in each app's public paths). It names the type,
read from the token on the client, and offers "Stop these e-mails" and "Stop all
notification e-mails from <app>"; account mail still comes. It then says how to turn
them back on: Settings → Notifications.

**The mail:**
- **No sealed content** (§2.8): it names who did it, the kind of thing, the group's name,
  a count where there is one, and the link; never a title, a body or an outcome. KS: "Ana
  shared a project with you" or "with Team Alpha", "Ana added you to Team Alpha", "Your
  report has an answer"; kastlan: "3 invoices of <company> are overdue". The person reads
  the rest in the app, signed in.
- Sent under `kind=<type id>` (the `Mailer`'s word, server-kit `mail`). An app whose own
  `send` takes a narrower kind widens it to the registry's ids (KS's `send(…, kind:
  MailKind)`, whose ten kinds are account and billing mail).
- The app's words per language, with the footer line: why it came and the link. An app
  on `render_mail` gets the line from it (§4.1); kastlan, whose mail is plain text with no
  `render_mail`, writes the line itself.

### 3.7 The inbox (an app that keeps one)

keksdose's, unchanged: one row per recipient per delivered notification
(`notification_type`, `title`, `body`, `url`, `push_sent`, `created_at`, `read_at`), kept
90 days. `GET /notifications/inbox?limit&offset` → `{items: [{id, notification_type,
title, body, url, created_at, read_at}], unread_count}` (the badge counts every unread
row); `POST /notifications/inbox/read {ids?}` (`null` = all) → `{updated}`;
`DELETE /notifications/inbox`.

### 3.8 Endpoints

Settings §6.5 gains:

| Card | Endpoint |
|---|---|
| Types, quiet hours, zone, digest | `GET/PATCH /notifications/settings` |
| This device, devices | `GET /notifications/push-key`; `GET/POST /notifications/devices`, `POST /notifications/devices/unregister`, `DELETE /notifications/devices/{id}`; `POST /notifications/test` |
| Inbox | `GET /notifications/inbox`, `POST /notifications/inbox/read`, `DELETE /notifications/inbox` |
| Unsubscribe (no account) | `POST /notifications/unsubscribe/{token}`, `POST /notifications/unsubscribe/{token}/all` |

kastlan's `GET /notifications/poll` stays while its poller does (§5.2). keksdose's
`/push/*` aliases stay, out of the schema, until no request uses them (§2.9, §5.1).

### 3.9 `/auth/me` and the export

- **`/auth/me` carries nothing of notifications** (§2.10).
- **The export**, every app with notifications: `data.notifications = {settings: <the
  GET answer>, inbox: [{type, title, body, created_at, read_at}], push_devices: [{browser,
  created_at, last_delivered_at}]}`. Never an endpoint or its keys, nor an unsubscribe
  token (`NEVER_EXPORT`). keksdose's `preferences` folds into `settings.types` and
  `push_registrations` becomes `push_devices`; kastlan's `account.notifications` moves
  there.

## 4. What the kits ship, what stays app-side

### 4.1 server-kit 0.9: `eifi1_server_kit.notifications` (layer 1)

**Layer 1: pure.** No database, no routes, no network, no new dependency (`zoneinfo`,
`hmac` and `pydantic` are there already). The app keeps its tables, its routes, its
triggers and its sending (`pywebpush`, blocking, off the event loop). The source is
keksdose, cited `file:line` in the docstrings. A package
`src/eifi1_server_kit/notifications/`, every name re-exported from its `__init__`:

- **`registry.py`**
  - `TYPE_ID_PATTERN = r"^[a-z][a-z0-9_]{1,39}$"`.
  - `NotificationType(id, app, email=None, quiet=True)` (§3.1), frozen. `ValueError` on a
    bad id, or with `app` and `email` both `None`.
  - `NotificationTypes(*types)`: the registry, in order; `ValueError` on a doubled id.
    `iter`, `len`, `in`, `[id]` (`KeyError`), `.ids`, and `.receivable(keep:
    Callable[[NotificationType], bool]) -> NotificationTypes`: the account's narrowing, in
    the same order (kastlan: staff in any company).
- **`resource.py`** (§3.2)
  - `TypeSwitches` (`app: bool | None`, `email: bool | None`): one type in the `GET`.
  - `TypeSwitchesPatch` (`app: bool | None = None`, `email: bool | None = None`,
    `extra="forbid"`): one type in the `PATCH`.
  - `StoredSwitches` (frozen dataclass `app: bool | None`, `email: bool | None`; `None` is
    unset): what the app stores per type.
  - `NotificationSettingsResponse` (`types: dict[str, TypeSwitches]`) with the mixins
    `QuietHoursFields` (`quiet_hours_start`, `quiet_hours_end`, `timezone`: `str | None`)
    and `DigestFields` (`digest_cadence: DigestCadence = "weekly"`).
  - `NotificationSettingsUpdate` (`extra="forbid"`; `types: dict[str, TypeSwitchesPatch |
    None] | None = None`) with the class knob `registry: ClassVar[NotificationTypes]`, as
    `ProfileUpdate.offered_locales` is one (settings §7.2). It checks `types` against the
    registry: an unknown id, or `app` / `email` on a type that doesn't offer it, is a
    validation error (422). Mixins `QuietHoursUpdate` (`QUIET_HOURS_PATTERN` on both
    times; `timezone` at most 64 characters and known to `zoneinfo`) and `DigestUpdate`
    (`digest_cadence: DigestCadence | None`). An app subclasses for its own knobs
    (keksdose's `low_balance_threshold`) and sets `registry`.
  - `SETTINGS_NOT_NULLABLE = ("types", "digest_cadence")` and `SETTINGS_SKIP = ("types",)`,
    for `settings.apply_patch` (below), which writes every other field.
  - `resolve_switches(types, stored: Mapping[str, StoredSwitches]) -> dict[str,
    TypeSwitches]`: the `GET`'s `types`: every type of `types` (the account's registry),
    in order, an unset switch as its default, `None` where it isn't offered.
  - `apply_switches_patch(types, stored, patch) -> dict[str, StoredSwitches]`: rules 1–2
    for `types`: the new stored value of each type the body names (a type's `null` unsets
    both, a switch's `null` that one, a switch left out keeps). `NotificationTypeError`
    for a type the account's registry doesn't hold, raised before anything is returned.
    The app writes what it answers.
- **`delivery.py`** (§3.3)
  - `Delivery(inbox: bool, push: bool, email: bool)`, frozen, and `Delivery.NONE`.
  - `plan_delivery(type, switches: TypeSwitches, *, active: bool, is_actor: bool,
    quiet_now: bool, email_verified: bool, keeps_inbox: bool, service: bool = False) ->
    Delivery`. `active` false (deactivated, a demo) or `is_actor`: nothing. `service`
    skips the switch (keksdose's guest deadline). `quiet_now` drops only the push, and
    only for a `quiet` type. No `email` without `email_verified`.
- **`timing.py`** (§3.4)
  - `QUIET_HOURS_PATTERN`, `DEFAULT_ZONE = "Europe/Zurich"`, `DigestCadence =
    Literal["weekly", "monthly"]`, `DIGEST_CADENCES`, `DIGEST_LATE_DAYS = 3`.
  - `is_known_zone(name) -> bool` (the update's check) and `resolve_zone(name, fallback=
    DEFAULT_ZONE) -> ZoneInfo`: unset or no longer resolvable → `fallback`.
  - `in_quiet_hours(start, end, zone: ZoneInfo, now: datetime) -> bool`: `now` aware; the
    window may cross midnight; false when half set or start = end.
  - `digest_period(cadence, day: date) -> str` (`2026-W42` on the ISO year, or
    `2026-10`); `digest_due(cadence, zone, now, *, sent: str | None, late_days=
    DIGEST_LATE_DAYS) -> str | None` (the period key while due, else `None`);
    `digest_tag(period) -> str` (`digest:2026-W42`).
- **`push.py`** (§3.5)
  - `PushSubscriptionKeys`, `PushSubscriptionIn` (`endpoint`, `keys`, `user_agent` at most
    400), `PushUnregisterIn` (`endpoint`), `PushKeyResponse` (`key`), `PushTestResponse`
    (`sent`), `PushDeviceResponse` (`id: UUID | int`, `endpoint`, `user_agent`,
    `created_at`, `last_success_at`, `failure_count`): keksdose's
    `domain/schemas/push.py:11-35`, :128-137.
  - `PushData` (`url`: a path in the app, `/…`, never `//` or a scheme; `type`) and
    `PushPayload` (`title`, `body`, `tag`, `data`) with `.encode(limit=PUSH_PAYLOAD_LIMIT)
    -> bytes`: JSON, the body cut with "…" until it fits, `ValueError` if an empty body
    doesn't.
  - `PUSH_PAYLOAD_LIMIT = 3072`, `PUSH_TTL = 86_400` (s), `PUSH_TIMEOUT = 10.0` (s),
    `PUSH_MAX_FAILURES = 10`, `PUSH_TEST_TYPE = "test"`.
  - `PushOutcome` (`DELIVERED`, `GONE`, `FAILED`) and `push_outcome(status: int | None)`:
    2xx delivered; 404 or 410 gone (delete the row); anything else, a timeout (`None`)
    included, failed (count it). `should_reap(failure_count) -> bool` (≥ 10).
  - `vapid_subject(support_address) -> str`: `mailto:` the address (§2.7).
- **`unsubscribe.py`** (§3.6)
  - `unsubscribe_key(secret: str | bytes) -> bytes`: HMAC-SHA256 of
    `eifi1-notifications-unsubscribe` under the app's signing secret.
  - `unsubscribe_token(secret, user_id: int | str, type_id: str) -> str` and
    `read_unsubscribe_token(secret, token) -> UnsubscribeClaim(user_id: str, type_id:
    str)`, compared in constant time; `UnsubscribeTokenError` for anything else.
- **`inbox.py`** (§3.7): `INBOX_RETENTION = timedelta(days=90)`, `InboxItem`,
  `InboxResponse`, `InboxMarkRead` (`ids: list[UUID | int] | None`),
  `InboxMarkReadResponse` (`updated`).
- **`errors.py`**: `NotificationError(ValueError)` with `status_code` and `code`, added to
  `errors.CONTRACT_ERRORS` (answered `{detail, code}`): `NotificationTypeError` (422,
  `notification_type_not_received`), `PushEndpointTakenError` (409,
  `push_endpoint_taken`), `UnsubscribeTokenError` (400, `unsubscribe_invalid`).

**`settings`**, additive: `apply_patch(…, skip: Iterable[str] = ())`. A skipped field is
checked by rule 3 (a null on it is refused before anything is written) and left to the
caller; that is how `types` reaches `apply_switches_patch`.

**`mail`**, additive:
- `MailMessage.headers: Mapping[str, str] | None = None`.
- `list_unsubscribe_headers(url) -> dict[str, str]`: the two headers of §3.6;
  `ValueError` unless `https://`.
- `MailUnsubscribe(label, page, one_click)`. `render_message(…, unsubscribe=None)` adds a
  last line linking `page`, escaped and typeset like the action line (`label: page` in
  the text half); `MailText.render(…, unsubscribe=)` and `render_mail(…, unsubscribe=)`
  pass it on and set `headers` from `one_click`.
- `ResendClient` sends `headers` as Resend's `headers` object; `ConsoleMailer` logs them;
  `Mailer.send`'s `kind` may be a notification type id (docstring).

**README and CHANGELOG:** the `notifications` section (what layer 1 is and isn't); `mail`'s
"Not yet: `List-Unsubscribe` …" line goes.

**Tests, at 100 %:** the registry's refusals; each PATCH rule (omitted keeps, both
nulls, `types: null` refused through `skip`, each 422); `resolve_switches` over unset
rows; `plan_delivery` at each step, `service` and the actor; quiet hours across midnight,
on both DST days in Zurich, half set, start = end; a zone that no longer resolves →
the fallback; the digest period across an ISO year's end (2026-12-28 to 2027-01-04) and
month ends, the late limit, a key already sent; the token's round trip and each tampering
(data, MAC, version, padding, another secret); the payload cap and the cut;
`push_outcome` per status; the headers in Resend's payload and the footer in both
halves.

### 4.2 ui-kit 0.36: the notification cards

A folder `src/notifications/`, exported from the main barrel under
`── notifications ──`. **Each setting is a card**, a kit `Card` at the settings scale with
its title from the labels, as `SessionsSetting` is: it spreads its other props on the
card, so **`id` is the app's anchor** (keksdose keeps `settings-notifications-card` and
`settings-devices-card`, §5.1). A failed request is said under the card, in the app's
words if `describeError` has them; nothing toasts. Every part takes `labels`.

**Types** (`notification-types.ts`):

```ts
type DigestCadence = "weekly" | "monthly";
interface NotificationSwitches { app: boolean | null; email: boolean | null } // one type, §3.2
type NotificationTypesValue = Readonly<Record<string, NotificationSwitches>>; // the GET's `types`
interface NotificationTypeEntry<Id extends string = string> { id: Id; label: string; description?: ReactNode }
interface NotificationTypeGroup<Id extends string = string> { id: string; label: ReactNode; types: readonly Id[] }
interface NotificationSettingsPatch<Id extends string = string> { // the parts of §3.2's PATCH the cards send
  types?: Partial<Record<Id, { app?: boolean; email?: boolean } | null>>;
  digest_cadence?: DigestCadence;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  timezone?: string;
}
interface PushDeviceItem<Id extends string | number = string> {
  id: Id; endpoint: string; user_agent: string | null;
  created_at: string; last_success_at: string | null; failure_count: number;
}
```

`NotificationTypeEntry<Id>` is where an app types its ids: keksdose's inbox icon map moves
from the card's `PrefKey` to keksdose's own id list beside the types' words (§5.1).

**`NotificationTypesSetting<Id>`** (`notification-types-setting.tsx`):
- `types: readonly NotificationTypeEntry<Id>[]`: the app's words, in its order.
- `value: NotificationTypesValue | undefined`, `loading?: boolean`: the `GET`'s `types`.
- `onChange(patch: NotificationSettingsPatch<Id>) => Promise<unknown> | void`: one
  switch per call (`{types: {digest: {app: true}}}`), or `{digest_cadence}`. The switch
  shows its new state while the call runs and goes back if it rejects.
- `groups?: readonly NotificationTypeGroup<Id>[]`: headings in the app's words
  (keksdose's three); without them, one list.
- `digest?: {type: Id; cadence: DigestCadence}`: the cadence `Select` under that type
  while its switch is on.
- `renderExtra?: (id: Id) => ReactNode`: under a type while it is on (keksdose's threshold
  `MoneyField`).
- `emailUnverified?: boolean`: every e-mail switch carries `emailUnverified` under it.
- `disabled?`, `describeError?(error)`, `labels?`.
- It draws the types the server answered, in the order of `groups`, else of `types`. A
  type the app names that the server didn't answer is not drawn (kastlan's tenant). **In
  development**, a type the server answered with no entry in `types`, or in no group when
  `groups` is given, throws (keksdose's `_EVERY_TYPE_IS_GROUPED`, now at run time).
- A row: a `Switch` (label, description) for `app`, and "By e-mail" under it where
  `email` isn't `null`. Where `app` is `null` (KS), the e-mail switch is the row's, with
  the type's label and description. No types: `typesEmpty`.

**`QuietHoursSetting`** (`quiet-hours-setting.tsx`):
- `start`, `end`, `timezone`: `string | null`, the `GET`'s fields.
- `onChange(patch: NotificationSettingsPatch) => Promise<unknown> | void`: a cleared time
  sends `null`; the first time entered while `timezone` is `null` sends the device's zone
  with it (keksdose `notifications-card.tsx:288-292`).
- `fallbackZone?: string`, default `"Europe/Zurich"`: the zone shown, and the one the
  server applies, while `timezone` is `null` (§2.6).
- `inbox?: boolean`: the app keeps an inbox, and the description says a held push still
  reaches it.
- `disabled?`, `describeError?(error)`, `labels?`.
- Two `TimeInput`s; `quietIncomplete` while half set; the `TimeZoneSelect` while a time is
  set; `deviceZone` with "Use it" when the device's zone differs from the effective one.

**`TimeZoneSelect`** (`time-zone-select.tsx`): `{value: string; onChange(zone: string);
label?; disabled?; id?; className?; labels?}`, on the kit's `InlineEntityCombobox`. Every
zone `Intl.supportedValuesOf("timeZone")` lists, as its city ("Argentina / Buenos Aires")
under its region in the kit's words; a zone with no region ("UTC") first; a region the
labels don't know keeps its IANA name; a stored zone the runtime doesn't list is kept;
not clearable (keksdose `notifications-card.tsx:131-146`). Also exports
`timeZoneOptions(current, regionLabel)` and `deviceTimeZone()`.

**`usePushDevice(options) → PushDevice`** (`use-push-device.ts`), keksdose's
`shared/push/use-push.ts`:
- Options: `pushKey(): Promise<string>` (`GET /notifications/push-key`, `""` = off);
  `register(subscription: PushSubscriptionInput): Promise<unknown>` (`POST
  /notifications/devices`, `{endpoint, keys: {p256dh, auth}, user_agent}`);
  `unregister(endpoint): Promise<unknown>` (`POST /notifications/devices/unregister`);
  `devices(): Promise<readonly {endpoint: string}[]>` (`GET /notifications/devices`);
  `test(): Promise<{sent: number}>` (`POST /notifications/test`);
  `isEndpointTaken?(error): boolean` (default: `response.status === 409`); `onChange?()`
  (after an enable or a disable: the app refreshes its device queries).
- Answer: `supported`, `configured: boolean | undefined`, `installed` (display-mode
  standalone, or iOS `navigator.standalone`), `ios`, `permission:
  NotificationPermission | "unsupported"`, `subscribed` (**this account** holds this
  browser's subscription; an unreachable list falls back to the browser's answer),
  `foreignSubscription`, `currentEndpoint: string | null`, `busy`, `enable():
  Promise<boolean>`, `disable(): Promise<void>`, `sendTest(): Promise<{sent: number}>`.
- No registration is `PushDeviceError("no_service_worker")` at once, and so is one not
  ready in 10 s; the browser's subscribe and unsubscribe are cut at 15 s,
  `PushDeviceError("push_timeout")`. A 409 from `register` unsubscribes and registers a
  fresh endpoint, once. `disable` tells the server first, then the browser.
- **`PUSH_SUBSCRIPTION_CHANGED`** (`"eifi1:push-subscription-changed"`) and
  `notifyPushSubscriptionChanged()`: fired by every enable and disable and by
  `PushDevicesSetting`'s removal of this device; every mounted hook re-reads its state on
  it, so an app's own card on the same hook (keksdose's check-up) stays in step.
- Also exports `pushSupported()`, `PushDeviceError` (`code: "no_service_worker" |
  "push_timeout"`), and the types `PushDevice`, `UsePushDeviceOptions`,
  `PushSubscriptionInput`.

**`PushDeviceSetting`** (`push-device-setting.tsx`): `{push: PushDevice; appName: string;
describeError?(error, action: "enable" | "disable" | "test"); labels?}`. keksdose's
states in its order (`notifications-card.tsx:333-402`): unsupported; iOS outside the
installed app; not set up on this server; blocked; then on or off, with `otherAccount`
when `foreignSubscription`. Buttons: "Turn on notifications", or "Send a test" and "Turn
off". Turning on while the permission is `"default"` opens the explainer first (a `Modal`:
title, body, hint, Cancel / Continue); with it granted, it goes straight on. A test that
reached no device says `testNone`; the outcome is a status line under the buttons.

**`PushDevicesSetting<Id>`** (`push-devices-setting.tsx`): `{devices: readonly
PushDeviceItem<Id>[] | undefined; loading?; currentEndpoint?: string | null; onRemove(id:
Id): Promise<unknown> | void; formatDate?(date: Date): string; locale?; describeError?;
labels?}`. A row: `describeUserAgent(user_agent)` or "Unknown device"; "This device" on
`currentEndpoint`'s row; "Added …" and "Last delivery …" or "No delivery yet"; the
failures in the warning tone when `failure_count > 0`; "Remove" behind a confirm in the
danger tone. Removing this device also unsubscribes the browser and fires
`PUSH_SUBSCRIPTION_CHANGED` (keksdose `push-devices-card.tsx:83-97`). Exports
`describeUserAgent(ua: string | null): string | null` (keksdose :19-45).

**`UnsubscribePanel`** (`unsubscribe-panel.tsx`), the body of the app's signed-out
`/unsubscribe` page, not a card: `{token: string; appName: string; typeLabel?: string;
onStop(token): Promise<unknown>; onStopAll(token): Promise<unknown>; settingsHref: string;
isInvalid?(error): boolean; labels?}`. `onStop` is `POST
/notifications/unsubscribe/{token}`, `onStopAll` the `/all` one; `isInvalid` defaults to
a 400 with `code: "unsubscribe_invalid"`; the settings link goes through the provider's
link component. States: ready (two buttons), working, stopped (these, or all), an invalid
link (at once, with no request, for a token that doesn't parse), failed (try again).
Exports `unsubscribeTokenType(token): string | null`, which reads `<data>` and never the
MAC (that is the server's).

**Labels:** `NotificationsLabels` and `DEFAULT_NOTIFICATIONS_LABELS` in
`notifications-labels.ts` (no component code, so `src/i18n/defaults.ts` imports it
alone); `UiKitLabels.notifications`; the namespace in de-CH, es, fr, hu, it and zh beside
`en`. Cancel is `common.cancel`. The keys and their English:
- types: `typesTitle` "Notify me about"; `typesDescription` "Choose what you hear about,
  and how."; `byEmail` "By e-mail"; `emailUnverified` "Confirm your address to receive
  these."; `digestCadence` "Frequency"; `digestWeekly` "Weekly"; `digestMonthly`
  "Monthly"; `typesLoading` "Loading notification settings…"; `typesEmpty` "There are no
  notifications for this account."
- quiet hours: `quietTitle` "Quiet hours"; `quietDescription(inbox)` "No push
  notifications during this window." and, with an inbox, "No push notifications during
  this window. They still reach your inbox."; `quietFrom` "From"; `quietUntil` "Until"; `quietIncomplete` "Set both a start
  and an end time. Quiet hours take effect once both are set."; `timeZone` "Time zone";
  `deviceZone(zone)` "This device is in {zone}."; `useDeviceZone` "Use it".
- `regions`: `Africa` "Africa", `America` "Americas", `Antarctica` "Antarctica", `Arctic`
  "Arctic", `Asia` "Asia", `Atlantic` "Atlantic", `Australia` "Australia", `Europe`
  "Europe", `Indian` "Indian Ocean", `Pacific` "Pacific" (keksdose's ten).
- this device: `pushTitle` "Push notifications"; `pushDescription` "Notifications on this
  device, also while the app is closed."; `unsupported` "This browser doesn’t support push
  notifications."; `iosInstall(app)` "On iPhone or iPad, add {app} to your Home Screen
  first: iOS delivers notifications only to the installed app."; `notConfigured` "Push
  notifications aren’t set up on this server."; `blocked` "Notifications are blocked in
  this browser’s settings."; `on` "Notifications are on for this device."; `off`
  "Notifications are off for this device."; `otherAccount` "This browser gets
  notifications for another account. Turn them on here to get them for the account you’re
  signed in with."; `enable` "Turn on notifications"; `disable` "Turn off"; `sendTest`
  "Send a test"; `enableFailed` "Couldn’t turn on notifications."; `noServiceWorker`
  "Couldn’t reach the app’s service worker. Reload the page and try again.";
  `pushTimeout` "The browser’s push service didn’t answer. Check your connection and try
  again."; `testSent(count)` "Test sent to 1 device" / "Test sent to {count} devices"
  (plural per language);
  `testNone` "No device accepted the test. Turn notifications on for this device first.";
  `testFailed` "Couldn’t send a test notification."; `explainerTitle` "Turn on
  notifications?"; `explainerBody(app)` "{app} sends a notification only for the kinds
  you choose, and you can turn them off at any time."; `explainerHint` "Your browser asks
  for permission next."; `explainerContinue` "Continue".
- devices: `devicesTitle` "Notification devices"; `devicesDescription` "Every device that
  gets push notifications for your account. Remove any you no longer use.";
  `devicesLoading` "Loading devices…"; `devicesEmpty` "No device gets notifications
  yet."; `unknownDevice` "Unknown device"; `thisDevice` "This device"; `added(date)` "Added
  {date}"; `lastDelivery(date)` "Last delivery {date}"; `noDelivery` "No delivery yet";
  `failures(count)` "1 failed delivery in a row" / "{count} failed deliveries in a row"
  (plural per language); `remove`
  "Remove"; `removeItem(device)` "Remove {device}"; `removePrompt` "Stop sending
  notifications to this device?".
- unsubscribe: `unsubscribeTitle` "E-mail notifications"; `unsubscribeAbout(type)` "You
  get e-mails about: {type}."; `unsubscribeGeneric` "You get notification e-mails.";
  `stopThese` "Stop these e-mails"; `stopAll(app)` "Stop all notification e-mails from
  {app}"; `stoppedThese` "Done. You won’t get these e-mails any more.";
  `stoppedAll(app)` "Done. You won’t get notification e-mails from {app} any more.";
  `accountMail` "E-mails about your account still come."; `turnBackOn` "You can turn them
  back on at any time in Settings."; `openSettings` "Open Settings"; `invalidLink` "This
  link doesn’t work any more. You can turn e-mails off in Settings instead."
- every card: `failed` "That didn’t work. Please try again."

**Tests** (`src/notifications/__tests__/`): the types card (the server's order and groups,
e-mail only where offered, KS's e-mail-only rows, one PATCH body per switch, the cadence
and `renderExtra` only while on, `emailUnverified`, both development throws, a type the
server didn't answer left out, a rejected save put back); quiet hours (half set, the
device's zone sent with the first entry, `fallbackZone` shown for `null`, "Use it", a
cleared time as `null`); the zone list (regions, region-less first, an unlisted stored
zone kept); `usePushDevice` (unsupported, this account against this browser and the
offline fallback, the 409 recovery once, both timeouts, the event fired and heard);
`PushDeviceSetting` in each state, the explainer only on `"default"`, `testNone`;
`PushDevicesSetting` ("This device", failures, the confirm, removing this device
unsubscribes and fires the event); `UnsubscribePanel` (both POSTs, both done states, a
400, a token that doesn't parse sends nothing); the namespace complete in seven
languages (the catalogue tests).

**Showcase:** a page "Notifications" in the App chrome group
(`showcase/src/sections/notifications-036-demo.tsx`, `routes.tsx`): keksdose's nine types
in three groups with the threshold and the digest; KS's three e-mail-only types with an
unverified address; quiet hours with a device in another zone; the push card's states
from a switcher over a fake `PushDevice`; the device list; the panel's states.

**Not in the kit:** the inbox list and bell, keksdose's check-up card, the service
worker, an app's words for its types. Size: L.

### 4.3 App-side

The registry, its per-account narrowing, the type words and the triggers, each writer
passing its actor; the tables and migrations (the switches, the settings row with
`digest_sent`); the routes, the demo's refusal among them; the mails' words; the sending
(`pywebpush`, the mailer); the jobs; the service worker; the catalogue entries; the
`/unsubscribe` page in the public paths; the inbox UI.

## 5. Per app

### 5.1 keksdose (canon: mostly names)

1. **The registry** from `NOTIFICATION_TYPE_DEFAULTS`: the same nine and defaults as
   `app`; `quiet` false for `share_events`, `announcements` and `support_chat`; no type
   offers e-mail.
2. **`/notifications/*`** (§3.8), with `PATCH /notifications/settings` replacing the two
   PUTs. **The `/push/*` aliases** (decision 9): a rename (`public-key` → `push-key`,
   `subscribe` → `POST devices`, `unsubscribe` → `devices/unregister`, `subscriptions` →
   `devices`; `push_router.py:49-110`), and a shim for the two GET/PUT pairs that turns
   the old bodies (`/preferences` `{type: bool}`, :133/:142; `/settings`, :161/:172) into
   the new resource and answers the old shape. Mounted with `include_in_schema=False`, so
   the OpenAPI schema and `openapi-schema.d.ts` list each route once; dropped when the
   `http.route` metric shows no `/push/*` hits. The backend tests that call `/push/*`
   (`test_push_*.py`, `test_admin_users.py:342-353`, `test_account_deletion.py:163`,
   `test_uncovered_routes.py:102-119`) move to the new paths, and one test keeps each
   alias. Nothing else calls `/push/*`: the frontend goes through `shared/api/endpoints.ts`
   (:446-487), and the admin's pushes are `/admin/push-test` and `/admin/push-broadcast`.
3. **A demo's `PATCH /notifications/settings` is a 403**: new, since the PUTs serve one
   today (`push_router.py:142`, :172).
4. **The zone** through the kit's `resolve_zone`, so a null or unresolvable zone is
   `Europe/Zurich`, at the three places that fall back to UTC
   (`notification_preferences_service.py:169`/:174, `push_notifications.py:1097`/:1102,
   the column comment at `push_subscription.py:187`). Before the deploy, count the rows it
   moves: `SELECT count(*) FROM notification_settings WHERE timezone IS NULL AND
   quiet_hours_start IS NOT NULL`.
5. **The digest:** `digest_sent` on `notification_settings` and the kit's `digest_due`;
   the marker set in the transaction that writes the inbox row; the tag `digest:<period
   key>` (was `digest:<local date>`, `push_notifications.py:1116`).
6. **The payload's `data.type`:** in `PushPayload` (`sw.ts:220`), in `_deliver_to_user`
   (`push_notifications.py:399`), and in the test pushes (`push_router.py:222`;
   `admin_router.py:380`, :425). `use-sw-messages.ts` may then refresh the support keys
   only for `support_chat`.
7. **The VAPID subject:** its default from `reply_to_address()`
   (`infrastructure/email.py:44-50`) instead of `admin@` (`settings.py:247`);
   `_VAPID_SUBJECT` in `deploy/gcp/cloudbuild.yaml:205` becomes
   `mailto:support@keksdose.app` (passed to the API and every job, :438, :505, :548, :904,
   :949); `backend/.env.example:139`.
8. **The cards** (decision 11): `PushDeviceSetting` on `usePushDevice`,
   `NotificationTypesSetting` (groups from `PREF_GROUPS` with keksdose's three headings;
   `renderExtra` for the threshold; `digest`), `QuietHoursSetting` with `inbox`, and
   `PushDevicesSetting` replace the notifications card and the devices card.
   - **Anchors:** the types card keeps `id="settings-notifications-card"` and the devices
     card `id="settings-devices-card"`, so the tours (`feature-tours.tsx:466-500`) are
     unchanged; the push card and the quiet-hours card get anchors of their own, and
     `settings-index.ts:168-174` points `quiet_hours` and a new push entry at them.
   - **The type ids:** `PREF_DEFAULTS` and `PrefKey` go; the inbox's icon map
     (`notification-inbox.tsx:25`, :42, :137) is typed on keksdose's own id list beside
     the types' words (`NotificationTypeEntry<NotificationTypeId>`).
   - **The check-up card** stays keksdose's and moves to `usePushDevice` and the kit's
     `PUSH_SUBSCRIPTION_CHANGED` (`push-checkup-card.tsx:18`, :174); `shared/push/use-push.ts`
     goes. The inbox stays.
9. **The export's keys** (§3.9); the stale "MISSING ROW = ENABLED" docstring
   (`push_subscription.py:93`).

### 5.2 kastlan

1. **Types:** `invoices_overdue` (`app` and e-mail) and `dunnings_pending` (`app` only: a
   to-do the staff made). Both off by default (§2.1). Received by an account that is
   staff in any of its companies (roles are per company, `dependencies.py:369`); at
   delivery the role is checked in the event's company, so a person who is staff in one
   company and a tenant in another hears only about the first. A person on staff in two
   companies gets one mail per company.
2. Storage, `GET/PATCH /notifications/settings` (`types` only: no push yet, no digest).
3. **The migration:** `browser_notifications = true` → both types' `app` on.
   `email_notifications` carries nothing: it defaulted to on and nothing ever read it, so
   carrying it would turn the overdue mail on for all staff. Both columns leave `users`,
   `MeResponse`, the admin `UserResponse`, `ProfileSettings`, the mock and the export;
   `test_profile_locale.py:66`, :85, :87 take another field as their sample.
4. **The poller, until push** (kastlan's fixes in its adoption): each card is a type,
   shown only with its `app` switch on, and shown again only when its count changed, with
   a `tag` per type so it replaces the earlier card; its words are in the user's language.
   The counts are a state, not events, so the client stops sending `since` and the route
   stops taking it. The catalogue entry and the poller gate on staff, not on the demo
   alone (`settings-catalogue.tsx:83`), so a tenant polls nothing.
5. **Push, later, as a step of its own** (decision 11): `injectManifest` and a service
   worker of kastlan's own that redoes the generated worker's offline caching
   (`vite.config.ts:28-67`) and adds the push handlers; VAPID; the kit's device parts.
   Then the poller and `GET /notifications/poll` go. No new contract.
6. **The overdue mail:** `mark_overdue` answers the `company_id` of each invoice it marks
   (`RETURNING`, `invoice_service.py:46-59`), so one mail per company goes for the
   invoices that run marked, and a run at start (`jobs.py:113`) after them sends nothing.
   A failed send is logged and not retried (there is no marker); the invoices stay marked
   and listed. The mail names the company, the count and the link: no tenant, no amount.
7. **Mail plumbing:** the two headers on both transports (Resend's JSON gains `headers`,
   `email.py:81-87`; SMTP sets them on the message, :102-108); the footer line written by
   kastlan itself (no `render_mail`); the unsubscribe routes, the `/unsubscribe` page in
   the public paths, the words in four languages.
8. `NotificationTypesSetting` replaces the two switches, with `emailUnverified` from the
   account's `email_verified`; its catalogue entry.

### 5.3 Kurvenschmiede

1. **Types, e-mail only** (`app=None`; no push, no worker, no manifest):
   `feedback_answered` (on: it answers the person's own report), `share_granted` (off),
   `team_added` (off).
2. **`feedback_answered`**, in `feedback_service.save` (:381), which takes the actor
   (`save(session, row, *, actor)`) and compares the stored status with the new one:
   - **fires** when the status crosses from one the author may still edit (OPEN, READY,
     IN_PROGRESS: the kit's `AUTHOR_EDITABLE_STATUSES`) to an answered one (the kit's
     `REWORKABLE_STATUSES`), and again when a reworked report is answered again;
   - **never** on an edit of the outcome alone, on IN_EVALUATION → DONE (answered to
     answered), on a rework (the other way), or for a crash report;
   - **skipped** when the author is gone (null) or deactivated, or is the actor.

   Both writers go through it with an actor: the admin's PATCH (`update`, :322-368) and
   the loop's `--resolve` (`feedback_loop.py:176-222`), which passes the first admin, as
   its `--file` does (:236). **With the kit's feedback service** (server-services,
   server-kit 0.9), KS's repository `apply(row, changes, *, actor)` flushes through this
   same `save` with the actor, so the kit's PATCH fires it too.

   **The loop refuses `--resolve` while the mail backend is `console` and the database is
   not local**, naming the setting: otherwise the answer's mail prints on the machine
   that ran it and reaches nobody.
3. **`share_granted`:** on `grant` to an existing account (`share_service.py:159`, a new
   grant only), to the grantee; on `grant_team` (:128), to every member of the team but
   the granter, each under their own switches. No mail when a grant only changes the
   role (`"updated"`, :118, :149), nor when `materialise` (:387) turns a pending share
   into a grant at sign-up.
4. **`team_added`:** when `team_service.add` puts an existing account in a team
   (:338-348). No mail on a role change (:335), for an invitation (it has its own mail),
   or when an invitation is accepted.
5. **The mail** names the actor, the kind of work (`access.KINDS`' noun: a project, a
   gear …), the team and the link: never a title, a body or an outcome (decision 8).
   `feedback_answered` says "Your report has an answer" and links the report.
6. **`send`** (`infrastructure/email.py:182`) widens its `kind` from `MailKind` (ten kinds,
   :92) to `MailKind | <a registry id>`, so the log lines and the `Idempotency-Key` name
   the type.
7. Storage, `GET/PATCH /notifications/settings` (`types` only), the unsubscribe routes and
   page, the mails in seven languages.
8. **Wiring:** the demo's refusal list (the route walk in `test_demo.py`) gains
   `PATCH /notifications/settings`, and the unsubscribe POSTs are public (no account);
   `PUBLIC_PATHS` (`frontend/src/shared/lib/public-paths.ts:36`) gains `/unsubscribe`;
   the mail language test renders each new mail in seven languages; a test sends the
   one-click POST on a cold start, with no cookie and no page that woke the server.
9. **The card:** the `notifications` group with `NotificationTypesSetting`, which makes
   the group visible (settings §4.1); `emailUnverified` while `email_verified` is false
   (migration 0040 left every existing account so). Export `data.notifications`. No
   account zone: the mails print no date.

## 6. For the reviews

Every question the draft asked was answered on 2026-10-13. The answers are folded into
§1–§5, and §8 lists where each went.

## 7. Left for later

- Delaying a held push to the end of the window, and bundling several events in one
  mail: both need a queue (layer 2).
- A retry for a notification mail that failed to send (kastlan's overdue mail, §5.2).
- A switch per channel and per device beyond `app` / `email`.
- A zone on the account, and one at sign-up: when a server-written time needs it.
- The kit's inbox list and bell, once a second app keeps an inbox.
- `pushsubscriptionchange`: re-registering a rotated subscription from the worker (today
  the old endpoint 410s and the person enables again).
- KS: an admin's transfer of a person's work (`admin_service.py:435`) as a type
  (Marcel, 2026-10-13: not this round).
- kastlan's push (§5.2.5); any app's SMS or native push.
- Open check at the build: the DKIM signature on a received notification mail covers
  both `List-Unsubscribe` headers (Gmail, "Show original"), as RFC 8058 requires.

## 8. Settled after the reviews (2026-10-13)

keksdose (at `c90d068e`), kastlan (at `f2b9574`) and Kurvenschmiede (at `c687637`)
reviewed the draft on 2026-10-13, and Marcel settled the open decisions and the
questions the reviews raised the same day ("As recommended"). Where each point went:
- **Marcel:** two switches per type, no matrix → decision 3; the zone with the
  notification settings, null = `Europe/Zurich`, never on the account → decision 6; the
  unsubscribe key derived from each app's secret → decision 8, §3.6; the push parts
  lifted now, with the four couplings → decision 11, §4.2; kastlan's push later, as its
  own step, and the poller fixed meanwhile → decision 11, §5.2; announcements ignore
  quiet hours → decision 4; no sealed content in mail → decision 8, §3.6; the unverified
  address's line → decision 8, §4.2; KS's admin transfer not a type → §7; keksdose's
  aliases with a body shim, out of the schema, dropped on no hits → decision 9, §5.1;
  KS's hook in `save` with the actor, the kit's service flushing through it → §5.3.
- **keksdose:** kk 1 (a rename, not a prefix: the shim, `include_in_schema=False`, "one
  release" too short) → decision 9, §5.1; kk 2 (Zurich moves only null-zone rows with
  quiet hours; the three places) → decision 6, §5.1; kk 3 (the marker on the inbox row;
  the tag the period key) → decision 5, §3.4, §3.5; kk 4 (announcements keep) → decision
  4; kk 5 (the inbox's `PrefKey`, `PUSH_SUBSCRIPTION_CHANGED`, the anchor ids, the group
  headings) → §1, §4.2, §5.1; kk 6 (`data.type` collides with nothing; the test pushes
  too) → §3.5, §5.1; the guest deadline is a push and an inbox row, not mail → §1,
  decision 8, §3.3; an unresolvable zone is UTC today, and the contract's fallback wins →
  §1, decision 4, §3.4; the demo's PUTs are not refused today → §1, §3.2, §5.1; the VAPID
  subject in `cloudbuild.yaml` and from `reply_to_address()` → §1, decision 7, §5.1; the
  eight sends and the other cites check out → §1.
- **kastlan:** the poller (`since` dropped, English cards, no tag; a tenant's 403 every
  30 s) → §1, §5.2; (a) both fields leave `/auth/me`, and the test sample → §5.2; (b)
  nothing carried over, and "the card says so" is a code comment → §1, §5.2; (c) push is
  its own step → decision 11, §5.2; Q1 (`RETURNING company_id`, the run at start, no
  retry) → §1, §5.2, §7; Q3 (staff in any membership, the role checked at delivery) →
  §3.1, §5.2; Q4 (the headers on both transports, the footer its own) → §1, §3.6, §5.2.
- **Kurvenschmiede:** KS 1.1 (the hook in `save`, both writers with an actor, the loop's
  `console` mail) → §1, §5.3; KS 1.2 (a team grant's fan-out, no mail on a role change or
  `materialise`, the transfer) → §3.3, §5.3, §7; KS 1.3 (almost nobody verified) →
  decision 8, §4.2, §5.3; KS 1.4 (sealed content) → decision 8, §3.6, §5.3; KS 1.5 (ten
  kinds; `send(kind)` widens) → §1, §3.6, §5.3; KS 1.6 (the team cite :338-348; a role
  change and an accepted invitation stay silent) → §1, §5.3; KS 1.7 (the wiring) → §5.3;
  KS §6 (`feedback_answered` on, with its rule; `share_granted` and `team_added` off;
  e-mail only; no zone) → decision 1, decision 6, §5.3.
