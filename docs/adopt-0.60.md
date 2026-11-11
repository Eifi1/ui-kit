# Adopting `@eifi1/ui-kit` 0.60

> **Draft.** Round 0.60 is open: the sections below are written as their items land, and the
> lead, the "Must change" list and the **Legal wording** line are settled when the round is.

ui-kit 0.60 ships with **server-kit 0.24**. So far:

- the feedback dialog's page address keeps only the query params the app allows (keksdose's
  legal audit of 2026-11-11, G-10);
- server-kit: an erased crash report's body loses the person's diagnostics (same audit, C-7).

**From 0.59, nothing else first.**

**Legal wording:** none so far. Neither change touches a kit legal text. Each app's own policy
may describe the two channels: keksdose's §11 (erasure) and its feedback paragraph (the page
address) now match the code without its interim sentence.

## The feedback dialog names the page without what the person typed (G-10)

`useFeedbackSubmit` read `location.href` whole for the context box and sent it as
`context.url`. A query string carries what the person typed: keksdose's register keeps the
search in `?q=` and the column filters, which hold payee names, in `f.<col>`. A report filed by
hand put that text in a column every admin reads. In private mode too. The crash reporter has
reduced its page to an allow-list since 0.27. The dialog now does the same, through the same
function.

- **New option `allowParams`:** the query params the address may keep. The box shows, and
  `context.url` sends, `origin` + the pathname + those params. Every other param and the hash
  stay on the device. `context.route` is unchanged (the pathname).
- **⚠ Without it, no query at all:** the address stops at the pathname. An app that wants its
  paging or tab in a hand-filed report passes them.
- **Adopt:** pass the list the app already gives `createCrashReporter`, so both channels name a
  page alike. Share one constant:

  | App | `allowParams` today (crash reporter) | Where |
  |---|---|---|
  | keksdose | `CRASH_URL_PARAMS` (p, ps, sort, tab, g, granularity, month, preset, from, to, tstate, future, archived, uncleared) | `frontend/src/shared/lib/crash-report.ts` |
  | kastlan | p, ps, sort, tab, locale | `frontend/src/shared/feedback/crash-reporter.ts` |
  | Kurvenschmiede | tab, compare, open, ns, wheels, locale | `frontend/src/shared/lib/crash-reporter.ts` |

  ```ts
  useFeedbackSubmit({ upload, create, user, environment, version, allowParams: CRASH_URL_PARAMS });
  ```

- **Tests:** an app test that expects `context.url` to equal `window.location.href` now gets the
  reduced address. keksdose: drop the policy's interim sentence ("die vollständige Adresse der
  Seite samt Such- und Filterangaben") with the bump.

## server-kit 0.24

- **An erased crash report keeps only what describes the software (C-7).** `crash_body` writes
  the diagnostics into the body as text, and `anonymise_feedback` replaced only the person's
  name and email there: the account number (`User: … (#id)`), the browser string and the
  fingerprint stayed, although the context loses all three. Now, inside the
  `-- Diagnostics --` block, the `User:`, `User agent:` and `Fingerprint:` lines go and `URL:`
  keeps its path. Removing the whole `User:` line also takes the address of the day the crash
  was filed, which the erasure's identifiers (today's address only) did not find after an
  address change.
- **Adopt:** nothing to change; `anonymise_feedback` applies it. The new public
  `scrub_crash_diagnostics(body)` serves a one-off over rows erased before 0.24 (crash
  reports whose `user_id` is already NULL), should an app need one; a second pass changes
  nothing.
