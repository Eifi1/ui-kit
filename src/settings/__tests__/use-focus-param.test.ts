import { describe, expect, it } from "vitest";
import { useFocusParam, useSettingsFocus } from "../../shell";

/** 0.51.4 (keksdose run 89): the `?focus=` hook under a name for any page — the same
 *  function, so the two names cannot drift apart. */
describe("useFocusParam", () => {
  it("is useSettingsFocus", () => {
    expect(useFocusParam).toBe(useSettingsFocus);
  });
});
