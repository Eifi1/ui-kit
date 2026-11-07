import { describe, expect, it } from "vitest";
import {
  QUANTITY_DIGITS,
  QUANTITY_UNITS,
  convertQuantity,
  formatQuantity,
  parseQuantity,
  quantityFamily,
  quantityMaxDigits,
  sumQuantities,
  toBaseQuantity,
  type Quantity,
  type QuantityUnit,
} from "../quantity";

/** The narrow no-break space formatNumber joins a figure and its unit with. */
const NNBSP = "\u202F";
const q = (amount: number | null, unit: QuantityUnit): Quantity => ({ amount, unit });

describe("quantityFamily and the unit tables", () => {
  it("puts g and kg in mass, ml cl dl l in volume, pcs in count", () => {
    expect(QUANTITY_UNITS.map((u) => [u, quantityFamily(u)])).toEqual([
      ["g", "mass"],
      ["kg", "mass"],
      ["ml", "volume"],
      ["cl", "volume"],
      ["dl", "volume"],
      ["l", "volume"],
      ["pcs", "count"],
    ]);
  });

  it("defaults every unit to digits on the milli grid; a count is whole but may take three", () => {
    expect(QUANTITY_DIGITS).toEqual({ g: 0, kg: 3, ml: 0, cl: 1, dl: 2, l: 3, pcs: 0 });
    for (const unit of QUANTITY_UNITS) expect(QUANTITY_DIGITS[unit]).toBeLessThanOrEqual(quantityMaxDigits(unit));
    expect(quantityMaxDigits("pcs")).toBe(3);
  });
});

describe("toBaseQuantity", () => {
  it("answers in kg, l or pcs", () => {
    expect(toBaseQuantity(q(500, "g"))).toEqual({ amount: 0.5, unit: "kg" });
    expect(toBaseQuantity(q(75, "cl"))).toEqual({ amount: 0.75, unit: "l" });
    expect(toBaseQuantity(q(2.5, "dl"))).toEqual({ amount: 0.25, unit: "l" });
    expect(toBaseQuantity(q(330, "ml"))).toEqual({ amount: 0.33, unit: "l" });
    expect(toBaseQuantity(q(1.5, "kg"))).toEqual({ amount: 1.5, unit: "kg" });
    expect(toBaseQuantity(q(6, "pcs"))).toEqual({ amount: 6, unit: "pcs" });
  });

  it("is null without an amount, or with one that is no number", () => {
    expect(toBaseQuantity(q(null, "kg"))).toBeNull();
    expect(toBaseQuantity(q(Number.NaN, "kg"))).toBeNull();
    expect(toBaseQuantity(q(Number.POSITIVE_INFINITY, "l"))).toBeNull();
  });

  it("is null for a unit the kit does not know (a value off an API)", () => {
    expect(toBaseQuantity({ amount: 1, unit: "oz" as QuantityUnit })).toBeNull();
  });
});

describe("convertQuantity", () => {
  it("converts within a family, exactly", () => {
    expect(convertQuantity(q(500, "g"), "kg")).toEqual(q(0.5, "kg"));
    expect(convertQuantity(q(1.5, "kg"), "g")).toEqual(q(1500, "g"));
    expect(convertQuantity(q(75, "cl"), "l")).toEqual(q(0.75, "l"));
    expect(convertQuantity(q(75, "cl"), "dl")).toEqual(q(7.5, "dl"));
    expect(convertQuantity(q(0.33, "l"), "cl")).toEqual(q(33, "cl"));
    // 1.005 kg is 1.00499… in binary: `1.005 * 1000` is 1004.9999999999999.
    expect(convertQuantity(q(1.005, "kg"), "g")).toEqual(q(1005, "g"));
    expect(convertQuantity(q(0.1, "l"), "ml")).toEqual(q(100, "ml"));
  });

  it("refuses another family: mass is not volume, and a piece has no weight here", () => {
    expect(convertQuantity(q(500, "g"), "ml")).toBeNull();
    expect(convertQuantity(q(6, "pcs"), "kg")).toBeNull();
    expect(convertQuantity(q(1, "l"), "pcs")).toBeNull();
  });

  it("keeps no amount as no amount, in the new unit", () => {
    expect(convertQuantity(q(null, "g"), "kg")).toEqual(q(null, "kg"));
  });
});

