# Adopting `@eifi1/ui-kit` 0.51

This guide lists, per change, what each app does, with the places found in keksdose, kastlan
and Kurvenschmiede on 2026-10-26 (`frontend/src`).

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show):
it keeps serving the old kit from `node_modules/.vite/deps` until it restarts.

## kastlan K1: a clamped strip keeps "Send again" on its line (`clampMobile`)

Marcel kept the strip for kastlan's `EmailVerificationBanner` (2026-10-23), so the fix is the
strip's: with `clampMobile`, below `md`, the strip's message claims **7rem** instead of 12rem
before the action wraps. The message is one clamped line either way (the rest is behind
"More"), and the 12rem only pushed the action under it. Any `AlertBanner variant="strip"
clampMobile` gets it; from `md` up, and without `clampMobile`, nothing changes. The `box`
variant keeps `actionPlacement` (0.50).

Measured in Chromium at 390 × 844, kastlan's banner (`mx-4`, `clampMobile`, with the ×),
Normal text: **43px, one line** (glyph, message, More, "Send again", ×) in all seven catalogues,
with Roboto (Android) and with the wider DejaVu Sans; **71px** on 0.50 (the button on a line
of its own). French ("Envoyer à nouveau", the longest) keeps 8px. At 360px French, and
Spanish in DejaVu Sans, still drop the button to a second line. At Large the button drops a
line sooner, as before.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/auth/verify-email-banner.tsx:28`, the strip, without `clampMobile`. | Nothing. |
| kastlan | `features/auth/components/verify-email-banner.tsx:20`, the strip with `clampMobile` (KX-5). | Nothing: the banner is 43px on a 390px phone after the bump. Check it once at 390 × 844. |
| Kurvenschmiede | `app/layout.tsx:79`, the strip, without `clampMobile`. | Nothing. |
