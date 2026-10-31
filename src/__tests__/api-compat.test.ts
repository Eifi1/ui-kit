// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  adoptTextSince,
  compareApi,
  isNamed,
  mustChangeNames,
  previousRelease,
} from "../../scripts/check-api-compat.mjs";

/**
 * `check:api` (scripts/check-api-compat.mjs; refactor audit 2026-10-30, API-1): the public
 * types against the last release's, and the adopt doc that must name each change. Proven
 * on the published releases (0.50.0 → 0.50.1 flags `TourLauncher` and
 * `UseTourUrlSyncOptions`; 0.49.0 → 0.50.0 `TourStep`, `TourPlacement` and
 * `UseTourUrlSyncOptions`), pinned here on two small packages.
 */
const work = mkdtempSync(join(tmpdir(), "uikit-api-test-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

function pkg(name: string, dts: string) {
  const dir = join(work, name);
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } } }),
  );
  writeFileSync(join(dir, "dist", "index.d.ts"), dts);
  return dir;
}

const OLD = pkg(
  "old",
  `
export type Launcher = (id: string, start: () => void) => void;
export type Variant = "default" | "primary" | "accent";
export interface ButtonProps { variant?: Variant; label: string }
export declare function Button(props: ButtonProps): null;
export interface Step { title: string; beforeStep?: () => void }
export interface InputProps { value: number }
export declare function Input(props: InputProps): null;
export interface WidgetLabels { close: string }
export declare function format(value: number, unit?: string): string;
export declare const LIMIT: 10;
export declare function gone(): void;
export interface EngineOptions { db: string }
export interface Box<T> { value: T }
`,
);
const NEW = pkg(
  "new",
  `
export type Launcher = (id: string, start: () => void, engine: object) => void;
export type Variant = "default" | "accent";
export interface ButtonProps { variant?: Variant; label: string }
export declare function Button(props: ButtonProps): null;
export interface Step { title: string; beforeStep?: (ctx: { via: string }) => void }
export interface InputProps { value: number; [key: \`data-\${string}\`]: string | undefined }
export declare function Input(props: InputProps): null;
export interface WidgetLabels { close: string; open: string }
export declare function format(value: number, unit?: string, digits?: number): string;
export declare const LIMIT: 10;
export interface EngineOptions<D extends string = string> { db: D; rounds: number }
export interface Box<T> { value: T; label?: string }
`,
);

describe("compareApi", () => {
  const changes = compareApi(OLD, NEW);
  const byName = new Map(changes.map((c) => [c.name, c]));

  it("flags a callback type that gained a required parameter (0.50.1's TourLauncher)", () => {
    expect(byName.get("Launcher")).toMatchObject({
      kind: "type (what an app receives or calls)",
      detail: "requires 3 arguments, was 2 (engine)",
      through: [],
    });
  });

  it("flags a callback member an app calls with fewer arguments (0.50.0's beforeStep)", () => {
    expect(byName.get("Step")?.detail).toMatch(/`beforeStep`/);
    expect(byName.get("Step")?.through).toEqual([]);
  });

  it("flags a union that lost a member, and what only shows it through", () => {
    expect(byName.get("Variant")).toMatchObject({ detail: 'no longer takes "primary"', through: [] });
    expect(byName.get("ButtonProps")?.through).toEqual(["Variant"]);
    expect(byName.get("Button")?.through).toEqual(["ButtonProps"]);
  });

  it("compares a generic type as an app writes it, with its defaults (0.46.1's SyncEngineOptions)", () => {
    expect(byName.get("EngineOptions")).toMatchObject({
      kind: "type (what an app passes)",
      detail: "`rounds` is new and required",
    });
    // `Box<T>` gained an optional member: nothing to announce.
    expect(byName.has("Box")).toBe(false);
  });

  it("flags an export that is gone", () => {
    expect(byName.get("gone")).toMatchObject({ kind: "gone", detail: "removed" });
  });

  it("leaves out what breaks no app: an optional parameter, a new label key, an added index signature, the same", () => {
    for (const name of ["format", "WidgetLabels", "InputProps", "Input", "LIMIT"])
      expect(byName.has(name), name).toBe(false);
  });
});

describe("previousRelease", () => {
  it("is the version itself between releases, the one before it on a release commit", () => {
    const published = ["0.50.1", "0.51.6", "0.51.7", "0.9.0"];
    expect(previousRelease("0.51.7", published)).toBe("0.51.7");
    expect(previousRelease("0.52.0", published)).toBe("0.51.7");
    expect(previousRelease("0.51.0", published)).toBe("0.50.1");
    expect(previousRelease("0.1.0", published)).toBeNull();
  });
});

describe("the adopt doc", () => {
  const doc = [
    "# Adopting 0.52",
    "",
    "## Removed: the 0.50 deprecations (breaking)",
    "",
    "| `DevSwitchers` | `DevMenu` |",
    "",
    "## Something else",
    "",
    "`NotThis` is only mentioned.",
    "",
    "**Must change:** `TourLauncher` takes `engine`; `ButtonProps.variant` lost primary.",
    "- `Step.beforeStep` gets `ctx`.",
    "",
    "**Apps:** `AlsoNotThis`.",
  ].join("\n");

  it("reads the names under a must-change lead and a (breaking) heading, and only there", () => {
    expect([...mustChangeNames(doc)].sort()).toEqual(
      ["ButtonProps.variant", "DevMenu", "DevSwitchers", "Step.beforeStep", "TourLauncher", "ctx", "engine"].sort(),
    );
  });

  it("counts `Name.member`, and `Button` for `ButtonProps`", () => {
    const names = mustChangeNames(doc);
    expect(isNamed("TourLauncher", names)).toBe(true);
    expect(isNamed("Step", names)).toBe(true);
    expect(isNamed("ButtonProps", names)).toBe(true);
    expect(isNamed("NotThis", names)).toBe(false);
    expect(isNamed("Tour", names)).toBe(false);
  });

  it("is the previous minor's sections after the previous release, and every newer minor's doc", () => {
    const docs = join(work, "docs");
    mkdirSync(docs, { recursive: true });
    writeFileSync(
      join(docs, "adopt-0.51.md"),
      "# 0.51\n\ntop\n\n## 0.51.6\n\nsix\n\n## 0.51.7\n\nseven\n\n## 0.51.8\n\neight\n",
    );
    writeFileSync(join(docs, "adopt-0.52.md"), "# 0.52\n\nnext\n");
    writeFileSync(join(docs, "adopt-0.50.md"), "# 0.50\n\nold\n");
    const texts = adoptTextSince("0.51.7", docs)
      .map((t) => `${t.file}: ${t.text.trim()}`)
      .sort();
    expect(texts).toEqual(["adopt-0.51.md: ## 0.51.8\n\neight", "adopt-0.52.md: # 0.52\n\nnext"]);
  });
});
