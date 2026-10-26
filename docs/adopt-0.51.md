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

## Kurvenschmiede N5: the roster's role select shows its value whole

The user roster's role **select** (`useUserRosterColumns` / `userRosterColumns` with
`editableRole` + `onRoleChange`) no longer clips its value. Beside the `grow` Name every other
column is squeezed to its min-content, and a `w-full` `<select>` has none (a select with a
percentage width counts as zero there), so the Role column was its header's width and the
select read "Meml…" / "Admi…" on 0.49 and 0.50. The cell now carries an invisible,
zero-height floor of the vocabulary's role words in the select's own type, padding and
chevron room, so the column keeps room for the longest **role word** in the app's language
(every role of `roles`, offered or not, plus a held key it does not know). An option's reason
("Customer (owns work)") is not counted: it is never the selected value, and the open list
is as wide as it needs. The words are generated content (`::before`), not text: a test's
`getByText("Member")` still finds only the option.

Measured in Chromium at 1280px, the kit's preset in a 900px pane with Kurvenschmiede's four
roles: on 0.50 the Role column was 92px and the select 68px (30px for the value: every role
but Hungarian's "Tag" clipped); now the column is 109px (de-CH, "Prüfer/in") to 114px (en,
"Customer"), 138px (es, "Administrador") and 141px (hu, "Adminisztrátor"), every value whole,
and Name gives the room back (the table stays 851px, nothing leaves for width). The phone
card is unchanged (the select fills its 240px field).

| App | Where | Steps |
|---|---|---|
| keksdose | `features/admin/users-panel.tsx:807`, `editableRole` (`:752`): the role select. | Nothing. The Role column widens to its longest role word; check the admin page at 1280px once. |
| kastlan | `features/settings/components/users-panel.tsx:341`: no `editableRole` (its roles are a "Manage roles" action), so chips. | Nothing. |
| Kurvenschmiede | `features/admin/users-panel.tsx:418`, `editableRole` with `offered` and `optionDisabledReason` (`:421–426`). | Nothing. The Role column widens by ~20px (en) to ~50px (es, hu); the 0.50 adoption's `fitPriority` 3/4/5 on the extras still decides what leaves, so check `/admin/users` at 1100 and 1280px once. |

## keksdose N2: under `virtualize`, a column the fit brings back stays when it fits

From keksdose's 0.49 review 3 (B2's guard held). With `virtualize`, a `fitPriority` column
the table left out and brought back was estimated at 606 + 93 = 699 ≤ 757 but drawn needed
778–812, so it went again and B2's guard kept it out although it fitted. The cause:
`virtualize` locks the columns' widths in a `<colgroup>` under a signature that names the
columns, and only ever grows them while rows scroll. Leaving the column out changes the
signature, so the fit measures that table afresh (606); bringing it back in the same frame,
before `virtualize` measures anything, restored the old signature, and with it the OLD lock,
whose widths had ratcheted up while rows scrolled. The lock now goes as soon as the signature
changes, so the table the column comes back to is drawn as the fit measured it (the next
frame locks that).

Visible effect: such a column comes back (and stays) once there is room by the fresh
measure; the columns' ratcheted widths reset to the rows in view when it does, as they
already did on any other column change. B2's guard is unchanged for a column whose cells
are wider than its header.

| App | Where | Steps |
|---|---|---|
| keksdose | `features/transactions/transactions-page.tsx:1114` (`virtualize`), the columns' `fitPriority` in `use-transaction-columns.tsx` (Memo 1, Account 2, Status 3, Category 4). | Nothing. Status no longer stays out at a width where it fits. |
| kastlan | No `virtualize`. | Nothing. |
| Kurvenschmiede | No `virtualize`. | Nothing. |
