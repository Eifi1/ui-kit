// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The deprecation policy, enforced (refactor audit 2026-10, DOC-11 = API-8).
 *
 * The rule said a deprecated export is "listed in the changelog" for one minor and then
 * removed. Since the CHANGELOG became generated (0.7) nothing put a deprecation there, and
 * nothing removed one on time: `feedbackDialog.attachments`, deprecated in 0.16, lived
 * until 0.34. So the tag carries the schedule, and this test reads it:
 *
 *   `@deprecated 0.34 — <the replacement>; removed in 0.35`
 *
 *  - every `@deprecated` in src names the minor it was deprecated in and the one that
 *    removes it;
 *  - it fails once package.json reaches the stated removal, or two minors past the
 *    deprecation, whichever comes first — the release that should have removed it
 *    cannot ship with it;
 *  - it prints the list. That list is what goes into the release's adopt doc and, as
 *    "Deprecated: …" lines, into the commit body (CONTRIBUTING, "Additive API only").
 */

interface Deprecation {
  /** `src/…:line` */
  at: string;
  /** `ServerWakeNotice.navOffset` — the owning type or function, then the member. */
  name: string;
  /** The tag's text after `@deprecated`, across its continuation lines. */
  text: string;
  since?: [number, number];
  removal?: [number, number];
}

const SRC = join(__dirname, "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "test" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const version = (s: string): [number, number] | undefined => {
  const m = /^(\d+)\.(\d+)$/.exec(s);
  return m ? [Number(m[1]), Number(m[2])] : undefined;
};

/** A JSDoc tag: `@deprecated` first on a `/**` or ` *` line — not one quoted in prose. */
const TAG = /^\s*(?:\/\*\*|\*)\s*@deprecated\b(.*)$/;

/** The tags in one file's text; `file` is its path under src, for `at`. */
function scan(file: string, source: string): Deprecation[] {
  const found: Deprecation[] = [];
  const lines = source.split("\n");
  lines.forEach((line, i) => {
    const tag = TAG.exec(line);
    if (!tag) return;
    let close = i;
    while (close < lines.length - 1 && !lines[close].includes("*/")) close += 1;
    // The tag runs on until the comment ends or the next tag starts.
    const parts = [tag[1]];
    for (let j = i + 1; j <= close && !/^\s*\*\s*@\w/.test(lines[j]); j += 1) {
      parts.push(lines[j].replace(/^\s*\*(?!\/)/, ""));
    }
    const text = parts
      .join(" ")
      .replace(/\*\/.*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    // What is deprecated: the first declaration after the comment, in the type or
    // function above it.
    let next = close + 1;
    while (next < lines.length - 1 && lines[next].trim() === "") next += 1;
    const member =
      /^\s*(?:export\s+)?(?:declare\s+)?(?:readonly\s+)?(?:(?:async\s+)?function\*?\s+|const\s+|let\s+|type\s+|interface\s+|class\s+)?["']?([A-Za-z_$][\w$-]*)/.exec(
        lines[next] ?? "",
      )?.[1] ?? "?";
    // Only a member (an indented declaration) has an owner; a top-level name is its own.
    const owner = /^\s+/.test(lines[next] ?? "")
      ? lines
          .slice(0, i)
          .reverse()
          .map((l) => /\b(?:interface|type|function|class)\s+([A-Z][\w$]*)/.exec(l)?.[1])
          .find(Boolean)
      : undefined;
    const since = /^(\d+\.\d+)\b/.exec(text)?.[1];
    const removal = /\bremoved in (\d+\.\d+)\b/.exec(text)?.[1];
    found.push({
      at: `src/${file.slice(SRC.length + 1).replace(/\\/g, "/")}:${i + 1}`,
      name: owner ? `${owner.replace(/Props$/, "")}.${member}` : member,
      text,
      since: since ? version(since) : undefined,
      removal: removal ? version(removal) : undefined,
    });
  });
  return found;
}

function deprecations(): Deprecation[] {
  return sources(SRC).flatMap((file) => scan(file, readFileSync(file, "utf8")));
}

const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"), "utf8")) as { version: string };
const [major, minor] = pkg.version.split(".").map(Number);
const reached = ([ma, mi]: [number, number]) => major > ma || (major === ma && minor >= mi);

const all = deprecations();

describe("deprecations", () => {
  // On a fixture since 0.35, which removed every tag there was: an empty list from src is
  // now the expected answer, so it cannot be what proves the scan reads anything.
  it("finds the tags (the scan is not silently empty)", () => {
    const fixture = [
      "export interface WidgetProps {",
      "  /** @deprecated 0.35 — use `aria-label`; removed in 0.36",
      "   * (the fixture's reason). */",
      "  ariaLabel?: string;",
      "}",
    ].join("\n");
    expect(scan(join(SRC, "components/widget.tsx"), fixture)).toEqual([
      {
        at: "src/components/widget.tsx:2",
        name: "Widget.ariaLabel",
        text: "0.35 — use `aria-label`; removed in 0.36 (the fixture's reason).",
        since: [0, 35],
        removal: [0, 36],
      },
    ]);
  });

  it('name their schedule: "@deprecated 0.NN — <replacement>; removed in 0.MM"', () => {
    const unscheduled = all.filter((d) => !d.since || !d.removal).map((d) => `${d.at} @deprecated ${d.text}`);
    expect(unscheduled).toEqual([]);
  });

  it(`are gone by the release that removes them (package.json ${pkg.version})`, () => {
    const overdue = all
      .filter((d) => d.since && d.removal)
      .filter((d) => reached(d.removal!) || reached([d.since![0], d.since![1] + 2]))
      .map((d) => `${d.at} ${d.name}: @deprecated ${d.text}`);
    expect(overdue).toEqual([]);
  });

  it("prints the list for the adopt doc and the commit body", () => {
    const listing = all
      .map((d) => {
        const schedule = /^(.*?\bremoved in \d+\.\d+)/.exec(d.text)?.[1] ?? d.text;
        return `Deprecated: ${d.name} ${schedule} (${d.at})`;
      })
      .sort();
    console.info(`${listing.length} deprecations:\n${listing.join("\n")}`);
    expect(listing.length).toBe(all.length);
  });
});
