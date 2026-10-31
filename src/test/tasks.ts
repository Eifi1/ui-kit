import { act } from "@testing-library/react";

/**
 * Let everything already queued run to the end: timers due now, and the tasks jsdom
 * queues — a history traversal is two of them after `history.go()`, then `popstate`.
 *
 * Counts TURNS of the event loop, not milliseconds (refactor audit 2026-10, TST-11). A
 * test that slept 50 ms and then asserted that something did NOT happen passed under
 * load whether or not the bug was there: after a stall every due timer runs in one
 * batch, the sleep's among them, before jsdom's next task. Each turn here waits for a
 * timer of its own and so lets one round of tasks run, however long that takes.
 *
 * Fake timers cannot stand in for this where history is involved: jsdom runs its
 * traversal on the worker's own `setImmediate`, which `vi.useFakeTimers()` does not
 * reach (probed for round 0.34, D3).
 */
export async function drainTasks(turns = 10): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < turns; turn += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
}

/**
 * A turn of the event loop, inside `act`: the promise jobs queued, the timers due now and
 * a round of the tasks jsdom queues (React's `act` may let a few more run on its way out).
 * What 17 private `settle()` helpers waited for, under a name that says
 * which queue it is (refactor audit 2026-10-30, TST-3: 4 other `settle()`s waited for
 * a microtask instead). Before an assertion that something did NOT happen, wait for the
 * decision point itself, or `drainTasks`.
 */
export async function settleMacrotask(): Promise<void> {
  await drainTasks(1);
}

/**
 * The promise jobs already queued — a `then` on a resolved promise, a dynamic `import()`
 * that has loaded — inside `act`, so the renders they cause land too. No timer runs:
 * that is `settleMacrotask`. `rounds` for a chain of `then`s (TST-3, the private
 * `flush()`s).
 */
export async function flushMicrotasks(rounds = 1): Promise<void> {
  await act(async () => {
    for (let round = 0; round < rounds; round += 1) await Promise.resolve();
  });
}

/** Press Back and wait for the traversal to land — for its `popstate`, however long the
 *  machine takes. */
export async function pressBack(): Promise<void> {
  await act(async () => {
    const landed = new Promise<void>((resolve) => {
      window.addEventListener("popstate", () => resolve(), { once: true });
    });
    window.history.back();
    await landed;
  });
}
