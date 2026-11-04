/**
 * Reading a generated changelog for a person (kastlan reuse audit 2026-11-02, proposal 1).
 *
 * All four repositories write CHANGELOG.md with `commit-and-tag-version`, and two apps
 * show it: keksdose on its changelog page and in the what's-new dialog (its backend
 * splits the file into releases, `changelog-format.ts` reads each bullet), kastlan on its
 * changelog page (`parse-changelog.ts`). kastlan's parser read the compare link's "(" as
 * the release date, so every release showed a GitHub URL, and left `**scope:**` and
 * `, closes [#12](…)` in the text. It fixed that with keksdose's rules (kastlan 153248c),
 * and those rules are here once, with what the four files still asked of them:
 *
 * ```
 * ## [0.13.9](https://github.com/…/compare/v0.13.8...v0.13.9) (2026-10-20)
 *
 * ### Added
 *
 * * **admin:** a company rename logs both names again ([8f698eb](https://…/commit/8f698eb…)), closes [#12](…)
 * ```
 *
 * reads as `{ version: "0.13.9", date: "2026-10-20", sections: [{ title: "Added", key:
 * "added", items: [{ scope: "admin", text: "a company rename logs both names again" }] }] }`.
 *
 *  - **Every heading shape the tool writes**: `## [x.y.z](compare) (date)`, the `###` it
 *    writes for a patch under the default template, and `## x.y.z (date)` without a link
 *    (the first release, which has nothing to compare with). The compare link is skipped
 *    before the date is read, and a date is `YYYY-MM-DD` or nothing. The hand-written
 *    shapes before a repository adopted the tool read too: `## [0.2.0] - 2026-04-10`,
 *    `## [0.6.1] — 2026-09-24`.
 *  - **One key per kind of section**, whichever names the repository's `.versionrc`
 *    gives it: "Added", "Fixed", "Changed" (the kit's, kastlan's, Kurvenschmiede's) and
 *    "Features", "Bug Fixes", "Performance Improvements" (the default preset's; keksdose
 *    writes "Performance") are the same three ({@link changelogSectionKey}).
 *  - **An item is its sentence**: the scope comes out as a value, the commit link and the
 *    trailing references go, and the rest of the markdown is resolved
 *    ({@link parseChangelogItem}).
 *  - **An item is all its lines**: a breaking change's note that runs on over several
 *    lines is one item, where both apps' parsers kept its first line ("…the beta
 *    allow-list and profile routes are").
 *
 * Pure string work, no React: the page that shows it is the app's.
 */

/**
 * What a section's heading means, whichever preset named it. `null` from
 * {@link changelogSectionKey} for a heading no preset writes ("Known", say): show its own
 * title then, rather than hide it behind a missing translation.
 */
export type ChangelogSectionKey =
  "breaking" | "added" | "changed" | "fixed" | "deprecated" | "removed" | "security" | "reverted";

/** One bullet: its conventional-commit scope and its sentence. */
export interface ChangelogItem {
  /** `**admin:**` → `"admin"`; `null` for a bullet with no scope. */
  scope: string | null;
  /** The sentence, without the commit link, the trailing references or any markdown. */
  text: string;
}

/** One `###` section of a release. */
export interface ChangelogSection {
  /** The heading as written: "Added", "Bug Fixes", "⚠ BREAKING CHANGES". */
  title: string;
  /** {@link changelogSectionKey} of the title. */
  key: ChangelogSectionKey | null;
  /** Never empty: a section whose bullets all read as nothing is left out. */
  items: ChangelogItem[];
}

/** One release, as the file lists them: newest first. */
export interface ChangelogRelease {
  /** `"0.13.9"`, without brackets. */
  version: string;
  /** The release day, `YYYY-MM-DD`, or `null` when the heading carries none. */
  date: string | null;
  sections: ChangelogSection[];
  /** The prose between the heading and the first section, as written; `null` when there
   *  is none. A hand-written release can carry its notes here alone. */
  body: string | null;
}

/** The items of one scope, from {@link groupByScope}. */
export interface ChangelogScopeGroup {
  scope: string | null;
  texts: string[];
}

// ── Items ─────────────────────────────────────────────────────────────────────

/** `([abc1234](https://…/commit/…))`, the generator's commit link. Four hex digits at
 *  least, git's shortest abbreviation. */
const COMMIT_LINK = /\s*\(\[[0-9a-f]{4,40}\]\([^)]*\)\)/gi;

