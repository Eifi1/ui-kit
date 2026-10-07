import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { ArrowRight } from "lucide-react";
import {
  CopyButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TextLink,
  cn,
} from "@eifi1/ui-kit";
import type { ShowcaseGroup, ShowcasePage } from "../routes";
import { usePageText } from "../i18n";
import { Note, slugify } from "../lib/section";
import {
  MAIL_MODULE,
  PACKAGE,
  REPOSITORY_URL,
  SERVER_KIT_API,
  docAfterSummary,
  findModule,
  formatSignature,
  installLine,
  kindHeading,
  kindTitle,
  mailsHeading,
  memberAnchor,
  membersByKind,
  moduleAnchor,
  releaseUrl,
  resolveTarget,
  targetAnchor,
} from "./api";
import type { ApiMember, ApiModule, RoleContext } from "./api";
import { CodeBlock, Docstring } from "./docstring";
import type { ResolveRole } from "./docstring";
import { KIT_COUNTERPARTS, serverPageOf } from "./links";
import { MailPreviews } from "./mail-preview";

/**
 * The "Server kit" group: server-kit's modules, read out of the release's api.json.
 *
 * Every page of the group is `ServerModules` over the modules routes.tsx names for it,
 * so a page is a list of modules and nothing is written by hand per module: the summary
 * and docstring, the contract section it implements, the install line for the pinned
 * release, the kit pages it is the server half of, and its members — grouped by kind,
 * each with an anchor, its signature, its docstring, and its fields, values and methods.
 *
 * HEADINGS. A module is an `<h2>` (`#auth`), each kind of member an `<h3>`
 * ("auth · Functions") — those are the page's contents rail, and the search index
 * writes the same strings from api.json (scripts/gen-showcase-search-index.mjs) —
 * and each member an `<h4>` (`#auth.AuthError`), which the search and every docstring
 * role link to. The members are deliberately NOT rail entries: eighty of them would
 * bury the rail; the kind headings and the "Members" line under each module jump there.
 *
 * The prose is server-kit's own English, verbatim, like every other section's notes.
 */

const API = SERVER_KIT_API;
const VERSION = API.kit_version;

/** A role's link: the target's anchor on the Server kit page that documents it. */
function resolverFor(context: RoleContext): ResolveRole {
  return (target) => {
    const found = resolveTarget(API, target, context);
    const page = found && serverPageOf(found.module);
    return found && page ? `/${page}#${targetAnchor(found)}` : undefined;
  };
}

/**
 * A deep link into the group — `#/server-auth#auth.AuthError` from the search, a
 * docstring, or a bookmark — opened cold. The page frame scrolls a location's hash into
 * view one frame after navigating (use-scroll-restoration.ts), and on a first visit this
 * page's chunk, and so the anchor, arrives later than that. So the page scrolls to it
 * itself, once, when it mounts; every later hash change is the frame's again.
 */
function useScrollToHashOnMount() {
  const { hash } = useLocation();
  const initial = useRef(hash);
  useEffect(() => {
    const id = initial.current ? decodeURIComponent(initial.current.slice(1)) : "";
    if (id) document.getElementById(id)?.scrollIntoView?.({ block: "start" });
  }, []);
}

/* ── A page of modules ───────────────────────────────────────────────────── */

export function ServerModules({ modules }: { modules: readonly string[] }) {
  useScrollToHashOnMount();
  return (
    <div className="space-y-16">
      {modules.map((short) => (
        <ModuleSection key={short} short={short} />
      ))}
    </div>
  );
}

