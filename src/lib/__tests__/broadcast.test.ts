import { afterEach, describe, expect, it, vi } from "vitest";
import { listenOn, postOnce } from "../broadcast";

/*
 * The one post to the other tabs, and the one listener, that the sync engine (`forget()`'s
 * epoch) and the query copy (`clear()`) share (0.52 code review: each wrote both by hand, and
 * only one listener let go of Node's worker). Best-effort: neither ever throws, and a post
 * never leaves a channel open.
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
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    constructor(readonly name: string) {
      log.push(`open ${name}`);
    }
    unref() {
      log.push("unref");
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

describe("listenOn", () => {
  it("hears another channel's post until it is closed", async () => {
    const name = fresh();
    const heard: unknown[] = [];
    let first!: () => void;
    const arrived = new Promise<void>((resolve) => (first = resolve));
    const close = listenOn(name, (data) => {
      heard.push(data);
      first();
    });
    postOnce(name, "clear");
    await arrived;
    close();
    // A second listener, opened after the close, is the decision point: it hears the next
    // post, so the closed one had its chance to hear it too.
    const later = new Promise<unknown>((resolve) => {
      const closeLater = listenOn(name, (data) => {
        closeLater();
        resolve(data);
      });
    });
    postOnce(name, { epoch: "e2" });
    expect(await later).toEqual({ epoch: "e2" });
    expect(heard).toEqual(["clear"]);
  });

  it("lets go of Node's worker for every caller, and closes its one channel", () => {
    const log = recordingChannel();
    const close = listenOn("eifi1-sync:copy", () => undefined);
    close();
    expect(log).toEqual(["open eifi1-sync:copy", "unref", "close"]);
  });

  it("hears nothing and closes nothing where there is no BroadcastChannel, or none can be opened", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    expect(() => listenOn("eifi1-sync:copy", () => undefined)()).not.toThrow();
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        constructor() {
          throw new DOMException("refused", "SecurityError");
        }
      },
    );
    expect(() => listenOn("eifi1-sync:copy", () => undefined)()).not.toThrow();
  });
});
