import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  changelogSectionKey,
  groupByScope,
  parseChangelog,
  parseChangelogItem,
  type ChangelogRelease,
} from "../changelog";

/**
 * One changelog parser for the apps' release notes (0.55, kastlan reuse audit 2026-11-02,
 * proposal 1). Pinned on REAL lines: kastlan's, keksdose's and Kurvenschmiede's
 * CHANGELOG.md, commit-and-tag-version's own (the default template's patch heading), and
 * the kit's whole file, read as it is.
 */

const lines = (...rows: string[]) => rows.join("\n");

/** kastlan's CHANGELOG.md, 0.13.9 — the release heading its parser read as a URL. */
const KASTLAN_HEADING = "## [0.13.9](https://github.com/Eifi1/kastlan/compare/v0.13.8...v0.13.9) (2026-10-20)";
const KASTLAN_0_13_9 = lines(
  KASTLAN_HEADING,
  "",
  "",
  "### Added",
  "",
  "* **admin:** a company rename logs both names again ([8f698eb](https://github.com/Eifi1/kastlan/commit/8f698ebdeb9d2b47d2834732cefe42dc7245d01f))",
  "* **tours:** 38 new tours, from getting started to administration ([4c5ff05](https://github.com/Eifi1/kastlan/commit/4c5ff058fa7cc72cbc66bc47c8595b31518ce24d)), closes [#12](https://github.com/Eifi1/kastlan/issues/12)",
);

/** keksdose's CHANGELOG.md, the line live #211 quoted. */
const KEKSDOSE_QUOTED =
  "**accounts:** a Depot is worth its positions, and buying one moves the money " +
  "([3c1eb85](https://github.com/Eifi1/keksdose/commit/3c1eb853e4efab71fa5268820f0ba89926ae0ef6)), " +
  "closes [dev#435](https://github.com/Eifi1/dev/issues/435) " +
  "[#455](https://github.com/Eifi1/keksdose/issues/455) " +
  "[#457](https://github.com/Eifi1/keksdose/issues/457) " +
  "[#458](https://github.com/Eifi1/keksdose/issues/458)";

/** The release a list of releases is looked up in, by version. */
const release = (releases: ChangelogRelease[], version: string) => {
  const found = releases.find((r) => r.version === version);
  if (!found) throw new Error(`no release ${version}`);
  return found;
};

describe("parseChangelog: the release headings", () => {
  it("reads the date after kastlan's compare link, not the link", () => {
    // What kastlan's parser did before 153248c: the link's "(" opened the date.
    const before = /^##\s+\[?(?<version>\d+\.\d+\.\d+[^\s\]]*)\]?(?:\s*[-(]\s*(?<date>[^)\s]+))?/;
    expect(before.exec(KASTLAN_HEADING)?.groups?.date).toMatch(/^https:\/\/github\.com/);

    const [only] = parseChangelog(KASTLAN_0_13_9);
    expect(only).toMatchObject({ version: "0.13.9", date: "2026-10-20", body: null });
    expect(only.sections).toEqual([
      {
        title: "Added",
        key: "added",
        items: [
          { scope: "admin", text: "a company rename logs both names again" },
          { scope: "tours", text: "38 new tours, from getting started to administration" },
        ],
      },
    ]);
  });

  it("reads every shape: a ### patch, no link, a hand-written dash, no date", () => {
    const releases = parseChangelog(
      lines(
        // commit-and-tag-version's own CHANGELOG.md: the default template's patch heading.
        "### [10.0.1](https://github.com/absolute-version/commit-and-tag-version/compare/v10.0.0...v10.0.1) (2022-05-28)",
        "",
        "### Bug Fixes",
        "",
        "* No longer warn inappropriately when a custom updater is provided as an object ([5eb8886](https://github.com/absolute-version/commit-and-tag-version/commit/5eb8886a56c6b14c13544192edb3d0e18f91184a))",
        // kastlan's first generated release: nothing to compare with, so no link.
        "## 0.2.1 (2026-04-16)",
        "### Added",
        "* add changelog page, semantic versioning, password reveal, 2FA seed ([d33a445](https://github.com/Eifi1/property-management/commit/d33a445d9e5ea6556c4926a4d35f953d9a1b1309))",
        // kastlan's and the kit's hand-written releases.
        "## [0.2.0] - 2026-04-10",
        "## [0.6.1] — 2026-09-24",
        "## [0.4.1] and earlier",
      ),
    );
    expect(releases.map(({ version, date }) => [version, date])).toEqual([
      ["10.0.1", "2022-05-28"],
      ["0.2.1", "2026-04-16"],
      ["0.2.0", "2026-04-10"],
      ["0.6.1", "2026-09-24"],
      ["0.4.1", null],
    ]);
    expect(releases[0].sections).toEqual([
      {
        title: "Bug Fixes",
        key: "fixed",
        items: [{ scope: null, text: "No longer warn inappropriately when a custom updater is provided as an object" }],
      },
    ]);
    expect(releases[1].sections[0].items).toEqual([
      { scope: null, text: "add changelog page, semantic versioning, password reveal, 2FA seed" },
    ]);
  });

  it("keeps a release with no notes, and ends one at a heading that is no release", () => {
    const releases = parseChangelog(
      lines(
        "# Changelog",
        "",
        "* a bullet of the file's header, no release's",
        "## [Unreleased]",
        "### Added",
        "* not released yet",
        // Kurvenschmiede's 0.2.1: a release the generator wrote with nothing in it.
        "## [0.2.1](https://github.com/Eifi1/kurvenschmiede/compare/v0.2.0...v0.2.1) (2026-10-01)",
        "",
      ),
    );
    expect(releases).toEqual([{ version: "0.2.1", date: "2026-10-01", sections: [], body: null }]);
  });

  it("keeps the prose before the first section as the body", () => {
    // kastlan's test: a release of free text only.
    const [freeText] = parseChangelog(lines("## 0.2.1 (2026-04-16)", "", "Free text only."));
    expect(freeText.body).toBe("Free text only.");
    expect(freeText.sections).toEqual([]);
  });
});

