// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DOCS_BASE,
  SyncError,
  findSection,
  headingAnchors,
  headingSlug,
  render,
  sectionNumbers,
  validate,
  withContractLinks,
} from "../../../scripts/sync-server-kit.mjs";

/**
 * scripts/sync-server-kit.mjs: the release's api.json in, the committed copy out —
 * validated, and with every contract section resolved to github.com's anchor for its
 * heading in this repository's docs.
 */

/** Vitest runs from the repository root (vitest.config.ts lives there). */
const ROOT = process.cwd();

const DOC = [
  "# A plan — harmonisation",
  "",
  "## 1. Where each one stands",
  "",
  "## 3. The API contract (A)",
  "",
  "### 3.5 Attachments",
  "",
  "### 3.51 Not this one",
  "",
  "```md",
  "## 9. Inside a fence",
  "```",
  "",
  "### 6.1 `/auth/me`",
  "",
  "## Notes",
  "",
  "## Notes",
  "",
  "## 8. What the kits add, what stays app-side",
  "",
  "### 8.1 The subject — in the row",
  "",
].join("\n");

const readDoc = (path: string) => {
  if (path === "docs/plan.md") return DOC;
  throw new Error(`no ${path}`);
};

type Api = {
  format: string;
  version: number;
  kit_version: string;
  modules: Array<{
    name: string;
    summary: string;
    doc: string;
    contract?: { doc: string; section: string; url?: string; links?: Array<{ section: string; heading: string; url: string }> };
    members: Array<Record<string, unknown>>;
  }>;
  mails: Array<Record<string, unknown>>;
};

function exportOf(): Api {
  return {
    format: "eifi1-server-kit-api",
    version: 1,
    kit_version: "0.5.0",
    modules: [
      {
        name: "eifi1_server_kit.settings",
        summary: "Settings.",
        doc: "Settings.\n\nMore.",
        contract: { doc: "docs/plan.md", section: "§3.5, §8" },
        members: [{ name: "apply_patch", kind: "function", signature: "apply_patch(obj)", doc: "" }],
      },
    ],
    mails: [{ id: "notice", title: "A notice", locale: "en", subject: "A notice", html: "<p>Hello Ada</p>" }],
  };
}

describe("github.com's heading anchors", () => {
  it("slugs the rendered text the way github-slugger does", () => {
    expect(headingSlug("8. What the kits add, what stays app-side")).toBe("8-what-the-kits-add-what-stays-app-side");
    expect(headingSlug("6.1 `/auth/me`")).toBe("61-authme");
    // The dash goes, the spaces round it stay: two hyphens.
    expect(headingSlug("8.1 The subject — in the row")).toBe("81-the-subject--in-the-row");
    expect(headingSlug("3. The API contract (A)")).toBe("3-the-api-contract-a");
    expect(headingSlug("Ünïcode [a link](https://example.com) **bold** snake_case")).toBe(
      "ünïcode-a-link-bold-snake_case",
    );
  });

  it("numbers a repeated heading and skips headings inside a fence", () => {
    const anchors = headingAnchors(DOC).map((h) => h.anchor);
    expect(anchors).toContain("notes");
    expect(anchors).toContain("notes-1");
    expect(anchors.some((a) => a.startsWith("9-"))).toBe(false);
  });

  it("finds a section by its number — never a sub-section, never a longer number", () => {
    expect(sectionNumbers("§3.5, §3.6")).toEqual(["3.5", "3.6"]);
    expect(sectionNumbers("§6")).toEqual(["6"]);
    expect(findSection(DOC, "8")?.anchor).toBe("8-what-the-kits-add-what-stays-app-side");
    expect(findSection(DOC, "3.5")?.anchor).toBe("35-attachments");
    expect(findSection(DOC, "3.51")?.anchor).toBe("351-not-this-one");
    expect(findSection(DOC, "6.1")?.anchor).toBe("61-authme");
    expect(findSection(DOC, "9")).toBeUndefined();
  });
});

