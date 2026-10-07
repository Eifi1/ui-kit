import data from "./api.json";

/**
 * The server-kit export, typed — and the few rules every page of the "Server kit" group
 * shares: how a module and a member are anchored, how members are grouped, how a role in
 * a docstring finds its target, and how a signature is laid out for a phone.
 *
 * The data is `api.json`, copied from a server-kit release by `scripts/sync-server-kit.mjs`
 * and committed: these pages document exactly the release that file names, the way an
 * app's lockfile pins the wheel. Only the group's own chunk imports this module — the
 * search and the page frame read the generated index and `links.ts`, never the JSON.
 */

export interface ApiField {
  name: string;
  type?: string | null;
  /** The default as Python source (`"None"`, `"True"`), or null for a required field. */
  default?: string | null;
  doc?: string;
}

export interface ApiValue {
  name: string;
  value?: unknown;
  doc?: string;
}

export interface ApiMethod {
  name: string;
  signature?: string;
  doc?: string;
}

export interface ApiMember {
  name: string;
  /** `function`, `class`, `model`, `enum`, `protocol` or `constant` today. */
  kind: string;
  signature: string;
  doc: string;
  fields?: ApiField[];
  values?: ApiValue[];
  methods?: ApiMethod[];
}

export interface ContractLink {
  /** "§3.5" */
  section: string;
  /** The heading it names, as written: "3.5 Attachments". */
  heading: string;
  /** github.com's URL of that heading on ui-kit's main branch. */
  url: string;
}

export interface ApiModule {
  /** The dotted import path: `eifi1_server_kit.auth`. */
  name: string;
  summary: string;
  doc: string;
  contract?: { doc: string; section: string; url: string; links: ContractLink[] };
  members: ApiMember[];
}

export interface ApiMail {
  id: string;
  title: string;
  locale: string;
  subject: string;
  html: string;
}

export interface ServerKitApi {
  format: string;
  version: number;
  kit_version: string;
  modules: ApiModule[];
  mails: ApiMail[];
}

export const SERVER_KIT_API = data as unknown as ServerKitApi;

export const PACKAGE = "eifi1_server_kit";
export const REPOSITORY_URL = "https://github.com/Eifi1/server-kit";

/** `eifi1_server_kit.user_admin` → `user_admin`, the name routes.tsx and the anchors use. */
export function moduleShort(name: string): string {
  return name.startsWith(`${PACKAGE}.`) ? name.slice(PACKAGE.length + 1) : name;
}

export function findModule(api: ServerKitApi, short: string): ApiModule | undefined {
  return api.modules.find((m) => moduleShort(m.name) === short);
}

/**
 * Anchors. A module is its short name (`#user_admin`), a member `module.member`
 * (`#auth.AuthError`): Python's own dotted path minus the package, so a link reads like
 * the import it documents. The module prefix is not decoration — Feedback & uploads
 * documents `ACCEPTED_MEDIA_TYPES` twice, once per module.
 */
export const moduleAnchor = (short: string) => short;
export const memberAnchor = (short: string, member: string) => `${short}.${member}`;

/** The order a module's members are shown in: what an app calls first, data last. */
export const KIND_ORDER = ["function", "class", "model", "enum", "protocol", "constant"] as const;
const KIND_TITLES: Record<string, string> = {
  function: "Functions",
  class: "Classes",
  model: "Models",
  enum: "Enums",
  protocol: "Protocols",
  constant: "Constants",
};

/** "Functions"; a kind a later release adds is still titled, as its plural. */
export function kindTitle(kind: string): string {
  return KIND_TITLES[kind] ?? `${kind.charAt(0).toUpperCase()}${kind.slice(1)}s`;
}

/**
 * The `<h3>` of one kind of one module: "auth · Functions". These are the page's
 * contents-rail entries and its search anchors (`slugify` of the text), so
 * `scripts/gen-showcase-search-index.mjs` writes the same strings from the same rule —
 * the per-page test compares the two.
 */
export function kindHeading(short: string, kind: string): string {
  return `${short} · ${kindTitle(kind)}`;
}

/** The `<h3>` of the sample mails, which live with the module that renders them. */
export const MAIL_MODULE = "mail";
export function mailsHeading(short: string): string {
  return `${short} · Rendered mails`;
}

/** A module's members as [kind, members] in {@link KIND_ORDER}; unknown kinds after, in
 *  the order they first appear. Members keep the export's order within a kind. */
export function membersByKind(members: readonly ApiMember[]): Array<[string, ApiMember[]]> {
  const groups = new Map<string, ApiMember[]>();
  for (const kind of KIND_ORDER) groups.set(kind, []);
  for (const m of members) {
    if (!groups.has(m.kind)) groups.set(m.kind, []);
    groups.get(m.kind)!.push(m);
  }
  return [...groups].filter(([, list]) => list.length > 0);
}

/** The module's docstring after its first paragraph, when that paragraph IS the summary —
 *  the page prints the summary once, as the lead. */
export function docAfterSummary(module: ApiModule): string {
  const doc = module.doc.trim();
  const summary = module.summary.trim();
  if (summary && doc.startsWith(summary)) return doc.slice(summary.length).trim();
  return doc;
}

/* ── Installing ──────────────────────────────────────────────────────────── */

/** The wheel a release attaches — what an app installs, by URL, not from git. */
export function wheelUrl(version: string): string {
  return `${REPOSITORY_URL}/releases/download/v${version}/eifi1_server_kit-${version}-py3-none-any.whl`;
}

