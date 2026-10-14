# Server services behind ports — harmonisation plan (server-kit layer 2)

Led from ui-kit for round 0.36 (Marcel, 2026-10-13: "The select hints and the queued
rounds. All of them."). The server-kit README's "Layering" table names the step: the
feedback service written once against a repository, storage and clock port each app
implements, and a router factory `feedback_router(deps)` with the app's hooks. It is built
from a read-only survey of the three backends on 2026-10-13 (kk `79b2949c`, ka `936f8b8`,
KS `c34cba0`) and the three apps' reviews of the same day (kk at `c90d068e`, ka at
`f2b9574`, KS at `bcadab6`). The wire stays
[feedback-harmonization.md](feedback-harmonization.md) §3. Round 0.37 adds §6, settled
2026-10-14: the translation review on the same pattern, as server-kit 0.10.

Backend paths are relative to each app's package: **kk** = keksdose
(`backend/keksdose/`), **ka** = kastlan (`kastlan/`, at the repo root), **KS** =
Kurvenschmiede (`backend/kurvenschmiede/`); a `frontend/`, `scripts/`, `deploy/`,
`tests/` (ka) or `backend/tests/` path is from the repo root. "Code" counts lines that are
not blank, comments or docstrings.

## Status

| § | What | State |
|---|---|---|
| 1–5 | The feedback service, its router and the erasure | Settled 2026-10-13, built in server-kit 0.9.0 |
| 6 | The translation review: a store port, the reviewer view carrying the grant, the router | Settled 2026-10-14, built for server-kit 0.10.0 / ui-kit 0.37.0 (round 0.37) |
| 4.5 | Public feedback: the reply, comment and vote stores, the public routes (feedback §9) | Settled 2026-10-14, for server-kit 0.11 (round 0.38) |

**§1–§5.** The three apps reviewed the draft on 2026-10-13 and Marcel decided what they
left open ("As recommended", §2). The reviews' corrections are folded into §1–§4, and §5
says where each went. §4 is the build list.

**§6.** The three apps reviewed the draft on 2026-10-13 and Marcel decided what they left
open on 2026-10-14 ("Do 0.37 as recommended", 6.2). The reviews' corrections are folded
into 6.1–6.5, and 6.6 says where each went. 6.3 is the build list.

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
view carrying the grant (§6, a draft).

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
3. Dependencies in `infrastructure/dependencies.py` (keksdose's 0.36 adoption put them beside
   the router, in `adapters/api/feedback_router.py`; either works):
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
   `frontend/src/shared/api/openapi-schema.d.ts` changes JSDoc comments only (the kit's
   endpoints carry docstrings, which become OpenAPI descriptions); the types, operation
   ids and components stay. A route walk iterates the router itself: FastAPI 0.142
   includes routers lazily, so `app.routes` no longer lists their APIRoutes (KS's
   `route_table.py` already does this).
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

### 4.5 Amendment for server-kit 0.11 (round 0.38, settled 2026-10-14)

Public feedback grows the feedback service; the details and the build list are in
[feedback-harmonization.md](feedback-harmonization.md) §9 (9.14). In short, all additive:
- **Ports:** `FeedbackActor.role`, `NewFeedback.public`; new `PublicFeedbackRow`,
  `PublicFeedbackRepository`, `FeedbackReplyStore`, `FeedbackCommentStore`,
  `FeedbackVoteStore`, `PeopleLookup`. `AttachmentStorage.read`'s docs state the files
  predicate: the uploader, the author of a report naming the file, an admin; never
  "anyone who sees the report" (feedback 9.10).
- **Service:** new flows (`reply`, `list_public`, `get_public`, the comment and vote
  flows); 2.7's one write per request becomes **one write per store, the report last**;
  `erase_author` also scrubs comments, deletes votes and un-names replies (2.15).
- **Router:** `FeedbackDeps` gains the stores, `public_viewer` (the app's predicate on
  the viewer; `None` mounts no public route; a demo never passes) and `public_search`;
  nine routes (`create_reply`, `list_public`, `get_public`, `list_comments`,
  `create_comment`, `hide_comment`, `delete_comment`, `vote`, `unvote`), the app's guards
  first as in 2.8.

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

## 6. The translation review (round 0.37, settled 2026-10-14)

Round 0.37 (Marcel, 2026-10-13: "Sounds good, continue") keeps §3's promise: the
translation review on the feedback service's pattern, as **server-kit 0.10**. It is built
from a read-only survey on 2026-10-13 (kk `c90d068e`, ka `0e8bd2c`, KS `bcadab6`; server-kit
0.9.0 `41dbc85`) and the three apps' reviews of the same day. The cites were re-read on
2026-10-14 in each app's 0.36 adoption tree (kk `c2feb89d`, ka `ef43021`, KS `c15b693`).
The wire stays H1's ([i18n-harmonization.md](i18n-harmonization.md) §2). Settled
2026-10-14 (Marcel: "Do 0.37 as recommended"); 6.6 records the reviews and the decisions.

### 6.1 Where each one stands

Layer 1 already holds the wire shapes, the grant and its refusals, and the token format
(`translation_review/`). What is still written three times is the orchestration: the three
routes, a batch's lookup and upsert, the delete, the area filter, the reviewer's name and
the export.

| | kk | ka | KS |
|---|---|---|---|
| Service | `domain/services/translation_review_service.py`: 271 lines, 163 code; the flows `:133-250`, 89 | `domain/services/translation_review_service.py`: 258, 148; the class `:164-258`, 70 | `domain/services/translation_review_service.py`: 240, 136; the flows `:86-207`, 87 |
| Repository | (in the service) | `adapters/persistence/translation_review_repository.py`: 44, 26 | (in the service) |
| Router | `adapters/api/translations_router.py`: 148, 95, the token routes `:128-148` among them | `adapters/api/translation_router.py`: 71, 44, `GET /translations/documents` `:63-71` among them | `adapters/api/translations_router.py`: 67, 42 |
| Schemas | the kit's, and three subclasses: the row adds the name's parts, the two answers re-type `reviews` (`domain/schemas/translations.py:40-56`) | its own (`domain/schemas/translation_review.py`: 79, 41) | its own, the four request models `extra="forbid"` (`domain/schemas/translations.py`: 103, 53; `:45-75`) |
| Tests | `backend/tests/api/test_translations.py` 281, `test_translation_review_tokens.py` 251 | `tests/api/test_translation_review.py` 369 | `backend/tests/api/test_translations_api.py` 234 |

