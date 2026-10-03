import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { twMerge } from "tailwind-merge";
import { describe, expect, it } from "vitest";

/**
 * 0.24.1 — keksdose: AmountInput's `inputClassName` (0.24.0) wins over the kit's end
 * padding only because `px-2` REPLACES `pe-3` in the merge, and tailwind-merge learned
 * that in 3.7.0: 3.6 returns "pe-3 px-2", and Tailwind v4 emits `pe-3` after `px-2`, so
 * the cell kept 12px at its end. `tailwind-merge` is a dependency the consumer's own copy
 * can satisfy (npm dedupes onto the app's), so the kit's declared range has to start
 * where the behaviour it relies on starts — this repo resolving 3.7 proves nothing about
 * an app on 3.6.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};

describe("tailwind-merge: the range the kit declares", () => {
  it("starts at 3.7, where a shorthand padding replaces a logical one", () => {
    const range = pkg.dependencies["tailwind-merge"];
    const floor = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
    expect(floor, `expected a caret range, got ${range}`).not.toBeNull();
    const [major, minor] = [Number(floor![1]), Number(floor![2])];
    expect(major > 3 || (major === 3 && minor >= 7)).toBe(true);
  });

  it("merges the way the kit's class order relies on", () => {
    expect(twMerge("pe-3 px-2")).toBe("px-2");
    expect(twMerge("ps-3 px-2")).toBe("px-2");
  });
});
