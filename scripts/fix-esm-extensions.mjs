// Append explicit .js extensions to relative import specifiers in dist/.
//
// tsup with `bundle: false` (which this package needs — see tsup.config.ts)
// transpiles each module in place but leaves specifiers exactly as TypeScript
// wrote them, i.e. extensionless: `from "./lib/cn"`. A bundler resolves that,
// so the sibling apps never noticed, but it is invalid ESM for Node and for any
// consumer using "moduleResolution": "node16" — which matters now that this
// package is published publicly rather than linked over `file:`.
//
// Rewrites .js and .d.ts alike, and only where the target actually resolves to
// a file on disk, so a wrong guess fails loudly at build time instead of
// shipping a broken specifier.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const SPEC = /(from\s*|import\s*\(\s*)"(\.\.?\/[^"]*)"/g;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (p.endsWith(".js") || p.endsWith(".d.ts")) yield p;
  }
}

let patched = 0;
let rewritten = 0;
for await (const file of walk("dist")) {
  const src = await readFile(file, "utf8");
  const isDts = file.endsWith(".d.ts");
  const out = src.replace(SPEC, (whole, lead, spec) => {
    if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return whole;
    const base = resolve(dirname(file), spec);
    const target = isDts ? `${base}.d.ts` : `${base}.js`;
    if (!existsSync(target)) {
      throw new Error(`${file}: cannot resolve "${spec}" (looked for ${target})`);
    }
    rewritten++;
    return `${lead}"${spec}.js"`;
  });
  if (out !== src) {
    await writeFile(file, out);
    patched++;
  }
}
console.log(`ESM extensions: rewrote ${rewritten} specifiers across ${patched} files`);
