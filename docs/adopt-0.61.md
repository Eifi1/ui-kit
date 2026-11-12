# Adopting `@eifi1/ui-kit` 0.61

ui-kit 0.61 makes the feedback area one area for every app (Marcel, 2026-11-12: Kurvenschmiede's
should look and work exactly like keksdose's): the discussion page assembled once
(`FeedbackPublicPage`), the comment thread once (`useFeedbackComments`, and
`useFeedbackCommentsQuery` for a thread a persisted cache keeps offline), the pages' frame
(`FeedbackPageFrame`), which copy of the app a report comes from (`deployEnvironment`), and the
swipe settings (`createSwipeSettingsStore`, `SwipeSetting`). It ships with **server-kit 0.25**:
one link builder for the feedback notices.

**From 0.60, nothing else first.** 0.61 also carries the two fixes keksdose's 0.60 adoption
found, which no app has as 0.60.1: `FEEDBACK_SWIPE_ACTIONS` exported again, and the feedback
screenshot showing each select, checkbox and radio as it is (`docs/adopt-0.60.md`, section 0.60.1).

**Legal wording:** none. No kit legal text changes. Kurvenschmiede's own privacy text changes
with its own work this round (feedback stored unencrypted, no customer role, the offline cache);
that is the app's, not the kit's.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing; every change is additive. An app that keeps its own pages, hooks and
store draws what it drew.

**New words** (all seven catalogues; **es, hu and zh need native review**): `feedbackPublic`
`loadFailed`, `offlineHint`, `rowUnavailable(id)`; the `swipeSetting` namespace (17 keys). de-CH,
fr and it are keksdose's reviewed wording.

## The discussion page, assembled once (`FeedbackPublicPage`, `useFeedbackPublicPage`, `useFeedbackComments`)

**What changed.** Three new exports in `@eifi1/ui-kit` and `@eifi1/ui-kit/feedback`
(docs/feedback-harmonization.md §14):

- `useFeedbackPublicPage({ search?, pageSize? })` keeps the page's state in the address, as
  keksdose did: `?sort=`, `?p=`, `?q=` (only with `search`) and `?row=`. Every write replaces the
  history entry. A new sort or search goes back to page one. The search is asked once the typing
  pauses 300 ms. `view.request` (`{ sort, q?, limit, offset }`) is what your list query keys on and
  sends. `search` is off by default: no box, and `q` is never sent.
- `FeedbackPublicPage` draws the page from that state and your two `useQuery` results, passed as
  they are: the list (`view.request`) and the open report (`view.openId`, enabled while one is
  open). It owns the vote, the opened report with its conversation, a `?row=` report that is not on
  the page (drawn above it), the toast for one that cannot be read, the table's Loading and the
  report's Skeleton, and a read with nothing to show: "You’re offline", or "That didn’t load." with
  Try again. The vote and the thread go through `api={feedbackApi}`. Failures toast through
  `errorMessage` (the server's sentence wins). After a write, `onChanged(id, vote?)` is where you
  refresh your caches.
- `useFeedbackComments(id, api, { onChanged?, errorMessage? })` is one report's thread, for the
  inbox's comments too. `null` reads nothing.
- Additive, on parts that already existed: `FeedbackPublicList` takes `empty` (what the table
  says where its rows would be), and `FeedbackPublicDetail` takes `commentsError` (drawn in the
  conversation's place).

**Why.** Marcel, 2026-11-12: Kurvenschmiede's feedback area should look and work exactly like
keksdose's. Both apps wrote `/all-feedback` around the kit's parts, and Kurvenschmiede's had
drifted: the sort and the page lived in `useState`, so a reload or a shared link started over,
and a failed read had no Try again. The page is now the kit's, keksdose's.

The two comment hooks had drifted too. The kit takes Kurvenschmiede's behaviour for both points,
because it is what the thread's own props mean. `pending` is true only while a comment is being
sent: keksdose's was also true during a hide or a delete, which set the Send button spinning. A
failed hide or delete says "Could not save that change." (`feedbackToast.updateFailed`): keksdose
said "Could not post the comment."

`useFeedbackComments` holds the thread in memory while the report is open: the kit's feature
areas may not import the optional TanStack peer. For a thread a persisted cache keeps offline,
use `useFeedbackCommentsQuery` from `@eifi1/ui-kit/offline` and hand it to the page's `thread`
(next section).

**Must change:** nothing. It is additive. An app that keeps its own page draws what it drew.

**New words:** `feedbackPublic.loadFailed`, `.offlineHint`, `.rowUnavailable(id)`, in all seven
catalogues. de-CH, fr and it are keksdose's reviewed `common.load_failed` /
`feedback_row_unavailable`. es, hu and zh need a native review. The offline title and "Try again"
are the existing `errorBoundary.offlineTitle` and `.retry`.

**keksdose** (no visible change, apart from the fixes below).

- `frontend/src/features/feedback/all-feedback-page.tsx` becomes the hook, two queries and one
  component, inside `FeedbackPageFrame` (see the frame's note):

  ```tsx
  const view = useFeedbackPublicPage({ search: true });
  const list = useQuery({
    queryKey: queryKeys.feedback.public(view.sort, view.query, view.page),
    queryFn: () => feedbackApi.listPublic(view.request),
    placeholderData: keepPreviousData,
  });
  const record = useQuery({
    queryKey: queryKeys.feedback.publicOne(view.openId ?? 0),
    queryFn: () => feedbackApi.getPublic(view.openId ?? 0),
    enabled: view.openId !== null,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: queryKeys.feedback.all });
  return (
    <FeedbackPageFrame>
      <FeedbackPublicPage view={view} list={list} record={record} api={feedbackApi}
        isAdmin={isAdmin} errorMessage={extractApiErrorMessage} onChanged={refresh}
        renderDate={renderDate} onUpload={feedbackApi.uploadAttachment}
        onCaptureScreenshot={capture} fetcher={authedImageFetcher} />
    </FeedbackPageFrame>
  );
  ```

  These go: `SORTS`, `PAGE_SIZE`, the four `useSearchParamState`s, `useDebounce`, `offPage`, the
  `openRecord` query and its toast effect, `changeSort` / `changeSearch`, `vote`, the
  `PublicDetail` component, and the imports of `QueryState`, `Skeleton`, `toast`,
  `useFeedbackToastLabels`, `useFeedbackPublicLabels` and `useFeedbackComments`. Drop the
  `common.feedback_row_unavailable` key if nothing else reads it. Pass no `header`: inside the
  frame the page draws the frame's header, titled "Feedback discussion".
- What you will see: a list that fails to load now says "That didn’t load." with Try again in the
  table (it said "No reports yet"). Comments that fail to load say so in the conversation, with
  Try again (the loading lines stayed). Next waits while the next page loads. `?row=1e2` no longer
  opens #100.
- **Keep the offline thread:** use the kit's `useFeedbackCommentsQuery` (next section), not the
  in-memory hook. On `/all-feedback` pass
  `thread={useFeedbackCommentsQuery(view.openId, feedbackApi, { admin: isAdmin, errorMessage: extractApiErrorMessage, onChanged: refresh })}`
  to `FeedbackPublicPage`. In `frontend/src/features/feedback/feedback-page.tsx`, `RowComments`,
  replace `useFeedbackComments(id)` with
  `useFeedbackCommentsQuery(id, feedbackApi, { admin: isAdmin, errorMessage: extractApiErrorMessage, onChanged: () => void qc.invalidateQueries({ queryKey: queryKeys.feedback.all }) })`.
  The keys are keksdose's own, so the threads already on members' devices carry over, and the
  persistence rule that refuses `"admin"` keys stays. Then delete
  `frontend/src/features/feedback/use-feedback-comments.ts`; its test's persisted-thread case
  stays true and moves to the page's test.
- `frontend/src/features/feedback/__tests__/all-feedback-page.test.tsx`: the cases stay. The
  words change: `common.load_failed` becomes "That didn’t load.", `error.retry` becomes
  "Try again", `common.offline_title` becomes "You’re offline". The toast is now
  `toast.error("Report #99 could not be opened. It may have been removed or hidden from others.", { id: "feedback-row-99" })`.
  `listPublic` is called with `{ sort: "newest", limit: 50, offset: 0 }`, without a `q` key; the
  test's `q: undefined` still matches. `comment` is called as `(52, "Me too")`, without a third
  `undefined`: change that expectation, since an argument list of another length does not match.

**Kurvenschmiede** (this is the change Marcel asked for). Search is on: since Kurvenschmiede's
migration 0059 the titles are plain text, as keksdose's (Marcel, 2026-11-12), and the server
runs `public_search=True`.

- `frontend/src/features/feedback/all-feedback-page.tsx`: keep `AllFeedbackPage` and its
  `seesPublicFeedback` gate. `AllFeedback` becomes:

  ```tsx
  const view = useFeedbackPublicPage({ pageSize: PUBLIC_PAGE_SIZE, search: true });   // titles are plain since 0059
  const list = useQuery({
    queryKey: queryKeys.feedbackPublicPage(view.request),
    queryFn: () => feedbackApi.publicList(view.request),
    placeholderData: keepPreviousData,
  });
  const record = useQuery({
    queryKey: queryKeys.feedbackPublicOne(view.openId ?? 0),
    queryFn: () => feedbackApi.publicOne(view.openId ?? 0),
    enabled: view.openId !== null,
  });
  return (
    <FeedbackPageFrame>
      <FeedbackPublicPage view={view} list={list} record={record} api={feedbackApi} isAdmin={admin}
        errorMessage={apiErrorMessage}
        onChanged={(id, vote) =>
          vote ? putVote(queryClient, id, vote) : void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackLists })}
        renderDate={renderDate} onUpload={feedbackApi.upload} fetcher={feedbackApi.file} />
    </FeedbackPageFrame>
  );
  ```

  These go: the `useState` sort and page, `useSearchParams` and `setOpen`, `offPage` and the
  `openRow` query, the `AlertBanner` branch, `PublicReport`, and the imports of `AlertBanner`,
  `LoadingState`, `captureAppScreenshot`, `FeedbackPublicList`, `FeedbackPublicDetail`,
  `useFeedbackPublicLabels`. Export `putVote` from `use-feedback-conversation.ts` (or move it here)
  and keep it: the vote's answer is still written into every cached view in place.
- `frontend/src/features/feedback/feedback-page.tsx`, `ReportComments`: replace
  `useReportConversation(id)` with `useFeedbackCommentsQuery(id, feedbackApi, { admin, errorMessage: apiErrorMessage, onChanged: () => void queryClient.invalidateQueries({ queryKey: queryKeys.feedbackLists }) })`
  once the persisted cache is in (Marcel, 2026-11-12: Kurvenschmiede gets the offline cache), or
  `useFeedbackComments` with the same options until then. `loading={conversation.comments === undefined}`
  becomes `loading={thread.loading}`. On `/all-feedback` pass the same hook's answer as `thread`.
- `frontend/src/features/feedback/use-feedback-conversation.ts`: `useReportConversation` and
  `useFeedbackVote` go. Only `putVote` stays, if you keep the file. The
  `queryKeys.feedbackComments` key can go.
- What you will see: the sort and the page are in the address (`?sort=votes&p=1`), so a reload or a
  shared link keeps them. A list that fails keeps the sort toggle and says "That didn’t load." with
  Try again in the table (it was a red banner in place of the list). A report that fails to load
  has Try again. A link to a report that cannot be read now says so in a toast (it did nothing).
  The page's frame is keksdose's (see the frame's note).
- `frontend/src/features/feedback/all-feedback-page.test.tsx`: "says so when the list cannot be
  read" looked for `role="alert"`. It now finds the text "That didn’t load." and a "Try again"
  button. The page-size, sort, link, vote, comment, delete, hide, gate and phone cases stay as
  they are. The API calls they assert do not change.

**kastlan:** nothing to change. Public feedback is switched off there.

**Tests:** `src/feedback/__tests__/feedback-public-page.test.tsx` (35),
`src/feedback/__tests__/feedback-comments.test.tsx` (13).

## The comment thread a persisted cache keeps (`useFeedbackCommentsQuery`, `@eifi1/ui-kit/offline`)

**What changed.** `useFeedbackCommentsQuery(id, api, { admin?, onChanged?, errorMessage? })` is
new in `@eifi1/ui-kit/offline`, with `feedbackCommentsQueryKey(id, admin)`. It is keksdose's
comment-thread hook: the thread lives in the app's TanStack cache, so a persisted cache
(`createQueryPersistence`, or keksdose's own) keeps it for offline reading. It answers the same
`FeedbackCommentsState` as `useFeedbackComments`: pass it to `FeedbackPublicPage`'s `thread`, or
draw it in the inbox row's comments.

- **Keys:** `["feedback", "comments", id]` for a member, `["feedback", "admin", "comments", id]`
  for an admin. An admin's thread carries hidden comments' bodies and full names, so the app's
  persistence must refuse that key: keksdose's already refuses every key whose second segment is
  `"admin"`; with `createQueryPersistence`, pass `shouldPersistKey: (key) => key[1] !== "admin"`.
- **Offline:** a cached thread stays on screen. With none, `failed` and `offline` say so (the
  page draws "You’re offline"), and the read runs once the browser is back.
- **The rules are `useFeedbackComments`'s:** `pending` only while a comment is out; a failed
  hide or delete says "Could not save that change."; after a write the thread is read again and
  `onChanged(id)` refreshes the app's lists.

**Why.** Marcel, 2026-11-12: "Add the offline cache to kurvenschmiede and add to the ui kit so
both can adopt". keksdose's members read their threads offline; the kit's in-memory hook would
have lost that, and Kurvenschmiede had no persisted cache at all.

**keksdose:** see the page's section above: this hook replaces `use-feedback-comments.ts`, under
the same keys.

**Kurvenschmiede:** first the persisted cache, as kastlan has it
(`kastlan/frontend/src/shared/offline/query-persistence.ts`): `createQueryPersistence({ app:
"kurvenschmiede", user, shouldPersistKey: (key) => key[1] !== "admin", denyRoots: […] })`
around the `QueryClient`, `removeStaleQueryCopies` at sign-in, `leave` / `clear` at sign-out,
and the privacy text naming what stays on the device. Then this hook on `/feedback`,
`/my-feedback` and `/all-feedback`.

**kastlan:** nothing to change; it has a persisted cache and may use the hook for its inbox.

**Tests:** `src/offline/__tests__/feedback-comments-query.test.tsx`.

## The feedback pages' frame (`FeedbackPageFrame`)

**What changed.** `FeedbackPageFrame` is new, in `@eifi1/ui-kit` and `@eifi1/ui-kit/feedback`.
It is the frame keksdose draws around `/feedback`, `/my-feedback` and `/all-feedback`:

- the fill-height column (`FILL_HEIGHT_CLASS`), so a `fillHeight` table fills the window from md;
- `py-4 md:p-6`: no side padding on a phone, so the list runs edge to edge (its cards carry their
  own 16px inset), and 24px from md;
- a `compact` `PageHeader` with `mb-4 px-4 md:px-0 md:shrink-0`: the phone's gutter sits on the
  header alone, and the header never shrinks in the fill-height column.

The title has one place:

- `<FeedbackPageFrame>` with no `title` around `FeedbackInbox`: the inbox draws its own title
  ("Feedback inbox" or "My feedback") in the frame's header.
- `<FeedbackPageFrame title={…}>` around anything else (`FeedbackPublicList`, a page of your own):
  the frame draws the header, and a kit page inside draws none.
- `headerProps` reach the header: a tour anchor (`{ "data-tour": "feedback-header" }`),
  `actions`, `description`. An explicit `header` on `FeedbackInbox` still wins.

It is the page's root. Put it where the app's own page padding was, not inside a content column
that already pads every page.

**Why.** Marcel, 2026-11-12: Kurvenschmiede's feedback area should look and work exactly like
keksdose's. The inside of the three pages has been the kit's since 0.55 and 0.38, but each app
still wrote the frame, twice, and Kurvenschmiede's differed: a 12px gutter on the phone and a
title one size smaller. Now the frame is the kit's, keksdose's.

**Must change:** nothing. It is additive, and an app that keeps its own frame draws what it drew.

**keksdose** (no visible change: the frame is its own classes).

- `frontend/src/features/feedback/feedback-page.tsx`: wrap the `FeedbackInbox` in
  `<FeedbackPageFrame headerProps={{ "data-tour": "feedback-header" }}>` and delete its
  `className="py-4 md:p-6"` and its `header={(title) => <PageHeader … />}`. The `PageHeader`
  import goes. The "Sending feedback" tour still finds `data-tour="feedback-header"` on the header.
- `frontend/src/features/feedback/all-feedback-page.tsx`: replace
  `<FillHeight className="py-4 md:p-6">` and its `<PageHeader size="compact" className="mb-4 px-4 md:px-0" title={labels.title} />`
  with `<FeedbackPageFrame title={labels.title}>`. The `FillHeight` and `PageHeader` imports go.
  The header gains `md:shrink-0`. With this round's `FeedbackPublicPage`, follow the discussion
  page's section above for this file.

**Kurvenschmiede** (this is the change Marcel asked for).

- `frontend/src/features/feedback/feedback-page.tsx`: wrap the `FeedbackInbox` in
  `<FeedbackPageFrame>` and delete `className={PAGE_SHELL}` and
  `header={(title) => <PageHeader size="sm" className="shrink-0" title={title} />}`. The
  `PageHeader` and `PAGE_SHELL` imports go.
- `frontend/src/features/feedback/all-feedback-page.tsx`: follow the discussion page's section
  above, which puts `FeedbackPublicPage` inside `<FeedbackPageFrame>`. The `FillHeight`,
  `PageHeader` and `PAGE_SHELL` imports go.
- What you will see: on a phone the list runs edge to edge (it had 12px each side), and the title
  is `text-xl` (it was `text-lg`). From md the page has 24px on every side (it had 16px above and
  below). The 16px between the title and the table stays (`mb-4` instead of `gap-4`).
- Tests: `feedback-page.test.tsx` and `all-feedback-page.test.tsx` find the headings by name and
  level, which do not change. Take a phone screenshot of `/feedback` and `/all-feedback` beside
  keksdose's.

**kastlan:** nothing to change. Its content column already pads every page
(`frontend/src/app/app-layout.tsx`, `p-4 md:p-6`), so a frame inside it would add to that.
`FeedbackInbox`'s own default header is unchanged. kastlan has no `/all-feedback`.

**Tests:** `src/feedback/__tests__/feedback-page-frame.test.tsx`.

## Which copy of the app a report comes from (`deployEnvironment`)

**What changed.** `deployEnvironment(hosts, hostname?)` is new, in `@eifi1/ui-kit` and
`@eifi1/ui-kit/feedback`, with the type `DeployEnvironmentHosts`. It answers `"prod"`, `"dev"` or
`"local"` (`FeedbackEnvironment`) for `useFeedbackSubmit`'s and `createCrashReporter`'s
`environment`. It is keksdose's rule (`frontend/src/app/deploy-environment.ts`), with each app's
hosts passed in:

- `prod`: exactly the hosts listed (the domain and its `www`);
- `dev`: exactly the hosts listed, if the app has a dev copy;
- everything else is `"local"`: localhost, a LAN address, an `.sslip.io` phone preview, a tunnel,
  a renamed service. Never production.

A name matches whole and in any case, never as a suffix (`evil-myapp.example` is local). An entry
may be a RegExp, for a platform URL with a generated part. Anchor it. `hostname` defaults to
`location.hostname`; with no `location` it is `""`, which is local.

```ts
export const DEPLOY_ENVIRONMENT = deployEnvironment({
  prod: ["myapp.example", "www.myapp.example"],
  dev: ["dev.myapp.example", /^myapp-web-dev-[a-z0-9-]+\.a\.run\.app$/],
});
```

**Why.** A deployment runs a production build. A build flag (`import.meta.env.PROD`) is true on a
dev copy, on `vite preview` and on a docker run on a laptop, so all of them filed as production.
The host tells them apart and keeps one image for every copy. The three apps wrote this three
times; Kurvenschmiede used the flag.

**Must change:** nothing. It is additive.

**keksdose** (no change in what it files).

- `frontend/src/app/deploy-environment.ts`: keep the file for `deployEnvironmentLabel` (the
  DEV / LOCAL badge, `app/top-bar.tsx`). Replace the body of `deployEnvironment` with the kit's:
  ```ts
  import { deployEnvironment as kitDeployEnvironment, type FeedbackEnvironment } from "@eifi1/ui-kit";
  export type DeployEnvironment = FeedbackEnvironment;
  const HOSTS = {
    prod: ["keksdose.app", "www.keksdose.app"],
    dev: ["dev.keksdose.app", /^keksdose-web-dev-[a-z0-9-]+\.a\.run\.app$/],
  };
  export function deployEnvironment(hostname?: string): DeployEnvironment {
    return kitDeployEnvironment(HOSTS, hostname);
  }
  ```
  The pattern is stricter than today's `startsWith("keksdose-web-dev")`: it also needs the
  `.a.run.app` end. The test's sample `keksdose-web-dev-w5vg2p66ea-ez.a.run.app` still reads dev.
  If the dev service has another Cloud Run URL form, use `/^keksdose-web-dev/` to keep today's rule.
- `frontend/src/app/__tests__/deploy-environment.test.ts` passes unchanged.
- The callers (`shared/lib/crash-report.ts:49`, `features/feedback/use-feedback-submit.ts:31`)
  stay as they are.

**kastlan** (no change in what it files).

- `frontend/src/shared/feedback/deploy-environment.ts`: the rule is already the kit's, prod or
  local. Replace the body with `return kitDeployEnvironment({ prod: ["kastlan.app", "www.kastlan.app"] }, hostname);`,
  or delete the file and call the kit's in `shared/feedback/crash-reporter.ts:29` and
  `app/top-bar.tsx:104`.

**Kurvenschmiede** (this changes what it files).

- `frontend/src/shared/lib/crash-reporter.ts:10`: replace
  `import.meta.env.DEV ? "local" : "prod"` with
  `deployEnvironment({ prod: ["kurvenschmiede.app"] })`. Add `"www.kurvenschmiede.app"` if `www`
  is mapped (`deploy/gcp/README.md` names only the bare domain). Its two users,
  `createCrashReporter` (`:44`) and `features/feedback/use-feedback-submit.ts:29`, keep
  `DEPLOY_ENVIRONMENT`.
- What changes: a built bundle served anywhere but `kurvenschmiede.app` now files `"local"`, where
  it filed `"prod"`: `deploy/docker-compose.yml` ("local production-shaped run"), `vite preview`,
  and the Cloud Run `kurvenschmiede-web-….run.app` URL. Those reports now get the environment chip
  in the inbox. The Vite dev server stays `"local"`.
- Tests: a test that expects `"prod"` from a built bundle must stub `location.hostname` as
  `kurvenschmiede.app`. jsdom's host is `localhost`, which is local.

**Tests:** `src/feedback/__tests__/deploy-environment.test.ts`.

## The swipe settings: a kit store and a kit card (Marcel 2026-11-12)

**What changed.** The kit now has keksdose's swipe settings. `createSwipeSettingsStore({ storageKey, surfaces, legacy })` keeps, per list, a `right` and a `left` ladder: a short swipe and a long swipe, with `"none"` where a stage binds nothing. `SwipeSetting` is the card. It shows one list at a time, picked from a NavPills strip (no strip when there is only one list), and two pickers a side. It has "Set as my defaults", "Reset" and "Restore the shipped defaults".

The kit ships its two lists as surfaces: `FEEDBACK_SWIPE_SURFACE` (`advance`, `done`, `postpone`, `wont_do`) and `TRANSLATION_REVIEW_SWIPE_SURFACE` (`approve`, `edit`, `clear`). Their defaults are `DEFAULT_FEEDBACK_SWIPE` and `DEFAULT_TRANSLATION_REVIEW_SWIPE`, read left to right. An app adds its own lists as plain `{ actions, defaults }` objects, and names them through the card's `surfaceLabels`.

The store's `useSwipeBinding("feedback")` returns the `{ start, end }` that `FeedbackInbox`'s `swipe` and `TranslationReviewPanel`'s `swipe` take. The `"none"` slots are left out, and right is the end of a left-to-right line.

What the store reads is checked against the surfaces. An id a list does not offer becomes `"none"`. A short side is padded to two stages. A missing list gets its defaults. A list the app no longer offers is dropped. The saved defaults are checked the same way. The store joins "Reset this device's settings" by itself, as an appearance setting.

The card names the kit's lists in the kit's words, the words their swipe panels say: "Done", "Postponed", "Won't do", "Next status"; "Approve", "Needs a change", "Mark unreviewed". New namespace: `swipeSetting`, in all seven catalogues. The German, French and Italian are keksdose's own wording. **The Spanish, Hungarian and Chinese are new and need native review.**

**Why.** keksdose had the only copy of the store and the card. Kurvenschmiede will offer the same setting for its feedback inbox, and a second copy would have drifted from the kit's swipe ids. The feedback ids already drifted once: 0.60 added `postpone`.

**keksdose** (`frontend/src/…`):

- Replace `shared/state/swipe-prefs-store.ts` with the kit store, under a NEW key, and move the old data in with `legacy`:

  ```ts
  export const swipeSettings = createSwipeSettingsStore({
    storageKey: "keksdose-swipe-settings",
    surfaces: {
      transactions: { actions: [...], defaults: {...} },   // its own three, as they are now
      accounts: { actions: [...], defaults: {...} },
      budget: { actions: [...], defaults: {...} },
      feedback: FEEDBACK_SWIPE_SURFACE,
      translations: TRANSLATION_REVIEW_SWIPE_SURFACE,
    },
    legacy: {
      storageKey: "keksdose-swipe-prefs",
      // v4 is the kit's shape and needs nothing. Pass the old steps only for v1–v3:
      migrate: (state, version) => (version < 4 ? oldMigrate(state, version) : state),
    },
  });
  ```

  Keep the surface ids exactly as they are (`transactions`, `accounts`, `budget`, `feedback`, `translations`). They are the keys in the stored v4 blob, and their order is the order of the pills. The old key is read once, while the new key is empty. It is removed only after the new key reads back, so a refused write loses nothing. A new key is needed because keksdose's versions (1–4) and the kit's (1) would collide under one key. `oldMigrate` is the current `migrate` (fromV1, toV3, toV4), moved to a small legacy module. Without `migrate`, a v2 or v3 blob keeps its bindings as stored but misses the v3/v4 default moves.
- `shared/state/device-settings.ts`: remove the `keksdose-swipe-prefs` entry. The kit store registers `keksdose-swipe-settings` itself, with `resetToShipped`.
- Its own lists keep `resolveSwipePlan` (`features/accounts/accounts-page.tsx`, `features/transactions/mobile-transaction-list.tsx`, `features/transactions/transactions-page.tsx`, `features/budget/budget-page.tsx`, `budget-mobile-list.tsx`). They read `swipeSettings.useSwipeSettings((s) => s.surfaces.budget)`, which is the same `{ right, left }` shape. `SWIPE_NONE` now comes from the kit (`shared/components/swipe-row-actions.tsx`, the store's own uses).
- `features/feedback/feedback-page.tsx:148,187`: `swipe={swipeSettings.useSwipeBinding("feedback")}`.
- `features/translations/translations-page.tsx:43,53,133,294`: `swipe={swipeSettings.useSwipeBinding("translations")}`. Drop the `swipeActions` filter: the hook already leaves out `"none"`.
- Replace `features/auth/swipe-settings-card.tsx` with `<SwipeSetting store={swipeSettings} anchor="settings-swipe-card" surfaces={offered} surfaceLabels={{ transactions: { name, actions }, accounts: {…}, budget: {…} }} />`. `offered` is the role filter it has now: translations only for ADMIN and REVIEWER. In `features/auth/settings-page.tsx:166`, mount it with `{ anchored: false }`, because the kit card carries the anchor id itself. `settings-index.ts:276` keeps `settings-swipe-card`, and so do the tour's `#settings-swipe-card` target and the `?focus=` links.
- Words: the card's own words are the kit's now, so `settings.swipe_section`…`swipe_reset_shipped`, `swipe_action_none` and `swipe_slot_*` go. Keep `settings.swipe_surface_transactions|accounts|budget` and `settings.swipe_action_{transactions,accounts,budget}_*` for `surfaceLabels`. The feedback and translation actions now read as their panels do: "Done" for "Mark as done", "Postponed" for "Postpone", "Needs a change" for "Open the editor", "Mark unreviewed" for "Take the verdict back". If keksdose wants its old words, it passes them in `surfaceLabels.feedback` / `.translations`.
- Behaviour change: the strip is a group, not a `<nav>` landmark. Each side is a `<fieldset>` named "Swipe right" / "Swipe left", so a screen reader tells the two "Short swipe" pickers apart.
- Tests: `shared/state/__tests__/swipe-prefs-store.test.ts` keeps `resolveSwipePlan` and its own lists' ids and defaults. The kit now tests normalising, migrating v4, and the feedback ids. `features/auth/__tests__/swipe-settings-card.test.tsx` finds its options and buttons by the kit's English words. Check `shared/state/__tests__/persist-roundtrip-sweep.test.tsx` and `device-settings.test.ts` for the key.

**Kurvenschmiede** (`frontend/src/…`):

- Make the store once, e.g. `shared/state/swipe-settings.ts`: `createSwipeSettingsStore({ storageKey: STORAGE.swipe, surfaces: { feedback: FEEDBACK_SWIPE_SURFACE } })`. Add `swipe` to `STORAGE` in `shared/lib/storage-keys.ts` (e.g. `"kurvenschmiede-swipe-settings"`), with `KIND_OF` "appearance" and its line on the privacy page (`BROWSER_ENTRIES`). `storage-keys.test.ts` finds the `storageKey:` site.
- `features/settings/settings-page.tsx`: add the entry `{ id: "swipe", group: "appearance" (or the group it chooses), anchor: SWIPE_SETTING_ANCHOR, title: swipeLabels.title, keywords: swipeLabels.keywords }`, with `swipeLabels = useKitLabels("swipeSetting", DEFAULT_SWIPE_SETTING_LABELS)`, read the way `deviceResetLabels` is at :152. Render `<SwipeSetting store={swipeSettings} />` in that group, before the device reset card, which stays last. With one list the card draws no strip. The entry should be visible to admins only (only the admin inbox swipes), or to everyone if Marcel prefers.
- `features/feedback/feedback-page.tsx:138`: `swipe={swipeSettings.useSwipeBinding("feedback")}` on `FeedbackInbox`.

**kastlan:** nothing, unless it wants the setting. Then it follows Kurvenschmiede's steps.

Legal wording: none.

## server-kit 0.25: one link builder for the feedback notices (feedback §9.11, §13.7)

**What changed.** `eifi1_server_kit.feedback` exports four link builders. They come from
keksdose's `feedback_notice_url`, `feedback_url` and `bundle_texts`:

- `feedback_inbox_href(ids, *, app_base_url=None)` is for `feedback_received`. It gives
  `/feedback?ids=123&row=123`, and a crash bundle gives `/feedback?ids=7,8,9`.
- `my_feedback_href(ids, *, app_base_url=None)` is for a reply or a comment on the
  person's own report. It gives `/my-feedback?ids=12&row=12`, and a bundle gives
  `/my-feedback?ids=12,14`.
- `public_feedback_href(ids, *, app_base_url=None)` is for a report the person follows.
  One report gives `/all-feedback?row=12`, several give `/all-feedback?sort=updated`.
- `feedback_notice_href(ids, *, mine, app_base_url=None)` picks one of the last two by
  whose report it is. `feedback_answered` and `feedback_comment` use it per recipient.

The constants `FEEDBACK_INBOX_PATH`, `MY_FEEDBACK_PATH`, `PUBLIC_FEEDBACK_PATH` and
`FEEDBACK_LINK_IDS_MAX` (50) are exported too.

The rules:

- `ids` is one int or several. Each id is named once, in the order given.
- Each id must be a positive integer of at most 2**53 - 1. A bool or a digit string raises
  `TypeError`. No ids, or an id out of range, raises `ValueError`.
- `&row=` stands beside a single id. Past 50 ids the link opens the bare list.
- The result is a path by default. With `app_base_url` (an http(s) origin, perhaps with a
  path, but no query and no fragment) it is the absolute link for a mail.

**Why.** Marcel asked on 2026-11-12 that Kurvenschmiede's feedback area work exactly like
keksdose's. The inbox's `?ids=` set (ui-kit 0.59) shows exactly the linked reports instead
of the filters the person left on. Kurvenschmiede and kastlan link `?row=` alone, so that
set never opens from their mails, and a saved status filter still narrows the list under
the open row (keksdose live #500). With the builder, the rule lives in the kit and every
app links the same way. There is no frontend change: all three apps are on ui-kit ^0.60,
and their `/feedback` and `/my-feedback` pages run on the kit's `FeedbackInbox`, which
reads `?ids=`.

**keksdose** (`backend/`). The output is the same for every link it sends today, except
the crash bundle case below.

- `keksdose/domain/services/push_notifications.py:1515-1538`: delete `_NOTICE_IDS_MAX`
  and `feedback_notice_url`. Call `feedback_notice_href(ids, mine=mine)` at `:1581`,
  `:1593` and `:1669`.
- `tests/unit/test_push_notifications.py:1467-1471` compares strings. It passes unchanged
  once it calls `feedback_notice_href`, or if `feedback_notice_url` stays as an alias.
- `keksdose/domain/services/feedback_alerts.py:145-149`: replace `feedback_url` with
  `feedback_inbox_href(feedback_id)` at `:174`, `:228` and `:280`.
- `feedback_alerts.py:184` (`bundle_texts`) becomes
  `feedback_inbox_href([int(item["feedback_id"]) for item in payloads])`. Behaviour change:
  a bundle of more than 50 crashes now opens the bare `/feedback` instead of naming them
  all, and a repeated id is named once.
- Optional: the docstring example `/feedback?row=12` in
  `keksdose/domain/services/notification_mail.py:82` becomes `/feedback?ids=12&row=12`.

**Kurvenschmiede** (`backend/`). This is the real change: its mails start opening the
`?ids=` set as keksdose's do.

- `kurvenschmiede/domain/services/notification_service.py:269-276` (`_feedback_link`)
  becomes
  `feedback_notice_href(report.id, mine=user.id == report.user_id, app_base_url=get_settings().app_base_url)`.
  The author's link changes from `/my-feedback?row=X` to `/my-feedback?ids=X&row=X`. A
  follower's link stays `/all-feedback?row=X`.
- `notification_service.py:384` (`AdminAlerts.filed`):
  `app_link("/feedback", row=…)` becomes
  `feedback_inbox_href(alert.feedback_id, app_base_url=get_settings().app_base_url)`.
- Tests: `tests/api/test_notifications.py:277` and `:326` move to
  `/my-feedback?ids={id}&row={id}`. `:802` moves to `/feedback?ids={id}&row={id}`; its
  substring check `"/feedback?row="` would fail otherwise. `:327` stays.
- The public sort and `?row=` parse in `frontend/src/features/feedback/all-feedback-page.tsx`
  go with ui-kit 0.61's `FeedbackPublicPage`, which keeps `?sort=` and reads `?row=` as digits.

**kastlan** (repo root, package `kastlan/`; no public feedback, so it never uses
`public_feedback_href`).

- `kastlan/domain/services/feedback_mail.py:60` becomes
  `my_feedback_href(report.id, app_base_url=settings.frontend_base_url)`.
- `feedback_mail.py:114` becomes
  `feedback_inbox_href(alert.feedback_id, app_base_url=settings.frontend_base_url)`.
- Tests: `tests/api/test_feedback_alerts.py:50` moves to `/feedback?ids={fb_id}&row={fb_id}`
  and `tests/api/test_feedback_workflow.py:278` to `/my-feedback?ids={fb_id}&row={fb_id}`.
  Both are substring checks that would fail on the old strings.
- Optional: `kastlan/domain/services/activity_service.py:131` links a new report's
  activity entry to the bare `/feedback`. `feedback_inbox_href(fb.id)` would open the
  report itself.
- `kastlan/adapters/api/feedback_router.py:9` (module docstring) could say `?ids=&row=`.

All three bump server-kit to the v0.25.0 wheel URL and run `uv lock --upgrade-package
eifi1-server-kit`. No migration, no frontend change, and no legal wording.
