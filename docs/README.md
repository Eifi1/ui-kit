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
| [feedback](feedback-harmonization.md) | The feedback dialog, menu, inbox, the eight statuses and five categories, the thread | ui-kit 0.27, server-kit 0.1; amended in 0.31 (READY) | Current as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [legal](legal-harmonization.md) | Imprint, Privacy Policy and Terms: the page frame, the skeleton, the shared sentences | ui-kit 0.28 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [auth](auth-harmonization.md) | Sign-in, sign-up, the account core, the session and its refresh | ui-kit 0.29, server-kit 0.3 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§11: session refresh, 0.34) |
| [user-admin](user-admin-harmonization.md) | The user list, admin actions and the audit, invitations, the account's own settings cards | ui-kit 0.30, server-kit 0.4 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§11: groups in the audit, 0.34) |
| [settings](settings-harmonization.md) | One settings page and one admin page: layout, catalogue, search, phone pattern | ui-kit 0.31, server-kit 0.5 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§11: reset this device's settings, settled 2026-10-13, building in ui-kit 0.36) |
| [landing-demo](landing-demo-harmonization.md) | The public landing page and the demo | ui-kit 0.31, server-kit 0.5 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 |
| [text-size](text-size-harmonization.md) | Text size (Normal, Large, Extra large) and More contrast | ui-kit 0.32, server-kit 0.6 | Current as of ui-kit 0.34.0 / server-kit 0.8.0 (§4 amended for 0.36: a `help` slot beside `hint`) |
| [billing](billing-harmonization.md) | Plans, grants, trials, the Paddle client, the checkout page and the way back | ui-kit 0.32–0.33, server-kit 0.6–0.7 | Current as of ui-kit 0.34.0 / server-kit 0.8.0; off in production until each app's launch |
| [colour-roles](colour-roles-harmonization.md) | The role utilities, a foreground for every fill, the hover rule, the CSS-variable guard | ui-kit 0.33 | Current as of ui-kit 0.34.0 (§13: the More-contrast light well, settled 2026-10-13, building in ui-kit 0.36) |
| [notifications](notifications-harmonization.md) | Notification types and switches, quiet hours, the zone, the digest, push devices, one-click unsubscribe | — | Settled 2026-10-13, building in ui-kit 0.36 / server-kit 0.9 |
| [server-services](server-services-harmonization.md) | server-kit layer 2: the feedback service behind ports, its router factory, the shared erasure | — | Settled 2026-10-13, building in server-kit 0.9 (round 0.36) |

## Adoption notes (`adopt-0.x.md`)

One per minor release: what is new, what every app must change on the bump, each app's
list, and where the build differs from a contract. Hand an app's section to that repo's
session as it is. Once all three apps have adopted a release, its note moves to
[archive/adopt/](archive/adopt/).

| Note | Release | What it was | Apps |
|---|---|---|---|
| [adopt-0.35](adopt-0.35.md) | ui-kit 0.35 (server-kit stays 0.8) | The 0.34 deprecations removed; the apps' 0.34 findings (the planned 0.34.1); the refactor plan's open ends; `@eifi1/ui-kit/eslint` | being built |
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
