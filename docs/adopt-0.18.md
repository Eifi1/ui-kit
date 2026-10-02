# Adopting `@eifi1/ui-kit` 0.18

Built from Kurvenschmiede's user-management and sharing round (items 1–6) and from
keksdose's notes on 0.17 (dev #583, #584, #576). Everything is opt-in except the fixes
listed first and the removal of three German catalogues (Everyone, item 2). `CHANGELOG.md` → `0.18.0` has the release notes, and the showcase (⌘K) has
every prop live.

## Everyone

1. Bump to `^0.18.0` by hand; a caret below 1.0 locks the minor version.
2. ⚠ **Breaking — one German.** The kit now ships ONE German catalogue: `de-CH`, Swiss
   Standard German, formal ("Sie"). The subpaths `@eifi1/ui-kit/i18n/de`,
   `@eifi1/ui-kit/i18n/de-informal` and `@eifi1/ui-kit/i18n/de-CH-informal` are gone;
   importing one fails the build. Migration:
   - `UI_KIT_LABELS_DE` → `UI_KIT_LABELS_DE_CH`; `uiKitLabelsDe(n)` → `uiKitLabelsDeCh(n)`
     (new in `/i18n/de-CH`, like `uiKitLabelsFr(n)`: Swiss words, `n`'s digits — so
     `uiKitLabelsDeCh("de-DE")` writes 1.234). The words now use "ss" for "ß".
   - `UI_KIT_LABELS_DE_INFORMAL` / `uiKitLabelsDeInformal(n)` / `UI_KIT_LABELS_DE_CH_INFORMAL`
     → `UI_KIT_LABELS_DE_CH` / `uiKitLabelsDeCh(n)`. The kit's words then say "Sie": an
     app that said "du" either rewrites its own text to "Sie" and Swiss "ss", or
     overrides the keys that address the reader in its own provider —
     `miniCalendar.startSelected`, `miniCalendar.rangeSelected`, `dangerConfirm.phrase`,
     `confirmDialog.typed`, `wizard.confirmCancel`, `wizard.missingRequired`,
     `tour.awaitClickHint`, `signaturePad.instructions`, `signaturePad.typedFallbackHint`.
   - `UI_KIT_LABELS_DE_CH` itself is unchanged, byte for byte.
3. **Fixes and visible changes:**
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
   - **`missingKitLabels(labels, DEFAULT_UI_KIT_LABELS)`:** the reference is required.
     The doc example showed a one-argument call; that call now throws an error that
     names `DEFAULT_UI_KIT_LABELS` instead of "Cannot convert undefined or null to object".
