/**
 * @vitest-environment node
 *
 * The local gates: `npm run check` (scripts/check.mjs) and the pre-push hook that runs it
 * (.husky/pre-push). Node, not jsdom: this spawns git and a shell.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { GROUPS, isParallel, runGroups, testWorkers, writeStamp } from "../../scripts/check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const scripts = (JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> })
  .scripts;

/**
 * TST-1 (refactor audit 2026-10): side by side was the default, and the only mode that
 * failed — 30 minutes, an OOM kill, 25 timeouts on the 0.33.1 push — while serial passed
 * three times that day. Serial is the default now, and it stops at the first failure.
 */
describe("npm run check (TST-1)", () => {
  it("runs serially unless CHECK_PARALLEL asks otherwise; CHECK_SERIAL is still accepted", () => {
    expect(isParallel({})).toBe(false);
    expect(isParallel({ CHECK_SERIAL: "1" })).toBe(false);
    expect(isParallel({ CHECK_PARALLEL: "0" })).toBe(false);
    expect(isParallel({ CHECK_PARALLEL: "1" })).toBe(true);
  });

  it("runs the quickest to fail first, and every group is a package.json script CI runs too", () => {
    expect(GROUPS).toEqual(["check:static", "check:build", "check:test"]);
    for (const group of GROUPS) expect(scripts[group], group).toBeDefined();
  });

  it("stops at the first failing group and names the ones it did not run", async () => {
    const ran: string[] = [];
    const outcome = await runGroups(
      GROUPS,
      async (group) => {
        ran.push(group);
        return group !== "check:build";
      },
      { parallel: false },
    );
    expect(ran).toEqual(["check:static", "check:build"]);
    expect(outcome.results).toEqual([
      { group: "check:static", ok: true },
      { group: "check:build", ok: false },
    ]);
    expect(outcome.skipped).toEqual(["check:test"]);
  });

  it("runs every group when they all pass, and all of them side by side when parallel", async () => {
    const all = await runGroups(GROUPS, async () => true, { parallel: false });
    expect(all.results.map((r) => r.ok)).toEqual([true, true, true]);
    const ran: string[] = [];
    const parallel = await runGroups(
      GROUPS,
      async (group) => {
        ran.push(group);
        return group !== "check:static";
      },
      { parallel: true },
    );
    expect(ran).toEqual(GROUPS);
    expect(parallel.skipped).toEqual([]);
    expect(parallel.results.filter((r) => !r.ok)).toEqual([{ group: "check:static", ok: false }]);
  });

  it("caps the test workers at 6, never raises vitest's default, and leaves a set value alone", () => {
    expect(testWorkers({}, 8)).toBe("6");
    expect(testWorkers({}, 4)).toBe("3");
    expect(testWorkers({}, 1)).toBe("1");
    expect(testWorkers({ VITEST_MAX_WORKERS: "2" }, 8)).toBe("2");
  });
});

const temps: string[] = [];
const temp = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("the check's tree stamp (TST-2)", () => {
  it("is a file named by the tree, and only the newest 20 are kept", () => {
    const dir = temp("uikit-stamps-");
    for (let i = 0; i < 22; i++) {
      writeStamp(`tree${i}`, dir);
      // mtimes one second apart, oldest first, so the pruning order is not a race.
      utimesSync(join(dir, `tree${i}`), 1_000_000 + i, 1_000_000 + i);
    }
    writeStamp("latest", dir);
    const kept = readdirSync(dir);
    expect(kept).toHaveLength(20);
    expect(kept).toContain("latest");
    expect(kept).not.toContain("tree0");
    expect(readFileSync(join(dir, "latest"), "utf8")).toMatch(/npm run check passed/);
  });
});

/**
 * TST-2: the hook ran the full 6-minute check for ANY push — a release tag included
 * (v0.33.1: 355 s) — and checked the working tree, not the pushed commits, without saying
 * so. It runs here against a scratch repository, with `npm` replaced by a recorder.
 */
