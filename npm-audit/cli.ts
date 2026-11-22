import { spawnSync } from "node:child_process";
import process from "node:process";

/**
 * `eifi1-npm-audit` — the dependency audit for every npm project's gate: known
 * vulnerabilities BLOCK at high and critical, as `npm audit --audit-level=high` does, and an
 * advisory WITHOUT A FIX can be accepted on purpose, by id and with a reason, until a fixed
 * version ships. The npm twin of server-kit's `eifi1_server_kit.dependency_audit`.
 *
 * Marcel, 2026-11-17: picomatch's GHSA-fc5q-39xc-vjpf (ReDoS, high, `<=4.0.7`, no patched
 * version) reached every Eifi1 repo through vite, vitest and typescript-eslint — build and
 * test tools only — and stopped every push. *"Bis zum Fix akzeptieren"*: one advisory,
 * named, while it has no fix; the day one ships, the gate fails again by itself.
 * (GitHub withdrew that advisory on 2026-11-18; the exception went with it.)
 *
 *     eifi1-npm-audit
 *     eifi1-npm-audit --ignore-until-fixed GHSA-xxxx-xxxx-xxxx="dev tools only, no fix yet"
 *
 * **Exit 0**: nothing at or above the level, or only accepted advisories. **Exit 1**: a
 * finding blocks. **Exit 2**: the audit could not be read, a version could not be looked
 * up, or a flag is wrong — never a pass.
 *
 * 1. **The findings** are `npm audit --json` (report version 2) over the whole tree, dev
 *    dependencies included, read strictly: anything else fails with what went wrong.
 * 2. **The rule**: `--audit-level` (default `high`) and above BLOCK; below it, one line per
 *    advisory, and the run passes.
 * 3. **An exception** is the project's, never an edit of the kit: `--ignore-until-fixed
 *    ID=reason`, repeatable, the reason required. It holds only while the advisory's
 *    vulnerable range still covers the package's LATEST published version (`npm view`),
 *    so no fix exists yet. Once one is out, the advisory blocks again with "upgrade, then
 *    drop the exception". Every accepted advisory prints its reason on every run.
 * 4. **Never for what ships** (Staunlabor's rule, 2026-11-17): an advisory that
 *    `npm audit --omit=dev` also reports reaches a runtime dependency and blocks, accepted
 *    or not.
 * 5. **No stale exceptions** (the same): an exception npm no longer reports at the level
 *    blocks with "remove it", so the list never outlives its advisory.
 *
 * This module only exports. The bin is `npm-audit/bin.mjs`, which runs `runNpmAuditCli`
 * unconditionally (refactor audit 2026-11-22, TST-3).
 */

/** Severity ranks, as npm names them. */
export const AUDIT_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 } as const;
export type AuditSeverity = keyof typeof AUDIT_RANK;

const isSeverity = (value: unknown): value is AuditSeverity =>
  typeof value === "string" && Object.hasOwn(AUDIT_RANK, value);

export interface AuditOptions {
  /** GHSA id → the reason it is accepted while it has no fix. */
  exceptions: Map<string, string>;
  level: AuditSeverity;
}

export class AuditUsageError extends Error {}

const GHSA = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/;

/** `--ignore-until-fixed ID=reason` (or `--ignore-until-fixed=ID=reason`), `--audit-level X`. */
export function parseAuditArgs(argv: readonly string[]): AuditOptions {
  const exceptions = new Map<string, string>();
  let level: AuditSeverity = "high";
  const take = (flag: string, i: number): [string, number] => {
    const arg = argv[i]!;
    if (arg.startsWith(`${flag}=`)) return [arg.slice(flag.length + 1), i];
    const value = argv[i + 1];
    if (value === undefined) throw new AuditUsageError(`${flag} needs a value`);
    return [value, i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--ignore-until-fixed" || arg.startsWith("--ignore-until-fixed=")) {
      const [value, next] = take("--ignore-until-fixed", i);
      i = next;
      const eq = value.indexOf("=");
      const id = (eq < 0 ? value : value.slice(0, eq)).trim();
      const reason = eq < 0 ? "" : value.slice(eq + 1).trim();
      if (!GHSA.test(id)) {
        throw new AuditUsageError(`--ignore-until-fixed: "${id}" is not a GHSA id (GHSA-xxxx-xxxx-xxxx)`);
      }
      if (reason === "") throw new AuditUsageError(`--ignore-until-fixed ${id}: a reason is required (ID=reason)`);
      exceptions.set(id, reason);
    } else if (arg === "--audit-level" || arg.startsWith("--audit-level=")) {
      const [value, next] = take("--audit-level", i);
      i = next;
      if (!isSeverity(value)) {
        throw new AuditUsageError(`--audit-level: one of ${Object.keys(AUDIT_RANK).join(", ")}`);
      }
      level = value;
    } else {
      throw new AuditUsageError(`unknown argument: ${arg}`);
    }
  }
  return { exceptions, level };
}

