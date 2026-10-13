# Server services behind ports — harmonisation plan (server-kit layer 2)

Led from ui-kit for round 0.36 (Marcel, 2026-10-13: "The select hints and the queued
rounds. All of them."). The server-kit README's "Layering" table names the step: the
feedback service written once against a repository, storage and clock port each app
implements, and a router factory `feedback_router(deps)` with the app's hooks. It is built
from a read-only survey of the three backends on 2026-10-13 (kk `79b2949c`, ka `936f8b8`,
KS `c34cba0`). The wire does not change: the contract stays
[feedback-harmonization.md](feedback-harmonization.md) §3.

Backend paths are relative to each app's package: **kk** = keksdose
(`backend/keksdose/`), **ka** = kastlan (`kastlan/`, at the repo root), **KS** =
Kurvenschmiede (`backend/kurvenschmiede/`); a `frontend/`, `scripts/` or `backend/tests/`
path is from the repo root. "Code" counts lines that are not blank, comments or
docstrings.

## Status

**DRAFT for review (round 0.36).** Nothing is built. Phase 2 builds server-kit 0.9 after
the three reviews (§5) and Marcel's answers (§5.4).

## 1. Where each one stands

Since server-kit 0.1 every feedback *rule* is the kit's. What is still written three times
is the orchestration around the rules: the seven routes, the lookups, the demo refusal, the
limiters, reading an upload, the download's headers, the 404 or 403. The pattern is not new
to the kit: billing's `dispatch` works through an `EventStore` port, the provider through
`BillingProviderClient`, the demo's start through `DemoGate.admit`'s callbacks. They are
async, typed as `Protocol`s, run in the caller's transaction and never commit. Feedback
is the first service with a router factory.

### 1.1 Size

| | kk | ka | KS |
|---|---|---|---|
| Router | `adapters/api/feedback_router.py`: 208 lines, 119 code | `adapters/api/feedback_router.py`: 277, 163 | `adapters/api/feedback_router.py`: 275, 156 |
| Service | `domain/services/feedback_service.py`: 197, 111 | `domain/services/feedback_service.py`: 195, 117 | `domain/services/feedback_service.py`: 447, 229 |
| Repository | (in the service) | `adapters/persistence/feedback_repository.py`: 87, 47 | (in the service) |
| **Total** | **405 lines, 230 code** | **559, 327** | **722, 385** |
| An author's erasure | `budgets_service.py:1221-1295`, ≈ 35 code | `admin_user_service.py:372-401`, `:414-420`, ≈ 30 | `erasure_service.py:430-461`, ≈ 22 |
| Feedback tests | 1 384 lines in 4 files | 712 in 1 | 1 004 in 3 (+ 660 for the loop) |

### 1.2 The same in all three

| Flow | kk | ka | KS |
|---|---|---|---|
| Upload: charge the limiter first, `read_capped_upload`, `check_upload`, mint a key, store, 201 `{url}` | router `:80-83`; `upload_guards.py:91-99`, `:238-242` | router `:98-120` | router `:129-139`; service `:235-278` |
| Download: `policy.is_key(key)` or 404 "Attachment not found" | router `:93-94` | router `:129-130` | router `:158-161` |
| Create: `reject_manual_crash`, `initial_status`, NULL for no attachments | service `:45-62` | service `:91-108`; repository `:58-77` | service `:171-195` |
| Crash: demo → `stored: false`, limiter → `stored: false`, fingerprint, the newest row with it outside `TERMINAL_STATUSES`, `decide_crash` fold or file | router `:153-158`; service `:151-197` | router `:188`; service `:122-162` | router `:215-220`; service `:408-447` |
| Own list newest first; the inbox admin-only (403), `status_filter`, the author's email joined | service `:66-92`; router `:182` | repository `:35-51`; router `:59-71`, `:213` | service `:109-126`, `:145-150`; router `:239` |
| PATCH: load, 404 "Feedback not found", `plan_update(is_admin, is_author)`, assign `plan.changes` | service `:116-131`; router `:206-207` | service `:178-193`; router `:276` | service `:354-367`; router `:269-271` |

### 1.3 Where they differ

| Point | kk | ka | KS | § |
|---|---|---|---|---|
| Where a file lives | object store `feedback/<sha12>.<ext>`, no row (`upload_guards.py:241-242`) | `FileStoragePort`, `<uuid32>_<sha12>.<ext>`, encrypted at rest (router `:113-114`; `filestorage/local_adapter.py:21-32`) | a row: encrypted bytes, an HMAC key, the uploader; unfiled uploads swept after a day (service `:235-296`) | 2.5 |
| Who may read a file | any signed-in user | any signed-in user | its uploader, or whoever may see its report (service `:299-319`) | 2.5 |
| What a report may name | any URL of the app's pattern | the same | only the caller's own unfiled uploads, else 422; a rework's files too (service `:198-228`, `:371-378`) | 2.4 |
| A foreign row on PATCH | 403 from `plan_update` | 403; another company's row is hidden by RLS → 404 | 404 (`visible_to`, service `:78-87`, `:129-142`) | 2.10 |
| `stamp_identity` on create | no (service `:56`) | yes (service `:96-101`) | yes (service `:153-161`) | 2.13 |
| A demo | layer 1 refuses writes (`infrastructure/demo_guard.py:33-41`, `:79-80`), plus the route's own 403 sentences (router `:120-121`, `upload_guards.py:68-73`) | layer 1 only (`infrastructure/dependencies.py:281-304`) | `not_in_the_demo` on three routes, `demo_refused` (`dependencies.py:58-69`; router `:114`, `:183`, `:256`) | 2.8 |
| Limiters | module globals (router `:41`; `upload_guards.py:83`, shared with support) | module global (router `:56`) | per app on `app.state` (`main.py:205`) | 2.11 |
| Who commits | `commit_boundary`, function scope, app-wide (`dependencies.py:48-77`, `main.py:163`); the service flushes | no unit of work (`dependencies.py:160-174`); the service commits every write (service `:108`, `:139`, `:162`, `:193`) | `get_db_session` commits at the end (`infrastructure/database.py:108-124`); the service flushes | 2.7 |
| Status and category columns | database enums (`models/feedback.py:98-103`) | database enums (`value_enum`) | `String` columns; the service writes `.value` (service `:366-367`) | 2.4 |
| `resolved_at` | the plan's | the plan's | derived from the status on every flush (`models/feedback.py:195-262`); the plan's is dropped (service `:363`) | 2.4 |
| The answer | `model_validate(row)` | `user_name` and `user_email` on every answer, also outside the inbox (router `:59-71`) | URLs read off the attachment rows (router `:83-107`) | 2.9 |
| App extras | — | `Location` headers (router `:116`, `:163`); `GET /feedback/counts`, `GET /feedback/{id}` (router `:237-258`) | title trimmed, outcome ≤ 4 000 (`schemas/feedback.py:321-358`) | 2.9 |
| Download headers | disposition by type, `attachment.<ext>`, no `nosniff`; `FileResponse` on local disk (router `:99-109`) | `nosniff`; `Content-Disposition` only for non-images (router `:137-141`) | type re-read from the bytes, disposition always with the stored name, `nosniff` (router `:162-175`) | 2.12 |
| Upload checks | `ensure_decodable_image` (`upload_guards.py:240`) | the same (router `:111`) | no `images` extra; UTF-8 text only (router `:66`) | 2.9 |
| The clock | `plan_update` and `crash_seen_at` default to `datetime.now(UTC)` | the same | `crash_seen_at(…, datetime.now(UTC))` (service `:409`); the sweep (`:289`), `stamp_settlement` (models `:223`) | 2.6 |
| The inbox's 403 | "Insufficient role" (`dependencies.py:502-509`) | "User roles [...] are not authorized for this action" (`dependencies.py:341-355`) | "Insufficient role" (`dependencies.py:39-53`) | 2.10 |
| Ties in a list | `created_at` | `created_at`, then `id` | `created_at` | 2.4 |

**Two layers named 2.** The README's "Layer 2 — the read-only database transaction — is a
recipe, not kit code (§6.3)" is the demo's second layer (landing-demo §6.3): kastlan's
`SET TRANSACTION READ ONLY` for a demo's reads. It is unrelated to the kit's layer 2 and
stays a recipe: the service runs in the app's session, so a demo's read-only transaction
still holds, and the kit still has no SQLAlchemy; it lives in the adapters.

## 2. Decisions

### 2.1 Where it lives, and the extra

**Rec:** in the `feedback` package, as three new modules and a test module:
- `feedback.ports` and `feedback.service`: no FastAPI, re-exported from
  `eifi1_server_kit.feedback` (a CLI such as KS's `feedback_loop.py` may use them);
- `feedback.router`: FastAPI, not re-exported, behind a new **`fastapi` extra**
  (`fastapi>=0.115.0`, `python-multipart>=0.0.18`: the apps' floors, no ceiling, since kk
  holds FastAPI below 0.137). Without it, importing the module raises `ImportError` naming
  the extra, as `images` does;
- `feedback.testing`: standard library only, not re-exported, like `billing.testing`.

The rule for layer 2: a module may import FastAPI and Starlette; never SQLAlchemy, never an
app's model or `User`. Layer 1's names do not change. **server-kit 0.9.0** (additive).

### 2.2 The identity view

```python
@dataclass(frozen=True, slots=True)
class FeedbackActor:
    id: int
    email: str
    display_name: str | None  # the context stamp's and a crash body's name
    is_admin: bool            # kk role ADMIN; ka ADMIN in the acting company; KS role ADMIN
    is_demo: bool
```

**Rec:** one app dependency builds it from the app's own `get_current_user`. The kit
never sees the app's `User`.

### 2.3 Rows: read through a protocol, written through the port

```python
class FeedbackRow(Protocol):  # read-only members: an app's mapped row satisfies it as it is
    @property
    def id(self) -> int: ...
    @property
    def user_id(self) -> int | None: ...
    @property
    def status(self) -> FeedbackStatus | str: ...
    @property
    def title(self) -> str: ...
    @property
    def body(self) -> str: ...
    @property
    def context(self) -> Mapping[str, Any] | None: ...
    @property
    def crash_fingerprint(self) -> str | None: ...
    @property
    def screenshot_url(self) -> str | None: ...
    @property
    def attachment_urls(self) -> Sequence[str] | None: ...


@dataclass(frozen=True, slots=True)
class NewFeedback:
    user_id: int
    title: str
    body: str
    category: FeedbackCategory
    status: FeedbackStatus
    context: dict[str, Any] | None
    screenshot_url: str | None = None
    attachment_urls: list[str] | None = None  # None for none, never []
    crash_fingerprint: str | None = None
```

**Rec:** the app's row is read as it is (billing's `SubscriptionRow` is the precedent), and
the kit never assigns to it. Every write goes through the repository, so KS's string
columns, its claimed files and its `stamp_settlement` stay in its adapter. KS adds two
read-only properties, `screenshot_url` and `attachment_urls`, read off its attachment rows
as its `to_response` already does (router `:90-91`). A mapped dataclass for every row would
cost each app a mapping both ways and lose the session's identity map, for no rule gained.

### 2.4 The repository port

```python
class FeedbackRepository[RowT: FeedbackRow](Protocol):
    async def get(self, feedback_id: int) -> RowT | None:
        """The row, or None: missing, or hidden from this request (ka's RLS, KS's visible_to)."""
    async def list_mine(self, user_id: int) -> Sequence[RowT]:
        """The author's rows, newest first, the higher id first on a tie."""
    async def inbox(self, status: FeedbackStatus | None) -> Sequence[tuple[RowT, str | None]]:
        """Every row the request may see, newest first, each with its author's current
        address: an outer join, None once the author is erased."""
    async def open_crash(self, fingerprint: str) -> RowT | None:
        """The newest row with this fingerprint whose status is not in TERMINAL_STATUSES."""
    async def add(self, new: NewFeedback) -> RowT:
        """Insert and flush, so the id is set. The app adds its own columns (ka's company)."""
    async def apply(self, row: RowT, changes: Mapping[str, Any]) -> RowT:
        """Assign and flush. The keys are §3.1's columns; the values the kit's (enums
        included: a string column stores .value)."""
    async def by_author(self, user_id: int) -> Sequence[RowT]:
        """The erasure's rows (2.15)."""
    async def urls_named_except(self, row_ids: Collection[int]) -> set[str]:
        """Every attachment URL the other rows name, in a column or the body
        (feedback_attachment_urls): the erasure's shared-key check."""
```

**Rec:** this shape, async. A tie in a list goes to the higher id in all three, as ka
orders today (kk and KS order by `created_at` alone). KS's `add` claims the named uploads
(its 422 `UnknownAttachmentError` stays its own, a subclass of the kit's) and its `apply`
hangs a rework's files and drops `resolved_at` for its flush listener; kk's and ka's
`apply` is the `setattr` loop they have today.

### 2.5 The storage port

```python
@dataclass(frozen=True, slots=True)
class StoredAttachment:
    data: bytes
    media_type: str | None  # as stored; the kit re-reads the bytes (2.12)
    filename: str | None    # None: "attachment.<ext>"


class AttachmentStorage(Protocol):
    async def save(self, data: bytes, upload: CheckedUpload, *, uploader: FeedbackActor,
                   filename: str | None) -> str:
        """Store a checked file and answer its key, one the app's AttachmentUrlPolicy accepts."""
    async def read(self, key: str, *, viewer: FeedbackActor) -> StoredAttachment | None:
        """The file, or None: missing, or not this viewer's to read (KS)."""
    async def purge(self, keys: Collection[str]) -> None:
        """Delete files after the erasure's commit. Never raises: a missing file must not
        undo an erasure (ka admin_user_service.py:414-420)."""
```

**Rec:** the storage mints the key, so each app keeps its own: kk `content_addressed_key`,
ka `<uuid32>_<sha12>`, KS its HMAC with its dedupe and its sweep. KS's `purge` does nothing
(its files are rows, deleted with the report's attachments).

### 2.6 The clock

**Rec:** `now: Callable[[], datetime]`, aware UTC, default `utc_now`; not `limiter.Clock`,
which is a monotonic float. The kit uses it for `resolved_at` (`plan_update(now=…)`) and a
crash's `seen_at`. The three use `datetime.now(UTC)` today without saying so (1.3), so
nothing changes but the tests, which pass a fixed one. KS's sweep and `stamp_settlement`
keep their own clock: they are its adapter.

### 2.7 Async, and who commits

**Rec:** async ports, since the three use `AsyncSession`. **The kit never commits, rolls
back or opens a transaction.** Every port write flushes, so an id or a constraint failure
surfaces inside the call. The app's unit of work commits: kk's `commit_boundary`, KS's
`get_db_session`. In every flow the port's write is the request's last database write, so
**kastlan**, which has no unit of work, commits at the end of its adapter's `add` and
`apply`, as each of its services does today (`commit_created`). A request-level unit of
work for kastlan would be the cleaner shape and a round of its own. The erasure runs inside
the app's erasure transaction and the app calls `purge` after its commit.

### 2.8 The demo: a value, no hook

All three answer a demo the same (landing-demo §6.4): feedback and uploads refused, a crash
202 `stored: false`. **Rec:** no `may_file` hook. The kit calls
`refuse_demo(actor.is_demo, …)` (403 `demo_refused`) first on `POST /feedback` and `PATCH`
("feedback") and `POST /feedback/attachments` ("uploads"). `POST /feedback/crash` answers
`stored: false` before the limiter and before any read. The GET routes serve a demo. In kk
and ka layer 1 still answers `demo_read_only` first; the kit's check is the second guard
each app wrote by hand. kk's two sentences (router `:121`, `upload_guards.py:71-72`) go.

### 2.9 The router factory

```python
@dataclass(frozen=True, slots=True)
class FeedbackDeps[RowT: FeedbackRow]:
    actor: Callable[..., Awaitable[FeedbackActor]]           # FastAPI dependencies, the app's
    repository: Callable[..., FeedbackRepository[RowT]]
    storage: Callable[..., AttachmentStorage]
    policy: AttachmentUrlPolicy                              # the app's keys and URLs
    create_model: type[FeedbackCreate] = FeedbackCreate      # the app's subclasses: names and fields
    update_model: type[FeedbackUpdate] = FeedbackUpdate
    response_model: type[FeedbackResponse] = FeedbackResponse
    to_response: Callable[[RowT, str | None], FeedbackResponse] | None = None
    foreign_row: Literal["forbidden", "not_found"] = "forbidden"
    decode_images: bool = False      # ensure_decodable_image, the images extra (kk, ka)
    require_utf8_text: bool = False  # KS
    limiters: Callable[[Request], FeedbackLimiters] = lambda request: request.app.state.feedback_limiters
    now: Callable[[], datetime] = utc_now


def feedback_router[RowT: FeedbackRow](
    deps: FeedbackDeps[RowT], *, prefix: str = "/feedback", tags: Sequence[str] = ("feedback",)
) -> APIRouter: ...
```

**Rec:**
- **The routes** are §3.3's seven, the attachment routes first. The endpoints carry kk's
  names (`upload_attachment`, `download_attachment`, `create`, `report_crash`, `list_my`,
  `list_all`, `update`) and the path parameter `{feedback_id}`. So kk's operation ids do not
  change, ka's `download_attachment` route name stays, and KS's `{row_id}` becomes
  `{feedback_id}` (its client builds the path by hand, KS
  `frontend/src/shared/api/endpoints.ts:563`).
- **The prefix and the tags** are the app's: `app.include_router(feedback_router(deps),
  prefix="/api/v1")`, as each includes its routers today. `policy.prefix` must be the
  mounted path (`/api/v1/feedback/attachments/` by default); `testing.check_round_trip`
  checks it.
- **The schemas are the app's subclasses**, so the OpenAPI components keep their names and
  the app's fields (ka's `company_id`, KS's trimmed title and outcome cap).
- **`to_response`**: by default `response_model.model_validate(row)`, with `user_email` set
  in the inbox only (§3.1). KS passes its own (URLs from the attachment rows) or uses the
  default once its row has the two properties (2.3).
- **An app's own routes** go after the kit's router: ka's `GET /feedback/{feedback_id}`
  included first would take `GET /feedback/my`.
- **The limiters** are read per request from `app.state.feedback_limiters` (KS's shape;
  the README's "build limiters per app"); kk's support door charges the same `.upload`
  window, as it does now.

### 2.10 Errors, and the foreign row

**Rec:** the router raises no `HTTPException`. Everything is a kit refusal, answered by
`install_contract_error_handlers`, which all three install (kk `main.py:208`, ka
`main.py:179`, KS `main.py:294`). New, all `FeedbackError`s and so already in
`CONTRACT_ERRORS`:
- `FeedbackNotFoundError`: 404 "Feedback not found";
- `AttachmentNotFoundError`: 404 "Attachment not found";
- `FeedbackThrottledError`: 429 with `Retry-After`, kk's sentence "Too many attachments
  uploaded — please try again later.";
- the inbox's refusal is `FeedbackForbiddenError("Insufficient role")` (kk and KS; ka's
  text changes).

A PATCH, in kk's order: the demo (403), `reject_manual_crash` (422, before the lookup),
`get` (404), the foreign row, `plan_update` (403 or 422), `apply`. **The foreign row stays
the app's choice**, since §3.5 accepts both: `"forbidden"` lets `plan_update`'s 403 speak
(kk, ka); `"not_found"` answers 404 before it (KS). An adapter that hides rows in `get`
(KS's `visible_to`, ka's RLS) gets a 404 for those whatever the setting.

### 2.11 When the limiter is charged

The contract recommends charging an upload after validation and a crash after the dedupe
(§3.5, §3.6). **All three charge before**: an upload before it is read, a crash before the
lookup (1.2). **Rec:** the kit charges before, and §3.5 and §3.6 are amended. The window
bounds the work a looping client makes the server do, and reading and sniffing 10 MB, or
a lookup and a write, is that work.

### 2.12 The download

**Rec:** KS's rules for all three:
- the type is read off the bytes: their signature, else `text/plain` when stored as text
  and still text (`require_utf8_text` per app), else `application/octet-stream`;
- `Content-Disposition` always, `inline` for the four pictures only, with the stored name or
  `attachment.<ext>`;
- `X-Content-Type-Options: nosniff` always.

The bytes go out in a `Response` (10 MB at most). kk's `FileResponse` for the local disk (dev
only) goes.

### 2.13 The identity stamp

**Rec:** `stamp_identity` on every create (§3.2 recommends it; ka and KS do it). kk gains
it: a client can no longer file in someone else's name.

### 2.14 Testing support

**Rec:** `eifi1_server_kit.feedback.testing` in the wheel, not re-exported:
- `InMemoryFeedbackRepository` and `InMemoryAttachmentStorage` (content-addressed keys;
  records purges);
- `actor(**overrides)` and `fixed_clock(at)`;
- `check_repository(make)` and `check_storage(make)`: async conformance checks an app runs
  once against its own adapters (the order with the id tie-break; `open_crash` skips DONE
  and WONT_DO; `add` sets the id; NULL for no attachments; the inbox's `None` for an erased
  author; a saved key passes the policy and reads back);
- `check_round_trip(client, policy)`: upload, then download through the URL the upload
  answered.

The kit's own tests drive `feedback_router` through FastAPI's `TestClient` on the fakes:
§3's behaviour is tested once. The apps keep a wiring test per route and their own
variations (KS's visibility and claim, ka's RLS).

### 2.15 The erasure

The three copies agree but query the other rows differently (kk `id NOT IN` the author's,
ka `user_id IS NOT NULL`). **Rec:** `FeedbackService.erase_author(user_id, identifiers)` →
`ErasedFeedback(reports, keys)`: `anonymise_feedback` on each of `by_author`'s rows through
`apply`, then `attachment_keys_to_purge` against `urls_named_except`. The app calls it
inside its erasure and `storage.purge(keys)` after its commit. kk's `feedback_comments`
scrub and KS's unfiled uploads stay in the apps' erasure services.

## 3. Scope of server-kit 0.9

**Rec: the feedback service and its router, with the erasure (2.15).**

**Not yet: the translation review.** Its list, save and clear are the closest other copies:
kk `translation_review_service.py:133-250`, ka `TranslationReviewService`
(`translation_review_service.py:164-258`, with its repository), KS
`translation_review_service.py:123-207`, about 75 service and 40 router code lines each,
on the same three routes (`GET` and `PUT /translations/reviews`, `POST
/translations/reviews/clear`). But kk's actor may also be a review token from the
showcase's origin (`translations_router.py:42-62`, `:128-148`), and ka adds `GET
/translations/documents` (`:63-71`): a second actor shape and an extension point the
feedback router does not need. Settle the ports on one service first. The translation
review would be server-kit 0.10, on the same pattern: a `TranslationReviewStore` port and a
reviewer view carrying the grant.

Not candidates: billing (already behind ports), the demo's start (`DemoGate`), the jobs
token (one dependency).

## 4. What ships, what stays

### 4.1 server-kit 0.9

- `feedback.ports`: `FeedbackActor`, `NewFeedback`, `StoredAttachment`, `FeedbackRow`,
  `FeedbackRepository`, `AttachmentStorage`, `utc_now`.
- `feedback.service`: `FeedbackService(repository, *, policy, now=utc_now,
  foreign_row="forbidden")` with `create`, `report_crash(actor, payload, limiter)` →
  `CrashReportResponse`, `update`, `list_mine`, `inbox`, `erase_author`; and
  `upload_attachment(actor, file, storage, *, policy, limiter, decode_images,
  require_utf8_text)` → URL, `download_attachment(actor, key, storage, *, policy)`.
- `feedback.router`: `FeedbackDeps`, `feedback_router` (the `fastapi` extra).
- `feedback.errors`: the three refusals of 2.10.
- `feedback.testing` (2.14).
- README: the layering table's second row → 0.9.0; an "Adopting layer 2" section; "the
  demo's database layer" for the demo's "Layer 2". The exporter lists `feedback.router`
  (`scripts/export_api.py` `MODULES`); `feedback.ports` and `.service` come with
  `eifi1_server_kit.feedback`.

**Size M**: about 600 code lines (ports 70, service 220, router 140, errors 15, testing
180) and 1 000 lines of tests.

**ui-kit 0.36, size S** (no component or wire change): this contract; feedback §3.3 (the
demo's code), §3.5 and §3.6 (2.11), §3.7 (the 429 sentence, the inbox's 403), §5 (the
server-kit paragraph); a row in `docs/README.md`; the showcase's `server-kit-api.json`
synced to 0.9 (`scripts/sync-server-kit.mjs`).

### 4.2 Each app keeps

Its SQLAlchemy models and migrations (**no schema change** in any app), its RLS and
company scoping (ka), the adapters, its extensions (ka's counts and `GET /feedback/{id}`,
kk's support door, KS's claim, visibility, encryption and sweep), the outcome loop tools
(kk `scripts/feedback-live-*.sh`, KS `feedback_loop.py`), and the account export's
feedback.

| | Code lines now | After: adapters and wiring (estimate) | Removed |
|---|---|---|---|
| kk | 230 | ≈ 65 (repository 35, storage 15, actor and router 15) | **≈ 165** (≈ 290 lines with docstrings) |
| ka | 327 | ≈ 95 (repository 45, storage 12, wiring 18, its two extra routes 20) | **≈ 230** (≈ 380) |
| KS | 385 | ≈ 200 (repository with claim, visibility and save 110; storage with sweep 56; response and wiring 34) | **≈ 185** (≈ 320) |

The erasure removes about 20 more code lines per app. The app's feedback tests shrink to the
wiring and its own variations (1.1).

### 4.3 Per app

**keksdose**
1. Pin server-kit 0.9 with `[billing,fastapi,images]`.
2. Adapters from `feedback_service.py`'s queries: the repository (`list_all`'s outer join
   becomes `inbox`'s pairs, `record_crash`'s lookup `open_crash`), and the object store
   (`content_addressed_key` and `save_object` under `feedback/`, `read`, and the erasure's
   purge).
3. A `feedback_actor` dependency (role ADMIN, `is_demo`, `display_name`).
4. `feedback_router.py` becomes `feedback_router(FeedbackDeps(…, policy=FEEDBACK_ATTACHMENTS,
   create_model=FeedbackCreate, decode_images=True))`; `feedback_service.py` and
   `upload_guards.refuse_demo` go; `throttle_attachment` and `store_attachment_bytes` stay
   for the support door.
5. `FeedbackLimiters` on `app.state`; the support door charges its `.upload`; the module
   globals and the `reset_*_limiter` seams go.
6. `budgets_service._anonymise_feedback` calls `erase_author`.
7. What a user may notice: the identity stamp (2.13); a demo's refusal code (layer 1
   still answers first); `nosniff` on downloads.
8. Regenerate `openapi-schema.d.ts`: no path or operation id changes.

**kastlan**
1. Pin with `[billing,fastapi,images,mail]`.
2. `SqlAlchemyFeedbackRepository` takes the port's shape: `open_crash` from the service,
   `inbox`'s pairs through `by_ids`, `add` with the acting company's `company_id`, and a
   commit at the end of `add` and `apply` (2.7).
3. `LocalFileStorageAdapter` behind `AttachmentStorage` (`save` names `<sha12>.<ext>` under
   `feedback/` and answers the key after it; `purge` deletes and swallows a failure).
4. `feedback_actor`: `is_admin` when `ADMIN` is in `user.roles`, `display_name` first + last.
5. Include the kit's router, then kastlan's `GET /feedback/counts` and `GET
   /feedback/{feedback_id}`.
6. These go: `_enrich_many` (`user_name`, which the frontend types but never reads,
   `frontend/src/shared/types/feedback.ts:33`, and the email outside the inbox), the
   `Location` headers,
   the module-global limiters.
7. `admin_user_service`'s erase calls `erase_author`.
8. What changes: the inbox's 403 text, the throttle's sentence, no `Location`.

**Kurvenschmiede**
1. Pin with `[billing,fastapi,mail]`.
2. The repository: `get` is `visible_by_id`; the two lists keep `WITHOUT_THE_PICTURES`
   (`inbox` pairs through `authors_of`); `open_crash`; `add` claims the named uploads;
   `apply` hangs a rework's files, stores `.value`, leaves `resolved_at` to
   `stamp_settlement` and flushes through `save`.
3. `screenshot_url` and `attachment_urls` as read-only properties on `Feedback` (2.3).
4. Storage: `save` is `upload()` (sweep, keyed digest, dedupe), `read` is
   `attachment_by_key`, `purge` does nothing.
5. `feedback_router(FeedbackDeps(…, policy=ATTACHMENT_URLS, create_model=FeedbackCreate,
   update_model=FeedbackUpdate, foreign_row="not_found", require_utf8_text=True))`; the
   three `not_in_the_demo` dependencies go.
6. `erasure_service._anonymise_feedback` calls `erase_author`; the unfiled uploads' delete
   stays.
7. `feedback_loop.py` keeps its own path to the rows (`save`).

## 5. For the reviews

### 5.1 keksdose

1. kk 1: the identity stamp on create (2.13). Anything that relies on the client's
   `user_*` keys?
2. kk 2: the demo's route-level refusals become `demo_refused`, and the two sentences go
   (2.8). Does a test or a client read them?
3. kk 3: the limiters on `app.state`, the support door sharing `.upload` (2.11). Are the
   `reset_*_limiter` seams used by anything but `backend/tests/conftest.py` and
   `backend/tests/api/test_feedback_crash.py`?
4. kk 4: downloads as bytes with `nosniff` and the re-read type, the local `FileResponse`
   gone (2.12).
5. kk 5: the erasure's purge keys keep the `feedback/` prefix in the adapter, not the kit.
   Agreed?

### 5.2 kastlan

1. ka 1: who commits (2.7): the adapter at the end of `add` and `apply`, or a unit of
   work for the feedback routes?
2. ka 2: dropping `user_name`, the email outside the inbox and the `Location` headers
   (§3.1 says the email is the inbox's).
3. ka 3: the erasure under forced RLS: which rows does `urls_named_except` see? kastlan's
   keys are unique per upload, so the shared-key check can only find a URL copied into
   another report.
4. ka 4: the crash lookup's company: `open_crash` runs under the session's company filter,
   as `record_crash` does now. Confirm that it stays so in the adapter.

### 5.3 Kurvenschmiede

1. KS 1: `get` keeps `visible_to`, and the kit's foreign-row check after it with
   `"not_found"`: one guard tested in the kit, one in the query. Acceptable, given the
   service docstring's "a check afterwards is a check that can be skipped"?
2. KS 2: the claim inside the adapter's `add` and `apply` (2.4): any flow where the kit
   should see it?
3. KS 3: enums written as `.value` in `apply`, or a type on the two `String` columns
   that reads and writes the kit's enums?
4. KS 4: `resolved_at`: keep dropping the plan's for `stamp_settlement`, or take the
   plan's and keep the listener as the floor for the seed?
5. KS 5: the two properties on `Feedback` (2.3), or keep `to_response` as the hook?
6. KS 6: is `{row_id}` → `{feedback_id}` invisible to every client and test?

### 5.4 Open for Marcel

1. **Scope:** the feedback service alone in server-kit 0.9 (§3, recommended), or the
   translation review too?
2. **The foreign row:** keep the setting (2.10, recommended: §3.5 accepts both), or one
   answer, 404, for all three?
3. **The charge order:** amend §3.5 and §3.6 to what the three do (2.11, recommended)?
