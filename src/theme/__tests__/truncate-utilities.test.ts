import { describe, expect, it } from "vitest";

/**
 * The two "truncate at Normal, wrap at Large" utilities in `tokens.css` (text size
 * §10.17; 0.33.1). `check:tailwind` proves Tailwind compiles both into the build; this
 * pins what each one declares, in the stylesheet an app imports.
 *
 * keksdose's 0.33 report (kk 13): `truncate-until-large` wraps with `overflow-wrap:
 * anywhere`, so at Large an amount in a narrow cell broke mid-number. Its sibling for
 * figures wraps at spaces only.
 */
const CSS = Object.values(
  import.meta.glob<string>("../../../tokens.css", { query: "?raw", import: "default", eager: true }),
)[0];

/** The body of `@utility <name> { … }`, nested blocks included. */
function utility(name: string): string {
  const head = `@utility ${name} {`;
  const start = CSS.indexOf(head);
  if (start === -1) throw new Error(`tokens.css has no @utility ${name}`);
  let depth = 0;
  for (let i = start + head.length - 1; i < CSS.length; i++) {
    if (CSS[i] === "{") depth++;
    else if (CSS[i] === "}" && --depth === 0) return CSS.slice(start + head.length, i);
  }
  throw new Error(`@utility ${name} is not closed`);
}

/** The declarations at Large: the `@variant large { … }` block's body. */
function atLarge(body: string): string {
  const match = /@variant large\s*\{([^}]*)\}/.exec(body);
  if (!match) throw new Error("no @variant large block");
  return match[1];
}

/** The declarations outside any nested block — what applies at Normal. */
function atNormal(body: string): string {
  return body.replace(/@variant[^{]*\{[^}]*\}/g, "");
}

const squash = (css: string) => css.replace(/\s+/g, " ").trim();

describe("tokens.css's truncate-until-large utilities", () => {
  it("truncate-until-large truncates at Normal and wraps anywhere at Large (prose)", () => {
    const body = utility("truncate-until-large");
    expect(squash(atNormal(body))).toBe("overflow: hidden; text-overflow: ellipsis; white-space: nowrap;");
    expect(squash(atLarge(body))).toBe("white-space: normal; overflow-wrap: anywhere;");
  });

  it("truncate-until-large-words truncates at Normal and wraps at spaces only at Large (figures)", () => {
    const body = utility("truncate-until-large-words");
    expect(squash(atNormal(body))).toBe("overflow: hidden; text-overflow: ellipsis; white-space: nowrap;");
    expect(squash(atLarge(body))).toBe("white-space: normal; overflow-wrap: normal;");
    // Nothing that would split a number: no `anywhere`, no `break-word`, no `word-break`.
    expect(body).not.toMatch(/anywhere|break-word|word-break/);
  });
});
