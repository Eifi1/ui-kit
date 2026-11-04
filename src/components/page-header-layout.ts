// PageHeader's metrics, in a module of their own so `PageHeaderSkeleton` draws its outline
// from the same class strings the header lays out with (0.55): a size or a gap changed
// here moves both, and the outline cannot drift from the header it stands in for. Not
// public — the page-header module's `export *` would publish anything declared there.

import type { PageHeaderMobileLayout, PageHeaderSize } from "./page-header";

/** The title's type per {@link PageHeaderSize}. */
export const TITLE: Record<PageHeaderSize, string> = {
  sm: "text-lg font-semibold",
  compact: "text-xl font-semibold",
  md: "text-xl font-semibold tracking-tight sm:text-2xl",
};

/** The header's root: the trail, then the row, `gap-2` apart. */
export const ROOT = "flex min-w-0 flex-col gap-2";

/**
 * `stacked` at Large and Extra large on a phone (0.32.2, kastlan's 0.32.1 report;
 * docs/text-size-harmonization.md §4, as FormActions does): the actions take the full
 * width, one under the other. Side by side in 240 px of layout, two buttons each wrapped
 * their label onto three lines. `large:max-sm:`, the scaled phone width, so Normal and
 * every wider screen keep their row; `inline` is for actions known to fit, and stays.
 */
export const STACK_ACTIONS_AT_LARGE = "large:max-sm:flex-col large:max-sm:items-stretch large:max-sm:[&>*]:w-full";

export const ROW: Record<PageHeaderMobileLayout, string> = {
  stacked: "flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
  inline: "flex-row items-center justify-between gap-2 sm:gap-4",
};

/** The actions' box, at the title block's end from `sm` up. */
export const ACTIONS = "flex shrink-0 flex-wrap items-center gap-2";

/** The sentence under the title. */
export const DESCRIPTION = "mt-1 text-sm text-muted";
