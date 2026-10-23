/**
 * A component's `data-*` props, for its root element (0.50, keksdose): `data-tour`,
 * `data-testid` and the like reach the DOM even when the props are not spread there
 * whole. TypeScript does not check hyphenated JSX attributes, so without this a
 * `data-tour` on such a component vanished without an error.
 */
export type DataAttributes = { [attribute: `data-${string}`]: string | number | boolean | undefined };

/** Only the `data-*` entries of `props`. */
export function dataAttributes(props: object): DataAttributes {
  const out: DataAttributes = {};
  for (const [k, v] of Object.entries(props)) if (k.startsWith("data-")) out[k as `data-${string}`] = v;
  return out;
}
