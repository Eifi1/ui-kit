#!/usr/bin/env node
/**
 * The type declarations in dist/, read by the OLDEST TypeScript an app still compiles with.
 *
 * 0.56 builds the kit with TypeScript 6. The three apps move when they move (their trials on
 * 2026-11-05: an npm override and `baseUrl` each), and until then they read these `.d.ts`
 * files with 5.9. A declaration only 6 can read would fail an app's typecheck the day it
 * bumps the kit, and nothing here would have noticed: the kit's own typecheck runs 6.
 *
 * So this imports every entry point's declarations (the `exports` map's `types`, one
 * catalogue standing in for `./i18n/*`) into a scratch file and type-checks it, declaration
 * files included (`skipLibCheck: false`), with the floor version installed into its own
 * cache folder — never into node_modules/.bin, where its `tsc` would replace the kit's 6
 * (tried: an `npm:` alias does exactly that). Raise FLOOR when the last app moves on, and
 * drop the check once the floor is the kit's own version.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const FLOOR = "5.9.3";
const root = resolve(import.meta.dirname, "..");
const cache = join(root, "node_modules", ".cache", `typescript-${FLOOR}`);
const tsc = join(cache, "node_modules", "typescript", "lib", "tsc.js");

if (!existsSync(tsc)) {
  execFileSync("npm", ["install", "--no-save", "--no-audit", "--no-fund", "--prefix", cache, `typescript@${FLOOR}`], {
    stdio: "ignore",
  });
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const declarations = Object.entries(pkg.exports)
  .map(([key, value]) => [key, typeof value === "object" ? value.types : undefined])
  .filter(([, types]) => typeof types === "string")
  .map(([key, types]) => [key, types.replace("*", "de-CH")]);
if (!existsSync(join(root, declarations[0][1]))) {
  console.error("✖ check-consumer-types: dist/ has no declarations — run `npm run build` first.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "kit-consumer-types-"));
try {
  // The module beside each declaration (`index.js` for `index.d.ts`): a `.d.ts` cannot be
  // imported as a value, and an app imports the module, whose types this resolves to.
  const lines = declarations.map(
    ([, types], i) => `import * as e${i} from ${JSON.stringify(join(root, types.replace(/\.d\.ts$/, ".js")))};`,
  );
  lines.push(`export const all = [${declarations.map((_, i) => `e${i}`).join(", ")}];`);
  writeFileSync(join(dir, "check.ts"), lines.join("\n") + "\n");
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        module: "esnext",
        moduleResolution: "bundler",
        target: "es2022",
        jsx: "react-jsx",
        lib: ["dom", "dom.iterable", "es2023"],
        types: [],
        typeRoots: [join(root, "node_modules", "@types")],
      },
      files: ["check.ts"],
    }),
  );
  try {
    execFileSync(process.execPath, [tsc, "-p", dir], { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    console.error(`✖ TypeScript ${FLOOR} cannot read the kit's declarations:\n${error.stdout ?? error.message}`);
    process.exit(1);
  }
  console.log(`✓ TypeScript ${FLOOR} reads all ${declarations.length} entry points' declarations`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
