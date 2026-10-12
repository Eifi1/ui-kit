import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { DEFAULT_UI_KIT_LABELS } from "../defaults";
import { DEFAULT_COLUMN_MAPPER_LABELS } from "../../components/column-mapper";
import { DEFAULT_POPOVER_LABELS } from "../../components/popover";
import { DEFAULT_WIZARD_LABELS, resolveWizardLabels } from "../../wizard/types";
import { DEFAULT_COMMON_LABELS, DEFAULT_FILE_LABELS } from "../kit-labels";

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
 *  shared with every component rather than copied, but no component code either. It is
 *  reached for its hooks (`useKitLabels` in a few `*-labels.ts`), never for words: since
 *  0.34 it holds no `DEFAULT_*` (see the last test). `wizard/types` left the list then. */
const WORDS = [
  /\/src\/i18n\/locales\/en\.ts$/,
  /\/src\/i18n\/defaults\.ts$/,
  /\/src\/i18n\/kit-labels\.tsx$/,
  /-labels\.ts$/,
  /\/src\/auth\/auth-errors\.ts$/,
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

/** Every module `locales/en.ts` loads at run time → the import chain that reaches it. */
function reachedFromEnglish(): Map<string, string[]> {
  const reached = new Map<string, string[]>();
  const walk = (file: string, chain: string[]) => {
    if (reached.has(file)) return;
    reached.set(file, chain);
    for (const next of runtimeImports(file)) walk(next, [...chain, relative(SRC, next)]);
  };
  walk(join(SRC, "i18n", "locales", "en.ts"), ["i18n/locales/en.ts"]);
  return reached;
}

describe("the English catalogue's module graph", () => {
  it("reaches words and nothing else", () => {
    const reached = reachedFromEnglish();

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
    // The provider's eleven and the wizard's moved too, and kept their names (round 0.34).
    expect(DEFAULT_UI_KIT_LABELS.common).toBe(DEFAULT_COMMON_LABELS);
    expect(DEFAULT_UI_KIT_LABELS.file).toBe(DEFAULT_FILE_LABELS);
    expect(DEFAULT_UI_KIT_LABELS.wizard).toBe(DEFAULT_WIZARD_LABELS);
    expect(resolveWizardLabels().next).toBe("Next");
  });

  it("keeps every DEFAULT_* in a *-labels.ts: the modules allowed for other reasons hold none", () => {
    // CONTRIBUTING's label-module rule had twelve exceptions until 0.34: eleven defaults
    // in the provider and one in wizard/types (round 0.34, DOC-6's sev-1 note).
    const holders = [...reachedFromEnglish().keys()]
      .filter((file) => !/-labels\.ts$/.test(file))
      .flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/^export const (DEFAULT_\w+)/gm)]
          .map((m) => m[1])
          .filter((name) => name !== "DEFAULT_UI_KIT_LABELS") // the registry itself
          .map((name) => `${relative(SRC, file)}: ${name}`),
      );
    expect(holders).toEqual([]);
  });
});
