import { describe, expect, it } from "vitest";

import { anchoredBand } from "../series-chart-axes";

/**
 * A bar or area axis over all-zero data (refactor audit 2026-10-30, DSP-10): a quiet
 * period, a zoom window over empty months. `anchoredBand` computed a pad and used it on
 * neither side, so the band was [0, 0] — and d3 maps every value of a zero-height
 * domain to the range's midpoint: keksdose's weekday pattern drew seven 4 px stubs
 * floating mid-card, the "0" tick beside them. The band is [0, 1] now, as `padBand`
 * pads a zero extent: zero stays the plot's bottom edge.
 */
describe("anchoredBand over all-zero data (audit 2026-10-30 DSP-10)", () => {
  it("is [0, 1], not a zero-height band", () => {
    expect(anchoredBand([0, 0])).toEqual([0, 1]);
  });

  it("leaves a band with data in it as it was", () => {
    expect(anchoredBand([0, 500])).toEqual([0, 520]);
    expect(anchoredBand([-500, 0])).toEqual([-520, 0]);
  });
});
