# Adopting `@eifi1/ui-kit` 0.37 and `eifi1-server-kit` 0.10

Round 0.37 took the next candidates after 0.36 (Marcel, 2026-10-13: "Sounds good, continue")
and was settled on Marcel's word (2026-10-14: "Do 0.37 as recommended"). Two contract
sections were drafted, reviewed by all three apps and settled:
- **the translation review as server-kit layer 2:** `docs/server-services-harmonization.md`
  §6, with i18n H1 amended (the `<area>:` arm in both kits, the name's two parts, one export
  shape);
- **notifications §9:** Kurvenschmiede's admin hand-over of a person's work
  (`work_transferred`), and a notification mail that failed to send (a job's mail is owed for
  3 days); §3.4 and §5.2.6 amended.

The contracts' per-app sections are the checklists; this note is the kits' side and the
order. It also carries what the three apps' 0.36 adoptions found (the fixes are in these
releases).

**Bumping changes nothing by itself** for keksdose and Kurvenschmiede. kastlan's tests and
any client that sends extra fields to the translation review notice §2. The rest is adopted
step by step: the translation review removes code in all three; the failed-send retry is
kastlan's; `work_transferred` is Kurvenschmiede's.

## 1. What's new

### ui-kit 0.37

- **English names a field's help "?" with its label quoted:** About “Kind of drive”
  (`common.aboutField`), as the other six languages did already (Kurvenschmiede's 0.36
  finding). No app test looks the "?" up by its English name (checked in all three); an app
  that names its own `HelpPopover` is unchanged.
- **Docs:** the two settled sections above; the 0.36 adoption guide's corrections (kastlan's
  poller drops `since`; the reset card's catalogue id in the app's own style; what app tests
  notice after 0.36; settings §11.5: a device setting registered in a module only a lazy page
  imports must be imported where the card sees it, or all from one module the card imports).
- **Showcase:** Kurvenschmiede's notification sample gains `work_transferred`, off; the
  "Server kit" pages follow server-kit 0.10's API.
- Internal: the styling inventory reads `@theme inline` through the ESLint rule's parser.

### server-kit 0.10

