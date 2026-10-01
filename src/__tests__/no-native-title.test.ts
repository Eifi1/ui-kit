import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * One tooltip implementation everywhere (keksdose dev#523): no native `title` attribute
 * on a DOM element anywhere in the kit's source. A title opens on hover after a delay
 * the browser picks, looks like nothing else in the kit, and never opens on touch.
 * 0.16.0 shipped one anyway (FileButton's picked-file read-out) and keksdose's own guard
 * caught it; this is the kit catching it first.
 *
 * Scans every non-test .tsx under src/ for an intrinsic (lower-case) JSX element that
 * carries `title=`. Component props named `title` (`<Card title>`, `<EmptyState title>`)
 * are capitalised and not matched. The one allowed case is an explicit opt-in the
 * caller asks for by name.
 */
const ALLOWED: Record<string, string> = {
  "components/floating-panel.tsx": "nativeTitle — the caller opts into a native title by name",
};

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "test" ? [] : sources(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const ROOT = join(__dirname, "..");
// An intrinsic element's opening tag, up to its end, and a `title=` inside it.
const INTRINSIC_WITH_TITLE = /<([a-z][a-z0-9]*)\b(?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?\btitle=/g;

describe("no native title tooltips in the kit", () => {
  it("finds none outside the allowed opt-ins", () => {
    const offenders: string[] = [];
    for (const file of sources(ROOT)) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
      if (ALLOWED[rel]) continue;
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(INTRINSIC_WITH_TITLE)) {
        const line = text.slice(0, match.index).split("\n").length;
        offenders.push(`${rel}:${line} <${match[1]} title=…>`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
