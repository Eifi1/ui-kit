import { fileURLToPath } from "node:url";

/**
 * The `@eifi1/ui-kit` specifier, pointed at this repository's working tree.
 *
 * Shared by `showcase/vite.config.ts` and the ROOT `vitest.config.ts`, because
 * vitest does not read the showcase's vite config: an alias defined in only one of
 * them makes the render test resolve a different package from the page it tests.
 *
 * The alias is what lets every example on the page import exactly what a consumer
 * imports — `from "@eifi1/ui-kit"` — while resolving to ../src. So the code shown
 * next to a component is copy-pasteable into a consuming app unchanged, and an
 * edit to a component is on screen on save without a `npm run build` first.
 *
 * ORDER MATTERS: Vite matches object aliases as ordered prefixes, so every
 * subpath must come first or the bare specifier swallows it.
 */
const LOCALES = ["de", "de-CH", "fr", "it", "es", "hu", "zh"];

export const SHOWCASE_ALIAS = {
  ...Object.fromEntries(
    LOCALES.map((code) => [
      `@eifi1/ui-kit/i18n/${code}`,
      fileURLToPath(new URL(`../src/i18n/locales/${code}.ts`, import.meta.url)),
    ]),
  ),
  "@eifi1/ui-kit/dates": fileURLToPath(new URL("../src/lib/dates.ts", import.meta.url)),
  "@eifi1/ui-kit/rhf": fileURLToPath(new URL("../src/rhf.ts", import.meta.url)),
  "@eifi1/ui-kit/table-text": fileURLToPath(new URL("../src/table-text.ts", import.meta.url)),
  "@eifi1/ui-kit": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
};
