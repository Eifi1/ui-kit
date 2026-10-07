import { Fragment } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "@eifi1/ui-kit";

/**
 * Python docstrings, rendered — the reStructuredText that server-kit's docstrings
 * actually use, and nothing more. No dependency: a full RST or Markdown parser would be
 * the largest thing in the group's chunk, to render a dialect this small.
 *
 * Blocks: paragraphs, bullet and numbered lists (an item may hold its own paragraphs,
 * lists and code), `>>>` doctests, and the literal block a paragraph ending in `::`
 * introduces (RST's rule: "text::" keeps one colon, "text ::" and a lone "::" keep none).
 *
 * Inline: ``literal``, `default role`, *emphasis*, **strong**, and Sphinx roles —
 * :func:, :class:, :data:, :meth:, :attr:, :mod: and any other — with `~` (show the last
 * segment), `!` (no link) and `title <target>`. A role whose target the export knows is a
 * link to that member's anchor on its page; any other (`ValueError`, a submodule, a
 * third-party type) is plain code, never a link to nowhere. Which is which is the
 * caller's `resolve`, so this file knows nothing about pages.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "ref"; role: string; target: string; display: string; link: boolean }
  | { kind: "em"; children: Inline[] }
  | { kind: "strong"; children: Inline[] };

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: Block[][] }
  | { kind: "code"; text: string; doctest: boolean };

/* ── Blocks ──────────────────────────────────────────────────────────────── */

const indentOf = (line: string) => line.length - line.trimStart().length;
const isBlank = (line: string) => line.trim() === "";

interface Marker {
  ordered: boolean;
  number: number;
  indent: number;
  /** The column the item's text starts at; continuation lines are indented to it. */
  content: number;
  text: string;
}

const MARKER = /^(\s*)([*+\-•]|\d+[.)]|#[.)]|\(\d+\))(\s+)(\S.*)$/;

function listMarker(line: string): Marker | undefined {
  const m = MARKER.exec(line);
  if (!m) return undefined;
  const [, lead, mark, gap, text] = m;
  const digits = /\d+/.exec(mark);
  return {
    ordered: !/^[*+\-•]$/.test(mark),
    number: digits ? Number(digits[0]) : 1,
    indent: lead.length,
    content: lead.length + mark.length + gap.length,
    text,
  };
}

/** `inspect.cleandoc`: the first line trimmed, the rest dedented by their common indent,
 *  blank lines at either end dropped. */
export function cleandoc(text: string): string[] {
  const lines = text.replace(/\t/g, "    ").split(/\r?\n/);
  const rest = lines.slice(1).filter((l) => !isBlank(l));
  const margin = rest.length ? Math.min(...rest.map(indentOf)) : 0;
  const out = [lines[0].trim(), ...lines.slice(1).map((l) => (isBlank(l) ? "" : l.slice(margin)))];
  while (out.length && isBlank(out[0])) out.shift();
  while (out.length && isBlank(out[out.length - 1])) out.pop();
  return out;
}

function dedent(lines: string[]): string {
  const margin = Math.min(...lines.filter((l) => !isBlank(l)).map(indentOf));
  return lines.map((l) => (isBlank(l) ? "" : l.slice(margin))).join("\n");
}

function parseLines(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  /** Set by a paragraph ending in "::" — the indent the literal block must exceed. */
  let literalAfter: number | null = null;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }
    const indent = indentOf(line);

    if (literalAfter !== null) {
      const base = literalAfter;
      literalAfter = null;
      if (indent > base) {
        let end = i;
        while (end < lines.length && (isBlank(lines[end]) || indentOf(lines[end]) > base)) end++;
        while (end > i && isBlank(lines[end - 1])) end--;
        blocks.push({ kind: "code", text: dedent(lines.slice(i, end)), doctest: false });
        i = end;
        continue;
      }
    }

    if (line.trimStart().startsWith(">>>")) {
      const start = i;
      while (i < lines.length && !isBlank(lines[i])) i++;
      blocks.push({ kind: "code", text: dedent(lines.slice(start, i)), doctest: true });
      continue;
    }

    const first = listMarker(line);
    if (first) {
      const items: Block[][] = [];
      let current: Marker | undefined = first;
      while (current) {
        const itemLines = [current.text];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (isBlank(l)) {
            // A blank line ends the item unless what follows is indented to its text.
            let j = i;
            while (j < lines.length && isBlank(lines[j])) j++;
            if (j < lines.length && indentOf(lines[j]) >= current.content) {
              for (let k = i; k < j; k++) itemLines.push("");
              i = j;
              continue;
            }
            break;
          }
          if (indentOf(l) >= current.content) itemLines.push(l.slice(current.content));
          else if (!listMarker(l) && indentOf(l) > current.indent) itemLines.push(l.trimStart());
          else break;
          i++;
        }
        items.push(parseLines(itemLines));
        let j = i;
        while (j < lines.length && isBlank(lines[j])) j++;
        const next = j < lines.length ? listMarker(lines[j]) : undefined;
        if (next && next.ordered === first.ordered && next.indent === first.indent) {
          i = j;
          current = next;
        } else current = undefined;
      }
      blocks.push({ kind: "list", ordered: first.ordered, start: first.number, items });
      continue;
    }

    // A paragraph: up to a blank line, or a list or doctest starting at its own indent.
    const words: string[] = [];
    const start = i;
    while (i < lines.length && !isBlank(lines[i])) {
      const l = lines[i];
      if (i > start && ((listMarker(l) && indentOf(l) <= indent) || l.trimStart().startsWith(">>>"))) break;
      words.push(l.trim());
      i++;
    }
    let text = words.join(" ");
    if (text.endsWith("::")) {
      literalAfter = indent;
      text = text === "::" ? "" : /\s::$/.test(text) ? text.replace(/\s+::$/, "") : text.slice(0, -1);
    }
    if (text) blocks.push({ kind: "paragraph", text });
  }
  return blocks;
}

