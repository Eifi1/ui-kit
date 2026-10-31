// `@eifi1/ui-kit/search` — the command palette / global search.
// A re-slicing of the main barrel, not a new API.
export * from "./search/command-palette";
export * from "./search/search-index";
// 0.52: the slice's share of the 55 names no app reads (refactor audit 2026-10-30, API-4).
export {
  /** @deprecated 0.52 — `createSearchIndex`, whose ranking tiers it spaces (API-4); removed in 0.53 */
  SEARCH_TIER_POINTS,
  /** @deprecated 0.52 — `createSearchIndex(entries).search(query)`, the same match (API-4); removed in 0.53 */
  matchEntries,
  /** @deprecated 0.52 — `foldForSearch`, the list fold it builds on (API-4); removed in 0.53 */
  normalizeSearchText,
} from "./search/search-index";
export * from "./search/global-search";
