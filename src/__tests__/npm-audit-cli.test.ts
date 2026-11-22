// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  advisoriesOf,
  decideAudit,
  parseAuditArgs,
  runNpmAuditCli,
  versionInRange,
  type CommandResult,
} from "../../npm-audit/cli";

/**
 * `eifi1-npm-audit` (Marcel, 2026-11-17, picomatch GHSA-fc5q-39xc-vjpf): high and critical
 * block; an advisory WITHOUT A FIX is accepted only by id, with a reason, and only while the
 * package's latest version is still in its vulnerable range.
 */

const PICOMATCH = "GHSA-fc5q-39xc-vjpf";

const via = (id: string, name: string, severity: string, range: string) => ({
  source: 1,
  name,
  dependency: name,
  title: `${name} advisory`,
  url: `https://github.com/advisories/${id}`,
  severity,
  range,
});

/** The shape `npm audit --json` gave on 2026-11-17 in this repo, trimmed. */
const report = (...advisories: ReturnType<typeof via>[]) => ({
  auditReportVersion: 2,
  vulnerabilities: {
    vite: { name: "vite", severity: "high", via: ["picomatch", "tinyglobby"] },
    ...Object.fromEntries(advisories.map((a) => [a.name, { name: a.name, severity: a.severity, via: [a] }])),
  },
  metadata: {},
});

const EMPTY = { auditReportVersion: 2, vulnerabilities: {} };

const run = (
  argv: string[],
  body: unknown,
  latest: Record<string, string> = {},
  status = 1,
  runtimeBody: unknown = EMPTY,
) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = runNpmAuditCli(argv, {
    audit: (runtimeOnly): CommandResult => ({
      status: runtimeOnly ? 0 : status,
      stdout: JSON.stringify(runtimeOnly ? runtimeBody : body),
      stderr: "",
    }),
    latestOf: (name) => {
      const v = latest[name];
      if (v === undefined) throw new Error(`no latest for ${name}`);
      return v;
    },
    log: (l) => out.push(l),
    error: (l) => err.push(l),
  });
  return { code, out, err };
};

describe("eifi1-npm-audit", () => {
  it("passes a clean report", () => {
    expect(run([], { auditReportVersion: 2, vulnerabilities: {} }, {}, 0).code).toBe(0);
  });

  it("blocks a high advisory nobody accepted", () => {
    const r = run([], report(via(PICOMATCH, "picomatch", "high", "<=4.0.7")));
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain(`BLOCKS: ${PICOMATCH} picomatch high`);
  });

  it("lets a moderate one pass at the default level, and blocks it at --audit-level moderate", () => {
    const body = report(via("GHSA-g3hv-75wg-m249", "minimatch", "moderate", ">=7.0.0 <11.0.1"));
    expect(run([], body).code).toBe(0);
    expect(run(["--audit-level", "moderate"], body).code).toBe(1);
  });

  it("accepts an advisory without a fix, printing its reason", () => {
    const r = run(
      ["--ignore-until-fixed", `${PICOMATCH}=build and test tools only`],
      report(via(PICOMATCH, "picomatch", "high", "<=4.0.7")),
      { picomatch: "4.0.7" },
    );
    expect(r.code).toBe(0);
    expect(r.out.join("\n")).toContain("accepted until fixed");
    expect(r.out.join("\n")).toContain("build and test tools only");
  });

  it("blocks again the day a fixed version ships", () => {
    const r = run(
      [`--ignore-until-fixed=${PICOMATCH}=build and test tools only`],
      report(via(PICOMATCH, "picomatch", "high", "<=4.0.7")),
      { picomatch: "4.0.8" },
    );
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain(`a fixed version exists (picomatch 4.0.8)`);
  });

  it("does not let one exception cover another advisory", () => {
    const r = run(
      ["--ignore-until-fixed", `${PICOMATCH}=tools only`],
      report(via(PICOMATCH, "picomatch", "high", "<=4.0.7"), via("GHSA-xxxx-xxxx-xxxx", "tar", "critical", "<7.0.0")),
      { picomatch: "4.0.7" },
    );
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("BLOCKS: GHSA-xxxx-xxxx-xxxx tar critical");
  });

  it("blocks an exception that matches nothing any more (remove it)", () => {
    const r = run(["--ignore-until-fixed", `${PICOMATCH}=tools only`], EMPTY, {}, 0);
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain(`--ignore-until-fixed ${PICOMATCH} matches nothing`);
  });

  it("never accepts an advisory that reaches a runtime dependency", () => {
    const body = report(via(PICOMATCH, "picomatch", "high", "<=4.0.7"));
    const r = run(["--ignore-until-fixed", `${PICOMATCH}=tools only`], body, { picomatch: "4.0.7" }, 1, body);
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("reaches a runtime dependency");
  });

  it("never passes what it cannot read", () => {
    expect(run([], { auditReportVersion: 1 }).code).toBe(2);
    expect(run([], { error: { summary: "registry unreachable" } }).code).toBe(2);
    expect(run([], report(via(PICOMATCH, "picomatch", "high", "<=4.0.7")), {}, 3).code).toBe(2);
    // The latest version cannot be looked up: an exception does not pass blind.
    expect(
      run(["--ignore-until-fixed", `${PICOMATCH}=x`], report(via(PICOMATCH, "picomatch", "high", "<=4.0.7"))).code,
    ).toBe(2);
  });

  it("refuses bad flags with exit 2", () => {
    expect(run(["--ignore-until-fixed", PICOMATCH], report()).code).toBe(2); // no reason
    expect(run(["--ignore-until-fixed", "CVE-2026-1=x"], report()).code).toBe(2);
    expect(run(["--audit-level", "severe"], report()).code).toBe(2);
    expect(run(["--fix"], report()).code).toBe(2);
  });

  it("reads one advisory per id, worst first", () => {
    const a = advisoriesOf(
      report(
        via("GHSA-g3hv-75wg-m249", "minimatch", "moderate", "<11.0.1"),
        via(PICOMATCH, "picomatch", "high", "<=4.0.7"),
      ),
    );
    expect(a.map((x) => x.id)).toEqual([PICOMATCH, "GHSA-g3hv-75wg-m249"]);
  });

  it("parses repeated exceptions", () => {
    const o = parseAuditArgs(["--ignore-until-fixed", `${PICOMATCH}=a`, "--ignore-until-fixed=GHSA-g3hv-75wg-m249=b"]);
    expect([...o.exceptions]).toEqual([
      [PICOMATCH, "a"],
      ["GHSA-g3hv-75wg-m249", "b"],
    ]);
    expect(o.level).toBe("high");
  });

  it("decides without npm", () => {
    const v = decideAudit([], { exceptions: new Map(), level: "high" }, () => "1.0.0");
    expect(v.code).toBe(0);
  });
});

