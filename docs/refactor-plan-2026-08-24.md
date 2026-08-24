# @hb/ui refactor plan — 2026-08-24

## Status — RAISED, none executed

14 findings. This is the **first audit this package has ever had.**

## Why it had never been audited

`packages/ui` is a git submodule of a separate repository, and both previous whole-codebase programmes said so and stopped at the boundary:

* The **2026-08-06** plan, in its scope statement: *"`packages/ui` is a git submodule of a separate repository and was deliberately excluded."*
* The **2026-08-18** plan repeated it as a limitation in slice after slice — *"the @hb/ui components the slice renders (AmountInput's commit normalisation, SwipeableRow, Modal, DataTable) were read only as far as their prop contracts — I did not audit the submodule"*; *"a separate repository this audit may not change and a frontend/src glob cannot see"*.

So 12,641 lines of shared UI across 62 modules, consumed by three applications (Keksdose, kastlan, steering-design), have been carried by two audits that each explicitly declined to read them.

## How this was produced

One reader, no fan-out. Every finding below is either **read directly out of the source** or **produced by running the code**, and the two are labelled differently:

* **PROVEN** — there is a transcript in this document showing the defect happening. Two findings were established by compiling the module with esbuild and calling it (U-2), or by building a React 19 + jsdom repro of the component composition (U-3).
* **CONFIRMED** — read off the source with the mechanism stated; no execution.
* **PLAUSIBLE** — the mechanism is real but reachability depends on a consumer call site this audit did not enumerate. Two findings carry it, and they are the two to check before spending anything on them.

Coverage is honest rather than uniform: `lib/`, `hooks/`, `theme/`, the numeric input chain and the data-table's pure helpers were read line by line; `data-table.tsx` (1,614 lines), `combobox.tsx`, `tour.tsx` and `feedback-inbox.tsx` were read in the regions the pattern scans pointed at, not end to end. **Treat an absence of findings in those four files as absence of evidence.**

## The numbers

By severity — sev 4: 2, sev 3: 3, sev 2: 8, sev 1: 1.
By category — bug 8, test-gap 1, efficiency 2, consistency 2, robustness 1.

**Nine of the fourteen are bugs**, and the two severity 4s are a missing safety net and a defect that requires the user to reload the page.

## A carried-over question, now answered

The 2026-08-18 plan left one claim explicitly unfiled:

> *"a locale-decimal claim about `Number(amount.replace(",", "."))` (a single-comma replace, which turns a German '1.234,56' into NaN) is left unfiled because I could not confirm what AmountInput actually emits."*

**REFUTED.** `AmountInput` funnels every entry path — typing, the numpad sheet, the desktop calculator, the blur/Enter commit — through `handleText`, whose first act is `sanitizeLive`, and `sanitizeLive` does `.replace(/,/g, ".")` — global. Verified by execution:

```
"1.234,56" -> onChange receives "1.23456"
"1,5"      -> onChange receives "1.5"
"1234,56"  -> onChange receives "1234.56"
```

A comma cannot reach the app's `Number(amount.replace(",", "."))` from this control. The app-side code is redundant, not wrong. Nothing to do.

---

## Wave 0 — a place to put a test

Everything else is blocked on this, because the house rule is that a fix ships with a regression test that was **run against the old code and failed there**, and right now there is nowhere to put one.