describe("sumQuantities", () => {
  it("is exact: 0.1 kg + 0.2 kg is 0.3 kg, not the float sum", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // the trap the milli-units avoid
    expect(sumQuantities([q(0.1, "kg"), q(0.2, "kg")])).toEqual(q(0.3, "kg"));
    expect(sumQuantities([q(0.1, "l"), q(0.2, "l"), q(0.3, "l")])).toEqual(q(0.6, "l"));
    expect(sumQuantities([q(1.1, "dl"), q(2.2, "dl")])).toEqual(q(3.3, "dl"));
  });

  it("answers in the first quantity's unit, or in `unit`", () => {
    expect(sumQuantities([q(500, "g"), q(1, "kg")])).toEqual(q(1500, "g"));
    expect(sumQuantities([q(1, "kg"), q(500, "g")])).toEqual(q(1.5, "kg"));
    expect(sumQuantities([q(500, "g"), q(1, "kg")], "kg")).toEqual(q(1.5, "kg"));
    expect(sumQuantities([q(75, "cl"), q(2.5, "dl"), q(330, "ml")], "l")).toEqual(q(1.33, "l"));
  });

  it("is null across families, or when `unit` is of another one", () => {
    expect(sumQuantities([q(500, "g"), q(1, "l")])).toBeNull();
    expect(sumQuantities([q(2, "pcs"), q(500, "g")])).toBeNull();
    expect(sumQuantities([q(500, "g")], "ml")).toBeNull();
  });

  it("skips a quantity with no amount, whose unit still has to fit", () => {
    expect(sumQuantities([q(500, "g"), q(null, "kg"), q(250, "g")])).toEqual(q(750, "g"));
    expect(sumQuantities([q(500, "g"), q(null, "l")])).toBeNull();
    expect(sumQuantities([q(null, "g"), q(null, "kg")])).toEqual(q(null, "g"));
  });

  it("is null for no quantities, or 0 in `unit`", () => {
    expect(sumQuantities([])).toBeNull();
    expect(sumQuantities([], "kg")).toEqual(q(0, "kg"));
  });
});

describe("formatQuantity", () => {
  it("prints the figure in the locale's marks, the unit after a narrow no-break space", () => {
    expect(formatQuantity(q(1.5, "kg"), "en")).toBe(`1.5${NNBSP}kg`);
    // de-CH writes a decimal POINT; de-DE, fr and it a comma.
    expect(formatQuantity(q(1.5, "kg"), "de-CH")).toBe(`1.5${NNBSP}kg`);
    expect(formatQuantity(q(1.5, "kg"), "de-DE")).toBe(`1,5${NNBSP}kg`);
    expect(formatQuantity(q(1.5, "kg"), "fr-FR")).toBe(`1,5${NNBSP}kg`);
    expect(formatQuantity(q(1.5, "kg"), "it-IT")).toBe(`1,5${NNBSP}kg`);
    expect(formatQuantity(q(500, "g"), "en")).toBe(`500${NNBSP}g`);
  });

  it("trims trailing zeros, and stops at the unit's grid", () => {
    expect(formatQuantity(q(0.5, "kg"), "en")).toBe(`0.5${NNBSP}kg`);
    expect(formatQuantity(q(2, "l"), "en")).toBe(`2${NNBSP}l`);
    expect(formatQuantity(q(0.125, "l"), "en")).toBe(`0.125${NNBSP}l`);
    expect(formatQuantity(q(7.5, "cl"), "en")).toBe(`7.5${NNBSP}cl`);
    expect(formatQuantity(q(1.25, "dl"), "en")).toBe(`1.25${NNBSP}dl`);
  });

  it("prints pieces in the words it is given, English without", () => {
    expect(formatQuantity(q(6, "pcs"), "en")).toBe(`6${NNBSP}pcs`);
    expect(formatQuantity(q(6, "pcs"), "de-CH", { labels: { pcs: "Stk." } })).toBe(`6${NNBSP}Stk.`);
    expect(formatQuantity(q(0.5, "pcs"), "en")).toBe(`0.5${NNBSP}pcs`);
  });

  it("prints no amount as the empty value alone", () => {
    expect(formatQuantity(q(null, "kg"), "en")).toBe("—");
  });

  describe("bestUnit", () => {
    const best = (amount: number, unit: QuantityUnit) => formatQuantity(q(amount, unit), "en", { bestUnit: true });

    it("goes up at 1000 g and 1000 ml, not below", () => {
      expect(best(999, "g")).toBe(`999${NNBSP}g`);
      expect(best(1000, "g")).toBe(`1${NNBSP}kg`);
      expect(best(1500, "g")).toBe(`1.5${NNBSP}kg`);
      expect(best(999, "ml")).toBe(`999${NNBSP}ml`);
      expect(best(1000, "ml")).toBe(`1${NNBSP}l`);
    });

    it("goes down below 1 kg and 1 l, not at it", () => {
      expect(best(1, "kg")).toBe(`1${NNBSP}kg`);
      expect(best(0.999, "kg")).toBe(`999${NNBSP}g`);
      expect(best(0.5, "kg")).toBe(`500${NNBSP}g`);
      expect(best(1, "l")).toBe(`1${NNBSP}l`);
      expect(best(0.25, "l")).toBe(`250${NNBSP}ml`);
    });

    it("normalises cl and dl to ml and l", () => {
      expect(best(75, "cl")).toBe(`750${NNBSP}ml`);
      expect(best(100, "cl")).toBe(`1${NNBSP}l`);
      expect(best(2.5, "dl")).toBe(`250${NNBSP}ml`);
      expect(best(15, "dl")).toBe(`1.5${NNBSP}l`);
    });

    it("leaves pieces alone, and the locale's marks in place", () => {
      expect(best(12, "pcs")).toBe(`12${NNBSP}pcs`);
      expect(formatQuantity(q(1500, "g"), "de-DE", { bestUnit: true })).toBe(`1,5${NNBSP}kg`);
    });
  });
});

