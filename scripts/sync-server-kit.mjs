#!/usr/bin/env node
/**
 * The server-kit documentation data, pinned to one server-kit release — like the wheel.
 *
 * Each server-kit release attaches `server-kit-api.json` (its `scripts/export_api.py`
 * reads the installed package): every module's docstring, every member's signature, and
 * the sample mails rendered. The showcase's "Server kit" group renders that file, and this
 * script is the ONLY way it gets into the repository:
 *
 *   - it is copied to showcase/src/server-kit/api.json and COMMITTED, so CI and the Pages
 *     deploy build without a network, and a showcase build documents exactly the release
 *     its file names — never "whatever main of server-kit says today";
 *   - its format and version are checked first, so a release written for a newer reader
 *     fails here, loudly, instead of rendering half a page;
 *   - each module's contract section ("§6" of docs/settings-harmonization.md) becomes a
 *     link: the heading is looked up in THIS repository's docs/ and turned into GitHub's
 *     anchor for it, and the full URL is stored beside the section. A section the doc does
 *     not have fails the run — a dead link is found here, not by a reader.
 *
 * Usage:
 *   node scripts/sync-server-kit.mjs --from <path>     copy a local export (server-kit's dist/)
 *   node scripts/sync-server-kit.mjs --tag v0.5.0      download the release asset
 *   node scripts/sync-server-kit.mjs --check [--from <path> | --tag vX.Y.Z]
 *       exit 1 unless the committed file equals what that source would write. Without a
 *       source it re-checks the committed file against itself: the format, and that every
 *       contract heading still exists and still has the anchor stored (a renamed heading
 *       in docs/ fails it).
 *
 * After a sync, run `node scripts/gen-showcase-search-index.mjs`: the search index reads
 * the modules and members out of the copied file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = join(ROOT, "showcase/src/server-kit/api.json");

export const FORMAT = "eifi1-server-kit-api";
export const FORMAT_VERSION = 1;
export const SERVER_KIT_REPO = "Eifi1/server-kit";
export const ASSET = "server-kit-api.json";
/** Where a contract link points: the doc on ui-kit's main branch, as GitHub renders it. */
export const DOCS_BASE = "https://github.com/Eifi1/ui-kit/blob/main/";

/* ── GitHub's heading anchors ────────────────────────────────────────────── */

/**
 * GitHub's anchor for a heading's text — github-slugger's rule, which is what github.com
 * runs: lower case, every character dropped that is not a letter, a mark, a number, `_`,
 * `-` or a space, and each space a `-`. Nothing is collapsed, so "a — b" is `a--b`.
 *
 * The text is the RENDERED heading: inline code keeps its text without the backticks, a
 * link keeps its words, emphasis loses its markers. `### 6.1 \`/auth/me\`` is `61-authme`.
 */
export function headingSlug(markdownText) {
  const text = markdownText
    .replace(/<[^>]+>/g, "") // inline HTML: <a id="…"></a>, <code>
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // [words](url) and images
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(^|[^\w])_{1,2}(?=\S)(.+?)(?<=\S)_{1,2}(?=[^\w]|$)/g, "$1$2"); // _em_, __strong__
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");
}

/**
 * Every ATX heading of a Markdown document with its anchor, in order — duplicates
 * numbered the way GitHub numbers them (`notes`, `notes-1`, `notes-2`). Headings inside a
 * fenced code block are not headings.
 */
export function headingAnchors(markdown) {
  const out = [];
  const seen = new Map();
  let fence = null;
  for (const line of markdown.split(/\r?\n/)) {
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const m = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if (!m) continue;
    const text = m[2];
    const base = headingSlug(text);
    let slug = base;
    // github-slugger: a taken slug gets `-1`, `-2`… counted per ORIGINAL slug.
    while (seen.has(slug)) {
      const n = seen.get(base) + 1;
      seen.set(base, n);
      slug = `${base}-${n}`;
    }
    seen.set(slug, 0);
    out.push({ level: m[1].length, text, anchor: slug });
  }
  return out;
}

/** "§3.5, §3.6" → ["3.5", "3.6"]; "§6" → ["6"]. */
export function sectionNumbers(section) {
  return [...String(section).matchAll(/§\s*(\d+(?:\.\d+)*)/g)].map((m) => m[1]);
}

/**
 * The heading a section number names: the first whose text starts with the number,
 * followed by a full stop, a space or nothing — so "8" is `## 8. What the kits add` and
 * never `### 8.1 …`, and "3.5" is not "3.51".
 */
export function findSection(markdown, number) {
  const escaped = number.replace(/\./g, "\\.");
  const re = new RegExp(`^${escaped}(?:\\.(?!\\d)|\\s|$)`);
  return headingAnchors(markdown).find((h) => re.test(h.text.trim()));
}

/* ── Validation ──────────────────────────────────────────────────────────── */

