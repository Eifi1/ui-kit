# Adopting `@eifi1/ui-kit` 0.63

ui-kit 0.63 ships with **server-kit 0.29**. Its centre is the frontend half of the account layer
(docs/auth-harmonization.md §12.9, Marcel 2026-11-13: "Das sollte doch lieber vollständig in die
kits kommen, frontend wie backend"): a new entry, `@eifi1/ui-kit/accounts`, that wires the kit's
sign-in parts to `auth_router` once, so no app writes its session, its pages or its settings
again. This note grows with the round; its first part is the session.

**From 0.62, nothing else first.**

**Legal wording:** the **Privacy Policy**, for an app that lists the new standard browser entry:
`standardEntries.session`, the sign-in `@eifi1/ui-kit/accounts` keeps. Move the /privacy
`updated` date the day you ship it. An app that keeps its own line for its tokens changes
nothing for the kit.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**New words** (all seven catalogues; **es, hu and zh need native review**, and de-CH, fr and it
are new sentences, not yet reviewed): `legal.sections.privacy.browser.standardEntries.session`.
