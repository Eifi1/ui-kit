# docs/

The repository's working documents: the contracts the three apps build to, each release's
adoption notes, and the audits and plans behind the kit's refactors. The consumer-facing
reference is the [README](../README.md) at the root (it is the one that ships to npm);
contributing is [CONTRIBUTING.md](../CONTRIBUTING.md).

**kk** = keksdose, **ka** = kastlan, **KS** = Kurvenschmiede (called lenkbank until
2026-10-01; older documents keep that name).

## Contracts (`*-harmonization.md`)

One per round that made the three apps look and behave the same: **one contract + kit
parts (+ server-kit parts)**, reviewed by all three apps before it is built. The body is
what apps implement from, so it follows the build: a round's last commit folds its
adoption note's deviations into the sections they amend (CONTRIBUTING → Documentation).
The code cites the contracts by §, so a § is never renumbered. Each contract opens with a
**Status** table (§ → shipped in → amended by); snapshots, per-app to-dos and review logs
are in [archive/](archive/) as `<topic>-history.md`.

| Contract | What it covers | Shipped in | Status |
|---|---|---|---|
| [i18n](i18n-harmonization.md) | The seven languages, the language registry, detection, formatting locales, translation review (rules H1–H10) | ui-kit 0.18–0.20, server-kit 0.1 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; H1 amended by server-services §6 (round 0.37) |
| [feedback](feedback-harmonization.md) | The feedback dialog, menu, inbox, the eight statuses and five categories, the thread | ui-kit 0.27, server-kit 0.1; amended in 0.31 (READY) | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; §9 public feedback, votes, comments (round 0.38); §10 rework as an entry, the feedback menu (round 0.40); §11 the `feedback_received` admin alert (round 0.46); §12 files on replies and comments (round 0.47); §4.5 the Undo from the mutation's promise (ui-kit 0.52) |
| [legal](legal-harmonization.md) | Imprint, Privacy Policy and Terms: the page frame, the skeleton, the shared sentences | ui-kit 0.28 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; decisions 10 (0.51.3: the as-of line, the stored version) and 11 (0.51.4: the summary, the footer's optional pages) |
| [auth](auth-harmonization.md) | Sign-in, sign-up, the account core, the session and its refresh | ui-kit 0.29, server-kit 0.3 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; §11 session refresh (0.34) |
| [user-admin](user-admin-harmonization.md) | The user list, admin actions and the audit, invitations, the account's own settings cards | ui-kit 0.30, server-kit 0.4 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; §11 groups in the audit (0.34) |
| [settings](settings-harmonization.md) | One settings page and one admin page: layout, catalogue, search, phone pattern | ui-kit 0.31, server-kit 0.5 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; §11 reset this device's settings (round 0.36); §12 superseded by admin (round 0.43) |
| [landing-demo](landing-demo-harmonization.md) | The public landing page and the demo | ui-kit 0.31, server-kit 0.5 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [text-size](text-size-harmonization.md) | Text size (Normal, Large, Extra large) and More contrast | ui-kit 0.32, server-kit 0.6 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; §4 a `help` slot beside `hint` (0.36) |
| [billing](billing-harmonization.md) | Plans, grants, trials, the Paddle client, the checkout page and the way back, the buyer-only portal and the in-app cancel | ui-kit 0.32–0.33, server-kit 0.6–0.7 | Folded (0.35); body as of ui-kit 0.34.0 / server-kit 0.8.0; §15 pay pages for any app, the plan switch (round 0.39); §16 the buyer-only portal, the in-app cancel, the permanent-grant warning (round 0.42; its reviews folded in 0.52); §17 the portal in a new tab (round 0.43); off in production until each app's launch |
| [colour-roles](colour-roles-harmonization.md) | The role utilities, a foreground for every fill, the hover rule, the CSS-variable guard, the chart colours | ui-kit 0.33 | Folded (0.35); body as of ui-kit 0.34.0; §13 the More-contrast light well (round 0.36); §5.9 the chart hues, inks and `edges="auto"` (0.49, 0.51.6, 0.52) |
| [notifications](notifications-harmonization.md) | Notification types and switches, quiet hours, the zone, the digest, push devices, one-click unsubscribe, the inbox and bell | ui-kit 0.36, server-kit 0.9 | Settled 2026-10-13; §9 an admin's hand-over, a failed send's retry (round 0.37); §10 the inbox and bell, a switch per channel and device, the zone on the account (automatic only, 2026-10-20), an opt-in queue (round 0.46); §4.2 folded to 0.47's quiet hours, §10.6 an explicit sign-out releases this device's push (0.52) |
| [server-services](server-services-harmonization.md) | server-kit layer 2: the feedback service behind ports, its router factory, the shared erasure; the translation review | server-kit 0.9 | §1–5 settled 2026-10-13 (round 0.36); §6 the translation review (round 0.37); §4.5 public feedback's stores (round 0.38) |
| [page-layout](page-layout-harmonization.md) | Which list pages fill the window (DataTable `fillHeight`) and which keep the cap; the shell's wiring as `FillHeight`; the per-app checklist | ui-kit 0.40 | §1 settled 2026-10-16 (round 0.40) |
| [admin](admin-harmonization.md) | The admin area: the way in, one shell and section order, the overview and `GET /admin/attention`, the Tools list; the platform console, the test mail, the feedback counts | ui-kit 0.42, server-kit 0.14 | Settled 2026-10-17; its reviews (§6, §7) folded in 0.52; §9 the platform console, the test mail, the operator's waiting count, kastlan's company details, the feedback counts in server-kit (round 0.45) |
| [top-bar](top-bar-harmonization.md) | One order of the top bar's items, the language in the account menu, keksdose's tour trigger, the sync indicator, the dev menu | ui-kit 0.42, server-kit 0.14 | Settled 2026-10-17; its reviews (§6) folded in 0.52; §2.7.1 one `DevMenu` with the app's sections (0.51), a column per group (0.51.4); `DevSwitchers` removed (0.52) |
| [tours](tours-harmonization.md) | Guided tours: the catalogue and its groups, NEW and updated tours, the progress record, `onComplete` and `completeTour`, progress on the account, guided form tours | ui-kit 0.43 | Settled 2026-10-17; its reviews (§6, §9.6) folded in 0.52; §9 completion in one place (round 0.44); §10 progress on the account, KS and kastlan (round 0.45, server-kit 0.15); §11 guided form tours (round 0.50) |
| [local-first](local-first-harmonization.md) | Which data and actions work offline: the persisted query cache, the outbox and `POST /sync`, the merge rule, sign-out on a shared PC; the sync engine (`@eifi1/ui-kit/sync`); kastlan local-first like keksdose, KS online-only | ui-kit 0.45–0.46, server-kit 0.15–0.16 | §1 settled 2026-10-19 (round 0.45): the offline cache (`@eifi1/ui-kit/offline`), the sync protocol; §2 settled 2026-10-19 (round 0.46): the sync engine (kastlan only); D15 one engine per database across tabs (0.52) |

A test, `src/__tests__/contracts.test.ts`, holds the two rules this table rests on: every
contract opens with a Status table and none lets a later section "win over" its body, and
this page lists every contract and every adopt note.

## Adoption notes (`adopt-0.x.md`)

One per minor release: what is new, what every app must change on the bump, each app's
list, and where the build differs from a contract. Hand an app's section to that repo's
session as it is. Once all three apps have adopted a release, its note moves to
[archive/adopt/](archive/adopt/).

| Note | Release | What it was | Apps |
|---|---|---|---|
| [adopt-0.52](adopt-0.52.md) | ui-kit 0.52 | Round 0.52: the refactor audit of 2026-10-30, Waves 1–7 (focus, semantics and contrast, flows, consolidation, API deprecations, tests, docs); `DevSwitchers` removed | being built |
| [adopt-0.51](adopt-0.51.md) | ui-kit 0.51.0–0.51.7, server-kit 0.20 | The 0.49 deprecations removed; one `DevMenu` with the app's sections, the dev clock; `PublicPage`; legal decisions 10 and 11 (0.51.3–0.51.4); multi-word search (0.51.5); Treemap `edges` (0.51.6); Wave 0 of the 2026-10-30 refactor audit (0.51.7) | all three on `^0.51.6` |
| [adopt-0.50](archive/adopt/adopt-0.50.md) | ui-kit 0.50 (server-kit stays 0.19) | Guided form tours (tours §11); `@eifi1/ui-kit/testing/react`; `formatWithMinus`; kastlan K1–K4 | all three adopted |
| [adopt-0.49](archive/adopt/adopt-0.49.md) | ui-kit 0.49, server-kit 0.19 | The design-review round KIT-1 … KIT-15: one minus sign, the Imprint chart palette, Button `default`/`accent`, the phone bar, status tones, page titles | all three adopted |
| [adopt-0.48](archive/adopt/adopt-0.48.md) | ui-kit 0.48, server-kit 0.19 | `TabsLabels.backToFirst` removed; DataTable fits its width (`grow`, `fitPriority`), `serverRows`, `virtualize`; keksdose's UX waves A and B | all three adopted |
| [adopt-0.47](archive/adopt/adopt-0.47.md) | ui-kit 0.47, server-kit 0.18 | The 0.46 zone names removed (notifications §10.3, automatic only); files on admin replies and public comments (feedback §12); a hand-built table's actions column | all three adopted |
| [adopt-0.46](archive/adopt/adopt-0.46.md) | ui-kit 0.46, server-kit 0.16 | Notifications §10 (the inbox and bell, a switch per channel and device, the zone on the account), feedback §11, the sync engine (local-first §2), desktop actions from the phone's swipes, the date format as a kit setting | all three adopted |
| [adopt-0.45](archive/adopt/adopt-0.45.md) | ui-kit 0.45, server-kit 0.15 | Tour progress on the account (tours §10), admin §9, `@eifi1/ui-kit/offline` and the sync protocol (local-first §1); `count_by_status()` (breaking in server-kit) | all three adopted |
| [adopt-0.44](archive/adopt/adopt-0.44.md) | ui-kit 0.44 | Tours §9: completion in one place (`onComplete`), `completeTour` | all three adopted |
| [adopt-0.43](archive/adopt/adopt-0.43.md) | ui-kit 0.43 | Billing §17 (the portal in a new tab), the tour catalogue (tours §2–§7), fixes from the 0.42 adoptions | all three adopted |
| [adopt-0.42](archive/adopt/adopt-0.42.md) | ui-kit 0.42, server-kit 0.14 | Billing §16, the admin area, the top bar: three contracts adopted together | all three adopted |
| [adopt-0.41](archive/adopt/adopt-0.41.md) | ui-kit 0.41 | Round 0.41: the three names deprecated in 0.40 removed (`Tabs` `wrap`, `FeedbackMenuLabels.viewFeedback` / `.allFeedback`); bump only | all three adopted |
| [adopt-0.40](archive/adopt/adopt-0.40.md) | ui-kit 0.40, server-kit 0.13 | Round 0.40: feedback §10 (rework as an entry, the menu), page layout §1 (the list page fills), phone tables and pickers, the Paddle sandbox results, `switching` | all three adopted |
| [adopt-0.39](archive/adopt/adopt-0.39.md) | ui-kit 0.39, server-kit 0.12 | Round 0.39: pay pages that serve any app, the shared plan switch and Paddle customer (billing §15); `ApiTranslationReviewsResponse`; `can_review_kit` as T2 | all three adopted |
| [adopt-0.38](archive/adopt/adopt-0.38.md) | ui-kit 0.38, server-kit 0.11 | Round 0.38: public feedback — votes, comments by others, replies as a timeline, the public pages; `outcome` frozen | all three adopted (kastlan shipped) |
| [adopt-0.37](archive/adopt/adopt-0.37.md) | ui-kit 0.37, server-kit 0.10 | Round 0.37: the translation review as server-kit layer 2, notifications §9 (an admin's hand-over, a failed send); the apps' 0.36 findings | all three adopted locally |
| [adopt-0.36](archive/adopt/adopt-0.36.md) | ui-kit 0.36, server-kit 0.9 | Round 0.36: notifications, server-kit layer 2 (the feedback service), reset this device's settings, the More-contrast light well, a field's `help`; KS's Select hints | all three adopted locally |
| [adopt-0.35](archive/adopt/adopt-0.35.md) | ui-kit 0.35 (server-kit stays 0.8) | The 0.34 deprecations removed; the apps' 0.34 findings (the planned 0.34.1); the refactor plan's open ends; `@eifi1/ui-kit/eslint` | all three adopted locally |
| [adopt-0.34](archive/adopt/adopt-0.34.md) | ui-kit 0.34, server-kit 0.8 | Round 0.34: the apps' 0.33 reports, keksdose's run 77, Kurvenschmiede's asks; session refresh, groups in the audit; the refactor waves | all three adopted locally |
| [adopt-0.33](archive/adopt/adopt-0.33.md) | ui-kit 0.33, server-kit 0.7 | Colour roles, billing §14 (Paddle client, checkout page), text size §10.16–§10.22 | all three on `^0.33.1` |
| [adopt-0.32](archive/adopt/adopt-0.32.md) | ui-kit 0.32, server-kit 0.6 | Text size and contrast; billing | all apps adopted |
| [adopt-0.31](archive/adopt/adopt-0.31.md) | ui-kit 0.31, server-kit 0.5 | The settings page, the landing page and the demo; the server-kit pages in the showcase | all apps adopted |
| [adopt-0.30](archive/adopt/adopt-0.30.md) | ui-kit 0.30, server-kit 0.4 | User administration and the account's own settings | all apps adopted |
| [adopt-0.29](archive/adopt/adopt-0.29.md) | ui-kit 0.29, server-kit 0.3 | Sign-in, sign-up and the account | all apps adopted |
| [adopt-0.28](archive/adopt/adopt-0.28.md) | ui-kit 0.28 | The legal pages | all apps adopted |
| [adopt-0.27](archive/adopt/adopt-0.27.md) | ui-kit 0.27 | Feedback | all apps adopted |
| [adopt-0.26](archive/adopt/adopt-0.26.md) | ui-kit 0.26 | Bindable translation-review swipes; dark-mode swipe panels | all apps adopted |
| [adopt-0.25](archive/adopt/adopt-0.25.md) | ui-kit 0.25 | keksdose's feedback run 72 and the apps' 0.24 polish list | all apps adopted |
| [adopt-0.24](archive/adopt/adopt-0.24.md) | ui-kit 0.24 | The second adoption round: what the apps found moving to 0.23 | all apps adopted |
| [adopt-0.23](archive/adopt/adopt-0.23.md) | ui-kit 0.23 | The adoption round: what the apps found moving to 0.22 | all apps adopted |
| [adopt-0.22](archive/adopt/adopt-0.22.md) | ui-kit 0.22 | The inputs round (kastlan 1–8, keksdose K1–K20 and its tours audit) | all apps adopted |
| [adopt-0.21](archive/adopt/adopt-0.21.md) | ui-kit 0.21 | One addition from keksdose's feedback run 71 | all apps adopted |
| [adopt-0.20](archive/adopt/adopt-0.20.md) | ui-kit 0.20 | The apps' 0.19 adoption: kastlan's helpers, `formatLocaleOf` | all apps adopted |
| [adopt-0.19](archive/adopt/adopt-0.19.md) | ui-kit 0.19 | The language harmonisation's first round; the fixes queued as 0.18.1 | all apps adopted |
| [adopt-0.18](archive/adopt/adopt-0.18.md) | ui-kit 0.18 | Kurvenschmiede's user-management and sharing round; one German catalogue | all apps adopted |
| [adopt-0.17](archive/adopt/adopt-0.17.md) | ui-kit 0.17 | kastlan 54–58, keksdose Q1–Q9 | all apps adopted |
| [adopt-0.16](archive/adopt/adopt-0.16.md) | ui-kit 0.16 | keksdose's whole-frontend sweep (P1–P9) | all apps adopted |
| [adopt-0.15](archive/adopt/adopt-0.15.md) | ui-kit 0.15 | The visual audit of every showcase page at 390 and 1280 px | all apps adopted |
| [adopt-0.14](archive/adopt/adopt-0.14.md) | ui-kit 0.14 | keksdose G3b–G8 | all apps adopted |
| [adopt-0.13](archive/adopt/adopt-0.13.md) | ui-kit 0.13 | keksdose F0–F9, kastlan 40–50, lenkbank P7–P9 | all apps adopted |
| [adopt-0.12](archive/adopt/adopt-0.12.md) | ui-kit 0.12 | kastlan's final audit, keksdose's notes on 0.11 | all apps adopted |
| [adopt-0.11](archive/adopt/adopt-0.11.md) | ui-kit 0.11 | The rest of the apps' 0.9 audits (items 19–25) | all apps adopted |
| [adopt-0.10](archive/adopt/adopt-0.10.md) | ui-kit 0.10 | The apps' 0.9 audits; the showcase's ⌘K search | all apps adopted |
| [adopt-0.9](archive/adopt/adopt-0.9.md) | ui-kit 0.9 | keksdose's gaps while adopting 0.8 | all apps adopted |
| [adopt-0.8](archive/adopt/adopt-0.8.md) | ui-kit 0.8 | The apps' proposals after 0.7 | all apps adopted |
| [adopt-0.7](archive/adopt/adopt-0.7.md) | ui-kit 0.7 | Right-to-left across the kit, the shipped catalogues, MeasuredGrid | all apps adopted |
| [adopt-0.6](archive/adopt/adopt-0.6.md) | ui-kit 0.6 | The replacements the apps proposed after 0.5 | all apps adopted |
| [adopt-0.5](archive/adopt/adopt-0.5.md) | ui-kit 0.5 | What each app replaced with kit components on `^0.5.0` | all apps adopted |

Before 0.5 the apps moved off the old `@hb/ui` submodule onto the npm package:
[archive/MIGRATING.md](archive/MIGRATING.md).

## Audits and plans

Dated, and kept as written; each opens with its own status.

| Document | What it is |
|---|---|
| [refactor-plan-2026-10.md](refactor-plan-2026-10.md) | The 2026-10 refactor plan: Wave 0 and Waves 1–5, all going into 0.34 |
| [refactor-audit-2026-10/](refactor-audit-2026-10/) | Its evidence, one file per area: bugs (`BUG`), duplication (`DUP`), modules (`MOD`), API (`API`), tests (`TST`), docs and styling (`DOC`) |
| [module-audit-2026-09-22.md](module-audit-2026-09-22.md) | The module audit of 2026-09-22: 104 findings, triaged |
| [refactor-plan-2026-08-24.md](refactor-plan-2026-08-24.md) | The first audit the package had (as `@hb/ui`): 14 findings, all executed |