/**
 * The trailing references, to the end of the line: every `, closes …` clause with EVERY
 * link to an issue after its word, or a run of such links with no word. Anchored at the
 * end, because a link inside the sentence is prose the author wrote; the run at the end
 * is machinery. `[^\]]*#\d+` reads `#455`, `dev#435` and `Eifi1/ui-kit#12` alike.
 *
 * The words are conventional-changelog's `referenceActions` (close, fix, resolve and their
 * inflections) and `references`, which conventional-changelog 8 writes where 7 wrote
 * `closes`: both spellings stay in a CHANGELOG.md for good, and keksdose's what's-new
 * dialog showed "…, references" after a bump that only knew `closes` (live #211). Version
 * 8 writes both clauses on one line — `, closes [#639](…), references [#405](…)` in
 * keksdose's 0.4.72 — so there can be more than one. A clause starts with the comma the
 * generator writes and a whole word, so "a quick fix" and "disclose" keep theirs.
 */
const TRAILING_REFS =
  /(?:(?:,\s*\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|references?)(?:\s*\[[^\]]*#\d+\]\([^)]*\))+)+|(?:\s*\[[^\]]*#\d+\]\([^)]*\))+)\s*$/i;

/** A leading scope: `**admin:**`, or `**admin**:`. The colon makes it one: a hand-written
 *  bullet that opens with a bold phrase (`**The path was wrong.** README …`) has none. */
const SCOPE = /^\*\*([^*:]+?)(?::\*\*|\*\*:)\s*/;

/** `[label](url)` inside the sentence: the label is what it meant. */
const INLINE_LINK = /\[([^\]]+)\]\([^)]*\)/g;

/**
 * One bullet, without its `* `, as its scope and its sentence:
 * `**admin:** a rename ([8f698eb](…)), closes [#12](…)` → `{ scope: "admin", text: "a
 * rename" }`. keksdose's rules (`changelog-format.ts`), which kastlan copied, with three
 * corrections the four files asked for: every reference clause goes, not the last alone;
 * a scope needs its colon; and a code span that opens with a dot keeps the space before
 * it.
 *
 * The commit link and the trailing references go BEFORE the general link rule, which
 * would unwrap them into bare hashes and issue numbers. Then emphasis and code spans are
 * resolved, and what the removals left is repaired: a space before punctuation that ends a
 * clause (not the one before a code span's `.mutate`), doubled spaces, and the comma that
 * introduced ", closes …".
 */
export function parseChangelogItem(line: string): ChangelogItem {
  let text = line.replace(COMMIT_LINK, "").replace(TRAILING_REFS, "");
  let scope: string | null = null;
  const scoped = SCOPE.exec(text);
  if (scoped) {
    // A hand-written label can carry code (`**`Autocomplete`:**`): plain, like the text.
    scope = plain(scoped[1]).trim();
    text = text.slice(scoped[0].length);
  }
  text = plain(text)
    .replace(/\s+([,.;:])(?=\s|$)/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/[,;:]+\s*$/, "")
    .trim();
  return { scope, text };
}