/** A docstring's blocks. Pure, for the tests. */
export function parseDocstring(text: string): Block[] {
  return parseLines(cleandoc(text));
}

/* ── Inline ──────────────────────────────────────────────────────────────── */

// In priority order, as alternatives of one pattern so the leftmost match wins and a
// literal is never re-read as emphasis: ``literal``, :role:`target`, `default role`,
// **strong**, *emphasis*. RST's own boundary rule keeps `a*b*c` and `2 * 3` plain.
const INLINE = new RegExp(
  [
    /``(.+?)``/.source,
    /:([A-Za-z]+(?::[A-Za-z]+)?):`([^`]+)`/.source,
    /(?<![\w`])`([^`]+)`(?![\w`])/.source,
    /(?<![\w*])\*\*(?=\S)(.+?)(?<=\S)\*\*(?![\w*])/.source,
    /(?<![\w*])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![\w*])/.source,
  ].join("|"),
  "g",
);

/** A role's text: `title <target>`, `~a.b.c` (shown as `c`), `!target` (never linked). */
function roleRef(roleName: string, content: string): Inline {
  const role = roleName.split(":").pop()!;
  const explicit = /^(.*?)\s*<([^<>]+)>$/.exec(content.trim());
  let target = (explicit ? explicit[2] : content).trim();
  const link = !target.startsWith("!");
  target = target.replace(/^!/, "");
  let display: string;
  if (explicit && explicit[1]) display = explicit[1];
  else if (target.startsWith("~")) display = target.slice(1).split(".").pop()!;
  else display = target.replace(/^\./, "");
  // Sphinx's add_function_parentheses, on by default.
  if ((role === "func" || role === "meth") && !explicit && !display.endsWith(")")) display += "()";
  return { kind: "ref", role, target, display, link };
}

/** A paragraph's inline markup. Pure, for the tests. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: "code", text: m[1] });
    else if (m[2] !== undefined) out.push(roleRef(m[2], m[3]));
    else if (m[4] !== undefined) out.push({ kind: "code", text: m[4] });
    else if (m[5] !== undefined) out.push({ kind: "strong", children: parseInline(m[5]) });
    else if (m[6] !== undefined) out.push({ kind: "em", children: parseInline(m[6]) });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/* ── Rendering ───────────────────────────────────────────────────────────── */

/** A role's target → the router path of its anchor (`/server-auth#auth.AuthError`), or
 *  undefined to show it as code. */
export type ResolveRole = (target: string, role: string) => string | undefined;

const CODE = "rounded bg-[var(--bg-surface-2)] px-1 py-px font-mono text-[0.85em] [overflow-wrap:anywhere]";

function renderInline(nodes: Inline[], resolve: ResolveRole | undefined): ReactNode {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "code":
        return (
          <code key={i} className={CODE}>
            {node.text}
          </code>
        );
      case "strong":
        return (
          <strong key={i} className="font-semibold text-[var(--text-primary)]">
            {renderInline(node.children, resolve)}
          </strong>
        );
      case "em":
        return <em key={i}>{renderInline(node.children, resolve)}</em>;
      case "ref": {
        const href = node.link ? resolve?.(node.target, node.role) : undefined;
        const code = <code className={cn(CODE, href && "text-[var(--brand)]")}>{node.display}</code>;
        return href ? (
          <Link key={i} to={href} className="hover:underline">
            {code}
          </Link>
        ) : (
          <Fragment key={i}>{code}</Fragment>
        );
      }
    }
  });
}

export function CodeBlock({ children, className }: { children: string; className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3 font-mono text-xs leading-relaxed text-[var(--text-primary)]",
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  );
}

function renderBlocks(blocks: Block[], resolve: ResolveRole | undefined): ReactNode {
  return blocks.map((block, i) => {
    switch (block.kind) {
      case "paragraph":
        return <p key={i}>{renderInline(parseInline(block.text), resolve)}</p>;
      case "code":
        return <CodeBlock key={i}>{block.text}</CodeBlock>;
      case "list": {
        const items = block.items.map((item, j) => (
          <li key={j} className="space-y-2 ps-1">
            {renderBlocks(item, resolve)}
          </li>
        ));
        return block.ordered ? (
          <ol key={i} start={block.start === 1 ? undefined : block.start} className="list-decimal space-y-1.5 ps-5">
            {items}
          </ol>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 ps-5">
            {items}
          </ul>
        );
      }
    }
  });
}

/** A rendered docstring. Nothing at all for an empty one. */
export function Docstring({
  text,
  resolve,
  className,
}: {
  text: string | undefined;
  resolve?: ResolveRole;
  className?: string;
}) {
  if (!text || !text.trim()) return null;
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]", className)}>
      {renderBlocks(parseDocstring(text), resolve)}
    </div>
  );
}
