# Server services behind ports — harmonisation plan (server-kit layer 2)

Led from ui-kit for round 0.36 (Marcel, 2026-10-13: "The select hints and the queued
rounds. All of them."). The server-kit README's "Layering" table names the step: the
feedback service written once against a repository, storage and clock port each app
implements, and a router factory `feedback_router(deps)` with the app's hooks. It is built
from a read-only survey of the three backends on 2026-10-13 (kk `79b2949c`, ka `936f8b8`,
KS `c34cba0`) and the three apps' reviews of the same day (kk at `c90d068e`, ka at
`f2b9574`, KS at `bcadab6`). The wire stays
[feedback-harmonization.md](feedback-harmonization.md) §3.

Backend paths are relative to each app's package: **kk** = keksdose
(`backend/keksdose/`), **ka** = kastlan (`kastlan/`, at the repo root), **KS** =
Kurvenschmiede (`backend/kurvenschmiede/`); a `frontend/`, `scripts/`, `deploy/`,
`tests/` (ka) or `backend/tests/` path is from the repo root. "Code" counts lines that are
not blank, comments or docstrings.

## Status

**Settled 2026-10-13, building in server-kit 0.9.** The three apps reviewed the draft on
2026-10-13 and Marcel decided what they left open ("As recommended", §2). The reviews'
corrections are folded into §1–§4, and §5 says where each went. §4 is the build list.
Nothing is built yet.

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
| A demo | layer 1 refuses writes: `DEMO_WRITES` (`infrastructure/demo_guard.py:33-48`; `:41` exempts the crash route, which is how a demo's crash reaches the route's own `stored: false`, router `:153-154`), `demo_read_only` through `get_current_user` (`:74-80`); plus the route's own 403 sentences on create and upload (router `:120-121`, `upload_guards.py:68-73`), none on PATCH (router `:189-208`) | layer 1 only (`infrastructure/dependencies.py:281-304`) | `not_in_the_demo` on three routes, `demo_refused` (`infrastructure/dependencies.py:58-69`; router `:114`, `:183`, `:256`) | 2.8 |
| How a test finds a route's guards | by `__name__` (`guard_billing_write`, `backend/tests/api/test_billing_gate.py:219-236`) | by its `require_role`'s `allowed_roles` attribute (`infrastructure/dependencies.py:359`; `tests/api/test_staff_only_routes.py:95-110`) | by qualname: `not_in_the_demo.`, `require_role.`, `get_current_user` (`backend/tests/api/route_table.py:38-62`; `test_demo.py:260-302`) | 2.8 |
| Limiters | module globals (router `:41`; `upload_guards.py:83`, shared with support) | module global (router `:56`) | per app on `app.state` (`main.py:205`) | 2.11 |
| Who commits | `commit_boundary`, function scope, app-wide (`infrastructure/dependencies.py:48-77`, `main.py:163`); the service flushes; nothing runs after the commit: a purge is an `after_commit` listener (`budgets_service.py:739-751`) | no unit of work (`infrastructure/dependencies.py:160-174`); the service commits every write (service `:108`, `:139`, `:162`, `:193`) | `get_db_session` commits at the end (`infrastructure/database.py:108-124`); the service flushes | 2.7 |
| Status and category columns | database enums (`domain/models/feedback.py:47-52`) | database enums (`value_enum`) | `String` columns; the service writes `.value` (service `:366-367`) | 2.4 |
| `resolved_at` | the plan's | the plan's | derived from the status on every flush (`domain/models/feedback.py:195-262`); the plan's is dropped (service `:363`) | 2.4 |
| The answer | `model_validate(row)` | `user_name` and `user_email` on every answer, also outside the inbox (router `:59-71`) | URLs read off the attachment rows (router `:83-107`) | 2.9 |
| App extras | — | `Location` headers (router `:116`, `:163`); `GET /feedback/counts`, `GET /feedback/{id}` (router `:237-258`) | title trimmed, outcome ≤ 4 000 (`domain/schemas/feedback.py:59-62`, `:81-96`) | 2.9 |
| Download headers | disposition by type, `attachment.<ext>`; no `nosniff` from the app, but prod's edge sends it on every answer (`deploy/gcp/Caddyfile.cloudrun:95-99`, `deploy/Caddyfile:39-43`); `FileResponse` on local disk (router `:99-109`) | `nosniff`; `Content-Disposition` only for non-images (router `:137-141`) | type re-read from the bytes, disposition always with the stored name, `nosniff` (router `:162-175`) | 2.12 |
| Upload checks | `ensure_decodable_image` (`upload_guards.py:240`) | the same (router `:111`) | no `images` extra; UTF-8 text only (router `:66`) | 2.9 |
| The clock | `plan_update` and `crash_seen_at` default to `datetime.now(UTC)` | the same | `crash_seen_at(…, datetime.now(UTC))` (service `:409`); the sweep (`:289`), `stamp_settlement` (`domain/models/feedback.py:223`) | 2.6 |
| The inbox's 403 | "Insufficient role" (`require_role`, `infrastructure/dependencies.py:503-510`, the raise at `:507`) | "User roles [...] are not authorized for this action" (`infrastructure/dependencies.py:341-355`) | "Insufficient role" (`infrastructure/dependencies.py:39-53`) | 2.8 |
| Ties in a list | `created_at` | `created_at`, then `id` | `created_at` | 2.4 |

**Two layers named 2.** The README's "Layer 2 — the read-only database transaction — is a
recipe, not kit code (§6.3)" is the demo's second layer (landing-demo §6.3): kastlan's
`SET TRANSACTION READ ONLY` for a demo's reads. It is unrelated to the kit's layer 2 and
stays a recipe: the service runs in the app's session, so a demo's read-only transaction
still holds, and the kit still has no SQLAlchemy; it lives in the adapters.

## 2. Decisions

**Decided (Marcel, 2026-10-13: "As recommended"):**
1. **The translation review waits for server-kit 0.10** (§3).
2. **The foreign row stays the app's setting**, `foreign_row`: 403 or 404, since feedback
   §3.5 accepts both (2.10).
3. **The limiter is charged before the work**: before an upload is read, before a crash's
   dedupe, as all three apps do; feedback §3.5 and §3.6 are amended to say so (2.11).
4. **The guards, the actor and the transaction:**
   - the demo refusal and the inbox's admin check stay route dependencies, and they are
     the app's own guards, passed in `FeedbackDeps` (2.8);
   - the ports carry who is asking: `get(id, *, viewer)` and `apply(row, changes, *,
     actor)`, with `actor=None` for the erasure, which claims nothing (2.4);
   - the kit never commits. kastlan's adapter commits only when a flag set by the router's
     dependency is on, so its erasure stays one commit (2.7);
   - keksdose runs nothing after the request's commit, so the kit deletes no file:
     `erase_author` returns the keys, and each app purges them at its own commit (2.15).

The other rules below were the draft's, and the reviews agreed with them. Their
corrections are folded in, and 2.16 comes from them (§5).

### 2.1 Where it lives, and the extra

In the `feedback` package, as four new modules (§4.1):
- `feedback.ports` and `feedback.service`: no FastAPI, re-exported from
  `eifi1_server_kit.feedback`, so a CLI such as KS's `feedback_loop.py` uses them (2.16);
- `feedback.router`: FastAPI, not re-exported, behind a new **`fastapi` extra**
  (`fastapi>=0.115.0`, `python-multipart>=0.0.18`: the apps' floors, no ceiling, since kk
  holds FastAPI below 0.137). Without it, importing the module raises `ImportError` naming
  the extra, as `images` does;