describe("parseChangelog: the items", () => {
  it("joins a breaking change's note that runs on, indented (Kurvenschmiede) or not (kastlan)", () => {
    const [kurvenschmiede, kastlan] = parseChangelog(
      lines(
        "## [0.2.0](https://github.com/Eifi1/kurvenschmiede/compare/v0.1.2...v0.2.0) (2026-10-01)",
        "",
        "### ⚠ BREAKING CHANGES",
        "",
        "* a production deployment needs KURVENSCHMIEDE_DATA_KEYS",
        "  for the app and for the migration; JSONB/VARCHAR/TEXT content columns are",
        "  now BYTEA.",
        "* an instance with no allowlist no longer accepts signups",
        "  after its first account.",
        "## [0.12.0](https://github.com/Eifi1/kastlan/compare/v0.11.0...v0.12.0) (2026-10-08)",
        "",
        "",
        "### ⚠ BREAKING CHANGES",
        "",
        "* **sync:** /sync writes only what a named scope allows, under the services' rules",
        "* **user-admin:** /auth/users answers {users, total, mail_backend}; POST/DELETE",
        "/auth/users/{id}/roles and PATCH is_active/role are replaced by the actions;",
        "PATCH /platform/users/{id} by POST …/active.",
        "",
        "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
        "Claude-Session: https://claude.ai/code/session_01K4QRn2Z9Y6XmWshbrEcrJd",
      ),
    );
    expect(kurvenschmiede.sections).toEqual([
      {
        title: "⚠ BREAKING CHANGES",
        key: "breaking",
        items: [
          {
            scope: null,
            text: "a production deployment needs KURVENSCHMIEDE_DATA_KEYS for the app and for the migration; JSONB/VARCHAR/TEXT content columns are now BYTEA.",
          },
          { scope: null, text: "an instance with no allowlist no longer accepts signups after its first account." },
        ],
      },
    ]);
    // The commit's trailers, after a blank line, are no item.
    expect(kastlan.sections[0].items).toEqual([
      { scope: "sync", text: "/sync writes only what a named scope allows, under the services' rules" },
      {
        scope: "user-admin",
        text: "/auth/users answers {users, total, mail_backend}; POST/DELETE /auth/users/{id}/roles and PATCH is_active/role are replaced by the actions; PATCH /platform/users/{id} by POST …/active.",
      },
    ]);
  });

  it("reads no item out of a nested list, prose in a section, or fenced code", () => {
    // The kit's 0.7.0 and 0.5.0, cut down: a nested list under a breaking change, and a
    // diff whose `- ` lines are code.
    const [kit] = parseChangelog(
      lines(
        "## [0.7.0](https://github.com/Eifi1/ui-kit/compare/v0.6.1...v0.7.0) (2026-09-25)",
        "",
        "### ⚠ BREAKING CHANGES",
        "",
        "* **adopt:** 0.7.0 changes behaviour and types an app can depend on — migration per app in docs/archive/adopt/adopt-0.7.md.",
        '  - `HoverMenu` is a real menu: items are `role="menuitem"`, its `aria-label` is on `role="menu"`, default `align` is `"end"`.',
        '  - `FileDropzone` is a `role="group"`; the keyboard path is its Browse button.',
        "",
        "* **adopt:** per-app adoption notes for 0.7.0 ([a6f165e](https://github.com/Eifi1/ui-kit/commit/a6f165e80fa0df159da50f46b7b9bc8c387adc81))",
        "",
        "### Breaking — accessibility roles",
        "",
        "Tests that query a picker by its old role fail:",
        "",
        "```diff",
        '- screen.getByRole("button", { name: /CHF/ })',
        '+ screen.getByRole("combobox", { name: /CHF/ })',
        "```",
        "- **`CurrencySelect` is a combobox.**",
      ),
    );
    expect(kit.sections.map((s) => [s.key, s.items])).toEqual([
      [
        "breaking",
        [
          {
            scope: "adopt",
            text: "0.7.0 changes behaviour and types an app can depend on — migration per app in docs/archive/adopt/adopt-0.7.md.",
          },
          { scope: "adopt", text: "per-app adoption notes for 0.7.0" },
        ],
      ],
      ["breaking", [{ scope: null, text: "CurrencySelect is a combobox." }]],
    ]);
  });

  it("leaves out a section whose items all read as nothing", () => {
    const [only] = parseChangelog(
      lines(
        "## 1.0.0 (2026-01-01)",
        "### Known — the categorical chart ramp trades contrast for separability",
        "Prose, and no bullet.",
        "### Fixed",
        "* [#455](https://github.com/Eifi1/keksdose/issues/455)",
      ),
    );
    expect(only.sections).toEqual([]);
  });

  it("reads CRLF line ends", () => {
    const [only] = parseChangelog(KASTLAN_0_13_9.replace(/\n/g, "\r\n"));
    expect(only.date).toBe("2026-10-20");
    expect(only.sections[0].items[1].text).toBe("38 new tours, from getting started to administration");
  });
});

