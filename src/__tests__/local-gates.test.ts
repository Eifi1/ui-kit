/**
 * @vitest-environment node
 *
 * The local gates: `npm run check` (scripts/check.mjs) and the pre-push hook that runs it
 * (.husky/pre-push). Node, not jsdom: this spawns git and a shell.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
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

/**
 * TST-9 (refactor audit 2026-10-30): the lists that NAME the gates had drifted from the
 * package.json scripts that ARE the gates — `format:check` ran first in check:static
 * for a release before any list said so, and ci.yml's lacked check:commit-rules and the
 * two inventories. Each list is read here and compared with the script, step for step.
 */
describe("the gate lists say what package.json runs (TST-9)", () => {
  /** A group's steps, as the lists name them. */
  const steps = (group: string) =>
    scripts[group].split(" && ").map((step) => {
      const npm = /^npm run (\S+)$/.exec(step);
      if (npm) return npm[1];
      const inventory = /^node scripts\/gen-(export|styling)-inventory\.mjs --check$/.exec(step);
      if (inventory) return `${inventory[1]} inventory`;
      return step;
    });
  /** The list on the line the group's name starts: `#   check:static  a · b`, `- \`check:static\`: a · b`. */
  const listed = (text: string, group: string) => {
    const line = new RegExp(`^(?:\\s*[#*-])?\\s*\`?${group}\`?:?\\s+(.+)$`, "m").exec(text)?.[1] ?? "";
    return line
      .replace(/\s*\(.*$/, "")
      .split(" · ")
      .map((s) => s.trim());
  };
  const docs = {
    "scripts/check.mjs": readFileSync(join(ROOT, "scripts/check.mjs"), "utf8"),
    ".github/workflows/ci.yml": readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8"),
    "CONTRIBUTING.md": readFileSync(join(ROOT, "CONTRIBUTING.md"), "utf8"),
  };

  it.each(GROUPS)("%s", (group) => {
    for (const [file, text] of Object.entries(docs)) expect(listed(text, group), file).toEqual(steps(group));
  });

  it("`npm run dev` rebuilds what `npm run build` builds, after tsup", () => {
    // It skipped flatten-en and the pay page: a dev build's en.js imported ~90 label modules.
    const after = scripts.build.split(" && ").slice(1);
    const onSuccess = /--onSuccess "([^"]+)"/.exec(scripts.dev.replace(/\\"/g, '"'))?.[1];
    expect(onSuccess?.split(" && ")).toEqual(after);
    expect(scripts.build.split(" && ")[0]).toMatch(/tsup/);
  });
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
  // HEAD_SHA too: CI exports it for check:commits, and the recorder below echoes it.
  const ENV = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_") && k !== "HEAD_SHA"),
  );
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
    // The dependency check (scripts/check-dependencies.mjs, 0.40.1) is the hook's first
    // step; here a stand-in that records its run and exits with DEPS_EXIT.
    mkdirSync(join(dir, "scripts"));
    writeFileSync(
      join(dir, "scripts", "check-dependencies.mjs"),
      'import { appendFileSync } from "node:fs";\nappendFileSync(process.env.DEPS_LOG, "deps\\n");\nprocess.exit(Number(process.env.DEPS_EXIT ?? 0));\n',
    );
    // The shared commit rules the hook runs for a stamped tree: the vendored copies themselves.
    for (const name of ["check-pushed-commits.cjs", "check-commit-msg.cjs"]) {
      writeFileSync(join(dir, "scripts", name), readFileSync(join(ROOT, "scripts", name)));
    }
    return { dir, head: git(dir, "rev-parse", "HEAD"), tree: git(dir, "rev-parse", "HEAD^{tree}") };
  }

  function push(dir: string, stdin: string, depsExit = 0) {
    const log = join(dir, ".npm.log");
    const depsLog = join(dir, ".deps.log");
    rmSync(log, { force: true });
    rmSync(depsLog, { force: true });
    const r = spawnSync("sh", ["-e", HOOK], {
      cwd: dir,
      input: stdin,
      encoding: "utf8",
      env: {
        ...ENV,
        PATH: `${join(dir, ".bin")}:${process.env.PATH}`,
        NPM_LOG: log,
        DEPS_LOG: depsLog,
        DEPS_EXIT: String(depsExit),
      },
    });
    return {
      status: r.status,
      out: r.stdout + r.stderr,
      npm: existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [],
      deps: existsSync(depsLog),
    };
  }

  it("runs the dependency check first for a branch, and a failing one blocks the push (0.40.1)", () => {
    const { dir, head } = repo();
    const line = `refs/heads/main ${head} refs/heads/main ${ZERO}\n`;
    const passed = push(dir, line);
    expect(passed.deps).toBe(true);
    expect(passed.npm).toEqual(["npm run check HEAD_SHA="]);
    const blocked = push(dir, line, 1);
    expect(blocked.deps).toBe(true);
    expect(blocked.status).not.toBe(0);
    expect(blocked.npm).toEqual([]);
    // A push of tags only runs nothing, the dependency check included.
    expect(push(dir, `refs/tags/v1.0.0 ${head} refs/tags/v1.0.0 ${ZERO}\n`).deps).toBe(false);
  });

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
    // The shared scripts/check-pushed-commits.cjs checks every commit the push sends (0.46),
    // not npm's check:commits per tip (the range to origin/main, which a scratch repo lacks).
    expect(result.npm).toEqual([]);
    expect(result.out).toMatch(/already passed/);
  });

  it("refuses a stamped push whose reworded message breaks the shared rules, naming the commit (0.46)", () => {
    const { dir, head, tree } = repo();
    mkdirSync(join(dir, "node_modules/.cache/check"), { recursive: true });
    writeFileSync(join(dir, "node_modules/.cache/check", tree), "stamp\n");
    git(dir, "commit", "-q", "--amend", "--no-verify", "-m", "reworded without a type");
    const reworded = git(dir, "rev-parse", "HEAD");
    const result = push(dir, `refs/heads/main ${reworded} refs/heads/main ${head}\n`);
    expect(result.status).not.toBe(0);
    expect(result.npm).toEqual([]);
    expect(result.out).toContain(reworded.slice(0, 8));
    expect(result.out).toMatch(/reworded without a type/);
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

  // TST-1 (refactor audit 2026-10-30): `npm run release` commits CHANGELOG.md and the
  // "version" lines on a tree that has just passed, and the hook ran the whole check again
  // for that: 6–10 minutes per release, 41 releases between 0.34 and 0.51.6.
  const DEPRECATIONS = "npm exec --no -- vitest run src/__tests__/deprecations.test.ts HEAD_SHA=";

  /** A repo whose manifests' tree passed (unless `stampParent` is false), ready for `bump`. */
  function released({ stampParent = true } = {}) {
    const { dir } = repo();
    const manifest = (version: string, extra = "") =>
      `{\n  "name": "kit",\n  "version": "${version}",${extra}\n  "type": "module"\n}\n`;
    const lock = (version: string) =>
      `{\n  "name": "kit",\n  "version": "${version}",\n  "packages": {\n    "": {\n      "name": "kit",\n      "version": "${version}"\n    }\n  }\n}\n`;
    writeFileSync(join(dir, "package.json"), manifest("1.0.0"));
    writeFileSync(join(dir, "package-lock.json"), lock("1.0.0"));
    writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "chore: manifests");
    const parent = git(dir, "rev-parse", "HEAD");
    if (stampParent) {
      mkdirSync(join(dir, "node_modules/.cache/check"), { recursive: true });
      writeFileSync(join(dir, "node_modules/.cache/check", git(dir, "rev-parse", "HEAD^{tree}")), "stamp\n");
    }
    // As `npm run release` writes them: the two manifests' version lines and the entry.
    const bump = (extra = "") => {
      writeFileSync(join(dir, "package.json"), manifest("1.0.1", extra));
      writeFileSync(join(dir, "package-lock.json"), lock("1.0.1"));
      writeFileSync(join(dir, "CHANGELOG.md"), "# Changelog\n\n## 1.0.1\n\n- a fix\n");
    };
    return { dir, parent, bump, line: (tip: string) => `refs/heads/main ${tip} refs/heads/main ${parent}\n` };
  }

  // Only the named files: the stamp under node_modules is untracked in a real checkout.
  function commitRelease(dir: string, ...others: string[]) {
    git(dir, "add", "CHANGELOG.md", "package.json", "package-lock.json", ...others);
    git(dir, "commit", "-q", "-m", "chore(release): 1.0.1");
    return git(dir, "rev-parse", "HEAD");
  }

  it("runs only the commit messages and the deprecations test for a release commit on a tree that passed", () => {
    const { dir, bump, line } = released();
    bump();
    const result = push(dir, line(commitRelease(dir)));
    expect(result.status).toBe(0);
    // The version is what deprecations.test reads: a MINOR bump can make a removal due.
    expect(result.npm).toEqual([DEPRECATIONS]);
    expect(result.out).toMatch(/release commit/);
  });

  it("runs the full check for a release commit whose parent tree never passed", () => {
    const { dir, bump, line } = released({ stampParent: false });
    bump();
    const result = push(dir, line(commitRelease(dir)));
    expect(result.npm).toEqual(["npm run check HEAD_SHA="]);
  });

  it("runs the full check when the release commit changes more than CHANGELOG and the version", () => {
    // A manifest line beside the version (a dependency, a script) …
    const extra = released();
    extra.bump(`\n  "private": true,`);
    expect(push(extra.dir, extra.line(commitRelease(extra.dir))).npm).toEqual(["npm run check HEAD_SHA="]);
    // … or any other file.
    const other = released();
    other.bump();
    writeFileSync(join(other.dir, "a.txt"), "edited\n");
    expect(push(other.dir, other.line(commitRelease(other.dir, "a.txt"))).npm).toEqual(["npm run check HEAD_SHA="]);
  });
});

