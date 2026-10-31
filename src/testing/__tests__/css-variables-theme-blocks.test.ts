import { describe, expect, it } from "vitest";
import { stripCssComments, themeBlocks } from "../../eslint/role-utilities";
import { declaredCustomProperties } from "../css-variables";

/**
 * `declaredCustomProperties` leaves out a name declared only inside `@theme inline`, and
 * the blocks it leaves out are the kit's one block finder's (`themeBlocks`,
 * src/eslint/role-utilities.ts) — the finder scripts/gen-kit-css-variables.mjs builds
 * KIT_CSS_VARIABLES with. It had a brace-counting copy of its own, which a fix to either
 * (a new prelude form, a nested block) would have split from the generator's (0.52 code
 * review, src/testing/css-variables.ts).
 */
describe("declaredCustomProperties and the one @theme block finder", () => {
  const css = [
    "@theme inline reference { --a: x; @media (width >= 40rem) { --b: y; } }",
    "@theme { --c: z; }",
    "@theme static { --d: w; }",
    "/* @theme inline { --g: commented; } */",
    "@theme inline{ --e: v; }",
    ":root { --f: u; --a: declared-here-too; }",
  ].join("\n");

  /** The generator's rule: every `--name:` outside the inline blocks, comments skipped. */
  const generators = (text: string) => {
    let code = stripCssComments(text);
    for (const { start, end } of themeBlocks(code, { inline: true }).reverse())
      code = code.slice(0, start) + code.slice(end);
    return new Set([...code.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((m) => m[1]));
  };

  it("leaves out exactly the blocks themeBlocks calls inline, nested ones whole", () => {
    expect([...declaredCustomProperties(css)].sort()).toEqual(["--a", "--c", "--d", "--f"]);
    expect(declaredCustomProperties(css)).toEqual(generators(css));
  });
});