- `feedback.testing`: no FastAPI and no httpx, not re-exported, like `billing.testing`.

`feedback.errors` gains three refusals (2.10). The rule for layer 2: a module may import
FastAPI and Starlette; never SQLAlchemy, never an app's model or `User`. Layer 1's names do
not change. **server-kit 0.9.0** (additive).

### 2.2 The identity view

```python
@dataclass(frozen=True, slots=True)
class FeedbackActor:
    id: int
    email: str
    display_name: str | None  # the context stamp's and a crash body's name
    is_admin: bool            # kk role ADMIN; ka ADMIN in the acting company; KS role ADMIN
    is_demo: bool = False
```

One app dependency builds it from the app's own `get_current_user`; the kit never sees the
app's `User`. The kit passes it as the `viewer` of a read, the `uploader` of a file and the
`actor` of a write. `is_admin` says exactly what the app's `admin_guard` lets through
(2.8). A caller without a session, such as KS's feedback loop, builds one for the account
it files under (2.16).

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
    @property
    def created_at(self) -> datetime: ...


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

The app's row is read as it is (billing's `SubscriptionRow` is the precedent), and the kit
never assigns to it. Every write goes through the repository, so KS's string columns, its
claimed files and its `stamp_settlement` stay in its adapter. KS adds two read-only
properties, `screenshot_url` and `attachment_urls`, read off its attachment rows as its
`to_response` already does (router `:90-91`), and moves `ATTACHMENT_URLS` beside the model
so the properties can build the URLs (KS 5). `created_at` is read only for the order
(2.4, 2.14). A mapped dataclass for every row would cost each app a mapping both ways and
lose the session's identity map, for no rule gained.

### 2.4 The repository port

```python
class FeedbackRepository[RowT: FeedbackRow](Protocol):
    async def get(self, feedback_id: int, *, viewer: FeedbackActor) -> RowT | None:
        """The row, or None: missing, or hidden from this viewer (ka's RLS, KS's visible_to)."""
    async def list_mine(self, user_id: int) -> Sequence[RowT]:
        """The author's rows, newest first, the higher id first on a tie."""
    async def inbox(self, status: FeedbackStatus | None) -> Sequence[tuple[RowT, str | None]]:
        """Every row the request may see, in list_mine's order, each with its author's
        current address: an outer join, None once the author is erased."""
    async def open_crash(self, fingerprint: str) -> RowT | None:
        """The newest row with this fingerprint whose status is not in TERMINAL_STATUSES,
        the higher id first on a tie."""
    async def add(self, new: NewFeedback) -> RowT:
        """Insert and flush, so the id is set. The app adds its own columns (ka's company)
        and checks what is its own (KS claims the named uploads as new.user_id's)."""
    async def apply(self, row: RowT, changes: Mapping[str, Any], *,
                    actor: FeedbackActor | None) -> RowT:
        """Assign and flush. The keys are §3.1's columns; the values the kit's (enums
        included: a string column stores .value). `actor` makes the change: the request's
        for an update and a crash's fold, None for the erasure (2.15)."""
    async def by_author(self, user_id: int) -> Sequence[RowT]:
        """The erasure's rows (2.15)."""
    async def urls_named_except(self, row_ids: Collection[int]) -> set[str]:
        """Every attachment URL the rows outside row_ids name, in a column or the body
        (feedback_attachment_urls): the erasure's shared-key check."""
```

This shape, async (2.7). **`get` and `apply` carry who is asking** (KS 2.2): KS's `get`
is `visible_by_id` for that viewer, and its `apply` claims a rework's files as the
actor's uploads; kk's and ka's ignore both (ka's RLS hides by the session's company). A
tie in a list goes to the higher id in all three, as ka orders today (kk and KS order by
`created_at` alone).

KS's adapter keeps what is KS's, and the kit sees none of it (KS 2):
- `add` claims the named uploads; its 422 `UnknownAttachmentError` stays its own, a
  subclass of the kit's;
- `apply` hangs a rework's files, claimed as `actor`'s; nulling `screenshot_url` and
  `attachment_urls`, which only the erasure sends, clears the row's attachment rows (KS
  2.3; 2.15); it writes enums as `.value` (KS 3), drops the plan's `resolved_at` for
  `stamp_settlement` (KS 4), and flushes through its `save(session, row, actor=actor)`
  (2.16).

kk's and ka's `apply` is the `setattr` loop they have today.

### 2.5 The storage port

```python
@dataclass(frozen=True, slots=True)
class StoredAttachment:
    data: bytes
    media_type: str | None  # as stored, or from the key's extension (kk, ka); the kit re-reads the bytes (2.12)
    filename: str | None    # None: "attachment.<ext>"


class AttachmentStorage(Protocol):
    async def save(self, data: bytes, upload: CheckedUpload, *, uploader: FeedbackActor,
                   filename: str | None) -> str:
        """Store a checked file and answer its key, one the app's AttachmentUrlPolicy accepts."""
    async def read(self, key: str, *, viewer: FeedbackActor) -> StoredAttachment | None:
        """The file, or None: missing, or not this viewer's to read (KS)."""
```

The storage mints the key, so each app keeps its own: kk `content_addressed_key`, ka
`<uuid32>_<sha12>`, KS its HMAC with its dedupe and its sweep. **The port has no purge:**
the kit deletes no file. The erasure returns the keys and each app deletes them at its own
commit (2.15).

### 2.6 The clock

`type Clock = Callable[[], datetime]`, aware UTC, default `utc_now`; not `limiter.Clock`,
which is a monotonic float. The kit uses it for `resolved_at` (`plan_update(now=…)`) and a
crash's `seen_at`. The three use `datetime.now(UTC)` today without saying so (1.3), so
nothing changes but the tests, which pass a fixed one. KS's sweep and `stamp_settlement`
keep their own clock: they are its adapter.

### 2.7 Async, and who commits

The ports are async, since the three use `AsyncSession`. **The kit never commits, rolls
back or opens a transaction.** Every port write flushes, so an id or a constraint failure
surfaces inside the call. **One write per request:** each of the router's flows makes at
most one repository write (`add` or `apply`), and it is the flow's last database step;
the kit's tests assert it on the fake (2.14). Who commits:
- **keksdose:** `commit_boundary`, function scope, app-wide
  (`infrastructure/dependencies.py:48-77`, `main.py:163`). The repository dependency takes
  `Depends(db_session)` (`:45`), which FastAPI caches per request, so its session is the
  one `commit_boundary` commits. **Nothing runs after that commit.** Work that must wait
  for it is armed on the session as an `after_commit` listener, as the erasure's purge is
  (`budgets_service.py:739-751`; 2.15).
