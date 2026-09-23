import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { SHOWCASE_ALIAS } from "./alias";

/**
 * The showcase renders this repository's SOURCE, not `dist/`.
 *
 * `dist/` is gitignored, so it is absent in a fresh clone — a showcase that scanned
 * it would render unstyled until someone ran a build, and would keep painting the
 * last build rather than the edit in front of you.
 *
 * No `resolve.dedupe` here, unlike every consumer's vite config: they need it
 * because they resolve this package from outside their own node_modules and can end
 * up with two copies of React. Here there is one tree and one copy.
 */
/**
 * PORTS — harmonised with the sibling apps, which occupy a 417x band for frontends
 * and 800x for backends:
 *
 *   4170  @eifi1/ui-kit showcase   <- this, `npm run dev:showcase`
 *   4171  @eifi1/ui-kit showcase   <- `npm run preview:showcase` (the built page)
 *   4173  keksdose  frontend        (backend 8000)
 *   4175  lenkbank  frontend        (backend 8001)
 *   5173  kastlan   frontend        (Vite's default — no explicit port set there)
 *
 * The showcase sits at the BASE of the band because it is not one of the apps: it is
 * the thing they all derive from. 4172/4174/4176 are left free for kastlan to take an
 * explicit port and for property-management when it adopts the kit.
 *
 * `strictPort` on purpose. Without it Vite silently walks to the next free port, so a
 * colliding run prints a URL that is not the one written down here or in the README —
 * and the failure surfaces as "the showcase looks stale" rather than as an error.
 *
 * SHOWCASE_PORT / SHOWCASE_PREVIEW_PORT override both, for a throwaway instance (a
 * screenshot run, a second branch open side by side) that must not take the port the
 * editor's Ctrl+Shift+B task is going to want.
 */
const DEV_PORT = Number(process.env.SHOWCASE_PORT ?? 4170);
const PREVIEW_PORT = Number(process.env.SHOWCASE_PREVIEW_PORT ?? 4171);

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [tailwindcss(), react()],
  resolve: { alias: SHOWCASE_ALIAS },
  server: { port: DEV_PORT, strictPort: true },
  // A separate port so the dev server and the built preview can run side by side —
  // which is how you check that a production build still paints what dev did.
  preview: { port: PREVIEW_PORT, strictPort: true },
});
