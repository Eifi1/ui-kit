// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * The showcase's writing rule (CONTRIBUTING.md, "The showcase"): a specimen and its notes
 * describe current behaviour only — no "Since 0.NN.", no "before 0.x" — and the showcase
 * names no app and no app's issue number; only the Overview lists the consumers. It was held
 * by memory and slid: 26 visible version notes in 18 files, one of them wrong ("`commit`
 * … still works until 0.53", which 0.53 removed), and six app names (refactor audit
 * 2026-11-22, DOC-7).
 *
 * Read with the TypeScript parser: JSX text and string literals under showcase/src/sections,
 * comments left alone (they are for the next maintainer, and may say why with a version).
 */
const SECTIONS = join(process.cwd(), "showcase/src/sections");

/** A kit version as a history note: "since 0.52", "(0.54)", "0.50: …", "server-kit 0.18",
 *  "0.51.3". Not a number that is only a number: an opacity, a price, `fromLogPosition(0.02`. */
const VERSION_NOTE = [
  /\b(?:since|until|before|after|added in|new in|removed in)\s+0\.\d{2}\b/i,
  /(?:^|\s)\(0\.\d{2}(?:\.\d+)?[\s,;:)]/,
  /^\s*0\.\d{2}(?:\.\d+)?:/,
  /\b(?:ui-kit|server-kit|kit)\s+0\.\d{2}\b/i,
  /\b0\.\d{2}\.\d+\b/,
];

/** A string that is a version and nothing else is a specimen's sample data (an app's
 *  `appVersion="0.27.0"`), not a note. */
const SAMPLE_VERSION = /^v?\d+\.\d+\.\d+(?:-[\w.]+)?$/;

const APP = /\b(?:keksdose|kastlan|kurvenschmiede|staunlabor)\b/i;

/** What the rule does not cover, each with its reason. */
const EXEMPT: readonly { file: string; text?: RegExp; why: string }[] = [
  { file: "overview.tsx", why: "the Overview lists the consumers" },
  { file: "release-notes.tsx", text: /^# Changelog/, why: "the sample changelog the parser reads, a real app's" },
  { file: "release-notes.tsx", text: /removed in 0\.35/, why: "a heading the section parser is shown reading" },
];

interface Hit {
  file: string;
  line: number;
  text: string;
}

function texts(file: string): Hit[] {
  const source = readFileSync(join(SECTIONS, file), "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Hit[] = [];
  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isJsxText(node)) text = node.text;
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const isSpecifier =
        ts.isImportDeclaration(parent) ||
        ts.isExportDeclaration(parent) ||
        (ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword);
      if (!isSpecifier) text = node.text;
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    if (text?.trim()) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      out.push({ file, line, text: text.replace(/\s+/g, " ").trim() });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const all = readdirSync(SECTIONS, { recursive: true, encoding: "utf8" })
  .filter((file) => /\.tsx?$/.test(file) && !file.includes("__tests__"))
  .sort()
  .flatMap(texts)
  .filter((hit) => !EXEMPT.some((e) => hit.file.split("/").at(-1) === e.file && (!e.text || e.text.test(hit.text))));

const show = (hits: Hit[]) => hits.map((h) => `${h.file}:${h.line}: ${h.text.slice(0, 140)}`).join("\n");

describe("the showcase's writing rule (refactor audit 2026-11-22, DOC-7)", () => {
  it("reads the sections it guards", () => {
    expect(all.length).toBeGreaterThan(1000);
  });

  it("tells no version history: the history is in the commit, so in the CHANGELOG", () => {
    const notes = all.filter((h) => !SAMPLE_VERSION.test(h.text) && VERSION_NOTE.some((re) => re.test(h.text)));
    expect(notes, show(notes)).toEqual([]);
  });

  it("names no app outside the Overview", () => {
    const named = all.filter((h) => APP.test(h.text));
    expect(named, show(named)).toEqual([]);
  });

  it("tells a version note from a number", () => {
    const note = (s: string) => !SAMPLE_VERSION.test(s) && VERSION_NOTE.some((re) => re.test(s));
    for (const s of ["Since 0.52 every card", "(0.54): under the phrase", "0.50: Next stays", "(server-kit 0.18)"])
      expect(note(s), s).toBe(true);
    for (const s of [
      "about 5 % + 0.50 per transaction",
      "fromLogPosition(0.02, 1, 1000)",
      "opacity: 0.72",
      "0.55 by default (0.2 for a lone area)",
      "0.27.0",
    ])
      expect(note(s), s).toBe(false);
  });
});
