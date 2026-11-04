import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readStored } from "../safe-storage";
import { watchSessionElsewhere } from "../session-refresh";

/**
 * watchSessionElsewhere (0.55, kastlan reuse audit 2026-11-02, proposal 6): a sign-out in
 * another tab ends this tab's session, and so does one this page missed while it sat in the
 * back/forward cache — keksdose watched both (auth-store.ts, `storage` and `pageshow`),
 * kastlan the first alone, Kurvenschmiede neither.
 *
 * The pretend app keeps its token in memory and on the device, as Kurvenschmiede does:
 * the session is over when this tab holds one and the device no longer does.
 */

const KEY = "auth_token";
let held: string | null;
const ended = () => held !== null && readStored(KEY) === null;

/** Another tab's write, as this tab hears it: the storage changed, then the event. */
function elsewhere(write: () => void, key: string | null = KEY) {
  write();
  window.dispatchEvent(new StorageEvent("storage", { key, storageArea: localStorage }));
}

const restored = (persisted: boolean) => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted }));

let stops: Array<() => void> = [];
function watch(options: Partial<Parameters<typeof watchSessionElsewhere>[0]> = {}) {
  const onEnded = vi.fn();
  const stop = watchSessionElsewhere({ ended, onEnded, ...options });
  stops.push(stop);
  return { onEnded, stop };
}

beforeEach(() => {
  held = "t1";
  localStorage.setItem(KEY, "t1");
});
afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
  localStorage.clear();
});

describe("watchSessionElsewhere", () => {
  it("a storage event that ends the session calls onEnded once", () => {
    const { onEnded } = watch();
    elsewhere(() => localStorage.removeItem(KEY));
    expect(onEnded).toHaveBeenCalledOnce();
    // The same sign-out removes more keys: each event finds the session still over, and
    // the tab that is already leaving is not told again.
    elsewhere(() => localStorage.removeItem("refresh_token"), "refresh_token");
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("a storage event that leaves the session calls nothing: a renewal, another key", () => {
    const { onEnded } = watch();
    elsewhere(() => localStorage.setItem(KEY, "t2"));
    elsewhere(() => localStorage.setItem("theme", "dark"), "theme");
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("reads the state after a cleared storage (key null), with no list of keys", () => {
    const { onEnded } = watch();
    elsewhere(() => localStorage.clear(), null);
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("a tab with no session has nothing to end", () => {
    held = null;
    const { onEnded } = watch();
    elsewhere(() => localStorage.removeItem(KEY));
    restored(true);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("tells a session that came back and ended again", () => {
    const { onEnded } = watch();
    elsewhere(() => localStorage.removeItem(KEY));
    // Signed in again (here, in another tab), and that tab signs out once more.
    elsewhere(() => localStorage.setItem(KEY, "t3"));
    held = "t3";
    elsewhere(() => localStorage.removeItem(KEY));
    expect(onEnded).toHaveBeenCalledTimes(2);
  });

  it("a page restored from the back/forward cache with the session gone calls onEnded", () => {
    const { onEnded } = watch();
    // Signed out elsewhere while this page was frozen: it heard no storage event.
    localStorage.removeItem(KEY);
    restored(true);
    expect(onEnded).toHaveBeenCalledOnce();
  });

  it("a pageshow that is no restore, or a restore with the session still there, calls nothing", () => {
    const { onEnded } = watch();
    restored(true);
    localStorage.removeItem(KEY);
    restored(false);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("asks a restored page afresh, even when it was told before it was cached", () => {
    const { onEnded } = watch();
    elsewhere(() => localStorage.removeItem(KEY));
    // Its onEnded left; Back brings the kept page back on the previous account.
    restored(true);
    expect(onEnded).toHaveBeenCalledTimes(2);
  });

  it("checkRestored: false leaves pageshow to the app", () => {
    const { onEnded } = watch({ checkRestored: false });
    localStorage.removeItem(KEY);
    restored(true);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("checks nothing when the watch starts", () => {
    localStorage.removeItem(KEY);
    const { onEnded } = watch();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("the returned function removes both listeners", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { onEnded, stop } = watch();
    const added = add.mock.calls.map(([type, listener]) => [type, listener]);
    expect(added.map(([type]) => type)).toEqual(["storage", "pageshow"]);
    stop();
    expect(remove.mock.calls.map(([type, listener]) => [type, listener])).toEqual(added);

    elsewhere(() => localStorage.removeItem(KEY));
    restored(true);
    expect(onEnded).not.toHaveBeenCalled();
    add.mockRestore();
    remove.mockRestore();
  });
});
