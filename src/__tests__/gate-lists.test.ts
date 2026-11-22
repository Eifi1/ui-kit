// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { RELEASE_TESTS } from "../../scripts/check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

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
