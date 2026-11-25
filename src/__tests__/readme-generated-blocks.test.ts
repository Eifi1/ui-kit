// @vitest-environment node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The README is the npm landing page, and the apps' agents read it from node_modules. From
 * 0.63 to 0.65.1 it shipped a stale second copy of 426 lines (refactor audit 2026-11-22,
 * DOC-1): the tail of an older export inventory, with its own END marker, then older copies of
 * "Forms / refs", "Offline and sync", "Accounts" and "i18n" that contradicted the current
 * peer guidance. Both generators spliced between the first BEGIN and the first END, and
 * `--check` compared only that block, so it passed and every regeneration kept the tail.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const work = mkdtempSync(join(tmpdir(), "uikit-readme-blocks-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

/** The README's `## ` headings, fenced code left out. */
function headings(markdown: string): string[] {
  let fenced = false;
  const out: string[] = [];
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced && line.startsWith("## ")) out.push(line.slice(3).trim());
  }
  return out;
}

const GENERATORS = [
  {
    script: "scripts/gen-export-inventory.mjs",
    begin: "<!-- BEGIN GENERATED: exports — node scripts/gen-export-inventory.mjs -->",
    end: "<!-- END GENERATED: exports -->",
    files: ["scripts/gen-export-inventory.mjs"],
  },
  {
    script: "scripts/gen-styling-inventory.mjs",
    begin: "<!-- BEGIN GENERATED: styling — node scripts/gen-styling-inventory.mjs -->",
    end: "<!-- END GENERATED: styling -->",
    files: ["scripts/gen-styling-inventory.mjs", "src/eslint/role-utilities.ts", "tokens.css"],
  },
];

/** Runs a generator in a scratch copy of the repository's layout, over the README given. */
function run(gen: (typeof GENERATORS)[number], readme: string, args: string[] = []) {
  const dir = mkdtempSync(join(work, "repo-"));
  for (const file of gen.files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(dir, file));
  }
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "dir");
  writeFileSync(join(dir, "README.md"), readme);
  const r = spawnSync(process.execPath, [join(dir, gen.script), ...args], { cwd: dir, encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr, readme: readFileSync(join(dir, "README.md"), "utf8") };
}

describe("README's generated blocks (refactor audit 2026-11-22, DOC-1)", () => {
  it("has each `## ` heading once", () => {
    const all = headings(readFileSync(join(ROOT, "README.md"), "utf8"));
    const twice = all.filter((h, i) => all.indexOf(h) !== i);
    expect(twice).toEqual([]);
  });

  it("has each generated block's BEGIN and END marker exactly once", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    for (const gen of GENERATORS) {
      expect(readme.split(gen.begin).length - 1, gen.begin).toBe(1);
      expect(readme.split(gen.end).length - 1, gen.end).toBe(1);
    }
  });

  for (const gen of GENERATORS) {
    describe(gen.script, () => {
      const stray = (b: string, e: string) => `# Kit\n\n${b}\n${e}\n\nstale tail\n\n${e}\n\n## i18n\n`;

      it("exits 2 on a second END marker, with and without --check, and leaves the README alone", () => {
        const readme = stray(gen.begin, gen.end);
        for (const args of [[], ["--check"]]) {
          const r = run(gen, readme, args);
          expect(r.status, r.out).toBe(2);
          expect(r.out).toMatch(/exactly once/);
          expect(r.readme).toBe(readme);
        }
      });

      it("exits 2 on a second BEGIN marker", () => {
        const readme = `# Kit\n\n${gen.begin}\n${gen.end}\n\n${gen.begin}\nold\n`;
        const r = run(gen, readme, ["--check"]);
        expect(r.status, r.out).toBe(2);
        expect(r.out).toMatch(/exactly once/);
      });

      it("exits 2 on an END before its BEGIN", () => {
        const r = run(gen, `# Kit\n\n${gen.end}\n\n${gen.begin}\n`, ["--check"]);
        expect(r.status, r.out).toBe(2);
      });
    });
  }
});