- **kastlan** has no unit of work (`get_db_session` only yields,
  `infrastructure/dependencies.py:160-174`). Its adapter commits after the flush of `add`
  and `apply` **only when its `commit` flag is on, and only the router's repository
  dependency sets it** (ka 1, kastlan's pick). By the one-write rule that commit ends the
  request's work, as `commit_created` does in each of its services today. The erasure
  builds the adapter with the flag off, so its `apply` calls only flush and
  `AdminUserService.erase` stays one commit: reports anonymised, the user deleted, the log
  row written (`admin_user_service.py:378` → `:414`). A committing `apply` there would
  commit the reports before the user is deleted. A request-level unit of work for kastlan
  stays a round of its own.
- **Kurvenschmiede:** `get_db_session` commits at the end
  (`infrastructure/database.py:108-124`); the service flushes.

### 2.8 The demo and the inbox: the app's guards, as route dependencies

All three answer a demo the same (landing-demo §6.4): feedback and uploads refused, a crash
202 `stored: false`, the GET routes served. **Decided (4):** the demo refusal and the
inbox's admin check stay route dependencies, and **they are the app's own guards**:
- `FeedbackDeps.demo_guard` is the app's factory. The router calls it with `"uploads"` for
  `POST /feedback/attachments` and with `"feedback"` for `POST /feedback` and `PATCH`;
- `FeedbackDeps.admin_guard` is the app's dependency for `GET /feedback`;
- the router puts them in each route's `dependencies=[…]`, so FastAPI runs them before the
  endpoint's parameters and before the body is validated. KS's walk sends `json={}` and
  expects 403 `demo_refused` (`backend/tests/api/test_demo.py:284-302`).

**Why the app's guards, not kit guards with stable qualnames:**
- **The apps' route walks classify routes by their own guards** (1.3). KS reads the
  qualname of every dependency in a route's tree (`not_in_the_demo.`, `require_role.`,
  `get_current_user`; `route_table.py:38-62`) and asserts the refused and allowed sets
  (`test_demo.py:260-282`). kastlan reads its `require_role`'s `allowed_roles` attribute
  (`tests/api/test_staff_only_routes.py:95-110`). A kit-owned admin check would make
  `GET /feedback` "any signed-in" there and fail the tenant sweep. With the app's guards
  both walks pass unchanged. With kit guards, KS would have to teach its walk the kit's
  names, and kastlan's walk, which reads an attribute and not a name, could not see the
  check at all.
- **A closure's qualname is not an API.** The kit would have to freeze names that an
  app's test depends on.
- **The guard is the one the app already uses and tests** on its other routes, with the
  same 403 text and the same order.

kk and ka have no route-level demo guard today: layer 1 refuses a demo's writes in
`get_current_user`, and kk's two sentences sit inside its routes (router `:120-121`,
`upload_guards.py:68-73`). Each writes KS's four-line factory around the kit's
`refuse_demo` (§4.4). Over HTTP their layer 1 still answers first with `demo_read_only`
(kk `infrastructure/demo_guard.py:74-80`, ka `infrastructure/dependencies.py:281-304`), so
the factory is the second guard each app used to write by hand, now in one place. kk's two
sentences go. `POST /feedback/crash` takes no guard: the service answers `stored: false`
before the limiter and before any read, and kk's and ka's layer 1 exempts the path (kk
`demo_guard.py:41`), so the path must stay exactly `POST /api/v1/feedback/crash`.

**The service keeps the rule too.** `create`, `update` and `upload_attachment` call
`refuse_demo(actor.is_demo, …)` first, and `inbox` refuses a non-admin with
`FeedbackForbiddenError("Insufficient role")`. Over HTTP the route's guard always answers
first. The service's check holds for a caller without the router (2.16).

### 2.9 The router factory

```python
def app_state_limiters(request: Request) -> FeedbackLimiters:
    return request.app.state.feedback_limiters


@dataclass(frozen=True, slots=True, kw_only=True)
class FeedbackDeps[RowT: FeedbackRow]:
    # FastAPI dependencies, the app's
    actor: Callable[..., Any]                        # -> FeedbackActor
    repository: Callable[..., Any]                   # -> FeedbackRepository[RowT], on the request's session
    storage: Callable[..., Any]                      # -> AttachmentStorage
    demo_guard: Callable[[str], Callable[..., Any]]  # the app's factory: demo_guard("uploads"), demo_guard("feedback")
    admin_guard: Callable[..., Any]                  # on GET /feedback
    # the app's shapes
    policy: AttachmentUrlPolicy                      # the app's keys and URLs
    create_model: type[FeedbackCreate] = FeedbackCreate  # the app's subclasses: names and fields
    update_model: type[FeedbackUpdate] = FeedbackUpdate
    response_model: type[FeedbackResponse] = FeedbackResponse
    to_response: Callable[[RowT, str | None], FeedbackResponse] | None = None
    # the app's choices
    foreign_row: Literal["forbidden", "not_found"] = "forbidden"
    decode_images: bool = False                      # ensure_decodable_image, the images extra (kk, ka)
    require_utf8_text: bool = False                  # KS
    limiters: Callable[[Request], FeedbackLimiters] = app_state_limiters
    now: Clock = utc_now


def feedback_router[RowT: FeedbackRow](
    deps: FeedbackDeps[RowT], *, prefix: str = "/feedback", tags: Sequence[str] = ("feedback",)
) -> APIRouter: ...
```

- **The routes** are §3.3's seven, in the order of §4.1, the attachment routes first. The
  endpoints carry kk's names (`upload_attachment`, `download_attachment`, `create`,
  `report_crash`, `list_my`, `list_all`, `update`), the upload's multipart field is `file`,
  the inbox's query parameter `status_filter`, and the path parameter `{feedback_id}`. So
  kk's operation ids, its `Body_upload_attachment_api_v1_feedback_attachments_post`
  component and its `status_filter` stay (kk
  `frontend/src/shared/api/openapi-schema.d.ts:2401-2513`), ka's `download_attachment`
  route name stays, and KS's `{row_id}` becomes `{feedback_id}` (its client builds the
  path by hand, KS `frontend/src/shared/api/endpoints.ts:563`).