const isStr = (v) => typeof v === "string";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Every problem with an export, as readable lines; empty when it can be rendered. */
export function validate(api, { tag } = {}) {
  const errors = [];
  if (!isObj(api)) return ["the file is not a JSON object"];
  if (api.format !== FORMAT) {
    return [`format is ${JSON.stringify(api.format)}, expected ${JSON.stringify(FORMAT)}`];
  }
  if (api.version !== FORMAT_VERSION) {
    return [
      typeof api.version === "number" && api.version > FORMAT_VERSION
        ? `format version ${api.version} is newer than this reader (${FORMAT_VERSION}): update the showcase's server-kit pages first`
        : `format version ${JSON.stringify(api.version)}, expected ${FORMAT_VERSION}`,
    ];
  }
  if (!isStr(api.kit_version) || !/^\d+\.\d+\.\d+(?:[-.+][0-9A-Za-z.-]+)?$/.test(api.kit_version)) {
    errors.push(`kit_version ${JSON.stringify(api.kit_version)} is not a version`);
  } else if (tag && tag.replace(/^v/, "") !== api.kit_version) {
    errors.push(`the release ${tag} carries kit_version ${api.kit_version}`);
  }

  if (!Array.isArray(api.modules) || api.modules.length === 0) {
    errors.push("modules is missing or empty");
  } else {
    const names = new Set();
    api.modules.forEach((mod, i) => {
      const where = isObj(mod) && isStr(mod.name) ? mod.name : `modules[${i}]`;
      if (!isObj(mod)) return errors.push(`${where} is not an object`);
      if (!isStr(mod.name) || !/^eifi1_server_kit\.[a-z_][a-z0-9_]*$/.test(mod.name)) {
        errors.push(`${where}: name ${JSON.stringify(mod.name)} is not an eifi1_server_kit module`);
      } else if (names.has(mod.name)) errors.push(`${where} is listed twice`);
      names.add(mod.name);
      for (const key of ["summary", "doc"]) if (!isStr(mod[key])) errors.push(`${where}: ${key} is not a string`);
      if (mod.contract !== undefined) {
        const c = mod.contract;
        if (!isObj(c) || !isStr(c.doc) || !isStr(c.section)) {
          errors.push(`${where}: contract needs a doc and a section`);
        } else {
          if (isAbsolute(c.doc) || normalize(c.doc).startsWith("..") || !c.doc.endsWith(".md")) {
            errors.push(`${where}: contract doc ${JSON.stringify(c.doc)} is not a repository Markdown path`);
          }
          if (sectionNumbers(c.section).length === 0) {
            errors.push(`${where}: contract section ${JSON.stringify(c.section)} names no §`);
          }
        }
      }
      if (!Array.isArray(mod.members)) return errors.push(`${where}: members is not a list`);
      const seen = new Set();
      mod.members.forEach((m, j) => {
        const at = isObj(m) && isStr(m.name) ? `${where}.${m.name}` : `${where}.members[${j}]`;
        if (!isObj(m)) return errors.push(`${at} is not an object`);
        for (const key of ["name", "kind", "signature", "doc"]) {
          if (!isStr(m[key])) errors.push(`${at}: ${key} is not a string`);
        }
        if (isStr(m.name)) {
          if (seen.has(m.name)) errors.push(`${at} is listed twice`);
          seen.add(m.name);
        }
        for (const key of ["fields", "values", "methods"]) {
          if (m[key] === undefined) continue;
          if (!Array.isArray(m[key]) || !m[key].every((x) => isObj(x) && isStr(x.name))) {
            errors.push(`${at}: ${key} is not a list of named entries`);
          }
        }
      });
    });
  }

  if (!Array.isArray(api.mails)) {
    errors.push("mails is not a list");
  } else {
    const seen = new Set();
    api.mails.forEach((mail, i) => {
      const at = `mails[${i}]`;
      if (!isObj(mail)) return errors.push(`${at} is not an object`);
      for (const key of ["id", "title", "locale", "subject", "html"]) {
        if (!isStr(mail[key])) errors.push(`${at}: ${key} is not a string`);
      }
      const key = `${mail.id} ${mail.locale}`;
      if (seen.has(key)) errors.push(`${at}: ${mail.id} in ${mail.locale} is listed twice`);
      seen.add(key);
    });
  }
  return errors;
}

/* ── The copy ────────────────────────────────────────────────────────────── */

/**
 * The file as committed: the export unchanged, plus each contract's `links` (one per §,
 * with the heading it names and its full URL) and `url` (the first). Idempotent — the
 * links are recomputed from `doc` and `section` every time — so the committed file can
 * be checked against itself.
 *
 * `readDoc(path)` reads a repository-relative path; it throws when the file is missing.
 */
