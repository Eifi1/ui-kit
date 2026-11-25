import { createContext } from "react";

// What a StatTile learns from the row it sits in. A module of its own, not stat-tile.tsx:
// the barrel takes that one whole (`export *`), and these are the kit's, not an app's.

/** Set by a loading `StatTileGrid` or `StatStrip`; read by each tile in it, which then
 *  shows its skeleton and leaves the one "Loading…" to the row. */
export const StatTileGridLoadingContext = createContext(false);

/** Set by `StatStrip`: a tile in it that names no `variant` of its own is `plain` — the
 *  strip's hairlines are the frame, and a card in it would be a box in a row of figures. */
export const StatTileStripContext = createContext(false);