4. **New label namespaces:** `writeLock`, `accountState`, `shareCard`, `reauthDialog`, `serverWake`.
   **New keys:** `confirmDialog.typed` and `accountSettings.passkeys.descriptionAlongside`.
   Every catalogue has them. The German texts are impersonal, so an app that overrides
   the addressing keys for "du" has nothing more to override. The Hungarian sentences that contain a name, and es/fr/it gender
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
| Cold-start notice (keksdose #199, for every app) | `createServerWake({ slowMs = 2000, wakingMs = 7000, shouldWatch })` is a watchdog over the app's requests: "slow" after 2 s, "waking" after 7 s, back to idle when the last one settles. It watches GETs by default; `watchReadsAnd(/\/auth\/(login\|register)\b/)` adds the POSTs that gate the app. Uploads stay out, and it never arms while offline. `attachServerWake(axiosInstance, watcher)` (no axios dependency; attach it BEFORE your refresh interceptor) or `wrapFetch(fetch, watcher)`. `<ServerWakeNotice watcher appName />` is keksdose's corner notice: opaque, above the mobile nav via `--app-nav-h`, one polite live region. Labels `serverWake.slow` / `serverWake.waking(appName)` in every catalogue |
| Chip (keksdose R1) | `snapEdges`: at fractional device-pixel ratios (125 %) both 1px edges render the same weight. The width needed depends on where the chip sits, so the kit measures each snapped chip's position; call `refreshChipEdges()` after moving chips some other way. Opt-in, because a pass with hundreds of chips costs about 20 ms |

**Fields keep focus when their message comes and goes.** Input, Select, Textarea and
NumberField used to rebuild their control whenever `error` switched between a message
and none, so focus, the caret and an uncontrolled field's typed text were lost (e.g.
Kurvenschmiede's password dialog, which clears the error on the first keystroke). A
field that passes `error` at all (even `undefined` or `false`) now always sits in one
plain `<div>`, with the message inside it when there is one. Fields that never pass
`error` are unchanged, and so is the look while a message shows. The one case that
looks different: a field with `className="flex-1"` in a flex row that also passes
`error` now keeps its natural width while no message shows. Before, it shrank like that
only while a message showed. None of the three apps has such a field.

## keksdose

- **Transactions register:** the kit's phone row dialog can come back with
  `mobileDialogBackCloses={false}`.
- **Tax card:** drop `legendValue` for `legendTone={tone === "inflow" ? "income" : "expense"}`.
  The figures use the kit's full money colours and drop the monospace font.
- **ScanStatusBadge:** switch to `<Chip snapEdges>`. Width-only rounding only lines up
  where the column happens to start.
- **Toasts:** the middle-click hook can go.
- **Admin cards:** the compact title's `leading-normal` overrides can go.
- **Cold-start notice:** `server-wake-store.ts` becomes
  `createServerWake({ shouldWatch: watchReadsAnd(/\/auth\/(login|register|demo-session)\b/) })`.
  Either keep calling its `start()` / `end()` from your interceptors (your interceptor
  indexes stay put), or use `attachServerWake(api, serverWake)` before your response
  interceptor. `app/server-wake-notice.tsx` becomes
  `<ServerWakeNotice watcher={serverWake} appName="Keksdose" />`. The `boot.slow` /
  `boot.waking` keys can go, or be passed as `labels`.
- **SaveGuard:** can become `WriteLockProvider` plus `commit`, which keeps locked
  controls in the tab order.
- **One German (breaking):** `shared/i18n/kit-labels.tsx` and its test still import
  `/i18n/de-informal` on the committed branch; the working tree's switch to
  `UI_KIT_LABELS_DE_CH` is the migration. The "a constant, not a factory" note there can
  go: `uiKitLabelsDeCh(locale)` exists now, though the constant is what `de-CH` wants.

## Kurvenschmiede

- `share-dialog.tsx` → `ShareDialog`.
- `write-lock.tsx` → `WriteLockProvider` + `commit`.
- `typed-confirm.tsx` → `useConfirm({ requireTyped })`. The transfer variant with a
  recipient picker can stay a DialogFrame and use `typedMatches`.
- ConfirmPasswordDialog → `ReauthDialog`, called from `PasskeysSetting beforeAdd`.
- `mode="alongside"` instead of the description override.
- Roster: `RoleChip`, `AccountStateChip`, `dateColumn`.
- Cold-start notice: in `client.ts`, right after `axios.create` and before the refresh
  interceptor:
  `export const serverWake = createServerWake({ shouldWatch: watchReadsAnd(/\/auth\/(login|register)\b/) }); attachServerWake(api, serverWake);`
  In `main.tsx`, beside `<Toaster>`: `<ServerWakeNotice watcher={serverWake} appName="Kurvenschmiede" />`.
- **One German (breaking):** `shared/i18n/kit-labels.ts` imports `uiKitLabelsDe` from
  `/i18n/de`. Use `uiKitLabelsDeCh(tagOf(FALLBACK_LOCALE))` from `/i18n/de-CH`; the
  `"de-CH"` loader stays `UI_KIT_LABELS_DE_CH`. The kit's words for `de` then say "ss",
  so either the app's own `de` text follows, or the app keeps one German as well.

## kastlan

- Cold-start notice: in `client.ts`, right after `axios.create` and before the 401
  interceptor:
  `export const serverWake = createServerWake({ shouldWatch: watchReadsAnd(/\/auth\/(login|login\/2fa|register)\b/) }); attachServerWake(apiClient, serverWake);`
  In `providers.tsx`, next to `<Toaster />`: `<ServerWakeNotice watcher={serverWake} appName="Kastlan" />`.


## Afterwards

The fixes once queued as 0.18.1 shipped in 0.19.0 — see `docs/adopt-0.19.md`.
