# Adopting `@eifi1/ui-kit` 0.41

Round 0.41 removes the three names deprecated in 0.40, on the schedule their tags gave
(`@deprecated 0.40 — …; removed in 0.41`). server-kit does not change.

**Bump only.** No app used any of the three (verified across all three apps, test files
included), so the bump changes nothing in keksdose, Kurvenschmiede or kastlan.

## 1. What's removed

- **`Tabs` `wrap`:** the multirow strip with a filled active chip below `md`. Use the
  scrolling strip with `overflowCue` (0.40): a › beside it scrolls on, a ‹ at the end goes
  back to the first tab. keksdose went back to one scrolling row in live #410.
- **`FeedbackMenuLabels.viewFeedback`:** use `inbox` (the admin's "Feedback inbox" row).
- **`FeedbackMenuLabels.allFeedback`:** use `discussion` (the "Feedback discussion" row).
  Both labels were optional and unused since 0.40 (feedback §10.6); they are gone from the
  English defaults and all seven languages.

No export, subpath or label group is added or removed; the public surface counts are
unchanged.

## 2. Per app

| App | Change |
|---|---|
| keksdose | bump only |
| Kurvenschmiede | bump only |
| kastlan | bump only |