/**
 * TST-7 (refactor audit 2026-10-30): `check:commit-rules` passed on ANY failure as
 * "offline", in CI too — an HTTP 404 from a wrong pin or a moved upstream path included —
 * although it is the only guard of the vendored copies the pre-push hook runs. `fetch` is
 * replaced before the script loads; nothing here reaches the network.
 */
describe("check:commit-rules (TST-7)", () => {
  const SCRIPT = join(ROOT, "scripts/check-commit-rules.mjs");
  const LOCAL = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CI" && k !== "GITHUB_ACTIONS"));
  /** Runs the script with `fetch` answering `body` (a function body; `url` in scope). */
  const rules = (body: string, env: Record<string, string | undefined> = LOCAL) => {
    const stub = `globalThis.fetch = async (url) => { ${body} };`;
    const r = spawnSync(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(stub)}`, SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
      env,
    });
    return { status: r.status, out: r.stdout + r.stderr };
  };

  it("fails on an HTTP answer: a 404 is a wrong pin or a moved file, not a missing network", () => {
    const answer = rules('return new Response("Not Found", { status: 404 });');
    expect(answer.status, answer.out).toBe(1);
    expect(answer.out).toMatch(/HTTP 404/);
    expect(rules('return new Response("", { status: 503 });').status).toBe(1);
  });

  it("passes offline only on a network error, and says so", () => {
    for (const thrown of ['new TypeError("fetch failed")', 'new DOMException("timed out", "TimeoutError")']) {
      const offline = rules(`throw ${thrown};`);
      expect(offline.status, offline.out).toBe(0);
      expect(offline.out).toMatch(/not verified \(offline/);
    }
  });

  it("never passes offline under CI, which always has a network", () => {
    const ci = rules('throw new TypeError("fetch failed");', { ...LOCAL, CI: "true" });
    expect(ci.status, ci.out).toBe(1);
  });

  // 0.52 code review (scripts/check-commit-rules.mjs): only `fetch()` was inside the try,
  // and the body read is bound by the same 8 s timeout. Headers in time and a body that
  // was not crashed the script with an unhandled TimeoutError: the pre-push hook blocked,
  // and CI printed a stack instead of the line that names the URL.
  const SLOW_BODY =
    'return new Response(new ReadableStream({ start(c) { c.error(new DOMException("The operation was aborted due to timeout", "TimeoutError")); } }), { status: 200 });';

  it("passes offline when the body times out after the headers, as for no answer at all", () => {
    const slow = rules(SLOW_BODY);
    expect(slow.status, slow.out).toBe(0);
    expect(slow.out).toMatch(/not verified \(offline/);
  });

  it("fails under CI on a body that times out, naming the URL rather than a stack", () => {
    const ci = rules(SLOW_BODY, { ...LOCAL, CI: "true" });
    expect(ci.status, ci.out).toBe(1);
    expect(ci.out).toMatch(/✖ shared commit rules not verified: https:\/\/raw\.githubusercontent\.com\//);
  });
});

/**
 * 0.52 code review (scripts/check-tailwind-scan.mjs): `process.exit` does not run a
 * `finally`. The scan exited inside the `try` whose `finally` deletes its scratch app, so
 * every failing run left a `uikit-tailwind-app-*` in the temp dir with a symlink to the
 * repository inside. No script may exit from inside a `try` that has a `finally`.
 */
describe("the scripts' cleanup", () => {
  it("never calls process.exit inside a try whose finally would clean up", () => {
    const dir = join(ROOT, "scripts");
    const found: string[] = [];
    for (const file of readdirSync(dir).filter((f) => /\.(?:mjs|cjs|js)$/.test(f))) {
      const source = ts.createSourceFile(file, readFileSync(join(dir, file), "utf8"), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node, inTry: boolean): void => {
        if (ts.isTryStatement(node) && node.finallyBlock) {
          visit(node.tryBlock, true);
          if (node.catchClause) visit(node.catchClause, true);
          visit(node.finallyBlock, inTry);
          return;
        }
        // A function declared in the try runs on its own terms (a callback, a handler).
        const inside = inTry && !ts.isFunctionLike(node);
        if (inside && ts.isCallExpression(node) && node.expression.getText(source) === "process.exit")
          found.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
        ts.forEachChild(node, (child) => visit(child, inside));
      };
      visit(source, false);
    }
    expect(found).toEqual([]);
  });
});
