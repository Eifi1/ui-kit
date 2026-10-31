#!/usr/bin/env node
/**
 * `check:api`: this release's public types against the last release's (refactor audit
 * 2026-10-30, API-1).
 *
 * Nothing compared them, so a change that broke an app's typecheck reached the app with
 * no word in its adopt doc. The audit ran this comparison over every pair of releases
 * from 0.34.0 to 0.51.6 and found exactly two such releases, both in the tour API and
 * both hitting keksdose: 0.50.0 (`TourStep.beforeStep(ctx)`; 25 `beforeStep!()` test calls stopped
 * type-checking) and 0.50.1, a patch "with nothing to change" that gave `TourLauncher` a
 * required fourth parameter (a forwarder's 3-argument call no longer type-checked).
 *
 * What it compares, through TypeScript's checker over the two packages' `dist/**\/*.d.ts`
 * (every `exports` entry but the catalogues and the ESLint plugin):
 *   - an export that is gone, or no longer a value (`export type`, a function become a
 *     type alias, a class become an interface) or no longer a type;
 *   - a function or component, every overload: more required arguments, a parameter that
 *     no longer takes what it took, a return type that is no longer what it was;
 *   - a constant whose type is no longer the old one's;
 *   - a type, both ways: the old not assignable to the new breaks what an app PASSES (a
 *     prop removed, a member made required), the new not assignable to the old breaks
 *     what an app RECEIVES or CALLS (a union that grew, a callback parameter added);
 *   - a generic type that requires more type arguments, or takes fewer.
 *
 * What it leaves out, because it breaks no app: a key NEW to a `*Labels` type (an app
 * passes `LabelOverride`, so a new key cannot break it; a key gone, or a `*Labels` export
 * gone, does), and a change that is only another flagged type showing through
 * (`ButtonProps` because `ButtonVariant` lost a member: its member's type is written the
 * same before and after, and names the flagged type) — that one is printed "through
 * ButtonVariant", and only the root needs a word. A generic type is compared as an app
 * writes it, with its defaults (`any` for a parameter without one); a generic function by
 * its required arguments.
 *
 * Every changed name is printed. Each must be NAMED in the adopt doc of the release being
 * made, in backticks, under a heading or a bold lead that says "must change" (or a
 * "(breaking)" heading, like a minor's "Removed: … (breaking)" table): the sections of
 * docs/adopt-<previous minor>.md after the previous release's own, and any newer
 * minor's adopt doc. That is the gate.
 *
 * The previous release is the newest published version at or below package.json's (the
 * git tags and the registry, which answer offline from npm's cache), packed by
 * `npm pack --prefer-offline`. ~4 s and 0.45 GB a pair. verify-package runs it on the
 * installed tarball; with no network and nothing cached it says so and passes, except
 * under CI.
 *
 *   node scripts/check-api-compat.mjs                         dist/ against the previous release
 *   node scripts/check-api-compat.mjs --old 0.50.0 --new 0.50.1  two published releases (print only)
 *   node scripts/check-api-compat.mjs --old <dir> --new <dir>    two package directories (print only)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(join(ROOT, "package.json"));
const NAME = "@eifi1/ui-kit";

/* ── Versions ─────────────────────────────────────────────────────────────────────── */

const parse = (v) => v.split(".").map(Number);
export const compareVersions = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

/** The release to compare against: the newest published at or below `version` — the
 *  version itself between releases, the one before it on a release commit. */
export function previousRelease(version, published) {
  return (
    [...published]
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && compareVersions(v, version) <= 0)
      .sort(compareVersions)
      .at(-1) ?? null
  );
}

