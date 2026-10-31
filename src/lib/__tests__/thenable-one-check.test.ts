// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isThenable } from "../thenable";

/**
 * 0.52 code review, feedback/feedback-mutation.ts: the "did the callback answer a
 * promise?" check was written three times in three spellings — the auth forms'
 * (`auth/status-parts`), the admin confirm's, which turned a thenable function away, and
 * the feedback mutation's — in a round whose aim was one copy of each rule.
 */

describe("isThenable — the kit's one check", () => {
  it("is an object or a function with a then; nothing else", () => {
    expect(isThenable(Promise.resolve(1))).toBe(true);
    expect(isThenable({ then: () => undefined })).toBe(true);
    expect(isThenable(Object.assign(() => undefined, { then: () => undefined }))).toBe(true);
    for (const value of [undefined, null, 0, "then", { then: 1 }, () => undefined]) {
      expect(isThenable(value), String(value)).toBe(false);
    }
  });

  it("is the one the auth forms, the admin confirm and the feedback mutation ask", () => {
    for (const file of [
      "auth/status-parts.tsx",
      "auth/forgot-password-form.tsx",
      "auth/verify-email.tsx",
      "admin/admin-action-confirm.tsx",
      "feedback/feedback-mutation.ts",
    ]) {
      const source = readFileSync(join(__dirname, "..", "..", file), "utf8");
      expect(source, file).not.toMatch(/function isThenable|const isThenable/);
    }
  });
});
