import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { SHOWCASE_ALIAS } from "./alias.ts";

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
 *   4175  Kurvenschmiede frontend   (backend 8001)
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
  build: {
    rolldownOptions: {
      output: {
        // Rolldown already gives every lazy section (routes.tsx) and every set of
        // modules they share a chunk of its own. What is left in the entry is what the
        // first paint needs, and two groups keep that under Vite's 500 kB warning
        // without raising it — both are eager, so they cut no request, but they are
        // parallel downloads that change far less often than the page code:
        //   react — the vendor floor, ~220 kB of react-dom;
        //   i18n, i18n-kit — the six non-English dictionaries of the chrome, and the kit's
        //           locale bundles: two chunks of strings. en.ts stays in the entry: it
        //           spreads DEFAULT_UI_KIT_LABELS from the barrel, and a group must not
        //           hold a module that imports back into the entry (the chunks would
        //           import each other, and the first to evaluate reads the other's
        //           bindings before they exist).
        codeSplitting: {
          groups: [
            { name: "react", test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            // Two groups since 0.33: together they passed Vite's 500 kB warning.
            { name: "i18n", test: /[\\/]showcase[\\/]src[\\/]i18n[\\/](de|es|fr|hu|it|zh)\.ts/ },
            { name: "i18n-kit", test: /[\\/]src[\\/]i18n[\\/]locales[\\/]/ },
          ],
        },
      },
    },
  },
  // A separate port so the dev server and the built preview can run side by side —
  // which is how you check that a production build still paints what dev did.
  preview: { port: PREVIEW_PORT, strictPort: true },
});
