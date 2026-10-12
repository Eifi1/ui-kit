// Release config for commit-and-tag-version: `npm run release` derives the next
// version from the Conventional Commits since the last tag, writes CHANGELOG.md and
// commits "chore(release): X.Y.Z". Same tool and shape as kastlan and keksdose.
//
// No `preset` key on purpose. commit-and-tag-version applies the options below and
// its pre-1.0 rule (a BREAKING CHANGE — `feat!:` or a `BREAKING CHANGE:` footer —
// bumps the MINOR, a feat the patch, while the version is 0.x) only when the preset is
// left at its default. Naming it, even as the default "conventionalcommits", skipped
// both: that is how kastlan went from v0.9.3 plus one breaking commit to v1.0.0.
//
// The size sweep gates the release (0.34, docs/text-size-harmonization.md §10.17), but
// from package.json's `release` script — `npm run check:sweep && commit-and-tag-version`
// — not from `scripts.prerelease` here: a lifecycle script runs under `exec`, which holds
// its output until it ends and prints only stderr, so a sweep of several minutes would
// run silent and fail without its TRUNCATED lines. `npm run release:dry` stays a quick,
// read-only preview and does not sweep.
//
// `.cjs` because this package is `"type": "module"`.
module.exports = {
  // Tagging happens on the MERGE commit on main, after the PR is merged (see
  // .github/workflows/release.yml and its tag/package.json guard) — not here.
  skip: { tag: true },
  // What counts as a reference to one of THIS repository's issues: only GitHub's own
  // spelling for it, `Eifi1/ui-kit#12`. Every bare `#NNN` in this history is an app's
  // number — keksdose's live row ("live #401"), a dev ticket ("dev#523") — which the
  // default prefix `#` linked as a ui-kit issue that does not exist, in the subject and
  // as "references [#401](…/ui-kit/issues/401)" after it (round 0.34 Q5). Write the
  // app's numbers as they are; they stay text.
  issuePrefixes: ["Eifi1/ui-kit#"],
  header: "# Changelog\n\nAll notable changes to `@eifi1/ui-kit`.\n\nThis package is pre-1.0 and three applications depend on it. The contract until 1.0:\n\n- **minor** (`0.x.0`) may remove or rename an export, change a prop's type, change an\n  emitted class name, or change a token's value. Each one is a breaking commit\n  (`feat!:` / `fix!:`, or a `BREAKING CHANGE:` footer) and is listed under\n  **⚠ BREAKING CHANGES**; the per-app migration is in `docs/adopt-0.x.md`.\n- **patch** (`0.x.y`) fixes behaviour without changing the public surface. The surface is\n  pinned by `src/__tests__/public-surface.test.ts`, so a name cannot leave it unnoticed.\n- Consumers pin `^0.x`, which npm treats as minor-locked below 1.0 — so a minor does not\n  reach an app until it asks for it.\n\nAn export is **deprecated for one minor before removal**: marked `@deprecated` in TSDoc\nwith the replacement named, listed here, then removed in the next minor.\n\nFrom 0.7.0 on, this file is generated from the Conventional Commits by `npm run release`\n(commit-and-tag-version); write the entry in the commit, not here.\n\n",
  types: [
    { type: "feat", section: "Added" },
    { type: "fix", section: "Fixed" },
    { type: "perf", section: "Changed" },
    { type: "refactor", section: "Changed" },
    { type: "revert", section: "Reverts" },
    { type: "docs", hidden: true },
    { type: "chore", hidden: true },
    { type: "test", hidden: true },
    { type: "style", hidden: true },
    { type: "ci", hidden: true },
    { type: "build", hidden: true },
  ],
};