describe(".husky/pre-push (TST-2)", () => {
  const HOOK = join(ROOT, ".husky/pre-push");
  const ZERO = "0".repeat(40);
  // Run from inside a real `git push` (this very hook running the suite), git exports
  // GIT_DIR, GIT_INDEX_FILE and the like; inherited, they would point the scratch repo's git
  // at the pushing repository. Every git here, the hook's included, runs without them.
  const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));
  const git = (cwd: string, ...args: string[]) => {
    const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], {
      cwd,
      encoding: "utf8",
      env: ENV,
    });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };

  function repo() {
    const dir = temp("uikit-prepush-");
    git(dir, "init", "-q");
    writeFileSync(join(dir, "a.txt"), "one\n");
    git(dir, "add", "a.txt");
    git(dir, "commit", "-q", "-m", "chore: one");
    const bin = join(dir, ".bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "npm"), '#!/bin/sh\necho "npm $* HEAD_SHA=${HEAD_SHA:-}" >> "$NPM_LOG"\n');
    chmodSync(join(bin, "npm"), 0o755);
    return { dir, head: git(dir, "rev-parse", "HEAD"), tree: git(dir, "rev-parse", "HEAD^{tree}") };
  }

  function push(dir: string, stdin: string) {
    const log = join(dir, ".npm.log");
    rmSync(log, { force: true });
    const r = spawnSync("sh", ["-e", HOOK], {
      cwd: dir,
      input: stdin,
      encoding: "utf8",
      env: { ...ENV, PATH: `${join(dir, ".bin")}:${process.env.PATH}`, NPM_LOG: log },
    });
    return { status: r.status, out: r.stdout + r.stderr, npm: existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [] };
  }

  it("checks nothing for a push of tags or deletes, and says so in one line", () => {
    const { dir, head } = repo();
    const result = push(
      dir,
      `refs/tags/v1.0.0 ${head} refs/tags/v1.0.0 ${ZERO}\n(delete) ${ZERO} refs/heads/old ${head}\n`,
    );
    expect(result.status).toBe(0);
    expect(result.npm).toEqual([]);
    expect(result.out.trim().split("\n")).toHaveLength(1);
    expect(result.out).toMatch(/only tags or deletes/);
  });

  it("runs the full check for a branch, warning when tracked files are modified", () => {
    const { dir, head } = repo();
    const line = `refs/heads/main ${head} refs/heads/main ${ZERO}\n`;
    const clean = push(dir, line);
    expect(clean.npm).toEqual(["npm run check HEAD_SHA="]);
    expect(clean.out).not.toMatch(/warning/);

    writeFileSync(join(dir, "a.txt"), "edited\n");
    const dirty = push(dir, line);
    expect(dirty.npm).toEqual(["npm run check HEAD_SHA="]);
    expect(dirty.out).toMatch(/warning: tracked files are modified/);
  });

  it("checks only the commit messages when the pushed tree already passed", () => {
    const { dir, head, tree } = repo();
    mkdirSync(join(dir, "node_modules/.cache/check"), { recursive: true });
    writeFileSync(join(dir, "node_modules/.cache/check", tree), "stamp\n");
    // A reworded commit: a new id, the same tree.
    git(dir, "commit", "-q", "--amend", "-m", "chore: one, reworded");
    const reworded = git(dir, "rev-parse", "HEAD");
    expect(reworded).not.toBe(head);
    const result = push(dir, `refs/heads/main ${reworded} refs/heads/main ${head}\n`);
    expect(result.status).toBe(0);
    expect(result.npm).toEqual([`npm run -s check:commits HEAD_SHA=${reworded}`]);
    expect(result.out).toMatch(/already passed/);
  });

  it("runs the full check when any pushed tip's tree has no stamp", () => {
    const { dir, head, tree } = repo();
    mkdirSync(join(dir, "node_modules/.cache/check"), { recursive: true });
    writeFileSync(join(dir, "node_modules/.cache/check", tree), "stamp\n");
    writeFileSync(join(dir, "b.txt"), "two\n");
    git(dir, "add", "b.txt");
    git(dir, "commit", "-q", "-m", "chore: two");
    const second = git(dir, "rev-parse", "HEAD");
    const result = push(
      dir,
      `refs/heads/old ${head} refs/heads/old ${ZERO}\nrefs/heads/main ${second} refs/heads/main ${head}\n`,
    );
    expect(result.npm).toEqual(["npm run check HEAD_SHA="]);
    // `old` is not the checked-out commit, and the check runs on the checked-out tree.
    expect(result.out).toMatch(/is not the checked-out one/);
  });
});
