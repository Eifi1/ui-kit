import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { DEFAULT_COLUMN_MAPPER_LABELS } from "../../components/column-mapper";
import { DEFAULT_POPOVER_LABELS } from "../../components/popover";

/**
 * The English catalogue is words, as the other six are (0.34, KS U8).
 *
 * `locales/en.ts` is built on `DEFAULT_UI_KIT_LABELS`, so whatever `defaults.ts` imports
 * is what an app's lazily fetched English brings with it. Until 0.33 that was 79
 * component modules — Kurvenschmiede measured ~40 chunks and 99 kB gzip for an English
 * reader where Spanish is one chunk of 17 kB. The defaults now live in `*-labels.ts`
 * modules with no component code; this walks the source graph the way a bundler would
 * and fails on the first module that is not one. `scripts/flatten-en.mjs` holds the same
 * line for the built file.
 */

const SRC = join(process.cwd(), "src");
/** Keep in step with `WORDS` in scripts/flatten-en.mjs. `kit-labels` is the provider:
 *  shared with every component rather than copied, but no component code either. */
const WORDS = [
  /\/src\/i18n\/locales\/en\.ts$/,
  /\/src\/i18n\/defaults\.ts$/,
  /\/src\/i18n\/kit-labels\.tsx$/,
  /-labels\.ts$/,
  /\/src\/auth\/auth-errors\.ts$/,
  /\/src\/wizard\/types\.ts$/,
];

const sourceOf = (base: string) =>
  [".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find((f) => existsSync(f));

/** The relative modules `file` loads at run time: `import type` and `export type` are
 *  erased, and so is an import whose every name is marked `type`. */
function runtimeImports(file: string): string[] {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  const specs: string[] = [];
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const clause = st.importClause;
      if (clause?.isTypeOnly) continue;
      const named = clause?.namedBindings;
      const onlyTypes =
        clause && !clause.name && named && ts.isNamedImports(named) && named.elements.every((e) => e.isTypeOnly);
      if (!onlyTypes) specs.push((st.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && !st.isTypeOnly) {
      specs.push((st.moduleSpecifier as ts.StringLiteral).text);
    }
  }
  return specs
    .filter((s) => s.startsWith("."))
    .map((s) => {
      const target = sourceOf(resolve(file, "..", s));
      if (!target) throw new Error(`${relative(SRC, file)}: cannot resolve ${s}`);
      return target;
    });
}

describe("the English catalogue's module graph", () => {
  it("reaches words and nothing else", () => {
    const reached = new Map<string, string[]>();
    const walk = (file: string, chain: string[]) => {
      if (reached.has(file)) return;
      reached.set(file, chain);
      for (const next of runtimeImports(file)) walk(next, [...chain, relative(SRC, next)]);
    };
    const entry = join(SRC, "i18n", "locales", "en.ts");
    walk(entry, ["i18n/locales/en.ts"]);

    const strays = [...reached]
      .filter(([file]) => !WORDS.some((re) => re.test(file.replaceAll("\\", "/"))))
      .map(([, chain]) => chain.join(" → "));
    expect(strays, "move the defaults into a *-labels.ts module beside the component").toEqual([]);
    // The walk saw the label modules at all (a resolver that found nothing passes the
    // filter above vacuously).
    expect(reached.size).toBeGreaterThan(80);
  });

  it("leaves every public name where it was: the component re-exports its defaults", () => {
    expect(DEFAULT_UI_KIT_LABELS.popover).toBe(DEFAULT_POPOVER_LABELS);
    expect(DEFAULT_UI_KIT_LABELS.columnMapper).toBe(DEFAULT_COLUMN_MAPPER_LABELS);
    // A helper that moved with its defaults keeps working from them.
    expect(DEFAULT_COLUMN_MAPPER_LABELS.requiredRoleShort?.("Date")).toBe("Date *");
  });
});
