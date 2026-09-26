/**
 * A QR code encoder: text in, a square of dark / light modules out (ISO/IEC 18004).
 *
 * WHY IT IS IN THE KIT rather than a dependency. `TwoFactorSetting` needs one QR code —
 * an `otpauth://` URI, around 100–200 bytes — and every app that shows it was pulling
 * in `qrcode.react` plus `react-dom/server` to render that one code to a static SVG
 * string, then base64-encoding it so the kit could draw it back as an `<img>`.
 * A dependency here would land in all three apps whether they show 2FA or not; an
 * optional peer would mean a lazy import and a loading state for something that is
 * a few hundred lines of arithmetic. So it is those lines: pure, no imports, no module
 * state beyond two constant tables, safe under `sideEffects: false`, and
 * tree-shaken out of every app that never renders a {@link QrCode}.
 *
 * Scope, chosen for what the kit renders: BYTE mode only (UTF-8), all 40 versions,
 * all four error-correction levels, automatic version and mask selection. Numeric,
 * alphanumeric and Kanji modes are denser for their alphabets but would not shrink an
 * otpauth URI (lower-case letters are not in the alphanumeric set). The algorithm and
 * its penalty rules follow the reference implementation by Project Nayuki (MIT),
 * which is also what `qrcode.react` wraps — so for the same input, level and boost
 * the modules match that library's output exactly (the test suite pins a matrix).
 */

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrEncodeOptions {
  /** How much of the code may be damaged and still read. Default `"M"` (~15 %). */
  errorCorrection?: QrErrorCorrection;
  /** Raise the level as far as the chosen version still fits, for free. Default true. */
  boostErrorCorrection?: boolean;
}

export interface QrMatrix {
  /** 1–40. */
  version: number;
  /** Modules per side: `version * 4 + 17`. */
  size: number;
  /** The level actually used — higher than asked when boosted. */
  errorCorrection: QrErrorCorrection;
  /** 0–7. */
  mask: number;
  /** `modules[y][x]`, true = dark. No quiet zone: the renderer adds its own. */
  modules: boolean[][];
}

const LEVELS: QrErrorCorrection[] = ["L", "M", "Q", "H"];
/** The two format-information bits per level (not in ordinal order: M is 00). */
const FORMAT_BITS: Record<QrErrorCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Index 0 is padding; rows are L, M, Q, H.
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];
const NUM_ERROR_CORRECTION_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

/** Encode `text` (as UTF-8 bytes). Throws a `RangeError` past version 40's capacity. */
export function encodeQr(text: string, options: QrEncodeOptions = {}): QrMatrix {
  const bytes = Array.from(new TextEncoder().encode(text));
  let level = LEVELS.indexOf(options.errorCorrection ?? "M");

  // The smallest version that holds the data at the requested level.
  let version = 1;
  let usedBits: number;
  for (; ; version++) {
    const countBits = version <= 9 ? 8 : 16;
    usedBits = bytes.length < 1 << countBits ? 4 + countBits + bytes.length * 8 : Infinity;
    if (usedBits <= dataCodewords(version, level) * 8) break;
    if (version >= 40) throw new RangeError("QR data too long");
  }
  if (options.boostErrorCorrection ?? true) {
    for (let higher = level + 1; higher < LEVELS.length; higher++) {
      if (usedBits <= dataCodewords(version, higher) * 8) level = higher;
    }
  }

  // Mode, count, data; then terminator, byte padding and the 0xEC/0x11 fill.
  const bits: number[] = [];
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(0b0100, 4);
  append(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) append(b, 8);
  const capacity = dataCodewords(version, level) * 8;
  append(0, Math.min(4, capacity - bits.length));
  append(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }

  const grid = new Grid(version, LEVELS[level]);
  grid.drawFunctionPatterns();
  grid.drawCodewords(interleaveWithEcc(data, version, level));

  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    grid.applyMask(mask);
    grid.drawFormatBits(mask);
    const penalty = grid.penalty();
    if (penalty < bestPenalty) {
      bestMask = mask;
      bestPenalty = penalty;
    }
    grid.applyMask(mask); // XOR again undoes it
  }
  grid.applyMask(bestMask);
  grid.drawFormatBits(bestMask);

  return {
    version,
    size: grid.size,
    errorCorrection: LEVELS[level],
    mask: bestMask,
    modules: grid.modules,
  };
}

