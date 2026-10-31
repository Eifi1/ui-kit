/**
 * @vitest-environment node
 *
 * The docs' own rules, held by a test rather than by memory (refactor audit 2026-10-30,
 * DOC-3 and DOC-5). Both had held once: 0.35 folded the ten contracts of the day and
 * indexed every adopt note, and the seven contracts and ten notes written after 0.41 slid
 * back — "§6 wins over §2–§4", no Status table, an index stopping at adopt-0.41.
 *
 * - CONTRIBUTING → Documentation: a round's last commit folds its reviews and deviations
 *   into the sections they amend and updates the contract's Status table. A sentence that
 *   lets a later section "win over" the body is the fold not done.
 * - docs/README.md lists every contract and every adopt note, top level and archived.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs");
const ARCHIVED_NOTES = join(DOCS, "archive/adopt");

const read = (path: string) => readFileSync(path, "utf8");
const contracts = readdirSync(DOCS)
  .filter((name) => name.endsWith("-harmonization.md"))
  .sort();
const index = read(join(DOCS, "README.md"));

/** The lines of a document's `## Status` section, up to the next `## ` heading. */
function statusSection(text: string): string[] | null {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === "## Status");
  if (start < 0) return null;
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

describe("every contract is folded (docs/*-harmonization.md)", () => {
  it("finds the contracts", () => {
    expect(contracts.length).toBeGreaterThanOrEqual(17);
  });

  it.each(contracts)("%s opens with a Status table: § → shipped in → amended by", (name) => {
    const section = statusSection(read(join(DOCS, name)));
    expect(section, `${name}: no "## Status" section`).not.toBeNull();
    const header = section!.find((line) => line.startsWith("|"));
    expect(header, `${name}: the Status section has no table`).toMatch(/^\|\s*§\s*\|/);
  });

  it.each(contracts)("%s lets no later section win over the body", (name) => {
    const offenders = read(join(DOCS, name))
      .split("\n")
      .map((line, i) => ({ line: i + 1, text: line }))
      .filter(({ text }) => /\bwins? over §/.test(text));
    expect(offenders, `${name}: fold these into the sections they amend`).toEqual([]);
  });
});

describe("docs/README.md indexes every contract and every adopt note", () => {
  it.each(contracts)("lists %s", (name) => {
    expect(index).toContain(`](${name})`);
  });

  const topLevelNotes = readdirSync(DOCS).filter((name) => /^adopt-0\.\d+\.md$/.test(name));
  const archivedNotes = readdirSync(ARCHIVED_NOTES).filter((name) => /^adopt-0\.\d+\.md$/.test(name));

  it.each(topLevelNotes)("lists %s", (name) => {
    expect(index).toContain(`](${name})`);
  });

  it.each(archivedNotes)("lists archive/adopt/%s", (name) => {
    expect(index).toContain(`](archive/adopt/${name})`);
  });

  it("keeps no adopt note both at the top level and in the archive", () => {
    expect(topLevelNotes.filter((name) => archivedNotes.includes(name))).toEqual([]);
  });
});
