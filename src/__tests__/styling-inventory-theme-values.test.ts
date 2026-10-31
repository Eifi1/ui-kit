// @vitest-environment node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/**
 * The README's "Theme values" line (scripts/gen-styling-inventory.mjs) lists the plain
 * `@theme { … }` blocks of tokens.css: the font sizes and breakpoints. DUP-13 moved it onto
 * the shared block finder as "the first block without `inline`", which took in
 * `@theme static`, `reference` and `default` (the old `/@theme\s*\{/` did not) and dropped
 * any later plain block (0.52 code review): a `@theme static { --color-x }` above the real
 * block put its variable where the font sizes were, and they left the table with no error.
 *
 * The script runs for real in a scratch copy of the repository's layout: itself,
 * src/eslint/role-utilities.ts (which it loads from source), a tokens.css and a README.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const work = mkdtempSync(join(tmpdir(), "uikit-styling-inventory-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

const BEGIN = "<!-- BEGIN GENERATED: styling — node scripts/gen-styling-inventory.mjs -->";
const END = "<!-- END GENERATED: styling -->";

function themeValues(tokens: string) {
  const dir = mkdtempSync(join(work, "repo-"));
  for (const file of ["scripts/gen-styling-inventory.mjs", "src/eslint/role-utilities.ts"]) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(dir, file));
  }
  writeFileSync(join(dir, "tokens.css"), tokens);
  writeFileSync(join(dir, "README.md"), `# Kit\n\n${BEGIN}\n${END}\n`);
  const r = spawnSync(process.execPath, [join(dir, "scripts/gen-styling-inventory.mjs")], {
    cwd: dir,
    encoding: "utf8",
  });
  expect(r.status, r.stdout + r.stderr).toBe(0);
  return /^Theme values: (.*)\.$/m.exec(readFileSync(join(dir, "README.md"), "utf8"))?.[1] ?? "";
}

describe("the styling inventory's theme values (0.52 code review)", () => {
  it("lists every plain @theme block, and no static, reference or default one", () => {
    const values = themeValues(
      [
        "@theme static { --color-x: #fff; }",
        "@theme reference { --color-y: #000; }",
        "@theme { --text-sm: 0.875rem; --breakpoint-md: 48rem; }",
        "@theme inline { --text-color-muted: var(--text-muted); }",
        ":root { --text-muted: #555; }",
        "@theme { --text-lg: 1.125rem; }",
      ].join("\n"),
    );
    expect(values).toBe(
      "`text-sm` (font size 0.875rem), `md:` (breakpoint, 48rem at Normal), `text-lg` (font size 1.125rem)",
    );
  });
});
