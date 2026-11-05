# Adopting `@eifi1/ui-kit` 0.56

ui-kit 0.56 moves the kit's toolchain to Node 26 and TypeScript 6.0, from the three apps'
trials of 2026-11-05, and carries what was ready as 0.55.1: the apps' notes from adopting
0.55. Each app moves its own toolchain when it is ready. Until then a kit built with
TypeScript 6 still type-checks in an app on 5.9 (`check:consumer-types` holds every entry
point's declarations to 5.9.3), and the kit runs the same on Node 24.

**From 0.55, nothing else first.** An app on 0.52–0.54 takes 0.55's notes first.

**Legal wording:** none.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the three apps. `SubscriptionStandingOverview`'s three dates are
optional now: code that READS them from a value of that type sees `| undefined` beside `null`;
the apps only pass one to `SubscriptionStanding` / `subscriptionStanding`.

- **A refused or pending Button / IconButton keeps its press out of a clickable row around
  it**, as a natively disabled button's click never reached one. `stopPropagation` is no
  longer needed for that (Kurvenschmiede's owner-only delete opened its row without it).
- adopt-0.55's `watchSessionElsewhere` lines: `ended` compares whose session the storage
  holds with this tab's (above). keksdose keys on its mirror owner, KS on its persisted user
  id, and kastlan on the server session's `sid` (stricter: the same person signing in again
  elsewhere also reloads a restored page, which kastlan wants), each with a test for a restored
  page after a sign-in elsewhere.
- **`SubscriptionStandingOverview`'s three dates are optional** (`trial_ends_at`,
  `comped_until`, `current_period_end`; left out reads as `null`): an app whose generated
  overview has them optional passes the overview as it is (keksdose's subscription-cards.tsx
  stops naming them).
- **`LegendedSeriesChart` `legendAlign: "center" | "start"`** (centre by default, as before):
  keksdose's cash-buffer key passes `legendAlign="start"` to stay under the plot's edge.
- **For the apps' own guards:** `FeedbackInbox` owns the phone's swipe actions and the desktop
  actions column, so a test that reads the page's source for them (keksdose's parity test)
  looks for the component instead.
- **server-kit 0.21, said louder** (keksdose's adoption):
  - `database_is_local` reads every port in `ports` as local, so a tunnel to a LIVE database
    must not listen on one of them (keksdose moved its feedback tunnel from 5433 to 5439 when it
    passed `ports={5432, 5433}`);
  - an app that refuses to start on `secret_problems` stops its DEPLOY at boot when a deployed
    secret is under 32 characters: check the deployed secrets' length before the bump goes out
    (keksdose's are 64);
  - the dependency audit runs `uv audit`, a preview in uv 0.12; CI installs the latest uv, and a
    change to the preview fails the step with exit 2, never silently.

## The toolchain: Node 26 and TypeScript 6.0 (each app's own round)

Not required to take 0.56. The steps are what each app's trial needed; take them in this
order, each green before the next.

1. **vitest 5.1** (`vitest` and `@vitest/coverage-v8` 5.1.0), on Node 24 first: its engines
   allow `^22.12 || ^24 || >=26`. Required before Node 26: Node 26 ships its own
   `localStorage` global, undefined without `--localstorage-file`, which shadows jsdom's on
   vitest 4, so every `localStorage` call in a test throws (Kurvenschmiede 365 of 1305 failed,
   keksdose's auth-store 23 of 23). `NODE_OPTIONS=--no-experimental-webstorage` is the
   stop-gap.
   - keksdose and KS: from `^4.1.12`; no test or config change in either (6211 and 1305
     green). keksdose: blob reports move from `frontend/.vitest-reports/` to
     `frontend/.vitest/blob/`, so ci.yml's upload and `--mergeReports` paths change, and
     `.prettierignore` takes `.vitest/`.
   - kastlan: already on 5.
2. **Node 26.13.0**: `.nvmrc`, the web Dockerfiles' build stage (`node:24-slim` →
   `node:26-slim`, which installs `libatomic1` itself), CI's setup-node (it reads `.nvmrc`),
   and `@types/node` `^26`. No EBADENGINE and no native rebuild in any app. On this machine,
   Node 26's binary needs `libatomic.so.1`: `sudo apt install libatomic1` once. kastlan: its
   release workflow takes its Node from Eifi1/shared-workflows, which moves too.
3. **TypeScript 6.0.3**:
   - `overrides: { "typescript": "6.0.3" }` in the root package.json. react-i18next 15.x
     (all three) and openapi-typescript 7.x (keksdose) declare an optional peer `^5`, so npm
     keeps a 5.9.3 and typescript-eslint dedupes onto it: a plain bump lints with 5.9 and
     says nothing. Check that `npm ls typescript --all` shows only 6.0.3. (react-i18next ≥ 17
     with i18next ≥ 25.10.10 clears it too: a major pair.)
   - `baseUrl` goes from the tsconfigs (TS5101; gone in 7); the `paths` stay, written
     relative (`"@/*": ["./src/*"]`).
   - kastlan: src/shared/utils/uuid.test.ts:17's stub takes `Uint8Array<ArrayBuffer>`.
   - A side-effect import of a stylesheet needs a declaration now (`noUncheckedSideEffectImports`
     is on by default): Vite's `vite/client` reference covers it in an app.

TypeScript 7 waits for typescript-eslint (supports `<6.1` today) and the declaration build.
