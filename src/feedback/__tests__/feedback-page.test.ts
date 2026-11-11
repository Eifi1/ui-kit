import { describe, expect, it } from "vitest";
import { reduceAddress, reducePage } from "../feedback-page";

/** The page a report names — one reduction for the crash reporter and the submit dialog
 *  (0.60, keksdose legal audit 2026-11-11, G-10). */

const ALLOW = new Set(["p", "sort"]);

describe("reducePage", () => {
  it("keeps the pathname and the allowed params, in their order, and drops the hash", () => {
    expect(reducePage("/register?q=Miete&p=2&f.payee=Dr%20M&sort=date#row-4", ALLOW)).toBe("/register?p=2&sort=date");
    expect(reducePage("https://keksdose.app/register?q=Miete", ALLOW)).toBe("/register");
    expect(reducePage("/register?p=2&p=3", ALLOW)).toBe("/register?p=2&p=3");
  });

  it("answers a path for anything else", () => {
    expect(reducePage(undefined, ALLOW)).toBe("/");
    expect(reducePage(42, ALLOW)).toBe("/");
    expect(reducePage("http://[::1/x?q=a", ALLOW)).toBe("http://[::1/x");
  });
});

describe("reduceAddress", () => {
  it("keeps the origin before the reduced page", () => {
    expect(reduceAddress("https://keksdose.app/register?q=Miete&p=2#x", ALLOW)).toBe(
      "https://keksdose.app/register?p=2",
    );
    expect(reduceAddress("http://192.168.1.20:5173/a?sort=x", ALLOW)).toBe("http://192.168.1.20:5173/a?sort=x");
  });

  it("adds no origin a path-only address never had, and leaves empty empty", () => {
    expect(reduceAddress("", ALLOW)).toBe("");
    expect(reduceAddress("/register?q=Miete", ALLOW)).toBe("/register");
  });
});
