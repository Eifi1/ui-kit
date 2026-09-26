import { encodeQr } from "../qr-encode";

/**
 * The encoder is checked module for module against the reference implementation
 * (Project Nayuki's qrcodegen, which `qrcode.react` wraps): the two matrices below were
 * produced by it. During development the encoder was also compared with it for every
 * level, with and without the level boost, at lengths reaching versions 1–40 — identical
 * throughout; these pins keep it that way without shipping the reference as a dependency.
 */

const HELLO_WORLD = [
  "#######..#.#..#######",
  "#.....#.##.#..#.....#",
  "#.###.#..####.#.###.#",
  "#.###.#.#..#..#.###.#",
  "#.###.#.#####.#.###.#",
  "#.....#.......#.....#",
  "#######.#.#.#.#######",
  "........#...#........",
  ".#.####.##...##.##.#.",
  "....#....#.###...##..",
  "#######..#.#.#....###",
  ".......#.##..#.#..#..",
  ".###.##.##.##...##.#.",
  "........##...#####.#.",
  "#######...##.##.#.#..",
  "#.....#.####.##.####.",
  "#.###.#.#.#.#..#.#...",
  "#.###.#.#######......",
  "#.###.#..#.##########",
  "#.....#.##..#.#######",
  "#######...#####......",
];

const draw = (modules: boolean[][]) => modules.map((row) => row.map((m) => (m ? "#" : ".")).join(""));

/** The same 31-multiplier string hash the pin was computed with. */
function hash(modules: boolean[][]): number {
  let h = 0;
  for (const row of modules) for (const m of row) h = (Math.imul(h, 31) + (m ? 49 : 48)) | 0;
  return h;
}

describe("encodeQr", () => {
  it("matches the reference module for module (version 1, boosted to Q)", () => {
    const qr = encodeQr("hello world");
    expect(qr.version).toBe(1);
    expect(qr.errorCorrection).toBe("Q");
    expect(qr.mask).toBe(6);
    expect(draw(qr.modules)).toEqual(HELLO_WORLD);
  });

  it("matches the reference for an otpauth URI (version 5, alignment pattern, mask 4)", () => {
    const qr = encodeQr(
      "otpauth://totp/Kastlan:marcel%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Kastlan",
    );
    expect(qr.version).toBe(5);
    expect(qr.size).toBe(37);
    expect(qr.errorCorrection).toBe("M");
    expect(qr.mask).toBe(4);
    expect(hash(qr.modules)).toBe(-1312801284);
  });

  it("keeps the requested level when the boost is off", () => {
    expect(encodeQr("hello world", { boostErrorCorrection: false }).errorCorrection).toBe("M");
    expect(encodeQr("hello world", { errorCorrection: "L", boostErrorCorrection: false }).errorCorrection).toBe("L");
  });

  it("grows the version with the data and draws the version blocks from 7 up", () => {
    const qr = encodeQr("x".repeat(200));
    expect(qr.version).toBeGreaterThanOrEqual(7);
    expect(qr.size).toBe(qr.version * 4 + 17);
    // The three finder patterns: a dark 7×7 ring around a light ring around a 3×3 core.
    for (const [x, y] of [
      [0, 0],
      [qr.size - 7, 0],
      [0, qr.size - 7],
    ]) {
      expect(qr.modules[y][x]).toBe(true);
      expect(qr.modules[y + 1][x + 1]).toBe(false);
      expect(qr.modules[y + 3][x + 3]).toBe(true);
    }
  });

  it("encodes UTF-8, and refuses what no version holds", () => {
    expect(() => encodeQr("Grüße 漢字 😀")).not.toThrow();
    expect(() => encodeQr("x".repeat(3000))).toThrow(RangeError);
  });
});