describe("parseChangelogItem", () => {
  it("leaves nothing of the machinery on the line keksdose's live #211 quoted", () => {
    expect(parseChangelogItem(KEKSDOSE_QUOTED)).toEqual({
      scope: "accounts",
      text: "a Depot is worth its positions, and buying one moves the money",
    });
  });

  it.each([
    [
      "keksdose 0.4.39, the new generator's `references`",
      "**admin:** every scheduled job's failure is readable without a mouse ([c7111c7](https://github.com/Eifi1/keksdose/commit/c7111c78b8c211bc0dcace710405cea4fd360406)), references [#228](https://github.com/Eifi1/keksdose/issues/228)",
      { scope: "admin", text: "every scheduled job's failure is readable without a mouse" },
    ],
    [
      "Kurvenschmiede, `references`",
      "**charts:** every facing pair stands in one frame; a loaded one stacks below lg on two left axes ([3616f68](https://github.com/Eifi1/kurvenschmiede/commit/3616f68f951583c93a2a85089126cab83ac358ae)), references [#90](https://github.com/Eifi1/kurvenschmiede/issues/90)",
      { scope: "charts", text: "every facing pair stands in one frame; a loaded one stacks below lg on two left axes" },
    ],
    [
      "kastlan, `closes`",
      "**finance:** the handover page's signatures and previous defects as cards of their own ([07852f0](https://github.com/Eifi1/kastlan/commit/07852f0699593ff4c993ede7ae31f95cc680c6e0)), closes [#22](https://github.com/Eifi1/kastlan/issues/22)",
      { scope: "finance", text: "the handover page's signatures and previous defects as cards of their own" },
    ],
    [
      "the kit, code spans resolved",
      "**hotkeys:** a contenteditable ancestor counts as typing where `isContentEditable` is missing ([d74a569](https://github.com/Eifi1/ui-kit/commit/d74a569403bf1a2d5f1023c9fee740102a82a66b))",
      { scope: "hotkeys", text: "a contenteditable ancestor counts as typing where isContentEditable is missing" },
    ],
  ])("%s", (_, line, expected) => {
    expect(parseChangelogItem(line)).toEqual(expected);
  });

  it("drops both clauses conventional-changelog 8 writes on one line (keksdose 0.4.72)", () => {
    expect(
      parseChangelogItem(
        "**invoices:** the receipt's account and payee fields line up at the top when a hint shows ([039ffda](https://github.com/Eifi1/keksdose/commit/039ffda127f80b8b4550f58383c4be933f007d13)), closes [#639](https://github.com/Eifi1/keksdose/issues/639), references [#405](https://github.com/Eifi1/keksdose/issues/405) [#477](https://github.com/Eifi1/keksdose/issues/477)",
      ),
    ).toEqual({
      scope: "invoices",
      text: "the receipt's account and payee fields line up at the top when a hint shows",
    });
  });

  it("keeps an action's letters that are no clause: no comma, or inside a word", () => {
    const ref = "[#5](https://github.com/Eifi1/keksdose/issues/5)";
    expect(parseChangelogItem(`a quick fix ${ref}`).text).toBe("a quick fix");
    expect(parseChangelogItem(`what the logs disclose ${ref}`).text).toBe("what the logs disclose");
    // A reference inside the sentence stays, as its label, before a clause that goes.
    expect(parseChangelogItem(`the fix for ${ref}, closes ${ref}`).text).toBe("the fix for #5");
  });

  it("drops every reference action conventional-changelog writes", () => {
    for (const action of ["close", "closes", "closed", "fix", "fixes", "fixed", "resolve", "resolves", "resolved"]) {
      expect(
        parseChangelogItem(`**x:** a subject, ${action} [#7](https://github.com/Eifi1/keksdose/issues/7)`),
        action,
      ).toEqual({ scope: "x", text: "a subject" });
    }
    // A run of references with no word in front, and the kit's own issue prefix.
    expect(
      parseChangelogItem(
        "**budget:** goal cadence [#181](https://github.com/Eifi1/keksdose/issues/181) [Eifi1/ui-kit#12](https://github.com/Eifi1/ui-kit/issues/12)",
      ).text,
    ).toBe("goal cadence");
  });

  it("keeps a link the author wrote inside the sentence, as its label", () => {
    expect(
      parseChangelogItem(
        "**docs:** see the [privacy note](https://example.test/p) before switching ([abc1234](https://github.com/x/commit/abc1234))",
      ),
    ).toEqual({ scope: "docs", text: "see the privacy note before switching" });
  });

  it("reads the scope written either way, and a bullet with none", () => {
    expect(parseChangelogItem("**admin**: a rename").scope).toBe("admin");
    expect(parseChangelogItem("a one-off note ([abc1234](https://x/commit/abc1234))")).toEqual({
      scope: null,
      text: "a one-off note",
    });
  });

  it("reads no scope in a bold opening phrase, and keeps the space before a `.mutate`", () => {
    // The kit's hand-written 0.5.x bullets, and its 0.53.0 breaking change.
    expect(
      parseChangelogItem(
        "**The documented Tailwind `@source` path was wrong, and it renders the kit unstyled.** README and ADOPTING.md pointed at `node_modules/@eifi1/ui-kit/src`",
      ),
    ).toEqual({
      scope: null,
      text: "The documented Tailwind @source path was wrong, and it renders the kit unstyled. README and ADOPTING.md pointed at node_modules/@eifi1/ui-kit/src",
    });
    expect(parseChangelogItem("SignChip, lib/isin, the feedback `.mutate` form and FeedbackComposer*").text).toBe(
      "SignChip, lib/isin, the feedback .mutate form and FeedbackComposer*",
    );
  });
});