- [ ] **U-1** · sev 4 · test-gap · L · touches: `package.json`, `vitest.config.ts`, new `**/__tests__/*`

  **The package has no tests at all.** `find src -name '*.test.*'` returns nothing; the only npm script is `typecheck: tsc --noEmit`. 62 modules and 12,641 lines, depended on by three applications, defended by the type checker alone.

  What that costs is not hypothetical — it is the rest of this document. `lib/calc.ts` is 273 lines of pure, dependency-free string→number logic whose comments name eight specific field reports it encodes (`#201`, `#334`, `#144`, `#103`, `#9`…), every one of which is a behaviour somebody decided on deliberately and nothing pins. U-2 below is a defect in that file that a five-line test would have caught the day it was written.

  Keksdose's 2,698 frontend tests do exercise this code, but only incidentally and only through rendered consumers: they assert what a page shows, so they cannot fail for `formatResult` returning `"1e-7"` unless some page happens to render that number.

  **Fix.** Add vitest to this package (it is already the runner in every consumer, so the harness is a copy). Start where the return on a line of test is highest and no DOM is needed: `lib/calc.ts`, `lib/dates.ts`, `components/data-table-sort.ts`, `components/data-table-filters.ts`, `theme/chart-palette.ts`. The edge cases are already written down — the comments in those files are a specification waiting for an assertion.

  Do NOT start with the components. The pure modules are five files, they hold four of the findings below, and they need no jsdom.

## Wave 1 — characterise before changing

New files only, so every item is file-disjoint from every other and from wave 2.

- [ ] **U-1b** · pin the CURRENT behaviour of `calc.ts`, `dates.ts`, `data-table-filters.ts` and `chart-palette.ts`, including the wrong behaviour U-2/U-5/U-8/U-13 describe. The point is that wave 2's diffs then show exactly what changed, and a fix that alters something nobody meant to alter cannot pass quietly.

## Wave 2 — the fixes

Scheduled by `touches`: **no two items below edit the same file**, so the whole wave can go in parallel.

### U-2 · sev 3 · bug · S · PROVEN · touches: `src/lib/calc.ts`

**A number the field itself produced is re-read as arithmetic on the next blur, and comes back wrong.**

`formatResult` ends in `parseFloat(n.toFixed(10)).toString()`. `Number.prototype.toString` switches to exponent notation below `1e-6` and at or above `1e21`, so its output alphabet contains `e`, `+` and `-`. Neither of the two functions that read a field's text back accepts that alphabet: `tokenize` rejects `e` as an unknown character, and `sanitizeLive`'s character class `[^0-9.+\-*/×÷()]` deletes it. So `commitExpression` falls through to its digits-only cleanup, which strips the `e` and **concatenates the mantissa to the exponent**.

Executed against the real module:

```
AmountInput (commit = handleText(commitExpression(shown)), which re-sanitises)
  "1/10000000"                 ->  "1-7"                ->  "6"     | true value 1e-7
  "1/3000000000"               ->  "3-10"               ->  "7"     | true value 3.33e-10
  "999999999999*999999999999"  ->  "9.99999999998+23"   ->  "33"    | true value 9.99e+23

NumberInput (commit = commitExpression(value))
  "1/10000000"                 ->  "1e-7"               ->  "17"
  "999999999999*999999999999"  ->  "9.99999999998e+23"  ->  "9.9999999999823"
```

Both controls commit on blur **and** on Enter, so Enter-then-click-away is two commits and enough on its own. In `AmountInput` the first commit already shows garbage, because `handleText` re-sanitises what `commitExpression` just returned.

**Trigger:** `|result| < 1e-6` or `|result| >= 1e21`. That bounds the reachability in a money field and is why this is severity 3 rather than 4 — a user gets here by dividing by ten million, not by adding up a shop.

**Fix.** Make `formatResult` total with respect to its own consumers: render in fixed notation and trim trailing zeros, or refuse — return the text unchanged, or `null` — when the magnitude falls outside what the grammar can express. Whichever is chosen, the invariant to write down and then test is: **`commitExpression(formatResult(n))` must equal `formatResult(n)` for every finite `n`.** That single property is the whole finding.

### U-3 · sev 4 · bug · M · PROVEN · touches: `src/hooks/use-body-scroll-lock.ts`, `src/components/modal.tsx`, `src/components/picker-sheet.tsx`, `src/components/numpad-sheet.tsx`, `src/components/data-table.tsx`

**Closing a dialog that contains an open sheet leaves the page permanently unscrollable.**