**The same in all three:** H1's paths and bodies; one row per (`locale`, `key`); the last
item of a batch wins; every pair is checked before anything is written; a blank `note` or
`suggestion` is NULL, and `suggestion` is dropped on APPROVED; `reviewer_id` is the caller
and `reviewed_at` now; a clear answers how many existed; the list goes by locale, then
key, with an outer join for the name; a `GET` with no locale is 403; and `reviewer_id` is
`ON DELETE SET NULL`, so an erased reviewer's verdicts stay without the person (kk
`domain/models/translation_review.py:60`, ka `:64`, KS `:69`).

| Point | kk | ka | KS | § |
|---|---|---|---|---|
| Who reviews | role ADMIN every locale; role REVIEWER its locales and areas; a demo nothing (`review_grant_of`, service `:98-107`) | a platform superuser every locale; any account with `translation_review_locales` those, no role (`:100-112`) | role ADMIN; role REVIEWER (`grant`, `:72-83`) | 6.2.2 |
| Layer 1 used | `review_grant`, `assert_allowed`, `normalize_*` | none: its own copies (`:57-112`, `:179-191`) | the same as kk, and `area_like_patterns` | 6.2.4 |
| The area filter | SQL by hand, three arms (`:149-165`) | in Python after the query, its own `in_areas` with a fourth arm, `<area>:` (`:88-97`, `:201`) | SQL from `area_like_patterns` (`:86-99`) | 6.2.4 |
| A second actor | a review token (`kdr_…`) from the showcase: the kit's keys only (`get_review_actor`, router `:49-62`; `:92`) | — | — | 6.2.2 |
| `reviewer_name` | the reviewer's `display_name`, in their own order, plus `reviewer_first_name` and `reviewer_last_name` (`:170-185`) | "first last" (`:122-123`) | `full_name(first, last, reader's locale)` on the list (`:143-145`), `display_name` on a save (`:189`) | 6.2.5 |
| Refusals | `HTTPException` from the kit's refusals (router `:70-73`); 401 for a dead token (`:58-59`) | its own: `AuthError` 403, `DomainValidationError` 422 "Unknown language" (`:176`, `:187-191`) | the kit's, by `install_contract_error_handlers`; its own 403 sentence on `GET` (router `:40`) | 6.2.8 |
| Who commits | `commit_boundary`; the service flushes (`:231`, `:249`) | the service commits (`:245`, `:257`) | `get_db_session`; the service flushes (`:188`, `:206`) | 6.2.9 |
| A demo | layer 1 refuses its writes (`infrastructure/demo_guard.py:74-80`, from `get_current_user`, `dependencies.py:138`); `GET` 403, no grant | layer 1 (`infrastructure/dependencies.py:187-188`, `:294-301`); `GET` 403 | the routes are `DEMO_ALLOWED` (`backend/tests/api/test_demo.py:243-245`); a MEMBER's grant refuses | 6.2.6 |
| Texts | plain; `TEXT_MAX` 40 000 | plain; 20 000 (schemas `:13`) | sealed (`EncryptedText`, model `:55-67`); 40 000, a locale ≤ 8 (schemas `:15`, `:48`) | 6.2.3 |
| Export, in `data` | `translation_verdicts`: `locale`, `string`, `text`, `verdict`, `suggestion`, `note`, `reviewed_at`, oldest first (`account_export_service.py:316-320`, `:375-387`) | `translation_reviews`: `locale`, `key`, `verdict`, `note`, `suggestion`, `reviewed_at`, in no order (`account_service.py:243-247`, `:309-319`) | `translation_verdicts`, ka's fields, `key` first, in no order (`export_service.py:112-125`, `adapters/api/account_export.py:109`) | 6.2.10 |
| Endpoint names | `list_translation_reviews`, `save_translation_reviews`, `clear_translation_reviews` | the same | `list_reviews`, `save_reviews`, `clear_reviews` | 6.2.7 |

Two findings:
- **The kit's area rule lacks kastlan's arm.** H1 puts a key inside an area when it
  continues it with `.`, or with `:` for kastlan's `ns:key`
  ([i18n-harmonization.md](i18n-harmonization.md):59-61), and ui-kit's `keyInArea` has
  all four arms (`src/lib/translation-review.ts:265-269`). server-kit's `in_areas` and
  `area_like_patterns` have three (`translation_review/scope.py:88-89`, `:125-129`), so
  kastlan's `legal:imprint.title` falls outside `legal` there, and kastlan keeps a copy.
- **`key` reads as a secret.** The kit's export check flags a bare `key`
  (`user_admin/sensitive.py:76`, `:144`), which is why kk exports `string`
  (`account_export_service.py:378-380`). ka and KS export `key` (KS
  `export_service.py:117`); their export tests pass only because neither fills a verdict
  (ka `tests/api/test_user_admin.py:432-470`, KS
  `backend/tests/api/test_account_export.py:22-43`, `:88-93`). With one verdict, ka's test
  raises `ExportSecretError`. The check runs only in the tests, so no live export failed.

**Which server-kit each runs.** Each app's 0.36 adoption tree pins 0.9.0 (kk
`backend/pyproject.toml:121`, ka `pyproject.toml:90`, KS `backend/pyproject.toml:218`), each
with the `fastapi` extra. kk's review read 0.8.0, before its adoption commit (`7f7652f8`).
If kk's 0.36 adoption has not shipped when 0.10 comes, kk jumps 0.8 → 0.10 and takes 0.9's
feedback layer in the same step (6.5).

### 6.2 Decisions

**Decided (Marcel, 2026-10-14: "Do 0.37 as recommended"):**
1. **One export shape, keksdose's** (T1): `data["translation_verdicts"]`, kk's fields in
   kk's order, `suggestion` before `note`, oldest first. kastlan's `translation_reviews`
   key is renamed, and ka's and KS's unordered exports gain the order (6.2.10).
2. **The review tokens stay keksdose's** in 0.10, with no port (T2). The kit's `scope()`
   refuses a token on a grant with an area limit, for every app (6.2.2).
3. **`reviewer_name` in the reader's order** everywhere (T3, 6.2.5).
4. **The area rule gains the `<area>:` arm** in every app (T4, 6.2.4).
5. **The kit's four request models forbid unknown fields**, for every app (T5, KS Q1): a
   misspelt `suggestion` is a 422, not a silent drop (6.2.7).

The other rules below were the draft's, and the reviews agreed with them. Their
corrections are folded in (6.6).

#### 6.2.1 Where it lives

As 2.1. Four new modules in the `translation_review` package: `ports` and `service` (no
FastAPI, re-exported from `eifi1_server_kit.translation_review`), `router` (the `fastapi`
extra, not re-exported) and `testing` (no FastAPI, not re-exported). Layer 1 gains three
additive changes (6.2.2, 6.2.4, 6.2.5) and one that refuses more: the request models
forbid unknown fields (6.2.7). `Clock` and `utc_now` move to a new
`eifi1_server_kit.clock`, and `feedback.ports` re-exports the same objects.
**server-kit 0.10.0**, additive but for that refusal.

#### 6.2.2 The reviewer view, carrying the grant

```python
@dataclass(frozen=True, slots=True)
class TranslationReviewer:
    id: int                   # the reviewer_id of what they write
    first_name: str | None
    last_name: str | None
    locale: str | None        # the reader's language: the order of reviewer_name (6.2.5)
    grant: ReviewGrant        # the app's review_grant(...): locales and areas
    kit_only: bool = False    # signed in with a review token (kk): the kit's keys only
