import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn";
import { useDayFormatter } from "../lib/day-format";
import { changelogSectionKey, groupByScope } from "../lib/changelog";
import type { ChangelogItem, ChangelogSectionKey } from "../lib/changelog";
import { useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { Card, CardAction, CardHeader, CardTitle } from "./card";
import { Chip } from "./chip";
import { SectionLabel } from "./text";
import { DEFAULT_RELEASE_NOTES_LABELS, type ReleaseNotesLabels } from "./release-notes-labels";

export { DEFAULT_RELEASE_NOTES_LABELS };
export type { ReleaseNotesLabels };

/** One section as `parseChangelog` reads it, or as an app's backend sends it: the items
 *  may be the raw bullets (keksdose's) or parsed ones. */
export interface ReleaseNotesSection {
  title: string;
  /** Read from the title with `changelogSectionKey` when left out. */
  key?: ChangelogSectionKey | null;
  items: readonly (string | ChangelogItem)[];
}

/** One release: a `ChangelogRelease` from `parseChangelog`, or the same shape from a server. */
export interface ReleaseNotesRelease {
  version: string;
  /** `YYYY-MM-DD`, or none. */
  date?: string | null;
  sections: readonly ReleaseNotesSection[];
  /** A hand-written release's prose, shown when it has no section. */
  body?: string | null;
}

export interface ReleaseNotesProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  release: ReleaseNotesRelease;
  /**
   * `card` (default): a card of its own with the version as its title and the day at its
   * end — a changelog page's list of releases (keksdose's and kastlan's /changelog).
   * `plain`: the same parts without the card, a quieter heading row — keksdose's what's-new
   * dialog, which lists the releases since the last visit inside its own frame.
   */
  frame?: "card" | "plain";
  /** The version's heading. Default `h2` on a card (the release list is the page's outline),
   *  `h3` plain; the sections' headings are one level below. */
  headingAs?: "h2" | "h3" | "h4";
  /** The release day as the app writes it. Default the provider's `formatDate` (the app's
   *  date preference), else the kit's medium date in the provider's locale. */
  formatDate?: (date: string) => string;
  labels?: LabelOverride<ReleaseNotesLabels>;
}

const BELOW = { h2: "h3", h3: "h4", h4: "h5" } as const;

/**
 * One release for a reader (0.55): its version, its day, and its sections with the notes
 * grouped by scope — the card keksdose (features/changelog/release-notes.tsx, on its
 * /changelog and in its what's-new dialog) and kastlan (features/changelog/pages/
 * changelog-page.tsx) each drew around their own parser, on the kit's `parseChangelog`
 * (kastlan reuse audit 2026-11-02, proposal 1).
 *
 * keksdose's layout, from feedback live #211: **the scope is a heading, not a prefix**. The
 * generator writes a bullet per commit with its scope on each, so a release that touched
 * accounts nine times printed "accounts:" nine times down the margin and read as a git
 * log. Grouped (`groupByScope`), the scope is a chip and its notes follow it: one as a
 * sentence beside the chip, several as a list under it. Exact repeats are dropped.
 *
 * A section's heading is the app's word for its key (`releaseNotes.sections`, from the
 * provider or {@link labels}) whichever preset named it — "Features" and "Added" are both
 * `added`, "New" in English — and a heading no preset writes ("Known issues") is shown as
 * written rather than hidden behind a missing word. A section whose every item reads as
 * nothing (a bare reference) is left out, and a release with no section shows its `body`.
 * The sections keep the file's order, which the repository's `.versionrc` sets.
 *
 * The day is `YYYY-MM-DD` off the heading, printed the app's way: keksdose's dialog and
 * page printed it raw until live #246 round 4, the last two dates in the app that
 * followed no setting.
 */
export function ReleaseNotes({
  release,
  frame = "card",
  headingAs,
  formatDate,
  labels: labelsProp,
  className,
  ...rest
}: ReleaseNotesProps) {
  const labels = useKitLabels("releaseNotes", DEFAULT_RELEASE_NOTES_LABELS, labelsProp);
  const day = useDayFormatter(formatDate);
  const level = headingAs ?? (frame === "card" ? "h2" : "h3");
  const Heading = level;

  const sections = release.sections
    .map((section) => {
      const key = section.key !== undefined ? section.key : changelogSectionKey(section.title);
      return { title: key ? labels.sections[key] : section.title, groups: groupByScope(section.items) };
    })
    .filter((section) => section.groups.length > 0);

  const notes = (
    <div className="space-y-3" data-slot="release-notes">
      {sections.map((section, s) => (
        // Two sections may share a title (a hand-written file), so the position keys it too.
        <section key={`${s}:${section.title}`} className="space-y-1.5">
          <SectionLabel as={BELOW[level]}>{section.title}</SectionLabel>
          <div className="space-y-1.5">
            {section.groups.map((group) => (
              <div key={group.scope ?? ""} className="text-sm" data-scope={group.scope ?? undefined}>
                {group.scope && (
                  // keksdose's square neutral chip, at the caption size it was drawn at.
                  <Chip size="sm" shape="square" className="me-1.5 px-1.5 align-[0.05em] text-caption font-medium">
                    {group.scope}
                  </Chip>
                )}
                {/* One note reads as a sentence beside its chip; several read as a list
                    under it. Always a list spent three lines saying one thing. */}
                {group.texts.length === 1 ? (
                  <span className="text-secondary">{group.texts[0]}</span>
                ) : (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-secondary">
                    {group.texts.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
      {sections.length === 0 && release.body && (
        <p className="whitespace-pre-line text-sm text-secondary">{release.body}</p>
      )}
    </div>
  );
  const date = release.date ? <time dateTime={release.date}>{day(release.date)}</time> : null;

  if (frame === "plain") {
    return (
      <div {...rest} className={cn("space-y-2", className)} data-release={release.version}>
        <div className="flex items-baseline justify-between gap-2">
          <Heading className="text-sm font-semibold text-primary">{labels.version(release.version)}</Heading>
          {date && <span className="text-xs text-muted">{date}</span>}
        </div>
        {notes}
      </div>
    );
  }
  return (
    <Card {...rest} padding="md" className={className} data-release={release.version}>
      <CardHeader>
        <CardTitle as={level} className="text-lg">
          {labels.version(release.version)}
        </CardTitle>
        {date && <CardAction className="self-baseline text-xs text-muted">{date}</CardAction>}
      </CardHeader>
      <div className="mt-2">{notes}</div>
    </Card>
  );
}
