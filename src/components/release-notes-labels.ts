// The English words of ./release-notes, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component (0.34, KS U8).
// keksdose's reviewed headings (changelog.section_*) where it had one: "New", "Fixed",
// "Reverted"; its "Faster" was the performance heading alone, which `changed` now also is.

import type { ChangelogSectionKey } from "../lib/changelog";

/**
 * `ReleaseNotes`' words — the `releaseNotes` namespace of `<UiKitProvider labels>` (0.55).
 * The notes themselves are the changelog's, as written.
 */
export interface ReleaseNotesLabels {
  /** The release's heading, given its version as the file writes it: "v0.13.9". */
  version: (version: string) => string;
  /**
   * A section's heading by its key (`changelogSectionKey`), whichever preset named it:
   * "Added" and "Features" are `added`, "Fixed" and "Bug Fixes" `fixed`. A heading no
   * preset writes has no key and keeps its own title.
   */
  sections: Record<ChangelogSectionKey, string>;
}

export const DEFAULT_RELEASE_NOTES_LABELS: ReleaseNotesLabels = {
  version: (version) => `v${version}`,
  sections: {
    breaking: "Breaking changes",
    added: "New",
    changed: "Changed",
    fixed: "Fixed",
    deprecated: "Deprecated",
    removed: "Removed",
    security: "Security",
    reverted: "Reverted",
  },
};
