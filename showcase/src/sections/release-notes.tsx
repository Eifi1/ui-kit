import { useState } from "react";
import {
  Disclosure,
  ReleaseNotes,
  ToggleGroup,
  changelogSectionKey,
  groupByScope,
  parseChangelog,
  parseChangelogItem,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, code } from "../lib/section";

/**
 * RELEASE NOTES — a changelog for a reader (0.55): the kit's parser for the file every
 * repository writes with commit-and-tag-version, and the card keksdose and kastlan each
 * drew on top of their own. The lines below are the generator's real shapes: the compare
 * link before the date, `**scope:**`, the commit link, the trailing references, a patch
 * under `###`, and a hand-written release from before a repository adopted the tool.
 */

const SAMPLE = `# Changelog

## [0.13.9](https://github.com/Eifi1/kastlan/compare/v0.13.8...v0.13.9) (2026-10-20)

### Features

* **accounts:** a Depot is worth its positions ([3c1eb85](https://github.com/Eifi1/kastlan/commit/3c1eb85)), closes [#455](https://github.com/Eifi1/kastlan/issues/455)
* **accounts:** buying one moves the money ([4d2fa96](https://github.com/Eifi1/kastlan/commit/4d2fa96))
* **reports:** a year at a glance, month by month ([5e3ab07](https://github.com/Eifi1/kastlan/commit/5e3ab07))

### Bug Fixes

* **admin:** a company rename logs both names again ([8f698eb](https://github.com/Eifi1/kastlan/commit/8f698eb)), closes [dev#435](https://github.com/Eifi1/dev/issues/435) [#457](https://github.com/Eifi1/kastlan/issues/457)
* **admin:** a company rename logs both names again ([9a7b0c1](https://github.com/Eifi1/kastlan/commit/9a7b0c1))

### [0.13.8](https://github.com/Eifi1/kastlan/compare/v0.13.7...v0.13.8) (2026-10-14)

### Performance Improvements

* **invoices:** the list opens without waiting for the totals ([1b2c3d4](https://github.com/Eifi1/kastlan/commit/1b2c3d4))

## [0.2.0] - 2026-04-10

The first release: buildings, units and tenancies.
`;

function ReleaseNotesDemo() {
  const [frame, setFrame] = useState<"card" | "plain">("card");
  const releases = parseChangelog(SAMPLE);
  return (
    <Example
      label="ReleaseNotes — one release, on the kit's parser"
      hint="the version and its day, the sections by key, the notes grouped by scope"
    >
      <div className="mb-4">
        <ToggleGroup<"card" | "plain">
          aria-label="frame"
          value={frame}
          onChange={setFrame}
          options={[
            { value: "card", label: "card — a changelog page" },
            { value: "plain", label: "plain — a what's-new dialog" },
          ]}
        />
      </div>
      <div className="max-w-2xl space-y-4">
        {releases.map((release) => (
          <ReleaseNotes key={release.version} release={release} frame={frame} headingAs="h4" />
        ))}
        <Disclosure variant="bare" title="The CHANGELOG.md it reads (SAMPLE)">
          <pre className="overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs text-secondary">{SAMPLE}</pre>
        </Disclosure>
      </div>
      <Note>
        {code("parseChangelog(markdown)")} reads the file into releases; each goes to {code("<ReleaseNotes release />")}{" "}
        as it is, and a server that sends the same shape with raw bullets (keksdose&apos;s) works too. The scope is a
        chip and its notes follow it — one as a sentence, several as a list — so nine commits to one area read as one
        topic, not nine prefixes. A section&apos;s heading is the app&apos;s word for its key (
        {code("releaseNotes.sections")}
        ), &ldquo;Features&rdquo; and &ldquo;Added&rdquo; alike; a heading no preset writes keeps its own title, and a
        release with no section shows its prose. The day follows the app&apos;s date setting.
      </Note>
    </Example>
  );
}

const q = (v: unknown) => JSON.stringify(v);

function ChangelogHelpers() {
  const line =
    "**admin:** a rename logs both names ([8f698eb](https://…/commit/8f698eb…)), closes [#12](…), references [#405](…)";
  return (
    <Example
      label="parseChangelogItem · changelogSectionKey · groupByScope"
      hint="one bullet as its scope and sentence; a heading as its key; bullets by scope"
    >
      <OutTable
        rows={[
          [`parseChangelogItem(${q(line)})`, q(parseChangelogItem(line))],
          [
            'parseChangelogItem("**The path was wrong.** README …")',
            q(parseChangelogItem("**The path was wrong.** README …")),
          ],
          ['changelogSectionKey("Bug Fixes")', q(changelogSectionKey("Bug Fixes"))],
          ['changelogSectionKey("Added")', q(changelogSectionKey("Added"))],
          ['changelogSectionKey("⚠ BREAKING CHANGES")', q(changelogSectionKey("⚠ BREAKING CHANGES"))],
          [
            'changelogSectionKey("Deprecated (removed in 0.35)")',
            q(changelogSectionKey("Deprecated (removed in 0.35)")),
          ],
          ['changelogSectionKey("Known issues")', q(changelogSectionKey("Known issues"))],
          [
            'groupByScope(["**a:** one", "**b:** two", "**a:** three", "**a:** one"])',
            q(groupByScope(["**a:** one", "**b:** two", "**a:** three", "**a:** one"])),
          ],
          [
            "parseChangelog(SAMPLE).map((r) => [r.version, r.date])",
            q(parseChangelog(SAMPLE).map((r) => [r.version, r.date])),
          ],
        ]}
      />
    </Example>
  );
}

export function ReleaseNotesPage() {
  return (
    <>
      <ReleaseNotesDemo />
      <ChangelogHelpers />
    </>
  );
}
