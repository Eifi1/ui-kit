import { describe, expect, it } from "vitest";

import { settle as adminSettle } from "../admin-parts";
import { settle } from "../../hooks/use-mounted";

/**
 * 0.52 code review, admin/admin-parts.ts: MOD-6 (refactor audit 2026-10-30) moved the
 * account parts' `settle` to hooks/use-mounted to have one, and admin-parts kept a second
 * copy of it. It hands on the kit's one now.
 */

describe("admin-parts' settle", () => {
  it("is hooks/use-mounted's", () => {
    expect(adminSettle).toBe(settle);
  });

  it("answers a value, nothing, or a throw, as a promise", async () => {
    await expect(settle(() => 7)).resolves.toBe(7);
    await expect(settle(() => Promise.resolve("done"))).resolves.toBe("done");
    await expect(settle(() => undefined)).resolves.toBeUndefined();
    const broken = new Error("refused");
    await expect(
      settle(() => {
        throw broken;
      }),
    ).rejects.toBe(broken);
  });
});
