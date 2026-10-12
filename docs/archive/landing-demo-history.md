# The public landing page and the demo — history

What [the landing and demo contract](../landing-demo-harmonization.md) moved out of its
body in ui-kit 0.34 (refactor audit DOC-1): its snapshot of the three apps, the 0.31
round's per-repo to-dos and order, and the reviews' list. Kept as written: "today", line
numbers and each app's state are as of the day each part was written, and an item may
since have been folded into the contract, which wins. Section numbers are the contract's.

## Status as written

Status: **2026-10-07, reviewed.** All three apps answered the same day; §10 records
what they settled, and the sections above already follow it. Led from ui-kit at Marcel's request. It ships in
ui-kit **0.31** and server-kit **0.5**, together with the settings round
(`docs/settings-harmonization.md`).

## 1. Where each one stands

| | keksdose | kastlan | Kurvenschmiede |
|---|---|---|---|
| `/` signed out | the landing (`RootEntry`) | `/login` | the public dashboard in the app shell |
| `/` signed in | resumes the last page, else the landing | `/dashboard` | the same dashboard |
| Landing | hero, three job rows with mock visuals, trust strip, CTA band, footer; hard-coded teal | none | none |
| SEO | `usePageSeo` (canonical, title, description, JSON-LD), a length test for de and en | none | none; a stale index.html description |
| robots / sitemap | Disallow `/demo`; sitemap `/` | branch `fix/robots-txt`, no sitemap | commit 853e22b (not merged), sitemap `/`, `/control`, `/steering` |
| Demo | `/demo` → throwaway user, viewer share on a system budget (editor while an admin has the demo open), 60-min token, no refresh, nightly reap; a disabled demo answers 403 | backend done locally: ADMIN of a shared demo company, read-only in two layers, reap on create | none |
| Demo → account | none; `RedirectIfAuthed` sends a demo back into the app | none | — |
| Demo end | the first 401 after 60 min lands on `/login`, unexplained | — | — |
| Registration | invitation-only with the sign-in round (its step 5, in progress; `main` still has the allow-list) | invitation-only | invitation-only |

The kit has `LegalFooter`, `useNoIndex`, `ThemeToggle` / `LanguageMenu`, `TopBar` /
`TopBarBrand`, `AuthLayout`, `WriteLockProvider`, `AlertBanner`, `ServerWakeNotice` and
the crash reporter's `suppress`. It has **no** landing sections, `usePageSeo`, SEO test
helper, `RootEntry`, demo parts or demo labels. server-kit has the nullable
`refresh_token`, `access_claims(lifetime=)` and the limiter, and **no** demo module.

## 8. Per repo

- **keksdose:**
  - the landing onto the kit parts (header, hero, rows, trust, CTA band, footer), with
    kit tokens for its about ten hard-coded teal sites;
  - "Get started → /register" becomes "Request access": the header, the hero, the CTA
    band, the demo start's fallback and the sign-in page's register link;
  - `usePageSeo` and the SEO test from the kit, for all shipped languages;
  - `DemoStart`, `DemoBanner` (with `PreviewBanner` skipping a demo), `DemoEnded`, the
    401 → `/demo/ended` rule (today a hard navigation to `/login`), and
    `RedirectIfAuthed` and the header treating a demo as a demo;
  - Plausible: `plausible_ignore` for a demo, plus "Demo started" from the backend;
  - backend:
    - the token to the account's end, with `expires_at` and `demo_expires_at`,
      **shipped together with the missing refusals of §6.4** (passkeys, API tokens, 2FA,
      E2EE, push, email and password change), now coded `demo_refused`;
    - the switch: ON in its own settings subclass; 404 when off;
    - the gate: readiness by any demo stamp, the cap counting live users, `client_ip`
      from the right;
    - the reap on start (20 oldest, a savepoint per user), its row list taken from the
      erasure's foreign-key plan;
    - the seeder off every request path: `demo_cleanup` reaps then converges (creating
      the budget when missing), Cloud Build runs it once after each deploy, both entry
      paths only grant the share, and the dev setup and test fixtures seed first;
    - demo users pinned to viewer (`enter_preview`, and the admin's editable switch
      skipping them);
    - layer 1 of §6.3 with its assistant allow-list (RLS is its database layer);
  - "demo mode" (blur) renamed "Presentation mode".
