import { describe, expect, it } from "vitest";
import { flushMicrotasks, settleMacrotask } from "../tasks";

/** The two queues the helpers name (refactor audit 2026-10-30, TST-3). */
describe("src/test/tasks", () => {
  it("flushMicrotasks runs the queued promise jobs and no timer", async () => {
    const ran: string[] = [];
    setTimeout(() => ran.push("timer"), 0);
    void Promise.resolve().then(() => ran.push("then"));
    await flushMicrotasks();
    expect(ran).toEqual(["then"]);
  });

  it("flushMicrotasks(rounds) follows a chain of thens that long", async () => {
    const ran: number[] = [];
    void Promise.resolve()
      .then(() => ran.push(1))
      .then(() => ran.push(2))
      .then(() => ran.push(3));
    await flushMicrotasks(3);
    expect(ran).toEqual([1, 2, 3]);
  });

  it("settleMacrotask lets a timer due now run, and the promise jobs before it", async () => {
    const ran: string[] = [];
    setTimeout(() => ran.push("timer"), 0);
    void Promise.resolve().then(() => ran.push("then"));
    await settleMacrotask();
    expect(ran).toEqual(["then", "timer"]);
  });
});