- **The guards** are the app's (2.8), first in each route's `dependencies`.
- **The prefix and the tags** are the app's: `app.include_router(feedback_router(deps),
  prefix="/api/v1")`, as each includes its routers today. `policy.prefix` must be the
  mounted path (`/api/v1/feedback/attachments/` by default). kastlan's upload URL came from
  its `Location` header until now (router `:116-120`), so it always matched the mount; the
  kit answers `policy.url_for(key)`, and `testing.check_round_trip` checks that the two
  agree (ka 2).
- **The schemas are the app's subclasses**, so the OpenAPI components keep their names and
  the app's fields (ka's `company_id`, KS's trimmed title and outcome cap). The factory
  raises `ValueError` when `create_model.attachment_url_policy` is not `policy`: two
  policies would let a report name a key the download refuses.
- **`to_response`**: by default `response_model.model_validate(row)`, with `user_email` set
  in the inbox only (§3.1). KS uses the default, since its row gains the two properties
  (2.3; KS 5).
- **An app's own routes** go after the kit's router: ka's `GET /feedback/{feedback_id}`
  included first would take `GET /feedback/my`.
- **The limiters** are read per request from `app.state.feedback_limiters` (KS's shape;
  the README's "build limiters per app"). kk's support door charges the same `.upload`
  window through `throttle_upload`, as it does now, so the 429 sentence is written once
  (kk 3).

### 2.10 Errors, and the foreign row

The router raises no `HTTPException`. Everything past the app's guards is a kit refusal,
answered by `install_contract_error_handlers`, which all three install (kk `main.py:208`,
ka `main.py:179`, KS `main.py:294`). New, all `FeedbackError`s and so already in
`CONTRACT_ERRORS`:
- `FeedbackNotFoundError`: 404 "Feedback not found";
- `AttachmentNotFoundError`: 404 "Attachment not found";
- `FeedbackThrottledError`: 429 with `Retry-After`, kk's sentence "Too many attachments
  uploaded — please try again later." (ka and KS change theirs).

**The inbox's 403 over HTTP is the app's guard's** (2.8): "Insufficient role" in kk and KS,
kastlan's own sentence in kastlan, unchanged. The service's
`FeedbackForbiddenError("Insufficient role")` answers only a caller without the router.

A PATCH, in this order:
1. the app's demo guard (403 `demo_refused`; in kk and ka layer 1's `demo_read_only`
   answers before it. kk's PATCH route has no demo check of its own today, router
   `:189-208`);
2. the body's validation (422);
3. then the service, in kk's order (`feedback_service.py:116-131`): `reject_manual_crash`
   (422, before the lookup), `get(feedback_id, viewer=actor)` (404), the foreign row,
   `plan_update` (403 or 422), `apply(row, plan.changes, actor=actor)`.

**The foreign row stays the app's choice** (decided, 2), since feedback §3.5 accepts both.
A row is foreign when the actor is neither an admin nor its author. `"forbidden"` lets
`plan_update`'s 403 speak (kk, ka); `"not_found"` answers 404 "Feedback not found" before
it (KS). An admin is never refused this way, and an adapter that hides rows in `get` (KS's
`visible_to`, ka's RLS) gets a 404 for those whatever the setting. KS accepts the kit's
check after its query (KS 1): one guard tested in the kit, one in the query.

### 2.11 When the limiter is charged

**Decided (3):** the kit charges before the work, as all three do (1.2): an upload before
it is read, a crash before the lookup. Feedback §3.5 and §3.6 used to recommend charging
after validation and after the dedupe, and are amended to say this (2026-10-13). The
window bounds the work a looping client makes the server do, and reading and sniffing
10 MB, or a lookup and a write, is that work. A refused file uses a slot too; a crash's
repeats count, so `occurrences` stops rising after 20 in an hour.

### 2.12 The download

KS's rules for all three:
- the type is read off the bytes: their signature, else `text/plain` when stored as text
  (the bare type, so kk's and ka's `text/plain; charset=utf-8` from the extension counts)
  and still text (`require_utf8_text` per app), else `application/octet-stream`;
- `Content-Disposition` always, `inline` for the four pictures only, with the stored name or
  `attachment.<ext>`;
- `X-Content-Type-Options: nosniff` always.

The bytes go out in a `Response` (10 MB at most). kk's `FileResponse` for the local disk
(dev only, `file_serving.py:43-52`) goes from this route; `serve_stored_file` stays for kk's
other four. kk 4 agreed:
- kk's type, read from the key's extension today (router `:95-96`), is the type the bytes
  give, since `check_upload` set that extension from them;
- kk's local store implements `read` (`adapters/external/invoice_file_store.py:116`), so a
  `Response` works in dev too;
- kk's client fetches attachments as authenticated blobs
  (`frontend/src/shared/components/authed-image.tsx:22`);
- `nosniff` makes no difference a kk user sees, since prod's edge already sends it (1.3).

### 2.13 The identity stamp

`stamp_identity` on every create (§3.2 recommends it; ka and KS do it). kk gains it: a
client can no longer file in someone else's name. Nothing in kk relies on the client's
`user_*` keys: the kit's client already sends the session user's, and no backend code or
test reads them on a create (kk 1). One visible change: a create sent with `context: null`
now stores the three keys instead of NULL.

### 2.14 Testing support

`eifi1_server_kit.feedback.testing` in the wheel, not re-exported (signatures in §4.1):
- `InMemoryFeedbackRepository` and `InMemoryAttachmentStorage`, the fakes the kit's own
  tests run on. The repository records each write, so a test asserts the one-write rule
  (2.7). The storage mints content-addressed keys;
- `actor(**overrides)` and `fixed_clock(at)`;
- `check_repository` and `check_storage`: async conformance checks an app runs once
  against its own adapters, on its test database. `check_repository` **saves through the
  storage port, as the report's author, before it names a file**, since KS's `add` claims
  only the uploader's own unfiled uploads (KS 2.6). It asserts only on the rows it adds,
  and never on `resolved_at`, which KS derives (KS 4);
- `check_round_trip(client, *, policy, headers)`: upload, then download through the URL
  the upload answered, which also checks that `policy.prefix` is the mount (ka 2).

The kit's own tests drive `feedback_router` through FastAPI's `TestClient` on the fakes:
§3's behaviour is tested once. The apps keep a wiring test per route and their own
variations (KS's visibility and claim, ka's RLS).

### 2.15 The erasure

The three copies agree but query the other rows differently (kk `id NOT IN` the author's,
ka `user_id IS NOT NULL`). `FeedbackService.erase_author(user_id, identifiers)` →
`ErasedFeedback(reports, keys)`:
1. `by_author(user_id)`;
2. for each row, `anonymise_feedback` (the title, the body, the context, the two URL
   columns read off the row, `identifiers`, the service's policy), then `apply(row,
   result.changes, actor=None)`. An erasure claims nothing and answers nobody;
3. when the rows named any URL, `urls_named_except(their ids)` (kk's `id NOT IN`), then
   `attachment_keys_to_purge` → `keys`, bare policy keys, sorted.

The app calls it inside its own erasure transaction, with a repository that does not
commit (kastlan's flag off, 2.7). **The kit deletes no file** (decided, 4; kk 5): each app
deletes the keys its own way, at its own commit.
- **keksdose** prefixes `feedback/` (`budgets_service.py:1284`) and puts the keys in the
  list it already arms with `_purge_objects_after_commit`, beside the support keys
  (`:1419`). They are deleted after the commit, dropped on a rollback, and never fatal.
- **kastlan** deletes `feedback/<key>` after its one commit and swallows a failure
  (`admin_user_service.py:414-420`, unchanged). Its erasure runs on the superuser session,
  so `urls_named_except` sees every company's rows, as it must (ka 3).
- **Kurvenschmiede** ignores `keys`: its files are rows, and its `apply` clears a report's
  attachment rows when the erasure nulls the two URL columns (KS 2.3), which today's
  `report.attachments.clear()` does (`erasure_service.py:452`). The same key can sit on
  the rows of several reports there, so files go by report, never by key.

No other flow deletes a file: a PATCH that stops naming a URL leaves its file, as in all
three today. kk's `feedback_comments` scrub (`budgets_service.py:1286-1292`) and KS's
unfiled uploads (`erasure_service.py:453-459`) stay in the apps' erasure services.

### 2.16 Where an app reacts to a write, and callers without the router

**No hook in `FeedbackDeps`.** Every write the kit makes goes through `add` or `apply`, and
`apply` sees the row before the change, the changes and who makes them: the request's
actor for an update and a crash's fold, `None` for the erasure. That is where an app
reacts. **Kurvenschmiede's `feedback_answered`** (the notifications contract) sits in its
`save(session, row, actor=…)`, which its `apply` flushes through. There it compares the
stored status with the new one, by the notifications contract's rules (KS 1.1, KS 2.5).
Its feedback loop's `--resolve` writes through the same `save` with the first admin as
the actor (`feedback_loop.py:176-222`), so both writers reach the hook.

**A caller without the router uses the service** with the app's repository. KS's
`feedback_loop.file_report` (`feedback_loop.py:225-249`) files through
`FeedbackService(…).create(actor, payload)` with the first admin as the `FeedbackActor`
(KS 2.4). A report filed from the command line is then one the POST could have filed:
the stamp, the first status, the CRASH refusal. The service's own demo and admin checks
hold there (2.8).

## 3. Scope of server-kit 0.9

**Decided (1): the feedback service and its router, with the erasure (2.15).**

**The translation review is server-kit 0.10.** Its list, save and clear are the closest
other copies: kk `translation_review_service.py:133-250`, ka `TranslationReviewService`
(`translation_review_service.py:164-258`, with its repository), KS
`translation_review_service.py:123-207`, about 75 service and 40 router code lines each,
on the same three routes (`GET` and `PUT /translations/reviews`, `POST
/translations/reviews/clear`). But kk's actor may also be a review token from the
showcase's origin (`translations_router.py:42-62`, `:128-148`), and ka adds `GET
/translations/documents` (`:63-71`): a second actor shape and an extension point the
feedback router does not need. The ports settle on one service first; the translation
review follows in 0.10 on the same pattern: a `TranslationReviewStore` port and a reviewer
view carrying the grant.

Not candidates: billing (already behind ports), the demo's start (`DemoGate`), the jobs
token (one dependency).

## 4. What ships, what stays

### 4.1 server-kit 0.9.0: the build list

Additive: no layer-1 name changes. Paths are from the server-kit repo's root.

**`pyproject.toml`**
- `version = "0.9.0"`.
- A new extra, with a comment in the style of the other three:
  `fastapi = ["fastapi>=0.115.0", "python-multipart>=0.0.18"]`. These are the apps'
  floors, with no ceiling: kk holds FastAPI below 0.137 itself.
- The dev group gains `python-multipart>=0.0.18`, which FastAPI's `UploadFile` needs in the
  router's tests. `fastapi` is already there.

**`src/eifi1_server_kit/feedback/ports.py`** (new; no FastAPI, no SQLAlchemy): `Clock`,
`utc_now`, `FeedbackActor`, `FeedbackRow`, `NewFeedback`, `StoredAttachment`,
`FeedbackRepository`, `AttachmentStorage`, exactly as §2.2–§2.6 write them, docstrings
included.

**`src/eifi1_server_kit/feedback/service.py`** (new; no FastAPI):

```python
@dataclass(frozen=True, slots=True)
class ErasedFeedback:
    reports: int            # rows anonymised
    keys: tuple[str, ...]   # bare policy keys no other row names, sorted; the app deletes them at its commit


