import { describe, expect, it } from "vitest";
import { uiKitLabelsFr } from "../locales/fr";

/**
 * French sets a space before ":" and ";", and it must be a no-break one (U+00A0, or the
 * narrow U+202F): a plain space lets the line break before the colon, which then opens the
 * next line alone. 130 French strings had it and 10 had a plain space (refactor audit
 * 2026-11-22, DOC-5), so every string and every label's text is swept, not a list.
 */
const fr = uiKitLabelsFr();

/** A label's texts: the string, or what the function prints for a few stand-in values. */
function texts(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (typeof node !== "function") return [];
  const out: string[] = [];
  for (const value of ["x", 1, 5]) {
    try {
      const text = (node as (...args: unknown[]) => unknown)(...Array.from({ length: node.length }, () => value));
      if (typeof text === "string") out.push(text);
    } catch {
      // Wants another shape of argument.
    }
  }
  return out;
}

function plainSpaces(): string[] {
  const found: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key);
      return;
    }
    const bad = texts(node).find((text) => / [:;]/.test(text));
    if (bad !== undefined) found.push(`${path}: ${bad}`);
  };
  walk(fr, "");
  return found;
}

describe("French puts a no-break space before : and ;", () => {
  it("in every string and every label's text", () => {
    expect(plainSpaces()).toEqual([]);
  });
});
