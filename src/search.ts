// `@eifi1/ui-kit/search` — the command palette / global search.
// A re-slicing of the main barrel, not a new API.
export * from "./search/command-palette";
// Named, not `*`: 0.53 took `SEARCH_TIER_POINTS` and `normalizeSearchText` off the surface
// (deprecated in 0.52, refactor audit 2026-10-30, API-4); the index keeps them.
export {
  createSearchIndex,
  type SearchEntry,
  type SearchMatchField,
  type SearchHit,
  type SearchIndexOptions,
  type SearchIndex,
} from "./search/search-index";
export * from "./search/global-search";
