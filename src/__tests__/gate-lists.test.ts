// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GROUPS, META_TESTS, RELEASE_TESTS } from "../../scripts/check.mjs";

/**
 * The gates' own bookkeeping: the lists that name them, the release shortcut's tests, and
 * `check:meta`. Reads files only, so it runs in check:meta itself (TST-6, refactor audit
 * 2026-11-22); local-gates.test.ts keeps what drives git and the hooks.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scripts = (JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> })
  .scripts;

/** Every test file under src/, showcase/ and scripts/, relative to the root. */
function testFiles(dir = ROOT, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".") || entry.name.startsWith("dist")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir !== ROOT || ["src", "showcase", "scripts"].includes(entry.name)) testFiles(path, out);
    } else if (/\.test\.(?:[cm]?[jt]s|tsx)$/.test(entry.name)) out.push(relative(ROOT, path));
  }
  return out;
}

/**
 * A test that reads the repository's CHANGELOG.md, or package.json's `version`: the two
 * things a release commit changes. A scratch file of the same name (written, not read) and a
 * dependency's package.json under node_modules do not count.
 */
function readsReleaseFiles(text: string): boolean {
  if (/readFileSync\([^;]*["'`]CHANGELOG\.md["'`]/.test(text)) return true;
  for (const m of text.matchAll(
    /(const|let)\s+([\w{}\s,]+?)\s*=\s*JSON\.parse\(\s*readFileSync\(([^;]*?)["'`]package\.json["'`][^;]*;/g,
  )) {
    const [statement, , binding, path] = m;
    if (/node_modules/.test(path)) continue;
    if (/\bversion\b/.test(binding) || /\bversion\s*:/.test(statement)) return true;
    const name = binding.trim();
    if (/^\w+$/.test(name) && new RegExp(`\\b${name}\\.version\\b`).test(text)) return true;
  }
  return false;
}

/**
 * TST-1 (refactor audit 2026-11-22): the pre-push hook's release shortcut ran
 * deprecations.test.ts as "the one test that reads the version", and changelog.test.ts,
 * which reads CHANGELOG.md, came four days later. RELEASE_TESTS is the hook's list; this
 * finds every reader, so the next one cannot be missed.
 */
describe("the release shortcut's tests (TST-1)", () => {
  it("knows a reader when it sees one", () => {
    expect(readsReleaseFiles('const t = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");')).toBe(true);
    expect(
      readsReleaseFiles(
        'const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"), "utf8")) as { version: string };',
      ),
    ).toBe(true);
    expect(
      readsReleaseFiles('const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));\npkg.version;'),
    ).toBe(true);
    expect(readsReleaseFiles('const { version } = JSON.parse(readFileSync("package.json", "utf8"));')).toBe(true);
    // Written in a scratch repository, a dependency's manifest, the exports map.
    expect(readsReleaseFiles('writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\\n");')).toBe(false);
    expect(
      readsReleaseFiles(
        'const tm = JSON.parse(readFileSync(join(ROOT, "node_modules/tailwind-merge/package.json"), "utf8"));\ntm.version;',
      ),
    ).toBe(false);
    expect(
      readsReleaseFiles('const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));\npkg.exports;'),
    ).toBe(false);
  });

  it("names every test that reads CHANGELOG.md or package.json's version", () => {
    // This file aside: its own examples above read like readers.
    const self = relative(ROOT, fileURLToPath(import.meta.url));
    const readers = testFiles()
      .filter((file) => file !== self && readsReleaseFiles(readFileSync(join(ROOT, file), "utf8")))
      .sort();
    // The two it was written for, so an empty scan cannot pass.
    expect(readers).toEqual(
      expect.arrayContaining(["src/__tests__/deprecations.test.ts", "src/lib/__tests__/changelog.test.ts"]),
    );
    expect(readers.filter((file) => !RELEASE_TESTS.includes(file))).toEqual([]);
  });

  it("lists only test files that exist", () => {
    const all = new Set(testFiles());
    for (const file of RELEASE_TESTS) expect(all.has(file), file).toBe(true);
  });
});

/**
 * TST-9 (refactor audit 2026-10-30): the lists that NAME the gates had drifted from the
 * package.json scripts that ARE the gates — `format:check` ran first in check:static
 * for a release before any list said so, and ci.yml's lacked check:commit-rules and the
 * two inventories. Each list is read here and compared with the script, step for step.
 */
describe("the gate lists say what package.json runs (TST-9)", () => {
  /** A group's steps, as the lists name them. */
  const steps = (group: string) =>
    scripts[group].split(" && ").map((step) => {
      const npm = /^npm run (\S+)$/.exec(step);
      if (npm) return npm[1];
      const inventory = /^node scripts\/gen-(export|styling)-inventory\.mjs --check$/.exec(step);
      if (inventory) return `${inventory[1]} inventory`;
      return step;
    });
  /** The list on the line the group's name starts: `#   check:static  a · b`, `- \`check:static\`: a · b`. */
  const listed = (text: string, group: string) => {
    const line = new RegExp(`^(?:\\s*[#*-])?\\s*\`?${group}\`?:?\\s+(.+)$`, "m").exec(text)?.[1] ?? "";
    return line
      .replace(/\s*\(.*$/, "")
      .split(" · ")
      .map((s) => s.trim());
  };
  const docs = {
    "scripts/check.mjs": readFileSync(join(ROOT, "scripts/check.mjs"), "utf8"),
    ".github/workflows/ci.yml": readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8"),
    "CONTRIBUTING.md": readFileSync(join(ROOT, "CONTRIBUTING.md"), "utf8"),
  };

  it.each(GROUPS)("%s", (group) => {
    for (const [file, text] of Object.entries(docs)) expect(listed(text, group), file).toEqual(steps(group));
  });

  it("`npm run dev` rebuilds what `npm run build` builds, after tsup", () => {
    // It skipped flatten-en and the pay page: a dev build's en.js imported ~90 label modules.
    const after = scripts.build.split(" && ").slice(1);
    const onSuccess = /--onSuccess "([^"]+)"/.exec(scripts.dev.replace(/\\"/g, '"'))?.[1];
    expect(onSuccess?.split(" && ")).toEqual(after);
    expect(scripts.build.split(" && ")[0]).toMatch(/tsup/);
  });
});

/**
 * TST-6 (refactor audit 2026-11-22): the tests that check the repository's own bookkeeping
 * (the docs index, the component index, the gate lists, deprecations, the changelog) take
 * well under 2 s each but sat in the test group, which vitest runs longest-first: a missing
 * adopt-doc link was reported after a 7–10 minute run, twice in one month (0.54, 0.56).
 * check:meta runs them at the end of check:static, without coverage.
 */
describe("check:meta (TST-6)", () => {
  it("is check:static's last step, and runs META_TESTS", () => {
    expect(scripts["check:static"].split(" && ").at(-1)).toBe("npm run check:meta");
    expect(scripts["check:meta"]).toBe("node scripts/check.mjs --meta");
  });

  it("holds the bookkeeping tests, the release tests among them, and each exists", () => {
    const all = new Set(testFiles());
    for (const file of [
      ...RELEASE_TESTS,
      "src/__tests__/contracts.test.ts",
      "showcase/src/__tests__/component-index.test.ts",
      "src/__tests__/gate-lists.test.ts",
    ])
      expect(META_TESTS, file).toContain(file);
    for (const file of META_TESTS) expect(all.has(file), file).toBe(true);
  });
});
