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

**DRAFT for review (round 0.36), 2026-10-13.** Nothing here is built. The three apps
review it; Marcel settles what the reviews leave open; what they settle is folded into
the sections below, and the review log goes to `archive/notifications-history.md`.
Ships as ui-kit 0.36 and server-kit 0.9.

## 1. Where each one stands

Read at kk `79b2949c` (`feat/kit-0.34`), ka `f2b9574` (`feat/kit-0.35`), KS `c687637`
(`refactor/plan-2026-10`). kk paths are under `backend/keksdose/` and `frontend/src/`,
ka's under `kastlan/` and `frontend/src/`, KS's under `backend/kurvenschmiede/` and
`frontend/src/`.

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| Types | 9, each with a missing-row default (`domain/models/push_subscription.py:30-56`) | none; the poller derives two cards | none |
| Switches | one per type, gating push **and** inbox together (`push_notifications.py:31-35`) | two on `users`: `email_notifications` (default on), `browser_notifications` (default off) (`domain/models/auth.py:72-73`) | none |
| Channels | Web Push + an in-app inbox; no notification mail | a browser poller while a tab is open; no push, no inbox | none |
| Quiet hours | push only, background types only, fail open (`notification_preferences_service.py:154-181`) | none | none |
| Zone | IANA, on the notification settings row, null → UTC (`push_subscription.py:187-188`) | none; notices written in `Europe/Zurich` (`domain/services/billing_notices.py:36`) | none, by Marcel's decision of 2026-10-12; notices in `Europe/Zurich` (`domain/services/billing_notice_service.py:20-24`, `:394`) |
| Digest | a type; `weekly` (Monday) or `monthly` (the 1st) in the user's zone, from a daily 06:00 UTC job, no marker (`push_notifications.py:1094-1119`) | none | none |
| E-mail | 8 sends, all account or billing mail | 7 kinds, all account or billing; plain text, no extra headers (`infrastructure/email.py:52`) | 9 kinds, all account or billing (`infrastructure/email.py:92`) |
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
  :1118) and never the ones a person sends (share events :435, announcements :1178,
  :1213, support chat :1265). A held push is dropped; the inbox keeps the row. The author
  of a support message is never notified (:1224-1274). A deadline on a guest's data goes
  out without the type's consent (:752-786).
- **Push** (`domain/services/push_service.py`): VAPID keys per deployment, unset = push off
  (:53-59; `infrastructure/settings.py:245-247`). One row per endpoint; another account's
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
  (`notifications-card.tsx:288`); the picker lists every zone `Intl` knows, city under
  region, and keeps a stored zone the runtime doesn't list (:131, :530).
- **Export:** `data.notifications = {settings, preferences, inbox, push_registrations}`,
  never an endpoint (`domain/services/account_export_service.py:234-274`).
- **Demo:** push refused (`push_router.py:57`, :223); every notification card but the
  inbox hidden (`settings-index.ts:236`).

**kastlan:**
- **The switches** are columns on `users` (migration `beab6d6e7c9b`), in `GET /auth/me`
  (`domain/schemas/auth.py:70-71`), the admin's `UserResponse` (:192-193) and
  `ProfileSettings` (:382-396, not nullable), written by `PATCH /auth/me`
  (`domain/services/user_service.py:330-359`), exported as
  `notifications: {email, browser}` (`domain/services/account_service.py:257`).
- **`browser_notifications`** starts a poller (`app/app-layout.tsx:59-61`;
  `shared/hooks/use-notifications.ts:47-84`): every 30 s while a tab is open,
  `GET /notifications/poll`, staff only (`adapters/api/notification_router.py:12-23`).
  The server derives two company-wide counts on each poll, in English
  (`domain/services/notification_service.py:29-48`), and ignores `since`; the client sets
  no `tag` (`use-notifications.ts:64`). So the same two cards come back every 30 s while a
  count is above zero.