@dataclass(frozen=True, slots=True)
class AttachmentDownload:
    data: bytes
    media_type: str
    headers: dict[str, str]  # Content-Disposition, X-Content-Type-Options


class FeedbackService[RowT: FeedbackRow]:
    def __init__(self, repository: FeedbackRepository[RowT], *, policy: AttachmentUrlPolicy,
                 foreign_row: Literal["forbidden", "not_found"] = "forbidden",
                 now: Clock = utc_now) -> None: ...
    async def create(self, actor: FeedbackActor, payload: FeedbackCreate) -> RowT: ...
    async def report_crash(self, actor: FeedbackActor, payload: CrashReportCreate, *,
                           limiter: SlidingWindowRateLimiter | None = None) -> CrashReportResponse: ...
    async def list_mine(self, actor: FeedbackActor) -> Sequence[RowT]: ...
    async def inbox(self, actor: FeedbackActor,
                    status: FeedbackStatus | None = None) -> Sequence[tuple[RowT, str | None]]: ...
    async def update(self, actor: FeedbackActor, feedback_id: int, payload: FeedbackUpdate) -> RowT: ...
    async def erase_author(self, user_id: int, identifiers: Iterable[str | None]) -> ErasedFeedback: ...


def throttle_upload(limiter: SlidingWindowRateLimiter, user_id: int) -> None: ...

async def upload_attachment(
    actor: FeedbackActor, file: UploadSource, *, declared_type: str | None, filename: str | None,
    storage: AttachmentStorage, policy: AttachmentUrlPolicy,
    limiter: SlidingWindowRateLimiter | None, decode_images: bool = False,
    require_utf8_text: bool = False,
) -> str: ...  # the URL

async def download_attachment(
    actor: FeedbackActor, key: str, *, storage: AttachmentStorage, policy: AttachmentUrlPolicy,
    require_utf8_text: bool = False,
) -> AttachmentDownload: ...
```

Each one, in order:
- `create`: `refuse_demo(actor.is_demo, "feedback")`;
  `reject_manual_crash(payload.category)`; `add(NewFeedback(…))` with `user_id=actor.id`,
  the payload's title, body, category and URLs (`attachment_urls` None for none),
  `status=initial_status(author_is_admin=actor.is_admin)` and
  `context=stamp_identity(payload.context, user_id=actor.id, user_email=actor.email,
  user_display_name=actor.display_name)`.
- `report_crash`: `stored: false` for a demo, then for a spent window
  (`limiter.hit(str(actor.id))`), before any read; `crash_fingerprint(payload, actor.id)`,
  `crash_seen_at(payload, self.now())`; `open_crash(fingerprint)`. A row: `apply(row,
  {"context": fold_crash_context(row.context, seen_at)}, actor=actor)`, `duplicate: true`.
  None: `add` with `crash_title`, `crash_body`, category CRASH,
  `initial_status(author_is_admin=actor.is_admin, crash=True)`, `crash_context` and the
  fingerprint. It answers `stored: true`, the row's id and `crash_reference(fingerprint)`.
- `list_mine`: `list_mine(actor.id)`.
- `inbox`: `FeedbackForbiddenError("Insufficient role")` unless `actor.is_admin`, then
  `inbox(status)`.
- `update`: `refuse_demo(actor.is_demo, "feedback")`, then 2.10's step 3, with
  `plan_update(status=row.status, body=row.body,
  changes=payload.model_dump(exclude_unset=True), is_admin=actor.is_admin,
  is_author=row.user_id == actor.id, now=self.now())`.
- `erase_author`: 2.15's three steps.
- `throttle_upload`: `limiter.hit(str(user_id))`; a wait raises
  `FeedbackThrottledError(wait)`. kk's support door calls it too.
- `upload_attachment`: `refuse_demo(actor.is_demo, "uploads")`; `throttle_upload` when a
  limiter is given; `read_capped_upload(file)`; `check_upload(data, declared_type,
  require_utf8_text=…)`; `ensure_decodable_image(data, checked.media_type)` when
  `decode_images`; `key = await storage.save(data, checked, uploader=actor,
  filename=filename)`; it answers `policy.url_for(key)`.
- `download_attachment`: `AttachmentNotFoundError` unless `policy.is_key(key)`, then
  `storage.read(key, viewer=actor)` or `AttachmentNotFoundError`; the type and headers of
  2.12 (`signature_type`, `bare_media_type`, `is_plain_text`, `inline_or_attachment`,
  `content_disposition` with the stored name or `attachment.<the key's extension>`).

**`src/eifi1_server_kit/feedback/router.py`** (new; the `fastapi` extra):
- Without FastAPI, importing it raises `ImportError("eifi1_server_kit.feedback.router needs
  FastAPI: install the kit with its fastapi extra, eifi1-server-kit[fastapi].")`.
- **No `from __future__ import annotations`** in this module: the endpoints' parameter
  types are the app's models, closed over in the factory, and FastAPI cannot resolve a
  string annotation that names a local.
- `app_state_limiters`, `FeedbackDeps` and `feedback_router` as 2.9 writes them. The
  factory raises `ValueError` when `create_model.attachment_url_policy != policy`. Each
  request builds `FeedbackService(repository, policy=deps.policy,
  foreign_row=deps.foreign_row, now=deps.now)`; every answer but the download's and the
  crash's goes through `to_response` (2.9).
- The routes, in this order, on `APIRouter(prefix=prefix, tags=list(tags))`. "actor",
  "storage" and "repository" are `Depends(deps.actor)` and so on; the guards are each
  route's `dependencies=[Depends(…)]`:

| # | Route | Endpoint | Guard | Parameters | Answer |
|---|---|---|---|---|---|
| 1 | `POST /attachments` | `upload_attachment` | `demo_guard("uploads")` | `request: Request`, `file: UploadFile = File(...)`, actor, storage; the limiter `deps.limiters(request).upload`, `declared_type=file.content_type`, `filename=file.filename` | 201 `FeedbackAttachmentResponse` |
| 2 | `GET /attachments/{key}` | `download_attachment` | — | `key: str`, actor, storage | 200 `Response(data, media_type=…, headers=…)` |
| 3 | `POST ""` | `create` | `demo_guard("feedback")` | `payload: create_model`, actor, repository | 201 `response_model` |
| 4 | `POST /crash` | `report_crash` | — | `payload: CrashReportCreate`, `request: Request`, actor, repository; the limiter `.crash` | 202 `CrashReportResponse` |
| 5 | `GET /my` | `list_my` | — | actor, repository | `list[response_model]` |
| 6 | `GET ""` | `list_all` | `admin_guard` | `status_filter: FeedbackStatus \| None = None`, actor, repository | `list[response_model]`, each with `user_email` |
| 7 | `PATCH /{feedback_id}` | `update` | `demo_guard("feedback")` | `feedback_id: int`, `payload: update_model`, actor, repository | `response_model` |

**`src/eifi1_server_kit/feedback/errors.py`** gains:

```python
#: kk's sentence (upload_guards.py:97); the support door raises it too.
THROTTLED_DETAIL = "Too many attachments uploaded — please try again later."

class FeedbackNotFoundError(FeedbackError):    # 404, "Feedback not found" by default
class AttachmentNotFoundError(FeedbackError):  # 404, "Attachment not found" by default
class FeedbackThrottledError(FeedbackError):   # 429
    def __init__(self, retry_after: float, detail: str = THROTTLED_DETAIL) -> None: ...
    @property
    def headers(self) -> dict[str, str]: ...   # {"Retry-After": retry_after_header(retry_after)}, as DemoError's
```

`contract_error_response` already puts a refusal's `headers` on the answer, and
`CONTRACT_ERRORS` already covers `FeedbackError`: nothing changes in `errors.py`.

**`src/eifi1_server_kit/feedback/testing.py`** (new; no FastAPI, no httpx):

```python
@dataclass
class MemoryFeedbackRow: ...  # every §3.1 column, mutable; satisfies FeedbackRow

class InMemoryFeedbackRepository:  # a FeedbackRepository[MemoryFeedbackRow]
    def __init__(self, *, emails: Mapping[int, str] | None = None,
                 hidden: Callable[[MemoryFeedbackRow, FeedbackActor], bool] | None = None,
                 now: Clock = utc_now) -> None: ...
    rows: dict[int, MemoryFeedbackRow]
    writes: list[tuple[Literal["add", "apply"], int]]  # every write, in order, with its row's id

class InMemoryAttachmentStorage:  # an AttachmentStorage, content-addressed keys
    def __init__(self, *, uploader_only: bool = False) -> None: ...
    files: dict[str, tuple[StoredAttachment, int]]  # key -> (the file, the uploader's id)

def actor(**overrides: Any) -> FeedbackActor: ...  # id 1, "author@example.test", "Ada Author", not admin, not demo
def fixed_clock(at: datetime) -> Clock: ...

async def check_repository(repository: FeedbackRepository[Any], *, storage: AttachmentStorage,
                           policy: AttachmentUrlPolicy, author: FeedbackActor,
                           other: FeedbackActor) -> None: ...
async def check_storage(storage: AttachmentStorage, *, policy: AttachmentUrlPolicy,
                        uploader: FeedbackActor) -> None: ...
async def check_round_trip(client: Any, *, policy: AttachmentUrlPolicy,
                           headers: Mapping[str, str]) -> None: ...
```

- `hidden(row, viewer)` hides a row from `get` as KS's `visible_to` or ka's RLS would;
  `uploader_only` lets only the uploader read a file.