```

- One app dependency builds it from the app's user, as `FeedbackActor` (2.2). **The grant
  stays the app's to build**, with layer 1's `review_grant`, because the roles differ (kk
  and KS a REVIEWER role; in ka the grant itself, on any account, and the superuser as the
  admin) and the kit never sees a role. ka moves from its copies to `review_grant(user,
  is_admin=user.is_superuser, is_reviewer=True, …)`: its locales are the role, so an
  account without them is granted nothing, as today.
- **A demo is granted nothing**, whatever its role: `review_grant` gains `is_demo: bool =
  False` (kk's rule, service `:98-107`, made the kit's).
- **kk's review token is the same view with `kit_only=True`**, not a second type. kk's
  `get_review_actor` (router `:49-62`) stays kk's: it reads the token, answers 401 for a
  dead one, sets the RLS user (`:60`) and returns the view with the user's own grant. The
  kit's rule for it: the list is the area `kit` (`areas: ["kit"]`, kk router `:92`), and a
  write or clear naming any other key is refused whole by `require_kit_keys` (403 "A
  review token reaches the kit's wording only") before the grant is checked.
- **Decided (T2): a token on a grant with an area limit is refused, not narrowed.** When
  `kit_only` is set and `grant.areas is not None`, `scope()` raises
  `TranslationAccessError` (403, `NO_KIT_REVIEW_ACCESS`, "No review access to the kit's
  wording", kk's sentence at mint, token service `:71`). keksdose replaces the areas with
  `["kit"]` (router `:92`), which is safe there only because `can_review_kit` (token
  service `:59-66`) refuses an area-limited grant at mint (`:70`) and on every
  `authenticate` (`:133`), so a legal-only grant never holds a live token (kk 1a). An app
  that mints without that re-check would list every `kit.*` verdict to a legal-only
  reviewer, so the kit refuses it for every app. kk keeps its re-check, so its token
  answers 401 before `scope()` is reached. A write needs no such check: `assert_allowed`
  holds a token to its grant's areas, so a legal-only one could write only `kit.legal.*`.
  Layer 1's `can_review_kit` is wider: it passes an area that covers `kit.`
  (`scope.py:184-194`), whose token `scope()` would refuse. No app has such an area
  (`REVIEW_AREAS`: kk and KS `legal`, ka `legal` and `doc_text`).
- **The tokens stay kk's** in 0.10, with no port: the table, mint, revoke,
  `authenticate` and the two routes (`:128-148`). Layer 1 holds their pure half already.
  Only kk mints them; a port waits for a second app that does.

#### 6.2.3 Rows: read through a protocol, written through the store

```python
class TranslationReviewRow(Protocol):  # read-only members: an app's mapped row satisfies it
    @property
    def locale(self) -> str: ...
    @property
    def key(self) -> str: ...
    @property
    def text(self) -> str: ...
    @property
    def reference_text(self) -> str | None: ...
    @property
    def verdict(self) -> TranslationVerdict | str: ...
    @property
    def note(self) -> str | None: ...
    @property
    def suggestion(self) -> str | None: ...
    @property
    def reviewed_at(self) -> datetime: ...


@dataclass(frozen=True, slots=True)
class ReviewerName:
    first_name: str
    last_name: str


@dataclass(frozen=True, slots=True)
class NewVerdict:  # one (locale, key)'s row as a save leaves it
    locale: str
    key: str
    text: str
    reference_text: str | None
    verdict: TranslationVerdict
    note: str | None        # blank is None
    suggestion: str | None  # None unless NEEDS_CHANGE
    reviewer_id: int
    reviewed_at: datetime