- **kastlan:**
  - a landing at `/` (signed out); `/` for a session resumes; `/welcome`;
  - robots and sitemap: `/` indexed, `Disallow: /demo$` and `/demo?` (the held
    `fix/robots-txt` branch, updated);
  - the client: a null refresh token, `kastlan.demoSession`, the refresh path skipping a
    demo;
  - `/demo`, the banner, the end, the 401 rule, and the crash reporter's `suppress`;
  - backend:
    - the token to the account's end, `expires_at`, the codes;
    - `DemoGate` and `demo_write_allowed` from server-kit in place of the local order;
    - `name_incomplete(…, is_demo=…)`, and "Demo" with an empty last name;
    - `refuse_demo` on the GET routes of §6.4 (the account export);
    - 20 PDFs an hour per demo user;
    - the reap with a savepoint per user;
  - the demo backend ships with the landing in 0.31 (Marcel).
- **Kurvenschmiede:**
  - the landing at `/`, the dashboard to `/dashboard` (the sidebar's Home follows),
    the brand link to `/welcome` when signed in, the resume;
  - the public tools linked from their feature rows ("Open — no account needed"), not
    the header;
  - `usePageSeo`, the SEO test, and a new index.html description;
  - robots (853e22b merged, plus `Disallow: /demo$` and `/demo?`) and the sitemap;
  - the demo, model S:
    - `is_demo`, the endpoint through `DemoGate`;
    - the system account, its worked examples and the hidden "Demo" team, converged in
      the migrate job;
    - the sandbox; app data exports allowed;
    - the refusals (sharing, inviting, teams, feedback, uploads, mail, the account
      export);
    - the reap on start (it has no job runner since its deletion went to `operator`
      mode);
  - the frontend parts as above, and `FeedbackMenu` hidden for a demo.

## 9. Order

The parts need ui-kit 0.31 and server-kit 0.5. kastlan ships its demo backend together
with its landing page. keksdose adopts after its sign-in round and 0.30;
Kurvenschmiede after its 0.30 adoption.

## 10. Settled after the reviews (2026-10-07) — as written

All three apps reviewed the draft (4a2940f) the same day. The sections above follow
what they settled; this is the list.

1. **24 hours for the account and the token** (all three). keksdose: only together with
   the §6.4 refusals, in the same release (§5.3).
2. **The gate** (keksdose):
   - readiness by any version of the demo data;
   - the cap counts live users only;
   - the IP counted from the right (`client_ip(trusted_hops)`), never the left-most
     header;
   - the start reaps at most 20 (§5.1, §5.7).
3. **Every app passes `is_demo` to `name_incomplete`** (kastlan; §5.1).
4. **The allow-list of layer 1 is the app's**, empty by default (keksdose: no logout
   route, but its assistant; §6.3).
5. **GET routes on the never-list refuse explicitly** (kastlan); **app data exports
   stay allowed**, only the account export is refused (KS, keksdose); **expensive reads
   get a per-demo budget** (kastlan; §6.4).
6. **A demo's language pick stays on the device** (KS; §6.4, settings §6.2).
7. **KS's "Demo" team is a hidden system team** (KS; §5.4).
8. **robots:** `Disallow: /demo$` and `/demo?`, so `/demo/ended`'s noindex stays
   fetchable (keksdose; §4.3).
9. **The seeder:** keksdose's existing cleanup job reaps and converges, run once after
   each deploy; KS converges in its migrate job (§7.3). keksdose's job runs at 04:30 UTC,
   so between midnight on the 1st and 04:30 the current month looks empty; moving the
   trigger to 00:05 UTC is one manual `gcloud scheduler jobs update`, Marcel's to run
   if wanted.
10. **Wording:** "demo" covers the demo session and its shared data; mock amounts use
    the demo data's currency; invitation pages are each app's own; the `access` choice
    reaches the sign-in page (§2.10, §3, §4.1, §4.2).
11. **Analytics:** `plausible_ignore` for a demo, "Demo started" from the backend
    (keksdose; §6.6).
12. **The public tools** are linked from the feature rows only (KS; §8).