- `check_repository`, for two existing accounts that are not admins:
  1. it saves a picture and a PDF through `storage` as `author`, then `add`s a report
     naming them (the screenshot and one file) and one naming none: the ids are set, the
     URLs read back, and `attachment_urls` is None for none, never `[]`;
  2. `get(id, viewer=author)` answers the author's own row; a missing id answers None;
  3. `list_mine(author.id)` holds only the author's rows, newest first by `created_at`,
     the higher id first on a tie;
  4. `inbox(None)` pairs both with `author.email`; `inbox(status)` holds that status only;
  5. `apply(row, {"status": FeedbackStatus.IN_PROGRESS, "title": …}, actor=author)` reads
     back: an enum goes in, whatever the column stores;
  6. `open_crash` finds a crash row added with a fingerprint, and does not once `apply` has
     set DONE, nor WONT_DO;
  7. `other` adds a report whose body names one of the author's URLs in a `[screenshot]
     <url>` line: `urls_named_except(the author's ids)` holds that URL and not the other;
     `by_author(author.id)` answers the author's rows;
  8. `apply(row, {"user_id": None, "screenshot_url": None, "attachment_urls": None},
     actor=None)`: `inbox` pairs the row with None, and `by_author` no longer lists it.

  Not checked: `resolved_at` (KS 4), whom `get` hides, KS's claim refusal: those are the
  app's own tests. It asserts only on the rows it adds, so it runs on the app's test
  database as it is.
- `check_storage`: it saves a picture, a PDF and a text file as `uploader`, each through
  `check_upload`. Each key passes `policy.is_key`; `read(key, viewer=uploader)` answers the
  same bytes, from which 2.12 gives the right type; a well-formed key nobody saved answers
  None.
- `check_round_trip`: it POSTs a small decodable PNG as the multipart `file` to the mount
  (`policy.prefix` without its last `/`): 201, and a `url` that `policy.is_own_url`
  accepts. Then it GETs that URL: 200, the same bytes, `image/png`,
  `Content-Disposition: inline…` and `X-Content-Type-Options: nosniff`. `client` is an
  `httpx.AsyncClient` or anything with its `post` and `get`.

**`src/eifi1_server_kit/feedback/__init__.py`** re-exports the names of `ports` and
`service` and the three refusals with `THROTTLED_DETAIL`; never `router` or `testing`.

**Tests**, in `tests/feedback/`:
- `test_service.py`: every flow on the fakes. The orders of 2.10 and 2.11 (a refused
  upload has charged the window; a demo's crash charges nothing), the clock, the stamp,
  the first status, the foreign row both ways, a hidden row, and `erase_author` (a key
  another row names is kept, the body's lines are stripped, `actor=None`);
- `test_router.py`: a FastAPI app on the fakes with `install_contract_error_handlers`.
  It checks:
  - each route's status and body;
  - a guard's 403 `demo_refused` before body validation (`json={}`);
  - a route walk that finds the app's guards' qualnames on exactly the three refused
    routes, and `admin_guard` on `GET /feedback`;
  - mounted at `/api/v1`, the operation ids and
    `Body_upload_attachment_api_v1_feedback_attachments_post`;
  - at most one repository write per request, and the last step;
  - the `ValueError` for two policies;
  - `check_round_trip` on the fakes;
- `test_testing.py`: the three checks pass on the fakes and fail on a broken one (a
  repository without the id tie-break, a storage whose key the policy refuses);
- `tests/test_package.py`: importing `eifi1_server_kit.feedback` loads no `fastapi` (in a
  subprocess), and the router's `ImportError` names the extra.

**The rest**
- README: the layering table's second row becomes **0.9.0**, with its hooks as built: the
  app's guards, `foreign_row`, the actor on the ports. `may_file` goes. Add an "Adopting
  layer 2" section (§4.4 in short), and call the demo's "Layer 2" "the demo's database
  layer" (1.3).
- `CHANGELOG.md`: 0.9.0.
- `scripts/export_api.py` `MODULES` gains `("eifi1_server_kit.feedback.router",
  "docs/server-services-harmonization.md", "§2.9")`. `ports` and `service` come with
  `eifi1_server_kit.feedback`.

**Size M**: about 650 code lines (ports 80, service 230, router 150, errors 25, testing
200) and about 1 000 lines of tests.

### 4.2 ui-kit 0.36

**Size S**, docs only, with no component or wire change:
- this contract;
- feedback §3.5 and §3.6, amended now (2026-10-13; decided, 3);
- at the release: feedback §3.3 (a demo's refusal is 403 `demo_refused` in all three, and
  kk's two sentences go), §3.7 (the 429 sentence; the inbox's 403 is the app's guard's),
  §5 (the server-kit paragraph names layer 2); the row in `docs/README.md`; the showcase's
  `server-kit-api.json` synced to 0.9 (`scripts/sync-server-kit.mjs`).

### 4.3 Each app keeps

Its SQLAlchemy models and migrations (**no schema change** in any app), its RLS and
company scoping (ka), the adapters, its guards, its extensions (ka's counts and
`GET /feedback/{id}`, kk's support door, KS's claim, visibility, encryption and sweep), the
outcome loop tools (kk `scripts/feedback-live-*.sh`, KS `feedback_loop.py`), its file
deletion after an erasure (2.15), and the account export's feedback.

| | Code lines now | After: adapters and wiring (estimate) | Removed |
|---|---|---|---|
| kk | 230 | ≈ 70 (repository 35, storage 15, actor, demo guard and router 20) | **≈ 160** (≈ 280 lines with docstrings) |
| ka | 327 | ≈ 100 (repository with its flag 48, storage 12, actor, demo guard and wiring 20, its two extra routes 20) | **≈ 225** (≈ 370) |
| KS | 385 | ≈ 200 (repository with claim, visibility and save 110; storage with sweep 56; response and wiring 34) | **≈ 185** (≈ 320) |

The erasure removes about 20 more code lines per app. The app's feedback tests shrink to the
wiring, the three conformance checks (2.14) and its own variations (1.1).

### 4.4 Per app

**keksdose**
1. Pin server-kit 0.9.0 with `[billing,fastapi,images]` (`backend/pyproject.toml:57`,
   `:121`).
2. New adapters from `feedback_service.py`'s queries:
   - the repository, in `adapters/persistence/`: `get` is `session.get`, ignoring the
     viewer; `list_mine`; `inbox` is `list_all`'s outer join, as pairs; `open_crash` is
     `record_crash`'s lookup; `add` and `apply` flush; `by_author`; `urls_named_except`
     reads the other rows by `Feedback.id.not_in(ids)` (`budgets_service.py:1273-1282`).
     All of them order ties by `Feedback.id.desc()`;
   - the storage, over the object store: `save` is `content_addressed_key(data,
     upload.extension)` and `save_object(key=f"feedback/{key}", …)`
     (`upload_guards.py:238-242`); `read` reads `feedback/<key>`
     (`adapters/external/invoice_file_store.py:116`), `None` when the object is missing,
     with `media_type` from the key's extension and no filename.
3. Dependencies in `infrastructure/dependencies.py`:
   - `feedback_actor` (role ADMIN, `is_demo`, the display name);
   - `feedback_repository(session=Depends(db_session))`: the session `commit_boundary`
     commits (2.7; `:45`);
   - `feedback_storage`;
   - `not_in_the_demo(what)`, KS's four lines around `refuse_demo(user.is_demo, what)`.
4. `adapters/api/feedback_router.py` becomes `router = feedback_router(FeedbackDeps(
   actor=feedback_actor, repository=feedback_repository, storage=feedback_storage,
   demo_guard=not_in_the_demo, admin_guard=require_role(UserRole.ADMIN),
   policy=FEEDBACK_ATTACHMENTS, create_model=FeedbackCreate, decode_images=True))`,
   included as today (`main.py:256`). `domain/services/feedback_service.py` goes, and so
   does `upload_guards.refuse_demo`, whose one caller was router `:80` (the support door
   has its own `_refuse_demo`). `store_attachment_bytes` stays for the support door.
5. `app.state.feedback_limiters = FeedbackLimiters()` in `create_app`. The support door
   takes the `Request` and calls
   `throttle_upload(request.app.state.feedback_limiters.upload, user.id)`
   (`support_router.py:550`). `_attachment_limiter`, `throttle_attachment`,
   `_crash_limiter` and the two `reset_*_limiter` seams go. Their only users,
   `backend/tests/conftest.py:531-535` and `backend/tests/api/test_feedback_crash.py:27-31`,
   reset `app.state.feedback_limiters` instead, and the comment at
   `infrastructure/dependencies.py:389` follows.
6. `budgets_service._anonymise_feedback` calls `erase_author`, prefixes its keys with
   `feedback/`, and returns them to the one `_purge_objects_after_commit` call at `:1419`,
   which is unchanged (2.15). The `feedback_comments` scrub stays (`:1286-1292`).
7. Unchanged by construction: the paths (`backend/tests/api/test_billing_gate.py:161-164`
   lists the four write paths; `backend/tests/unit/test_route_coverage.py`), the operation
   ids, `Body_upload_attachment_api_v1_feedback_attachments_post` and `status_filter`
   (2.9), and the crash path's layer-1 exemption (`infrastructure/demo_guard.py:41`, which
   `backend/tests/api/test_feedback_crash.py:164-174` relies on). Regenerating
   `frontend/src/shared/api/openapi-schema.d.ts` gives no diff.
8. What a user may notice: the identity stamp (2.13); `Content-Disposition` on every
   download, from the re-read type. A demo's refusal code changes only behind layer 1,
   and `nosniff` changes nothing in prod (1.3).

**kastlan**
1. Pin with `[billing,fastapi,images,mail]`.
2. `SqlAlchemyFeedbackRepository(session, *, company_id: int | None = None, commit: bool =
   False)` takes the port's shape:
   - `get` is `get_by_id` (another company's row is hidden: 404);
   - `list_mine` is `list_for_user`;
   - `inbox` is `list_all`, paired with each author's address through
     `SqlAlchemyUserRepository.by_ids`;
   - `open_crash` is the service's lookup (`domain/services/feedback_service.py:125-137`),
     under the session's company filter as now (ka 4);
   - `add` sets `company_id`, and `apply` is the `setattr` loop. Both flush, and commit
     after the flush only when `commit` is on (2.7);
   - `by_author`, and `urls_named_except` by `id NOT IN`.
3. `feedback_repository(session=Depends(get_db_session), user=Depends(get_current_user))`
   answers `SqlAlchemyFeedbackRepository(session, company_id=user.current_company_id,
   commit=True)`. This is the router's flag, and nothing else sets it.
4. Storage over `FileStoragePort`:
   - `save` is `store(data, filename=f"{sha12}.{ext}", folder="feedback")`, answering the
     part after `feedback/` (router `:114-115`);
   - `read` is `retrieve(f"feedback/{key}")`, `None` on `FileNotFoundError` or `OSError`,
     with `media_type` from the extension.
5. `feedback_actor`: `is_admin` when ADMIN is in `user.roles` (the acting company's),
   the display name first + last, and `is_demo`. Add `not_in_the_demo(what)`. The admin
   guard is `require_role(*ADMIN_ONLY)`: its `allowed_roles` keeps `GET /feedback`
   "staff" in `tests/api/test_staff_only_routes.py` (2.8).
6. Include the kit's router with its `/feedback` prefix (kastlan's router has none today
   and writes full paths), then kastlan's `GET /feedback/counts` and `GET
   /feedback/{feedback_id}` after it.
7. `app.state.feedback_limiters = FeedbackLimiters()`; the module-global `_limiters` goes.
8. These go: `FeedbackService`; `_enrich_many`, which sets `user_name` (the frontend types
   it but never reads it, `frontend/src/shared/types/feedback.ts:33`) and the address
   outside the inbox; the `Location` headers (ka 2).
9. `AdminUserService.erase` calls `erase_author` with an adapter whose flag is off, on its
   superuser session (`adapters/api/platform_router.py:237-246`; ka 3). It then commits
   once (`admin_user_service.py:414`) and deletes `feedback/<key>` for each key,
   swallowing a failure (`:415-420`, unchanged). Its log row's `detail` counts
   `erased.reports` and `len(erased.keys)`.
10. What changes on the wire: no `Location`, no `user_name`, the address only in the
    inbox; the throttle's sentence; a picture's download gains `Content-Disposition:
    inline`; the operation ids take kk's names (`create_feedback` → `create` and so on),
    which no kastlan client reads. The inbox's 403 text stays kastlan's.

**Kurvenschmiede**
1. Pin with `[billing,fastapi,mail]`.
2. Move `ATTACHMENT_URLS` from `domain/schemas/feedback.py:34-36` to beside the model, and
   give `Feedback` read-only `screenshot_url` and `attachment_urls` properties, read off
   its attachment rows as `to_response` does (router `:90-91`). The kit's default
   `to_response` then serves (KS 5).
3. The repository, on the request's session:
   - `get` is `visible_by_id` for the viewer's id and role (`visible_to`, service
     `:78-87`);
   - the two lists keep `WITHOUT_THE_PICTURES`, and `inbox` pairs through `authors_of`;
   - every order adds `Feedback.id.desc()`, and `open_crash` is `record_crash`'s lookup;
   - `add` claims the named uploads as `new.user_id`'s own (`_claim`, the 422
     `UnknownAttachmentError`) and stores `.value`;
   - `apply(row, changes, *, actor)` is 2.4's: a rework's files claimed as the actor's
     (`_hang_named_files`), the attachment rows cleared when the erasure nulls the URL
     columns, `.value` for enums (KS 3), the plan's `resolved_at` dropped (KS 4), and
     the write through `save(session, row, actor=actor)`, which now takes the actor (2.16);
   - `by_author`, and `urls_named_except` from the other rows' attachment URLs and bodies.
4. Storage: `save` is `upload()` (the sweep, the keyed digest, the dedupe; the uploader is
   `uploader.id`); `read` is `attachment_by_key` for the viewer, as
   `StoredAttachment(data, content_type, filename)`.
5. `feedback_actor` (role ADMIN, `is_demo`, `display_name`). The guards are the ones the
   routes carry today: `demo_guard=not_in_the_demo`,
   `admin_guard=require_role(UserRole.ADMIN)`. The walks of `route_table.py` and
   `test_demo.py:260-302` keep classifying by those names (2.8).
6. `adapters/api/feedback_router.py` becomes `router = feedback_router(FeedbackDeps(…,
   policy=ATTACHMENT_URLS, create_model=FeedbackCreate, update_model=FeedbackUpdate,
   foreign_row="not_found", require_utf8_text=True))`, in `main.ROUTERS` as today
   (`main.py:55-69`). `{row_id}` becomes `{feedback_id}`: the client builds the path by
   hand (`frontend/src/shared/api/endpoints.ts:563`), and two test lines change (KS 6):
   `DEMO_REFUSED`'s `PATCH /feedback/{row_id}` (`test_demo.py:145`) and the walk's
   `fill(…, row_id=1)`.
7. `erasure_service._anonymise_feedback` calls `erase_author` and ignores its keys; the
   unfiled uploads' delete stays (`erasure_service.py:453-459`; 2.15).
8. `feedback_loop.py`: `file_report` files through the kit's `FeedbackService` with KS's
   repository and the first admin as the actor (KS 2.4). `resolve` keeps its own write,
   since it also sets the page in `context` and `updated_at`, and goes through
   `save(session, row, actor=first_admin)` (2.16).
9. What changes: the throttle's sentence (kk's), and the `list_mine` operation id becomes
   `list_my`, which no KS client reads.

## 5. Settled after the reviews (2026-10-13)

The three apps reviewed the draft on 2026-10-13 and agreed with its shape. Marcel decided
the four points they left open as recommended. Their findings are folded into the
sections above.

- **Marcel:** decision 2 (the translation review in 0.10) → §3, §2 (1); decision 3 (the
  `foreign_row` setting stays) → 2.10; decision 4 (the charge order; feedback §3.5 and
  §3.6 amended) → 2.11; decision 19 (the guards, the actor, the transaction, keksdose's
  purge) → 2.4, 2.7, 2.8, 2.15.
- **keksdose:** kk 1 (nothing relies on the client's `user_*` keys) → 2.13; kk 2 (the two
  demo sentences are unreachable over HTTP; `upload_guards.refuse_demo` has one caller;
  the crash path stays exempt) → 2.8, §4.4; kk 3 (the seams' two users; the support door
  raises the kit's 429) → 2.9, §4.4; kk 4 (the download) → 2.12; kk 5 (the prefix stays in
  kk; nothing runs after kk's commit, so the kit returns keys and kk arms its
  `after_commit` purge) → 2.5, 2.7, 2.15. Its six evidence corrections (the column
  enums' path, the inbox's `require_role` lines, `DEMO_WRITES`' span, the edge's
  `nosniff`, no demo check on kk's PATCH, the purge's timing) → 1.3, 2.8, 2.10, 2.12,
  2.15. Its wiring points (the session `commit_boundary` commits, the operation ids and
  body component, the two path-bound tests, the support door's `Request`) → 2.7, 2.9,
  §4.4.
- **kastlan:** ka 1 (the erasure is one commit; a `commit` flag set only by the router's
  dependency, kastlan's pick) → 2.7, §4.4; ka 2 (agreed; the upload URL no longer comes
  from `Location`, so `policy.prefix` must match the mount) → 2.9, 2.14; ka 3 (the
  erasure on the superuser session sees every company) → 2.15; ka 4 (the crash lookup
  stays under the company filter) → §4.4.
- **Kurvenschmiede:** KS 2.1 (the guards stay route dependencies) → 2.8; KS 2.2 (the
  ports carry the actor) → 2.4; KS 2.3 (its `apply` clears the attachment rows) → 2.4,
  2.15; KS 2.4 (the loop files through the kit's service) → 2.16; KS 2.5 (the
  `feedback_answered` hook in `save`, through `apply` with the actor) → 2.16; KS 2.6
  (`check_repository` saves through the storage first) → 2.14; KS 2.7 (the
  `schemas/feedback.py` cites) → 1.3. KS 1 (404 for a
  foreign row, admins exempt, "Feedback not found") → 2.10; KS 2 (the claim stays in the
  adapter) → 2.4; KS 3 (`.value` in `apply`) → 2.4; KS 4 (`resolved_at` stays dropped; the
  checks never assert it) → 2.4, 2.14; KS 5 (`ATTACHMENT_URLS` beside the model, the
  default `to_response`) → 2.3, §4.4; KS 6 (two one-line test edits) → §4.4.