class TranslationReviewStore[RowT: TranslationReviewRow](Protocol):
    async def verdicts(self, locales: Sequence[str], areas: Sequence[str] | None
                       ) -> Sequence[tuple[RowT, ReviewerName | None]]:
        """Every verdict in locales, and inside areas when given (None: every area), by
        locale, then key, each with its reviewer's current name: an outer join, None once
        the account is gone. The area filter comes from area_like_patterns, never by hand."""
    async def put(self, verdicts: Sequence[NewVerdict]) -> Sequence[RowT]:
        """The row of each (locale, key), found or added, takes every field. Flush; the
        rows in the order given. The kit sends each pair once."""
    async def clear(self, pairs: Collection[tuple[str, str]]) -> int:
        """Delete the rows of these (locale, key) pairs and flush: how many existed."""
    async def by_reviewer(self, reviewer_id: int) -> Sequence[RowT]:
        """The export's rows (6.2.10), oldest reviewed_at first."""
```

This shape. The row's id never leaves the server (kk's is a UUID), so the protocol has
none. `put` is an upsert, not feedback's `add` and `apply`: a save is keyed on (`locale`,
`key`), and all three look a batch up per locale before writing (kk `:203-212`, ka
`:220-226`, KS `:161-170`); an adapter may use `INSERT … ON CONFLICT` instead. KS's sealed
columns stay in its model (`EncryptedText` reads and writes plain text, and takes
`check_store`'s 40 000-character text, KS Q3), so its adapter is kk's. The kit's
`TEXT_MAX` (40 000) holds in all three: ka's 20 000 goes, and KS's locale cap of 8 never
bites, since the locale check refuses an unknown code before any write.

#### 6.2.4 The area rule

**Decided (T4):** the kit's rule becomes H1's. `in_areas` gains the `<area>:` arm and
`area_like_patterns` gives four patterns per area (`["legal"]` → `legal`, `legal.%`,
`legal:%`, `kit.legal.%`). No kk or KS key holds a `:` (kk: none in its four bundles), so
nothing changes for them. kastlan's own `in_areas` has the four arms (`:88-97`); it drops
that copy once the kit's has them. Every store filters with `area_like_patterns` (kk's
hand-written filter, `:149-165`, goes), and the service filters the answer again with
`in_areas`, so a store that answers too much never shows a key outside the grant. One that
answers too little is for `check_store` to catch (6.2.11).

#### 6.2.5 The reviewer's name

**Decided (T3):** `TranslationReviewOut` gains kk's `reviewer_first_name` and
`reviewer_last_name` (None by default; auth §3.2: every API that returns a person returns
both), and kk's three subclasses go (`domain/schemas/translations.py:40-56`: the row with
the parts, and the two answers that re-type `reviews`). The kit fills `reviewer_name` as
KS does, `full_name(first, last, viewer.locale) or None`: the reader's order (auth §3.2,
"on screen, the reader's"). kk's page formats the two parts itself and falls back to
`reviewer_name` (`frontend/src/features/translations/translations-page.tsx:171-172`); kk's
and ka's four languages put the first name first, so kk's bytes do not change (its tests
still read "Amélie Dubois", `backend/tests/api/test_translations.py:72`, `:74`). So no page
changes. A save answers with the viewer's own name.

#### 6.2.6 Guards: the grant is the guard

No route-level guard. The three routes are "any signed-in", and the grant gates each, as
today: a `GET` with no locale is 403, a write outside the grant 403, and a review token on
a grant with an area limit 403 from `scope()` (T2, 6.2.2). A demo is answered as now: in
kk and ka, layer 1 refuses its writes with `demo_read_only` before the route runs, and its
`GET` finds no grant; KS keeps the routes in `DEMO_ALLOWED` and the grant refuses. The
route walks keep their classes, since each app's `reviewer` dependency depends on its
`get_current_user` (ka `tests/api/test_staff_only_routes.py:86-89`, `:105-114`; KS
`backend/tests/api/route_table.py:61-62`). kk's and ka's billing gates let the writes
through for a lapsed plan (kk `backend/tests/api/test_billing_gate.py:180-183`, ka
`infrastructure/dependencies.py:243-244`), and the paths do not change.

#### 6.2.7 The router factory, and kastlan's documents

```python
@dataclass(frozen=True, slots=True, kw_only=True)
class TranslationReviewDeps[RowT: TranslationReviewRow]:
    # FastAPI dependencies, the app's
    reviewer: Callable[..., Any]  # -> TranslationReviewer, on the app's get_current_user (kk: or a review token)
    store: Callable[..., Any]     # -> TranslationReviewStore[RowT], on the request's session
    # the app's vocabulary
    locale_codes: Sequence[str]   # its UI locales, in its order
    now: Clock = utc_now