export function releaseUrl(version: string): string {
  return `${REPOSITORY_URL}/releases/tag/v${version}`;
}

/** The line in server-kit's README: `uv add` with the wheel's URL, which `uv.lock` pins
 *  by hash. */
export function installLine(version: string): string {
  return `uv add "eifi1-server-kit @ ${wheelUrl(version)}"`;
}

/* ── Signatures ──────────────────────────────────────────────────────────── */

const OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/**
 * A long one-line signature with one parameter per line, the way black writes it:
 *
 *     apply_patch(
 *         obj: object,
 *         *,
 *         defaults: Mapping[str, object] | None = None,
 *     ) -> dict[str, object]
 *
 * A 120-character line scrolled sideways on a phone — or wrapped mid-type — and the
 * parameters are what a reader scans. Short signatures, constants (`NAME = value`) and
 * anything already on several lines are left as written.
 */
export function formatSignature(signature: string, width = 72): string {
  if (signature.length <= width || signature.includes("\n")) return signature;
  const open = signature.indexOf("(");
  // A constant's value may contain a call; only a signature starts with its name and "(".
  if (open <= 0 || /[=:]/.test(signature.slice(0, open))) return signature;
  const params: string[] = [];
  const stack: string[] = [];
  let quote: string | null = null;
  let start = open + 1;
  let close = -1;
  for (let i = open + 1; i < signature.length; i++) {
    const ch = signature[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (OPEN[ch]) stack.push(OPEN[ch]);
    else if (stack.length && ch === stack[stack.length - 1]) stack.pop();
    else if (!stack.length && ch === ",") {
      params.push(signature.slice(start, i).trim());
      start = i + 1;
    } else if (!stack.length && ch === ")") {
      close = i;
      break;
    }
  }
  if (close === -1) return signature;
  const last = signature.slice(start, close).trim();
  if (last) params.push(last);
  if (params.length === 0) return signature;
  const head = signature.slice(0, open + 1);
  const tail = signature.slice(close);
  return `${head}\n${params.map((p) => `    ${p},`).join("\n")}\n${tail}`;
}

/* ── Docstring roles ─────────────────────────────────────────────────────── */

/** Where a role's target lives: a module, or a member of one (`member` undefined for a
 *  module). A method, field or enum value resolves to the member that owns it. */
export interface ResolvedTarget {
  module: string;
  member?: string;
}

/** The context a docstring is read in: Sphinx looks a bare name up in the current class,
 *  then the current module, then everywhere. */
export interface RoleContext {
  module: string;
  member?: string;
}

/**
 * A Sphinx role's target (`:func:\`~eifi1_server_kit.errors.install_contract_error_handlers\``)
 * resolved against the export, or undefined when the export does not have it —
 * `:class:\`ValueError\``, a submodule, a third-party type — which the renderer then
 * shows as plain code rather than a link to nowhere.
 */
export function resolveTarget(
  api: ServerKitApi,
  rawTarget: string,
  context: RoleContext,
): ResolvedTarget | undefined {
  const target = rawTarget.replace(/^[~!.]+/, "").trim();
  if (!target) return undefined;
  const modules = new Map(api.modules.map((m) => [moduleShort(m.name), m]));
  const owner = (module: ApiModule, name: string): string | undefined => {
    const [first, ...rest] = name.split(".");
    const member = module.members.find((m) => m.name === first);
    if (!member) return undefined;
    if (rest.length === 0) return member.name;
    // Class.method / Model.field / Enum.VALUE → the class's own entry.
    const sub = rest[0];
    const has =
      member.methods?.some((x) => x.name === sub) ||
      member.fields?.some((x) => x.name === sub) ||
      member.values?.some((x) => x.name === sub);
    return has ? member.name : undefined;
  };

  // Absolute: eifi1_server_kit.<module>[.<member>[.<sub>]]
  const path = target.startsWith(`${PACKAGE}.`) ? target.slice(PACKAGE.length + 1) : undefined;
  const tryQualified = (dotted: string): ResolvedTarget | undefined => {
    if (modules.has(dotted)) return { module: dotted };
    // The longest module name that prefixes the path wins (a module could be nested).
    const names = [...modules.keys()].sort((a, b) => b.length - a.length);
    for (const short of names) {
      if (!dotted.startsWith(`${short}.`)) continue;
      const member = owner(modules.get(short)!, dotted.slice(short.length + 1));
      if (member) return { module: short, member };
    }
    return undefined;
  };
  if (path !== undefined) return tryQualified(path);

  // Relative: the current class's own attribute, then the current module, then
  // `module.member`, then a name only one module has.
  const here = modules.get(context.module);
  if (here && context.member && !target.includes(".")) {
    const self = here.members.find((m) => m.name === context.member);
    if (
      self?.methods?.some((x) => x.name === target) ||
      self?.fields?.some((x) => x.name === target) ||
      self?.values?.some((x) => x.name === target)
    ) {
      return { module: context.module, member: self.name };
    }
  }
  if (here) {
    const member = owner(here, target);
    if (member) return { module: context.module, member };
  }
  const qualified = tryQualified(target);
  if (qualified) return qualified;
  const everywhere = [...modules].flatMap(([short, mod]) => {
    const member = owner(mod, target);
    return member ? [{ module: short, member }] : [];
  });
  return everywhere.length === 1 ? everywhere[0] : undefined;
}

/** The anchor of a resolved target on its page. */
export function targetAnchor(target: ResolvedTarget): string {
  return target.member ? memberAnchor(target.module, target.member) : moduleAnchor(target.module);
}
