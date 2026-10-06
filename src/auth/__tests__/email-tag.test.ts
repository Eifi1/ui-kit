import { describe, expect, it } from "vitest";

import { emailParts, taggedEmail } from "../email-tag";

/**
 * §4.5: the app's name as a sub-address, offered once the address is plausible —
 * keksdose's `taggedEmail`, with the tag a parameter.
 */
describe("taggedEmail", () => {
  it("puts the tag between the local part and the domain", () => {
    expect(taggedEmail("ada@example.com", "kastlan")).toBe("ada+kastlan@example.com");
    expect(taggedEmail("ada@mail.example.co.uk", "kurvenschmiede")).toBe("ada+kurvenschmiede@mail.example.co.uk");
  });

  it("trims the address and keeps its case; trims and lower-cases the tag", () => {
    expect(taggedEmail("  Ada.Example@Example.com ", "kastlan")).toBe("Ada.Example+kastlan@Example.com");
    expect(taggedEmail("ada@example.com", " Keksdose ")).toBe("ada+keksdose@example.com");
  });

  it("offers nothing for an address that already carries a tag — theirs wins", () => {
    expect(taggedEmail("ada+bank@example.com", "kastlan")).toBeNull();
    expect(taggedEmail("ada+kastlan@example.com", "kastlan")).toBeNull();
  });

  it.each(["", "ada", "ada@", "@example.com", "ada@example", "ada@.example.com", "ada@example.", "   "])(
    "offers nothing while the address is incomplete: %j",
    (email) => {
      expect(taggedEmail(email, "kastlan")).toBeNull();
    },
  );

  it.each(["", "  ", "kast lan", "a+b", "a@b", "-x"])("offers nothing for a tag that is not a plain name: %j", (tag) => {
    expect(taggedEmail("ada@example.com", tag)).toBeNull();
  });

  it("allows digits, dots, underscores and hyphens in the tag", () => {
    expect(taggedEmail("ada@example.com", "app-2_x.y")).toBe("ada+app-2_x.y@example.com");
  });
});

describe("emailParts", () => {
  it("splits at the last @ of the trimmed address", () => {
    expect(emailParts(" ada@example.com ")).toEqual({ local: "ada", domain: "example.com" });
    expect(emailParts("ada")).toBeNull();
  });
});
