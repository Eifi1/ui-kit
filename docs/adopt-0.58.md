# Adopting `@eifi1/ui-kit` 0.58

ui-kit 0.58 answers keksdose's legal audit of 2026-11-09 (legal decision 10, Marcel's
answers), fixes what the apps found after 0.57, and adds the parts keksdose built by hand
for its shopping lists. It ships with **server-kit 0.22**, the mail and the endpoint behind
the new change notice. Everything is additive: `check:api` finds no changed name against 0.57.

**From 0.57, nothing else first.** An app still on 0.56 takes 0.57's notes first.

**Legal wording:** the **Terms** (all apps: the `changes` clause loses the refund sentence),
the **Privacy Policy** (all apps: the browser-storage section loses "everything else stays on
your device"), and the **sign-up box** for an app that sets `minAge` (keksdose). Each app moves
the `updated` date of its /terms and /privacy pages (`LegalPage updated=…`) to the day it
ships this bump. The sign-up box has no date of its own; it ships under the terms' new date.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the three apps.

## Legal: keksdose's legal audit (legal decision 10)

- **Terms:** `<LegalKitSection section="changes" />` no longer says a paid period is
  refunded: no app takes payment, and the sentence undercut the imprint's "non-commercial".
  An app that bills passes `variant="commercial"` in the release that turns billing on,
  together with the disclaimer's `variant="commercial"` (decision 7).
- **Privacy Policy:** the browser-storage section drops "everything else stays on your
  device", which read as "never leaves". Check that the app's own sections say what the
  account keeps on the server (keksdose: language, text size, contrast).
- **Minimum age** (keksdose: 16): add `minAge: 16` to the app's `LegalOperator` and pass
  `operator={OPERATOR}` to `RegisterForm` (or to `LegalAcceptCheckbox` on an app's own
  register page). The box then reads "I am at least 16 years old and accept the Terms of
  Service and the Privacy Policy". Without `minAge`, today's sentence.
- **Announcing a change** (contract §3.5, new): the terms promise 30 days' notice **by email
  and in the app**, and no app could mail every account. Now:
  - publish the new text at `href`;
  - serve `GET /api/v1/legal/changes` with server-kit 0.22's `current_announcements` over a
    `LEGAL_CHANGES` tuple of `LegalChange(page, announced=, effective=, href=)` kept beside
    the new text (a change shorter than 30 days is refused when the record is made);
  - mail every active account once with server-kit's `send_legal_change_mails` (below);
  - render `<LegalChangeNotice announcements={data} />` in the signed-in frame, under the top
    bar. It shows from the announcement through the effective day, never as a modal; its × is
    remembered per page and date on the device. It links the new text; objections go by
    replying to the mail.
- **Translation review:** new rows in the legal area for every language:
  `kit.legal.acceptWithAge(16)`, `kit.legal.changeNotice.terms(date)` / `privacy(date)` /
  `read`, and `kit.legal.sections.terms.changes.commercial`.

## server-kit 0.22: the change mail

`eifi1_server_kit.legal`: `LegalChangeAnnouncement` (the wire shape `{ page, effective,
href }`), `LegalChange`, `current_announcements`, `LEGAL_CHANGES_PATH`, `NOTICE_DAYS = 30`,
and `send_legal_change_mails`. Each app wires, before it announces its first change:

- **Endpoint:** a public `GET /api/v1/legal/changes` (three lines, no router factory), with
  `today` as the app's Zurich day.
- **Recipients:** active accounts with an address; never deactivated, erased or demo accounts
  (as feedback §9.11).
- **Sent record:** keyed by (`change.key`, user id), insert ON CONFLICT DO NOTHING, and keep
  the rows as proof the notice went out. A dedicated table, not kastlan's notifications marker
  (purged after 30 days).
- **Sending:** a jobs route (`require_jobs_token`) or an admin action that calls
  `send_legal_change_mails(…, already_sent=…, record_sent=…)` until `complete`. It refuses
  before the announced day and after `effective` minus 30 days, mails at most 200 per call,
  0.5 s apart, and stops after five failures in a row.
- **`reply_to`** set to the support address on the transport (the mail says "reply to
  object"), and `install_contract_error_handlers` if the app lacks it (the 409).
- The 14 mail texts (seven languages, two pages) live on the server, not on /translations:
  they need the same native review as other legal wording.

## Fixes the apps found after 0.57

- **Feedback inbox, bulk bar under a write lock** (kastlan): the three list buttons no longer
  each draw the lock's reason under themselves at Large text and on a touch screen (on a phone
  the floating card grew to about three rows). The bar says it once, on a line under its row;
  each button keeps it in its tooltip and description. Follows the inbox's `commit`.
- **FormActions stacked on a phone:** an extra action passed as `children` fills its line
  like Cancel and Save, also when refused (a `commit` button under a lock, or a
  `disabledReason`). keksdose can drop `className={phone ? "w-full" : undefined}` on "Save as
  template" (`features/shopping-lists/suggestion/suggestion-dialog.tsx`). DOM note: the
  wrapper round a locked control's reason carries `data-lock-frame`.
- **LineItems:** after Add, and after a remove that leaves the focus on a field, the focus
  goes into the row's first field quietly: a Combobox, InlineEntityCombobox or Autocomplete
  there takes the focus without opening its list or, on a phone, its sheet (keksdose live
  #495). ArrowDown, typing or a tap opens it as before.
- **New: `focusQuietly(el, options?)` and `isQuietFocus(el)`**: focus that is not a request to
  open anything. Use `focusQuietly` for your own focus moves; call `isQuietFocus(e.currentTarget)`
  in the `onFocus` of your own open-on-focus control. keksdose can replace its `addLine` focus
  skip in `features/transactions/split-editor.tsx` with `focusQuietly` into the category field
  (and adjust `split-compact-lines.test.tsx`); keep the skip where the first field is a text
  field and a phone keyboard is unwanted.

## Lists: checkable rows and rows moved by hand (keksdose SL-10, SL-14)

- **Checkable row.** `ListItem` takes `checked: boolean | "mixed"` and `onCheckedChange(next)`:
  the WHOLE row is the checkbox (`role="checkbox"`, `aria-checked`, named by the title,
  described by its overline, subtitle, meta and trailing; Space toggles, Enter does not) and
  the kit draws the box. `checkedStyle="strike"` crosses a checked title out and mutes it.
  `commit`, `disabledReason` and `disabledReasonDisplay` work as on a button row. The box is
  the row's one action: `onClick`, `href` and `expandedContent` beside `checked` are type
  errors. A section row is the same row: `"mixed"` from its counts, the "x of y" in
  `trailing`, its items in `children` (it does not fold).
  - keksdose `shop/shop-page.tsx` `ItemRow`: drop the `leading` `<Checkbox>`, `tapRow`,
    `targetProps`/`targetClassName` and the title's strike classes; pass `checked={ticked}`,
    `onCheckedChange={(checked) => onTick([item.id], checked)}`, `checkedStyle="strike"`,
    `commit`, `disabledReasonDisplay="tooltip"`. `AisleRow` stays a folding row with its
    select-all in `leadingActions`, or becomes the checkable header if aisles need not fold.
- **`useReorder({ items, rowKey, onReorder(from, to), commit })`** gives each row
  (`reorder.row(index)`) its "Move up" / "Move down" RowActions entries (`row.actions`) and
  Alt+ArrowUp / Alt+ArrowDown on the row (`row.props`, announced through `aria-keyshortcuts`).
  It keeps the focus on what moved the row, even when that arrow is locked at an end, announces
  "Moved to position 3 of 7", and at an end keeps the arrow focusable with "Already at the
  top". Render `reorder.element` (the live region) once beside the list. The app owns and
  saves the order.
  - keksdose `shopping-list-page.tsx` (SL-10): spread `row.props` onto `ItemRow`'s `ListItem`,
    `actions={[...row.actions, remove]}`, `{reorder.element}` after the `Card`; its own up/down
    entries and the `shopping_lists.item.move_up` / `move_down` keys go (the kit's `reorder`
    namespace has the words in all seven catalogues).
  - Kurvenschmiede: its own drag `useReorder` (`features/setpoint/common.tsx`) only shares the
    name; a drop can call the kit hook's `move(from, to)` to be announced.

## Display: target markers, a group band's "+", the box round a tooltip's trigger (keksdose)

- **ProgressBar `markers`** (`ProgressBarMarker`: `{ value, label, valueText?, tone?, key? }`):
  a 2 px tick standing out of the track at each value, clamped into `min`–`max`, said in the
  bar's description ("Recommended: 25%"). keksdose `food-pyramid-card.tsx` `GroupTile`: drop the
  hand-drawn tick and pass `markers={[{ value: 50, label: t("food_pyramid.recommended", { share: recommended }), valueText: null }]}`;
  a test that found `[data-part="target"]` now finds `[data-part="marker"]`.
- **`DataTableGroupBy.action`** `(key, rows) => ReactNode`: a small control at the band's very
  end, after `end`, sized by the band (an IconButton without `size`: 24 px compact, 28 px
  otherwise), sticky with it, the glyph alone at Large, on `mobileGroupBy`'s section header
  too. keksdose's register day band and accounts phone sections move their "+" from `end` to
  `action`.
- **Tooltip `block`** puts the trigger on a line of its own (a block child no longer runs on,
  dev #649), and **`wrapperClassName`** on IconButton and Button styles the outermost box they
  stand in (`className` stays on the button). keksdose `/prices` `LatestPrice` uses
  `<Tooltip block …>`, and its phone day header uses `wrapperClassName`; with the band's
  `action`, `shared/components/band-add-button.tsx` goes.

## ChoiceField: segments from md up, a select on a phone (keksdose)

`ChoiceField` (main barrel) and `RhfChoiceField` (`/rhf`): a labelled `ToggleGroup` from `md`
up and a labelled `Select` below, switching at `usePhoneLayout()`'s breakpoint (it follows the
text size). One control is mounted at a time; a screen reader hears the same name and value
in both, and the value survives a switch. Props: `options` (`{ value, label, icon? }`),
`value`, `onChange`, `label`/`aria-label`, `hint`, `help`, `error`, `disabled`,
`disabledReason`, `commit`, `size`, `layout` (`"auto"` | `"segmented"` | `"select"`) and
`breakpoint`. `ToggleOption` gains an optional `icon`.

- keksdose `features/reports/price-level-picker.tsx` `HeaderChoice` and
  `features/breakdown/breakdown-table.tsx` (SL-18 `Choice`) become
  `<ChoiceField label={label} size="sm" value={value} onChange={onChange} options={options} className="max-md:min-w-0" />`;
  `REPORT_HEADER_SEGMENT` and the `usePhoneLayout` / `Select` imports go.

## Housekeeping

- `allowScripts` approves esbuild's postinstall (npm 11.20 no longer warns on `npm ci`).
- The billing contract's decision 6 names keksdose's CHF-only prices (0.4.75).
- The shell set's ceiling rises to 160,100 B: the additions above that the top bar's buttons
  and the legal links import (+1,303 B, +363 gzip).

## In the browser

- **keksdose:** the sign-up box with the age; `/shopping-lists/:id` (move rows with ↓ and
  Alt+↓, focus stays, a screen reader hears the position; the first row's ↑ says "Already at
  the top"); `/shopping-lists/:id/shop` (tap anywhere on an item: it ticks and is struck
  through); the food-pyramid ticks; the register's day bands as tall as before with the "+"
  after the count; `/prices` "Paid …" on its own line; a split's "Add line" opens no picker;
  "Save as template" full width on a phone.
- **kastlan:** on a phone under the demo lock, the bulk bar shows one reason line.
- **All three:** /terms and /privacy with the new dates; a `LegalChangeNotice` once the app
  announces its first change.