def translation_review_router[RowT: TranslationReviewRow](
    deps: TranslationReviewDeps[RowT], *, prefix: str = "/translations",
    tags: Sequence[str] = ("translations",)
) -> APIRouter: ...
```

- **The routes** are H1's three, with kk's endpoint names, which ka already uses (§6.3).
  kk's and ka's operation ids stay; KS's change, and no client reads them: all three
  build the path (kk `frontend/src/shared/api/endpoints.ts:2244-2253`, ka `:298-300`, KS
  `:870-874`). Mounted at `/api/v1`, the paths are the review paths of
  `cors.TRANSLATION_REVIEW_ROUTES` (`cors.py:78-84`), which kk opens to the showcase's
  origin (`main.py:189-201`); the kit's test holds the two together.
- **An app's own routes go after the kit's router**, as for feedback (2.9). kastlan's
  `GET /translations/documents` stays its own, on a router of its own with the
  `/translations` prefix: it takes the same `reviewer` dependency and calls the service's
  `scope(viewer)` for the same 403 before it answers `_document_texts()` (`:140-161`).
  The words are kastlan's alone (`doc_text`), and a hook in the kit for one app's
  catalogue would be wider than what it serves. kk's token routes stay the same way.
- **The schemas are the kit's, and refuse unknown fields (decided, T5; KS Q1).** The four
  request models, `TranslationReviewWrite`, `TranslationReviewBatch`,
  `TranslationReviewKey` and `TranslationReviewClear`
  (`translation_review/schemas.py:63-92`), take `extra="forbid"`: a misspelt `suggestion`
  is a 422, not a 200 that drops it. ka's and KS's copies go, KS's four forbid models
  with them (`domain/schemas/translations.py:45-75`), so `TranslationReviewDeps` takes no
  request model of the app's. The answers are the kit's models too, since nothing in
  them is an app's. No page sends a field more: the three pages write through ui-kit's
  `toApiWrite` (`src/lib/translation-review.ts:151-161`; kk
  `frontend/src/features/translations/translations-page.tsx:311`, ka
  `frontend/src/features/translations/pages/translations-page.tsx:157`, KS
  `frontend/src/features/translations/translations-page.tsx:282`). A test that sends one
  notices (6.5).

#### 6.2.8 Errors

The router raises no `HTTPException`. Past the app's `reviewer` dependency (kk's 401 stays
there), every refusal is layer 1's, answered by `install_contract_error_handlers`, which
all three install: `TranslationLocaleError` and `TranslationAreaError` 422,
`TranslationAccessError` 403. kk's 403 bodies stay byte for byte: `require_kit_keys` says
its sentence (`scope.py:74`, kk router `:67`), and the handler answers `{"detail": …}` as
an `HTTPException` does (kk `main.py:213`). The `GET`'s 403 says kk's and ka's sentence, a
new `NO_REVIEW_ACCESS = "No translation review access"`; KS's own ("You have not been given
any language to review.", router `:40`) goes, and nothing reads it (KS Q2). A token on an
area-limited grant gets `NO_KIT_REVIEW_ACCESS` (6.2.2). ka's "Unknown language" becomes the
kit's "Unknown locale", still 422; kastlan shows no refusal's sentence where a reviewer
looks. A `PUT` or a clear, in order, as kk's today (router `:105`, `:120`): the body (422,
an unknown field too); `require_kit_keys` for a token (403); `assert_allowed` (422 for a
locale the app does not ship, 403 outside the grant); the store.

#### 6.2.9 Who commits

2.7's rule. The kit never commits; `put` and `clear` flush; each request makes at most one
store write (`put` or `clear`), and it is the last step. Who commits:
- **keksdose:** `commit_boundary` commits the session its store dependency takes. That
  dependency takes `Depends(db_session)`, the callable `get_review_actor` takes (router
  `:52`), so FastAPI's per-request cache hands both the same session. On the token path
  `get_review_actor` sets the RLS user on it (`set_current_user`, `:60`); a store on a
  session of its own would see no user there (kk 1).
- **kastlan:** its service commits today (`:245`, `:257`). Its store adapter commits after
  the flush only when its `commit` flag is on, and only the router's dependency sets it,
  as for its feedback repository (built in 0.36,
  `adapters/persistence/feedback_repository.py:15-18`). Its export reads with the flag off.
- **Kurvenschmiede:** `get_db_session`.

#### 6.2.10 Erasure and export

- **Erasure: nothing in the kit.** The foreign key's `SET NULL` is the rule in all three
  (6.1): the verdict stays, the person goes, and the list names nobody for it. kk's
  `_user_fk_plan` reads it off the schema (`budgets_service.py:1186`), KS's erasure says so
  (`erasure_service.py:46-50`), and ka's erasure deletes the user row. A note is about the
  wording, not its author, so nothing is scrubbed. kk's tokens go with the account (`ON
  DELETE CASCADE`, `domain/models/translation_review_token.py:39-41`).
- **Export: kk's shape everywhere (decided, T1).** `TranslationReviewService.export(
  reviewer_id)` reads `by_reviewer`, oldest first, and answers each row as `{locale,
  string, text, verdict, suggestion, note, reviewed_at}`, in that order, the verdict as
  its value: kk's export as it is (`account_export_service.py:316-320`, `:375-387`;
  `suggestion` before `note` at `:383-384`). The app puts it under
  `data["translation_verdicts"]` (`VERDICTS_EXPORT_KEY`). ka renames `translation_reviews`;
  ka and KS trade `key` for `string`, gain `text`, take kk's field order, and their
  exports, unordered today, go oldest first. Each app's export test fills one verdict, so
  `assert_no_secrets` sees one (6.1). The grant stays in `account`, as each app has it.

#### 6.2.11 Testing support

`eifi1_server_kit.translation_review.testing`, in the wheel, not re-exported, as 2.14:
- `InMemoryTranslationReviewStore`, which records each write, so a test asserts the
  one-write rule, and `reviewer(**overrides)`;
- `check_store`: what an app runs once against its adapter, on its test database, for one
  existing account. It writes under a fresh area name, asserts only on its own keys and
  clears them (§6.3);
- `check_round_trip(client, *, headers, locale)`: over the app's client at its mount.

The kit's own tests drive the router through `TestClient` on the fake: H1's behaviour is
tested once. The apps keep a wiring test per route, their grant (kk's token, ka's
superuser) and `check_store`.

### 6.3 server-kit 0.10.0: the build list

Additive: no name changes. Two refusals are new: a request body with an unknown field is
422 (T5), and a review token on a grant with an area limit 403 (T2). Module paths are from
`src/eifi1_server_kit/`, the rest from the server-kit repo's root.

**Layer 1**
- `translation_review/scope.py`: `in_areas` with the `<area>:` arm; `area_like_patterns`
  with four patterns per area (its docstring and the README's example follow);
  `review_grant(…, is_demo: bool = False)`, an empty grant for a demo;
  `NO_REVIEW_ACCESS = "No translation review access"` and
  `NO_KIT_REVIEW_ACCESS = "No review access to the kit's wording"` (6.2.2, 6.2.8).
- `translation_review/schemas.py`: `TranslationReviewOut.reviewer_first_name` and
  `.reviewer_last_name`, `str | None = None`; `model_config = ConfigDict(extra="forbid")`
  on `TranslationReviewWrite`, `TranslationReviewBatch`, `TranslationReviewKey` and
  `TranslationReviewClear` (T5).
- `clock.py` (new): `Clock` and `utc_now`; `feedback/ports.py` imports them, its
  `__all__` unchanged.

**`translation_review/ports.py`** (new; no FastAPI, no SQLAlchemy): `TranslationReviewer`,
`TranslationReviewRow`, `ReviewerName`, `NewVerdict`, `TranslationReviewStore`, as 6.2.2
and 6.2.3 write them.

**`translation_review/service.py`** (new; no FastAPI):

```python
VERDICTS_EXPORT_KEY = "translation_verdicts"