/** The published versions: the `v*` tags, and the registry as npm's cache knows it. */
export function publishedVersions(root = ROOT) {
  const found = new Set();
  try {
    for (const tag of execFileSync("git", ["tag", "--list", "v*"], { cwd: root, encoding: "utf8" }).split("\n")) {
      if (/^v\d+\.\d+\.\d+$/.test(tag.trim())) found.add(tag.trim().slice(1));
    }
  } catch {
    /* no git: the registry alone */
  }
  try {
    const out = execFileSync("npm", ["view", NAME, "versions", "--json", "--prefer-offline"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const v of [JSON.parse(out)].flat()) found.add(v);
  } catch {
    /* offline with nothing cached: the tags alone */
  }
  return found;
}

/** No answer from the registry at all, as opposed to an answer that says no. */
const isNetworkError = (error) =>
  /E(?:NOTFOUND|AI_AGAIN|CONNREFUSED|CONNRESET|TIMEDOUT|NETUNREACH)|ENOTCACHED|network/i.test(
    `${error.stderr ?? ""} ${error.message ?? ""}`,
  );

/** npm answered: no such version (as opposed to no answer at all). */
const isNotFound = (error) => /\b(?:ETARGET|E404)\b/.test(`${error.stderr ?? ""} ${error.stdout ?? ""}`);

/**
 * `@eifi1/ui-kit@<version>` unpacked into `dir`; its package directory. npm's cache first;
 * a cached registry entry from before the release ("No matching version", ETARGET) is
 * asked again online: the cache's entry still ended at 0.51.6 while 0.51.7 was live.
 */
export function packRelease(version, dir) {
  mkdirSync(dir, { recursive: true });
  const pack = (mode) =>
    execFileSync("npm", ["pack", `${NAME}@${version}`, "--json", mode, "--pack-destination", dir], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  let out;
  try {
    out = pack("--prefer-offline");
  } catch (error) {
    if (!isNotFound(error)) throw error;
    out = pack("--prefer-online");
  }
  const packed = JSON.parse(out);
  const filename = (Array.isArray(packed) ? packed : Object.values(packed))[0].filename;
  execFileSync("tar", ["-xzf", join(dir, filename), "-C", dir]);
  return join(dir, "package");
}

/* ── The comparison ───────────────────────────────────────────────────────────────── */

/** The `.d.ts` of every `exports` entry but the catalogues, the ESLint plugin and CSS. */
function entries(pkgDir) {
  const { exports } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  return Object.entries(exports)
    .filter(([key, target]) => typeof target === "object" && !key.includes("*") && key !== "./eslint")
    .map(([key, target]) => ({ entry: key === "." ? "." : key.slice(2), types: target.types }))
    .filter(({ types }) => types && existsSync(join(pkgDir, types)));
}

/**
 * Every change between the public types of `oldDir` and `newDir` (two package
 * directories, each with its package.json and dist/), as
 * `{ kind, entry, name, detail, through }` — `through` lists the flagged types a change
 * only shows through, empty for a root change.
 */
export function compareApi(oldDir, newDir) {
  const ts = require("typescript");
  const oldEntries = entries(oldDir);
  const newEntries = new Map(entries(newDir).map((e) => [e.entry, e]));
  const nm = join(ROOT, "node_modules");
  const options = {
    jsx: ts.JsxEmit.ReactJSX,
    skipLibCheck: true,
    noEmit: true,
    strict: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: [],
    // The packages' own imports (react, react-router, …) from the kit's node_modules.
    baseUrl: nm,
    paths: { "*": [`${nm}/*`, `${nm}/@types/*`] },
  };
  const roots = [
    ...oldEntries.map((e) => join(oldDir, e.types)),
    ...[...newEntries.values()].map((e) => join(newDir, e.types)),
  ];

  // A generic type is compared as an app writes it: `SyncEngineOptions` with its defaults
  // (0.46.1 made it `<D extends SyncDb = SyncDb>`), `any` for a parameter without one. The
  // instantiations are aliases in a virtual module, read by a second program that reuses
  // the first one's files.
  const virtual = join(newDir, "__check_api_generics__.ts");
  let virtualText = "";
  const host = ts.createCompilerHost(options);
  const { getSourceFile, fileExists, readFile } = host;
  host.getSourceFile = (file, language, ...rest) =>
    file === virtual
      ? ts.createSourceFile(file, virtualText, language)
      : getSourceFile.call(host, file, language, ...rest);
  host.fileExists = (file) => file === virtual || fileExists.call(host, file);
  host.readFile = (file) => (file === virtual ? virtualText : readFile.call(host, file));
  const first = ts.createProgram(roots, options, host);
  {
    const c = first.getTypeChecker();
    const generics = (file) => {
      const source = first.getSourceFile(file);
      const module = source && c.getSymbolAtLocation(source);
      return new Map(
        (module ? c.getExportsOfModule(module) : []).flatMap((s) => {
          const t = s.flags & ts.SymbolFlags.Alias ? c.getAliasedSymbol(s) : s;
          const d = t.declarations?.[0];
          // A class too: `O0.Store<any>` is its instance type (an interface may become one).
          if (!(t.flags & ts.SymbolFlags.Type) || !d) return [];
          // `any` for each leading parameter without a default; the defaulted rest left out.
          const required = (d.typeParameters ?? []).filter((p) => !p.default).length;
          return [[s.name, { generic: Boolean(d.typeParameters?.length), args: required }]];
        }),
      );
    };
    const lines = [];
    oldEntries.forEach(({ entry, types }, i) => {
      const next = newEntries.get(entry);
      if (!next) return;
      const [before, after] = [generics(join(oldDir, types)), generics(join(newDir, next.types))];
      const spec = (dir, t) => JSON.stringify(join(dir, t).replace(/\.d\.ts$/, ""));
      lines.push(
        `import type * as O${i} from ${spec(oldDir, types)};`,
        `import type * as N${i} from ${spec(newDir, next.types)};`,
      );
      for (const [name, o] of before) {
        const n = after.get(name);
        if (!n || !(o.generic || n.generic)) continue;
        const args = (k) => (k ? `<${Array(k).fill("any").join(", ")}>` : "");
        lines.push(`export type O${i}__${name} = O${i}.${name}${args(o.args)};`);
        lines.push(`export type N${i}__${name} = N${i}.${name}${args(n.args)};`);
      }
    });
    virtualText = lines.join("\n");
  }
  const program = ts.createProgram([...roots, virtual], options, host, first);
  const checker = program.getTypeChecker();
  const F = ts.SymbolFlags;
  const str = (t) => checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation);
  const short = (t) => {
    const s = str(t);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  };
  const assignable = (a, b) => checker.isTypeAssignableTo(a, b);
  const exportsOf = (file) => {
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    return new Map(module ? checker.getExportsOfModule(module).map((s) => [s.name, s]) : []);
  };
  const target = (s) => (s.flags & F.Alias ? checker.getAliasedSymbol(s) : s);
  const decl = (s) => s.declarations?.[0];
  const isLabels = (name) => /Labels$/.test(name);
  const generic = (s) => Boolean(decl(s)?.typeParameters?.length);
  /** An export an app can use as a value: a value, and not re-exported `export type` on
   *  the way (`export type { Button }` resolves to the function all the same). */
  const isValue = (s) => {
    if (!(target(s).flags & F.Value)) return false;
    for (let a = s; a && a.flags & F.Alias; a = checker.getImmediateAliasedSymbol(a)) {
      if (a.declarations?.some((d) => ts.isTypeOnlyImportOrExportDeclaration(d))) return false;
    }
    return true;
  };
  /** An object type that is neither callable nor an array: a catalogue's nested map. */
  const isPlainObject = (t) => {
    const n = checker.getNonNullableType(t);
    return (
      Boolean(n.flags & ts.TypeFlags.Object) &&
      !n.getCallSignatures().length &&
      !checker.isArrayType(n) &&
      !checker.isTupleType(n)
    );
  };
  /** How many type arguments an app's `Name<…>` must and may write. */
  const typeArity = (s) => {
    const params = decl(s)?.typeParameters ?? [];
    return { required: params.filter((p) => !p.default).length, total: params.length };
  };
  const minArgs = (sig) =>
    sig.minArgumentCount ??
    sig.parameters.filter((p) => {
      const d = p.valueDeclaration;
      return d && !d.questionToken && !d.initializer && !d.dotDotDotToken;
    }).length;
  const paramType = (p, at) => checker.getTypeOfSymbolAtLocation(p, at);
  const literalsOut = (text) => text.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/-?\b\d+(?:\.\d+)?\b/g, "0");
  const LABELS_TYPE = /^(?:[A-Z]\w*Labels|LabelOverride<.*>)(?: \| undefined)?$/;
  /** An inline object type's own member changes, so a change deep inside one can still
   *  be traced to a flagged type (`{ attachment?: Partial<FeedbackNoteAttachment> }`).
   *  Two levels deep, and not into a DOM-sized type (an event, an element's props). */
  const inner = (a, b, oldAt, newAt, depth) =>
    depth < 2 &&
    !a.getCallSignatures().length &&
    !b.getCallSignatures().length &&
    a.getProperties().length &&
    a.getProperties().length < 80
      ? memberDiffs(a, b, oldAt, newAt, depth + 1)
      : undefined;

  /** Where a function signature's change shows: per parameter, and the required count. */
  function signatureDiffs(os, ns, oldAt, newAt, { returns, depth = 0 }) {
    const diffs = [];
    if (minArgs(ns) > minArgs(os)) {
      const added = ns.parameters.slice(minArgs(os), minArgs(ns)).map((p) => p.name);
      diffs.push({ detail: `requires ${minArgs(ns)} arguments, was ${minArgs(os)} (${added.join(", ")})` });
    }
    if (!os.typeParameters && !ns.typeParameters) {
      const op = os.parameters;
      const np = ns.parameters;
      for (let i = 0; i < Math.min(op.length, np.length); i++) {
        const [ot, nt] = [paramType(op[i], oldAt), paramType(np[i], newAt)];
        // A catalogue an app passes whole (`kitLabelStrings(labels)`) grows a key each
        // release; only a key gone counts (0.52 code review).
        if (LABELS_TYPE.test(str(ot))) {
          const sub = labelDiffs(ot, nt, oldAt, newAt, depth);
          if (sub.length)
            diffs.push({
              detail: `parameter ${i + 1} \`${np[i].name}\`: ${sub.map((d) => d.detail).join("; ")}`,
              types: [ot, nt],
              sub,
            });
          continue;
        }
        if (!assignable(ot, nt)) {
          const sub = inner(ot, nt, oldAt, newAt, depth);
          // Props that only gained an index signature (`data-${string}`): see the types below.
          if (sub?.length === 0 && checker.getIndexInfosOfType(nt).length > checker.getIndexInfosOfType(ot).length)
            continue;
          diffs.push({
            detail: `parameter ${i + 1} \`${np[i].name}\` takes ${short(nt)}, was ${short(ot)}`,
            types: [ot, nt],
            sub,
          });
        }
        // A parameter that takes more now: what an app's own implementation of a callback
        // type receives (`FeedbackStatusMutate`'s status can be REWORK). A function an app
        // only calls may widen freely.
        else if (!assignable(nt, ot) && (returns === "callback" || ot.getCallSignatures().length))
          diffs.push({
            detail: `parameter ${i + 1} \`${np[i].name}\` is ${short(nt)}, was ${short(ot)}`,
            types: [ot, nt],
            sub: inner(ot, nt, oldAt, newAt, depth),
          });
      }
      // A callback type that gained a parameter: a caller of it passes too few.
      if (np.length > op.length && minArgs(ns) <= minArgs(os) && returns === "callback")
        diffs.push({ detail: `has ${np.length} parameters, was ${op.length}` });
      if (returns) {
        const [or, nr] = [checker.getReturnTypeOfSignature(os), checker.getReturnTypeOfSignature(ns)];
        if (!assignable(nr, or)) diffs.push({ detail: `returns ${short(nr)}, was ${short(or)}`, types: [or, nr] });
      }
    }
    return diffs;
  }

  /** Where an object type's change shows: per member. `labels`: a `*Labels` catalogue,
   *  where a key that is new, or required now, breaks no app (it passes a LabelOverride). */
  function memberDiffs(ot, nt, oldAt, newAt, depth = 0, { labels = false } = {}) {
    const diffs = [];
    const olds = new Map(checker.getPropertiesOfType(ot).map((p) => [p.name, p]));
    const news = new Map(checker.getPropertiesOfType(nt).map((p) => [p.name, p]));
    const optional = (p) => Boolean(p.flags & F.Optional);
    for (const [name, op] of olds) {
      const np = news.get(name);
      if (!np) {
        diffs.push({ detail: `\`${name}\` is gone` });
        continue;
      }
      if (!labels && optional(op) && !optional(np)) diffs.push({ detail: `\`${name}\` is required now` });
      const [a, b] = [paramType(op, oldAt), paramType(np, newAt)];
      // A labels member grows a key each release; an app passes a LabelOverride. A key
      // gone is an excess property in the app's override (0.52 code review: 0.52 dropped
      // `TopBarPartsLabels.switchPlan`, and the gate said nothing). Inside a catalogue, a
      // map of catalogues too (`groupActions: Record<AdminGroupNoun,
      // AdminGroupActionLabels>`, which grew keys in 0.45).
      if (LABELS_TYPE.test(str(a)) || (labels && isPlainObject(a))) {
        const sub = labelDiffs(a, b, oldAt, newAt, depth);
        if (sub.length)
          diffs.push({ detail: `\`${name}\`: ${sub.map((d) => d.detail).join("; ")}`, types: [a, b], sub });
        continue;
      }
      // In a catalogue only what an app passes: a key made optional breaks no override.
      if (labels ? !assignable(a, b) : !assignable(a, b) || !assignable(b, a)) {
        const sa = a.getCallSignatures();
        const sb = b.getCallSignatures();
        if (sa.length && sb.length) {
          for (const d of overloadDiffs(sa, sb, oldAt, newAt, { returns: "callback", depth }))
            diffs.push({ ...d, detail: `\`${name}\` ${d.detail}` });
        } else
          diffs.push({
            detail: `\`${name}\` is ${short(b)}, was ${short(a)}`,
            types: [a, b],
            sub: inner(a, b, oldAt, newAt, depth),
          });
      }
    }
    for (const [name, np] of news)
      if (!labels && !olds.has(name) && !optional(np)) diffs.push({ detail: `\`${name}\` is new and required` });
    return diffs;
  }

  /** A `*Labels` catalogue's changes an app sees: a key gone, a key whose type changed.
   *  Not a key that is new. */
  function labelDiffs(a, b, oldAt, newAt, depth) {
    if (depth > 3) return [];
    const [na, nb] = [checker.getNonNullableType(a), checker.getNonNullableType(b)];
    if (assignable(na, nb) && assignable(nb, na)) return [];
    return memberDiffs(na, nb, oldAt, newAt, depth + 1, { labels: true });
  }

  /**
   * Every old overload against the new ones: a call that matched one still compiles when
   * some new overload takes it. Only the last overload was compared (0.52 code review), so
   * a removed or narrowed earlier one passed. A callback type an app implements must also
   * answer every new overload.
   */
  function overloadDiffs(co, cn, oldAt, newAt, options) {
    if (co.length === 1 && cn.length === 1) return signatureDiffs(co[0], cn[0], oldAt, newAt, options);
    const diffs = [];
    co.forEach((os, i) => {
      const tries = cn.map((ns) => signatureDiffs(os, ns, oldAt, newAt, options));
      if (tries.some((t) => t.length === 0)) return;
      // The closest new overload: the fewest changes, then the nearest position.
      const [best] = cn
        .map((_, j) => j)
        .sort((x, y) => tries[x].length - tries[y].length || Math.abs(x - i) - Math.abs(y - i));
      for (const d of tries[best]) diffs.push({ ...d, detail: `overload ${i + 1}: ${d.detail}` });
    });
    if (options.returns === "callback" && cn.length > co.length)
      diffs.push({ detail: `has ${cn.length} call signatures, was ${co.length}` });
    return diffs;
  }

  /** The virtual module's instantiations, `O3__SyncEngineOptions` → its alias symbol. */
  const instances = exportsOf(virtual);
  const raw = [];
  const seen = new Set();
  for (const { entry, types } of oldEntries) {
    const newEntry = newEntries.get(entry);
    if (!newEntry) {
      raw.push({ kind: "entry gone", entry, name: entry, diffs: [{ detail: `the entry ${entry} is gone` }] });
      continue;
    }
    const before = exportsOf(join(oldDir, types));
    const after = exportsOf(join(newDir, newEntry.types));
    for (const [name, so] of before) {
      const sn = after.get(name);
      if (!sn) {
        raw.push({ kind: "gone", entry, name, diffs: [{ detail: "removed" }] });
        continue;
      }
      if (seen.has(name)) continue;
      seen.add(name);
      const [ao, an] = [target(so), target(sn)];
      const [dOld, dNew] = [decl(ao), decl(an)];
      if (!dOld || !dNew) continue;
      // A `*Labels` catalogue: a key gone counts, a key new does not (an app passes a
      // LabelOverride). The whole export was skipped before its removal was even looked
      // at (0.52 code review).
      if (isLabels(name)) {
        const diffs = labelDiffs(
          checker.getDeclaredTypeOfSymbol(ao),
          checker.getDeclaredTypeOfSymbol(an),
          dOld,
          dNew,
          0,
        );
        if (diffs.length) raw.push({ kind: "labels", entry, name, diffs });
        continue;
      }
      // A name whose kind changed: neither branch below compared it (0.52 code review), so
      // `export type { Button }` (TS1362 at every `<Button/>`) or a function become a type
      // alias passed as nothing.
      const [valueOld, valueNew] = [isValue(so), isValue(sn)];
      const [typeOld, typeNew] = [Boolean(ao.flags & F.Type), Boolean(an.flags & F.Type)];
      if (valueOld && !valueNew)
        raw.push({ kind: "value", entry, name, diffs: [{ detail: "is no longer a value: a type only now" }] });
      if (typeOld && !typeNew)
        raw.push({ kind: "type", entry, name, diffs: [{ detail: "is no longer a type: a value only now" }] });
      if (valueOld && valueNew) {
        const [to, tn] = [checker.getTypeOfSymbolAtLocation(ao, dOld), checker.getTypeOfSymbolAtLocation(an, dNew)];
        const [co, cn] = [
          ao.flags & F.Class ? to.getConstructSignatures() : to.getCallSignatures(),
          an.flags & F.Class ? tn.getConstructSignatures() : tn.getCallSignatures(),
        ];
        let diffs = [];
        if (co.length && cn.length) {
          // A component's return (JSX) is not an app's to read; a helper's is.
          diffs = overloadDiffs(co, cn, dOld, dNew, { returns: /^[a-z]/.test(name) });
        } else if (
          !co.length &&
          !cn.length &&
          !/^DEFAULT_/.test(name) &&
          !assignable(tn, to) &&
          // Only its literal values moved (`PALETTE_HEX`'s colours): the same shape.
          literalsOut(str(to)) !== literalsOut(str(tn))
        ) {
          diffs = [{ detail: `is ${short(tn)}, was ${short(to)}`, types: [to, tn] }];
        }
        if (diffs.length) raw.push({ kind: "value", entry, name, diffs });
      }
      // A class on both sides is compared by its constructor above; an interface that
      // became a class (or the reverse) by its instance type here.
      if (typeOld && typeNew && !(valueOld && valueNew)) {
        const index = oldEntries.findIndex((e) => e.entry === entry);
        const instance = (side) => instances.get(`${side}${index}__${name}`);
        // `SyncEngineOptions<D>` become `<D, R>` compared `<any>` with `<any, any>` as equal,
        // and every app's `SyncEngineOptions<MyDb>` failed with TS2314 (0.52 code review).
        const [ka, kb] = [typeArity(ao), typeArity(an)];
        const arity = [
          ...(kb.required > ka.required
            ? [{ detail: `requires ${kb.required} type arguments, was ${ka.required}` }]
            : []),
          ...(kb.total < ka.total ? [{ detail: `takes ${kb.total} type arguments, was ${ka.total}` }] : []),
        ];
        if ((generic(ao) || generic(an)) && !(instance("O") && instance("N"))) {
          if (arity.length) raw.push({ kind: "type", entry, name, diffs: arity });
          continue;
        }
        const [to, tn] =
          generic(ao) || generic(an)
            ? [checker.getDeclaredTypeOfSymbol(instance("O")), checker.getDeclaredTypeOfSymbol(instance("N"))]
            : [checker.getDeclaredTypeOfSymbol(ao), checker.getDeclaredTypeOfSymbol(an)];
        const [fwd, back] = [assignable(to, tn), assignable(tn, to)];
        // A component's props are what an app PASSES: a prop that takes more, or became
        // optional, breaks nothing (`EmptyStateProps.headingAs` gaining "h1").
        let diffs = [];
        if (!(fwd && back) && !(/Props$/.test(name) && fwd)) {
          const [so_, sn_] = [to.getCallSignatures(), tn.getCallSignatures()];
          if (so_.length && sn_.length) diffs = overloadDiffs(so_, sn_, dOld, dNew, { returns: "callback" });
          else if (to.isUnion() || tn.isUnion()) {
            const members = (t) => new Map((t.isUnion() ? t.types : [t]).map((m) => [str(m), m]));
            const [mo, mn] = [members(to), members(tn)];
            diffs = [
              ...[...mo.keys()].filter((m) => !mn.has(m)).map((m) => ({ detail: `no longer takes ${m}` })),
              ...[...mn.keys()].filter((m) => !mo.has(m)).map((m) => ({ detail: `can be ${m} now` })),
              // `FeedbackDialogProps` = Single | Multiple, the same names, one of them changed.
              ...[...mo]
                .filter(([m, t]) => mn.has(m) && !(assignable(t, mn.get(m)) && assignable(mn.get(m), t)))
                .map(([m, t]) => ({ detail: `${m} changed`, types: [t, mn.get(m)] })),
            ];
          } else diffs = memberDiffs(to, tn, dOld, dNew);
          // Only an index signature added (`[key: \`data-${string}\`]: …`, 0.50's AmountInput):
          // an interface without one is no longer assignable, an app's props literal still is.
          const indexOnly =
            !diffs.length && checker.getIndexInfosOfType(tn).length > checker.getIndexInfosOfType(to).length;
          if (!diffs.length && !indexOnly) diffs = [{ detail: `${short(tn)}, was ${short(to)}`, types: [to, tn] }];
        }
        diffs = [...arity, ...diffs];
        if (!diffs.length) continue;
        const kind =
          !fwd && !back
            ? "type"
            : !fwd
              ? "type (what an app passes)"
              : !back
                ? "type (what an app receives or calls)"
                : "type";
        raw.push({ kind, entry, name, diffs });
      }
    }
  }

  // A change that only shows another flagged type through is that type's: `ButtonProps`'s
  // `variant` is `ButtonVariant | undefined` before and after, and `Button`'s props are
  // `ButtonProps`.
  const flagged = new Set(raw.map((r) => r.name));
  /** A type as written, a trailing `| undefined` (an optional member's) aside. */
  const written = (t) =>
    t.isUnion() && t.types.some((m) => m.flags & ts.TypeFlags.Undefined)
      ? str(t).replace(/ \| undefined$/, "")
      : str(t);
  const mentions = (types, self) =>
    [...flagged].filter(
      (n) => n !== self && (types ?? []).some((t) => new RegExp(`(?<![\\w$])${n}(?![\\w$])`).test(str(t))),
    );
  /**
   * The flagged types a diff only shows through; empty for a change of its own. Only when
   * the type is WRITTEN the same before and after is the change the named type's: a type's
   * own change whose text merely names another changed type (`tone: string` become
   * `tone: Variant`, or two types that reference each other) was printed "through" it, and
   * nothing was left to announce (0.52 code review). A member made optional on the way
   * (`onUpdate?: FeedbackDetailUpdate`, 0.40) is written the same: its `| undefined` aside.
   */
  const throughOf = (d, self) => {
    const [a, b] = d.types ?? [];
    const named = a && b && written(a) === written(b) ? mentions([a], self) : [];
    if (named.length) return named;
    const sub = (d.sub ?? []).map((s) => throughOf(s, self));
    return sub.length && sub.every((t) => t.length) ? sub.flat() : [];
  };
  const reported = new Set();
  return raw.flatMap(({ kind, entry, name, diffs }) => {
    // An export gone from two entries (`DEFAULT_MOBILE_BAR_MAX` from . and ./shell) is one name.
    if (kind === "gone" && reported.has(`gone ${name}`)) return [];
    reported.add(`${kind === "gone" ? "gone" : entry} ${name}`);
    const through = diffs.map((d) => throughOf(d, name));
    const isCascade = diffs.length > 0 && through.every((t) => t.length > 0);
    return {
      kind,
      entry,
      name,
      detail: diffs.map((d) => d.detail).join("; "),
      through: isCascade ? [...new Set(through.flat())] : [],
    };
  });
}