- **`email_notifications`** gates nothing: no mail reads it (the card says so,
  `settings-page.tsx:290-291`). The billing notices go to the company's admins without it
  (`billing_notices.py:74-78`), rightly: they are service mail (§2.8).
- **No timezone** anywhere (`users`, `ManagementCompany`); no service-worker push (the
  PWA plugin's generated worker caches only, `frontend/vite.config.ts:28-67`); no inbox.
- **The daily jobs** send nothing but the billing notices (`infrastructure/jobs.py:104-110`);
  `invoices-overdue` is a bulk UPDATE (`domain/services/invoice_service.py:46-59`).
- Languages: de-CH, en, fr, it.

**Kurvenschmiede:**
- **Nothing yet**, and no group in its catalogue. Three events reach nobody today: work
  shared with an existing account (`domain/services/share_service.py:128`, :159), an
  existing account added to a team (`team_service.py:337-345`, an audit row only), and an
  answer to a feedback report (no read state, no send; `domain/models/feedback.py:97-117`).
- Mail goes through one `send` that skips demo addresses (`infrastructure/email.py:182-189`).
- No service worker, no web manifest. Seven languages (`domain/languages.py:35`).

## 2. Decisions

All open, each with a recommendation; settings §6.1 (the PATCH rule) and user-admin §6.4
(a deactivated account is sent nothing) hold as they are.

1. **Types: each app declares its own; the kit has no list of types.**
   **Rec:** a type is an id (`^[a-z][a-z0-9_]{1,39}$`, it fits keksdose's `String(40)`), a
   default per channel (§2.3), whether it offers e-mail, and whether quiet hours hold it.
   The server's registry is the one list: `GET` answers every type the account can
   receive, and the card draws what it answers, so the client keeps no defaults
   (keksdose's `PREF_DEFAULTS` goes). **The default rule is keksdose's:** off, unless the
   type can only fire in answer to something the person did (a reply to their message, a
   row they dated forward); keksdose's two launch types stay on as shipped. A type's words
   move into the kit only when a second app declares the same type (the `DateFormatSetting`
   rule, settings §7.1). Today no two apps share one; KS's `feedback_answered` (§5) would
   be the first candidate.
2. **Channels: three — inbox, push, e-mail. An app offers the ones it has.**
   **Rec:** inbox and push are one channel to the person, **"in the app"** (`app`): the
   inbox is the record and push is how it reaches a device. That is keksdose's "consent
   governs push and inbox alike". Push has no account switch: **registering a device is
   the switch**. E-mail is the second channel. kastlan's browser poller is its `app`
   channel until it has push (§5.2), then it goes; KS starts with e-mail alone.
3. **Switches: two per type, `app` and `email`, not a full channel matrix.**
   **Rec:** a type row has its switch and, where the type offers e-mail, "By e-mail" under
   it. Each has its own default. Push and inbox are not split: nobody has asked for an
   inbox row without the push. E-mail is split because it is the costly channel, and one
   click in a mail must turn off that mail and nothing else (§3.6). A matrix per device
   or per push type is left for later (§7).
4. **Quiet hours hold push only, and a held push is dropped, not delayed.**
   **Rec:** keksdose's rule: a window of local `HH:MM` times in the account's zone, which
   may cross midnight. Within it, the push of a type marked `quiet` is not sent; the
   inbox row is written and e-mail goes as usual. Machine-sent types are `quiet`;
   person-sent ones (a share, a support reply, an announcement) are not. The window
   **fails open**: half set, start = end, or an unknown zone means no quiet hours. The
   test push ignores them. Delaying to the window's end needs a queue (§7).
5. **The digest is a type with one cadence for the account.**
   **Rec:** `weekly` (Monday) or `monthly` (the 1st) in the account's zone, default
   `weekly`, not nullable (keksdose). New: a **period marker** like billing's
   (`billing_notice_sent`, billing §14.7). The digest is due from the period's first
   local day until 3 days after it, and is sent once a period, so a missed or doubled run
   neither skips nor repeats it. Only keksdose has a digest.
6. **The zone lives with the notification settings, not on the account.**
   **Rec:** `timezone`, an IANA name, nullable. It is only for what the server does with
   no device asked: quiet hours and the digest day. **Null means the app's zone,
   `Europe/Zurich` in all three**, as both notice zones already are; keksdose's null is UTC
   today. It is written by a person's pick, or at the first quiet-hours entry from the
   device's zone (keksdose). **Never on a session start**, the rule of settings §6.2. No
   device reads it to show a date. It stays off `/auth/me` and the account: Marcel decided
   on 2026-10-12 that an account keeps no zone (KS), and nothing else needs one yet. The
   card says when this device is in another zone, and offers it (§4.2).
7. **Push devices: keksdose's rules, VAPID keys per app.**
   **Rec:** register (an upsert by endpoint for the same account, a 409 for another's),
   list, remove by id, unregister by endpoint in a body. **The endpoint never goes in a
   URL**: it is a capability. TTL 24 h, timeout 10 s. A 404/410 deletes the row at once;
   other failures count, and 10 in a row reaps the row. Each app has its own keypair
   (`<APP>_VAPID_PUBLIC_KEY`, `_PRIVATE_KEY`); `_SUBJECT` is `mailto:` the app's support
   address (`mail.support_address`), not keksdose's `admin@`.
8. **Notification mail carries one-click unsubscribe; service mail carries none.**
   **Rec:** a mail sent for a notification type carries RFC 8058's `List-Unsubscribe` and
   `List-Unsubscribe-Post` and a footer link, and goes only to a verified address. **Service
   mail is not a notification:** account mail, billing's notices (§14.7) and keksdose's
   deadline on a guest's budget. It has no switch and no unsubscribe, as today. The
   unsubscribe token is **signed, not stored**, and never expires (§3.6). It can only turn
   e-mail off, so a copy in a request log costs little.
9. **Endpoints: `/notifications/*` in every app** (§3.8).
   **Rec:** one resource, `GET/PATCH /notifications/settings`, replaces keksdose's two PUTs
   (§6.1 is about bodies; a new endpoint takes PATCH). keksdose keeps `/push/*` as aliases
   for one release, so an installed PWA's old bundle keeps working until it updates.
   `/push/preferences` would read wrong once e-mail is in it.
10. **Nothing in `/auth/me`; the export holds the settings, the inbox and the devices**
    (§3.9). **Rec:** kastlan's two fields leave `/auth/me`, `PATCH /auth/me` and its admin
    row.
11. **The kits lift keksdose's notification cards now; the inbox list waits.**
    **Rec:** ui-kit takes the types card, quiet hours with the zone picker, "this device"
    with its hook, and the device list. Only keksdose has push in this round, but the
    contract is set now and keksdose's code is the canon to lift, so kastlan's push step
    (§5.2) is wiring rather than a second round. The inbox list and bell stay keksdose's
    until a second app keeps an inbox (§7). The other way: lift only the types card and
    the unsubscribe panel now, which leaves ui-kit at M (§4.2).

## 3. The shapes

### 3.1 A type

```python
@dataclass(frozen=True)
class NotificationType:
    id: str                    # "support_chat"
    app: bool                  # default of the "in the app" switch (§2.1)
    email: bool | None = None  # None: offers no e-mail; else the e-mail default
    quiet: bool = True         # quiet hours hold its push (§2.4); False for person-sent
```

An app builds its registry once (`NotificationTypes(...)`, which refuses a bad or doubled
id) and may narrow it per account: kastlan's staff-only types are not answered to a
tenant, and a `PATCH` naming one is a 422. The card's words, groups and order are the
app's catalogue (§4.2).

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
  `email` is `null` where the type offers none. An unset switch reads as its default.
- `quiet_hours_start`, `quiet_hours_end` (`^([01]\d|2[0-3]):[0-5]\d$`) and `timezone`
  where the app has push; `digest_cadence` where it has a digest type. An app adds its own
  knobs beside them (keksdose's `low_balance_threshold`).

`PATCH /notifications/settings` under settings §6.1:

```json
{"types": {"digest": {"app": true}, "support_chat": {"email": false}, "scan_done": null},
 "digest_cadence": "monthly"}
```

1. **Omitted keeps:** a type left out of `types`, a switch left out of a type, a field
   left out.
2. **Null resets:** a type's `null` puts both its switches back to their defaults; a
   switch's `null`, that one (keksdose's `defaults=`, §6.1); `quiet_hours_*` and
   `timezone` `null` clear.
3. **Null refused (422 `not_nullable`):** `types` itself, `digest_cadence`.
4. **422:** an unknown field, an unknown type id or one this account doesn't receive,
   `email` on a type that offers none, a zone `zoneinfo` doesn't know.
5. **The answer is the whole resource**, as `GET`.

A demo account is refused (403), as every notification card but the inbox is hidden for
it (settings §4.1). The storage is the app's. keksdose's rows (one per touched type)
fit: an unset switch is a missing row or a null column.

### 3.3 Delivery

For one recipient of one type, in this order:

1. **Nobody inactive:** a deactivated account (a deletion request deactivates at once,
   user-admin §2.1), a demo, the event's own author (keksdose's live #342): nothing.
2. **`app` on:** an inbox row where the app keeps an inbox, then a push to each device,
   unless the type is `quiet` and the account is inside its quiet hours (§2.4).
3. **`email` on**, and the address verified: the mail (§3.6).
4. Both off: nothing, not even an inbox row.

The words are in the recipient's locale (settings §6.2), written by the server; an
admin's announcement goes as written. The test push skips 2's switches and quiet hours.
Service notices (§2.8) skip 2's switch and keep 1.

### 3.4 Quiet hours, the zone, the digest

- `in_quiet_hours(start, end, zone, now)`: §2.4, failing open.
- **The zone:** `timezone` or the app's fallback (`Europe/Zurich`); a stored name that no
  longer resolves counts as unset. All three images are `python:3.14-slim`, and kastlan
  and KS build `ZoneInfo("Europe/Zurich")` at import, so the zone database is there.
- **The digest** (§2.5): the period key is the ISO week (`2026-W42`) or the month
  (`2026-10`) of the local date. It is due while `sent` is not this key and the local date
  is no more than 3 days into the period. The app stores the key once it has delivered
  the digest (`digest_sent VARCHAR(16)` on its settings row), as billing's marker.

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
  can refresh its inbox and pick an icon. `url` is a path in the app (`/…`, never `//` or
  a scheme), opened by the service worker on the app's origin. A `tag` per event: a
  repeat of the same event replaces it (`digest:2026-10-12`), and distinct events don't
  (`support:<uuid>`). The encoded payload stays under 3 KB (Web Push allows about 4 KB);
  the body is cut with "…" to fit.
- The service worker shows nothing while a window of the app is focused (keksdose
  `sw.ts:252-254`); the app's own worker, not the kit's.

### 3.6 Notification mail and one-click unsubscribe

**The headers** (RFC 8058), on every notification mail and no other:

```
List-Unsubscribe: <https://<app>/api/v1/notifications/unsubscribe/<token>>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

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
public routes:
- `POST /notifications/unsubscribe/{token}`: that type's `email` off. This is what a mail
  client's one-click POST sends (`List-Unsubscribe=One-Click` as a form body, which the
  route doesn't read).
- `POST /notifications/unsubscribe/{token}/all`: every e-mail switch off (the page's
  second button).
- A valid token answers **200**, also when the switch is already off or the account is
  gone, so the answer reveals nothing. A bad token answers **400
  `unsubscribe_invalid`**. **A GET never unsubscribes:** link scanners fetch every URL.

**The page:** the footer link goes to the app's signed-out page `/unsubscribe?token=…`
(auth §7: works signed in or out). It names the type, read from the token on the client,
and offers "Stop these e-mails" and "Stop all e-mails from <app>". It then says how to
turn them back on: Settings → Notifications.

**The mail:** sent under `kind=<type id>` (the `Mailer`'s word, server-kit `mail`); the
app's words per language, with one line more: why it came and the link.

### 3.7 The inbox (an app that keeps one)

keksdose's, unchanged: one row per recipient per delivered notification (`type`, `title`,
`body`, `url`, `push_sent`, `created_at`, `read_at`), kept 90 days.
`GET /notifications/inbox?limit&offset` → `{items, unread_count}` (the badge counts every
unread row); `POST /notifications/inbox/read {ids?}` (`null` = all) → `{updated}`;
`DELETE /notifications/inbox`.

### 3.8 Endpoints

Settings §6.5 gains:

| Card | Endpoint |
|---|---|
| Types, quiet hours, zone, digest | `GET/PATCH /notifications/settings` |
| This device, devices | `GET /notifications/push-key`; `GET/POST /notifications/devices`, `POST /notifications/devices/unregister`, `DELETE /notifications/devices/{id}`; `POST /notifications/test` |
| Inbox | `GET /notifications/inbox`, `POST /notifications/inbox/read`, `DELETE /notifications/inbox` |
| Unsubscribe (no account) | `POST /notifications/unsubscribe/{token}`, `POST /notifications/unsubscribe/{token}/all` |

kastlan's `GET /notifications/poll` stays while its poller does (§5.2).

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

Pure, no database and no routes. Its source is keksdose, cited `file:line`.
- **Types:** `NotificationType`, `NotificationTypes(…)` (ids, no doubles, `.receivable(…)`
  for a per-account narrowing).
- **The resource:** `TypeSwitches`; `NotificationSettingsResponse` /
  `NotificationSettingsUpdate` for a registry (`notification_settings_models(types)`,
  like `profile_update_model`), with `QuietHoursFields` and `DigestFields` mixins.
  Subclassable for the app's knobs.
- **The PATCH:** `resolve_switches(types, stored)` (unset → default) and
  `apply_switches_patch(types, stored, update)` (§3.2's rules 1–4 for `types`; the fields
  through `settings.apply_patch`).
- **Delivery:** `plan_delivery(type, switches, *, quiet_now, active, email_verified) →
  Delivery(inbox, push, email)` (§3.3).
- **Time:** `QUIET_HOURS_PATTERN`, `in_quiet_hours`, `resolve_zone(name, fallback)`,
  `DEFAULT_ZONE = "Europe/Zurich"`, `DIGEST_CADENCES`, `digest_due(cadence, zone, now, *,
  sent, late_limit=3 days) → period key | None`.
- **Push:** `PushSubscriptionIn`, `PushDeviceResponse`, `PushPayload` (`url` checked,
  `.encode()` under the cap), `push_outcome(status) → DELIVERED | GONE | FAILED`,
  `PUSH_TTL`, `PUSH_TIMEOUT`, `PUSH_MAX_FAILURES`, `PushEndpointTakenError` (409). The
  sending stays the app's (`pywebpush`, blocking, off the event loop); the kit takes no new
  dependency.
- **Unsubscribe:** `unsubscribe_token(secret, user_id, type_id)`,
  `read_unsubscribe_token(secret, token) → UnsubscribeClaim`, `UnsubscribeTokenError`
  (400, `unsubscribe_invalid`, in `CONTRACT_ERRORS`), `list_unsubscribe_headers(url)`.
- **Inbox:** `INBOX_RETENTION` (90 days), `InboxItem`, `InboxResponse`, `InboxMarkRead`.
- **`mail`:** `MailMessage.headers`; `ResendClient` sends them; `render_mail(…,
  unsubscribe=(label, link))` adds the footer line, escaped like the rest. Adding a field
  to `MailMessage` is additive.
- Tests at 100 %: each PATCH rule, quiet hours across midnight and on DST days, the digest
  period at year and month ends, the token's round trip and each tampering, the payload
  cap.

### 4.2 ui-kit 0.36

Each part is a settings card (settings §3.7, `SettingsSection`'s anchor and heading
level). Its words are in the new `notifications` namespace, in seven languages, and it
takes `labels` to override them.
- **`NotificationTypesSetting({types, values, onChange, groups?, digest?, renderExtra?})`**:
  a `Switch` per type and "By e-mail" under it where offered. With no `app` channel
  (KS), the e-mail switch is the row's switch. `types` holds the app's words in order
  (`{id, label, description?, group?}`); a type the server answers without an entry throws
  in development. `digest: {type, cadence, onCadence}` shows the cadence under the digest
  type while it is on; `renderExtra(id)` takes the app's knob (keksdose's threshold).
  `onChange` sends §3.2's PATCH body.
- **`QuietHoursSetting({start, end, timezone, onChange})`**: two `TimeInput`s, "set both"
  while half set, and **`TimeZoneSelect`**. The first entry with no zone sends the device's
  zone with it. "This device is in <zone>" with "Use it" when the two differ.
- **`TimeZoneSelect`**: keksdose's picker. Every zone `Intl.supportedValuesOf` lists, city
  under region, the regions in the kit's words. A stored zone the runtime doesn't list is
  kept. Not clearable.
- **`PushDeviceSetting` + `usePushDevice({pushKey, register, unregister, devices, test})`**:
  keksdose's "this device" section and `usePush`. Enable, disable, test; unsupported, the
  iOS install hint, not set up, blocked, another account's subscription. The explainer
  before the browser's prompt, the 409 recovery, the timeouts, and "subscribed" meaning
  this account.
- **`PushDevicesSetting({devices, currentEndpoint?, onRemove})`**: keksdose's list (browser,
  "This device", added, last delivery, failures, remove with a confirm);
  `describeUserAgent` exported.
- **`UnsubscribePanel({typeLabel, appName, onStop, onStopAll, settingsHref})`** for the
  app's `/unsubscribe` page, and `unsubscribeTokenType(token)`.
- **Labels:** about 45 words for the cards, the 11 IANA regions (`Africa` … `Pacific`,
  `Etc`), the panel's.
- **Tests:** each card's states; the PATCH bodies; the zone rules; the dev throw. A
  showcase page "Notifications" (App chrome group).
- **Not in the kit:** the inbox list and bell, keksdose's check-up card, the service
  worker. Size: L, or M without the push parts (§2.11).

### 4.3 App-side

The registry, the type words and the triggers; the tables and migrations; the routes;
the mails' words; the sending (`pywebpush`, the mailer); the jobs; the service worker;
the catalogue entries; the inbox UI.

## 5. Per app

### 5.1 keksdose (canon: mostly names)

1. The registry from `NOTIFICATION_TYPE_DEFAULTS`: the same nine and defaults; `quiet`
   false for `share_events`, `announcements` and `support_chat`; no type offers e-mail.
2. `/notifications/*` (§3.8), with `PATCH /notifications/settings` replacing the two PUTs;
   `/push/*` stays as aliases for one release.
3. The zone fallback becomes `Europe/Zurich` (`should_push_now`, `_send_digest_for_user`).
4. The digest marker (`digest_sent`) and `digest_due`.
5. The payload gains `data.type`; the VAPID subject becomes the support address.
6. The kit's cards replace the notifications card's types, push and quiet-hours parts
   and the devices card; `PREF_DEFAULTS` goes. The inbox and the check-up stay.
7. The export's keys (§3.9); the stale "MISSING ROW = ENABLED" docstring.

### 5.2 kastlan

1. **Types (Rec):** `invoices_overdue` (`app`, and e-mail: the `invoices-overdue` job mails
   the invoices that run marked, one mail per company per run) and `dunnings_pending`
   (`app` only: a to-do the staff made). Both off by default (§2.1); both staff only.
2. Storage, `GET/PATCH /notifications/settings` (`types` only: no push yet, no digest).
3. **The migration:** `browser_notifications = true` → both types' `app` on. Nothing
   ever went out under `email_notifications`, so it carries nothing. Both columns leave
   `users`, `MeResponse`, the admin `UserResponse`, `ProfileSettings`, the mock and the
   export.
4. **The poller, until push:** each card is a type, shown only with its `app` switch on;
   it gets a `tag` so a repeat replaces it; its words are in the user's language; `since`
   goes. With push (a later step, no new contract: the worker's push handlers, VAPID, the
   kit's device parts), the poller and `GET /notifications/poll` go.
5. **Mail:** `send_email(…, headers=)` on both transports (Resend and SMTP), the
   unsubscribe routes and page, the words in four languages.
6. `NotificationTypesSetting` replaces the two switches; catalogue entries per type.

### 5.3 Kurvenschmiede

1. **Types (Rec), e-mail only:** `feedback_answered` (on: it answers the person's own
   report), `share_granted` (off), `team_added` (off). Triggers at
   `share_service.py:128`/`:159`, `team_service.py:337-345`, and where an answer is set
   on a report.
2. Storage, `GET/PATCH /notifications/settings` (`types` only), the unsubscribe routes and
   page, the mails in seven languages.
3. The `notifications` group with `NotificationTypesSetting`: it becomes visible (settings
   §4.1). Export `data.notifications`.

## 6. For the reviews

**keksdose:**
1. `/notifications/*` with `/push/*` as aliases for one release: does anything else call
   `/push/*` (the offline host `shared/offline/local-api-host.ts`, tours, the admin
   roster)?
2. The zone fallback `Europe/Zurich` instead of UTC: any account it would move?
3. The digest marker with a 3-day late limit: is a Tuesday digest after a missed Monday
   right?
4. Announcements ignore quiet hours today. Keep (they are person-sent), or hold them?
5. Does the lift (§4.2) lose anything your cards do, apart from the check-up and the inbox,
   which stay?
6. `data.type` in the payload: anything in `use-sw-messages.ts` it touches?

**kastlan:**
1. The two types and the overdue mail (one per company per run): right for your staff?
   A user in two companies gets one per company.
2. Push in this round or later (Rec: later; the poller fixes of §5.2.4 meanwhile)?
3. A tenant receives neither type: `GET` answers only what the account can receive (§3.1).
   Agreed?
4. The SMTP transport and the two headers: anything in the way?

**Kurvenschmiede:**
1. The three types, their defaults and their triggers; when is a report "answered"?
2. E-mail only, no push and no worker, confirmed?
3. Nothing in KS needs an account zone (Marcel, 2026-10-12)?

**For Marcel:** decisions 3 (two switches per type, not a matrix), 6 (the zone off the
account, null = `Europe/Zurich`), 8 (the signed token from each app's secret) and 11
(lift the push parts now).

## 7. Left for later

- Delaying a held push to the end of the window, and bundling several events in one
  mail: both need a queue (layer 2).
- A switch per channel and per device beyond `app` / `email`.
- A zone on the account, and one at sign-up: when a server-written time needs it.
- The kit's inbox list and bell, once a second app keeps an inbox.
- `pushsubscriptionchange`: re-registering a rotated subscription from the worker (today
  the old endpoint 410s and the person enables again).
- kastlan's push (§5.2.4); any app's SMS or native push.
- Open check at the build: the DKIM signature on a received notification mail covers
  both `List-Unsubscribe` headers (Gmail, "Show original"), as RFC 8058 requires.