describe("validation", () => {
  it("accepts a well-formed export", () => {
    expect(validate(exportOf())).toEqual([]);
    expect(validate(exportOf(), { tag: "v0.5.0" })).toEqual([]);
  });

  it("refuses another format, a newer format version, and another release's file", () => {
    expect(validate({ ...exportOf(), format: "something-else" })[0]).toMatch(/format/);
    expect(validate({ ...exportOf(), version: 2 })[0]).toMatch(/newer than this reader/);
    expect(validate(exportOf(), { tag: "v0.6.0" })).toEqual(["the release v0.6.0 carries kit_version 0.5.0"]);
  });

  it("names every broken part", () => {
    const api = exportOf();
    api.modules.push({ ...api.modules[0] });
    api.modules[0].members.push({ name: "apply_patch", kind: "function" });
    api.mails.push({ ...api.mails[0] });
    const errors = validate(api);
    expect(errors).toContain("eifi1_server_kit.settings is listed twice");
    expect(errors).toContain("eifi1_server_kit.settings.apply_patch is listed twice");
    expect(errors).toContain("eifi1_server_kit.settings.apply_patch: signature is not a string");
    expect(errors).toContain("mails[1]: notice in en is listed twice");
  });

  it("refuses a contract path outside the repository", () => {
    const api = exportOf();
    api.modules[0].contract = { doc: "../elsewhere.md", section: "§1" };
    expect(validate(api)[0]).toMatch(/not a repository Markdown path/);
  });
});

describe("contract links", () => {
  it("stores each section's heading and full URL, and the first as `url`", () => {
    const { modules } = withContractLinks(exportOf(), readDoc);
    expect(modules[0].contract).toEqual({
      doc: "docs/plan.md",
      section: "§3.5, §8",
      url: `${DOCS_BASE}docs/plan.md#35-attachments`,
      links: [
        { section: "§3.5", heading: "3.5 Attachments", url: `${DOCS_BASE}docs/plan.md#35-attachments` },
        {
          section: "§8",
          heading: "8. What the kits add, what stays app-side",
          url: `${DOCS_BASE}docs/plan.md#8-what-the-kits-add-what-stays-app-side`,
        },
      ],
    });
  });

  it("is idempotent, so the committed file can be checked against itself", () => {
    const once = render(exportOf(), { readDoc });
    expect(render(JSON.parse(once), { readDoc })).toBe(once);
  });

  it("fails on a section the doc does not have, and on a doc that is not there", () => {
    const missingSection = exportOf();
    missingSection.modules[0].contract = { doc: "docs/plan.md", section: "§4" };
    expect(() => render(missingSection, { readDoc })).toThrow(SyncError);
    expect(() => render(missingSection, { readDoc })).toThrow("docs/plan.md has no heading for §4");
    const missingDoc = exportOf();
    missingDoc.modules[0].contract = { doc: "docs/gone.md", section: "§1" };
    expect(() => render(missingDoc, { readDoc })).toThrow("docs/gone.md does not exist");
  });
});

describe("the script", () => {
  it("copies an export, then --check passes for it and fails for another", () => {
    const dir = mkdtempSync(join(tmpdir(), "server-kit-sync-"));
    try {
      const source = join(dir, "server-kit-api.json");
      const out = join(dir, "api.json");
      const api = exportOf();
      // A real doc of this repository, so the CLI resolves it from its own docs/.
      api.modules[0].contract = { doc: "docs/settings-harmonization.md", section: "§6" };
      writeFileSync(source, JSON.stringify(api));
      execFileSync("node", ["scripts/sync-server-kit.mjs", "--from", source, "--out", out], { cwd: ROOT, stdio: "pipe" });
      const written = JSON.parse(readFileSync(out, "utf8")) as Api;
      expect(written.modules[0].contract?.url).toBe(`${DOCS_BASE}docs/settings-harmonization.md#6-the-backend`);
      execFileSync("node", ["scripts/sync-server-kit.mjs", "--check", "--from", source, "--out", out], {
        cwd: ROOT,
        stdio: "pipe",
      });

      writeFileSync(source, JSON.stringify({ ...api, kit_version: "0.5.1" }));
      expect(() =>
        execFileSync("node", ["scripts/sync-server-kit.mjs", "--check", "--from", source, "--out", out], {
          cwd: ROOT,
          stdio: "pipe",
        }),
      ).toThrow(/is not what this source gives/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("finds the committed export valid, and every contract heading still where it links", () => {
    // Throws (exit 1) naming the module when a heading in docs/ was renamed.
    execFileSync("node", ["scripts/sync-server-kit.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
  });
});