/* ── The adopt doc ────────────────────────────────────────────────────────────────── */

/**
 * The names in backticks under a "must change" heading or bold lead (or a "(breaking)"
 * heading) of `markdown`: `TourLauncher`, `TourStep.beforeStep`, `Button` … A heading's
 * block runs to the next heading of its level or above; a bold lead's to the next
 * heading or the next bold lead. The two are apart: a lead inside a "(breaking)" heading
 * replaced the heading's block, and the next lead (`**Why:**`) then ended it, so the
 * section's table went unread (0.52 code review). A `#` line inside fenced code (a shell
 * comment) is no heading.
 */
export function mustChangeNames(markdown) {
  const names = new Set();
  let section = null;
  let lead = false;
  let fence = null;
  for (const line of markdown.split("\n")) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker?.[0] === fence[0] && marker.length >= fence.length) fence = null;
    } else if (marker) fence = marker;
    else {
      const heading = /^(#{1,6})\s+(.*)$/.exec(line);
      const bold = /^\*\*([^*]+)\*\*/.exec(line);
      if (heading) {
        const level = heading[1].length;
        lead = false;
        if (section && level <= section.level) section = null;
        if (!section && /must change|\(breaking\)/i.test(heading[2])) section = { level };
      } else if (bold) lead = /must change/i.test(bold[1]);
    }
    if (section || lead) for (const [, name] of line.matchAll(/`([^`]+)`/g)) names.add(name.trim());
  }
  return names;
}

/** `ButtonProps` is named by `ButtonProps`, `ButtonProps.variant`, `Button` or `Button.variant`. */
export function isNamed(name, names) {
  const forms = new Set([name, name.replace(/Props$/, "")]);
  return [...names].some((written) =>
    [...forms].some((f) => written === f || new RegExp(`^${f}(?![\\w$])`).test(written)),
  );
}

/**
 * The adopt text that may announce a change since `previous`: in docs/adopt-<its minor>.md
 * the sections after its own `## <previous>` (the minor's top part is its .0), and every
 * newer minor's adopt doc whole.
 */
export function adoptTextSince(previous, docsDir = join(ROOT, "docs")) {
  const [major, minor] = parse(previous);
  const texts = [];
  for (const file of existsSync(docsDir) ? readdirSync(docsDir) : []) {
    const m = /^adopt-(\d+)\.(\d+)\.md$/.exec(file);
    if (!m) continue;
    const [ma, mi] = [Number(m[1]), Number(m[2])];
    const text = readFileSync(join(docsDir, file), "utf8");
    if (ma > major || (ma === major && mi > minor)) texts.push({ file, text });
    else if (ma === major && mi === minor) {
      // The patch sections after `previous`'s own (`## 0.51.7`); for x.y.0, every patch.
      const sections = text.split(/^(?=## \d+\.\d+\.\d+\s*$)/m);
      const after = sections.filter((s) => {
        const v = /^## (\d+\.\d+\.\d+)/.exec(s)?.[1];
        return v && compareVersions(v, previous) > 0;
      });
      if (after.length) texts.push({ file, text: after.join("") });
    }
  }
  return texts;
}

/* ── The step ─────────────────────────────────────────────────────────────────────── */

/**
 * The gate: `newDir` (a package directory: the installed tarball, or the repository with
 * its dist/) against the previous release. `log(line)` for what it finds; resolves to
 * `{ ok, skipped?, changes, unannounced }`. `root` is the repository whose version, tags
 * and docs/ it reads; `published` and `pack` stand in for the registry (the tests).
 */
export function checkApi(
  newDir,
  { root = ROOT, log = console.log, env = process.env, published: given, pack = packRelease } = {},
) {
  const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const published = new Set(given ?? publishedVersions(root));
  const scratch = mkdtempSync(join(tmpdir(), "uikit-api-"));
  try {
    // The newest release at or below package.json's that the registry has: a tag pushed
    // before its publish was approved (release.yml stages it for Marcel's 2FA) names a
    // version npm does not serve yet, and the one before it is the last release then.
    let previous = previousRelease(version, published);
    let oldDir;
    while (previous && !oldDir) {
      try {
        oldDir = pack(previous, join(scratch, previous));
      } catch (error) {
        if (isNotFound(error)) {
          log(`  check:api: ${previous} is tagged but not on the registry; the release before it is the last one`);
          published.delete(previous);
          previous = previousRelease(version, published);
          continue;
        }
        if (isNetworkError(error) && !env.CI) {
          log(
            `  check:api not run: ${NAME}@${previous} is not in npm's cache and the registry does not answer (offline)`,
          );
          return { ok: true, skipped: true, changes: [], unannounced: [] };
        }
        throw new Error(`npm pack ${NAME}@${previous}: ${(error.stderr || error.message).trim().split("\n").at(-1)}`, {
          cause: error,
        });
      }
    }
    if (!oldDir) {
      log(`  check:api: no release at or below ${version} to compare with`);
      return { ok: true, skipped: true, changes: [], unannounced: [] };
    }
    const changes = compareApi(oldDir, newDir);
    const roots = changes.filter((c) => c.through.length === 0);
    // The root's docs/, as its version and tags: the repository's own were read whatever
    // the root (0.52 code review).
    const announced = new Set(
      adoptTextSince(previous, join(root, "docs")).flatMap(({ text }) => [...mustChangeNames(text)]),
    );
    const unannounced = roots.filter((c) => !isNamed(c.name, announced));
    log(
      `  check:api: ${version} against ${previous}: ${roots.length} changed name(s), ${changes.length - roots.length} through them`,
    );
    for (const c of changes) {
      const mark = c.through.length
        ? "  (through " + c.through.join(", ") + ")"
        : unannounced.includes(c)
          ? "  ← not in the adopt doc"
          : "";
      log(`    ${c.name} [${c.entry}, ${c.kind}]: ${c.detail}${mark}`);
    }
    return { ok: unannounced.length === 0, previous, changes, unannounced };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
  const [oldArg, newArg] = [arg("--old"), arg("--new")];
  if (oldArg || newArg) {
    if (!oldArg || !newArg) {
      console.error("usage: node scripts/check-api-compat.mjs [--old <version|dir> --new <version|dir>]");
      process.exit(2);
    }
    const scratch = mkdtempSync(join(tmpdir(), "uikit-api-"));
    try {
      const dirOf = (v, sub) => (existsSync(v) ? resolve(v) : packRelease(v, join(scratch, sub)));
      const changes = compareApi(dirOf(oldArg, "old"), dirOf(newArg, "new"));
      for (const c of changes) {
        console.log(
          `${c.name} [${c.entry}, ${c.kind}]: ${c.detail}${c.through.length ? `  (through ${c.through.join(", ")})` : ""}`,
        );
      }
      console.log(
        `${oldArg} → ${newArg}: ${changes.filter((c) => !c.through.length).length} changed name(s), ${changes.filter((c) => c.through.length).length} through them`,
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
    return;
  }
  if (!existsSync(join(ROOT, "dist", "index.d.ts"))) {
    console.error("✖ dist/ has no index.d.ts — run `npm run build` first");
    process.exit(1);
  }
  const result = checkApi(ROOT);
  if (!result.ok) {
    console.error(
      `✖ ${result.unannounced.length} changed public name(s) no adopt doc names: ${result.unannounced.map((c) => c.name).join(", ")}.\n` +
        '  Name each, in backticks, under a **Must change:** lead (or a "(breaking)" heading) in the adopt doc of\n' +
        `  this release (docs/adopt-<minor>.md, after the ${result.previous} section), with the callers that change.`,
    );
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
