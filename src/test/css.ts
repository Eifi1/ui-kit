/**
 * `value` as this test environment writes `property` back, for comparing an inline style
 * by what it means rather than by one parser's spelling of it.
 *
 * jsdom 31's CSSStyleDeclaration serialises what it stores: `minmax(0, 1fr)` reads back as
 * `minmax(0px, 1fr)`, a `calc()` folds its sums (`calc(1ch + 0.75rem + 2.25rem)` is
 * `calc(1ch + 3rem)`), and a transition drops its default `ease`. A browser renders all of
 * them as before. The kit's tests compared exact strings and broke on the upgrade (round 0.59
 * reverted to jsdom 30 for it). Passed through this, the expected value goes through the
 * same parser as the one the kit set, so the test holds under any jsdom:
 *
 * ```ts
 * expect(list.style.gridTemplateColumns).toBe(cssValue("grid-template-columns", "repeat(4, minmax(0, 1fr))"));
 * ```
 *
 * Throws for a value the parser refuses: both sides would then be `""`, and the test would
 * pass whatever the kit set.
 */
export function cssValue(property: string, value: string): string {
  const probe = document.createElement("div");
  probe.style.setProperty(property, value);
  const read = probe.style.getPropertyValue(property);
  if (value !== "" && read === "") throw new Error(`cssValue: "${value}" is not a ${property} this parser keeps`);
  return read;
}
