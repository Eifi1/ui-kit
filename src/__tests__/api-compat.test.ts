// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  adoptTextSince,
  checkApi,
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

/** A package whose `.` entry is `dts`; `others` are more files in its dist/ (`b.d.ts`). */
function pkg(name: string, dts: string, others: Record<string, string> = {}) {
  const dir = join(work, name);
  mkdirSync(join(dir, "dist"), { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } } }),
  );
  writeFileSync(join(dir, "dist", "index.d.ts"), dts);
  for (const [file, text] of Object.entries(others)) writeFileSync(join(dir, "dist", file), text);
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

/**
 * The holes the 0.52 code review found in the gate (scripts/check-api-compat.mjs): each a
 * breaking change that compared as nothing, or as only another type's, so the gate passed
 * with no word in the adopt doc. Each reproduced on two small packages, as above.
 */
// Each case builds two TypeScript programs over fixture packages and runs the checker:
// ~4 s alone, 30 s under the full check's six loaded workers (0.52, one case timed out at
// vitest's 20 s). Real compiler work, so a longer budget, not a retry.
describe("compareApi: what the 0.52 code review found it passing", { timeout: 120_000 }, () => {
  /** The changes from `old` to `new`, by name. */
  const compare = (
    name: string,
    old: string,
    next: string,
    others: [Record<string, string>?, Record<string, string>?] = [],
  ) =>
    new Map(
      compareApi(pkg(`${name}-old`, old, others[0]), pkg(`${name}-new`, next, others[1])).map((c) => [c.name, c]),
    );

  it("keeps a type's own change a root when its text names another changed type", () => {
    // Two types that reference each other, each changed in itself: each was printed
    // "through" the other, and nothing was left to announce.
    const mutual = compare(
      "mutual",
      "export interface TourStep { next: TourContext }\nexport interface TourContext { prev: TourStep }",
      "export interface TourStep { next: TourContext | null }\nexport interface TourContext { prev: TourStep | null }",
    );
    expect(mutual.get("TourStep")?.through).toEqual([]);
    expect(mutual.get("TourContext")?.through).toEqual([]);
    // `tone` took any string and takes a Variant now: Options' own change, though Variant
    // changed too and is named in the new type.
    const narrowed = compare(
      "narrowed",
      'export type Variant = "a" | "b" | "c";\nexport interface Options { tone?: string }',
      'export type Variant = "a" | "b";\nexport interface Options { tone?: Variant }',
    );
    expect(narrowed.get("Variant")?.through).toEqual([]);
    expect(narrowed.get("Options")).toMatchObject({ through: [] });
    // A member made optional while its type changed only through another (0.40's
    // `FeedbackReworkSectionProps.onUpdate`): its `| undefined` aside, written the same.
    const optional = compare(
      "optional",
      "export type Update = (id: string) => void;\nexport interface SectionProps { onUpdate: Update }",
      "export type Update = (id: number) => void;\nexport interface SectionProps { onUpdate?: Update }",
    );
    expect(optional.get("SectionProps")?.through).toEqual(["Update"]);
  });

  it("flags a name whose kind changed: a value exported as a type only, a function become a type, and back", () => {
    const changes = compare(
      "kinds",
      [
        'export { Button, TONES } from "./b";',
        "export declare function makeThing(): number;",
        "export type Shape = { side: number };",
        "export declare class Engine { run(): void }",
        "export interface Store { get(): string }",
      ].join("\n"),
      [
        'export type { Button, TONES } from "./b";',
        "export type makeThing = () => number;",
        "export declare function Shape(): void;",
        "export interface Engine { run(): void }",
        "export declare class Store { get(): string; private secret }",
      ].join("\n"),
      [
        { "b.d.ts": "export declare function Button(): null;\nexport declare const TONES: readonly string[];" },
        { "b.d.ts": "export declare function Button(): null;\nexport declare const TONES: readonly string[];" },
      ],
    );
    for (const name of ["Button", "TONES", "makeThing", "Engine"])
      expect(changes.get(name)?.detail, name).toMatch(/no longer a value/);
    expect(changes.get("Shape")?.detail).toMatch(/no longer a type/);
    // An object literal typed `Store` lacks the class's private member.
    expect(changes.get("Store")?.through).toEqual([]);
  });

  it("flags a *Labels key or export that is gone, and still not one that is new", () => {
    const changes = compare(
      "labels",
      [
        "export interface TopBarPartsLabels { title: string; switchPlan: string }",
        "export interface DevSwitchersLabels { open: string }",
        "export interface KitLabels { topBarParts: TopBarPartsLabels }",
        "export declare function resolveChipLabels(): void;",
        "export interface GroupActionLabels { create: string }",
        'export interface ActionLogLabels { groupActions: Record<"team" | "company", GroupActionLabels> }',
        "export interface MenuLabels { viewFeedback: string }",
      ].join("\n"),
      [
        "export interface TopBarPartsLabels { title: string; signOut: string }",
        "export interface KitLabels { topBarParts: TopBarPartsLabels }",
        "export interface GroupActionLabels { create: string; deactivate: string }",
        'export interface ActionLogLabels { groupActions: Record<"team" | "company", GroupActionLabels> }',
        "export interface MenuLabels { viewFeedback?: string }",
      ].join("\n"),
    );
    expect(changes.get("TopBarPartsLabels")).toMatchObject({ detail: "`switchPlan` is gone", through: [] });
    expect(changes.get("DevSwitchersLabels")).toMatchObject({ kind: "gone" });
    // A function whose name ends in Labels is no catalogue (0.35 removed six).
    expect(changes.get("resolveChipLabels")).toMatchObject({ kind: "gone" });
    // The catalogue only shows the part's change through.
    expect(changes.get("KitLabels")?.through).toEqual(["TopBarPartsLabels"]);
    // New keys, in a map of catalogues too (0.45's `groupActions`), and a key made
    // optional, break no override.
    for (const name of ["GroupActionLabels", "ActionLogLabels", "MenuLabels"])
      expect(changes.has(name), name).toBe(false);
  });

  it("flags a generic type that requires more type arguments, or takes fewer", () => {
    const changes = compare(
      "arity",
      "export interface SyncEngineOptions<D> { db: D }\nexport interface Box<T> { value: T }",
      "export interface SyncEngineOptions<D, R> { db: D; row?: R }\nexport interface Box { value: unknown }",
    );
    expect(changes.get("SyncEngineOptions")?.detail).toMatch(/requires 2 type arguments, was 1/);
    expect(changes.get("Box")?.detail).toMatch(/takes 0 type arguments, was 1/);
  });

  it("compares every overload, not only the last", () => {
    const changes = compare(
      "overloads",
      [
        "export declare function toast(msg: string): number;",
        "export declare function toast(msg: string, opts: { a: number }): number;",
        "export declare function pick(x: string): void;",
        "export declare function pick(x: string, y: number): void;",
        "export declare function keep(x: string): void;",
        "export declare function keep(x: number): void;",
      ].join("\n"),
      [
        "export declare function toast(msg: string, opts: { a: number }): number;",
        'export declare function pick(x: "a"): void;',
        "export declare function pick(x: string, y: number): void;",
        // The same overloads in another order: every old call still compiles.
        "export declare function keep(x: number): void;",
        "export declare function keep(x: string): void;",
      ].join("\n"),
    );
    expect(changes.get("toast")?.detail).toMatch(/requires 2 arguments, was 1/);
    expect(changes.get("pick")?.detail).toMatch(/parameter 1 `x` takes "a", was string/);
    expect(changes.has("keep")).toBe(false);
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

  it("keeps a (breaking) heading's block past a bold lead inside it (0.52 code review)", () => {
    // The lead replaced the heading's block, and `**Why:**` then ended it: `B` was lost.
    const removed = [
      "## Removed (breaking)",
      "",
      "**Must change:** `A`",
      "",
      "**Why:** they moved.",
      "",
      "| `B` | gone |",
      "",
      "## Next",
      "",
      "`C`",
    ].join("\n");
    expect([...mustChangeNames(removed)].sort()).toEqual(["A", "B"]);
  });

  it("reads no heading in fenced code: a shell comment neither opens nor ends a block (0.52 code review)", () => {
    const fenced = [
      "## Must change",
      "",
      "```sh",
      "# the old command",
      "npm i",
      "```",
      "",
      "`Kept`",
      "",
      "## Other",
      "",
      "```sh",
      "# must change nothing here",
      "```",
      "`NotThis`",
    ].join("\n");
    expect([...mustChangeNames(fenced)]).toEqual(["Kept"]);
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

describe("checkApi", { timeout: 120_000 }, () => {
  it("reads the adopt docs of the root it reads the version and the releases from (0.52 code review)", () => {
    // The docs came from the repository's own docs/ whatever the root: a fixture's gate
    // answered by the adopt docs the repository held that day.
    const root = join(work, "root");
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ version: "9.1.0" }));
    writeFileSync(
      join(root, "docs", "adopt-9.1.md"),
      "# 9.1\n\n**Must change:** `Launcher`, `Step.beforeStep`, `Variant`, `EngineOptions`.\n",
    );
    const result = checkApi(NEW, { root, log: () => {}, published: ["9.0.0"], pack: () => OLD });
    expect(result.previous).toBe("9.0.0");
    expect(result.unannounced.map((c) => c.name)).toEqual(["gone"]);
  });
});