function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number, level: number): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[level][version] * NUM_ERROR_CORRECTION_BLOCKS[level][version]
  );
}

/** Split into blocks, append each block's Reed–Solomon codewords, interleave. */
function interleaveWithEcc(data: number[], version: number, level: number): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[level][version];
  const eccLen = ECC_CODEWORDS_PER_BLOCK[level][version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = reedSolomonDivisor(eccLen);

  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const block = data.slice(k, k + shortBlockLen - eccLen + (i < numShortBlocks ? 0 : 1));
    k += block.length;
    const ecc = reedSolomonRemainder(block, divisor);
    if (i < numShortBlocks) block.push(0); // placeholder, skipped below
    blocks.push(block.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - eccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMultiply(coef, factor);
    });
  }
  return result;
}

const bit = (value: number, i: number) => ((value >>> i) & 1) !== 0;

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  private readonly reserved: boolean[][];
  private readonly version: number;
  private readonly level: QrErrorCorrection;

  constructor(version: number, level: QrErrorCorrection) {
    this.version = version;
    this.level = level;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
    this.reserved = Array.from({ length: this.size }, () => new Array<boolean>(this.size).fill(false));
  }

  private set(x: number, y: number, dark: boolean) {
    this.modules[y][x] = dark;
    this.reserved[y][x] = true;
  }

  drawFunctionPatterns() {
    const { size } = this;
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);
    const align = this.alignmentPositions();
    const n = align.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corner = (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0);
        if (!corner) this.drawAlignment(align[i], align[j]);
      }
    }
    this.drawFormatBits(0); // reserves the area; redrawn once the mask is chosen
    this.drawVersion();
  }

  private drawFinder(x: number, y: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.set(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignment(x: number, y: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private alignmentPositions(): number[] {
    if (this.version === 1) return [];
    const numAlign = Math.floor(this.version / 7) + 2;
    const step = Math.floor((this.version * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
    const result = [6];
    for (let pos = this.size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  drawFormatBits(mask: number) {
    const data = (FORMAT_BITS[this.level] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const { size } = this;
    for (let i = 0; i <= 5; i++) this.set(8, i, bit(bits, i));
    this.set(8, 7, bit(bits, 6));
    this.set(8, 8, bit(bits, 7));
    this.set(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) this.set(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.set(8, size - 15 + i, bit(bits, i));
    this.set(8, size - 8, true); // the always-dark module
  }

  private drawVersion() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = bit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  /** The zig-zag placement: two-module columns, right to left, alternating up and down. */
  drawCodewords(data: number[]) {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5; // skip the vertical timing column
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.reserved[y][x] && i < data.length * 8) {
            this.modules[y][x] = bit(data[i >>> 3], 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.reserved[y][x] && maskBit(mask, x, y)) this.modules[y][x] = !this.modules[y][x];
      }
    }
  }

  penalty(): number {
    const { size, modules } = this;
    let result = 0;
    const line = (get: (a: number, b: number) => boolean) => {
      for (let a = 0; a < size; a++) {
        let runColor = false;
        let run = 0;
        const history = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < size; b++) {
          if (get(a, b) === runColor) {
            run++;
            if (run === 5) result += 3;
            else if (run > 5) result++;
          } else {
            this.addHistory(run, history);
            if (!runColor) result += this.countFinderLike(history) * 40;
            runColor = get(a, b);
            run = 1;
          }
        }
        if (runColor) {
          this.addHistory(run, history);
          run = 0;
        }
        this.addHistory(run + size, history);
        result += this.countFinderLike(history) * 40;
      }
    };
    line((y, x) => modules[y][x]);
    line((x, y) => modules[y][x]);

    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
          result += 3;
        }
      }
    }

    let dark = 0;
    for (const row of modules) for (const m of row) if (m) dark++;
    const total = size * size;
    result += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return result;
  }

  private addHistory(run: number, history: number[]) {
    if (history[0] === 0) run += this.size; // the light border before the first run
    history.pop();
    history.unshift(run);
  }

  private countFinderLike(h: number[]): number {
    const n = h[1];
    const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
    return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0) + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0);
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}
