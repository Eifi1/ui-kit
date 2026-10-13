import { isValidElement } from "react";
import type { ReactNode } from "react";

/**
 * The text of a label node: a string or number as is, an element by its children,
 * recursively, whitespace collapsed. A `<Tooltip label="…">Spend</Tooltip>` label yields
 * "Spend" — the text the reader sees, not the bubble's. `undefined` when there is no text
 * to find (an icon), so the caller falls back to a name of its own.
 *
 * Package-private — not re-exported from the barrel. StatTile names its sparkline by it;
 * a field names its `help` "?" by it ("About <label>", round 0.36).
 */
export function plainText(node: ReactNode): string | undefined {
  const walk = (n: ReactNode): string => {
    if (typeof n === "string" || typeof n === "number") return String(n);
    if (Array.isArray(n)) return n.map(walk).join("");
    if (isValidElement<{ children?: ReactNode }>(n)) return walk(n.props.children);
    return "";
  };
  const text = walk(node).replace(/\s+/g, " ").trim();
  return text === "" ? undefined : text;
}
