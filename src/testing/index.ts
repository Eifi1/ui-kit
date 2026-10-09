// `@eifi1/ui-kit/testing` — helpers an app runs from its OWN test suite (0.33).
//
// Not part of the main barrel: nothing here renders, and an app's production bundle has
// no business carrying it. Browser-safe like the rest of the kit (no `node:fs`): each
// helper takes texts, so an app collects them with `import.meta.glob` or `node:fs`, as
// its setup allows. The first content is the guard against undeclared CSS custom
// properties (docs/colour-roles-harmonization.md §8).
export {
  KIT_CSS_VARIABLES,
  declaredCustomProperties,
  undeclaredCssVariables,
  type UndeclaredCssVariablesOptions,
} from "./css-variables";