describe("versionInRange", () => {
  it.each([
    ["4.0.7", "<=4.0.7", true],
    ["4.0.8", "<=4.0.7", false],
    ["2.3.1", "<2.3.2 || >=3.0.0 <3.0.1", true],
    ["3.0.1", "<2.3.2 || >=3.0.0 <3.0.1", false],
    ["10.0.0", ">=7.0.0 <11.0.1", true],
    ["11.0.1", ">=7.0.0 <11.0.1", false],
    ["4.0.8-beta.1", "<=4.0.7", false],
    ["4.0.7-beta.1", "<4.0.7", true],
    ["1.0.0", "*", true],
  ])("%s in %s → %s", (version, range, expected) => {
    expect(versionInRange(version, range)).toBe(expected);
  });

  it("returns null for what it cannot read", () => {
    expect(versionInRange("latest", "<=4.0.7")).toBeNull();
    expect(versionInRange("4.0.7", "^4.0.0")).toBeNull();
  });
});

/**
 * The bin's entry ran behind a run-as-script guard that failed OPEN: `if (argv[1] is this
 * module) process.exitCode = runNpmAuditCli(…)`. Reached any other way (a loader or shim that
 * hands Node another path, a bundler that rewrites `import.meta.url`), nothing ran, nothing
 * printed, and the exit code was 0: a security gate that passes silently looks exactly like a
 * green one (refactor audit 2026-11-22, TST-3). The entry check:security runs is the one
 * scripts/build-npm-audit.mjs bundles into `dist/bin/eifi1-npm-audit.mjs`.
 */
describe("the eifi1-npm-audit entry (TST-3)", () => {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
    bin: Record<string, string>;
  };
  const entry = /^node (npm-audit\/\S+)$/.exec(pkg.scripts["check:security"])?.[1] ?? "";

  it("is the source of the bin the build bundles", () => {
    expect(entry).not.toBe("");
    const [dir, file] = entry.split("/");
    expect(readFileSync(join(ROOT, "scripts/build-npm-audit.mjs"), "utf8")).toContain(
      `join(ROOT, ${JSON.stringify(dir)}, ${JSON.stringify(file)})`,
    );
    expect(pkg.bin["eifi1-npm-audit"]).toBe("dist/bin/eifi1-npm-audit.mjs");
  });

  it("runs its main however Node reaches it, never a silent exit 0", () => {
    // Started through a shim that imports it: argv[1] is the shim, not the entry.
    const dir = mkdtempSync(join(tmpdir(), "uikit-npm-audit-shim-"));
    try {
      const shim = join(dir, "eifi1-npm-audit.mjs");
      writeFileSync(shim, `await import(${JSON.stringify(pathToFileURL(join(ROOT, entry)).href)});\n`);
      const r = spawnSync(process.execPath, [shim, "--audit-level", "bogus"], { cwd: dir, encoding: "utf8" });
      expect(r.status, r.stdout + r.stderr).toBe(2);
      expect(r.stderr).toMatch(/usage: eifi1-npm-audit/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
