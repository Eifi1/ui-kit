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

**Settled 2026-10-13, built for ui-kit 0.36.0 / server-kit 0.9.0.** The three apps
reviewed the draft on 2026-10-13; Marcel took its open decisions and the questions the
reviews raised the same day ("As recommended"). Everything is folded into the sections
below, and §8 says where each review point went. The build works from §4; each app's
steps are §5.

**§9, round 0.37's amendment, settled 2026-10-14** (Marcel: "Do 0.37 as recommended"),
built for server-kit 0.10.0 / ui-kit 0.37.0: KS's admin transfer of work as a type, with
an account notice to an active former owner, and a retry for a notification mail that
failed to send. It amends §3.4, §3.6, §5.2.6 and §5.3 in place; §9.7 says where each
review point went.

**§10, round 0.46, settled 2026-10-19** (Marcel, after the three apps' reviews in
audits/round-047/reviews.md "Notifications §", and his KS-session decisions), for ui-kit
0.46 / server-kit 0.16: the kit's inbox list and an optional bell, a switch per channel
(in the app, push, e-mail) and per device with an app-level "no push", the time zone on
the account (reverses decision 6: the pick, else the last device's zone, else Zurich), and
a queue that is **opt-in per app** (one 15-minute tick; KS runs none). §10.6 amends the
push rotation route (`POST /notifications/devices/replace`, server-kit 0.16.0); §10.7 says
where each review point went. It amends decisions 2, 3, 4 and 6, §3.1–§3.5 and §3.8.

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
   candidate. KS's admin transfer of work was not a type in round 0.36 (Marcel); round
   0.37 made it one, `work_transferred`, off (§9.2 decision 1).
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

**Round 0.38 note (settled 2026-10-14).** Public feedback adds two types that more than
one app declares, so their ids (server-kit `FEEDBACK_ANSWERED`, `FEEDBACK_COMMENT`) and
their setting words (ui-kit `useFeedbackNotificationTypes`) move into the kit, by
decision 1's rule: `feedback_answered` (a reply) and `feedback_comment` (a comment), to
the author and the earlier commenters, never the writer, both on (they answer the
person's own report or comment) and quiet, no content in mail or push. It also adds a
fourth `AccountNoticeKind`, `feedback_published`: the one notice to authors of existing
reports that became public. Details: [feedback-harmonization.md](feedback-harmonization.md)
§9 (9.11, 9.12).

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
  inbox stores it only when the send answered True, so a failed send is tried again
  while the digest is due (amended in round 0.37, §9.2 decision 9). The push's tag is
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
  report has an answer"; kastlan: "3 invoices of <company> became overdue on 13.10." (the
  event's count, amended in round 0.37, §9.2 decision 8). The person reads the rest in
  the app, signed in.
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
(`showcase/src/sections/notifications.tsx`, a family file: no new `*-0NN-demo.tsx`, the
showcase's ratchet; `routes.tsx`): keksdose's nine types
in three groups with the threshold and the digest; KS's three e-mail-only types with an
unverified address; quiet hours with a device in another zone; the push card's states
from a switcher over a fake `PushDevice`; the device list; the panel's states. App
chrome holds ten pages at most, so "Links" moves to Foundations beside "Localisation"
(both are set once on the provider; the slug is unchanged).

**Not in the kit:** the inbox list and bell, keksdose's check-up card, the service
worker, an app's words for its types. Size: L.

### 4.3 App-side

The registry, its per-account narrowing, the type words and the triggers, each writer
passing its actor; the tables and migrations (the switches, the settings row with
`digest_sent`); the routes, the demo's refusal among them; the mails' words; the sending
(`pywebpush`, the mailer); the jobs; the service worker; the catalogue entries; the
`/unsubscribe` page in the public paths; the inbox UI.

## 5. Per app

**Round 0.38 (feedback §9.11, §9.16):** keksdose declares `feedback_answered` and
`feedback_comment` on `app` (inbox + push), and its jobs runner sends `feedback_answered`
for the loop's replies (`notified_at IS NULL`). kastlan declares `feedback_answered` by
e-mail only (`app=None`: its poller carries company counts, not a person's event) and no
`feedback_comment` while its public parts are off. Kurvenschmiede moves
`feedback_answered` from "the status crosses into an answered one" to "a reply" and adds
`feedback_comment`, both by e-mail. keksdose and Kurvenschmiede send the
`feedback_published` notice once.

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
6. **The overdue mail** (amended in round 0.37, §9.2 decision 8): its events are read from
   the state, not from the run. An event is a company's invoices that became overdue on
   one day: those still `OVERDUE`, not deleted, whose due date + 1 is that day. It is
   owed while that day is at most 3 days back; a failed send is tried again at the next
   scheduled run, and a marker per recipient keeps a sent one from going twice (§9.4).
   `mark_overdue` stays one UPDATE with no `RETURNING` (`invoice_service.py:46-59`). The
   `invoices-overdue` job is a mark step and a mail step; the run at start
   (`jobs.py:112-113`) runs the mark step only. The mail names the company, the event's
   count and its day ("3 invoices of <company> became overdue on 13.10."), and the link:
   no tenant, no amount. The steps are §9.6.
7. **Mail plumbing:** the two headers on both transports (Resend's JSON gains `headers`,
   `email.py:81-87`; SMTP sets them on the message, :102-108); the footer line written by
   kastlan itself (no `render_mail`); the unsubscribe routes, the `/unsubscribe` page in
   the public paths, the words in four languages.
8. `NotificationTypesSetting` replaces the two switches, with `emailUnverified` from the
   account's `email_verified`; its catalogue entry.

### 5.3 Kurvenschmiede

1. **Types, e-mail only** (`app=None`; no push, no worker, no manifest):
   `feedback_answered` (on: it answers the person's own report), `share_granted` (off),
   `team_added` (off). Round 0.37 adds `work_transferred` (off) and an account notice to
   an active former owner (§9.3).
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
5. **The mail** names the actor, the kind of work in KS's page words (a curve, a gear, a
   project …; not `access.KINDS`' nouns, `access.py:104-109`: amended in round 0.37,
   §9.3), the team and the link: never a title, a body or an outcome (decision 8).
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
- A switch per channel and per device beyond `app` / `email`.
- A zone on the account, and one at sign-up: when a server-written time needs it.
- The kit's inbox list and bell, once a second app keeps an inbox.
- `pushsubscriptionchange`: re-registering a rotated subscription from the worker (today
  the old endpoint 410s and the person enables again).
- kastlan's push (§5.2.5); any app's SMS or native push.
- Open check at the build: the DKIM signature on a received notification mail covers
  both `List-Unsubscribe` headers (Gmail, "Show original"), as RFC 8058 requires.

Two items that stood here were settled in round 0.37, §9: KS's admin transfer of a
person's work as a type (§9.3), and a retry for a notification mail that failed to send
(§9.4).

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

## 9. Round 0.37 amendment (settled 2026-10-14)

Two items of §7, taken up for round 0.37 at Marcel's go (2026-10-13: "Sounds good,
continue"): Kurvenschmiede's admin transfer of a person's work as a notification type
(§9.3), and a retry for a notification mail that failed to send (§9.4). **Settled
2026-10-14** (Marcel: "Do 0.37 as recommended"), built for server-kit 0.10.0 and ui-kit
0.37.0. The three apps reviewed the draft on 2026-10-13; §9.7 says where each point
went. §1–§8 stand as settled. Where this section changes them it says so, and the place
itself is amended: §3.4 (decision 9), §3.6 and §5.2.6 (decision 8), §5.3 (the page
words of §9.3).

### 9.1 Where each one stands

Drafted at kk `c90d068e` (`feat/kit-0.34`), ka `8a7eb0b` (`feat/kit-0.36`, no
notification code yet), KS `bcadab6` (`refactor/plan-2026-10`, no notification code) and
server-kit `41dbc85` (0.9.0); reviewed at kk `c90d068e`, ka `0e8bd2c` and KS `bcadab6`.
Each app has since built its 0.36 adoption, and the cites below are re-read there: kk
`c2feb89d` and ka `ef43021` (both `feat/kit-0.36`), KS `c15b693`
(`refactor/plan-2026-10`). Paths as in §1; KS's tests under `backend/tests/`.

**The transfer (KS):**
- `admin_service.transfer` (`domain/services/admin_service.py:435-476`), from
  `POST /admin/users/{id}/transfer` (`adapters/api/admin_router.py:319-339`, an admin
  only): every row the source owns moves to the recipient, in the request's transaction,
  and the answer is `moved`, a count per kind. The kinds are `WORK`'s six (:80-87):
  projects, setpoint sessions, gears, transmissions, hysteresis sets, kinematics
  mappings. Reports stay with their author (`REPORTS`, :89-95).
- Refused onto the source itself, onto an inactive account and onto a customer
  (:459-475); confirmed by the source's typed address. The source may be active or
  deactivated (the docstring's case: "a colleague left").
- The grants on the moved rows stay, now granted by the recipient; a grant the recipient
  held on a moved row goes (`share_service.follow_transfer`, `share_service.py:419-438`).
  `updated_at` is written back as it was, so the moved rows don't rise to the top of the
  recipient's lists (`admin_service.py:451-453`).
- One audit row, `transfer`, with `{to_user_id, moved}` (:508-510).
- `transfer_rows` (:479-511) also serves the erasure's hand-over, where the erasing admin
  is both actor and recipient (`erasure_service.py:384-385`).
- No other state change an admin makes to an account mails the person: `set_role`
  (:261), `set_active` (:323) and `require_password_change` (:378) write an audit row and
  nothing else. The admin's `send_mail` (:409) does mail: it sends the verification or
  the password reset again, which is that action's whole point.
- The UI calls it "Hand on work" (`frontend/src/shared/i18n/locales/en.json:1654`). The
  page names of the six kinds are the navigation's (`en.json:8`, :12-15, :21): Projects,
  Curves, Gears, Transmissions, Hystereses, Kinematics. KS's mail words hold
  `share_granted`'s singular nouns in those page words (`_KINDS`,
  `domain/services/notification_service.py:372-433`), and no plural forms.
- **A background task runs before KS's request session commits.** FastAPI 0.141.1 closes
  the request's exit stack after `await response(...)` (`fastapi/routing.py:140-147`),
  Starlette 1.6.0 runs the background tasks inside `response(...)`
  (`starlette/responses.py:169-170`), and `get_db_session` commits in that later exit
  (`infrastructure/database.py:108-124`). So the password reset's route commits itself
  before it adds the task (`adapters/api/auth_router.py:549-552`, held by
  `tests/api/test_password_reset.py:145-163`), and KS's three types arm their mails on
  the session with an `after_commit` listener (`email.send_after_commit`,
  `infrastructure/email.py:216-264`, from `notification_service.py:176-187`).

**A failed send today:**

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Transport | the kit's `ResendClient`: one retry on a transport error, a 429 or a 5xx, both tries under one random `Idempotency-Key` (server-kit `mail.py:468-472`, :519; `infrastructure/email.py:12-19`) | its own Resend POST, no retry, no `Idempotency-Key` (`infrastructure/email.py:79-103`); SMTP (:106-130) | the kit's `ResendClient` (`infrastructure/email.py:162-193`) |
| Account mail | best effort, never raises; the person asks again (`email.py:17-19`) | the same (`email.py:17-18`) | the same; an invitation answers `sent` to the admin (`admin_router.py:449`) |
| Billing notices (a job) | marker on success, committed per row; a failed mail is "owed again next run" while due (`domain/services/billing_notice_service.py:17-20`, :227-232) | one marker per company, set when **one** admin got it (`domain/services/billing_notices.py:73-85`) | marker on success, the row claimed `FOR UPDATE SKIP LOCKED` (`billing_notice_service.py:492-510`) |
| Push | a push is never retried; `push_sent` on the inbox row records a success (`_deliver_to_user`, `push_notifications.py:367-409`); a failed device counts toward the reap (`push_service.py:281-313`), which the daily job runs (`reap_dead_subscriptions`, :206-232) | none | none |

- **The precedent is billing §14.7:** the job reads what is owed from the state, sends,
  sets the marker only when the send answered True, and commits per row; the window
  (`NOTICE_LATE_LIMIT`, 3 days, server-kit `billing/notices.py:92`) bounds the retries.
  The digest copies it (§3.4, `DIGEST_LATE_DAYS`).
- **kastlan's overdue mail, as round 0.36 settled it (§5.2.6), had no state to read
  back.** `mark_overdue` is one UPDATE across companies
  (`domain/services/invoice_service.py:46-59`), and the mail went for "the invoices that
  run marked": the event lived only inside that run, so a failed send had nothing to be
  retried from. The run at every start (`infrastructure/jobs.py:112-113`) marks too, and
  on a Cloud Run that scales to zero a start before the 00:10 run (:106) marks the day's
  invoices first. kastlan's 0.36 adoption holds the mail for this section: the switch,
  the headers, the token, the routes and the `/unsubscribe` page are built, and no
  overdue mail goes yet.
- kastlan's job routes answer 500 on a failure, which Cloud Scheduler retries
  (`adapters/api/ops_router.py:6-9`). A send never raises, so a failed mail fails no route.
- An invoice past its due date stays `OVERDUE` after a partial payment, and one entered
  past its due date is `OVERDUE` from the start (`domain/services/invoice_logic.py:36-65`).

### 9.2 Decisions

**Decided (Marcel, 2026-10-14: "Do 0.37 as recommended").** Each recommendation of the
draft is the rule below, with the reviews' corrections; Marcel's calls on the four open
questions (N1–N4) are named where they fall.

1. **`work_transferred` is a Kurvenschmiede type, e-mail only, off by default** (Marcel,
   N1). By §2.1 a type is on only when it fires only in answer to the person's own act. A
   transfer to you is an admin's act, and the server holds no request of yours, so even
   a transfer you asked an admin for doesn't count: it is `share_granted`'s case. **To
   revisit when billing is on:** the moved setpoint sessions count toward the recipient's
   curve limit, which is a reason to tell them at once.
2. **The type's mail goes to the account the work goes to; an active former owner gets an
   account notice** (Marcel, N3). Not the actor (an admin who takes the work themselves,
   §3.3 step 1), not the grantees (their access doesn't change). The former owner is
   mostly deactivated ("a colleague left") and so is sent nothing. While active, they
   see their work leave their lists by somebody else's hand, so they are told: a service
   notice (§2.8), not a type, with no switch and no unsubscribe, sent under server-kit's
   `AccountNoticeKind.WORK_TRANSFERRED_NOTICE` (§9.3). It goes only when the source
   account is active, never to the actor (an admin who hands on their own work), and
   never from the erasure's hand-over.
3. **The mail names the actor, the former owner and the kinds of work: never a title,
   never a count** (Marcel, N2: the former owner named). The former owner's name is what
   tells the recipient what arrived: the moved rows keep their `updated_at` and sit among
   the recipient's own. Names are not sealed in KS (§1); titles are. Each name is in the
   recipient's order of names (server-kit `full_name`). The kinds are KS's page names
   (projects, curves, gears, transmissions, hystereses, kinematics), not `WORK`'s ids;
   `share_granted`'s singular nouns are the same page words, not `access.KINDS`' (§9.3).
   No count: a count per kind needs six nouns with plural forms in seven languages, which
   KS's mail words don't have, and the lists show the numbers; "gears (12)" is a count no
   language inflects. The notice to the former owner carries no title and no count
   either.
4. **The hook is `admin_service.transfer`, not `transfer_rows`, and the mails go after
   the commit.** `transfer_rows` serves the erasure too, where the actor takes the work.
   Nothing moved, no mail; a transfer that rolls back mails nothing. **Every notification
   mail a request sends goes after the commit, which the route makes itself where the
   session commits at request end:** a background task runs before that commit (§9.1).
   Three ways:
   - (i) the route `await session.commit()` before `background.add_task` (KS's password
     reset);
   - (ii) a function-scoped session (`Depends(…, scope="function")`), which closes before
     the answer goes;
   - (iii) an `after_commit` listener armed where the change is made, which sends at the
     commit and drops the mail on a rollback (KS's `email.send_after_commit`; keksdose's
     object purge, `budgets_service._purge_objects_after_commit`).

   Behind the kit's feedback router there is no route body, so `feedback_answered` takes
   (ii) or (iii). KS arms all its notification mails with (iii), the transfer's two too
   (§9.3).
5. **A notification mail a job sends is owed until it went, for 3 days; one a request
   sends is tried once** (Marcel, N4: the split stands).
   - A job's event happens with nobody watching, and the mail may be the only word of it
     (kastlan's overdue invoices). It is owed per recipient per event from the event's
     day until `MAIL_LATE_DAYS` = 3 days after: billing's and the digest's grace.
   - A request's mail goes once, with the transport's own retry, and a failure is logged.
     Its event is in the app for the recipient to see (the shared project in their list,
     the answer on their report); a retry would need a stored outbox and a job in every
     app, for a nudge.
   - Push is not retried either: a failed push still has its inbox row (keksdose's
     `push_sent`).
6. **The marker: per recipient, type and event, written only when the send answered
   True.** The event key is the app's: stable, with no personal data and no sealed
   content (kastlan: `<company_id>:<due date + 1>`). **No stored count of tries:** a job
   tries once per scheduled run and never at the app's start, so the window holds it to
   four tries. A failed try writes nothing. Markers are kept 30 days, so an operator can
   tell whether a person was sent a mail (the logs never name the recipient). kastlan's
   billing marker (one per company) stays: it is billing's.
7. **Idempotency: one `Idempotency-Key` per recipient, event and day**,
   `<type>:<event>:<user_id>:<YYYY-MM-DD>`. Two runs on one day (Cloud Scheduler's retry
   of a failed route, a manual run) send one mail: Resend answers the second from the
   first. The next day's try is a new key, so a count that changed in between is no
   conflict at Resend. What is left: a mail Resend took but whose answer was lost twice
   may go again the next day. The marker is written with `ON CONFLICT DO NOTHING`.
8. **kastlan's overdue mail reads its events from the state, not from the run.** An event
   is a company's invoices that became overdue on one day: the invoices still `OVERDUE`,
   not deleted, whose due date + 1 is that day. It is owed while that day is at most 3
   days back. **The mail's count is the event's**, not the company's total: "3 invoices
   of <company> became overdue on 13.10.", counting the event's invoices still overdue at
   the send. An invoice entered after its due date is `OVERDUE` from the start, but its
   event day is still its due date + 1, which is usually outside the window: no mail,
   which is right (a CSV import of old invoices doesn't flood the staff's inboxes).
   `mark_overdue` stays as it is (no `RETURNING`). The `invoices-overdue` job splits into
   a mark step and a mail step: the run at start runs the mark step only, and the
   scheduled run mails what is owed, whoever marked it; no new job, no new scheduler.
   §5.2.6 is amended so.
9. **In an app with no inbox, the digest's marker is written when the send answered
   True**, not when the mail is handed to the mailer, so a digest by mail follows
   decision 6. No app has one; keksdose's marker stays on its inbox row. §3.4 is amended
   so.

### 9.3 `work_transferred` and the former owner's notice (Kurvenschmiede)

```python
NotificationType("work_transferred", app=None, email=False, quiet=False)  # after team_added
```

`quiet` is moot without push; `False` marks it person-sent, as `share_granted`. It goes
into KS's registry after `team_added` (`domain/models/notification.py:44-48`).

**When:** in `admin_service.transfer`, once `transfer_rows` has answered `moved`, and only
when a count is above 0:
- **The type's mail, to the recipient**, through KS's plan (`plan_delivery(…,
  is_actor=recipient.id == actor.id, keeps_inbox=False)`): nothing when the recipient is
  the actor, or when the plan says so (the switch off, which is the default, or the
  address unconfirmed).
- **The notice, to the former owner**, only when the source account is active and a
  person (`is_active`, `is_person`) and is not the actor. It has no switch, so no plan:
  §3.3 step 1 holds for it, as for every service notice, and it goes to the address as
  KS's other account mail does, confirmed or not.
- Never from the erasure's hand-over (it calls `transfer_rows`), never to a grantee.

Both are rendered in the request and armed with `email.send_after_commit` (decision 4's
way (iii)), as KS's three types are: the request's commit sends them, after the answer,
and a rollback drops them. The type's mail goes under `kind="work_transferred"`, the
notice under `AccountNoticeKind.WORK_TRANSFERRED_NOTICE` (`"work_transferred_notice"`),
which KS's `MailKind` takes as it is (`infrastructure/email.py:106`). Where a route sends
after its own commit instead (way (i)), the rendered mail is an `Outgoing` that `deliver`
sends, and both live in `infrastructure/email.py` beside `send`, not in
`password_reset_service.py:202-242` where they are today.

**The words** (KS's, in seven languages; English here). Both mails link
`app_link("/dashboard")`, the start page of a signed-in person
(`frontend/src/shared/lib/nav-items.ts:14`), not `app_link()`, which is the landing.
- The card: "Work handed on to you"; description "When an administrator hands someone's
  work on to you."
- The type's mail, a `MailText` through `render_mail(…, unsubscribe=…)`:
  - subject: "Work handed on to you in Kurvenschmiede"
  - intro: "Hello {name},"
  - body: "{actor} has handed {owner}'s work on to you: {kinds}. It is yours now. Whoever
    it was shared with keeps their access, and the shares are now yours."
  - cta: "Open Kurvenschmiede"
  - outro: "Questions about it go to {actor}."
  - then the footer line with the unsubscribe link (§3.6), naming the type "work handed
    on to you".
- The notice to the former owner, a `MailText` through `render_mail(…)` with no
  `unsubscribe`:
  - subject: "Your work in Kurvenschmiede was handed on"
  - intro: "Hello {name},"
  - body: "{actor} has handed your work on to {recipient}: {kinds}. It is theirs now.
    Whoever it was shared with keeps their access."
  - cta: "Open Kurvenschmiede"
  - outro: "Questions about it go to {actor}."
  - no footer line: an account notice has no switch to turn off (§2.8).
- `{kinds}`: KS's page names of the kinds that moved, plural, in `WORK`'s order, joined
  by the language's separator (", "; zh "、"): "projects, curves, gears". Six page names
  and a separator per language, new in KS's mail words. `share_granted`'s singular nouns
  are the same page words ("a curve", "a hysteresis"; `_KINDS`,
  `notification_service.py:372-433`, as KS's 0.36 adoption built them), not
  `access.KINDS`' nouns ("Setpoint session", "Hysteresis set"; `access.py:104-109`).
- `{actor}`, `{owner}` and `{recipient}`: each name in the **reader's** order of names
  (server-kit `full_name(first, last, reader.locale)`, as KS's `_name_of`,
  `notification_service.py:333-336`), not `display_name`, which is the named account's
  own order. An empty name reads "An administrator" for the actor and "a colleague" for
  the others.
- Never a title, a count or an address (decision 3).

### 9.4 A notification mail that failed to send

**The rule** (decisions 5–7), for a job that sends notification mail:
1. Each scheduled run reads the events still due (`mail_due`), and for each its
   recipients by §3.3's plan, read again at every try: a switch turned off, an address
   no longer confirmed, an account deactivated or a role lost since the event, and
   nothing goes.
2. A recipient with a marker for (type, event) is skipped.
3. The send to the provider carries `Idempotency-Key: <MailMarker.idempotency_key(today)>`
   (a request header to Resend, not a mail header).
4. Sent: the marker, `ON CONFLICT DO NOTHING`, committed per recipient. Not sent: logged
   with the type and the event, never the address; nothing written; tried again at the
   next scheduled run while due.
5. Only the scheduled run sends. A run at the app's start does the job's other work and
   sends no mail (kastlan: the start runs the mark step only, §9.6).
6. The same job deletes markers older than `MAIL_MARKER_RETENTION` (30 days).

A request's mail is tried once, after the commit, and a failure logged (decisions 4, 5).

**What the app stores** (kastlan, the one app whose job sends notification mail):

```sql
notification_mail_sent (
  user_id  <users' key> NOT NULL REFERENCES users ON DELETE CASCADE,
  type_id  VARCHAR(40) NOT NULL,
  event    VARCHAR(64) NOT NULL,
  sent_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, type_id, event)
)
```

It goes with the account and is not in the export: it is a delivery record, as the
mail's log lines are. It has no RLS policy: only the job reads and writes it, with the
bypass.

### 9.5 Build

**server-kit 0.10**, layer 1, no new dependency:
- `notifications/retry.py`, re-exported from `notifications`:
  - `MAIL_LATE_DAYS = 3`; `MAIL_MARKER_RETENTION = timedelta(days=30)`;
    `MAIL_EVENT_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9:._-]{0,63}$"`.
  - `mail_event(*parts: str | int | date) -> str`: the parts joined with `:`, a date as
    ISO; `ValueError` outside the pattern or for an empty part. kastlan:
    `mail_event(company_id, day)` → `"42:2026-10-13"`.
  - `MailMarker(user_id: int | str, type_id: str, event: str)`, frozen; `ValueError` for a
    type id outside `TYPE_ID_PATTERN`, an event outside the pattern, or a string user id
    with a colon or a space in it. `.idempotency_key(day: date) -> str` →
    `"invoices_overdue:42:2026-10-13:17:2026-10-14"`.
  - `mail_due(event_day: date, today: date, *, sent: bool, late_days: int =
    MAIL_LATE_DAYS) -> bool`: not sent, and `today` is 0 to `late_days` days after
    `event_day`; a future `event_day` is not due.
  - A `datetime` where a day is meant is a `TypeError` in `mail_event`, `mail_due` and
    `.idempotency_key`: its time would make every run a new event and every try a new key.
- `mail`, additive:
  - `MailMessage.idempotency_key: str | None = None`: 1–256 printable ASCII characters
    with no space, else a `ValueError`. `ResendClient` sends it as the `Idempotency-Key` of
    both tries instead of the random `{kind}-{uuid}`; `ConsoleMailer` ignores it.
  - A third account notice (decision 2): `AccountNoticeKind.WORK_TRANSFERRED_NOTICE =
    "work_transferred_notice"`, to an active former owner when an admin hands their work
    on (§9.3; KS only today). The words stay KS's.
- `timing`'s docstring as decision 9; the README's `notifications` section gains "a
  failed send", and `mail`'s the third notice; CHANGELOG.
- Tests, at 100 %: the window's edges (day 0, day 3, day 4, a future day, `sent`); the
  key's shape and each refusal; `mail_event` with a date and an int, an empty part, a
  space; Resend's request with the field and without it; the third notice's value.
- Also in 0.10, from the apps' 0.36 adoptions (not §9 decisions): `notifications.
  should_reap(failure_count, *, limit=PUSH_MAX_FAILURES)`, decision 7's "10 in a row" as
  one call (keksdose); `settings.apply_patch(None, …)` when every sent field is skipped
  (kastlan).

The exported names: `MAIL_LATE_DAYS`, `MAIL_MARKER_RETENTION`, `MAIL_EVENT_PATTERN`,
`MailMarker`, `mail_due`, `mail_event`, `should_reap` (from `notifications`);
`MailMessage.idempotency_key` and `AccountNoticeKind.WORK_TRANSFERRED_NOTICE` (from
`mail`). Size: S.

**ui-kit 0.37:** nothing in `src/`. `work_transferred` is one app's type, so its words
stay KS's (§2.1). The showcase's KS sample gains it as a fourth row, off
(`showcase/src/sections/notifications.tsx:206-225`). The notice has no switch, so no
card. Size: XS.

**Checked at the build** (Resend's docs: "Idempotency keys", "Send email", "Errors"):
- A key is kept 24 hours and is 1–256 characters; any other is a 400
  `invalid_idempotency_key`.
- The same key with the same body gets "the same response", and nothing is sent again.
  The docs give no status code for it and don't say outright that it carries the first
  mail's id.
- The same key with another body is a 409 `invalid_idempotent_request`; the same key
  while the first request still runs is a 409 `concurrent_idempotent_requests`.
- `ResendClient` reads a 409 as not sent and doesn't retry it. So a second run on one
  day that meets the first still running writes no marker, and the first run writes it.
  A same-day retry with a changed count, after a send whose answer was lost, is a 409
  too: no marker, and the next day's key sends it again (decision 7's case of what is
  left).

### 9.6 Per app

**Kurvenschmiede** (on its 0.36 adoption, §5.3):
1. The registry gains `work_transferred` after `team_added`, off
   (`domain/models/notification.py:44-48`).
2. The hook in `transfer` (§9.3): the type's mail through KS's plan (`_tell`,
   `notification_service.py:176-187`) and the notice to an active former owner, both
   armed with `send_after_commit` (`infrastructure/email.py:216-236`). No route change:
   `transfer_work` (`admin_router.py:319-339`) commits at request end, and the listener
   sends then. KS's three types already send so, the loop's `--resolve` at its own
   commit (`feedback_loop.py:364-365`).
3. The words: the card's in the frontend catalogue; the type's name for the footer
   (`_TYPE_NAMES`, `notification_service.py:470-507`); the two `MailText`s in seven
   languages, with the six plural page names and the separator; the mail-language test
   renders both in each. `share_granted`'s nouns are the page words already (`_KINDS`).
4. Tests: no mail when nothing moved, to an admin who takes the work, from the erasure,
   to a grantee, with the switch off (the default) or the address unconfirmed, or when
   the transaction rolls back. The notice goes to an active former owner whatever their
   switches and whether or not their address is confirmed, and not to a deactivated one,
   to an admin who hands on their own work, or from the erasure. Neither mail carries a
   title or a count, and the notice carries no unsubscribe.

**kastlan** (on its 0.36 adoption, §5.2, which holds the overdue mail for this section):
1. §5.2.6 as decision 8 amends it: `mark_overdue` unchanged. The `invoices-overdue` job
   (`infrastructure/jobs.py:55-62`) splits into a mark step and a mail step,
   `send_overdue_mail(session, today)`. The route and the local scheduler run both; the
   start runs the mark step only (`STARTUP_JOBS`, `jobs.py:112-113`). No new job and no
   new scheduler entry.
2. Each run: the events of the last 3 days, by company and day (the invoices still
   `OVERDUE`, not deleted, whose due date + 1 is that day), each keyed
   `mail_event(company_id, day)`; then §9.4's rule for each staff recipient, the role
   checked in the event's company. The count is the event's invoices still overdue at the
   send, never the company's total: "3 invoices of <company> became overdue on 13.10."
3. The marker table (§9.4) and its migration, with no RLS policy; the job reads and
   writes it with the bypass, as every job does.
4. kastlan's own `send_email(…, idempotency_key=None)` (`infrastructure/email.py:54`): the
   `Idempotency-Key` request header on its Resend POST (:79-103), nothing over SMTP
   (:106-130). The mail stays on kastlan's transport, not the kit's `ResendClient`.
5. Tests: a failed send goes at the next run and a sent one doesn't; two runs on one day
   send once; four days late, nothing; a start run sends nothing; an invoice entered
   after its due date, its event day outside the window: nothing; a switch off, an
   unconfirmed address, a tenant: nothing; staff in two companies: one mail each; the
   count is the event's; markers past 30 days go.

**keksdose:** nothing. It sends no notification mail: every type, the digest included,
goes to its inbox and push through `_deliver_to_user` (`push_notifications.py:367-409`),
and push is not retried (decision 5). `MailMessage.idempotency_key` defaults to `None`,
so its `send_email` (`infrastructure/email.py:62`) keeps the kit's random key.

### 9.7 Reviews and decisions

keksdose (at `c90d068e`), kastlan (at `0e8bd2c`) and Kurvenschmiede (at `bcadab6`)
reviewed the draft on 2026-10-13, and Marcel took its open questions on 2026-10-14 ("Do
0.37 as recommended"). Where each point went:
- **Marcel:** N1 `work_transferred` off by default, to revisit when billing is on →
  decision 1; N2 the former owner named, in the recipient's order of names → decision 3,
  §9.3; N3 an active former owner told by an account notice, server-kit's third
  `AccountNoticeKind` → decision 2, §9.3, §9.5; N4 a job's mail owed 3 days and retried,
  a request's tried once → decision 5.
- **Kurvenschmiede:** A1 (a background task runs before the request's commit; the three
  ways; no route body behind the kit's router) → §9.1, decision 4, §9.3, §9.6; A2
  (`{kinds}` are the page names, and `share_granted`'s nouns too) → decision 3, §9.3,
  §5.3; A3 ("the work in their lists" dropped as a reason) → decision 5; A4 (`Outgoing`
  and `deliver` in `infrastructure/email.py`; "no other state change", since `send_mail`
  mails) → §9.1, §9.3; (a) off → decision 1; (b) the former owner named → decision 3; (c)
  no counts → decision 3; (d) an active former owner told → decision 2, §9.3; (e) the
  link `/dashboard` → §9.3; (f) not as drafted (A1); decision 5's split right for KS →
  decision 5.
- **kastlan:** (a) decision 8 and the event key `<company_id>:<due date + 1>` → decisions
  6, 8; the count is the event's, with its day → decision 8, §3.6, §5.2.6, §9.6; an
  invoice entered after its due date sends nothing → decision 8, §9.6; (b) one job, a
  mark step and a mail step, the start marking only → decision 8, §5.2.6, §9.6; (c) no
  RLS on the marker → §9.4, §9.6; (d) its own `send_email(…, idempotency_key=)` → §9.6;
  the split right for kastlan → decision 5.
- **keksdose:** (a) nothing to build → §9.6; (b) decision 9 doesn't reach it → decision
  9; the cites (`email.py:17-19`, `_deliver_to_user`, the reap in `push_service.py`) →
  §9.1.

The cites were re-read at settling, after each app's 0.36 adoption (§9.1).

## 10. Round 0.46: the inbox and bell, switches per channel and device, the zone on the account, a queue — SETTLED (round 0.46)

**Settled 2026-10-19** (Marcel, after the keksdose, kastlan and Kurvenschmiede reviews in
audits/round-047/reviews.md "Notifications §", and his decisions in the KS session). Each
part below ends with a **Settled** block that overrides its proposal where they differ;
the reviews' corrections are folded into "Today", re-checked at ka `feat/kit-0.45`
26a2eaa, kk `feat/feedback-loop-80-424-434` 23c18e71 and KS `feat/kit-0.45` 2b2bdab.
§10.6 amends the push rotation route; §10.7 records the reviews and the settle. Built for
**ui-kit 0.46 / server-kit 0.16**.

As drafted: Marcel, 2026-10-19 (audits/round-047/brief-047.md,
"Scope extension"): "Notifications: ALL". The four items §7 left for later, taken up
together: (a) the kit's inbox list and top-bar bell; (b) a switch per channel (in the app,
push, e-mail) and per device; (c) the time zone on the account, which **reverses decision
6** (and Marcel's KS decision of 2026-10-12 that an account keeps no zone); (d) a queue
that holds a push through quiet hours and sends it after, and bundles several mails into
one. Feedback's admin alerts (feedback §11) are the first new type to use (a)–(d). §1–§9
stand until this is settled; each part says what it amends.

Read at kk `2cb460c1` (`feat/feedback-loop-80-424-434`), ka `26a2eaa` (`feat/kit-0.45`),
KS `2b2bdab` (`feat/kit-0.45`), server-kit `a264f7f` (0.16.0), ui-kit `d9b8779`. Paths as
in §1 (kk `backend/keksdose/`, ka `kastlan/`, KS `backend/kurvenschmiede/`, and
`frontend/src/` in each); SK = `src/eifi1_server_kit/`.

### 10.1 (a) The inbox list and the bell

**Today.**
- **keksdose** is the only app with an inbox, and **it has no bell in the bar any more**:
  the inbox moved into Settings (kk feedback #140/#141). The bar is search · theme ·
  feedback · tours · sync · dev · account (`app/top-bar.tsx:83-169`, order comment
  :88-90). The unread count is a danger dot on the account avatar
  (`app/account-menu.tsx:365-378`, from `useInboxUnreadCount()` on the always-mounted
  trigger, :335-341) and a count chip ("99+") on the menu's Notifications row (:146-171).
  - The list (`features/auth/notification-inbox.tsx:67-179`): an icon per type
    (`TYPE_ICONS` :44-56, `Bell` fallback :141), absolute dates (`formatDateTime`,
    :78-80), mark one read on click or middle-click (:84-86, :153-170), mark all
    (:99-108), clear behind `useConfirm` (:109-127), `EmptyState` inline (:133-134), a
    scrolling box capped at `min(24rem,70vh)` with no paging (the API's 50, :132). It is
    the first card of `/settings/notifications` (`settings-page.tsx:168-200`); on a
    phone it is the same page.
  - Data (`shared/push/use-inbox.ts`): keys `["push-inbox", …]` (:24-30); the badge
    reads `limit:1` every 60 s (:34-44); the list polls 60 s while mounted (:47-55);
    mark-read and clear are optimistic (:70-95, :97-117); the service worker's
    `PUSH_RECEIVED` / `PUSH_NAVIGATE` invalidate the inbox (`app/use-sw-messages.ts:50-59`,
    :68-70).
  - Server: `GET /notifications/inbox` (limit 50, 1–200), `POST …/read`, `DELETE`
    (`adapters/api/notifications_router.py:171-199`); `notification_log`
    (`domain/models/push_subscription.py:152-174`); the unread count over all pages and the
    90-day prune (`domain/services/notification_log_service.py:56-81`, :108-114; run by
    `infrastructure/scheduler.py:225-251`).
- **kastlan** has no inbox and no bell. Its `app` channel is a browser poller: every 30 s
  `GET /notifications/poll` (staff), which counts live rows for the acting company and
  answers a card per type with its `app` switch on (`adapters/api/notification_router.py:14-28`,
  `domain/services/notification_service.py:42-67`); the client shows a card again only
  when a count changed, tag `kastlan:<type>` (`shared/hooks/use-notifications.ts:52-90`;
  wired `app/app-layout.tsx:69-72`). Only `invoices_overdue` has a job and an event key
  (`overdue_mail.py:91`, :151-170); `dunnings_pending` is a live count of CREATED
  dunnings (`notification_service.py:49`), with no job and no event. The stored `app=true`
  rows came from `users.browser_notifications` (`alembic/versions/a24ed3308f70`), so
  they opted into desktop alerts, and the poller is kastlan's only OS-level alert.
- **Kurvenschmiede** has e-mail only; no inbox, push or bell
  (`domain/models/notification.py:1-35`; `notification_service.py:49-50`).
- **The kit:** `inbox.py` holds the wire shapes (`InboxItem`, `InboxResponse`,
  `InboxMarkRead`, `INBOX_RETENTION`, SK `notifications/inbox.py:25-62`); `TopBarActions`
  has no slot for a bell (`src/shell/top-bar-actions.tsx:38-51`; top-bar §2.1).

**Proposal.**
1. **ui-kit lifts keksdose's list as `NotificationInbox`**, and adds a
   **`NotificationBell`** for the bar. **Rec:** props only, no data layer, as the other
   cards (§4.2): `items`, `unreadCount`, `loading`, `onMarkRead(ids | null)`, `onClear()`,
   `onOpen(item)` (marks it read, then the app routes to `item.url`), `icon(type)` (the
   app's map, `Bell` by default), `hasMore` / `onLoadMore` (a "Show more" row; the API
   pages already), `formatDate`, `labels`. Dates as today, absolute, through the kit's
   `formatDate` in the account's zone (10.3). Unread rows are bold with a dot; "Mark all
   read" and "Clear" (confirm, danger tone) in the header.
2. **The bell:** an icon button with the unread count as a badge ("99+"), opening the
   list in the kit's top-bar popover (`TopBarActionMenu`, a sheet on a phone as the other
   bar menus), the newest 20 and a link "All notifications" to the app's inbox page or
   card. **Rec: one new slot `notifications`, right before `account`** (after `platform`):
   the person's own items end in the bell and the avatar, as most apps place them.
   top-bar §2.1 gains it. Shown to every signed-in account in an app that keeps an
   inbox, the demo included (settings §4.1 shows the demo its inbox).
3. **One badge per signal.** **Rec:** the bell replaces keksdose's avatar dot; the
   menu's Notifications row keeps its link but drops its count. Open: keksdose moved the
   inbox out of the bar in #140/#141. The review says why, and whether a bell brings back
   what that change removed.
4. **Refresh:** the app polls as keksdose does (badge 60 s, `limit:1`) and invalidates
   on its worker's push message. The kit exports `INBOX_BADGE_INTERVAL = 60_000` and
   nothing else.
5. **server-kit, layer 2 (new):** `InboxStore` (a port: `add`, `page(user, limit,
   offset) -> (items, unread)`, `mark_read(user, ids | None) -> int`, `clear(user)`,
   `prune(before)`) and `inbox_router(store, deps)` with §3.7's three routes, so a second
   app keeps an inbox without writing them. keksdose may keep its own routes (same wire).
6. **Who keeps an inbox. Rec:** keksdose (as today) and **kastlan**. kastlan's two staff
   types become inbox rows written by the daily job, one per company event
   (`invoices_overdue` already has the event key, §9.4). The poller then goes, and its
   `app` switch means "in the app" as it does in keksdose. **KS: no inbox**: its five
   types are e-mail, and an inbox for them alone adds a table and a bell with little
   in it. This is a review question for KS.

**Split and size** (as drafted). ui-kit **M** (`NotificationInbox`, `NotificationBell`, the slot, the
labels in seven languages, showcase). server-kit **S** (`InboxStore`, `inbox_router`,
tests). kk **S** (swap its list for the kit's, bell in, avatar dot out). ka **M** (table,
store, the job's rows, bell, poller out). KS none.

**Settled (2026-10-19).**
- **The list as proposed (1, 4, 5).** `NotificationInbox` formats through the `formatDate`
  it is given: the app's own, which keeps the device's zone in keksdose (as today), and
  `icon(type)` falls back to `Bell` (kk's `TYPE_ICONS`). A row may carry a `company` label
  (below).
- **The bell is optional per app (2, 3 amended).** The kit ships `NotificationBell` and the
  `notifications` slot before `account`; an app leaves the slot empty. **keksdose keeps
  its avatar dot and the menu row's count** (#140/#141 decluttered the action row) and
  takes only `NotificationInbox`. "One badge per signal" holds: an app shows the bell or
  the avatar dot, never both.
- **Who keeps an inbox (6 amended).** keksdose as today. **kastlan: an inbox for
  `invoices_overdue` only**: the 00:10 job writes one row per (user, type, event), with
  the mail's `event.key`, in **a loop of its own**, not the one that mails
  (`overdue_mail.py:151-170`; kastlan build review 2, S10): that loop's `_recipients`
  (:95-116) keep only the e-mail switch and `email_verified`, skip events already mailed and
  `continue` on a failed send, so an app-on, mail-off person (the inbox's own case) would get
  no row and a failed mail would drop it. The inbox's recipients: the app switch on, active,
  non-demo, staff in the event's company; (user, type, event) is the table's unique key. The
  row carries a plain `company_id` column (not `CompanyMixin`, from which kastlan builds
  RLS), **account-scoped with no RLS** like `notification_mail_sent`
  (`domain/models/notification.py:38-39`, which has no `company_id`); the list holds every company's rows, each
  naming its company, and opening one in another company switches the acting company
  first. `dunnings_pending` gets no row: it stays a live count on the poller. **The
  poller stays** as kastlan's OS-level alert until its push step, fed from the inbox rows
  (and the live dunnings count) instead of its own query, and goes then. kastlan shows
  the inbox in the bell (it has no avatar dot). **KS: no inbox**; it takes the list the day
  it has an in-app type worth a row.

### 10.2 (b) A switch per channel and per device

**Today.**
- **keksdose:** one `enabled` per type and account (`NotificationPreference`,
  `domain/models/push_subscription.py:103-119`; migration
  `alembic/versions/20260729_0035_notification_preferences.py:42-53`), gating inbox
  **and** push together (decision 2). The registry has `app=` defaults and `quiet=`, no
  e-mail (`push_subscription.py:34`, :39-70). The device rows (`push_subscriptions`,
  :73-100) hold no switch.
- **kastlan:** `(app, email)` per type and account (`notification_type_settings`,
  `domain/models/notification.py:12-28`; `alembic/versions/a24ed3308f70_notification_type_settings.py:29-58`);
  `app` gates the poller. No push.
- **Kurvenschmiede:** `email` per type (`notification_preferences`,
  `domain/models/notification.py:67-76`).
- **The kit:** `NotificationType(id, app, email, quiet)` (SK `notifications/registry.py:41-60`),
  `TypeSwitches(app, email)` (`resource.py:76-83`), `plan_delivery` (`delivery.py:53-62`)
  sends the push wherever `app` is on.

**Proposal.**
1. **Three channels with a switch each: `app` (in the app: the inbox, kastlan's poller
   until 10.1), `push`, `email`.** This amends decisions 2 and 3. `TypeSwitches` and
   `TypeSwitchesPatch` gain `push: bool | None`, which is `null` where the app or the type
   has no push (kastlan, KS). `NotificationType` gains `push: bool | None`, the type's
   push default; a registry built with `push=None` on a type that has `app` set gets the
   `app` default (so keksdose's types keep their behaviour).
2. **Push no longer needs the inbox. Rec: independent.** Push on with in-app off sends
   the push with no inbox row. The person asked for that; the payload carries its own
   `url`. `plan_delivery` returns `push = switches.push and not (quiet and quiet_now)`.
3. **Per device: a device can mute types, never add them. Rec:** each push device keeps
   `muted_types` (a list of type ids, empty by default). A push goes to a device when the
   type's account `push` switch is on and the device does not mute it. Wire:
   `GET /notifications/devices` items gain `muted_types: string[]`;
   `PATCH /notifications/devices/{id} {"muted_types": [...]}` (the whole list; a 422 for
   an id the account doesn't receive or one without push; another account's device is a
   404). Ids the registry dropped are ignored when read and removed on the next write.
   The inbox and e-mail are per account, not per device.
4. **Migration.**
   - keksdose: each stored `enabled` becomes `app = push = enabled`. A missing row stays
     missing, so both channels keep the default. The `/push/*` aliases' body shim
     (decision 9) writes both too.
   - **Rec:** while an old bundle can still send `{app}` alone, keksdose's PATCH treats
     `app` without `push` as both: a server-kit knob `couple_push_to_app=True`. It goes
     with the aliases, once no `/push/*` request arrives (§5.1).
   - kastlan, KS: nothing stored moves (`push` is `null`).
   - `muted_types` starts empty everywhere.
5. **The card:** a type's row shows its label and description, then a switch per channel
   the type offers. On a wide screen these are three narrow columns headed "In the app" /
   "Push" / "E-mail"; on a phone they stack under the label. A row with one channel keeps
   today's single switch (KS). In the device list, each row gains "Types on this device"
   (a disclosure listing the types with push on, each a switch, all on by default).
   `emailUnverified` and the digest cadence stay as they are.

**Split and size** (as drafted). server-kit **S–M** (the field, the resource, `apply_switches_patch`,
`plan_delivery`, `device_receives(muted, type_id)`, a `PushDeviceUpdate` model, tests).
ui-kit **M** (the types card's columns, the device disclosure, labels). kk **M** (the
column, the migration, the device column, routes, the shim knob). ka **XS** (answers
`push: null`). KS **XS** (the same).

**Settled (2026-10-19).**
- **Three channels and per-device `muted_types`, as proposed (1–5)**; push independent of
  the inbox (Open 1), mutes per device (Open 2).
- **An app-level "no push" (1 amended).** Rule 1's "push=None takes the app default"
  would turn kastlan's types (`app=False`, `notification_types.py:22-24`) into
  `push: false`. So `NotificationTypes(..., push_channel=False)` declares an app with no
  push: every type's `push` is **`null` (not offered)**, never `false`, and a PATCH that
  sends `push` gets a 422. kastlan and KS declare it; kastlan's
  `StoredSwitches(app, email)` (`notification_settings_service.py:52`, :71) takes the
  defaulted `push`, and the unset-row delete (:75-77) holds.
- **`data.inbox: false` (2 amended).** keksdose's worker skips the OS notification while a
  window has focus, on the assumption that the inbox holds it (`sw.ts:253-256`). With push
  on and in-app off that showed nothing. server-kit's `PushData` gains `inbox: bool`
  (true by default), `false` when no inbox row was written, and the worker shows the
  notification then even when focused.
- **The receivable filter on read and PATCH.** A resource answers and accepts only the
  types the account can receive (`TYPES.receivable(...)`). KS's `settings_of` answers
  every type to everybody (`notification_service.py:124-127`); with `feedback_received`
  (an ADMIN's type) it adds the filter to the read and to the PATCH's validation, as
  kastlan's resource does.
- **E-mail as a channel in keksdose (its first notification mail, feedback §11):**
  `send_email` gains a `headers` parameter (`infrastructure/email.py:62`) for
  `List-Unsubscribe`; the unsubscribe routes and the `/unsubscribe` page (§3.6) come in
  the same round; the verified-address gate reads `User.email_verified` (`user.py:210`).
  The token's key is a secret of its own, not derived from `jwt_secret`, so rotating the
  JWT secret does not void the "never-expiring" links (kastlan's derives from it,
  `notification_mail.py:42`; it may move later).
- **The mail-kind guard covers enum kinds.** keksdose's guard (`tests/unit/test_metrics.py:1057-1069`)
  reads string literals only, so kinds passed as `str(enum)` (the billing kinds,
  `feedback_published`) and notification mails keyed by type id slip past
  observability §5.6. kk fixes its guard to resolve enum kinds and type ids.

### 10.3 (c) The time zone on the account (amended 2026-10-20, Marcel: automatic only)

**Today.**
- **keksdose:** the zone is on `notification_settings.timezone`
  (`domain/models/push_subscription.py:181-208`). It is used for quiet hours
  (`notification_preferences_service.py:187-200`, through `resolve_zone`, which falls
  back to Zurich) and the digest (`push_notifications.py:1092-1119`). **Billing mails
  read it but fall back to UTC, not Zurich** (`billing_notice_service.py:183-188`), so
  they disagree with `resolve_zone`. Days written by the server
  (`domain/server_text.py:130-145` `format_day`) go into a push body
  (`push_notifications.py:291-303`) and into mails (`account_deletion_service.py:137`;
  `billing_notice_service.py:57`, :80, :109, :139; `feedback_publish_notice_service.py:40`,
  which takes "today" in UTC, :124). The scheduled-due sweep has a known UTC/local wart
  (`push_notifications.py:938-960`). `users` has no zone (`domain/models/user.py`). The
  date format is device-only, and its comment that "no server-rendered date exists yet"
  is stale (`shared/state/date-format-store.ts:11-16`).
- **kastlan:** no zone on the account or the company (`domain/models/auth.py:24-60`).
  Zurich only for the billing notice's day (`billing_notices.py:36`, :72). Every other
  "today" is the server's `date.today()`, which is UTC on Cloud Run
  (`infrastructure/jobs.py:77`, :99, :115; `overdue_mail.py:149`;
  `invoice_logic.py:39`, :61, and more). Mail dates are always `%d.%m.%Y`
  (`formatting.py:29-35`, used in `overdue_mail.py:135`).
- **Kurvenschmiede:** no zone, by Marcel's decision of 2026-10-12
  (`billing_notice_service.py:21-24`). Its one server-written day is the billing notice's,
  in Zurich (:390-420). Notification mails carry no dates (`notification_service.py:27-33`).
  The frontend formats in the browser's zone (e.g. `features/settings/account-cards.tsx:67`).
- **The kit:** `DEFAULT_ZONE`, `resolve_zone` (SK `notifications/timing.py:48`, :77). The
  quiet-hours card sends the device's zone with the first time entered
  (`src/notifications/quiet-hours-setting.tsx:109-115`). `formatDate` takes a `timeZone`
  (`src/lib/format.ts:185-188`), but no app passes one. `ProfileUpdate` already carries
  account-wide display choices (`text_size`, `contrast`, SK `auth/schemas.py:296-330`).

**Proposal** (reverses decision 6 and KS's 2026-10-12 decision):
1. **Two fields on the account:**
   - `timezone`: the person's pick, an IANA name; `null` means "Automatic".
   - `device_timezone`: the zone a device last reported.

   The **effective zone** is `timezone`, else `device_timezone`, else the app's zone
   (`Europe/Zurich`). A name that no longer resolves counts as unset, as today.
2. **The fallback to the device.** The client reports `Intl…timeZone` as
   `device_timezone` at sign-up (`RegisterRequest.device_timezone?`) and at app start
   when it differs from the stored one (`PATCH /auth/me {device_timezone}`).
   - **Rec:** this is allowed although settings §6.2 says "never on a session start".
     That rule protects a *choice* from being overwritten, and `device_timezone` is an
     observation that never touches `timezone`.
   - With Automatic, quiet hours and the digest follow the device last used, so they
     move with someone who travels.
3. **What uses the effective zone:** quiet hours, the digest day, every date or time the
   server writes for one person (push bodies, notification and account mail, billing
   notices to a person), and "today" for a person's own reminders (kk's scheduled-due
   sweep).
   - **Not:** documents of a company or group (kastlan's letters, invoices and PDFs keep
     the app's zone) and the jobs' run times (UTC crons).
   - kastlan's UTC `date.today()` is a separate bug. **Rec:** an app-zone `today()` in
     each job, listed for kastlan's review, not part of this item.
4. **On screen. Rec:** dates use the picked `timezone` when there is one, else the
   device's (as today). The provider gains `timeZone?`, and `formatDate` uses it when the
   call gives none.
5. **The settings row.** Settings → the group that holds the language gets
   **`TimeZoneSetting`**: "Time zone", with "Automatic (this device: Europe/Zurich)" or
   one picked through `TimeZoneSelect`.
   - When the device is in another zone than a picked one, the card says "This device is
     in {zone}." with "Use it", moved from the quiet-hours card.
   - `QuietHoursSetting` drops its picker and says "In your time zone ({zone})" with a
     link to the row.
6. **Wire.**
   - `/auth/me` and `ProfileUpdate` gain `timezone` (nullable: `null` = Automatic,
     `is_known_zone`) and `device_timezone`; a PATCH null on the latter is refused.
   - The export's `account` gains both.
   - The notification settings resource keeps `timezone` for one release as an alias,
     reading and writing the account's (keksdose's old bundles). It goes with the `/push/*`
     aliases.
7. **Migration.** keksdose copies `notification_settings.timezone` to `users.timezone`.
   That stored zone was a person's pick, or the device's at the first quiet-hours entry;
   both are treated as picked. Then the column is dropped. Its billing notices use the
   effective zone, which ends their UTC fallback. kastlan and KS start with `null` /
   `null`, and the first app start fills `device_timezone`.

**Split and size** (as drafted).
- server-kit **S**:
  - `auth`: `MeResponse`, `ProfileUpdate`, `RegisterRequest`.
  - `notifications.timing.effective_zone(timezone, device_timezone, fallback=DEFAULT_ZONE) -> ZoneInfo`.
  - `settings.local_today(zone, now)`.
  - The resource's alias.
- ui-kit **S–M**:
  - `TimeZoneSetting`.
  - `useDeviceZoneReport({stored, report})`, which reports once per start when the zone
    differs.
  - The provider's `timeZone`.
  - The quiet-hours card change.
  - Labels.
- kk **M** (the migration, the billing fallback, every `format_day` caller given the
  recipient's zone).
- ka **S–M** (the columns, the overdue mail's day in the recipient's zone).
- KS **S** (the columns, the card, the billing day per recipient).

**Settled (2026-10-19): the zone on the account, reversing decision 6** (and KS's
2026-10-12 decision), as proposed in 1, 2, 5, 6 and 7, with these changes:
- **The effective zone** is the pick (`timezone`), else the **last** device's
  (`device_timezone`), else `Europe/Zurich`; a name that no longer resolves counts as
  unset. keksdose's objection (quiet hours and the digest day flip with whichever device
  was used last: a wrong OS zone, a VPN) was heard and overruled: a pick pins it, and the
  card shows the zone in use.
- **The report** goes only when the device's zone differs from the stored one, so a bench
  PC in Zurich never PATCHes on a sign-in. **A demo's device zone is ignored**:
  `useDeviceZoneReport` skips a demo, and the server ignores `device_timezone` (and
  `timezone`) from one, as KS ignores a demo's locale and appearance
  (`adapters/api/auth_router.py:249-262`).
- **What reads it (3 amended).** The overdue mail has nothing to convert: `event.day` is a
  date (`due_date + 1`, `overdue_mail.py:91`) and an overdue invoice is a company fact in
  the app's zone. Company documents and billing notices to a company stay in the app's
  zone. KS's billing notice reads the recipient's effective zone (every KS reader today
  prints the same day).
- **Each app routes its UTC "today" writers through the resolver** (`effective_zone` for
  a person's, `local_today(app zone)` for a company's):
  - keksdose: the billing mails' UTC fallback (`billing_notice_service.py:181-188`, its
    "like the digest" comment stale), the deletion mail and push
    (`account_deletion_service.py:268`, :274), the feedback notice
    (`feedback_publish_notice_service.py:124`) and the scheduled-due sweep
    (`push_notifications.py:938-960`).
  - kastlan: an app-zone `today()` (Europe/Zurich) over the **request** paths, not only
    the jobs. `utc_now` is naive UTC (`domain/services/clock.py:15-17`), the image sets no
    TZ (`deploy/Dockerfile.backend:20`), and there are 50 `date.today()` sites. The jobs
    run at 00:10/03:00/03:30 UTC (`infrastructure/jobs.py:119-125`), when UTC's date is
    Zurich's; the bug is in requests after 22:00 (summer) / 23:00 (winter) UTC: an
    invoice's status (`invoice_logic.py:39`, :61), dunning dates
    (`dunning_repository.py:86-87`), journal entries (`journal_entry_service.py:474`,
    :494, :518), report defaults and the PDFs' `generated_date` (`accounting_router.py:373`,
    :384, :459), deposits (`deposit_service.py:143`, :150).
  - KS: the billing notice's day per recipient.
- **On screen (4, Open 5) per app.** The provider's `timeZone?` is optional and applies to
  timestamps only; bare dates are never shifted (they render in UTC on purpose, kk
  `shared/components/ui.tsx:58-80`). keksdose passes none (timestamps follow the device);
  kastlan and KS may.

**Amended 2026-10-20, Marcel: automatic only.** This overrides the Settled block above
where they differ (points 1, 4, 5, 6 and 7 of the proposal):
- **No pick, in all three apps.** The account's zone is ALWAYS the zone of the device last
  used (`device_timezone`), reported only when it differs (a demo's ignored), else
  `Europe/Zurich` when no device ever reported. There is no `timezone` field, no
  "Automatic" switch and no picker: `effective_zone(device_timezone, fallback=DEFAULT_ZONE)`.
- **Screens keep showing device time** (unchanged): no app passes the provider's
  `timeZone` for this; it stays in the kit for an app that ever needs it.
- **keksdose moves too** (its decision-6 zone on `notification_settings` is superseded,
  and with it build review 2's B3 "keep decision 6" row): it adds `users.device_timezone`,
  seeds it from `notification_settings.timezone` where set (a start value only; the next
  app start reports the device's), drops that column, reports the device zone
  (`useDeviceZoneReport`), and routes its UTC "today" writers and its quiet hours through
  `effective_zone(user.device_timezone)`.
- **server-kit 0.16:** `UserResponse.device_timezone`, `ProfileUpdate.device_timezone`,
  `RegisterRequest.device_timezone`, `PROFILE_ZONE_FIELDS == ("device_timezone",)`; the
  settings resource carries no zone (no alias). A `timezone` on `PATCH /auth/me`,
  `PATCH /notifications/settings` or keksdose's `/push/settings` shim (a stale 0.45 bundle
  still sends one, and the PWA keeps old bundles for days) is **ignored in 0.16** (dropped,
  never written) and **refused from 0.17** as an unknown field (422). The export's
  `account` gains `device_timezone` only.
- **The report is per account** (build review 3, KS S1): `useDeviceZoneReport`'s
  once-per-start guard is cleared when `stored` goes `undefined` (signed out) and keyed by
  the optional `account` (the user id), so a second person signed in on a shared PC in the
  same start is reported too. `report` puts the answer in the session's user (`setUser`).
- **ui-kit 0.46:** no `TimeZoneSetting` (dropped before release: a read-only row on the
  device that reports the zone would only name that device's zone);
  `useDeviceZoneReport` stays; `QuietHoursSetting` names the account's zone read-only
  (`zone` = `/auth/me`'s `device_timezone`, `null` = `fallbackZone`: "In your time zone
  (Europe / Zurich), which follows the device you last used.") and never sends a zone.
  `TimeZoneSelect` / `timeZoneOptions`, the labels `deviceZone` / `useDeviceZone`, the
  card's `timezone` prop and `NotificationSettingsPatch.timezone` are deprecated (0.46;
  removed in 0.47).
- keksdose's objection (the zone flips with whichever device was used last: a wrong OS
  zone, a VPN) stands as a known cost: the quiet-hours card shows the zone in use.

### 10.4 (d) A queue: hold a push through quiet hours, bundle mails

**Today.**
- **keksdose** drops a held push: the inbox row is written, then `_deliver_to_user`
  returns before the push (`push_notifications.py:379-386`, :396-399).
  - Jobs are one-shot Cloud Run Jobs (`jobs.py:1-35`, :106-151) on UTC crons
    (`infrastructure/job_registry.py:57-65`, :174-355). Notifications run daily at 06:00
    (:193-199); the most frequent job runs every 15 min (product metrics).
  - There is no token route: the scheduler calls the Run API (`deploy/gcp/cloudbuild.yaml:515-554`).
  - Markers already serve as small outboxes: `feedback_replies.notified_at`
    (`domain/models/feedback.py:129-152`, with `feedback_events.py:48-77`, :108-125),
    `digest_sent`, the `notified_*` ledgers (`push_subscription.py:124-252`) and
    `price_pool_outbox`.
- **kastlan:** Cloud Scheduler calls `POST /api/v1/ops/jobs/{name}` with `X-Jobs-Token`
  (`adapters/api/ops_router.py:35-47`). Locally APScheduler runs the jobs
  (`infrastructure/jobs.py:149-164`, `JOBS` :119-125). The mail retry markers live in
  `notification_mail_sent` (`domain/models/notification.py:31-48`;
  read at `overdue_mail.py:119-125`, written at :164-168). There is no queue table.
- **Kurvenschmiede:** one token route, `POST /ops/billing-notices`
  (`adapters/api/ops_router.py:1-55`, "nothing else on a schedule"), with one Cloud
  Scheduler job (`deploy/gcp/README.md:279-339`). Mail waits on the session and goes
  after the commit (`infrastructure/email.py:212-264`). No queue.
- **The kit:** `require_jobs_token` (SK `jobs.py:77`), the mail markers and
  `mail_due` (`notifications/retry.py:38-138`), `MailMessage.idempotency_key`.

**Proposal.**
1. **One queue table per app, a server-kit service over it (layer 2).**
   - `NotificationQueue` port: `enqueue(item) -> bool` (insert, no-op on a duplicate),
     `claim(now, limit) -> items` (`FOR UPDATE SKIP LOCKED`, sets `claimed_at`,
     `attempts += 1`), `done(ids, sent_at)`, `drop(ids, reason)`, `purge(before)`.
   - A row: `id`, `user_id`, `type_id`, `channel` (`push` | `email`), `event` (the
     `MAIL_EVENT_PATTERN` key), `payload` (JSON: push `{title, body, tag, url}`, mail the
     fields its words need, **never sealed content**), `not_before`, `created_at`,
     `claimed_at`, `attempts`, `sent_at`, `dropped`.
   - Unique `(user_id, type_id, channel, event)`.
2. **Hold a push.** A `quiet` type inside quiet hours is queued with `not_before` = the
   window's end, instead of being dropped. A new layer-1 helper,
   `quiet_hours_end(start, end, zone, now) -> datetime`, works across midnight and on DST
   days.
   - At the flush, the plan runs again: switches, active, the device's mutes, and the
     quiet hours themselves, in case the window has moved.
   - **Rec:** a type's held pushes for one person go as **one push**: the newest title,
     the body "+{n} more" when there are several, tag `<type>:held`.
   - A push held longer than `PUSH_TTL` (24 h) is dropped.
   - This amends decision 4. Announcements still ignore quiet hours.
3. **Bundle mails.** A type opts in with `NotificationType.bundle: timedelta | None`.
   - **Rec:** 15 min for `feedback_comment` and feedback's admin alert (feedback §11);
     `None` for the rest.
   - A bundled type's mail is queued with `not_before = first item + bundle`. Later items
     for the same person and type join the open bundle.
   - At the flush, one mail per (person, type): "{n} new comments on reports you follow",
     each line the sealed-free one-liner with its link. One item sends the ordinary mail.
4. **The jobs route.** server-kit `notifications_jobs_router(service, require_jobs_token)`
   → `POST /ops/notifications/flush` → `{sent, dropped, left}`. **Rec: every 15 min** in
   all three apps.
   - kastlan: a new `JOBS` entry and Scheduler job.
   - KS: its second token route and Scheduler job.
   - keksdose: a Cloud Run Job `keksdose-notifications-flush` calling the same service
     (its pattern; no token route).
   - So a held push lands at most 15 min after the window ends.
5. **Idempotency.** Enqueuing is a write in the event's own transaction, so a rollback
   queues nothing. For the bundled types the queue is also the outbox, and
   `send_after_commit` is not needed for them.
   - The claim commits before the send; `done` commits after.
   - A mail carries `Idempotency-Key = queue:<first row id>:<count>`, so a resend after
     a lost answer is a no-op at Resend.
   - A push sent twice after a crash between send and `done` replaces itself on the
     device through its tag.
   - A row claimed more than 10 min ago is claimable again. After 3 attempts it is
     dropped (`dropped = "failed"`).
6. **Retention.** Sent and dropped rows are purged after 30 days
   (`MAIL_MARKER_RETENTION`); a mail row still unsent 3 days after `not_before` is dropped
   (`MAIL_LATE_DAYS`). Rows cascade with the account and are erased with it. They are not
   in the export: they are deliveries, not the person's data.
7. **Not queued:** a request's ordinary mail (decision 5), the digest (it has its marker),
   service notices, the test push, kastlan's overdue mail (its markers, §9.4, stay as
   they are).

**Split and size** (as drafted).
- server-kit **M–L**: layer 1 `quiet_hours_end`, `bundle` on the type, the payload
  models; layer 2 `NotificationQueue`, `QueueService` (`hold_push`, `queue_mail`,
  `flush`), the jobs router, `testing` fakes.
- ui-kit **XS** (`quietDescription` says a held push "arrives when quiet hours end").
- kk **M** (table, the job, `_deliver_to_user` holds instead of dropping).
- ka **S–M** (table, route entry, Scheduler job; push only after its push step).
- KS **S–M** (table, route, Scheduler job, its bundled types).

**Settled (2026-10-19): the queue is opt-in per app** (Open 7 amended; 1–3, 5–7 as
proposed, held pushes collapsed per type, Open 6).
- **An app turns the queue on with its first queued type** and then runs **one
  15-minute tick job**, which calls the kit's `notifications_tick(service, now)` (flush,
  then purge) and the app's own small outboxes. No app runs a flush for an empty queue.
  - **keksdose** (in 0.46: the held pushes of `quiet` types, and feedback §11's crash
    mails): its existing 15-minute product-metrics Cloud Run Job, renamed the tick, runs
    the flush and `send_queued_replies` too (today that waits for the daily 06:00 job,
    `scheduler.py:248`, so a loop reply waits up to 24 h; now 15 min). No new Cloud Run
    Job or trigger; one `max_age` and alert for both concerns.
  - **kastlan:** `notifications-flush` in `JOBS` behind the existing `/ops/jobs/{name}`
    (`require_jobs_token`, `ops_router.py:39`): one auth path and one `{job, done}`
    shape, no second router. It needs an interval trigger beside the daily
    `CronTrigger`s locally and a sixth Cloud Scheduler job. Added with its first queued
    type, not before: in 0.46 it has none (overdue mail excluded, no push, feedback
    crashes in-app only).
  - **Kurvenschmiede skips it** (Marcel, KS session): no queue table, no
    `/ops/notifications/flush` route, no Scheduler job. Its mails go after their commit as
    today (`infrastructure/email.py:212-264`), `feedback_received` included.
- **`NotificationType.bundle` is ignored where no flush runs**: such an app sends each
  mail after its commit. So the kit's `notifications_jobs_router` is optional (an app
  calls the tick from its own job path), and nothing in layer 1 assumes a queue.
- **Any job that sends mail carries the mail settings.** keksdose's
  `keksdose-notifications` job ran the `console` mailer (no mail env,
  `deploy/gcp/cloudbuild.yaml`), which logs the recipient and body and answers "sent": on
  2026-10-16 two feedback-published notices were logged instead of sent and marked told.
  Fixed at kk 23c18e71 (the job's mail env; `send_email` refuses `console` when
  `KEKSDOSE_METRICS_ENVIRONMENT=prod`). The tick job takes the same env.

### 10.5 For the reviews (as asked; answered in §10.7)

- **keksdose:**
  - (a) The bell back in the bar after #140/#141, and the avatar dot gone?
  - (b) Push independent of the inbox, and the `couple_push_to_app` shim's end.
  - (c) Copying the zone to `users`, and the billing fallback.
  - (d) A 15-min Cloud Run Job, or the flush folded into an existing frequent job.
- **kastlan:**
  - (a) An inbox written by the jobs, with the poller retired.
  - (c) The effective zone in the overdue mail, and the app-zone `today()` as a separate
    fix.
  - (d) The flush route and its Scheduler job.
- **Kurvenschmiede:**
  - (a) No inbox: agree?
  - (c) The reversal of 2026-10-12, and the billing day per recipient.
  - (d) A second token route.

**Open for Marcel:**
1. Push independent of in-app (rec), or push only while in-app is on.
2. `muted_types` per device (rec), or a full per-device switch set.
3. The bell's slot before `account` (rec).
4. Automatic = the last device's zone (rec), or fill it once and never update.
5. Dates on screen in the picked zone (rec).
6. Held pushes collapsed into one per type (rec).
7. A 15-min flush in every app (rec), against the cost of a Cloud Run wake every 15 min.

Sizes in total: server-kit **L**, ui-kit **M–L**, kk **M–L**, ka **M**, KS **S–M**.

### 10.6 Amendment: `POST /notifications/devices/replace` (server-kit 0.16.0, settled 2026-10-19)

server-kit 0.16.0 ships the route's model and proof (`PushReplaceIn`, `push_auth_matches`,
SK `notifications/push.py:119-151`; ui-kit `handlePushSubscriptionChange`,
`src/notifications/push-worker.ts:145`); each app writes the route (adopt-0.46 "Push
survives a rotated subscription"). The reviews found it sound (replay is closed: the old
endpoint is gone after a replace; `compare_digest` on a 128-bit secret; an unknown
endpoint and a wrong `auth` get the same 404), and add these rules, which the kit's
docstring and the adopt row take:
1. **A signed-out or closed account keeps no pushes.** The replace has no session, so a
   device's worker could rotate its subscription forever. The app **deletes the account's
   push rows on "sign out everywhere", on deactivation (kastlan's deletion request
   deactivates, `account_service.py:191-192`) and on erasure**, and the route **refuses
   an inactive or a demo account** with the same 404 (and deletes the row).
2. **No RLS on device rows.** A device row is account-scoped (kastlan: no RLS, like
   `notification_type_settings`, `domain/models/notification.py:18-19`; the role is
   checked per company at send time). A `company_id` row under forced RLS would answer
   404 on a sessionless route. keksdose's `push_subscriptions` is FORCE RLS, so its route
   runs the lookup and the update under `bypass_rls_for` (`infrastructure/tenancy.py:130`)
   with an explicit endpoint filter, plus its per-instance limiter. No other
   unauthenticated route takes the bypass.
3. **The proof before the 409.** The route checks `push_auth_matches` on the old row
   first; only a proven device may learn that the new endpoint is "taken by another
   account" (no enumeration).
4. **The reaper's race.** A 404/410 deletes a device at once (kk `push_service.py:294-298`),
   so a push sent between the browser's rotation and the worker's replace makes the
   replace 404, and push goes off silently. The reaper **marks the row gone**
   (`gone_at`) and stops sending to it; a replace may still claim a gone row for **7
   days**; the daily reap deletes gone rows after that.
5. **A worker-safe import.** `handlePushSubscriptionChange` is only in the `@eifi1/ui-kit`
   barrel (`src/index.ts:991`), so a worker bundle risks pulling in React. ui-kit 0.46
   ships **`@eifi1/ui-kit/push-worker`** (the handler, `resubscribeAfterChange`,
   `pushSubscriptionInput`, `PUSH_SUBSCRIPTION_CHANGED`, the outcome types; no React,
   no DOM-only import); the barrel keeps re-exporting them.
6. **Logs.** Never log this route's body; its 422 answers a plain detail, never the
   input (a validation echo would hand `old_auth` back). A leaked device row (`keys.auth`
   is plaintext by necessity) is enough to redirect that person's future pushes: it goes
   in the push design's threat note.
7. Chrome often names no `oldSubscription` (`no_previous`); the gain is mostly Firefox.

### 10.7 Reviews and settle (2026-10-19)

**Marcel's answers** (2026-10-19, in this session and the KS session)
1. **Queue (Open 7):** opt-in per app; an app turns it on with its first queued type and
   runs one 15-minute tick (keksdose as its Cloud Run Job, kastlan in `/ops/jobs`); KS
   skips it (no queue table, no flush route, no Scheduler job; mails after commit as
   today); `NotificationType.bundle` is ignored where no flush runs → §10.4 Settled.
2. **Bell (Open 3):** optional per app; keksdose keeps its avatar dot; kastlan an inbox
   for `invoices_overdue` only, `company_id` without RLS, the poller stays until push; KS
   no inbox → §10.1 Settled.
3. **Time zone (Open 4, 5):** on the account, reversing decision 6 as already decided:
   the pick, else the last device's zone, reported only when it differs; a demo's device
   zone ignored; Zurich fallback; each app routes its UTC "today" writers through the
   resolver (kastlan: requests after 22/23 UTC); on-screen zone per app → §10.3 Settled.
4. **Switches (Open 1, 2):** per channel (app, push, email) and per-device `muted_types`;
   an app-level "no push" so kastlan's push is `null` (not offered), not `false`;
   keksdose's `data.inbox: false` push flag; the mail-kind guard for enum kinds → §10.2
   Settled.
5. **Held pushes (Open 6):** one per type, as proposed → §10.4.
6. **The push rotation route:** the review's rules → §10.6.
7. **Time zone, amended 2026-10-20 (Marcel): automatic only.** No pick and no picker in
   any app: the account's zone is the device last used (reported when it differs, a
   demo's ignored), else Zurich; screens keep device time; keksdose moves too, its
   `notification_settings` zone superseded → §10.3 "Amended 2026-10-20".
8. **Feedback alert mails, confirmed 2026-10-20 (Marcel):** a new report and a rework are
   mailed at once in every app, keksdose included; a crash is mailed only inside the
   bundle where an app runs the queue (keksdose). Build review 2's kk B4 ("bundle
   everything") was not his call → feedback §11 Settled 3 stands.

**Where each review point went** (each re-checked at ka 26a2eaa / kk 23c18e71 / KS 2b2bdab)

| Review | Point | Where |
|---|---|---|
| kk (a) | the kit's list matches kk's; paging (`offset`, `notifications_router.py:174`) | §10.1 Settled |
| kk (a) S | inbox times in the device's zone, not the account's | §10.1, §10.3 Settled (on screen per app) |
| kk (a) N | `icon(type)` falls back to `Bell` | §10.1 Settled |
| kk (a) Marcel | keep the avatar dot; the bell optional | §10.1 Settled |
| kk (b) | migration `app = push = enabled`, missing rows missing; the `/push/preferences` shim (`push_router.py:77`) writes both | §10.2 proposal 4 (stands) |
| kk (b) S | push swallowed while focused (`sw.ts:253-256`, the review's :252-254): `data.inbox: false` | §10.2 Settled |
| kk (b) S/N | e-mail channel: `send_email` headers, unsubscribe route and page, a key not from `jwt_secret`, `User.email_verified` | §10.2 Settled; feedback §11 |
| kk (b) S | the mail-kind guard misses enum kinds | §10.2 Settled |
| kk (c) | four UTC writers through `resolve_zone`; billing fallback's comment stale | §10.3 Settled |
| kk (c) Marcel | keep decision 6, zone later on `users` | **overruled** by Marcel's settle: the zone on the account now, §10.3 Settled |
| kk build 2 B3, S2, S3 | keep the zone on `notification_settings`; the 0.47 removal forces the move; `/auth/me` gains zone fields | **superseded** 2026-10-20 (automatic only): kk moves to `users.device_timezone`, no pick field anywhere, §10.3 Amended |
| kk (c) | Open 5 no for kk: bare dates UTC on purpose, timestamps device | §10.3 Settled (per app) |
| kk (d) | held push dropped today; the reply outbox daily; one 15-min tick (product metrics renamed) with `send_queued_replies` | §10.4 Settled |
| kk (d) B | `keksdose-notifications` on the console mailer (live, 2026-10-16); fixed at kk 23c18e71 | §10.4 Settled; feedback §11.2 rule 7 |
| kk push | sound; bypass under FORCE RLS; the reaper's race; a worker-safe subpath; Chrome's `no_previous` | §10.6 2, 4, 5, 7 |
| ka | cites: `fmt_date_de` at `overdue_mail.py:135` (not :108); markers read :119-125, written :164-168 | §10.3, §10.4 Today |
| ka | `dunnings_pending` is a live count, no job or event | §10.1 Today, Settled |
| ka | the overdue mail's day: nothing to convert | §10.3 Settled |
| ka (a) | inbox for `invoices_overdue` only, rows in the mailing loop, `company_id` without RLS, a click switches company; what breaks (the poll tests, `endpoints.notifications.poll`, app-layout.tsx:69-72, settings-page.tsx:312-354) | §10.1 Settled; build plan |
| ka (a) S | `app` was desktop alerts: keep the poller until push, fed from the inbox | §10.1 Settled |
| ka (b) | rule 1 makes kastlan's push `false`: an app-level "no push", 422 on `{push}` | §10.2 Settled |
| ka (c) | two columns plus `/auth/me`; billing stays Zurich; the request-path UTC bug, an app-zone `today()` | §10.3 Settled |
| ka (d) | no second router; `JOBS` entry, interval trigger, sixth Scheduler job; only with the first queued type | §10.4 Settled |
| ka S | `email.py:127` logs Resend's body, :153-154 the SMTP exception (both can hold the address) | feedback §11.2 rule 7 |
| ka push S | sign-out-everywhere, deactivation, erasure delete push rows; refuse inactive and demo | §10.6 1 |
| ka push S | RLS breaks the sessionless route; no bypass on unauthenticated routes | §10.6 2 |
| ka push N | proof before the 409; replay closed; a leaked row's threat; never log the body | §10.6 3, 6 |
| KS (a) | no inbox: agree | §10.1 Settled |
| KS (b) | `push: null` fine; the receivable filter on read and PATCH for `feedback_received` | §10.2 Settled |
| KS (c) | the reversal accepted; billing day per recipient; skip a demo's report; report only when it differs | §10.3 Settled |
| KS (d) | opt-in queue, `bundle` ignored without a flush; KS stays on after-commit mail | §10.4 Settled |
