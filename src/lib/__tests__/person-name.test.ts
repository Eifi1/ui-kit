import { describe, expect, it } from "vitest";
import { formatPersonName, personInitials } from "../person-name";

/**
 * docs/auth-harmonization.md §3.2: the order follows the READER's language — "First
 * Last" in de-CH, en, fr, it and es; "Last First" in hu; "LastFirst" with no space in
 * zh for a name in CJK characters (both parts), and as written for any other name (the
 * coordinator's refinement) — trimmed, and with an empty part the other alone (a
 * migrated user's whole display name in `first`, §3.3). Synthetic people only.
 */

const ADA = { first: "Ada", last: "Example" };
const WANG = { first: "小明", last: "王" };
const LI = { first: "小龙", last: "李" };

describe("formatPersonName", () => {
  it.each(["de-CH", "en", "en-GB", "fr", "it", "es"])("writes First Last in %s", (locale) => {
    expect(formatPersonName(ADA, locale)).toBe("Ada Example");
  });

  it("writes Last First in hu", () => {
    expect(formatPersonName(ADA, "hu")).toBe("Example Ada");
    expect(formatPersonName(ADA, "hu-HU")).toBe("Example Ada");
  });

  it("writes a CJK name LastFirst with no space in zh, whatever the region or script", () => {
    expect(formatPersonName(LI, "zh")).toBe("李小龙");
    expect(formatPersonName(WANG, "zh-CN")).toBe("王小明");
    expect(formatPersonName(WANG, "zh-Hant-TW")).toBe("王小明");
    expect(formatPersonName(WANG, "zh_TW")).toBe("王小明");
    // Kana and hangul count as CJK too: a Japanese or Korean name in a Chinese UI.
    expect(formatPersonName({ first: "さくら", last: "山田" }, "zh")).toBe("山田さくら");
    expect(formatPersonName({ first: "민준", last: "김" }, "zh")).toBe("김민준");
  });

  it("writes a Latin name in zh as it is written, First Last with a space", () => {
    expect(formatPersonName({ first: "Ada", last: "Lovelace" }, "zh")).toBe("Ada Lovelace");
    expect(formatPersonName(ADA, "zh-CN")).toBe("Ada Example");
  });

  it("joins in zh only when BOTH parts are CJK", () => {
    expect(formatPersonName({ first: "Ada", last: "李" }, "zh")).toBe("Ada 李");
    expect(formatPersonName({ first: "小龙", last: "Lee" }, "zh")).toBe("小龙 Lee");
  });

  it("puts the family name first in hu for every name, CJK included", () => {
    expect(formatPersonName(LI, "hu")).toBe("李 小龙");
  });

  it("writes a CJK name First Last outside zh and hu — the reader's order, not the name's", () => {
    expect(formatPersonName(LI, "en")).toBe("小龙 李");
  });

  it("uses First Last without a locale, and for a language it does not know", () => {
    expect(formatPersonName(ADA)).toBe("Ada Example");
    expect(formatPersonName(ADA, "pt-BR")).toBe("Ada Example");
    expect(formatPersonName(ADA, "")).toBe("Ada Example");
  });

  it("trims both parts and keeps the inner spaces as typed", () => {
    expect(formatPersonName({ first: "  Ada Maria ", last: " van Example\t" }, "en")).toBe("Ada Maria van Example");
    expect(formatPersonName({ first: " Ada ", last: " Example " }, "hu")).toBe("Example Ada");
    expect(formatPersonName({ first: " 小明 ", last: " 王 " }, "zh")).toBe("王小明");
  });

  it("falls back to the first name alone when the last is empty — in every order", () => {
    // A migrated keksdose / Kurvenschmiede row: the whole old display name, no last name.
    for (const locale of ["en", "de-CH", "fr", "it", "es", "hu", "zh"]) {
      expect(formatPersonName({ first: "Ada Example", last: "" }, locale)).toBe("Ada Example");
      expect(formatPersonName({ first: "Ada", last: "   " }, locale)).toBe("Ada");
      expect(formatPersonName({ first: "Ada", last: null }, locale)).toBe("Ada");
      expect(formatPersonName({ first: "Ada" }, locale)).toBe("Ada");
    }
  });

  it("falls back to the last name alone when the first is empty, and to '' when both are", () => {
    expect(formatPersonName({ first: "", last: "Example" }, "en")).toBe("Example");
    expect(formatPersonName({ first: null, last: "Example" }, "hu")).toBe("Example");
    expect(formatPersonName({ first: " ", last: " " }, "en")).toBe("");
    expect(formatPersonName({}, "zh")).toBe("");
  });
});

describe("personInitials", () => {
  it.each(["de-CH", "en", "fr", "it", "es"])("takes first then last in %s", (locale) => {
    expect(personInitials(ADA, locale)).toBe("AE");
  });

  it("takes last then first in hu", () => {
    expect(personInitials(ADA, "hu")).toBe("EA");
  });

  it("takes a CJK name's family-name character alone in zh", () => {
    expect(personInitials(LI, "zh")).toBe("李");
    expect(personInitials(WANG, "zh-Hant")).toBe("王");
  });

  it("takes a Latin name's initials in zh as written: first then last", () => {
    expect(personInitials({ first: "Ada", last: "Lovelace" }, "zh")).toBe("AL");
    expect(personInitials({ first: "Ada", last: "李" }, "zh")).toBe("A李");
  });

  it("upper-cases, and under the reader's rules", () => {
    expect(personInitials({ first: "ada", last: "example" }, "en")).toBe("AE");
    expect(personInitials({ first: "ilka", last: "işık" }, "tr")).toBe("İİ");
  });

  it("takes a whole character, not half of one", () => {
    // "É" typed as E + a combining accent, and a name starting with an emoji.
    expect(personInitials({ first: "Émile", last: "Example" }, "fr")).toBe("ÉE");
    expect(personInitials({ first: "🦊 Fox", last: "Example" }, "en")).toBe("🦊E");
  });

  it("keeps a migrated user's avatar: one part is read like the old display name", () => {
    expect(personInitials({ first: "Ada Example", last: "" }, "en")).toBe("AE");
    expect(personInitials({ first: "Ada", last: "" }, "en")).toBe("AD");
    expect(personInitials({ first: "Ada Example", last: null }, "hu")).toBe("AE");
    expect(personInitials({ first: "", last: "Example" }, "en")).toBe("EX");
    expect(personInitials({ first: "小明", last: "" }, "zh")).toBe("小");
    expect(personInitials({ first: "Ada Example", last: "" }, "zh")).toBe("AE");
  });

  it("answers '' when there is no name to take initials from", () => {
    expect(personInitials({ first: "  ", last: "" }, "en")).toBe("");
    expect(personInitials({}, "zh")).toBe("");
  });

  it("does not throw on a locale tag the runtime refuses", () => {
    expect(personInitials(ADA, "not a locale")).toBe("AE");
  });
});