// ── Versions and ranges: the comparator sets npm audit writes ("<=4.0.7",
// ">=7.0.0 <11.0.1", "<2.3.2 || >=3.0.0 <3.0.1", "*"). ──────────────────────────────────

interface Version {
  major: number;
  minor: number;
  patch: number;
  pre: string[];
}

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function parseVersion(text: string): Version | null {
  const m = VERSION.exec(text.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ? m[4].split(".") : [] };
}

function comparePre(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return a.length === b.length ? 0 : a.length === 0 ? 1 : -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) return Number(x) < Number(y) ? -1 : 1;
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return comparePre(a.pre, b.pre);
}

/** Does `version` fall in `range`? `null` when either cannot be read (the caller fails closed). */
export function versionInRange(version: string, range: string): boolean | null {
  const v = parseVersion(version);
  if (!v) return null;
  let any = false;
  for (const set of range.split("||").map((s) => s.trim())) {
    if (set === "") return null;
    if (set === "*") return true;
    let all = true;
    for (const part of set.split(/\s+/)) {
      const m = /^(<=|>=|<|>|=)?(.+)$/.exec(part);
      const bound = m ? parseVersion(m[2]!) : null;
      if (!m || !bound) return null;
      const c = compareVersions(v, bound);
      const op = m[1] ?? "=";
      const ok = op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : op === ">=" ? c >= 0 : c === 0;
      if (!ok) all = false;
    }
    if (all) any = true;
  }
  return any;
}

// ── The report ──────────────────────────────────────────────────────────────────────────