describe("changelogSectionKey", () => {
  it.each([
    // The kit's .versionrc.cjs (and kastlan's, Kurvenschmiede's) and the default preset.
    ["Added", "added"],
    ["Features", "added"],
    ["Fixed", "fixed"],
    ["Bug Fixes", "fixed"],
    ["Changed", "changed"],
    ["Performance Improvements", "changed"],
    // keksdose's perf section, and the reverts the kit and Kurvenschmiede name apart.
    ["Performance", "changed"],
    ["Reverts", "reverted"],
    ["Reverted", "reverted"],
    ["⚠ BREAKING CHANGES", "breaking"],
    // Keep a Changelog's, and the kit's hand-written headings with a qualifier.
    ["Deprecated (removed in 0.35)", "deprecated"],
    ["Removed", "removed"],
    ["Security", "security"],
    ["Fixed — `--money-expense` failed WCAG AA as text", "fixed"],
    ["Breaking — accessibility roles", "breaking"],
    ["Changed — review before upgrading", "changed"],
  ] as const)("%s → %s", (title, key) => {
    expect(changelogSectionKey(title)).toBe(key);
  });

  it("answers null for a heading no preset writes", () => {
    expect(changelogSectionKey("Known — consuming apps need a one-line fix")).toBeNull();
    expect(changelogSectionKey("Something Nobody Planned")).toBeNull();
  });
});