describe("parseQuantity", () => {
  it("reads a figure and a unit, with or without the space", () => {
    expect(parseQuantity("500g", "en")).toEqual(q(500, "g"));
    expect(parseQuantity("500 g", "en")).toEqual(q(500, "g"));
    expect(parseQuantity("1.5l", "en")).toEqual(q(1.5, "l"));
    expect(parseQuantity("2.5 dl", "en")).toEqual(q(2.5, "dl"));
    expect(parseQuantity("75 cl", "en")).toEqual(q(75, "cl"));
    expect(parseQuantity("  1.5 KG ", "en")).toEqual(q(1.5, "kg"));
    expect(parseQuantity(`1.5${NNBSP}kg`, "en")).toEqual(q(1.5, "kg"));
  });

  it("reads the locale's decimal mark: de-CH a point, de-DE a comma", () => {
    expect(parseQuantity("1.5 kg", "de-CH")).toEqual(q(1.5, "kg"));
    expect(parseQuantity("1,5 kg", "de-DE")).toEqual(q(1.5, "kg"));
    expect(parseQuantity("1,5 kg", "fr-FR")).toEqual(q(1.5, "kg"));
    expect(parseQuantity("0,75 l", "it-IT")).toEqual(q(0.75, "l"));
    // As the kit's number fields read typing: a Swiss typist's comma is the decimal too,
    // and a German "1.500" is grouping.
    expect(parseQuantity("1,5 kg", "de-CH")).toEqual(q(1.5, "kg"));
    expect(parseQuantity("1.500 g", "de-DE")).toEqual(q(1500, "g"));
    expect(parseQuantity("1’500 g", "de-CH")).toEqual(q(1500, "g"));
    expect(parseQuantity("1 500 g", "fr-FR")).toEqual(q(1500, "g"));
  });

  it("reads a count in any catalogue's word, or as 6x", () => {
    for (const text of ["6 pcs", "6 Stk", "6 Stk.", "6 Stück", "6 pce", "6 pz.", "6 ud.", "6 db", "6个", "6x", "6 x"]) {
      expect(parseQuantity(text, "de-CH"), text).toEqual(q(6, "pcs"));
    }
  });

  it("reads back what formatQuantity prints, the app's own pieces word included", () => {
    const words = { pcs: "Stueck" };
    for (const value of [q(1.5, "kg"), q(500, "g"), q(75, "cl"), q(0.125, "l"), q(12, "pcs")]) {
      for (const locale of ["en", "de-CH", "de-DE", "fr-FR"]) {
        const text = formatQuantity(value, locale, { labels: words });
        expect(parseQuantity(text, locale, { labels: words }), `${text} (${locale})`).toEqual(value);
      }
    }
  });

  it("returns null for a multipack (v1)", () => {
    expect(parseQuantity("6 x 1.5 l", "en")).toBeNull();
    expect(parseQuantity("6x500g", "en")).toBeNull();
    expect(parseQuantity("2 × 250 ml", "en")).toBeNull();
  });

  it("returns null for no unit, an unknown one, no figure, or a sign", () => {
    expect(parseQuantity("500", "en")).toBeNull();
    expect(parseQuantity("500 oz", "en")).toBeNull();
    expect(parseQuantity("kg", "en")).toBeNull();
    expect(parseQuantity("", "en")).toBeNull();
    expect(parseQuantity("-1 kg", "en")).toBeNull();
    expect(parseQuantity("1.2.3 kg", "de-DE")).toBeNull();
    expect(parseQuantity("1 2 g", "en")).toBeNull();
  });

  it("refuses an amount finer than the unit's grid rather than round it", () => {
    expect(parseQuantity("0.5 g", "en")).toBeNull();
    expect(parseQuantity("1.0005 kg", "en")).toBeNull();
    expect(parseQuantity("7.55 cl", "en")).toBeNull();
    // An English "1,500 g" reads as 1.5 g (a lone comma is the decimal, as Swiss typists
    // write it) — and is refused instead of becoming 2 g.
    expect(parseQuantity("1,500 g", "en")).toBeNull();
    // Trailing zeros are no precision: 1.500 kg is 1.5 kg.
    expect(parseQuantity("1.500 kg", "en")).toEqual(q(1.5, "kg"));
  });
});
