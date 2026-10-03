# Adopting `@eifi1/ui-kit` 0.24

The second adoption round: what kastlan, keksdose and Kurvenschmiede found moving to 0.23,
plus the kit's own later list (Marcel). Two bug fixes everyone gets; the rest is opt-in.
`CHANGELOG.md` → `0.24.0` has the release notes, and the showcase (⌘K) has every part
live.

## Everyone

1. Bump to `^0.24.0` by hand; a caret below 1.0 locks the minor version.
2. **Fixes you will see:**
   - **Textarea (Kurvenschmiede):** scrolled text slides under the floated label instead
     of running through it — a long paste (ColumnMapper, any notes field) put its first
     visible line under the label. A labelled Textarea draws one extra `aria-hidden`
     strip of its own surface over its top padding once the label floats.
   - **FeedbackAttachmentField (keksdose):** every mode's root is `min-w-0 max-w-full`,
     so as a flex item (the composer's slot row) a long file name truncates instead of
     widening the composer past a phone screen (measured 614px at 390). A
     `className="min-w-0 max-w-full"` of yours can go.
   - **Focus after a failed save or confirm:** FormActions' Save and DangerConfirm's
     confirm are natively disabled while busy, and a focused button that turns disabled
     drops the focus to `<body>`. After a failure (the form or tile still there) the
     focus returns to the button that was pressed.
   - **AmountInput `inputClassName`** now wins over the kit's plain end padding, the
     centring and the tone colour (`px-2`, `text-transparent` work); the room for the
     calculator / currency chip and the invalid border still come after it.
   - **ColumnMapper / ColumnRoleTable:** an all-required role set drops the
     "(required)" suffix; a preview that scrolls sideways fades at the cut edge (one
     wrapper `<div>` more).
   - **Autocomplete:** an unlabelled field's "?" hint coming and going no longer
     remounts the control (the 0.22 rule, now for the whole Combobox family).
   - **RhfCombobox / RhfTextCombobox:** the phone sheet is titled with the form label
     (it fell back to the placeholder, or had none).
   - **DangerConfirm `children`** used to be dropped silently; they now render inside the
     armed tile (none of the apps passes any).
3. No new labels.

## New, opt-in

| Area | API |
|---|---|
| DangerConfirm (keksdose) | `confirmVariant` — the confirm's look apart from `tone` (an amber question, a red Go); `confirmDisabledReason` — a guard of your own that holds the armed confirm like the built-in ones (aria-disabled, the reason in the Tooltip, no printed line; order: write lock, yours, then tick / phrase / password); `children` — fields inside the armed tile before the guards, the first one focused on arming. Cancel stays disabled while busy, by design: the request cannot be called back |
| Composer slot (keksdose) | `attachmentSlot={({ root, pending }) => <FeedbackAttachmentField refs pasteFrom={root} disabled={pending} … />}` — the composer hands its root, so the textarea's pastes reach the field without wrapping the composer; types `FeedbackComposerSlotContext` / `ChatComposerSlotContext` |
| Attachment buttons (keksdose) | FeedbackAttachmentField `buttonVariant` / `buttonSize` (and on FeedbackComposer's `attachment` config) — `"ghost"` / `"sm"` for the old picker's look |
| ColumnRoleTable (keksdose) | `bodyProps` on the `<tbody>`, `rowProps(row, index)` per preview row (LineItems' contract) — also on ColumnMapper; types `ColumnRoleTableBodyProps`, `ColumnRoleTableRowProps` |
| Refs (kastlan) | `ref` on Combobox and InlineEntityCombobox (the input), EntityCombobox and MultiEntityCombobox (the trigger); `sheetTitle` names the phone sheet when the label comes from a form |
| `@eifi1/ui-kit/rhf` (kastlan) | `RhfInlineEntityCombobox` — focus-on-error, `commit` / `disabledReason`, `onCreate` / `createLabel` / `createEmptyLabel` / `createCommit`, `clearable` / `clearValue`; RhfCombobox and RhfTextCombobox pass `commit` / `disabledReason` (and RhfCombobox the create props) through |

## kastlan

- The budget line-item form (`features/budgets/components/line-item-form.tsx`): the
  AccountPicker inside `RhfField` → `RhfInlineEntityCombobox` (or pass `field.ref` to
  the picker's new `ref`) — a failed submit focuses it.

## keksdose

- UserActionConfirm: add `confirmVariant="danger"` — the amber question with a red Go
  again.
- UserPlanEditor: one tile — the title as the `prompt`, the plan Select (and the
  current-plan line) as `children`, `confirmDisabledReason={changed ? undefined :
  t("admin.users.set_plan_needs_change")}` instead of `lockedReason`; the "FREE → PRO"
  prompt goes.
- The support composer: `attachmentSlot` as a render prop with `pasteFrom={root}`
  (drop the wrapping element), `buttonVariant="ghost" buttonSize="sm"`, and drop
  `className="min-w-0 max-w-full"`.
- The bank import's map step: `bodyProps={{ "data-private": "" }}` on ColumnRoleTable
  (drop the useLayoutEffect, #336).
- `budget-cells.tsx` (`[&_input]:px-2…`) and `holdings-panel.tsx`
  (`[&_input]:text-transparent`) → `inputClassName`.

## Kurvenschmiede

- Nothing to change: the Textarea fix and the "(required)" rule apply on the bump,
  and the preview's edge fade shows on a phone.

## 0.24.1

- **tailwind-merge ≥ 3.7 (keksdose):** the kit now requires `tailwind-merge ^3.7.0`
  (was `^3.3.0`). AmountInput's `inputClassName` beats the kit's end padding only
  because `px-2` replaces `pe-3` in the merge, which tailwind-merge does from 3.7.0;
  an app on 3.3–3.6 satisfied the old range, npm deduped the kit onto it, and the cell
  silently kept 12px at its end. If your lockfile holds an older tailwind-merge, the
  bump moves it to 3.7 (or nests a 3.7 copy for the kit) — raise your own range too.
