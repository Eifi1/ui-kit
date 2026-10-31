import { afterEach, describe, expect, it, vi } from "vitest";
import { postOnce } from "../broadcast";

/*
 * The one post to the other tabs that the sync engine's `forget()` and the query copy's
 * `clear()` share (0.52 code review: each wrote it by hand). Best-effort: it never throws,
 * and it never leaves a channel open.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

let n = 0;
/** A name of this file's own: Node's BroadcastChannel reaches the other test files' workers. */
const fresh = () => `broadcast-test-${(n += 1)}`;

/** A BroadcastChannel that records what is done with it, and whose post may throw. */
function recordingChannel(post: (message: unknown) => void = () => undefined) {
  const log: string[] = [];
  class Recording {
    constructor(readonly name: string) {
      log.push(`open ${name}`);
    }
    postMessage(message: unknown) {
      log.push(`post ${JSON.stringify(message)}`);
      post(message);
    }
    close() {
      log.push("close");
    }
  }
  vi.stubGlobal("BroadcastChannel", Recording);
  return log;
}

describe("postOnce", () => {
  it("reaches another channel of the name, in this tab too", async () => {
    const name = fresh();
    const other = new BroadcastChannel(name);
    const heard = new Promise<unknown>((resolve) => {
      other.onmessage = ({ data }: MessageEvent<unknown>) => resolve(data);
    });
    postOnce(name, { epoch: "e1" });
    expect(await heard).toEqual({ epoch: "e1" });
    other.close();
  });

  it("opens a channel, posts once and closes it", () => {
    const log = recordingChannel();
    postOnce("eifi1-query-cache:app-query-cache-7", "clear");
    expect(log).toEqual(["open eifi1-query-cache:app-query-cache-7", 'post "clear"', "close"]);
  });

  it("closes its channel when the post throws, and does not throw", () => {
    const log = recordingChannel(() => {
      throw new DOMException("could not be cloned", "DataCloneError");
    });
    expect(() => postOnce("eifi1-sync:copy", { epoch: "e1" })).not.toThrow();
    expect(log).toEqual(["open eifi1-sync:copy", 'post {"epoch":"e1"}', "close"]);
  });

  it("does nothing where there is no BroadcastChannel, or none can be opened", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    expect(() => postOnce("eifi1-sync:copy", { epoch: "e1" })).not.toThrow();
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        constructor() {
          throw new DOMException("refused", "SecurityError");
        }
      },
    );
    expect(() => postOnce("eifi1-sync:copy", { epoch: "e1" })).not.toThrow();
  });
});
