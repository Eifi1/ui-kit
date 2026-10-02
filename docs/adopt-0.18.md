# Adopting `@eifi1/ui-kit` 0.18

Built from Kurvenschmiede's user-management and sharing round (items 1–6) and from
keksdose's notes on 0.17 (dev #583, #584, #576). Everything is opt-in except the fixes
listed first. `CHANGELOG.md` → `0.18.0` has the release notes, and the showcase (⌘K) has
every prop live.

## Everyone

1. Bump to `^0.18.0` by hand; a caret below 1.0 locks the minor version.
2. **Fixes and visible changes:**
   - **Overlay history (keksdose #584):** a dialog with `backCloses` no longer reopens a
     row editor after Cancel. The hook now leaves alone an address change made by the
     same press that closes the overlay. One edge case: if the URL changed while an
     overlay was open and it then closes without any pointer or key press (a timer), the
     extra history entry is no longer unwound.
   - **DataTable** `mobileDialogBackCloses` (default `true`): set it to `false` when
     opening a row pushes its own URL entry (`?row=` pushed), and keep it on when
     opening replaces the URL.
   - **Toaster `dismissOnMiddleClick`** defaults to **on**: a middle click on a toast
     dismisses it, even with `closeButton: false`. A middle click on a link or button
     inside the toast still does what it did. Pass `false` to opt out.
   - **ToggleGroup, disabled:** the chosen segment keeps its fill under the pointer. Before,
     its label disappeared on hover.
   - **Card `density="compact"`:** CardTitle is `leading-snug`, so the hint no longer
     touches the title. Drop any `leading-normal` overrides you added for this.
3. **New label namespaces:** `writeLock`, `accountState`, `shareCard`, `reauthDialog`.
   **New keys:** `confirmDialog.typed` and `accountSettings.passkeys.descriptionAlongside`.
   Every catalogue has them. The German texts are impersonal, so they read the same in
   both registers. The Hungarian sentences that contain a name, and es/fr/it gender
   agreement in `accountState`, want a native speaker's look.

## New, opt-in

| Area | API |
|---|---|
| Sharing (K1) | `ShareCard`, `ShareDialog` and their shared body `SharePanel`: grantees with a role switch (several roles) or a role chip (one role); add by email with a role; pending grants and open invite links with a copy button; `candidates` (teams, past grantees); `caption`, `intro`, an `extra` slot per row, `readOnly`. Every action is an async callback; a rejection keeps the input and shows `formatError(err)`. Removing access and withdrawing an invitation always ask first. Roles are `ShareRole` (`RoleDefinition & { key, description? }`) |
| Write lock (K2) | `<WriteLockProvider locked reason>` + `useWriteLock()`. `commit` on Button, IconButton and FormActions: under a lock the control is `aria-disabled` but still focusable, with the reason in the kit Tooltip. Fields stay editable. The nearest provider wins; an inner `locked={false}` reopens a subtree. ShareCard's actions already opt in |
| Typed confirmation (K3) | `useConfirm()({ requireTyped: email, typedLabel?, typedMatch? })`: Confirm stays disabled until the text matches (`"caseless"` by default). `typedMatches()` and `DangerConfirm phraseMatch="caseless"` cover the inline form |
| Re-authentication (K4) | `ReauthDialog`: `onSubmit(password)`; a rejection keeps the dialog open with `error`, and the password is selected so retyping replaces it; `autocomplete="current-password"` |
| PasskeysSetting (K5) | `mode="alongside"` (the password keeps working; Kurvenschmiede can drop its description override). `beforeAdd(name) => boolean \| Promise<boolean>`, e.g. a password step; `false` keeps the typed name |
| Admin roster (K6) | `RoleChip` (a role vocabulary), `AccountStateChip` (active, inactive, invited, registered, unverified, passwordChange), `DateMark` (absolute or relative date, with the full date in a Tooltip), `dateColumn()` for DataTable (sorts newest first, empty last, optional filter) |
| ProgressBar (keksdose) | `legendTone`: one tone, or a function per row. The default stays muted |
| Chip (keksdose R1) | `snapEdges`: at fractional device-pixel ratios (125 %) both 1px edges render the same weight. The width needed depends on where the chip sits, so the kit measures each snapped chip's position; call `refreshChipEdges()` after moving chips some other way. Opt-in, because a pass with hundreds of chips costs about 20 ms |

Not in 0.18: a text field still loses focus when its error message appears or clears,
because the field is rebuilt. The straightforward fix would shift spacing around every
kit field, so it gets a careful round of its own. ReauthDialog works around it.

## keksdose

- **Transactions register:** the kit's phone row dialog can come back with
  `mobileDialogBackCloses={false}`.
- **Tax card:** drop `legendValue` for `legendTone={tone === "inflow" ? "income" : "expense"}`.
  The figures use the kit's full money colours and drop the monospace font.
- **ScanStatusBadge:** switch to `<Chip snapEdges>`. Width-only rounding only lines up
  where the column happens to start.
- **Toasts:** the middle-click hook can go.
- **Admin cards:** the compact title's `leading-normal` overrides can go.
- **SaveGuard:** can become `WriteLockProvider` plus `commit`, which keeps locked
  controls in the tab order.

## Kurvenschmiede

- `share-dialog.tsx` → `ShareDialog`.
- `write-lock.tsx` → `WriteLockProvider` + `commit`.
- `typed-confirm.tsx` → `useConfirm({ requireTyped })`. The transfer variant with a
  recipient picker can stay a DialogFrame and use `typedMatches`.
- ConfirmPasswordDialog → `ReauthDialog`, called from `PasskeysSetting beforeAdd`.
- `mode="alongside"` instead of the description override.
- Roster: `RoleChip`, `AccountStateChip`, `dateColumn`.

## kastlan

Nothing required.
