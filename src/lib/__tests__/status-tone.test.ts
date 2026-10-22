import { describe, expect, it } from "vitest";
import { STATUS_KINDS, statusTone } from "../status-tone";

// 0.49 KIT-8: five domain-free status kinds and the tone each one is drawn in.
describe("statusTone", () => {
  it("maps each kind to its semantic tone", () => {
    expect(statusTone("good")).toBe("success");
    expect(statusTone("attention")).toBe("warning");
    expect(statusTone("problem")).toBe("danger");
    expect(statusTone("active")).toBe("info");
    expect(statusTone("inactive")).toBe("neutral");
  });

  it("lists every kind once, and never maps one to brand or a money tone", () => {
    expect(STATUS_KINDS).toEqual(["good", "attention", "problem", "active", "inactive"]);
    const tones = STATUS_KINDS.map(statusTone);
    expect(new Set(tones).size).toBe(STATUS_KINDS.length);
    for (const tone of tones) expect(["brand", "income", "expense"]).not.toContain(tone);
  });
});
