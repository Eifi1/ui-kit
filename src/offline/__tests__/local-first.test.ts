import { describe, expect, it, vi } from "vitest";
import { isOfflineError, readLocalFirst, stampAfter, writeLocalFirst } from "../local-first";

const noAnswer = Object.assign(new Error("Network Error"), { isAxiosError: true, response: undefined });
const answered = (status: number) => Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status, data: {} } });

describe("stampAfter", () => {
  it("is now when the previous stamp is behind this clock", () => {
    const before = Date.now();
    const stamp = Date.parse(stampAfter("2020-01-01T00:00:00Z"));
    expect(stamp).toBeGreaterThanOrEqual(before);
    expect(stamp).toBeLessThanOrEqual(Date.now());
  });

  it("is strictly after a previous stamp that is ahead of this clock (a slow device)", () => {
    const ahead = new Date(Date.now() + 60_000).toISOString();
    expect(Date.parse(stampAfter(ahead))).toBe(Date.parse(ahead) + 1);
    // Microseconds the server keeps are truncated by Date.parse: still strictly later.
    const micro = ahead.replace("Z", "").replace(/\.(\d{3})$/, ".$1999Z");
    expect(Date.parse(stampAfter(micro))).toBeGreaterThan(Date.parse(micro));
  });

  it("is now for anything that is not a stamp", () => {
    for (const previous of [undefined, null, 42, "not a date"]) {
      expect(Math.abs(Date.parse(stampAfter(previous)) - Date.now())).toBeLessThan(1000);
    }
  });
});

describe("isOfflineError", () => {
  it("holds for a request with no answer and for fetch's TypeError", () => {
    expect(isOfflineError(noAnswer)).toBe(true);
    expect(isOfflineError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("holds for the session refresh's passing 401", () => {
    // The mark the kit's session refresh puts on a 401 whose refresh met no server.
    const passing = Object.assign(answered(401), { [Symbol.for("@eifi1/ui-kit:session-refresh.transient")]: true });
    expect(isOfflineError(passing)).toBe(true);
    expect(isOfflineError(answered(401))).toBe(false);
  });

  it("does not hold for an answer, a 4xx or a 5xx, or a plain bug", () => {
    expect(isOfflineError(answered(400))).toBe(false);
    expect(isOfflineError(answered(500))).toBe(false);
    expect(isOfflineError({ response: { status: 503 } })).toBe(false);
    expect(isOfflineError(new Error("a bug"))).toBe(false);
    expect(isOfflineError(null)).toBe(false);
  });
});

describe("readLocalFirst", () => {
  it("answers the server's read, and hands it to onOnline first", async () => {
    const onOnline = vi.fn();
    const offline = vi.fn(async () => "copy");
    expect(await readLocalFirst(async () => "server", offline, onOnline)).toBe("server");
    expect(onOnline).toHaveBeenCalledWith("server");
    expect(offline).not.toHaveBeenCalled();
  });

  it("falls back to the copy offline, and throws on an answer", async () => {
    expect(await readLocalFirst(() => Promise.reject(noAnswer), async () => "copy")).toBe("copy");
    const missing = answered(404);
    await expect(readLocalFirst(() => Promise.reject(missing), async () => "copy")).rejects.toBe(missing);
  });
});

describe("writeLocalFirst", () => {
  it("writes through the server, and queues only on a network error", async () => {
    const queue = vi.fn(async () => "queued");
    expect(await writeLocalFirst(async () => "saved", queue)).toBe("saved");
    expect(queue).not.toHaveBeenCalled();
    expect(await writeLocalFirst(() => Promise.reject(noAnswer), queue)).toBe("queued");
    expect(queue).toHaveBeenCalledTimes(1);
  });

  it("throws any other failure, nothing queued", async () => {
    const queue = vi.fn(async () => "queued");
    const refused = answered(422);
    await expect(writeLocalFirst(() => Promise.reject(refused), queue)).rejects.toBe(refused);
    expect(queue).not.toHaveBeenCalled();
  });
});