class TranslationReviewService[RowT: TranslationReviewRow]:
    def __init__(self, store: TranslationReviewStore[RowT], *, locale_codes: Sequence[str],
                 now: Clock = utc_now) -> None: ...
    def scope(self, viewer: TranslationReviewer) -> ReviewGrant: ...
    async def list_reviews(self, viewer: TranslationReviewer) -> TranslationReviewsResponse: ...
    async def save(self, viewer: TranslationReviewer,
                   items: Sequence[TranslationReviewWrite]) -> list[TranslationReviewOut]: ...
    async def clear(self, viewer: TranslationReviewer, keys: Sequence[tuple[str, str]]) -> int: ...
    async def export(self, reviewer_id: int) -> list[dict[str, Any]]: ...
```

- `scope`: the viewer's grant. `TranslationAccessError(NO_REVIEW_ACCESS)` when it holds
  no locale. When `kit_only`: `TranslationAccessError(NO_KIT_REVIEW_ACCESS)` when
  `grant.areas is not None` (T2), else the grant with its areas `(KIT_AREA,)`.
- `list_reviews`: `scope`; `store.verdicts(grant.locales, grant.areas)`; only what the
  locales and `in_areas` allow; `TranslationReviewsResponse(locales, areas, reviews)`, each
  review with the name's two parts and `reviewer_name` (6.2.5).
- `save`: `require_kit_keys` when `kit_only`; `assert_allowed(viewer.grant, pairs,
  locale_codes)`; the last item per pair, in first-seen order; a `NewVerdict` each, with
  `note` and `suggestion` cleaned and `suggestion` None unless NEEDS_CHANGE,
  `reviewer_id=viewer.id`, `reviewed_at=now()`; `store.put`; the rows out, with the
  viewer's name.
- `clear`: the same two checks; `store.clear` with the pairs once each.
- `export`: `by_reviewer`; each row as 6.2.10 writes it, `suggestion` before `note`.

**`translation_review/router.py`** (new; the `fastapi` extra): the `ImportError` naming the
extra, as `feedback.router`'s; `TranslationReviewDeps` and `translation_review_router` as
6.2.7. Each
request builds `TranslationReviewService(store, locale_codes=deps.locale_codes,
now=deps.now)`. "reviewer" and "store" are `Depends(deps.reviewer)` and
`Depends(deps.store)`:

| # | Route | Endpoint | Parameters | Answer |
|---|---|---|---|---|
| 1 | `GET /reviews` | `list_translation_reviews` | reviewer, store | 200 `TranslationReviewsResponse` |
| 2 | `PUT /reviews` | `save_translation_reviews` | `payload: TranslationReviewBatch`, reviewer, store | 200 `TranslationReviewWriteResponse` |
| 3 | `POST /reviews/clear` | `clear_translation_reviews` | `payload: TranslationReviewClear`, reviewer, store | 200 `TranslationReviewClearResponse` |

**`translation_review/testing.py`** (new; no FastAPI, no httpx):

```python
@dataclass
class MemoryVerdict: ...  # the row's members and reviewer_id, mutable; a TranslationReviewRow

class InMemoryTranslationReviewStore:  # a TranslationReviewStore[MemoryVerdict]
    def __init__(self, *, names: Mapping[int, ReviewerName] | None = None) -> None: ...
    rows: dict[tuple[str, str], MemoryVerdict]
    writes: list[Literal["put", "clear"]]

def reviewer(**overrides: Any) -> TranslationReviewer: ...
    # id 1, "Ada" "Reviewer", "en", every locale of ("de-CH", "en", "fr", "it"), every area

async def check_store(store: TranslationReviewStore[Any], *, reviewer_id: int,
                      name: ReviewerName, locale: str) -> None: ...
