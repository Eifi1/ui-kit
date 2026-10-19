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
| [i18n](i18n-harmonization.md) | The seven languages, the language registry, detection, formatting locales, translation review (rules H1–H10) | ui-kit 0.18–0.20, server-kit 0.1 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [feedback](feedback-harmonization.md) | The feedback dialog, menu, inbox, the eight statuses and five categories, the thread | ui-kit 0.27, server-kit 0.1; amended in 0.31 (READY) | Current as of ui-kit 0.34.0 / server-kit 0.8.0; §9 settled 2026-10-14 (round 0.38): public feedback, votes, comments, replies as a list; §10 settled 2026-10-16 (round 0.40): rework as a conversation entry + REWORK status, the feedback menu's three links |
| [legal](legal-harmonization.md) | Imprint, Privacy Policy and Terms: the page frame, the skeleton, the shared sentences | ui-kit 0.28 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [auth](auth-harmonization.md) | Sign-in, sign-up, the account core, the session and its refresh | ui-kit 0.29, server-kit 0.3 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§11: session refresh, 0.34) |
| [user-admin](user-admin-harmonization.md) | The user list, admin actions and the audit, invitations, the account's own settings cards | ui-kit 0.30, server-kit 0.4 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§11: groups in the audit, 0.34) |
| [settings](settings-harmonization.md) | One settings page and one admin page: layout, catalogue, search, phone pattern | ui-kit 0.31, server-kit 0.5 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§11: reset this device's settings, settled 2026-10-13, built for ui-kit 0.36.0) |
| [admin](admin-harmonization.md) | The admin area: the way in, one shell and section order, the overview and `GET /admin/attention`, the Tools list | ui-kit 0.42, server-kit 0.14 | Settled 2026-10-17, built for ui-kit 0.42.0 / server-kit 0.14.0; §9 settled 2026-10-19 (round 0.45), for ui-kit 0.45 / server-kit 0.15: the platform console as one "Platform" layout with its Activity, a test mail, the operator's waiting count, kastlan's company details, the feedback counts in server-kit |
| [tours](tours-harmonization.md) | Guided tours: the catalogue and its groups, NEW and updated tours, the progress record, `onComplete` and `completeTour`, progress on the account | ui-kit 0.43 | Settled 2026-10-17, built for ui-kit 0.43.0; §9 settled 2026-10-17 (round 0.44), built for ui-kit 0.44.0; §10 settled 2026-10-19 (round 0.45), for ui-kit 0.45 / server-kit 0.15: tour progress on the account (KS, kastlan; keksdose stays on the device) |
| [landing-demo](landing-demo-harmonization.md) | The public landing page and the demo | ui-kit 0.31, server-kit 0.5 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [text-size](text-size-harmonization.md) | Text size (Normal, Large, Extra large) and More contrast | ui-kit 0.32, server-kit 0.6 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§4 amended for 0.36: a `help` slot beside `hint`) |
| [billing](billing-harmonization.md) | Plans, grants, trials, the Paddle client, the checkout page and the way back | ui-kit 0.32–0.33, server-kit 0.6–0.7 | Current as of ui-kit 0.34.0 / server-kit 0.8.0; off in production until each app's launch; §15 settled 2026-10-14 (round 0.39) |
| [colour-roles](colour-roles-harmonization.md) | The role utilities, a foreground for every fill, the hover rule, the CSS-variable guard | ui-kit 0.33 | Current as of ui-kit 0.34.0 (§13: the More-contrast light well, settled 2026-10-13, built for ui-kit 0.36.0) |
| [notifications](notifications-harmonization.md) | Notification types and switches, quiet hours, the zone, the digest, push devices, one-click unsubscribe | — | Settled 2026-10-13, built for ui-kit 0.36.0 / server-kit 0.9.0; §9 (admin transfer, failed-mail retry) settled 2026-10-14, built for server-kit 0.10.0 / ui-kit 0.37.0 |
| [page-layout](page-layout-harmonization.md) | Which list pages fill the window (DataTable `fillHeight`) and which keep the cap; the shell's wiring as `FillHeight`; the per-app checklist | ui-kit 0.40 | §1 settled 2026-10-16 (round 0.40): the list page fills the window, a 12rem body floor; built for ui-kit 0.40.0 |
| [local-first](local-first-harmonization.md) | Which data and actions work offline: the persisted query cache, the outbox and `POST /sync`, the merge rule, sign-out on a shared PC; kastlan local-first like keksdose, KS online-only | — | §1 DRAFT (round 0.45): keksdose's mechanism as canon, kastlan's scope and phases, `eifi1_server_kit.sync` and `@eifi1/ui-kit/offline` |
| [server-services](server-services-harmonization.md) | server-kit layer 2: the feedback service behind ports, its router factory, the shared erasure; the translation review | — | §1–5 settled 2026-10-13, built for server-kit 0.9.0 (round 0.36); §6 the translation review settled 2026-10-14, built for server-kit 0.10.0 / ui-kit 0.37.0 (round 0.37) |