Five places lock background scrolling, all with the same save-the-previous-value-and-restore-it idiom, and none of them coordinates with the others:

| Where | Line |
|---|---|
| `Modal` (inline, not the hook) | `modal.tsx:149` |
| `PickerSheet` | `picker-sheet.tsx:55` |
| `NumberPadSheet` | `numpad-sheet.tsx:74` — `useBodyScrollLock(true)`, locked for its whole lifetime |
| `DataTable` mobile row dialog | `data-table.tsx:792` |
| `DataTable` settings panel | `data-table.tsx:1485` |

Save/restore only composes if the releases are strictly nested in reverse order. They are not. React runs unmount cleanups **parent first**, which is the opposite of what this idiom needs. Repro under React 19 + jsdom:

```
outer + inner locker unmounting together
  CLEANUP ORDER: Modal:restore("")  ->  Numpad:restore("hidden")
  FINAL body.overflow = "hidden"        <-- nothing is open; the page cannot scroll

outer unmounts while inner stays mounted
  AFTER OUTER CLOSES, inner still open. body.overflow = ""   <-- background scrolls behind the sheet
```

The first case is an ordinary mobile gesture: open the transaction dialog, tap the amount (the numpad sheet opens on focus), press Save. Dialog and sheet unmount in the same commit, the Modal restores `""` first, the numpad then restores the `"hidden"` it had captured, and the app is left unscrollable with no overlay on screen. **The only way out is a reload.**

**Fix.** One module-level counter in `use-body-scroll-lock.ts`: the first lock records the previous `overflow` and sets `hidden`, each further lock increments, each release decrements, and the last one restores the recorded value. Then move `Modal`'s hand-rolled copy onto the hook — it is the one locker that does not use it, and it is half of the failing pair.

**Test it against the old code first.** The repro above is the test; it passes on the fix and fails on the current tree in both directions.

### U-4 · sev 3 · bug · S · CONFIRMED · touches: `src/shell/app-shell.tsx`

`AppShell` reads `localStorage` inside a `useState` initialiser and writes it in an effect, both unguarded:

```ts
const [collapsed, setCollapsed] = useState(() => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(collapseStorageKey) === "1";
});
```

Accessing `localStorage` **throws**, rather than returning null, when a browser has site data blocked — Safari private browsing, Chrome with third-party site data disabled, a partitioned webview. Here the throw happens during render of the application's top-level shell, so it is not a lost preference: nothing mounts.

This package already knows: `logger.ts` wraps the identical call in `try { … } catch { /* ignore (private mode, etc.) */ }`, and `data-table.tsx`'s `loadPersisted`/`savePersisted` both do. `app-shell.tsx` is the one that does not.

**Fix.** The same try/catch, defaulting to `false`. Better: lift the guarded read/write into one small helper in `lib/` and use it in all three places, so the next one cannot forget.

### U-5 · sev 3 · bug · S · PLAUSIBLE · touches: `src/components/data-table-filters.ts`

Select filters encode to a comma-joined string and decode by splitting on commas:

```ts
case "select": return v.values.length ? v.values.join(",") : null;      // encode
case "select": return { type: "select", values: raw.split(",").filter(…) };  // decode
```

An option value containing a comma therefore becomes two values on the way back, and the filter silently matches nothing. The date and number codecs are safe (`..` cannot occur in their payloads) — this is the only one whose separator can appear in its data.

**PLAUSIBLE, not confirmed**, because whether it fires depends entirely on the consuming app: a select over enum-ish values (status, type, flag) never sees a comma, and one over category or payee names very well might. **Check the call sites before fixing** — if no consumer can produce a comma, close this as not reachable and say so.

**Fix if reachable.** Percent-encode each value before joining, decode after splitting.

### U-6 · sev 2 · efficiency · S · CONFIRMED · touches: `src/hooks/use-anchored-rect.ts`