async def check_round_trip(client: Any, *, headers: Mapping[str, str], locale: str) -> None: ...
```

`check_store` works under a fresh area `a` = `chk_<token>` (the `_` tests the escape),
with `reviewed_at` it sets itself:
1. `put` of `a.one` (APPROVED) and `a.two` (NEEDS_CHANGE, an empty `text`, a suggestion,
   a 40 000-character `reference_text`): the rows come back in order and read back alike;
2. `verdicts([locale], None)` holds both, by key, each paired with `name`;
3. a second `put` of `a.one` as NEEDS_CHANGE: still one row for the pair, with the new
   verdict;
4. `put` of `a`, `a:x`, `kit.a.x`, `chkX<token>.x` and `other.a.x`: `verdicts([locale],
   [a])` holds the first three and `a.one`, `a.two`, and neither of the last two;
5. `by_reviewer(reviewer_id)` holds them, oldest first;
6. `clear` of `a.one`, `a.two` and a pair never written answers 2, and they are gone; it
   then clears the rest of its keys.

`check_round_trip`: `GET /api/v1/translations/reviews` is 200 with `locale` among
`locales`; a `PUT` of one verdict on `kit.check.<token>`; the next `GET` holds it; `POST
/api/v1/translations/reviews/clear` answers `cleared: 1`. The paths are
`TRANSLATION_REVIEW_ROUTES`'s own.

**`translation_review/__init__.py`** re-exports the names of `ports` and `service`; never
`router` or `testing`.

**Tests**, in `tests/translation_review/`:
- `test_service.py`: each flow on the fake; a token viewer (the list of the area `kit`,
  the whole batch refused, its 403 before the grant's); a token viewer on a grant with an
  area limit refused by `scope` with `NO_KIT_REVIEW_ACCESS`, also by `list_reviews`; the
  403 and 422 orders; the last item wins; the cleaning; the reader's order of the name;
  the second filter by `in_areas`; the export, its keys in kk's order, oldest first;
- `test_router.py`: a FastAPI app on the fake with `install_contract_error_handlers`; each
  route's status and body; an unknown field in a `PUT` item, a `PUT` body, a clear item
  and a clear body is 422, and nothing is written; at `/api/v1`, the operation ids and the
  paths of `TRANSLATION_REVIEW_ROUTES`; at most one store write per request, as the last
  step; `check_round_trip` on the fake;
- `test_testing.py`: the checks pass on the fake and fail on a broken store (one without
  the `:` arm, one that keeps two rows for a pair);
- `test_translation_review.py`: the `:` arm in both functions, `is_demo`; the four
  request models refuse an unknown field;
- `tests/test_package.py`: importing `eifi1_server_kit.translation_review` loads no
  `fastapi`; the router's `ImportError` names the extra.

**The rest:** the README's layering row 2 names the translation review (**0.10.0**: the
reviewer view, the store, the router; no guards) and its section shows the four-arm
filter; `CHANGELOG.md`: 0.10.0; `scripts/export_api.py` `MODULES` gains
`("eifi1_server_kit.translation_review.router", "docs/server-services-harmonization.md",
"§6.2.7")`.

**Size M**, smaller than feedback's: about 400 code lines (layer 1 20, ports 60, service
110, router 60, testing 150) and about 700 lines of tests.

### 6.4 ui-kit 0.37

**Size S**, docs only; no component or wire change, since `reviewer_name` stays the field
the kit's parts read (`src/lib/translation-review.ts:111-121`), and `toApiWrite` sends only
the kit's fields (`:151-161`). This section and H1 (i18n-harmonization.md §2: the four
arms in both kits, the name's two parts, the export's one shape, the bodies' refusal of an
unknown field), updated with it; at the release the showcase's `server-kit-api.json`
synced to 0.10.

### 6.5 Per app

| | Code lines now | After: adapters and wiring (estimate) | Removed |
|---|---|---|---|
| kk | ≈ 150 (the flows 89, helpers 12, the three routes with `_kit_keys_only` and `_refuse` 44, the subclasses 7) | ≈ 50 (store 35, the view in `get_review_actor`, wiring) | **≈ 100** |
| ka | ≈ 205 (the service but `_document_texts` ≈ 120, repository 26, three routes 23, schemas 38) | ≈ 65 (store with its flag 40, the view, wiring and the documents router 25) | **≈ 140** |
| KS | ≈ 170 (the flows 87, router 42, schemas 44) | ≈ 55 (store 35, the view, wiring) | **≈ 115** |

Each app's review tests shrink to the wiring, `check_store`, `check_round_trip` and its
own grant (kk's token tests stay whole).

**keksdose**
1. Pin server-kit 0.10.0 with the `fastapi` extra (`backend/pyproject.toml:57`, `:121`).
   The 0.36 adoption pins 0.9.0 with it; if that adoption has not shipped, kk jumps 0.8 →
   0.10, adds the extra and takes 0.9's feedback layer in the same step
   ([adopt-0.36.md](adopt-0.36.md)).
2. The store, in `adapters/persistence/`: `verdicts` is `list_reviews`' query with
   `area_like_patterns` for `:149-165`, paired with the reviewer's `ReviewerName`; `put`
   is `save_reviews`' lookup and assignment (`:203-231`); `clear` is `:239-249`;
   `by_reviewer` is the export's query (`account_export_service.py:316-320`). Its
   dependency takes `Depends(db_session)`, the same callable as `get_review_actor` (router
   `:52`), so both get the request's one session: the one `set_current_user` (`:60`) sets
   the RLS user on for a token, and the one `commit_boundary` commits (6.2.9).
3. `get_review_actor` (router `:49-62`) answers a `TranslationReviewer` with
   `grant=review_grant_of(user)` and `kit_only` as now; `review_grant_of` passes
   `is_demo=user.is_demo` instead of folding it into `is_reviewer` (`:105`). The token
   service keeps `can_review_kit`'s re-check at mint and in `authenticate` (`:59-66`,
   `:70`, `:133`), so an area-limited grant still answers 401, before the kit's `scope()`
   would refuse it (6.2.2).
4. `adapters/api/translations_router.py` keeps `get_review_actor` and the two token routes
   on its own router, included after `translation_review_router(TranslationReviewDeps(
   reviewer=get_review_actor, store=translation_review_store,
   locale_codes=UI_LOCALE_CODES))` (`main.py:299`). These go: `ReviewActor`,
   `_kit_keys_only`, `_refuse` and the three routes; in the service `list_reviews`, `_row`,
   `save_reviews`, `clear_reviews`, `_clean`, `_assert_allowed`, `allowed_locales` and
   `allowed_areas` (`review_grant_of`, `normalize_*` and `set_reviewer` stay); the three
   subclasses (`domain/schemas/translations.py:40-56`, imported at router `:25-33`). The
   token model's docstring names `allowed_locales`/`allowed_areas`
   (`domain/models/translation_review_token.py:27`): it names `review_grant_of` instead.
5. The export calls `export(user.id)`: the same shape as now, `suggestion` before `note`.
6. Unchanged: the paths, the operation ids, the CORS routes, the billing list, the token
   flow, the 403 and 422 bodies. A reader may notice `reviewer_name` in their own order;
   the page formats the parts already, and kk's four locales put the first name first. A
   test that sends a field the kit's models lack gets 422 (T5).

**kastlan**
1. Pin server-kit 0.10.0.
2. `SqlAlchemyTranslationReviewRepository` becomes the store, with a `commit` flag (6.2.9):
   `verdicts` is `list_with_reviewer` with the area filter, paired with names; `put` is
   `get_many`, `add` and the service's assignment (`:220-244`); `clear` is `delete_many`
   per locale; `by_reviewer` is the export's query (`account_service.py:243-247`), with
   the order it lacks.
3. Its `reviewer` dependency, on `get_current_user`: `review_grant(user,
   is_admin=user.is_superuser, is_reviewer=True, is_demo=user.is_demo,
   locale_codes=UI_LANGUAGES)`, the name's parts and `user.locale`.
4. `adapters/api/translation_router.py`: the kit's router, then its own with `GET
   /documents`, which takes the same dependency and calls `scope(viewer)` before
   `_document_texts()` (6.2.7).
5. These go: the service's class and its copies of layer 1 (`:57-137`, `:164-258`, but
   `document_texts`); the schemas but `DocumentTextsResponse`.
   `platform_service.set_reviewer` (`:244-275`) calls the kit's `normalize_locales` and
   `normalize_areas` with kastlan's vocabulary: the same 422, the kit's sentence.
6. The export: `data["translation_verdicts"]` from `export(user.id)` in place of
   `translation_reviews` (`account_service.py:309-319`, below `data["notifications"]` at
   `:308`, which 0.36 added); its export test fills a verdict.
7. What changes on the wire: the refusals' sentences, the name's two parts, `TEXT_MAX`
   40 000, the export's key, fields and order. A body with an unknown field is 422 (T5);
   the page sends none, so only a test notices.

**Kurvenschmiede**
1. Pin server-kit 0.10.0.
2. The store from `list_reviews` (with `area_filter`), `save_reviews`' lookup and
   assignment, `clear_reviews` and `export_service.verdicts`' query; the sealed columns as
   they are.
3. Its `reviewer` dependency, on `get_current_user`: `grant(user)` with `is_demo`, the
   name's parts and `user.locale`.
4. `adapters/api/translations_router.py` becomes the kit's router, in `main.ROUTERS` as
   today. The walks hold (6.2.6).
5. These go: `_clean`, `_row`, `list_reviews`, `save_reviews` and `clear_reviews`; the
   schemas but `AdminReviewerRequest` and `AdminReviewerResponse`, so its four forbid
   request models too (`domain/schemas/translations.py:45-75`): the kit's forbid unknown
   fields now (T5).
6. The export: `string` for `key`, and `text`, in kk's field order, oldest first (the
   query has no order today, `export_service.py:114`); its export test fills a verdict.
7. What changes: the operation ids (`list_reviews` → `list_translation_reviews`, read by
   no client), the `GET`'s 403 sentence (read by nothing, KS Q2) and the export's order.

### 6.6 Reviews and decisions

The three apps reviewed the draft on 2026-10-13 and agreed with its shape. Marcel decided
the five points they left open on 2026-10-14. Their findings are folded into the sections
above.

- **Marcel** (2026-10-14, "Do 0.37 as recommended"): T1 one export shape, kk's, with
  `suggestion` before `note` → 6.2.10; T2 the tokens stay kk's with no port, and `scope()`
  refuses a token on a grant with an area limit → 6.2.2; T3 `reviewer_name` in the
  reader's order → 6.2.5; T4 the `<area>:` arm in every app → 6.2.4; T5 the four request
  models forbid unknown fields → 6.2.7, so `TranslationReviewDeps` takes no request model.
- **keksdose** (keksdose-b5, at `c90d068e`): kk 1 (agreed; no test reads `_refuse` or
  `_kit_keys_only`; the store shares `get_review_actor`'s session) → 6.2.9, 6.5; kk 1a
  (kk replaces the areas, safe only through `can_review_kit`) → T2, 6.2.2; kk 2 (only the
  page, the showcase and two asserts read the name; same bytes) → 6.2.5; kk 3 (no key
  holds a `:`) → 6.2.4. Its corrections: three subclasses, not two → 6.1, 6.2.5, 6.5; it
  ran 0.8.0 → 6.1, 6.5; the token cite `:49-62` → 6.1; the export's field order → 6.2.10;
  the token model's docstring → 6.5.
- **kastlan** (kastlan-10, at `0e8bd2c`): agreed. The grant as `is_admin=is_superuser,
  is_reviewer=True`, and no page shows a refusal's sentence → 6.2.2, 6.2.8; its four-arm
  `in_areas` waits for the kit's → 6.2.4; the store's `commit` flag as feedback's → 6.2.9;
  `GET /translations/documents` its own route → 6.2.7; the export agreed, `key` confirmed
  → 6.1, 6.2.10. Its correction: 0.36 put `data.notifications` above the verdicts → 6.5.
- **Kurvenschmiede** (kurvenschmiede-b9, at `bcadab6`): B1 `key` confirmed, its export
  unordered → 6.1, 6.2.10; B2 the area-rule cites (`scope.py:88-89`, `:125-129`; H1 at
  `i18n-harmonization.md:59-61`) → 6.1; Q1 the kit's models forbid unknown fields → T5,
  6.2.7; Q2 nothing reads the `GET`'s 403 sentence, so the question is dropped → 6.2.8;
  Q3 a 40 000-character text through `EncryptedText` is fine → 6.2.3; Q4 the export
  agreed → 6.2.10.
- **Re-read on 2026-10-14** in the 0.36 adoption trees: the cites that moved since the
  survey (kk `main.py`, the billing list and the client; ka's export, demo layer, route
  walk, billing list and client; KS's `DEMO_ALLOWED`, export route and client) → 6.1,
  6.2.6, 6.2.7, 6.5. kk's `suggestion` and `note` are at `:383-384`, not `:382-383`.