- **The translation review, layer 2** (server services §6): `TranslationReviewer` (the
  app's grant on a view; keksdose's review token is the same view with `kit_only`),
  `TranslationReviewStore[RowT]` (the port each app implements: `verdicts` with the
  reviewer's name, an upsert `put`, `clear`, `by_reviewer`), `TranslationReviewService`
  (H1's flows and the export, `VERDICTS_EXPORT_KEY = "translation_verdicts"`),
  `translation_review.router`'s `translation_review_router(TranslationReviewDeps(…))`
  (keksdose's endpoint names, no route guards: the grant decides; the kit never commits)
  and `translation_review.testing` (`InMemoryTranslationReviewStore`, `reviewer`,
  `check_store`, `check_round_trip`).
- **Layer 1, additive:** the `<area>:` arm (four LIKE patterns per area; it fixes H1's
  rule), `review_grant(…, is_demo=False)`, `TranslationReviewOut.reviewer_first_name` /
  `reviewer_last_name`, `NO_REVIEW_ACCESS`, `NO_KIT_REVIEW_ACCESS`. `eifi1_server_kit.clock`
  (`Clock`, `utc_now`; `feedback` still exports them).

- **`notifications`, a failed send** (notifications §9.4): `mail_due(event_day, today, *,
  sent, late_days=MAIL_LATE_DAYS)` (3 days), `mail_event(*parts)` (the app's event key: ids
  and days), `MailMarker(user_id, type_id, event)` with `.idempotency_key(day)`
  (`<type>:<event>:<user_id>:<YYYY-MM-DD>`), `MAIL_MARKER_RETENTION` (30 days),
  `MAIL_EVENT_PATTERN`. A `datetime` where a day belongs is a `TypeError`.
- **`mail`:** `MailMessage.idempotency_key` (1–256 printable ASCII characters, no space):
  `ResendClient` sends it as the `Idempotency-Key` of both tries instead of a random one;
  `ConsoleMailer` ignores it. Resend keeps a key 24 hours; the same key with the same body
  answers as the first did, and nothing is sent again; a 409 (the first still running, or
  another body) is not sent. `AccountNoticeKind.WORK_TRANSFERRED_NOTICE`
  (`"work_transferred_notice"`).
- **From the 0.36 adoptions:** `should_reap(failure_count, *, limit=PUSH_MAX_FAILURES)`
  (keksdose's configurable limit; below 1 is a `ValueError`); `apply_patch(None, …)` when
  every field of the model is skipped (kastlan's `types`-only body; a model with a field that
  isn't skipped is a `TypeError` up front); the export check no longer flags
  `digest_cadence` ("cadence" is a fact word; keksdose's finding 9).

## 2. Breaking and must-change, every app

- **Nothing is removed** in either kit.
- **A test that holds an app's copy of a kit model to the kit's** (as sets of fields) fails
  on the bump alone: `TranslationReviewOut` gains `reviewer_first_name` / `reviewer_last_name`
  (Kurvenschmiede's `tests/unit/test_review_and_session_schemas.py`; the copy goes in §3).
- **A naive `reviewed_at` column** (`TIMESTAMP WITHOUT TIME ZONE`): the service's clock and
  `check_store` write aware UTC datetimes, which asyncpg refuses for such a column. The store
  converts at `put` (aware → naive UTC); `TranslationReviewDeps(now=…)` alone is not enough,
  since `check_store` sets its own (kastlan).
- **An app that copied the verdict enum** can use the kit's `TranslationVerdict`: the
  PostgreSQL type keeps its name (`translationverdict`, from the class name), so no migration
  (kastlan).
- **The four translation-review request bodies forbid unknown fields** (decision T5): a
  misspelt `suggestion` is a 422, not dropped. No app's page or test sends one (checked);
  Kurvenschmiede's own forbid models go.
- **`scope()` refuses a kit-only review token on an area-limited grant**
  (`NO_KIT_REVIEW_ACCESS`); keksdose refuses it at mint already.
- **The export's one shape:** `translation_verdicts` with locale, string, text, verdict,
  suggestion, note, reviewed_at, oldest first (kastlan's `translation_reviews` and its `key`
  field go; no field named `key` for the secret check to flag).
- **A test that checks an export with `assert_no_secrets`** can drop an
  `allow=("digest_cadence",)` (keksdose's `backend/tests/api/test_account_export.py:272`).

## 3. Per app

### keksdose

- **Translation review:** pin 0.10.0 (`backend/pyproject.toml:121`). A store in
  `adapters/persistence/` on `Depends(db_session)` (RLS: the review actor's session);
  `get_review_actor` (`translations_router.py:49-62`) answers
  `TranslationReviewer(grant=review_grant_of(user), kit_only=…)`, and `review_grant_of`
  (`:102-107`) passes `is_demo` instead of folding it in at `:105`; the kit's router
  included before keksdose's token routes (`main.py:299`). Goes: in
  `translation_review_service.py` the `in_areas` re-export (`:35`, `:69`), `allowed_*`
  (`:110-118`), `_assert_allowed`/`_clean` (`:121-130`), `list_reviews` (`:133-167`), `_row`
  (`:170-185`), `save_reviews` (`:188-232`), `clear_reviews` (`:235-250`); in the router
  `_kit_keys_only`/`_refuse` (`:65-73`) and the three routes (`:76-125`); the subclasses at
  `domain/schemas/translations.py:40-56`. The export calls `export(user.id)`: the same shape
  (`account_export_service.py:375-388`). Tests notice nothing.
- **Optional:** `push_service.py:224-226` may call `should_reap(row.failure_count,
  limit=get_settings().push_max_failures)` (`settings.py:266`); the SQL filter may stay.
- `backend/tests/api/test_account_export.py:272`: drop `allow=("digest_cadence",)`.
- Notifications §9: nothing to build (keksdose sends no notification mail; push is never
  retried).

### kastlan

- **Translation review:** pin 0.10.0. The repository (`:19-44`) becomes the store with a
  `commit` flag (as `feedback_repository.py:45-55`, set by the router dependency as
  `feedback_router.py:47-51`); the reviewer dependency `review_grant(user,
  is_admin=user.is_superuser, is_reviewer=True, is_demo=user.is_demo, …)`;
  `document_texts` (`:204-208`) calls `scope()`, and the documents route (`:63-71`) goes
  after the kit's router (`main.py:251`, `:296`); `set_reviewer`
  (`platform_service.py:258`, `:262`) uses the kit's `normalize_*`. Goes: the service's own
  `normalize_*`/`in_areas` (`:57-97`), `allowed_*` (`:100-112`), `_clean`/`_reviewer_name`/
  `_to_response` (`:115-137`), the class's flows (`:169-202`, `:210-258`); the three routes
  (`translation_router.py:29-60`); `schemas/translation_review.py:18-72` but
  `DocumentTextsResponse`. **Export** (`account_service.py:309-319`): `translation_reviews` →
  `translation_verdicts`, `string` for `key`, `text` added, suggestion before note;
  `test_user_admin.py:432-473` fills a verdict.
- **The overdue mail** (notifications §5.2.6 as amended, §9.4, §9.6): the `invoices-overdue`
  job splits into a mark step and a mail step; the mail step runs from the route and the
  local scheduler, never at start (`jobs.py:55-62`, `STARTUP_JOBS` `:113`). Each run reads
  the events of the last 3 days from the state (a company's invoices still `OVERDUE` whose
  due date + 1 is that day: `mail_event(company_id, day)`, `mail_due(day, today, sent=…)`),
  each staff recipient by §3.3's plan with the role checked in the event's company, skips a
  recipient with a marker, and sends with
  `MailMarker(user.id, "invoices_overdue", event).idempotency_key(today)`. The count is the
  event's invoices still overdue at the send ("3 invoices of X became overdue on 13.10.").
  Sent: the marker row, `ON CONFLICT DO NOTHING`, committed per recipient. The job deletes
  markers past `MAIL_MARKER_RETENTION`. The marker table (§9.4) and its migration; no RLS
  on it.
- `infrastructure/email.py:54` `send_email(…, idempotency_key=None)`: `_send_resend` (`:79`,
  the header dict at `:87`) adds `Idempotency-Key`; SMTP sends nothing.
- `domain/services/notification_settings_service.py:70` → `apply_patch(None, body,
  not_nullable=SETTINGS_SKIP, skip=SETTINGS_SKIP)`; the `SimpleNamespace` import (`:14`) goes.

### Kurvenschmiede

- **Translation review:** pin 0.10.0 (`backend/pyproject.toml:218`). A reviewer
  dependency on `get_current_user` with `grant()` (`:72-83`), the name's parts and the
  locale; the kit's router at `main.py:70`; `DEMO_ALLOWED` stays (`test_demo.py:243-245`).
  Goes: `area_filter`, `_clean`, `_row` and the three flows (service `:86-207`), the routes
  (`:30-67`), the schemas `:20-83` with the forbid models (`AdminReviewer*` stay).
  **Export** (`export_service.py:112-125`): `string` and `text`, keksdose's order, oldest
  first; `test_account_export.py:73` fills a verdict. Tests: drop
  `test_translations_api.py:229` and `test_review_and_session_schemas.py:23-30`; the
  frontend mock at `translations-page.test.tsx:77` holds the old 403 sentence.
- **`work_transferred`** (notifications §9.3): the registry gains
  `NotificationType("work_transferred", app=None, email=False, quiet=False)` after
  `TEAM_ADDED` (`domain/models/notification.py:44-48`). `admin_service.transfer` (`:435`),
  once something moved: the type's mail to the recipient through the plan (the switch is
  off by default), and, when the former owner is active and a person and not the actor, an
  account notice under `AccountNoticeKind.WORK_TRANSFERRED_NOTICE` (`MailKind` at
  `infrastructure/email.py:106` takes it unchanged). Both armed with `send_after_commit`.
  The words: the card's, the mail's and the notice's `MailText` in seven languages, the
  kinds as KS's page names; the link `/dashboard`.
- **Optional:** `notification_service.py:128` `apply_patch({}, …)` → `apply_patch(None, …)`.

## 4. Versions

- **`@eifi1/ui-kit` `^0.37.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.10.0**, the release wheel by URL, extras as for 0.9, and the
  sha256 pinned in `uv.lock`:

  ```sh
  uv add "eifi1-server-kit[billing,fastapi,images,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.10.0/eifi1_server_kit-0.10.0-py3-none-any.whl"   # kastlan
  uv add "eifi1-server-kit[billing,fastapi,images] @ https://github.com/Eifi1/server-kit/releases/download/v0.10.0/eifi1_server_kit-0.10.0-py3-none-any.whl"        # keksdose
  uv add "eifi1-server-kit[billing,fastapi,mail] @ https://github.com/Eifi1/server-kit/releases/download/v0.10.0/eifi1_server_kit-0.10.0-py3-none-any.whl"          # Kurvenschmiede
  ```

  sha256: `3589925b6367dc4732a8771c396e9f6daa237435f9342ec08240e79abdf3381d`