`useAnchoredRect` re-measures on `scroll` (capture phase, so every ancestor scroll container) and `resize`, and every measurement calls `setRect` with a **freshly allocated object**. React compares by identity, so each event re-renders the anchored panel whether or not the anchor moved. There is no rAF coalescing either, so a momentum scroll re-renders per frame-ish event.

The guard already exists in this package, one file away. `tour.tsx:311` does exactly the right thing on the same problem:

```ts
setRect((prev) => (sameRect(prev, next) ? prev : next));
```

**Fix.** Take the same comparison into the hook. Optionally coalesce into a rAF; the equality guard alone removes the no-op renders, which are the bulk.

### U-7 · sev 2 · consistency · XS · CONFIRMED · touches: `src/lib/dates.ts`

`dateRangePresets()` is documented as *"The named ranges offered by the data-table date filter (**UTC-based**, like `todayIso`)."*

Both halves are false, and the module note 100 lines above is a 25-line account of why. Every helper here was moved off UTC onto the local calendar after dev#471 (*"Just entered a tx now from scheduled. But it still shows as upcoming… It is currently 1 o clock middle european summer time."*), and `todayIso` is `toLocalIso(new Date())`.

A stale comment is usually cosmetic. This one **states the exact bug the module was rewritten to prevent**, sits on the function a future reader is most likely to touch, and the old module note that said the UTC behaviour was deliberate is precisely what let the bug survive the first time.

**Fix.** Delete the parenthetical, or replace it with "local-calendar, like `todayIso`".

### U-8 · sev 2 · bug · S · CONFIRMED · touches: `src/lib/dates.ts` *(same file as U-7 — take them together)*

`parseIsoDate` rejects only falsy components:

```ts
const [y, m, d] = s.split("-").map(Number);
if (!y || !m || !d) return null;
return new Date(y, m - 1, d);
```

`new Date` rolls over out-of-range values, so `"2026-13-45"` returns **2027-02-14** and `"2026-02-30"` returns **2026-03-02** — a valid-looking Date for a date that does not exist. Callers cannot tell: `formatIsoDate` returns `""` only for `null`, so a rolled-over date formats and displays as though it were real.

**Fix.** Range-check (`1 ≤ m ≤ 12`, `1 ≤ d ≤ 31`) and confirm no rollover by reading the components back off the constructed Date — the same round-trip check `sameYmd` already expresses.

### U-9 · sev 2 · efficiency · XS · CONFIRMED · touches: `src/lib/logger.ts`

The zustand logging middleware wraps every `set`, and every wrapped `set` calls `storeLogEnabled()`, which does a synchronous `localStorage.getItem` inside a try/catch — **in production builds as well as dev**, because the override has to be readable in production by design.

The override cannot change without someone opening devtools, so reading it once per session is the same behaviour at a fraction of the cost. It matters because the stores this wraps include ones that transition per pointer event.

**Fix.** Read the override once at module scope; keep a tiny exported setter if the ability to flip it live is worth keeping.

### U-10 · sev 2 · bug · S · CONFIRMED · touches: `src/hooks/use-dismiss.ts`

Both hooks assign to refs **during render**:

```ts
const handlerRef = useRef(handler);
handlerRef.current = handler;     // render phase
```

React documents this as unsafe. A render that is started and then discarded — a transition, a Suspense retry — leaves the ref holding a handler from a tree that never committed, and the document-level listener will call it.

**Fix.** Move the assignment into an effect (the pattern `use-row-swipe.ts` already uses, with a comment explaining why: *"Written in an effect (not during render) so it satisfies react-hooks/refs"*). Two files in this package do it correctly and one does not.

### U-11 · sev 2 · bug · S · PLAUSIBLE · touches: `src/hooks/use-dismiss.ts` *(same file as U-10)*

`useOutsideClick` subscribes to `mousedown` only. Touch platforms synthesise a `mousedown` for most taps, which is why this has not obviously broken, but the synthesis is not guaranteed — a tap that begins a scroll, or lands on an element that calls `preventDefault` on the touch sequence, may never produce one. On a phone-first PWA whose pickers and menus all dismiss through this hook, that is worth deciding deliberately rather than inheriting.