export interface Advisory {
  id: string;
  name: string;
  title: string;
  severity: AuditSeverity;
  range: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The advisories of an `npm audit --json` report (version 2), one per GHSA id, worst first. */
export function advisoriesOf(report: unknown): Advisory[] {
  if (!isRecord(report) || report.auditReportVersion !== 2) {
    const seen = isRecord(report) ? String(report.auditReportVersion ?? "missing") : "missing";
    throw new Error(`not an npm audit report (auditReportVersion ${seen}; expected 2)`);
  }
  if (!isRecord(report.vulnerabilities)) throw new Error("the report has no vulnerabilities object");
  const found = new Map<string, Advisory>();
  for (const entry of Object.values(report.vulnerabilities)) {
    if (!isRecord(entry) || !Array.isArray(entry.via)) throw new Error("a vulnerability has no via list");
    for (const via of entry.via as unknown[]) {
      // A name is a path through another package, whose own entry carries the advisory.
      if (typeof via === "string") continue;
      const url = isRecord(via) && typeof via.url === "string" ? via.url : "";
      const id = url.split("/").pop() ?? "";
      if (
        !isRecord(via) ||
        id === "" ||
        typeof via.name !== "string" ||
        !isSeverity(via.severity) ||
        typeof via.range !== "string"
      ) {
        throw new Error(`an advisory this tool cannot read: ${JSON.stringify(via)}`);
      }
      found.set(id, {
        id,
        name: via.name,
        title: typeof via.title === "string" ? via.title : "",
        severity: via.severity,
        range: via.range,
      });
    }
  }
  return [...found.values()].sort(
    (a, b) => AUDIT_RANK[b.severity] - AUDIT_RANK[a.severity] || a.id.localeCompare(b.id),
  );
}

export interface AuditVerdict {
  lines: string[];
  /** 0 passes, 1 blocks. */
  code: 0 | 1;
}

/**
 * The verdict over the advisories: the lines to print and the exit code. `latestOf(name)`
 * gives the package's latest published version, or throws.
 */
export function decideAudit(
  advisories: readonly Advisory[],
  { exceptions, level }: AuditOptions,
  latestOf: (name: string) => string,
  /** The ids `npm audit --omit=dev` reports: these reach what ships, and are never accepted. */
  runtimeIds: ReadonlySet<string> = new Set(),
): AuditVerdict {
  const lines: string[] = [];
  const used = new Set<string>();
  let blocked = 0;
  for (const a of advisories) {
    const head = `${a.id} ${a.name} ${a.severity} (${a.range})${a.title ? ` — ${a.title}` : ""}`;
    if (AUDIT_RANK[a.severity] < AUDIT_RANK[level]) {
      lines.push(`audit: below ${level}, passes: ${head}`);
      continue;
    }
    const reason = exceptions.get(a.id);
    if (reason === undefined) {
      lines.push(`audit: BLOCKS: ${head}`);
      blocked++;
      continue;
    }
    used.add(a.id);
    if (runtimeIds.has(a.id)) {
      lines.push(
        `audit: BLOCKS: ${head} — it reaches a runtime dependency (npm audit --omit=dev); no exception for what ships`,
      );
      blocked++;
      continue;
    }
    const latest = latestOf(a.name);
    const unfixed = versionInRange(latest, a.range);
    if (unfixed === null) {
      throw new Error(`cannot compare ${a.name}@${latest} with the range "${a.range}" of ${a.id}`);
    }
    if (unfixed) {
      lines.push(
        `audit: accepted until fixed (${a.name} ${latest}, the latest, is still affected): ${head} — ${reason}`,
      );
    } else {
      lines.push(
        `audit: BLOCKS: ${head} — a fixed version exists (${a.name} ${latest}): upgrade, then drop --ignore-until-fixed ${a.id}`,
      );
      blocked++;
    }
  }
  for (const id of exceptions.keys()) {
    if (!used.has(id)) {
      lines.push(`audit: BLOCKS: --ignore-until-fixed ${id} matches nothing at ${level} or above; remove it`);
      blocked++;
    }
  }
  if (blocked > 0) {
    lines.push(
      `audit: ${blocked} ${blocked === 1 ? "advisory blocks" : "advisories block"}: upgrade, or accept one without a fix: --ignore-until-fixed ID=reason`,
    );
    return { lines, code: 1 };
  }
  lines.push(`audit: nothing at ${level} or above blocks`);
  return { lines, code: 0 };
}

// ── The command ─────────────────────────────────────────────────────────────────────────

export interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function npm(args: string[]): CommandResult {
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function latestOfNpm(name: string): string {
  const r = npm(["view", name, "version", "--json"]);
  if (r.status !== 0) throw new Error(`npm view ${name} version failed: ${(r.stderr || r.stdout).trim()}`);
  const version: unknown = JSON.parse(r.stdout);
  if (typeof version !== "string") throw new Error(`npm view ${name} version gave ${r.stdout.trim()}`);
  return version;
}

export interface AuditCliIo {
  /** `npm audit --json`, with `--omit=dev` when `runtimeOnly`. */
  audit?: (runtimeOnly: boolean) => CommandResult;
  latestOf?: (name: string) => string;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

/** `eifi1-npm-audit [--audit-level high] [--ignore-until-fixed ID=reason]…` → its exit code. */
export function runNpmAuditCli(argv: readonly string[], io: AuditCliIo = {}): 0 | 1 | 2 {
  const {
    audit = (runtimeOnly) => npm(runtimeOnly ? ["audit", "--json", "--omit=dev"] : ["audit", "--json"]),
    latestOf = latestOfNpm,
    log = (line) => console.log(line),
    error = (line) => console.error(line),
  } = io;
  let options: AuditOptions;
  try {
    options = parseAuditArgs(argv);
  } catch (e) {
    error(`eifi1-npm-audit: ${(e as Error).message}`);
    error('usage: eifi1-npm-audit [--audit-level high] [--ignore-until-fixed GHSA-xxxx-xxxx-xxxx="reason"]…');
    return 2;
  }
  const read = (runtimeOnly: boolean): Advisory[] => {
    const r = audit(runtimeOnly);
    const what = runtimeOnly ? "npm audit --omit=dev" : "npm audit";
    if (r.status !== 0 && r.status !== 1) throw new Error(`${what} exited ${r.status}: ${r.stderr.trim()}`);
    const report: unknown = JSON.parse(r.stdout);
    if (isRecord(report) && isRecord(report.error)) {
      throw new Error(`${what}: ${String(report.error.summary ?? JSON.stringify(report.error))}`);
    }
    return advisoriesOf(report);
  };
  try {
    const all = read(false);
    // Only an accepted advisory needs the runtime look; without exceptions, skip the second run.
    const runtimeIds = options.exceptions.size > 0 ? new Set(read(true).map((a) => a.id)) : new Set<string>();
    const { lines, code } = decideAudit(all, options, latestOf, runtimeIds);
    for (const line of lines) (code === 0 ? log : error)(line);
    return code;
  } catch (e) {
    error(`eifi1-npm-audit: ${(e as Error).message} — not a pass`);
    return 2;
  }
}