function ModuleSection({ short }: { short: string }) {
  const mod = findModule(API, short);
  if (!mod) {
    return (
      <Note>
        {`\`${PACKAGE}.${short}\` is not in server-kit ${VERSION}. The page names a module the pinned release does not have — sync a newer release, or take it off the page in routes.tsx.`}
      </Note>
    );
  }
  const resolve = resolverFor({ module: short });
  const groups = membersByKind(mod.members);
  return (
    <section aria-labelledby={moduleAnchor(short)} className="space-y-8">
      <header className="space-y-2">
        <h2
          id={moduleAnchor(short)}
          className="scroll-mt-16 md:scroll-mt-6 font-mono text-lg font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]"
        >
          {mod.name}
        </h2>
        <Docstring text={mod.summary} resolve={resolve} className="max-w-3xl text-base text-[var(--text-primary)]" />
      </header>

      <ModuleFacts mod={mod} short={short} groups={groups} />

      <Docstring text={docAfterSummary(mod)} resolve={resolve} className="max-w-3xl" />

      {short === MAIL_MODULE && API.mails.length > 0 && (
        <div className="space-y-3">
          <KindHeading text={mailsHeading(short)} count={new Set(API.mails.map((m) => m.id)).size} />
          <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
            The release&rsquo;s own sample mails, rendered by <code className="font-mono">render_mail</code> for a
            made-up account of &ldquo;Ada&rsquo;s Garden Planner&rdquo; — the words are the sample app&rsquo;s, the
            layout and the escaping are the kit&rsquo;s. Each is sandboxed: no scripts, and its links lead nowhere.
          </p>
          <MailPreviews mails={API.mails} />
        </div>
      )}

      {groups.map(([kind, members]) => (
        <div key={kind} className="space-y-3">
          <KindHeading text={kindHeading(short, kind)} count={members.length} />
          {kind === "constant" ? (
            <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
              {members.map((m) => (
                <MemberEntry key={m.name} short={short} member={m} compact />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((m) => (
                <MemberEntry key={m.name} short={short} member={m} />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/** One kind's heading. Its text is its anchor and its rail entry; the count sits beside
 *  it, outside the `<h3>`, so the rail does not read "auth · Functions19". */
function KindHeading({ text, count }: { text: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-[var(--border)] pb-1.5">
      <h3 id={slugify(text)} className="scroll-mt-16 md:scroll-mt-6 text-base font-semibold text-[var(--text-primary)]">
        {text}
      </h3>
      <span className="text-xs tabular-nums text-[var(--text-muted)]">{count}</span>
    </div>
  );
}

/* ── The module's facts: contract, install, counterparts, members ────────── */

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium text-[var(--text-muted)] sm:pt-0.5">{term}</dt>
      <dd className="min-w-0 text-sm text-[var(--text-secondary)]">{children}</dd>
    </div>
  );
}

function ModuleFacts({
  mod,
  short,
  groups,
}: {
  mod: ApiModule;
  short: string;
  groups: Array<[string, ApiMember[]]>;
}) {
  const { pathname } = useLocation();
  const counterparts = KIT_COUNTERPARTS[short] ?? [];
  return (
    <dl className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4">
      {mod.contract && (
        <Fact term="Contract">
          <ul className="space-y-1">
            {mod.contract.links.map((link) => (
              <li key={link.url}>
                <TextLink href={link.url} external>
                  {`${mod.contract!.doc.split("/").pop()} ${link.section}`}
                </TextLink>{" "}
                <span className="text-[var(--text-muted)]">
                  {link.heading.replace(/^\d+(?:\.\d+)*\.?\s*/, "")}
                </span>
              </li>
            ))}
          </ul>
        </Fact>
      )}
      <Fact term="Install">
        <InstallLine />
      </Fact>
      <Fact term="Kit counterparts">
        {counterparts.length ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {counterparts.map((slug) => (
              <li key={slug}>
                <KitPageLink slug={slug} />
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-[var(--text-muted)]">None in the kit yet.</span>
        )}
      </Fact>
      <Fact term="Members">
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {groups.map(([kind, members]) => (
            <li key={kind}>
              <Link
                to={`${pathname}#${slugify(kindHeading(short, kind))}`}
                className="text-[var(--brand)] hover:underline"
              >
                {members.length} {members.length === 1 ? kind : kindTitle(kind).toLowerCase()}
              </Link>
            </li>
          ))}
        </ul>
      </Fact>
    </dl>
  );
}

function KitPageLink({ slug }: { slug: string }) {
  const { title } = usePageText(slug);
  return <TextLink href={`/${slug}`}>{title}</TextLink>;
}

/** The install line for the pinned release — the wheel by URL, as every app installs it. */
function InstallLine() {
  const line = installLine(VERSION);
  return (
    <div className="flex items-start gap-1">
      <code className="min-w-0 flex-1 rounded-md bg-[var(--bg-surface-2)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)] [overflow-wrap:anywhere]">
        {line}
      </code>
      <CopyButton text={line} label="Copy the install line" />
    </div>
  );
}

/* ── One member ──────────────────────────────────────────────────────────── */

function MemberEntry({ short, member, compact }: { short: string; member: ApiMember; compact?: boolean }) {
  const anchor = memberAnchor(short, member.name);
  const resolve = resolverFor({ module: short, member: member.name });
  return (
    <article
      aria-labelledby={anchor}
      className={cn(
        "min-w-0 space-y-3 p-4",
        !compact && "rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4
          id={anchor}
          className="scroll-mt-16 md:scroll-mt-6 min-w-0 font-mono text-sm font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]"
        >
          {member.name}
        </h4>
        <span className="rounded border border-[var(--border)] px-1.5 text-[11px] text-[var(--text-muted)]">
          {member.kind}
        </span>
      </div>
      {/* Wrapped, not scrolled: a signature is read whole, and formatSignature has
          already put one parameter on each line wherever it is long. */}
      <CodeBlock className="whitespace-pre-wrap [overflow-wrap:anywhere]">{formatSignature(member.signature)}</CodeBlock>
      <Docstring text={member.doc} resolve={resolve} />
      {member.fields && member.fields.length > 0 && <FieldsTable member={member} resolve={resolve} />}
      {member.values && member.values.length > 0 && <ValuesTable member={member} resolve={resolve} />}
      {member.methods && member.methods.length > 0 && <MethodsTable member={member} resolve={resolve} />}
    </article>
  );
}

const MONO = "font-mono text-xs [overflow-wrap:anywhere]";
/** Stacked on a phone (`stack="phone"`) a row's cells lose their side padding, which in a
 *  framed table put the text against the frame; the row takes the padding back. The
 *  monospace goes on a `<code>` inside a cell, never the cell: the stacked layout labels a
 *  cell with its column's name, and that label inherits the cell's font. */
const TABLE = "max-sm:[&_tbody_tr]:px-3";
const DASH = <span className="text-[var(--text-muted)]">—</span>;

function FieldsTable({ member, resolve }: { member: ApiMember; resolve: ResolveRole }) {
  const fields = member.fields!;
  const described = fields.some((f) => f.doc?.trim());
  return (
    <Table density="compact" stack="phone" framed className={TABLE} aria-label={`${member.name} fields`}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Field</TableHeaderCell>
          <TableHeaderCell>Type</TableHeaderCell>
          <TableHeaderCell>Default</TableHeaderCell>
          {described && <TableHeaderCell>Description</TableHeaderCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {fields.map((f) => (
          <TableRow key={f.name}>
            <TableCell>
              <code className={MONO}>{f.name}</code>
            </TableCell>
            <TableCell>{f.type ? <code className={MONO}>{f.type}</code> : DASH}</TableCell>
            <TableCell>
              {f.default != null ? (
                <code className={MONO}>{f.default}</code>
              ) : (
                <span className="text-[var(--text-muted)]">required</span>
              )}
            </TableCell>
            {described && <TableCell>{f.doc?.trim() ? <Docstring text={f.doc} resolve={resolve} /> : DASH}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ValuesTable({ member, resolve }: { member: ApiMember; resolve: ResolveRole }) {
  const values = member.values!;
  const described = values.some((v) => v.doc?.trim());
  return (
    <Table density="compact" stack="phone" framed className={TABLE} aria-label={`${member.name} values`}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Member</TableHeaderCell>
          <TableHeaderCell>Value</TableHeaderCell>
          {described && <TableHeaderCell>Description</TableHeaderCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {values.map((v) => (
          <TableRow key={v.name}>
            <TableCell>
              <code className={MONO}>{v.name}</code>
            </TableCell>
            <TableCell>{v.value !== undefined ? <code className={MONO}>{JSON.stringify(v.value)}</code> : DASH}</TableCell>
            {described && <TableCell>{v.doc?.trim() ? <Docstring text={v.doc} resolve={resolve} /> : DASH}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MethodsTable({ member, resolve }: { member: ApiMember; resolve: ResolveRole }) {
  const methods = member.methods!;
  // A constructor alone, undocumented, is a signature — not a table with an empty column.
  const described = methods.some((m) => m.doc?.trim());
  return (
    <Table density="compact" stack="phone" framed className={TABLE} aria-label={`${member.name} methods`}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Method</TableHeaderCell>
          {described && <TableHeaderCell>Description</TableHeaderCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {methods.map((m) => (
          <TableRow key={m.name}>
            <TableCell className={described ? "sm:min-w-[14rem]" : undefined}>
              <code className={cn(MONO, "whitespace-pre-wrap")}>{formatSignature(m.signature || m.name, 48)}</code>
            </TableCell>
            {described && <TableCell>{m.doc?.trim() ? <Docstring text={m.doc} resolve={resolve} /> : DASH}</TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── The group's overview ────────────────────────────────────────────────── */

/**
 * The Server kit's entry page: what the package is, which release these pages document
 * and how an app installs it, then one card per page naming the modules on it.
 */
export function ServerKitOverview({ group }: { group: ShowcaseGroup }) {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        <p>
          <strong className="text-[var(--text-primary)]">eifi1-server-kit</strong> is the Python package the
          apps&rsquo; backends share, beside this kit for their frontends: the contracts these pages&rsquo;
          components speak — schemas, rules, validators, the rate limiter, the CORS layer, the account mails —
          as code, lifted from the app that settled each one and parameterised per app. The database, the routes
          and the sign-in stay in each app.
        </p>
        <p>
          These pages document <strong className="text-[var(--text-primary)]">server-kit {VERSION}</strong>, from
          the <code className="font-mono">server-kit-api.json</code> its release attaches. The file is pinned in
          this repository the way an app pins the wheel: the pages change when the pin does, not when
          server-kit&rsquo;s main branch moves. Each module links the contract section it implements and the kit
          pages it is the server half of; those pages link back under their title.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <TextLink href={releaseUrl(VERSION)} external>
            {`Release v${VERSION}`}
          </TextLink>
          <TextLink href={REPOSITORY_URL} external>
            Repository
          </TextLink>
        </p>
      </div>
      <div className="max-w-3xl space-y-1.5">
        <p className="text-xs font-medium text-[var(--text-muted)]">Install</p>
        <InstallLine />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {group.pages.map((page) => (
          <li key={page.slug} className="contents">
            <ServerPageCard page={page} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServerPageCard({ page }: { page: ShowcasePage }) {
  const { title, blurb } = usePageText(page.slug);
  const modules = (page.serverModules ?? []).map((short) => findModule(API, short)).filter(Boolean) as ApiModule[];
  return (
    <Link
      to={`/${page.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">
          <page.icon className="size-4" aria-hidden />
        </span>
        <span className="flex-1 font-medium text-[var(--text-primary)]">{title}</span>
        <ArrowRight
          aria-hidden
          className="size-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
        />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{blurb}</p>
      {/* Module paths are identifiers, not words: never translated, always LTR. */}
      <ul dir="ltr" className="mt-auto flex flex-wrap gap-1.5">
        {modules.map((mod) => (
          <li
            key={mod.name}
            className="rounded border border-[var(--border)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
          >
            {mod.name}
            <span className="text-[var(--text-muted)]">
              {" "}
              · {mod.members.length}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}

/** Re-exported for the tests: the role resolver a page builds. */
export { resolverFor };
