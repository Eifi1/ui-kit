# Adopting `@eifi1/ui-kit` 0.6 — per repository

Each app proposed these from its own code after adopting 0.5; this is what replaces what.
Each section is self-contained, so it can be handed to that repository's session as-is.
`CHANGELOG.md` → `[0.6.0]` has the release notes; the showcase has every component live
(Inputs → Files, Choices, Dropdowns & pickers, Text fields; Data display → Disclosure &
dialog frame; Primitives).

## Everyone

1. Bump `@eifi1/ui-kit` to `^0.6.0`.
2. **If you type your translation as a complete `UiKitLabels`**, add the new keys
   (`tsc` names them): `combobox.loadError` / `resultCount(n)` / `minChars(n)`,
   `signaturePad.viewEmpty` / `viewDrawn` / `viewTyped(name)`, and the namespaces
   `filePicker`, `dialogFrame`, `tabs`, `dangerConfirm`, `swatchPicker`, `iconPicker`.
   The showcase dictionaries (`showcase/src/i18n/{de,fr,it,es,hu,zh}.ts`) have them all.
3. Behaviour that changes without a code change: entity comboboxes show a load-error line
   when `loadOptions` rejects (throw on `!response.ok` so it can); `Input` / `Select` /
   `Textarea` turn red from `aria-invalid` alone.

---

## keksdose