## Adoption notes (`adopt-0.x.md`)

One per minor release: what is new, what every app must change on the bump, each app's
list, and where the build differs from a contract. Hand an app's section to that repo's
session as it is. Once all three apps have adopted a release, its note moves to
[archive/adopt/](archive/adopt/).

| Note | Release | What it was | Apps |
|---|---|---|---|
| [adopt-0.41](adopt-0.41.md) | ui-kit 0.41 | Round 0.41: the three names deprecated in 0.40 removed (`Tabs` `wrap`, `FeedbackMenuLabels.viewFeedback` / `.allFeedback`); bump only | being built |
| [adopt-0.40](adopt-0.40.md) | ui-kit 0.40, server-kit 0.13 | Round 0.40: feedback §10 (rework as an entry, the menu), page layout §1 (the list page fills), phone tables and pickers, the Paddle sandbox results, `switching` | being built |
| [adopt-0.39](adopt-0.39.md) | ui-kit 0.39, server-kit 0.12 | Round 0.39: pay pages that serve any app, the shared plan switch and Paddle customer (billing §15); `ApiTranslationReviewsResponse`; `can_review_kit` as T2 | being built |
| [adopt-0.38](adopt-0.38.md) | ui-kit 0.38, server-kit 0.11 | Round 0.38: public feedback — votes, comments by others, replies as a timeline, the public pages; `outcome` frozen | all three adopted (kastlan shipped) |
| [adopt-0.37](adopt-0.37.md) | ui-kit 0.37, server-kit 0.10 | Round 0.37: the translation review as server-kit layer 2, notifications §9 (an admin's hand-over, a failed send); the apps' 0.36 findings | all three adopted locally |
| [adopt-0.36](adopt-0.36.md) | ui-kit 0.36, server-kit 0.9 | Round 0.36: notifications, server-kit layer 2 (the feedback service), reset this device's settings, the More-contrast light well, a field's `help`; KS's Select hints | all three adopted locally |
| [adopt-0.35](adopt-0.35.md) | ui-kit 0.35 (server-kit stays 0.8) | The 0.34 deprecations removed; the apps' 0.34 findings (the planned 0.34.1); the refactor plan's open ends; `@eifi1/ui-kit/eslint` | all three adopted locally |
| [adopt-0.34](adopt-0.34.md) | ui-kit 0.34, server-kit 0.8 | Round 0.34: the apps' 0.33 reports, keksdose's run 77, Kurvenschmiede's asks; session refresh, groups in the audit; the refactor waves | all three adopted locally |
| [adopt-0.33](adopt-0.33.md) | ui-kit 0.33, server-kit 0.7 | Colour roles, billing §14 (Paddle client, checkout page), text size §10.16–§10.22 | all three on `^0.33.1` |
| [adopt-0.32](adopt-0.32.md) | ui-kit 0.32, server-kit 0.6 | Text size and contrast; billing | all apps adopted |
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
