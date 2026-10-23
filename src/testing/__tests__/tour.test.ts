import { describe, expect, expectTypeOf, it, vi } from "vitest";
import type { TourStep, TourStepContext } from "../../tour/tour";
import { tourStepContext } from "..";

/** `@eifi1/ui-kit/testing`'s `tourStepContext` (0.50.1, keksdose N4). */
describe("tourStepContext", () => {
  it("is a TourStepContext, and the shape stays the tour module's", () => {
    expectTypeOf(tourStepContext()).toMatchTypeOf<TourStepContext>();
    expectTypeOf<TourStepContext>().toMatchTypeOf<ReturnType<typeof tourStepContext>>();
  });

  it("defaults to a start with no gates published", () => {
    const ctx = tourStepContext();
    expect(ctx.via).toBe("start");
    expect(ctx.gate("txn.amount")).toBeUndefined();
    // Not an inherited name either.
    expect(ctx.gate("toString")).toBeUndefined();
  });

  it("answers the gates and the entry it is given", () => {
    const ctx = tourStepContext({ via: "at", gates: { "txn.transfer": true, "txn.amount": false } });
    expect(ctx.via).toBe("at");
    expect(ctx.gate("txn.transfer")).toBe(true);
    expect(ctx.gate("txn.amount")).toBe(false);
    expect(ctx.gate("txn.memo")).toBeUndefined();
  });

  it("drives a step's beforeStep and when, as an app's test does", async () => {
    const open = vi.fn();
    const step: TourStep = {
      title: "Amount",
      body: "Type it.",
      beforeStep: (ctx) => {
        if (ctx.via !== "at") open();
      },
      when: (ctx) => ctx.gate("txn.transfer") !== true,
    };
    await step.beforeStep!(tourStepContext());
    await step.beforeStep!(tourStepContext({ via: "at" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(step.when!(tourStepContext())).toBe(true);
    expect(step.when!(tourStepContext({ gates: { "txn.transfer": true } }))).toBe(false);
  });
});