| Replace | With | Notes |
|---|---|---|
| raw `<input type="file">` in `invoice-upload.tsx` (4) | `useFilePicker` per input | file `{accept, multiple}`, doc `{accept: "application/pdf", multiple}`, camera `{accept: "image/*", capture: "environment"}`. Render each `.element` once, call `.open()` from the existing buttons; `onFiles` gets a `File[]`. |
| `attach-receipt-button.tsx` | `useFilePicker({ accept: "image/*,application/pdf", capture: "environment", onFiles: ([f]) => onPick(f) })` | or `<FileButton variant="ghost" pending={uploading}>` |
| `support-attachments.tsx` | `<FileButton maxFiles={MAX - n} maxSize={MAX_BYTES} onFiles onReject={([r]) => setError(r.message)} pending>` | drop the hidden input's `aria-label` |
| `reports/address-search.tsx` | `<Autocomplete value={query} onChange={setQuery} options={hits…} filter={false} loading={isFetching} minChars={…} fillOnSelect={false} onSelect={…} status={status} icon={<Search/>} />` | seed with `useState(initialQuery)`; Escape reaches your `onKeyDown` when the list is closed; guard the write lock inside `onSelect` |
| category-editor colour tiles | `<SwatchPicker options={… swatchClassName} value onChange allowNone labels={{ none }} />` | drops the hand-made Tooltip and tile classes |
| category-editor icon grid | `<IconPicker options={… note: inUse ? … : undefined} allowNone searchable? />` | `note` gives the dot and the bubble |
| `FlagPicker` | `<SwatchPicker … mixed={value === undefined} allowNone activation="manual" />` | clicking the active flag no longer clears it — "None" does |
| `direction-toggle.tsx` | `<Chip size="lg" tone={outflow ? "expense" : "income"} onClick aria-label={…}>` with a label that FOLLOWS the state ("− Ausgang" / "+ Eingang") | an action button between two named states, not an on/off toggle: no `selected` (so no `aria-pressed`, from 0.6.2), and `aria-label` names current and next ("Richtung: Ausgang — tippen für Eingang"). A fixed label contradicts the figure (#417). |
| support-panel filter pills | `<ToggleGroup allowEmpty value={f ?? null} onChange={setF}>` | |
| `transaction-search.tsx` field | `<SearchField variant="inline" className="min-w-0 flex-1 text-base" />` | |
| `shared/components/danger-confirm.tsx` | `DangerConfirm` | `requireText.expected` → `phrase`; password → `requirePassword`; `pending` → `busy`; `lock` → `lockedReason`; `tone="amber"` → `"warning"` |
| `features/budget/dialog-header.tsx` (5 callers) | `<DialogFrame title description closeButton>` | no `actions` for commit-on-change dialogs |
| `ModalShell` in `category-admin.tsx` | `<DialogFrame size={wide ? "lg" : "md"}>` | |
| accounts / support-panel folding rows | `Disclosure` (`variant="bare"` for the phone toggle) | the desktop table row stays a button — use one rotating `ChevronDown` |
| `locale="en"` with Monday weeks | `<UiKitProvider locale="en" weekStartsOn={1}>` | |

## kastlan

| Replace | With | Notes |
|---|---|---|
| `shared/components/ui/form.tsx` (47 files + `form/fields.tsx`) | `@eifi1/ui-kit/rhf` | same names; kastlan's react-hook-form 7.71 meets the `^7.55` peer. `{t("x")} *` → `<FormLabel required>`; set `required` on the control too. `useFormField` now throws outside `FormField` + `FormItem`; `FormControl` takes exactly one element child. Drop `ui/form.tsx`, `ui/label.tsx` and the Radix Label/Slot. |
| Radix `Label` (~17 files) | `<Label htmlFor required? size="sm"?>` | |
| toolbar `<Select>` sizing | `<Select size="sm" aria-label=…>` / `selectClassName` | |
| `address-autocomplete.tsx` | `<Autocomplete value onChange loadOptions={…} minChars={2} debounceMs={300} icon={<MapPin/>} onSelect={…} error={…} />` | `{id,label,sublabel}` → `{value,label,sublabel}`; throw on `!response.ok` for the error state; drop the Radix popover |
| `lease-documents-tab.tsx` upload | `useFilePicker({ onFiles: ([f]) => upload(f) })`, `onAdd={picker.open}` | |
| `unit-floor-plan.tsx` upload | `<FileButton accept=".pdf,.png,.jpg,.jpeg" pending onFiles>` | |
| `FileDropzone` workarounds | `onClear`, `multiple`, drop `isValid={() => true}` / `invalidMessage=""` | |
| live calculators on `NumberInput` + parsing | `<NumberField value onCommit onValueChange={setLive} min max digits />` | feeding `live` back into `value` is safe |
| reference rate / room counts | `<NumberField step={0.25} digits={2} min={0} />`, `step={0.5} digits={1}` | pick a `step` that `digits` can show |
| role picker, "recurring rent" | `ChoiceCardGroup multiple` / `ChoiceCard` | |
| saved handover signatures | `<SignatureView label value={png} />` or `typedName` | `adaptInk={false}` for an opaque PNG |

## lenkbank

| Replace | With | Notes |
|---|---|---|
| `shared/lib/parse-table.ts` | `@eifi1/ui-kit/table-text` | same signatures; update `measured-grid.tsx`, `features/control/csv.ts`, the `parseRows as parsePoints` re-export in `features/gear/common.tsx`; delete the file and its test. The grid itself comes in 0.7. |
| `ScopeFields` (`Input list` + `<datalist>`) | `<Combobox label value onChange options disabled error>` | delete `listId` and the datalists |
| `columns-input.tsx`, `step-points-panel.tsx` | `<FileButton variant="secondary" accept=… droppable onFiles={([f]) => …}>` | the test id moves to the button; find the input with `querySelector('input[type=file]')` |
| setpoint `IconButton` | kit `IconButton size="xs"` (28) / `"2xs"` (24), `tone="danger"` | `label` → `aria-label`. `nested` is NOT supported (a button in a button is invalid HTML): put the actions BESIDE the row button — `relative` wrapper, `absolute inset-y-0 end-2` — see Primitives in the showcase |
| `sheet-tabs.tsx` | kit `Tabs` | `activeId` → `active`, `onSelect` → `onChange`, `add={{label,onAdd}}` → `addLabel` + `onAdd`, `swatches` → `icon`; `detail`, `empty`, `busy` map directly. The kit draws its underline strip, not the folder-tab look. |
| `shared/ui/collapsible-card.tsx` (10 sites) | `Disclosure` | `title`, `hint`, `open`, `onOpenChange`, `defaultOpen` carry over; the body still unmounts when closed. Body class is `space-y-3 px-4 pb-4` (was `mt-3 space-y-3`); `onOpenChange(false)` is no longer delayed. |
| 8 hand-framed dialogs | `<DialogFrame title actions={(close) => …}>` | drop hard-coded heading ids and the `max-h-[92dvh]` scroll overrides — the frame scrolls its body |