/** Links as their labels, emphasis and code spans as their text. */
function plain(markdown: string): string {
  return markdown
    .replace(INLINE_LINK, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/**
 * Items grouped by scope, in the order each scope first appears, with exact repeats
 * dropped (keksdose's `groupByScope`). A feature that lands over several commits gets a
 * bullet per commit; the same sentence twice goes, and two different sentences both stay —
 * whether they mean the same is not a regex's call. Takes raw bullets (keksdose's
 * backend sends them) or parsed items; an item that reads as nothing is left out.
 */
export function groupByScope(items: readonly (string | ChangelogItem)[]): ChangelogScopeGroup[] {
  const groups = new Map<string, ChangelogScopeGroup>();
  const seen = new Set<string>();
  for (const raw of items) {
    const { scope, text } = typeof raw === "string" ? parseChangelogItem(raw) : raw;
    if (!text) continue;
    const repeat = `${scope ?? ""}\u0000${text.toLowerCase()}`;
    if (seen.has(repeat)) continue;
    seen.add(repeat);
    const group = groups.get(scope ?? "") ?? { scope, texts: [] };
    group.texts.push(text);
    groups.set(scope ?? "", group);
  }
  return [...groups.values()];
}

// ── Sections ──────────────────────────────────────────────────────────────────

/** Each key's headings, lower-cased: the kit's `.versionrc.cjs` (and kastlan's and
 *  Kurvenschmiede's), the default preset, keksdose's, and Keep a Changelog's. */
const SECTION_NAMES: Record<ChangelogSectionKey, readonly string[]> = {
  breaking: ["breaking changes", "breaking"],
  added: ["added", "features", "feat"],
  changed: ["changed", "performance improvements", "performance", "code refactoring"],
  fixed: ["fixed", "bug fixes", "fixes"],
  deprecated: ["deprecated"],
  removed: ["removed"],
  security: ["security"],
  reverted: ["reverts", "reverted"],
};

const SECTION_KEYS = new Map(
  Object.entries(SECTION_NAMES).flatMap(([key, names]) => names.map((name) => [name, key as ChangelogSectionKey])),
);

/**
 * The key of a section's heading, for the app's own words: "Added" and "Features" are
 * `"added"`, "Fixed" and "Bug Fixes" `"fixed"`, "Changed", "Performance Improvements" and
 * keksdose's "Performance" `"changed"`, "⚠ BREAKING CHANGES" `"breaking"`, "Reverts"
 * `"reverted"`; Keep a Changelog's "Deprecated", "Removed" and "Security" are their own.
 * Case and a leading "⚠" don't count, nor a qualifier after a dash or in parentheses
 * ("Fixed — layout", "Deprecated (removed in 0.35)"). `null` for any other heading.
 */
export function changelogSectionKey(title: string): ChangelogSectionKey | null {
  const name = title
    .toLowerCase()
    .replace(/^[^\p{L}]+/u, "")
    .split(/\s+[—–-]\s+|\s*\(/)[0]
    .trim();
  return SECTION_KEYS.get(name) ?? null;
}

// ── Releases ──────────────────────────────────────────────────────────────────

const VERSION = String.raw`\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]*)?`;

/** A release heading: `##` (or `###`, a patch under the default template), the version
 *  bracketed with its compare link or bare, then the rest of the line. */
const RELEASE_HEADING = new RegExp(String.raw`^#{2,3}\s+(?:\[(${VERSION})\](?:\([^)]*\))?|(${VERSION}))(.*)$`);

/** The date in what follows the version, once the compare link is behind it. */
const DATE = /(?:^|[^\d-])(\d{4}-\d{2}-\d{2})(?![\d-])/;

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^[*-]\s+(.*)$/;
const NESTED_BULLET = /^\s+[*-]\s+/;
const FENCE = /^\s*(`{3,}|~{3,})/;

/** A section while its release is read: the bullets as written, continuations joined. */
interface OpenSection {
  title: string;
  bullets: string[];
}

/**
 * A CHANGELOG.md as its releases, in the file's order (newest first).
 *
 * What counts as what, line by line:
 *
 *  - a `##` or `###` heading with a version starts a release (see the module note for the
 *    shapes); any other `#` or `##` heading ends it, so an "Unreleased" block or the
 *    file's title is no release's;
 *  - inside a release, any other `###` heading starts a section, keyed by
 *    {@link changelogSectionKey};
 *  - a bullet at the start of the line is an item of its section. The lines straight
 *    after it continue it, indented or not, as a breaking change's note runs on; a blank
 *    line, a heading, a nested bullet or a code fence ends it. Nested bullets, prose
 *    inside a section and fenced code (where a `- ` line is a diff) are no item;
 *  - before the first section, the prose is the release's {@link ChangelogRelease.body}.
 *
 * A section whose items all read as nothing is left out, as kastlan's parser did.
 */
export function parseChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let release: ChangelogRelease | null = null;
  let sections: OpenSection[] = [];
  let section: OpenSection | null = null;
  let body: string[] = [];
  /** The bullet that later lines continue, as an index into `section.bullets`. */
  let open: number | null = null;
  /** The opening fence while inside a code block. */
  let fence: string | null = null;

  const close = () => {
    if (!release) return;
    release.body = body.join("\n").trim() || null;
    release.sections = sections
      .map((s) => ({
        title: s.title,
        key: changelogSectionKey(s.title),
        items: s.bullets.map(parseChangelogItem).filter((item) => item.text !== ""),
      }))
      .filter((s) => s.items.length > 0);
    releases.push(release);
    release = null;
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();

    if (fence !== null) {
      if (line.trimStart().startsWith(fence)) fence = null;
      continue;
    }
    const fenced = FENCE.exec(line);
    if (fenced) {
      fence = fenced[1];
      open = null;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      open = null;
      const released = RELEASE_HEADING.exec(line);
      if (released) {
        close();
        const [, bracketed, bare, rest] = released;
        release = { version: bracketed ?? bare, date: DATE.exec(rest)?.[1] ?? null, sections: [], body: null };
        sections = [];
        section = null;
        body = [];
      } else if (heading[1].length <= 2) {
        close();
      } else if (heading[1].length === 3 && release) {
        section = { title: heading[2], bullets: [] };
        sections.push(section);
      }
      continue;
    }
    if (!release) continue;

    if (line.trim() === "") {
      open = null;
      if (!section) body.push("");
      continue;
    }
    if (!section) {
      body.push(line);
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      open = section.bullets.push(bullet[1]) - 1;
    } else if (NESTED_BULLET.test(line)) {
      open = null;
    } else if (open !== null) {
      section.bullets[open] += ` ${line.trim()}`;
    }
  }
  close();
  return releases;
}
