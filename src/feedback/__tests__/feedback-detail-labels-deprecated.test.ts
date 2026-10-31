// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * 0.52 code review, feedback-row-detail-labels.ts: DOC-9's three dead label keys were
 * tagged `@deprecated` on the English default's keys — and the default is typed
 * `FeedbackDetailLabels`, so every read of `labels.outcomeAdd`, every override through
 * `LabelOverride<FeedbackDetailLabels>`, resolved to the interface's untagged member:
 * no strike-through anywhere before 0.53 removes them. The tag belongs on the member.
 */

const DEAD = ["outcomeAdd", "outcomeUpdate", "outcomePlaceholder"];

function members(file: string, owner: string): Map<string, ts.Node> {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const found = new Map<string, ts.Node>();
  source.forEachChild(function visit(node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text === owner) {
      for (const member of node.members) {
        if (member.name && ts.isIdentifier(member.name)) found.set(member.name.text, member);
      }
    }
    node.forEachChild(visit);
  });
  return found;
}

describe("feedbackDetail's dead outcome keys", () => {
  it("are deprecated on FeedbackDetailLabels, the type an app reads them through", () => {
    const labels = members(join(__dirname, "..", "feedback-row-detail.tsx"), "FeedbackDetailLabels");
    for (const key of DEAD) {
      const tag = labels.has(key) ? ts.getJSDocDeprecatedTag(labels.get(key)!) : undefined;
      expect(tag, key).toBeDefined();
      expect(ts.getTextOfJSDocComment(tag!.comment), key).toMatch(/^0\.52 — .*; removed in 0\.53\.?$/);
    }
    // Every other key stays undeprecated.
    const tagged = [...labels].filter(([, member]) => ts.getJSDocDeprecatedTag(member)).map(([key]) => key);
    expect(tagged).toEqual(DEAD);
  });
});
