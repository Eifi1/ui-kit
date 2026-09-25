import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { dirOf, type Direction } from "../lib/direction";

/**
 * The reading direction at a portalled panel's anchor — internal, not exported from
 * the barrel. The field pickers' panels are portalled to `<body>`, out of the subtree
 * their `dir` came from, so they carry it across on their own root.
 *
 * Read in a layout effect while `open`, rather than off the ref during render: the
 * anchored rect these panels also wait for is measured the same way, so the panel's
 * first painted frame already has both, and a render never reads a ref.
 */
export function useAnchorDir(ref: RefObject<Element | null>, open: boolean): Direction {
  const [dir, setDir] = useState<Direction>("ltr");
  useLayoutEffect(() => {
    if (open) setDir(dirOf(ref.current));
  }, [open, ref]);
  return dir;
}
