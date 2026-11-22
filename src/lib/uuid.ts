/**
 * UUIDs that work outside a secure context (0.66, refactor audit 2026-11-22, DUP-4).
 *
 * `crypto.randomUUID()` and `crypto.subtle` exist only in a secure context (https, or
 * localhost). An app opened over plain http on a LAN address — a phone testing the dev
 * server — has neither, so every id minted with them throws `crypto.randomUUID is not a
 * function`. `crypto.getRandomValues()` is there in every context. keksdose
 * (`shared/lib/uuid.ts`, 14 importing files) and kastlan (`shared/utils/uuid.ts`) each
 * wrote these; the kit's sync engine had a third, weaker fallback (`Date.now` +
 * `Math.random`), and its async `uuid5` needed `crypto.subtle`. One copy now, keksdose's.
 *
 * Exported by `@eifi1/ui-kit/offline` and `@eifi1/ui-kit/sync`, beside `uuid5`. Imports
 * nothing: both entries promise to reach no package from here.
 */

/** Lower-case hex, hyphenated 8-4-4-4-12. */
function format(bytes: Uint8Array): string {
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * A random (version 4) UUID, in every context: the browser's own `crypto.randomUUID()`
 * where there is one, else assembled from `crypto.getRandomValues()` — the same 122 random
 * bits, the version and the RFC 4122 variant set as `randomUUID` sets them.
 */
export function randomUuid(): string {
  const c = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // the RFC 4122 variant
  return format(b);
}

const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/**
 * A name-based UUID, version 5 (RFC 4122 §4.3: SHA-1 of the namespace's 16 bytes and the
 * name's UTF-8) — byte-for-byte Python's `uuid.uuid5(uuid.UUID(namespace), name)`, for an
 * id the device and the server derive alike without talking to each other (keksdose's
 * "Balance adjustments" category, created by whichever side reconciles first; local-first
 * §2's per-owner vote id). Synchronous, and with no `crypto.subtle`: SHA-1 is computed
 * here, a 64-byte-block hash over a few dozen bytes. Its collision weakness does not
 * matter for an id nobody is trying to forge.
 *
 * Lower case, hyphenated. `namespace` is a UUID, hyphenated or not, in either case;
 * anything else is a `TypeError`.
 */
export function uuid5Sync(namespace: string, name: string): string {
  if (!UUID.test(namespace))
    throw new TypeError(`uuid5: the namespace must be a UUID, not ${JSON.stringify(namespace)}`);
  const hex = namespace.replaceAll("-", "");
  const nameBytes = new TextEncoder().encode(name);
  const input = new Uint8Array(16 + nameBytes.length);
  for (let i = 0; i < 16; i += 1) input[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  input.set(nameBytes, 16);
  const b = sha1(input).subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // the RFC 4122 variant
  return format(b);
}

/** SHA-1 (FIPS 180-4) of `bytes`. Pinned through `uuid5Sync`'s vectors, which include
 *  names that cross the 64-byte block and the length's place in it. */
function sha1(bytes: Uint8Array): Uint8Array {
  // Pad: a 1 bit, zeros to 56 mod 64, then the bit length as a 64-bit big-endian int.
  const total = Math.ceil((bytes.length + 9) / 64) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const view = new DataView(buf.buffer);
  const bits = bytes.length * 8;
  view.setUint32(total - 8, Math.floor(bits / 0x100000000));
  view.setUint32(total - 4, bits >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 80; i += 1) {
      const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (x << 1) | (x >>> 31);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i += 1) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = t;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h));
  return out;
}