describe("groupByScope", () => {
  it("collects a scope's items under it, in first-appearance order, from raw bullets", () => {
    expect(
      groupByScope([
        "**accounts:** deleting an account ([aaa1111](https://x/commit/aaa1111))",
        "**budget:** goal cadence ([bbb2222](https://x/commit/bbb2222))",
        "**accounts:** summed balances ([ccc3333](https://x/commit/ccc3333))",
        "a note with no scope",
      ]),
    ).toEqual([
      { scope: "accounts", texts: ["deleting an account", "summed balances"] },
      { scope: "budget", texts: ["goal cadence"] },
      { scope: null, texts: ["a note with no scope"] },
    ]);
  });

  it("takes parsed items, drops an exact repeat, and keeps a near one", () => {
    const [kastlan] = parseChangelog(KASTLAN_0_13_9);
    expect(
      groupByScope([
        ...kastlan.sections[0].items,
        { scope: "admin", text: "A company rename logs both names again" },
        { scope: "admin", text: "a company rename logs both names again, and its logo" },
      ]),
    ).toEqual([
      {
        scope: "admin",
        texts: ["a company rename logs both names again", "a company rename logs both names again, and its logo"],
      },
      { scope: "tours", texts: ["38 new tours, from getting started to administration"] },
    ]);
  });

  it("leaves out an item that reads as nothing", () => {
    expect(groupByScope(["[#455](https://github.com/Eifi1/keksdose/issues/455)"])).toEqual([]);
  });
});

/**
 * The kit's own CHANGELOG.md, as it stands: generated from 0.7.0 on, hand-written before,
 * with every shape above in it — nested lists, fenced diffs, tables, a release with no date.
 */
describe("the kit's CHANGELOG.md", () => {
  const text = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
  const releases = parseChangelog(text);
  const items = releases.flatMap((r) => r.sections.flatMap((s) => s.items));

  it("has a release for every release heading, each with a version", () => {
    const headings = text.split("\n").filter((line) => /^#{2,3} \[?\d+\.\d+\.\d+/.test(line));
    expect(releases.length).toBe(headings.length);
    expect(releases.length).toBeGreaterThan(80);
    expect(releases.every((r) => /^\d+\.\d+\.\d+$/.test(r.version))).toBe(true);
  });

  it("dates every release but the last, and never with a link", () => {
    expect(releases.slice(0, -1).every((r) => r.date !== null && /^\d{4}-\d{2}-\d{2}$/.test(r.date))).toBe(true);
    expect(releases.at(-1)).toMatchObject({
      version: "0.4.1",
      date: null,
      sections: [],
      body: "No changelog was kept. `git log` is the record.",
    });
  });

  it("leaves no commit link, reference, scope, emphasis or fenced code in any item", () => {
    expect(items.length).toBeGreaterThan(500);
    const machinery = items.filter(
      ({ scope, text }) =>
        text.includes("](") ||
        text.startsWith("**") ||
        text.includes("/commit/") ||
        /(?:closes|references)$/.test(text) ||
        // a line of the fenced diffs
        /^[-+] |getByRole/.test(text) ||
        // a sentence read as a scope, or a scope left in markdown
        (scope !== null && (/[`*]/.test(scope) || scope.endsWith("."))),
    );
    expect(machinery).toEqual([]);
  });

  it("keys every section of the generated releases", () => {
    const generated = releases.slice(0, releases.findIndex((r) => r.version === "0.7.0") + 1);
    const unkeyed = generated.flatMap((r) => r.sections.filter((s) => s.key === null).map((s) => s.title));
    expect(unkeyed).toEqual([]);
  });

  it("reads 0.53.0's breaking change whole, and 0.6.0's prose as its body", () => {
    expect(release(releases, "0.53.0").sections[0]).toMatchObject({
      key: "breaking",
      items: expect.arrayContaining([
        {
          scope: null,
          text: "everything 0.52 deprecated is gone: RoleSwitcher, SectionNav, the FieldSync family, SignChip, lib/isin, the feedback .mutate form and FeedbackComposer*, onOpenChange and onPick, DateRangeCommit, and 55 names no app read. docs/adopt-0.53.md lists each with its replacement.",
        },
      ]),
    });
    const hand = release(releases, "0.6.0");
    expect(hand.date).toBe("2026-09-24");
    expect(hand.body).toMatch(/^The inputs keksdose, kastlan and lenkbank still hand-rolled after adopting 0\.5/);
    expect(hand.sections.map((s) => s.key)).toEqual(["added", "fixed", "changed"]);
  });
});