**PLAUSIBLE:** needs a real device check, not a code read. If it is fine, write down that it is fine.

**Fix if real.** Listen for `pointerdown` instead — one event covering mouse, touch and pen.

### U-12 · sev 2 · bug · M · CONFIRMED · touches: `src/hooks/use-overlay-history.ts`

Nested overlays that close together leak a history entry.

`Modal` and a `PickerSheet` inside it each push a same-URL sentinel. When both unmount in one commit, the Modal's cleanup runs first (see U-3 for why), finds `currentSentinel()` is the **picker's** id rather than its own, and correctly declines to call `history.back()` — but it also has no way to remove its now-buried entry. The picker's cleanup then pops, landing on the Modal's dead sentinel.

The user's next Back press consumes that dead entry. `handlePop` finds an empty stack and returns, so nothing visible happens: **Back has to be pressed twice to leave the page.**

The hook's own doc-comment reasons carefully about this class of problem for the app's soft-leave guard (#424/#426); the sibling-overlay case is the one it does not cover.

**Fix.** On cleanup, when our sentinel is buried rather than current, record the debt so the overlay above us unwinds both entries — or push a single shared sentinel refcounted across the stack, which is the same shape as U-3's fix and probably the better one.

### U-13 · sev 2 · robustness · S · PLAUSIBLE · touches: `src/theme/chart-palette.ts`

`parseHex` does no validation:

```ts
let h = hex.replace("#", "");
return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
```

Given anything that is not `#rgb`/`#rrggbb` it returns `NaN`s, and its two callers propagate them silently — `lerpHex` produces `"#nannannan"`, and `textOn` computes `NaN > 0.6 === false` and returns the **light** text colour.

There is a non-hex value sitting in the same module's exported data: `HEATMAP_HEX.light.empty` and `.dark.empty` are `rgba(…)` strings. Nothing in this package passes them to `textOn`, so whether this fires is a question about the consuming app's heatmap cells.

**PLAUSIBLE:** check whether any consumer calls `textOn`/`lerpHex` with a stop drawn from `empty`. **Fix regardless** — the two-line guard (return a mid-grey on a malformed input) costs nothing and turns a silently-unreadable label into a visible default.

### U-14 · sev 1 · consistency · XS · CONFIRMED · touches: `src/lib/calc.ts` *(same file as U-2 — take them together)*

`commitExpression` normalises decimal commas with a **non-global** replace, `s.replace(",", ".")`, while `sanitizeLive` uses `/,/g`. Verified by execution that the difference is harmless — the `[^0-9.-]` strip on the next line deletes whatever commas the first replace missed, so both paths agree — but the two functions are the two halves of one rule and should not appear to state it differently. The next reader has to run it to find out, which is what this note saves them.

---

## What was not covered

Stated plainly so the next pass knows where to start rather than re-deriving it:

* **`data-table.tsx` (1,614 lines)** — read in the regions the scans pointed at (persistence, URL sync, the expansion cell, the scroll containers, the two scroll locks). Its keyboard handling, column resize/auto-size, grouping, pagination and selection were not read.
* **`combobox.tsx` (635) + `combobox-core.tsx` (381)** — read only for the list-height and panel questions.
* **`tour.tsx` (549)** — read only around the target-tracking interval, which is correct (listener and interval both cleaned up, and it carries the rect-equality guard U-6 wants).
* **`feedback-inbox.tsx` (519)** — not read. It is also the newest file in the package.
* **`palette-presets.ts` (491)** — data, not read.
* **Accessibility** was not audited as a lens at all: no focus-order, contrast, `aria-*` or screen-reader pass. For a package whose whole job is shared controls, that is the largest single gap in this document.
* **No consumer call sites were enumerated.** Three findings (U-5, U-11, U-13) turn on that and are marked PLAUSIBLE for exactly this reason.