export function withContractLinks(api, readDoc) {
  const errors = [];
  const modules = api.modules.map((mod) => {
    if (!mod.contract) return mod;
    const { doc, section } = mod.contract;
    let markdown;
    try {
      markdown = readDoc(doc);
    } catch {
      errors.push(`${mod.name}: ${doc} does not exist in this repository`);
      return mod;
    }
    const links = [];
    for (const number of sectionNumbers(section)) {
      const heading = findSection(markdown, number);
      if (!heading) {
        errors.push(`${mod.name}: ${doc} has no heading for §${number}`);
        continue;
      }
      links.push({
        section: `§${number}`,
        heading: heading.text.replace(/`/g, ""),
        url: `${DOCS_BASE}${doc}#${heading.anchor}`,
      });
    }
    return { ...mod, contract: { doc, section, url: links[0]?.url ?? `${DOCS_BASE}${doc}`, links } };
  });
  if (errors.length) throw new SyncError(errors);
  return { ...api, modules };
}

export class SyncError extends Error {
  constructor(lines) {
    super(lines.join("\n"));
    this.lines = lines;
  }
}

/** The text of the file this script writes, for `api` — or a SyncError naming every problem. */
export function render(api, { readDoc = readRepoFile, tag } = {}) {
  const errors = validate(api, { tag });
  if (errors.length) throw new SyncError(errors);
  return `${JSON.stringify(withContractLinks(api, readDoc), null, 2)}\n`;
}

function readRepoFile(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

/* ── Sources ─────────────────────────────────────────────────────────────── */

async function download(tag) {
  const url = `https://github.com/${SERVER_KIT_REPO}/releases/download/${tag}/${ASSET}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.ok) return await res.text();
    console.warn(`… ${url} answered ${res.status}; trying gh`);
  } catch (error) {
    console.warn(`… ${url} failed (${error.message}); trying gh`);
  }
  // `gh` carries the user's token: it also reaches a draft or a private release. Into a
  // directory of its own (`--dir`): `--output` only exists in newer releases of gh.
  const dir = mkdtempSync(join(tmpdir(), "server-kit-api-"));
  try {
    execFileSync("gh", ["release", "download", tag, "--repo", SERVER_KIT_REPO, "--pattern", ASSET, "--dir", dir], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return readFileSync(join(dir, ASSET), "utf8");
  } catch (error) {
    const why = String(error.stderr ?? error.message).trim().split("\n")[0];
    throw new SyncError([`${tag} has no ${ASSET} on github.com/${SERVER_KIT_REPO} (gh: ${why})`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const args = { check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") args.check = true;
    else if (a === "--from") args.from = argv[++i];
    else if (a === "--tag") args.tag = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else throw new SyncError([`unknown argument ${a}`]);
  }
  if (args.from && args.tag) throw new SyncError(["give --from or --tag, not both"]);
  if (args.tag && !/^v\d+\.\d+\.\d+/.test(args.tag)) throw new SyncError([`--tag ${args.tag} is not vX.Y.Z`]);
  if (!args.check && !args.from && !args.tag) {
    throw new SyncError(["give --from <server-kit-api.json> or --tag vX.Y.Z (or --check)"]);
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  const out = args.out ? resolve(args.out) : OUT;
  const rel = (p) => (p.startsWith(ROOT) ? p.slice(ROOT.length + 1) : p);
  let source;
  if (args.from) source = readFileSync(resolve(args.from), "utf8");
  else if (args.tag) source = await download(args.tag);
  else if (existsSync(out)) source = readFileSync(out, "utf8");
  else throw new SyncError([`${rel(out)} does not exist — run with --from or --tag first`]);

  let api;
  try {
    api = JSON.parse(source);
  } catch (error) {
    throw new SyncError([`the source is not JSON: ${error.message}`]);
  }
  const text = render(api, { tag: args.tag });

  if (args.check) {
    const current = existsSync(out) ? readFileSync(out, "utf8") : "";
    if (current !== text) {
      let committed;
      try {
        committed = JSON.parse(current).kit_version;
      } catch {
        committed = "nothing";
      }
      throw new SyncError([
        `${rel(out)} (server-kit ${committed}) is not what this source gives (server-kit ${api.kit_version}) — run node scripts/sync-server-kit.mjs ${args.tag ? `--tag ${args.tag}` : args.from ? `--from ${args.from}` : "--from <server-kit-api.json>"}`,
      ]);
    }
    console.log(`✓ ${rel(out)} is server-kit ${api.kit_version}, and its contract links resolve`);
    return;
  }
  writeFileSync(out, text);
  const members = api.modules.reduce((n, m) => n + m.members.length, 0);
  console.log(
    `✓ wrote ${rel(out)}: server-kit ${api.kit_version}, ${api.modules.length} modules, ${members} members, ${api.mails.length} mails`,
  );
  console.log("  now run: node scripts/gen-showcase-search-index.mjs");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    const lines = error instanceof SyncError ? error.lines : [error.stack ?? String(error)];
    console.error(`✖ server-kit sync failed:\n  ${lines.join("\n  ")}`);
    process.exit(1);
  });
}
