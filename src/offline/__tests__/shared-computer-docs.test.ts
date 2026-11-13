// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The words an app's agent reads in `node_modules` about where a shared-computer session
 * lives (docs/auth-harmonization.md §2.14). 0.62's `storage` prop still said `sessionStorage`
 * "is no place for tokens", after Marcel's decision of 2026-11-13 had made the tab's storage
 * the session's default place — a reader following the prop's note would have moved the
 * session into page memory, and signed everybody out at every reload.
 */
const SOURCE = readFileSync(join(process.cwd(), "src/offline/shared-computer.tsx"), "utf8");

/** The TSDoc right above `storage?: SharedComputerStorage;` in `SharedComputerChoiceProps`. */
function storagePropDoc(): string {
  const at = SOURCE.indexOf("  storage?: SharedComputerStorage;");
  expect(at).toBeGreaterThan(0);
  const before = SOURCE.slice(0, at);
  return before.slice(before.lastIndexOf("/**"));
}

describe("SharedComputerChoiceProps.storage's TSDoc", () => {
  it("no longer says the tab's storage is no place for the session", () => {
    expect(storagePropDoc()).not.toMatch(/no place for tokens/);
  });

  it("names the tab's storage as the session's default and points at §2.14", () => {
    const doc = storagePropDoc();
    expect(doc).toContain("§2.14");
    expect(doc).toMatch(/reload/);
  });
});
