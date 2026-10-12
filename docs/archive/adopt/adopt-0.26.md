# Adopting `@eifi1/ui-kit` 0.26

keksdose's #377 rework (Marcel, 2026-10-03): the translation review's swipes become
bindable, so an app's Settings → Interaction can offer them like its other lists. Plus a
dark-mode fix for every swipe panel. `CHANGELOG.md` → `0.26.0` has the release notes.

## Everyone

1. Bump to `^0.26.0` by hand; a caret below 1.0 locks the minor version.
2. **Fix you will see:** swipe panels (TranslationReviewPanel's, DataTable's
   `mobileSwipeActions`) draw their text in the fill's contrast colour — the fills are
   pastels in dark mode, where the white text was unreadable. New token
   `--success-contrast` (white; emerald-950 in dark). An app's OWN `SwipeAction`s with a
   fill that turns light in dark mode should add the matching text class, e.g.
   `bg-[var(--danger)] text-[var(--danger-contrast)]`.
3. **New label key** `translationReview.clearedToast` (required — an app spreading its
   own complete `translationReview` object must add it), in every catalogue.

## New, opt-in

| Area | API |
|---|---|
| TranslationReviewPanel (keksdose #377) | `swipe` takes a binding as well as `true`: `swipe={{ end: ["approve", "clear"], start: ["edit"] }}` — per side an ordered ladder, index 0 the first stage, index 1 the longer drag (SwipeableRow's two stages). Actions: `"approve"` (with Undo), `"edit"` (opens the editor in the wording — also the way to "Needs a change"), `"clear"` (removes the verdict, with Undo; needs `onClear`). An action that does not apply to a row drops out and the ladder closes up (approve on an approved or missing string, clear on a row without a verdict, a duplicate or unknown id); a side with nothing left does not swipe. `true` is `DEFAULT_TRANSLATION_REVIEW_SWIPE` (`{ end: ["approve"], start: ["edit"] }`), unchanged from 0.25. Types `TranslationReviewSwipeAction`, `TranslationReviewSwipeBinding`; `TRANSLATION_REVIEW_SWIPE_ACTIONS` for a settings list; `translationReviewSwipePlan` resolves a binding against one row |

## keksdose

- Settings → Interaction: a "Translation review" surface typed from
  `TranslationReviewSwipeAction` / `TRANSLATION_REVIEW_SWIPE_ACTIONS`, mapped to
  `swipe={{ end, start }}` (logical sides; your physical right/left map to end/start in
  LTR). Your `"none"` can stay in the stored prefs — an unknown id drops out.
